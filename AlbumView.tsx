



import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ImageGallery } from './ImageGallery';
import type { Album, ChatMessage as ChatMessageType, ImageVariation } from '../types';
import { ImageModal } from './ImageModal';
import { dataUrlToFile } from '../utils/imageUtils';
import { t } from '../i18n';
import { generateImageEdits, retryImageGeneration } from '../services/geminiService';

interface AlbumViewProps {
  album: Album;
  onUpdateAlbum: (album: Album) => void;
  onEditImage: (variation: ImageVariation) => void;
}

export const AlbumView: React.FC<AlbumViewProps> = ({ album, onUpdateAlbum, onEditImage }) => {
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string | null>(null);
  const [prefilledImage, setPrefilledImage] = React.useState<File | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [leftPanelWidth, setLeftPanelWidth] = useState(450);
  const isResizing = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
  };

  const handleMouseUp = () => {
    isResizing.current = false;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = Math.max(350, Math.min(e.clientX, window.innerWidth - 350));
      setLeftPanelWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove]);


  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [album.chatHistory]);
  
  const readFilesAsBase64 = (files: File[]): Promise<{ base64Data: string, mimeType: string }[]> => {
    return Promise.all(files.map(file => {
        return new Promise<{ base64Data: string; mimeType: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve({
                base64Data: (reader.result as string).split(',')[1],
                mimeType: file.type
            });
            reader.onerror = reject;
        });
    }));
  };

  const handleSendPrompt = useCallback(
    // FIX: Add aspectRatio to function signature to match what ChatInput sends.
    async (prompt: string, imageFiles: File[], useWebSearch: boolean, aspectRatio: string, sourceImageUrl?: string) => {
      if (!prompt || imageFiles.length === 0) return;

      const userMessageId = Date.now().toString();
      const assistantLoadingId = (Date.now() + 1).toString();
      const imageUrls = imageFiles.map(file => URL.createObjectURL(file));
      const primaryImageUrl = sourceImageUrl || imageUrls[0];
      
      try {
        const imagesData = await readFilesAsBase64(imageFiles);

        // Add user message to chat
        const updatedChatWithUser: ChatMessageType[] = [
          ...album.chatHistory,
          // FIX: The ChatMessage type expects an array of strings for `imageUrls`.
          { id: userMessageId, role: 'user', text: prompt, imageUrls: imageUrls },
        ];
        onUpdateAlbum({ ...album, chatHistory: updatedChatWithUser });

        // Add 3 placeholder images to the gallery
        const placeholderVariations: ImageVariation[] = Array(3).fill(null).map((_, i) => ({
            id: `placeholder-${Date.now()}-${i}`,
            title: 'Loading...',
            description: '...',
            imageUrl: '',
            createdAt: new Date(),
            isLoading: true,
        }));
        
        let currentAlbumState = { ...album, chatHistory: updatedChatWithUser, galleryImages: [...album.galleryImages, ...placeholderVariations] };
        onUpdateAlbum(currentAlbumState);
        
        // Add loading message to chat
        const loadingMessage: ChatMessageType = { id: assistantLoadingId, role: 'assistant', isLoading: true, sourceImageUrl: primaryImageUrl };
        const loadingChatHistory: ChatMessageType[] = [
          ...currentAlbumState.chatHistory,
          loadingMessage,
        ];
        currentAlbumState = { ...currentAlbumState, chatHistory: loadingChatHistory };
        onUpdateAlbum(currentAlbumState);

        try {
          // FIX: Pass aspectRatio to generateImageEdits.
          const generator = generateImageEdits(imagesData, prompt, useWebSearch, aspectRatio);
          let planData: any = null;
          let groundingData: any = null;
          const finalVariations: ImageVariation[] = [];
          
          const updateLoadingMessage = (newMessage: string) => {
            const updatedHistory = currentAlbumState.chatHistory.map(msg => 
                msg.id === assistantLoadingId ? { ...msg, statusMessage: newMessage } : msg
            );
            currentAlbumState = { ...currentAlbumState, chatHistory: updatedHistory };
            onUpdateAlbum(currentAlbumState);
          };


          for await (const result of generator) {
            if ('status' in result && result.status === 'progress') {
                 updateLoadingMessage(result.message);
            } else if ('plan' in result) {
              planData = result.plan;
              groundingData = result.groundingMetadata;
            } else if ('id' in result) {
              // This is an ImageVariation result (success or error)
              finalVariations.push(result);
              // Replace one placeholder with the final image
              const updatedGallery = [...currentAlbumState.galleryImages];
              const placeholderIndex = updatedGallery.findIndex(img => img.isLoading);
              if (placeholderIndex !== -1) {
                updatedGallery[placeholderIndex] = result;
                currentAlbumState = { ...currentAlbumState, galleryImages: updatedGallery };
                onUpdateAlbum(currentAlbumState);
              }
            }
          }
          
          if (!planData) throw new Error("Did not receive plan from generator.");
          
          const finalChatHistory: ChatMessageType[] = [
            ...loadingChatHistory.filter(msg => msg.id !== assistantLoadingId),
            { id: (Date.now() + 2).toString(), role: 'assistant', text: planData.textResponse },
            { 
                id: (Date.now() + 3).toString(), 
                role: 'assistant', 
                variations: finalVariations, 
                followUpSuggestions: planData.followUpSuggestions, 
                sourceImageUrl: primaryImageUrl,
                groundingMetadata: groundingData,
            },
          ];
          // Clean up any remaining placeholders in case of mismatch
          const finalGallery = currentAlbumState.galleryImages.filter(img => !img.isLoading);
          onUpdateAlbum({ ...currentAlbumState, chatHistory: finalChatHistory, galleryImages: finalGallery });

        } catch (error) {
          console.error(error);
          const finalChatHistory: ChatMessageType[] = [
            ...loadingChatHistory.filter((msg) => msg.id !== assistantLoadingId),
            { 
              id: (Date.now() + 4).toString(), 
              role: 'assistant', 
              text: error instanceof Error ? error.message : t('genericError'), 
              isError: true,
              // FIX: Add missing aspectRatio to originalRequest to match ChatMessage type.
              originalRequest: { prompt, imageFiles, sourceImageUrl, useWebSearch, aspectRatio }
            },
          ];
          // Remove placeholders from gallery on error
          const galleryWithoutPlaceholders = currentAlbumState.galleryImages.filter(img => !img.isLoading);
          onUpdateAlbum({ ...album, chatHistory: finalChatHistory, galleryImages: galleryWithoutPlaceholders });
        }
      } finally {
        imageUrls.forEach(url => URL.revokeObjectURL(url));
      }
    },
    [album, onUpdateAlbum]
  );
  
  const handleSuggestionSend = async (suggestion: string, sourceImageUrl?: string) => {
    if (!sourceImageUrl) return;
    try {
      const imageFile = await dataUrlToFile(sourceImageUrl, 'source_image.png');
      // FIX: Pass default aspectRatio to handleSendPrompt.
      handleSendPrompt(suggestion, [imageFile], false, '1:1', sourceImageUrl);
    } catch (error) {
      console.error("Failed to handle suggestion send:", error);
    }
  };

  const handleRetry = (failedMessage: ChatMessageType) => {
    if (!failedMessage.originalRequest) return;
    const historyWithoutError = album.chatHistory.filter(m => m.id !== failedMessage.id);
    onUpdateAlbum({ ...album, chatHistory: historyWithoutError });
    // FIX: Destructure and pass aspectRatio from originalRequest.
    const { prompt, imageFiles, sourceImageUrl, useWebSearch, aspectRatio } = failedMessage.originalRequest;
    handleSendPrompt(prompt, imageFiles, useWebSearch, aspectRatio, sourceImageUrl);
  };
  
  const handleRetryVariation = async (failedVariation: ImageVariation) => {
    if (!failedVariation.retryPayload) return;

    const updateVariationState = (updatedVariation: ImageVariation) => {
        const updatedGallery = album.galleryImages.map(img => img.id === failedVariation.id ? updatedVariation : img);
        const updatedChatHistory = album.chatHistory.map(msg => ({
            ...msg,
            variations: msg.variations?.map(v => v.id === failedVariation.id ? updatedVariation : v)
        }));
        onUpdateAlbum({ ...album, galleryImages: updatedGallery, chatHistory: updatedChatHistory });
    };

    const loadingVariation = { ...failedVariation, isLoading: true, isError: false, errorMessage: undefined };
    updateVariationState(loadingVariation);

    try {
        // FIX: The `retryPayload` structure changed to nest image data in an `images` array.
        const { images, prompt } = failedVariation.retryPayload;
        // FIX: `retryImageGeneration` expects an array of image data objects and a prompt.
        const newImageBase64 = await retryImageGeneration(images!, prompt);
        
        const newVariation: ImageVariation = {
            ...failedVariation,
            // FIX: Use the mimeType from the `images` array.
            imageUrl: `data:${images![0].mimeType};base64,${newImageBase64}`,
            isLoading: false,
            isError: false,
            retryPayload: undefined,
            createdAt: new Date(),
        };
        updateVariationState(newVariation);

    } catch (error) {
        console.error('Retry failed:', error);
        const newErrorVariation = { ...failedVariation, isLoading: false, isError: true, errorMessage: error instanceof Error ? error.message : 'Retry failed.' };
        updateVariationState(newErrorVariation);
    }
  };


  const handleSelectImage = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
  };

  const handleCloseModal = () => {
    setSelectedImageUrl(null);
  };
  
  const handleAddToChat = async (imageUrl: string) => {
    try {
      const imageFile = await dataUrlToFile(imageUrl, 'remixed_image.png');
      setPrefilledImage(imageFile);
      handleCloseModal();
    } catch (error) {
      console.error("Failed to add image to chat:", error);
    }
  };
  
  const isAssistantLoading = album.chatHistory[album.chatHistory.length - 1]?.isLoading;

  return (
    <div className="flex h-full bg-[#1E1F22]">
      <div 
        style={{ width: `${leftPanelWidth}px` }}
        className="flex flex-col border-r border-black/20 bg-[#131314] flex-shrink-0"
      >
        <header className="p-4 border-b border-black/20 flex items-center h-[65px] flex-shrink-0">
            <h1 className="text-lg font-semibold text-white">{album.title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
            {album.chatHistory.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                onSelectImage={handleSelectImage} 
                onSuggestionClick={handleSuggestionSend}
                onEditImage={onEditImage}
                onAddToAlbum={() => {}}
                onRetry={handleRetry}
                onRetryVariation={handleRetryVariation}
              />
            ))}
            <div ref={chatEndRef} />
        </main>
        <div className="p-4 border-t border-black/20 bg-[#131314]">
            <ChatInput
              onSend={handleSendPrompt}
              prefilledImage={prefilledImage}
              onPrefillConsumed={() => setPrefilledImage(null)}
              isDisabled={!!isAssistantLoading}
            />
        </div>
      </div>

      <div 
        onMouseDown={handleMouseDown}
        className="w-1.5 cursor-col-resize bg-black/20 hover:bg-blue-600 transition-colors flex-shrink-0"
      />

      <div className="hidden md:flex flex-1 flex-col bg-[#0D0D0D]">
        <header className="p-4 border-b border-black/20 flex justify-between items-center h-[65px] flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">{t('galleryTitle')}</h2>
        </header>
        <ImageGallery 
            images={album.galleryImages} 
            onEditImage={onEditImage}
            onRetryVariation={handleRetryVariation} 
        />
      </div>

      {selectedImageUrl && <ImageModal imageUrl={selectedImageUrl} onClose={handleCloseModal} onAddToChat={handleAddToChat} />}
    </div>
  );
};
