// Neon Vice Cover Studio — the editor. Wires the page to the cover renderer:
// photos load from the maker's own machine (or the bundled samples), panels
// are filled by clicking, dragged to reposition and zoomed with a slider, the
// words and grade update the live preview on every change, and the export
// buttons hand back a PNG at the three post sizes. A `?shot=` query instead
// freezes one scene for the maker's screenshots (./shots.js).

import { createCoverState, syncPanelSlots, renderCover, exportCoverPNG, POST_SIZES } from './cover.js';
import { panelsFor, pointInPanel } from './panels.js';
import { runShotMode, queryList } from './shots.js';

const state = createCoverState();
syncPanelSlots(state);

const canvas = document.getElementById('cover-canvas');
const stage = document.getElementById('stage');
const status = document.getElementById('status');
const strip = document.getElementById('photo-strip');
const panelLabel = document.getElementById('panel-label');
const zoomSlider = document.getElementById('panel-zoom');

const PREVIEW_MAX = 920;

/** Sets the canvas backing size for the current aspect, keeping proportions. */
function sizePreviewCanvas(maxDimension = PREVIEW_MAX) {
  const size = POST_SIZES[state.aspect];
  const scale = Math.min(1, maxDimension / Math.max(size.width, size.height));
  canvas.width = Math.round(size.width * scale);
  canvas.height = Math.round(size.height * scale);
}

/** Paints the live preview from the current state. */
function renderPreview() {
  renderCover(canvas, state, { preview: true });
}

/** Loads an image from a URL (object URL or app file) once it can be drawn. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds a loaded image to the photo tray and refreshes the tray and preview. */
function addPhoto(image, name) {
  state.photos.push({ image, name });
  const index = state.photos.length - 1;
  if (state.pickedPhoto < 0) state.pickedPhoto = index;
  const emptyPanel = state.assignment.indexOf(-1);
  if (emptyPanel >= 0 && state.photos.length <= panelsFor(state.template, state.aspect).length) {
    state.assignment[emptyPanel] = index;
  }
  refreshPhotoStrip();
  renderPreview();
  return index;
}

/** Loads each file the maker picked, as its own photo. */
async function loadPhotoFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const image = await loadImage(URL.createObjectURL(file));
    addPhoto(image, file.name);
  }
  setStatus(state.photos.length ? `${state.photos.length} photo(s) loaded — click a panel to place the picked one.` : '');
}

/** Loads one of the bundled sample scenes as a photo. */
async function loadSample(name) {
  const image = await loadImage(`samples/${name}.jpg`);
  addPhoto(image, `sample: ${name}`);
  setStatus(`Sample “${name}” loaded.`);
}

/** Rebuilds the photo tray thumbnails from state. */
function refreshPhotoStrip() {
  strip.replaceChildren();
  state.photos.forEach((photo, index) => {
    const figure = document.createElement('figure');
    if (index === state.pickedPhoto) figure.classList.add('picked');
    const img = document.createElement('img');
    img.src = photo.image.src;
    img.alt = photo.name;
    const caption = document.createElement('figcaption');
    caption.textContent = photo.name;
    figure.append(img, caption);
    figure.addEventListener('click', () => pickPhoto(index));
    strip.append(figure);
  });
}

/** Marks a photo as the picked one, ready to place into a panel. */
function pickPhoto(index) {
  state.pickedPhoto = index;
  refreshPhotoStrip();
  setStatus(`Photo ${index + 1} picked — click a panel to place it.`);
}

/** Selects a panel for editing and syncs the panel controls to it. */
function selectPanel(index) {
  state.selectedPanel = index;
  const panels = panelsFor(state.template, state.aspect);
  panelLabel.textContent = `Panel ${index + 1} (${panels[index].name}) selected. Drag on the cover to reposition its photo.`;
  zoomSlider.value = state.transforms[index].zoom;
  renderPreview();
}

/** Places the picked photo into a panel. */
function assignPickedPhotoToPanel(index) {
  if (state.pickedPhoto < 0) return;
  state.assignment[index] = state.pickedPhoto;
}

/** The panel under a pointer event, as an index, or -1 over the gaps. */
function panelAtPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width;
  const py = (event.clientY - rect.top) / rect.height;
  const panels = panelsFor(state.template, state.aspect);
  for (let i = panels.length - 1; i >= 0; i--) {
    if (pointInPanel(panels[i], px, py)) return i;
  }
  return -1;
}

let drag = null;

/** Starts a possible drag: remembers the panel and where the pointer fell. */
function beginPanelDrag(event) {
  const index = panelAtPoint(event);
  if (index < 0) return;
  drag = { index, startX: event.clientX, startY: event.clientY, moved: false };
  canvas.setPointerCapture(event.pointerId);
}

/** Dragging shifts the panel photo's centre by the pointer's travel. */
function movePanelDrag(event) {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const dx = (event.clientX - drag.startX) / rect.width;
  const dy = (event.clientY - drag.startY) / rect.height;
  if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 4) drag.moved = true;
  if (!drag.moved) return;
  const transform = state.transforms[drag.index];
  transform.shiftX = clamp(transform.shiftX + dx, -0.6, 0.6);
  transform.shiftY = clamp(transform.shiftY + dy, -0.6, 0.6);
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  if (state.selectedPanel !== drag.index) selectPanel(drag.index);
  renderPreview();
}

/** A drag that never moved was a click: select the panel, place the photo. */
function endPanelDrag(event) {
  if (!drag) return;
  const { index, moved } = drag;
  drag = null;
  if (!moved) {
    assignPickedPhotoToPanel(index);
    selectPanel(index);
  }
  renderPreview();
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

/** Shows a line of feedback under the export buttons. */
function setStatus(text) {
  status.textContent = text;
}

/** Marks the pressed button in a group and clears the others. */
function pressButton(group, button) {
  group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === button ? 'true' : 'false'));
}

