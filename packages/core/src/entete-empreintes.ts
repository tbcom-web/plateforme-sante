// Animations d'en-tête « empreintes en lignes de niveau » (retour de Paul du 2026-10-08 : « des animations de HERO qui claquent,
// un peu comme les points de pression animés » ; « ce que tu peux représenter SANS RISQUE D'HALLUCINATION. J'adore le style des
// empreintes comme ça » — capture du héros « semelles » en relevé : deux semelles au trait clair sur fond sombre, cuvette du talon,
// soutien de voûte et barre rétrocapitale en lignes de niveau lumineuses).
//
// AUCUN DESSIN NOUVEAU : tout vient des géométries validées (entete-empreintes-geo.ts, généré par entete-empreintes-derive.ts) —
// contour de la semelle (héros « semelles » relevé, validé ; trait continu « semelle », validé), courbes de niveau du relief de la
// semelle (jamais une carte de pression, pied.ts règle 5), trajet du déroulé (pied.ts, TRAJET). Pas d'orteil, pas de main, pas de
// visage, aucune chaussure : seulement des contours, des lignes de niveau, un trajet, des points et des traits. Aucun chiffre ni
// texte dans l'animation (aucune fausse donnée de santé). Les petits pas d'enfant sont le MÊME contour, réduit.
//
// Règles (mesurées par entete-empreintes.test.ts et la planche entete-empreintes) :
// - < 5 Ko par animation (balisage + feuille ; le script des particules, en ligne, à part) ; seuls transform, opacity et
//   stroke-dashoffset sont animés ; canvas seulement pour les particules (30 images/s au plus) ;
// - image FIXE par défaut (sans script, réduction des animations, Économiseur de données) : la capture (contours + zones
//   allumées) ; lecture ≤ 5 s sous `.ea-joue` (SCRIPT_ENTETE), arrêt hors écran ; « défilement » suit le défilement de la page
//   (animation-timeline) seulement là où c'est pris en charge, sinon image fixe ;
// - couleurs = variables de la gamme (--hp-*) : panneau sombre (--hp-sombre, trait --hp-sombre-texte, zones teintées de --hp-vif,
//   lueur douce) ou clair « encre » (--hp-doux, trait --hp-encre) ; jamais de rouge imposé (la sensibilité n'emploie que le trait) ;
// - placement « scène » : en grand dans la carte visuelle du bento (à côté du titre, comme la capture) ; ailleurs, emblème à côté
//   du sur-titre (taille réservée, CLS 0, jamais sous le texte).

import { GEO_EMPREINTES as G } from './entete-empreintes-geo';
import type { AnimationEntete } from './heros-photo-variantes';

export const ANIMATIONS_EMPREINTES = ['em-respire', 'em-trace', 'em-deroule', 'em-marche', 'em-petits-pas', 'em-sensibilite', 'em-particules', 'em-topographie', 'em-defilement', 'em-encre'] as const;
export type AnimationEmpreintes = (typeof ANIMATIONS_EMPREINTES)[number];
export const estAnimationEmpreintes = (a: unknown): a is AnimationEmpreintes => (ANIMATIONS_EMPREINTES as readonly unknown[]).includes(a);

/** Durée d'une lecture (≤ 5 s, WCAG 2.2.2) */
const D = 4800;
const J = '.ea-joue';

// Scène 300 × 240 : semelle gauche (miroir) et droite, voûtes face à face, échelle 0,23 (repère ×4 → 0,92 unité du pied)
const PIEDS = ['translate(142 17)scale(-.23 .23)', 'translate(158 17)scale(.23)'];
/** Opacité de chaque niveau de relief (du plus bas au plus haut), comme le dessin « semelle » */
const OPACITE = ['.4', '.55', '.7', '.85', '1'];

/** Définitions : contour (#eac), trajet (#eat), zones (#ea0…2) ou niveaux (#eak0…4) */
function defs(mode: 'z' | 'k' | null, trajet = false): string {
  const groupes = mode === 'z' ? [0, 1, 2].map((z) => ({ id: `ea${z}`, l: G.groupes.filter((g) => g.z === z) }))
    : mode === 'k' ? [0, 1, 2, 3, 4].map((k) => ({ id: `eak${k}`, l: G.groupes.filter((g) => g.k === k) })) : [];
  return `<defs><path id="eac" d="${G.contour}" pathLength="1"/>${trajet ? `<path id="eat" d="${G.trajet}" pathLength="1"/>` : ''}${groupes
    .map(({ id, l }) => `<g id="${id}">${l.map((g) => `<path d="${g.d}"${mode === 'z' ? ` stroke-opacity="${OPACITE[g.k]}"` : ' pathLength="1"'}/>`).join('')}</g>`).join('')}</defs>`;
}

