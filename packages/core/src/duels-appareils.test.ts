import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appareilDimension, appareilUnique, PART_APPAREIL_UNIQUE_MOBILE, tirerAppareilUnique, duelMobileSeulement, effetAvecMobile, PART_DUELS_MOBILES, porteeMobile, renfortsDuelsMobiles } from './duels-appareils';
import { DIMENSIONS_DUEL, MODES_DUEL, type Duel } from './duels';
import { FAMILLES_COMPOSANTS } from './recettes';

test('table dimension → appareil : tailles, densité, menus, barre du bas, cartes, premier écran sur téléphone', () => {
  for (const d of ['typo:echelle', 'typo:casse', 'typo:interlettrage', 'typo', 'details', 'menu', 'polices', 'composant:contact', 'composant:soins-forme', 'composant:accueil', 'composant:entete-anim', 'composant:portraits']) {
    assert.equal(appareilDimension(d), 'mobile', d);
  }
  for (const d of ['couleurs', 'effets', 'traitement', 'visuels', 'composant:galerie', 'composant:article', 'photo', 'style', null]) assert.equal(appareilDimension(d), 'les-deux', String(d));
  // Toute dimension tirable a une réponse (table totale)
  const toutes = [...Object.values(DIMENSIONS_DUEL).flat(), ...MODES_DUEL.flatMap((m) => m.dimensions), ...FAMILLES_COMPOSANTS.map((f) => `composant:${f}`)];
  for (const d of toutes) assert.ok(['ordinateur', 'mobile', 'les-deux'].includes(appareilDimension(d)));
  assert.ok(MODES_DUEL.find((m) => m.id === 'tailles')!.dimensions.every((d) => appareilDimension(d) === 'mobile'));
});

test('part des duels mobiles et série « Mobile seulement »', () => {
  assert.equal(PART_DUELS_MOBILES, 0.4);
  assert.ok(duelMobileSeulement('typo:echelle', 0.39));
  assert.ok(!duelMobileSeulement('typo:echelle', 0.41));
  assert.ok(duelMobileSeulement('typo:echelle', 0.9, { serie: true }));
  assert.ok(!duelMobileSeulement('couleurs', 0, { serie: true }));
  assert.ok(duelMobileSeulement('menu', 0.7, { part: 0.8 }));
  // Proportion mesurée sur une grille uniforme
  const n = Array.from({ length: 1000 }, (_, i) => duelMobileSeulement('menu', i / 1000)).filter(Boolean).length;
  assert.equal(n, 400);
});

const duel = (appareil: string, resultat: Duel['resultat'], a: string, b: string): Duel => ({
  type: 'theme', scenario: { sujets: ['senior'] }, aCle: 'compo:a', bCle: 'compo:b', aIngredients: { atelier: [a] }, bIngredients: { atelier: [b] }, dimension: 'menu', resultat, appareil,
});

test('apprentissage mobile : duels sur téléphone seulement, portée de la clé', () => {
  const m = renfortsDuelsMobiles([duel('mobile', 'a', 'menu=mobile:panneau', 'menu=mobile:tiroir'), duel('mobile', 'a', 'menu=mobile:panneau', 'menu=mobile:tiroir'), duel('ordinateur', 'b', 'menu=mobile:panneau', 'menu=mobile:tiroir')]);
  assert.ok(m['menu=mobile:panneau'] > 0 && m['menu=mobile:tiroir'] < 0);
  assert.ok(Object.values(m).every((v) => Math.abs(v) <= 0.5));
  assert.deepEqual(renfortsDuelsMobiles([duel('ordinateur', 'a', 'menu=mobile:panneau', 'menu=mobile:tiroir')]), {});
  assert.equal(porteeMobile('menu=mobile:panneau'), 1);
  assert.equal(porteeMobile('variante=contact:barre'), 1);
  assert.equal(porteeMobile('typo=echelle:spectaculaire'), 0.5);
  assert.equal(porteeMobile('menu=ordinateur:centre'), 0);
  assert.equal(porteeMobile('gamme=cobalt'), 0);
  assert.equal(effetAvecMobile({ 'menu=mobile:panneau': 0.2 }, { 'menu=mobile:panneau': 0.3 }, 'menu=mobile:panneau'), 0.5);
  assert.equal(effetAvecMobile({ 'typo=echelle:modeste': 0.2 }, { 'typo=echelle:modeste': 0.4 }, 'typo=echelle:modeste'), 0.4);
  assert.equal(effetAvecMobile({ 'gamme=cobalt': 0.2 }, { 'gamme=cobalt': 0.4 }, 'gamme=cobalt'), 0.2);
  assert.equal(effetAvecMobile(undefined, null, 'x'), 0);
});

test('un seul appareil par duel : pages complètes et thèmes libres, 60 % téléphone', () => {
  assert.ok(appareilUnique('page:acces') && appareilUnique('page-libre:fiche') && appareilUnique(null));
  assert.ok(!appareilUnique('polices') && !appareilUnique('composant:horaires'));
  assert.equal(PART_APPAREIL_UNIQUE_MOBILE, 0.6);
  const n = Array.from({ length: 1000 }, (_, i) => tirerAppareilUnique(i / 1000)).filter((x) => x === 'mobile').length;
  assert.equal(n, 600);
});
