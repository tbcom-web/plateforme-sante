// Visuel ANIMÉ du premier écran (retour de Paul du 2026-10-08 : « il faudrait vraiment intégrer les animations dans les héros,
// comme des illustrations ») : `visuel-heros` = photo | illustration | animation. L'animation prend la place de l'illustration ou
// de la photo, en grand, dans le même cadre et sous le même masque (forme organique, arche, médaillon, carte du bento, disque de la
// carte, cadre de la notice, figure de la revue…). Rien d'autre ne s'anime alors dans l'en-tête (pas d'emblème en plus).
//
// Animations possibles (ANIMATIONS_HEROS) : empreintes en lignes de niveau (entete-empreintes.ts), formes abstraites qui tiennent
// en grand (taches, onde, formes géométriques : entete-anim.ts) et animations d'illustrations existantes (il-* : mêmes tracés que
// l'illustration du sujet, animations-lecture.ts) — ces dernières SEULEMENT quand leurs images de base sont validées
// (animations-sources.ts, règle de Paul : jamais d'animation avant validation de ses ingrédients) ; sinon elles ne sont montrées
// nulle part, même à Paul. Les canvas (coureur, podoscope) et le meulage (12 s, étiquettes) ne tiennent pas dans un héros.
//
// Image fixe (sans script, réduction des animations, fin de lecture) : la dernière image de l'animation, qui est aussi son
// illustration ; lecture ≤ ~6 s sous `.ea-joue` (SCRIPT_ENTETE dans les premiers écrans du core, SCRIPT_VISUEL_ANIME ailleurs),
// arrêt hors écran. Le cadre de l'hôte réserve la place : LCP (le titre) et CLS inchangés.

import { ANIMATIONS_HEROS, LIBELLES_ANIMATIONS_ENTETE, SOURCE_ANIMATION_HEROS, estAValider, estAnimationHeros, type AnimationEntete } from './heros-photo-variantes';
import { cssEmpreintes, estAnimationEmpreintes, htmlEmpreintes } from './entete-empreintes';
import { cssAnimationEntete, htmlAnimationEntete } from './entete-anim';
import { cssLectureAnimations, svgAnimationLecture } from './animations-lecture';
import { etatAnimation } from './animations-sources';

/** Statuts de revue des illustrations (animations-sources.ts) */
type Statuts = NonNullable<Parameters<typeof etatAnimation>[1]>;
const lireStatut = (s: Statuts | null | undefined, k: string) => (!s ? undefined : s instanceof Map ? s.get(k) : (s as Readonly<Record<string, string | undefined>>)[k]);
import { CYCLES, DUREES, COURBES } from './charte';

/** Ton du visuel : panneau sombre de la gamme (registre relevé, cartes sombres) ou clair « encre » (aplats pastel) */
export type TonVisuelAnime = 'sombre' | 'clair';

/** Animation par défaut d'un sujet (quand le dé d'animation n'en impose pas une qui tient en grand) */
const PAR_SUJET: Record<string, AnimationEntete[]> = {
  semelles: ['il-semelle', 'em-respire'],
  sport: ['em-marche', 'em-deroule'],
  diabete: ['em-sensibilite', 'em-trace'],
  enfant: ['il-premiers-pas', 'em-petits-pas'],
  senior: ['em-marche', 'em-trace'],
  ongles: ['em-trace', 'em-respire'],
  pedicurie: ['em-trace', 'em-respire'],
  posture: ['il-trajectoire', 'em-deroule'],
};
/** Animations qui ont du sens pour un sujet (les vives jamais pour le diabète ni les seniors) */
const VIVES = ['em-petits-pas', 'em-particules', 'taches'];
const PROPRES: Partial<Record<AnimationEntete, string[]>> = { 'em-petits-pas': ['enfant'], 'em-sensibilite': ['diabete', 'senior', 'pedicurie'], 'il-premiers-pas': ['enfant'], 'il-semelle': ['semelles'], 'il-trajectoire': ['posture', 'semelles', 'senior', 'sport'] };
const pourSujet = (a: AnimationEntete, sujet: string) => (!PROPRES[a] || PROPRES[a]!.includes(sujet)) && !(VIVES.includes(a) && (sujet === 'diabete' || sujet === 'senior'));

