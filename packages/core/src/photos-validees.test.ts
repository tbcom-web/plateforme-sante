import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clesExcluesHorsLigne, contexteImagesHorsLigne, lireManifestePhotos, manifestePhotosValidees } from './photos-validees';

const URL_A = 'https://exemple.supabase.co/storage/v1/object/public/photos/banque/libres/sport/pexels-1-1920.webp';
const URL_B = 'https://exemple.supabase.co/storage/v1/object/public/photos/banque/libres/sport/pexels-2-1920.webp';
const URL_C = 'https://exemple.supabase.co/storage/v1/object/public/photos/banque/libres/diabete/pexels-3-1920.webp';
const cle = (u: string) => `photo:${u.split('/public/photos/')[1]}`;

test('exclusions hors ligne : dernière note ≤ 2 ★ (export chronologique), retirée, à revoir', () => {
  const notes = [
    { cle: 'photo:cabinet-lumiere', note: 1, jour: '2026-10-07' },
    { cle: 'photo:sport-course', note: 1, jour: '2026-10-01' },
    { cle: 'photo:sport-course', note: 5, jour: '2026-10-08' }, // la plus récente l'emporte : moyenne 3, dernière 5
    { cle: 'photo:sport-lacage', note: 5, jour: '2026-10-01' },
  ];
  const ex = clesExcluesHorsLigne(notes, [{ cle: 'heros:diabete-miroir:releve', statut: 'a_revoir' }, { cle: 'photo:soin-talon', statut: 'retire' }, { cle: 'photo:sport-lacage', statut: 'valide' }]);
  assert.ok(ex.has('photo:cabinet-lumiere'));
  assert.ok(!ex.has('photo:sport-course'), 'dernière note 5 ★, moyenne 3 : gardée');
  assert.ok(ex.has('heros:diabete-miroir:releve'), 'à revoir : écarté hors ligne');
  assert.ok(ex.has('photo:soin-talon'));
  assert.ok(!ex.has('photo:sport-lacage'));
});

test('manifeste : photos libres validées et hébergées, ≥ 4 ★, jamais exclues, meilleures d’abord, sans auteur', () => {
  const libres = [
    { url: URL_A, chemin: 'banque/libres/sport/pexels-1-1920.webp', statut: 'validee', sujet: 'sport', source: 'pexels', auteur: 'Personne' },
    { url: URL_B, chemin: 'banque/libres/sport/pexels-2-1920.webp', statut: 'validee', sujet: 'sport', source: 'pexels' },
    { url: URL_C, chemin: 'banque/libres/diabete/pexels-3-1920.webp', statut: 'a_valider', sujet: 'diabete', source: 'pexels' },
  ];
  const notes = [{ cle: cle(URL_A), note: 4 }, { cle: cle(URL_B), note: 5 }, { cle: cle(URL_C), note: 5 }];
  const m = manifestePhotosValidees(libres, notes);
  assert.deepEqual(m.map((p) => p.url), [URL_B, URL_A], 'à valider écartée, 5 ★ d’abord');
  assert.deepEqual(Object.keys(m[0]).sort(), ['cle', 'note', 'notes', 'source', 'sujets', 'url']);
  assert.deepEqual(manifestePhotosValidees(libres, [...notes, { cle: cle(URL_B), note: 1 }]).map((p) => p.url), [URL_A], 'dernière note 1 ★ : exclue');
  assert.deepEqual(lireManifestePhotos({ photos: [...m, { url: 'http://x/y.webp', note: 5, sujets: [] }] }).length, 2);
});

test('contexte hors ligne : vivier 4-5 ★ seulement (manifeste + intégrées bien notées), tous les sujets posés', () => {
  const manifeste = [{ url: URL_A, cle: cle(URL_A), sujets: ['sport'], note: 5, notes: 2, source: 'pexels' }, { url: URL_B, cle: cle(URL_B), sujets: ['sport'], note: 4.5, notes: 2, source: 'pexels' }];
  const c = contexteImagesHorsLigne([{ cle: 'photo:sport-lacage', note: 5 }, { cle: 'photo:sport-trail', note: 3 }, { cle: cle(URL_B), note: 1 }], [], manifeste);
  assert.deepEqual(c.vivier.sport, [URL_A, '/photos/sport-lacage.webp'], 'B (dernière note 1 ★) et trail (3 ★) écartées');
  assert.deepEqual(c.vivier.diabete, [], 'sujet sans photo 4-5 ★ : vivier vide, mais posé');
  assert.ok('general' in c.vivier);
});
