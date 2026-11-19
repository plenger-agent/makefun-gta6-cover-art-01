// Fixed scenes for the maker's screenshots: a `?shot=` query turns the studio
// into one frozen frame — `cover` shows a finished cover alone, edge to edge,
// and `editor` shows the whole studio with a cover under way. The scene itself
// (which samples fill which panels, the words, the grade) is applied by
// main.js through the callback; this module only sets the page mode and
// raises window.__shotReady once the frame has painted twice.

/** Applies the shot scene named by the query and flags readiness for capture. */
export async function runShotMode(query, applyScene) {
  const shot = query.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  await applyScene(shot, query);
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

/** Reads a comma-separated query value into trimmed parts. */
export function queryList(query, key) {
  return (query.get(key) ?? '').split(',').map((part) => part.trim()).filter(Boolean);
}
