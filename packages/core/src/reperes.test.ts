import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIMENSIONS_DUEL_TIRABLES, repereCle, repereConnu, repereDimension, repereTheme, valeursDuel, ZONES_APERCU } from './reperes';
import { DIMENSIONS_DUEL, MODES_DUEL } from './duels';
import { FAMILLES_COMPOSANTS, compositionInitiale, type CompositionRecette } from './recettes';
import { inventaireStudio, inventaireAssets } from './assets';

test('chaque dimension tirable par un duel a un repère explicite, libellé en langage simple', () => {
  const toutes = new Set([...Object.values(DIMENSIONS_DUEL).flat(), ...MODES_DUEL.flatMap((m) => m.dimensions), ...FAMILLES_COMPOSANTS.map((f) => `composant:${f}`), 'photo', 'style', 'version']);
  for (const d of toutes) {
    assert.ok(DIMENSIONS_DUEL_TIRABLES.includes(d), `${d} absente de DIMENSIONS_DUEL_TIRABLES`);
    assert.ok(repereConnu(d), `${d} sans entrée dans la table`);
    const r = repereDimension(d);
    assert.ok(r.libelle.length > 3 && !r.libelle.includes(':'), `${d} : libellé ${r.libelle}`);
    assert.ok(r.ensemble || r.selecteurs.length > 0, `${d} : ni encadré ni « ensemble »`);
  }
});

test('libellés et zones attendus', () => {
  assert.equal(repereDimension('traitement').libelle, 'le traitement des photos');
  assert.ok(repereDimension('traitement').selecteurs.includes('.ap img'));
  assert.equal(repereDimension('composant:accueil').libelle, 'le premier écran');
  assert.ok(repereDimension('composant:accueil').selecteurs.includes('[data-zone="premier-ecran"]'));
  assert.equal(repereDimension('composant:soins-forme').libelle, 'la forme des cartes de soins');
  assert.ok(repereDimension('composant:horaires').selecteurs.includes('[data-zone="acces"]'));
  assert.ok(repereDimension('polices').selecteurs.includes('.ap-h1'));
  assert.ok(repereDimension('menu').selecteurs.includes('.mn-entete'));
  // Duel libre : pas d'encadré
  const libre = repereDimension(null);
  assert.equal(libre.ensemble, true);
  assert.deepEqual(libre.selecteurs, []);
  assert.match(libre.libelle, /tout le thème/);
});

test('nouvelles familles couvertes par préfixe (premiers écrans, animations d’en-tête, famille inconnue)', () => {
  assert.equal(repereDimension('composant:entete-anim').libelle, 'l’animation d’en-tête');
  assert.ok(repereDimension('composant:entete-anim').selecteurs.includes('.hp'));
  assert.match(repereCle('composant:accueil:organique-fondu').libelle, /^le premier écran « /);
  assert.match(repereCle('composant:entete-anim:vague').libelle, /^l’animation d’en-tête « vague »$/);
  assert.equal(repereDimension('variante:contraste').libelle, 'le contraste de l’illustration');
  assert.ok(repereConnu('variante:couleur') && repereConnu('variante:style'));
  assert.equal(repereDimension('variante:trait').ensemble, true);
  const inconnue = repereDimension('composant:temoignages');
  assert.deepEqual(inconnue.selecteurs, ['[data-zone="temoignages"]']);
});

test('chaque élément notable a un « Vous notez » ; les éléments de page sont encadrés', () => {
  const titres = new Map([...inventaireStudio(), ...inventaireAssets({ photosJeux: [] })].map((a) => [a.cle, a.titre]));
  for (const [cle, titre] of titres) {
    const r = repereCle(cle, titre);
    assert.ok(r.libelle && !r.libelle.includes('undefined'), `${cle} : ${r.libelle}`);
    if (cle.startsWith('menu:') || (cle.startsWith('effets:') && !cle.startsWith('effets:surfaces-'))) assert.ok(r.selecteurs.length, `${cle} sans encadré`);
    if (cle.startsWith('effets:surfaces-')) assert.ok(r.selecteurs.length || r.ensemble, cle);
    if (/^composant:(?!fiche|theme|article|paire)/.test(cle)) assert.ok(r.selecteurs.length, `${cle} sans encadré`);
  }
  assert.equal(repereCle('typo:police:revue').libelle, 'la paire de polices « Revue à empattements »');
  assert.equal(repereCle('effets:photos-duotone').libelle, 'le traitement photo « Duotone »');
  assert.match(repereCle('menu:ordinateur:centre').libelle, /^le menu sur ordinateur « /);
  assert.match(repereCle('menu:mobile:tiroir').libelle, /^le menu sur téléphone « /);
  assert.equal(repereTheme('Sport corail').libelle, 'le thème complet « Sport corail »');
  // Sélecteurs bien formés (une zone = au moins un sélecteur)
  for (const [z, l] of Object.entries(ZONES_APERCU)) assert.ok(l.length > 0, z);
});

test('valeurs lisibles A / B des duels de compositions', () => {
  const a: CompositionRecette = compositionInitiale({ sujets: ['sport'], principaux: 1, couleursPreferees: [] }, 7);
  const b: CompositionRecette = { ...a, police: a.police === 'revue' ? 'grotesque' : 'revue' };
  const v = valeursDuel('polices', a, b)!;
  assert.ok(v[0] !== v[1] && v.includes('Revue à empattements'));
  assert.equal(valeursDuel(null, a, b), null);
  const c = { ...a, sections: { ...a.sections, variantes: { ...a.sections.variantes, horaires: 'bandeau' as const } } };
  const d = { ...a, sections: { ...a.sections, variantes: { ...a.sections.variantes, horaires: 'liste' as const } } };
  assert.deepEqual(valeursDuel('composant:horaires', c, d), ['Bandeau', 'Liste, jour courant en évidence']);
});
