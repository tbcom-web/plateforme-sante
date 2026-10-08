import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appliquerKitDemo, cleKitDemo, composerKitDemo, controlerImagesDemo, imagesDemoDans, kitDemoCompact, MESSAGE_IMAGES_DEMO, sansImagesDemo, type ImageDemo,
} from './kit-demo';
import { estImageDemo, estImageGeneree } from './photos-libres';
import { draftVide, normaliserDraft, praticienVide } from './draft';
import { controlerPublication } from './controles';
import { banquePhotos } from './recettes';
import { nettoyerPhotosJeu } from './jeux-photos';
import { praticiensDemo, PORTRAITS_DEMO } from './portraits-praticiens';
import { definirContexteImages, kitDemoDe, viderContexteImages } from './contexte-images';
import {
  cheminImageDeclaree, construireTracabiliteIa, declarationSans0048, usageParDefaut, validerDeclarationIa, type DeclarationIa,
} from './images-generees';
import {
  construirePromptSet, contraintesDuSet, MENTION_FICTIF, motifsRefusPraticienFictif, PERSONAS_FICTIFS, SETS_CABINET, SITUATIONS_PRATICIENS,
} from './prompts-images';

const S = 'https://x.supabase.co/storage/v1/object/public/photos/';
const demo = (n: string) => `${S}banque/ia/demo-podologue/ia-${n.padStart(16, '0')}-1920.webp`;
const img = (n: string, emplacement: string, note: number | null, lot: string | null = 'aaaaaaaaaaaa', statut = 'validee'): ImageDemo => ({ url: demo(n), emplacement, note, lot, statut, profession: 'podologue' });

test('chemin démo : reconnu comme image démo ET image générée ; une image « site » ne l’est pas', () => {
  assert.equal(estImageDemo(demo('1')), true);
  assert.equal(estImageGeneree(demo('1')), true);
  assert.equal(estImageDemo(`${S}banque/ia/sport/ia-0000000000000001-1920.webp`), false);
  assert.equal(estImageDemo('photo:banque/ia/demo-podologue/ia-0000000000000001-1920.webp'), true);
  assert.equal(cheminImageDeclaree({ sujet: 'general', usage: 'demo', profession: 'podologue' }, 'ab'.repeat(8), 1280), 'banque/ia/demo-podologue/ia-abababababababab-1280.webp');
  assert.equal(cheminImageDeclaree({ sujet: 'sport', usage: 'site' }, 'ab'.repeat(8), 1280), 'banque/ia/sport/ia-abababababababab-1280.webp');
});

test('kit démo : notées ≥ 3 ★ et acceptées seulement, 4-5 ★ d’abord, même lot, panorama et portraits', () => {
  const images = [
    img('1', 'demo-galerie', 5), img('2', 'demo-galerie', 4), img('3', 'demo-galerie', 3), img('4', 'demo-galerie', 4.5), img('5', 'demo-galerie', 5, 'bbbbbbbbbbbb'),
    img('6', 'demo-galerie', null), img('7', 'demo-galerie', 2), img('8', 'demo-galerie', 5, 'aaaaaaaaaaaa', 'a_valider'),
    img('9', 'demo-panorama', 4), img('10', 'demo-portrait', 5, null), img('11', 'demo-portrait', 3, null), img('12', 'demo-portrait', 1, null),
  ];
  const k = composerKitDemo(images)!;
  assert.ok(k);
  assert.equal(k.lot, 'aaaaaaaaaaaa');
  assert.deepEqual(k.galerie, [demo('1'), demo('4'), demo('2'), demo('3')]);
  assert.equal(k.panorama, demo('9'));
  assert.deepEqual(k.portraits, [demo('10'), demo('11')]);
  for (const u of [demo('6'), demo('7'), demo('8'), demo('12')]) assert.ok(![...k.galerie, ...k.portraits].includes(u), `exclue : ${u}`);
  // Rotation : l'ordre tourne, la série reste la même
  const k1 = composerKitDemo(images, { rang: 1 })!;
  assert.notDeepEqual(k1.galerie, k.galerie);
  assert.equal(composerKitDemo([img('6', 'demo-galerie', null)]), null);
  assert.equal(composerKitDemo(images, { profession: 'osteopathe' }), null);
  assert.deepEqual(kitDemoCompact(k).portraits, k.portraits);
});

