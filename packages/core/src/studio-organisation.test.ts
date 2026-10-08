import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ameliorationsNouvelles, appreciationDeNote, APPRECIATIONS, ETIQUETTES_AMELIORER, groupeDeCle, GROUPES_STUDIO, NOTE_ZONES_PAGE, normaliserAmeliorations,
  nombreZones, noteAppreciation, rangerParGroupe,
} from './studio-organisation';
import { DIMENSIONS_RECETTE, FAMILLES_COMPOSANTS, PAGES_STRUCTURE } from './recettes';
import { estEtiquetteZone } from './zones';
import { renfortsPoids } from './recettes';

test('registre : chaque dé connu du studio a un groupe, les nouveaux dés de premier écran se rangent seuls', () => {
  assert.equal(groupeDeCle('couleurs'), 'couleurs');
  assert.equal(groupeDeCle('polices'), 'typographie');
  assert.equal(groupeDeCle('hab:typo:casse'), 'typographie');
  assert.equal(groupeDeCle('traitement'), 'visuels');
  assert.equal(groupeDeCle('animation'), 'premier-ecran');
  assert.equal(groupeDeCle('composant:accueil'), 'premier-ecran');
  assert.equal(groupeDeCle('composant:transition'), 'premier-ecran');
  assert.equal(groupeDeCle('composant:sections'), 'premier-ecran');
  // Dé « Animation d'en-tête » ajouté par un autre lot : aucune modification du Studio nécessaire
  assert.equal(groupeDeCle('composant:entete-anim'), 'premier-ecran');
  assert.equal(groupeDeCle('composant:horaires'), 'structure');
  assert.equal(groupeDeCle('page:accueil'), 'structure');
  assert.equal(groupeDeCle('hab:menu:telephone'), 'structure');
  assert.equal(groupeDeCle('hab:details:coins'), 'details');
  assert.equal(groupeDeCle('effets'), 'details');
  assert.equal(groupeDeCle('inconnu'), 'structure');
  for (const d of DIMENSIONS_RECETTE) assert.ok(GROUPES_STUDIO.some((g) => g.id === groupeDeCle(d.id)), d.id);
  for (const f of FAMILLES_COMPOSANTS) assert.ok(groupeDeCle(`composant:${f}`));
  for (const p of PAGES_STRUCTURE) assert.equal(groupeDeCle(`page:${p.id}`), 'structure');
  const g = rangerParGroupe([{ cle: 'effets' }, { cle: 'couleurs' }, { cle: 'composant:accueil' }]);
  assert.deepEqual(g.map((x) => x.rangees.map((r) => r.cle)), [['couleurs'], [], [], ['composant:accueil'], [], ['effets']]);
});

test('appréciation : note de la recette et retour', () => {
  assert.deepEqual(APPRECIATIONS.map((a) => noteAppreciation(a.id)), [5, 3, 2]);
  assert.equal(noteAppreciation(null), null);
  assert.equal(appreciationDeNote(5), 'elegante');
  assert.equal(appreciationDeNote(3), 'correcte');
  assert.equal(appreciationDeNote(1), 'a-revoir');
  assert.equal(appreciationDeNote(4), null);
  // Correcte = 3 = moyenne de référence : aucun renfort ; Élégante renforce, À revoir affaiblit, toujours plafonné
  const r = renfortsPoids([{ note: 3, atelier: ['a'], assets: [] }, { note: 5, atelier: ['b'], assets: [] }, { note: 2, atelier: ['c'], assets: [] }]);
  assert.equal(r.atelier.a, undefined);
  assert.ok(r.atelier.b > 0 && r.atelier.b <= 0.75);
  assert.ok(r.atelier.c < 0 && r.atelier.c >= -0.75);
  assert.ok(NOTE_ZONES_PAGE >= 1 && NOTE_ZONES_PAGE < 3);
});

test('zones à améliorer : étiquettes rapides connues, normalisation, seuls les lots modifiés sont journalisés', () => {
  for (const e of ETIQUETTES_AMELIORER) assert.ok(estEtiquetteZone(e), e);
  const z = { forme: 'rect', x: 0.1, y: 0.1, l: 0.3, h: 0.2, etiquette: 'trop-charge', commentaire: '  trop   de cartes ', appareil: 'ordinateur' };
  const l = normaliserAmeliorations([
    { onglet: 'accueil', page: 'accueil', appareil: 'ordinateur', zones: [z] },
    { onglet: 'accueil', page: 'accueil', appareil: 'mobile', zones: [] },
    { onglet: 'theme:sport', page: 'theme', appareil: 'mobile', zones: [{ ...z, etiquette: 'inconnue' }] },
    { onglet: 'accueil', page: 'accueil', appareil: 'ordinateur', zones: [z] },
    { onglet: 'X', page: 'accueil', appareil: 'ordinateur', zones: [z] },
  ]);
  assert.equal(l.length, 2);
  assert.equal(l[0].zones[0].commentaire, 'trop de cartes');
  assert.equal(l[1].zones[0].etiquette, 'a-revoir');
  assert.equal(l[1].zones[0].appareil, 'mobile');
  assert.equal(nombreZones(l), 2);
  assert.deepEqual(normaliserAmeliorations('rien'), []);
  assert.deepEqual(ameliorationsNouvelles(l, l), []);
  const modif = [l[0], { ...l[1], zones: [{ ...l[1].zones[0], commentaire: 'autre' }] }];
  assert.deepEqual(ameliorationsNouvelles(l, modif).map((a) => a.onglet), ['theme:sport']);
  assert.equal(ameliorationsNouvelles([], l).length, 2);
});
