

// FIX: Added BoundingBox, DetectedObject, and ApiObject types for object detection feature.
export interface BoundingBox {
  yMin: number;
  xMin: number;
  yMax: number;
  xMax: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  // FIX: Corrected typo from BoundingoundingBox to BoundingBox.
  box: BoundingBox;
  mask: string; // base64 mask
  children: DetectedObject[];
  thumbnailUrl?: string;
  _originalParentId?: string | null; // internal helper
}

export interface ApiObject {
    id: string | null;
    parentId: string | null;
    label: string;
    box_2d: [number, number, number, number]; // yMin, xMin, yMax, xMax
}

export interface ImageVariation {
  id: string;
  title: string;
  description: string;
  imageUrl: string; // base64 data URL
  createdAt: Date;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  retryPayload?: {
    images?: { base64Data: string, mimeType: string }[];
    prompt: string;
    aspectRatio?: string;
  };
  // FIX: Added optional objects property for editor view.
  objects?: DetectedObject[];
}

export interface GroundingChunk {
    web: {
        uri: string;
        title: string;
    }
}

export interface ChatMessage {
  id:string;
  role: 'user' | 'assistant';
  text?: string;
  imageUrls?: string[]; // The user's uploaded images (renamed from imageUrl)
  variations?: ImageVariation[]; // The assistant's generated images
  isLoading?: boolean;
  isError?: boolean;
  sourceImageUrl?: string; // The primary image used as the base for generation display
  followUpSuggestions?: string[]; // AI-generated follow-up prompts
  originalRequest?: { // For retrying failed requests
    prompt: string;
    imageFiles: File[]; // Changed from imageFile: File
    sourceImageUrl?: string;
    useWebSearch: boolean;
    aspectRatio: string;
  };
  groundingMetadata?: {
    groundingChunks: GroundingChunk[];
  };
  statusMessage?: string; // For displaying messages like "Analyzing web results..."
}

export interface Album {
    id: string;
    title: string;
    chatHistory: ChatMessage[];
    galleryImages: ImageVariation[];
    createdAt: Date;
    referenceImageUrl?: string | null;
}