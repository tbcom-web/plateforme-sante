import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import {
  appliquerMatrice, cleTraitementPhotos, couleursTraitement, cssTraitementPhotos, lireCleTraitementPhotos, matriceTraitement, normaliserTraitementPhotos,
  svgTraitementPhotos, traitementNeutre, TRAITEMENTS_PHOTOS, voileTraitement,
} from './traitements-photos';
import { compositionInitiale, estCleStudio, tirerDimension, appliquerRecette, clesStructure, compositionPourCle, DIMENSIONS_RECETTE } from './recettes';
import { draftVide, normaliserDraft } from './draft';
import { GAMMES } from './gammes';
import { luminance } from './couleurs';

test('traitements : dérivés de la gamme, sorties dans [0, 1], duotone = encre → clair', () => {
  for (const g of GAMMES) {
    const c = couleursTraitement(g.id, g.accent);
    for (const t of TRAITEMENTS_PHOTOS) {
      const m = matriceTraitement(t.id, c);
      if (t.id === 'modele') { assert.equal(m, null); continue; }
      for (const x of [[0, 0, 0], [1, 1, 1], [0.5, 0.2, 0.9]]) for (const v of appliquerMatrice(m!, x)) assert.ok(v >= 0 && v <= 1);
    }
    const d = matriceTraitement('duotone', c)!;
    const noir = appliquerMatrice(d, [0, 0, 0]).map((v) => Math.round(v * 255));
    const ombre = [1, 3, 5].map((i) => parseInt(c.ombre.slice(i, i + 2), 16));
    noir.forEach((v, i) => assert.ok(Math.abs(v - ombre[i]) <= 1, `ombre de la gamme ${g.id}`));
  }
  // Deux gammes → deux duotones différents
  const a = svgTraitementPhotos({ id: 'duotone', grain: false }, couleursTraitement('cobalt', ''));
  const b = svgTraitementPhotos({ id: 'duotone', grain: false }, couleursTraitement('terracotta', ''));
  assert.notEqual(a, b);
  // Couleur libre : couleurs dérivées
  assert.ok(luminance(couleursTraitement('', '#2a7f62').ombre) < 0.05);
});

test('CSS seul, léger, aucun traitement par défaut ; voile du premier écran renforcé si la photo s’éclaircit', () => {
  assert.equal(svgTraitementPhotos({ id: 'modele', grain: false }, couleursTraitement('cobalt', '')), '');
  assert.equal(cssTraitementPhotos(null), '');
  assert.ok(traitementNeutre(normaliserTraitementPhotos(undefined)));
  for (const t of TRAITEMENTS_PHOTOS) for (const grain of [false, true]) {
    const svg = svgTraitementPhotos({ id: t.id, grain }, couleursTraitement('sauge', ''));
    if (t.id === 'modele' && !grain) continue;
    assert.match(svg, /color-interpolation-filters="sRGB"/);
    assert.ok(!/<script|href=/.test(svg));
    assert.ok(gzipSync(svg + cssTraitementPhotos({ id: t.id, grain })).length < 600, `${t.id} léger`);
  }
  assert.match(cssTraitementPhotos({ id: 'mat', grain: false }), /:not\(\.praticien__photo\)/);
  for (const g of GAMMES) {
    const c = couleursTraitement(g.id, g.accent);
    assert.equal(voileTraitement({ id: 'modele', grain: false }, c), 0);
    for (const t of TRAITEMENTS_PHOTOS) { const v = voileTraitement({ id: t.id, grain: false }, c); assert.ok(v >= 0 && v <= 0.25); }
  }
  // Le duotone éclaircit les ombres : voile renforcé
  assert.ok(voileTraitement({ id: 'duotone', grain: false }, couleursTraitement('cobalt', '')) > 0);
});

test('dimension de recette : dé « t », clé notable, enregistré et appliqué au site', () => {
  assert.ok(DIMENSIONS_RECETTE.some((d) => d.id === 'traitement' && d.touche === 't'));
  const c = { sujets: ['sport'], principaux: 1 };
  const x = compositionInitiale(c);
  assert.deepEqual(x.traitement, { id: 'modele', grain: false });
  const vus = new Set<string>();
  for (let g = 0; g < 40; g++) vus.add(tirerDimension(x, 'traitement', c, g).traitement.id);
  assert.ok(vus.size >= 2, 'le dé change de traitement');
  const y = { ...x, traitement: { id: 'duotone' as const, grain: true } };
  const k = cleTraitementPhotos(y.traitement);
  assert.equal(k, 'effets:photos-duotone-grain');
  assert.ok(estCleStudio(k));
  assert.ok(clesStructure(y).includes(k));
  assert.deepEqual(lireCleTraitementPhotos(k), y.traitement);
  assert.deepEqual(compositionPourCle(x, k).traitement, y.traitement);
  const d = draftVide();
  d.priorites = { principaux: ['sport'], secondaires: [] };
  const r = appliquerRecette(d, y)!;
  assert.deepEqual(r.draft.theme.traitementPhotos, { id: 'duotone', grain: true });
  assert.deepEqual(normaliserDraft(r.draft).theme.traitementPhotos, { id: 'duotone', grain: true });
  assert.equal(appliquerRecette(d, x)!.draft.theme.traitementPhotos, undefined);
});
