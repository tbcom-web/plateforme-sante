import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accordJuge, ajusterBT, APPRENTISSAGE_DUELS, champsDifferents, classementDuels, classementsParContexte, cleComposition, cleDePaire, cleJugeDe,
  clesDifferentes, duelDepuisLigne, fusionnerRenforts, genererDuelComposition, genererPaireElements, groupeEtVariante, markdownDuels, predireDuel,
  REFERENCE, renfortsDuels, serieDuels, uneSeuleDimension, validerDuel, variantesDifferentes, type CandidatElement, type Duel,
} from './duels';
import { appliquerRenforts, renfortsPoids } from './recettes';
import { bonusAtelier } from './atelier-poids';

const photo = (a: string, b: string, resultat: Duel['resultat'], sujet = 'sport', extra: Partial<Duel> = {}): Duel => ({
  type: 'photo', scenario: { sujets: [sujet] }, aCle: `photo:${a}`, bCle: `photo:${b}`, aIngredients: { assets: [`photo:${a}`] }, bIngredients: { assets: [`photo:${b}`] },
  dimension: 'photo', resultat, ...extra,
});

test('duels : Bradley-Terry — un gagnant constant passe devant, incertitude décroissante, ordre des duels sans effet', () => {
  const d = [photo('x', 'y', 'a'), photo('y', 'x', 'b'), photo('x', 'y', 'a'), photo('y', 'z', 'a'), photo('x', 'z', 'a')];
  const c = classementDuels(d);
  assert.deepEqual(c.map((l) => l.cle), ['photo:x', 'photo:y', 'photo:z']);
  assert.ok(c[0].theta > 0 && c[2].theta < 0);
  assert.equal(c[0].victoires, 4);
  assert.ok(c[0].elo > 1500 && c[2].elo < 1500);
  const c2 = classementDuels([...d].reverse());
  assert.deepEqual(c2.map((l) => [l.cle, l.theta]), c.map((l) => [l.cle, l.theta]));
  // Plus de duels → incertitude plus faible
  const peu = classementDuels([photo('x', 'y', 'a')]).find((l) => l.cle === 'photo:x')!;
  const beaucoup = classementDuels(Array.from({ length: 12 }, () => photo('x', 'y', 'a'))).find((l) => l.cle === 'photo:x')!;
  assert.ok(beaucoup.sigma < peu.sigma);
  assert.ok(beaucoup.theta > peu.theta);
  // A priori : un seul duel ne donne qu'un écart modéré
  assert.ok(peu.theta > 0 && peu.theta < 0.6, `θ = ${peu.theta}`);
});

test('duels : égalité symétrique, « les deux sont mauvais » pénalise légèrement les deux', () => {
  const e = classementDuels([photo('x', 'y', 'egalite')]);
  assert.equal(e[0].theta, 0);
  assert.equal(e[1].theta, 0);
  const m = classementDuels([photo('x', 'y', 'mauvais')]);
  for (const l of m) { assert.ok(l.theta < 0 && l.theta > -0.3, `${l.cle} ${l.theta}`); assert.equal(l.mauvais, 1); }
  // La référence ne figure jamais au classement
  assert.ok(!m.some((l) => l.cle === REFERENCE));
  const f = ajusterBT([{ a: 'k', b: REFERENCE, s: 1, w: 1 }]);
  assert.ok(f.get('k')!.theta > 0);
});

