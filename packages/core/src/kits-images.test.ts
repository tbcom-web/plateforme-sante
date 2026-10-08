// Kits d'images (kits-images.ts) et exclusion stricte des photos ≤ 2 ★ / retirées sur TOUS les chemins qui posent une photo
// (contexte-images.ts) : pack de spécialité, jeu visuel (premier écran, panorama, galerie, soins, couvertures), personnalisation par un
// jeu de photos, photos d'une recette, tirages (studio, atelier, duels, recettes à noter), kits.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { clesImagesExclues, definirContexteImages, imageExclue, viderContexteImages } from './contexte-images';
import { composerKit, kitCompact, kitsCompacts, photosDuKit, renfortsKits, seriePhoto, kitsGardes } from './kits-images';
import { fusionnerPack, packVisuel, SPECIALITES } from './packs';
import { jeuVisuel } from './jeux';
import { completerJeuVisuel, persoDuJeuPhotos, PHOTOS_INTEGREES } from './jeux-photos';
import { alea, appliquerRecette, compositionInitiale, photosIntegreesBanque, tirerPhotos, choisirStyle, type ContexteRecette, type PhotoBanque } from './recettes';
import { draftVide } from './draft';
import { clePhoto } from './assets-poids';

afterEach(() => viderContexteImages());

const banque: PhotoBanque[] = photosIntegreesBanque();
// Couche 1 (curation) simulée : chaque photo intégrée étiquetée par Paul avec ses sujets (assets_sujets)
const surcharges = Object.fromEntries(banque.map((p) => [clePhoto(p.url)!, { ajouts: [...p.sujets], retraits: [] }]));
const toutesPhotosDuJeu = (j: ReturnType<typeof jeuVisuel>) => [j.accueil.photo, j.panorama.photo, ...j.galerie.map((g) => g.photo), ...Object.values(j.soins).map((s) => s.photo), ...Object.values(j.photosDessins).map((p) => p.photo)];

test('clés exclues : moyenne ≤ 2, dernière note ≤ 2 (lignes les plus récentes d’abord), retirée, à retravailler', () => {
  const e = clesImagesExclues([
    { cle: 'photo:a', note: 1 }, { cle: 'photo:a', note: 4 },        // dernière note 1 → exclue
    { cle: 'photo:b', note: 5 }, { cle: 'photo:b', note: 1 },        // dernière 5, moyenne 3 → gardée
    { cle: 'photo:c', note: 2 }, { cle: 'photo:c', note: 2 },
    { cle: 'heros:sport:releve', statut: 'retire' }, { cle: 'photo:d', statut: 'a_retravailler' },
  ]);
  assert.deepEqual([...e].sort(), ['heros:sport:releve', 'photo:a', 'photo:c', 'photo:d']);
});

test('exclusion stricte sur tous les chemins : aucune photo exclue ne sort (packs, jeux visuels, jeu de photos, recette, tirages, kits)', () => {
  // Exclut la moitié des photos intégrées, dont toutes celles posées par défaut sur le premier écran des spécialités
  const exclues = new Set([...SPECIALITES.map((s) => clePhoto(s.photos.accueil)!), ...PHOTOS_INTEGREES.filter((_, i) => i % 2 === 0).map((u) => clePhoto(u)!)]);
  definirContexteImages({ exclues });
  const ex = (u: string) => imageExclue(u);
  for (const s of SPECIALITES) {
    const p = fusionnerPack(packVisuel(s.value), null);
    assert.ok(![p.photos.accueil, p.photos.panorama, ...p.photos.diaporama].some(ex), `pack ${s.value}`);
    const j = jeuVisuel(s.value, 'enfant');
    assert.ok(!toutesPhotosDuJeu(j).some(ex), `jeu visuel ${s.value}`);
    const perso = persoDuJeuPhotos({ photos: { accueil: PHOTOS_INTEGREES[0], panorama: PHOTOS_INTEGREES[2], galerie: PHOTOS_INTEGREES.slice(0, 6), soins: { laser: PHOTOS_INTEGREES[4] } } });
    const jp = completerJeuVisuel(jeuVisuel(s.value, null, perso), perso);
    assert.ok(!toutesPhotosDuJeu(jp).some(ex), `jeu de photos ${s.value}`);
  }
  // Recette : photos exclues jamais posées sur le site ni l'aperçu
  const c: ContexteRecette = { sujets: ['sport'], principaux: 1, photos: banque };
  const x = { ...choisirStyle(compositionInitiale(c), 'photos', c), photos: PHOTOS_INTEGREES.slice(0, 6) };
  const a = appliquerRecette({ ...draftVide(), priorites: { principaux: ['sport'], secondaires: [] } }, x);
  assert.ok(!(a?.draft.theme.photosRecette ?? []).some(ex), 'photos de la recette');
  // Tirages (studio, atelier, duels, recettes à noter), tous modes
  for (const modeTirage of ['favoris', 'equilibre', 'decouverte'] as const) for (let g = 0; g < 30; g++) {
    assert.ok(!tirerPhotos({ ...c, modeTirage }, alea(g, 'p'), 6).some(ex), `tirage ${modeTirage}`);
  }
  // Kits
  for (const s of ['sport', 'enfant', 'general']) assert.ok(!photosDuKit(composerKit(s, { banque, exclues, surcharges })).some(ex), `kit ${s}`);
});

