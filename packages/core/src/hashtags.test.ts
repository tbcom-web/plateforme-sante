import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appliquerHashtag, assetsDuHashtag, completerHashtag, correspondHashtag, frequencesAvecVocabulaire, frequencesHashtags, hashtagsDepuisLignes, hashtagsValides, HASHTAGS_MAX, lireHashtags,
  markdownHashtags, normaliserHashtag, suggestionsHashtags,
} from './hashtags';

test('hashtags : normalisation (minuscules, sans accents ni espaces, tirets, 2 à 30 caractères)', () => {
  assert.equal(normaliserHashtag('#Pédicurie'), 'pedicurie');
  assert.equal(normaliserHashtag('Running Shoes'), 'running-shoes');
  assert.equal(normaliserHashtag('chaussure_de_sport'), 'chaussure-de-sport');
  assert.equal(normaliserHashtag('  ##Trail--Run- '), 'trail-run');
  assert.equal(normaliserHashtag('cœur'), 'coeur');
  assert.equal(normaliserHashtag('pied d’athlète'), 'pied-d-athlete');
  assert.equal(normaliserHashtag('x'), null, 'trop court');
  assert.equal(normaliserHashtag('a'.repeat(31)), null, 'trop long');
  assert.equal(normaliserHashtag('a'.repeat(30)), 'a'.repeat(30));
  assert.equal(normaliserHashtag('!!!'), null);
  assert.equal(normaliserHashtag(42), null);
});

test('hashtags : lecture d’une saisie (« #a #b » ou « a, b »), doublons, maximum', () => {
  assert.deepEqual(lireHashtags('#trail #sneakers').hashtags, ['trail', 'sneakers']);
  assert.deepEqual(lireHashtags('trail, sneakers; Trail').hashtags, ['trail', 'sneakers']);
  assert.deepEqual(lireHashtags('#trail#plage').hashtags, ['trail', 'plage']);
  assert.deepEqual(lireHashtags('ok x').rejetes, ['x']);
  const beaucoup = Array.from({ length: 20 }, (_, i) => `tag${i}`).join(' ');
  assert.equal(lireHashtags(beaucoup).hashtags.length, HASHTAGS_MAX);
  assert.deepEqual(hashtagsValides(['#Trail', 'trail', 'x', 3, 'Plage']), ['trail', 'plage']);
  assert.deepEqual(hashtagsValides('trail'), []);
});

test('hashtags : suggestions (tags Pixabay, description Pexels, requête), sans les choisis', () => {
  assert.deepEqual(suggestionsHashtags({ tags: ['running shoes', 'Sport', 'x'], requete: 'trail running' }, ['sport']), ['running-shoes', 'trail-running']);
  assert.deepEqual(suggestionsHashtags({ tags: [], description: 'A person running on a mountain trail', requete: 'trail' }), ['running', 'mountain', 'trail']);
  assert.ok(suggestionsHashtags({ tags: Array.from({ length: 20 }, (_, i) => `tag${i}`) }).length <= 8);
});

test('hashtags : autocomplétion (début puis milieu, fréquence)', () => {
  const connus = { trail: 3, 'trail-running': 1, sneakers: 2, portrait: 5 };
  assert.deepEqual(completerHashtag('tr', connus), ['trail', 'trail-running', 'portrait']);
  assert.deepEqual(completerHashtag('#T', connus, ['trail']), ['trail-running', 'portrait']);
  assert.deepEqual(completerHashtag('', connus, [], 2), ['portrait', 'trail']);
  assert.deepEqual(completerHashtag('sn', ['sneakers', 'plage']), ['sneakers']);
});

test('hashtags : état courant = dernière action, assets d’un hashtag (fonction pure du générateur)', () => {
  const lignes = [
    { cle: 'photo:b', hashtag: 'trail', action: 'ajout', le: '2026-10-07T10:00:00Z' },
    { cle: 'photo:a', hashtag: 'trail', action: 'ajout', le: '2026-10-07T10:01:00Z' },
    { cle: 'photo:a', hashtag: 'plage', action: 'ajout', le: '2026-10-07T10:02:00Z' },
    { cle: 'photo:b', hashtag: 'trail', action: 'retrait', le: '2026-10-07T10:03:00Z' },
    { cle: 'dessin:x', hashtag: 'trail', action: 'ajout', le: '2026-10-07T10:04:00Z' },
    { cle: 'photo:c', hashtag: 'X!', action: 'ajout', le: '2026-10-07T10:05:00Z' },
    { cle: 'photo:c', hashtag: 'ok', action: 'autre', le: '2026-10-07T10:05:00Z' },
  ];
  const etat = hashtagsDepuisLignes(lignes);
  assert.deepEqual(etat, { 'dessin:x': ['trail'], 'photo:a': ['plage', 'trail'] });
  assert.deepEqual(hashtagsDepuisLignes([...lignes].reverse()), etat, 'ordre de lecture indifférent (dates)');
  assert.deepEqual(assetsDuHashtag(etat, '#Trail'), ['dessin:x', 'photo:a']);
  assert.deepEqual(assetsDuHashtag(etat, 'trail', ['photo:a', 'photo:z']), ['photo:a']);
  assert.deepEqual(assetsDuHashtag(etat, 'inconnu'), []);
  assert.deepEqual(assetsDuHashtag(null, 'trail'), []);
  assert.deepEqual(frequencesHashtags(etat), { trail: 2, plage: 1 });
  assert.ok(correspondHashtag(etat, 'photo:a', '#plage'));
  assert.ok(!correspondHashtag(etat, 'photo:a', 'pla'));
  assert.ok(correspondHashtag(etat, 'photo:a', 'pla', true));
  assert.ok(correspondHashtag(etat, 'photo:z', ''), 'filtre vide : tout passe');
  const e2 = appliquerHashtag(appliquerHashtag(etat, 'photo:a', 'plage', 'retrait'), 'photo:a', 'trail', 'retrait');
  assert.ok(!('photo:a' in e2));
  assert.deepEqual(appliquerHashtag(etat, 'photo:z', 'mer', 'ajout')['photo:z'], ['mer']);
});

test('hashtags : synthèse Markdown', () => {
  const md = markdownHashtags({ 'photo:a': ['trail'], 'dessin:x': ['trail', 'plage'] }, { titres: { 'dessin:x': 'Pied' } });
  assert.match(md, /^## Hashtags des visuels/);
  assert.match(md, /- #trail \(2\) : `dessin:x` Pied, `photo:a`/);
  assert.match(markdownHashtags({}), /Aucun hashtag/);
});

test('autocomplétion du tri : hashtags utilisés d’abord, puis vocabulaire métier normalisé', () => {
  const f = frequencesAvecVocabulaire({ 'photo:a': ['laser-co2', 'trail'], 'photo:b': ['trail'] }, ['Laser', 'orthonyxie', 'Verrue', 'trail', 'k taping']);
  assert.deepEqual(f, { 'laser-co2': 1, trail: 2, laser: 0, orthonyxie: 0, verrue: 0, 'k-taping': 0 });
  assert.deepEqual(completerHashtag('las', f), ['laser-co2', 'laser']);
  assert.deepEqual(completerHashtag('', f, [], 3), ['trail', 'laser-co2', 'k-taping']);
});
