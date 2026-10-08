// Animations d'en-tête « empreintes en lignes de niveau » (entete-empreintes.ts) : géométrie dérivée des formes validées (aucun
// dessin nouveau), poids, propriétés animées, image fixe, aucun texte ni chiffre, placement (bento / emblème), script des
// particules, harmonie (tempo calme pour le diabète et les seniors), studio, kits et « à valider ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriverGeometrie, sourceGeometrie } from './entete-empreintes-derive';
import { GEO_EMPREINTES } from './entete-empreintes-geo';
import { ANIMATIONS_EMPREINTES, CORPS_PARTICULES, SCRIPT_PARTICULES, cssEmpreintes, htmlEmpreintes } from './entete-empreintes';
import { ANIMATIONS_ENTETE, INGREDIENTS_A_VALIDER, LIBELLES_ANIMATIONS_ENTETE, METADONNEES_ANIMATIONS_ENTETE, PLACEMENT_ANIMATIONS_ENTETE } from './heros-photo-variantes';
import { htmlHeros, styleCouleursHeros, type DonneesHeros } from './heros-photo';
import { modeleIntegre } from './modeles';
import { ETIQUETTES_HARMONIE, violationsDures } from './harmonie';
import { compositionInitiale, compositionPourCle, valeursTirables, type ContexteRecette } from './recettes';
import { familleDeCle, visuelValide } from './kits-visuels';
import { SEMELLE, TRAJET } from './pied';

test('géométrie : exactement dérivée des formes validées (contour de la semelle, relief, trajet), rien de redessiné', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(GEO_EMPREINTES)), deriverGeometrie());
  assert.ok(sourceGeometrie().includes('GEO_EMPREINTES'));
  // Les sources n'ont pas changé de nature : contour fermé, trajet ouvert
  assert.match(SEMELLE, /Z$/);
  assert.doesNotMatch(TRAJET, /Z/);
  // Trois zones (talon, arche, avant-pied), cinq niveaux de relief
  assert.deepEqual([...new Set(GEO_EMPREINTES.groupes.map((g) => g.z))].sort(), [0, 1, 2]);
  assert.ok(Math.max(...GEO_EMPREINTES.groupes.map((g) => g.k)) === 4);
});

