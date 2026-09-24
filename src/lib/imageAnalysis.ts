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
    // fall through to also allow a solid bg color check combined with alpha
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

/** Iterative 4-connectivity flood fill / connected component labeling over foreground pixels. */
export function autoDetectSprites(imageData: ImageData, settings: AutoSettings): SpriteRect[] {
  const { width, height, data: px } = imageData;
  const bg = settings.bgColor
    ? [settings.bgColor[0], settings.bgColor[1], settings.bgColor[2], 255] as [number, number, number, number]
    : guessBackgroundColor(imageData);

  const visited = new Uint8Array(width * height);
  const boxes: Box[] = [];
  const stackX = new Int32Array(width * height);
  const stackY = new Int32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      const pi = idx * 4;
      if (isBackgroundPixel(px, pi, settings, bg)) {
        visited[idx] = 1;
        continue;
      }
      // BFS/flood fill from this foreground pixel
      let sp = 0;
      stackX[sp] = x;
      stackY[sp] = y;
      sp += 1;
      visited[idx] = 1;
      let minX = x, maxX = x, minY = y, maxY = y;

      while (sp > 0) {
        sp -= 1;
        const cx = stackX[sp];
        const cy = stackY[sp];
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (visited[nIdx]) continue;
          const npi = nIdx * 4;
          if (isBackgroundPixel(px, npi, settings, bg)) {
            visited[nIdx] = 1;
            continue;
          }
          visited[nIdx] = 1;
          stackX[sp] = nx;
          stackY[sp] = ny;
          sp += 1;
        }
      }

      boxes.push({ minX, minY, maxX, maxY });
    }
  }

  // Merge boxes that are within mergeDistance of each other (handles multi-part sprites)
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
    // reading order: top-to-bottom rows, then left-to-right within a row (using height as row tolerance)
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
