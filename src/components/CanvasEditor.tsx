import { useEffect, useRef, useState } from 'react';
import type { Mode, SpriteRect } from '../types';
import { nextId } from '../lib/imageAnalysis';

interface Props {
  image: HTMLImageElement;
  sprites: SpriteRect[];
  setSprites: (updater: (prev: SpriteRect[]) => SpriteRect[]) => void;
  mode: Mode;
  zoom: number;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  pickingColor?: boolean;
  onPickPixel?: (x: number, y: number) => void;
}

type Drag =
  | { kind: 'new'; startX: number; startY: number }
  | { kind: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'resize'; id: string; origW: number; origH: number };

export default function CanvasEditor({
  image, sprites, setSprites, mode, zoom, selectedId, setSelectedId, pickingColor, onPickPixel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    // checkerboard behind transparent areas, drawn first would be ideal, but for pixel-accurate
    // detection we keep the analysis canvas separate; this is purely the visible preview.
  }, [image]);

  const displayW = image.naturalWidth * zoom;
  const displayH = image.naturalHeight * zoom;

  function toImageCoords(clientX: number, clientY: number) {
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;
    return {
      x: Math.max(0, Math.min(image.naturalWidth, x)),
      y: Math.max(0, Math.min(image.naturalHeight, y)),
    };
  }

  function handleOverlayPointerDown(e: React.PointerEvent) {
    if (pickingColor && onPickPixel) {
      const { x, y } = toImageCoords(e.clientX, e.clientY);
      onPickPixel(Math.floor(x), Math.floor(y));
      return;
    }
    if (mode !== 'manual') return;
    if (e.target !== overlayRef.current) return; // clicks on rects are handled separately
    const { x, y } = toImageCoords(e.clientX, e.clientY);
    setSelectedId(null);
    setDrag({ kind: 'new', startX: x, startY: y });
    setDraftRect({ x, y, w: 0, h: 0 });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handleOverlayPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const { x, y } = toImageCoords(e.clientX, e.clientY);
    if (drag.kind === 'new') {
      const rx = Math.min(drag.startX, x);
      const ry = Math.min(drag.startY, y);
      const rw = Math.abs(x - drag.startX);
      const rh = Math.abs(y - drag.startY);
      setDraftRect({ x: rx, y: ry, w: rw, h: rh });
    } else if (drag.kind === 'move') {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      setSprites((prev) =>
        prev.map((s) =>
          s.id === drag.id
            ? {
                ...s,
                x: Math.max(0, Math.min(image.naturalWidth - s.width, Math.round(drag.origX + dx))),
                y: Math.max(0, Math.min(image.naturalHeight - s.height, Math.round(drag.origY + dy))),
              }
            : s,
        ),
      );
    } else if (drag.kind === 'resize') {
      setSprites((prev) =>
        prev.map((s) => {
          if (s.id !== drag.id) return s;
          const w = Math.max(2, Math.round(x - s.x));
          const h = Math.max(2, Math.round(y - s.y));
          return {
            ...s,
            width: Math.min(w, image.naturalWidth - s.x),
            height: Math.min(h, image.naturalHeight - s.y),
          };
        }),
      );
    }
  }

  function handleOverlayPointerUp() {
    if (drag?.kind === 'new' && draftRect && draftRect.w > 2 && draftRect.h > 2) {
      const id = nextId();
      setSprites((prev) => [
        ...prev,
        {
          id,
          name: `sprite_${String(prev.length + 1).padStart(2, '0')}`,
          x: Math.round(draftRect.x),
          y: Math.round(draftRect.y),
          width: Math.round(draftRect.w),
          height: Math.round(draftRect.h),
        },
      ]);
      setSelectedId(id);
    }
    setDrag(null);
    setDraftRect(null);
  }

  function startMove(e: React.PointerEvent, s: SpriteRect) {
    if (pickingColor && onPickPixel) {
      e.stopPropagation();
      const { x, y } = toImageCoords(e.clientX, e.clientY);
      onPickPixel(Math.floor(x), Math.floor(y));
      return;
    }
    if (mode !== 'manual') {
      setSelectedId(s.id);
      return;
    }
    e.stopPropagation();
    setSelectedId(s.id);
    const { x, y } = toImageCoords(e.clientX, e.clientY);
    setDrag({ kind: 'move', id: s.id, startX: x, startY: y, origX: s.x, origY: s.y });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function startResize(e: React.PointerEvent, s: SpriteRect) {
    e.stopPropagation();
    setSelectedId(s.id);
    setDrag({ kind: 'resize', id: s.id, origW: s.width, origH: s.height });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  return (
    <div className="stage">
      <div className="stage-inner" style={{ width: displayW, height: displayH }}>
        <canvas
          ref={canvasRef}
          className="pixel-canvas"
          style={{ width: displayW, height: displayH }}
        />
        <div
          ref={overlayRef}
          className={`overlay ${mode === 'manual' ? 'overlay-draw' : ''} ${pickingColor ? 'overlay-pick' : ''}`}
          style={{ width: displayW, height: displayH }}
          onPointerDown={handleOverlayPointerDown}
          onPointerMove={handleOverlayPointerMove}
          onPointerUp={handleOverlayPointerUp}
        >
          {sprites.map((s) => (
            <div
              key={s.id}
              className={`rect-box ${selectedId === s.id ? 'rect-box-selected' : ''}`}
              style={{
                left: s.x * zoom,
                top: s.y * zoom,
                width: s.width * zoom,
                height: s.height * zoom,
              }}
              onPointerDown={(e) => startMove(e, s)}
            >
              <span className="rect-label">{s.name}</span>
              {mode === 'manual' && selectedId === s.id && (
                <div className="resize-handle" onPointerDown={(e) => startResize(e, s)} />
              )}
            </div>
          ))}
          {draftRect && (
            <div
              className="rect-box rect-box-draft"
              style={{
                left: draftRect.x * zoom,
                top: draftRect.y * zoom,
                width: draftRect.w * zoom,
                height: draftRect.h * zoom,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
