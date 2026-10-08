import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPRENTISSAGE_NOTATION, SCENARIOS_TYPES, apprisHarmonie, clesEngagees, clesRefusees, contexteScenario, fileNotation, genererCandidates, ingredientsNotation,
  pairesNotation, palmaresNotation, renfortsNotations, scorePredit, statsNotation, type NotationRecette,
} from './notation-recettes';
import { violationsDures, poidsHarmonie, bonusRecettesApprises, lireDimension } from './harmonie';
import { compositionInitiale, controlerComposition, toutChanger, appliquerRenforts, type CompositionRecette, type ContexteRecette } from './recettes';
import { fusionnerRenforts } from './duels';
import { propositionParId } from './propositions';

const sc = SCENARIOS_TYPES[0].scenario;
const ctx0 = contexteScenario(sc, {});
const compo = (g: number, c: ContexteRecette = ctx0) => toutChanger(compositionInitiale(c, g), [], c, g);

test('génération : aucune violation d’harmonie ni des garde-fous, part d’exploration ≈ 20 %', () => {
  for (const t of SCENARIOS_TYPES.slice(0, 3)) {
    const c = contexteScenario(t.scenario, {});
    const l = genererCandidates(t.scenario, c, { n: 5, graine: 7, iterations: 6, exploration: 0.2 });
    assert.equal(l.length, 5);
    for (const x of l) {
      assert.deepEqual(violationsDures(x.composition, c), [], `${t.id} : règle dure violée`);
      assert.deepEqual(controlerComposition(x.composition, c), [], `${t.id} : garde-fou`);
    }
    assert.equal(l.filter((x) => x.exploration).length, 1);
    assert.equal(new Set(l.map((x) => x.cle)).size, 5);
  }
});

test('génération : jamais d’ingrédient refusé ; « à valider » seulement en exploration', () => {
  const base = genererCandidates(sc, ctx0, { n: 4, graine: 3, iterations: 4, exploration: 0 });
  const police = lireDimension(base[0].composition, 'police')!;
  const refusees = new Set([`police:${police}`, `gamme:${base[0].composition.gamme}`]);
  const l = genererCandidates(sc, ctx0, { n: 4, graine: 3, iterations: 4, exploration: 0, refusees });
  for (const x of l) for (const k of clesEngagees(x.composition, ctx0.sujets)) assert.ok(!refusees.has(k), k);
  // Une dimension entière « à valider » : seule l'exploration peut la montrer, signalée
  const estAValider = (k: string) => k.startsWith('effets:') && !k.startsWith('effets:photos');
  const m = genererCandidates(sc, ctx0, { n: 5, graine: 4, iterations: 4, exploration: 0.2, estAValider });
  for (const x of m) {
    if (!x.exploration) assert.equal(x.aValider.length, 0);
    else assert.ok(x.aValider.length > 0);
  }
  // Refus calculés : statut, moyenne ≤ 2
  const r = clesRefusees({ assets: [{ cle: 'gamme:cobalt', statut: 'retire' }, { cle: 'photo:a', note: 2 }, { cle: 'photo:b', note: 4 }, { cle: 'photo:b', note: 1 }] });
  assert.ok(r.has('gamme:cobalt') && r.has('photo:a') && !r.has('photo:b'));
});

test('propagation : ingrédients et paires, lissage, plafonds, « Garder »', () => {
  const x = compo(11);
  const k = ingredientsNotation(x).find((i) => i.dim === 'police')!.cle;
  const p = pairesNotation(x)[0];
  const une = statsNotation([{ scenario: sc, composition: x, note: 5 }]);
  // Lissage : (5 − 3) / (4 + 1) = 0,4 pour un ingrédient ; paire (K = 6) : 2/7
  assert.equal(une.global.ingredients[k].effet, 0.4);
  assert.equal(une.global.paires[p].effet, Math.round((2 / 7) * 1000) / 1000);
  assert.ok(une.sujets.sport.ingredients[k].effet === 0.4);
  // Plafonds
  const beaucoup = statsNotation(Array.from({ length: 40 }, () => ({ scenario: sc, composition: x, note: 5 })));
  assert.equal(beaucoup.global.ingredients[k].effet, APPRENTISSAGE_NOTATION.plafond.ingredient);
  assert.equal(beaucoup.global.paires[p].effet, APPRENTISSAGE_NOTATION.plafond.paire);
  assert.ok(beaucoup.global.ingredients[k].sigma < une.global.ingredients[k].sigma);
  // Garder sans étoiles = 5★ + 0,5, poids 1,5 : plus fort qu'un simple 5★
  const g = statsNotation([{ scenario: sc, composition: x, note: null, garder: true }]);
  assert.ok(g.global.ingredients[k].effet > une.global.ingredients[k].effet);
  // Mobile pèse plus
  const mob = statsNotation([{ scenario: sc, composition: x, note: 5, appareil: 'mobile' }]);
  assert.ok(mob.global.ingredients[k].effet > une.global.ingredients[k].effet);
});

