// Construction des paquets du moteur de contenus (esbuild, sans autre dépendance) :
//   dist/contenus.js      : paquet NAVIGATEUR (IIFE, global « Contenus ») — aperçu instantané, export Playwright, admin ;
//   dist/contenus-node.mjs: paquet NODE (ESM) — garde-fous, composition, JSON, identité du site de démo.
// Usage : node packages/contenus/scripts/construire.mjs   (appelé aussi par generer.mjs)
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = fileURLToPath(new URL('..', import.meta.url));
export const DIST = join(RACINE, 'dist');

export async function construire() {
  mkdirSync(DIST, { recursive: true });
  const commun = { bundle: true, logLevel: 'error', loader: { '.css': 'text' }, define: { 'process.env.MODELE': 'undefined' } };
  await build({ ...commun, entryPoints: [join(RACINE, 'src/navigateur.ts')], outfile: join(DIST, 'contenus.js'), format: 'iife', globalName: 'Contenus', platform: 'browser', target: 'chrome110' });
  await build({
    bundle: true, logLevel: 'error', loader: { '.css': 'text' },
    stdin: {
      contents: `export * from './src/index.ts';
        export { default as SITE_DEMO } from '../../apps/sites/src/data/sites/demo-podologue-lyon.ts';
        export { MODELES_INTEGRES, GAMMES, modeleIntegre, verifierGamme, couleursMarque, POLICES, NEUTRES, PRESSION } from '@plateforme/core';`,
      resolveDir: RACINE, loader: 'ts',
    },
    outfile: join(DIST, 'contenus-node.mjs'), format: 'esm', platform: 'node',
  });
  return { navigateur: join(DIST, 'contenus.js'), node: join(DIST, 'contenus-node.mjs') };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = await construire();
  console.log(`✓ ${r.navigateur}\n✓ ${r.node}`);
}
