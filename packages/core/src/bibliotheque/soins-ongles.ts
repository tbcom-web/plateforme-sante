// Formes propres aux sites pour les fiches de soins de la migration 0020 (2026-10-05, statut brouillon : catalogue.ts) : orthonyxie,
// onychoplastie, mycose de l'ongle, ongles épais, cors et durillons, orthoplastie. Aucune géométrie « à l'œil » quand une géométrie
// validée existe : les variantes de l'ongle reprennent le gros plan de l'hallux (hallux-gros-plan.ts : même orteil, mêmes voisins,
// même lame, seule la lame change), l'orthonyxie en coupe reprend POD-AT-0010 (ongle-coupe), l'ongle épais reprend l'état
// « ongle-epais » de POD-AT-0003 (pied-profil-ongle-epais). Seule la coupe de l'orteil en griffe est construite ici (aucun atome
// validé) : proportions réelles commentées (2e rayon, 1 cm ≈ 13 unités du dessin), À VALIDER par Paul.
//
// Références anatomiques et cliniques : docs/referentiels/anatomie-pied.md (§ Ongle, § Peau et hyperkératoses) ; HAS 2020, « Le pied
// de la personne âgée » § 3.4.2 (orthonyxies : agrafe à fil, lamelle ; plaques unguéales hypertrophiques : fraisage en respectant la
// courbure ; onychoplastie après onycholyse) et § 3.5.2 (orthoplasties en silicone) ; Ameli, « Traitement des cors… » (2025).
// Couleurs : jetons --ez-* uniquement (rendu.ts : orthese, resine, mycose, mycose-fonce, corne, noyau, silicone, metal).
import { FORMES, type FormeEcranZen } from './formes';
import { hallux, courbe, r, ep, trait, LAME, LUNULE, HALLUX_GROS_PLAN } from './hallux-gros-plan';

type P = [number, number];
const E = HALLUX_GROS_PLAN.echelle;
/** Polyligne (unités du dessin → unités de la forme) */
const ligne = (pts: P[]) => `M${pts.map(([x, y]) => `${r(x)},${r(y)}`).join(' L')}`;
/** Trait coloré par un jeton (et non --ez-trait) */
const traitJeton = (d: string, jeton: string, k: 'fin' | 'normal' | 'epais', op = 1) =>
  `<path d="${d}" style="stroke:var(--ez-${jeton});stroke-width:var(--ez-ep-${k})${op < 1 ? `;stroke-opacity:${op}` : ''}"/>`;
/** Pointe de flèche pleine (triangle) au bout (b) d'un segment venant de a, en unités de la forme */
function pointe(a: P, b: P, jeton: string, t = 14): string {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), o = 0.5;
  const p = (k: number) => `${(b[0] - t * Math.cos(ang + k * o)).toFixed(1)},${(b[1] - t * Math.sin(ang + k * o)).toFixed(1)}`;
  return `<path d="M${b[0]},${b[1]} L${p(1)} L${p(-1)} Z" style="fill:var(--ez-${jeton})"/>`;
}

// Lame normale, bande du bord libre et lunule (mêmes tracés que le gros plan normal)
const BORD_LIBRE: P[] = [[22.4, 27.4], [24.6, 24.6], [37.6, 23.9], [50.6, 24.6], [52.8, 27.4], [51.8, 29.6], [37.6, 28.6], [23.4, 29.6]];
const lunuleAplat = () => `<path d="${courbe(LUNULE)} ${courbe([[48.6, 61], [48.4, 63.4], [37.6, 65.6], [26.8, 63.4], [26.6, 61]]).replace('M', 'L')} Z" style="fill:var(--ez-blanc);fill-opacity:0.45"/>`;

// ———————————————————————————————————————————————————— Orthonyxie (vue de dessus)

