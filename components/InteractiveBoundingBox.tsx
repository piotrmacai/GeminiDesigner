
import React, { useState, useEffect, useRef } from 'react';

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Bounds {
    top: number;
    left: number;
    width: number;
    height: number;
}

interface InteractiveBoundingBoxProps {
    box: Box;
    onBoxChange: (box: Box) => void;
    bounds: Bounds;
}

const HANDLE_SIZE = 8;

export const InteractiveBoundingBox: React.FC<InteractiveBoundingBoxProps> = ({ box, onBoxChange, bounds }) => {
    const [activeDrag, setActiveDrag] = useState<string | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const dragStartBox = useRef(box);

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!activeDrag) return;

            const dx = e.clientX - dragStartPos.current.x;
            const dy = e.clientY - dragStartPos.current.y;
            let newBox = { ...dragStartBox.current };

            if (activeDrag === 'move') {
                newBox.x = clamp(dragStartBox.current.x + dx, bounds.left, bounds.left + bounds.width - newBox.width);
                newBox.y = clamp(dragStartBox.current.y + dy, bounds.top, bounds.top + bounds.height - newBox.height);
            } else {
                // Resize logic
                if (activeDrag.includes('l')) {
                    const newWidth = clamp(dragStartBox.current.width - dx, 10, dragStartBox.current.x + dragStartBox.current.width);
                    newBox.x = clamp(dragStartBox.current.x + dx, bounds.left, dragStartBox.current.x + dragStartBox.current.width - 10);
                    newBox.width = newWidth;
                }
                if (activeDrag.includes('r')) {
                    newBox.width = clamp(dragStartBox.current.width + dx, 10, bounds.width - newBox.x);
                }
                if (activeDrag.includes('t')) {
                    const newHeight = clamp(dragStartBox.current.height - dy, 10, dragStartBox.current.y + dragStartBox.current.height);
                    newBox.y = clamp(dragStartBox.current.y + dy, bounds.top, dragStartBox.current.y + dragStartBox.current.height - 10);
                    newBox.height = newHeight;
                }
                if (activeDrag.includes('b')) {
                    newBox.height = clamp(dragStartBox.current.height + dy, 10, bounds.height - newBox.y);
                }
            }
            onBoxChange(newBox);
        };

        const handleMouseUp = () => {
            setActiveDrag(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [activeDrag, onBoxChange, bounds]);

    const handleMouseDown = (e: React.MouseEvent, handle: string) => {
        e.stopPropagation();
        setActiveDrag(handle);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        dragStartBox.current = box;
    };

    const handles = [
        { name: 'tl', cursor: 'nwse-resize' }, { name: 't', cursor: 'ns-resize' }, { name: 'tr', cursor: 'nesw-resize' },
        { name: 'l', cursor: 'ew-resize' }, { name: 'r', cursor: 'ew-resize' },
        { name: 'bl', cursor: 'nesw-resize' }, { name: 'b', cursor: 'ns-resize' }, { name: 'br', cursor: 'nwse-resize' }
    ];

    const getHandleStyle = (name: string): React.CSSProperties => {
        const style: React.CSSProperties = {
            position: 'absolute',
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            backgroundColor: 'white',
            border: '1px solid black',
        };
        if (name.includes('t')) style.top = -HANDLE_SIZE / 2;
        if (name.includes('b')) style.bottom = -HANDLE_SIZE / 2;
        if (name.includes('l')) style.left = -HANDLE_SIZE / 2;
        if (name.includes('r')) style.right = -HANDLE_SIZE / 2;
        if (name.length === 1 && (name === 't' || name === 'b')) style.left = `calc(50% - ${HANDLE_SIZE / 2}px)`;
        if (name.length === 1 && (name === 'l' || name === 'r')) style.top = `calc(50% - ${HANDLE_SIZE / 2}px)`;
        return style;
    }

    return (
        <div
            ref={boxRef}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
            style={{
                position: 'absolute',
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
                border: '2px solid white',
                boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                cursor: 'move',
                userSelect: 'none',
            }}
        >
            {handles.map(h => (
                <div
                    key={h.name}
                    onMouseDown={(e) => handleMouseDown(e, h.name)}
                    style={{
                        ...getHandleStyle(h.name),
                        cursor: h.cursor
                    }}
                />
            ))}
        </div>
    );
};
