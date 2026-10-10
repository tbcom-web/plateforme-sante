// Animations d'en-tête (retour de Paul du 2026-10-08 : « d'autres animations stylisées minimalistes et très dynamiques qu'on peut
// intégrer au header ») : formes ABSTRAITES seulement (aucune anatomie dessinée, aucun personnage), HTML + CSS pur, posées dans le
// premier écran par htmlHeros (heros-photo.ts) : bande au-dessus du titre, emblème à côté du titre, ou fond (lueur).
//
// Règles (mesurées par heros-photo.test.ts et la planche heros-organiques-2) :
// - < 3 Ko par animation (balisage + feuille) ; compositeur uniquement : transform et opacity sur des éléments HTML (jamais une
//   propriété qui recalcule la mise en page, jamais un enfant SVG animé) ;
// - taille réservée (aucun décalage : CLS 0) ; jamais sous le texte (contraste du gabarit conservé) — la lueur, seule posée en
//   fond, a une couleur calculée pour que le texte reste AA (--hp-t3, teintesSousTexte) ;
// - IMAGE FIXE par défaut (sans script, réduction des animations, Économiseur de données) : l'état final, composé ; le script
//   (≤ 0,75 Ko) pose `ea-joue` quand le premier écran est à l'écran : l'animation se joue en ≤ 5 s puis se pose (WCAG 2.2.2 :
//   rien ne bouge plus de 5 s sans geste du visiteur), et se rejoue quand le premier écran revient à l'écran ou au survol ;
//   hors écran elle s'arrête (classe retirée) ;
// - la lueur suit le pointeur seulement avec une souris (désactivée au tactile).

import { PLACEMENT_ANIMATIONS_ENTETE, type AnimationEntete } from './heros-photo-variantes';
import { cssEmpreintes, estEmpreintes, htmlEmpreintes, type AnimationEmpreintes } from './entete-empreintes';
import { cssPied, estAnimationPied, htmlPied } from './entete-pied';
import { cssUniversMinimal, estUniversMinimal, htmlUniversMinimal } from './univers-minimal';

/** Animations de ce fichier (la famille « empreintes en lignes de niveau » est dans entete-empreintes.ts) */
type AnimationSimple = Exclude<AnimationEntete, 'aucune' | AnimationEmpreintes | `il-${string}` | `pi-${string}` | `un-${string}`>;
/** Animations d'illustrations (il-*) : seulement en visuel du héros (heros-anime.ts), jamais en emblème ni en bande */
const estIllustration = (a: AnimationEntete): a is Extract<AnimationEntete, `il-${string}`> => a.startsWith('il-');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Durée d'une lecture (≤ 5 s, WCAG 2.2.2) */
export const DUREE_ENTETE = 4800;
const J = '.ea-joue';
const sp = (n: number, cl = 'ea__e') => Array.from({ length: n }, (_, i) => `<i class="${cl}" style="--i:${i}"></i>`).join('');

/** Courbe abstraite de la voûte (même profil que heros-organiques.ts), repère 140 × 80 */
const VOUTE_EMBLEME = 'M4 62H26C36 62 42 30 60 28C82 26 98 50 112 60C114 61.5 116 62 120 62H136';

/** Balisage de chaque animation (contenu de la boîte .ea) ; `mots` : mots des soins */
function corps(a: AnimationSimple, mots: readonly string[]): string {
  switch (a) {
    case 'voute-trace':
      return `<span class="ea__f"><span class="ea__i"><svg viewBox="0 0 140 80"><path d="${VOUTE_EMBLEME}"/></svg></span></span><i class="ea__sol"></i><i class="ea__pt"></i>`;
    case 'points-pression':
      return `<span class="ea__grille">${sp(27)}</span>`;
    case 'foulee':
      return sp(5);
    case 'onde':
      return `${sp(3)}<i class="ea__pt"></i>`;
    case 'taches':
      return sp(3);
    case 'mots':
      return mots.slice(0, 2).map((m, i) => `<i class="ea__e" style="--i:${i}">${esc(m)}</i>`).join('<i class="ea__sep"></i>');
    case 'empreintes':
      return sp(8);
    case 'rubans':
      return [0, 1, 2].map((i) => `<i class="ea__e" style="--i:${i}"><svg viewBox="0 0 200 20" preserveAspectRatio="none"><path d="M0 10C25 0 25 0 50 10S75 20 100 10 125 0 150 10 175 20 200 10"/></svg></i>`).join('');
    case 'geometrie':
      return '<i class="ea__e ea__rond"></i><i class="ea__e ea__demi"></i><i class="ea__e ea__carre"></i><i class="ea__e ea__tri"></i>';
    case 'lueur':
      return '<i class="ea__e"></i>';
  }
}

