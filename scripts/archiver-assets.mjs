// Archive des rendus des assets d'un commit (avant / après de « Donner mon avis » et de la bibliothèque).
// Usage : npm run archiver-assets -- <commit> [--worktree <dossier>]
// 1. `git worktree add` (dossier temporaire, ou --worktree) du commit : le code de CETTE version, jamais l'arbre de travail
//    (qui peut contenir des retouches en cours) ;
// 2. inventaire du core de ce commit (inventaireAssets, GAMMES) assemblé par esbuild ; empreintes calculées comme au moment
//    des notes (empreinteSvg du rendu SVG, couleurs des gammes) ; instantanés : SVG minifié, couleurs des gammes ;
// 3. écrit apps/admin/public/archives/assets-<commit court>.json.gz et met à jour index.json (le plus récent d'abord) ;
// 4. `git worktree remove`.
// À lancer AVANT chaque grosse série de retouches d'illustrations (docs/retours.md). Aucun secret, aucun réseau.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const commitDemande = args.find((a) => !a.startsWith('--'));
if (!commitDemande) throw new Error('Usage : npm run archiver-assets -- <commit> [--worktree <dossier>]');
const iw = args.indexOf('--worktree');
const git = (...a) => execFileSync('git', a, { cwd: racine, encoding: 'utf8' }).trim();

const commit = git('rev-parse', '--verify', `${commitDemande}^{commit}`);
const court = commit.slice(0, 7);
const date = git('show', '-s', '--format=%cI', commit);
const tmp = mkdtempSync(join(tmpdir(), 'archiver-assets-'));
const arbre = iw >= 0 ? args[iw + 1] : join(tmp, `avant-${court}`);
if (existsSync(arbre)) throw new Error(`Le dossier ${arbre} existe déjà.`);

git('worktree', 'add', '--detach', arbre, commit);
try {
  const src = join(arbre, 'packages', 'core', 'src');
  if (!existsSync(join(src, 'assets.ts'))) throw new Error(`Le commit ${court} n'a pas d'inventaire des assets (packages/core/src/assets.ts).`);
  const sortieAncien = join(tmp, 'ancien.mjs');
  const sortieActuel = join(tmp, 'actuel.mjs');
  const commun = { bundle: true, platform: 'node', format: 'esm', logLevel: 'warning', loader: { '.svg': 'text', '.css': 'empty' }, nodePaths: [join(racine, 'node_modules')] };
  // Code du commit archivé : inventaire et gammes de cette version
  await build({ ...commun, stdin: { contents: "export { inventaireAssets } from './assets'; export { GAMMES } from './gammes';", resolveDir: src, loader: 'ts' }, outfile: sortieAncien });
  // Code actuel : format de l'archive (même calcul que l'admin)
  await build({ ...commun, stdin: { contents: "export { archiverInventaire } from './avant-apres';", resolveDir: join(racine, 'packages', 'core', 'src'), loader: 'ts' }, outfile: sortieActuel });
  const ancien = await import(pathToFileURL(sortieAncien).href);
  const actuel = await import(pathToFileURL(sortieActuel).href);
  const archive = actuel.archiverInventaire(ancien.inventaireAssets(), commit, date, ancien.GAMMES);
  const dossier = join(racine, 'apps', 'admin', 'public', 'archives');
  mkdirSync(dossier, { recursive: true });
  const fichier = `assets-${court}.json.gz`;
  const gz = gzipSync(Buffer.from(JSON.stringify(archive)), { level: 9 });
  writeFileSync(join(dossier, fichier), gz);
  const cheminIndex = join(dossier, 'index.json');
  const index = existsSync(cheminIndex) ? JSON.parse(readFileSync(cheminIndex, 'utf8')) : { archives: [] };
  const n = Object.keys(archive.assets).length;
  index.archives = [{ commit, date, fichier, n }, ...index.archives.filter((a) => a.commit !== commit)].sort((a, b) => b.date.localeCompare(a.date));
  writeFileSync(cheminIndex, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Archive ${fichier} : ${n} rendus du commit ${court} (${date}), ${Math.round(gz.length / 1024)} Ko compressés.`);
} finally {
  git('worktree', 'remove', '--force', arbre);
  rmSync(tmp, { recursive: true, force: true });
}