/** Wires a button group: clicking a button runs `apply` with its data value. */
function wireButtonGroup(id, attribute, apply) {
  const group = document.getElementById(id);
  group.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      pressButton(group, button);
      apply(button.dataset[attribute]);
    });
  });
  return group;
}

/** Switches the panel layout, keeping photos and re-slotting the panels. */
function setTemplate(templateId) {
  state.template = templateId;
  syncPanelSlots(state);
  sizePreviewCanvas();
  selectPanel(0);
}

/** Switches the post size the preview shows (exports pick their own size). */
function setAspect(aspect) {
  state.aspect = aspect;
  syncPanelSlots(state);
  sizePreviewCanvas();
  renderPreview();
}

/** Applies a frozen screenshot scene: samples into panels, words, grade. */
async function applyShotScene(shot, query) {
  state.template = query.get('template') ?? state.template;
  state.aspect = query.get('aspect') ?? state.aspect;
  state.caption = query.get('caption') ?? state.caption;
  state.kicker = query.get('kicker') ?? state.kicker;
  state.grade = query.get('grade') ?? state.grade;
  state.letterStyle = query.get('letter') ?? state.letterStyle;
  syncPanelSlots(state);
  const names = queryList(query, 'photos');
  for (const name of names) {
    const image = await loadImage(`samples/${name}.jpg`);
    state.photos.push({ image, name: `sample: ${name}` });
  }
  const panels = panelsFor(state.template, state.aspect);
  state.assignment = panels.map((_, i) => (state.photos.length ? i % state.photos.length : -1));
  state.pickedPhoto = state.photos.length ? 0 : -1;
  document.getElementById('caption-input').value = state.caption;
  document.getElementById('kicker-input').value = state.kicker;
  for (const [groupId, value] of [['template-buttons', state.template], ['aspect-buttons', state.aspect], ['grade-buttons', state.grade], ['letter-buttons', state.letterStyle]]) {
    const group = document.getElementById(groupId);
    const button = group.querySelector(`button[data-template="${value}"], button[data-aspect="${value}"], button[data-grade="${value}"], button[data-letter="${value}"]`);
    if (button) pressButton(group, button);
  }
  if (shot === 'cover') {
    const size = POST_SIZES[state.aspect];
    canvas.width = size.width;
    canvas.height = size.height;
  } else {
    sizePreviewCanvas(700);
  }
  refreshPhotoStrip();
  state.selectedPanel = 0;
  renderCover(canvas, state, { preview: shot === 'editor' });
}

/** Boots the studio: controls, canvas gestures, and the first paint. */
function bootEditor() {
  document.getElementById('photo-input').addEventListener('change', (event) => {
    loadPhotoFiles([...event.target.files]);
  });
  document.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', () => loadSample(button.dataset.sample));
  });
  document.getElementById('fill-all').addEventListener('click', () => {
    if (state.pickedPhoto < 0) { setStatus('Load and pick a photo first.'); return; }
    state.assignment = state.assignment.map(() => state.pickedPhoto);
    renderPreview();
    setStatus('Every panel now shows the picked photo.');
  });

  const templateGroup = wireButtonGroup('template-buttons', 'template', setTemplate);
  const aspectGroup = wireButtonGroup('aspect-buttons', 'aspect', setAspect);
  wireButtonGroup('grade-buttons', 'grade', (grade) => { state.grade = grade; renderPreview(); });
  wireButtonGroup('letter-buttons', 'letter', (letter) => { state.letterStyle = letter; renderPreview(); });
  pressButton(templateGroup, templateGroup.querySelector(`[data-template="${state.template}"]`));
  pressButton(aspectGroup, aspectGroup.querySelector(`[data-aspect="${state.aspect}"]`));
  document.querySelector('#grade-buttons [data-grade="sunset"]').setAttribute('aria-pressed', 'true');
  document.querySelector('#letter-buttons [data-letter="porcelain"]').setAttribute('aria-pressed', 'true');

  zoomSlider.addEventListener('input', () => {
    state.transforms[state.selectedPanel].zoom = Number(zoomSlider.value);
    renderPreview();
  });
  document.getElementById('panel-centre').addEventListener('click', () => {
    const transform = state.transforms[state.selectedPanel];
    transform.shiftX = 0;
    transform.shiftY = 0;
    renderPreview();
  });
  document.getElementById('panel-clear').addEventListener('click', () => {
    state.assignment[state.selectedPanel] = -1;
    renderPreview();
  });
  document.getElementById('caption-input').addEventListener('input', (event) => {
    state.caption = event.target.value;
    renderPreview();
  });
  document.getElementById('kicker-input').addEventListener('input', (event) => {
    state.kicker = event.target.value;
    renderPreview();
  });
  document.getElementById('grade-strength').addEventListener('input', (event) => {
    state.gradeStrength = Number(event.target.value) / 100;
    renderPreview();
  });
  document.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', () => {
      exportCoverPNG(state, button.dataset.export, (name) => setStatus(`Saved ${name}`));
    });
  });

  canvas.addEventListener('pointerdown', beginPanelDrag);
  canvas.addEventListener('pointermove', movePanelDrag);
  canvas.addEventListener('pointerup', endPanelDrag);
  canvas.addEventListener('pointercancel', () => { drag = null; });
  stage.addEventListener('dragover', (event) => event.preventDefault());
  stage.addEventListener('drop', (event) => {
    event.preventDefault();
    loadPhotoFiles([...event.dataTransfer.files]);
  });

  sizePreviewCanvas();
  selectPanel(0);
  renderPreview();
}

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  runShotMode(query, applyShotScene);
} else if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(bootEditor);
} else {
  bootEditor();
}
