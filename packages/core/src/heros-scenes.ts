// Scènes « héros » dessinées pour trois thèmes, d'après les retours de Paul du 2026-10-06 (chaîne SVG, aucune dépendance d'exécution) :
//
// - ENFANT : les deux petits pieds de l'enfant vus de dessus (la jambe descend vers le bas du cadre), face aux deux pieds d'un
//   adulte qui entrent par le haut, pour l'échelle ; en paysage, ses empreintes en points (relevé) ou en aplat doux (pédagogique).
//   Version de e478e8d rétablie : Paul la préfère (2026-10-06) à la v2 « pas côte à côte » (0c9e722).
// - DIABÈTE : l'examen au monofilament tenu en main (le matériel ne flotte plus) ; voir sceneDiabete.
// - SENIOR : « pour les pieds avec canne yes mais il faut qu'on voit ». De profil, de la taille au sol, une personne qui marche à
//   petits pas avec une canne : pieds chaussés (chaussure fermée, talon bas : la forme est l'ENVELOPPE du profil validé piedDeProfil,
//   POD-AT-0003, comme une forme de cordonnier), pantalon, main simple (poing, sans détail) qui tient la poignée en crosse à hauteur
//   de hanche, tige légèrement inclinée, embout posé au sol un peu en avant du pied avant (pied.ts, règle 7). Double appui : pied avant
//   (côté douloureux, avançant avec la canne, tenue de l'autre main) à plat, pied arrière qui décolle le talon. Proportions de Winter
//   (2009) : pied 0,152 × H, hanche 0,53 × H, cuisse 0,245 × H, jambe 0,246 × H, malléole 0,039 × H. Aucun visage, aucun dos voûté
//   caricatural : le buste sort du cadre. Maison et mallette du domicile retirées (lisibilité).
//
// AUCUN texte (règle de Paul du 2026-10-06). Mêmes classes que les dessins (dessins.css : trait, peau-seule, piece, sol…) et mêmes
// variables (--dessin-*) ; registre « ligne » : traits seuls (classe ligne, épaisseur LIGNE.epaisseur.fine), les aplats n'étant que
// des caches à la couleur du fond. Le dessin est construit dans un repère de 384 × 216 (paysage) ou 240 × 320 (portrait) puis
// agrandi au format du héros : les traits ont la même graisse apparente que les pièces des autres héros. BROUILLON à valider par Paul.
import { silhouette } from './dessins';
import { CONTOUR_PIED, PLANTE_ENFANT, ORTEILS_ENFANT, SEMELLE, SEMELLE_ELEMENTS, piedDeProfil, deformerChemin, echantillonner, chaikin, lisser, dansPolygone, couperSous, type P } from './pied';
import { pointsTrame, grouperTrame, type PointTrame } from './trame';
import { TRAME, LIGNE } from './charte';
import { poseCoureur } from './foulee';
import { svgForme } from './bibliotheque/rendu';
import { HALLUX_GROS_PLAN } from './bibliotheque/hallux-gros-plan';

export type FormatScene = 'paysage' | 'portrait';
export type RegistreScene = 'releve' | 'pedagogique' | 'ligne';
/**
 * Scènes dessinées d'un seul tenant (retours de Paul du 2026-10-07 : « une seule grande illustration par héros, pas deux images côte
 * à côte qu'on ne comprend pas ensemble »). Sport : les jambes d'un coureur en pleine foulée (genou et cheville fléchis, cinématique
 * foulee.ts) ; ongles : le gros orteil en gros plan, ongle sain ; semelles : la paire de semelles orthopédiques vue de dessus ;
 * pédicurie : les deux pieds vus de dessus, soignés, sans aucun instrument (« il faut rassurer »).
 */
export const SCENES_HEROS = ['enfant', 'senior', 'diabete', 'sport', 'ongles', 'semelles', 'pedicurie'] as const;
export type SceneHeros = (typeof SCENES_HEROS)[number];

/** Repère de construction (unités « dessin ») et facteur d'agrandissement vers le héros (640 × 360 ou 360 × 480) */
const REPERE: Record<FormatScene, { l: number; h: number; s: number }> = {
  paysage: { l: 384, h: 216, s: 640 / 384 },
  portrait: { l: 240, h: 320, s: 1.5 },
};

const r1 = (v: number) => +v.toFixed(1);
type Affine = [number, number, number, number, number, number];
const appliquer = (m: Affine, x: number, y: number): P => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/** Rotation `angle` (degrés, sens horaire), échelle `e` (miroir horizontal si `miroir`), le point (ox, oy) envoyé en (tx, ty) */
const pose = (ox: number, oy: number, tx: number, ty: number, e: number, angle = 0, miroir = false): Affine => {
  const t = (angle * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), sx = miroir ? -e : e;
  const a = c * sx, b = s * sx, cc = -s * e, d = c * e;
  return [a, b, cc, d, tx - a * ox - cc * oy, ty - b * ox - d * oy];
};
const tr = (d: string, m: Affine) => deformerChemin(d, (x, y) => appliquer(m, x, y));
const poly = (pts: P[], ferme = true) => `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')}${ferme ? ' Z' : ''}`;

/** Fabrique de traits selon le registre : en « ligne », un seul style de trait (couleur du trait ou accent), sans aplat visible */
function pinceau(registre: RegistreScene) {
  const L = registre === 'ligne';
  const styleLigne = (accent = false) => `style="stroke:${accent ? 'var(--dessin-accent, var(--accent))' : 'var(--dessin-ligne, var(--dessin-trait))'};stroke-width:${LIGNE.epaisseur.fine}"`;
  return {
    L,
    /** Contour : classe du dessin, ou trait continu en registre ligne */
    trait: (d: string, classe = 'trait', accent = false) => (L ? `<path class="ligne" d="${d}" fill="none" ${styleLigne(accent)}></path>` : `<path class="${classe}" d="${d}"></path>`),
    /** Cache à la couleur du fond (occulte ce qui est derrière), visible seulement hors registre ligne si `teinte` */
    aplat: (d: string, teinte = '') => `<path class="peau-seule" d="${d}"></path>${teinte && !L ? `<path class="${teinte}" d="${d}" style="stroke:none"></path>` : ''}`,
  };
}

// ———————————————————————————————————————————————————— Enfant : on marche ensemble (empreintes vues de dessus)

const PROLONGEMENT = 380; // la jambe (repère du pied, coupée à y = 219) se prolonge hors du cadre

/** Rotation de l'ouverture autour de la cheville (49 ; 165), fondue de y = 160 à 190 : le pied tourne, la jambe reste dans l'axe */
const ouvrir = (ouverture: number) => {
  const t = (ouverture * Math.PI) / 180;
  return (x: number, y: number): P => {
    const w = y <= 160 ? 1 : y >= 190 ? 0 : 1 - (y - 160) / 30, a = t * w, c = Math.cos(a), s = Math.sin(a);
    return [49 + (x - 49) * c - (y - 165) * s, 165 + (x - 49) * s + (y - 165) * c];
  };
};

