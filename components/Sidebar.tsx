import React from 'react';
import { t } from '../i18n';
import { NewAlbumIcon } from './icons/NewAlbumIcon';
import { DevModeIcon } from './icons/DevModeIcon';

interface SidebarProps {
  onNewAlbum: () => void;
  isDevMode: boolean;
  onToggleDevMode: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const SidebarButton: React.FC<{
    onClick: () => void;
    label: string;
    tooltip: string;
    isExpanded: boolean;
    children: React.ReactNode;
}> = ({ onClick, label, tooltip, isExpanded, children }) => {
    return (
        <button 
            onClick={onClick} 
            className="flex items-center w-full p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg"
            title={isExpanded ? undefined : tooltip}
        >
            {children}
            <span className={`ml-4 text-sm font-semibold whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                {label}
            </span>
        </button>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ onNewAlbum, isDevMode, onToggleDevMode, isExpanded, onToggleExpand }) => {
  const ToggleIcon = isExpanded
    ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

  return (
    <aside className={`bg-[#0D0D0D] flex flex-col items-center py-4 flex-shrink-0 border-r border-white/10 transition-all duration-300 ${isExpanded ? 'w-56 px-3' : 'w-16'}`}>
      <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center text-2xl font-bold text-black flex-shrink-0">
        A
      </div>
      <div className={`flex flex-col items-center space-y-2 mt-6 w-full ${isExpanded ? 'items-stretch' : ''}`}>
        <SidebarButton onClick={onNewAlbum} label={t('newChat')} tooltip={t('tooltipNewAlbum')} isExpanded={isExpanded}><NewAlbumIcon /></SidebarButton>
      </div>

      <div className="flex-1"></div>

      <div className={`flex flex-col items-center space-y-2 w-full ${isExpanded ? 'items-stretch' : ''}`}>
        <button 
            onClick={onToggleDevMode} 
            className={`flex items-center w-full p-2 rounded-lg transition-colors ${isDevMode ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
            title={isExpanded ? undefined : t('tooltipDevMode')}
        >
          <DevModeIcon />
           <span className={`ml-4 text-sm font-semibold whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                {t('devMode')}
            </span>
        </button>
        <button
            onClick={onToggleExpand}
            className="flex items-center w-full p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg"
            title={isExpanded ? t('tooltipToggleSidebarCollapse') : t('tooltipToggleSidebarExpand')}
        >
            {ToggleIcon}
        </button>
      </div>
    </aside>
  );
};