// Copie les fichiers WebAssembly de MediaPipe (@mediapipe/tasks-vision, Apache-2.0) dans public/studio-portrait/wasm :
// le studio portrait les charge depuis l'admin elle-même (aucun CDN, aucune photo envoyée à un tiers). Dossier ignoré par git ;
// les modèles (.tflite) sont versionnés dans public/studio-portrait/modeles.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const candidats = ['../node_modules/@mediapipe/tasks-vision/wasm', '../../../node_modules/@mediapipe/tasks-vision/wasm'].map((c) => fileURLToPath(new URL(c, import.meta.url)));
const source = candidats.find((c) => existsSync(c));
const cible = fileURLToPath(new URL('../public/studio-portrait/wasm', import.meta.url));
if (!source) {
  console.warn('copier-studio : @mediapipe/tasks-vision introuvable, studio portrait indisponible.');
} else {
  mkdirSync(cible, { recursive: true });
  for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
    copyFileSync(`${source}/${f}`, `${cible}/${f}`);
  }
}
