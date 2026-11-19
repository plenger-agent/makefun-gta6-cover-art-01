// Cover lettering: the caption set in Anton, the open-license condensed display
// face vendored under app/fonts/, drawn big at the foot of the cover with a heavy
// dark outline and a soft shadow, GTA-poster style, over a small letterspaced
// kicker line and an accent rule. Four fills, all original to this app.

/** The lettering fills the editor offers, keyed by the id its swatches carry. */
export const LETTER_STYLES = {
  porcelain: { label: 'Porcelain', fill: ['#ffffff', '#ffe9d6'], stroke: '#160410' },
  sunset: { label: 'Sunset', fill: ['#ffe259', '#ff7518', '#ff3d8a'], stroke: '#20040f' },
  neon: { label: 'Neon', fill: ['#7df9ff', '#2de2e6', '#ff3d8a'], stroke: '#0d0221' },
  gold: { label: 'Gold', fill: ['#fff3b0', '#ffc93d', '#e08a00'], stroke: '#1c0e00' },
};

const FONT_FAMILY = '"Anton", "Arial Narrow", sans-serif';

function setFont(ctx, size) {
  ctx.font = `${size}px ${FONT_FAMILY}`;
}

/** Splits a caption into at most two lines that each fit `maxWidth` at `size`. */
function wrapCaption(ctx, words, size, maxWidth) {
  setFont(ctx, size);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !line) line = trial;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/** The largest caption size whose wrapped lines fit the cover's word block. */
function fitCaption(ctx, text, maxWidth, baseSize) {
  const words = text.split(/\s+/).filter(Boolean);
  let size = baseSize;
  while (size > 18) {
    const lines = wrapCaption(ctx, words, size, maxWidth);
    const widest = Math.max(...lines.map((l) => { setFont(ctx, size); return ctx.measureText(l).width; }));
    if (widest <= maxWidth) return { lines, size };
    size -= 4;
  }
  return { lines: wrapCaption(ctx, words, size, maxWidth), size };
}

/** A vertical gradient built from a style's fill stops. */
function fillGradient(ctx, style, top, height) {
  if (style.fill.length === 1) return style.fill[0];
  const grad = ctx.createLinearGradient(0, top, 0, top + height);
  style.fill.forEach((colour, i) => grad.addColorStop(i / (style.fill.length - 1), colour));
  return grad;
}

/**
 * Draws the kicker and caption block at the foot of the cover, left-aligned
 * with a margin, and returns the block's top edge so callers can keep other
 * art clear of it.
 */
export function drawCoverWords(ctx, width, height, words) {
  const caption = (words.caption ?? '').trim().toUpperCase();
  const kicker = (words.kicker ?? '').trim().toUpperCase();
  const style = LETTER_STYLES[words.letterStyle] ?? LETTER_STYLES.porcelain;
  const margin = width * 0.055;
  const maxWidth = width * 0.89;
  const baseSize = Math.min(height * 0.128, width * 0.19);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  let cursor = height - height * 0.055;
  if (caption) {
    const { lines, size } = fitCaption(ctx, caption, maxWidth, baseSize);
    const lineHeight = size * 1.04;
    const blockTop = cursor - lineHeight * lines.length;
    ctx.lineJoin = 'round';
    for (let i = lines.length - 1; i >= 0; i--) {
      const baseline = cursor - (lines.length - 1 - i) * lineHeight;
      setFont(ctx, size);
      ctx.shadowColor = 'rgba(5, 0, 10, 0.55)';
      ctx.shadowBlur = size * 0.16;
      ctx.shadowOffsetY = size * 0.05;
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = size * 0.17;
      ctx.strokeText(lines[i], margin, baseline);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = fillGradient(ctx, style, baseline - size, size * 1.1);
      ctx.fillText(lines[i], margin, baseline);
    }
    cursor = blockTop;
  }

  if (kicker) {
    const kickerSize = Math.max(15, Math.min(height * 0.026, width * 0.04));
    setFont(ctx, kickerSize);
    try { ctx.letterSpacing = `${Math.round(kickerSize * 0.42)}px`; } catch { /* older engines */ }
    ctx.fillStyle = '#ffd9ec';
    ctx.shadowColor = 'rgba(5, 0, 10, 0.6)';
    ctx.shadowBlur = kickerSize * 0.3;
    ctx.fillText(kicker, margin + 2, cursor - kickerSize * 0.75);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
    ctx.fillStyle = '#ff3d8a';
    ctx.fillRect(margin + 2, cursor - kickerSize * 0.5, Math.min(width * 0.16, 190), Math.max(3, kickerSize * 0.16));
  }
  ctx.restore();
  return cursor;
}