/** Pied d'ADULTE vu de dessus (CONTOUR_PIED dorsal, POD-AT-0001) posé par `m` : aplat, jambe prolongée hors du cadre, contour, ongles */
function piedAdulte(m: Affine, registre: RegistreScene, ouverture: number): string {
  const p = pinceau(registre);
  const tr2 = (d: string) => tr(deformerChemin(d, ouvrir(ouverture)), m);
  const [x1, x2] = [19.92, 77.16], ev = (x2 - x1) * 0.18;
  const jambe = `M${x1},219 L${x1 - ev},${PROLONGEMENT} L${x2 + ev},${PROLONGEMENT} L${x2},219 Z`;
  const bords = `M${x1},218 L${x1 - ev},${PROLONGEMENT} M${x2},218 L${x2 + ev},${PROLONGEMENT}`;
  const peau = [...CONTOUR_PIED.dorsal.peaux, jambe].map((d) => p.aplat(tr2(d))).join('');
  return `<g>${peau}${p.trait(tr2(`${CONTOUR_PIED.dorsal.trait} ${bords}`), 'trait trait--moyen')}${p.trait(tr2(CONTOUR_PIED.dorsal.ongles), 'ongle-dessus ongle-dessus--fin')}</g>`;
}

/**
 * Petit pied de l'ENFANT vu de dessus posé par `m` : silhouette VALIDÉE du pied du tout-petit (PLANTE_ENFANT + ORTEILS_ENFANT, la
 * même que l'animation « premiers pas » : avant-pied large, orteils courts et ronds, voûte comblée, talon rond), petits ongles au
 * bout des orteils, et la jambe (cheville pleine) qui descend vers le bas du cadre en cachant le talon.
 */
function piedEnfant(m: Affine, registre: RegistreScene, ouverture: number): string {
  const p = pinceau(registre);
  const tr2 = (d: string) => tr(deformerChemin(d, ouvrir(ouverture)), m);
  const pied = silhouette(PLANTE_ENFANT, ORTEILS_ENFANT);
  const ongles = ORTEILS_ENFANT.map(([cx, cy, rx, ry, r]) => {
    const t = (r * Math.PI) / 180, d = -ry * 0.42, ex = rx * (cx < 25 ? 0.5 : 0.46), ey = ry * 0.36;
    return lisser(Array.from({ length: 10 }, (_, k) => {
      const a = (k / 10) * 2 * Math.PI, X = ex * Math.cos(a), Y = ey * Math.sin(a);
      return [r1(cx - Math.sin(t) * d + X * Math.cos(t) - Y * Math.sin(t)), r1(cy + Math.cos(t) * d + X * Math.sin(t) + Y * Math.cos(t))] as P;
    }));
  }).join(' ');
  // Jambe : couvre le talon (sans trait de jonction : le dos du pied se continue dans la jambe), bords qui s'élargissent vers l'œil
  const [x1, x2] = [16, 81], ev = (x2 - x1) * 0.3;
  const jambe = `M${x1},162 C${x1},144 ${x2},144 ${x2},162 L${x2 + ev},${PROLONGEMENT} L${x1 - ev},${PROLONGEMENT} Z`;
  const bords = `M${x1},162 L${x1 - ev},${PROLONGEMENT} M${x2},162 L${x2 + ev},${PROLONGEMENT}`;
  const aplat = (d: string) => (p.L ? p.aplat(tr2(d)) : `<g class="peau-douce">${p.aplat(tr2(d))}</g>`);
  return `<g>${aplat(pied)}${p.trait(tr2(pied))}${aplat(jambe)}${p.trait(tr2(bords))}${p.trait(tr2(ongles), 'fin')}</g>`;
}

function sceneEnfant(format: FormatScene, registre: RegistreScene): string {
  // Retour de Paul du 2026-10-07 (relevé : « on comprend pas pourquoi les empreintes de l'enfant sont posées à côté ») : plus
  // d'empreintes à droite, la scène est centrée. Le trait continu (« J'adore ») garde exactement sa mise en page.
  const P_ = format === 'paysage'
    ? { cx: registre === 'ligne' ? 150 : 192, ea: 0.54, ya: 4, da: 36, ee: 0.3, ye: 172, de: 22 }
    : { cx: 120, ea: 0.6, ya: 66, da: 40, ee: 0.33, ye: 246, de: 24 };
  // Chaque pied est posé par sa CHEVILLE (49 ; 165 dans le repère du pied) : l'ouverture des pieds tourne autour de la cheville,
  // jamais les jambes l'une vers l'autre. Adulte en face (orteils vers le bas), pieds ouverts de 8° ; enfant ouverts de 9°
  const CHEVILLE = 165;
  const adulteG = pose(49, CHEVILLE, P_.cx - P_.da, P_.ya, P_.ea, 180);
  const adulteD = pose(49, CHEVILLE, P_.cx + P_.da, P_.ya, P_.ea, 180, true);
  const enfantD = pose(49, CHEVILLE, P_.cx + P_.de, P_.ye, P_.ee, 0);
  const enfantG = pose(49, CHEVILLE, P_.cx - P_.de, P_.ye, P_.ee, 0, true);
  // Ouverture dans le repère du pied droit (angle positif : orteils vers le bord latéral) ; le miroir fait le pied gauche
  return piedAdulte(adulteG, registre, 8) + piedAdulte(adulteD, registre, 8) + piedEnfant(enfantG, registre, 9) + piedEnfant(enfantD, registre, 9);
}

// ———————————————————————————————————————————————————— Senior : marche à petits pas avec une canne


/**
 * DIABÈTE (retour de Paul : le monofilament et le diapason « flottent en l'air ») : le geste réel du dépistage (IWGDF 2019, HAS). Le
 * patient est allongé : le pied de profil (piedDeProfil, POD-AT-0003, vue médiale), orteils vers le haut, plante tournée vers le
 * soignant, la jambe sort du cadre à gauche et repose sur la table d'examen (le mollet porte, le talon est juste au-dessus). Le
 * monofilament est tenu par une main simple (prise en pince, sans détail ni visage) qui arrive de la droite : manche dans l'axe, le fil
 * PERPENDICULAIRE à la plante sous la tête du 1er métatarsien (un des 3 sites), plié en un seul C au contact (on appuie jusqu'à la
 * flexion). Le diapason n'est plus montré (un instrument, un geste : lisible par un patient). Aucun rouge, aucun pied nu qui marche.
 */
