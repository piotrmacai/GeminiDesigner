import React, { useState, useCallback, useEffect } from 'react';
import { AlbumView } from './components/AlbumView';
import { Sidebar } from './components/Sidebar';
import type { Album, ImageVariation } from './types';
import { dataUrlToFile } from './utils/imageUtils';

const App: React.FC = () => {
  const [album, setAlbum] = useState<Album | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const handleCreateNewChat = useCallback(() => {
    const newAlbum: Album = {
      id: Date.now().toString(),
      title: `Chat Session`,
      chatHistory: [],
      galleryImages: [],
      createdAt: new Date(),
      referenceImageUrl: null,
    };
    setAlbum(newAlbum);
  }, []);

  // Effect to handle initial app load
  useEffect(() => {
    if (!album) {
      handleCreateNewChat();
    }
  }, [album, handleCreateNewChat]);
  
  const handleSetReferenceImage = useCallback((imageUrl: string | null) => {
    if (album) {
      setAlbum({ ...album, referenceImageUrl: imageUrl });
    }
  }, [album]);


  return (
    <div className="h-screen bg-[#0D0D0D] text-gray-200 flex">
      <Sidebar 
        onNewAlbum={handleCreateNewChat} 
        isDevMode={isDevMode}
        onToggleDevMode={() => setIsDevMode(prev => !prev)}
        isExpanded={isSidebarExpanded}
        onToggleExpand={() => setIsSidebarExpanded(prev => !prev)}
      />
      <div className="flex-1 h-full overflow-y-auto">
        {album && (
            <AlbumView 
                album={album} 
                onUpdateAlbum={setAlbum} 
                onSetReferenceImage={handleSetReferenceImage}
                isDevMode={isDevMode}
            />
        )}
      </div>
    </div>
  );
};

export default App;
