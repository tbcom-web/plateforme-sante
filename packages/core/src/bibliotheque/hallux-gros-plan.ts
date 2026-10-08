// Gros orteil (hallux) du pied droit vu de dessus, en GROS PLAN, normal et incarné : dessin propre aux sites (2026-10-05), refait de
// zéro sur décision de Paul après l'échec de la retouche de POD-AT-0009 (repli lu « pansement », puis « bouton » en vignette).
// Références de LECTURE fournies par Paul (jamais copiées ni décalquées) : hallux vu de dessus, normal à côté d'incarné, tout le côté
// latéral gonflé en courbe douce, rougeur localisée qui se fond ; avant-pied vu de dessus, bord de la lame qui s'enfonce dans le repli.
//
// Construction (docs/referentiels/anatomie-pied.md § Ongle ; revue-anatomique-2026-10-04.md N8) :
// - cadre « fenêtre » 112 × 158 (unités du dessin 240 × 180), hallux GRAND (≈ la moitié de la largeur, toute la hauteur), 2e et
//   3e orteils esquissés au bord droit (un orteil isolé se lit « pouce »), formule égyptienne (hallux > 2e > 3e), commissures arrondies ;
// - pied DROIT, distal en haut : le côté latéral de l'hallux (vers le 2e orteil) est à droite ;
// - lame ≈ 0,57 de la largeur de l'orteil, bord libre droit (coupe droite), bande blanche du bord libre, lunule discrète, cuticule,
//   repli proximal (arc), replis et sillons latéraux ; pli de l'articulation interphalangienne en deux traits courts ;
// - incarné : le CONTOUR de l'orteil bombe vers l'extérieur sur la moitié distale (courbe douce et continue, aucune forme rapportée),
//   la peau gonflée du repli latéral recouvre le bord de la lame (le bord visible plonge sous le repli, le coin de la lame est caché,
//   dans le prolongement de l'arc de la lame : pas d'écharde), rougeur localisée en dégradé radial qui se fond dans la peau.
// Tracés en unités de la forme (×4 les unités du dessin) ; couleurs par jetons --ez-* (rendu.ts), aucune couleur littérale.
import type { FormeEcranZen } from './formes';

type P = [number, number];
/** Unités de la forme par unité du dessin */
const E = 4;
/** Fenêtre du gros plan, en unités du dessin */
export const HALLUX_GROS_PLAN = { largeur: 112, hauteur: 158, echelle: E } as const;

