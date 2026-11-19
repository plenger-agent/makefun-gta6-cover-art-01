// The Vice colour grade: what turns an ordinary photo into cover art. Each preset
// is a recipe — a saturation/contrast push while the photo is drawn, a duotone
// wash laid over the panels in a blend mode, a warm light leak, and the shared
// finish of vignette and film grain. Strength (0..1) fades the whole recipe.

/** The grade recipes the editor offers, keyed by the id its buttons carry. */
export const GRADE_PRESETS = {
  sunset: {
    label: 'Vice Sunset',
    saturation: 1.35, contrast: 1.08, brightness: 1.02,
    washTop: 'rgba(64, 16, 96, 0.34)', washMid: 'rgba(255, 62, 122, 0.20)', washLow: 'rgba(255, 122, 40, 0.30)',
    blend: 'overlay', leak: 'rgba(255, 150, 60, 0.35)', leakAt: [0.82, 0.06],
  },
  neon: {
    label: 'Neon Night',
    saturation: 1.45, contrast: 1.14, brightness: 0.98,
    washTop: 'rgba(6, 10, 60, 0.42)', washMid: 'rgba(150, 20, 160, 0.24)', washLow: 'rgba(10, 120, 150, 0.30)',
    blend: 'overlay', leak: 'rgba(255, 61, 138, 0.32)', leakAt: [0.12, 0.02],
  },
  golden: {
    label: 'Golden Hour',
    saturation: 1.22, contrast: 1.05, brightness: 1.06,
    washTop: 'rgba(90, 40, 10, 0.20)', washMid: 'rgba(255, 160, 60, 0.16)', washLow: 'rgba(190, 70, 20, 0.22)',
    blend: 'soft-light', leak: 'rgba(255, 190, 90, 0.4)', leakAt: [0.5, 0.0],
  },
  clean: {
    label: 'Clean Plate',
    saturation: 1.08, contrast: 1.03, brightness: 1.0,
    washTop: 'rgba(20, 20, 40, 0.10)', washMid: 'rgba(120, 60, 120, 0.06)', washLow: 'rgba(40, 30, 60, 0.10)',
    blend: 'soft-light', leak: 'rgba(255, 255, 255, 0.10)', leakAt: [0.5, 0.0],
  },
};

/** The CSS filter string a photo is drawn with under a preset, faded by strength. */
export function photoFilter(preset, strength) {
  const mix = (from, to) => from + (to - from) * strength;
  return `saturate(${mix(1, preset.saturation).toFixed(3)}) contrast(${mix(1, preset.contrast).toFixed(3)}) brightness(${mix(1, preset.brightness).toFixed(3)})`;
}

/** Lays the preset's duotone wash and light leak over the whole cover. */
export function applyColourWash(ctx, width, height, preset, strength) {
  if (strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = preset.blend;
  ctx.globalAlpha = strength;
  const wash = ctx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, preset.washTop);
  wash.addColorStop(0.52, preset.washMid);
  wash.addColorStop(1, preset.washLow);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.75 * strength;
  const [lx, ly] = preset.leakAt;
  const leak = ctx.createRadialGradient(width * lx, height * ly, 0, width * lx, height * ly, Math.max(width, height) * 0.75);
  leak.addColorStop(0, preset.leak);
  leak.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leak;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

let grainTile = null;

/** A 256px tile of monochrome noise, drawn once and reused as a pattern. */
function makeGrainTile() {
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(256, 256);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 64);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  return tile;
}

/** The shared finish: a vignette darkening the corners and a breath of grain. */
export function applyFinish(ctx, width, height, strength) {
  ctx.save();
  const vig = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.36,
    width / 2, height / 2, Math.max(width, height) * 0.78,
  );
  vig.addColorStop(0, 'rgba(8, 0, 16, 0)');
  vig.addColorStop(1, `rgba(8, 0, 16, ${(0.52 * (0.4 + 0.6 * strength)).toFixed(3)})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  if (!grainTile) grainTile = makeGrainTile();
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
