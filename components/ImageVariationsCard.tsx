

import React from 'react';
import type { ImageVariation, GroundingChunk } from '../types';
import { t } from '../i18n';
import { ExpandIcon } from './icons/ExpandIcon';
import { EditIcon } from './icons/EditIcon';
import { FollowUpSuggestions } from './FollowUpSuggestions';
import { ImageVariationErrorCard } from './ImageVariationErrorCard';
import { DownloadIcon } from './icons/DownloadIcon';
import { downloadImage } from '../utils/imageUtils';


interface ImageVariationsCardProps {
  variations: ImageVariation[];
  onSelectImage: (imageUrl: string) => void;
  onEditImage: (variation: ImageVariation) => void;
  onAddToAlbum: (variation: ImageVariation) => void;
  suggestions?: string[];
  onSuggestionClick: (suggestion: string) => void;
  groundingMetadata?: { groundingChunks: GroundingChunk[] };
  onRetryVariation: (variation: ImageVariation) => void;
}

export const ImageVariationsCard: React.FC<ImageVariationsCardProps> = ({
  variations,
  onSelectImage,
  onEditImage,
  suggestions,
  onSuggestionClick,
  groundingMetadata,
  onRetryVariation,
}) => {
  return (
    <div className="bg-[#1C1C1E] rounded-2xl p-4 w-full">
      <div className="space-y-6">
        {variations.map((variation) => (
            variation.isError ? (
                <ImageVariationErrorCard key={variation.id} variation={variation} onRetry={onRetryVariation} />
            ) : (
                <div key={variation.id} className="flex items-center gap-4">
                    <img
                    src={variation.imageUrl}
                    alt={variation.title}
                    className="w-32 h-32 rounded-lg object-cover bg-gray-800 cursor-pointer flex-shrink-0"
                    onClick={() => onSelectImage(variation.imageUrl)}
                    />
                    <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">{variation.title}</h4>
                    <p className="text-sm text-gray-400 mt-1">
                        {variation.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <button 
                        onClick={() => onEditImage(variation)}
                        className="bg-[#2C2C2E] hover:bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                        aria-label={t('editImage')}
                        title={t('tooltipEditVariation')}
                        >
                        <EditIcon />
                        </button>
                        <button 
                        onClick={() => onSelectImage(variation.imageUrl)}
                        className="bg-[#2C2C2E] hover:bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                        aria-label={t('selectImage')}
                        title={t('tooltipViewImage')}
                        >
                        <ExpandIcon />
                        </button>
                        <button
                          onClick={() => downloadImage(variation.imageUrl, variation.title)}
                          className="bg-[#2C2C2E] hover:bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                          aria-label={t('downloadImage')}
                          title={t('tooltipDownloadImage')}
                        >
                          <DownloadIcon />
                        </button>
                    </div>
                    </div>
                </div>
            )
        ))}
      </div>
      
      {suggestions && suggestions.length > 0 && (
            <FollowUpSuggestions 
              suggestions={suggestions}
              onSuggestionClick={onSuggestionClick}
            />
      )}
    </div>
  );
};
