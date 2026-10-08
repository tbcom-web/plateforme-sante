import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FAMILLES_STYLE, ETIQUETTES_HARMONIE, DIMENSIONS_HARMONIE, compatibiliteFamille, valeursDimensionHarmonie, violationsDures, scoreHarmonie, tirerDansFamille,
  choisirFamille, apprendreHarmonie, corrigerHarmonie, harmonieCombinaison, lireDimension, familleDominante, type CompositionHarmonie, type IdFamilleStyle,
} from './harmonie';
import { compositionInitiale, DIMENSIONS_RECETTE, outilsHarmonie, tirerDimension, toutChanger, type CompositionRecette, type ContexteRecette, type DimensionRecette } from './recettes';
import { PAIRES_POLICES, VARIANTES_SECTIONS } from './modeles';
import { GAMMES } from './gammes';
import { JEUX_EFFETS } from './effets';
import { FORMES_CARTES } from './formes';
import { lotsPropositions } from './propositions';

const ctx = (sujets: string[]): ContexteRecette => ({ sujets, principaux: 1 });
const base = (sujets: string[] = ['cabinet']) => compositionInitiale(ctx(sujets), 1);

test('harmonie : chaque ingrédient des catalogues est étiqueté (polices, gammes, effets, formes, premiers écrans, transitions)', () => {
  for (const p of PAIRES_POLICES) assert.ok(ETIQUETTES_HARMONIE[`police:${p.id}`], `police ${p.id}`);
  for (const g of GAMMES) assert.ok(ETIQUETTES_HARMONIE[`gamme:${g.id}`], `gamme ${g.id}`);
  for (const j of JEUX_EFFETS) assert.ok(ETIQUETTES_HARMONIE[`effets:${j.id}`], `effets ${j.id}`);
  for (const f of FORMES_CARTES) assert.ok(ETIQUETTES_HARMONIE[`v.soins-forme:${f.id}`], `forme ${f.id}`);
  for (const s of ['accueil', 'transition', 'entete-anim', 'sections'] as const) for (const v of (VARIANTES_SECTIONS as Record<string, readonly string[]>)[s] ?? []) assert.ok(ETIQUETTES_HARMONIE[`v.${s}:${v}`], `${s} ${v}`);
  for (const s of ['releve', 'pedagogique', 'ligne', 'photos', 'decoupe', 'riso', 'volume', 'geometrique']) assert.ok(ETIQUETTES_HARMONIE[`style:${s}`] ?? ETIQUETTES_HARMONIE[`experimental:${s}`], s);
});

test('harmonie : chaque famille a au moins une valeur admise dans chaque dimension (le tirage n’est jamais bloqué)', () => {
  for (const f of FAMILLES_STYLE) {
    for (const d of DIMENSIONS_HARMONIE) {
      const l = valeursDimensionHarmonie(d);
      // Registres expérimentaux : pas encore tirés (styles-experimentaux.ts n'est pas branché sur les recettes)
      if (!l.length || d === 'experimental') continue;
      assert.ok(l.some((v) => compatibiliteFamille(d, v, f.id) !== 'exclu'), `${f.id} : ${d}`);
    }
    // Au moins trois polices préférées ou admises par famille
    assert.ok(PAIRES_POLICES.filter((p) => compatibiliteFamille('police', p.id, f.id) !== 'exclu').length >= 3, `${f.id} : polices`);
  }
});

