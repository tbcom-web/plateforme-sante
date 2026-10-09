// Politique d'évaluation unique (politique-evaluation.ts), règles apprises (regles-apprises.ts), preuve chiffrée (simulation)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  choisirEcran, contexteDepuisEtat, dimensionsFraiches, ecranBloque, enDelai, etatPolitique, expositionsDepuisJournaux, fileEvaluation, filtrerCandidatsPolitique,
  fusionnerExpositions, groupeVisuel, implicitesNegatifs, indicateursPolitique, lireExposition, memoireExpositions, purgerExpositions, renfortsImplicites,
  tranchesImplicites, departageSerre, ordonnerBoiteEntree, type Exposition,
} from './politique-evaluation';
import {
  apprendreRegles, attributsDeCle, cleHarmonie, contraintesSourcing, effetRegles, motsFrequents, penalitesRegles, respecteContraintes, saturationHex,
  signauxDepuisRetours, type SignalRetour,
} from './regles-apprises';
import { fusionnerTranches, tranchesDepuisSignaux } from './tranches';
import { simulerPolitique } from './politique-evaluation-simulation';

const t = (i: number) => new Date(Date.parse('2026-10-01T08:00:00Z') + i * 60000).toISOString();
const ex = (cle: string, i: number, resultat: Exposition['resultat'], o: Partial<Exposition> = {}): Exposition => ({ cle, surface: 'degustation', ecran: `e${i}`, le: t(i), resultat, ...o });

test('groupe visuel : base d’illustration, série de photos, variantes @, image sur fond', () => {
  assert.equal(groupeVisuel('dessin:orthonyxie:riso'), 'dessin:orthonyxie');
  assert.equal(groupeVisuel('photo:sport-course-2'), 'photo:sport-course');
  assert.equal(groupeVisuel('photo:sport-course'), 'photo:sport-course');
  assert.equal(groupeVisuel('picto:semelle@direction-b'), 'picto:semelle');
  assert.equal(groupeVisuel('gamme:canard'), 'gamme:canard');
  assert.equal(groupeVisuel('dessin:orthonyxie:riso&surface:teinte'), 'dessin:orthonyxie');
});

test('lecture d’une exposition : validation stricte', () => {
  assert.deepEqual(lireExposition({ cle: 'gamme:canard', surface: 'tuiles', ecran: 'tuiles:abc:1', le: t(0), resultat: 'ignore', etiquettes: ['fade', 'X MAL'] }), { cle: 'gamme:canard', surface: 'tuiles', ecran: 'tuiles:abc:1', le: t(0), resultat: 'ignore', etiquettes: ['fade'] });
  assert.equal(lireExposition({ cle: 'pas une clé', surface: 'tuiles', ecran: 'x', le: t(0), resultat: 'ignore' }), null);
  assert.equal(lireExposition({ cle: 'gamme:x', surface: 'inconnue', ecran: 'x', le: t(0), resultat: 'ignore' }), null);
  assert.equal(lireExposition({ cle: 'gamme:x', surface: 'tuiles', ecran: 'x', le: t(0), resultat: 'adore' }), null);
});

test('journaux → expositions : duel, grille (préférées, pire, autres), présélection, tournoi, notes', () => {
  const l = expositionsDepuisJournaux({
    duels: [{ aCle: 'compo:a', bCle: 'compo:b', aIngredients: { element: 'gamme:canard' }, bIngredients: { element: 'gamme:cobalt' }, resultat: 'a', le: t(1) }],
    grilles: [
      { format: 'compositions', dimension: 'couleurs', session: 's1', propositions: ['p0', 'p1', 'p2', 'p3'].map((k, i) => ({ cle: `compo:${k}`, ingredients: { element: `gamme:g${i}` } })), meilleures: [2, 0], pire: 3, le: t(2) },
      { format: 'directions', dimension: 'directions', session: null, propositions: [{ cle: 'compo:x' }, { cle: 'compo:y' }], meilleures: [1], pire: null, le: t(3) },
    ],
    tournoi: [{ propositions: ['f1', 'f2', 'f3'], meilleures: [0], pire: 2, le: t(4) }],
    notesAssets: [{ cle: 'photo:a', note: 2, le: t(5), etiquettes: ['fade'] }],
  });
  const de = (cle: string) => l.filter((x) => x.cle === cle).map((x) => `${x.surface}:${x.resultat}`);
  assert.deepEqual(de('gamme:canard'), ['duels:choisi']);
  assert.deepEqual(de('gamme:cobalt'), ['duels:pas-choisi']);
  assert.deepEqual(de('compo:a'), ['duels:choisi']);
  assert.deepEqual(de('gamme:g2'), ['degustation:choisi']);
  assert.deepEqual(de('gamme:g3'), ['degustation:pire']);
  assert.deepEqual(de('gamme:g1'), ['degustation:pas-choisi']);
  assert.deepEqual(de('compo:x'), ['preselection:pas-choisi']);
  assert.deepEqual(de('modele-chaine:f3'), ['tournoi:pire']);
  assert.deepEqual(de('photo:a'), ['tuiles:note']);
  // Une même grille : un seul écran
  assert.equal(new Set(l.filter((x) => x.surface === 'degustation').map((x) => x.ecran)).size, 1);
});