const rang = (sujet: string, a: AnimationEntete) => { const i = (PAR_SUJET[sujet] ?? []).indexOf(a); return i < 0 ? 99 : i; };

/** Statut d'une animation de héros : validée, à valider (montrée à Paul avec le badge), ingrédients en attente (montrée à personne) */
export type StatutAnimationHeros = 'valide' | 'a-valider' | 'ingredients-en-attente';
export function statutAnimationHeros(a: AnimationEntete, o: { statuts?: Statuts | null; valides?: ReadonlySet<string> | null } = {}): StatutAnimationHeros {
  const source = SOURCE_ANIMATION_HEROS[a];
  // Sans statuts connus, une animation d'illustration est en attente (jamais montrée par défaut)
  if (source && (!o.statuts || etatAnimation(source, o.statuts).enAttente)) return 'ingredients-en-attente';
  const cle = `composant:entete-anim:${a}`;
  return estAValider(cle, o.valides) && lireStatut(o.statuts, cle) !== 'valide' ? 'a-valider' : 'valide';
}

/**
 * Animations de héros disponibles pour un sujet (base de visuelsHerosAnimes(…, { heros: true }), visuels-heros-animes.ts,
 * utilisée par les duels et les tuiles) : clé notable, statut et image fixe (HTML + feuille,
 * qui est aussi la dernière image de la lecture). `praticien` : validées seulement ; sinon (Paul) les « à valider » en plus ;
 * jamais celles dont les images de base attendent leur validation.
 */
export function animationsHerosDuSujet(sujet: string, o: { statuts?: Statuts | null; valides?: ReadonlySet<string> | null; praticien?: boolean; ton?: TonVisuelAnime } = {}) {
  return ANIMATIONS_HEROS.filter((a) => pourSujet(a, sujet)).map((a) => {
    const statut = statutAnimationHeros(a, o);
    return { cle: `composant:entete-anim:${a}`, animation: a, libelle: LIBELLES_ANIMATIONS_ENTETE[a], statut, imageFixe: { html: htmlVisuelAnime(a, { ton: o.ton }), css: cssVisuelAnime(a) } };
  }).filter((x) => x.statut !== 'ingredients-en-attente' && (!o.praticien || x.statut === 'valide'))
    .sort((x, y) => rang(sujet, x.animation) - rang(sujet, y.animation));
}

/**
 * Animation du visuel principal d'une recette : null si `visuel-heros` n'est pas « animation » ; sinon l'animation d'en-tête si
 * elle tient en grand, sinon celle du sujet (kit du sujet d'abord). Praticien : jamais une animation non validée.
 */
export function animationDuHeros(variantes: { 'visuel-heros'?: string; 'entete-anim'?: string } | null | undefined, sujet: string | null | undefined, o: { statuts?: Statuts | null; valides?: ReadonlySet<string> | null; praticien?: boolean; kit?: string | null } = {}): AnimationEntete | null {
  if (variantes?.['visuel-heros'] !== 'animation') return null;
  const ok = (a: unknown): a is AnimationEntete => {
    if (!estAnimationHeros(a)) return false;
    const s = statutAnimationHeros(a, o);
    return s === 'valide' || (s === 'a-valider' && !o.praticien);
  };
  const choisie = variantes['entete-anim'];
  if (ok(choisie)) return choisie;
  const kit = o.kit?.replace(/^composant:entete-anim:/, '');
  if (ok(kit)) return kit;
  return [...(PAR_SUJET[sujet ?? ''] ?? []), 'em-respire' as const, 'em-trace' as const].find((a) => ok(a) && pourSujet(a, sujet ?? '')) ?? null;
}

const ID = (a: string) => a.replace(/[^a-z0-9-]/g, '');

