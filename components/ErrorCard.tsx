

import React from 'react';
import { t } from '../i18n';
import type { ChatMessage } from '../types';

interface ErrorCardProps {
  message: ChatMessage;
  onRetry: (failedMessage: ChatMessage) => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({ message, onRetry }) => {
  
  const isBlockError = message.text?.includes('blocked');
  
  return (
    <div className="bg-[#2C2C2E] rounded-2xl p-4 w-full border border-red-500/50">
      <h4 className="font-semibold text-red-400">{t('errorTitle')}</h4>
      <p className="text-sm text-gray-300 mt-1">
        {isBlockError ? t('errorBlocked') : message.text}
      </p>
      {message.originalRequest && (
        <div className="mt-4">
          <button
            onClick={() => onRetry(message)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
            title={t('retry')}
          >
            {t('retry')}
          </button>
        </div>
      )}
    </div>
  );
};