const KF = (n: string, c: string) => `@keyframes ea-${n}{${c}}`;
const D = `${DUREE_ENTETE}ms`;

/** Feuille propre à chaque animation : état fixe (composé) puis lecture sous .ea-joue */
const CSS: Record<AnimationSimple, string> = {
  'voute-trace': `.ea--voute-trace svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;fill:none;stroke:var(--ea-1);stroke-width:3;stroke-linecap:round}.ea__f,.ea__i{position:absolute;inset:0;overflow:hidden}.ea__sol{position:absolute;left:3%;right:3%;bottom:21%;height:2px;background:var(--ea-1);opacity:.25}.ea--voute-trace .ea__pt{position:absolute;left:43%;top:35%;width:12px;height:12px;margin:-6px;border-radius:50%;background:var(--ea-2)}
${J} .ea__f{animation:ea-fen ${D} cubic-bezier(.4,0,.2,1) both}${J} .ea__i{animation:ea-fen-i ${D} cubic-bezier(.4,0,.2,1) both}${J} .ea--voute-trace .ea__pt{animation:ea-pop ${D} both}
${KF('fen', '0%{transform:translate3d(-100%,0,0)}30%,52%{transform:none}70%{transform:translate3d(100%,0,0)}70.1%{transform:translate3d(-100%,0,0)}100%{transform:none}')}${KF('fen-i', '0%{transform:translate3d(100%,0,0)}30%,52%{transform:none}70%{transform:translate3d(-100%,0,0)}70.1%{transform:translate3d(100%,0,0)}100%{transform:none}')}${KF('pop', '0%,14%{transform:scale(0)}22%{transform:scale(1.5)}30%,56%{transform:none}66%,84%{transform:scale(0)}94%{transform:scale(1.4)}100%{transform:none}')}`,

  'points-pression': `.ea__grille{position:absolute;inset:4% 2%;display:grid;grid-template-columns:repeat(9,1fr);place-items:center}.ea--points-pression .ea__e{width:9px;height:9px;border-radius:50%;background:var(--ea-1);opacity:calc(.25 + .08 * mod(var(--i),9))}.ea--points-pression .ea__e:is(:nth-child(14),:nth-child(15),:nth-child(5)){background:var(--ea-2);opacity:1}
${J} .ea--points-pression .ea__e{animation:ea-pression 1.6s cubic-bezier(.3,1.4,.5,1) 2 both;animation-delay:calc(mod(var(--i),9) * 90ms)}
${KF('pression', '0%{transform:scale(.4);opacity:.2}35%{transform:scale(1.5);opacity:1}100%{}')}`,

  foulee: `.ea--foulee .ea__e{position:absolute;left:0;height:3px;border-radius:2px;background:var(--ea-1);top:calc(var(--i) * 20% + 4%);width:calc(92% - var(--i) * 13%);transform-origin:left}.ea--foulee .ea__e:nth-child(2){background:var(--ea-2);height:5px}.ea--foulee .ea__e:nth-child(4){left:18%}
${J} .ea--foulee .ea__e{animation:ea-file 1.2s cubic-bezier(.2,.7,.2,1) 3 both;animation-delay:calc(var(--i) * 70ms)}
${KF('file', '0%{transform:translate3d(-60%,0,0) scaleX(.1);opacity:0}45%{opacity:1}70%{transform:translate3d(6%,0,0) scaleX(1.05)}100%{transform:none}')}`,

  onde: `.ea--onde .ea__e{position:absolute;left:50%;bottom:10%;width:100%;aspect-ratio:3/1;margin-left:-50%;border-radius:50%;box-shadow:inset 0 0 0 2px var(--ea-1);transform-origin:50% 50%;transform:translateY(50%) scale(calc(.34 + var(--i) * .33));opacity:calc(.9 - var(--i) * .3)}.ea--onde .ea__pt{position:absolute;left:50%;bottom:10%;width:12px;height:12px;margin:0 0 -6px -6px;border-radius:50%;background:var(--ea-2)}
${J} .ea--onde .ea__e{animation:ea-onde 2.2s cubic-bezier(.2,.7,.2,1) 2 both;animation-delay:calc(var(--i) * 260ms)}${J} .ea--onde .ea__pt{animation:ea-tape 2.2s cubic-bezier(.3,1.4,.5,1) 2 both}
${KF('onde', '0%{transform:translateY(50%) scale(.1);opacity:1}100%{transform:translateY(50%) scale(calc(.34 + var(--i) * .33));opacity:calc(.9 - var(--i) * .3)}')}${KF('tape', '0%{transform:translateY(-26px)}30%{transform:none}38%{transform:scale(1.3,.7)}50%,100%{transform:none}')}`,

  taches: `.ea--taches .ea__e{position:absolute;top:8%;width:46%;aspect-ratio:1;border-radius:58% 42% 51% 49%/44% 56% 44% 56%;opacity:.9}.ea--taches .ea__e:nth-child(1){left:8%;background:var(--ea-3)}.ea--taches .ea__e:nth-child(2){left:30%;top:22%;background:var(--ea-2);border-radius:46% 54% 38% 62%/52% 40% 60% 48%}.ea--taches .ea__e:nth-child(3){left:50%;width:34%;top:4%;background:var(--ea-1);opacity:.75}
${J} .ea--taches .ea__e{animation:ea-rejoint ${D} cubic-bezier(.65,0,.35,1) both}${J} .ea--taches .ea__e:nth-child(1){--x:-60%}${J} .ea--taches .ea__e:nth-child(3){--x:70%}
${KF('rejoint', '0%{transform:translate3d(var(--x,0),40%,0) scale(.3) rotate(-30deg);opacity:0}45%{transform:translate3d(calc(var(--x,0) * .2),0,0) scale(1.08) rotate(8deg);opacity:.95}70%{transform:scale(.94)}100%{}')}`,

  mots: `.ea--mots{display:flex;align-items:center;gap:10px;overflow:hidden;font-weight:750;font-size:.92rem;letter-spacing:.01em;white-space:nowrap}@media (min-width:900px){.ea--mots{font-size:1.12rem;gap:14px}}.ea--mots .ea__e{font-style:normal;display:inline-block;color:var(--ea-1)}.ea--mots .ea__e:nth-child(4n+1){color:var(--ea-4)}.ea__sep{width:7px;height:7px;flex:none;border-radius:50%;background:var(--ea-2)}
${J} .ea--mots .ea__e{animation:ea-mot 1.1s cubic-bezier(.3,1.4,.5,1) both;animation-delay:calc(var(--i) * 420ms + 200ms)}${J} .ea__sep{animation:ea-pop2 .5s ease-out both;animation-delay:calc(var(--i, 1) * 420ms)}
${KF('mot', '0%{transform:translate3d(0,120%,0) skewY(8deg);opacity:0}60%{opacity:1}100%{}')}${KF('pop2', '0%{transform:scale(0)}')}`,

  empreintes: `.ea--empreintes .ea__e{position:absolute;top:calc(28% + mod(var(--i),2) * 30%);left:calc(var(--i) * 12% + 2%);width:22px;height:11px;border-radius:50%;background:var(--ea-1);transform:rotate(calc(10deg - mod(var(--i),2) * 20deg));opacity:calc(.2 + var(--i) * .11)}.ea--empreintes .ea__e:last-child{background:var(--ea-2);opacity:1}
${J} .ea--empreintes .ea__e{animation:ea-pas 1.6s ease-out 2 both;animation-delay:calc(var(--i) * 200ms)}
${KF('pas', '0%{opacity:0;transform:scale(.4) rotate(calc(10deg - mod(var(--i),2) * 20deg))}18%{opacity:1;transform:scale(1.2) rotate(calc(10deg - mod(var(--i),2) * 20deg))}30%{transform:rotate(calc(10deg - mod(var(--i),2) * 20deg))}')}`,

  rubans: `.ea--rubans .ea__e{position:absolute;left:0;width:200%;height:46%;top:calc(var(--i) * 26%)}.ea--rubans svg{display:block;width:100%;height:100%;overflow:visible;fill:none;stroke-width:7;stroke-linecap:round}.ea--rubans path{vector-effect:non-scaling-stroke}.ea--rubans .ea__e:nth-child(1){color:var(--ea-2)}.ea--rubans .ea__e:nth-child(2){color:var(--ea-1);transform:translate3d(-12.5%,0,0)}.ea--rubans .ea__e:nth-child(3){color:var(--ea-4);opacity:.55;transform:translate3d(-6%,0,0)}.ea--rubans svg{stroke:currentColor}
${J} .ea--rubans .ea__e{animation:ea-ruban ${D} cubic-bezier(.45,0,.2,1) both}${J} .ea--rubans .ea__e:nth-child(2){animation-direction:reverse}
${KF('ruban', 'from{transform:translate3d(-50%,0,0)}')}`,

  geometrie: `.ea--geometrie .ea__e{position:absolute}.ea__rond{left:4%;top:12%;width:38%;aspect-ratio:1;border-radius:50%;box-shadow:inset 0 0 0 2.5px var(--ea-1)}.ea__demi{left:30%;top:34%;width:34%;aspect-ratio:2/1;border-radius:999px 999px 0 0;background:var(--ea-2);transform:rotate(-20deg)}.ea__carre{left:64%;top:8%;width:20%;aspect-ratio:1;background:var(--ea-3);transform:rotate(12deg)}.ea__tri{left:76%;top:52%;width:18%;aspect-ratio:1;background:var(--ea-1);-webkit-clip-path:polygon(50% 0,100% 100%,0 100%);clip-path:polygon(50% 0,100% 100%,0 100%)}
${J} .ea--geometrie .ea__e{animation:ea-tourne ${D} cubic-bezier(.65,0,.35,1) both}${J} .ea__demi{--r:-200deg}${J} .ea__carre{--r:-90deg}${J} .ea__tri{--r:120deg}
${KF('tourne', '0%{transform:rotate(var(--r,180deg)) scale(.2);opacity:0}40%{opacity:1}100%{}')}`,

  lueur: `.ea--lueur{position:absolute;inset:0;z-index:0;overflow:hidden}.ea--lueur .ea__e{position:absolute;left:0;top:0;width:560px;height:560px;margin:-280px;border-radius:50%;background:radial-gradient(closest-side,var(--hp-t3,var(--ea-3)),transparent);opacity:.95;transform:translate3d(78vw,30%,0);will-change:transform}.hp--sur-photo .ea--lueur .ea__e{opacity:.22}.hp:is(.hp--typographique,.hp--scinde-photo) .ea--lueur{display:none}
${J} .ea--lueur .ea__e{animation:ea-lueur 1.2s ease-out both}${KF('lueur', '0%{opacity:0}')}`,
};