test('aperçu : le kit démo remplace les silhouettes et les galeries vides, jamais les vraies photos', () => {
  const kit = kitDemoCompact(composerKitDemo([img('1', 'demo-galerie', 5), img('2', 'demo-galerie', 5), img('9', 'demo-panorama', 4), img('10', 'demo-portrait', 5, null)])!);
  const d = draftVide();
  d.praticiens = [{ ...praticienVide(), prenom: 'Camille', nom: 'Test' }, { ...praticienVide(), prenom: 'Julien', nom: 'Test' }];
  const { draft, applique } = appliquerKitDemo(d, kit);
  assert.deepEqual(draft.photos.cabinet, [demo('1'), demo('2')]);
  assert.equal(draft.photos.panorama, demo('9'));
  assert.equal(draft.praticiens[0].photo, demo('10'));
  assert.equal(draft.praticiens[1].photo, '', 'jamais deux fois le même visage');
  assert.deepEqual(applique, { cabinet: 2, panorama: true, portraits: 1 });
  assert.deepEqual(d.photos.cabinet, [], 'brouillon d’origine intact');
  const vrai = draftVide();
  vrai.photos.cabinet = [`${S}sites/abc/cabinet-1.webp`];
  vrai.praticiens = [{ ...praticienVide(), prenom: 'A', nom: 'B', photo: `${S}sites/abc/portrait.webp` }];
  const r = appliquerKitDemo(vrai, kit);
  assert.deepEqual(r.draft.photos.cabinet, vrai.photos.cabinet);
  assert.equal(r.draft.praticiens[0].photo, vrai.praticiens[0].photo);
  // Registre : clé demo:<profession>, lue par les aperçus
  definirContexteImages({ kits: { [cleKitDemo('podologue')]: kit } });
  assert.deepEqual(kitDemoDe('podologue')?.portraits, [demo('10')]);
  viderContexteImages();
  // Planches de portraits : portraits fictifs, puis silhouettes
  const p = praticiensDemo(3, 'avec', [demo('10')]);
  assert.equal(p[0].photo?.src, demo('10'));
  assert.equal(p[1].photo?.src, PORTRAITS_DEMO[1]);
});

test('usage démo jamais publié : normaliserDraft retire toute image démo, les vraies photos restent', () => {
  const brut = {
    ...draftVide(),
    photos: { accueil: demo('1'), panorama: demo('2'), cabinet: [demo('3'), `${S}sites/abc/vrai.webp`] },
    praticiens: [{ ...praticienVide(), prenom: 'A', nom: 'B', photo: demo('4'), portrait: { photo: demo('4'), rendus: { portrait: [{ l: 640, h: 800, url: demo('4') }] } } }, { ...praticienVide(), prenom: 'C', nom: 'D', photo: `${S}sites/abc/p.webp` }],
    theme: { ...draftVide().theme, photosRecette: [demo('5'), '/photos/chaussage.webp'] },
  };
  const d = normaliserDraft(brut);
  assert.deepEqual(imagesDemoDans(d), []);
  assert.equal(d.photos.accueil, '');
  assert.deepEqual(d.photos.cabinet, [`${S}sites/abc/vrai.webp`]);
  assert.equal(d.praticiens.length, 2, 'aucun praticien supprimé');
  assert.equal(d.praticiens[0].photo, '');
  assert.equal(d.praticiens[0].portrait, undefined);
  assert.equal(d.praticiens[1].photo, `${S}sites/abc/p.webp`);
  assert.deepEqual(d.theme.photosRecette, ['/photos/chaussage.webp']);
  const propre = normaliserDraft(draftVide());
  assert.equal(sansImagesDemo(propre), propre, 'inchangé sans image démo');
});

test('contrôle bloquant : une image démo restante empêche la publication', () => {
  const d = draftVide();
  d.photos.cabinet = [demo('1')];
  const r = controlerPublication(d);
  assert.deepEqual(r.bloquants, [MESSAGE_IMAGES_DEMO]);
  assert.deepEqual(controlerPublication(draftVide()).bloquants, []);
  const c = controlerImagesDemo({ config: { praticiens: [{ photo: demo('2') }] } });
  assert.equal(c.ok, false);
  assert.ok(!c.ok && c.images[0] === demo('2') && /jamais être publiée/.test(c.message));
  assert.equal(controlerImagesDemo({ photos: { cabinet: [`${S}sites/x.webp`] } }).ok, true);
});

