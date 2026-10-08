// Dégustation (degustation.ts, degustation-grilles.ts) : grille de 6 (un seul nouveau, jamais d'exclus ni de tranchés), modèle de
// choix (Plackett-Luce → comparaisons BT, indépendant de l'ordre), versement plafonné dans les poids, « Paul synthétique » (à effort
// égal, la grille apprend plus vite que les duels), mélange de session, Bats Claude, jeu, professions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  apprentissagesSession, avancementDefi, choixDeLaProfession, choixPourApprentissage, comparaisonsDuChoix, defiDuJour, duelsDepuisChoix, duelsDesChoix, estDimensionTransversale,
  genererGrille, medailles, missionProfil, niveauPalais, nouvellesMedailles, pariGrille, parisDesChoix, planifierSession, pretProfil, scoreBatsClaude, sessionReprenable,
  tempsEstime, tirerChoixPL, validerChoixGrille, vraisemblancePL, xpCarte, type ChoixGrille, type EtatApprentissage,
} from './degustation';
import { baseFavoris, elementsGrille, grilleCompositions, grilleIcones, grilleKit } from './degustation-grilles';
import { APPRENTISSAGE_DUELS, classementDuels, fusionnerRenforts, hasard, renfortsDuels, type Duel } from './duels';
import { contexteScenario, SCENARIOS_TYPES } from './notation-recettes';
import { modeleIntegre } from './modeles';
import { GAMMES } from './gammes';
import { PAIRES_POLICES } from './modeles';

const enfant = SCENARIOS_TYPES.find((s) => s.id === 'enfant-turquoise')!;
const ctx = () => contexteScenario(enfant.scenario, { poids: null, photos: [], modele: modeleIntegre });

// ---------------------------------------------------------------------------------------------------------------
// Grille
// ---------------------------------------------------------------------------------------------------------------

test('grille de compositions : 6 propositions, un seul élément nouveau chacune (même dimension), toutes différentes', () => {
  const c = ctx();
  for (const [format, dim] of [['compositions', 'couleurs'], ['palettes-polices', 'polices'], ['premiers-ecrans', 'composant:accueil']] as const) {
    const g = grilleCompositions(format, dim, { contexte: c, graine: 7 });
    assert.ok(g, `${dim} : grille`);
    assert.equal(g!.propositions.length, 6, `${dim} : 6 propositions`);
    const base = new Set(elementsGrille(g!.base!, c.sujets, dim));
    const nouveaux = new Set<string>();
    for (const p of g!.propositions) {
      const n = elementsGrille(p.x!, c.sujets, dim).filter((k) => !base.has(k));
      assert.deepEqual(n, [p.nouveau], `${dim} : un seul nouveau`);
      nouveaux.add(p.nouveau);
      assert.equal(p.ingredients.element, p.nouveau);
    }
    assert.equal(nouveaux.size, 6);
    assert.equal(new Set(g!.propositions.map((p) => p.cle)).size, 6);
  }
});

test('grille : jamais un élément refusé (1 ★) ni tranché (5 ★) comme nouveau, jamais une composition refusée', () => {
  const c = ctx();
  const gammes = GAMMES.map((g) => `gamme:${g.id}`);
  const refuses = new Set(gammes.filter((_, i) => i % 3 === 0)), favoris = new Set(gammes.filter((_, i) => i % 3 === 1));
  for (let graine = 1; graine <= 6; graine++) {
    const g = grilleCompositions('compositions', 'couleurs', { contexte: c, graine, tranches: { refuses, favoris } });
    if (!g) continue;
    for (const p of g.propositions) { assert.ok(!refuses.has(p.nouveau)); assert.ok(!favoris.has(p.nouveau)); }
  }
  // Générique : variantes jouets
  const g = genererGrille<number[]>({ base: [0], dimension: 'x', graine: 3, varier: (_x, _d, gg) => [gg % 12], elements: (x) => x.map((v) => `e:${v}`), cle: (x) => `c:${x[0]}`, tranches: { refuses: new Set(['e:1', 'e:2']), favoris: new Set(['e:3']) } })!;
  assert.equal(g.propositions.length, 6);
  for (const p of g.propositions) assert.ok(!['e:0', 'e:1', 'e:2', 'e:3'].includes(p.nouveau));
});

