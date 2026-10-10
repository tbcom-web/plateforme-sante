// « Animations du pied » (demande de Paul du 2026-10-09 : « plus d'illustrations animées qui rappellent les points de pression
// d'un pied, les courbes de température en forme de pied, les couches d'une semelle thermoformée qui se compose en plusieurs temps,
// des petits pas d'enfants colorés en rond, des silhouettes de pieds de plusieurs membres de la famille qui se dessinent »).
// Même famille et mêmes règles que les empreintes en lignes de niveau (entete-empreintes.ts) : visuel du premier écran ou carte du
// bento, en emblème ailleurs ; panneau sombre de la gamme ou clair « encre ».
//
// AUCUN DESSIN NOUVEAU : tout vient des géométries validées (entete-pied-geo.ts, généré par entete-pied-derive.ts) — silhouettes du
// pied adulte, enfant et tout-petit (celles du héros « enfant » et de l'animation « premiers pas »), courbes d'égale pression du
// champ de la trame de baropodométrie, courbes d'égale distance au bord de la silhouette (isothermes stylisées) et semelle
// POD-AT-0004 (contour, coque, talonnette, soutien de voûte, barre rétrocapitale). Aucun chiffre, aucune échelle, aucun texte :
// rien qui ressemble à une mesure ni à un diagnostic.
//
// Règles (entete-pied.test.ts, planche « animations du pied ») : < 5 Ko par animation ; seuls transform, opacity et
// stroke-dashoffset sont animés ; image FIXE par défaut (sans script, réduction des animations, Économiseur de données) = la
// dernière image de la lecture ; lecture ≤ ~5,5 s sous `.ea-joue` (SCRIPT_ENTETE / SCRIPT_VISUEL_ANIME), arrêt hors écran ;
// couleurs = variables de la gamme (--hp-*) ; diabète : variante froide des isothermes, jamais la couleur vive de la gamme.

import { GEO_PIED as G } from './entete-pied-geo';
import { PRESSION } from './univers';
import { svgAnalyseCourseScene, cssAnalyseCourseScene } from './analyse-course';

export const ANIMATIONS_PIED = ['pi-pression', 'pi-isothermes', 'pi-isothermes-froid', 'pi-couches', 'pi-ronde', 'pi-famille', 'pi-talon', 'pi-chevrons', 'pi-chrono', 'pi-trail-montagne', 'pi-analyse-course'] as const;
export type AnimationPied = (typeof ANIMATIONS_PIED)[number];
export const estAnimationPied = (a: unknown): a is AnimationPied => (ANIMATIONS_PIED as readonly unknown[]).includes(a);
/**
 * Thèmes de chaque animation (visuel animé du premier écran et kits : heros-anime.ts) ; « general » = famille / généraliste.
 * Diabète : seulement la variante froide des isothermes ; jamais les animations vives (ANIMATIONS_PIED_VIVES) pour le diabète ni
 * les seniors.
 */
export const SUJETS_ANIMATIONS_PIED: Readonly<Record<AnimationPied, readonly string[]>> = {
  'pi-pression': ['semelles', 'sport', 'posture'], 'pi-isothermes': ['semelles', 'sport', 'posture', 'general'], 'pi-isothermes-froid': ['diabete', 'senior'],
  'pi-couches': ['semelles'], 'pi-ronde': ['enfant'], 'pi-famille': ['general', 'enfant'], 'pi-talon': ['semelles', 'sport', 'senior', 'pedicurie', 'general'],
  'pi-chevrons': ['sport'], 'pi-chrono': ['sport'], 'pi-trail-montagne': ['sport'],
  // Analyse de la foulée (analyse-course.ts, 2026-10-10) : jambes en aplat, tracés et données classiques d'une analyse de course
  'pi-analyse-course': ['sport'],
};
/** Animations vives (énergie forte) : jamais pour le diabète ni les seniors */
export const ANIMATIONS_PIED_VIVES: readonly AnimationPied[] = ['pi-ronde', 'pi-chevrons', 'pi-chrono'];

