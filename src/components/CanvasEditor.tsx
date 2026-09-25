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
  boxColor?: string;
}

type Drag =
  | { kind: 'new'; startX: number; startY: number }
  | { kind: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'resize'; id: string; dir: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number };

export default function CanvasEditor({
  image, sprites, setSprites, mode, zoom, selectedId, setSelectedId,
  pickingColor, onPickPixel, boxColor = '#5fc9ff',
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
    // Only draw new rects in manual mode
    if (mode !== 'manual') return;
    if (e.target !== overlayRef.current) return;
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
      let dx = x - drag.startX;
      let dy = y - drag.startY;

      setSprites((prev) =>
        prev.map((s) => {
          if (s.id !== drag.id) return s;
          let newX = drag.origX;
          let newY = drag.origY;
          let newW = drag.origW;
          let newH = drag.origH;

          if (drag.dir.includes('n')) {
            const clampedDy = Math.max(-drag.origY, Math.min(dy, drag.origH - 2));
            newY = drag.origY + clampedDy;
            newH = drag.origH - clampedDy;
          }
          if (drag.dir.includes('s')) {
            const clampedDy = Math.min(image.naturalHeight - drag.origY - drag.origH, Math.max(dy, 2 - drag.origH));
            newH = drag.origH + clampedDy;
          }
          if (drag.dir.includes('w')) {
            const clampedDx = Math.max(-drag.origX, Math.min(dx, drag.origW - 2));
            newX = drag.origX + clampedDx;
            newW = drag.origW - clampedDx;
          }
          if (drag.dir.includes('e')) {
            const clampedDx = Math.min(image.naturalWidth - drag.origX - drag.origW, Math.max(dx, 2 - drag.origW));
            newW = drag.origW + clampedDx;
          }

          return { ...s, x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) };
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
    e.stopPropagation();
    setSelectedId(s.id);
    const { x, y } = toImageCoords(e.clientX, e.clientY);
    setDrag({ kind: 'move', id: s.id, startX: x, startY: y, origX: s.x, origY: s.y });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function startResize(e: React.PointerEvent, s: SpriteRect, dir: string) {
    e.stopPropagation();
    setSelectedId(s.id);
    const { x, y } = toImageCoords(e.clientX, e.clientY);
    setDrag({ kind: 'resize', id: s.id, dir, startX: x, startY: y, origX: s.x, origY: s.y, origW: s.width, origH: s.height });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  // Derive box color with alpha for fill
  const hex = boxColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const fillColor = `rgba(${r},${g},${b},0.12)`;
  const selectedFill = `rgba(${r},${g},${b},0.22)`;

  const isDragging = !!drag;

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
          className={`overlay ${mode === 'manual' ? 'overlay-draw' : 'overlay-adjust'} ${pickingColor ? 'overlay-pick' : ''} ${isDragging ? 'is-dragging' : ''}`}
          style={{ width: displayW, height: displayH }}
          onPointerDown={handleOverlayPointerDown}
          onPointerMove={handleOverlayPointerMove}
          onPointerUp={handleOverlayPointerUp}
        >
          {sprites.map((s) => {
            const isSelected = selectedId === s.id;
            return (
              <div
                key={s.id}
                className={`rect-box ${isSelected ? 'rect-box-selected' : ''}`}
                style={{
                  left: s.x * zoom,
                  top: s.y * zoom,
                  width: s.width * zoom,
                  height: s.height * zoom,
                  borderColor: isSelected ? '#fff' : boxColor,
                  background: isSelected ? selectedFill : fillColor,
                  cursor: 'move',
                }}
                onPointerDown={(e) => startMove(e, s)}
              >
                <span className="rect-label" style={{ borderColor: isSelected ? '#fff' : boxColor, color: isSelected ? '#fff' : boxColor }}>
                  {s.name}
                </span>
                {isSelected && (
                  <>
                    <div className="resize-handle resize-n" style={{ background: boxColor }} onPointerDown={(e) => startResize(e, s, 'n')} />
                    <div className="resize-handle resize-s" style={{ background: boxColor }} onPointerDown={(e) => startResize(e, s, 's')} />
                    <div className="resize-handle resize-e" style={{ background: boxColor }} onPointerDown={(e) => startResize(e, s, 'e')} />
                    <div className="resize-handle resize-w" style={{ background: boxColor }} onPointerDown={(e) => startResize(e, s, 'w')} />
                    <div className="resize-handle resize-nw" style={{ background: boxColor }} onPointerDown={(e) => startResize(e, s, 'nw')} />
                    <div className="resize-handle resize-ne" style={{ background: boxColor }} onPointerDown={(e) => startResize(e, s, 'ne')} />
                    <div className="resize-handle resize-sw" style={{ background: boxColor }} onPointerDown={(e) => startResize(e, s, 'sw')} />
                    <div className="resize-handle resize-se" style={{ background: boxColor }} onPointerDown={(e) => startResize(e, s, 'se')} />
                  </>
                )}
                {/* Coordinate tooltip */}
                {isSelected && (
                  <span className="rect-coords">
                    {s.x},{s.y} · {s.width}×{s.height}
                  </span>
                )}
              </div>
            );
          })}
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
