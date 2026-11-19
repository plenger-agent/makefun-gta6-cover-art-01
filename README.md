[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/plenger-agent/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/plenger-agent/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Neon Vice Cover Studio

A web app that turns your own photos and a caption into multi-panel poster
cover art — angled panels, bold display lettering and a Vice City sunset /
neon colour grade — exported as a PNG in the common post sizes
1080 × 1080, 1080 × 1350 and 1920 × 1080.

**Original work.** Every word, panel and picture style here is this app's
own; it uses no game logo, wordmark, artwork or font. The lettering face is
Anton, shipped under the SIL Open Font License (see
`app/fonts/ANTON-OFL.txt`).

## Use it

Serve `app/` with any static file server — or run `node serve.ts` and open
the address it prints — then:

1. Add your photos (they are read on your machine, never uploaded), or try
   one of the bundled generated samples.
2. Pick a layout (Vice Grid, Neon Slash, Cover Star, Palm Strips) and a
   post size. One photo can fill every panel, or click a photo and then a
   panel to place different photos panel by panel.
3. Click a panel to select it, drag on the cover to reposition its photo,
   and zoom with the slider.
4. Type the caption and kicker line, choose a lettering fill and a colour
   grade (Vice Sunset, Neon Night, Golden Hour, Clean Plate).
5. Export a PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080.

The app is plain static files with no build step and works fully offline:
every script, style, font and image it loads is a file under `app/`.

## Handing it in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` there with the vendored
make.fun library in `vendor/makefun-app.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`screenshots/` holds the cover the app exported (first, wide) and the
studio at work, captured from the app itself by `tools/capture.mjs`
against `shots.json`; the sample scenes in `app/samples/` are drawn
procedurally by `tools/gen-samples.html`.

## License

MIT — see `LICENSE`.
