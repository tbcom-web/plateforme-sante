// Contenu de DÉMONSTRATION (articles des sites de démo, ARTICLE_DEMO des aperçus) : mêmes exclusions que les sites publiés
// (exclusions-site.ts : ≤ 2 ★, retirées, à retravailler). Notes et statuts exportés du dépôt (retours/assets-notes.json,
// retours/illustrations-statuts.json) ; une image de démo refusée fait échouer le test (défaut trouvé par le testeur de modèles).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { clesImagesExclues, imageExclue } from './contexte-images';
import { ARTICLE_DEMO } from './pages-demo';

/** Racine du dépôt (les tests tournent depuis la racine ou depuis packages/core) */
function racine(): string | null {
  let d = resolve(process.cwd());
  for (let i = 0; i < 4; i++) { if (existsSync(join(d, 'retours', 'assets-notes.json'))) return d; d = resolve(d, '..'); }
  return null;
}

test('contenu de démonstration : aucune image refusée (≤ 2 ★, retirée, à retravailler)', (t) => {
  const r = racine();
  if (!r) return t.skip('retours/ absent');
  const notes = JSON.parse(readFileSync(join(r, 'retours', 'assets-notes.json'), 'utf8')) as { cle: string; note: number | null; jour?: string }[];
  const statuts = existsSync(join(r, 'retours', 'illustrations-statuts.json')) ? JSON.parse(readFileSync(join(r, 'retours', 'illustrations-statuts.json'), 'utf8')) as { cle: string; statut: string }[] : [];
  // Lignes d'apprentissage : notes les plus récentes d'abord, puis statuts (forme d'assets_notes_apprentissage)
  const lignes = [...[...notes].sort((a, b) => (b.jour ?? '').localeCompare(a.jour ?? '')).map((n) => ({ cle: n.cle, note: n.note })), ...statuts.map((s) => ({ cle: s.cle, statut: s.statut }))];
  const exclues = clesImagesExclues(lignes);
  const demo = readFileSync(join(r, 'apps', 'sites', 'src', 'data', 'sites', 'demo-podologue-lyon.ts'), 'utf8');
  const images = [ARTICLE_DEMO.image, ...[...demo.matchAll(/image:\s*'(\/photos\/[^']+)'/g)].map((m) => m[1])].filter((u): u is string => Boolean(u));
  assert.ok(images.length > 0);
  assert.deepEqual(images.filter((u) => imageExclue(u, exclues)), [], 'images de démonstration refusées');
});
