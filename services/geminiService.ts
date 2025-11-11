import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ImageVariation } from "../types";
import { getCurrentLanguage } from "../i18n";

let ai: GoogleGenAI | null = null;

// Lazy initialization of the AI client
const getAiClient = (): GoogleGenAI => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set. Please configure it to use the AI features.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

// Helper to extract a JSON object or array from a string that might contain extraneous text or markdown fences.
const extractJson = (text: string): string => {
    // First, try to find JSON within markdown fences (```json ... ```)
    const markdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
        return markdownMatch[1].trim();
    }

    // If no markdown fence, find the first '{' or '[' and the last '}' or ']'
    const firstBracket = text.indexOf('[');
    const firstBrace = text.indexOf('{');
    
    let start = -1;
    
    if (firstBracket === -1) {
        start = firstBrace;
    } else if (firstBrace === -1) {
        start = firstBracket;
    } else {
        start = Math.min(firstBracket, firstBrace);
    }
    
    if (start === -1) {
        // If we found neither, the response is not valid JSON.
        // It could be a conversational refusal from the model.
        throw new Error(`Could not find a valid JSON object or array in the response. Model returned: "${text}"`);
    }

    const lastBracket = text.lastIndexOf(']');
    const lastBrace = text.lastIndexOf('}');
    
    const end = Math.max(lastBracket, lastBrace);

    if (end === -1 || end < start) {
        throw new Error(`Could not find a valid JSON object or array in the response. Model returned: "${text}"`);
    }

    return text.substring(start, end + 1);
};