test('fusion : un écran « ignoré » puis décidé garde la décision ; ordre chronologique', () => {
  const a = ex('gamme:a', 1, 'ignore'), b = ex('gamme:a', 1, 'choisi');
  const l = fusionnerExpositions([b], [a], [ex('gamme:z', 0, 'ignore')]);
  assert.equal(l.length, 2);
  assert.equal(l[0].cle, 'gamme:z');
  assert.equal(l[1].resultat, 'choisi');
});

test('délai de retour : écrans et groupe visuel, toutes surfaces', () => {
  const l: Exposition[] = [ex('dessin:orthonyxie:riso', 0, 'note', { surface: 'tuiles' })];
  for (let i = 1; i <= 10; i++) l.push(ex(`gamme:g${i}`, i, 'note'));
  const m = memoireExpositions(l);
  // Variante d'une illustration vue dans une autre surface : en délai
  assert.equal(enDelai('dessin:orthonyxie:pedagogique', m, { reglages: { delaiEcrans: 50, delaiJours: 0 } }), true);
  assert.equal(enDelai('dessin:orthonyxie:pedagogique', m, { reglages: { delaiEcrans: 5, delaiJours: 0 } }), false);
  // Jours : vu il y a 10 minutes, délai 2 jours
  assert.equal(enDelai('gamme:g10', m, { maintenant: t(20), reglages: { delaiEcrans: 0, delaiJours: 2 } }), true);
  assert.equal(enDelai('gamme:jamais', m, { maintenant: t(20) }), false);
  assert.equal(departageSerre(0.1, 0.2), true);
  assert.equal(departageSerre(0.1, 0.9), false);
});

test('signal négatif implicite : 3 fois sans être choisi, ou « celle qui ne va pas » ; un choix ou une note ≥ 3 l’annule ; Réévaluer', () => {
  const l = [ex('gamme:a', 1, 'pas-choisi'), ex('gamme:a', 2, 'ignore'), ex('gamme:a', 3, 'pas-choisi'), ex('gamme:b', 4, 'pire'), ex('gamme:c', 5, 'pas-choisi'), ex('gamme:c', 6, 'pas-choisi'), ex('gamme:c', 7, 'pas-choisi'), ex('gamme:c', 8, 'choisi'),
    ex('gamme:d', 9, 'pas-choisi'), ex('gamme:d', 10, 'pas-choisi'), ex('gamme:d', 11, 'note', { note: 4 }), ex('gamme:e', 12, 'pas-choisi'), ex('gamme:e', 13, 'pas-choisi')];
  const im = implicitesNegatifs(memoireExpositions(l));
  assert.deepEqual(im.map((x) => `${x.cle}:${x.raison}`).sort(), ['gamme:a:jamais-choisi', 'gamme:b:pire']);
  // Réévaluer gamme:a après ses expositions : plus implicite
  assert.deepEqual(implicitesNegatifs(memoireExpositions(l, [{ cle: 'gamme:a', le: t(3) + 'z' }])).map((x) => x.cle), ['gamme:b']);
  // Fusion avec les tranches (refusés des files) et rétrogradation en génération
  const tr = fusionnerTranches(tranchesDepuisSignaux([{ cle: 'gamme:z', note: 5 }]), tranchesImplicites(im));
  assert.ok(tr.refuses.has('gamme:a') && tr.refuses.has('gamme:b') && tr.favoris.has('gamme:z'));
  assert.deepEqual(renfortsImplicites(im), { 'gamme:b': -0.75, 'gamme:a': -0.75 });
});