/** Feuille commune (une fois si une animation est présente) */
const COMMUN = `.ea{--ea-1:var(--hp-accent-texte);--ea-2:var(--hp-vif);--ea-3:var(--hp-aplat);--ea-4:var(--hp-encre);position:relative;display:block;flex:none;pointer-events:none;color:var(--ea-1)}
.ea i{display:block;font-style:normal}.ea .ea__e,.ea .ea__f,.ea .ea__i,.ea .ea__pt{will-change:transform}
.hp:is(.hp--sur-photo,.hp--typographique) .ea{--ea-1:currentColor;--ea-2:currentColor;--ea-3:currentColor;--ea-4:currentColor}
.hp--scinde-photo .ea,.hp__carte--texte .ea{--ea-3:var(--hp-bulle);--ea-4:var(--hp-aplat-texte)}
.ea--embleme{width:112px;height:64px;margin:0 0 -4px}.ea--bande{width:min(100%,420px);height:40px;margin:0 0 4px;overflow:hidden}.ea--mots{height:32px;width:100%}
.hp--sur-photo .ea--embleme{margin-bottom:0}@media (min-width:900px){.ea--embleme{width:140px;height:80px}.ea--bande{height:48px}}
@media (prefers-reduced-motion:reduce){.ea *{animation:none!important}}`;

