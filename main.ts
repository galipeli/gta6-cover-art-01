// Neon Coast Cover Studio — entrypoint for make.fun competition gta6-cover-art-01
//
// What this program does: it copies app/ and screenshots/ from beside this
// file into the output directory and writes dossier.json there using
// buildDossier from the vendored kit library (./vendor/makefun-app.ts,
// byte-identical to the kit's copy, never edited).
//
// Runtime: Node 22, standard library only, no dependencies.
//
// Deterministic: two runs write the same bytes because the copy is a plain
// file copy and buildDossier is deterministic for a fixed input tree.
//
// Design rule — do not regress: the output directory belongs to the grader
// and is a mount point. This program creates it if missing and fills it in
// place, and must NEVER remove it, because removing a mount point throws
// and kills the program (this exact bug failed the previous submission's
// dev grade with exit code 1).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The output directory belongs to the grader and is a mount point:
// create it if missing and fill it in place; never remove it.
mkdirSync(out, { recursive: true });

cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });

mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Write the dossier for the filled output tree, with the competition caps.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