/** Un pied : contour, zones (ou niveaux) dans un groupe lumineux, extra (trajet, points) */
function pied(j: number, mode: 'z' | 'k' | null, extra = ''): string {
  const zones = mode === 'z' ? [0, 1, 2].map((z) => `<use href="#ea${z}" style="--z:${z}"/>`).join('')
    : mode === 'k' ? [0, 1, 2, 3, 4].map((k) => `<use href="#eak${k}" style="--k:${k}"/>`).join('') : '';
  return `<g class="ea__p" transform="${PIEDS[j]}" style="--j:${j}"><use href="#eac" class="ea__c"/>${zones ? `<g class="ea__z">${zones}</g>` : ''}${extra}</g>`;
}
const paire = (mode: 'z' | 'k' | null, extra: (j: number) => string = () => '') => pied(0, mode, extra(0)) + pied(1, mode, extra(1));
const svg = (c: string) => `<svg viewBox="0 0 300 240" fill="none" stroke-linecap="round" stroke-linejoin="round">${c}</svg>`;

// Petits pas d'enfant : le même contour réduit (pied ≈ 52 u de long), six pas en zigzag du bas à gauche vers le haut à droite,
// pointe légèrement ouverte ; gauche (miroir) et droite en alternance
const PETITS_PAS = (() => {
  const [ax, ay, bx, by] = [54, 220, 246, 22], n = 6, lf = 52, e = lf / (228 * 4);
  const lg = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / lg, uy = (by - ay) / lg, angle = (Math.atan2(ux, -uy) * 180) / Math.PI;
  const r = (v: number) => Math.round(v * 10) / 10;
  return Array.from({ length: n }, (_, i) => {
    const d = lf / 2 + (i * (lg - lf)) / (n - 1), cote = i % 2 ? 1 : -1;
    const cx = ax + ux * d - uy * cote * 9, cy = ay + uy * d + ux * cote * 9;
    // Centre du contour (repère ×4) : (184, 432) ; miroir pour le pied gauche
    return `<g transform="translate(${r(cx)} ${r(cy)})rotate(${r(angle + cote * 7)})scale(${cote < 0 ? -1 : 1} 1)scale(${r(e * 1e4) / 1e4})translate(-184 -432)"><use href="#eac" class="ea__pp" style="--i:${i}"/></g>`;
  }).join('');
})();

/** Points le long du trajet du déroulé (fractions de sa longueur) */
const POINTS = [0.03, 0.2, 0.38, 0.56, 0.74, 0.92];

/** Balisage (contenu de la boîte .ea) */
export function corpsEmpreintes(a: AnimationEmpreintes): string {
  switch (a) {
    case 'em-respire': case 'em-trace': case 'em-marche': case 'em-defilement':
      return svg(defs('z') + paire('z'));
    case 'em-topographie': case 'em-encre':
      return svg(defs('k') + paire('k'));
    case 'em-deroule':
      return svg(defs(null, true) + paire(null, () => '<use href="#eat" class="ea__tr"/><use href="#eat" class="ea__tq"/><use href="#eat" class="ea__tt"/>'));
    case 'em-sensibilite':
      return svg(defs(null, true) + paire(null, (j) => POINTS.map((t, i) => `<use href="#eat" class="ea__pt" style="--t:${t};--i:${j * POINTS.length + i}"/>`).join('')));
    case 'em-petits-pas':
      return svg(`<defs><path id="eac" d="${G.contour}"/></defs>${PETITS_PAS}`);
    case 'em-particules':
      return `<canvas aria-hidden="true"></canvas>${svg(defs('z') + paire('z'))}`;
  }
}

const KF = (n: string, c: string) => `@keyframes ea-${n}{${c}}`;
/** Apparition d'une zone ou d'un niveau (jusqu'à son état fixe) */
const APPARAIT = KF('em-in', '0%{opacity:0;transform:scale(.9)}');
const TRACE = KF('em-tr', '0%{stroke-dashoffset:1}100%{stroke-dashoffset:0}');

/**
 * Feuille commune de la famille (une fois) : panneau de la gamme, traits, zones lumineuses ; tons sombre (défaut) et clair
 * (« encre ») ; emblème (repli hors du bento) ; réduction des animations.
 */
