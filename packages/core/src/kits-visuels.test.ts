// Kits multi-visuels (kits-visuels.ts) : vivier multi-types, exclusions, héritage base / variantes, cohérence de style, animations
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  composerKitVisuel, estCureVisuel, etatVivierVisuels, kitVisuelCompact, noteHeritee, notesVisuels, registreDuVivier, suggestionsVisuels, visuelsARattacher, vivierVisuels,
  type DonneesVisuels,
} from './kits-visuels';
import { inventaireAssets } from './assets';
import { SOURCES_ANIMATIONS } from './animations-sources';
import { definirContexteImages, viderContexteImages } from './contexte-images';
import { jeuVisuel } from './jeux';
import type { StatutIllustration } from './illustrations';

afterEach(() => viderContexteImages());
const visuels = inventaireAssets();
const aj = (...cles: string[]) => Object.fromEntries(cles.map((k) => [k, { ajouts: ['semelles'], retraits: [] }]));
const SOINS = { semelles: ['semelles-orthopediques', 'bilan-podologique'] };
const valides = (...cles: string[]): Record<string, StatutIllustration> => Object.fromEntries(cles.map((k) => [k, 'valide' as StatutIllustration]));

test('vivier multi-types : rattaché au sujet ou au soin (#slug), jamais exclu ; état par type', () => {
  const d: DonneesVisuels = {
    visuels, soins: SOINS,
    surcharges: aj('dessin:semelle:releve', 'heros:semelles:releve', 'picto:hallux-ongle', 'animation:semelle', 'dessin:semelle:pedagogique'),
    hashtags: { 'picto:orthonyxie': ['semelles-orthopediques'] },
    notes: { 'dessin:semelle:pedagogique': { m: 2, n: 1 } },
  };
  const v = vivierVisuels('semelles', d);
  assert.deepEqual(v.illustration.map((x) => x.cle).sort(), ['dessin:semelle:releve', 'heros:semelles:releve']);
  assert.deepEqual(v.icone.map((x) => x.cle).sort(), ['picto:hallux-ongle', 'picto:orthonyxie'], 'hashtag du soin rattache au sujet');
  assert.deepEqual(v.animation.map((x) => x.cle), ['animation:semelle']);
  assert.ok(!estCureVisuel(visuels.find((a) => a.cle === 'dessin:semelle:pedagogique')!, 'semelles', d), '≤ 2 ★ : exclue');
  assert.ok(!estCureVisuel(visuels.find((a) => a.cle === 'dessin:semelle:releve')!, 'semelles', { ...d, statuts: { 'dessin:semelle': 'retire' } }), 'base retirée : variante exclue');
  assert.equal(etatVivierVisuels('semelles', d, 2), 'Semelles : 2 illustrations, 2 icônes, 1 animation, 2 photos');
  // Non rattaché : jamais (même avec le soin par défaut de l'inventaire)
  assert.ok(!vivierVisuels('semelles', { visuels, soins: SOINS }).illustration.length);
});

test('héritage base → variantes : note héritée, une seule variante par base dans le kit', () => {
  const notes = notesVisuels([{ cle: 'dessin:semelle', note: 5 }, { cle: 'dessin:semelle', note: 4 }]);
  assert.equal(noteHeritee('dessin:semelle:releve', notes), 4.5);
  assert.equal(noteHeritee('dessin:semelle:releve', { 'dessin:semelle:releve': { m: 3, n: 1 }, ...notes }), 3);
  const d: DonneesVisuels = { visuels, soins: SOINS, notes, surcharges: aj('dessin:semelle:releve', 'dessin:semelle:pedagogique', 'ligne:pied-profil') };
  const k = composerKitVisuel('semelles', d, { registre: null });
  const bases = k.illustrations.map((e) => e.cle.split(':').slice(0, 2).join(':'));
  assert.equal(bases.filter((b) => b === 'dessin:semelle').length, 1, 'pas de doublon de la base');
});

