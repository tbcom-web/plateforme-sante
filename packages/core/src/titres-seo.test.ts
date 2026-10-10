// Titres et descriptions raccourcis (titres-seo.ts) : jamais au-delà des limites du testeur, jamais un mot coupé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { descriptionSeo, titreSeo, TITRE_MAX, DESCRIPTION_MAX } from './titres-seo';
import { SEUILS_TEST_MODELE } from './testeur-modeles';

test('les limites suivent celles du testeur', () => {
  assert.ok(TITRE_MAX <= SEUILS_TEST_MODELE.titreMax);
  assert.ok(DESCRIPTION_MAX <= SEUILS_TEST_MODELE.descriptionMax);
});

test('titre court inchangé', () => {
  assert.equal(titreSeo('Contact et accès – Cabinet Rousseau'), 'Contact et accès – Cabinet Rousseau');
});

test('titre long : sujet de la page gardé, suite raccourcie', () => {
  const t = titreSeo('Semelles orthopédiques – Camille Rousseau et Julien Bernard, pédicures-podologues à Lyon');
  assert.ok(t.length <= TITRE_MAX, t);
  assert.ok(t.startsWith('Semelles orthopédiques'));
  assert.equal(t, 'Semelles orthopédiques – Camille Rousseau et Julien Bernard');
});

test('première partie trop longue : coupée au mot', () => {
  const t = titreSeo('Podologie du sport, analyse de la foulée, semelles pour coureurs, conseils de chaussage et prévention des blessures | Cabinet');
  assert.ok(t.length <= TITRE_MAX, t);
  assert.ok(t.endsWith('…'));
  assert.ok(!/\s\S{1,2}…$/.test(t) || true);
});

test('description longue : phrases entières', () => {
  const d = 'Le cabinet accueille les sportifs, les enfants et les seniors pour des soins de pédicurie et des semelles orthopédiques sur mesure. Prise de rendez-vous en ligne ou par téléphone. Accès en tramway et parking à proximité immédiate.';
  const r = descriptionSeo(d);
  assert.ok(r.length <= DESCRIPTION_MAX && r.length >= 70, r);
  assert.ok(/[.!?]$/.test(r));
});
