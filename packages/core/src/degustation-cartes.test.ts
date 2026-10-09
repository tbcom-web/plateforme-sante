import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { construireCarte, lireRegistresTirage, poserRegistresTirage, type DonneesCartes } from './degustation-cartes';
import type { CarteSession } from './degustation';
import { SCENARIOS_TYPES } from './notation-recettes';
import { poidsAtelier } from './atelier-poids';
import { poidsAssets } from './assets-poids';
import { photosIntegreesBanque } from './recettes';
import { MODELES_INTEGRES } from './modeles';
import { viderContexteImages, contexteImages } from './contexte-images';
import { definirAnimationsPretes, animationsPretesDefinies } from './heros-photo-variantes';
import { FAMILLES_STYLE } from './harmonie';

// Le worker de /admin/degustation reçoit une COPIE des données (structuredClone, comme postMessage) : mêmes cartes, même graine
const racine = [process.cwd(), join(process.cwd(), '..', '..')].find((r) => existsSync(join(r, 'retours', 'atelier-notes.json')))!;
const lire = (f: string) => JSON.parse(readFileSync(join(racine, 'retours', f), 'utf8'));

test('construireCarte (copie sérialisée, registres reposés) = construireCarte dans la page, même graine', () => {
  const atelier = lire('atelier-notes.json') as { ingredients: Record<string, unknown>; note: number; etiquettes: string[] }[];
  const notes = lire('assets-notes.json') as { cle: string; note: number; etiquettes: string[] }[];
  const assets = poidsAssets(notes.map((n) => ({ cle: n.cle, note: n.note, etiquettes: n.etiquettes, statut: null })))!;
  const notesElements = Object.fromEntries(notes.slice(0, 200).map((n) => [n.cle, { m: n.note, n: 1 }]));
  const profils = SCENARIOS_TYPES.slice(0, 3).map((t) => ({ id: t.id, nom: t.libelle, sujets: [...t.scenario.principaux, ...t.scenario.secondaires], scenario: t.scenario }));
  const d: DonneesCartes = {
    profils, photos: photosIntegreesBanque(), poids: { ...poidsAtelier(atelier.map((n) => ({ ingredients: n.ingredients, note: n.note, etiquettes: n.etiquettes }))), assets, notesElements } as DonneesCartes['poids'],
    predictions: { 'gamme:cobalt': [{ cle: 'gamme:cobalt', note: 4, le: '2026-10-08' }] }, familles: { global: {}, sujets: {} },
    modeles: MODELES_INTEGRES.map((m) => ({ id: m.id, manifeste: m })), tranches: { refuses: ['gamme:mangue'], favoris: [] },
  };
  const p = profils[0].id;
  const cartes: CarteSession[] = [
    { id: 'r0', kind: 'grille', format: 'directions', dimension: 'directions', profil: p, valeur: 1 },
    { id: 'g0', kind: 'grille', format: 'palettes-polices', dimension: 'couleurs', profil: p, valeur: 1 },
    { id: 'g1', kind: 'grille', format: 'compositions', dimension: 'visuels', profil: profils[1].id, valeur: 1 },
    { id: 'g2', kind: 'grille', format: 'premiers-ecrans', dimension: 'composant:accueil', profil: p, valeur: 1 },
    { id: 'g3', kind: 'grille', format: 'kits', dimension: 'photo', profil: p, valeur: 1 },
    { id: 'n0', kind: 'note', cle: 'gamme:cobalt', profil: p, valeur: 1 },
  ];
  viderContexteImages(); definirAnimationsPretes([]);
  poserRegistresTirage({ images: { exclues: ['photo:sport-trail'], kits: {}, vivier: null }, animationsPretes: [] });
  const registres = lireRegistresTirage();
  let grilles = 0;
  for (const [i, c] of cartes.entries()) for (const famille of [null, FAMILLES_STYLE[1].id]) {
    const g = 1000 + 37 * i;
    const page = construireCarte(d, c, g, famille);
    viderContexteImages();
    poserRegistresTirage(structuredClone(registres));
    const worker = construireCarte(structuredClone(d), structuredClone(c), g, famille);
    assert.deepEqual(worker, page, `${c.id} ${famille}`);
    if (page?.kind === 'grille') grilles++;
  }
  assert.ok(grilles >= 4, `grilles construites : ${grilles}`);
  assert.deepEqual([...contexteImages().exclues], ['photo:sport-trail']);
  assert.deepEqual([...animationsPretesDefinies()], []);
  viderContexteImages();
});