test('empreintes : < 5 Ko, transform / opacity / stroke-dashoffset seulement, image fixe, aucun texte ni chiffre', () => {
  for (const a of ANIMATIONS_EMPREINTES) {
    assert.ok((ANIMATIONS_ENTETE as readonly string[]).includes(a), a);
    const html = htmlEmpreintes(a), css = cssEmpreintes(a);
    assert.ok(Buffer.byteLength(html + css) < 5120, `${a} : ${Buffer.byteLength(html + css)} octets`);
    for (const k of css.match(/@keyframes [\w-]+\{.*?\}\}/g) ?? []) for (const p of k.replace(/@keyframes [\w-]+\{/, '').matchAll(/([a-z-]+):/g)) assert.ok(['transform', 'opacity', 'stroke-dashoffset'].includes(p[1]), `${a} anime ${p[1]}`);
    // Aucune lecture sans .ea-joue (image fixe) ; réduction des animations
    for (const m of css.matchAll(/([^{}]*)\{[^{}]*animation:ea-/g)) assert.match(m[1], /\.ea-joue/, a);
    assert.match(css, /prefers-reduced-motion:reduce/);
    // Aucun texte, aucun chiffre affiché, aucune image ni script dans le balisage ; décoratif
    assert.doesNotMatch(html, /<text|<img|<script|onclick/);
    assert.equal(html.replace(/<[^>]*>/g, ''), '', `${a} : texte visible`);
    assert.match(html, /aria-hidden="true"/);
    // Seules formes : le contour de la semelle (#eac), le relief (#ea…) et le trajet (#eat) — jamais d'autre tracé
    for (const d of html.matchAll(/ d="([^"]+)"/g)) assert.ok(d[1] === GEO_EMPREINTES.contour || d[1] === GEO_EMPREINTES.trajet || GEO_EMPREINTES.groupes.some((g) => g.d === d[1]), `${a} : tracé inconnu`);
    assert.equal(PLACEMENT_ANIMATIONS_ENTETE[a], 'scene');
    assert.match(LIBELLES_ANIMATIONS_ENTETE[a], /à valider/);
    assert.ok(INGREDIENTS_A_VALIDER.has(`composant:entete-anim:${a}`));
    assert.ok(ETIQUETTES_HARMONIE[`v.entete-anim:${a}`], a);
    assert.ok(METADONNEES_ANIMATIONS_ENTETE[a]);
  }
  // Petits pas d'enfant : le MÊME contour, réduit (six fois)
  assert.equal(htmlEmpreintes('em-petits-pas').match(/href="#eac"/g)?.length, 6);
  // Sensibilité (diabète) : jamais la couleur vive de la gamme (aucun rouge imposé), trait seul
  assert.doesNotMatch(cssEmpreintes('em-sensibilite').split('prefers-reduced-motion:reduce')[1], /vif|aplat|accent/);
  // Encre : ton clair ; marche : tempo vif sur demande seulement
  assert.match(htmlEmpreintes('em-encre'), /ea--clair/);
  assert.match(htmlEmpreintes('em-marche', { vif: true }), /ea--vif/);
  assert.doesNotMatch(htmlEmpreintes('em-respire', { vif: true }), /ea--vif/);
});

test('particules : script sans chevron, ≤ 1,4 Ko, 30 images/s, suit ea-joue', () => {
  assert.doesNotMatch(SCRIPT_PARTICULES, /</);
  assert.ok(SCRIPT_PARTICULES.length < 1400, `${SCRIPT_PARTICULES.length}`);
  assert.match(CORPS_PARTICULES, /MutationObserver/);
  assert.match(CORPS_PARTICULES, />=32/);
  assert.match(CORPS_PARTICULES, /ea-joue/);
  assert.doesNotThrow(() => new Function('h', CORPS_PARTICULES));
});

const base = (x: Partial<DonneesHeros> = {}): DonneesHeros => ({
  variante: 'bento', transition: 'fondu', balise: 'h1', sur: 'Pédicures-podologues · Lyon', metier: 'pédicurie-podologie', ville: 'à Lyon',
  qui: 'Camille Rousseau', soins: 'Bilan podologique et semelles.', actions: [{ href: '/rdv', libelle: 'Prendre rendez-vous', plein: true }],
  photos: [{ src: '/photos/a.webp', srcset: '/photos/a.webp 1600w' }], sujets: [], lieu: null,
  couleurs: styleCouleursHeros(modeleIntegre('tableau'), { couleur: '#1f6b64', gamme: 'canard' }), motLong: 20, mode: 'site', ...x,
});

test('placement : en grand dans la carte du bento (sans photo ni fente), en emblème ailleurs ; tempo', () => {
  const b = htmlHeros(base({ animation: 'em-respire' }));
  assert.match(b.avant, /hp__carte--scene" aria-hidden="true"><span class="ea ea--em ea--scene ea--em-respire"/);
  assert.doesNotMatch(b.avant, /<img/);
  assert.equal(b.fente, false);
  assert.match(b.avant, /data-ea/);
  // Le titre n'a pas d'emblème en plus (un seul élément expressif)
  assert.equal(b.avant.match(/class="ea /g)?.length, 1);
  const f = htmlHeros(base({ variante: 'fondu', animation: 'em-trace' }));
  assert.match(f.avant, /<div class="hp__texte"><span class="ea ea--em ea--embleme ea--em-trace"/);
  assert.match(htmlHeros(base({ animation: 'em-marche', tempo: 'vif' })).avant, /ea--vif/);
  assert.doesNotMatch(htmlHeros(base({ animation: 'em-marche', tempo: 'calme' })).avant, /ea--vif/);
});

test('harmonie, studio, kits : calme pour le diabète, tuile dans le bento, jamais pour un praticien avant validation', () => {
  const c: ContexteRecette = { sujets: ['diabete'], principaux: 1 };
  const x = compositionInitiale(c);
  const avec = (accueil: string, anim: string) => ({ ...x, sections: { ...x.sections, variantes: { ...x.sections.variantes, accueil, 'entete-anim': anim } } }) as never;
  for (const a of ['em-petits-pas', 'em-particules']) assert.ok(violationsDures(avec('bento', a), { sujets: ['diabete'] }).some((v) => v.code === 'animation-calme'), a);
  for (const a of ['em-sensibilite', 'em-trace', 'em-marche', 'em-encre']) assert.ok(!violationsDures(avec('bento', a), { sujets: ['diabete'] }).some((v) => v.code === 'animation-calme'), a);
  // Un seul élément fort : la scène + un premier écran fort est signalée ; avec le bento, non
  assert.ok(violationsDures(avec('organique', 'em-respire'), { sujets: ['sport'] }).some((v) => v.code === 'expressif'));
  assert.ok(!violationsDures(avec('bento', 'em-respire'), { sujets: ['sport'] }).some((v) => v.code === 'expressif'));
  // Tuile du studio : jouée dans son hôte (bento)
  assert.equal(compositionPourCle(x, 'composant:entete-anim:em-topographie').sections.variantes.accueil, 'bento');
  // Praticien : jamais tirée tant que Paul ne l'a pas validée
  assert.ok(!valeursTirables('entete-anim', 'tableau', false, { praticien: true }).some((v) => v.startsWith('em-')));
  // Kits : rattachable à un sujet (famille « animation »), validée seulement par Paul
  assert.equal(familleDeCle('composant:entete-anim:em-respire'), 'animation');
  assert.equal(familleDeCle('composant:entete-anim:aucune'), null);
  assert.equal(visuelValide('composant:entete-anim:em-respire', { visuels: [] }), false);
  assert.equal(visuelValide('composant:entete-anim:em-respire', { visuels: [], statuts: { 'composant:entete-anim:em-respire': 'valide' } }), true);
});