test('file : fort potentiel d’abord, puis jamais notés, puis départage des bons incertains ; jamais tranchés, exclus, implicites, connus', () => {
  const items = [
    { cle: 'gamme:jamais', note: null, potentiel: 3 },
    { cle: 'gamme:fort', note: null, potentiel: 4.5 },
    { cle: 'gamme:nouveaute', note: null, nouveauteAcceptee: true },
    { cle: 'gamme:incertain', note: 4, n: 1 },
    { cle: 'gamme:connu', note: 3.5, n: 3, ecart: 1 },
    { cle: 'gamme:moyen', note: 2.5, n: 1 },
    { cle: 'gamme:tranche', note: 5, n: 1, tranche: true },
    { cle: 'gamme:exclu', note: null },
    { cle: 'gamme:implicite', note: null },
    { cle: 'gamme:regle', note: null, potentiel: 4.2 },
  ];
  const f = fileEvaluation(items, { exclus: new Set(['gamme:exclu']), implicites: new Set(['gamme:implicite']), regles: (k) => ({ effet: k === 'gamme:regle' ? -0.5 : 0, ecarte: false }) });
  assert.deepEqual(f.file.map((x) => `${x.palier}:${x.x.cle}`), ['1:gamme:fort', '1:gamme:nouveaute', '2:gamme:regle', '2:gamme:jamais', '3:gamme:incertain']);
  assert.deepEqual(Object.fromEntries(f.exclus.map((x) => [x.x.cle, x.raison])), { 'gamme:connu': 'connu', 'gamme:moyen': 'connu', 'gamme:tranche': 'tranche', 'gamme:exclu': 'exclu', 'gamme:implicite': 'implicite' });
});

test('écran : jamais deux éléments du même groupe ; en délai seulement si la file ne suffit pas (le plus ancien d’abord)', () => {
  const m = memoireExpositions([ex('gamme:vieux', 0, 'note'), ex('gamme:recent', 30, 'note')]);
  const items = [{ cle: 'dessin:a:riso', note: null }, { cle: 'dessin:a:trait', note: null }, { cle: 'dessin:b:riso', note: null }, { cle: 'gamme:recent', note: null }, { cle: 'gamme:vieux', note: null }];
  const f = fileEvaluation(items, { memoire: m, reglages: { delaiJours: 0 } });
  assert.deepEqual(f.enDelai.map((x) => x.x.cle), ['gamme:vieux', 'gamme:recent']);
  const e = choisirEcran(f, 3);
  assert.deepEqual(e.choix.map((x) => x.x.cle), ['dessin:a:riso', 'dessin:b:riso', 'gamme:vieux']);
  assert.equal(e.retours, 1);
  // Dimensions fraîches : la famille épuisée attend son tour
  assert.deepEqual(dimensionsFraiches(['gammes', 'dessins'], (d) => items.filter((x) => (d === 'gammes' ? x.cle.startsWith('gamme:') : x.cle.startsWith('dessin:'))), 1, { memoire: m, reglages: { delaiJours: 0 } }), ['dessins']);
});

test('candidats des surfaces à tirage propre (duels, grilles) : sans implicites ni délai tant qu’il en reste assez, jamais vide', () => {
  const m = memoireExpositions([ex('photo:a', 0, 'note'), ex('photo:b', 1, 'note')]);
  const c = ['photo:a', 'photo:b', 'photo:c', 'photo:d', 'photo:e'].map((cle) => ({ cle }));
  const ctx = { memoire: m, implicites: new Set(['photo:c']), reglages: { delaiJours: 0 } };
  assert.deepEqual(filtrerCandidatsPolitique(c, ctx).map((x) => x.cle), ['photo:d', 'photo:e']);
  assert.deepEqual(filtrerCandidatsPolitique(c, ctx, 3).map((x) => x.cle).sort(), ['photo:a', 'photo:b', 'photo:d', 'photo:e']);
  assert.equal(ecranBloque(['photo:a', null], ctx), true);
  assert.equal(ecranBloque(['photo:d'], ctx), false);
});

test('état compact côté navigateur : délai, implicites, règles, et la session compte aussitôt', () => {
  const m = memoireExpositions([ex('gamme:a', 0, 'note')]);
  const e = etatPolitique(m, { implicites: [{ cle: 'gamme:b' }], penalites: { 'gamme:c': -0.5 }, ecartes: ['photo:v'], fortPotentiel: ['gamme:f'], maintenant: t(1) });
  const ctx = contexteDepuisEtat(JSON.parse(JSON.stringify(e)), [ex('gamme:s', 2, 'pire', { surface: 'duels' })], t(3));
  assert.equal(enDelai('gamme:a', ctx.memoire, { reglages: { delaiJours: 0 } }), true);
  assert.ok(ctx.implicites?.has('gamme:b') && ctx.implicites.has('gamme:s'));
  assert.deepEqual(ctx.regles?.('photo:v'), { effet: 0, ecarte: true });
  assert.equal(ctx.regles?.('gamme:c').effet, -0.5);
  assert.ok(ctx.fortPotentiel.has('gamme:f'));
});