const J = '.ea-joue';
const r1 = (v: number) => Math.round(v * 100) / 100;
const svg = (c: string) => `<svg viewBox="0 0 300 240" fill="none" stroke-linecap="round" stroke-linejoin="round">${c}</svg>`;
/** Deux pieds face à face (gauche en miroir), échelle 0,23 du repère × 4 : la scène des empreintes en lignes de niveau */
const PIEDS = ['translate(142 17)scale(-.23 .23)', 'translate(158 17)scale(.23)'];
const paire = (c: (j: number) => string) => PIEDS.map((t, j) => `<g class="ep__p" transform="${t}" style="--j:${j}">${c(j)}</g>`).join('');

// 1. Carte de pression ----------------------------------------------------------------------------------------------------------
const corpsPression = () => svg(`<defs><path id="epa" d="${G.adulte}" pathLength="1"/>${G.pression.map((p) => `<path id="epz${p.z}${p.k}" d="${p.d}"/>`).join('')}</defs>${
  paire(() => `<use href="#epa" class="ep__c"/>${G.pression.map((p) => `<use href="#epz${p.z}${p.k}" class="ep__n" style="--z:${p.z};--k:${p.k}"/>`).join('')}`)}`);

// 2. Isothermes -----------------------------------------------------------------------------------------------------------------
const corpsIsothermes = () => svg(`<defs><path id="epa" d="${G.adulte}" pathLength="1"/>${G.isothermes.map((p) => `<path id="epi${p.k}" d="${p.d}" pathLength="1"/>`).join('')}</defs>${
  paire(() => `<use href="#epa" class="ep__c"/>${G.isothermes.map((p) => `<use href="#epi${p.k}" class="ep__n" style="--k:${p.k}"/>`).join('')}`)}`);

