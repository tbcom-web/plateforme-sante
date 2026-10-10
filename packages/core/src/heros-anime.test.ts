// Visuel ANIMÉ du premier écran (heros-anime.ts) : chaque premier écran à visuel × chaque animation qui tient en grand, même cadre
// (aucune photo ni fente en plus, aucun emblème), image fixe = illustration (animations d'illustrations), jamais d'animation non
// validée pour un praticien, jamais d'animation dont les images de base attendent leur validation, studio, harmonie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANIMATIONS_HEROS, HOTES_VISUEL_ANIME, INGREDIENTS_A_VALIDER, definirAnimationsPretes, PREMIERS_ECRANS_NOUVEAUX, VISUELS_HEROS } from './heros-photo-variantes';
import { animationDuHeros, animationsHerosDuSujet, animationsPretesDepuisStatuts, cssVisuelAnime, htmlVisuelAnime, SCRIPT_VISUEL_ANIME, statutAnimationHeros } from './heros-anime';
import { htmlHeros, styleCouleursHeros, type DonneesHeros } from './heros-photo';
import { modeleIntegre, VARIANTES_SECTIONS } from './modeles';
import { SOURCES_ANIMATIONS } from './animations-sources';
import { illustrationTheme } from './heros-themes';
import { svgAnimationLecture } from './animations-lecture';
import { compositionInitiale, compositionPourCle, reparerComposition, valeursTirables, type ContexteRecette } from './recettes';
import { ETIQUETTES_HARMONIE, violationsDures } from './harmonie';

const base = (x: Partial<DonneesHeros> = {}): DonneesHeros => ({
  variante: 'bento', transition: 'fondu', balise: 'h1', sur: 'Pédicures-podologues · Lyon', metier: 'pédicurie-podologie', ville: 'à Lyon',
  qui: 'Camille Rousseau', soins: 'Bilan podologique et semelles.', actions: [{ href: '/rdv', libelle: 'Prendre rendez-vous', plein: true }],
  photos: ['/photos/a.webp', '/photos/b.webp'].map((src) => ({ src, srcset: `${src} 1600w` })), sujets: [], lieu: null,
  couleurs: styleCouleursHeros(modeleIntegre('tableau'), { couleur: '#1f6b64', gamme: 'canard' }), motLong: 20, mode: 'site', ...x,
});
/** Statuts où toutes les images de base des animations d'illustrations sont validées */
const tousValides = Object.fromEntries(Object.values(SOURCES_ANIMATIONS).flat().map((s) => [s.cle, 'valide' as const]));

test('chaque premier écran à visuel × chaque animation : même cadre, aucune photo, aucune fente, aucun emblème en plus', () => {
  const hotes = PREMIERS_ECRANS_NOUVEAUX.filter((v) => HOTES_VISUEL_ANIME.includes(v));
  assert.ok(hotes.length >= 12, `${hotes.length}`);
  for (const v of hotes) for (const a of ANIMATIONS_HEROS) {
    const r = htmlHeros(base({ variante: v, visuelAnime: a, animation: 'mots' }));
    assert.match(r.avant, /data-ea/, `${v} ${a}`);
    assert.match(r.avant, /data-visuel-anime/, `${v} ${a}`);
    assert.doesNotMatch(r.avant, /<img/, `${v} ${a} : photo`);
    assert.equal(r.fente, false, `${v} ${a}`);
    assert.ok(r.avant.includes(htmlVisuelAnime(a)), `${v} ${a} : animation absente`);
    // Pas d'emblème ni de bande en plus (une seule animation), pas de mots cinétiques
    assert.doesNotMatch(r.avant, /ea--mots|ea--embleme|ea--bande/, `${v} ${a}`);
    assert.ok(r.css.includes(cssVisuelAnime(a)), `${v} ${a} : feuille`);
  }
  // Photo plein écran, typographique, compositions : le visuel animé est ignoré (photo gardée)
  for (const v of ['photo-gauche', 'diaporama', 'typographique', 'papier-decoupe'] as const) assert.doesNotMatch(htmlHeros(base({ variante: v, visuelAnime: 'em-respire' })).avant, /data-visuel-anime/, v);
  assert.match(htmlHeros(base({ variante: 'photo-gauche', visuelAnime: 'em-respire' })).avant, /<img/);
});

