// Screenshot capture for the entry: drives the app in the Playwright
// chromium headless shell over CDP — first the sample-scene generator page
// (its JPEGs land in app/samples/), then every scene in ../shots.json
// against the locally served app, saving raw PNGs for tools/finish-shots.py
// to scale into screenshots/. No network beyond localhost.

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = fileURLToPath(new URL('..', import.meta.url));
const shellBin = join(process.env.HOME, '.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell');
const PORT = 8123;
const DEBUG_PORT = 9333;
const RAW_DIR = '/tmp/gta-shots';

mkdirSync(RAW_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHttp(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error(`never came up: ${url}`);
}

const server = spawn('node', [join(repoDir, 'serve.ts'), '--port', String(PORT)], { stdio: 'ignore' });
const browser = spawn(shellBin, [
  '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
  `--remote-debugging-port=${DEBUG_PORT}`, '--user-data-dir=/tmp/gta-chrome-profile', 'about:blank',
], { stdio: 'ignore' });

try {
  await waitForHttp(`http://127.0.0.1:${PORT}/`);
  await waitForHttp(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
  const version = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json();

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  await page('Page.enable');
  await page('Runtime.enable');

  async function evaluate(expression) {
    const result = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(`page error: ${result.exceptionDetails.text}`);
    return result.result.value;
  }

  async function waitReady(expression, label) {
    for (let i = 0; i < 120; i++) {
      if (await evaluate(expression)) return;
      await sleep(250);
    }
    throw new Error(`timed out waiting for ${label}`);
  }

  async function setViewport(width, height) {
    await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  }

  // Phase A: generate the sample scenes into app/samples/.
  await setViewport(1280, 1000);
  await page('Page.navigate', { url: `file://${join(repoDir, 'tools/gen-samples.html')}` });
  await waitReady('window.__samplesReady === true', 'sample scenes');
  const samples = await evaluate('window.__samples');
  for (const [name, dataUrl] of Object.entries(samples)) {
    const base64 = dataUrl.split(',')[1];
    writeFileSync(join(repoDir, 'app/samples', `${name}.jpg`), Buffer.from(base64, 'base64'));
    console.log(`sample ${name}.jpg written`);
  }

  // Phase B: capture every screenshot scene from the served app.
  const shots = JSON.parse(readFileSync(join(repoDir, 'shots.json'), 'utf8'));
  for (const shot of shots) {
    await setViewport(shot.w, shot.h);
    await page('Page.navigate', { url: `http://127.0.0.1:${PORT}/${shot.query}` });
    await waitReady('window.__shotReady === true', shot.name);
    await sleep(150);
    const { data } = await page('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(join(RAW_DIR, shot.name.replace(/\.jpg$/, '.png')), Buffer.from(data, 'base64'));
    console.log(`captured ${shot.name} at ${shot.w}x${shot.h}`);
  }

  ws.close();
} finally {
  browser.kill('SIGKILL');
  server.kill('SIGKILL');
}
