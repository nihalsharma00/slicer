import JSZip from 'jszip';
import type { SpriteRect } from '../types';

function safeName(name: string): string {
  return name.trim().replace(/[^a-z0-9_-]+/gi, '_') || 'sprite';
}

export function cropSpriteToBlob(source: HTMLImageElement, rect: SpriteRect): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not export sprite canvas to PNG'));
    }, 'image/png');
  });
}

export function buildPlan(sourceName: string, imgWidth: number, imgHeight: number, sprites: SpriteRect[]) {
  return {
    meta: {
      source: sourceName,
      size: { width: imgWidth, height: imgHeight },
      spriteCount: sprites.length,
      generatedAt: new Date().toISOString(),
    },
    sprites: sprites.map((s) => ({
      name: safeName(s.name),
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
    })),
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerDownload(blob, filename);
}

export async function downloadZip(
  filename: string,
  source: HTMLImageElement,
  sprites: SpriteRect[],
  includePlan: boolean,
  plan: unknown,
) {
  const zip = new JSZip();
  const used = new Map<string, number>();
  for (const sprite of sprites) {
    const blob = await cropSpriteToBlob(source, sprite);
    let name = safeName(sprite.name);
    const count = used.get(name) ?? 0;
    used.set(name, count + 1);
    if (count > 0) name = `${name}_${count + 1}`;
    zip.file(`${name}.png`, blob);
  }
  if (includePlan) {
    zip.file('plan.json', JSON.stringify(plan, null, 2));
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, filename);
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