test('image fixe : sans lecture ; animation d’illustration = mêmes tracés que l’illustration du sujet ; une seule lecture', () => {
  for (const a of ANIMATIONS_HEROS) {
    const css = cssVisuelAnime(a);
    for (const m of css.matchAll(/([^{}]*)\{[^{}]*animation:(?:ea|al)-/g)) assert.match(m[1], /\.ea-joue/, a);
    assert.doesNotMatch(css, /infinite/, `${a} : lecture infinie`);
    assert.match(css, /prefers-reduced-motion:reduce/, a);
    // Seul texte permis : l'analyse de la foulée (données d'une analyse de course, exception de Paul du 2026-10-10)
    assert.doesNotMatch(htmlVisuelAnime(a), a === 'pi-analyse-course' ? /<img|<script/ : /<text|<img|<script/, a);
  }
  // Semelle : les courbes de relief de l'animation sont exactement celles de l'illustration du héros « semelles » (relevé)
  const traces = (h: string) => new Set([...h.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]));
  const anim = traces(svgAnimationLecture('semelle', 'x')!), illus = traces(illustrationTheme('semelles', { registre: 'releve' }));
  for (const d of anim) assert.ok(illus.has(d), 'tracé de l’animation absent de l’illustration');
  assert.ok(htmlVisuelAnime('il-semelle').includes(svgAnimationLecture('semelle', 'ha-il-semelle')!));
  assert.doesNotMatch(SCRIPT_VISUEL_ANIME, /</);
});

test('statuts : jamais d’animation d’illustration avant validation de ses images de base ; praticien : validées seulement', () => {
  // Sans statuts : les il-* sont en attente, ni montrées à Paul ni tirées
  assert.equal(statutAnimationHeros('il-semelle'), 'ingredients-en-attente');
  assert.ok(!animationsHerosDuSujet('semelles').some((x) => x.animation.startsWith('il-')));
  assert.equal(animationsHerosDuSujet('semelles', { statuts: tousValides }).find((x) => x.animation === 'il-semelle')?.statut, 'a-valider');
  assert.ok(!valeursTirables('entete-anim', 'tableau', false).some((v) => v.startsWith('il-')));
  assert.ok(valeursTirables('entete-anim', 'tableau', false, { animationsPretes: new Set(['il-semelle']) }).includes('il-semelle'));
  // Praticien : aucune animation « à valider »
  assert.equal(animationsHerosDuSujet('semelles', { praticien: true }).length, 0);
  const avec = { 'visuel-heros': 'animation', 'entete-anim': 'em-topographie' };
  assert.equal(animationDuHeros(avec, 'semelles'), 'em-topographie');
  assert.equal(animationDuHeros(avec, 'semelles', { praticien: true }), null);
  assert.equal(animationDuHeros(avec, 'semelles', { praticien: true, valides: new Set(['composant:entete-anim:em-topographie']) }), 'em-topographie');
  // Sujet : défaut du sujet (sans il-* en attente) ; diabète et seniors : jamais les vives
  assert.equal(animationDuHeros({ 'visuel-heros': 'animation' }, 'semelles'), 'em-respire');
  assert.equal(animationDuHeros({ 'visuel-heros': 'animation' }, 'semelles', { statuts: tousValides }), 'il-semelle');
  assert.equal(animationDuHeros({ 'visuel-heros': 'animation' }, 'diabete'), 'em-sensibilite');
  for (const s of ['diabete', 'senior']) assert.ok(!animationsHerosDuSujet(s).some((x) => ['em-petits-pas', 'em-particules', 'taches'].includes(x.animation)), s);
  assert.equal(animationDuHeros({ 'visuel-heros': 'illustration', 'entete-anim': 'em-respire' }, 'semelles'), null);
  // Image fixe fournie pour les tuiles et duels
  assert.ok(animationsHerosDuSujet('sport').every((x) => x.imageFixe.html.length > 50 && x.cle.startsWith('composant:entete-anim:')));
});