/**
 * Agrafe en fil (type fil de titane, HAS § 3.5.1) : le fil traverse la lame au tiers moyen (y ≈ 40), ses deux crochets passent SOUS
 * les bords latéraux de la lame, dans les sillons (aucun contact avec le repli : l'agrafe agit sur l'ongle seul), et une boucle
 * d'activation au milieu (vue de dessus : un petit anneau posé sur la lame) règle la traction. Fil à l'accent (orthèse).
 */
export const AGRAFE_Y = 40.4;
function agrafe(): string {
  const y = AGRAFE_Y, rb = 3.4, cx = 37.6;
  const d =
    `M${r(20.2)},${r(44.2)} C${r(19.8)},${r(42)} ${r(20.6)},${r(y)} ${r(22.8)},${r(y)} L${r(cx)},${r(y)} ` +
    `A${r(rb)},${r(rb)} 0 1 1 ${r(cx - 0.05)},${r(y)} L${r(52.4)},${r(y)} C${r(54.6)},${r(y)} ${r(55.4)},${r(42)} ${r(55)},${r(44.2)}`;
  // Ombre portée très légère sous le fil (il est posé SUR la lame), puis le fil
  return `<path d="${d}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-epais);stroke-opacity:0.18" transform="translate(0 ${E * 0.5})"/>` + traitJeton(d, 'orthese', 'normal');
}

// ———————————————————————————————————————————————————— Onychoplastie (vue de dessus)

/**
 * Reconstitution en résine (HAS § 3.5.1, après onycholyse) : la partie DISTALE de la lame (bord libre → front de repousse) est en
 * résine (teinte claire distincte et hachures fines), la partie PROXIMALE est l'ongle naturel qui repousse depuis la matrice (lunule
 * conservée) ; le front de repousse est légèrement bombé vers l'avant. Rien ne déborde sur la peau (la résine ne couvre que le lit).
 */
export const FRONT_REPOUSSE: P[] = [[20.6, 49.4], [28, 46.4], [37.6, 45.4], [47.2, 46.4], [54.6, 49.4]];
function onychoplastie(): string {
  const lame = courbe(LAME, true);
  const resine = `${courbe(FRONT_REPOUSSE)} L${r(56)},${r(18)} L${r(19)},${r(18)} Z`;
  const hachures = Array.from({ length: 9 }, (_, i) => { const x = 14 + i * 5; return ligne([[x, 48], [x + 16, 20]]); }).join(' ');
  return [
    `<path d="${lame}" style="fill:var(--ez-ongle)"/>`,
    `<g clip-path="url(#EZID-lame)"><path d="${resine}" style="fill:var(--ez-resine)"/>`,
    `<g clip-path="url(#EZID-resine)">${traitJeton(hachures, 'trait', 'fin', 0.22)}</g>`,
    `<path d="${courbe(BORD_LIBRE, true)}" style="fill:var(--ez-blanc);fill-opacity:0.55"/></g>`,
    lunuleAplat(),
    trait(lame, 'fin'),
    trait(courbe(FRONT_REPOUSSE), 'fin', 0.85),
    trait(courbe(LUNULE), 'fin', 0.35),
  ].join('');
}
const defsOnychoplastie = () =>
  `<defs><clipPath id="EZID-lame"><path d="${courbe(LAME, true)}"/></clipPath><clipPath id="EZID-resine"><path d="${courbe(FRONT_REPOUSSE)} L${r(56)},${r(18)} L${r(19)},${r(18)} Z"/></clipPath></defs>`;

// ———————————————————————————————————————————————————— Mycose de l'ongle (vue de dessus)

/**
 * Onychomycose sous-unguéale distale et latérale (forme la plus fréquente) : lame jaunâtre depuis le bord libre, front irrégulier en
 * « flammes » plus avancé côté latéral, deux traînées longitudinales, bord libre épaissi et effrité (petites irrégularités, couches
 * visibles), lunule épargnée. Sobre : aucune lésion sur la peau, aucun débris, aucune teinte vive (jamais « pus »).
 */