// This is an internal helper function, not exported.
const editImageInternal = async (
  images: { base64Data: string, mimeType: string }[],
  prompt: string,
): Promise<string> => {
  try {
    // Validate the prompt to prevent API errors from empty/invalid text parts.
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new Error("A valid, non-empty prompt is required for image editing.");
    }
    if (!images || images.length === 0) {
        throw new Error("At least one image is required for editing.");
    }
      
    const client = getAiClient();

    const imageParts = images.map(img => ({ inlineData: { data: img.base64Data, mimeType: img.mimeType } }));

    const parts: any[] = [
      ...imageParts,
      { text: prompt },
    ];

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Image generation was blocked. Reason: ${response.promptFeedback.blockReason}`);
      }
      throw new Error('The API did not return any candidates. The request may have been blocked or failed.');
    }
    
    const candidate = response.candidates[0];
    
    if (!candidate.content?.parts) {
        throw new Error('The API returned a candidate with no content parts.');
    }

    let returnedImage: string | null = null;
    let returnedText: string | null = null;

    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        returnedImage = part.inlineData.data;
      } else if (part.text) {
        returnedText = part.text;
      }
    }

    if (returnedImage) {
      return returnedImage;
    }

    let errorMessage = 'The API did not return an image. The response may have been blocked.';
    if (returnedText) {
      errorMessage = `The AI failed to generate an image and returned this message: "${returnedText}"`;
    }

    throw new Error(errorMessage);
    
  } catch (error) {
    console.error('Error calling Gemini API for image editing:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Could not edit the image.');
  }
};

const generationPlanSchema = {
  type: Type.OBJECT,
  properties: {
    textResponse: {
      type: Type.STRING,
      description: 'A short, conversational text response to the user acknowledging their request. Should be creative and encouraging. IMPORTANT: Respond in the language specified by the "lang" field.',
    },
    variations: {
      type: Type.ARRAY,
      description: 'A list of 3 creative variations to generate based on the user prompt.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'A short, catchy title for this variation (e.g., "Vibrant Red," "Studio Shot"). Must be in the user\'s language.'
          },
          description: {
            type: Type.STRING,
            description: 'A brief, one-sentence description of what makes this variation unique. Must be in the user\'s language.'
          },
          modifiedPrompt: {
            type: Type.STRING,
            description: 'The full, detailed prompt to be used for generating this specific image variation, building upon the original user prompt. MUST be a non-empty string written in ENGLISH.'
          }
        },
        required: ["title", "description", "modifiedPrompt"]
      }
    },
    followUpSuggestions: {
        type: Type.ARRAY,
        description: 'A list of 4 short, actionable follow-up prompts the user could try next (e.g., "Add custom racing stripes", "Try a different angle"). Must be in the user\'s language.',
        items: {
            type: Type.STRING,
        }
    }
  },
  required: ["textResponse", "variations", "followUpSuggestions"]
};

type PlanResult = {
  textResponse: string;
  variations: any[];
  followUpSuggestions: string[];
};

type GeneratorYield = 
  | { status: 'progress', message: string }
  | { plan: PlanResult, groundingMetadata?: any }
  | ImageVariation;


export async function* generateNewImages(
  userPrompt: string,
  useWebSearch: boolean = false,
  aspectRatio: string = '1:1'
): AsyncGenerator<GeneratorYield> {
  const client = getAiClient();
  const lang = getCurrentLanguage();

  const config: any = {
    responseMimeType: 'application/json',
    responseSchema: generationPlanSchema,
  };
  const planPrompt = `You are a world-class creative director and prompt engineer acting as a planner. A user wants to generate a new image with the prompt: "${userPrompt}". The user's language is "${lang}".
      
      Your task is to conceptualize 3 distinct, high-quality artistic variations based on their prompt.
      1.  Write a brief, encouraging, conversational response in the USER'S LANGUAGE (${lang}).
      2.  For each variation, create a short title and a one-sentence description, also in the USER'S LANGUAGE.
      3.  For each variation's 'modifiedPrompt' (which must be in ENGLISH), write a descriptive, multi-sentence paragraph for an image generation AI. Do NOT use simple keywords. Instead, describe a complete photorealistic scene. Incorporate professional photographic terms like camera angles (e.g., "low-angle shot", "close-up"), lens types (e.g., "85mm portrait lens", "wide-angle"), and lighting conditions (e.g., "golden hour light", "softbox setup", "cinematic lighting").
      4.  Generate 4 short, actionable follow-up prompts in the USER'S LANGUAGE.
      5.  The prompt MUST be designed to generate an image with a '${aspectRatio}' aspect ratio.
      
      Return this plan in the specified JSON format.`;
  
  const contents = { parts: [{ text: planPrompt }] };

  const planResponse = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config
  });

  const planJsonText = extractJson(planResponse.text);
  const plan = JSON.parse(planJsonText);

  if (!plan.textResponse || !Array.isArray(plan.variations) || plan.variations.length === 0) {
    throw new Error("Failed to create a valid generation plan.");
  }

  yield { plan };
  yield { status: 'progress', message: 'Generating your new images...' };

  for (const variation of plan.variations) {
    try {
      const promptForGeneration = variation.modifiedPrompt || userPrompt;
      const editedImageBase64 = await retryNewImageGeneration(promptForGeneration, aspectRatio);
      
      const newVariation: ImageVariation = {
        id: Date.now().toString() + Math.random(),
        title: variation.title,
        description: variation.description,
        imageUrl: `data:image/png;base64,${editedImageBase64}`,
        createdAt: new Date(),
      };
      yield newVariation;
    } catch (error) {
      console.error(`Failed to generate new image variation "${variation.title}":`, error);
      const errorVariation: ImageVariation = {
        id: Date.now().toString() + Math.random(),
        title: variation.title,
        description: variation.description,
        imageUrl: '',
        createdAt: new Date(),
        isError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown generation error.',
        retryPayload: {
          prompt: variation.modifiedPrompt || userPrompt,
          aspectRatio: aspectRatio,
        }
      };
      yield errorVariation;
    }
  }
}


// This is now an async generator to stream results
export async function* generateImageEdits(
  images: { base64Data: string, mimeType: string }[],
  userPrompt: string,
  useWebSearch: boolean = false,
  aspectRatio: string = '1:1'
): AsyncGenerator<GeneratorYield> {
  
  const client = getAiClient();
  const lang = getCurrentLanguage();

  let planPrompt: string;
  const config: any = {}; 
  const imageParts = images.map(img => ({ inlineData: { data: img.base64Data, mimeType: img.mimeType } }));
  const contents: any = { parts: [...imageParts] };

  if (useWebSearch) {
    yield { status: 'progress', message: 'Searching the web for inspiration...' };
    await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay for better pacing
    yield { status: 'progress', message: 'Analyzing results to craft prompts...' };
    await new Promise(resolve => setTimeout(resolve, 1500)); // Increased delay
    
    config.tools = [{ googleSearch: {} }];
    
    planPrompt = `You are a creative AI assistant. A user has provided ${images.length} image(s) and a prompt in "${lang}": "${userPrompt}".

        Your task is to create a superior generation plan using multilingual web search.
        1.  Analyze ALL provided images' content, style, and composition. If there are people in the images, pay close attention to their faces.
        2.  Take the user's prompt and perform Google searches for advanced "nano banana" (a generative AI model) techniques. Search in MULTIPLE LANGUAGES, including English, Japanese, and Korean, to find diverse ideas.
        3.  Synthesize your findings from the multilingual search and the original request to create a generation plan.
        4.  Write a brief, encouraging, conversational response to the user. YOU MUST RESPOND IN THE USER'S LANGUAGE (${lang}).
        5.  Come up with 3 distinct, creative variations based on your findings. For each, create a title and description in the user's language.
        6.  The 'modifiedPrompt' field MUST be a non-empty, highly detailed string written in ENGLISH for the image model. CRITICAL: If the original image contains people, add this instruction at the end of the prompt: "--no-face-swap, preserve facial identity from original image".
        7.  Generate 4 actionable follow-up prompts in the user's language.
        8. The final generated image MUST have a '${aspectRatio}' aspect ratio. This is a critical instruction that must be reflected in the 'modifiedPrompt'.
        
        EXTREMELY IMPORTANT: Your entire response must be a single, valid JSON object. It MUST start with '{' and end with '}'. Do NOT include any text, greetings, or markdown formatting like \`\`\`json before or after the JSON object.`;
    
    contents.parts.push({ text: planPrompt });

  } else {
     config.responseMimeType = 'application/json';
     config.responseSchema = generationPlanSchema;
     planPrompt = `You are a world-class creative director and prompt engineer acting as a planner. A user wants to edit/combine ${images.length} image(s) with the prompt: "${userPrompt}". The user's language is "${lang}".
        
        Your task is to analyze ALL provided images and conceptualize 3 distinct, high-quality artistic variations.
        1.  Write a brief, encouraging, conversational response in the USER'S LANGUAGE (${lang}).
        2.  For each variation, create a short title and a one-sentence description, also in the USER'S LANGUAGE.
        3.  For each variation's 'modifiedPrompt' (which must be in ENGLISH), write a descriptive, multi-sentence paragraph. Do NOT use simple keywords. Instead, describe a complete photorealistic scene. Incorporate professional photographic terms like camera angles (e.g., "low-angle shot", "close-up"), lens types (e.g., "85mm portrait lens", "wide-angle"), and lighting conditions (e.g., "golden hour light", "softbox setup", "cinematic lighting"). CRITICAL: If the original image contains people, you must add this instruction at the end of the prompt: "--no-face-swap, preserve facial identity from original image".
        4.  Generate 4 short, actionable follow-up prompts in the USER'S LANGUAGE.
        5.  Ensure the final image is rendered with a '${aspectRatio}' aspect ratio. This is a strict constraint that must be reflected in the 'modifiedPrompt'.
        
        Return this plan in the specified JSON format.`;
    
    contents.parts.push({ text: planPrompt });
  }

  const planResponse = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents,
    config: config
  });
  
  // Use the robust JSON extraction method.
  const planJsonText = extractJson(planResponse.text);
  const plan = JSON.parse(planJsonText);
  
  const groundingMetadata = planResponse.candidates?.[0]?.groundingMetadata;

  if (!plan.textResponse || !Array.isArray(plan.variations) || plan.variations.length === 0) {
    throw new Error("Failed to create a valid generation plan.");
  }

  // Yield the initial text response and suggestions
  yield { plan, groundingMetadata };
  yield { status: 'progress', message: 'Remixing your image with new ideas...' };


  for (const variation of plan.variations) {
    try {
      // If the AI planner fails to generate a prompt, create a fallback.
      const promptForGeneration = (variation.modifiedPrompt || "").trim()
        ? variation.modifiedPrompt
        : `${userPrompt}, in the style of: ${variation.title}`;

      const editedImageBase64 = await editImageInternal(images, promptForGeneration);
      const newVariation: ImageVariation = {
        id: Date.now().toString() + Math.random(),
        title: variation.title,
        description: variation.description,
        imageUrl: `data:${images[0].mimeType};base64,${editedImageBase64}`,
        createdAt: new Date(),
      };
      yield newVariation; // Yield each image as it's generated
    } catch (error) {
      console.error(`Failed to generate variation "${variation.title}":`, error);
       // Create a fallback for the retry payload as well.
      const promptForRetry = (variation.modifiedPrompt || "").trim()
        ? variation.modifiedPrompt
        : `${userPrompt}, in the style of: ${variation.title}`;

      const errorVariation: ImageVariation = {
        id: Date.now().toString() + Math.random(),
        title: variation.title,
        description: variation.description,
        imageUrl: '', // No image URL
        createdAt: new Date(),
        isError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown generation error.',
        retryPayload: {
          images: images,
          prompt: promptForRetry,
        }
      };
      yield errorVariation;
    }
  }
}

