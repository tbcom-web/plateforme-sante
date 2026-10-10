// Animations du pied (entete-pied.ts, 2026-10-09) : géométrie dérivée des formes validées (rien de redessiné), poids, propriétés
// animées, image fixe, aucun texte ni chiffre, diabète sans couleur vive, thèmes, harmonie, liant « chevrons », nouveautés.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriverGeometriePied, sourceGeometriePied } from './entete-pied-derive';
import { GEO_PIED } from './entete-pied-geo';
import { ANIMATIONS_PIED, ANIMATIONS_PIED_VIVES, SUJETS_ANIMATIONS_PIED, cssPied, htmlPied } from './entete-pied';
import { ANIMATIONS_ENTETE, ANIMATIONS_HEROS, INGREDIENTS_A_VALIDER, LIBELLES_ANIMATIONS_ENTETE, METADONNEES_ANIMATIONS_ENTETE, PLACEMENT_ANIMATIONS_ENTETE, TRANSITIONS_SECTIONS } from './heros-photo-variantes';
import { ETIQUETTES_HARMONIE, violationsDures } from './harmonie';
import { compositionInitiale, valeursTirables, type ContexteRecette } from './recettes';
import { animationsHerosDuSujet, cssVisuelAnime, htmlVisuelAnime } from './heros-anime';
import { htmlAnimationEntete, cssAnimationEntete } from './entete-anim';
import { cssTransitionsSections } from './heros-photo';
import { familleNouveaute } from './nouveautes';
import { familleDeCle, visuelValide } from './kits-visuels';

test('géométrie : exactement dérivée des formes validées (silhouettes, champ de pression, semelle POD-AT-0004)', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(GEO_PIED)), deriverGeometriePied());
  assert.ok(sourceGeometriePied().includes('GEO_PIED'));
  // Trois zones de pression (talon, têtes métatarsiennes, hallux), au moins trois niveaux chacune ; cinq isothermes
  assert.deepEqual([...new Set(GEO_PIED.pression.map((p) => p.z))].sort(), [0, 1, 2]);
  assert.equal(GEO_PIED.isothermes.length, 5);
  assert.ok(GEO_PIED.montagne.pas.length >= 12);
});