const COMMUN_EM = `.ea--em{--ea-f:var(--hp-sombre);--ea-t:var(--hp-sombre-texte);--ea-z:color-mix(in srgb,var(--hp-vif) 22%,var(--ea-t));--ea-g:color-mix(in srgb,var(--hp-vif) 70%,transparent);position:relative;display:block;flex:none;pointer-events:none;background:var(--ea-f);border-radius:var(--hp-r,20px);overflow:hidden}
.ea--clair{--ea-f:var(--hp-doux);--ea-t:var(--hp-encre);--ea-z:var(--hp-accent-texte);--ea-g:transparent}
.ea--em svg,.ea--em canvas{position:absolute;inset:5%;width:90%;height:90%;overflow:visible;stroke:var(--ea-t)}
.ea--em use{transform-box:fill-box;transform-origin:50% 50%}.ea__c{stroke-width:6;opacity:.6}.ea__z{stroke:var(--ea-z);stroke-width:10;filter:drop-shadow(0 0 14px var(--ea-g))}
.ea--scene{position:absolute;inset:0}.ea--embleme.ea--em{width:84px;height:68px;margin:0 0 -4px;background:none;--ea-t:var(--hp-accent-texte);--ea-z:var(--hp-vif)}.ea--embleme svg{inset:0;width:100%;height:100%}.ea--embleme .ea__p{stroke-width:2}.ea--embleme .ea__c{stroke-width:14}.ea--embleme .ea__z{stroke-width:18;filter:none}
@media (min-width:900px){.ea--embleme.ea--em{width:100px;height:80px}}
@media (prefers-reduced-motion:reduce){.ea *{animation:none!important}}`;