test('duels : classements par contexte (famille × sujet n° 1)', () => {
  const t: Duel = {
    type: 'typo', scenario: { sujets: ['diabete', 'senior'] }, aCle: 'compo:aaaaaaaaaaaaaaaa', bCle: 'compo:bbbbbbbbbbbbbbbb',
    aIngredients: { atelier: ['police=revue'], element: 'police=revue' }, bIngredients: { atelier: ['police=grotesque'], element: 'police=grotesque' }, dimension: 'polices', resultat: 'a',
  };
  const c = classementsParContexte([photo('x', 'y', 'a'), photo('x', 'z', 'a', 'senior'), t], { libelleSujet: (s) => ({ sport: 'Sport', senior: 'Seniors', diabete: 'Diabète' })[s] ?? s });
  assert.equal(c.length, 3);
  const titres = c.map((x) => x.titre);
  assert.ok(titres.includes('Meilleures photos — Sport'));
  assert.ok(titres.includes('Meilleures polices — Diabète'));
  assert.equal(c.find((x) => x.famille === 'polices')!.lignes[0].cle, 'police=revue');
});

const candidats = (): CandidatElement[] => [
  ...['releve', 'pedagogique', 'ligne'].map((r) => ({ cle: `heros:sport:${r}`, sujets: ['sport'], ...groupeEtVariante(`heros:sport:${r}`) })),
  ...['releve', 'pedagogique'].map((r) => ({ cle: `dessin:verrue:${r}`, sujets: ['pedicurie'], ...groupeEtVariante(`dessin:verrue:${r}`) })),
  { cle: 'ligne:mycose', sujets: ['ongles'], ...groupeEtVariante('ligne:mycose') },
  { cle: 'ligne:ongle-epais', sujets: ['ongles'], ...groupeEtVariante('ligne:ongle-epais') },
];

test('duels : paires d’éléments du même sujet, une seule dimension, jamais deux fois la même', () => {
  assert.deepEqual(groupeEtVariante('dessin:verrue:releve'), { groupe: 'dessin:verrue', variante: 'releve' });
  assert.deepEqual(groupeEtVariante('ligne:mycose'), { groupe: 'ligne:mycose', variante: 'ligne' });
  const vus: Duel[] = [];
  const paires = new Set<string>();
  for (let g = 1; g <= 40; g++) {
    const p = genererPaireElements('illustration', candidats(), vus, { graine: g, partLibre: 0 });
    if (!p) break;
    assert.ok(p.a.sujets.includes(p.sujet) && p.b.sujets.includes(p.sujet), 'même sujet');
    assert.ok(p.dimension === 'style' || p.dimension === 'version', `dimension ${p.dimension}`);
    if (p.dimension === 'style') assert.equal(p.a.groupe, p.b.groupe);
    if (p.dimension === 'version') assert.equal(p.a.variante, p.b.variante);
    const k = cleDePaire(p.a.cle, p.b.cle);
    if (paires.size < 5) assert.ok(!paires.has(k), `paire reposée trop tôt : ${k}`);
    paires.add(k);
    vus.push({ type: 'illustration', scenario: { sujets: [p.sujet] }, aCle: p.a.cle, bCle: p.b.cle, aIngredients: {}, bIngredients: {}, dimension: p.dimension, resultat: 'a' });
  }
  // 3 paires de styles du héros sport, 1 paire de styles de la verrue, 1 paire de versions au trait (ongles) : 5 paires distinctes
  assert.equal(paires.size, 5);
  // Sujet imposé
  const s = genererPaireElements('illustration', candidats(), [], { graine: 3, sujet: 'ongles', partLibre: 0 })!;
  assert.equal(s.sujet, 'ongles');
  assert.equal(s.dimension, 'version');
  // Photos : seule la photo change
  const ph: CandidatElement[] = ['a', 'b', 'c'].map((x) => ({ cle: `photo:sport-${x}`, sujets: ['sport'], groupe: 'photo', variante: 'photo' }));
  assert.equal(genererPaireElements('photo', ph, [], { graine: 1 })!.dimension, 'photo');
  assert.equal(genererPaireElements('photo', ph.slice(0, 1), [], { graine: 1 }), null);
});