test('grille : priorité aux éléments jamais notés (intérêt) ; base favoris sans élément refusé', () => {
  const g = genererGrille<number[]>({ base: [0], dimension: 'x', graine: 5, varier: (_x, _d, gg) => [1 + (gg % 20)], elements: (x) => x.map((v) => `e:${v}`), cle: (x) => `c:${x[0]}`, interet: (k) => (Number(k.slice(2)) > 14 ? 5 : 0) })!;
  assert.ok(g.propositions.filter((p) => Number(p.nouveau.slice(2)) > 14).length >= 5);
  const b = baseFavoris(ctx(), null, 3);
  assert.ok(b.gamme || b.couleur);
});

test('grilles de kits (seule la photo du premier écran change) et d’icônes (même icône, chaque style)', () => {
  const pool = Array.from({ length: 12 }, (_, i) => `/photos/enfant-${i}.webp`);
  const k = grilleKit(pool.slice(0, 4), pool, { sujets: ['enfant'], graine: 2 })!;
  assert.equal(k.propositions.length, 6);
  for (const p of k.propositions) { assert.deepEqual(p.photos!.slice(1), pool.slice(1, 4)); assert.ok(!pool.slice(0, 4).includes(p.photos![0])); }
  const ic = grilleIcones('ongle-incarne', { graine: 1 })!;
  assert.equal(ic.propositions.length, 4);
  assert.ok(ic.propositions.every((p) => p.cle.startsWith('picto:ongle-incarne')));
  assert.equal(grilleIcones('ongle-incarne', { graine: 1, tranches: { refuses: new Set(['picto:ongle-incarne', 'picto:ongle-incarne@direction-a']), favoris: new Set() } }), null);
});

// ---------------------------------------------------------------------------------------------------------------
// Modèle de choix
// ---------------------------------------------------------------------------------------------------------------

const prop = (i: number) => ({ cle: `photo:p${i}`, ingredients: { assets: [`photo:p${i}`], element: `photo:p${i}` } });
const choix = (meilleures: number[], pire: number | null, n = 6, extra: Partial<ChoixGrille> = {}): ChoixGrille => ({
  format: 'kits', type: 'photo', dimension: 'photo', scenario: { sujets: ['enfant'] }, propositions: Array.from({ length: n }, (_, i) => prop(i)),
  meilleures, pire, pari: null, appareil: 'ordinateur', session: null, dureeMs: null, profession: null, profil: null, ...extra,
});

test('modèle de choix : n° 1 bat 5, n° 2 bat 4 (5 + 4 comparaisons), les 3 du milieu battent la pire', () => {
  assert.equal(comparaisonsDuChoix(choix([2, 4], null)).length, 9);
  const c = comparaisonsDuChoix(choix([2, 4], 0));
  assert.equal(c.length, 12);
  assert.ok(c.filter(([g]) => g === 2).length === 5 && c.filter(([g]) => g === 4).length === 4);
  assert.equal(c.filter(([, p]) => p === 0).length, 2 + 3);
  const d = duelsDepuisChoix(choix([2, 4], 0));
  assert.ok(d.every((x) => x.dimension === 'photo' && x.prediction === null && x.resultat !== 'mauvais'));
  const cl = new Map(classementDuels(d).map((l) => [l.cle, l.theta]));
  assert.ok(cl.get('photo:p2')! > cl.get('photo:p4')! && cl.get('photo:p4')! > cl.get('photo:p1')! && cl.get('photo:p1')! > cl.get('photo:p0')!);
});

test('modèle de choix : indépendant de l’ordre d’affichage', () => {
  const a = choix([2, 4], 0);
  const perm = [5, 3, 0, 1, 4, 2];
  const b: ChoixGrille = { ...a, propositions: perm.map((i) => a.propositions[i]), meilleures: [perm.indexOf(2), perm.indexOf(4)], pire: perm.indexOf(0) };
  assert.deepEqual(duelsDepuisChoix(b), duelsDepuisChoix(a));
  assert.deepEqual(renfortsDuels(duelsDepuisChoix(b)), renfortsDuels(duelsDepuisChoix(a)));
});