// 3. Semelle thermoformée en vue éclatée de 3/4 ---------------------------------------------------------------------------------
// La semelle (repère × 4, 368 × 888) posée à plat, vue en surplomb : rotation dans son plan (pointe vers le haut à droite), puis
// raccourci de la profondeur. Couches de bas en haut : coque, éléments correcteurs (talonnette, soutien de voûte, barre
// rétrocapitale), mousse, recouvrement ; chacune descend à sa place, puis la semelle finie.
const MATRICE_34 = (() => {
  const t = (-64 * Math.PI) / 180, s = 0.3, k = 0.56, [cx, cy] = [184, 444];
  const [a, b, c, d] = [s * Math.cos(t), s * k * Math.sin(t), -s * Math.sin(t), s * k * Math.cos(t)];
  return `matrix(${[a, b, c, d, 132 - a * cx - c * cy, 140 - b * cx - d * cy].map(r1).join(' ')})`;
})();
/** Épaisseur apparente d'une couche (px de la scène) */
const EP = 5;
const COUCHES: { id: string; d: string; cl: string }[] = [
  { id: 'coque', d: G.semelle.coque, cl: 'ep__q' },
  { id: 'elements', d: G.semelle.talonnette + G.semelle.voute + G.semelle.barre, cl: 'ep__e' },
  { id: 'mousse', d: G.semelle.contour, cl: 'ep__m' },
  { id: 'dessus', d: G.semelle.contour, cl: 'ep__r' },
];
const corpsCouches = () => svg(`<defs>${COUCHES.slice(0, 3).map((c, i) => `<path id="eps${i}" d="${c.d}"/>`).join('')}</defs>${
  COUCHES.map((c, i) => {
    const h = `#eps${Math.min(i, 2)}`;
    return `<g class="ep__l ${c.cl}" style="--i:${i}"><g transform="translate(0 ${r1(-i * EP)})"><use href="${h}" transform="${MATRICE_34}" class="ep__b"/><use href="${h}" transform="translate(0 ${-EP})${MATRICE_34}" class="ep__t"/></g></g>`;
  }).join('')}`);

// 4. Petits pas d'enfant en rond ------------------------------------------------------------------------------------------------
// Silhouette validée du pied d'enfant (PLANTE / ORTEILS en croissance, vers 6 ans : orteils lisibles, jamais une « feuille »), dix
// pas qui tournent en rond (sens trigonométrique), gauche (miroir) et droit de part et d'autre du cercle, pointe dans le sens de la
// marche ; couleurs de la gamme en alternance.
const N_RONDE = 8;
const RONDE = Array.from({ length: N_RONDE }, (_, i) => {
  const a = -Math.PI / 2 - (i * 2 * Math.PI) / N_RONDE, [R, cx, cy, e] = [84, 150, 120, 0.08];
  const hx = Math.sin(a), hy = -Math.cos(a); // direction de la marche (tangente, sens trigonométrique à l'écran)
  const cote = i % 2 ? 1 : -1, off = cote * 9; // gauche à l'extérieur, droit à l'intérieur
  const x = cx + R * Math.cos(a) - hy * off, y = cy + R * Math.sin(a) + hx * off;
  const ang = (Math.atan2(hx, -hy) * 180) / Math.PI;
  return `<g transform="translate(${r1(x)} ${r1(y)})rotate(${r1(ang)})scale(${cote < 0 ? -e : e} ${e})translate(-184 -444)"><use href="#epe" class="ep__pp" style="--i:${i};--c:${i % 4}"/></g>`;
}).join('');
const corpsRonde = () => svg(`<defs><path id="epe" d="${G.enfant}"/></defs>${RONDE}`);

// 5. La famille -----------------------------------------------------------------------------------------------------------------
// Deux adultes derrière, l'enfant et le tout-petit devant (comparaison adulte / enfant aimée : héros « enfant » en trait
// continu) : chaque paire se dessine au trait, puis se remplit légèrement. Échelles : enfant ≈ 0,68 × l'adulte, tout-petit ≈ 0,5
// (pied.ts, règle 11).
const FAMILLE: { id: string; x: number; y: number; e: number }[] = [
  { id: 'epa', x: 84, y: 6, e: 0.13 }, { id: 'epa', x: 216, y: 10, e: 0.122 }, { id: 'epe', x: 116, y: 142, e: 0.088 }, { id: 'epb', x: 192, y: 164, e: 0.065 },
];
const corpsFamille = () => svg(`<defs><path id="epa" d="${G.adulte}" pathLength="1"/><path id="epe" d="${G.enfant}" pathLength="1"/><path id="epb" d="${G.bebe}" pathLength="1"/></defs>${
  FAMILLE.map((m, i) => {
    const ecart = 368 * m.e * 0.12 + 2;
    return `<g class="ep__f" style="--i:${i}">${[-1, 1].map((s) => `<g transform="translate(${r1(m.x + s * ecart)} ${m.y})scale(${s * m.e} ${m.e})"><use href="#${m.id}" class="ep__fr"/><use href="#${m.id}" class="ep__c"/></g>`).join('')}</g>`;
  }).join('')}`);

// 6. Talon douloureux (« light flat design ») -----------------------------------------------------------------------------------
// La silhouette validée du pied adulte en aplat doux de la gamme, un seul halo autour du talon (centre du talon de la trame de
// pression : 48 ; 198 du repère du pied) qui respire. Jamais une cible : un cercle, aucun anneau concentrique, aucune croix.
const corpsTalon = () => svg(`<g transform="translate(103 8)scale(.252)"><path d="${G.adulte}" class="ep__fl"/><circle cx="192" cy="786" r="116" class="ep__h"/></g>`);

// 7. Chevrons de vitesse --------------------------------------------------------------------------------------------------------
// Une rangée de grands chevrons et deux rangées plus fines qui s'allument en cascade, de gauche à droite (sport, course).
const CHEVRONS = [{ y: 120, n: 6, x0: 46, dx: 42, e: 1, r: 0 }, { y: 62, n: 8, x0: 34, dx: 32, e: 0.5, r: 1 }, { y: 178, n: 8, x0: 50, dx: 32, e: 0.5, r: 1 }]
  .flatMap((l) => Array.from({ length: l.n }, (_, i) => `<g transform="translate(${l.x0 + i * l.dx} ${l.y})scale(${l.e})"><use href="#epv" class="ep__v${l.r ? ' ep__v2' : ''}" style="--i:${i}"/></g>`)).join('');
const corpsChevrons = () => svg(`<defs><path id="epv" d="M-12-30 12 0-12 30"/></defs>${CHEVRONS}`);

// 8. Chronomètre de sport (grammaire des dessins de matériel) : boîtier rond, poussoir et bouton, cadran à graduations SANS
// chiffre, petit compteur, aiguille qui fait plusieurs tours très vite puis s'arrête net ; traits de vitesse. Aucun temps affiché.
const corpsChrono = () => svg(`<path class="ep__vl" d="M24 104h46M10 128h60M32 152h38"/><g class="ep__k"><path d="M148 34h20a5 5 0 0 1 0 10h-20a5 5 0 0 1 0-10zM152 44h12v10h-12z"/><path d="M152 44h12v10h-12z" transform="rotate(42 158 130)"/><circle cx="158" cy="130" r="76"/></g><circle cx="158" cy="130" r="64" class="ep__ca"/><circle cx="158" cy="130" r="57" pathLength="60" class="ep__g"/><circle cx="158" cy="130" r="55" pathLength="12" class="ep__g ep__g2"/><circle cx="158" cy="160" r="13" class="ep__sc"/><path d="M158 160v-10" class="ep__a ep__a2"/><path d="M158 142V76" class="ep__a ep__a1"/><circle cx="158" cy="130" r="5" class="ep__ax"/>`);

// 9. Montagne (trek, trail, randonnée) : courbes de niveau, ligne de crête, sentier en lacets qui se dessine, pas qui avancent le
// long du sentier, repère du sommet. Carte illustrative : aucun personnage, aucune valeur.
const corpsMontagne = () => svg(`<g transform="scale(.25)">${G.montagne.niveaux.map((n) => `<path d="${n.d}" class="ep__mn" style="--k:${n.k}"/>`).join('')}<path d="${G.montagne.crete}" class="ep__cr"/></g><path d="${G.montagne.sentier}" pathLength="1" class="ep__st"/>${
  `<g class="ep__ps">${G.montagne.pas.map(([x, y, a], i) => { const u = Math.sin((a * Math.PI) / 180) * 1.6, v = -Math.cos((a * Math.PI) / 180) * 1.6; return `<path d="M${r1(x - u)} ${r1(y - v)}l${r1(2 * u)} ${r1(2 * v)}" style="--i:${i}"/>`; }).join('')}</g>`}<path d="M176 57l8 13h-16z" class="ep__sm"/>`);

/** Balisage (contenu de la boîte .ea) */
export function corpsPied(a: AnimationPied): string {
  switch (a) {
    case 'pi-pression': return corpsPression();
    case 'pi-isothermes': case 'pi-isothermes-froid': return corpsIsothermes();
    case 'pi-couches': return corpsCouches();
    case 'pi-ronde': return corpsRonde();
    case 'pi-famille': return corpsFamille();
    case 'pi-talon': return corpsTalon();
    case 'pi-chevrons': return corpsChevrons();
    case 'pi-chrono': return corpsChrono();
    case 'pi-trail-montagne': return corpsMontagne();
    case 'pi-analyse-course': return svgAnalyseCourseScene();
  }
}

const KF = (n: string, c: string) => `@keyframes ea-pi-${n}{${c}}`;
/** Accent chaud doux (talon) : l'orange de la palette de pression adouci par le trait du panneau — jamais pour le diabète */
const CHAUD = `color-mix(in oklab,${PRESSION[3]} 62%,var(--ea-t))`;
/** Dégradé du niveau k sur n : du bord (teinté de la couleur vive de la gamme) au pic (le trait du panneau, le plus lumineux) */
const degrade = (k: string, n: number) => `color-mix(in oklab,var(--hp-vif) calc((${n} - ${k}) * ${r1(70 / n)}%),var(--ea-t))`;

/**
 * Feuille commune : panneau de la gamme (sombre par défaut, clair « encre »), emblème, réduction des animations. Mêmes variables
 * que les empreintes en lignes de niveau (--ea-f fond, --ea-t trait).
 */
const COMMUN_PI = `.ea--pi{--ea-f:var(--hp-sombre);--ea-t:var(--hp-sombre-texte);position:relative;display:block;flex:none;pointer-events:none;background:var(--ea-f);border-radius:var(--hp-r,20px);overflow:hidden}
.ea--pi.ea--clair{--ea-f:var(--hp-doux);--ea-t:var(--hp-encre)}.ea--pi svg{position:absolute;inset:5%;width:90%;height:90%;overflow:visible;stroke:var(--ea-t)}
.ep__n,.ep__l,.ep__pp,.ep__h,.ep__v,.ep__vl,.ep__sm,.ep__mn{transform-box:fill-box;transform-origin:50% 50%}.ep__c{stroke-width:6;opacity:.55}
.ea--scene{position:absolute;inset:0}.ea--embleme.ea--pi{width:84px;height:68px;margin:0 0 -4px;background:none;--ea-t:var(--hp-accent-texte)}.ea--embleme svg{inset:0;width:100%;height:100%}
@media (min-width:900px){.ea--embleme.ea--pi{width:100px;height:80px}}
@media (prefers-reduced-motion:reduce){.ea *{animation:none!important}}`;

const R = (s: string) => `${J} .ea--${s}`;
/** Isothermes : couleurs, tracé (de l'intérieur vers le bord, comme une chaleur qui se propage) */
const isothermes = (a: AnimationPied, couleur: string) => `.ea--${a} .ep__n{stroke-width:7;stroke:${couleur};fill:${couleur};fill-opacity:.13;opacity:calc(.6 + var(--k) * .1)}
${R(a)} .ep__c{stroke-dasharray:1;animation:ea-pi-tr 1.3s cubic-bezier(.6,0,.3,1) both}${R(a)} .ep__n{stroke-dasharray:1;animation:ea-pi-tr 1.6s cubic-bezier(.4,0,.2,1) both,ea-pi-in 1.6s ease-out both;animation-delay:calc(.5s + (4 - var(--k)) * 420ms + var(--j) * 120ms)}
${KF('tr', '0%{stroke-dashoffset:1}100%{stroke-dashoffset:0}')}${KF('in', '0%{opacity:0}')}`;

/** Feuille propre : état fixe (la dernière image) puis lecture sous .ea-joue */
const CSS_PI: Record<AnimationPied, string> = {
  // Analyse de la foulée (analyse-course.ts) : SEULE animation du pied avec des chiffres (exception accordée par Paul le 2026-10-10 :
  // données classiques d'une analyse de course, valeurs génériques illustratives)
  'pi-analyse-course': cssAnalyseCourseScene(J), // classes ac-* propres à cette animation : sélecteur de lecture court

  // Zones talon → têtes métatarsiennes → hallux (ordre du déroulé) : anneaux d'égale pression qui montent du bord vers le pic,
  // s'élargissent un peu puis se posent ; aplats superposés : le pic est le plus dense
  'pi-pression': `.ea--pi-pression .ep__n{stroke-width:7;stroke:${degrade('var(--k)', 3)};fill:${degrade('var(--k)', 3)};fill-opacity:.24}.ea--pi-pression .ep__p,.ea--pi-isothermes .ep__p{filter:drop-shadow(0 0 10px color-mix(in srgb,var(--hp-vif) 60%,transparent))}.ea--clair .ep__p{filter:none!important}
