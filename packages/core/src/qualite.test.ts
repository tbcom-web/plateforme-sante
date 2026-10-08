// Objectif « compositions 100 % 4-5 ★ » (qualite.ts) : jauge, un seul nouveau à la fois, Favoris d'abord, tableau de progression
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elementsComposition, noteElement, notesElements, qualiteComposition, tableauProgression, versQuatreCinq, type NotesElements } from './qualite';
import { compositionInitiale, toutChanger, type ContexteRecette } from './recettes';
import { PAIRES_POLICES } from './modeles';
import { GAMMES } from './gammes';
import { JEUX_EFFETS } from './effets';
import { contexteScenario, genererCandidates, SCENARIOS_TYPES } from './notation-recettes';

const ctx: ContexteRecette = { sujets: ['sport'], principaux: 1 };

/** Catalogue synthétique : la moitié des valeurs de chaque dimension visible notées 5 ★, le reste jamais noté */
function catalogueSynthetique(): NotesElements {
  const n: NotesElements = {};
  PAIRES_POLICES.forEach((p, i) => { if (i % 2 === 0) n[`typo:police:${p.id}`] = { m: 5, n: 1 }; });
  GAMMES.forEach((g, i) => { if (i % 2 === 0) n[`gamme:${g.id}`] = { m: 4.5, n: 2 }; });
  JEUX_EFFETS.forEach((j, i) => { if (i % 2 === 0) n[`effets:${j.id}`] = { m: 4, n: 1 }; });
  return n;
}

test('jauge : part des éléments 4-5 ★ (héritage base → variante), jamais notés, 3 ★', () => {
  const x = compositionInitiale(ctx, 1);
  const els = elementsComposition(x, ctx.sujets);
  const notes: NotesElements = { [els[0]]: { m: 5, n: 1 }, [els[1]]: { m: 3, n: 1 } };
  const q = qualiteComposition(x, ctx.sujets, notes);
  assert.equal(q.total, els.length);
  assert.equal(q.bons, 1);
  assert.equal(q.trois, 1);
  assert.equal(q.jamais, els.length - 2);
  assert.match(q.texte, new RegExp(`^1/${els.length} éléments 4-5 ★ · ${els.length - 2} jamais notés · 1 à 3 ★$`));
  assert.equal(noteElement('dessin:semelle:releve', notesElements([{ cle: 'dessin:semelle', note: 4 }])), 4, 'variante : note de la base');
});

test('un seul nouveau à la fois : la composition à évaluer n’introduit qu’un élément à juger parmi les dimensions qui ont des 4-5 ★', () => {
  const notes = catalogueSynthetique();
  const suivies = (k: string) => k.startsWith('typo:police:') || k.startsWith('gamme:') || (k.startsWith('effets:') && !k.startsWith('effets:photos'));
  let essais = 0, ok = 0;
  for (let g = 0; g < 12; g++) {
    const x = toutChanger(compositionInitiale(ctx, g), [], { ...ctx, horsRegles: true }, g);
    const p = versQuatreCinq(x, ctx, notes, { maxNouveaux: 1, graine: g, essais: 8 });
    const aJuger = elementsComposition(p.composition, ctx.sujets).filter((k) => suivies(k) && (noteElement(k, notes) ?? 0) < 4);
    essais++;
    if (aJuger.length <= 1) ok++;
  }
  assert.ok(ok / essais >= 0.8, `${ok}/${essais}`);
});

test('Favoris d’abord : 100 % des dimensions qui ont des 4-5 ★ en reçoivent un', () => {
  const notes = catalogueSynthetique();
  const c: ContexteRecette = { ...ctx, poids: { n: 1, moyenne: 3, effets: {}, notesElements: notes }, modeTirage: 'favoris' };
  let toutes = 0;
  for (let g = 0; g < 10; g++) {
    const x = toutChanger(compositionInitiale(c, g), [], c, g);
    const ok = (noteElement(`typo:police:${x.police}`, notes) ?? 0) >= 4 && (!x.gamme || (noteElement(`gamme:${x.gamme}`, notes) ?? 0) >= 4) && (noteElement(`effets:${x.effets}`, notes) ?? 0) >= 4;
    if (ok) toutes++;
  }
  assert.ok(toutes >= 9, `${toutes}/10`);
  // Recettes à noter : une seule nouveauté signalée
  const sc = SCENARIOS_TYPES[0].scenario;
  const l = genererCandidates(sc, contexteScenario(sc, { poids: c.poids }), { n: 3, graine: 2, iterations: 2, exploration: 0 });
  assert.ok(l.every((x) => Array.isArray(x.nouveaux)));
});

