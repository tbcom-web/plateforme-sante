// Lecture des animations dans l'admin (/admin/retours, /admin/illustrations) : la MÊME animation que sur les sites, pas l'image figée.
// - SVG + CSS (trajectoire, premiers-pas, semelle, meulage) : mêmes tracés que les composants du site (contenuTrajectoire,
//   contenuPremiersPas, contenuSemelle, svgMeulage) et mêmes images clés que leurs feuilles (apps/sites/src/components/animations/
//   Trajectoire.astro, PremiersPas.astro, Semelle.astro ; cssMeulage). Seul le déclencheur change : `.al-joue` (posé par le lecteur
//   de l'admin, bouton Lecture / Pause / Rejouer) au lieu de `.en-vue` ; la condition prefers-reduced-motion est gérée par le lecteur
//   (figé par défaut si le système réduit les mouvements, « Voir l'animation » force la lecture).
// - Canvas (podoscope, coureur) : rendu par le lecteur de l'admin (apps/admin/src/components/animations-canvas.ts), portage des
//   scripts de Podoscope.astro et Coureur.astro (mêmes modules du core : pas.ts, foulee.ts, trame.ts, charte.ts).
// Si une feuille du site change, reporter ici les images clés (et inversement).
import type { Animation } from './packs';
import { contenuPremiersPas, contenuSemelle, contenuTrajectoire } from './dessins';
import { svgMeulage, cssMeulage } from './meulage';

/** Animations dessinées au canvas (script) : rendues par le lecteur de l'admin */
export const ANIMATIONS_CANVAS: readonly Animation[] = ['podoscope', 'coureur'];
export const animationCanvas = (a: Animation) => ANIMATIONS_CANVAS.includes(a);

const ATTRS = 'viewBox="0 0 400 300" aria-hidden="true" preserveAspectRatio="xMidYMid meet" fill="none" stroke-linecap="round" stroke-linejoin="round"';

/** SVG animable (sans feuille de style : cssLectureAnimations, injectée une fois) ; null pour les animations au canvas */
export function svgAnimationLecture(a: Animation, id: string): string | null {
  const ident = id.replace(/[^a-zA-Z0-9_-]/g, '');
  switch (a) {
    case 'trajectoire': return `<svg class="al-svg al-trajectoire" ${ATTRS}>${contenuTrajectoire(`${ident}-tj`)}</svg>`;
    case 'premiers-pas': return `<svg class="al-svg al-pas" ${ATTRS}>${contenuPremiersPas(`${ident}-pp`)}</svg>`;
    case 'semelle': return `<svg class="al-svg al-semelle" ${ATTRS}>${contenuSemelle(`${ident}-sm`)}</svg>`;
    case 'meulage': return svgMeulage({ registre: 'releve', id: `${ident}-mg`, classe: 'al-svg al-meulage' });
    default: return null;
  }
}

/**
 * Feuille de lecture de l'admin (à injecter une fois). Racine `.al` (fond sombre et variables des composants du site),
 * mouvement sous `.al.al-joue`, pause sous `.al.al-pause`.
 */
export function cssLectureAnimations(): string {
  const J = '.al.al-joue';
  return [
    // Conteneur : fond sombre des animations du site (--fond-nuit) et couleurs du dessin sur fond sombre (Meulage.astro)
    '.al{position:relative;background:var(--fond-nuit);color:var(--sur-sombre-doux,var(--papier));--dessin-trait:var(--papier);--dessin-accent:var(--signal);--dessin-fond:color-mix(in srgb,var(--plan),var(--nuit) 30%)}',
    '.al .al-svg,.al canvas{display:block;width:100%;height:100%}',
    '.al.al-pause *{animation-play-state:paused!important}',
    // Trajectoire.astro
    '.al-trajectoire{--cycle:var(--cycle-pas)}',
    '.al-trajectoire .tj-point{opacity:0;filter:drop-shadow(0 0 6px var(--pression-3))}',
    `${J} .al-trajectoire .tj-trajet{stroke-dasharray:1;animation:al-tj-trace var(--cycle) ease-in-out infinite backwards;animation-delay:calc(var(--j) * var(--cycle) / 2)}`,
    `${J} .al-trajectoire .tj-point{animation:al-tj-avance var(--cycle) ease-in-out infinite backwards;animation-delay:calc(var(--j) * var(--cycle) / 2)}`,
    `${J} .al-trajectoire .tj-zone{animation:al-tj-appui var(--cycle) ease-in-out infinite backwards;animation-delay:calc(var(--j) * var(--cycle) / 2 + var(--z) * var(--cycle) * 0.11)}`,
    '@keyframes al-tj-trace{0%{stroke-dashoffset:1;opacity:1}45%{stroke-dashoffset:0;opacity:1}80%{stroke-dashoffset:0;opacity:0}100%{stroke-dashoffset:1;opacity:0}}',
    '@keyframes al-tj-avance{0%{offset-distance:0%;opacity:1}45%{offset-distance:100%;opacity:1}55%,100%{offset-distance:100%;opacity:0}}',
    '@keyframes al-tj-appui{0%{opacity:0.3}8%{opacity:1}40%,100%{opacity:0.3}}',
    // PremiersPas.astro
    '.al-pas{--cycle:calc(var(--cycle-releve) * 1.5)}',
    `${J} .al-pas .pp-pas{animation:al-pp-pas var(--cycle) linear infinite backwards;animation-delay:calc(var(--i) * var(--duree-moyen))}`,
    `${J} .al-pas .pp-bande{animation:al-pp-bande var(--cycle) var(--courbe-sortie) infinite backwards;animation-delay:calc(var(--i) * var(--duree-moyen) + var(--b) * var(--duree-decalage) * 1.5)}`,
    '@keyframes al-pp-pas{0%{opacity:0}2%{opacity:1}70%{opacity:1}84%,100%{opacity:0}}',
    '@keyframes al-pp-bande{0%{opacity:0}4%,100%{opacity:1}}',
    // Semelle.astro
    '.al-semelle{--cycle:var(--cycle-releve)}',
    `${J} .al-semelle .sm-courbe{stroke-dasharray:1;animation:al-sm-courbe var(--cycle) ease-in-out infinite backwards;animation-delay:calc(var(--j) * var(--duree-moyen) + var(--k) * var(--duree-decalage) * 3)}`,
    '@keyframes al-sm-courbe{0%{stroke-dashoffset:1;opacity:1}35%{stroke-dashoffset:0}75%{stroke-dashoffset:0;opacity:1}95%,100%{stroke-dashoffset:0;opacity:0}}',
    // Podoscope.astro (habillage « relevé » de l'accueil) : ligne de scan
    '.al .al-scan{position:absolute;left:6%;right:6%;top:0;height:var(--filet-fort,2px);background:linear-gradient(90deg,transparent,var(--signal),transparent);opacity:0;pointer-events:none}',
    `${J} .al-scan{animation:al-scan var(--cycle-releve) var(--courbe-entree-sortie) infinite}`,
    '@keyframes al-scan{0%{top:12%;opacity:0}10%{opacity:0.9}90%{opacity:0.9}100%{top:88%;opacity:0}}',
    // Meulage : feuille du core (cssMeulage), déclenchée par le lecteur et sans condition de mouvements réduits
    cssMeulage({ selecteur: `${J} .meulage`, toujours: true }),
  ].join('\n');
}