${R('pi-pression')} .ep__n{animation:ea-pi-p 1.5s cubic-bezier(.3,1.3,.5,1) both;animation-delay:calc(var(--z) * 1s + var(--k) * 230ms + var(--j) * 140ms)}
${KF('p', '0%{opacity:0;transform:scale(.5)}45%{opacity:1}')}`,

  'pi-isothermes': isothermes('pi-isothermes', degrade('var(--k)', 4)),
  // Diabète : jamais la couleur vive de la gamme ni le rouge de la palette de pression ; bleus de la charte adoucis par le trait
  'pi-isothermes-froid': isothermes('pi-isothermes-froid', `color-mix(in oklab,color-mix(in oklab,${PRESSION[1]} calc(var(--k) * 25%),${PRESSION[0]}) 55%,var(--ea-t))`),

  // Couches qui descendent l'une après l'autre et se posent ; tranche (trait) sous chaque couche
  'pi-couches': `.ep__l use{stroke-width:5;vector-effect:non-scaling-stroke}.ep__b{stroke-opacity:.5}.ep__t{fill:var(--ea-f)}.ep__l .ep__b{stroke-width:1.2}.ep__l .ep__t{stroke-width:1.6}
.ep__q .ep__t{fill:color-mix(in oklab,var(--hp-vif) 55%,var(--ea-t))}.ep__e .ep__t{fill:color-mix(in oklab,var(--hp-vif) 18%,var(--ea-t))}
.ep__m .ep__t{fill:color-mix(in srgb,var(--ea-t) 28%,var(--ea-f));fill-opacity:.55}.ep__r .ep__t{fill:color-mix(in oklab,var(--hp-vif) 40%,var(--ea-f));fill-opacity:.42}
${R('pi-couches')} .ep__l{animation:ea-pi-c 1.1s cubic-bezier(.3,1.25,.5,1) both;animation-delay:calc(var(--i) * 850ms + 200ms)}
${KF('c', '0%{opacity:0;transform:translateY(-38%)}40%{opacity:1}')}`,

  // Petits pas d'enfant : un à un, couleurs de la gamme, petit rebond ; fond clair : couleur vive, encre et gris-bleu seulement
  // (jamais une suite beige / brun / foncé qui se lirait comme des couleurs de peau)
  'pi-ronde': `.ep__pp{stroke-width:22;fill:currentColor;stroke:currentColor;color:color-mix(in srgb,var(--hp-vif) 82%,var(--ea-t))}.ep__pp[style*="c:1"]{color:color-mix(in srgb,var(--hp-aplat) 75%,var(--ea-t))}.ep__pp[style*="c:2"]{color:var(--ea-t)}.ep__pp[style*="c:3"]{color:color-mix(in srgb,var(--hp-accent-texte) 70%,var(--ea-t))}