/** Balisage du visuel animé (sans cadre : l'hôte le pose dans son emplacement, place réservée) */
export function htmlVisuelAnime(a: AnimationEntete, o: { ton?: TonVisuelAnime; vif?: boolean; nu?: boolean } = {}): string {
  const clair = o.ton === 'clair';
  if (estAnimationEmpreintes(a)) return htmlEmpreintes(a, { placement: 'scene', vif: o.vif }).replace('class="ea ea--em', `class="ea${clair ? ' ea--clair' : ''}${o.nu ? ' ea--nu' : ''} ea--em`);
  const source = SOURCE_ANIMATION_HEROS[a];
  if (source) return `<span class="ea ea--grand ea--il${o.nu ? ' ea--nu' : ''}" aria-hidden="true">${svgAnimationLecture(source, `ha-${ID(a)}`) ?? ''}</span>`;
  return htmlAnimationEntete(a).replace(/class="ea ea--\w+ /, `class="ea ea--grand${clair ? ' ea--clair' : ''}${o.nu ? ' ea--nu' : ''} `);
}

/** Feuille du visuel animé (une fois par page) */
export function cssVisuelAnime(a: AnimationEntete): string {
  const nu = '.ea--nu{background:none!important}';
  if (estAnimationEmpreintes(a)) return cssEmpreintes(a) + nu;
  const source = SOURCE_ANIMATION_HEROS[a];
  if (source) {
    // Mêmes images clés que l'admin et le site (animations-lecture.ts), jouées UNE fois sous .ea-joue, cycle resserré (≤ ~6 s)
    const motif = { semelle: /al-semelle|al-sm-/, trajectoire: /al-trajectoire|al-tj-/, 'premiers-pas': /al-pas|al-pp-/ }[source];
    const lignes = cssLectureAnimations().split('\n').filter((l) => motif.test(l) && !l.includes('.al.al-pause')).map((l) => l.replaceAll('.al.al-joue', '.ea-joue .ea--il').replaceAll(' infinite', ' 1'));
    return `.ea--il{position:absolute;inset:0;display:block;pointer-events:none;background:var(--hp-sombre);border-radius:var(--hp-r,20px);overflow:hidden;color:var(--hp-sombre-texte);--papier:var(--hp-sombre-texte);--anim-trait:var(--hp-sombre-texte);--dessin-trait:var(--hp-sombre-texte);--signal:var(--hp-vif);--accent-pale:color-mix(in srgb,var(--hp-vif) 60%,var(--hp-sombre-texte));--cycle-releve:4000ms;--cycle-pas:${CYCLES.pas}ms;--duree-moyen:${DUREES.moyen / 2}ms;--duree-decalage:${DUREES.decalage}ms;--courbe-sortie:${COURBES.sortie}}.ea--il .al-svg{position:absolute;inset:4%;width:92%;height:92%}.ea--il .al-pas{--cycle:4200ms}
@media (prefers-reduced-motion:reduce){.ea *{animation:none!important}}${lignes.join('')}${nu}`.replace(/\n/g, '');
  }
  return `${cssAnimationEntete(a)}.ea--grand{position:absolute!important;inset:0;width:auto!important;height:auto!important;margin:0!important;background:var(--hp-doux);border-radius:var(--hp-r,20px);overflow:hidden}${nu}`;
}

/**
 * Script des visuels animés hors des premiers écrans du core (gabarits tableau, village, revue : VisuelTheme) : pose `ea-joue`
 * sur chaque `.ha[data-ea]` à l'écran (lecture), le retire hors écran ; rien sans IntersectionObserver, en réduction des
 * animations ou Économiseur de données (image fixe). Sans « < » (post-traitement typographique du site).
 */
export const SCRIPT_VISUEL_ANIME = `(function(){var n=navigator.connection;if(matchMedia('(prefers-reduced-motion: reduce)').matches||n&&n.saveData||!window.IntersectionObserver)return;
document.querySelectorAll('.ha[data-ea]').forEach(function(h){var v=0;new IntersectionObserver(function(e){var i=e[0].isIntersecting;if(i&&!v){h.classList.remove('ea-joue');h.offsetWidth;h.classList.add('ea-joue')}i||h.classList.remove('ea-joue');v=i}).observe(h)})})()`.replace(/\n/g, '');

/** Animations de héros jamais notables seules au studio tant qu'elles dépendent d'ingrédients (tuiles : visuelsHerosAnimes) */
export const ANIMATIONS_HEROS_ILLUSTRATIONS = Object.keys(SOURCE_ANIMATION_HEROS) as AnimationEntete[];