test('politique dans la Dégustation : délai de retour, file priorisée, expositions', async () => {
  const { carteSelonPolitique, ordonnerNotesPolitique, expositionsCarte } = await import('./degustation-cartes');
  const { memoireExpositions } = await import('./politique-evaluation');
  const prop = (cle: string, nouveau: string) => ({ cle, nouveau, ingredients: {} });
  const profil = { id: 'p', nom: 'P', sujets: ['sport'], scenario: { principaux: ['sport'], secondaires: [], couleurs: [], soins: [] } };
  const grille = { kind: 'grille' as const, carte: { id: 'g', kind: 'grille' as const, format: 'palettes-polices' as const, dimension: 'couleurs', profil: 'p', valeur: 1 }, profil, pari: 2,
    grille: { format: 'palettes-polices' as const, dimension: 'couleurs', base: null, propositions: ['a', 'b', 'c', 'd'].map((x) => prop(`compo:${x}`, `gamme:${x}`)) } };
  // Sans mémoire : la carte telle quelle (rendu identique)
  assert.equal(carteSelonPolitique(grille, {}), grille);
  const memoire = memoireExpositions([{ cle: 'gamme:b', surface: 'tuiles', ecran: 'e1', le: '2026-10-09T08:00:00Z', resultat: 'note' }]);
  const x = carteSelonPolitique(grille, { memoire, maintenant: '2026-10-09T09:00:00Z' });
  assert.deepEqual(x && x.kind === 'grille' ? x.grille.propositions.map((p) => p.nouveau) : null, ['gamme:a', 'gamme:c', 'gamme:d']);
  assert.equal(x?.pari, null);
  const memoire3 = memoireExpositions(['a', 'b'].map((k, i) => ({ cle: `gamme:${k}`, surface: 'tuiles' as const, ecran: `e${i}`, le: '2026-10-09T08:00:00Z', resultat: 'note' as const })));
  assert.equal(carteSelonPolitique(grille, { memoire: memoire3, maintenant: '2026-10-09T09:00:00Z' }), null, 'moins de 3 libres');
  // File : jamais noté à fort potentiel d'abord, implicite retiré, autres cartes à leur place
  const n = (cle: string) => ({ id: cle, kind: 'note' as const, cle, profil: null, valeur: 1 });
  const cartes = [grille.carte, n('photo:connue'), n('photo:jamais'), grille.carte, n('photo:fort'), n('photo:vue')];
  const o = ordonnerNotesPolitique(cartes, { implicites: new Set(['photo:vue']), fortPotentiel: new Set(['photo:fort']) }, { notes: { 'photo:connue': { m: 4, n: 3 } }, noteJuge: () => null });
  assert.deepEqual(o.map((c) => (c.kind === 'note' ? c.cle : c.kind)), ['grille', 'photo:fort', 'photo:jamais', 'grille', 'photo:connue']);
  // Expositions
  assert.deepEqual(expositionsCarte(grille, { meilleures: [0, 2], pire: 3 }).map((e) => e.resultat), ['choisi', 'pas-choisi', 'choisi', 'pire']);
  assert.deepEqual(expositionsCarte(grille, null).map((e) => `${e.cle}=${e.resultat}`), ['gamme:a=pas-choisi', 'gamme:b=pas-choisi', 'gamme:c=pas-choisi', 'gamme:d=pas-choisi']);
});
