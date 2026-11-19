# Neon Coast Cover Studio

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun rank](https://make.fun/badge/gta6-cover-art-01/galipeli/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun reward](https://make.fun/badge/gta6-cover-art-01/galipeli/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Neon Coast Cover Studio is a web app that turns a photo and a caption into multi-panel cover art in the spirit of GTA 6. Drop in an image, add your text, and the studio arranges everything into a game-cover style panel grid, applies a sunset and neon Vice City colour grade, lays out a bold title block, adds a halftone texture, and finishes the composition with a tilted snapshot look.

The finished artwork can be exported as a PNG in three sizes: 1080x1080, 1080x1350, and 1920x1080, so the same cover works as a square post, a portrait post, or a wide banner. The app runs entirely offline and has no external dependencies — everything it needs ships inside this repository.

## Running it

```sh
node main.ts
```

This requires Node 22 and uses only the standard library. Running it copies `app/` and `screenshots/` into `/output` and writes `/output/dossier.json`.

## License

This project is released under the MIT License — see the `LICENSE` file in this repository for the full text.
