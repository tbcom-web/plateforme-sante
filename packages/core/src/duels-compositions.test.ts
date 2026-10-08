import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classementsParContexte, TYPES_DUEL, MODES_DUEL, modeDuDuel, modeDuel, uneSeuleDimension, validerDuel, type Duel } from './duels';
import { ajouterPairesApprises, nuancier, pairesDesNotes, pairesDuels, sansNouvelleViolation, varierDuel } from './duels-compositions';
import { cleAssetCombinaison, cleCombinaisonPolicePalette, estCleCombinaison, lireCleCombinaison, toutesCombinaisons } from './combinaisons';
import { clePaireHarmonie, violationsDures } from './harmonie';
import { compositionInitiale, compositionPourCle, estCleStudio, type CompositionRecette } from './recettes';
import { inventaireStudio } from './assets';
import { categorieDeCle } from './retours';
import { repereCle, repereDimension, valeursDuel } from './reperes';

const ctx = (sujets: string[]) => ({ sujets, principaux: 1, couleursPreferees: [] as string[] });

test('modes : palettes, paires de polices, tailles et casse, police × palette ; types enregistrables sans migration', () => {
  assert.deepEqual(MODES_DUEL.map((m) => m.id).slice(0, 4), ['palette', 'polices', 'tailles', 'police-palette']);
  for (const m of MODES_DUEL) {
    assert.ok((TYPES_DUEL as readonly string[]).includes(m.type));
    for (const d of m.dimensions) {
      const v = validerDuel({ type: m.type, resultat: 'a', aCle: 'compo:aaaa', bCle: 'compo:bbbb', dimension: d });
      assert.ok(v.ok && v.duel.dimension === d, `${d} refusée par validerDuel`);
      assert.equal(modeDuDuel({ type: m.type, dimension: d })?.id, m.id);
      assert.ok(!repereDimension(d).libelle.includes(':'));
    }
  }
  assert.equal(modeDuel('tailles')?.dimensions.length, 4);
});

test('une seule dimension : un axe de typographie, ou la paire ET la palette', () => {
  const a = compositionInitiale(ctx(['sport']), 3);
  const t = { ...(a.typo ?? {}) } as NonNullable<CompositionRecette['typo']>;
  const b = { ...a, typo: { ...t, echelle: t.echelle === 'spectaculaire' ? 'modeste' : 'spectaculaire' } } as CompositionRecette;
  assert.ok(uneSeuleDimension(a, b, 'typo:echelle'));
  assert.ok(!uneSeuleDimension(a, b, 'typo:casse'));
  const c = { ...b, typo: { ...b.typo!, casse: b.typo!.casse === 'majuscules' ? 'normale' : 'majuscules' } } as CompositionRecette;
  assert.ok(!uneSeuleDimension(a, c, 'typo:echelle'));
  const p = { ...a, police: a.police === 'revue' ? 'grotesque' : 'revue', gamme: a.gamme === 'cobalt' ? 'sauge' : 'cobalt' } as CompositionRecette;
  assert.ok(uneSeuleDimension(a, p, 'police-couleurs'));
  assert.ok(!uneSeuleDimension(a, { ...a, police: p.police }, 'police-couleurs'));
});

test('variantes tirées : une seule dimension change, jamais de nouvelle violation dure', () => {
  let tirees = 0;
  for (const sujet of ['sport', 'diabete', 'senior', 'enfant']) {
    for (let g = 1; g <= 6; g++) {
      const c = ctx([sujet]);
      const base = compositionInitiale(c, g * 11);
      for (const m of MODES_DUEL) for (const d of m.dimensions) {
        const y = varierDuel(base, d, c, g);
        assert.ok(sansNouvelleViolation(base, y, c), `${sujet} ${d} : violation dure ajoutée`);
        const avant = new Set(violationsDures(base).map((v) => v.code));
        assert.ok(violationsDures(y).every((v) => avant.has(v.code)));
        if (JSON.stringify(y) !== JSON.stringify(base) && uneSeuleDimension(base, y, d)) tirees++;
      }
    }
  }
  assert.ok(tirees > 60, `trop peu de variantes valides : ${tirees}`);
});