test('règles dures : chaque règle se déclenche sur un cas type, et « Corriger » la lève', () => {
  const x = base();
  const cas: [string, CompositionHarmonie, string[]?][] = [
    ['echelle-affichage', { ...x, police: 'clinique', typo: { echelle: 'spectaculaire' } }],
    ['echelle-respiration', { ...x, police: 'affiche', typo: { echelle: 'spectaculaire' }, details: { densite: 'compacte' } }],
    ['majuscules-ronde', { ...x, police: 'ronde', typo: { casse: 'majuscules' } }],
    ['majuscules-longues', { ...x, police: 'affiche', typo: { casse: 'majuscules', echelle: 'spectaculaire' } }],
    ['ombre-pop-elegant', { ...x, police: 'revue', details: { ombres: 'portee' } }],
    ['rond-technique', { ...x, structure: 'technique-precis', details: { coins: 'tres-arrondis' } }],
    ['geometrique-police', { ...x, police: 'revue', visuels: { ...x.visuels, experimental: 'geometrique' } }],
    ['riso-police', { ...x, police: 'ronde', visuels: { ...x.visuels, experimental: 'riso' } }],
    ['vivant-sujet', { ...x, effets: 'vivant' }, ['diabete']],
    ['expressif', { ...x, police: 'affiche', typo: { echelle: 'spectaculaire' }, details: { fond: 'formes' } }],
    ['contraste-aa', { ...x, gamme: '', couleur: '#9ad0ff' }],
    ['coins-coherents', { ...x, structure: 'clair-pratique', details: { coins: 'carres', boutons: 'pilule' } }],
  ];
  for (const [code, y, sujets] of cas) {
    const v = violationsDures(y, { sujets: sujets ?? ['cabinet'] });
    const viol = v.find((k) => k.code === code);
    assert.ok(viol, `${code} attendu, obtenu ${v.map((k) => k.code).join(',')}`);
    const z = corrigerHarmonie(y, viol!);
    assert.ok(!violationsDures(z, { sujets: sujets ?? ['cabinet'] }).some((k) => k.code === code), `${code} corrigé`);
  }
  // Recette sage : aucune violation
  assert.deepEqual(violationsDures(x, { sujets: ['cabinet'] }), []);
});

test('tirage dans une famille : 1 000 tirages par famille, zéro violation dure, la famille reste dominante', () => {
  const c = ctx(['cabinet']);
  const outils = outilsHarmonie(c);
  for (const f of FAMILLES_STYLE) {
    let x: CompositionRecette = base();
    let fidele = 0;
    for (let i = 0; i < 1000; i++) {
      x = tirerDansFamille(f.id, x, [], c, i * 7919 + 17, outils);
      const s = scoreHarmonie(x, c);
      assert.deepEqual(s.violations.map((v) => v.code), [], `${f.id} #${i}`);
      if (s.famille === f.id) fidele++;
    }
    assert.ok(fidele >= 850, `${f.id} : famille dominante ${fidele}/1000`);
  }
});

test('« Tout changer » harmonieux : zéro violation dure sur 4 sujets × 250 tirages ; jamais « Vivant » pour diabète et senior', () => {
  for (const sujet of ['sport', 'diabete', 'enfant', 'senior']) {
    const c = ctx([sujet]);
    let x = base([sujet]);
    const familles = new Set<string>();
    for (let i = 0; i < 250; i++) {
      x = toutChanger(x, [], c, i * 104729 + 3);
      const s = scoreHarmonie(x, c);
      assert.deepEqual(s.violations.map((v) => v.code), [], `${sujet} #${i}`);
      if (sujet === 'diabete' || sujet === 'senior') assert.notEqual(x.effets, 'vivant');
      familles.add(s.famille);
    }
    // Le hasard reste ouvert : plusieurs familles par sujet
    assert.ok(familles.size >= 3, `${sujet} : ${[...familles].join(', ')}`);
  }
});

test('« Tout changer » pondéré par le sujet : sport → Technique net / Graphique pop, enfant → Doux et rond / Nature, ongles → Éditorial chic', () => {
  const tirage = (sujet: string) => {
    const n: Record<string, number> = {};
    for (let i = 0; i < 400; i++) { const f = choisirFamille(base([sujet]), [], ctx([sujet]), i); n[f] = (n[f] ?? 0) + 1; }
    return Object.entries(n).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  };
  assert.ok(['technique-net', 'graphique-pop'].includes(tirage('sport')[0]));
  assert.ok(['doux-rond', 'nature-chaleureuse'].includes(tirage('enfant')[0]));
  assert.ok(['classique-sobre', 'minimal-clinique', 'doux-rond'].includes(tirage('diabete')[0]));
  assert.equal(tirage('senior')[0], 'classique-sobre');
  assert.equal(tirage('ongles')[0], 'editorial-chic');
});