function sceneDiabete(format: FormatScene, registre: RegistreScene): string {
  const p = pinceau(registre);
  const prof = piedDeProfil();
  // Échelle (1 cm ≈ 4,9 u du profil), position de la plante (xs) et hauteur du site (ym) dans le repère de la scène
  const [k, xs, ym] = format === 'paysage' ? [1.2, 190, 76] : [0.96, 112, 128];
  // (x, y) du profil → (xs + (y − sol)·k, ym − (x − 83)·k) : orteils en haut, plante vers la droite, jambe vers la gauche
  const m: Affine = [0, -k, k, 0, xs - prof.sol * k, ym + 83 * k];
  const t = (d: string) => tr(d, m);
  const peau = (d: string) => (p.L ? p.aplat(t(d)) : `<g class="peau-douce">${p.aplat(t(d))}</g>`);
  const pied =
    prof.orteils.map((d) => p.aplat(t(d)) + p.trait(t(d), 'trait trait--orteil')).join('') +
    peau(prof.peau) + peau(prof.hallux) +
    p.trait(t(prof.contour)) + p.trait(t(prof.halluxContour)) + p.trait(t(prof.ongle), 'ongle-dessus ongle-dessus--fin') + p.trait(t(prof.malleole), 'fin');
  // Table d'examen : sous le mollet, au point le plus bas de la jambe visible dans le cadre (le talon ne la touche pas)
  const bas = Math.max(...echantillonner(t(prof.contour), 6).flatMap((s) => s.pts).filter(([x]) => x >= 0 && x <= xs).map(([, y]) => y));
  const table = p.trait(`M0 ${r1(bas + 0.6)} H${r1(xs + 18 * k)}`, 'sol');
  // Monofilament (repère local : u le long du manche depuis le contact, v vers le bas ; unités du profil) : fil plié en C (flambage
  // d'Euler, une seule courbure, flèche ≈ 0,42 × la corde, bombé vers les orteils), manche fin aux bouts arrondis
  const corde = 22, longueurManche = 50, h = 2.8;
  const L = (u: number, v: number): P => [xs + u * k, ym + v * k];
  const pts = (q: [number, number][]) => q.map(([u, v]) => L(u, v).map(r1) as P);
  const filament = courbe(Array.from({ length: 17 }, (_, j) => { const s = j / 16; return L(corde * s, -0.42 * corde * Math.sin(Math.PI * s)); }));
  const [u0, u1] = [corde, corde + longueurManche];
  const manche = lisser(pts([[u0, -h], [u0 + 6, -h], [u1 - 3, -h], [u1, -h * 0.4], [u1, h * 0.4], [u1 - 3, h], [u0 + 6, h], [u0, h]]));
  const fil = p.L ? p.trait(filament, 'trait', true) : `<path class="filament" d="${filament}"></path>`;
  // Main en prise « stylo » vue du côté du pouce : paume et doigts repliés sous le manche, index posé dessus, pouce devant ; manche
  // de la blouse vers la droite (hors cadre). Formes pleines arrondies, aucun ongle ni détail.
  // Proportions : main ≈ 0,7 × la longueur du pied (≈ 18–19 cm), index ≈ 7,5 cm, poignet ≈ 6 cm (1 cm ≈ 4,9 u)
  const a = u0 + 20; // bout de l'index, posé sur le manche (le bout du manche et le fil restent bien visibles)
  /**
   * Doigt : tube effilé le long d'un axe courbe (unités du profil, de la base vers le bout), bout arrondi ; aplat fermé et contour
   * ouvert à la base (le doigt sort de la paume sans trait de coupure)
   */
  const doigt = (axe: [number, number][], demi: number[]) => {
    const n = axe.length, [bx, by] = axe[n - 1], [ax, ay] = axe[n - 2], l = Math.hypot(bx - ax, by - ay), r = demi[n - 1];
    const [ux, uy] = [(bx - ax) / l, (by - ay) / l];
    const t = tube(pts([...axe, [bx + ux * r * 0.55, by + uy * r * 0.55], [bx + ux * r * 0.95, by + uy * r * 0.95]]), [...demi, r * 0.8, r * 0.3].map((d) => d * k));
    const [g, d] = t.bords;
    return { plein: t.ferme, trait: courbe([...g, ...[...d].reverse()]) };
  };
  // Paume et dos de la main (le majeur, l'annulaire et l'auriculaire repliés dessous), derrière l'index et le pouce
  const paume = lisser(pts([[a + 26, -h - 11], [a + 36, -h - 15.2], [a + 52, -h - 14], [a + 64, -h - 9], [a + 67, 4], [a + 62, 14], [a + 48, 18.5], [a + 34, 17], [a + 22, 11], [a + 16, 2]]));
  // Index posé sur le manche (léger fléchissement des articulations), pouce devant le manche, bout contre lui
  const index = doigt([[a + 34, -h - 10.5], [a + 21, -h - 6.4], [a + 10, -h - 3.6], [a + 1.5, -h - 2.4]], [5.2, 4.4, 3.9, 3.3]);
  const pouce = doigt([[a + 40, 12], [a + 26, 9.5], [a + 13, 5], [a + 3, 2.2]], [6.4, 5.4, 4.6, 3.8]);
  // Manche de la blouse : bande droite vers la droite (hors cadre), poignet coupé net (pas d'arrondi qui déborde)
  const [c0, c1] = [L(a + 58, 2), L(a + 160, 30)], dl = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]);
  const [nx, ny] = [-(c1[1] - c0[1]) / dl, (c1[0] - c0[0]) / dl], [w0, w1] = [15 * k, 17 * k];
  const bg: P[] = [[c0[0] + nx * w0, c0[1] + ny * w0], [c1[0] + nx * w1, c1[1] + ny * w1]], bd: P[] = [[c0[0] - nx * w0, c0[1] - ny * w0], [c1[0] - nx * w1, c1[1] - ny * w1]];
  const blouse = p.aplat(poly([bg[0], bg[1], bd[1], bd[0]]), 'piece') + p.trait(`${poly(bg, false)} ${poly(bd, false)} ${poly([bg[0], bd[0]], false)}`);
  const chair = (d: string, contour = d) => (p.L ? p.aplat(d) : `<g class="peau-douce">${p.aplat(d)}</g>`) + p.trait(contour);
  const mainSvg = chair(paume) + chair(index.plein, index.trait) + chair(pouce.plein, pouce.trait) + blouse;
  const objet = p.aplat(manche, 'piece piece--forte') + p.trait(manche, 'trait trait--moyen');
  // Ordre : table, pied, fil, manche, main (la main passe devant le manche)
  return table + `<g>${pied}</g>` + fil + objet + mainSvg;
}

// ———————————————————————————————————————————————————— Senior : marche à petits pas avec une canne

/** Enveloppe convexe */
function enveloppe(points: P[]): P[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const x = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const bas: P[] = [], haut: P[] = [];
  for (const q of p) { while (bas.length > 1 && x(bas[bas.length - 2], bas[bas.length - 1], q) <= 0) bas.pop(); bas.push(q); }
  for (const q of [...p].reverse()) { while (haut.length > 1 && x(haut[haut.length - 2], haut[haut.length - 1], q) <= 0) haut.pop(); haut.push(q); }
  return [...bas.slice(0, -1), ...haut.slice(0, -1)];
}
/** Décalage d'un polygone fermé (sens quelconque) de `d` vers l'extérieur */
function decaler(pts: P[], d: number): P[] {
  const aire = pts.reduce((s, [x, y], i) => { const [u, v] = pts[(i + 1) % pts.length]; return s + x * v - u * y; }, 0);
  const sens = aire > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return [p[0] + (sens * ty / l) * d, p[1] - (sens * tx / l) * d] as P;
  });
}

/**
 * Chaussure fermée à talon bas, dans le repère du profil (sol = 62) : enveloppe du pied validé sous le col (sous la malléole),
 * élargie de 2 u (épaisseur de la tige), et semelle plate (4,5 u au talon, 3 u à l'avant, bout légèrement relevé). Calculée une fois.
 */
