
import React from 'react';

export const ObjectLayerSkeleton: React.FC = () => (
  <div className="space-y-3 p-2">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div 
            className="h-6 bg-gray-700 rounded" 
            style={{ 
                width: `${Math.random() * 40 + 50}%`, 
                marginLeft: `${[0,0,16,16,32,16,0,0][i]}px` // Simulate tree structure
            }}
        ></div>
      </div>
    ))}
  </div>
);