export const LAME_MYCOSE: P[] = [[23.6, 25.6], [27.6, 24.5], [30.4, 26.2], [34.4, 24.9], [38.8, 25.3], [41.6, 24.4], [44.6, 26.6], [48.2, 25.3], [50.4, 25], [52.6, 27.4], [53, 36], [52.6, 47], [51.6, 57.4], [48.4, 63.4], [37.6, 65.6], [26.8, 63.4], [23.6, 57.4], [22.6, 47], [22.2, 36], [22.6, 28.4]];
export const FRONT_MYCOSE: P[] = [[20, 39.4], [26, 41.6], [31.6, 40.4], [37.2, 43.6], [42.6, 45.2], [47.4, 49.8], [51.6, 52.6], [56, 57]];
function mycose(): string {
  const lame = courbe(LAME_MYCOSE, true);
  const zone = `${courbe(FRONT_MYCOSE)} L${r(57)},${r(18)} L${r(19)},${r(18)} Z`;
  const bord: P[] = [[22.2, 27], ...LAME_MYCOSE.slice(0, 9), [52.8, 27.6], [52.6, 32.2], [37.6, 31.2], [22.6, 32.2]];
  return [
    `<path d="${lame}" style="fill:var(--ez-ongle)"/>`,
    `<g clip-path="url(#EZID-lame)"><path d="${zone}" style="fill:var(--ez-mycose)"/>`,
    // Bord libre épaissi : bande plus foncée et deux couches (lignes parallèles au bord)
    `<path d="${courbe(bord, true)}" style="fill:var(--ez-mycose-fonce);fill-opacity:0.75"/>`,
    traitJeton(`${courbe([[23, 28.8], [37.6, 27.6], [52.4, 28.8]])} ${courbe([[23, 30.6], [37.6, 29.6], [52.4, 30.6]])}`, 'trait', 'fin', 0.3),
    // Traînées longitudinales (jaunissement qui progresse vers la base, sans atteindre la lunule)
    traitJeton(`${ligne([[43.2, 34], [43.6, 50.4]])} ${ligne([[48.6, 36], [49, 55.6]])}`, 'mycose-fonce', 'epais', 0.4),
    trait(courbe(FRONT_MYCOSE), 'fin', 0.3),
    `</g>`,
    lunuleAplat(),
    trait(lame, 'fin'),
    trait(courbe(LUNULE), 'fin', 0.35),
  ].join('');
}
const defsMycose = () => `<defs><clipPath id="EZID-lame"><path d="${courbe(LAME_MYCOSE, true)}"/></clipPath></defs>`;

// ———————————————————————————————————————————————————— Orthonyxie en coupe (POD-AT-0010 + agrafe)

/**
 * Coupe transversale de l'ongle (POD-AT-0010, état repos, inchangé) et l'agrafe : le fil épouse le dos de la lame, ses crochets
 * passent sous les deux bords latéraux, la boucle d'activation se dresse au milieu ; deux flèches fines aux bords : la traction douce
 * relève les bords de la lame (redressement progressif de la courbure). Repère 512 de l'atome ; cadre élargi vers le haut (boucle).
 */