.ea--clair .ep__pp{color:var(--hp-vif)}.ea--clair .ep__pp[style*="c:1"]{color:color-mix(in oklab,var(--hp-encre) 35%,var(--hp-doux))}
${R('pi-ronde')} .ep__pp{animation:ea-pi-r .8s cubic-bezier(.3,1.6,.5,1) both;animation-delay:calc(var(--i) * 400ms + 150ms)}
${KF('r', '0%{opacity:0;transform:translateY(10%) scale(.45)}55%{opacity:1}')}`,

  // Famille : chaque paire se dessine au trait, puis se remplit légèrement
  'pi-famille': `.ep__f .ep__c{stroke-width:9;opacity:1}.ep__fr{fill:color-mix(in srgb,var(--hp-vif) 65%,var(--ea-t));opacity:.24}.ep__f[style*="i:1"] .ep__fr{fill:color-mix(in srgb,var(--hp-aplat) 65%,var(--ea-t))}.ep__f[style*="i:3"] .ep__fr{fill:color-mix(in srgb,var(--hp-accent-texte) 70%,var(--ea-t))}
${R('pi-famille')} .ep__f .ep__c{stroke-dasharray:1;animation:ea-pi-tr 1.1s cubic-bezier(.6,0,.3,1) both;animation-delay:calc(var(--i) * 900ms)}${R('pi-famille')} .ep__fr{animation:ea-pi-in 1s ease-out both;animation-delay:calc(var(--i) * 900ms + 1s)}
${KF('tr', '0%{stroke-dashoffset:1}100%{stroke-dashoffset:0}')}${KF('in', '0%{opacity:0}')}`,

  // Talon : aplat doux, un halo chaud (abricot de la palette de la charte, adouci par le trait : jamais un rouge) qui respire
  // (trois souffles lents), puis reste visible
  'pi-talon': `.ep__fl{fill:color-mix(in oklab,var(--hp-aplat) 70%,var(--ea-f));stroke:color-mix(in oklab,var(--hp-aplat) 60%,var(--ea-t));stroke-width:5}.ea--pi-talon:not(.ea--clair) .ep__fl{fill:color-mix(in oklab,var(--hp-aplat) 22%,var(--ea-f))}
