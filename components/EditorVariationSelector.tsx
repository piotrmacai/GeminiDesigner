
import React from 'react';
import { ImageVariation } from '../types';

interface EditorVariationSelectorProps {
  variations: ImageVariation[];
  onSelect: (variation: ImageVariation) => void;
  onCancel: () => void;
}

export const EditorVariationSelector: React.FC<EditorVariationSelectorProps> = ({ variations, onSelect, onCancel }) => {
  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40 backdrop-blur-md p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Choose your favorite</h2>
      <div className="grid grid-cols-3 gap-6">
        {variations.map((variation) => (
          <div
            key={variation.id}
            className="group cursor-pointer rounded-lg overflow-hidden ring-2 ring-transparent hover:ring-blue-500 transition-all"
            onClick={() => onSelect(variation)}
          >
            <img
              src={variation.imageUrl}
              alt={variation.title}
              className="w-full h-full object-contain bg-black"
            />
          </div>
        ))}
      </div>
      <button 
        onClick={onCancel}
        className="mt-8 bg-white/10 text-white font-semibold px-5 py-2 rounded-lg hover:bg-white/20"
      >
        Cancel
      </button>
    </div>
  );
};