/**
 * Balisage de l'animation (null : aucune). Empreintes : `scene` (carte visuelle du bento) sinon emblème ; `vif` : tempo sportif.
 */
export function htmlAnimationEntete(a: AnimationEntete | null | undefined, mots: readonly string[] = [], o: { scene?: boolean; vif?: boolean } = {}): string {
  if (!a || a === 'aucune') return '';
  if (estEmpreintes(a)) return htmlEmpreintes(a, { placement: o.scene ? 'scene' : 'embleme', vif: o.vif });
  if (estAnimationPied(a)) return htmlPied(a, { placement: o.scene ? 'scene' : 'embleme' });
  if (estUniversMinimal(a)) return htmlUniversMinimal(a, { placement: o.scene ? 'scene' : 'embleme' });
  if (estIllustration(a)) return '';
  const p = PLACEMENT_ANIMATIONS_ENTETE[a];
  if (a === 'mots' && !mots.length) return '';
  return `<span class="ea ea--${p} ea--${a}" aria-hidden="true">${corps(a, mots)}</span>`;
}

/** Feuille de l'animation (commune + propre) */
export function cssAnimationEntete(a: AnimationEntete | null | undefined): string {
  if (!a || a === 'aucune') return '';
  if (estEmpreintes(a)) return cssEmpreintes(a);
  if (estAnimationPied(a)) return cssPied(a);
  if (estUniversMinimal(a)) return cssUniversMinimal(a);
  if (estIllustration(a)) return '';
  return (COMMUN + CSS[a]).replace(/\n\s*/g, '');
}

