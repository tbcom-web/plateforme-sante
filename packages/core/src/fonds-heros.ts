// FOND DU PREMIER ÉCRAN (retour de Paul du 2026-10-09, sur la présélection « Éditorial chic · aéré · typo didone · trait fin,
// typographique », fond violet uni et grand titre serif : « Je trouve ce modèle assez vide : juste du texte sur fond de couleur, il
// manque de la matière en arrière-plan, comme une illustration ou autre »).
//
// Règle « jamais un premier écran vide » : un premier écran SANS visuel principal (PREMIERS_ECRANS_SANS_VISUEL : typographique,
// compositions de formes du lot 2) porte une couche de MATIÈRE en arrière-plan, l'ingrédient `fond-heros` (dé et verrou du
// Studio, notable, duels). Les options reprennent ce que Paul aime :
// - empreintes : les deux semelles en lignes de niveau (géométries VALIDÉES d'entete-empreintes-geo.ts : contour du héros
//   « semelles » relevé et courbes de niveau du relief, rien de redessiné), en grand et en filigrane, débordant du cadre ;
// - topographie : lignes de niveau abstraites (relief, aucune anatomie) qui débordent du cadre ;
// - formes : formes organiques de la gamme qui se chevauchent ; formes-franches : disque, demi-disque et bande (registre pop) ;
// - trame : trame de points de pression (signature de la marque), plus dense là où « ça appuie » ;
// - illustration : l'illustration du thème (kit) en grand, recadrée et estompée (emplacement `fente` de htmlHeros) ;
// - trajectoires : trajet du déroulé du pas (géométrie validée, pied.ts TRAJET), en pointillés, comme une marche.
// Contraintes : STATIQUE (l'animation reste l'ingrédient « Animation d'en-tête ») ; < 4 Ko balisage + feuille par option (hors
// illustration, qui est le visuel du kit) ; jamais d'image en url() (le titre reste l'élément LCP : un SVG en ligne ou un dégradé
// n'est pas candidat) ; position absolue (CLS 0) ; contraste AA du texte CALCULÉ : la couche entière a une opacité ≤ alphaFond,
// celle où le pire pixel (motif plein sous le texte) garde chaque texte ≥ 4,5:1 — le motif est en plus posé du côté opposé au texte.

import { contraste, melanger } from './couleurs';
import { GEO_EMPREINTES as G } from './entete-empreintes-geo';
import { estPremierEcranSansVisuel, FOND_HEROS_PAR_FAMILLE, FOND_HEROS_SUR, estFondHeros, type FondHeros } from './heros-photo-variantes';

/** Opacité de chaque option (plafond de dessin ; l'opacité réelle est min(plafond, alphaFond)) */
export const PLAFONDS_FONDS_HEROS: Record<Exclude<FondHeros, 'aucun'>, number> = {
  empreintes: 0.34, topographie: 0.3, formes: 0.6, 'formes-franches': 0.9, trame: 0.38, illustration: 0.3, trajectoires: 0.42,
};

/**
 * Opacité maximale (≤ `plafond`) d'une couche de `motifs` posée sur chacun des `fonds` pour que chacun des `textes` garde `min` de
 * contraste sur le PIRE pixel (motif plein, mélange sRGB comme la composition alpha des navigateurs). 0 si le fond seul échoue.
 */
