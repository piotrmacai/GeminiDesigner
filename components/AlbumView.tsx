import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ImageGallery } from './ImageGallery';
import type { Album, ChatMessage as ChatMessageType, ImageVariation } from '../types';
import { ImageModal } from './ImageModal';
import { dataUrlToFile } from '../utils/imageUtils';
import { t } from '../i18n';
import { generateImageEdits, generateNewImages, retryImageGeneration, retryNewImageGeneration } from '../services/geminiService';
import { DevModeConfirmationModal } from './DevModeConfirmationModal';

interface AlbumViewProps {
  album: Album;
  onUpdateAlbum: (album: Album) => void;
  onSetReferenceImage: (imageUrl: string | null) => void;
  isDevMode: boolean;
}

export const AlbumView: React.FC<AlbumViewProps> = ({ album, onUpdateAlbum, onSetReferenceImage, isDevMode }) => {
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string | null>(null);
  const [prefilledPrompt, setPrefilledPrompt] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [leftPanelWidth, setLeftPanelWidth] = useState(450);
  const isResizing = useRef(false);

  const [devModal, setDevModal] = useState<{isOpen: boolean, data: any, onConfirm: () => void}>({isOpen: false, data: null, onConfirm: () => {}});

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
    async (prompt: string, imageFiles: File[], useWebSearch: boolean, aspectRatio: string) => {
      if (!prompt) return;

      const execute = async () => {
        const userMessageId = Date.now().toString();
        const assistantLoadingId = (Date.now() + 1).toString();
        
        let filesToProcess: File[] = imageFiles;
        let sourceForDisplay: string | undefined = undefined;
        let displayImageUrls = imageFiles.map(file => URL.createObjectURL(file));
        let isNewTextToImage = false;
        
        // Determine files and source image to use
        if (imageFiles.length === 0) {
            if (album.referenceImageUrl) {
                // Case 1: Edit using reference image
                try {
                    const refFile = await dataUrlToFile(album.referenceImageUrl, 'ref.png');
                    filesToProcess = [refFile];
                    sourceForDisplay = album.referenceImageUrl;
                    displayImageUrls = [album.referenceImageUrl];
                } catch (e) { console.error("Could not use reference image", e); return; }
            } else {
                // Case 2: New text-to-image generation
                isNewTextToImage = true;
            }
        } else {
            // Case 3: Edit using newly uploaded image(s). Update the reference.
            const reader = new FileReader();
            reader.readAsDataURL(imageFiles[0]);
            reader.onloadend = () => {
                onSetReferenceImage(reader.result as string);
            };
            sourceForDisplay = displayImageUrls[0];
        }

        try {
          const updatedChatWithUser: ChatMessageType[] = [
            ...album.chatHistory,
            { id: userMessageId, role: 'user', text: prompt, imageUrls: displayImageUrls },
          ];
          onUpdateAlbum({ ...album, chatHistory: updatedChatWithUser });

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
          
          const loadingMessage: ChatMessageType = { id: assistantLoadingId, role: 'assistant', isLoading: true, sourceImageUrl: sourceForDisplay };
          const loadingChatHistory: ChatMessageType[] = [
            ...currentAlbumState.chatHistory,
            loadingMessage,
          ];
          currentAlbumState = { ...currentAlbumState, chatHistory: loadingChatHistory };
          onUpdateAlbum(currentAlbumState);

          try {
            const generator = isNewTextToImage 
                ? generateNewImages(prompt, useWebSearch, aspectRatio)
                : generateImageEdits(await readFilesAsBase64(filesToProcess), prompt, useWebSearch, aspectRatio);

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
                finalVariations.push(result);
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
                  sourceImageUrl: sourceForDisplay,
                  groundingMetadata: groundingData,
              },
            ];
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
                originalRequest: { prompt, imageFiles: filesToProcess, sourceImageUrl: sourceForDisplay, useWebSearch, aspectRatio }
              },
            ];
            const galleryWithoutPlaceholders = currentAlbumState.galleryImages.filter(img => !img.isLoading);
            onUpdateAlbum({ ...album, chatHistory: finalChatHistory, galleryImages: galleryWithoutPlaceholders });
          }
        } finally {
          displayImageUrls.forEach(url => {
             // Only revoke blob URLs, not data URLs from reference
            if (url.startsWith('blob:')) {
              URL.revokeObjectURL(url)
            }
          });
        }
      };

      if (isDevMode) {
        setDevModal({
            isOpen: true,
            data: { prompt, imageFiles, useWebSearch, aspectRatio },
            onConfirm: () => {
                setDevModal({isOpen: false, data: null, onConfirm: () => {}});
                execute();
            }
        });
      } else {
        execute();
      }
    },
    [album, onUpdateAlbum, isDevMode, onSetReferenceImage]
  );
  
  const handleSuggestionSend = async (suggestion: string, sourceImageUrl?: string) => {
    if (sourceImageUrl) {
      onSetReferenceImage(sourceImageUrl);
    }
    setPrefilledPrompt(suggestion);
  };

  const handleRetry = (failedMessage: ChatMessageType) => {
    if (!failedMessage.originalRequest) return;
    const historyWithoutError = album.chatHistory.filter(m => m.id !== failedMessage.id);
    onUpdateAlbum({ ...album, chatHistory: historyWithoutError });
    const { prompt, imageFiles, useWebSearch, aspectRatio } = failedMessage.originalRequest;
    handleSendPrompt(prompt, imageFiles, useWebSearch, aspectRatio);
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
        const { images, prompt, aspectRatio } = failedVariation.retryPayload;
        let newImageBase64: string;
        let mimeType = 'image/png';

        if (images && images.length > 0) {
            newImageBase64 = await retryImageGeneration(images, prompt);
            mimeType = images[0].mimeType;
        } else {
            newImageBase64 = await retryNewImageGeneration(prompt, aspectRatio || '1:1');
        }
        
        const newVariation: ImageVariation = {
            ...failedVariation,
            imageUrl: `data:${mimeType};base64,${newImageBase64}`,
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
    onSetReferenceImage(imageUrl);
    handleCloseModal();
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
                onEditImage={(variation) => onSetReferenceImage(variation.imageUrl)}
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
              referenceImageUrl={album.referenceImageUrl}
              onClearReferenceImage={() => onSetReferenceImage(null)}
              prefilledPrompt={prefilledPrompt}
              onPrefillConsumed={() => setPrefilledPrompt('')}
              isDisabled={!!isAssistantLoading}
            />
        </div>
      </div>

      <div 
        onMouseDown={handleMouseDown}
        className="w-1.5 cursor-col-resize bg-black/20 hover:bg-blue-600 transition-colors flex-shrink-0"
        title={t('tooltipResizePanel')}
      />

      <div className="hidden md:flex flex-1 flex-col bg-[#0D0D0D]">
        <header className="p-4 border-b border-black/20 flex justify-between items-center h-[65px] flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">{t('galleryTitle')}</h2>
        </header>
        <ImageGallery 
            images={album.galleryImages} 
            onEditImage={(variation) => onSetReferenceImage(variation.imageUrl)}
            onRetryVariation={handleRetryVariation} 
        />
      </div>

      {selectedImageUrl && <ImageModal imageUrl={selectedImageUrl} onClose={handleCloseModal} onAddToChat={handleAddToChat} />}
      <DevModeConfirmationModal 
        isOpen={devModal.isOpen}
        onClose={() => setDevModal({isOpen: false, data: null, onConfirm: () => {}})}
        onConfirm={devModal.onConfirm}
        promptData={devModal.data}
      />
    </div>
  );
};
