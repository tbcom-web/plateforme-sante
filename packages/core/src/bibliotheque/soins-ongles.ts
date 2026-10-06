// Formes propres aux sites pour les fiches de soins de la migration 0020 (2026-10-05, statut brouillon : catalogue.ts) : orthonyxie,
// onychoplastie, mycose de l'ongle, ongles épais, cors et durillons, orthoplastie. Aucune géométrie « à l'œil » quand une géométrie
// validée existe : les variantes de l'ongle reprennent le gros plan de l'hallux (hallux-gros-plan.ts : même orteil, mêmes voisins,
// même lame, seule la lame change), l'orthonyxie en coupe reprend POD-AT-0010 (ongle-coupe), l'ongle épais reprend l'état
// « ongle-epais » de POD-AT-0003 (pied-profil-ongle-epais). L'orteil en griffe (refait le 2026-10-06, sans os) reprend la silhouette
// du profil validé (piedDeProfil) ; seul l'orteil 2 est construit, proportions réelles commentées, À VALIDER par Paul.
//
// Références anatomiques et cliniques : docs/referentiels/anatomie-pied.md (§ Ongle, § Peau et hyperkératoses) ; HAS 2020, « Le pied
// de la personne âgée » § 3.4.2 (orthonyxies : agrafe à fil, lamelle ; plaques unguéales hypertrophiques : fraisage en respectant la
// courbure ; onychoplastie après onycholyse) et § 3.5.2 (orthoplasties en silicone) ; Ameli, « Traitement des cors… » (2025).
// Couleurs : jetons --ez-* uniquement (rendu.ts : orthese, resine, mycose, mycose-fonce, corne, noyau, silicone, metal).
import { FORMES, type FormeEcranZen } from './formes';
import { hallux, courbe, r, ep, trait, LAME, LUNULE, HALLUX_GROS_PLAN } from './hallux-gros-plan';
import { piedDeProfil, echantillonner, CONTOUR_PIED, largeurA } from '../pied';

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

// ———————————————————————————————————————————————————— Orteil en griffe, 2e rayon de profil (refait le 2026-10-06, À VALIDER)

/**
 * Refait le 2026-10-06 après le retour de Paul (« la figure du durillon est complètement fausse anatomiquement ») : revue dans
 * docs/referentiels/revue-anatomique-2026-10-06-b.md. Plus AUCUN os dessiné (source des erreurs : orteil géant face à un métatarsien
 * minuscule, tête trop haute, phalanges mal proportionnées) : seulement la SILHOUETTE DE LA PEAU, construite sur le profil validé
 * (pied.ts : piedDeProfil, POD-AT-0003) — dos du pied et plante repris tels quels, l'orteil 2 accroché à l'avant-pied avec des
 * proportions réelles (1 cm ≈ 5 u du profil) :
 * - articulation métatarso-phalangienne (MTP) du 2e rayon à l'aplomb de celle de l'hallux (x 90), ≈ 3 cm au-dessus du sol (le
 *   coussinet plantaire, ≈ 1,5 cm, est sous la tête) ; orteil de Ø ≈ 1,8 cm à la base, ≈ 1,4 cm à la pulpe ;
 * - GRIFFE : P1 (≈ 2,5 cm) en hyperextension de 40° à la MTP ; P2 (≈ 1,7 cm) fléchie à l'IPP (≈ 105° par rapport à P1) ; P3 et la
 *   pulpe (≈ 1,4 cm) fléchies à l'IPD ; la pulpe ne repose plus sur le sol (≈ 1 cm au-dessus) ;
 * - COR : épaississement corné en lentille (≈ 0,8 cm, ≈ 1/4 de la largeur de l'orteil) sur la face DORSALE de l'IPP, là où l'empeigne
 *   frotte, noyau conique à pointe mousse tourné vers l'articulation ;
 * - DURILLON : plaque d'hyperkératose plantaire DIFFUSE (≈ 2 cm), sans noyau, sous la tête métatarsienne (zone d'appui) ;
 * - chaussure : semelle intérieure = sol ; empeigne à distance du pied sauf au sommet de l'IPP.
 * Les tracés exportés sont en unités du dessin de la forme (sol y 100, 1 cm ≈ 13 u, comme avant : mêmes noms, mêmes consommateurs —
 * dessins.ts, ligne.ts, pictos.ts).
 */