export function alphaFond(fonds: readonly string[], textes: readonly string[], motifs: readonly string[], plafond = 1, min = 4.5): number {
  for (let a = Math.round(plafond * 100); a >= 0; a--) {
    if (fonds.every((f) => motifs.every((m) => { const px = melanger(f, m, a / 100); return textes.every((t) => contraste(t, px) >= min); }))) return a / 100;
  }
  return 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Dessins (constantes calculées une fois)
// ---------------------------------------------------------------------------------------------------------------

const r1 = (v: number) => Math.round(v * 10) / 10;
/** Opacité de chaque niveau de relief (du plus bas au plus haut), comme le dessin « semelle » */
const OPACITE = ['.35', '.5', '.65', '.8', '1'];

/** Deux semelles (pied gauche en miroir, pied droit décalé d'un demi-pas), repère du pied droit × 4 (368 × 888) */
const SVG_EMPREINTES = `<svg viewBox="0 0 800 1000" aria-hidden="true"><defs><g id="hpfh-p"><path d="${G.contour}"/>${G.groupes
  .map((g) => `<path d="${g.d}" stroke-opacity="${OPACITE[g.k]}"/>`).join('')}</g></defs><use href="#hpfh-p" transform="matrix(-1 0 0 1 368 0)"/><use href="#hpfh-p" transform="translate(432 112)"/></svg>`;

/** Lignes de niveau abstraites : copies imbriquées de deux contours irréguliers, centres qui dérivent (aucun dessin anatomique) */
const BLOBS = ['M0-100C42-98 78-80 92-40S96 46 64 78-14 106-52 88-104 36-96-8-48-102 0-100Z', 'M8-96C52-90 98-62 98-12S70 78 24 94-62 98-90 56-98-44-62-78-30-98 8-96Z'];
const TOPO = (() => {
  const l: string[] = [];
  // Sommet principal (côté droit, haut) : 11 courbes ; second relief (bas à droite) : 5 courbes ; tout déborde du cadre
  for (let i = 1; i <= 11; i++) l.push(`<use href="#hpfh-b${i % 2}" transform="translate(${r1(760 - i * 9)} ${r1(270 + i * 6)})rotate(${i * 7})scale(${r1(0.42 * i * 10) / 10})"/>`);
  for (let i = 1; i <= 5; i++) l.push(`<use href="#hpfh-b${(i + 1) % 2}" transform="translate(${r1(1010 + i * 4)} ${r1(760 - i * 5)})rotate(${-i * 9})scale(${r1(0.5 * i * 10) / 10})"/>`);
  return l.join('');
})();
const SVG_TOPOGRAPHIE = `<svg viewBox="0 0 1000 700" aria-hidden="true"><defs>${BLOBS.map((d, i) => `<path id="hpfh-b${i}" d="${d}"/>`).join('')}</defs>${TOPO}</svg>`;

/**
 * Trajectoires : le trajet du déroulé (talon → bord externe → avant-pied → gros orteil, géométrie validée) répété six fois le
 * long d'une marche en diagonale, pied gauche (miroir) et droit en alternance ; pointillés, point d'appui du talon.
 */
const TRAJETS = (() => {
  const [ax, ay, bx, by] = [300, 1060, 1040, -60], n = 6, e = 0.42;
  const lg = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / lg, uy = (by - ay) / lg, angle = (Math.atan2(ux, -uy) * 180) / Math.PI;
  return Array.from({ length: n }, (_, i) => {
    const d = (i + 0.5) * (lg / n), cote = i % 2 ? 1 : -1;
    const cx = ax + ux * d - uy * cote * 46, cy = ay + uy * d + ux * cote * 46;
    // Milieu du trajet (repère ×4) : (150, 446) ; miroir pour le pied gauche
    return `<g transform="translate(${r1(cx)} ${r1(cy)})rotate(${r1(angle + cote * 6)})scale(${cote < 0 ? -e : e} ${e})translate(-150 -446)"><use href="#hpfh-t"/><use href="#hpfh-t" class="hpfh-p" transform="translate(-34 14)"/><circle cx="192" cy="828" r="18"/></g>`;
  }).join('');
})();
const SVG_TRAJECTOIRES = `<svg viewBox="0 0 1000 1000" aria-hidden="true"><defs><path id="hpfh-t" d="${G.trajet}"/></defs>${TRAJETS}</svg>`;

/** Balisage de la couche (dans la section .hp, avant le cadre du texte) ; « illustration » : l'appelant remplit la fente */
export function htmlFondHeros(f: FondHeros, alpha: number, zone?: { alpha: number; mobile: number | null } | null): { avant: string; apres: string } {
  if (f === 'aucun') return { avant: '', apres: '' };
  // `zone` : premier écran dont le texte reste dans sa colonne (formes du lot 2) : hors de cette colonne (masque), la couche
  // prend l'opacité `zone.alpha` (aucun texte dessous) ; `mobile` : hauteur (px) de la composition au-dessus du texte sur téléphone
  const cl = zone ? ` hp__fh--zone${zone.mobile ? ' hp__fh--zone-tel' : ''}` : '';
  const o = `<div class="hp__fh hp__fh--${f}${cl}" aria-hidden="true" style="--hp-fh-a:${alpha}${zone ? `;--hp-fh-a2:${zone.alpha}` : ''}${zone?.mobile ? `;--hp-fh-h:${zone.mobile}px` : ''}">`;
  const corps: Record<Exclude<FondHeros, 'aucun' | 'illustration'>, string> = {
    empreintes: SVG_EMPREINTES, topographie: SVG_TOPOGRAPHIE, trajectoires: SVG_TRAJECTOIRES, trame: '',
    formes: '<span></span><span></span><span></span>', 'formes-franches': '<span></span><span></span><span></span>',
  };
  return f === 'illustration' ? { avant: o, apres: '</div>' } : { avant: `${o}${corps[f]}</div>`, apres: '' };
}

const COMMUN = `.hp__fh{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;opacity:var(--hp-fh-a,.2)}
.hp__fh svg{position:absolute;display:block;max-width:none;overflow:visible;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round}
.hp__fh svg *{vector-effect:non-scaling-stroke}
@media (min-width:900px){.hp .hp__fh--zone{opacity:var(--hp-fh-a2);-webkit-mask:linear-gradient(90deg,transparent 45%,#000 53%);mask:linear-gradient(90deg,transparent 45%,#000 53%)}}
@media (max-width:899px){.hp .hp__fh--zone-tel{opacity:var(--hp-fh-a2);-webkit-mask:linear-gradient(180deg,#000 calc(var(--hp-fh-h) - 30px),transparent var(--hp-fh-h));mask:linear-gradient(180deg,#000 calc(var(--hp-fh-h) - 30px),transparent var(--hp-fh-h))}
.hp__fh--zone-tel.hp__fh--empreintes svg,.hp__fh--zone-tel.hp__fh--trajectoires svg{top:-6%;bottom:auto;height:calc(var(--hp-fh-h) * 1.2)}.hp__fh--zone-tel.hp__fh--topographie svg{top:-30%;bottom:auto}}`;
/** Feuille de chaque option : motif du côté opposé au texte (droite sur ordinateur, bas à droite sur téléphone) */
const CSS_FONDS: Record<Exclude<FondHeros, 'aucun'>, string> = {
  empreintes: `.hp__fh--empreintes svg{height:136%;width:auto;aspect-ratio:4/5;right:-3%;top:-20%;stroke-width:1.9px}
@media (max-width:899px){.hp__fh--empreintes svg{height:74%;right:-30%;top:auto;bottom:-12%;stroke-width:1.5px}}`,
  topographie: `.hp__fh--topographie svg{width:110%;height:auto;aspect-ratio:10/7;right:-14%;top:-12%;stroke-width:1.2px}
@media (max-width:899px){.hp__fh--topographie svg{width:190%;right:-60%;top:auto;bottom:-14%}}`,
  trajectoires: `.hp__fh--trajectoires svg{height:116%;width:auto;aspect-ratio:1;right:-4%;top:-8%;stroke-width:3.2px}
.hp__fh--trajectoires circle{fill:currentColor;stroke:none}.hp__fh--trajectoires .hpfh-p{stroke-dasharray:0 10;stroke-width:4px}
@media (max-width:899px){.hp__fh--trajectoires svg{height:58%;right:-16%;top:auto;bottom:-6%}}`,
  trame: `.hp__fh--trame::before,.hp__fh--trame::after{content:'';position:absolute;inset:0;background:radial-gradient(circle,currentColor var(--p),transparent calc(var(--p) + .6px)) 0 0/14px 14px}
.hp__fh--trame::before{--p:1.2px;-webkit-mask:radial-gradient(52% 78% at 80% 48%,#000 25%,transparent 100%);mask:radial-gradient(52% 78% at 80% 48%,#000 25%,transparent 100%)}
.hp__fh--trame::after{--p:2.6px;-webkit-mask:radial-gradient(20% 34% at 78% 40%,#000 20%,transparent 100%),radial-gradient(14% 22% at 86% 72%,#000 15%,transparent 100%);mask:radial-gradient(20% 34% at 78% 40%,#000 20%,transparent 100%),radial-gradient(14% 22% at 86% 72%,#000 15%,transparent 100%)}
@media (max-width:899px){.hp__fh--trame::before{-webkit-mask:radial-gradient(80% 40% at 80% 84%,#000 25%,transparent 100%);mask:radial-gradient(80% 40% at 80% 84%,#000 25%,transparent 100%)}.hp__fh--trame::after{-webkit-mask:radial-gradient(34% 16% at 78% 86%,#000 20%,transparent 100%);mask:radial-gradient(34% 16% at 78% 86%,#000 20%,transparent 100%)}}`,
  formes: `.hp__fh--formes span{position:absolute;aspect-ratio:1;border-radius:58% 42% 51% 49%/44% 56% 44% 56%}
.hp__fh--formes span:nth-child(1){width:min(58vw,700px);right:-12%;top:-26%;background:var(--hp-aplat)}
.hp__fh--formes span:nth-child(2){width:min(40vw,480px);right:14%;bottom:-30%;background:var(--hp-bulle);border-radius:46% 54% 38% 62%/52% 40% 60% 48%}
.hp__fh--formes span:nth-child(3){width:min(24vw,290px);right:-5%;bottom:6%;background:var(--hp-vif)}
@media (max-width:899px){.hp__fh--formes span:nth-child(1){width:96vw;right:-46%;top:auto;bottom:-20%}.hp__fh--formes span:nth-child(2){width:64vw;right:30%;bottom:-36%}.hp__fh--formes span:nth-child(3){width:34vw;right:-8%;bottom:20%}}`,
  'formes-franches': `.hp__fh--formes-franches span{position:absolute}
.hp__fh--formes-franches span:nth-child(1){width:min(46vw,560px);aspect-ratio:1;border-radius:50%;right:-10%;top:-20%;background:var(--hp-vif)}
.hp__fh--formes-franches span:nth-child(2){width:min(34vw,420px);aspect-ratio:2/1;border-radius:999px 999px 0 0;right:18%;bottom:0;background:var(--hp-aplat)}
.hp__fh--formes-franches span:nth-child(3){width:70%;height:clamp(28px,4vw,56px);right:-12%;top:58%;transform:rotate(-14deg);background:var(--hp-bulle)}
@media (max-width:899px){.hp__fh--formes-franches span:nth-child(1){width:70vw;right:-30%;top:auto;bottom:4%}.hp__fh--formes-franches span:nth-child(2){width:56vw;right:34%}.hp__fh--formes-franches span:nth-child(3){top:auto;bottom:22%;width:90%}}`,
  illustration: `.hp .hp__fh-visuel>.vt{position:absolute;inset:2%;z-index:1;display:grid;place-items:center}.hp__fh-visuel svg{display:block;width:100%;height:100%}
@media (max-width:899px){.hp.hp--sur-page .hp__fh-visuel{height:min(46svh,380px);margin:12px 16px 0}}
@media (min-width:900px){.hp.hp--sur-page .hp__fh-visuel{inset:7% max(20px,(100% - var(--hp-cadre,1180px)) / 2) 7% 47%;margin:0;height:auto}}
.hp__fh--illustration{inset:-44% -30% -44% 18%;filter:saturate(.7)}
.hp__fh--illustration>*{position:absolute;inset:0;width:100%;height:100%;margin:0}
.hp__fh--illustration svg{display:block;width:100%;height:100%}
@media (max-width:899px){.hp__fh--illustration{inset:auto -24% -10% 18%;height:62%}}`,
};

/** Feuille de l'option (commune + propre ; vide pour « aucun ») */
export const cssFondHeros = (f: FondHeros | null | undefined): string => (f && f !== 'aucun' ? (COMMUN + CSS_FONDS[f]).replace(/\n\s*/g, '') : '');

/** Poids (octets) du balisage et de la feuille d'une option (hors illustration du kit) : < 4 Ko exigé */
export const poidsFondHeros = (f: Exclude<FondHeros, 'aucun'>) => new TextEncoder().encode(htmlFondHeros(f, 0.2).avant + cssFondHeros(f)).length;

// ---------------------------------------------------------------------------------------------------------------
// Couleurs et choix
// ---------------------------------------------------------------------------------------------------------------

/** Couleur d'une variable --hp-<nom> dans le style de la section (styleCouleursHeros) */
const lireVar = (style: string, nom: string): string | null => new RegExp(`--hp-${nom}:(#[0-9a-f]{6})`, 'i').exec(style)?.[1] ?? null;

/**
 * Opacité de la couche pour un premier écran : fond(s) et textes de la variante (typographique : texte plein-texte sur la couleur
 * forte ; formes du lot 2 : texte encre, accent et doux sur la page et ses teintes), couleur(s) du motif (trait = couleur du texte ;
 * formes = aplat, bulle, vif ; illustration = pire cas noir ou blanc).
 */
export function alphaFondHeros(f: FondHeros, variante: string, style: string): number {
  if (f === 'aucun') return 0;
  const v = (n: string) => lireVar(style, n);
  const typo = variante === 'typographique';
  const fonds = (typo ? [v('plein')] : [v('page'), v('t1'), v('t2'), v('t3')]).filter((x): x is string => Boolean(x));
  const textes = (typo ? [v('plein-texte')] : [v('encre'), v('accent-texte'), v('encre-douce')]).filter((x): x is string => Boolean(x));
  const trait = typo ? v('plein-texte') : v('encre');
  const motifs = (f === 'illustration' ? ['#ffffff', '#000000'] : f === 'formes' || f === 'formes-franches' ? [v('aplat'), v('bulle'), v('vif')] : [trait]).filter((x): x is string => Boolean(x));
  if (!fonds.length || !textes.length || !motifs.length) return 0.12;
  return alphaFond(fonds, textes, motifs, PLAFONDS_FONDS_HEROS[f]);
}

/** Fond par défaut d'une famille de style (harmonie.ts) ; famille inconnue : le filigrane d'empreintes */
export const fondHerosParDefaut = (famille: string | null | undefined): Exclude<FondHeros, 'aucun'> => FOND_HEROS_PAR_FAMILLE[famille ?? ''] ?? 'empreintes';

/**
 * Styles d'illustration où le HÉROS ILLUSTRÉ du thème doit se voir (second retour de Paul du 2026-10-09, « Doux et rond ·
 * illustrations douces », dégradé maillé et un simple anneau : « bien mais trop vide ») : sans choix explicite, le fond d'un
 * premier écran sans visuel y est l'illustration du kit (posée NETTE devant les aplats des formes du lot 2, estompée derrière
 * le texte du typographique).
 */
export const STYLES_HEROS_ILLUSTRE: readonly string[] = ['pedagogique', 'releve'];

/**
 * MASSE VISUELLE (seuil mesurable ; second retour de Paul : un petit élément décoratif — anneau, pastille, filet, trame discrète,
 * dégradé — ne compte pas comme matière). Mesure de la planche (scratchpad fonds-heros, masse.mjs) : le même premier écran est
 * capturé avec et sans le fond, texte masqué ; masse ajoutée = part des pixels de la section dont la luminance change d'au moins
 * 0,015. Seuil : SEUIL_MASSE_VISUELLE (4 %) sur ordinateur (1440 px) ET téléphone (390 px). Mesuré le 2026-10-09 sur le
 * typographique (Prune, Canard, Mangue) : empreintes 6,1 / 4,7 %, lignes de niveau 8,2 / 9,2 %, trame 7,6 / 5,7 %, formes
 * 28,9 / 15,6 %, formes franches 12,4 / 13,8 % ; trajectoires 3,2 / 3,2 % et illustration estompée 3,2 / 3,5 % SOUS le seuil :
 * jamais sur le typographique (FONDS_LEGERS_TYPO). Formes du lot 2 : leur composition est la matière, sauf le dégradé maillé
 * animé (anneau) et la forme qui respire (taches), décors légers qui prennent le héros illustré du thème, NET devant les aplats
 * (masse 8,6 / 29,4 % sur le second cas de Paul).
 */
export const SEUIL_MASSE_VISUELLE = 0.04;
/** Fonds sous le seuil de masse sur le typographique (le titre occupe la largeur : opacité bornée par l'AA) */
export const FONDS_LEGERS_TYPO: readonly FondHeros[] = ['trajectoires', 'illustration'];
/** Formes du lot 2 dont le décor ne compte pas comme matière (anneau et pastille ; taches) : héros illustré du thème d'abord */
export const PREMIERS_ECRANS_DECOR_LEGER: readonly string[] = ['maille-anime', 'forme-respire'];

/**
 * Fond EFFECTIF d'un premier écran (lecture d'une composition, rendu du site et de l'aperçu) : null pour un premier écran à visuel ;
 * sinon le fond choisi, et à défaut (absent, « aucun » ou non rendable) le fond de la famille — `sur` : seulement les fonds
 * permis (praticien : la trame, signature déjà en place, tant que les autres sont à valider) ; `illustration` : l'appelant a-t-il
 * une illustration du thème à poser (sinon le fond de la famille).
 */
export function fondHerosEffectif(accueil: unknown, fond: unknown, o: { famille?: string | null; permis?: (f: FondHeros) => boolean; illustration?: boolean; style?: string | null } = {}): FondHeros | null {
  if (!estPremierEcranSansVisuel(accueil)) return null;
  const ok = (f: unknown): f is Exclude<FondHeros, 'aucun'> => estFondHeros(f) && f !== 'aucun' && (f !== 'illustration' || o.illustration !== false) && (!o.permis || o.permis(f))
    && !(accueil === 'typographique' && FONDS_LEGERS_TYPO.includes(f));
  if (ok(fond)) return fond;
  // Illustrations douces, relevé : le héros illustré du thème (s'il existe et qu'il est permis)
  // (formes du lot 2 seulement : l'illustration y est NETTE dans la zone visuelle ; sur le typographique, le titre occupe la largeur)
  if (accueil !== 'typographique' && (STYLES_HEROS_ILLUSTRE.includes(o.style ?? '') || PREMIERS_ECRANS_DECOR_LEGER.includes(accueil as string)) && o.illustration === true && ok('illustration')) return 'illustration';
  const d = fondHerosParDefaut(o.famille);
  return ok(d) ? d : FOND_HEROS_SUR;
}
