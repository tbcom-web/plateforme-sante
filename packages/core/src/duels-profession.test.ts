// Duels A/B par profession (migration 0051) : profession lue et validée, apprentissage filtré comme la Dégustation (goût de la
// profession + dimensions transversales + éléments communs aux deux professions).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duelDepuisLigne, validerDuel, type Duel } from './duels';
import { duelsPourApprentissage, professionDuDuel } from './degustation';

const base = (x: Partial<Duel>): Duel => ({ type: 'typo', scenario: { sujets: ['sport'] }, aCle: 'compo:aaaaaaaaaaaaaaaa', bCle: 'compo:bbbbbbbbbbbbbbbb', aIngredients: {}, bIngredients: {}, dimension: 'polices', resultat: 'a', ...x });

test('duels : profession validée (format du registre), absente des lignes d’avant', () => {
  const v = validerDuel({ type: 'photo', resultat: 'a', aCle: 'photo:x', bCle: 'photo:y', profession: 'psychomotricien' });
  assert.ok(v.ok && v.duel.profession === 'psychomotricien');
  const w = validerDuel({ type: 'photo', resultat: 'a', aCle: 'photo:x', bCle: 'photo:y', profession: 'Psycho Motricien' });
  assert.ok(w.ok && w.duel.profession === undefined);
  const l = duelDepuisLigne({ type: 'photo', resultat: 'b', a_cle: 'photo:x', b_cle: 'photo:y', dimension_differente: 'photo', created_at: '2026-10-09T10:00:00Z' });
  assert.equal(l?.profession, undefined);
  assert.equal(professionDuDuel(l!, 'podologue'), 'podologue');
  assert.equal(duelDepuisLigne({ type: 'photo', resultat: 'b', a_cle: 'photo:x', b_cle: 'photo:y', profession: 'psychomotricien' })?.profession, 'psychomotricien');
});

test('apprentissage : profession choisie + transversal + éléments communs ; sans profession : tout', () => {
  const podoPhoto = base({ type: 'photo', aCle: 'photo:pied', bCle: 'photo:enfant', dimension: 'photo' });
  const podoCommun = base({ type: 'photo', aCle: 'photo:enfant', bCle: 'photo:marche', dimension: 'photo' });
  const podoPolices = base({ dimension: 'polices' });
  const podoStyle = base({ type: 'theme', dimension: 'style' });
  const psyStyle = base({ type: 'theme', dimension: 'style', profession: 'psychomotricien' });
  const tous = [podoPhoto, podoCommun, podoPolices, podoStyle, psyStyle];
  const pourPsy = new Set(['photo:enfant', 'photo:marche']);
  assert.deepEqual(duelsPourApprentissage(tous, 'psychomotricien', 'podologue', (c) => pourPsy.has(c)), [podoCommun, podoPolices, psyStyle]);
  assert.deepEqual(duelsPourApprentissage(tous, 'podologue', 'podologue'), [podoPhoto, podoCommun, podoPolices, podoStyle]);
  assert.equal(duelsPourApprentissage(tous, null, 'podologue').length, 5);
});
