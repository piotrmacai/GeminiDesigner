

import React from 'react';
import { ImageVariation } from '../types';
import { t } from '../i18n';

interface ImageVariationErrorCardProps {
    variation: ImageVariation;
    onRetry: (variation: ImageVariation) => void;
}

export const ImageVariationErrorCard: React.FC<ImageVariationErrorCardProps> = ({ variation, onRetry }) => {
    return (
        <div className="flex items-center gap-4">
            <div className="w-32 h-32 rounded-lg bg-gray-800 border border-red-500/30 flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-red-400 truncate">{t('errorTitle')}</h4>
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {variation.errorMessage}
                </p>
                <div className="mt-3">
                    <button
                        onClick={() => onRetry(variation)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors"
                        title={t('retry')}
                    >
                        {t('retry')}
                    </button>
                </div>
            </div>
        </div>
    )
}
