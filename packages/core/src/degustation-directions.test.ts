// Refonte de la Dégustation (2026-10-09) : grilles « Directions » radicalement différentes, grilles « Détail » à écart garanti,
// contrôle « différence perceptible » (50 grilles sans paire sous le seuil), cas « Mises en page · Semelles » (non-régression),
// apprentissage des familles, entonnoir de session.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ajouterFamillesApprises, differenceRendue, directionsDistinctes, ecartCompositions, etiquetteChangement, famillesDesDuels, famillesPreferees, grilleDirections,
  legendeDirection, optionsDistinctes, pairesIdentiques, sectionsRendues, SEUILS_DIRECTIONS,
} from './degustation-directions';
import { grilleCompositions, grilleDirectionsDegustation, baseFavoris } from './degustation-grilles';
import { duelsDepuisChoix, planifierSession, type ChoixGrille, type EtatApprentissage } from './degustation';
import { contexteScenario, SCENARIOS_TYPES } from './notation-recettes';
import { modeleIntegre } from './modeles';
import { FAMILLES_STYLE, familleDominante, violationsDures } from './harmonie';
import { renfortsDuels } from './duels';

const ctx = (s = SCENARIOS_TYPES[2].scenario) => contexteScenario(s, { poids: null, photos: [], modele: modeleIntegre });

test('directions : 4 à 6 familles différentes, chacune cohérente (sa famille dominante, aucune règle dure), légende famille + 3 mots', () => {
  const c = ctx();
  const g = grilleDirections({ contexte: c, graine: 3 })!;
  assert.ok(g && g.propositions.length >= 4 && g.propositions.length <= 6);
  assert.equal(new Set(g.propositions.map((p) => p.famille)).size, g.propositions.length);
  for (const p of g.propositions) {
    assert.equal(familleDominante(p.x as never, c as never)[0].id, p.famille);
    assert.equal(violationsDures(p.x as never, c as never).length, 0);
    assert.equal(p.legende.mots.length, 3);
    assert.ok(p.legende.texte.startsWith(FAMILLES_STYLE.find((f) => f.id === p.famille)!.nom));
    assert.equal(p.ingredients.element, `famille:${p.famille}`);
  }
});

test('différence perceptible : 50 grilles « Directions » (7 scénarios), aucune paire sous le seuil (distance d’attributs et 4 dimensions visibles)', () => {
  let grilles = 0;
  for (let k = 0; grilles < 50 && k < 120; k++) {
    const sc = SCENARIOS_TYPES[k % SCENARIOS_TYPES.length];
    const g = grilleDirections({ contexte: ctx(sc.scenario), graine: 1 + k });
    if (!g) continue;
    grilles++;
    for (let i = 0; i < g.propositions.length; i++) for (let j = i + 1; j < g.propositions.length; j++) {
      const e = ecartCompositions(g.propositions[i].x, g.propositions[j].x);
      assert.ok(e.distance >= SEUILS_DIRECTIONS.distance, `${sc.id} #${k} : distance ${e.distance}`);
      assert.ok(e.dimensions.length >= SEUILS_DIRECTIONS.dimensions, `${sc.id} #${k} : ${e.dimensions.join(',')}`);
    }
  }
  assert.equal(grilles, 50);
});

test('différence perceptible : 50 grilles « Détail » palettes et polices, toutes les paires nettement distinctes et étiquetées', () => {
  let n = 0;
  for (let k = 0; n < 50 && k < 100; k++) {
    const dim = k % 2 ? 'polices' : 'couleurs';
    const c = ctx(SCENARIOS_TYPES[k % SCENARIOS_TYPES.length].scenario);
    const g = grilleCompositions('palettes-polices', dim, { contexte: c, graine: 10 + k });
    if (!g) continue;
    n++;
    assert.ok(g.propositions.length >= 3 && g.propositions.length <= 6);
    for (let i = 0; i < g.propositions.length; i++) {
      assert.match(g.propositions[i].etiquette ?? '', dim === 'couleurs' ? /^Palette : / : /^Police : .+ \/ .+/);
      for (let j = i + 1; j < g.propositions.length; j++) assert.ok(optionsDistinctes(dim, g.propositions[i].x!, g.propositions[j].x!), `${dim} #${k}`);
    }
  }
  assert.equal(n, 50);
});