let memoChaussure: { tige: string; semelle: string; details: string; col: P[]; sol: number } | null = null;
function chaussure() {
  if (memoChaussure) return memoChaussure;
  const p = piedDeProfil();
  const col = (x: number) => 34.5 - 0.1 * x; // col sous la malléole médiale (32 ; 28), qui descend vers le cou-de-pied
  const pts = [p.contour, p.halluxContour, ...p.orteils].flatMap((d) => echantillonner(d, 8).flatMap((s) => s.pts)).filter(([x, y]) => y >= col(x) && x > -20);
  // Bords du col (intersections approximatives avec le contour) : les points du contour les plus proches de la ligne du col
  const arriere = pts.filter(([x]) => x < 20).reduce((a, q) => (q[1] < a[1] ? q : a), [0, 99] as P);
  const avant = pts.filter(([x]) => x > 35 && x < 75).reduce((a, q) => (Math.abs(q[1] - col(q[0])) < Math.abs(a[1] - col(a[0])) && q[0] > a[0] - 30 ? q : a), [50, 99] as P);
  const env = enveloppe([...pts, arriere, avant]);
  const tige = decaler(chaikin(env, 2), 2);
  const xs = tige.map(([x]) => x), x0 = Math.min(...xs) + 0.5, x1 = Math.max(...xs) - 0.5;
  const sol = 62 + 5;
  // Semelle plate antidérapante (5 u ≈ 1 cm), bout légèrement relevé ; talon marqué d'un trait fin
  const semelle = `M${r1(x0)} 61 L${r1(x1 - 2)} 61 C${r1(x1 + 1.5)} 61 ${r1(x1 + 2.4)} 63 ${r1(x1 + 0.5)} ${r1(sol - 2)} C${r1(x1 - 1.5)} ${r1(sol - 0.6)} ${r1(x1 - 6)} ${r1(sol)} ${r1(x1 - 12)} ${r1(sol)} L${r1(x0 + 1.5)} ${r1(sol)} C${r1(x0 - 1)} ${r1(sol)} ${r1(x0 - 1)} 61 ${r1(x0)} 61 Z`;
  const talon = `M${r1(x0 + 26)} ${r1(sol - 0.2)} L${r1(x0 + 27.5)} 62.5`;
  // Bord du laçage : parallèle au cou-de-pied, 3,5 u sous le haut de la tige, du col vers l'avant-pied
  const dessus = tige.filter(([x, y]) => x >= avant[0] - 1 && x <= 82 && y < 50).sort((a, b) => a[0] - b[0]);
  const lacage = dessus.length > 2 ? courbe(dessus.filter((_, i) => i % 2 === 0).map(([x, y]) => [x + 1.5, y + 3.5] as P)) : '';
  memoChaussure = { tige: lisser(tige.map(([x, y]) => [r1(x), r1(y)] as P)), semelle, details: `${talon} ${lacage}`, col: [arriere, avant], sol };
  return memoChaussure;
}