test('banque des sites et jeux de photos : jamais d’image démo', () => {
  const b = banquePhotos([{ url: demo('1'), origine: 'libre', sujets: ['general'] }, { url: `${S}banque/ia/sport/ia-0000000000000002-1920.webp`, origine: 'libre', sujets: ['sport'] }]);
  assert.deepEqual(b.map((p) => p.url), [`${S}banque/ia/sport/ia-0000000000000002-1920.webp`]);
  const j = nettoyerPhotosJeu({ accueil: demo('1'), panorama: demo('2'), galerie: [demo('3')], soins: { bilan: demo('4') } }, S, null);
  assert.deepEqual(imagesDemoDans(j), []);
});

const declaration = (x: Partial<DeclarationIa>): Partial<DeclarationIa> => ({
  sujet: 'general', outil: 'chatgpt', genereLe: '2026-10-08', prompt: 'Purpose: SAMPLE photo used only to preview website templates.', conditions: 'Usage commercial autorisé (abonnement).',
  conditionsVerifiees: true, imageVerifiee: true, ...x,
});

test('import : usage obligatoire, cabinet et praticiens « Démo uniquement », case dédiée pour le générique « site »', () => {
  assert.equal(usageParDefaut('demo-galerie'), 'demo');
  assert.equal(usageParDefaut('demo-portrait'), 'demo');
  assert.equal(usageParDefaut('hygiene'), 'demo');
  assert.equal(usageParDefaut('illustration'), 'site');
  assert.ok(validerDeclarationIa(declaration({ emplacement: 'demo-galerie', usage: 'site' })).erreurs.some((e) => /Démo uniquement/.test(e)));
  assert.ok(validerDeclarationIa(declaration({ emplacement: 'hygiene', usage: 'site' })).erreurs.some((e) => /générique/.test(e)));
  assert.ok(validerDeclarationIa(declaration({ emplacement: 'hygiene', usage: 'site', generiqueConfirme: true })).declaration);
  assert.ok(validerDeclarationIa(declaration({ emplacement: 'inconnu', usage: 'demo' })).erreurs.some((e) => /emplacement/.test(e)));
  // Ancien import (sans usage ni emplacement) : illustration utilisable sur les sites, sans les colonnes de 0048
  const ancien = validerDeclarationIa(declaration({ prompt: 'Purpose: generic illustrative photo of bare feet on sand.' })).declaration!;
  assert.equal(ancien.usage, 'site');
  assert.equal(declarationSans0048(ancien), true);
  // Lot : même métadonnées, lot valide
  const lot = validerDeclarationIa(declaration({ emplacement: 'demo-galerie', usage: 'demo', lot: '0123456789ab' })).declaration!;
  assert.equal(lot.lot, '0123456789ab');
  assert.equal(declarationSans0048(lot), false);
  assert.ok(validerDeclarationIa(declaration({ emplacement: 'demo-galerie', usage: 'demo', lot: 'pas-un-lot' })).erreurs.some((e) => /Lot/.test(e)));
  const t = construireTracabiliteIa({ declaration: lot, id: 'ab'.repeat(8), auteurNom: 'Paul', importeLe: new Date('2026-10-08T10:00:00Z'), largeurs: [640, 1280], urlPrincipale: `${S}banque/ia/demo-podologue/ia-${'ab'.repeat(8)}-1280.webp`, largeur: 1536, hauteur: 1152 });
  assert.equal(t.ligne?.chemin, `banque/ia/demo-podologue/ia-${'ab'.repeat(8)}-1280.webp`);
  assert.equal(t.ligne?.ia_usage, 'demo');
  assert.equal(t.ligne?.ia_emplacement, 'demo-galerie');
  assert.equal(t.ligne?.ia_lot, '0123456789ab');
});

test('import d’un portrait fictif : visage permis seulement avec la mention du fictif', () => {
  const sans = validerDeclarationIa(declaration({ emplacement: 'demo-portrait', usage: 'demo', prompt: 'A head-and-shoulders photo of a woman, looking at the camera, white tunic.' }));
  assert.ok(sans.erreurs.some((e) => /fictif/.test(e)));
  const avec = validerDeclarationIa(declaration({ emplacement: 'demo-portrait', usage: 'demo', prompt: `A head-and-shoulders photo of a woman, looking at the camera. The person is an ${MENTION_FICTIF.en}.` }));
  assert.deepEqual(avec.erreurs, []);
  // Hors praticien : un visage reste refusé
  assert.ok(validerDeclarationIa(declaration({ emplacement: 'demo-galerie', usage: 'demo', prompt: 'A waiting room with a portrait of a smiling face on the wall.' })).erreurs.some((e) => /visage/.test(e)));
  assert.ok(motifsRefusPraticienFictif(`Dr. Martin, ${MENTION_FICTIF.en}`).some((m) => /praticien identifiable/.test(m)));
});