test('studio et recettes : dé « Visuel du premier écran », tuile jouée dans son cadre, réparation, harmonie', () => {
  assert.deepEqual([...VARIANTES_SECTIONS['visuel-heros']], [...VISUELS_HEROS]);
  for (const v of VISUELS_HEROS) assert.ok(ETIQUETTES_HARMONIE[`v.visuel-heros:${v}`], v);
  assert.ok(INGREDIENTS_A_VALIDER.has('composant:visuel-heros:animation'));
  const c: ContexteRecette = { sujets: ['semelles', 'sport'], principaux: 2 };
  const x = compositionInitiale(c);
  const avec = (accueil: string, visuel: string, anim: string) => ({ ...x, structure: 'clair-pratique' as const, sections: { ...x.sections, variantes: { ...x.sections.variantes, accueil, 'visuel-heros': visuel, 'entete-anim': anim } } }) as never;
  // Tuile : une animation qui tient en grand se joue À LA PLACE de l'illustration (organique garde son masque)
  const t = compositionPourCle(avec('organique', 'auto', 'aucune'), 'composant:entete-anim:em-trace');
  assert.equal(t.sections.variantes['visuel-heros'], 'animation');
  assert.equal(t.sections.variantes.accueil, 'organique');
  assert.equal(compositionPourCle(avec('photo-gauche', 'auto', 'aucune'), 'composant:visuel-heros:animation').sections.variantes.accueil, 'bento');
  // Réparation : carte (gabarit tableau) garde l'animation qui tient en grand ; typographique (sans visuel) perd le visuel animé
  const carte = reparerComposition(avec('carte', 'animation', 'em-respire'), c).sections.variantes;
  assert.equal(carte['visuel-heros'], 'animation');
  assert.equal(carte['entete-anim'], 'em-respire');
  assert.equal(reparerComposition(avec('typographique', 'animation', 'em-respire'), c).sections.variantes['visuel-heros'], undefined);
  // Praticien : jamais un visuel animé à valider
  assert.equal(reparerComposition(avec('bento', 'animation', 'em-respire'), { ...c, praticien: true }).sections.variantes['visuel-heros'], undefined);
  // Harmonie : pas d'emblème en plus du visuel animé ; un premier écran sans visuel à animer est signalé
  assert.ok(violationsDures(avec('bento', 'animation', 'mots'), c).some((v) => v.code === 'embleme-en-plus'));
  assert.ok(!violationsDures(avec('bento', 'animation', 'em-respire'), c).some((v) => v.code === 'embleme-en-plus'));
  assert.ok(violationsDures(avec('typographique', 'animation', 'aucune'), c).some((v) => v.code === 'visuel-anime-hote'));
});

test('registre des animations prêtes (admin) : une image de base validée → l’animation apparaît dans le dé ; vide → jamais', () => {
  // Statuts lus par l'admin (illustrations_statuts) : toutes les images de base de la semelle validées, rien d'autre
  const statuts = Object.fromEntries(SOURCES_ANIMATIONS.semelle.map((s) => [s.cle, 'valide' as const]));
  assert.deepEqual(animationsPretesDepuisStatuts(statuts), ['il-semelle']);
  assert.deepEqual(animationsPretesDepuisStatuts({}), []);
  try {
    definirAnimationsPretes(animationsPretesDepuisStatuts(statuts));
    assert.ok(valeursTirables('entete-anim', 'tableau', false).includes('il-semelle'));
    assert.ok(!valeursTirables('entete-anim', 'tableau', false).includes('il-premiers-pas'));
    assert.equal(statutAnimationHeros('il-semelle'), 'a-valider');
    assert.equal(animationDuHeros({ 'visuel-heros': 'animation' }, 'semelles'), 'il-semelle');
    // Praticien : toujours pas (à valider par Paul)
    assert.equal(animationDuHeros({ 'visuel-heros': 'animation', 'entete-anim': 'il-semelle' }, 'semelles', { praticien: true }), null);
  } finally { definirAnimationsPretes([]); }
  assert.ok(!valeursTirables('entete-anim', 'tableau', false).includes('il-semelle'));
});