/** Mots des soins (« Bilan podologique, semelles et soins de pédicurie. » → 3 mots-clés courts) */
export function motsDesSoins(soins: string): string[] {
  return soins.replace(/\.$/, '').split(/,\s*|\s+et\s+/).map((x) => x.trim()).filter(Boolean).map((x) => (x.split(' ').length <= 3 ? x : x.split(' ').slice(0, 2).join(' '))).slice(0, 3);
}

/**
 * Script (≤ 0,75 Ko, en ligne juste après le premier écran) : lecture quand le premier écran est à l'écran (sauf réduction des
 * animations ou Économiseur de données), arrêt hors écran, nouvelle lecture au retour ou au survol (5 s après la précédente au
 * moins) ; lueur : suit le pointeur (souris seulement). Jamais de « < » dans le script : le post-traitement typographique
 * du site (lib/typo.mjs) découpe le HTML sur les chevrons.
 */
export const SCRIPT_ENTETE = `(function(){var h=document.querySelector('.hp[data-ea]'),n=navigator.connection,m=function(q){return matchMedia(q).matches},t=0,v=1,C=h&&h.classList;
if(!h||m('(prefers-reduced-motion: reduce)')||n&&n.saveData)return;
function j(){if(t+${DUREE_ENTETE + 200}>Date.now())return;t=Date.now();C.contains('ea-joue')&&(C.remove('ea-joue'),h.offsetWidth);C.add('ea-joue')}
j();new IntersectionObserver(function(e){var i=e[0].isIntersecting;i&&!v&&(t=0,j());i||C.remove('ea-joue');v=i}).observe(h);h.addEventListener('pointerenter',j);
var l=h.querySelector('.ea--lueur i');l&&m('(pointer:fine)')&&h.addEventListener('pointermove',function(e){var r=h.getBoundingClientRect();l.style.transform='translate3d('+(e.clientX-r.left)+'px,'+(e.clientY-r.top)+'px,0)'})})()`.replace(/\n/g, '');