test('tableau de progression : dimensions couvertes (≥ 2 choix 4-5 ★), taux, priorités', () => {
  const elements = [
    { cle: 'gamme:a' }, { cle: 'gamme:b' }, { cle: 'gamme:c' },
    { cle: 'typo:police:x' }, { cle: 'typo:police:y' },
    { cle: 'picto:p1' }, { cle: 'picto:p2' },
    { cle: 'photo:s1', sujets: ['sport'] },
  ];
  const notes: NotesElements = { 'gamme:a': { m: 5, n: 1 }, 'gamme:b': { m: 4, n: 1 }, 'typo:police:x': { m: 5, n: 1 }, 'picto:p1': { m: 3, n: 1 } };
  const t = tableauProgression(elements, notes);
  const d = Object.fromEntries(t.dimensions.map((x) => [x.id, x]));
  assert.ok(d.gamme.couverte && d.gamme.bons === 2);
  assert.ok(!d['typo:police'].couverte && d['typo:police'].bons === 1);
  assert.ok(!d.picto.couverte);
  assert.equal(d['photo:sport'].total, 1);
  assert.equal(t.couvertes, 1);
  assert.equal(t.taux, 25);
  assert.equal(t.priorites[0].id, 'typo:police', 'la plus proche d’abord');
  assert.match(t.texte, /25 % des dimensions couvertes \(1\/4\)/);
});

test('progression : combinaisons et structures agrégées hors dimensions ; lien vers la tuile', async () => {
  const { categorieDeDimension, dimensionElement: dim } = await import('./qualite');
  assert.equal(dim('composant:paire:a+b'), null);
  assert.equal(dim('typo:combinaison:x'), null);
  assert.equal(dim('structure:accueil:a,b'), null);
  assert.equal(categorieDeDimension('typo:police'), 'typographies');
  assert.equal(categorieDeDimension('gamme'), 'couleurs');
  assert.equal(categorieDeDimension('photo:sport'), 'photos');
  assert.equal(categorieDeDimension('illustration:releve'), 'illustrations');
});

test('sites des praticiens : taux 4-5 ★ par site (elementsDuSite)', async () => {
  const { elementsDuSite, qualiteCles } = await import('./qualite');
  const els = elementsDuSite({ gamme: GAMMES[0].id, modele: 'technique', police: PAIRES_POLICES[0].id, effets: JEUX_EFFETS[0].id, variantes: { horaires: 'cartes' } as never });
  assert.ok(els.includes(`gamme:${GAMMES[0].id}`) && els.includes(`typo:police:${PAIRES_POLICES[0].id}`) && els.includes('composant:horaires:cartes'));
  const q = qualiteCles(els, { [`gamme:${GAMMES[0].id}`]: { m: 5, n: 1 } });
  assert.equal(q.bons, 1);
  assert.equal(q.total, els.length);
  assert.deepEqual(elementsDuSite(null), []);
});

test('nouveau à juger : d’abord un élément d’une dimension qui a des 4-5 ★ ; dimensions sans 4-5 ★ signalées', async () => {
  const { ordonnerNouveaux, dimensionsSansFavori } = await import('./qualite');
  const notes: NotesElements = { 'gamme:a': { m: 5, n: 1 } };
  assert.deepEqual(ordonnerNouveaux(['typo:casse:normale', 'gamme:b'], notes), ['gamme:b', 'typo:casse:normale']);
  assert.deepEqual(dimensionsSansFavori(['typo:casse:normale', 'gamme:b'], notes), ['Typographie : casse']);
});
