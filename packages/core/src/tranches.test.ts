// Éléments et combinaisons tranchés (tranches.ts) : 1 ★ jamais nulle part, 5 ★ plus jamais à évaluer mais toujours en composition
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  avecReevaluations, candidatsDuelTranches, dejaTranche, estRefuse, filtreAEvaluer, fusionnerTranches, PART_CHAMPION, resteJamaisNotes, tranchesDepuisDuels, tranchesDepuisSignaux,
} from './tranches';
import { etatsNotes, prochaineCarte } from './retours';
import { clesImagesExclues, definirContexteImages, viderContexteImages } from './contexte-images';
import { alea, compositionInitiale, tirerDimension, type ContexteRecette } from './recettes';
import { PAIRES_POLICES } from './modeles';
import { genererCandidates, contexteScenario, SCENARIOS_TYPES } from './notation-recettes';

afterEach(() => viderContexteImages());

test('règle : dernière note 1 ★ ou moyenne ≤ 1,5 → refusé ; dernière 5 ★ ou « Garder » → favori ; 2-4 → noté', () => {
  const t = tranchesDepuisSignaux([
    { cle: 'a', note: 1, le: '2026-10-08T10:00' }, { cle: 'a', note: 4, le: '2026-10-07T10:00' },
    { cle: 'b', note: 5, le: '2026-10-08' }, { cle: 'c', note: 3 }, { cle: 'd', note: 2 }, { cle: 'd', note: 1 },
    { cle: 'e', garder: true }, { cle: 'f', note: 4, le: '2026-10-08' }, { cle: 'f', note: 1, le: '2026-10-07' },
  ]);
  assert.deepEqual([...t.refuses].sort(), ['a', 'd']);
  assert.deepEqual([...t.favoris].sort(), ['b', 'e']);
  assert.deepEqual([...t.notes].sort(), ['c', 'f']);
  assert.ok(dejaTranche('a', t) && dejaTranche('b', t) && !dejaTranche('c', t) && estRefuse('a', t) && !estRefuse('b', t));
});

test('files d’évaluation : jamais un tranché ; jamais notés d’abord, modifiés, puis notés 2-4 ; compteur des jamais notés', () => {
  const t = tranchesDepuisSignaux([{ cle: 'un', note: 1 }, { cle: 'cinq', note: 5 }, { cle: 'trois', note: 3 }, { cle: 'modifie', note: 3 }]);
  const l = filtreAEvaluer(['trois', 'un', 'nouveau', 'cinq', 'modifie'], (x) => x, t, (x) => x === 'modifie');
  assert.deepEqual(l, ['nouveau', 'modifie', 'trois']);
  assert.equal(resteJamaisNotes(['un', 'nouveau', 'autre', 'cinq'], t), 2);
  // Donner mon avis (prochaineCarte) : jamais un 1 ★ ni un 5 ★, même s'il ne reste qu'eux
  const etats = etatsNotes([{ cle: 'un', note: 1, le: '2' }, { cle: 'cinq', note: 5, le: '2' }, { cle: 'trois', note: 3, le: '2' }]);
  for (let i = 0; i < 30; i++) assert.ok(!['un', 'cinq'].includes(prochaineCarte([{ cle: 'un' }, { cle: 'cinq' }, { cle: 'trois' }], etats, new Set(), alea(i, 'c'))!.cle));
  assert.equal(prochaineCarte([{ cle: 'un' }, { cle: 'cinq' }], etats), null);
  // Une 1 ★ suivie d'une 4 ★ plus récente : de nouveau évaluable
  const e2 = etatsNotes([{ cle: 'x', note: 1, le: '1' }, { cle: 'x', note: 4, le: '2' }]);
  assert.equal(prochaineCarte([{ cle: 'x' }], e2)?.cle, 'x');
});

