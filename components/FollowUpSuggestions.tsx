import React from 'react';

interface FollowUpSuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export const FollowUpSuggestions: React.FC<FollowUpSuggestionsProps> = ({ suggestions, onSuggestionClick }) => {
  return (
    <div className="mt-4 space-y-2">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          className="w-full text-left p-3 bg-[#1C1C1E] rounded-lg hover:bg-[#2C2C2E] transition-colors flex items-center gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0"><path d="m9 18 6-6-6-6"/></svg>
          <span className="text-gray-300">{suggestion}</span>
        </button>
      ))}
    </div>
  );
};