test('kit : sujet + hashtag + emplacement, pas de doublon ni de quasi-identique, trous signalés, complément « général » affiché', () => {
  const sport = banque.filter((p) => p.sujets.includes('sport'));
  const cles = sport.map((p) => clePhoto(p.url)!);
  const hashtags: Record<string, string[]> = { [cles[1]]: ['podologie-du-sport'], [cles[2]]: ['cabinet'] };
  const notes = { [cles[0]]: { m: 4.5, n: 2 }, [cles[1]]: { m: 4, n: 1 }, [cles[2]]: { m: 3.5, n: 1 } };
  const k = composerKit('sport', { banque, hashtags, notes, surcharges }, 0, ['podologie-du-sport', 'k-taping']);
  assert.equal(k.photos.find((p) => p.emplacement === 'accueil')?.url, sport[0].url, 'premier écran : la mieux notée');
  assert.equal(k.photos.find((p) => p.emplacement === 'soin:podologie-du-sport')?.url, sport[1].url, 'soin : la photo étiquetée #podologie-du-sport');
  assert.ok(k.trous.some((t) => t.includes('#k-taping')), 'soin sans photo étiquetée : trou signalé');
  assert.ok(!k.photos.some((p) => p.emplacement === 'soin:k-taping'), 'jamais de photo non étiquetée pour un soin');
  const urls = k.photos.map((p) => p.url);
  assert.equal(new Set(urls).size, urls.length, 'aucun doublon');
  const series = k.photos.map((p) => seriePhoto(p.url, p.cle));
  assert.equal(new Set(series).size, series.length, 'aucune photo quasi identique');
  // Sujet pauvre en photos : complété par « général », signalé
  const d = composerKit('diabete', { banque, surcharges });
  if (d.complement) assert.ok(d.trous[0].includes('complété'));
  // Forme compacte : premier écran, galerie, soins
  const kc = kitCompact(k);
  assert.equal(kc.accueil, sport[0].url);
  assert.equal(kc.soins?.['podologie-du-sport'], sport[1].url);
  assert.ok(Object.keys(kitsCompacts({ banque, surcharges })).includes('sport'));
});

test('kit : rotation du premier écran (rang), kit gardé repris en rang 0, notes de kit → photos', () => {
  const premiers = new Set([0, 1, 2, 3].map((r) => composerKit('general', { banque, surcharges }, r).photos.find((p) => p.emplacement === 'accueil')?.url));
  assert.ok(premiers.size >= 3, `rotation : ${premiers.size}`);
  const autre = composerKit('general', { banque, surcharges }, 2);
  const g = kitsGardes([{ sujet: 'general', note: 5, garder: true, photos: autre.photos, le: '2026-10-08' }]);
  const k0 = composerKit('general', { banque, gardes: g, surcharges }, 0);
  assert.ok(k0.garde);
  assert.equal(k0.photos.find((p) => p.emplacement === 'accueil')?.url, autre.photos.find((p) => p.emplacement === 'accueil')?.url);
  const r = renfortsKits([{ sujet: 'general', note: 5, garder: true, photos: autre.photos }]);
  assert.ok(Object.values(r.assets).every((v) => v > 0 && v <= 0.5));
  assert.ok(Object.keys(r.assets).length >= 3);
});

test('registre : le kit du sujet passe avant les photos par défaut de la spécialité, après la personnalisation', () => {
  const k = composerKit('enfant', { banque, surcharges }, 1);
  definirContexteImages({ kits: { enfant: kitCompact(k) } });
  const j = jeuVisuel('enfant');
  assert.equal(j.accueil.photo, kitCompact(k).accueil);
  const perso = { photos: { accueil: PHOTOS_INTEGREES[3], panorama: '', diaporama: [] } };
  assert.equal(jeuVisuel('enfant', null, perso).accueil.photo, PHOTOS_INTEGREES[3]);
  // Tirage « Favoris d'abord » : les photos du kit suivent le premier écran
  const t = tirerPhotos({ sujets: ['enfant'], principaux: 1, photos: banque }, alea(1, 'p'), 6);
  assert.ok(photosDuKit(k).slice(0, 2).some((u) => t.includes(u)));
});

test('couche 2 : le kit n’assemble que le vivier curé (étiqueté par Paul, retenu, non exclu)', () => {
  // Sans étiquette de Paul : aucune photo, l'illustration porte le premier écran
  assert.equal(composerKit('sport', { banque }).photos.length, 0);
  const sport = banque.filter((p) => p.sujets.includes('sport'));
  const une = clePhoto(sport[0].url)!;
  const k = composerKit('sport', { banque, surcharges: { [une]: { ajouts: ['sport'], retraits: [] } } });
  assert.deepEqual(k.photos.map((p) => p.url), [sport[0].url]);
  // Étiquetée puis retirée du sujet, ou exclue : jamais
  assert.equal(composerKit('sport', { banque, surcharges: { [une]: { ajouts: ['sport'], retraits: ['sport'] } } }).photos.length, 0);
  assert.equal(composerKit('sport', { banque, surcharges: { [une]: { ajouts: ['sport'], retraits: [] } }, exclues: new Set([une]) }).photos.length, 0);
  // Hashtag #sport posé par Paul : curée aussi
  assert.equal(composerKit('sport', { banque, hashtags: { [une]: ['sport'] } }).photos.length, 1);
});
