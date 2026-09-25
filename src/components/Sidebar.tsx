import type { AutoSettings, GridSettings, Mode, SpriteRect } from '../types';

interface Props {
  mode: Mode;
  setMode: (m: Mode) => void;

  gridSettings: GridSettings;
  setGridSettings: (updater: (prev: GridSettings) => GridSettings) => void;
  cellWidth: number;
  cellHeight: number;
  setCellWidth: (n: number) => void;
  setCellHeight: (n: number) => void;
  onGenerateGrid: () => void;

  autoSettings: AutoSettings;
  setAutoSettings: (updater: (prev: AutoSettings) => AutoSettings) => void;
  onRunAutoDetect: () => void;
  onPickBackgroundColor: () => void;
  pickingColor: boolean;

  sprites: SpriteRect[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onRenameSprite: (id: string, name: string) => void;
  onDeleteSprite: (id: string) => void;
  onClearAll: () => void;

  zoom: number;
  setZoom: (z: number) => void;
  onFitZoom: () => void;

  boxColor: string;
  setBoxColor: (c: string) => void;

  onExportZip: () => void;
  onExportJson: () => void;
  exporting: boolean;

  imageInfo: { width: number; height: number; name: string };
  onNewImage: () => void;
}

export default function Sidebar(props: Props) {
  const {
    mode, setMode,
    gridSettings, setGridSettings, cellWidth, cellHeight, setCellWidth, setCellHeight, onGenerateGrid,
    autoSettings, setAutoSettings, onRunAutoDetect, onPickBackgroundColor, pickingColor,
    sprites, selectedId, setSelectedId, onRenameSprite, onDeleteSprite, onClearAll,
    zoom, setZoom, onFitZoom,
    boxColor, setBoxColor,
    onExportZip, onExportJson, exporting,
    imageInfo, onNewImage,
  } = props;

  return (
    <aside className="sidebar">
      <div className="panel">
        <div className="image-meta">
          <div>
            <strong>{imageInfo.name}</strong>
            <span className="muted"> · {imageInfo.width}×{imageInfo.height}px</span>
          </div>
          <button className="btn btn-ghost btn-small" onClick={onNewImage}>Replace</button>
        </div>
        <div className="zoom-row">
          <span>Zoom</span>
          <input
            type="range"
            min={0.1}
            max={12}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
          <span className="mono">{zoom.toFixed(1)}×</span>
          <button className="btn btn-ghost btn-small" title="Fit image to screen" onClick={onFitZoom}>
            Fit
          </button>
        </div>
        <div className="box-color-row">
          <span>Box color</span>
          <input
            type="color"
            value={boxColor}
            onChange={(e) => setBoxColor(e.target.value)}
            title="Pick box color"
            className="color-picker-input"
          />
          <span className="muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>{boxColor}</span>
          <button className="btn btn-ghost btn-small" onClick={() => setBoxColor('#5fc9ff')} title="Reset to default">↺</button>
        </div>
      </div>

      <div className="panel">
        <div className="tabs">
          <button className={`tab ${mode === 'auto' ? 'tab-active' : ''}`} onClick={() => setMode('auto')}>Auto detect</button>
          <button className={`tab ${mode === 'grid' ? 'tab-active' : ''}`} onClick={() => setMode('grid')}>Grid</button>
          <button className={`tab ${mode === 'manual' ? 'tab-active' : ''}`} onClick={() => setMode('manual')}>Manual</button>
        </div>

        {mode === 'auto' && (
          <div className="controls">
            <p className="hint">
              <strong>Smart detect:</strong> automatically finds grid separators (border lines between frames) or separates sprites from a transparent / solid-color background.
            </p>
            <label className="check-row">
              <input
                type="checkbox"
                checked={autoSettings.useAlpha}
                onChange={(e) => setAutoSettings((p) => ({ ...p, useAlpha: e.target.checked }))}
              />
              Treat transparent pixels as background
            </label>
            <label className="field">
              Background color
              <div className="bg-color-row">
                <span
                  className="swatch"
                  style={{
                    background: autoSettings.bgColor
                      ? `rgb(${autoSettings.bgColor.join(',')})`
                      : 'repeating-conic-gradient(#444 0% 25%, #333 0% 50%) 50% / 10px 10px',
                  }}
                />
                <button className={`btn btn-small ${pickingColor ? 'btn-active' : ''}`} onClick={onPickBackgroundColor}>
                  {pickingColor ? 'Click the image…' : 'Pick from image'}
                </button>
                {autoSettings.bgColor && (
                  <button className="btn btn-ghost btn-small" onClick={() => setAutoSettings((p) => ({ ...p, bgColor: null }))}>
                    Auto
                  </button>
                )}
              </div>
            </label>
            <label className="field">
              Color tolerance: <span className="mono">{autoSettings.tolerance}</span>
              <input
                type="range" min={0} max={120} value={autoSettings.tolerance}
                onChange={(e) => setAutoSettings((p) => ({ ...p, tolerance: parseInt(e.target.value, 10) }))}
              />
            </label>
            <label className="field">
              Merge nearby pieces (px): <span className="mono">{autoSettings.mergeDistance}</span>
              <input
                type="range" min={0} max={40} value={autoSettings.mergeDistance}
                onChange={(e) => setAutoSettings((p) => ({ ...p, mergeDistance: parseInt(e.target.value, 10) }))}
              />
            </label>
            <div className="field-row">
              <label className="field-inline">
                Min width
                <input type="number" min={1} value={autoSettings.minWidth}
                  onChange={(e) => setAutoSettings((p) => ({ ...p, minWidth: parseInt(e.target.value, 10) || 1 }))} />
              </label>
              <label className="field-inline">
                Min height
                <input type="number" min={1} value={autoSettings.minHeight}
                  onChange={(e) => setAutoSettings((p) => ({ ...p, minHeight: parseInt(e.target.value, 10) || 1 }))} />
              </label>
              <label className="field-inline">
                Padding
                <input type="number" min={0} value={autoSettings.padding}
                  onChange={(e) => setAutoSettings((p) => ({ ...p, padding: parseInt(e.target.value, 10) || 0 }))} />
              </label>
            </div>
            <button className="btn btn-primary" onClick={onRunAutoDetect}>Detect sprites</button>
          </div>
        )}

        {mode === 'grid' && (
          <div className="controls">
            <p className="hint">Set columns &amp; rows — cell size is calculated automatically. Or set cell size and leave columns/rows at 0.</p>
            <div className="field-row">
              <label className="field-inline">
                Columns (0 = auto)
                <input type="number" min={0} value={gridSettings.cols}
                  onChange={(e) => setGridSettings((p) => ({ ...p, cols: parseInt(e.target.value, 10) || 0 }))} />
              </label>
              <label className="field-inline">
                Rows (0 = auto)
                <input type="number" min={0} value={gridSettings.rows}
                  onChange={(e) => setGridSettings((p) => ({ ...p, rows: parseInt(e.target.value, 10) || 0 }))} />
              </label>
            </div>
            <div className="field-row">
              <label className="field-inline">
                Cell width{gridSettings.cols > 0 ? <span className="muted"> (auto)</span> : ''}
                <input type="number" min={1} value={cellWidth} onChange={(e) => setCellWidth(parseInt(e.target.value, 10) || 1)} />
              </label>
              <label className="field-inline">
                Cell height{gridSettings.rows > 0 ? <span className="muted"> (auto)</span> : ''}
                <input type="number" min={1} value={cellHeight} onChange={(e) => setCellHeight(parseInt(e.target.value, 10) || 1)} />
              </label>
            </div>
            <div className="field-row">
              <label className="field-inline">
                Offset X
                <input type="number" min={0} value={gridSettings.offsetX}
                  onChange={(e) => setGridSettings((p) => ({ ...p, offsetX: parseInt(e.target.value, 10) || 0 }))} />
              </label>
              <label className="field-inline">
                Offset Y
                <input type="number" min={0} value={gridSettings.offsetY}
                  onChange={(e) => setGridSettings((p) => ({ ...p, offsetY: parseInt(e.target.value, 10) || 0 }))} />
              </label>
            </div>
            <div className="field-row">
              <label className="field-inline">
                Spacing X
                <input type="number" min={0} value={gridSettings.spacingX}
                  onChange={(e) => setGridSettings((p) => ({ ...p, spacingX: parseInt(e.target.value, 10) || 0 }))} />
              </label>
              <label className="field-inline">
                Spacing Y
                <input type="number" min={0} value={gridSettings.spacingY}
                  onChange={(e) => setGridSettings((p) => ({ ...p, spacingY: parseInt(e.target.value, 10) || 0 }))} />
              </label>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={gridSettings.trimEmpty}
                onChange={(e) => setGridSettings((p) => ({ ...p, trimEmpty: e.target.checked }))}
              />
              Skip cells that are entirely background
            </label>
            <button className="btn btn-primary" onClick={onGenerateGrid}>Generate grid</button>
          </div>
        )}

        {mode === 'manual' && (
          <div className="controls">
            <p className="hint">Drag on the sheet to draw a box around a sprite. Drag a box to move it, or its bottom-right corner to resize it. Click a row below to select it.</p>
          </div>
        )}
      </div>

      <div className="panel plan-panel">
        <div className="plan-header">
          <h2>Plan <span className="muted">({sprites.length})</span></h2>
          {sprites.length > 0 && (
            <button className="btn btn-ghost btn-small" onClick={onClearAll}>Clear all</button>
          )}
        </div>
        <div className="plan-list">
          {sprites.length === 0 && <p className="hint">No sprites yet — run detection, generate a grid, or draw manually.</p>}
          {sprites.map((s, i) => (
            <div
              key={s.id}
              className={`plan-row ${selectedId === s.id ? 'plan-row-selected' : ''}`}
              onClick={() => setSelectedId(s.id)}
            >
              <span className="plan-index mono">{i + 1}</span>
              <input
                className="plan-name"
                value={s.name}
                onChange={(e) => onRenameSprite(s.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="plan-dims mono">{s.width}×{s.height}</span>
              <button className="icon-btn" title="Delete" onClick={(e) => { e.stopPropagation(); onDeleteSprite(s.id); }}>×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel export-panel">
        <button className="btn btn-primary btn-block" disabled={sprites.length === 0 || exporting} onClick={onExportZip}>
          {exporting ? 'Packing…' : `Download ${sprites.length || ''} PNGs (.zip)`}
        </button>
        <button className="btn btn-ghost btn-block" disabled={sprites.length === 0} onClick={onExportJson}>
          Download plan (.json)
        </button>
      </div>
    </aside>
  );
}
