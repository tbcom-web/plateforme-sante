// Images en situation et structure figée (chaine-images.ts) : aucune transition ni nouvelle version ne change la structure après
// « finaliste » hors retouche ; candidates d'un emplacement (même activité, jamais refusées, validées 4-5 ★ d'abord) ; préférences.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appliquerChoixImages, candidatesDuContexte, candidatesHeros, candidatesPhotos, choixEnVigueur, comptesChoix, controleContraste, emplacementsDe, imageA, memeStructure, STATUTS_STRUCTURE_FIGEE,
  structureFigee, transitionsRespectentStructure, verifierNouvelleVersion, type ChoixImage,
} from './chaine-images';
import { STATUTS_MODELE, TRANSITIONS } from './chaine-modeles';
import type { ElementProfil, KitProfil } from './profils';

const design = { structure: { accueil: 'a' }, gamme: 'g1', couleur: '#123456', police: 'p', visuels: { style: 'photos', herosSujet: null, animation: null }, photos: [], sections: { ordre: ['soins'], variantes: {} }, effets: 'e', traitement: { id: 't' } };

test('structure figée de « finaliste » à « publié » ; candidat et écarté restent libres', () => {
  for (const s of ['finaliste', 'check-agent', 'avis-humain', 'retouche', 'recheck-agent', 'revalidation', 'pret-validation', 'publie']) assert.ok(structureFigee(s), s);
  assert.ok(!structureFigee('candidat'));
  assert.ok(!structureFigee('ecarte'));
  assert.ok(STATUTS_STRUCTURE_FIGEE.every((s) => STATUTS_MODELE.some((x) => x.id === s)));
});

test('aucune transition ne ramène un modèle figé vers la relance de structure', () => {
  assert.ok(transitionsRespectentStructure(TRANSITIONS));
  assert.ok(!transitionsRespectentStructure([...TRANSITIONS, { de: 'avis-humain', vers: 'candidat' }]));
});

test('nouvelle version après finaliste : images seules permises, structure seulement par la retouche', () => {
  const images = { ...design, photos: ['https://x/a.jpg'], visuels: { ...design.visuels, herosSujet: 'sport' } };
  const police = { ...design, police: 'autre' };
  const sections = { ...design, sections: { ordre: ['faq', 'soins'], variantes: {} } };
  for (const statut of STATUTS_STRUCTURE_FIGEE) {
    assert.deepEqual(verifierNouvelleVersion({ statut, base: design, nouvelle: images, origine: 'relance' }), { ok: true }, statut);
    assert.equal(verifierNouvelleVersion({ statut, base: design, nouvelle: police, origine: 'relance' }).ok, false, statut);
    assert.equal(verifierNouvelleVersion({ statut, base: design, nouvelle: sections, origine: 'relance' }).ok, false, statut);
    assert.equal(verifierNouvelleVersion({ statut, base: design, nouvelle: police, origine: 'retouche' }).ok, true, statut);
  }
  // Avant finaliste : relance libre
  assert.equal(verifierNouvelleVersion({ statut: 'candidat', base: design, nouvelle: police, origine: 'relance' }).ok, true);
  // Ordre des clés indifférent
  assert.ok(memeStructure(design, Object.fromEntries(Object.entries({ ...design, photos: ['u'] }).reverse())));
});

const el = (url: string, note: number | null, aValider = false): ElementProfil => ({ cle: `photo:${url}`, famille: 'photo', note, aValider, url });
const kit: KitProfil = {
  profil: 'sport~course', sujet: 'sport', replis: [],
  activites: [{ activite: 'course', hashtag: 'course', libelle: 'Course', familles: { photo: [el('course-3.jpg', 3), el('course-5.jpg', 5), el('course-1.jpg', 1), el('course-av.jpg', 5, true)], illustration: [], icone: [], animation: [] } }],
  generique: { photo: [el('neutre-4.jpg', 4), el('course-5.jpg', 5)], illustration: [], icone: [], animation: [] },
};

