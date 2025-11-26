
import React, { useState, useRef, useEffect } from 'react';
import { t } from '../i18n';
import { WebSearchToggle } from './WebSearchToggle';
import { CheckIcon } from './icons/CheckIcon';

interface ChatInputProps {
  onSend: (prompt: string, imageFiles: File[], useWebSearch: boolean, aspectRatio: string) => void;
  referenceImageUrls?: string[];
  onRemoveReferenceImage: (index: number) => void;
  prefilledPrompt?: string;
  onPrefillConsumed?: () => void;
  isDisabled?: boolean;
}

const aspectRatios = [
    { key: '1:1', label: t('aspectRatioSquare'), value: '1:1' },
    { key: '4:3', label: t('aspectRatioLandscape'), value: '4:3' },
    { key: '3:4', label: t('aspectRatioPortrait'), value: '3:4' },
    { key: '16:9', label: t('aspectRatioLandscape'), value: '16:9' },
    { key: '9:16', label: t('aspectRatioPortrait'), value: '9:16' },
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  referenceImageUrls = [],
  onRemoveReferenceImage,
  prefilledPrompt,
  onPrefillConsumed,
  isDisabled = false,
}) => {
  const [prompt, setPrompt] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isAspectRatioMenuOpen, setIsAspectRatioMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ratioMenuRef = useRef<HTMLDivElement>(null);
  
  // Close aspect ratio menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ratioMenuRef.current && !ratioMenuRef.current.contains(event.target as Node)) {
        setIsAspectRatioMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  useEffect(() => {
    return () => {
      imageUrls.forEach(url => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrls]);

  useEffect(() => {
    if (prefilledPrompt) {
      setPrompt(prefilledPrompt);
      onPrefillConsumed?.();
    }
  }, [prefilledPrompt, onPrefillConsumed]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      const newFiles = [...imageFiles, ...files];
      setImageFiles(newFiles);

      const newUrls = files.map(file => URL.createObjectURL(file));
      setImageUrls(prev => [...prev, ...newUrls]);
    }
  };

  const handleSend = () => {
    if (prompt.trim() && onSend) {
      onSend(prompt.trim(), imageFiles, useWebSearch, aspectRatio);
      setPrompt('');
      setImageFiles([]);
      setImageUrls([]); // URLs are revoked in useEffect cleanup
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };
  
  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => {
        // No need to revoke here, useEffect handles it when the array changes.
        return prev.filter((_, i) => i !== index);
    });
  }
  
  const handleSelectRatio = (ratio: string) => {
    setAspectRatio(ratio);
    setIsAspectRatioMenuOpen(false);
  }
  
  const hasReferences = referenceImageUrls.length > 0;
  const hasUploads = imageFiles.length > 0;

  return (
    <div className="bg-[#1C1C1E] rounded-2xl flex items-start p-2.5 shadow-lg w-full">
      <div className="flex-1 flex flex-col">
        {/* Display Reference Images */}
        {hasReferences && (
          <div className="mb-2">
             <span className="text-xs text-blue-400 font-semibold mb-1 block uppercase tracking-wider">Active Context (Ref Images)</span>
             <div className="flex items-center flex-wrap gap-2 px-1">
                {referenceImageUrls.map((url, index) => (
                    <div key={`ref-${index}`} className="relative group">
                        <img src={url} alt={`Reference ${index + 1}`} className="w-12 h-12 rounded-lg object-cover border-2 border-blue-500/50" />
                        <div className="absolute -bottom-2 -right-2 bg-blue-600 text-[10px] text-white px-1.5 py-0.5 rounded-full shadow-sm z-10 pointer-events-none">#{index + 1}</div>
                        <button 
                        onClick={() => onRemoveReferenceImage(index)}
                        className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold border-2 border-[#1C1C1E] hover:bg-red-500 transition-colors"
                        aria-label="Remove reference"
                        title="Remove reference"
                        >
                        &times;
                        </button>
                    </div>
                ))}
             </div>
          </div>
        )}

        {/* Display New Uploads */}
        {hasUploads && (
          <div className="mb-2">
             <span className="text-xs text-green-400 font-semibold mb-1 block uppercase tracking-wider">New Uploads</span>
             <div className="flex items-center flex-wrap gap-2 px-1">
                {imageUrls.map((url, index) => (
                <div key={`upload-${index}`} className="relative">
                    <img src={url} alt={`Upload preview ${index + 1}`} className="w-12 h-12 rounded-lg object-cover border border-green-500/30" />
                    <button 
                    onClick={() => removeImage(index)}
                    className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold border-2 border-[#1C1C1E] hover:bg-red-500 transition-colors"
                    aria-label={`Remove image ${index + 1}`}
                    title={t('tooltipRemoveImage')}
                    >
                    &times;
                    </button>
                </div>
                ))}
             </div>
          </div>
        )}

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasReferences || hasUploads ? t('chatPlaceholderEdit') : t('chatPlaceholderNew')}
          className="bg-transparent text-white placeholder-gray-500 focus:outline-none text-base w-full px-1 py-1"
          disabled={isDisabled}
        />
      </div>
      <div className="flex items-center self-end gap-1 mt-1">
        <WebSearchToggle isEnabled={useWebSearch} onToggle={setUseWebSearch} />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
          multiple
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-400 hover:text-white"
          disabled={isDisabled}
          title={t('tooltipAddImage')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </button>
        <div className="relative" ref={ratioMenuRef}>
            <button
              onClick={() => setIsAspectRatioMenuOpen(prev => !prev)}
              className="p-2 text-gray-400 hover:text-white"
              disabled={isDisabled}
              title={t('tooltipAspectRatio')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            </button>
            {isAspectRatioMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-[#2C2C2E] rounded-lg shadow-xl border border-white/10 w-48 p-2 z-10">
                    <p className="px-2 py-1 text-xs font-semibold text-gray-400">{t('aspectRatio')}</p>
                    {aspectRatios.map(ratio => (
                        <button key={ratio.key} onClick={() => handleSelectRatio(ratio.value)} className="w-full text-left flex items-center justify-between px-2 py-1.5 text-sm text-gray-200 hover:bg-white/10 rounded-md">
                           <span>{ratio.label} ({ratio.value})</span>
                           {aspectRatio === ratio.value && <CheckIcon />}
                        </button>
                    ))}
                </div>
            )}
        </div>
        <button
          onClick={handleSend}
          disabled={!prompt.trim() || isDisabled}
          className="p-2 rounded-full bg-gray-700 text-white disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          title={t('tooltipSendMessage')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};