const R = (s: string) => `${J} .ea--${s}`;
/** Feuille propre à chaque animation : état fixe (la capture) puis lecture sous .ea-joue */
const CSS_EM: Record<AnimationEmpreintes, string> = {
  // 1. Les zones (talon → arche → avant-pied) s'allument en séquence, leurs anneaux s'étendent puis se resserrent
  'em-respire': `${R('em-respire')} .ea__z use{animation:ea-em-r 3.4s cubic-bezier(.4,0,.2,1) both;animation-delay:calc(var(--z) * 500ms + var(--j) * 140ms)}
${KF('em-r', '0%{opacity:.06;transform:scale(.84)}32%{opacity:1;transform:scale(1.08)}58%{transform:scale(.97)}')}`,

  // 2. Le contour des deux semelles se dessine, puis les zones s'allument
  'em-trace': `${R('em-trace')} .ea__c{stroke-dasharray:1;animation:ea-em-tr 2s cubic-bezier(.6,0,.3,1) both;animation-delay:calc(var(--j) * 250ms)}${R('em-trace')} .ea__z use{animation:ea-em-in 1.1s ease-out both;animation-delay:calc(1.9s + var(--z) * 450ms + var(--j) * 120ms)}
${TRACE}${APPARAIT}`,

  // 3. Trajet du déroulé : un point lumineux suit le talon → bord externe → avant-pied → gros orteil, traînée qui s'estompe ;
  // gauche puis droite. Image fixe : le trajet discret et le point arrivé à l'avant
  'em-deroule': `.ea__tr{stroke-width:4;stroke-dasharray:.01 .025;opacity:.5}.ea__tq{stroke:var(--ea-z);stroke-width:12;stroke-dasharray:.35 2;stroke-dashoffset:.35;opacity:0;filter:drop-shadow(0 0 12px var(--ea-g))}.ea__tt{stroke-width:26;stroke-dasharray:.0001 2;stroke-dashoffset:-.9999;filter:drop-shadow(0 0 12px var(--ea-g))}
${R('em-deroule')} .ea__tq{animation:ea-em-q 2.2s cubic-bezier(.45,0,.4,1) both;animation-delay:calc(var(--j) * 2.2s)}${R('em-deroule')} .ea__tt{animation:ea-em-t 2.2s cubic-bezier(.45,0,.4,1) both;animation-delay:calc(var(--j) * 2.2s)}
${KF('em-q', '0%{stroke-dashoffset:.35;opacity:.9}80%{opacity:.9}100%{stroke-dashoffset:-.65;opacity:0}')}${KF('em-t', '0%{stroke-dashoffset:0;opacity:0}6%{opacity:1}100%{stroke-dashoffset:-.9999}')}`,

  // 4. Marche : les deux semelles s'allument l'une après l'autre (talon → avant-pied), foulée calme (0,8 s par pas, 4 pas :
  // seniors, diabète) ou plus vive (ea--vif, sport : 0,6 s par pas, 6 pas) ; la dernière lecture s'arrête au quart du cycle,
  // tout allumé (l'image fixe)
  'em-marche': `.ea--em-marche{--ea-pas:.8s;--ea-n:2.25}.ea--vif{--ea-pas:.6s;--ea-n:3.25}
${R('em-marche')} .ea__z use{animation:ea-em-m calc(var(--ea-pas) * 2) ease-out var(--ea-n) both;animation-delay:calc(var(--j) * var(--ea-pas) + var(--z) * var(--ea-pas) * .2)}
${KF('em-m', '0%{opacity:.1}8%{opacity:1;transform:scale(1.05)}22%,45%{opacity:1;transform:none}55%,100%{opacity:.1}')}`,

  // 5. Petits pas d'enfant : le même contour réduit, couleurs de la gamme, en zigzag avec un léger rebond
  'em-petits-pas': `.ea__pp{stroke-width:26;fill:currentColor;fill-opacity:.2;color:color-mix(in srgb,var(--hp-vif) 70%,var(--ea-t));stroke:currentColor}.ea__pp:is([style*="1"],[style*="4"]){color:color-mix(in srgb,var(--hp-aplat) 70%,var(--ea-t))}.ea__pp:is([style*="2"],[style*="5"]){color:var(--ea-t)}
${R('em-petits-pas')} .ea__pp{animation:ea-em-pp .9s cubic-bezier(.3,1.5,.5,1) both;animation-delay:calc(var(--i) * 520ms)}
${KF('em-pp', '0%{opacity:0;transform:translateY(12%) scale(.4)}60%{opacity:1}')}`,

  // 6. Sensibilité (diabète) : des points le long de la plante s'allument un à un, calmement ; trait seul (jamais de rouge)
  'em-sensibilite': `.ea__pt{stroke-width:24;stroke-dasharray:.0001 2;stroke-dashoffset:calc(var(--t) * -1);filter:drop-shadow(0 0 10px var(--ea-t))}
${R('em-sensibilite')} .ea__pt{animation:ea-em-s 1.4s ease-in-out both;animation-delay:calc(var(--i) * 300ms)}
${KF('em-s', '0%{opacity:.12}45%{opacity:1}')}`,

  // 7. Particules : convergent pour former les contours puis se dispersent légèrement (canvas, ≤ 30 i/s, SCRIPT_PARTICULES) ;
  // les contours et les zones de l'image fixe reviennent à la fin
  'em-particules': `.ea--em-particules canvas{inset:0;width:100%;height:100%;color:var(--ea-t)}${R('em-particules')} .ea__c{animation:ea-em-pc ${D}ms ease both}${R('em-particules')} .ea__z use{animation:ea-em-pc ${D}ms ease both;animation-delay:calc(var(--z) * 150ms)}
${KF('em-pc', '0%,55%{opacity:0}')}`,

  // 8. Topographie : les lignes de niveau se propagent du sommet du relief vers le bord, en dégradé de la gamme (sans chiffre)
  'em-topographie': `.ea--em-topographie .ea__z use{stroke:color-mix(in oklab,color-mix(in oklab,var(--hp-vif) calc(var(--k) * 25%),var(--hp-aplat)) 70%,var(--ea-t));opacity:calc(.55 + var(--k) * .11)}
${R('em-topographie')} .ea__z use{animation:ea-em-o 1.5s cubic-bezier(.2,.7,.3,1) both;animation-delay:calc((4 - var(--k)) * 380ms + var(--j) * 160ms)}
${KF('em-o', '0%{opacity:0;transform:scale(.6)}55%{opacity:1}')}`,

  // 9. Au défilement : les zones s'allument au fil du défilement de la page (talon allumé, puis arche, puis avant-pied) ;
  // sans prise en charge (Firefox, anciens Safari) : image fixe
  'em-defilement': `@supports (animation-timeline:scroll()){${R('em-defilement')} .ea__z use:not([style*="0"]){animation:ea-em-in linear both;animation-timeline:scroll(root);animation-range:calc(var(--z) * 12vh - 12vh) calc(var(--z) * 12vh + 6vh)}}
${APPARAIT}`,

  // 10. Encre : fond clair de la gamme, trait foncé ; le contour puis chaque niveau se dessinent comme à la plume
  'em-encre': `.ea--em-encre .ea__z{filter:none;stroke-width:6}.ea--em-encre .ea__z use{opacity:calc(.35 + var(--k) * .16)}
${R('em-encre')} .ea__c{stroke-dasharray:1;animation:ea-em-tr 1.6s ease-in-out both}${R('em-encre')} .ea__z use{stroke-dasharray:1;animation:ea-em-tr 1.2s ease-in-out both;animation-delay:calc(1.2s + var(--k) * 450ms + var(--j) * 150ms)}
${TRACE}`,
};