test('verrous respectés : police éditoriale verrouillée → le tirage reste dans les familles compatibles', () => {
  const c = ctx(['sport']);
  let x: CompositionRecette = { ...base(['sport']), police: 'revue' };
  for (let i = 0; i < 200; i++) {
    x = toutChanger(x, ['polices'], c, i);
    assert.equal(x.police, 'revue');
    const s = scoreHarmonie(x, c);
    assert.deepEqual(s.violations, []);
    assert.ok(!['graphique-pop', 'doux-rond'].includes(s.famille), s.famille);
    assert.notEqual(lireDimension(x, 'details.ombres'), 'portee');
  }
  // Axe d'habillage verrouillé (échelle spectaculaire) : jamais une police de texte, toujours de l'air
  // (forme structurelle : la typographie est facultative dans les anciennes recettes)
  let y = { ...base(['ongles']), police: 'didone', typo: { ...((base(['ongles']) as CompositionHarmonie).typo ?? {}), echelle: 'spectaculaire' } } as CompositionRecette;
  for (let i = 0; i < 150; i++) {
    y = toutChanger(y, ['hab:typo:echelle'], ctx(['ongles']), i);
    const echelle = lireDimension(y, 'typo.echelle');
    if (echelle !== undefined) assert.equal(echelle, 'spectaculaire');
    assert.deepEqual(scoreHarmonie(y, ctx(['ongles'])).violations, []);
  }
});

test('déterminisme : même composition, mêmes verrous, même graine → même résultat', () => {
  const c = ctx(['enfant']);
  const x = base(['enfant']);
  assert.deepEqual(toutChanger(x, [], c, 42), toutChanger(x, [], c, 42));
  assert.deepEqual(tirerDimension(x, 'polices', c, 7), tirerDimension(x, 'polices', c, 7));
  assert.deepEqual(tirerDansFamille('editorial-chic', x, [], c, 9, outilsHarmonie(c)), tirerDansFamille('editorial-chic', x, [], c, 9, outilsHarmonie(c)));
});

test('dé individuel : seulement des valeurs compatibles avec le reste, aucune nouvelle violation', () => {
  // Dés présents dans ce studio (la typographie et les détails arrivent avec l'habillage)
  const DES = ['polices', 'couleurs', 'effets', 'details', 'typo', 'visuels'].filter((d): d is DimensionRecette => DIMENSIONS_RECETTE.some((x) => x.id === d));
  const c = ctx(['sport']);
  let x = toutChanger(base(['sport']), [], c, 5);
  for (let i = 0; i < 200; i++) {
    for (const d of DES) {
      const f = familleDominante(x, c, d === 'polices' ? ['police'] : [])[0].id as IdFamilleStyle;
      const y = tirerDimension(x, d, c, i * 13 + d.length);
      assert.deepEqual(scoreHarmonie(y, c).violations, [], `${d} #${i}`);
      if (d === 'polices') assert.notEqual(compatibiliteFamille('police', y.police, f), 'exclu', `${y.police} hors ${f}`);
      x = y;
    }
  }
});

test('« Hors règles » : le tirage brut reste possible (garde-fous du core seulement) et viole souvent l’harmonie', () => {
  const c: ContexteRecette = { ...ctx(['sport']), horsRegles: true };
  let x = base(['sport']);
  let violations = 0;
  for (let i = 0; i < 200; i++) { x = toutChanger(x, [], c, i); if (violationsDures(x, c).length) violations++; }
  assert.ok(violations > 50, `${violations} violations sur 200 tirages bruts`);
});