test('non-régression « Mises en page · profil Semelles » (2026-10-09) : jamais une section que le gabarit ne rend pas', () => {
  const c = ctx({ principaux: ['semelles'], secondaires: [], couleurs: [], soins: [] });
  for (let graine = 1; graine <= 12; graine++) {
    for (const d of ['page:soins', 'page:acces', 'page:cabinet', 'page:theme', 'page:article']) {
      const g = grilleCompositions('pages', d, { contexte: c, graine });
      if (!g) continue;
      for (const p of g.propositions) assert.ok(differenceRendue(g.base!, p.x!, d.slice(5), c.modele), `${d} : ${p.nouveau}`);
      // Les vignettes d'une même grille diffèrent toutes entre elles sur une section rendue
      const vis = sectionsRendues(g.base!, d.slice(5), c.modele);
      const empreintes = g.propositions.map((p) => vis.map((s) => (p.x!.sections.variantes as Record<string, string>)[s]).join('|'));
      assert.deepEqual(pairesIdentiques(empreintes), [], `${d} graine ${graine}`);
    }
  }
  // Le cas exact : structure à gabarit classique, page Soins → seule la forme des cartes varierait, invisible : pas de grille
  const base = { ...baseFavoris(c, null, 1), structure: 'technique-precis' as const };
  assert.deepEqual(sectionsRendues(base, 'soins', c.modele), []);
  assert.equal(grilleCompositions('pages', 'page:soins', { contexte: c, graine: 1, base }), null);
  assert.deepEqual(pairesIdentiques(['a', 'b', 'a', null, null]), [[0, 2]]);
});

const choixDir = (n: number, meilleures: number[], extra: Partial<ChoixGrille> = {}): ChoixGrille => ({
  format: 'directions', type: 'theme', dimension: 'directions', scenario: { sujets: ['enfant'] }, profil: 'enfant',
  propositions: FAMILLES_STYLE.slice(0, n).map((f, i) => ({ cle: `compo:${String(i).repeat(16)}`, ingredients: { element: `famille:${f.id}`, assets: [`gamme:g${i}`, 'modele:x'], atelier: [`police=p${i}`] } })),
  meilleures, pire: null, pari: null, appareil: 'ordinateur', session: null, dureeMs: null, profession: null, ...extra,
});

test('apprentissage des directions : duels libres (crédit réparti, plafonné) et préférence de famille par sujet', () => {
  const l = Array.from({ length: 6 }, () => choixDir(5, [2, 0]));
  const duels = l.flatMap(duelsDepuisChoix);
  assert.ok(duels.every((d) => d.dimension === null));
  const ren = renfortsDuels(duels);
  assert.ok(Object.values(ren.assets).every((v) => Math.abs(v) <= 0.5) && (ren.assets['gamme:g2'] ?? 0) > 0);
  const f = famillesDesDuels(duels);
  const fav = famillesPreferees(f, 'enfant');
  assert.equal(fav[0], FAMILLES_STYLE[2].id);
  assert.ok(Object.values(f.sujets.enfant).every((v) => Math.abs(v!) <= 0.5));
  const h = ajouterFamillesApprises(null, f)!;
  assert.ok((h.sujets!.enfant.familles[FAMILLES_STYLE[2].id] ?? 0) > 0);
});

test('détails dans la famille préférée : la base de la grille appartient à la famille demandée', () => {
  const c = ctx();
  for (const f of ['doux-rond', 'technique-net', 'editorial-chic'] as const) assert.equal(familleDominante(baseFavoris(c, null, 5, f) as never, c as never)[0].id, f);
  const g = grilleDirectionsDegustation({ contexte: c, graine: 2 })!;
  assert.ok(g.propositions.every((p) => p.etiquette && p.mots?.length === 3 && p.nouveau.startsWith('famille:')));
  assert.ok(directionsDistinctes(g.propositions[0].x!, g.propositions[1].x!));
  assert.ok(legendeDirection(g.propositions[0].x!).mots.length === 3);
  assert.match(etiquetteChangement('polices', { ...g.propositions[0].x!, police: 'revue' }, 'typo:police:revue'), /^Police : Bodoni Moda \/ Newsreader$/);
});

test('session en entonnoir : 3-4 grilles « Directions » en tête (profils les moins prêts), puis des détails sur ces profils', () => {
  const e: EtatApprentissage = {
    profils: [{ id: 'a', pret: 0.9 }, { id: 'b', pret: 0.1 }, { id: 'c', pret: 0.3 }, { id: 'd', pret: 0.5 }, { id: 'e', pret: 0.7 }],
    pistes: [
      ...['a', 'b', 'c', 'd', 'e'].map((p) => ({ format: 'directions' as const, dimension: 'directions', profil: p, incertitude: 0.5, couverte: false, jouees: 0 })),
      ...['a', 'b', 'c', 'd', 'e'].map((p) => ({ format: 'palettes-polices' as const, dimension: 'couleurs', profil: p, incertitude: 0.6, couverte: false, jouees: 0 })),
    ],
    departages: [], aNoter: [],
  };
  const s = planifierSession(e, { graine: 2 });
  assert.equal(s.length, 20);
  const tete = s.slice(0, 4);
  assert.ok(tete.every((x) => x.kind === 'grille' && x.format === 'directions'));
  assert.deepEqual(tete.map((x) => x.profil), ['b', 'c', 'd', 'e']);
  assert.ok(s.slice(4).every((x) => !(x.kind === 'grille' && x.format === 'directions')));
  const det = s.slice(4).filter((x) => x.kind === 'grille').map((x) => x.profil);
  assert.ok(det.filter((p) => p !== 'a').length > det.filter((p) => p === 'a').length);
});
