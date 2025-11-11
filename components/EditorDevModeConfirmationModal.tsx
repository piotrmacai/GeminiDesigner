
import React from 'react';
import { t } from '../i18n';
import { Spinner } from './Spinner';

interface ModalData {
  title: string;
  prompt: string;
  images: { title: string; url: string }[];
}

interface EditorDevModeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  modalData: ModalData | null;
}

export const EditorDevModeConfirmationModal: React.FC<EditorDevModeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  modalData,
}) => {
  if (!isOpen || !modalData) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1C1C1E] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">{modalData.title}</h2>
        </header>
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">{t('devModePromptLabel')}</label>
            <pre className="bg-[#131314] text-gray-200 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono">{modalData.prompt}</pre>
          </div>
          <div className="flex gap-4 items-start flex-wrap">
            {modalData.images.map((image, index) => (
              <div key={index} className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-400 mb-2">{image.title}</label>
                {image.url ? (
                  <img src={image.url} alt={image.title} className="rounded-lg max-h-48 w-auto bg-black border border-white/10" />
                ) : (
                  <div className="h-48 bg-[#131314] rounded-lg flex items-center justify-center">
                    <Spinner />
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
        <footer className="p-4 border-t border-white/10 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="bg-[#2C2C2E] hover:bg-gray-700 text-white font-semibold px-5 py-2 rounded-lg">
            {t('devModeCancel')}
          </button>
          <button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg">
            {t('devModeConfirm')}
          </button>
        </footer>
      </div>
    </div>
  );
};
