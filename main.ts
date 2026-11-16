// PERIHELION's hand-in program (Node 22, standard library only).
//
// The game itself is the static site in game/: plain files a desktop browser
// opens offline. This program packages it for the judges: it copies game/
// and screenshots/ into the output directory (MAKEFUN_OUTPUT_DIR locally,
// /output in the grader) and writes dossier.json there with buildDossier
// from the vendored make.fun library, so the dossier is exactly the one the
// scorer rebuilds from the same files. Run it with:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// To play the game instead, run `node serve.ts` and open the page it names.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outputDir, 'game'), { recursive: true });

const screenshotsDir = join(repoDir, 'screenshots');
if (existsSync(screenshotsDir)) {
  cpSync(screenshotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the gate's own: at most 4 screenshots of 256 KiB, at most 993
// entries and 48 MiB under game/, paths of at most 1000 bytes, and the
// dossier's source text capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