test('candidates photos : activité du profil puis neutres, jamais refusées, validées 4-5 ★ d’abord puis à valider', () => {
  const l = candidatesPhotos(kit, 'course');
  assert.deepEqual(l.map((c) => c.image), ['course-5.jpg', 'neutre-4.jpg', 'course-3.jpg', 'course-av.jpg']);
  assert.ok(!l.some((c) => c.image === 'course-1.jpg'), 'jamais une photo 1 ★');
  assert.equal(new Set(l.map((c) => c.image)).size, l.length, 'sans doublon');
  // Choisie ailleurs dans la chaîne : passe devant à rang égal
  assert.deepEqual(candidatesPhotos(kit, 'course', { choisies: { 'neutre-4.jpg': 2 } }).map((c) => c.image).slice(0, 2), ['neutre-4.jpg', 'course-5.jpg']);
  // Jamais une autre activité : le kit d'une autre activité n'apporte rien hors du neutre
  assert.deepEqual(candidatesPhotos({ ...kit, activites: [] }, 'tennis').map((c) => c.image), ['course-5.jpg', 'neutre-4.jpg']);
});

test('candidates de l’illustration du haut : sujets principaux illustrés du profil seulement', () => {
  const l = candidatesHeros(['sport', 'inconnu', 'sport', 'diabete'], { illustre: (s) => s !== 'inconnu', notes: { diabete: 1 } });
  assert.deepEqual(l.map((c) => c.image), ['sport']);
});

test('choix en vigueur et application : seulement des candidates, jamais la structure', () => {
  const lignes: ChoixImage[] = [
    { modele: 'm', profil: 'p', emplacement: 'photo:0', image: 'a.jpg', le: '2026-10-10T10:00:00Z' },
    { modele: 'm', profil: 'p', emplacement: 'photo:0', image: 'b.jpg', le: '2026-10-10T11:00:00Z' },
    { modele: 'm', profil: 'autre', emplacement: 'photo:0', image: 'z.jpg', le: '2026-10-10T12:00:00Z' },
    { modele: 'm', profil: 'p', emplacement: 'heros', image: 'diabete', le: '2026-10-10T11:00:00Z' },
  ];
  const choix = choixEnVigueur(lignes, 'm', 'p');
  assert.deepEqual(choix, { 'photo:0': 'b.jpg', heros: 'diabete' });
  assert.deepEqual(comptesChoix(lignes), { 'a.jpg': 1, 'b.jpg': 1, 'z.jpg': 1, diabete: 1 });
  const rendu = { ...design, visuels: { ...design.visuels, style: 'releve', herosSujet: 'sport' }, photos: ['x.jpg', 'b.jpg', 'y.jpg'] };
  const cand = { photos: [{ image: 'b.jpg', note: 5, valide: true }, { image: 'x.jpg', note: 5, valide: true }], heros: [{ image: 'sport', note: null, valide: true }] };
  const y = appliquerChoixImages(rendu, choix, cand);
  assert.deepEqual(y.photos, ['b.jpg', 'x.jpg', 'y.jpg'], 'échange sans doublon');
  assert.equal((y.visuels as { herosSujet: string }).herosSujet, 'sport', 'héros hors candidates ignoré');
  assert.ok(memeStructure(rendu, y));
  assert.deepEqual(emplacementsDe(rendu), ['heros', 'photo:0', 'photo:1', 'photo:2']);
  assert.equal(imageA(y, 'photo:1'), 'x.jpg');
  assert.equal(imageA(y, 'heros'), 'sport');
});

test('contrôle léger du contraste texte sur photo', () => {
  assert.ok(controleContraste([255, 255, 255], [20, 20, 20]).ok);
  assert.ok(!controleContraste([255, 255, 255], [230, 230, 230]).ok);
});

test('repli sans kit : les photos où le rendu puise déjà (autorisées du profil, sinon ses sujets)', () => {
  const banque = [{ url: 'a', sujets: ['sport'] }, { url: 'b', sujets: ['enfant'] }, { url: 'c', sujets: ['sport'], importee: false }];
  assert.deepEqual(candidatesDuContexte(banque, { sujets: ['sport'], photos: null }).map((c) => c.image), ['a', 'c']);
  assert.deepEqual(candidatesDuContexte(banque, { sujets: ['sport'], photos: ['b'] }).map((c) => c.image), ['b']);
});