.ep__h{fill:${CHAUD};fill-opacity:.3;stroke:${CHAUD};stroke-width:9;opacity:.9}
${R('pi-talon')} .ep__h{animation:ea-pi-h 1.3s ease-in-out 3 both;animation-delay:.3s}
${KF('h', '0%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.08)}100%{opacity:.9;transform:none}')}`,

  // Chevrons : trois vagues de gauche à droite, puis image fixe en dégradé (les plus vifs devant)
  'pi-chevrons': `.ep__v{stroke:color-mix(in oklab,var(--hp-vif) 60%,var(--ea-t));stroke-width:11;opacity:calc(.2 + var(--i) * .15)}.ep__v2{stroke:var(--ea-t);stroke-width:14;opacity:calc(.1 + var(--i) * .07)}
${R('pi-chevrons')} .ep__v{animation:ea-pi-v 1.2s cubic-bezier(.2,.7,.3,1) 3 both;animation-delay:calc(var(--i) * 80ms)}
${KF('v', '0%{opacity:0;transform:translateX(-60%)}35%{opacity:1}')}`,

  // Chrono : l'aiguille fait cinq tours très vite et s'arrête net (petit rebond), traits de vitesse pendant la course
  'pi-chrono': `.ep__k{stroke:var(--ea-t);stroke-width:4;fill:color-mix(in oklab,var(--hp-vif) 30%,var(--ea-f))}.ep__ca{fill:var(--ea-f);stroke:var(--ea-t);stroke-width:2;opacity:.9}.ep__g{stroke:var(--ea-t);stroke-width:3;stroke-dasharray:.08 .92;opacity:.55}.ep__g2{stroke-width:8;stroke-dasharray:.04 .96;opacity:.9}
