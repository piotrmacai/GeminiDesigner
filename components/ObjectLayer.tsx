
import React, { useState, useEffect, useRef } from 'react';
import type { DetectedObject } from '../types';
import { t } from '../i18n';

interface ObjectLayerProps {
  object: DetectedObject;
  level: number;
  selectedObjectId: string | null;
  onSelect: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onRename: (id: string, newLabel: string) => void;
}

export const ObjectLayer: React.FC<ObjectLayerProps> = ({ object, level, selectedObjectId, onSelect, isExpanded, onToggleExpand, onRename }) => {
  const isSelected = selectedObjectId === object.id;
  const hasChildren = object.children && object.children.length > 0;
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(object.label);
  const inputRef = useRef<HTMLInputElement>(null);

  // When the object prop changes from the parent, update the local label state
  useEffect(() => {
    setLabel(object.label);
  }, [object.label]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);
  
  const handleRename = () => {
    if (label.trim() && label.trim() !== object.label) {
      onRename(object.id, label.trim());
    } else {
      setLabel(object.label); // Revert if empty or unchanged
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setLabel(object.label);
      setIsEditing(false);
    }
  };

  return (
    <div>
      <div
        onClick={() => onSelect(object.id)}
        onDoubleClick={() => setIsEditing(true)}
        style={{ paddingLeft: `${level * 16}px` }}
        className={`flex items-center gap-2 p-2 my-0.5 rounded cursor-pointer transition-colors text-white ${
          isSelected ? 'bg-blue-600' : 'hover:bg-gray-700/80'
        }`}
      >
        {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); onToggleExpand(object.id); }} className="p-0.5 rounded hover:bg-white/20 -ml-1" title={t('tooltipExpandCollapse')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}><path d="m9 18 6-6-6-6"/></svg>
            </button>
        ) : <div className="w-[16px] h-[16px]"></div> /* Spacer to align items */ }
        
        {object.thumbnailUrl && (
            <img src={object.thumbnailUrl} alt={object.label} className="w-8 h-8 rounded-md object-cover flex-shrink-0 bg-gray-600" />
        )}
        {isEditing ? (
            <input
                ref={inputRef}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-800 text-white rounded w-full p-0.5 -m-0.5"
            />
        ) : (
            <span className="truncate flex-1" title="Double-click to rename">{object.label}</span>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {object.children.map(child => (
            <ObjectLayer
              key={child.id}
              object={child}
              level={level + 1}
              selectedObjectId={selectedObjectId}
              onSelect={onSelect}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  );
};