test('duels : priorité aux éléments incertains', () => {
  const ph: CandidatElement[] = ['a', 'b', 'c', 'd'].map((x) => ({ cle: `photo:${x}`, sujets: ['sport'], groupe: 'photo', variante: 'photo' }));
  // a et b très joués (incertitude faible) : la paire choisie contient c ou d
  const hist = Array.from({ length: 20 }, (_, i) => photo(i % 2 ? 'a' : 'b', i % 2 ? 'b' : 'a', 'a'));
  let avecInconnu = 0;
  for (let g = 1; g <= 20; g++) { const p = genererPaireElements('photo', ph, hist, { graine: g })!; if (['photo:c', 'photo:d'].includes(p.a.cle) || ['photo:c', 'photo:d'].includes(p.b.cle)) avecInconnu++; }
  assert.equal(avecInconnu, 20);
});

type Compo = { structure: string; gamme: string; couleur: string; police: string; effets: string; sections: { ordre: string; variantes: Record<string, string> } };
const base: Compo = { structure: 'clair-pratique', gamme: 'cobalt', couleur: '#2d5bff', police: 'revue', effets: 'sobre', sections: { ordre: 'modele', variantes: { horaires: 'tableau', galerie: 'mosaique' } } };
const POLICES = ['revue', 'grotesque', 'serif-fine', 'humaniste'];
const varier = (x: Compo, dim: string, g: number): Compo => {
  if (dim === 'polices') return { ...x, police: POLICES[g % POLICES.length] };
  if (dim === 'couleurs') return { ...x, gamme: ['cobalt', 'canard', 'prune'][g % 3], couleur: ['#2d5bff', '#11756f', '#6b2d5c'][g % 3] };
  if (dim === 'effets') return { ...x, effets: ['sobre', 'doux', 'vivant'][g % 3], police: 'grotesque' }; // fuite volontaire : deux dimensions
  if (dim.startsWith('composant:')) return { ...x, sections: { ...x.sections, variantes: { ...x.sections.variantes, [dim.slice(10)]: `v${g % 3}` } } };
  return x;
};

test('duels : compositions — une seule dimension différente (contrôle strict), paires évitées, libres', () => {
  assert.deepEqual(champsDifferents(base, { ...base, police: 'grotesque' }), ['police']);
  assert.ok(uneSeuleDimension(base, { ...base, police: 'grotesque' }, 'polices'));
  assert.ok(!uneSeuleDimension(base, { ...base, police: 'grotesque', effets: 'doux' }, 'polices'));
  assert.ok(uneSeuleDimension(base, { ...base, gamme: 'prune', couleur: '#6b2d5c' }, 'couleurs'));
  assert.ok(!uneSeuleDimension(base, base, 'polices'), 'aucune différence');
  const sec = { ...base, sections: { ...base.sections, variantes: { ...base.sections.variantes, horaires: 'bandeau' } } };
  assert.deepEqual(variantesDifferentes(base, sec), ['horaires']);
  assert.ok(uneSeuleDimension(base, sec, 'composant:horaires'));
  assert.ok(!uneSeuleDimension(base, sec, 'composant:galerie'));

  const hist: Duel[] = [];
  for (let g = 1; g <= 12; g++) {
    const d = genererDuelComposition({ type: 'theme', graine: g, base, sujet: 'sport', dimensions: ['polices', 'couleurs', 'effets'], varier, historique: hist, partLibre: 0 });
    if (!d) break;
    assert.ok(d.dimension === 'polices' || d.dimension === 'couleurs', `jamais « effets » (fuite) : ${d.dimension}`);
    assert.ok(uneSeuleDimension(d.a, d.b, d.dimension!));
    const k = cleDePaire(cleComposition(d.a), cleComposition(d.b));
    assert.ok(!hist.some((h) => cleDePaire(h.aCle, h.bCle) === k), 'paire déjà jouée');
    hist.push({ type: 'theme', scenario: { sujets: ['sport'] }, aCle: cleComposition(d.a), bCle: cleComposition(d.b), aIngredients: {}, bIngredients: {}, dimension: d.dimension, resultat: 'a' });
  }
  // 3 polices et 2 gammes différentes de la base : 5 paires puis plus rien
  assert.equal(hist.length, 5);
  // Duel libre entre deux recettes bien classées
  const l = genererDuelComposition({ type: 'theme', graine: 5, base, sujet: 'sport', dimensions: ['polices'], varier, historique: [], libres: [base, { ...base, gamme: 'prune', police: 'grotesque' }], partLibre: 1 })!;
  assert.equal(l.dimension, null);
  assert.deepEqual(l.champs, ['gamme', 'police']);
  // Éléments : même page, une famille
  const e = genererDuelComposition({ type: 'element', graine: 2, base, sujet: 'sport', dimensions: ['composant:horaires'], varier, historique: [] })!;
  assert.deepEqual(variantesDifferentes(e.a, e.b), ['horaires']);
});