.ep__sc{stroke:var(--ea-t);stroke-width:1.5;opacity:.6}.ep__a{stroke:color-mix(in oklab,var(--hp-vif) 55%,var(--ea-t));stroke-width:4;transform-box:view-box;transform-origin:158px 130px;transform:rotate(48deg)}.ep__a2{stroke-width:2.5;transform-origin:158px 160px;transform:rotate(130deg)}.ep__ax{fill:var(--ea-t)}
.ep__vl{stroke:color-mix(in oklab,var(--hp-vif) 50%,var(--ea-t));stroke-width:5;opacity:.45;transform-origin:100% 50%}
${R('pi-chrono')} .ep__a1{animation:ea-pi-a 2.2s linear both;animation-delay:.3s}${R('pi-chrono')} .ep__a2{animation:ea-pi-b 2.2s ease-out both;animation-delay:.3s}${R('pi-chrono')} .ep__vl{animation:ea-pi-l 2.6s ease-out both;animation-delay:.3s}
${KF('a', '0%{transform:rotate(-1752deg)}86%{transform:rotate(54deg)}93%{transform:rotate(45deg)}100%{transform:rotate(48deg)}')}${KF('b', '0%{transform:rotate(-230deg)}')}${KF('l', '0%{opacity:0;transform:scaleX(.2)}15%,70%{opacity:1;transform:none}')}`,

  // Montagne : courbes de niveau du bas vers le sommet, crête, sentier qui se dessine, pas qui avancent, sommet
  'pi-trail-montagne': `.ep__mn{stroke:color-mix(in oklab,var(--hp-vif) calc(70% - var(--k) * 11%),var(--ea-t));stroke-width:5;opacity:calc(.4 + var(--k) * .12)}.ep__cr{stroke:var(--ea-t);stroke-width:7;stroke-dasharray:6 14;opacity:.7}
.ep__st{stroke:color-mix(in oklab,var(--hp-vif) 45%,var(--ea-t));stroke-width:2.6}.ep__ps{stroke:var(--ea-t);stroke-width:2.6}.ep__sm{fill:color-mix(in oklab,var(--hp-vif) 50%,var(--ea-t))}
${R('pi-trail-montagne')} .ep__mn{animation:ea-pi-in 1.2s ease-out both,ea-pi-m 1.2s ease-out both;animation-delay:calc(var(--k) * 180ms)}${R('pi-trail-montagne')} .ep__st{stroke-dasharray:1;animation:ea-pi-tr 2s ease-in-out both;animation-delay:1.5s}${R('pi-trail-montagne')} .ep__ps path{animation:ea-pi-in .3s ease-out both;animation-delay:calc(1.6s + var(--i) * 120ms)}${R('pi-trail-montagne')} .ep__sm{animation:ea-pi-r .7s cubic-bezier(.3,1.6,.5,1) both;animation-delay:4.3s}
${KF('tr', '0%{stroke-dashoffset:1}100%{stroke-dashoffset:0}')}${KF('in', '0%{opacity:0}')}${KF('m', '0%{transform:scale(.94)}')}${KF('r', '0%{opacity:0;transform:translateY(10%) scale(.45)}55%{opacity:1}')}`,
};

/** Balisage de l'animation : `scene` (visuel du premier écran, carte du bento) ou `embleme` (à côté du sur-titre) */
export function htmlPied(a: AnimationPied, o: { placement?: 'scene' | 'embleme' } = {}): string {
  return `<span class="ea ea--pi ea--${o.placement ?? 'scene'} ea--${a}" aria-hidden="true">${corpsPied(a)}</span>`;
}

/** Feuille de l'animation (commune à la famille + propre) */
export const cssPied = (a: AnimationPied) => (COMMUN_PI + CSS_PI[a]).replace(/\n\s*/g, '');
