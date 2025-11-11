

import React from 'react';
import { ImageVariation } from '../types';
import { t } from '../i18n';
import { EditIcon } from './icons/EditIcon';
import { ImageGalleryLoader } from './ImageGalleryLoader';
import { ImageGalleryErrorCard } from './ImageGalleryErrorCard';
import { DownloadIcon } from './icons/DownloadIcon';
import { downloadImage } from '../utils/imageUtils';

interface ImageGalleryProps {
  images: ImageVariation[];
  onEditImage: (image: ImageVariation) => void;
  onRetryVariation: (image: ImageVariation) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, onEditImage, onRetryVariation }) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="masonry-gallery">
        {images.map((image) => (
          <div key={image.id} className="masonry-item">
            {image.isLoading ? (
              <ImageGalleryLoader />
            ) : image.isError ? (
                <ImageGalleryErrorCard image={image} onRetry={onRetryVariation} />
            ) : (
              <div className="group relative rounded-lg overflow-hidden">
                <img 
                  src={image.imageUrl} 
                  alt={image.title} 
                  className="w-full h-auto object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <h3 className="text-white font-semibold text-base truncate">{image.title}</h3>
                  <p className="text-gray-300 text-xs mt-1">{formatDate(image.createdAt)}</p>
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEditImage(image); }}
                      className="bg-black/50 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                      aria-label={t('editImage')}
                      title={t('tooltipEditVariation')}
                    >
                      <EditIcon />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); downloadImage(image.imageUrl, image.title); }}
                      className="bg-black/50 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                      aria-label={t('downloadImage')}
                      title={t('tooltipDownloadImage')}
                    >
                      <DownloadIcon />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