test('cohérence : un seul style d’illustration dans le kit', () => {
  const d: DonneesVisuels = {
    visuels, soins: SOINS,
    surcharges: aj('dessin:semelle:releve', 'heros:semelles:releve', 'heros:semelles:pedagogique', 'dessin:semelle:pedagogique', 'materiel:tapis-de-course:pedagogique', 'dessin:semelle-paire:riso'),
    notes: { 'heros:semelles:pedagogique': { m: 5, n: 2 }, 'dessin:semelle:pedagogique': { m: 4.5, n: 1 } },
  };
  const k = composerKitVisuel('semelles', d);
  assert.equal(k.registre, 'pedagogique');
  for (const e of [k.heros!, ...k.illustrations]) assert.ok(e.cle.endsWith(':pedagogique'), e.cle);
  assert.equal(registreDuVivier(vivierVisuels('semelles', d).illustration), 'pedagogique');
  // Style imposé par la recette
  assert.ok(composerKitVisuel('semelles', d, { registre: 'releve' }).illustrations.every((e) => e.cle.endsWith(':releve') || e.cle.startsWith('ligne:')));
});

test('animations : jamais pour un praticien tant que leurs images de base ne sont pas validées ; Paul : badge « à valider »', () => {
  const ingr = SOURCES_ANIMATIONS.semelle.map((s) => s.cle);
  const d: DonneesVisuels = { visuels, soins: SOINS, surcharges: aj('animation:semelle', 'dessin:semelle:releve') };
  const paul = composerKitVisuel('semelles', d);
  assert.equal(paul.animations[0]?.cle, 'animation:semelle');
  assert.equal(paul.animations[0]?.aValider, true);
  assert.equal(composerKitVisuel('semelles', d, { praticien: true }).animations.length, 0);
  assert.equal(composerKitVisuel('semelles', d, { praticien: true }).illustrations.length, 0, 'praticien : visuels validés seulement');
  const ok = composerKitVisuel('semelles', { ...d, statuts: valides(...ingr) }, { praticien: true });
  assert.equal(ok.animations[0]?.cle, 'animation:semelle');
  assert.ok(ok.illustrations.some((e) => e.cle === 'dessin:semelle:releve'));
  // Le kit illustré du sujet prime sur le dessin par défaut (jeu visuel) ; animation d'en-tête du kit
  const c = kitVisuelCompact(ok);
  assert.equal(c.dessins?.['semelles-orthopediques'], 'semelle');
  definirContexteImages({ kits: { soins: { sujet: 'pedicurie', dessins: { 'soins-de-pedicurie': 'ongle' }, animation: 'semelle' } } });
  const j = jeuVisuel('soins');
  assert.equal(j.soins['soins-de-pedicurie'].dessin, 'ongle');
});

test('compléter : ordre des suggestions, rattacher les bien notés avant le voisin, visuels exclus jamais', () => {
  const d: DonneesVisuels = {
    visuels, soins: SOINS, surcharges: aj('picto:hallux-ongle', 'picto:orthonyxie', 'picto:plante'),
    hashtags: { 'picto:plante': ['semelles-orthopediques'] }, notes: { 'picto:plante': { m: 4.5, n: 1 }, 'picto:hallux-ongle': { m: 3.6, n: 1 } },
  };
  const k = { ...composerKitVisuel('semelles', d), icones: [] };
  const s = suggestionsVisuels(k, 'soin:semelles-orthopediques', 'icone', d);
  assert.deepEqual(s.map((x) => [x.cle, x.rang]), [['picto:plante', 1], ['picto:hallux-ongle', 2], ['picto:orthonyxie', 3]]);
  // Vivier vide : d'abord les icônes notées ≥ 4 ★ du sujet implicite, pas encore rattachées
  const semelle = visuels.find((a) => a.type === 'picto' && a.soins.includes('semelles-orthopediques'));
  if (semelle) {
    const d2: DonneesVisuels = { visuels, soins: SOINS, notes: { [semelle.cle]: { m: 5, n: 1 } } };
    const l = visuelsARattacher(d2, 'semelles', ['icone']);
    assert.ok(l.some((x) => x.cle === semelle.cle));
    const s2 = suggestionsVisuels({ ...composerKitVisuel('semelles', d2), icones: [] }, 'infos', 'icone', d2);
    assert.ok(s2.length && s2.every((x) => x.rang === 6 && x.aRattacher));
    assert.ok(!suggestionsVisuels({ ...composerKitVisuel('semelles', d2), icones: [] }, 'infos', 'icone', { ...d2, statuts: { [semelle.cle]: 'retire' } }).some((x) => x.cle === semelle.cle));
  }
});
