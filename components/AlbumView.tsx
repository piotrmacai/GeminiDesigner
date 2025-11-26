
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ImageGallery } from './ImageGallery';
import { EditorView } from './EditorView';
import type { Album, ChatMessage as ChatMessageType, ImageVariation } from '../types';
import { ImageModal } from './ImageModal';
import { dataUrlToFile } from '../utils/imageUtils';
import { t } from '../i18n';
import { generateImageEdits, generateNewImages, retryImageGeneration, retryNewImageGeneration } from '../services/geminiService';
import { DevModeConfirmationModal } from './DevModeConfirmationModal';

interface AlbumViewProps {
  album: Album;
  onUpdateAlbum: (album: Album) => void;
  onUpdateReferenceImages: (imageUrls: string[]) => void;
  isDevMode: boolean;
}

export const AlbumView: React.FC<AlbumViewProps> = ({ album, onUpdateAlbum, onUpdateReferenceImages, isDevMode }) => {
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string | null>(null);
  const [prefilledPrompt, setPrefilledPrompt] = useState('');
  const [editingImage, setEditingImage] = useState<ImageVariation | null>(null);
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
    if (!editingImage) {
        scrollToBottom();
    }
  }, [album.chatHistory, editingImage]);
  
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
    });
  };

  const dataUrlToBase64 = (dataUrl: string) => {
      return {
          base64Data: dataUrl.split(',')[1],
          mimeType: dataUrl.match(/:(.*?);/)?.[1] || 'image/png'
      };
  };

  const handleSendPrompt = useCallback(
    async (prompt: string, imageFiles: File[], useWebSearch: boolean, aspectRatio: string, explicitReferenceUrls?: string[]) => {
      if (!prompt) return;

      const execute = async () => {
        const userMessageId = Date.now().toString();
        const assistantLoadingId = (Date.now() + 1).toString();
        
        // 1. Accumulate new images into references
        // The rule: First uploaded image in session is first reference. Subsequent uploads append.
        let currentReferenceUrls = explicitReferenceUrls || [...(album.referenceImageUrls || [])];
        let newUploadedUrls: string[] = [];

        if (imageFiles.length > 0) {
            newUploadedUrls = await Promise.all(imageFiles.map(file => fileToDataUrl(file)));
            currentReferenceUrls = [...currentReferenceUrls, ...newUploadedUrls];
            // Update album state immediately with new references
            onUpdateReferenceImages(currentReferenceUrls);
        }

        const isNewTextToImage = currentReferenceUrls.length === 0;
        const sourceForDisplay = currentReferenceUrls.length > 0 ? currentReferenceUrls[0] : undefined;
        // Display uploads for this specific message
        let displayImageUrls = [...newUploadedUrls]; 

        try {
          const updatedChatWithUser: ChatMessageType[] = [
            ...album.chatHistory,
            { id: userMessageId, role: 'user', text: prompt, imageUrls: displayImageUrls },
          ];
          
          const placeholderVariations: ImageVariation[] = Array(3).fill(null).map((_, i) => ({
              id: `placeholder-${Date.now()}-${i}`,
              title: 'Loading...',
              description: '...',
              imageUrl: '',
              createdAt: new Date(),
              isLoading: true,
          }));
          
          let currentAlbumState = { ...album, chatHistory: updatedChatWithUser, galleryImages: [...album.galleryImages, ...placeholderVariations], referenceImageUrls: currentReferenceUrls };
          onUpdateAlbum(currentAlbumState);
          
          const loadingMessage: ChatMessageType = { id: assistantLoadingId, role: 'assistant', isLoading: true, sourceImageUrl: sourceForDisplay };
          const loadingChatHistory: ChatMessageType[] = [
            ...currentAlbumState.chatHistory,
            loadingMessage,
          ];
          currentAlbumState = { ...currentAlbumState, chatHistory: loadingChatHistory };
          onUpdateAlbum(currentAlbumState);

          try {
            // Prepare images for API
            const imagesForApi = currentReferenceUrls.map(url => dataUrlToBase64(url));

            const generator = isNewTextToImage 
                ? generateNewImages(prompt, useWebSearch, aspectRatio)
                : generateImageEdits(imagesForApi, prompt, useWebSearch, aspectRatio);

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
                originalRequest: { prompt, imageFiles: imageFiles, sourceImageUrl: sourceForDisplay, useWebSearch, aspectRatio }
              },
            ];
            const galleryWithoutPlaceholders = currentAlbumState.galleryImages.filter(img => !img.isLoading);
            onUpdateAlbum({ ...album, chatHistory: finalChatHistory, galleryImages: galleryWithoutPlaceholders });
          }
        } finally {
             // Cleanup if needed
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
    [album, onUpdateAlbum, isDevMode, onUpdateReferenceImages]
  );
  
  const handleSuggestionSend = useCallback(async (suggestion: string, sourceImageUrl?: string) => {
    // If suggestion is clicked with a source image, we treat that source as context for the prompt
    let effectiveRefs = [...(album.referenceImageUrls || [])];
    
    // If there are no references yet, and this suggestion comes from an image, add it.
    if (sourceImageUrl && effectiveRefs.length === 0) {
        effectiveRefs.push(sourceImageUrl);
        onUpdateReferenceImages(effectiveRefs);
    }
    
    // Attempt to determine aspectRatio from source if available, else 1:1
    let ar = '1:1';
    if (sourceImageUrl) {
         try {
            const img = new Image();
            img.src = sourceImageUrl;
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
            const ratio = img.naturalWidth / img.naturalHeight;
            const aspectRatios = [
                { key: '1:1', val: 1 }, { key: '4:3', val: 4 / 3 }, { key: '3:4', val: 3 / 4 },
                { key: '16:9', val: 16 / 9 }, { key: '9:16', val: 9 / 16 },
            ];
            const closest = aspectRatios.reduce((prev, curr) => 
                Math.abs(curr.val - ratio) < Math.abs(prev.val - ratio) ? curr : prev
            );
            ar = closest.key;
        } catch(e) {}
    }
    
    handleSendPrompt(suggestion, [], false, ar, effectiveRefs);
  }, [handleSendPrompt, onUpdateReferenceImages, album.referenceImageUrls]);

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
    // Add image to reference list
    onUpdateReferenceImages([...(album.referenceImageUrls || []), imageUrl]);
    handleCloseModal();
  };
  
  const handleEditVariation = (variation: ImageVariation) => {
    setEditingImage(variation);
  };
  
  const isAssistantLoading = album.chatHistory[album.chatHistory.length - 1]?.isLoading;

  if (editingImage) {
      return (
          <EditorView 
            image={editingImage}
            onDone={(newVariation) => {
                if (newVariation) {
                    const updatedGallery = [newVariation, ...album.galleryImages];
                    onUpdateAlbum({ ...album, galleryImages: updatedGallery });
                }
                setEditingImage(null);
            }}
            isDevMode={isDevMode}
          />
      );
  }

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
                onEditImage={handleEditVariation}
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
              referenceImageUrls={album.referenceImageUrls}
              onRemoveReferenceImage={(index) => {
                  const newRefs = [...(album.referenceImageUrls || [])];
                  newRefs.splice(index, 1);
                  onUpdateReferenceImages(newRefs);
              }}
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
            onEditImage={handleEditVariation}
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
