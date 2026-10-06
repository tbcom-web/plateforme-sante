import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appliquerProposition, appliquerReglages, basculerCouleur, COULEURS_PREFEREES, gammesDesCouleurs, lotsPropositions, normaliserCouleursPreferees,
  propositionParId, propositionsModeles, REGLES_THEMES, stylesCompatibles, type Proposition,
} from './propositions';
import { gamme, verifierGamme, verifierTeinteSombre } from './gammes';
import { verifierCouleursGabarit } from './gabarits';
import { modeleIntegre } from './modeles';
import { universCatalogue, appliquerUnivers } from './catalogue-univers';
import { draftVide, normaliserDraft } from './draft';
import { THEMES } from './themes';

const ACTIFS = THEMES.filter((t) => t.statut === 'actif').map((t) => t.id);
const entree = (principaux: string[], couleursPreferees: string[] = [], secondaires: string[] = []) => ({ priorites: { principaux, secondaires }, couleursPreferees });

/** Contraintes d'un lot : 3 structures, 3 gammes, 3 styles différents */
function verifierLot(lot: Proposition[], msg: string) {
  assert.equal(lot.length, 3, msg);
  assert.equal(new Set(lot.map((p) => p.univers)).size, 3, `${msg} : structures`);
  assert.equal(new Set(lot.map((p) => p.gamme)).size, 3, `${msg} : gammes`);
  assert.equal(new Set(lot.map((p) => p.style)).size, 3, `${msg} : styles`);
  assert.equal(new Set(lot.map((p) => p.nom)).size, 3, `${msg} : noms`);
  for (const p of lot) {
    assert.ok(stylesCompatibles(p.univers).includes(p.style), `${msg} : ${p.id} style incompatible`);
    assert.ok(p.animation === null || (p.univers === 'technique-precis' && p.style === 'releve'), `${msg} : animation hors Technique relevé`);
    assert.notEqual(p.animation, 'trajectoire', 'jamais l’animation de posture');
    assert.ok(p.phrase.length < 110 && !/meilleur|garanti|miracle|!/i.test(p.phrase), p.phrase);
  }
}

test('chaque sujet n° 1 : 3 propositions vraiment différentes, une sobre et une vitaminée', () => {
  for (const id of [...ACTIFS, null]) {
    const lot = propositionsModeles(entree(id ? [id] : []));
    verifierLot(lot, String(id));
    assert.ok(lot.some((p) => p.famille === 'sobre') && lot.some((p) => p.famille === 'vitaminee'), `${id} : sobre + vitaminée`);
    if (id) assert.ok(lot.every((p) => p.heros === id), `${id} : héros du sujet n° 1`);
  }
});

test('règles par sujet', () => {
  const sport = propositionsModeles(entree(['sport']));
  const tech = sport.find((p) => p.univers === 'technique-precis');
  assert.ok(tech && tech.style === 'releve' && tech.animation === 'coureur', 'sport : Technique, relevé, coureur');
  assert.equal(sport[0].nom, 'Foulée');
  for (const lot of lotsPropositions(entree(['diabete'], ['rouge', 'rose']), 10)) {
    for (const p of lot) {
      assert.notEqual(p.style, 'releve', 'diabète : jamais de relevé (rouge « pic »)');
      assert.notEqual(p.univers, 'technique-precis');
      assert.ok(!['pasteque', 'corail', 'corail-nuit', 'pistache'].includes(p.gamme), `diabète : ${p.gamme}`);
    }
  }
  assert.ok(propositionsModeles(entree(['enfant'])).some((p) => p.style === 'pedagogique' && p.famille === 'vitaminee'), 'enfant : doux et vitaminé');
  assert.equal(propositionsModeles(entree(['senior']))[0].univers, 'simple-proche');
  assert.ok(propositionsModeles(entree(['semelles'])).some((p) => p.animation === 'semelle'));
  assert.ok(propositionsModeles(entree(['ongles'])).some((p) => p.univers === 'elegant-sobre' && ['pedagogique', 'ligne'].includes(p.style)));
  // Sujet n° 2 : nuance (animation de remplacement quand le n° 1 n'en a pas)
  const ped = lotsPropositions(entree(['pedicurie', 'sport']), 30).flat().filter((p) => p.univers === 'technique-precis' && p.style === 'releve');
  assert.ok(ped.some((p) => p.animation === 'coureur' && p.nuances.length), 'animation tirée du sujet n° 2');
});

test('posture (sujet différé) : jamais prise en compte', () => {
  const avec = propositionsModeles(entree(['posture', 'sport']));
  assert.deepEqual(avec.map((p) => p.id.replace(/^[^~]+/, '')), propositionsModeles(entree(['sport'])).map((p) => p.id.replace(/^[^~]+/, '')));
  assert.ok(avec.every((p) => p.heros === 'sport'));
  assert.equal(REGLES_THEMES.posture, undefined);
});