test('modèle de choix : cohérent avec Bradley-Terry (Plackett-Luce simulé, forces retrouvées)', () => {
  const r = hasard(11);
  const theta = Array.from({ length: 12 }, (_, i) => (i - 5.5) / 3);
  const l: ChoixGrille[] = [];
  for (let t = 0; t < 120; t++) {
    const ids = [...theta.keys()].map((i) => ({ i, k: r() })).sort((a, b) => a.k - b.k).slice(0, 6).map((x) => x.i);
    const c = tirerChoixPL(ids.map((i) => theta[i]), r, { pire: true });
    l.push({ ...choix(c.meilleures, c.pire), propositions: ids.map(prop) });
  }
  const est = new Map(classementDuels(duelsDesChoix(l)).map((x) => [x.cle, x.theta]));
  assert.ok(spearman(theta, theta.map((_, i) => est.get(`photo:p${i}`) ?? 0)) > 0.9);
  // Vraisemblance Plackett-Luce : la plus forte en n° 1 est le classement le plus probable
  assert.ok(vraisemblancePL([2, 0, -1], [0, 1]) > vraisemblancePL([2, 0, -1], [1, 0]));
});

test('versement dans les poids : même moteur et même plafond que les duels (±0,5 ★, cumul ±1 ★)', () => {
  const l = Array.from({ length: 60 }, () => choix([0, 1], 5));
  const ren = renfortsDuels(duelsDesChoix(l));
  assert.ok(Object.values(ren.assets).every((v) => Math.abs(v) <= APPRENTISSAGE_DUELS.plafond));
  assert.equal(ren.assets['photo:p0'], APPRENTISSAGE_DUELS.plafond);
  assert.ok(ren.assets['photo:p5'] < 0);
  const cumul = fusionnerRenforts(ren, { atelier: {}, assets: { 'photo:p0': 0.9 } });
  assert.equal(cumul.assets['photo:p0'], APPRENTISSAGE_DUELS.plafondCumule);
  // Une seule grille : plus d'information qu'un duel isolé, toujours sous le plafond
  const une = renfortsDuels(duelsDepuisChoix(choix([0, 1], null))).assets['photo:p0']!;
  const duel = renfortsDuels(duelsDepuisChoix(choix([0], null, 2))).assets['photo:p0']!;
  assert.ok(une > duel && une <= APPRENTISSAGE_DUELS.plafond);
});

test('validation : 1 ou 2 préférées distinctes, pire hors préférées, profession en slug', () => {
  const b = { format: 'kits', dimension: 'photo', propositions: [prop(0), prop(1), prop(2)], meilleures: [0, 2], pire: 1, profession: 'osteopathe' };
  const v = validerChoixGrille(b);
  assert.ok(v.ok && v.choix.profession === 'osteopathe' && v.choix.type === 'photo');
  assert.equal(validerChoixGrille({ ...b, meilleures: [0, 0] }).ok, false);
  assert.equal(validerChoixGrille({ ...b, pire: 0 }).ok, false);
  assert.equal(validerChoixGrille({ ...b, meilleures: [0, 1, 2] }).ok, false);
  assert.equal(validerChoixGrille({ ...b, format: 'autre' }).ok, false);
});

// ---------------------------------------------------------------------------------------------------------------
// « Paul synthétique » : à effort égal (clics), la grille apprend plus vite que les duels
// ---------------------------------------------------------------------------------------------------------------

function spearman(x: readonly number[], y: readonly number[]): number {
  const rang = (v: readonly number[]) => { const o = v.map((a, i) => ({ a, i })).sort((p, q) => p.a - q.a); const r = new Array(v.length); o.forEach((e, k) => { r[e.i] = k; }); return r as number[]; };
  const rx = rang(x), ry = rang(y), n = x.length;
  const mx = (n - 1) / 2;
  let s = 0, sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { s += (rx[i] - mx) * (ry[i] - mx); sx += (rx[i] - mx) ** 2; sy += (ry[i] - mx) ** 2; }
  return s / Math.sqrt(sx * sy);
}

