# Sprite Slicer

A browser-only tool for cutting a sprite sheet into individual images — by hand, by grid, or by automatic edge detection — and exporting a plan (JSON) plus a ZIP of the cropped PNGs. Nothing leaves the browser: there's no backend, no upload to a server, no API keys.

## Features

- **Auto detect** — separates sprites from the background using the image's alpha channel and/or a background color (sampled from a corner, picked from the image, or auto-guessed), then finds each connected shape and boxes it. Tunable color tolerance, minimum size (to ignore noise), padding, and a "merge nearby pieces" distance for sprites made of several disconnected parts (e.g. a body + a separated sword).
- **Grid** — slices the sheet into equal cells by column/row count or cell size, with offset and spacing controls for sheets with margins/gutters, and an option to skip cells that are entirely background.
- **Manual** — draw boxes by hand, then drag to move or drag the corner handle to resize. Useful for touch-ups after auto-detect, or sheets too irregular to detect automatically.
- **Plan** — every sprite gets an editable name, and the full plan (name, x, y, width, height) exports as `plan.json` — handy as a manifest for a game engine — alongside a ZIP of the individually cropped PNGs.

## Run it locally

```bash
npm install
npm run dev
```

Then open the printed local URL.

## Deploy to Vercel

**Option A — Vercel CLI**
```bash
npm install -g vercel   # if you don't have it
vercel                  # from inside this folder, follow the prompts
```

**Option B — GitHub + Vercel dashboard**
1. Push this folder to a new GitHub repo.
2. On [vercel.com](https://vercel.com), click **New Project** and import that repo.
3. Vercel auto-detects it as a Vite app (build command `npm run build`, output directory `dist`) — just click **Deploy**.

No environment variables or extra configuration are needed.

## Notes

- PNG sheets work best for auto-detection, since the alpha channel gives a clean signal for "empty." JPEGs and other opaque sheets still work via background-color matching — pick the background color with the eyedropper for best results.
- Everything (image decoding, connected-component detection, cropping, zipping) runs client-side in the browser via `<canvas>` and `jszip`.