test('indicateurs : taux de répétition, qualité, jamais-notés, tendance', () => {
  const l = [ex('gamme:a', 0, 'note'), ex('gamme:b', 1, 'note'), ex('gamme:a', 2, 'note'), ex('gamme:c', 3, 'note')];
  const m = memoireExpositions(l);
  const q: Record<string, number> = { 'gamme:a': 4, 'gamme:b': 2, 'gamme:c': 3 };
  const ind = indicateursPolitique(m, { qualite: (k) => q[k] ?? null, premiereNote: (k) => (k === 'gamme:a' ? t(0) : null), maintenant: t(10), jours: 2 });
  assert.equal(ind.ecrans, 4);
  assert.equal(ind.tauxRepetition, 0.25);
  assert.equal(ind.qualiteMoyenne, 3.25);
  assert.equal(ind.partJamaisNotes, 0.5);
  assert.equal(ind.tendance.length, 2);
  assert.equal(ind.tendance[1].ecrans, 4);
});

test('boîte d’entrée (Arrivages) : fort potentiel d’abord, écartés en dernier, jamais deux du même groupe à la suite', () => {
  const l = ['dessin:a:riso', 'dessin:a:trait', 'gamme:x', 'photo:visage', 'gamme:fort'].map((cle) => ({ cle }));
  const r = ordonnerBoiteEntree(l, { potentiel: (k) => (k === 'gamme:fort' ? 4.5 : null), regles: (k) => ({ effet: 0, ecarte: k === 'photo:visage' }) });
  assert.deepEqual(r.map((x) => x.cle), ['gamme:fort', 'dessin:a:riso', 'gamme:x', 'dessin:a:trait', 'photo:visage']);
});

test('purge > 180 jours', () => {
  const l = [{ ...ex('gamme:a', 0, 'note'), le: '2026-01-01T00:00:00.000Z' }, ex('gamme:b', 0, 'note')];
  assert.deepEqual(purgerExpositions(l, '2026-10-09T00:00:00.000Z').map((x) => x.cle), ['gamme:b']);
});

// ---------------------------------------------------------------------------------------------------------------
// Règles apprises
// ---------------------------------------------------------------------------------------------------------------

test('attributs : profil d’harmonie, saturation des gammes, alertes', () => {
  assert.equal(cleHarmonie('typo:police:revue'), 'police:revue');
  assert.equal(cleHarmonie('details:densite:compacte'), 'details.densite:compacte');
  assert.equal(cleHarmonie('composant:soins:grille'), 'v.soins:grille');
  assert.ok(saturationHex('#ff0000') > 0.99 && saturationHex('#808080') === 0);
  assert.ok((attributsDeCle('gamme:pasteque').profil?.e ?? 0) >= 0.6);
  assert.deepEqual(attributsDeCle('photo:x', { alertes: { 'photo:x': ['visage-reconnaissable'] } }).alertes, ['visage-reconnaissable']);
});

const ATTR: Record<string, { profil?: { d?: number }; saturation?: number; alertes?: string[] }> = {
  'details:jeu:dense1': { profil: { d: 0.6 } }, 'details:jeu:dense2': { profil: { d: 0.5 } }, 'details:jeu:dense3': { profil: { d: 0.7 } }, 'details:jeu:aere': { profil: { d: -0.5 } },
  'photo:visage': { alertes: ['visage-reconnaissable'] }, 'gamme:vive': { saturation: 0.9 },
};
const attr = (k: string) => ATTR[k] ?? {};

