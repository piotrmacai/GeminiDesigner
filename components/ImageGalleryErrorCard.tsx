

import React from 'react';
import { ImageVariation } from '../types';
import { t } from '../i18n';

interface ImageGalleryErrorCardProps {
  image: ImageVariation;
  onRetry: (image: ImageVariation) => void;
}

export const ImageGalleryErrorCard: React.FC<ImageGalleryErrorCardProps> = ({ image, onRetry }) => {
  return (
    <div className="w-full h-auto bg-[#2C2C2E] rounded-lg aspect-[3/4] p-4 flex flex-col justify-between border border-red-500/30">
      <div>
        <h3 className="font-semibold text-red-400">{t('errorTitle')}</h3>
        <p className="text-xs text-gray-300 mt-2 line-clamp-5">
          {image.errorMessage}
        </p>
      </div>
      <button 
        onClick={() => onRetry(image)} 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors mt-2"
        title={t('retry')}
      >
        {t('retry')}
      </button>
    </div>
  );
};