test('compositions : un élément 1 ★ n’est plus jamais tiré ; un 5 ★ l’est toujours', () => {
  const polices = PAIRES_POLICES.map((p) => p.id);
  const lignes = [{ cle: `typo:police:${polices[0]}`, note: 1 }, { cle: `typo:police:${polices[1]}`, note: 5 }];
  definirContexteImages({ exclues: clesImagesExclues(lignes) });
  const c: ContexteRecette = { sujets: ['sport'], principaux: 1, horsRegles: true, modeTirage: 'equilibre' };
  let x = compositionInitiale(c, 1);
  const vues = new Set<string>();
  for (let g = 0; g < 400; g++) { x = tirerDimension(x, 'polices', c, g); vues.add(x.police); }
  assert.ok(!vues.has(polices[0]), 'police 1 ★ jamais tirée');
  assert.ok(vues.has(polices[1]), 'police 5 ★ toujours tirée');
});

test('combinaison exacte 1 ★ (recette complète, duel « mauvais ») : jamais regénérée', () => {
  const sc = SCENARIOS_TYPES[0].scenario;
  const ctx = contexteScenario(sc, {});
  const premiere = genererCandidates(sc, ctx, { n: 3, graine: 5, iterations: 3 });
  const t = tranchesDepuisSignaux([{ cle: premiere[0].cle, note: 1 }]);
  const encore = genererCandidates(sc, ctx, { n: 3, graine: 5, iterations: 3, deja: new Set([...t.refuses, ...t.favoris]) });
  assert.ok(!encore.some((x) => x.cle === premiere[0].cle));
  const d = tranchesDepuisDuels([{ aCle: 'compo:a', bCle: 'compo:b', resultat: 'mauvais' }, { aCle: 'compo:c', bCle: 'compo:d', resultat: 'a' }]);
  assert.deepEqual([...d.refuses].sort(), ['compo:a', 'compo:b']);
  assert.ok(fusionnerTranches(d, tranchesDepuisSignaux([{ cle: 'compo:a', note: 5 }])).refuses.has('compo:a'), 'un refus l’emporte');
});

test('duels : jamais de refusé, favori seulement en champion face à un élément jamais jugé (≈ 10 %)', () => {
  const cands = ['photo:un', 'photo:cinq', 'photo:trois', 'photo:neuf', 'photo:vieux'].map((cle) => ({ cle, sujets: ['sport'] }));
  const t = tranchesDepuisSignaux([{ cle: 'photo:un', note: 1 }, { cle: 'photo:cinq', note: 5 }, { cle: 'photo:trois', note: 3 }]);
  const juges = new Set(['photo:vieux']);
  let champions = 0;
  for (let g = 0; g < 1000; g++) {
    const r = candidatsDuelTranches(cands, t, juges, alea(g, 'd'));
    assert.ok(!r.candidats.some((c) => c.cle === 'photo:un' || c.cle === 'photo:cinq'));
    if (r.champion) { champions++; assert.equal(r.champion.a.cle, 'photo:cinq'); assert.equal(r.champion.b.cle, 'photo:neuf', 'face à un jamais jugé'); }
  }
  assert.ok(Math.abs(champions / 1000 - PART_CHAMPION) < 0.03, `${champions}`);
});

test('réévaluer : les notes antérieures sont ignorées, l’élément revient dans la file', () => {
  const s = [{ cle: 'a', note: 1, le: '2026-10-08T09:00' }];
  assert.ok(tranchesDepuisSignaux(s).refuses.has('a'));
  const reev = [{ cle: 'a', le: '2026-10-08T10:00' }];
  assert.equal(avecReevaluations(s, reev).length, 0);
  const t = tranchesDepuisSignaux(s, reev);
  assert.ok(!dejaTranche('a', t));
  assert.deepEqual(filtreAEvaluer(['a'], (x) => x, t), ['a']);
  // Nouvelle note après la réévaluation : elle compte
  assert.ok(tranchesDepuisSignaux([...s, { cle: 'a', note: 5, le: '2026-10-08T11:00' }], reev).favoris.has('a'));
});