function coupeOrthonyxie(): FormeEcranZen {
  const base = FORMES['ongle-coupe'];
  // Dos de la lame ≈ arc de cercle passant par (142,175), (256,130), (370,175) : centre (256 ; 296,9), rayon 166,9 ; fil à +7
  const yc = 296.9, R = 173.9, pt = (t: number): P => [256 + R * Math.sin(t), yc - R * Math.cos(t)];
  const arc = Array.from({ length: 25 }, (_, i) => pt(-0.7 + (1.4 * i) / 24));
  const f = (p: P) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const crochetG = 'M152,193 C140,192 133,186 135,177 C136.5,172 139,170.5 ' + f(arc[0]);
  const boucle = (() => {
    // Boucle d'activation : le fil quitte l'arc au milieu, monte, fait un tour de r 15 et redescend
    const [g, d] = [pt(-0.09), pt(0.09)];
    return `L${f(g)} C${g[0] - 2},${g[1] - 16} ${256 - 19},${115 - 22} 256,${115 - 22} C${256 + 19},${115 - 22} ${d[0] + 2},${d[1] - 16} ${f(d)}`;
  })();
  const gauche = arc.filter((_, i) => i <= 11), droite = arc.filter((_, i) => i >= 13);
  const fil = `${crochetG} L${gauche.slice(1).map(f).join(' L')} ${boucle} L${droite.map(f).join(' L')} C373,170.5 375.5,172 377,177 C379,186 372,192 360,193`;
  const fleche = (a: P, b: P) => `<path d="M${f(a)} L${f(b)}" style="stroke:var(--ez-orthese);stroke-width:var(--ez-ep-normal)"/>${pointe(a, b, 'orthese')}`;
  const corps = base.corps + `<g><path d="${fil}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-epais);stroke-opacity:0.15" transform="translate(0 3)"/><path d="${fil}" style="stroke:var(--ez-orthese);stroke-width:var(--ez-ep-normal)"/>` +
    fleche([150, 150], [126, 122]) + fleche([362, 150], [386, 122]) + '</g>';
  return { viewBox: [79, 70, 354, 302], ids: false, corps };
}

// ———————————————————————————————————————————————————— Ongle épais et meulage (POD-AT-0003 « ongle-epais » + fraise)

/**
 * L'hallux de profil avec son ongle épaissi (POD-AT-0003, état « ongle-epais », inchangé), recadré sur l'avant du pied, et la pièce à
 * main du micromoteur dont la fraise (Ø ≈ 4 mm) est posée SUR le dos de l'ongle, jamais sur la peau ; quelques poussières d'ongle au
 * contact (le meulage en cours). L'outil a la même graisse de contour que le pied. Aucun état « après » (jamais d'avant / après).
 */
/**
 * Contour de la pièce à main et de sa fraise (repère de POD-AT-0003), en un tracé ouvert pour le registre « ligne » : bord du corps
 * (hors cadre) → nez → tige → tour de la fraise → tige → nez → autre bord du corps. Même géométrie que la forme ci-dessous.
 */
export function contourFraise(): P[] {
  const B: P = [447, 377.6], rf = 5.6, a = (-52 * Math.PI) / 180, u: P = [Math.cos(a), Math.sin(a)], n: P = [-u[1], u[0]];
  const at = (s: number, w: number): P => [B[0] + u[0] * s + n[0] * w, B[1] + u[1] * s + n[1] * w];
  const t0 = Math.atan2(-1.4, Math.sqrt(rf * rf - 1.96));
  const tour = Array.from({ length: 33 }, (_, i) => { const t = t0 - (i / 32) * (2 * Math.PI + 2 * t0); return at(rf * Math.cos(t), rf * Math.sin(t)); });
  return [at(130, -7.4), at(28, -6.6), at(28, -5.6), at(16, -2.6), at(16, -1.4), ...tour, at(16, 1.4), at(16, 2.6), at(28, 5.6), at(28, 6.6), at(130, 7.4)];
}