const SOL_G = 100;
const K_G = 2.6; // unités de la forme par unité du profil
/** Ne garde que des points espacés d'au moins d (allège le tracé : une courbe par point) */
const espacer = (pts: P[], d = 1.1): P[] => pts.reduce<P[]>((acc, p, i, t) => (i === 0 || i === t.length - 1 || Math.hypot(p[0] - acc[acc.length - 1][0], p[1] - acc[acc.length - 1][1]) >= d ? [...acc, p] : acc), []);
/** Profil (piedDeProfil) → unités de la forme : MTP (x 90) en X 112, sol (y 62) en Y 100 */
const verForme = ([x, y]: P): P => [Math.round((112 + (x - 90) * K_G) * 10) / 10, Math.round((SOL_G - (62 - y) * K_G) * 10) / 10];
const PROFIL = piedDeProfil();
const SOUS = echantillonner(PROFIL.contour, 10);
/** Plante (talon → avant-pied, y 62) et dos du pied (avant → jambe), du contour validé, bornés à l'avant-pied */
const PLANTE_P = SOUS[0].pts.filter(([x, y]) => y > 50 && x > 30 && x <= 84.6);
// Le 2e rayon est plus bas que le 1er : le dos du pied s'abaisse en avant (≈ 0,8 cm à la MTP) vers la base de l'orteil 2
const DOS_P = SOUS[1].pts.filter(([x, y]) => x >= 44 && x <= 85 && y < 46).map(([x, y]) => { const t = Math.max(0, Math.min(1, (x - 66) / 19)); return [x, y + 4 * t * t * (3 - 2 * t)] as P; });