test('combinaisons : clés notables et apprises (compatibles avec les paires d’harmonie des recettes complètes)', () => {
  assert.equal(cleCombinaisonPolicePalette('revue', 'cobalt'), clePaireHarmonie('gamme', 'cobalt', 'police', 'revue'));
  const k = cleAssetCombinaison('revue', 'cobalt');
  assert.deepEqual(lireCleCombinaison(k), { police: 'revue', gamme: 'cobalt' });
  assert.ok(estCleCombinaison(k) && estCleStudio(k));
  assert.ok(!estCleCombinaison('typo:combinaison:inconnue.cobalt'));
  assert.equal(compositionPourCle(compositionInitiale(ctx(['sport']), 1), k).police, 'revue');
  const tout = toutesCombinaisons();
  assert.ok(tout.length > 100 && new Set(tout.map((x) => x.cle)).size === tout.length);
  assert.ok(inventaireStudio().some((a) => a.cle === k));
  assert.equal(categorieDeCle({ cle: k, type: 'typo' }), 'combinaisons');
  assert.equal(categorieDeCle({ cle: 'typo:police:revue', type: 'typo' }), 'typographies');
  assert.match(repereCle(k).libelle, /^la combinaison « .* × .* »$/);
});

const duel = (a: string[], b: string[], resultat: Duel['resultat'], dimension = 'police-couleurs'): Duel => ({
  type: 'theme', scenario: { sujets: ['sport'] }, aCle: 'compo:a', bCle: 'compo:b', aIngredients: { atelier: a }, bIngredients: { atelier: b }, dimension, resultat,
});

test('apprentissage des combinaisons : duels et notes → paires d’harmonie, plafonnées', () => {
  const A = ['police=revue', 'gamme=cobalt'], B = ['police=grotesque', 'gamme=sauge'];
  const p = pairesDuels([duel(A, B, 'a'), duel(A, B, 'a'), duel(A, B, 'a')]);
  assert.ok(p['gamme:cobalt&police:revue'] > 0 && p['gamme:sauge&police:grotesque'] < 0);
  assert.ok(Object.values(p).every((v) => Math.abs(v) <= 0.5));
  // Duels d'une autre dimension, gamme libre : ignorés
  assert.deepEqual(pairesDuels([duel(A, B, 'a', 'couleurs'), duel(['police=revue', 'gamme=libre'], B, 'a')]), {});
  const n = pairesDesNotes({ 'typo:combinaison:revue.cobalt': 2, 'gamme:cobalt': 1 });
  assert.deepEqual(n, { 'gamme:cobalt&police:revue': 0.5 });
  const h = ajouterPairesApprises({ global: { familles: {}, ingredients: {}, paires: { 'gamme:cobalt&police:revue': 0.6 } } }, n, p)!;
  assert.equal(h.global.paires!['gamme:cobalt&police:revue'], 0.75);
  assert.equal(ajouterPairesApprises(null), null);
});

test('classements, repères et valeurs lisibles des nouveaux duels', () => {
  const l = classementsParContexte([duel(['police=revue', 'gamme=cobalt'], ['police=grotesque', 'gamme=sauge'], 'a', 'couleurs')], { libelleSujet: () => 'Sport' });
  assert.equal(l[0].titre, 'Meilleures palettes — Sport');
  const l2 = classementsParContexte([{ ...duel([], [], 'a', 'typo:echelle'), type: 'typo', scenario: { sujets: ['senior'] } }], { libelleSujet: () => 'Seniors' });
  assert.equal(l2[0].titre, 'Meilleures échelles de titres — Seniors');
  assert.deepEqual(repereDimension('typo:echelle').selecteurs, ['.ap-h1', '.hp__titre']);
  assert.equal(repereDimension('couleurs').libelle, 'la palette de couleurs');
  const a = compositionInitiale(ctx(['sport']), 2);
  const b = { ...a, typo: { ...(a.typo as object), echelle: 'spectaculaire' } } as CompositionRecette;
  const a2 = { ...a, typo: { ...(a.typo as object), echelle: 'affirmee' } } as CompositionRecette;
  assert.deepEqual(valeursDuel('typo:echelle', a2, b), ['échelle affirmée', 'échelle spectaculaire']);
  assert.equal(nuancier({ gamme: 'cobalt', couleur: '#000000' }).length, 6);
  assert.deepEqual(nuancier({ gamme: '', couleur: '#123456' }), [{ nom: 'Couleur du cabinet', hex: '#123456' }]);
});
