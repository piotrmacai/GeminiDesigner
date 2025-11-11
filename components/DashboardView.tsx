

import React, { useState } from 'react';
import { t } from '../i18n';
import type { Album } from '../types';

interface DashboardViewProps {
  albums: Album[];
  onSelectAlbum: (albumId: string) => void;
  onNewAlbum: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ albums, onSelectAlbum, onNewAlbum }) => {
  const [activeTab, setActiveTab] = useState<'albums' | 'inspiration'>('albums');
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="p-8 h-full bg-[#131314]">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">{t('appName')}</h1>
      </header>
      
      <div className="mb-6 border-b border-gray-700/50">
        <nav className="-mb-px flex space-x-6">
          <button 
            onClick={() => setActiveTab('albums')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'albums' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            {t('myAlbums')}
          </button>
          <button
            onClick={() => setActiveTab('inspiration')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'inspiration' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            {t('inspiration')}
          </button>
        </nav>
      </div>

      <div>
        {activeTab === 'albums' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            <button 
              onClick={onNewAlbum}
              className="flex flex-col items-center justify-center bg-[#212124] rounded-lg aspect-square hover:bg-gray-800 transition-colors text-gray-400"
              title={t('tooltipNewAlbum')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span className="mt-2 text-sm font-medium">{t('newAlbum')}</span>
            </button>
            {albums.map(album => (
              <div key={album.id} onClick={() => onSelectAlbum(album.id)} className="cursor-pointer group">
                <div className="bg-[#212124] rounded-lg aspect-square mb-2 group-hover:ring-2 ring-blue-500 transition-all">
                  {/* Placeholder for album preview */}
                </div>
                <h3 className="font-medium text-white truncate">{album.title}</h3>
                <p className="text-xs text-gray-400">{formatDate(album.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'inspiration' && (
           <p className="text-gray-400">Inspiration content coming soon.</p>
        )}
      </div>
    </div>
  );
};
