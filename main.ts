// Hand-in program for the gta6-cover-art-01 entry (Node 22, standard library only).
//
// The entry itself is the static web app in app/ beside this file: plain files a desktop
// browser opens offline, no build step and no network request. This program's whole job
// is to hand that app in the way the bounty asks: copy app/ and screenshots/ into the
// output directory and write dossier.json there with buildDossier from the vendored
// make.fun library (vendor/makefun-app.ts, the kit's own copy, unchanged), because the
// gate rebuilds the dossier with the same library and compares the two byte for byte.
//
// Inside the grader the output directory is /output; anywhere else the caller names it
// with MAKEFUN_OUTPUT_DIR:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps for this bounty, passed to the dossier builder so an entry the
// scorer would refuse (too many app files, an oversize screenshot, too much source
// text) is refused here first, while it can still be fixed.
const GATE_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, GATE_LIMITS));

// A one-line receipt for whoever runs this outside the grader: what was handed in.
const appFiles = readdirSync(join(outputDir, 'app'), { recursive: true }).length;
const shotFiles = readdirSync(join(outputDir, 'screenshots')).length;
console.log(`handed in: app/ (${appFiles} entries), screenshots/ (${shotFiles} files), dossier.json`);