export const r = (v: number) => Math.round(v * E * 10) / 10;
/** Courbe lisse (Catmull-Rom → Bézier) passant par les points (unités du dessin) */
export function courbe(pts: P[], ferme = false): string {
  const n = pts.length;
  const Q = (i: number) => (ferme ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
  for (let i = 0; i < (ferme ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [Q(i - 1), Q(i), Q(i + 1), Q(i + 2)];
    d += ` C${r(p1[0] + (p2[0] - p0[0]) / 6)},${r(p1[1] + (p2[1] - p0[1]) / 6)} ${r(p2[0] - (p3[0] - p1[0]) / 6)},${r(p2[1] - (p3[1] - p1[1]) / 6)} ${r(p2[0])},${r(p2[1])}`;
  }
  return ferme ? `${d} Z` : d;
}

// Côté médial de l'hallux (bas → pointe), pointe, puis côté latéral (pointe → commissure) : normal et incarné. Sous l'orteil, le bord
// médial s'évase légèrement vers la tête du 1er métatarsien (l'avant-pied se lit : jamais un « doigt » de largeur constante)
export const MEDIAL: P[] = [[6.6, 172], [7.6, 140], [9.2, 112], [10.4, 84], [11.4, 54], [13.6, 36], [18.6, 23], [26.5, 15.2], [37, 12.2]];
export const LATERAL_NORMAL: P[] = [[47, 13.2], [55, 17.6], [60.6, 25], [63.6, 36], [64.5, 50], [64.3, 64], [64.2, 76], [64.8, 84]];
// Incarné : tout le bord latéral bombe (≈ +6,5 au tiers distal), courbe continue de la pointe jusqu'au-delà de la mi-longueur
export const LATERAL_INCARNE: P[] = [[47, 13.2], [55.6, 17.4], [62.4, 24.4], [67.6, 34], [70.6, 47], [70, 59], [67.8, 70], [65.6, 79], [64.9, 85]];
// Commissure 1 (hallux / 2e), 2e orteil, commissure 2, 3e orteil (sort du cadre à droite). Longueur visible de l'hallux (pointe →
// commissure) ≈ 1,45 × sa largeur : au-delà, les orteils se lisent « doigts ». Retour de Paul du 2026-10-07 (orthonyxie : « doigts de
// pied trop fins, comme des doigts de main ») : le 2e orteil est élargi à ≈ 0,64 × la largeur de l'hallux (≈ 1,7 cm pour 2,5 cm ;
// avant : 0,52), pulpe plus ronde, longueur visible ≈ 1,5 × sa largeur ; commissures serrées, sans espace en V.
export const VOISINS: P[] = [
  [66.2, 89.6], [68, 91.6], [69.6, 89], [70, 81], [70.4, 67], [72.2, 54.4], [76.4, 43.6], [82.6, 37.6], [88.6, 36.8], [95.2, 39], [100.6, 45.4],
  [103.4, 55], [104.2, 68], [104.4, 80], [105.2, 88.6], [107.4, 92.4], [109.6, 89], [110.2, 80], [111, 70], [113.2, 62.4], [117, 58.4],
  [122, 57.4], [128, 62], [128, 172],
];
/** Silhouette de la peau (hallux, 2e et 3e orteils, avant-pied qui sort du cadre) */
export const silhouette = (lateral: P[]) => courbe([...MEDIAL, ...lateral, ...VOISINS], false) + ` L${r(10.6)},${r(172)} Z`;

// Lame de l'hallux : bord libre droit (y ≈ 24,5), bords latéraux presque parallèles, base arrondie sous le repli proximal
export const LAME: P[] = [[24.6, 24.6], [37.6, 23.9], [50.6, 24.6], [52.6, 27.4], [53, 36], [52.6, 47], [51.6, 57.4], [48.4, 63.4], [37.6, 65.6], [26.8, 63.4], [23.6, 57.4], [22.6, 47], [22.2, 36], [22.6, 27.4]];
/** Lisière du lit (bande blanche du bord libre au-dessus) */
export const LISIERE: P[] = [[23.4, 29.6], [37.6, 28.6], [51.8, 29.6]];
export const LUNULE: P[] = [[26.6, 61], [31.6, 57.6], [37.6, 56.6], [43.6, 57.6], [48.6, 61]];
export const CUTICULE: P[] = [[22.4, 60.6], [26, 66], [37.6, 68.4], [49.2, 66], [52.8, 60.6]];
export const REPLI_PROXIMAL: P[] = [[18.4, 64.4], [24.6, 72.6], [37.6, 75.6], [50.6, 72.6], [56.8, 64.4]];
export const SILLON_MEDIAL: P[] = [[19.6, 64], [19.2, 46], [19.8, 32], [21.8, 25]];
export const SILLON_LATERAL: P[] = [[55.6, 64], [56, 46], [55.4, 32], [53.6, 25]];
export const PLIS_IP = [[[25.4, 85], [37, 88.2], [48.6, 85]], [[28.6, 91.4], [37, 94], [45.4, 91.4]]] as P[][];
// 2e orteil : lame courte, pli ; 3e : bord de la lame au bord du cadre (orteils serrés : espace distal ≈ 6–9 unités, jamais « doigts écartés »)
export const LAME_2: P[] = [[78.6, 45.4], [87.2, 44.4], [95.8, 45.4], [96.4, 51.6], [94.8, 57], [87.2, 59.6], [79.6, 57], [78, 51.6]];
export const PLI_2: P[] = [[77, 73.4], [87.2, 76], [97.4, 73.4]];
export const LAME_3: P[] = [[112.4, 65.4], [117.6, 64], [122.6, 65.4], [122.6, 76], [112.6, 76], [112, 70.6]];

// Incarné : bord interne du repli latéral gonflé (crête) — part de l'extrémité latérale du repli proximal, longe le bord de la lame
// puis passe PAR-DESSUS (le bord de la lame plonge dessous), coin distal caché, et rejoint la pulpe près de la pointe
const CRETE: P[] = [[57.6, 70], [55.2, 59], [52, 48.6], [49.4, 39], [48.4, 31], [49.2, 25.4], [51.2, 21.6]];
/** Zone de la peau gonflée (de la crête au contour bombé) : peinte par-dessus la lame */
const PLI_GONFLE: P[] = [...CRETE.slice().reverse(), [54, 12], [78, 18], [78, 84], [62, 86], [59.6, 79]];
/** Côté latéral de la crête : seule zone où la rougeur se pose (jamais sur la lame) */
const COTE_LATERAL: P[] = [...CRETE, [54, 8], [71.4, 8], [71.6, 44], [70.9, 56], [69.4, 66], [67.4, 76], [65.6, 86], [60, 150], [56, 150], [57.6, 100]];

/** Flèche « le bord de la lame appuie sur la peau » (registre pédagogique, posée par le dessin) : origine et pointe, unités du dessin */
export const FLECHE_INCARNE: { de: P; vers: P } = { de: [28.6, 38.6], vers: [51.4, 43.6] };

export const ep = (k: 'fin' | 'normal' | 'epais', op = 1) => `stroke:var(--ez-trait);stroke-width:var(--ez-ep-${k})${op < 1 ? `;stroke-opacity:${op}` : ''}`;
export const trait = (d: string, k: 'fin' | 'normal' | 'epais', op = 1) => `<path d="${d}" style="${ep(k, op)}"/>`;

/**
 * Variantes de l'ongle sur le gros plan NORMAL (soins-ongles.ts : orthonyxie, onychoplastie, mycose) : `ongle` remplace la lame
 * (aplat, bande du bord libre, lunule et leurs traits), `dessus` se pose après les orteils voisins, avant le contour ; `defs` et `ids`
 * pour des découpes propres à la variante (préfixe EZID). Sans option : rendu identique au gros plan normal.
 */
export type VarianteHallux = { ongle?: string; dessus?: string; defs?: string; ids?: boolean };

export function hallux(incarne: boolean, o: VarianteHallux = {}): FormeEcranZen {
  const peau = silhouette(incarne ? LATERAL_INCARNE : LATERAL_NORMAL);
  const lame = courbe(LAME, true);
  const defs = incarne
    ? `<defs><clipPath id="EZID-peau"><path d="${peau}"/></clipPath><clipPath id="EZID-cote"><path d="${courbe(COTE_LATERAL, true)}"/></clipPath>` +
      `<radialGradient id="EZID-rougeur" cx="0.5" cy="0.5" r="0.5">${[[0, 0.9], [0.3, 0.72], [0.55, 0.42], [0.78, 0.15], [1, 0]]
        .map(([o, a]) => `<stop offset="${o}" style="stop-color:var(--ez-rougeur);stop-opacity:${a}"/>`)
        .join('')}</radialGradient></defs>`
    : (o.defs ?? '');
  const corps = [
    defs,
    // Peau
    `<path d="${peau}" style="fill:var(--ez-peau-2)"/>`,
    // Lame : aplat, bande blanche du bord libre, lunule
    o.ongle ?? [`<path d="${lame}" style="fill:var(--ez-ongle)"/>`,
    `<path d="${courbe([[22.4, 27.4], [24.6, 24.6], [37.6, 23.9], [50.6, 24.6], [52.8, 27.4], [51.8, 29.6], [37.6, 28.6], [23.4, 29.6]], true)}" style="fill:var(--ez-blanc);fill-opacity:0.85"/>`,
    `<path d="${courbe(LUNULE)} ${courbe([[48.6, 61], [48.4, 63.4], [37.6, 65.6], [26.8, 63.4], [26.6, 61]]).replace('M', 'L')} Z" style="fill:var(--ez-blanc);fill-opacity:0.45"/>`,
    trait(lame, 'fin'),
    trait(courbe(LISIERE), 'fin', 0.45),
    trait(courbe(LUNULE), 'fin', 0.35)].join(''),
    trait(courbe(CUTICULE), 'fin', 0.5),
    trait(courbe(REPLI_PROXIMAL), 'fin', 0.4),
    trait(courbe(SILLON_MEDIAL), 'fin', 0.5),
    incarne ? '' : trait(courbe(SILLON_LATERAL), 'fin', 0.5),
    ...PLIS_IP.map((p) => trait(courbe(p), 'fin', 0.35)),
    // 2e et 3e orteils
    `<path d="${courbe(LAME_2, true)}" style="fill:var(--ez-ongle)"/>`, trait(courbe(LAME_2, true), 'fin', 0.8),
    trait(courbe(PLI_2), 'fin', 0.35),
    `<path d="${courbe(LAME_3, true)}" style="fill:var(--ez-ongle)"/>`, trait(courbe(LAME_3.slice(0, 3)) + ` M${r(112.4)},${r(65.4)} L${r(112)},${r(70.6)} L${r(112.6)},${r(76)}`, 'fin', 0.8),
    // Incarné : peau gonflée PAR-DESSUS le bord de la lame, rougeur fondue (côté latéral de la crête seulement), crête du repli
    incarne
      ? `<g clip-path="url(#EZID-peau)"><path d="${courbe(PLI_GONFLE, true)}" style="fill:var(--ez-peau-2)"/>` +
        `<g clip-path="url(#EZID-cote)"><ellipse cx="${r(67)}" cy="${r(45)}" rx="${r(19)}" ry="${r(38)}" fill="url(#EZID-rougeur)" style="stroke:none"/></g></g>` +
        trait(courbe(CRETE), 'fin', 0.85)
      : (o.dessus ?? ''),
    // Contour de la peau (ouvert : l'avant-pied sort du cadre)
    trait(courbe([...MEDIAL, ...(incarne ? LATERAL_INCARNE : LATERAL_NORMAL), ...VOISINS.slice(0, -2)]), 'normal'),
  ].join('');
  return { viewBox: [0, 0, HALLUX_GROS_PLAN.largeur * E, HALLUX_GROS_PLAN.hauteur * E], ids: incarne || !!o.ids, corps: `<g>${corps}</g>` };
}

/** `hallux-gros-plan` (normal) et `hallux-gros-plan-incarne` : formes propres aux sites, statut brouillon (catalogue.ts) */
export const FORMES_HALLUX_GROS_PLAN: Record<string, FormeEcranZen> = {
  'hallux-gros-plan': hallux(false),
  'hallux-gros-plan-incarne': hallux(true),
};