// Axe de l'orteil : MTP → IPP → IPD → bout de P3 (unités du profil)
const M_G: P = [90, 49];
const dirG = (deg: number, l: number, o: P): P => [o[0] + l * Math.cos((deg * Math.PI) / 180), o[1] - l * Math.sin((deg * Math.PI) / 180)];
const IPP: P = dirG(40, 12.5, M_G);
const IPD: P = dirG(-62, 8.5, IPP);
const BOUT: P = dirG(-84, 5.6, IPD);
/** Axe échantillonné et rayon de l'orteil (bombé dorsal à l'IPP : saillie de l'articulation) */
function axeOrteil(): { c: P[]; n: P[]; rd: number[]; rp: number[]; s: number[] } {
  const seg: [P, P][] = [[M_G, IPP], [IPP, IPD], [IPD, BOUT]];
  const c: P[] = [];
  seg.forEach(([a, b], i) => { for (let k = i ? 1 : 0; k <= 8; k++) c.push([a[0] + ((b[0] - a[0]) * k) / 8, a[1] + ((b[1] - a[1]) * k) / 8]); });
  // Lissage léger de l'axe (les articulations restent marquées mais sans angle vif)
  const l = c.map((p, i) => (i === 0 || i === c.length - 1 ? p : ([(c[i - 1][0] + 2 * p[0] + c[i + 1][0]) / 4, (c[i - 1][1] + 2 * p[1] + c[i + 1][1]) / 4] as P)));
  const s: number[] = [0];
  for (let i = 1; i < l.length; i++) s.push(s[i - 1] + Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]));
  const total = s[s.length - 1], sIpp = 12.5;
  const n = l.map((_, i) => {
    const a = l[Math.max(0, i - 1)], b = l[Math.min(l.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
    return [dy / m, -dx / m] as P; // normale « dorsale » (gauche de la marche)
  });
  const base = (t: number) => 4.5 - 1.1 * (t / total);
  const rd = s.map((t) => base(t) + 0.7 * Math.exp(-(((t - sIpp) / 2.6) ** 2)));
  const rp = s.map((t) => base(t) * 0.92);
  return { c: l, n, rd, rp, s };
}
const AXE = axeOrteil();
const DORSAL_P: P[] = AXE.c.map((p, i) => [p[0] + AXE.n[i][0] * AXE.rd[i], p[1] + AXE.n[i][1] * AXE.rd[i]]);
/** Retire la petite boucle d'un décalage intérieur à un pli (côté plantaire de l'IPP fléchie) : on coupe au point de croisement */
function sansBoucle(pts: P[]): P[] {
  const x = (a: P, b: P, c: P, d: P): P | null => {
    const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den, u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
    return t > 0 && t < 1 && u > 0 && u < 1 ? [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] : null;
  };
  for (let i = 0; i < pts.length - 1; i++) for (let j = pts.length - 2; j > i + 1; j--) {
    const q = x(pts[i], pts[i + 1], pts[j], pts[j + 1]);
    if (q) return sansBoucle([...pts.slice(0, i + 1), q, ...pts.slice(j + 1)]);
  }
  return pts;
}
/** Arrondit un angle rentrant (pli de flexion) : deux passes de Chaikin, extrémités conservées */
const adoucir = (pts: P[], n = 2): P[] => { let q = pts; for (let k = 0; k < n; k++) q = [q[0], ...q.slice(0, -1).flatMap((a, i) => { const b = q[i + 1]; return [[0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]] as P[]; }), q[q.length - 1]]; return q; };
const PLANTAIRE_P: P[] = adoucir(sansBoucle(AXE.c.map((p, i) => [p[0] - AXE.n[i][0] * AXE.rp[i], p[1] - AXE.n[i][1] * AXE.rp[i]])), 3);
/** Bout de l'orteil (pulpe) : demi-cercle du côté dorsal au côté plantaire, en avant de l'axe */
const PULPE_P: P[] = (() => {
  const i = AXE.c.length - 1, c = AXE.c[i], n = AXE.n[i], r0 = AXE.rd[i], r1 = AXE.rp[i];
  const a0 = Math.atan2(n[1], n[0]);
  return Array.from({ length: 9 }, (_, k) => { const a = a0 + (k / 8) * Math.PI, rr = r0 + ((r1 - r0) * k) / 8; return [c[0] + rr * Math.cos(a), c[1] + rr * Math.sin(a)] as P; }).slice(1, -1);
})();
/** Indice de l'IPP sur l'axe (sommet de la saillie dorsale) */
const I_IPP = AXE.s.findIndex((t) => t >= 12.5);

/** Peau : dos du pied (depuis la gauche) → dos de l'orteil → pulpe → dessous de l'orteil → sillon → coussinet → plante (vers la gauche) */
export const PEAU_GRIFFE: P[] = espacer([
  ...DOS_P.slice().reverse(), [86.6, 45],
  ...DORSAL_P, ...PULPE_P, ...PLANTAIRE_P.slice().reverse(),
  // Sillon sous P1 puis coussinet plantaire sous la tête, posé sur le sol jusqu'à l'aplomb de la MTP
  [93.4, 56.4], [92.4, 60], [90.4, 61.7], [87, 62],
  ...PLANTE_P.slice().reverse(),
]).map(verForme);

// Cor : lentille sur la face dorsale de l'IPP (≈ 0,8 cm), noyau conique, pointe mousse vers l'articulation
const lentille = (centre: number, demi: number, epais: number, dehors = 1): P[] => {
  const pts: P[] = [];
  for (let k = -demi; k <= demi; k++) { const i = centre + k, w = epais * (1 - (k / (demi + 0.6)) ** 2); pts.push([DORSAL_P[i][0] + AXE.n[i][0] * w * dehors, DORSAL_P[i][1] + AXE.n[i][1] * w * dehors]); }
  for (let k = demi; k >= -demi; k--) { const i = centre + k, w = 0.45 * epais * (1 - (k / (demi + 0.6)) ** 2); pts.push([DORSAL_P[i][0] - AXE.n[i][0] * w, DORSAL_P[i][1] - AXE.n[i][1] * w]); }
  return pts;
};
export const COR: P[] = lentille(I_IPP, 2, 1.0).map(verForme);
export const NOYAU: P[] = (() => {
  const i = I_IPP, p = DORSAL_P[i], n = AXE.n[i], t: P = [-n[1], n[0]];
  const q = (u: number, v: number): P => [p[0] + n[0] * v + t[0] * u, p[1] + n[1] * v + t[1] * u];
  return [q(-0.55, 0.7), q(0.55, 0.7), q(0.28, -0.5), q(0, -0.75), q(-0.28, -0.5)].map(verForme);
})();
// Durillon : plaque diffuse dans la peau de la plante, sous la tête métatarsienne (x 83,6 à 93,2), plus épaisse au centre, sans noyau
export const DURILLON: P[] = [
  ...Array.from({ length: 9 }, (_, k) => [83.6 + k * 1.2, 62] as P),
  ...Array.from({ length: 9 }, (_, k) => { const x = 93.2 - k * 1.2, u = (x - 88.4) / 4.8; return [x, 62 - 1.25 * (1 - u * u)] as P; }),
].map(verForme);
// Chaussure : empeigne à ≈ 0,6 cm du dos du pied, qui ne touche le pied qu'au sommet du cor ; bout rond de la chaussure ; sol
const SOMMET_COR: P = [DORSAL_P[I_IPP][0] + AXE.n[I_IPP][0] * 1.05, DORSAL_P[I_IPP][1] + AXE.n[I_IPP][1] * 1.05];
export const EMPEIGNE: P[] = ([
  ...DOS_P.slice().reverse().filter((_, i) => i % 3 === 0).map(([x, y]) => [x, y - 3] as P),
  [SOMMET_COR[0] - 5, SOMMET_COR[1] - 0.6], SOMMET_COR, [SOMMET_COR[0] + 6, SOMMET_COR[1] + 0.8], [116, 45.5], [121.5, 51.5], [123, 58], [122.4, 62],
] as P[]).map(verForme);
// Orthoplastie : crête en silicone sous l'orteil (comble l'espace entre le dessous de l'orteil et la semelle) et anneau dorsal qui
// coiffe l'IPP (protection du cor) : une seule pièce moulée, reliée entre l'orteil 2 et ses voisins (hors de la vue)
export const CRETE_ORTHO: P[] = espacer([
  ...PLANTAIRE_P.filter(([x]) => x >= 93.6).map(([x, y]) => [x, y + 0.3] as P), PULPE_P[PULPE_P.length - 1],
  [BOUT[0] + 2.6, 61.6], [94.2, 61.6], [93.2, 58.4],
], 0.9).map(verForme);
export const ANNEAU_ORTHO: P[] = lentille(I_IPP, 4, 1.5).map(verForme);
/** Repères désignés par les dessins (unités du dessin de la forme) */
export const GRIFFE = {
  largeur: 200, hauteur: 110, sol: SOL_G,
  cor: verForme(SOMMET_COR), noyau: NOYAU[3], durillon: verForme([88.4, 61.2]), tete: verForme(M_G), chaussure: verForme(SOMMET_COR),
  orthese: verForme([97, 58.6]), anneau: ANNEAU_ORTHO[4],
};
/** Ongle sur le dos de P3 (près du bout, côté dorsal) */
const ONGLE_GRIFFE: P[] = DORSAL_P.slice(-6, -1).map(([x, y], i) => [x + AXE.n[AXE.c.length - 6 + i][0] * 0.1, y] as P).map(verForme);
/** Hallux en arrière-plan (plus long : formule égyptienne), repris du profil validé */
const HALLUX_P = echantillonner(PROFIL.hallux, 8)[0].pts.map(verForme);

function orteilGriffe(etat: 'cor' | 'orthoplastie'): FormeEcranZen {
  const peau = courbe(PEAU_GRIFFE);
  const parties = [
    // Hallux derrière (même peau, contour fin et léger), puis la peau du 2e rayon (aplat fermé par le cadre à gauche)
    `<path d="${courbe(HALLUX_P, true)}" style="fill:var(--ez-peau-2);fill-opacity:0.45"/>`, trait(courbe(HALLUX_P, true), 'fin', 0.3),
    `<path d="${peau} Z" style="fill:var(--ez-peau-2)"/>`,
    // Ongle sur le dos de P3
    `<path d="${courbe(ONGLE_GRIFFE)}" style="stroke:var(--ez-ongle);stroke-width:var(--ez-ep-epais)"/>`, trait(courbe(ONGLE_GRIFFE), 'fin', 0.7),
  ];
  if (etat === 'cor') {
    parties.push(
      `<path d="${courbe(DURILLON, true)}" style="fill:var(--ez-corne)"/>`, trait(courbe(DURILLON.slice(9)), 'fin', 0.55),
      `<path d="${courbe(COR, true)}" style="fill:var(--ez-corne)"/>`, `<path d="${courbe(NOYAU, true)}" style="fill:var(--ez-noyau)"/>`,
      trait(courbe(COR.slice(0, 5)), 'fin', 0.7),
    );
  } else {
    parties.push(
      `<path d="${courbe(CRETE_ORTHO, true)}" style="fill:var(--ez-silicone);fill-opacity:0.92"/>`, trait(courbe(CRETE_ORTHO, true), 'fin', 0.8),
      `<path d="${courbe(ANNEAU_ORTHO, true)}" style="fill:var(--ez-silicone);fill-opacity:0.92"/>`, trait(courbe(ANNEAU_ORTHO, true), 'fin', 0.8),
    );
  }
  parties.push(
    trait(peau, 'normal'),
    // Semelle intérieure (sol) et empeigne de la chaussure, à distance du pied sauf au sommet du cor
    `<path d="${ligne([[-40, SOL_G], [200, SOL_G]])}" style="${ep('normal', 0.6)}"/>`,
    `<path d="${courbe(EMPEIGNE)}" style="${ep('epais', 0.45)}"/>`,
  );
  return { viewBox: [56 * E, 18 * E, 144 * E, 88 * E], ids: false, corps: `<g>${parties.join('')}</g>` };
}

// ———————————————————————————————————————————————————— Cors, durillons, orthoplastie : schéma classique (v3, 2026-10-06)
//
// Demande de Paul (après deux coupes de l'orteil en griffe jugées illisibles) : « un schéma classique, pas trop anatomique, une
// représentation simple avec un point sur le pied ». Plus de profil ni de coupe : la plante et le dessus de l'avant-pied du pied
// réel validé (CONTOUR_PIED, POD-AT-0001/0002), repère 92 × 222 du pied droit vu de dessus (hallux à gauche). Les dessins
// (dessins.ts), le trait continu (ligne.ts) et les pictos posent ces repères avec la même transformation que le pied. Les formes
// « orteil-griffe-* » ci-dessus restent au catalogue de la bibliothèque, elles ne sont plus utilisées par les dessins des sites.

/** Arrondi au centième (repère du pied ; `r` ci-dessus convertit vers les unités des formes) */
const r2 = (v: number) => Math.round(v * 100) / 100;
/**
 * Durillon : plaque d'hyperkératose DIFFUSE, sans noyau, sous les têtes des 2e et 3e métatarsiens (zone d'appui centrale de
 * l'avant-pied), là où l'avant-pied s'élargit, en arrière du pli des orteils (jamais collée aux orteils). Ovale irrégulier allongé
 * selon la ligne des têtes (≈ 3,2 × 1,9 cm ; 1 cm ≈ 8,5 u), centre ≈ 0,5 cm en arrière des têtes, bords doux. Repère du pied (vue de dessus ; la plante en est le miroir).
 */
export const PLAQUE_DURILLON: P[] = (() => {
  const [t2, t3] = [CONTOUR_PIED.mtp[1], CONTOUR_PIED.mtp[2]].map(([x, y]) => [x, y + 6] as P);
  const cx = (t2[0] + t3[0]) / 2 - 0.6, cy = (t2[1] + t3[1]) / 2 + 4.6, ang = Math.atan2(t3[1] - t2[1], t3[0] - t2[0]);
  return Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * 2 * Math.PI;
    // Bord irrégulier mais doux (harmoniques faibles) : plus large côté 3e tête, un peu aplati côté orteils
    const k = 1 + 0.07 * Math.cos(2 * a + 0.7) + 0.05 * Math.sin(3 * a + 0.3) + 0.04 * Math.cos(a);
    const u = 13.4 * Math.cos(a) * k, v = 7.9 * Math.sin(a) * k;
    return [r2(cx + u * Math.cos(ang) - v * Math.sin(ang)), r2(cy + u * Math.sin(ang) + v * Math.cos(ang))] as P;
  });
})();
/**
 * Cor : petite lésion ronde sur la face dorsale de l'IPP du 2e orteil, là où la chaussure frotte. 2e orteil ≈ 5,4 cm (bout y 16 →
 * MTP y 62,4) : P3 + P2 ≈ 3 cm depuis le bout, l'IPP tombe juste en avant de la commissure (y ≈ 38–41) ; diamètre ≈ 0,3 × la
 * largeur de l'orteil (piège « cor en boule » : jamais plus gros). Centre sur l'axe de l'orteil (bout → MTP).
 */