test('duels : clés différentes, intégration aux poids modérée et plafonnée', () => {
  const t = (a: string, b: string, resultat: Duel['resultat'], dimension: string | null = 'polices'): Duel => ({
    type: 'typo', scenario: { sujets: ['sport'] }, aCle: `compo:${'a'.repeat(16)}`, bCle: `compo:${'b'.repeat(16)}`,
    aIngredients: { atelier: ['structure=clair-pratique', `police=${a}`], assets: ['gamme:cobalt'] }, bIngredients: { atelier: ['structure=clair-pratique', `police=${b}`], assets: ['gamme:cobalt'] },
    dimension, resultat,
  });
  const diff = clesDifferentes(t('revue', 'grotesque', 'a'));
  assert.deepEqual(diff.atelier, [['police=revue'], ['police=grotesque']]);
  assert.deepEqual(diff.assets, [[], []]);
  const un = renfortsDuels([t('revue', 'grotesque', 'a')]);
  assert.ok(un.atelier['police=revue'] > 0 && un.atelier['police=revue'] < 0.25, `un duel : ${un.atelier['police=revue']}`);
  assert.equal(un.atelier['police=grotesque'], -un.atelier['police=revue']);
  assert.equal(un.atelier['structure=clair-pratique'], undefined, 'clé commune non touchée');
  // Série cohérente : plafond 0,5
  const serie = renfortsDuels(Array.from({ length: 60 }, () => t('revue', 'grotesque', 'a')));
  assert.equal(serie.atelier['police=revue'], APPRENTISSAGE_DUELS.plafond);
  // Duel libre : poids moitié
  const libre = renfortsDuels([t('revue', 'grotesque', 'a', null)]);
  assert.ok(libre.atelier['police=revue'] < un.atelier['police=revue']);
  // Mauvais : légère baisse des deux
  const m = renfortsDuels([t('revue', 'grotesque', 'mauvais')]);
  assert.ok(m.atelier['police=revue'] < 0 && m.atelier['police=revue'] > -0.1);
  assert.ok(m.atelier['police=grotesque'] < 0);
  // Cumul avec les renforts des notes, plafonné à ±1
  const notes = renfortsPoids(Array.from({ length: 40 }, () => ({ note: 5, atelier: ['police=revue'], assets: [] })));
  assert.equal(notes.atelier['police=revue'], 0.75);
  const f = fusionnerRenforts(notes, serie);
  assert.equal(f.atelier['police=revue'], 1);
  assert.equal(f.atelier['police=grotesque'], Math.round((-0.5) * 1000) / 1000);
  // Appliqué aux poids : la proposition à la police gagnante est favorisée
  const p = appliquerRenforts(null, fusionnerRenforts({ atelier: {}, assets: {} }, serie))!;
  assert.ok(p.effets['police=revue'] > 0);
  // Photos : la clé de l'asset sert de clé d'apprentissage
  const ph = renfortsDuels([photo('x', 'y', 'a')]);
  assert.ok(ph.assets['photo:x'] > 0 && ph.assets['photo:y'] < 0);
  assert.equal(bonusAtelier({ structure: 'x' }, null), 0);
});

