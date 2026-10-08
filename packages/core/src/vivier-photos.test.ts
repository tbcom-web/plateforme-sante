// Photos du vivier 4-5 ★ dans l'atelier, le Studio et les tirages (contexte-images.ts : vivier ; recettes.ts ; atelier-compositions.ts)
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { definirContexteImages, viderContexteImages } from './contexte-images';
import { avecPartPhotos, compositionAtelier } from './atelier-compositions';
import { lotsPropositions } from './propositions';
import { alea, compositionInitiale, photosIntegreesBanque, tirerDimension, tirerPhotos, toutChanger, type ContexteRecette } from './recettes';

afterEach(() => viderContexteImages());
const banque = photosIntegreesBanque();
const sport = banque.filter((p) => p.sujets.includes('sport'));
const ctx: ContexteRecette = { sujets: ['sport'], principaux: 1, photos: banque };
const e = { priorites: { principaux: ['sport'], secondaires: [] }, couleursPreferees: [] };

test('atelier : vivier de 5 photos 4-5 ★ → ≥ 40 % de combinaisons en style photo, toutes leurs photos dans le vivier', () => {
  const vivier = sport.slice(0, 5).map((p) => p.url);
  definirContexteImages({ vivier: { sport: vivier, general: [] } });
  const liste = avecPartPhotos(lotsPropositions(e, 6).flat(), 'sport', vivier.length);
  const photos = liste.filter((p) => p.style === 'photos');
  console.log(`atelier : ${photos.length}/${liste.length} combinaisons en style photo`);
  assert.ok(photos.length / liste.length >= 0.4, `${photos.length}/${liste.length}`);
  assert.equal(new Set(liste.map((p) => p.id)).size, liste.length, 'sans doublon');
  for (const p of photos) {
    const ph = tirerPhotos(ctx, alea(0, p.id));
    assert.ok(ph.length > 0);
    assert.ok(ph.every((u) => vivier.includes(u)), `${p.id} : photo hors vivier`);
    const x = compositionAtelier(p, ctx, ph, 0);
    assert.ok(x.photos.every((u) => vivier.includes(u)));
  }
});

test('sans vivier : aucune photo hors vivier, style photo jamais tiré ; registre inactif : comportement d’avant', () => {
  definirContexteImages({ vivier: { general: [] } });
  assert.deepEqual(tirerPhotos(ctx, alea(1, 'p'), 6), []);
  assert.deepEqual(avecPartPhotos(lotsPropositions(e, 4).flat(), 'sport', 0).map((p) => p.style), lotsPropositions(e, 4).flat().map((p) => p.style));
  let x = compositionInitiale(ctx, 1);
  for (let g = 0; g < 40; g++) { x = tirerDimension(x, 'visuels', ctx, g); assert.notEqual(x.visuels.style, 'photos'); }
  viderContexteImages();
  assert.ok(tirerPhotos(ctx, alea(1, 'p'), 6).length > 0);
});

test('Studio : « Tout changer » et le dé du style tirent plus souvent le style photo quand le vivier le permet', () => {
  const compte = () => { let n = 0, x = compositionInitiale(ctx, 1); for (let g = 0; g < 60; g++) { x = toutChanger(x, [], ctx, g); if (x.visuels.style === 'photos') n++; } return n; };
  const sans = compte();
  definirContexteImages({ vivier: { sport: sport.slice(0, 5).map((p) => p.url), general: [] } });
  const avec = compte();
  console.log(`Studio (Tout changer, 60 tirages) : style photo ${sans} sans vivier actif → ${avec} avec vivier 4-5 ★`);
  assert.ok(avec > sans && avec >= 24, `${avec}`);
  let x = compositionInitiale(ctx, 1);
  for (let g = 0; g < 30; g++) { x = toutChanger(x, [], ctx, g); if (x.visuels.style === 'photos') assert.ok(x.photos.every((u) => sport.slice(0, 5).some((p) => p.url === u))); }
});