test('règle « Trop chargé » : 3 retours concordants → active, plafonnée, réversible ; sans cible → inactive', () => {
  const s: SignalRetour[] = ['details:jeu:dense1', 'details:jeu:dense2', 'details:jeu:dense3'].map((k) => ({ cles: [k], etiquettes: ['trop-charge'], negatif: true, source: 'note' }));
  const r = apprendreRegles(s, attr);
  const d = r.find((x) => x.id === 'densite-forte')!;
  assert.equal(d.active, true);
  assert.equal(d.support, 3);
  assert.equal(d.effet, -0.45);
  assert.deepEqual(effetRegles('details:jeu:dense1', r, attr), { effet: -0.45, ecarte: false, raisons: ['densite-forte'] });
  assert.equal(effetRegles('details:jeu:aere', r, attr).effet, 0);
  // Désactivée : listée, sans effet
  const off = apprendreRegles(s, attr, { desactivees: ['densite-forte'] });
  assert.equal(off.find((x) => x.id === 'densite-forte')!.active, false);
  assert.equal(effetRegles('details:jeu:dense1', off, attr).effet, 0);
  // Deux retours seulement : pas encore de règle
  assert.equal(apprendreRegles(s.slice(0, 2), attr).find((x) => x.id === 'densite-forte')!.active, false);
  // Mots-clés du commentaire, sur des éléments non denses : cohérence trop faible
  const flou: SignalRetour[] = [1, 2, 3, 4].map(() => ({ cles: ['details:jeu:aere'], texte: 'trop chargé', negatif: true, source: 'note' }));
  assert.equal(apprendreRegles([...s, ...flou], attr).find((x) => x.id === 'densite-forte')!.active, false);
});

test('règles « écarter » (visage), pénalités, plafond cumulé, contraintes du sourcing', () => {
  const s: SignalRetour[] = [1, 2, 3].flatMap(() => [
    { cles: ['photo:visage'], texte: 'on voit son visage', negatif: true, source: 'arrivage' as const },
    { cles: ['gamme:vive'], etiquettes: ['couleur-criarde'], negatif: true, source: 'note' as const },
  ]);
  const r = apprendreRegles(s, attr);
  assert.deepEqual(r.filter((x) => x.active).map((x) => x.id).sort(), ['gammes-saturees', 'photos-visage']);
  const p = penalitesRegles(['photo:visage', 'gamme:vive', 'gamme:sobre'], r, attr);
  assert.deepEqual(p.ecartes, ['photo:visage']);
  assert.equal(p.penalites['gamme:vive'], -0.45);
  assert.equal(p.penalites['gamme:sobre'], undefined);
  const c = contraintesSourcing(r);
  assert.equal(c.saturationMax, 0.55);
  assert.equal(respecteContraintes({ saturation: 0.7 }, [], c), 'gammes-saturees');
  assert.equal(respecteContraintes({ saturation: 0.4 }, ['posing'], c), 'photos-visage');
  assert.equal(respecteContraintes({ saturation: 0.4 }, ['foot'], c), null);
});

test('signaux depuis les retours et mots fréquents non compris', () => {
  const s = signauxDepuisRetours({
    notes: [{ cle: 'gamme:a', note: 2, texte: 'vraiment kitsch' }, { cle: 'gamme:b', note: 4 }],
    expositions: [{ cle: 'photo:x', resultat: 'refuse', etiquettes: ['photo-visage'], surface: 'arrivages' }, { cle: 'photo:y', resultat: 'choisi' }],
    duels: [{ perdant: ['gamme:c'], gagnant: ['gamme:d'], mauvais: false, etiquettes: ['fade'] }],
    consignes: [],
  });
  assert.deepEqual(s.map((x) => `${x.source}:${x.negatif}`), ['note:true', 'note:false', 'duel:true', 'arrivage:true']);
  const m = motsFrequents([1, 2, 3].map(() => ({ cles: ['x:y'], texte: 'Typographie bancale, trop chargé', negatif: true, source: 'note' as const })));
  assert.deepEqual(m.map((x) => `${x.mot}:${x.couvert}`), ['bancale:false', 'charge:true', 'typographie:false']);
});

// ---------------------------------------------------------------------------------------------------------------
// Preuve : Paul synthétique
// ---------------------------------------------------------------------------------------------------------------

test('simulation « Paul synthétique » (200 écrans mélangés) : répétition < 5 %, qualité présentée en hausse, classement pas moins bon', () => {
  for (const graine of [1, 2]) {
    const a = simulerPolitique({ graine, mode: 'avant' }), b = simulerPolitique({ graine, mode: 'apres' });
    assert.ok(a.tauxRepetition > 0.2, `avant ${a.tauxRepetition}`);
    assert.ok(b.tauxRepetition < 0.05, `après ${b.tauxRepetition}`);
    assert.ok(b.qualiteMoyenne > a.qualiteMoyenne, `qualité ${a.qualiteMoyenne} → ${b.qualiteMoyenne}`);
    assert.ok(b.partMauvais < a.partMauvais);
    assert.ok(b.apprentissage.at(-1)!.precisionTop >= a.apprentissage.at(-1)!.precisionTop - 0.03);
  }
});