export const COR_DESSUS = (() => {
  const [bx, by] = CONTOUR_PIED.bouts[1], [mx, my] = CONTOUR_PIED.mtp[1], y = 38.4;
  return { x: r2(bx + ((mx - bx) * (y - by)) / (my - by)), y, r: 2.3 };
})();
/**
 * Orthoplastie vue de dessus : manchon (anneau) en silicone moulé qui coiffe le 2e orteil sur l'IPP (protection du cor), un peu plus
 * large que l'orteil (épaisseur ≈ 1,5 mm de chaque côté), ≈ 1,1 cm de long ; bords proximal et distal légèrement bombés vers le
 * bout (la pièce entoure un orteil cylindrique). L'orteil n'est ni redressé ni déplacé (Ameli : l'orthoplastie protège et répartit
 * les pressions, elle ne corrige pas la déformation).
 */
export const MANCHON_ORTHO: P[] = (() => {
  const poly = CONTOUR_PIED.polygonesOrteils[1], y0 = 31.6, y1 = 40.8, e = 1.3, n = 6;
  const bord = (y: number) => { const l = largeurA(poly, y) ?? [33.4, 48.6]; return [l[0] - e, l[1] + e] as const; };
  const gauche = Array.from({ length: n + 1 }, (_, k) => { const y = y0 + ((y1 - y0) * k) / n; return [bord(y)[0], y] as P; });
  const droite = Array.from({ length: n + 1 }, (_, k) => { const y = y1 - ((y1 - y0) * k) / n; return [bord(y)[1], y] as P; });
  // Bords bombés : bas (proximal) de gauche à droite, haut (distal) de droite à gauche
  const arc = (y: number, xa: number, xb: number, f: number) => Array.from({ length: 5 }, (_, k) => { const t = (k + 1) / 6; return [xa + (xb - xa) * t, y - f * Math.sin(Math.PI * t)] as P; });
  const [gb, db] = [gauche[n][0], droite[0][0]], [gh, dh] = [gauche[0][0], droite[n][0]];
  return [...gauche, ...arc(y1, gb, db, 1.4), ...droite, ...arc(y0, dh, gh, 1.4)].map(([x, y]) => [r2(x), r2(y)] as P);
})();

export const FORMES_SOINS_ONGLES: Record<string, FormeEcranZen> = {
  'hallux-gros-plan-orthonyxie': hallux(false, { dessus: agrafe() }),
  'hallux-gros-plan-onychoplastie': hallux(false, { ongle: onychoplastie(), defs: defsOnychoplastie(), ids: true }),
  'hallux-gros-plan-mycose': hallux(false, { ongle: mycose(), defs: defsMycose(), ids: true }),
  'ongle-coupe-orthonyxie': coupeOrthonyxie(),
  'pied-profil-ongle-epais-meulage': ongleEpaisMeulage(),
  'orteil-griffe-cor': orteilGriffe('cor'),
  'orteil-griffe-orthoplastie': orteilGriffe('orthoplastie'),
};