export const retryImageGeneration = async (
    images: { base64Data: string, mimeType: string }[],
    prompt: string
): Promise<string> => {
    return await editImageInternal(images, prompt);
};

export const retryNewImageGeneration = async (
    prompt: string,
    aspectRatio: string,
): Promise<string> => {
    const client = getAiClient();
    const response = await client.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: aspectRatio,
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
      if ((response as any).promptFeedback?.blockReason) {
         throw new Error(`Image generation was blocked. Reason: ${(response as any).promptFeedback.blockReason}`);
      }
      throw new Error('The API did not return any images. The request may have been blocked or failed.');
    }
    
    return response.generatedImages[0].image.imageBytes;
};

// FIX: Added missing functions for object detection and advanced image editing.
const objectDetectionSchema = {
    type: Type.OBJECT,
    properties: {
        objects: {
            type: Type.ARRAY,
            description: "A list of all distinct objects detected in the image.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: {
                        type: Type.STRING,
                        description: "A unique identifier for this object instance within the image scope."
                    },
                    parentId: {
                        type: Type.STRING,
                        description: "The ID of the parent object, if this object is part of another. Null for top-level objects."
                    },
                    label: {
                        type: Type.STRING,
                        description: "A concise, descriptive label for the object (e.g., 'red car', 'oak tree')."
                    },
                    box_2d: {
                        type: Type.ARRAY,
                        description: "The normalized bounding box coordinates [yMin, xMin, yMax, xMax].",
                        items: {
                            type: Type.NUMBER
                        }
                    }
                },
                required: ["id", "label", "box_2d"]
            }
        }
    },
    required: ["objects"]
};