test('scores cohérents avec les notes de Paul (atelier) : combinaisons notées ≥ 4 au-dessus de celles notées ≤ 2', () => {
  // Extraits de retours/atelier-notes.json (2026-10-07) : [structure, style, gamme, note]
  const notes: [string, string, string, number][] = [
    ['technique-precis', 'releve', 'menthe', 5], ['elegant-sobre', 'ligne', 'encre', 5], ['elegant-sobre', 'ligne', 'pistache', 5], ['technique-precis', 'releve', 'cobalt', 5],
    ['elegant-sobre', 'ligne', 'prune', 4], ['elegant-sobre', 'ligne', 'sable', 4], ['technique-precis', 'releve', 'cobalt-abricot', 4], ['clair-pratique', 'ligne', 'canard', 4],
    ['technique-precis', 'photos', 'cobalt-abricot', 2], ['elegant-sobre', 'releve', 'cobalt', 2], ['simple-proche', 'releve', 'menthe', 2], ['technique-precis', 'photos', 'menthe', 2],
    ['clair-pratique', 'photos', 'terracotta', 2], ['simple-proche', 'photos', 'sauge', 2], ['clair-pratique', 'photos', 'ardoise', 1],
  ];
  const x = base();
  const score = ([structure, style, gamme]: [string, string, string, number]) => scoreHarmonie({ ...x, structure, gamme, couleur: GAMMES.find((g) => g.id === gamme)!.accent, visuels: { ...x.visuels, style } }).score;
  const moy = (l: number[]) => l.reduce((s, n) => s + n, 0) / l.length;
  const hauts = notes.filter((n) => n[3] >= 4).map(score), bas = notes.filter((n) => n[3] <= 2).map(score);
  assert.ok(moy(hauts) >= moy(bas) + 5, `≥ 4 : ${moy(hauts).toFixed(1)} ; ≤ 2 : ${moy(bas).toFixed(1)}`);
  // Générateur des praticiens : même ordre
  const comb = (n: [string, string, string, number]) => harmonieCombinaison(n[0], n[1], n[2]);
  assert.ok(moy(notes.filter((n) => n[3] >= 4).map(comb)) > moy(notes.filter((n) => n[3] <= 2).map(comb)));
});

test('apprentissage : les notes ajustent les poids souples (lissage, plafond ±0,75), jamais les règles dures', () => {
  const c = ctx(['cabinet']);
  const editoriales = Array.from({ length: 40 }, (_, i) => tirerDansFamille('editorial-chic', base(), [], c, i, outilsHarmonie(c)));
  const p = apprendreHarmonie(editoriales.map((composition) => ({ note: 5, composition })));
  assert.ok((p.familles['editorial-chic'] ?? 0) > 0.5 && (p.familles['editorial-chic'] ?? 0) <= 0.75);
  for (const e of Object.values(p.ingredients)) assert.ok(Math.abs(e) <= 0.75);
  // Plus de tirages éditoriaux une fois appris ; une recette fautive reste fautive
  const n = (pc: ContexteRecette) => Array.from({ length: 300 }, (_, i) => choisirFamille(base(), [], pc, i)).filter((f) => f === 'editorial-chic').length;
  assert.ok(n({ ...c, poidsHarmonie: p }) > n(c));
  const fautive = { ...base(), police: 'ronde', typo: { casse: 'majuscules' } };
  assert.ok(violationsDures(fautive, { ...c, poidsHarmonie: p }).length > 0);
  const s1 = scoreHarmonie(editoriales[0], c).score, s2 = scoreHarmonie(editoriales[0], { ...c, poidsHarmonie: p }).score;
  assert.ok(s2 >= s1 && s2 - s1 <= 5);
});

test('générateur des praticiens : les propositions restent valides et variées avec le bonus d’harmonie', () => {
  const lots = lotsPropositions({ priorites: { principaux: ['ongles'], secondaires: [] } }, 2);
  assert.equal(lots[0].length, 3);
  assert.equal(new Set(lots[0].map((p) => p.univers)).size, 3);
});
