import type { AutoSettings, GridSettings, SpriteRect } from '../types';

let idCounter = 0;
export function nextId(): string {
  idCounter += 1;
  return `s${Date.now().toString(36)}${idCounter}`;
}

/** Sample the four corners and return the most common color, used as the default background guess. */
export function guessBackgroundColor(data: ImageData): [number, number, number, number] {
  const { width, height, data: px } = data;
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];
  const counts = new Map<string, { color: [number, number, number, number]; count: number }>();
  for (const c of corners) {
    const key = `${px[c]},${px[c + 1]},${px[c + 2]},${px[c + 3]}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { color: [px[c], px[c + 1], px[c + 2], px[c + 3]], count: 1 });
  }
  let best = corners.length ? counts.get(`${px[0]},${px[1]},${px[2]},${px[3]}`)! : undefined;
  for (const v of counts.values()) {
    if (!best || v.count > best.count) best = v;
  }
  return best ? best.color : [0, 0, 0, 0];
}

function isBackgroundPixel(
  px: Uint8ClampedArray,
  i: number,
  settings: AutoSettings,
  bg: [number, number, number, number],
): boolean {
  const a = px[i + 3];
  if (settings.useAlpha) {
    if (a <= 8) return true;
  }
  const r = px[i];
  const g = px[i + 1];
  const b = px[i + 2];
  const dr = r - bg[0];
  const dg = g - bg[1];
  const db = b - bg[2];
  const da = a - bg[3];
  const dist = Math.sqrt(dr * dr + dg * dg + db * db + da * da);
  return dist <= settings.tolerance;
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boxesClose(a: Box, b: Box, gap: number): boolean {
  const ax0 = a.minX - gap;
  const ay0 = a.minY - gap;
  const ax1 = a.maxX + gap;
  const ay1 = a.maxY + gap;
  return !(b.minX > ax1 || b.maxX < ax0 || b.minY > ay1 || b.maxY < ay0);
}

function mergeBox(a: Box, b: Box): Box {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Separator-line detection for continuous grid sheets (no transparent bg)
// ─────────────────────────────────────────────────────────────────────────────

/** Compute average brightness for each row or column */
function computeLineBrightness(
  px: Uint8ClampedArray,
  width: number,
  height: number,
  isRow: boolean,
): Float32Array {
  const n = isRow ? height : width;
  const m = isRow ? width : height;
  const result = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < m; j++) {
      const idx = isRow ? (i * width + j) * 4 : (j * width + i) * 4;
      sum += (px[idx] * 299 + px[idx + 1] * 587 + px[idx + 2] * 114) / 1000;
    }
    result[i] = sum / m;
  }
  return result;
}

/** Find positions that are local minima compared to nearby average, by at least `drop` */
function findDarkLines(brightness: Float32Array, drop: number): number[] {
  const n = brightness.length;
  const w = Math.max(5, Math.min(40, Math.floor(n / 8))); // window
  const candidates: number[] = [];

  for (let i = w; i < n - w; i++) {
    let leftAvg = 0, rightAvg = 0;
    for (let d = 1; d <= w; d++) { leftAvg += brightness[i - d]; rightAvg += brightness[i + d]; }
    leftAvg /= w; rightAvg /= w;
    const context = (leftAvg + rightAvg) / 2;
    if (context - brightness[i] >= drop) candidates.push(i);
  }

  // Cluster consecutive candidates → keep the darkest in each cluster
  if (candidates.length === 0) return [];
  const result: number[] = [];
  let clusterStart = 0;
  for (let i = 1; i <= candidates.length; i++) {
    if (i === candidates.length || candidates[i] - candidates[i - 1] > 4) {
      // Find darkest in cluster
      let darkest = candidates[clusterStart];
      for (let j = clusterStart + 1; j < i; j++) {
        if (brightness[candidates[j]] < brightness[darkest]) darkest = candidates[j];
      }
      result.push(darkest);
      clusterStart = i;
    }
  }
  return result;
}

/** Check if an array of values (cell sizes) are roughly uniform (within 20% of mean) */
function isUniform(sizes: number[]): boolean {
  if (sizes.length === 0) return false;
  const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  return sizes.every(s => s > 2 && Math.abs(s - avg) <= avg * 0.25);
}

/**
 * Try to detect if the sheet is a regular grid with thin border/separator lines.
 * Returns rects if successful, null otherwise.
 */
function tryGridDetection(imageData: ImageData): SpriteRect[] | null {
  const { width, height, data: px } = imageData;

  const colB = computeLineBrightness(px, width, height, false);
  const rowB = computeLineBrightness(px, width, height, true);

  // Try thresholds from subtle to obvious separators
  for (const drop of [8, 15, 25, 40, 60]) {
    const xs = findDarkLines(colB, drop); // vertical separators
    const ys = findDarkLines(rowB, drop); // horizontal separators

    // Need at least some separators (could be 1D grid like strip of frames)
    if (xs.length === 0 && ys.length === 0) continue;

    // Build cell boundaries: [0, sep+1, sep+1, ..., end]
    const xBounds = [0, ...xs.map(x => x + 1), width];
    const yBounds = [0, ...ys.map(y => y + 1), height];
    const cellWidths = [];
    for (let i = 1; i < xBounds.length; i++) cellWidths.push(xBounds[i] - xBounds[i - 1]);
    const cellHeights = [];
    for (let i = 1; i < yBounds.length; i++) cellHeights.push(yBounds[i] - yBounds[i - 1]);

    // All cells must be roughly the same size and non-trivial
    if (!isUniform(cellWidths) || !isUniform(cellHeights)) continue;

    const rects: SpriteRect[] = [];
    let idx = 0;
    for (let r = 0; r < yBounds.length - 1; r++) {
      for (let c = 0; c < xBounds.length - 1; c++) {
        const x = xBounds[c];
        const y = yBounds[r];
        const w = xBounds[c + 1] - x;
        const h = yBounds[r + 1] - y;
        if (w < 4 || h < 4) continue;
        idx++;
        rects.push({
          id: nextId(),
          name: `sprite_${String(idx).padStart(2, '0')}`,
          x, y, width: w, height: h,
        });
      }
    }

    if (rects.length >= 2) return rects;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main auto-detect: tries grid detection FIRST, falls back to flood-fill
// ─────────────────────────────────────────────────────────────────────────────

/** Main entry: tries separator-line grid detection first, then flood-fill fallback. */
export function autoDetectSprites(imageData: ImageData, settings: AutoSettings): SpriteRect[] {
  const { width, height, data: px } = imageData;

  // ── Strategy 1: Always try separator-line grid detection first.
  // Works great for sheets where frames are separated by thin dark border lines.
  const gridResult = tryGridDetection(imageData);
  if (gridResult && gridResult.length >= 2) return gridResult;

  // ── Strategy 2: Flood-fill on foreground/background separation.
  // Works for sheets where sprites sit on a transparent or solid-color background.
  const bg = settings.bgColor
    ? [settings.bgColor[0], settings.bgColor[1], settings.bgColor[2], 255] as [number, number, number, number]
    : guessBackgroundColor(imageData);

  const visited = new Uint8Array(width * height);
  const boxes: Box[] = [];
  const stack: [number, number][] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      const pi = idx * 4;
      if (isBackgroundPixel(px, pi, settings, bg)) {
        visited[idx] = 1;
        continue;
      }
      stack.length = 0;
      stack.push([x, y]);
      visited[idx] = 1;
      let minX = x, maxX = x, minY = y, maxY = y;

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]] as const) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (visited[nIdx]) continue;
          visited[nIdx] = 1;
          if (!isBackgroundPixel(px, nIdx * 4, settings, bg)) {
            stack.push([nx, ny]);
          }
        }
      }

      boxes.push({ minX, minY, maxX, maxY });
    }
  }

  // Merge boxes that are within mergeDistance of each other
  let merged = boxes;
  if (settings.mergeDistance > 0) {
    let changed = true;
    while (changed) {
      changed = false;
      outer: for (let i = 0; i < merged.length; i++) {
        for (let j = i + 1; j < merged.length; j++) {
          if (boxesClose(merged[i], merged[j], settings.mergeDistance)) {
            const combined = mergeBox(merged[i], merged[j]);
            merged = merged.filter((_, k) => k !== i && k !== j);
            merged.push(combined);
            changed = true;
            break outer;
          }
        }
      }
    }
  }

  const pad = settings.padding;
  const results: SpriteRect[] = merged
    .map((b) => {
      const w = b.maxX - b.minX + 1;
      const h = b.maxY - b.minY + 1;
      return { box: b, w, h };
    })
    .filter(({ w, h }) => w >= settings.minWidth && h >= settings.minHeight)
    .map(({ box }) => {
      const x = Math.max(0, box.minX - pad);
      const y = Math.max(0, box.minY - pad);
      const x1 = Math.min(width, box.maxX + 1 + pad);
      const y1 = Math.min(height, box.maxY + 1 + pad);
      return { x, y, width: x1 - x, height: y1 - y };
    })
    .sort((a, b) => {
      const rowTolerance = Math.max(a.height, b.height) / 2;
      if (Math.abs(a.y - b.y) > rowTolerance) return a.y - b.y;
      return a.x - b.x;
    })
    .map((r, i) => ({ id: nextId(), name: `sprite_${String(i + 1).padStart(2, '0')}`, ...r }));

  return results;
}

/** Build a regular grid of sprite rects from cell dimensions or column/row counts. */
export function generateGrid(
  imgWidth: number,
  imgHeight: number,
  settings: GridSettings,
  cellWidth: number,
  cellHeight: number,
): SpriteRect[] {
  const rects: SpriteRect[] = [];
  const usableW = imgWidth - settings.offsetX;
  const usableH = imgHeight - settings.offsetY;
  const stepX = cellWidth + settings.spacingX;
  const stepY = cellHeight + settings.spacingY;
  const cols = settings.cols > 0 ? settings.cols : Math.floor((usableW + settings.spacingX) / stepX);
  const rows = settings.rows > 0 ? settings.rows : Math.floor((usableH + settings.spacingY) / stepY);

  let index = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = settings.offsetX + c * stepX;
      const y = settings.offsetY + r * stepY;
      if (x + cellWidth > imgWidth || y + cellHeight > imgHeight) continue;
      index += 1;
      rects.push({
        id: nextId(),
        name: `sprite_${String(index).padStart(2, '0')}`,
        x,
        y,
        width: cellWidth,
        height: cellHeight,
      });
    }
  }
  return rects;
}

/** Returns true if every pixel in the given rect is background (used to trim empty grid cells). */
export function isRectEmpty(
  imageData: ImageData,
  rect: { x: number; y: number; width: number; height: number },
  settings: AutoSettings,
  bg: [number, number, number, number],
): boolean {
  const { width, data: px } = imageData;
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      const idx = (y * width + x) * 4;
      if (!isBackgroundPixel(px, idx, settings, bg)) return false;
    }
  }
  return true;
}
