

import React from 'react';
import { t } from '../i18n';

interface RemixingCardProps {
  imageUrl?: string;
  statusMessage?: string;
}

export const RemixingCard: React.FC<RemixingCardProps> = ({ imageUrl, statusMessage }) => {
  return (
    <div className="bg-[#1C1C1E] rounded-2xl p-4 w-full">
      <h3 className="font-semibold text-lg mb-1 text-white">
        {t('remixingInProgress')}
      </h3>
       {statusMessage && <p className="text-sm text-gray-400 mb-3">{statusMessage}</p>}
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-800">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Remixing preview"
            className="w-full h-full object-cover filter blur-md saturate-150 scale-110"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-red-500/20 to-yellow-500/20 mix-blend-overlay"></div>
        <div className="absolute bottom-0 left-0 right-0 p-2">
            <div className="bg-white/10 h-1 rounded-full overflow-hidden">
                <div className="bg-white h-full rounded-full progress-bar"></div>
            </div>
        </div>
      </div>
    </div>
  );
};