function ongleEpaisMeulage(): FormeEcranZen {
  const base = FORMES['pied-profil-ongle-epais'];
  // Dos de l'ongle en x ≈ 446 : y ≈ 383,4 ; fraise de rayon 5,5 posée dessus ; axe de l'outil vers le haut et l'arrière du cadre (50°)
  const B: P = [447, 377.6], rf = 5.6, a = (-52 * Math.PI) / 180, u: P = [Math.cos(a), Math.sin(a)], n: P = [-u[1], u[0]];
  const at = (s: number, w: number): P => [B[0] + u[0] * s + n[0] * w, B[1] + u[1] * s + n[1] * w];
  const f = (p: P) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const poly = (pts: P[]) => `M${pts.map(f).join(' L')} Z`;
  const tige = poly([at(3, -1.4), at(16, -1.4), at(16, 1.4), at(3, 1.4)]);
  const nez = `M${f(at(16, -2.6))} L${f(at(28, -5.6))} L${f(at(28, 5.6))} L${f(at(16, 2.6))} Z`;
  const corpsOutil = `M${f(at(28, -6.6))} L${f(at(120, -7.4))} L${f(at(120, 7.4))} L${f(at(28, 6.6))} Z`;
  const bagues = [40, 46, 52].map((s) => `M${f(at(s, -6.7))} L${f(at(s, 6.7))}`).join(' ');
  const poussieres = [[456, 381.2, 1.3], [459.4, 377.4, 1.1], [454.6, 374.4, 1], [461.8, 381.8, 0.9]] as const;
  const corps = base.corps + '<g>' +
    `<path d="${corpsOutil}" style="fill:var(--ez-metal);stroke:var(--ez-trait);stroke-width:var(--ez-ep-normal)"/>` +
    `<path d="${bagues}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.5"/>` +
    `<path d="${nez}" style="fill:var(--ez-metal);stroke:var(--ez-trait);stroke-width:var(--ez-ep-normal)"/>` +
    `<path d="${tige}" style="fill:var(--ez-trait)"/>` +
    `<circle cx="${B[0]}" cy="${B[1]}" r="${rf}" style="fill:var(--ez-orthese);stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin)"/>` +
    poussieres.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" style="fill:var(--ez-orthese)"/>`).join('') +
    '</g>';
  return { viewBox: [342, 334, 136, 112], ids: false, corps };
}

// ———————————————————————————————————————————————————— Orteil en griffe, coupe sagittale du 2e rayon (construit, À VALIDER)

/**
 * Coupe sagittale schématique du 2e rayon (orteils à droite, sol y 100 ; 1 cm ≈ 13 u) : 2e métatarsien (déclinaison ≈ 13°, tête
 * Ø ≈ 1,5 cm, centre à ≈ 1,8 cm du sol : coussinet plantaire épais sous la tête), orteil EN GRIFFE : P1 en hyperextension (≈ 40°
 * au-dessus de l'horizontale, ≈ 2,2 cm), P2 fléchie (≈ 65° sous l'horizontale, ≈ 1,2 cm), P3 fléchie (≈ 80°, ≈ 0,8 cm) ; pulpe un peu
 * au-dessus du sol (griffe : l'appui pulpaire est réduit). Peau à ≈ 0,5 cm des os sur le dos, ongle sur le dos de P3.
 */
