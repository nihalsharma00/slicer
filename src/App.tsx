import { useCallback, useMemo, useRef, useState } from 'react';
import CanvasEditor from './components/CanvasEditor';
import Sidebar from './components/Sidebar';
import { autoDetectSprites, generateGrid, isRectEmpty, guessBackgroundColor } from './lib/imageAnalysis';
import { buildPlan, downloadJson, downloadZip } from './lib/exportUtils';
import type { AutoSettings, GridSettings, Mode, SpriteRect } from './types';

interface LoadedImage {
  el: HTMLImageElement;
  data: ImageData;
  name: string;
}

const DEFAULT_GRID: GridSettings = {
  cols: 0,
  rows: 0,
  offsetX: 0,
  offsetY: 0,
  spacingX: 0,
  spacingY: 0,
  trimEmpty: true,
};

const DEFAULT_AUTO: AutoSettings = {
  useAlpha: true,
  tolerance: 24,
  minWidth: 4,
  minHeight: 4,
  padding: 0,
  mergeDistance: 2,
  bgColor: null,
};

function readImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export default function App() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [sprites, setSpritesRaw] = useState<SpriteRect[]>([]);
  const [mode, setMode] = useState<Mode>('auto');
  const [zoom, setZoom] = useState(2);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gridSettings, setGridSettings] = useState<GridSettings>(DEFAULT_GRID);
  const [cellWidth, setCellWidth] = useState(32);
  const [cellHeight, setCellHeight] = useState(32);
  const [autoSettings, setAutoSettings] = useState<AutoSettings>(DEFAULT_AUTO);
  const [pickingColor, setPickingColor] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setSprites = useCallback((updater: (prev: SpriteRect[]) => SpriteRect[]) => {
    setSpritesRaw((prev) => updater(prev));
  }, []);

  function loadFile(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const data = readImageData(img);
      setImage({ el: img, data, name: file.name });
      setSprites(() => []);
      setSelectedId(null);
      setAutoSettings((p) => ({ ...p, bgColor: null }));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
  }

  const runAutoDetect = useCallback(() => {
    if (!image) return;
    const detected = autoDetectSprites(image.data, autoSettings);
    setSprites(() => detected);
    setSelectedId(null);
  }, [image, autoSettings, setSprites]);

  const generateGridSprites = useCallback(() => {
    if (!image) return;
    let cells = generateGrid(image.el.naturalWidth, image.el.naturalHeight, gridSettings, cellWidth, cellHeight);
    if (gridSettings.trimEmpty) {
      const bg = autoSettings.bgColor
        ? ([autoSettings.bgColor[0], autoSettings.bgColor[1], autoSettings.bgColor[2], 255] as [number, number, number, number])
        : guessBackgroundColor(image.data);
      cells = cells.filter((c) => !isRectEmpty(image.data, c, autoSettings, bg));
      cells = cells.map((c, i) => ({ ...c, name: `sprite_${String(i + 1).padStart(2, '0')}` }));
    }
    setSprites(() => cells);
    setSelectedId(null);
  }, [image, gridSettings, cellWidth, cellHeight, autoSettings, setSprites]);

  function handlePickPixel(x: number, y: number) {
    if (!image) return;
    const { data, width } = image.data;
    const idx = (y * width + x) * 4;
    setAutoSettings((p) => ({ ...p, bgColor: [data[idx], data[idx + 1], data[idx + 2]] }));
    setPickingColor(false);
  }

  function renameSprite(id: string, name: string) {
    setSprites((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }

  function deleteSprite(id: string) {
    setSprites((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  const plan = useMemo(() => {
    if (!image) return null;
    return buildPlan(image.name, image.el.naturalWidth, image.el.naturalHeight, sprites);
  }, [image, sprites]);

  async function handleExportZip() {
    if (!image || !plan) return;
    setExporting(true);
    try {
      const base = image.name.replace(/\.[^.]+$/, '') || 'sprites';
      await downloadZip(`${base}_sprites.zip`, image.el, sprites, true, plan);
    } finally {
      setExporting(false);
    }
  }

  function handleExportJson() {
    if (!image || !plan) return;
    const base = image.name.replace(/\.[^.]+$/, '') || 'sprites';
    downloadJson(`${base}_plan.json`, plan);
  }

  if (!image) {
    return (
      <div className="upload-screen">
        <div
          className={`dropzone ${dragOver ? 'dropzone-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="dropzone-icon" aria-hidden>
            <svg viewBox="0 0 32 32" width="40" height="40">
              <rect x="1" y="1" width="13" height="13" fill="currentColor" opacity="0.9" />
              <rect x="18" y="1" width="13" height="13" fill="currentColor" opacity="0.5" />
              <rect x="1" y="18" width="13" height="13" fill="currentColor" opacity="0.5" />
              <rect x="18" y="18" width="13" height="13" fill="currentColor" opacity="0.9" />
            </svg>
          </div>
          <h1>Sprite Slicer</h1>
          <p>Drop a sprite sheet here, or click to browse.</p>
          <p className="muted">PNG works best for auto-detection — the alpha channel marks empty space.</p>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          Sprite Slicer
        </div>
        <span className="muted">Slice sheets into sprites, then export the plan.</span>
      </header>
      <div className="workspace">
        <CanvasEditor
          image={image.el}
          sprites={sprites}
          setSprites={setSprites}
          mode={mode}
          zoom={zoom}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          pickingColor={pickingColor}
          onPickPixel={handlePickPixel}
        />
        <Sidebar
          mode={mode}
          setMode={setMode}
          gridSettings={gridSettings}
          setGridSettings={setGridSettings}
          cellWidth={cellWidth}
          cellHeight={cellHeight}
          setCellWidth={setCellWidth}
          setCellHeight={setCellHeight}
          onGenerateGrid={generateGridSprites}
          autoSettings={autoSettings}
          setAutoSettings={setAutoSettings}
          onRunAutoDetect={runAutoDetect}
          onPickBackgroundColor={() => setPickingColor((v) => !v)}
          pickingColor={pickingColor}
          sprites={sprites}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onRenameSprite={renameSprite}
          onDeleteSprite={deleteSprite}
          onClearAll={() => { setSprites(() => []); setSelectedId(null); }}
          zoom={zoom}
          setZoom={setZoom}
          onExportZip={handleExportZip}
          onExportJson={handleExportJson}
          exporting={exporting}
          imageInfo={{ width: image.el.naturalWidth, height: image.el.naturalHeight, name: image.name }}
          onNewImage={() => setImage(null)}
        />
      </div>
    </div>
  );
}