/** Balisage de l'animation : `scene` (carte du bento) ou `embleme` (à côté du sur-titre) ; `vif` : tempo sportif (marche) */
export function htmlEmpreintes(a: AnimationEmpreintes, o: { placement?: 'scene' | 'embleme'; vif?: boolean } = {}): string {
  const cl = ['ea', 'ea--em', `ea--${o.placement ?? 'scene'}`, `ea--${a}`, a === 'em-encre' && 'ea--clair', o.vif && a === 'em-marche' && 'ea--vif'].filter(Boolean).join(' ');
  return `<span class="${cl}" aria-hidden="true">${corpsEmpreintes(a)}</span>`;
}

/** Feuille de l'animation (commune à la famille + propre) */
export const cssEmpreintes = (a: AnimationEmpreintes) => (COMMUN_EM + CSS_EM[a]).replace(/\n\s*/g, '');

/**
 * Script des particules (en ligne, seulement avec « em-particules », ≤ 1,4 Ko, sans « < » : le post-traitement typographique du
 * site découpe le HTML sur les chevrons). Corps d'une fonction de `h` (la section .hp) : l'admin l'exécute sur son aperçu. Les
 * cibles sont échantillonnées sur le contour dessiné (getPointAtLength : aucune coordonnée en double). Lecture quand la section
 * reçoit `ea-joue` (SCRIPT_ENTETE), arrêt dès qu'elle la perd (hors écran) ; 30 images/s au plus ; 2 × 46 particules.
 */
export const CORPS_PARTICULES = `var c=h.querySelector('.ea--em-particules canvas'),s=c&&c.nextElementSibling;if(!s||c.dataset.p)return;c.dataset.p=1;
var w=h.ownerDocument.defaultView,x=c.getContext('2d'),P,r=0,t0,lt,d,M=Math;
function f(T){if(!r)return;w.requestAnimationFrame(f);if(T-lt>=32){lt=T;var e=(T-t0)/${D};x.clearRect(0,0,c.width,c.height);if(e>=1)return r=0;
P.forEach(function(p){var u=M.min(1,M.max(0,(e-p.k)*2)),R=p.R*M.pow(1-u,3)+M.max(0,e-.7)*30*d;x.globalAlpha=M.min(1,u*3)*M.min(1,(1-e)/.28);x.fillRect(p.x+M.cos(p.a)*R-d,p.y+M.sin(p.a)*R-d,3*d,3*d)})}}
function g(){var j=h.classList.contains('ea-joue');if(j&&!r){var b=c.getBoundingClientRect(),q=s.querySelector('#eac'),L=q.getTotalLength();d=M.min(2,w.devicePixelRatio||1);c.width=b.width*d;c.height=b.height*d;x.fillStyle=w.getComputedStyle(c).color;P=[];
s.querySelectorAll('.ea__p').forEach(function(y){var m=y.getScreenCTM();for(var i=0;i!==46;i++){var o=q.getPointAtLength(L*i/46);P.push({x:(m.a*o.x+m.c*o.y+m.e-b.left)*d,y:(m.b*o.x+m.d*o.y+m.f-b.top)*d,a:M.random()*7,R:(.25+M.random()*.6)*b.width*d,k:M.random()*.25})}});
r=1;t0=lt=w.performance.now();w.requestAnimationFrame(f)}else if(!j&&r){r=0;x.clearRect(0,0,c.width,c.height)}}
new w.MutationObserver(g).observe(h,{attributes:!0,attributeFilter:['class']});g()`.replace(/\n/g, '');
/** Script du site (en ligne, après le premier écran) */
export const SCRIPT_PARTICULES = `(function(){var h=document.querySelector('.hp[data-ea]');if(!h)return;${CORPS_PARTICULES}})()`;

/** Animation d'en-tête de la famille (garde de type pour entete-anim.ts) */
export const estEmpreintes = (a: AnimationEntete | null | undefined): a is AnimationEmpreintes => estAnimationEmpreintes(a);
