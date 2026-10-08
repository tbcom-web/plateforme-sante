// « Favoris d'abord » (favoris.ts) : tirages gourmands, photos les mieux notées, exclusions, rotation, exploration ≈ 10 %.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidatsDuelFavoris, poidsFavori, MODES_TIRAGE, notesPhotos } from './favoris';
import { alea, compositionInitiale, manquePhotosNotees, photosIntegreesBanque, tirerDimension, tirerPhotos, type ContexteRecette } from './recettes';
import { clePhoto } from './assets-poids';
import { PAIRES_POLICES } from './modeles';
import { contexteScenario, genererCandidates, SCENARIOS_TYPES } from './notation-recettes';
import type { PoidsAtelier } from './atelier-poids';

const sport = (extra: Partial<ContexteRecette> = {}): ContexteRecette => ({ sujets: ['sport', 'semelles'], principaux: 2, ...extra });

test('poids : gourmandise par mode, non notés rares en Favoris, exclusions ≤ 2 ★ et statuts', () => {
  assert.ok(poidsFavori(0.5, 'favoris') > poidsFavori(0.5, 'equilibre'));
  assert.ok(poidsFavori(undefined, 'favoris') < poidsFavori(0, 'favoris'));
  assert.ok(poidsFavori(undefined, 'decouverte') > poidsFavori(undefined, 'equilibre'));
  assert.equal(poidsFavori(-1.2, 'favoris', { moyenne: 3.1 }), 0);
  assert.equal(poidsFavori(1, 'decouverte', { exclue: true }), 0);
  assert.equal(poidsFavori(0.4, 'favoris', { note: 2 }), 0);
  assert.equal(MODES_TIRAGE.find((m) => m.id === 'favoris')!.exploration, 0.1);
});

test('Favoris d’abord : le top 3 d’une dimension fait la majorité des tirages (≥ 60 %), jamais une valeur ≤ 2 ★', () => {
  const polices = PAIRES_POLICES.map((p) => p.id);
  const top = polices.slice(0, 3), mauvaise = polices[3];
  const effets: Record<string, number> = { [`police=${top[0]}`]: 0.7, [`police=${top[1]}`]: 0.6, [`police=${top[2]}`]: 0.5, [`police=${mauvaise}`]: -1.4, [`police=${polices[4]}`]: -0.2, [`police=${polices[5]}`]: 0.1 };
  const poids: PoidsAtelier = { n: 40, moyenne: 3.2, effets };
  const part = (mode: 'favoris' | 'equilibre') => {
    const c = sport({ poids, modeTirage: mode, horsRegles: true });
    let x = compositionInitiale(c, 1), n = 0, k = 0;
    for (let g = 0; g < 300; g++) {
      x = tirerDimension(x, 'polices', c, g);
      if (top.includes(x.police)) n++;
      assert.notEqual(x.police, mauvaise, 'police notée ≤ 2 ★ jamais tirée');
      k++;
    }
    return n / k;
  };
  const f = part('favoris'), e = part('equilibre');
  console.log(`part du top 3 des polices : Favoris d’abord ${(100 * f).toFixed(0)} %, Équilibré ${(100 * e).toFixed(0)} %`);
  assert.ok(f >= 0.6, `${f}`);
  assert.ok(f > e + 0.15);
});

const banque = photosIntegreesBanque();
const deSport = banque.filter((p) => p.sujets.includes('sport'));

test('photos : les mieux notées d’abord, jamais retirées ni ≤ 2 ★, premier écran en rotation', () => {
  assert.ok(deSport.length >= 4, 'photos intégrées de sport');
  const cles = deSport.map((p) => clePhoto(p.url)!);
  const lignes = [
    ...cles.slice(0, 4).flatMap((k, i) => [{ cle: k, note: 5 }, { cle: k, note: i < 2 ? 5 : 4 }]),
    { cle: cles[4] ?? 'photo:x', note: 1 }, { cle: cles[4] ?? 'photo:x', note: 2 },
  ];
  const retiree = banque.find((p) => p.sujets.includes('general'))!;
  const poids: PoidsAtelier = { n: 1, moyenne: 3, effets: {}, notesPhotos: notesPhotos(lignes), assets: { n: 10, moyenne: 3.5, effets: Object.fromEntries(cles.slice(0, 4).map((k, i) => [k, 0.6 - i * 0.1])), statuts: { [clePhoto(retiree.url)!]: 'retire' } } };
  const c = sport({ poids, photos: banque });
  const premieres = new Set<string>();
  for (let g = 0; g < 60; g++) {
    const l = tirerPhotos(c, alea(g, 'photos'), 5);
    assert.ok(!l.includes(retiree.url), 'photo retirée jamais tirée');
    if (deSport[4]) assert.notEqual(l[0], deSport[4].url);
    assert.ok(deSport.slice(0, 4).some((p) => p.url === l[0]), 'premier écran parmi les 4 meilleures');
    if (deSport[4]) assert.ok(!l.includes(deSport[4].url), 'photo notée ≤ 2 ★ jamais tirée');
    premieres.add(l[0]);
    // Les 4 photos ≥ 4 ★ passent avant toute photo non notée
    assert.ok(l.slice(0, 4).every((u) => deSport.slice(0, 4).some((p) => p.url === u)));
  }
  assert.ok(premieres.size >= 3, `rotation du premier écran : ${premieres.size} photos différentes`);
  assert.equal(manquePhotosNotees(c), null);
  assert.match(manquePhotosNotees(sport({ photos: banque, sujets: ['diabete'] })) ?? '', /Peu de photos notées pour Diabète/);
});

test('générateur : exploration ≈ 10 % en Favoris d’abord, toujours signalée', () => {
  const t = SCENARIOS_TYPES[1];
  const l = genererCandidates(t.scenario, contexteScenario(t.scenario, {}), { n: 10, graine: 9, iterations: 3 });
  assert.equal(l.length, 10);
  assert.equal(l.filter((x) => x.exploration).length, 1);
  const d = genererCandidates(t.scenario, contexteScenario(t.scenario, { modeTirage: 'decouverte' }), { n: 6, graine: 9, iterations: 2 });
  assert.ok(d.filter((x) => x.exploration).length >= 2);
});

test('duels : surtout de bons éléments entre eux, quelques duels de découverte, jamais d’exclu', () => {
  const cands = ['photo:a', 'photo:b', 'photo:c', 'photo:d', 'photo:e', 'photo:f'].map((cle) => ({ cle }));
  const assets = { n: 20, moyenne: 3.4, effets: { 'photo:a': 0.6, 'photo:b': 0.4, 'photo:c': 0.3, 'photo:d': -0.2, 'photo:e': -1.6 }, statuts: { 'photo:f': 'retire' as const } };
  let decouverte = 0;
  for (let g = 0; g < 400; g++) {
    const r = candidatsDuelFavoris(cands, assets, 'favoris', alea(g, 'duel'));
    assert.ok(!r.candidats.some((x) => x.cle === 'photo:e' || x.cle === 'photo:f'));
    if (r.decouverte) decouverte++;
    else assert.deepEqual(r.candidats.map((x) => x.cle), ['photo:a', 'photo:b', 'photo:c']);
  }
  assert.ok(decouverte > 20 && decouverte < 70, `${decouverte} / 400`);
});