/** Simulation : K éléments de forces θ ~ N(0, 1) ; `clics` d'effort ; corrélation de rang et rappel du top 3 */
function simuler(mode: 'duel' | 'grille' | 'grille-pire' | 'grille-2', clics: number, graine: number, K = 24) {
  const r = hasard(graine);
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, r()))) * Math.cos(2 * Math.PI * r());
  const theta = Array.from({ length: K }, gauss);
  const duels: Duel[] = [];
  // Coût en clics : duel 1 (une flèche) ; grille 3 (2 touches + Valider) ; grille + pire 4 ; grille-2 : 2 (validation automatique)
  const cout = mode === 'duel' ? 1 : mode === 'grille-2' ? 2 : mode === 'grille' ? 3 : 4;
  for (let c = 0; c + cout <= clics; c += cout) {
    const ids = [...theta.keys()].map((i) => ({ i, k: r() })).sort((a, b) => a.k - b.k).slice(0, mode === 'duel' ? 2 : 6).map((x) => x.i);
    const t = tirerChoixPL(ids.map((i) => theta[i]), r, { k: mode === 'duel' ? 1 : 2, pire: mode === 'grille-pire' });
    duels.push(...duelsDepuisChoix({ ...choix(t.meilleures, t.pire, ids.length), propositions: ids.map(prop) }));
  }
  const est = new Map(classementDuels(duels).map((x) => [x.cle, x.theta]));
  const e = theta.map((_, i) => est.get(`photo:p${i}`) ?? 0);
  const top = (v: readonly number[]) => new Set(v.map((a, i) => ({ a, i })).sort((p, q) => q.a - p.a).slice(0, 3).map((x) => x.i));
  const vrai = top(theta), trouve = top(e);
  return { rho: spearman(theta, e), top3: [...vrai].filter((i) => trouve.has(i)).length / 3 };
}

