import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMUN, estCommunParNature, filtrerParProfession, fusionnerRattachements, ingredientPourProfession, lignesAjout, lignesRetrait, partageDeLIngredient,
  professionsDeLIngredient, rattachementsDepuisHashtags, rattachementsDepuisLignes, suggestionsDePartage,
} from './professions-ingredients';
import { packProfession, PACKS_PROFESSIONS, textesProvisoiresDuPack, verifierPackPubliable } from './packs-professions';
import { PROFESSIONS } from './professions';

const PHOTO = 'photo:enfant-qui-marche';
const ICONE = 'picto:ongle';
const GAMME = 'gamme:canard';

test('ingrédients : défaut = podologue (visuels), commun par nature (palettes, polices, mises en page, éléments)', () => {
  assert.deepEqual(professionsDeLIngredient(PHOTO), ['podologue']);
  assert.deepEqual(professionsDeLIngredient(GAMME), [COMMUN]);
  assert.ok(estCommunParNature('typo:fraunces') && estCommunParNature('structure:a') && !estCommunParNature(ICONE));
});

test('ingrédients : filtrage par profession (ingrédients de la profession + communs)', () => {
  const liste = [{ cle: PHOTO }, { cle: ICONE }, { cle: GAMME }];
  assert.deepEqual(filtrerParProfession(liste, 'podologue').map((a) => a.cle), [PHOTO, ICONE, GAMME]);
  assert.deepEqual(filtrerParProfession(liste, 'psychomotricien').map((a) => a.cle), [GAMME]);
  // Alias des leads
  assert.ok(ingredientPourProfession(PHOTO, 'pedicure-podologue'));
});

test('ingrédients : partage d’une photo entre deux professions (« Aussi pour Psychomotricien »), puis retrait', () => {
  const ajout = lignesAjout([PHOTO, PHOTO, GAMME], 'psychomotricien');
  assert.deepEqual(ajout, [{ cle_asset: PHOTO, profession: 'psychomotricien', action: 'ajout' }]); // jamais un commun, jamais en double
  const r = rattachementsDepuisLignes(ajout);
  assert.deepEqual(professionsDeLIngredient(PHOTO, r).sort(), ['podologue', 'psychomotricien']);
  assert.equal(partageDeLIngredient(PHOTO, 'psychomotricien', r), 'partage');
  assert.equal(partageDeLIngredient(PHOTO, 'podologue', r), 'partage');
  assert.equal(partageDeLIngredient(ICONE, 'podologue', r), 'propre');
  assert.equal(partageDeLIngredient(ICONE, 'psychomotricien', r), 'autre');
  assert.equal(partageDeLIngredient(GAMME, 'psychomotricien', r), 'commun');
  assert.deepEqual(lignesAjout([PHOTO], 'psychomotricien', r), []);
  // Journal : la ligne la plus récente (première) fait foi
  const r2 = rattachementsDepuisLignes([{ cle_asset: PHOTO, profession: 'podologue', action: 'retrait' }, ...ajout]);
  assert.deepEqual(professionsDeLIngredient(PHOTO, r2), ['psychomotricien']);
  // Jamais la dernière profession retirée
  assert.deepEqual(lignesRetrait([PHOTO], 'psychomotricien', r2), []);
  assert.equal(lignesRetrait([PHOTO], 'podologue', r).length, 1);
});

test('ingrédients : hashtags #profession-… des propositions de Claude, fusion avec la table', () => {
  const h = rattachementsDepuisHashtags({ [ICONE]: ['enfant', 'profession-psychomotricien'], [PHOTO]: ['profession-pedicure-podologue'] });
  assert.deepEqual(h[ICONE].ajouts, ['psychomotricien']);
  assert.deepEqual(h[PHOTO].ajouts, ['podologue']);
  const table = rattachementsDepuisLignes([{ cle_asset: ICONE, profession: 'psychomotricien', action: 'retrait' }]);
  const f = fusionnerRattachements(table, h);
  assert.ok(!ingredientPourProfession(ICONE, 'psychomotricien', f)); // la table l'emporte
});

test('suggestions de partage : enfant, marche, équilibre → psychomotricien ; refus mémorisé ; communs exclus', () => {
  const cible = { profession: 'psychomotricien', motsCles: packProfession('psychomotricien').motsClesPartage };
  const candidats = [
    { cle: PHOTO, titre: 'Enfant qui marche pieds nus', sujets: ['enfant'], hashtags: ['equilibre'] },
    { cle: ICONE, titre: 'Ongle incarné', sujets: ['ongles'] },
    { cle: GAMME, titre: 'Canard enfant' },
  ];
  const s = suggestionsDePartage(candidats, cible);
  assert.deepEqual(s.map((x) => x.cle), [PHOTO]);
  assert.ok(s[0].raisons.length >= 2);
  const refus = rattachementsDepuisLignes([{ cle_asset: PHOTO, profession: 'psychomotricien', action: 'refus' }]);
  assert.deepEqual(suggestionsDePartage(candidats, cible, refus), []);
  // Un refus ne retire pas l'ingrédient de ses professions
  assert.deepEqual(professionsDeLIngredient(PHOTO, refus), ['podologue']);
});

test('packs : un pack par profession du registre ; podologue publiable ; psychomotricien provisoire, non publiable', () => {
  for (const p of PROFESSIONS) assert.ok(PACKS_PROFESSIONS[p.id], `pack manquant : ${p.id}`);
  assert.equal(packProfession('pedicure-podologue').profession, 'podologue');
  assert.equal(packProfession('inconnue').profession, 'podologue');
  assert.deepEqual(textesProvisoiresDuPack(packProfession('podologue')), []);
  assert.ok(verifierPackPubliable('podologue').ok);
  const v = verifierPackPubliable('psychomotricien');
  assert.ok(!v.ok && v.erreurs.length > 3);
  // Aucun mot de la podologie dans le pack psychomotricien
  assert.ok(!/podolog|pédicur|pied/i.test(JSON.stringify(packProfession('psychomotricien'))));
});