test('animations du pied : < 5 Ko, transform / opacity / stroke-dashoffset seulement, image fixe, aucun texte ni chiffre', () => {
  for (const a of ANIMATIONS_PIED) {
    assert.ok((ANIMATIONS_ENTETE as readonly string[]).includes(a), a);
    assert.ok(ANIMATIONS_HEROS.includes(a), a);
    const html = htmlPied(a), css = cssPied(a);
    // Analyse de la foulée : jambes, tracés et données (HTML lisible) ; < 7,5 Ko feuille commune comprise (≈ 2,6 Ko compressé)
    const analyse = a === 'pi-analyse-course';
    assert.ok(Buffer.byteLength(html + css) < (analyse ? 7680 : 5120), `${a} : ${Buffer.byteLength(html + css)} octets`);
    for (const k of css.match(/@keyframes [\w-]+\{.*?\}\}/g) ?? []) for (const p of k.replace(/@keyframes [\w-]+\{/, '').matchAll(/([a-z-]+):/g)) assert.ok(['transform', 'opacity', 'stroke-dashoffset'].includes(p[1]), `${a} anime ${p[1]}`);
    for (const m of css.matchAll(/([^{}]*)\{[^{}]*animation:ea-/g)) assert.match(m[1], /\.ea-joue/, a);
    assert.match(css, /prefers-reduced-motion:reduce/);
    assert.doesNotMatch(html, analyse ? /<img|<script|onclick/ : /<text|<img|<script|onclick/);
    // Aucun texte ni chiffre, SAUF l'analyse de la foulée (exception de Paul du 2026-10-10 : données classiques d'une analyse de course)
    if (!analyse) assert.equal(html.replace(/<[^>]*>/g, ''), '', `${a} : texte visible`);
    assert.match(html, /aria-hidden="true"/);
    // Un élément animé ne porte jamais d'attribut transform (sinon transform-origin le déplace) : il est dans un groupe posé
    for (const m of html.matchAll(/<(?:use|path|circle|g)[^>]*class="(ep__(?:n|l|pp|h|v|vl|sm|mn)\b)[^"]*"[^>]*>/g)) assert.doesNotMatch(m[0], / transform=/, `${a} : ${m[1]}`);
    assert.equal(PLACEMENT_ANIMATIONS_ENTETE[a], 'scene');
    assert.match(LIBELLES_ANIMATIONS_ENTETE[a], /à valider/);
    assert.ok(INGREDIENTS_A_VALIDER.has(`composant:entete-anim:${a}`));
    assert.ok(ETIQUETTES_HARMONIE[`v.entete-anim:${a}`], a);
    assert.ok(METADONNEES_ANIMATIONS_ENTETE[a]);
    // Rendus par l'en-tête (emblème ou scène) et par le visuel animé du premier écran (ton clair, sans fond)
    assert.match(htmlAnimationEntete(a, [], { scene: true }), new RegExp(`ea--${a}`));
    assert.equal(cssAnimationEntete(a), css);
    assert.match(htmlVisuelAnime(a, { ton: 'clair', nu: true }), /class="ea ea--clair ea--nu ea--pi/);
    assert.ok(cssVisuelAnime(a).startsWith(css));
    assert.equal(familleNouveaute(`composant:entete-anim:${a}`).id, analyse ? 'analyse-course' : 'animations-pied');
    assert.equal(familleDeCle(`composant:entete-anim:${a}`), 'animation');
    assert.equal(visuelValide(`composant:entete-anim:${a}`, { visuels: [] }), false);
  }
  // Silhouettes validées seulement (adulte, enfant, tout-petit) : la famille les trois, les petits pas l'enfant (jamais la semelle)
  assert.ok(['adulte', 'enfant', 'bebe'].every((k) => htmlPied('pi-famille').includes(GEO_PIED[k as 'adulte'])));
  assert.ok(htmlPied('pi-ronde').includes(GEO_PIED.enfant) && !htmlPied('pi-ronde').includes(GEO_PIED.semelle.contour));
  // Diabète : la variante froide n'emploie jamais la couleur vive de la gamme
  assert.doesNotMatch(cssPied('pi-isothermes-froid'), /--hp-vif|f0352f|ff7a2f/);
  // Talon : un seul halo (jamais une cible : un cercle, aucune croix)
  assert.equal(htmlPied('pi-talon').match(/<circle/g)?.length, 1);
});

test('thèmes : diabète en teintes froides, jamais d’animation vive pour le diabète ni les seniors ; famille en général', () => {
  const diabete = animationsHerosDuSujet('diabete').map((x) => x.animation);
  assert.ok(diabete.includes('pi-isothermes-froid') && !diabete.includes('pi-isothermes') && !diabete.includes('pi-pression'));
  for (const s of ['diabete', 'senior']) for (const a of ANIMATIONS_PIED_VIVES) assert.ok(!animationsHerosDuSujet(s).some((x) => x.animation === a), `${s} ${a}`);
  assert.ok(animationsHerosDuSujet('enfant').some((x) => x.animation === 'pi-ronde'));
  assert.ok(animationsHerosDuSujet('general').some((x) => x.animation === 'pi-famille'));
  assert.ok(animationsHerosDuSujet('sport').some((x) => x.animation === 'pi-trail-montagne'));
  assert.ok(animationsHerosDuSujet('semelles').some((x) => x.animation === 'pi-couches'));
  for (const a of ANIMATIONS_PIED) assert.ok(SUJETS_ANIMATIONS_PIED[a].length);
  // Praticien : jamais montrées tant que Paul ne les a pas validées
  assert.ok(!animationsHerosDuSujet('sport', { praticien: true }).some((x) => x.animation.startsWith('pi-')));
  assert.ok(!valeursTirables('entete-anim', 'tableau', false, { praticien: true }).some((v) => v.startsWith('pi-')));
});

test('liant « chevrons » entre les sections : statique sans prise en charge, à valider, calme pour le diabète', () => {
  assert.ok((TRANSITIONS_SECTIONS as readonly string[]).includes('chevrons'));
  const css = cssTransitionsSections('chevrons');
  assert.match(css, /::before/);
  assert.match(css, /prefers-reduced-motion:no-preference/);
  assert.match(css, /position:absolute/);
  assert.ok(INGREDIENTS_A_VALIDER.has('composant:sections:chevrons'));
  assert.equal(familleNouveaute('composant:sections:chevrons').id, 'animations-pied');
  assert.ok(ETIQUETTES_HARMONIE['v.sections:chevrons']);
  const c: ContexteRecette = { sujets: ['diabete'], principaux: 1 };
  const x = compositionInitiale(c);
  const avec = (sections: string, anim: string) => ({ ...x, sections: { ...x.sections, variantes: { ...x.sections.variantes, accueil: 'bento', sections, 'entete-anim': anim } } }) as never;
  assert.ok(violationsDures(avec('chevrons', 'aucune'), { sujets: ['diabete'] }).some((v) => v.code === 'animation-calme'));
  assert.ok(violationsDures(avec('aucune', 'pi-chrono'), { sujets: ['senior'] }).some((v) => v.code === 'animation-calme'));
  assert.ok(!violationsDures(avec('aucune', 'pi-isothermes-froid'), { sujets: ['diabete'] }).some((v) => v.code === 'animation-calme'));
});
