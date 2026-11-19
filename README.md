# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/galipeli/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/galipeli/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your photos and captions into GTA 6-style multi-panel poster cover art. Built for the [make.fun "Make GTA 6 Cover Art" bounty](https://make.fun/bounty/gta6-cover-art-01) ($250 in USDC).

## What it does

Neon Coast Cover Studio is an offline web app that lays your photos out as a poster-style cover: six layouts (9-Panel Grid, Hero + Three, Full-Bleed Hero, Tilted Snapshot, Story Stack, Quad + Strip), six sunset/neon Vice City grades with a strength slider, per-panel crop/zoom/position, editable caption, subtitle and badge, live preview, undo/redo, and one-click export at three sizes (1080×1080, 1080×1350, 1920×1080). The cover itself is rendered in code: retro slatted sun, skyline and palm silhouettes, white-framed inked panels, halftone title block, and a neon-glow title.

## Run it

```sh
# Open the editor (static, no build step, no network needed):
# serve app/ with any static server, or open app/index.html directly.
python3 -m http.server -d app 8080
```

```sh
# Build the submission dossier (Node 22):
node main.ts
```

## Files

- `app/` — the offline web app (HTML/CSS/JS, vendored OFL fonts, sample photos)
- `screenshots/` — cover and editor captures (first file is the cover)
- `main.ts` — entrypoint: copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`
- `vendor/makefun-app.ts` — dossier builder from the competition kit
