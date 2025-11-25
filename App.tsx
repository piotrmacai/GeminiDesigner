
import React, { useState, useCallback, useEffect } from 'react';
import { AlbumView } from './components/AlbumView';
import { Sidebar } from './components/Sidebar';
import type { Album } from './types';

const App: React.FC = () => {
  const [album, setAlbum] = useState<Album | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const handleCreateNewChat = useCallback(() => {
    const newAlbum: Album = {
      id: Date.now().toString(),
      title: `New Product Shoot`,
      chatHistory: [],
      galleryImages: [],
      createdAt: new Date(),
      referenceImageUrls: [],
    };
    setAlbum(newAlbum);
  }, []);

  // Effect to handle initial app load
  useEffect(() => {
    if (!album) {
      handleCreateNewChat();
    }
  }, [album, handleCreateNewChat]);
  
  const handleUpdateReferenceImages = useCallback((imageUrls: string[]) => {
    if (album) {
      setAlbum({ ...album, referenceImageUrls: imageUrls });
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
                onUpdateReferenceImages={handleUpdateReferenceImages}
                isDevMode={isDevMode}
            />
        )}
      </div>
    </div>
  );
};

export default App;
