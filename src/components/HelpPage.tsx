export default function HelpPage({ onClose }: { onClose: () => void }) {
  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h2>How to use Sprite Slicer</h2>
          <button className="btn btn-ghost btn-small" onClick={onClose}>✕ Close</button>
        </div>

        <div className="help-body">

          {/* ── GRID MODE ── */}
          <section className="help-section">
            <div className="help-mode-badge help-badge-grid">Grid Mode</div>
            <p className="hint">
              Best for sprite sheets where all frames are the same size, evenly arranged in rows and columns.
            </p>
            <div className="help-example-img-wrap">
              <div className="help-grid-demo">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="help-grid-cell">
                    <span>{i + 1}</span>
                  </div>
                ))}
              </div>
              <p className="hint" style={{ textAlign: 'center', marginTop: 8 }}>
                4 columns × 2 rows sprite sheet
              </p>
            </div>
            <div className="help-steps">
              <div className="help-step">
                <span className="help-step-num">1</span>
                <span>Switch to the <strong>Grid</strong> tab in the sidebar.</span>
              </div>
              <div className="help-step">
                <span className="help-step-num">2</span>
                <span>
                  Enter <strong>Columns</strong> (e.g. <code>4</code>) and <strong>Rows</strong> (e.g. <code>2</code>)
                  — Cell Width &amp; Height will be calculated automatically.
                </span>
              </div>
              <div className="help-step">
                <span className="help-step-num">3</span>
                <span>Set <strong>Spacing X / Y</strong> if there are gaps between frames (usually 0).</span>
              </div>
              <div className="help-step">
                <span className="help-step-num">4</span>
                <span>Click <strong>Generate grid</strong>. All cells appear in the Plan list on the right.</span>
              </div>
              <div className="help-step">
                <span className="help-step-num">5</span>
                <span>Click <strong>Download PNGs (.zip)</strong> to export all frames.</span>
              </div>
            </div>
            <div className="help-tip">
              💡 Leave Columns/Rows at <code>0</code> and set Cell Width/Height directly — the grid auto-derives the count.
            </div>
          </section>

          {/* ── AUTO DETECT MODE ── */}
          <section className="help-section">
            <div className="help-mode-badge help-badge-auto">Auto Detect Mode</div>
            <p className="hint">
              Best for sheets where sprites are separated by transparent or solid-color backgrounds —
              e.g. character spritesheets on a white/magenta background.
            </p>
            <div className="help-example-img-wrap">
              <div className="help-auto-demo">
                {[
                  { label: '🧙', x: 10, y: 10, w: 60, h: 80 },
                  { label: '🗡️', x: 90, y: 20, w: 40, h: 60 },
                  { label: '🛡️', x: 155, y: 15, w: 55, h: 70 },
                  { label: '💣', x: 230, y: 30, w: 45, h: 45 },
                ].map((s, i) => (
                  <div key={i} className="help-auto-sprite" style={{ left: s.x, top: s.y, width: s.w, height: s.h }}>
                    <span className="help-auto-icon">{s.label}</span>
                    <div className="help-auto-border" />
                  </div>
                ))}
              </div>
              <p className="hint" style={{ textAlign: 'center', marginTop: 8 }}>
                Sprites detected by transparent / background-color separation
              </p>
            </div>
            <div className="help-steps">
              <div className="help-step">
                <span className="help-step-num">1</span>
                <span>Switch to the <strong>Auto detect</strong> tab.</span>
              </div>
              <div className="help-step">
                <span className="help-step-num">2</span>
                <span>
                  If sprites are on a transparent background, enable <strong>Treat transparent pixels as background</strong>.
                </span>
              </div>
              <div className="help-step">
                <span className="help-step-num">3</span>
                <span>
                  If sprites are on a solid color, click <strong>Pick from image</strong> and click that color on the canvas.
                </span>
              </div>
              <div className="help-step">
                <span className="help-step-num">4</span>
                <span>Adjust <strong>Tolerance</strong> (higher = more lenient color matching).</span>
              </div>
              <div className="help-step">
                <span className="help-step-num">5</span>
                <span>Click <strong>Detect sprites</strong>. Boxes appear around each found sprite.</span>
              </div>
            </div>
            <div className="help-tip">
              💡 Increase <strong>Merge nearby pieces</strong> if one sprite is being split into multiple boxes.
            </div>
          </section>

          {/* ── MANUAL MODE ── */}
          <section className="help-section">
            <div className="help-mode-badge help-badge-manual">Manual Mode</div>
            <p className="hint">
              Best when sprites have irregular sizes or when you need precise control. Draw boxes by hand.
            </p>
            <div className="help-example-img-wrap">
              <div className="help-manual-demo">
                <div className="help-manual-canvas">
                  <div className="help-manual-rect" style={{ left: 12, top: 10, width: 80, height: 60 }}>
                    <span className="help-manual-label">sprite_01</span>
                    <div className="help-manual-handle" />
                  </div>
                  <div className="help-manual-rect help-manual-rect-sel" style={{ left: 110, top: 5, width: 100, height: 75 }}>
                    <span className="help-manual-label" style={{ color: 'var(--accent)' }}>sprite_02 ✏️</span>
                    <div className="help-manual-handle" />
                  </div>
                  <div className="help-manual-drag" style={{ left: 225, top: 20, width: 60, height: 50 }}>
                    <span className="hint" style={{ fontSize: 10 }}>drawing…</span>
                  </div>
                </div>
              </div>
              <p className="hint" style={{ textAlign: 'center', marginTop: 8 }}>
                Drag to draw, drag box to move, drag corner to resize
              </p>
            </div>
            <div className="help-steps">
              <div className="help-step">
                <span className="help-step-num">1</span>
                <span>Switch to the <strong>Manual</strong> tab.</span>
              </div>
              <div className="help-step">
                <span className="help-step-num">2</span>
                <span><strong>Click and drag</strong> on the canvas to draw a box around a sprite.</span>
              </div>
              <div className="help-step">
                <span className="help-step-num">3</span>
                <span><strong>Drag a box</strong> to move it. Drag the <strong>orange corner handle</strong> to resize it.</span>
              </div>
              <div className="help-step">
                <span className="help-step-num">4</span>
                <span>Click a sprite in the <strong>Plan list</strong> to select and rename it.</span>
              </div>
              <div className="help-step">
                <span className="help-step-num">5</span>
                <span>Export when done.</span>
              </div>
            </div>
            <div className="help-tip">
              💡 You can mix modes — run Auto detect first, then switch to Manual to fine-tune individual boxes.
            </div>
          </section>

          {/* ── ZOOM / FIT ── */}
          <section className="help-section">
            <div className="help-mode-badge" style={{ background: 'var(--bg-3)', color: 'var(--text)' }}>Zoom &amp; Fit</div>
            <div className="help-steps">
              <div className="help-step">
                <span className="help-step-num">⊡</span>
                <span>Use the <strong>Fit</strong> button (next to the zoom slider) to auto-fit the image to the screen.</span>
              </div>
              <div className="help-step">
                <span className="help-step-num">⊕</span>
                <span>Drag the <strong>Zoom</strong> slider (or scroll with the mouse wheel on the canvas) to zoom in/out.</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