test('duels : validation, lecture de la table, juge et accord, série, synthèse', () => {
  assert.equal(validerDuel({ type: 'xx', resultat: 'a', aCle: 'photo:a', bCle: 'photo:b' }).ok, false);
  assert.equal(validerDuel({ type: 'photo', resultat: 'a', aCle: 'photo:a', bCle: 'photo:a' }).ok, false);
  const v = validerDuel({ type: 'photo', resultat: 'b', aCle: 'photo:a', bCle: 'photo:b', etiquettes: ['plus-lisible', 'inconnue'], appareil: 'mobile', scenario: { sujets: ['sport', 'x x'], emplacement: 'accueil' }, aIngredients: { assets: ['photo:a', 'a b'] } });
  assert.ok(v.ok);
  if (v.ok) {
    assert.deepEqual(v.duel.etiquettes, ['plus-lisible']);
    assert.deepEqual(v.duel.scenario, { sujets: ['sport'], emplacement: 'accueil' });
    assert.deepEqual(v.duel.aIngredients, { assets: ['photo:a'] });
  }
  const l = duelDepuisLigne({ type: 'photo', resultat: 'a', a_cle: 'photo:a', b_cle: 'photo:b', dimension_differente: 'photo', scenario: { sujets: ['sport'] }, a_ingredients: {}, b_ingredients: {}, prediction: 'a', created_at: '2026-10-07T10:00:00Z' })!;
  assert.equal(l.le, '2026-10-07T10:00:00Z');
  assert.equal(cleJugeDe('police=revue'), 'typo:police:revue');
  assert.equal(cleJugeDe('gamme=cobalt'), 'gamme:cobalt');
  assert.equal(cleJugeDe('variante=horaires:bandeau'), 'composant:horaires:bandeau');
  assert.equal(cleJugeDe('structure=x&gamme=y'), null);
  assert.equal(cleJugeDe('photo:sport-course'), 'photo:sport-course');
  const preds = { 'photo:a': [{ cle: 'photo:a', note: 4, le: '2026-10-07' }], 'photo:b': [{ cle: 'photo:b', note: 1, le: '2026-10-06' }, { cle: 'photo:b', note: 2, le: '2026-10-07' }], 'photo:c': [{ cle: 'photo:c', note: 4, le: '2026-10-07' }] };
  assert.equal(predireDuel(['photo:a'], ['photo:b'], preds), 'a');
  assert.equal(predireDuel(['photo:b'], ['photo:a'], preds), 'b');
  assert.equal(predireDuel(['photo:a'], ['photo:c'], preds), 'egalite');
  assert.equal(predireDuel(['photo:a'], ['photo:z'], preds), null);
  const acc = accordJuge([photo('a', 'b', 'a', 'sport', { prediction: 'a' }), photo('a', 'b', 'b', 'sport', { prediction: 'a' }), photo('a', 'b', 'mauvais', 'sport', { prediction: 'a' }), photo('a', 'b', 'a')]);
  assert.deepEqual({ n: acc.n, accords: acc.accords, taux: acc.taux }, { n: 2, accords: 1, taux: 50 });
  assert.equal(serieDuels(['2026-10-07T10:00:00Z', '2026-10-06T22:00:00Z', '2026-10-05', '2026-10-03']), 3);
  assert.equal(serieDuels([]), 0);
  const md = markdownDuels([photo('x', 'y', 'a', 'sport', { prediction: 'a' })], { libelleSujet: () => 'Sport', titres: { 'photo:x': 'Course' } });
  assert.match(md, /## Duels : classements par sujet/);
  assert.match(md, /### Meilleures photos — Sport — 1 duel/);
  assert.match(md, /Course \(`photo:x`\) : 15\d\d ± \d+/);
  assert.match(md, /Juge : d’accord avec Paul sur 1\/1/);
  assert.match(markdownDuels([]), /Aucun duel/);
});
