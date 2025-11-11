
import React from 'react';
import { t } from '../i18n';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
  onAddToChat: (imageUrl: string) => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose, onAddToChat }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative p-4 bg-transparent rounded-lg max-w-4xl max-h-[90vh] flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt={t('selectImage')} 
          className="w-full h-auto object-contain max-h-[calc(90vh-80px)]" // Adjust max height to leave space for button
        />

        <div className="flex justify-center">
            <button 
              onClick={() => onAddToChat(imageUrl)}
              className="bg-white/90 text-black rounded-full px-6 py-3 text-base font-semibold hover:bg-white transition-colors flex items-center gap-2"
              title={t('tooltipAddToChat')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              {t('addToChat')}
            </button>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
          aria-label={t('close')}
          title={t('tooltipCloseModal')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};
