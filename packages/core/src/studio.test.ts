import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inventaireStudio, inventaireAssets, etiquettesDuType, titresAssets } from './assets';
import { CATEGORIES_RETOURS, categorieDuType } from './retours';
import { blocsPourCle, clesStructure, compositionInitiale, compositionPourCle, estCleStudio, lireCleStructure, ETIQUETTES_STUDIO, FAMILLES_COMPOSANTS } from './recettes';
import { empreinteAsset, instantaneAsset } from './avant-apres';
import { typeDeCle } from './assets-poids';
import { VARIANTES_SECTIONS } from './modeles';

test('studio : inventaire des structures de pages, éléments et effets, clés uniques et connues', () => {
  const l = inventaireStudio();
  const cles = l.map((a) => a.cle);
  assert.equal(new Set(cles).size, cles.length);
  for (const a of l) {
    assert.ok(estCleStudio(a.cle), a.cle);
    assert.equal(typeDeCle(a.cle), a.type);
    assert.equal(a.rendu.kind, 'studio');
  }
  // Chaque famille d'éléments (dont rendez-vous / contact et formes des cartes) a 3 variantes au moins dans la tuile « Éléments »
  for (const f of FAMILLES_COMPOSANTS) assert.ok(l.filter((a) => a.type === 'composant' && a.soins.includes(f)).length >= (['soins', 'accueil', 'praticiens', 'faq', 'infos', 'pied', 'actualites'].includes(f) ? 3 : 4), f);
  assert.equal(l.filter((a) => a.type === 'effets' && !a.cle.startsWith('effets:surfaces-') && !a.cle.startsWith('effets:photos-')).length, 4);
  // Traitements des photos (6 × avec / sans grain) : notables depuis la garantie d'inventaire (inventaire-garantie.test.ts)
  assert.equal(l.filter((a) => a.cle.startsWith('effets:photos-')).length, 12);
  // Hors de la bibliothèque des illustrations
  assert.ok(!inventaireAssets().some((a) => a.rendu.kind === 'studio'));
  assert.ok(titresAssets()['composant:contact:bandeau']);
});

test('studio : tuiles « Structures de pages », « Éléments », « Effets » et étiquettes du studio', () => {
  assert.equal(categorieDuType('structure'), 'pages');
  assert.equal(categorieDuType('composant'), 'elements');
  assert.equal(categorieDuType('effets'), 'effets');
  assert.ok(CATEGORIES_RETOURS.some((c) => c.id === 'elements'));
  assert.deepEqual(etiquettesDuType('composant').map((e) => e.id), ETIQUETTES_STUDIO.map((e) => e.id));
});

test('studio : une clé de structure se relit (lireCleStructure) et recompose la même structure (compositionPourCle → clesStructure)', () => {
  const x = compositionInitiale({ sujets: ['sport', 'enfant'], principaux: 2 });
  const tableau = { ...x, structure: 'clair-pratique' as const };
  for (const a of inventaireStudio().filter((s) => s.type === 'structure').slice(0, 400)) {
    const lu = lireCleStructure(a.cle);
    assert.ok(lu, a.cle);
    const y = compositionPourCle(tableau, a.cle);
    assert.ok(clesStructure(y).includes(a.cle), a.cle);
  }
  assert.equal(lireCleStructure('structure:acces:inconnu'), null);
  assert.equal(lireCleStructure('composant:horaires:carte'), null);
  // Élément : seule sa variante change ; effets : seul le jeu change
  const y = compositionPourCle(tableau, 'composant:contact:carte');
  assert.equal(y.sections.variantes.contact, 'carte');
  assert.equal(compositionPourCle(tableau, 'effets:vivant').effets, 'vivant');
  assert.deepEqual(compositionPourCle(tableau, 'composant:contact:inconnu'), tableau);
});

test('studio : blocs montrés pour un élément seul (aperçu) et empreintes (avant / après) des feuilles du core', () => {
  assert.deepEqual(blocsPourCle('composant:horaires:bandeau'), ['acces']);
  assert.deepEqual(blocsPourCle('composant:contact:flottant'), ['contact']);
  assert.equal(blocsPourCle('structure:accueil:modele-carte-une'), undefined);
  assert.equal(blocsPourCle('effets:doux'), undefined);
  const l = inventaireStudio();
  const eff = l.find((a) => a.cle === 'effets:vivant')!;
  assert.match(empreinteAsset(eff) ?? '', /^[0-9a-f]{8}$/);
  assert.match(empreinteAsset(l.find((a) => a.cle === 'composant:soins-forme:bulles')!) ?? '', /^[0-9a-f]{8}$/);
  assert.equal(empreinteAsset(l.find((a) => a.cle === 'composant:horaires:carte')!), null);
  assert.equal(instantaneAsset(eff), null);
  for (const v of VARIANTES_SECTIONS.contact) assert.ok(estCleStudio(`composant:contact:${v}`));
});
