export interface SpriteRect {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Mode = 'grid' | 'manual' | 'auto';

export interface GridSettings {
  cols: number;
  rows: number;
  offsetX: number;
  offsetY: number;
  spacingX: number;
  spacingY: number;
  trimEmpty: boolean;
}

export interface AutoSettings {
  useAlpha: boolean;
  tolerance: number;
  minWidth: number;
  minHeight: number;
  padding: number;
  mergeDistance: number;
  bgColor: [number, number, number] | null;
}
