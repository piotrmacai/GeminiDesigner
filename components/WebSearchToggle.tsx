

import React from 'react';
import { t } from '../i18n';

interface WebSearchToggleProps {
  isEnabled: boolean;
  onToggle: (isEnabled: boolean) => void;
}

export const WebSearchToggle: React.FC<WebSearchToggleProps> = ({ isEnabled, onToggle }) => {
  return (
    <button
      onClick={() => onToggle(!isEnabled)}
      title={t('tooltipToggleWebSearch')}
      className={`p-2 rounded-lg transition-colors ${isEnabled ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400 hover:text-white'}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    </button>
  );
};
