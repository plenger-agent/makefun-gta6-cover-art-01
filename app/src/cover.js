// The cover renderer: draws a whole cover from the editor's state — a dark
// backing, each panel's photo cover-fitted and clipped to its angled polygon,
// the Vice colour grade over everything, film finish, and the caption
// lettering. The same function paints the live preview and the exported PNG,
// so what the maker sees is exactly what the PNG holds.

import { panelsFor, panelBounds, insetPolygon } from './panels.js';
import { GRADE_PRESETS, photoFilter, applyColourWash, applyFinish } from './grade.js';
import { drawCoverWords } from './lettering.js';

/** The three post sizes the app exports, keyed by the id the buttons carry. */
export const POST_SIZES = {
  square: { label: '1080 × 1080', width: 1080, height: 1080 },
  portrait: { label: '1080 × 1350', width: 1080, height: 1350 },
  wide: { label: '1920 × 1080', width: 1920, height: 1080 },
};

/** A fresh editor state: no photos, the Vice Grid layout, sunset grade. */
export function createCoverState() {
  return {
    template: 'vice-grid',
    aspect: 'square',
    photos: [],            // [{ image, name }] in load order
    assignment: [],        // photo index per panel, or -1 for empty
    transforms: [],        // per panel { zoom, shiftX, shiftY } in cover fractions
    pickedPhoto: -1,
    selectedPanel: 0,
    caption: 'MIDNIGHT HEAT',
    kicker: 'VICE SHORES • EST. 2026',
    letterStyle: 'porcelain',
    grade: 'sunset',
    gradeStrength: 0.8,
  };
}

/** Keeps assignment/transform arrays matched to the current layout's panels. */
export function syncPanelSlots(state) {
  const count = panelsFor(state.template, state.aspect).length;
  while (state.assignment.length < count) state.assignment.push(-1);
  while (state.transforms.length < count) state.transforms.push({ zoom: 1, shiftX: 0, shiftY: 0 });
  state.assignment.length = count;
  state.transforms.length = count;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

/** Traces a polygon path (pixel points) on the context. */
function tracePolygon(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** The placeholder art an empty panel shows: a dusk gradient and its number. */
function drawEmptyPanel(ctx, pixelPoints, bounds, width, height, index) {
  ctx.save();
  tracePolygon(ctx, pixelPoints);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, bounds.minY * height, 0, bounds.maxY * height);
  grad.addColorStop(0, '#3b1654');
  grad.addColorStop(0.55, '#7a1e5e');
  grad.addColorStop(1, '#e85d2a');
  ctx.fillStyle = grad;
  ctx.fillRect(bounds.minX * width - 4, bounds.minY * height - 4, bounds.width * width + 8, bounds.height * height + 8);
  ctx.fillStyle = 'rgba(255, 235, 220, 0.85)';
  ctx.font = `${Math.round(Math.min(width, height) * 0.045)}px "Anton", sans-serif`;
  ctx.textAlign = 'center';
  const cx = (bounds.minX + bounds.width / 2) * width;
  const cy = (bounds.minY + bounds.height / 2) * height;
  ctx.fillText(`PANEL ${index + 1}`, cx, cy);
  ctx.font = `${Math.round(Math.min(width, height) * 0.022)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255, 235, 220, 0.65)';
  ctx.fillText('add a photo', cx, cy + Math.min(width, height) * 0.04);
  ctx.restore();
}

/**
 * Draws one panel: its photo cover-fitted into the panel's bounding box —
 * scaled by the panel zoom, centred on the panel focal point plus the maker's
 * drag shift — then clipped to the inset polygon.
 */
function drawPhotoPanel(ctx, state, panel, pixelPoints, index, width, height, preset) {
  const photoIndex = state.assignment[index];
  const photo = photoIndex >= 0 ? state.photos[photoIndex] : null;
  const bounds = panelBounds(panel);
  if (!photo) {
    drawEmptyPanel(ctx, pixelPoints, bounds, width, height, index);
    return;
  }
  const img = photo.image;
  const transform = state.transforms[index] ?? { zoom: 1, shiftX: 0, shiftY: 0 };
  const boxW = bounds.width * width;
  const boxH = bounds.height * height;
  const scale = Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight) * (transform.zoom || 1);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const centreX = (bounds.minX + panel.focal[0] * bounds.width + transform.shiftX) * width;
  const centreY = (bounds.minY + panel.focal[1] * bounds.height + transform.shiftY) * height;
  ctx.save();
  tracePolygon(ctx, pixelPoints);
  ctx.clip();
  ctx.filter = photoFilter(preset, state.gradeStrength);
  ctx.drawImage(img, centreX - drawW / 2, centreY - drawH / 2, drawW, drawH);
  ctx.filter = 'none';
  ctx.restore();
}

/** A bright outline around the panel the maker is editing (preview only). */
function drawSelectionOutline(ctx, pixelPoints) {
  ctx.save();
  tracePolygon(ctx, pixelPoints);
  ctx.strokeStyle = '#2de2e6';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8]);
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders the cover described by `state` onto `canvas` at the canvas's own
 * size. `preview` adds the selection outline for the panel being edited.
 */
export function renderCover(canvas, state, { preview = false } = {}) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const preset = GRADE_PRESETS[state.grade] ?? GRADE_PRESETS.sunset;
  const panels = panelsFor(state.template, state.aspect);
  const gap = Math.max(4, Math.min(width, height) * 0.007);

  ctx.fillStyle = '#07040d';
  ctx.fillRect(0, 0, width, height);

  const pixelPanels = panels.map((panel) => {
    const raw = panel.points.map(([x, y]) => [x * width, y * height]);
    return insetPolygon(raw, gap);
  });
  panels.forEach((panel, i) => drawPhotoPanel(ctx, state, panel, pixelPanels[i], i, width, height, preset));

  applyColourWash(ctx, width, height, preset, state.gradeStrength);
  applyFinish(ctx, width, height, state.gradeStrength);
  drawCoverWords(ctx, width, height, state);

  if (preview && pixelPanels[state.selectedPanel]) {
    drawSelectionOutline(ctx, pixelPanels[state.selectedPanel]);
  }
}

/** Renders the cover at a post size and downloads it as a PNG file. */
export function exportCoverPNG(state, sizeKey, onDone) {
  const size = POST_SIZES[sizeKey] ?? POST_SIZES.square;
  const offscreen = document.createElement('canvas');
  offscreen.width = size.width;
  offscreen.height = size.height;
  const sizedState = { ...state, aspect: sizeKey };
  renderCover(offscreen, sizedState);
  offscreen.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `neon-vice-cover-${size.width}x${size.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    if (onDone) onDone(link.download);
  }, 'image/png');
}