const SOL_G = 100;
const OS_GRIFFE = {
  // Métatarsien : diaphyse (sort du cadre à gauche) et tête arrondie
  metatarsien: [[-12, 42.6], [40, 54.4], [90, 65.6], [104, 69.4], [110.4, 67.8], [117.6, 70.2], [121.6, 76.4], [120, 83.4], [113.4, 86.6], [105.4, 84.4], [90, 76.2], [40, 63.6], [-12, 51.8]] as P[],
  p1: [[122.6, 70.6], [126, 66.6], [140, 54.8], [143.6, 50.6], [147, 52.6], [146.4, 57.4], [143, 59.8], [129.4, 71.8], [126.6, 76.2], [122.4, 75.8]] as P[],
  p2: [[146.6, 54], [149.8, 52.8], [152.6, 54.6], [156.2, 64.6], [155.8, 68.4], [152.2, 68.8], [149.6, 66.8], [145.4, 58.6]] as P[],
  p3: [[153.4, 70], [156.6, 69.6], [158, 72.4], [158.4, 79], [156.4, 80.6], [154, 79.8], [152.6, 74]] as P[],
};
/** Peau : dos du pied → pli dorsal de la MTP → dos de P1 → saillie de l'IPP → P2 → ongle → pulpe → dessous de l'orteil → sillon → coussinet → sol */
export const PEAU_GRIFFE: P[] = [
  [-12, 34.8], [40, 46.4], [90, 57.4], [104, 60.8], [111, 62.8], [116.4, 64.8], [121.6, 61.6], [130, 54.4], [137.6, 48], [142.4, 45], [146.6, 44.8],
  [150.6, 46.8], [154.4, 51.6], [158.4, 59.8], [160.8, 67.4], [162, 74.6], [161.8, 81], [159.6, 86.2], [156, 88.8], [151.6, 87.6], [148.6, 82.4],
  [147.4, 75.6], [146.2, 69.4], [144, 63.2], [139, 66.4], [132.6, 71.6], [127.4, 77.4], [123.4, 83.8], [120.6, 91.6], [116.4, 97.8], [110, SOL_G],
  [60, SOL_G], [20, 99.4], [-12, 98.6],
];
const ONGLE_GRIFFE: P[] = [[155.2, 54.2], [158.4, 59.6], [160.8, 67.4], [161.6, 72.6]];
/** Repères désignés par les dessins (unités du dessin de la forme) */
export const GRIFFE = {
  largeur: 200, hauteur: 110, sol: SOL_G,
  cor: [145.2, 44.6] as P, noyau: [145.6, 49.8] as P, durillon: [109, 98.6] as P, tete: [112.4, 76.6] as P, chaussure: [144.6, 41.6] as P,
  orthese: [152, 92] as P, anneau: [133, 50] as P,
};
// Cor dorsal sur la saillie de l'IPP : lentille de corne (≈ 0,8 cm, ≈ 1/4 de la largeur de l'orteil) et noyau conique qui appuie vers
// l'articulation, pointe MOUSSE (jamais une écharde), matière plus dense que la corne
export const COR: P[] = [[138.4, 48.4], [141.2, 43.6], [145.2, 42], [149.2, 43], [152.4, 46.8], [148.4, 46.4], [145.2, 45.8], [141.8, 46.6]];
export const NOYAU: P[] = [[143.2, 44.6], [145.2, 43.9], [147.2, 44.6], [146.2, 49.2], [145.6, 50.4], [144.6, 50.2], [144, 49]];
// Durillon : plaque diffuse dans la peau sous la tête du 2e métatarsien, plus épaisse au centre, bords effilés, sans noyau
export const DURILLON: P[] = [[94, SOL_G - 0.4], [102, 97.2], [110, 96.4], [117, 97.2], [122.4, 99.2], [117, SOL_G - 0.4], [102, SOL_G - 0.4]];
// Chaussure : empeigne (trait épais) qui ne touche le pied qu'au sommet de l'IPP, bout de la chaussure, semelle intérieure = sol
export const EMPEIGNE: P[] = [[-12, 29.4], [40, 41], [92, 52.6], [118, 56.4], [134, 47.6], [142.6, 42.2], [147.6, 41.6], [156, 44], [168, 52], [176, 64], [180.6, 80], [181, 92], [178, SOL_G]];

// Orthoplastie : crête sous l'orteil (comble l'espace sous P1-P3, posée sur la semelle) d'un seul bloc avec l'anneau dorsal qui
// coiffe P1 et la saillie de l'IPP (protection) ; en coupe, les deux parties de la même pièce, reliées hors du plan de coupe
export const CRETE_ORTHO: P[] = [[123.6, 86.4], [126.8, 79.2], [132.4, 73.2], [139, 68.2], [143.6, 65.6], [145.6, 70.4], [146.8, 77], [148.6, 84], [152.2, 89.6], [155.4, 91.2], [154.6, 96.4], [151, 99.6], [127, 99.6], [123.2, 96.8], [122.4, 91.4]];
export const ANNEAU_ORTHO: P[] = [[124.2, 59.2], [130, 52.8], [137, 46.8], [142.4, 43.2], [147.2, 42.8], [151.4, 45.4], [149.6, 47.4], [146.6, 45.8], [142.6, 46], [138.4, 49], [131.2, 55.2], [126.2, 62]];

