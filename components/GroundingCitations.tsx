
import React from 'react';
import type { GroundingChunk } from '../types';

interface GroundingCitationsProps {
    chunks: GroundingChunk[];
}

export const GroundingCitations: React.FC<GroundingCitationsProps> = ({ chunks }) => {
    if (!chunks || chunks.length === 0) return null;

    return (
        <div className="mt-4 pt-4 border-t border-white/10">
            <h5 className="text-xs font-semibold text-gray-400 mb-2">Sources</h5>
            <div className="space-y-2">
                {chunks.map((chunk, index) => (
                    <a 
                        key={index}
                        href={chunk.web.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 bg-[#2C2C2E] rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <p className="text-sm text-blue-400 truncate">{chunk.web.title}</p>
                        <p className="text-xs text-gray-500 truncate">{chunk.web.uri}</p>
                    </a>
                ))}
            </div>
        </div>
    );
};