test('pour / contre ciblé : « polices » en contre ne pénalise surtout que la paire de polices', () => {
  const x = compo(12);
  const ings = ingredientsNotation(x);
  const police = ings.find((i) => i.dim === 'police')!.cle;
  const gamme = ings.find((i) => i.dim === 'gamme')!.cle;
  const s = statsNotation([{ scenario: sc, composition: x, note: 4, contre: ['polices'] }]);
  assert.ok(s.global.ingredients[police].effet < 0, 'police pénalisée');
  assert.ok(s.global.ingredients[gamme].effet > 0, 'gamme reste favorisée');
  const neutre = statsNotation([{ scenario: sc, composition: x, note: 2 }]);
  const cible = statsNotation([{ scenario: sc, composition: x, note: 2, contre: ['polices'] }]);
  assert.ok(cible.global.ingredients[police].effet < neutre.global.ingredients[police].effet);
  assert.ok(cible.global.ingredients[gamme].effet > neutre.global.ingredients[gamme].effet, 'la note basse épargne à moitié les autres');
  // Clés du générateur : police= pénalisée, gamme= favorisée
  const r = renfortsNotations([{ scenario: sc, composition: x, note: 4, contre: ['polices'] }]);
  assert.ok(r.atelier[`police=${x.police}`] < 0);
  assert.ok((r.atelier[`gamme=${x.gamme}`] ?? 0) > 0);
  // Cumul avec duels / notes isolées : plafond ±1 par clé
  const f = fusionnerRenforts(r, { atelier: { [`police=${x.police}`]: -0.99 }, assets: {} });
  assert.equal(f.atelier[`police=${x.police}`], -1);
});

test('branchements : tirages harmonieux, « Tout changer » et générateur des praticiens lisent les poids appris', () => {
  let x = compo(13);
  for (let g = 14; !x.gamme; g++) x = compo(g);
  const notes = Array.from({ length: 12 }, () => ({ scenario: sc, composition: x, note: 5, garder: true }));
  const appris = apprisHarmonie(statsNotation(notes))!;
  const poids = appliquerRenforts({ n: 1, moyenne: 3, effets: {}, harmonie: appris }, renfortsNotations(notes))!;
  const ph = poidsHarmonie({ sujets: ['sport'], poids });
  assert.ok(Object.keys(ph.paires ?? {}).length > 0);
  assert.ok(bonusRecettesApprises(appris, 'sport', { structure: x.structure, style: x.visuels.style, gamme: x.gamme }) > 0);
  // Générateur des praticiens : la combinaison apprise gagne en pertinence (même proposition, avec et sans poids)
  const e = { priorites: { principaux: ['sport'], secondaires: [] }, couleursPreferees: [] };
  const id = `sport~${x.structure}~${x.gamme || 'cobalt'}~${x.visuels.style}~${x.visuels.animation ?? '0'}`;
  const sans = propositionParId(e, id), avec = propositionParId(e, id, { poids });
  assert.ok(sans && avec && avec.score > sans.score, `${sans?.score} → ${avec?.score}`);
  // Le score prédit monte pour la recette aimée
  assert.ok(scorePredit(x, { ...ctx0, poids }, statsNotation(notes)).score > scorePredit(x, ctx0, null).score);
});