/** Cinématique inverse plane : genou entre la hanche H et la cheville A (cuisse l1, jambe l2), genou vers l'avant (+x) */
function genou(H: P, A: P, l1: number, l2: number): P {
  const dx = A[0] - H[0], dy = A[1] - H[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const a = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)), t = Math.atan2(dy, dx);
  // Deux solutions ; on garde celle dont le genou est en avant (x le plus grand)
  const k1: P = [H[0] + l1 * Math.cos(t - a), H[1] + l1 * Math.sin(t - a)], k2: P = [H[0] + l1 * Math.cos(t + a), H[1] + l1 * Math.sin(t + a)];
  return k1[0] > k2[0] ? k1 : k2;
}
/** Tube (jambe de pantalon, avant-bras) le long d'une polyligne, demi-largeurs aux sommets ; renvoie le contour fermé et ses deux bords */
function tube(axe: P[], demi: number[]): { ferme: string; bords: [P[], P[]] } {
  const g: P[] = [], dr: P[] = [];
  axe.forEach((p, i) => {
    const a = axe[Math.max(0, i - 1)], b = axe[Math.min(axe.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
    g.push([p[0] + nx * demi[i], p[1] + ny * demi[i]]); dr.push([p[0] - nx * demi[i], p[1] - ny * demi[i]]);
  });
  return { ferme: lisser([...g, ...dr.reverse()].map(([x, y]) => [r1(x), r1(y)] as P)), bords: [g, dr.reverse()] };
}
/** Courbe ouverte par des points (Catmull-Rom) */
function courbe(points: P[]): string {
  const n = points.length, pt = (i: number) => points[Math.max(0, Math.min(n - 1, i))];
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

function sceneSenior(format: FormatScene, registre: RegistreScene): string {
  const R = REPERE[format];
  const p = pinceau(registre);
  // Taille H : la taille (0,6 × H) sort du cadre par le haut ; sol en bas du cadre
  const sol = R.h - (format === 'paysage' ? 16 : 20);
  const H = (sol + 6) / 0.6;
  const L = 0.152 * H, k = L / 128; // longueur du pied (talon → hallux ≈ 128 u dans le repère du profil)
  const c = chaussure();
  const pas = (format === 'paysage' ? 0.24 : 0.2) * H;
  const largeur = pas + L + 0.06 * H;
  const xF = R.l / 2 - largeur / 2 + pas + 4.5 * k; // talon du pied avant
  // Pied avant (gauche, côté éloigné : vue médiale, juste) à plat ; pied arrière (droit, côté proche) en DÉCOLLEMENT DU TALON : la
  // MÊME chaussure, posée au sol, puis pliée à l'avant-pied (retour de Paul du 2026-10-06 : « le pied est comme tordu ») — l'arrière
  // du pied tourne autour de l'appui sous les têtes métatarsiennes (MTP de l'hallux, x ≈ 88), talon vers le HAUT ; l'avant-pied et les
  // orteils restent à plat sur le sol (la semelle se plie en douceur entre x ≈ 64 et 90, sans cassure de l'empeigne) ; la cheville suit l'arrière-pied (même rotation)
  const surSol = (dx: number): Affine => [k, 0, 0, k, dx + 4.5 * k, sol - c.sol * k];
  const avant = surSol(xF - 4.5 * k);
  const base = surSol(xF - pas - 4.5 * k);
  const prof = piedDeProfil();
  const XM = prof.mtp[0];
  // Petit pas prudent : talon décollé d'environ 3 cm (10° autour d'un pivot à ≈ 18 cm du talon)
  const DECOLLEMENT = 10;
  const plier = (x: number, y: number): P => {
    const u = Math.max(0, Math.min(1, (XM + 2 - x) / 26)), w = u * u * (3 - 2 * u); // 1 en arrière de x ≈ 64, 0 en avant de x ≈ 90
    const a = (DECOLLEMENT * w * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a), dx = x - XM, dy = y - c.sol;
    // Rotation qui SOULÈVE ce qui est en arrière du pivot (dx < 0 → y diminue ; à l'écran, y vers le bas)
    return [XM + dx * co - dy * si, c.sol + dx * si + dy * co];
  };
  /** Placement d'un pied : point et chemin (le pied arrière est densifié avant pliage, pour que la semelle se courbe vraiment) */
  type Placement = { pt: (x: number, y: number) => P; ch: (d: string) => string };
  const aPlat = (m: Affine): Placement => ({ pt: (x, y) => appliquer(m, x, y), ch: (d) => tr(d, m) });
  const plie = (m: Affine): Placement => {
    const pt = (x: number, y: number) => appliquer(m, ...plier(x, y));
    const ch = (d: string) => echantillonner(d, 2).map(({ pts, ferme }) => {
      const dense: P[] = [];
      const suite = ferme ? [...pts, pts[0]] : pts;
      suite.forEach((q, i) => {
        if (i === 0) { dense.push(q); return; }
        const a = suite[i - 1], n = Math.max(1, Math.ceil(Math.hypot(q[0] - a[0], q[1] - a[1]) / 6));
        for (let j = 1; j <= n; j++) dense.push([a[0] + ((q[0] - a[0]) * j) / n, a[1] + ((q[1] - a[1]) * j) / n]);
      });
      if (ferme) dense.pop();
      // Courbe lisse (Catmull-Rom) au centième : une polyligne arrondie au dixième ferait des marches le long de la semelle inclinée
      const q = dense.map(([x, y]) => pt(x, y)), n = q.length, f = (v: number) => +v.toFixed(2);
      const at = (i: number) => (ferme ? q[(i + n) % n] : q[Math.max(0, Math.min(n - 1, i))]);
      let d = `M${f(q[0][0])} ${f(q[0][1])}`;
      for (let i = 0; i < (ferme ? n : n - 1); i++) {
        const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
        d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
      }
      return ferme ? `${d} Z` : d;
    }).join(' ');
    return { pt, ch };
  };
  const avantP = aPlat(avant), arriereP = plie(base);
  // Seul le bas de la jambe (sous l'ourlet du pantalon) est dessiné : le profil validé coupé à y = 12 (repère du profil)
  const cheville = Object.assign((m: Placement) => m.pt(prof.malleoleMediale[0], prof.malleoleMediale[1]), { plein: couperSous(prof.peau, 12).plein });
  const Aav = cheville(avantP), Aar = cheville(arriereP);
  // Hanche : entre les deux chevilles, légèrement en avant (appui sur la canne)
  // Hauteur ajustée pour que la jambe arrière, au décollement du talon, reste presque tendue (genou fléchi d'environ 10°, jamais
  // une jambe « qui rue ») : distance hanche–cheville arrière = 0,996 × (cuisse + jambe), hanche entre 0,49 et 0,53 × H (Winter : 0,53 × H debout)
  const l1 = 0.245 * H, l2 = 0.246 * H;
  const xH = 0.42 * Aar[0] + 0.58 * Aav[0], dArr = 0.996 * (l1 + l2);
  const Hh: P = [xH, Math.min(sol - 0.49 * H, Math.max(sol - 0.53 * H, Aar[1] - Math.sqrt(Math.max(0, dArr ** 2 - (xH - Aar[0]) ** 2))))];
  const Kav = genou(Hh, Aav, l1, l2), Kar = genou(Hh, Aar, l1, l2);
  // Jambe de pantalon : hanche → genou → ourlet (au-dessus de la malléole), demi-largeurs cuisse 0,05 H, genou 0,036 H, ourlet 0,034 H
  const ourlet = (K: P, A: P): P => { const v = [A[0] - K[0], A[1] - K[1]], l = Math.hypot(v[0], v[1]); return [A[0] - (v[0] / l) * 0.016 * H, A[1] - (v[1] / l) * 0.016 * H]; };
  const jambe = (K: P, A: P) => {
    const haut: P = [Hh[0], Hh[1] - 0.04 * H];
    return tube([haut, Hh, K, ourlet(K, A)], [0.05 * H, 0.05 * H, 0.037 * H, 0.035 * H]);
  };
  const piedChausse = (m: Placement) =>
    // Cheville (chaussette unie) entre l'ourlet et le col : aplat seul, sans contour (aucun trait qui dépasse derrière le talon)
    p.aplat(m.ch(cheville.plein), 'piece-coque') +
    p.aplat(m.ch(c.tige), 'piece piece--forte') + p.trait(m.ch(c.tige)) + p.aplat(m.ch(c.semelle), 'piece-coque') + p.trait(m.ch(c.semelle), 'trait trait--moyen') + p.trait(m.ch(c.details), 'fin');
  const pantalon = (K: P, A: P) => {
    const j = jambe(K, A);
    // Contour ouvert en haut (le bassin continue), fermé en bas (ourlet)
    const [g, d] = j.bords;
    return p.aplat(j.ferme, 'piece') + p.trait(`${courbe(g)} ${courbe(d)} M${r1(g[g.length - 1][0])} ${r1(g[g.length - 1][1])} L${r1(d[d.length - 1][0])} ${r1(d[d.length - 1][1])}`);
  };
  // Bassin (de profil) : fesse en arrière, ventre en avant, jusqu'au haut du cadre ; ouvert en haut
  const bassin = (() => {
    const [x, y] = Hh;
    const contour: P[] = [[x - 0.085 * H, -12], [x - 0.095 * H, y - 0.06 * H], [x - 0.07 * H, y + 0.02 * H], [x - 0.02 * H, y + 0.06 * H], [x + 0.04 * H, y + 0.04 * H], [x + 0.065 * H, y - 0.02 * H], [x + 0.07 * H, y - 0.08 * H], [x + 0.072 * H, -12]];
    const d = lisser(contour.map(([u, v]) => [r1(u), r1(v)] as P));
    return p.aplat(`${d} Z`, 'piece') + p.trait(courbe(contour.slice(0, 3)) + ' ' + courbe(contour.slice(5)));
  })();
  // Canne : embout au sol un peu en avant du pied avant, tige légèrement inclinée (haut en arrière), poignée ANATOMIQUE horizontale à
  // hauteur du poignet (grand trochanter), tenue par la main du côté proche (opposé au côté douloureux). Retour de Paul du 2026-10-07
  // (« au niveau de la main et de la canne c'est un peu bizarre ») : la crosse, dont le crochet dépassait sous un poing rond, est
  // remplacée par une poignée que le poing ENSERRE : la poignée dépasse devant les doigts, la tige sort sous le poing, l'avant-bras
  // arrive par le haut et l'arrière (coude légèrement fléchi).
  const bout = appliquer(avant, 128, c.sol)[0];
  const embout: P = [bout + 0.04 * H, sol];
  const yPoignee = sol - 0.49 * H;
  const haut: P = [embout[0] - (sol - yPoignee) * Math.tan((7 * Math.PI) / 180), yPoignee];
  const ep = 0.0085 * H; // demi-épaisseur de la poignée (≈ 3 cm de diamètre)
  const [xa, xb] = [haut[0] - 0.014 * H, haut[0] + 0.072 * H]; // arrière et avant de la poignée (≈ 14 cm)
  const tige = `M${r1(embout[0])} ${r1(sol - 0.012 * H)} L${r1(haut[0])} ${r1(haut[1] + ep)}`;
  const poignee = `M${r1(xa + ep)} ${r1(haut[1] - ep)} H${r1(xb - ep)} A${r1(ep)} ${r1(ep)} 0 0 1 ${r1(xb - ep)} ${r1(haut[1] + ep)} H${r1(xa + ep)} A${r1(ep)} ${r1(ep)} 0 0 1 ${r1(xa + ep)} ${r1(haut[1] - ep)} Z`;
  const emboutD = `M${r1(embout[0] - 0.008 * H)} ${r1(sol - 0.016 * H)} H${r1(embout[0] + 0.008 * H)} L${r1(embout[0] + 0.009 * H)} ${r1(sol)} H${r1(embout[0] - 0.009 * H)} Z`;
  const canne = p.L
    ? p.trait(`${tige} ${emboutD}`, 'canne', true) + p.aplat(poignee) + p.trait(poignee, 'canne', true)
    : `<path class="canne" d="${tige}" style="stroke:var(--dessin-accent)"></path><path class="canne-embout" d="${emboutD}"></path><path class="canne-embout" d="${poignee}" style="fill:var(--dessin-accent)"></path>`;
  // Main : poing refermé AUTOUR de la poignée (paume dessus, doigts enroulés dessous), centré un peu en avant de la tige ; le bout
  // avant de la poignée dépasse devant les doigts
  const lp = 0.029 * H, hp = 0.024 * H;
  const poing: P = [haut[0] + 0.02 * H, haut[1] - hp * 0.12];
  const main = lisser([[poing[0] - lp, poing[1] - hp * 0.35], [poing[0] - lp * 0.55, poing[1] - hp * 1.02], [poing[0] + lp * 0.45, poing[1] - hp * 1.05], [poing[0] + lp * 0.98, poing[1] - hp * 0.4], [poing[0] + lp * 0.95, poing[1] + hp * 0.72], [poing[0] + lp * 0.1, poing[1] + hp * 1.1], [poing[0] - lp * 0.8, poing[1] + hp * 0.72]].map(([x, y]) => [r1(x), r1(y)] as P));
  // Pouce posé sur le dessus de la poignée, vers l'avant
  const pouce = `M${r1(poing[0] - lp * 0.45)} ${r1(poing[1] - hp * 0.6)} C${r1(poing[0] - lp * 0.05)} ${r1(poing[1] - hp * 0.48)} ${r1(poing[0] + lp * 0.4)} ${r1(poing[1] - hp * 0.42)} ${r1(poing[0] + lp * 0.74)} ${r1(poing[1] - hp * 0.4)}`;
  // Avant-bras : du coude (hors cadre, au-dessus de la hanche) au poignet, en haut et à l'arrière du poing
  const coude: P = [Hh[0] - 0.012 * H, sol - 0.67 * H];
  const poignet: P = [poing[0] - lp * 0.5, poing[1] - hp * 0.75];
  const bras = tube([coude, poignet], [0.03 * H, 0.025 * H]);
  const manche = (() => {
    const [g, d] = bras.bords;
    return p.aplat(bras.ferme, 'piece') + p.trait(`${courbe(g)} ${courbe(d)} M${r1(g[1][0])} ${r1(g[1][1])} L${r1(d[1][0])} ${r1(d[1][1])}`);
  })();
  // Doigts enroulés sous la poignée : trois plis courts sur l'avant-bas du poing
  const doigts = [0.15, 0.45, 0.75].map((f) => { const x = poing[0] + lp * (0.1 + f * 0.75); return `M${r1(x)} ${r1(poing[1] + hp * 0.2)} C${r1(x + lp * 0.06)} ${r1(poing[1] + hp * 0.45)} ${r1(x + lp * 0.05)} ${r1(poing[1] + hp * 0.7)} ${r1(x - lp * 0.02)} ${r1(poing[1] + hp * (0.98 - f * 0.25))}`; }).join(' ');
  const mainSvg = (p.L ? '' : `<g class="peau-douce">`) + p.aplat(main) + (p.L ? '' : '</g>') + p.trait(main) + p.trait(`${pouce} ${doigts}`, 'fin');
  // Sol et, en relevé, appuis sur le sol (jamais sur la peau) : pied avant entier, avant-pied arrière, embout de canne
  const ligneSol = p.trait(`M${r1(Math.min(appliquer(base, -10, 0)[0], R.l * 0.18))} ${r1(sol)} H${r1(Math.max(embout[0] + 0.08 * H, R.l * 0.82))}`, 'sol');
  let appuis = '';
  if (registre === 'releve') {
    const pasT = TRAME.pas * 0.8 * k * 3.2;
    const pts: PointTrame[] = [];
    const ajouter = (x0: number, x1: number, v: (u: number) => number) => {
      for (let rang = 0; rang < 2; rang++) for (let x = x0 + (rang ? pasT / 2 : 0); x <= x1; x += pasT) pts.push({ x: r1(x), y: r1(sol + pasT * 0.9 + rang * pasT * 0.866), v: v((x - x0) / (x1 - x0 || 1)) });
    };
    const [a0, a1] = [appliquer(avant, 0, c.sol)[0], appliquer(avant, 126, c.sol)[0]];
    // Valeurs modérées (jamais un pic rouge isolé) : talon et avant-pied du pied avant, avant-pied du pied arrière, embout
    ajouter(a0, a1, (u) => Math.min(0.78, 0.5 * Math.exp(-(((u - 0.1) / 0.12) ** 2)) + 0.25 + 0.4 * Math.exp(-(((u - 0.68) / 0.1) ** 2))));
    const [b0, b1] = [arriereP.pt(XM - 4, c.sol)[0], arriereP.pt(126, c.sol)[0]]; // seul l'avant-pied arrière touche le sol
    ajouter(b0, b1, (u) => 0.55 + 0.2 * Math.exp(-(((u - 0.3) / 0.25) ** 2)));
    ajouter(embout[0] - pasT * 0.6, embout[0] + pasT * 0.6, () => 0.45);
    appuis = `<g class="trame">${grouperTrame(pts, pasT).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}"></path>`).join('')}</g>`;
  }
  // Ordre de peinture : jambe éloignée (avant), bassin, jambe proche (arrière), canne, main et manche
  return ligneSol + appuis +
    `<g>${piedChausse(avantP)}${pantalon(Kav, Aav)}</g>` + bassin + `<g>${piedChausse(arriereP)}${pantalon(Kar, Aar)}</g>` + canne + manche + mainSvg;
}

// ———————————————————————————————————————————————————— Sport : les jambes d'un coureur en pleine foulée

/**
 * SPORT (retour de Paul du 2026-10-07 sur le trait continu : « jambes trop droites ») : les jambes d'un coureur de profil, du bassin
 * (short) au sol, à l'instant classique de la foulée : jambe d'appui en amortissement (genou fléchi ≈ 38°, pied à plat sous le
 * bassin), jambe libre en oscillation (genou fléchi ≈ 95°, talon remonté sous la fesse, cheville proche du neutre). Cinématique et
 * chaussure de foulee.ts (Novacheck 1998), la même que l'animation du coureur : les deux jambes partent d'une MÊME hanche. Galbe du
 * mollet à l'arrière, cheville fine, aucun visage (le buste sort du cadre). Même peau pour les deux jambes (la profondeur se lit par
 * l'ordre de peinture, jamais par une jambe assombrie).
 */
function sceneSport(format: FormatScene, registre: RegistreScene): string {
  const R = REPERE[format];
  const p = pinceau(registre);
  const sol = R.h - (format === 'paysage' ? 14 : 22);
  // Longueur de la jambe (hanche → cheville tendue = 0,94 L) : le bassin juste sous le haut du cadre
  const L = format === 'paysage' ? 172 : 215;
  const phase = 0.36; // fin d'appui droit (poussée sur l'avant-pied) : jambe gauche lancée vers l'avant, genou fléchi
  const pose = poseCoureur(phase, L);
  const x0 = R.l / 2 + (format === 'paysage' ? 6 : 4);
  const X = (q: { x: number; y: number }): P => [x0 + q.x, sol + q.y];
  // Jambe : tube à demi-largeurs différentes devant (crête tibiale, cuisse) et derrière (fesse, mollet) ; « derrière » = côté
  // postérieur du segment (normale gauche de la marche hanche → cheville)
  const tubeJambe = (pts: P[], avant: number[], arriere: number[]) => {
    const g: P[] = [], d: P[] = [];
    pts.forEach((q, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
      g.push([q[0] + nx * arriere[i] * L, q[1] + ny * arriere[i] * L]); d.push([q[0] - nx * avant[i] * L, q[1] - ny * avant[i] * L]);
    });
    return { g, d };
  };
  const mi = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const jambe = (j: (typeof pose)['droite']) => {
    const H_ = X(j.hanche), K = X(j.genou), A = X(j.cheville);
    // Axe : hanche, mi-cuisse, genou, mollet (30 % de la jambe), bas du mollet, cheville
    const axe: P[] = [H_, mi(H_, K, 0.5), K, mi(K, A, 0.3), mi(K, A, 0.62), A];
    const { g, d } = tubeJambe(axe, [0.07, 0.058, 0.04, 0.036, 0.028, 0.022], [0.075, 0.06, 0.042, 0.062, 0.04, 0.024]);
    const chaussure = j.chaussure.map(X);
    return { g, d, chaussure, K, A, H_ };
  };
  const dessinerJambe = (j: ReturnType<typeof jambe>) => {
    const peau = lisser([...j.g, ...[...j.d].reverse()].map(([x, y]) => [r1(x), r1(y)] as P));
    const aplat = p.L ? p.aplat(peau) : `<g class="peau-douce">${p.aplat(peau)}</g>`;
    // Contour : les deux bords, ouverts en haut (le short les couvre) et en bas (la chaussure les couvre)
    const bords = `${courbe(j.g)} ${courbe(j.d)}`;
    // Chaussure de course (foulee.ts) : tige et semelle épaisse ; ligne de la semelle intermédiaire
    const ch = lisser(j.chaussure.map(([x, y]) => [r1(x), r1(y)] as P));
    const [t0, , , , t4, t5, t6, t7, t8] = j.chaussure;
    const semelle = courbe([mi(j.chaussure[2], t0, 0.25), mi(j.chaussure[3], j.chaussure[2], 0.5), mi(t4, t0, 0.18), mi(t5, j.chaussure[12], 0.22), mi(t6, j.chaussure[11], 0.2), mi(t7, j.chaussure[10], 0.3), t8]);
    const chaussureSvg = p.aplat(ch, 'piece piece--forte') + p.trait(ch) + p.trait(semelle, 'fin');
    return aplat + p.trait(bords) + chaussureSvg;
  };
  const droite = jambe(pose.droite), gauche = jambe(pose.gauche);
  // Short : couvre le haut des deux cuisses (≈ 45 % de la cuisse), le bassin et sort du cadre par le haut
  const short = (j: ReturnType<typeof jambe>) => {
    const n = 3; // indices 0..1 de l'axe (hanche → mi-cuisse), prolongés un peu
    const g = j.g.slice(0, 2).map((q, i) => (i === 1 ? mi(j.g[0], j.g[1], 0.95) : q)), d = j.d.slice(0, 2).map((q, i) => (i === 1 ? mi(j.d[0], j.d[1], 0.95) : q));
    void n;
    const e = 0.012 * L;
    const ga: P[] = g.map(([x, y], i) => [x + (i ? -e : -e), y]), da: P[] = d.map(([x, y]) => [x + e, y]);
    return { contour: [...ga, ...[...da].reverse()], ourlet: [ga[1], da[1]] as [P, P] };
  };
  const sd = short(droite), sg = short(gauche);
  const Hh = X(pose.droite.hanche);
  const bassin: P[] = [[Hh[0] - 0.13 * L, -12], [Hh[0] - 0.135 * L, Hh[1] - 0.02 * L], [Hh[0] - 0.09 * L, Hh[1] + 0.09 * L], [Hh[0] + 0.07 * L, Hh[1] + 0.09 * L], [Hh[0] + 0.1 * L, Hh[1] - 0.03 * L], [Hh[0] + 0.09 * L, -12]];
  const shortSvg = (s: typeof sd) => p.aplat(lisser(s.contour.map(([x, y]) => [r1(x), r1(y)] as P)), 'piece piece--forte') + p.trait(`${courbe([s.contour[0], s.contour[1]])} ${courbe([s.contour[2], s.contour[3]])} M${r1(s.ourlet[0][0])} ${r1(s.ourlet[0][1])} L${r1(s.ourlet[1][0])} ${r1(s.ourlet[1][1])}`);
  const bassinSvg = p.aplat(`${lisser(bassin.map(([x, y]) => [r1(x), r1(y)] as P))} Z`, 'piece piece--forte') + p.trait(`${courbe(bassin.slice(0, 3))} ${courbe(bassin.slice(4))}`);
  // Sol ; en relevé, l'appui du pied d'appui en points SUR LE SOL (jamais sur la peau)
  const xs = droite.chaussure.map(([x]) => x);
  const ligneSol = p.trait(`M${r1(R.l * 0.08)} ${r1(sol)} H${r1(R.l * 0.92)}`, 'sol');
  let appuis = '';
  if (registre === 'releve') {
    const pasT = TRAME.pas * 0.8 * (L / 205) * 1.6;
    const [a0, a1] = [Math.min(...xs), Math.max(...xs)];
    const pts: PointTrame[] = [];
    for (let rang = 0; rang < 2; rang++) for (let x = a0 + (rang ? pasT / 2 : 0); x <= a1; x += pasT) {
      const u = (x - a0) / (a1 - a0 || 1);
      pts.push({ x: r1(x), y: r1(sol + pasT * 0.9 + rang * pasT * 0.866), v: Math.min(0.85, 0.3 + 0.45 * Math.exp(-(((u - 0.15) / 0.14) ** 2)) + 0.4 * Math.exp(-(((u - 0.72) / 0.12) ** 2))) });
    }
    appuis = `<g class="trame">${grouperTrame(pts, pasT).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}"></path>`).join('')}</g>`;
  }
  // Ordre : jambe libre (côté éloigné) et son short, bassin, jambe d'appui (côté proche) et son short
  return ligneSol + appuis + `<g>${dessinerJambe(gauche)}${shortSvg(sg)}</g>` + bassinSvg + `<g>${dessinerJambe(droite)}${shortSvg(sd)}</g>`;
}

// ———————————————————————————————————————————————————— Ongles, semelles, pédicurie : un seul sujet, en grand

/**
 * ONGLES : le gros orteil du pied droit en GROS PLAN (bibliotheque/hallux-gros-plan.ts : ongle sain, coupé droit, 2e et 3e orteils
 * au bord), sans fenêtre : l'avant-pied sort du cadre par le bas. Relevé : rendu monochrome au trait ; pédagogique : en couleur
 * (peau, ongle). Aucun ongle incarné ni rougeur en page d'accueil (rassurer).
 */
function sceneOngles(format: FormatScene, registre: RegistreScene): string {
  const R = REPERE[format];
  const { largeur: l, hauteur: h, echelle } = HALLUX_GROS_PLAN;
  // Hauteur affichée > hauteur du cadre : le bas de l'avant-pied sort du cadre (la forme continue jusqu'à 172 / 158)
  const H_ = format === 'paysage' ? R.h * 1.12 : R.h * 0.86;
  const k = H_ / h, W = l * k;
  const x = R.l / 2 - W * (format === 'paysage' ? 0.42 : 0.44), y = format === 'paysage' ? R.h * 0.04 : R.h * 0.08;
  const svg = svgForme('hallux-gros-plan', { registre: registre === 'pedagogique' ? 'pedagogique' : 'releve', echelleTrait: echelle / k * 1.35, id: `heros-ongles-${format}-${registre}` });
  return svg.replace('<svg ', `<svg x="${r1(x)}" y="${r1(y)}" width="${r1(W)}" height="${r1(H_ * (172 / 158))}" preserveAspectRatio="xMidYMin slice" stroke="none" `);
}

/**
 * SEMELLES (pédagogique) : la PAIRE de semelles orthopédiques vue de dessus (POD-AT-0004, géométrie validée SEMELLE, L/l ≈ 2,6) avec
 * leurs éléments : talonnette, soutien de voûte, barre rétrocapitale DERRIÈRE les têtes métatarsiennes. Pied gauche à gauche (miroir),
 * pointes légèrement ouvertes. Une seule idée : « la semelle ». Relevé : l'animation des courbes de relief ; trait : la semelle seule.
 */
function sceneSemelles(format: FormatScene, registre: RegistreScene): string {
  const R = REPERE[format];
  const p = pinceau(registre);
  const k = format === 'paysage' ? 0.78 : 1.08; // semelle ≈ 222 u de long dans son repère
  const ecart = format === 'paysage' ? 44 : 50;
  const cy = R.h / 2 + (format === 'paysage' ? 2 : 0);
  const une = (gauche: boolean) => {
    const m = pose(46, 111, R.l / 2 + (gauche ? -ecart : ecart), cy, k, gauche ? -5 : 5, gauche);
    const t = (d: string) => tr(d, m);
    return p.aplat(t(SEMELLE), 'peau') + (p.L ? '' : `<path class="piece" d="${t(SEMELLE_ELEMENTS.talonnette)}"></path><path class="piece piece--forte" d="${t(SEMELLE_ELEMENTS.voute)}"></path><path class="piece piece--forte" d="${t(SEMELLE_ELEMENTS.barre)}"></path>`) + p.trait(t(SEMELLE));
  };
  return une(true) + une(false);
}

/**
 * PÉDICURIE (retour de Paul du 2026-10-07 : « attention aux instruments en page d'accueil, il faut rassurer ») : les deux pieds vus de
 * dessus (« je regarde mes pieds »), soignés, ongles nets, pointes légèrement ouvertes, les jambes sortent du cadre en bas. Aucun
 * instrument, aucun médaillon, aucune couleur sur la peau. Géométrie validée CONTOUR_PIED (vue dorsale, POD-AT-0001).
 */
function scenePedicurie(format: FormatScene, registre: RegistreScene): string {
  const R = REPERE[format];
  const p = pinceau(registre);
  const e = format === 'paysage' ? 0.86 : 1.02, ecart = format === 'paysage' ? 46 : 52;
  const y = format === 'paysage' ? 104 : 150;
  const pied = (gauche: boolean) => {
    const m = pose(46, 111, R.l / 2 + (gauche ? -ecart : ecart), y, e, gauche ? -6 : 6, gauche);
    const t = (d: string) => tr(d, m);
    // Jambe prolongée sous le cadre (le contour dorsal s'arrête à la cheville, y ≈ 219 dans le repère du pied)
    const [x1, x2] = [19.92, 77.16], ev = (x2 - x1) * 0.06;
    const jambe = `M${x1},212 L${x1 - ev},${PROLONGEMENT} L${x2 + ev},${PROLONGEMENT} L${x2},212 Z`;
    const bords = `M${x1},214 L${x1 - ev},${PROLONGEMENT} M${x2},214 L${x2 + ev},${PROLONGEMENT}`;
    const peau = [...CONTOUR_PIED.dorsal.peaux, jambe].map((d) => (p.L ? p.aplat(t(d)) : `<g class="peau-douce">${p.aplat(t(d))}</g>`)).join('');
    return `<g>${peau}${p.trait(t(`${CONTOUR_PIED.dorsal.trait} ${bords}`), 'trait trait--moyen')}${p.trait(t(CONTOUR_PIED.dorsal.ongles), 'ongle-dessus ongle-dessus--fin')}${p.trait(t(CONTOUR_PIED.dorsal.plis), 'fin')}</g>`;
  };
  return pied(true) + pied(false);
}

const FONCTIONS_SCENES = () => ({ enfant: sceneEnfant, diabete: sceneDiabete, senior: sceneSenior, sport: sceneSport, ongles: sceneOngles, semelles: sceneSemelles, pedicurie: scenePedicurie });

/**
 * Scène paysage posée dans le repère 240 × 180 d'un dessin (dessins.ts) : bande 16:9 centrée verticalement, mêmes classes. Sert aux
 * dessins dont la scène du héros est plus lisible que l'ancien schéma (diabète : le monofilament tenu en main, retour de Paul du
 * 2026-10-07 sur le relevé « on comprend pas trop »).
 */
export function sceneDessin(nom: SceneHeros, registre: RegistreScene): string {
  return `<g transform="translate(0 22.5) scale(0.625)">${FONCTIONS_SCENES()[nom]('paysage', registre)}</g>`;
}

/**
 * Scène dessinée d'un héros (contenu d'un <svg> au format du héros : 640 × 360 en paysage, 360 × 480 en portrait), sans fond ni
 * texte : classes des dessins (dessins.css) dans un groupe .dessin du registre.
 */
export function sceneHeros(nom: SceneHeros, o: { format: FormatScene; registre: RegistreScene }): string {
  const R = REPERE[o.format];
  const corps = FONCTIONS_SCENES()[nom](o.format, o.registre);
  return `<g transform="scale(${+R.s.toFixed(4)})"><g class="dessin dessin--heros-${nom} dessin--${o.registre}" fill="none" stroke-linecap="round" stroke-linejoin="round">${corps}</g></g>`;
}