function orteilGriffe(etat: 'cor' | 'orthoplastie'): FormeEcranZen {
  const peau = courbe(PEAU_GRIFFE);
  const os = (pts: P[]) => courbe(pts, true);
  const crete = CRETE_ORTHO, anneau = ANNEAU_ORTHO;
  const parties = [
    // Peau (aplat fermé par le cadre à gauche) puis os en contour fin sur aplat teinté
    `<path d="${peau} L${r(-12)},${r(34.8)} Z" style="fill:var(--ez-peau-2)"/>`,
    ...Object.values(OS_GRIFFE).map((pts) => `<path d="${os(pts)}" style="fill:var(--ez-os);stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.55"/>`),
    // Coussinet plantaire sous la tête (léger, teinte de la peau plus soutenue) : rien d'autre sur la peau
    `<path d="${courbe([[96, 92], [104, 88.4], [113, 88], [120.4, 90.6]])}" style="stroke:var(--ez-peau-ombre);stroke-width:var(--ez-ep-normal)"/>`,
    // Ongle sur le dos de P3
    `<path d="${courbe(ONGLE_GRIFFE)}" style="stroke:var(--ez-ongle);stroke-width:var(--ez-ep-epais)"/>`, trait(courbe(ONGLE_GRIFFE), 'fin', 0.7),
  ];
  if (etat === 'cor') {
    parties.push(
      `<path d="${courbe(DURILLON, true)}" style="fill:var(--ez-corne)"/>`, trait(courbe(DURILLON.slice(0, 5)), 'fin', 0.55),
      `<path d="${courbe(COR, true)}" style="fill:var(--ez-corne)"/>`, `<path d="${courbe(NOYAU, true)}" style="fill:var(--ez-noyau)"/>`,
      trait(courbe(NOYAU, true), 'fin', 0.6), trait(courbe(COR.slice(0, 5)), 'fin', 0.7),
    );
  } else {
    parties.push(
      `<path d="${courbe(crete, true)}" style="fill:var(--ez-silicone);fill-opacity:0.92"/>`, trait(courbe(crete, true), 'fin', 0.8),
      `<path d="${courbe(anneau, true)}" style="fill:var(--ez-silicone);fill-opacity:0.92"/>`, trait(courbe(anneau, true), 'fin', 0.8),
    );
  }
  parties.push(
    trait(peau, 'normal'),
    // Semelle intérieure (sol) et empeigne de la chaussure, à distance du pied sauf au sommet de l'IPP
    `<path d="${ligne([[-12, SOL_G], [184, SOL_G]])}" style="${ep('normal', 0.6)}"/>`,
    `<path d="${courbe(EMPEIGNE)}" style="${ep('epais', 0.45)}"/>`,
  );
  return { viewBox: [60 * E, 30 * E, 128 * E, 76 * E], ids: false, corps: `<g>${parties.join('')}</g>` };
}

export const FORMES_SOINS_ONGLES: Record<string, FormeEcranZen> = {
  'hallux-gros-plan-orthonyxie': hallux(false, { dessus: agrafe() }),
  'hallux-gros-plan-onychoplastie': hallux(false, { ongle: onychoplastie(), defs: defsOnychoplastie(), ids: true }),
  'hallux-gros-plan-mycose': hallux(false, { ongle: mycose(), defs: defsMycose(), ids: true }),
  'ongle-coupe-orthonyxie': coupeOrthonyxie(),
  'pied-profil-ongle-epais-meulage': ongleEpaisMeulage(),
  'orteil-griffe-cor': orteilGriffe('cor'),
  'orteil-griffe-orthoplastie': orteilGriffe('orthoplastie'),
};
