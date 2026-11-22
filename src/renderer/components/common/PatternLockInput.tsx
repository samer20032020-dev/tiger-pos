import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, Lock } from 'lucide-react';

interface PatternLockInputProps {
  value?: string | null; // e.g. "1-2-5-8-9"
  onChange?: (pattern: string) => void;
  readOnly?: boolean;
  size?: number; // width/height in px (default 190)
}

interface Point {
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
}

// 9 normalized dots in 3x3 grid (coordinates in percentage from 0 to 100)
const DOT_COORDS: Record<number, Point> = {
  1: { x: 22, y: 22 }, 2: { x: 50, y: 22 }, 3: { x: 78, y: 22 },
  4: { x: 22, y: 50 }, 5: { x: 50, y: 50 }, 6: { x: 78, y: 50 },
  7: { x: 22, y: 78 }, 8: { x: 50, y: 78 }, 9: { x: 78, y: 78 }
};

export const PatternLockInput: React.FC<PatternLockInputProps> = ({
  value = '',
  onChange,
  readOnly = false,
  size = 190
}) => {
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPointer, setCurrentPointer] = useState<Point | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value (e.g. "1-2-5-8")
  useEffect(() => {
    if (value) {
      const parsed = value
        .split('-')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 1 && n <= 9);
      setSelectedNodes(parsed);
    } else {
      setSelectedNodes([]);
    }
  }, [value]);

  const getContainerRelativePos = useCallback((clientX: number, clientY: number): Point | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100
    };
  }, []);

  const findNearestDot = useCallback((pos: Point, threshold = 13): number | null => {
    for (let i = 1; i <= 9; i++) {
      const dot = DOT_COORDS[i];
      const dist = Math.hypot(dot.x - pos.x, dot.y - pos.y);
      if (dist <= threshold) {
        return i;
      }
    }
    return null;
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    const pos = getContainerRelativePos(e.clientX, e.clientY);
    if (!pos) return;

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDrawing(true);
    setCurrentPointer(pos);

    const dot = findNearestDot(pos);
    if (dot !== null) {
      const next = [dot];
      setSelectedNodes(next);
      if (onChange) onChange(next.join('-'));
    } else {
      setSelectedNodes([]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || readOnly) return;
    const pos = getContainerRelativePos(e.clientX, e.clientY);
    if (!pos) return;

    setCurrentPointer(pos);

    const dot = findNearestDot(pos);
    if (dot !== null && !selectedNodes.includes(dot)) {
      const next = [...selectedNodes, dot];
      setSelectedNodes(next);
      if (onChange) onChange(next.join('-'));
    }
  };

  const handlePointerUp = () => {
    if (readOnly) return;
    setIsDrawing(false);
    setCurrentPointer(null);
    if (selectedNodes.length > 0 && onChange) {
      onChange(selectedNodes.join('-'));
    }
  };

  const handleClear = () => {
    if (readOnly) return;
    setSelectedNodes([]);
    setIsDrawing(false);
    setCurrentPointer(null);
    if (onChange) onChange('');
  };

  const handleDotClick = (dotIndex: number) => {
    if (readOnly || isDrawing) return;
    if (selectedNodes.includes(dotIndex)) return;
    const next = [...selectedNodes, dotIndex];
    setSelectedNodes(next);
    if (onChange) onChange(next.join('-'));
  };

  const lastSelected = selectedNodes[selectedNodes.length - 1];
  const lastCoord = lastSelected ? DOT_COORDS[lastSelected] : null;

  return (
    <div className="flex flex-col items-center p-3.5 bg-slate-900 border border-slate-800 rounded-2xl select-none shadow-md max-w-full">
      <div className="flex items-center justify-between w-full mb-2.5 px-1">
        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-orange-500" />
          <span>{readOnly ? 'قفل النمط المحفوظ' : 'رسم نمط الشاشة'}</span>
        </span>
        {!readOnly && selectedNodes.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>مسح النمط</span>
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        style={{ width: size, height: size, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative bg-slate-950 rounded-2xl border border-slate-800 shadow-inner cursor-crosshair overflow-hidden"
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
        >
          {/* Static connected lines */}
          {selectedNodes.map((dotIndex, i) => {
            if (i === 0) return null;
            const prevIndex = selectedNodes[i - 1];
            const p1 = DOT_COORDS[prevIndex];
            const p2 = DOT_COORDS[dotIndex];
            return (
              <line
                key={`line-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#f97316"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.95"
              />
            );
          })}

          {/* Active drag line from last selected dot to cursor */}
          {isDrawing && lastCoord && currentPointer && (
            <line
              x1={lastCoord.x}
              y1={lastCoord.y}
              x2={currentPointer.x}
              y2={currentPointer.y}
              stroke="#fb923c"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="3 3"
              opacity="0.85"
            />
          )}
        </svg>

        {/* 9 Interactive Dots (1 to 9) */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dotIndex) => {
          const coord = DOT_COORDS[dotIndex];
          const isSelected = selectedNodes.includes(dotIndex);
          const order = selectedNodes.indexOf(dotIndex) + 1;

          return (
            <div
              key={dotIndex}
              onClick={() => handleDotClick(dotIndex)}
              style={{
                left: `${coord.x}%`,
                top: `${coord.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-orange-500 text-white font-black text-xs ring-4 ring-orange-500/30 scale-110 shadow-lg shadow-orange-500/50'
                  : 'bg-slate-800/90 hover:bg-slate-700 ring-2 ring-slate-700/60'
              }`}
            >
              {isSelected ? (
                order
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400 group-hover:bg-white" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-center">
        <span className="text-[11px] text-slate-300 font-mono">
          {selectedNodes.length > 0
            ? `المسار: ${selectedNodes.join(' - ')}`
            : readOnly
            ? 'لا يوجد نمط محفوظ'
            : 'اسحب الفأرة أو الإصبع لتوصيل النقاط'}
        </span>
      </div>
    </div>
  );
};