test('Paul synthétique : à nombre de clics égal, la grille apprend plus vite que le duel (mesure chiffrée)', () => {
  const lignes: string[] = [];
  const res: Record<string, Record<number, { rho: number; top3: number }>> = {};
  for (const clics of [30, 60, 120]) {
    for (const mode of ['duel', 'grille', 'grille-pire', 'grille-2'] as const) {
      let rho = 0, top3 = 0;
      const N = 40;
      for (let s = 1; s <= N; s++) { const x = simuler(mode, clics, 1000 * s + clics); rho += x.rho; top3 += x.top3; }
      (res[mode] ??= {})[clics] = { rho: rho / N, top3: top3 / N };
    }
    lignes.push(`${clics} clics : duel ρ ${res.duel[clics].rho.toFixed(2)} (top 3 ${(100 * res.duel[clics].top3).toFixed(0)} %) · grille ρ ${res.grille[clics].rho.toFixed(2)} (top 3 ${(100 * res.grille[clics].top3).toFixed(0)} %) · grille + pire ρ ${res['grille-pire'][clics].rho.toFixed(2)} (top 3 ${(100 * res['grille-pire'][clics].top3).toFixed(0)} %) · grille sans Valider ρ ${res['grille-2'][clics].rho.toFixed(2)} (top 3 ${(100 * res['grille-2'][clics].top3).toFixed(0)} %)`);
  }
  // Clics nécessaires au duel pour égaler la grille à 60 clics
  let egal = 60;
  while (egal < 600) { let rho = 0; for (let s = 1; s <= 40; s++) rho += simuler('duel', egal, 7000 + s).rho; if (rho / 40 >= res.grille[60].rho) break; egal += 10; }
  lignes.push(`Le duel a besoin de ≈ ${egal} clics pour atteindre la précision de la grille à 60 clics (×${(egal / 60).toFixed(1)}).`);
  console.log(`\n[Paul synthétique, 24 éléments, 40 tirages]\n${lignes.join('\n')}`);
  for (const clics of [30, 60, 120]) {
    assert.ok(res.grille[clics].rho > res.duel[clics].rho, `${clics} clics : grille > duel`);
    assert.ok(res['grille-pire'][clics].rho >= res.duel[clics].rho);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// Session, Bats Claude, jeu, professions
// ---------------------------------------------------------------------------------------------------------------

const etat = (): EtatApprentissage => ({
  profils: [{ id: 'sport', pret: 0.8 }, { id: 'enfant', pret: 0.2 }],
  pistes: [
    { format: 'compositions', dimension: 'couleurs', profil: 'enfant', incertitude: 0.9, couverte: false, jouees: 0 },
    { format: 'premiers-ecrans', dimension: 'composant:accueil', profil: 'enfant', incertitude: 0.7, couverte: false, jouees: 2 },
    { format: 'compositions', dimension: 'polices', profil: 'sport', incertitude: 0.2, couverte: true, jouees: 5 },
    { format: 'kits', dimension: 'photo', profil: 'sport', incertitude: 0.6, couverte: false, jouees: 0 },
  ],
  departages: [{ dimension: 'couleurs', profil: 'sport', a: 'gamme:a', b: 'gamme:b', ecart: 0.1, sigma: 0.6 }, { dimension: 'polices', profil: 'enfant', a: 'typo:police:x', b: 'typo:police:y', ecart: 0.2, sigma: 0.5 }],
  aNoter: Array.from({ length: 8 }, (_, i) => ({ cle: `composant:accueil:n${i}`, profil: null, nouveaute: i < 2 })),
});

test('mélange de session : 20 cartes, grilles surtout, ≤ 15 % de duels et de notes, profil en retard d’abord, déterministe', () => {
  const p = planifierSession(etat(), { graine: 4 });
  assert.equal(p.length, 20);
  const n = (k: string) => p.filter((c) => c.kind === k).length;
  assert.ok(n('grille') >= 12 && n('duel') <= 3 && n('note') <= 3);
  assert.ok(n('duel') === 2 && n('note') === 3);
  const g = p.filter((c) => c.kind === 'grille') as Extract<(typeof p)[number], { kind: 'grille' }>[];
  assert.ok(g.filter((c) => c.profil === 'enfant').length > g.filter((c) => c.profil === 'sport').length);
  assert.ok(new Set(g.map((c) => c.dimension)).size >= 3, 'rendement décroissant : plusieurs pistes');
  assert.equal(g[0].dimension, 'couleurs');
  assert.ok((p.filter((c) => c.kind === 'note') as { cle: string }[]).some((c) => c.cle === 'composant:accueil:n0'), 'nouveautés acceptées d’abord');
  assert.deepEqual(planifierSession(etat(), { graine: 4 }), p);
  assert.ok(tempsEstime(p) <= 5.5 * 60, `≈ 5 minutes (${tempsEstime(p)} s)`);
  assert.ok(sessionReprenable({ debut: '2026-10-08T08:00:00Z', position: 3, cartes: p }, '2026-10-08T09:00:00Z'));
  assert.ok(!sessionReprenable({ debut: '2026-10-07T08:00:00Z', position: 3, cartes: p }, '2026-10-08T09:00:00Z'));
  assert.ok(!sessionReprenable({ debut: '2026-10-08T08:00:00Z', position: 20, cartes: p }, '2026-10-08T09:00:00Z'));
});

test('Bats Claude : pari caché = meilleure note prédite du nouveau ; accord = pari parmi les préférées ; tendance', () => {
  const ps = [{ cle: 'c:1', nouveau: 'gamme:a' }, { cle: 'c:2', nouveau: 'gamme:b' }, { cle: 'c:3', nouveau: 'gamme:c' }];
  const notes: Record<string, number> = { 'gamme:a': 3, 'gamme:b': 4.5 };
  assert.equal(pariGrille(ps, (k) => notes[k] ?? null), 1);
  assert.equal(pariGrille(ps, () => null), null);
  const l = [choix([1, 2], null, 6, { pari: 1, le: '2026-10-08' }), choix([0, 2], null, 6, { pari: 1, le: '2026-10-08' })];
  const s = scoreBatsClaude(parisDesChoix(l));
  assert.equal(s.n, 2); assert.equal(s.accords, 1); assert.equal(s.taux, 50); assert.equal(s.hasard, 33);
  const vieux = Array.from({ length: 4 }, (_, i) => ({ le: `2026-09-2${i}`, accord: false, hasard: 1 / 3 }));
  const neuf = Array.from({ length: 4 }, (_, i) => ({ le: `2026-10-0${5 + i}`, accord: i > 0, hasard: 1 / 3 }));
  assert.equal(scoreBatsClaude([...vieux.map((x, i) => ({ ...x, le: `2026-09-${28 + (i % 3)}` })), ...neuf], '2026-10-08').tendance, 75);
});

test('jeu : XP et bonus de série, niveaux de palais, défi du jour déterministe, missions, médailles nouvelles', () => {
  assert.equal(xpCarte('grille'), 10);
  assert.equal(xpCarte('grille', { pire: true, serie: 6 }), 18);
  assert.equal(xpCarte('note', { tranche: true, serie: 20 }), 12);
  assert.equal(niveauPalais(0).nom, 'Palais curieux');
  assert.equal(niveauPalais(260).niveau, 3);
  assert.ok(niveauPalais(175).part > 0.4 && niveauPalais(175).part < 0.6);
  const profils = [{ id: 'enfant', nom: 'Enfant', pret: 0.2 }, { id: 'sport', nom: 'Sport', pret: 0.9 }];
  assert.deepEqual(defiDuJour('2026-10-08', profils), defiDuJour('2026-10-08T22:00:00Z', profils));
  const d = { id: 'grilles-enfant', texte: '', format: null, profil: 'enfant', cible: 10, secondes: 180, xp: 40 };
  assert.ok(avancementDefi(d, Array.from({ length: 10 }, () => ({ kind: 'grille' as const, profil: 'enfant', dureeMs: 15000 }))).reussi);
  assert.ok(!avancementDefi(d, Array.from({ length: 10 }, () => ({ kind: 'grille' as const, profil: 'enfant', dureeMs: 25000 }))).reussi);
  const m = missionProfil({ id: 'enfant', nom: 'Enfant' }, { grilles: 5, kits: 1, recettesGardees: 1 });
  assert.ok(!m.terminee && Math.abs(m.part - 5 / 6) < 1e-9);
  assert.ok(missionProfil({ id: 'enfant', nom: 'Enfant' }, { grilles: 3, kits: 1, recettesGardees: 2 }).terminee);
  const avant = medailles({ grilles: 0, serie: 1, dimensionsCouvertes: [], profilsPrets: [], missions: [] });
  const apres = medailles({ grilles: 3, serie: 3, dimensionsCouvertes: [{ id: 'gamme', nom: 'Palettes' }], profilsPrets: [], missions: [] });
  assert.deepEqual(nouvellesMedailles(avant, apres).map((x) => x.id), ['premiere-grille', 'serie-3', 'dimension:gamme']);
});

test('fin de session : 3 lignes concrètes ; part prête d’un profil (notes, sinon estimation par les choix)', () => {
  const l = Array.from({ length: 4 }, () => choix([3, 1], 0));
  const t = apprentissagesSession(duelsDesChoix(l), { libelle: (k) => `« ${k.slice(6)} »`, profil: (s) => (s === 'enfant' ? 'Enfant' : s) });
  assert.ok(t.length >= 1 && t[0].startsWith('Tu préfères « p3 » pour Enfant'));
  const els = [{ cle: 'gamme:a', dimension: 'gamme' }, { cle: 'gamme:b', dimension: 'gamme' }, { cle: 'typo:police:x', dimension: 'typo:police' }, { cle: 'typo:police:y', dimension: 'typo:police' }];
  const notes: Record<string, number> = { 'gamme:a': 4, 'gamme:b': 5, 'typo:police:x': 4 };
  assert.equal(pretProfil(els, (k) => notes[k] ?? null, () => null).pret, 0.5);
  assert.equal(pretProfil(els, (k) => notes[k] ?? null, (k) => (k === 'typo:police:y' ? 4.1 : null)).pret, 1);
});

test('professions : choix filtrés par profession ; goût transversal (palettes, polices, mises en page) partagé', () => {
  const l = [choix([0, 1], null, 6, { profession: null, dimension: 'photo' }), choix([0, 1], null, 6, { profession: 'osteopathe', dimension: 'photo' }), choix([0, 1], null, 6, { profession: 'osteopathe', dimension: 'couleurs' })];
  assert.equal(choixDeLaProfession(l, 'podo', 'podo').length, 1);
  assert.equal(choixDeLaProfession(l, 'osteopathe', 'podo').length, 2);
  const pourPodo = choixPourApprentissage(l, 'podo', 'podo');
  assert.equal(pourPodo.length, 2);
  assert.ok(pourPodo.some((c) => c.profession === 'osteopathe' && c.dimension === 'couleurs'));
  assert.ok(estDimensionTransversale('page:fiche') && estDimensionTransversale('polices') && !estDimensionTransversale('photo') && !estDimensionTransversale('variante:style'));
  assert.equal(choixPourApprentissage(l, null, 'podo').length, 3);
});

void PAIRES_POLICES;