export const segmentObjectsInImage = async (base64Data: string, mimeType: string): Promise<any[]> => {
    const client = getAiClient();
    const prompt = `Analyze the provided image and perform hierarchical object detection. Identify all distinct objects and their sub-components. For each detected object, provide:
1.  A unique 'id'.
2.  The 'id' of its parent object ('parentId'), or null if it's a top-level object.
3.  A descriptive 'label'.
4.  A normalized bounding 'box_2d' as [yMin, xMin, yMax, xMax].
Return this information in the specified JSON format.`;

    const imagePart = { inlineData: { data: base64Data, mimeType } };

    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: objectDetectionSchema
        }
    });

    const resultJson = extractJson(response.text);
    const result = JSON.parse(resultJson);
    return result.objects || [];
};

export const editImageWithMask = async (base64Data: string, mimeType: string, prompt: string, maskBase64: string): Promise<string[]> => {
    const client = getAiClient();
    const imagePart = { inlineData: { data: base64Data, mimeType } };
    const maskPart = { inlineData: { data: maskBase64, mimeType: 'image/png' } };
    const textPart = { text: `User request: "${prompt}". You are a professional photo editor. Your task is to edit an image based on the user's request, but you MUST ONLY modify the white masked area. The rest of the image (the black area) must remain completely unchanged. Do not alter the original image's style, lighting, or composition. Apply the change seamlessly and realistically to the masked region.` };

    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, maskPart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });

    if (!response.candidates || response.candidates.length === 0) {
        throw new Error('The API did not return any candidates for the masked edit.');
    }
    const candidate = response.candidates[0];
    if (!candidate.content?.parts) {
        throw new Error('The API returned a candidate with no content parts.');
    }

    const returnedImages: string[] = [];
    for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
            returnedImages.push(part.inlineData.data);
        }
    }
    if (returnedImages.length > 0) {
        return returnedImages;
    }
    throw new Error('The API did not return an image for the masked edit.');
};

export const generateRepositionPrompt = async (instructionImageBase64: string, movedObjectData: any[]): Promise<string> => {
    const client = getAiClient();
    const prompt = `You are a VFX compositor prompt generator. An image with visual instructions (red arrows indicating movement) is provided. Based on the image and the structured data below, generate a concise, clear, and unambiguous instruction prompt for an image generation AI. The goal is to move objects from their original positions to the new positions indicated by the arrows and bounding boxes. The AI should realistically recompose the scene, filling in the background where objects used to be (in-painting) and ensuring the moved objects blend seamlessly in their new locations with correct lighting and shadows.

Moved Objects Data: ${JSON.stringify(movedObjectData, null, 2)}

The generated prompt must be a single, imperative command. For example: "Move the 'blue sedan' to the new position shown by the arrow, in-painting the original location."`;

    const imagePart = { inlineData: { data: instructionImageBase64, mimeType: 'image/png' } };
    const textPart = { text: prompt };

    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] }
    });
    return response.text.trim();
};

export const applyRepositionEdit = async (instructionImageBase64: string, mimeType: string, generatedPrompt: string): Promise<string[]> => {
    const client = getAiClient();
    const imagePart = { inlineData: { data: instructionImageBase64, mimeType } };
    const textPart = { text: generatedPrompt };

    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE]
        }
    });

    if (!response.candidates || response.candidates.length === 0) {
        throw new Error('The API did not return any candidates for the reposition edit.');
    }
    const candidate = response.candidates[0];
    if (!candidate.content?.parts) {
        throw new Error('The API returned a candidate with no content parts.');
    }

    const returnedImages: string[] = [];
    for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
            returnedImages.push(part.inlineData.data);
        }
    }
    if (returnedImages.length > 0) {
        return returnedImages;
    }
    throw new Error('The API did not return an image for the reposition edit.');
};