test('prompts du set démo cabinet : toutes les scènes et formats, contraintes négatives complètes, série cohérente', () => {
  const scenes = SETS_CABINET.podologue;
  for (const id of ['salle-attente', 'accueil', 'salle-soins', 'sterilisation', 'instruments', 'podoscope', 'bureau', 'lavage-mains', 'ambiance', 'facade']) assert.ok(scenes.some((s) => s.id === id), id);
  for (const s of scenes) for (const f of s.formats) for (const style of ['phrases', 'midjourney'] as const) for (const langue of ['en', 'fr'] as const) {
    const r = construirePromptSet({ set: 'cabinet', scene: s.id, format: f, gamme: 'canard', langue, style, variante: 1 });
    assert.ok(r.ok, `${s.id} ${f} ${style} ${langue} : ${!r.ok ? r.refus.join(' ') : ''}`);
    if (!r.ok) continue;
    for (const c of contraintesDuSet('cabinet')) for (const x of style === 'midjourney' ? c.mj.split(', ') : [c[langue]]) assert.ok(r.texte.includes(x), `${s.id} : ${c.id}`);
    if (style === 'phrases') assert.ok(r.texte.includes(langue === 'en' ? 'Same clinic series' : 'Même série de cabinet'));
    assert.equal(r.usage, 'demo');
  }
  const pano = construirePromptSet({ set: 'cabinet', scene: 'salle-soins', format: 'panorama', gamme: 'canard', langue: 'en', style: 'phrases' });
  assert.ok(pano.ok && pano.format.ratio === '16:9' && pano.emplacement === 'demo-panorama' && /#[0-9a-f]{6}/i.test(pano.texte));
  const g = construirePromptSet({ set: 'cabinet', scene: 'salle-attente', format: 'galerie', gamme: 'canard', langue: 'en', style: 'phrases' });
  assert.ok(g.ok && g.format.ratio === '4:3' && g.emplacement === 'demo-galerie');
  const m = construirePromptSet({ set: 'cabinet', scene: 'sterilisation', format: 'mobile', gamme: 'canard', langue: 'en', style: 'phrases' });
  assert.ok(m.ok && m.format.ratio === '4:5' && m.emplacement === 'hygiene');
  assert.equal(construirePromptSet({ set: 'cabinet', scene: 'sterilisation', format: 'panorama', gamme: 'canard', langue: 'en', style: 'phrases' }).ok, false);
});

test('prompts du set praticiens fictifs : mention fictive, sans badge ni logo, anatomie, diversité', () => {
  assert.ok(PERSONAS_FICTIFS.length >= 6);
  assert.ok(new Set(PERSONAS_FICTIFS.map((p) => p.id[0])).size === 2, 'femmes et hommes');
  for (const s of SITUATIONS_PRATICIENS) for (const f of s.formats) for (const p of PERSONAS_FICTIFS) for (const style of ['phrases', 'midjourney'] as const) {
    const r = construirePromptSet({ set: 'praticiens', scene: s.id, format: f, persona: p.id, gamme: 'canard', langue: 'en', style });
    assert.ok(r.ok, `${s.id} ${p.id} ${style} : ${!r.ok ? r.refus.join(' ') : ''}`);
    if (!r.ok) continue;
    assert.ok(r.texte.includes(MENTION_FICTIF.en));
    if (style === 'phrases') for (const x of ['no name badge', 'five toes', 'no logo']) assert.ok(r.texte.includes(x), x);
    assert.deepEqual(motifsRefusPraticienFictif(r.texte), []);
  }
  const portrait = construirePromptSet({ set: 'praticiens', scene: 'portrait', format: 'portrait', persona: 'h-50', gamme: 'canard', langue: 'fr', style: 'phrases' });
  assert.ok(portrait.ok && portrait.format.ratio === '4:5' && portrait.emplacement === 'demo-portrait' && portrait.texte.includes(MENTION_FICTIF.fr));
});
