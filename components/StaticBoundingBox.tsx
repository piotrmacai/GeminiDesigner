import React from 'react';

interface StaticBoundingBoxProps {
    box: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export const StaticBoundingBox: React.FC<StaticBoundingBoxProps> = ({ box }) => {
    return (
        <div
            style={{
                position: 'absolute',
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
                border: '1.5px dotted white',
                pointerEvents: 'none',
                boxShadow: '0 0 10px rgba(0,0,0,0.3)',
            }}
        />
    );
};