test('déterminisme et graine', () => {
  const e = entree(['sport', 'enfant'], ['corail']);
  assert.deepEqual(lotsPropositions(e, 4), lotsPropositions(e, 4));
  assert.deepEqual(lotsPropositions(e, 2), lotsPropositions(e, 4).slice(0, 2), 'les lots déjà vus ne changent pas');
  assert.ok(lotsPropositions(e, 3, { graine: 7 }).length === 3);
});

test('couleurs choisies : le premier lot les couvre', () => {
  const l = propositionsModeles(entree(['sport'], ['corail', 'bleu']));
  verifierLot(l, 'sport corail bleu');
  assert.ok(l[0].couleurs.includes('corail'), l[0].gamme);
  assert.ok(l[1].couleurs.includes('bleu'), l[1].gamme);
  const une = propositionsModeles(entree(['senior'], ['vert']));
  assert.ok(une.filter((p) => p.couleurs.includes('vert')).length >= 2, une.map((p) => p.gamme).join());
  // Diabète et rouge : version adoucie
  const d = propositionsModeles(entree(['diabete'], ['rouge']));
  assert.ok(['terracotta', 'sable'].includes(d[0].gamme), d[0].gamme);
  assert.ok(gammesDesCouleurs(entree(['diabete'], ['corail'])).every((g) => !['corail', 'corail-nuit', 'pasteque'].includes(g)));
});

test('« Charger plus » : lots sans doublon, quasi illimités, contrastes AA garantis', () => {
  for (const id of ACTIFS) {
    const lots = lotsPropositions(entree([id], [], ['senior']), 40);
    assert.ok(lots.length >= 12, `${id} : ${lots.length} lots`);
    const ids = lots.flat().map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${id} : doublon`);
    lots.slice(0, 12).forEach((l, i) => verifierLot(l, `${id} lot ${i}`));
    for (const p of lots.flat()) {
      const g = gamme(p.gamme)!;
      assert.deepEqual(verifierGamme(g), [], p.gamme);
      const m = modeleIntegre(universCatalogue(p.univers)!.preReglage.modele);
      assert.deepEqual(verifierCouleursGabarit(m, { couleur: g.accent, gamme: g.id }), [], `${p.univers} × ${p.gamme}`);
      if (m.jetons.teinte === 'gamme') assert.deepEqual(verifierTeinteSombre({ couleur: g.accent, gamme: g.id }), [], `teinte ${p.gamme}`);
    }
  }
});

test('application au brouillon et relecture', () => {
  const e = entree(['sport']);
  const p = propositionsModeles(e).find((x) => x.univers === 'technique-precis')!;
  assert.deepEqual(propositionParId(e, p.id), p);
  assert.equal(propositionParId(e, 'sport~inconnu'), null);
  const d = appliquerUnivers(draftVide(), universCatalogue(p.univers)!, { autoriserNonValide: true }).draft;
  const x = appliquerProposition(d, p);
  assert.equal(x.theme.gamme, p.gamme);
  assert.equal(x.theme.registre, 'releve');
  assert.equal(x.theme.animationAccueil, 'coureur');
  assert.equal(x.theme.proposition, p.id);
  // Style incompatible avec Technique : ramené au relevé
  assert.equal(appliquerReglages(x, { style: 'ligne' }).theme.styleIllustration, 'releve');
  // Rétrocompatibilité : relu par normaliserDraft
  const relu = normaliserDraft(JSON.parse(JSON.stringify({ ...x, couleursPreferees: ['corail', 'x!'] })));
  assert.equal(relu.theme.proposition, p.id);
  assert.deepEqual(relu.couleursPreferees, ['corail']);
  assert.equal(normaliserDraft({ version: 2, theme: { animationAccueil: 'trajectoire' } }).theme.animationAccueil, undefined);
});

test('couleurs préférées : 3 au plus, dans l’ordre', () => {
  assert.ok(COULEURS_PREFEREES.length >= 12 && COULEURS_PREFEREES.length <= 16);
  let l: string[] = [];
  for (const c of ['bleu', 'corail', 'vert', 'jaune']) l = basculerCouleur(l, c);
  assert.deepEqual(l, ['bleu', 'corail', 'vert']);
  assert.deepEqual(basculerCouleur(l, 'corail'), ['bleu', 'vert']);
  assert.deepEqual(normaliserCouleursPreferees(['bleu', 'bleu', 'zzz']), ['bleu']);
  assert.equal(normaliserCouleursPreferees(undefined), undefined);
  for (const c of COULEURS_PREFEREES) for (const [g] of c.gammes) assert.ok(gamme(g), `${c.id} → ${g}`);
});
