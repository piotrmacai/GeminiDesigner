

import React from 'react';
import type { ChatMessage as ChatMessageType, ImageVariation } from '../types';
import { ImageVariationsCard } from './ImageVariationsCard';
import { RemixingCard } from './RemixingCard';
import { ErrorCard } from './ErrorCard';

interface ChatMessageProps {
  message: ChatMessageType;
  onSelectImage: (imageUrl: string) => void;
  onSuggestionClick: (suggestion: string, sourceImageUrl?: string) => void;
  onEditImage: (variation: ImageVariation) => void;
  onAddToAlbum: (variation: ImageVariation) => void;
  onRetry: (failedMessage: ChatMessageType) => void;
  onRetryVariation: (variation: ImageVariation) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSelectImage, onSuggestionClick, onEditImage, onAddToAlbum, onRetry, onRetryVariation }) => {
  const { role, text, imageUrls, variations, isLoading, isError, sourceImageUrl, followUpSuggestions, groundingMetadata, statusMessage } = message;

  const renderContent = () => {
    if (isLoading) {
      return <RemixingCard imageUrl={sourceImageUrl} statusMessage={statusMessage} />;
    }
    if (isError) {
      return <ErrorCard message={message} onRetry={onRetry} />;
    }
    if (variations) {
      return (
          <ImageVariationsCard 
            variations={variations} 
            onSelectImage={onSelectImage} 
            onEditImage={onEditImage}
            onAddToAlbum={onAddToAlbum}
            suggestions={followUpSuggestions}
            onSuggestionClick={(suggestion) => onSuggestionClick(suggestion, sourceImageUrl)}
            groundingMetadata={groundingMetadata}
            onRetryVariation={onRetryVariation}
          />
      );
    }
    return <p className="whitespace-pre-wrap">{text}</p>;
  };

  if (role === 'user') {
    return (
      <div className="flex justify-end my-2">
        <div className="bg-[#36373B] rounded-2xl p-4 max-w-xl">
          <div className="flex items-start gap-3">
            {imageUrls && imageUrls.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {imageUrls.map((url, index) => (
                    <div key={index} className="relative">
                        <img
                            src={url}
                            alt={`User upload ${index + 1}`}
                            className="w-12 h-12 rounded-lg object-cover"
                        />
                        {imageUrls.length > 1 && (
                            <div className="absolute -top-1 -left-1 bg-white text-black text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-[#36373B]">
                                {index + 1}
                            </div>
                        )}
                    </div>
                ))}
              </div>
            )}
            <p className="flex-1 text-base text-gray-200">{text}</p>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start my-2">
      <div className={`max-w-2xl w-full`}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0">
            {/* Assistant Icon Placeholder */}
          </div>
          <div className="flex-1 text-base text-gray-300 space-y-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};