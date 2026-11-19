// Panel layouts for the covers: every template is a set of angled polygons in
// normalised cover coordinates (0..1 on both axes), so the same layout draws at
// any post size. The renderer clips each panel's photo to its polygon, insets it
// a few pixels toward the panel's centre, and the dark gaps left between panels
// give the multi-panel poster look.

/** One panel: a name, its polygon, and the point a photo should centre on. */
function makePanel(name, points, focal) {
  return { name, points, focal };
}

/** The bounding box of a polygon, for cover-fitting a photo into it. */
export function panelBounds(panel) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const [x, y] of panel.points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** The centroid of a polygon, used to inset it for the panel gaps. */
export function panelCentre(panel) {
  let x = 0, y = 0;
  for (const point of panel.points) { x += point[0]; y += point[1]; }
  return [x / panel.points.length, y / panel.points.length];
}

/** A pixel-space polygon pulled `distance` px toward its centre, leaving the gap. */
export function insetPolygon(pixelPoints, distance) {
  let cx = 0, cy = 0;
  for (const [x, y] of pixelPoints) { cx += x; cy += y; }
  cx /= pixelPoints.length;
  cy /= pixelPoints.length;
  return pixelPoints.map(([x, y]) => {
    const dx = cx - x, dy = cy - y;
    const len = Math.hypot(dx, dy) || 1;
    const step = Math.min(distance, len * 0.4);
    return [x + (dx / len) * step, y + (dy / len) * step];
  });
}

/** True when a normalised point falls inside a panel's polygon. */
export function pointInPanel(panel, px, py) {
  let inside = false;
  const pts = panel.points;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const viceGridSquare = () => [
  makePanel('Hero', [[0, 0], [1, 0], [1, 0.55], [0, 0.62]], [0.5, 0.3]),
  makePanel('Street', [[0, 0.62], [0.37, 0.565], [0.34, 1], [0, 1]], [0.17, 0.8]),
  makePanel('Chase', [[0.37, 0.565], [0.69, 0.555], [0.68, 1], [0.34, 1]], [0.51, 0.8]),
  makePanel('Getaway', [[0.69, 0.555], [1, 0.55], [1, 1], [0.68, 1]], [0.84, 0.8]),
];

const viceGridPortrait = () => [
  makePanel('Hero', [[0, 0], [1, 0], [1, 0.48], [0, 0.55]], [0.5, 0.26]),
  makePanel('Street', [[0, 0.55], [0.38, 0.5], [0.35, 1], [0, 1]], [0.17, 0.78]),
  makePanel('Chase', [[0.38, 0.5], [0.7, 0.49], [0.69, 1], [0.35, 1]], [0.52, 0.78]),
  makePanel('Getaway', [[0.7, 0.49], [1, 0.48], [1, 1], [0.69, 1]], [0.85, 0.78]),
];

const viceGridWide = () => [
  makePanel('Hero', [[0, 0], [0.62, 0], [0.575, 1], [0, 1]], [0.3, 0.45]),
  makePanel('Skyline', [[0.62, 0], [1, 0], [1, 0.52], [0.6, 0.52]], [0.8, 0.26]),
  makePanel('Shore', [[0.6, 0.52], [1, 0.52], [1, 1], [0.575, 1]], [0.8, 0.78]),
];

const slashBands = () => [
  makePanel('Top band', [[0, 0], [1, 0], [1, 0.3], [0, 0.47]], [0.5, 0.18]),
  makePanel('Mid band', [[0, 0.47], [1, 0.3], [1, 0.63], [0, 0.8]], [0.5, 0.55]),
  makePanel('Low band', [[0, 0.8], [1, 0.63], [1, 1], [0, 1]], [0.5, 0.85]),
];

const coverStar = () => [
  makePanel('Top left', [[0, 0], [0.36, 0], [0.31, 0.2], [0.21, 0.5], [0, 0.54]], [0.15, 0.2]),
  makePanel('Top right', [[0.36, 0], [1, 0], [1, 0.46], [0.79, 0.54], [0.72, 0.17]], [0.85, 0.2]),
  makePanel('Cover star', [[0.31, 0.2], [0.72, 0.17], [0.79, 0.54], [0.68, 0.86], [0.31, 0.84], [0.21, 0.5]], [0.5, 0.5]),
  makePanel('Bottom left', [[0, 0.54], [0.21, 0.5], [0.31, 0.84], [0.37, 1], [0, 1]], [0.15, 0.82]),
  makePanel('Bottom right', [[0.79, 0.54], [1, 0.46], [1, 1], [0.37, 1], [0.31, 0.84], [0.68, 0.86]], [0.85, 0.82]),
];

const palmStrips = () => [
  makePanel('Strip one', [[0, 0], [0.29, 0], [0.23, 1], [0, 1]], [0.13, 0.5]),
  makePanel('Strip two', [[0.29, 0], [0.54, 0], [0.48, 1], [0.23, 1]], [0.38, 0.5]),
  makePanel('Strip three', [[0.54, 0], [0.79, 0], [0.73, 1], [0.48, 1]], [0.63, 0.5]),
  makePanel('Strip four', [[0.79, 0], [1, 0], [1, 1], [0.73, 1]], [0.88, 0.5]),
];

/** Every layout template, keyed by the id the editor's buttons carry. */
export const LAYOUT_TEMPLATES = {
  'vice-grid': { label: 'Vice Grid', byAspect: { square: viceGridSquare, portrait: viceGridPortrait, wide: viceGridWide } },
  'slash': { label: 'Neon Slash', byAspect: { square: slashBands, portrait: slashBands, wide: slashBands } },
  'star': { label: 'Cover Star', byAspect: { square: coverStar, portrait: coverStar, wide: coverStar } },
  'strips': { label: 'Palm Strips', byAspect: { square: palmStrips, portrait: palmStrips, wide: palmStrips } },
};

/** The panels of a template at an aspect, as fresh objects the editor may annotate. */
export function panelsFor(templateId, aspect) {
  const template = LAYOUT_TEMPLATES[templateId] ?? LAYOUT_TEMPLATES['vice-grid'];
  const build = template.byAspect[aspect] ?? template.byAspect.square;
  return build();
}