test('file : sources alternées, déjà notées sautées ; palmarès trié', () => {
  type E = { cle: string; source: 'generateur' | 'claude' };
  const a: E[] = [{ cle: 'compo:1', source: 'generateur' }, { cle: 'compo:2', source: 'generateur' }];
  const b: E[] = [{ cle: 'compo:3', source: 'claude' }];
  assert.deepEqual(fileNotation([a, b], new Set(['compo:1'])).map((x) => x.cle), ['compo:2', 'compo:3']);
  const x = compo(14), y = compo(15);
  const p = palmaresNotation(statsNotation([{ scenario: sc, composition: x, note: 5 }, { scenario: sc, composition: y, note: 1 }]));
  assert.equal(p[0].sujet, '*');
  assert.ok(p[0].ingredients.every((l, i, t) => i === 0 || t[i - 1].effet >= l.effet));
  assert.ok(p.some((q) => q.sujet === 'sport'));
});

// ---------------------------------------------------------------------------------------------------------------
// « Paul synthétique » : goût fixé, caché ; le système apprend de ses notes, sans Claude
// ---------------------------------------------------------------------------------------------------------------

const h = (s: string) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return ((x >>> 0) / 4294967296) * 2 - 1; };
const POIDS_GOUT: Record<string, number> = { gamme: 1, police: 1, structure: 0.8, style: 0.8, 'v.accueil': 0.6, 'details.jeu': 0.6, effets: 0.4 };
/** Utilité cachée : préférences par ingrédient + une paire gamme × police */
function gout(x: CompositionRecette): number {
  let u = 0;
  for (const [d, w] of Object.entries(POIDS_GOUT)) { const v = lireDimension(x, d); if (v) u += w * h(`${d}:${v}`); }
  u += 0.8 * h(`paire:${x.gamme}&${x.police}`);
  return u / 2;
}
const noteDe = (x: CompositionRecette) => Math.max(1, Math.min(5, Math.round(3 + 1.6 * gout(x))));

test('amélioration mesurable : le goût moyen des recettes proposées monte au fil des tours', () => {
  const notes: NotationRecette[] = [];
  const moyennes: number[] = [];
  const temoins: number[] = [];
  const TOURS = 10;
  for (let t = 0; t < TOURS; t++) {
    const stats = notes.length ? statsNotation(notes) : null;
    const appris = stats ? apprisHarmonie(stats) : null;
    const poids = notes.length ? appliquerRenforts(appris ? { n: 1, moyenne: 3, effets: {}, harmonie: appris } : null, renfortsNotations(notes)) : null;
    const c = contexteScenario(sc, { poids });
    const l = genererCandidates(sc, c, { n: 6, graine: 100 + t, iterations: 16, stats, deja: new Set(notes.map((n) => n.cle!)) });
    const exploit = l.filter((x) => !x.exploration);
    moyennes.push(exploit.reduce((s, x) => s + gout(x.composition), 0) / exploit.length);
    // Témoin : même générateur, sans rien apprendre
    const tem = genererCandidates(sc, ctx0, { n: 6, graine: 100 + t, iterations: 16 }).filter((x) => !x.exploration);
    temoins.push(tem.reduce((s, x) => s + gout(x.composition), 0) / tem.length);
    for (const x of l) notes.push({ cle: x.cle, scenario: sc, composition: x.composition, note: noteDe(x.composition), garder: noteDe(x.composition) === 5 });
  }
  // Tour 1 : rien d'appris (identique au témoin) ; fin : moyenne des 5 derniers tours
  const debut = moyennes[0];
  const fin = moyennes.slice(-5).reduce((s, x) => s + x, 0) / 5;
  const temoin = temoins.reduce((s, x) => s + x, 0) / temoins.length;
  console.log(`Paul synthétique : goût moyen tour 1 = ${debut.toFixed(3)}, 5 derniers tours = ${fin.toFixed(3)}, témoin sans apprentissage (10 tours) = ${temoin.toFixed(3)} ; par tour : ${moyennes.map((m) => m.toFixed(2)).join(' ')}`);
  assert.equal(moyennes[0], temoins[0]);
  assert.ok(fin > debut + 0.15, 'le goût moyen monte');
  assert.ok(fin > temoin + 0.15, 'mieux que sans apprentissage');
});
