// Géométrie partagée du pied, de la semelle et du profil : SOURCE UNIQUE des dessins et animations des sites (apps/sites, via
// components/animations/pied.ts), de l'aperçu de l'admin et des marques du logo (logos.ts).
//
// Depuis la refonte du 2026-10-04 (revue anatomique de l'illustrateur médical), les formes ne sont plus dessinées « à l'œil » :
// elles reprennent les atomes ÉcranZen validés par Paul (bibliotheque/geometrie.ts, généré par scripts/extraire-ecranzen.mjs) —
// pied POD-AT-0001/0002, empreinte POD-SC-0007, semelle POD-AT-0004/0005, profil médial POD-AT-0003 et squelette POD-AT-0008.
// Une forme fausse se corrige à la source (ici ou dans ÉcranZen), jamais dans un dessin.
//
// RÈGLES ANATOMIQUES (revue du 2026-10-04 §4, reprises dans docs/charte-graphique.md ; contrôlées par npm run controle:charte) :
//  1. Proportions adulte : avant-pied 0,35–0,40 × L ; talon 0,60–0,65 × avant-pied ; formule égyptienne, M2 le plus long, parabole
//     métatarsienne. Enfant : avant-pied ≈ 0,42 × L, voûte comblée jusqu'à 4–6 ans.
//  2. EMPREINTE (zone de contact, relevés seulement) et CONTOUR_PIED (pied réel) sont deux géométries distinctes. Vue de dessus et
//     empreinte : l'hallux du pied droit est à gauche ; vue de dessous : à droite.
//  3. Profil de référence : pied gauche vu côté interne, orteils à droite ; malléole médiale plus haute et plus en avant que la
//     latérale ; fibula qui chevauche l'arrière du tibia ; colonne médiale au premier plan ; arche qui ne touche pas le sol (sauf pied
//     plat) ; coussinet talonnier 15–20 mm ; têtes métatarsiennes ≈ 1,5 cm du sol ; hallux à 2 phalanges, autres orteils à 3.
//  4. Aponévrose : du processus médial de la tubérosité calcanéenne à la base de P1, enroulée sous la tête de M1, jamais au ras de la peau.
//  5. Semelle : L/l ≈ 2,6 ; élément rétrocapital DERRIÈRE les têtes ; jamais pression et relief mélangés.
//  6. Marche et course : bras opposés aux jambes ; pied d'appui fixé au sol ; centre de gravité au-dessus de l'appui ; centre de
//     pression talon → bord externe → têtes métatarsiennes → hallux ; aucune pression en phase oscillante.
//  7. Canne : côté opposé au membre douloureux, poignée au grand trochanter, embout ≈ 15 cm en dehors et un peu en avant du 5e orteil.
//  8. Monofilament 10 g : 3 sites (pulpe de l'hallux, têtes de M1 et M5), filament perpendiculaire et plié en C. Diapason : sur
//     l'articulation interphalangienne dorsale de l'hallux.
//  9. Ongle : toujours l'hallux avec ses voisins ; repli proximal, lunule, replis et sillons latéraux ; ongle incarné : spicule relié à
//     la lame, repli enflammé localisé.
// 10. Lecture profane : pas de pointillés ni de couleur sur la peau ; pas d'os clairs sur fond sombre ; pas de jambe coupée nette ni de
//     pied en l'air ; douleur = point creux.
// 11. Échelles : pied d'un enfant de 1 an ≈ 0,5 × pied adulte ; pas de l'enfant ≈ 1,8–2 longueurs de pied, de l'adulte ≈ 2,5–3.
import { EZ_PIED, EZ_EMPREINTE, EZ_SEMELLE, EZ_PROFIL } from './bibliotheque/geometrie';

export type P = [number, number];

/** Courbe fermée passant par les points (Catmull-Rom convertie en courbes de Bézier). */
export function lisser(points: P[]): string {
  const n = points.length;
  const pt = (i: number) => points[(i + n) % n];
  let d = `M${pt(0)[0]} ${pt(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return `${d} Z`;
}

/** Le point est-il dans le polygone ? */
export function dansPolygone(poly: P[], x: number, y: number): boolean {
  let dedans = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

/** Bords gauche et droit du polygone sur une horizontale (premier et dernier croisement) */
export function largeurA(poly: P[], y: number): [number, number] | null {
  const xs: number[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
  }
  return xs.length < 2 ? null : [Math.min(...xs), Math.max(...xs)];
}

// ———————————————————————————————————————————————————— Outils de tracé (chemins M, L, C, Z)

const r2 = (v: number) => +v.toFixed(2);
/** Applique une transformation de point à toutes les coordonnées d'un chemin (sommets et poignées) */
export const deformerChemin = (d: string, f: (x: number, y: number) => P) =>
  d.replace(/(-?\d*\.?\d+(?:e[-+]?\d+)?)[ ,](-?\d*\.?\d+(?:e[-+]?\d+)?)/g, (_, x, y) => f(+x, +y).map(r2).join(','));

/** Échantillonne un chemin (M, L, C, Z) : sous-chemins en polylignes, `n` points par courbe ; `ferme` si le sous-chemin finit par Z */
export function echantillonner(d: string, n = 6): { pts: P[]; ferme: boolean }[] {
  const t = d.match(/[MLCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const sous: { pts: P[]; ferme: boolean }[] = [];
  let i = 0, cmd = '', cur: P = [0, 0];
  const num = () => +t[i++];
  while (i < t.length) {
    if (/[MLCZ]/i.test(t[i])) cmd = t[i++].toUpperCase();
    if (cmd === 'Z') { if (sous.length) sous[sous.length - 1].ferme = true; cmd = ''; continue; }
    if (cmd === 'M') { cur = [num(), num()]; sous.push({ pts: [cur], ferme: false }); cmd = 'L'; continue; }
    if (cmd === 'L') { cur = [num(), num()]; sous[sous.length - 1].pts.push(cur); continue; }
    if (cmd === 'C') {
      const a = cur, b: P = [num(), num()], c: P = [num(), num()], e: P = [num(), num()];
      for (let k = 1; k <= n; k++) {
        const s = k / n, u = 1 - s;
        sous[sous.length - 1].pts.push([0, 1].map((j) => u * u * u * a[j] + 3 * u * u * s * b[j] + 3 * u * s * s * c[j] + s * s * s * e[j]) as P);
      }
      cur = e;
      continue;
    }
    i++;
  }
  return sous;
}
const polyligne = (pts: P[], ferme = false) => (pts.length ? `M${pts.map(([x, y]) => `${r2(x)},${r2(y)}`).join(' L')}${ferme ? ' Z' : ''}` : '');

/**
 * Coupe un chemin à l'horizontale `y` (on garde ce qui est en dessous, y plus grand) : `plein` = formes fermées coupées (aplat),
 * `trait` = contour sans le bord de coupe (une jambe ou un os coupé ne montre jamais de trait horizontal : la coupe sort du cadre).
 */
export function couperSous(d: string, y: number, n = 6): { plein: string; trait: string } {
  const plein: string[] = [], trait: string[] = [];
  const coupe = (a: P, b: P): P => [a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), y];
  for (const s of echantillonner(d, n)) {
    const pts = s.ferme ? [...s.pts, s.pts[0]] : s.pts;
    // Aplat (Sutherland–Hodgman, demi-plan y ≥ coupe)
    if (s.ferme) {
      const out: P[] = [];
      for (let k = 0; k + 1 < pts.length; k++) {
        const a = pts[k], b = pts[k + 1], ia = a[1] >= y, ib = b[1] >= y;
        if (ia) out.push(a);
        if (ia !== ib) out.push(coupe(a, b));
      }
      if (out.length > 2) plein.push(polyligne(out, true));
    }
    // Trait : morceaux de polyligne sous la coupe
    let morceau: P[] = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], dedans = a[1] >= y;
      if (k && (pts[k - 1][1] >= y) !== dedans) morceau.push(coupe(pts[k - 1], a));
      if (dedans) morceau.push(a);
      else if (morceau.length) { trait.push(polyligne(morceau)); morceau = []; }
    }
    if (morceau.length > 1) trait.push(polyligne(morceau));
  }
  return { plein: plein.join(' '), trait: trait.join(' ') };
}

// ———————————————————————————————————————————————————— Pied réel (POD-AT-0001 / 0002), repère 92 × 222

/**
 * CONTOUR_PIED : le pied réel, vues de dessus et de dessous (pied droit vu de dessus, hallux à GAUCHE, talon en bas ; la vue de
 * dessous du pied droit est son miroir, hallux à droite). Tracés exacts de l'atome ÉcranZen : chaque vue en deux couches, l'aplat
 * (`peau`, à remplir) et le contour (`trait`, morceaux exacts du bord : pas de trait à la base des orteils). Repères pour placer un
 * détail (MTP, pulpes, têtes métatarsiennes).
 */
export const CONTOUR_PIED = {
  plantaire: {
    /** Aplats : un tracé par forme (plante, chaque orteil) — réunis dans un seul chemin, leurs sens opposés y feraient des trous */
    peaux: [EZ_PIED.plante, ...EZ_PIED.orteils.map((o) => o.peau)],
    trait: [EZ_PIED.contourPlante, ...EZ_PIED.orteils.map((o) => o.contour)].join(' '),
    plis: [EZ_PIED.pliOrteils, EZ_PIED.coussinet, ...EZ_PIED.orteils.map((o) => o.pliPlantaire)].join(' '),
    palmures: EZ_PIED.espaces.join(' '),
  },
  dorsal: {
    peaux: [EZ_PIED.dos, EZ_PIED.jambe, ...EZ_PIED.orteils.map((o) => o.peau)],
    trait: [EZ_PIED.contourDos, ...EZ_PIED.orteils.map((o) => o.contour)].join(' '),
    ongles: EZ_PIED.orteils.map((o) => o.ongle).join(' '),
    lunule: EZ_PIED.orteils[0].lunule ?? '',
    plis: [EZ_PIED.cheville.pli, ...EZ_PIED.orteils.map((o) => o.pliDorsal)].join(' '),
    malleoles: [EZ_PIED.cheville['malleole-mediale'], EZ_PIED.cheville['malleole-laterale']].join(' '),
    palmures: EZ_PIED.espaces.join(' '),
  },
  /** Articulations métatarso-phalangiennes (têtes métatarsiennes), du 1er au 5e rayon */
  mtp: EZ_PIED.orteils.map((o) => o.pivot),
  /** Bout des orteils (haut de la pulpe), du 1er au 5e */
  bouts: EZ_PIED.orteils.map((o) => o.bout),
  /** Zones d'appui de l'atome [cx, cy, largeur, hauteur] : talon, tête de M1, tête de M5, bord latéral */
  appuis: EZ_PIED.appuis,
  /** Polygones (tests, mesures) : plante sans les orteils, orteils, dos du pied */
  polygone: EZ_PIED.polygonePlante as P[],
  polygonesOrteils: EZ_PIED.orteils.map((o) => o.polygone as P[]),
};

/** Points de la plante sans les orteils (polygone ; bord médial, talon, bord latéral, puis bord distal par les commissures) */
export const PLANTE: P[] = CONTOUR_PIED.polygone;
/** Contour de la plante sans les orteils (tracé exact, fermé par le bord distal) */
export const CONTOUR = EZ_PIED.plante;

/**
 * Orteils en ellipses [cx, cy, rx, ry, rotation°], du gros orteil au petit : approximation de chaque orteil de l'atome (du bout à la
 * hauteur des commissures, dans l'axe de l'orteil) pour les formes simplifiées (marques du logo, pied d'enfant).
 */
const COMMISSURES_Y = [[EZ_PIED.polygonePlante[0][1], 41.88], [41.88, 41.34], [41.34, 45.12], [45.12, 51.06], [51.06, 59.16]];
export const ORTEILS: [number, number, number, number, number][] = EZ_PIED.orteils.map((o, i) => {
  const yc = (COMMISSURES_Y[i][0] + COMMISSURES_Y[i][1]) / 2;
  const haut = o.bout[1] - (i ? 0.8 : 2.7);
  const ry = (yc - haut) / 2;
  const angle = (Math.atan2(o.bout[0] - o.base[0], o.base[1] - o.bout[1]) * 180) / Math.PI;
  return [r2(o.bout[0] + (o.base[0] - o.bout[0]) * 0.15), r2(haut + ry), r2(o.largeurBout / 2), r2(ry), r2(angle)];
});

// ———————————————————————————————————————————————————— Empreinte (POD-SC-0007) : zone de contact, pour les relevés seulement

/**
 * EMPREINTE : la trace d'appui réelle (talon ovale, bande externe continue, bande sous les cinq têtes, voûte sans appui) et les pulpes
 * des orteils, dans le repère du pied (trace d'un pied droit vue de dessus : hallux à gauche). Réservée aux relevés (podoscope,
 * baropodométrie, trame de pression) : jamais posée sur la peau.
 */
/**
 * Empreinte corrigée (revue du 2026-10-04, correctif 2) : la trace de POD-SC-0007 mesure 0,33 × L à l'avant-pied et 0,76 × avant-pied
 * au talon ; elle est ramenée aux proportions de référence (avant-pied ≈ 0,37 × L, talon ≈ 0,62 × avant-pied) par un simple
 * étirement horizontal autour de l'axe du pied (avant-pied élargi, talon resserré), sans redessin. Contrôlé par controle:charte.
 */
const ETIREMENT_EMPREINTE = { avant: 1.128, talon: 0.924, axe: 48 };
const etirerEmpreinte = (x: number, y: number): P => {
  const { avant, talon, axe } = ETIREMENT_EMPREINTE;
  const t = Math.max(0, Math.min(1, (y - 105) / 55));
  const k = avant + (talon - avant) * (t * t * (3 - 2 * t));
  return [axe + (x - axe) * k, y];
};
export const EMPREINTE = {
  contour: deformerChemin(EZ_EMPREINTE.contour, etirerEmpreinte),
  polygone: (EZ_EMPREINTE.polygone as P[]).map(([x, y]) => etirerEmpreinte(x, y).map(r2) as P),
  /** Pulpes des orteils [cx, cy, rx, ry] */
  pulpes: EZ_EMPREINTE.pulpes,
  /** Tracé complet (trace + pulpes en ellipses) */
  trace: `${deformerChemin(EZ_EMPREINTE.contour, etirerEmpreinte)} ${EZ_EMPREINTE.pulpes.map(([cx, cy, rx, ry]) => `M${r2(cx - rx)},${cy} A${rx},${ry} 0 1 0 ${r2(cx + rx)},${cy} A${rx},${ry} 0 1 0 ${r2(cx - rx)},${cy} Z`).join(' ')}`,
};
/** Le point est-il dans une pulpe d'orteil de l'empreinte ? */
export const dansPulpe = (x: number, y: number) => EMPREINTE.pulpes.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
/** Le point est-il dans la zone de contact (trace d'appui ou pulpe) ? */
export const dansEmpreinte = (x: number, y: number) => dansPolygone(EMPREINTE.polygone, x, y) || dansPulpe(x, y);

// ———————————————————————————————————————————————————— Pied d'enfant (même points que PLANTE, indice à indice)

/**
 * Pied de tout-petit (vers 1 an) : mêmes points que PLANTE, voûte comblée par le coussinet graisseux (bord médial presque droit,
 * physiologique à cet âge) et avant-pied élargi (≈ 0,42 × L) ; orteils courts et ronds.
 */
const [YM1, YTALON] = [82.9, 192];
const xMedial = (y: number) => 6.9 + ((y - YM1) / (YTALON - YM1)) * (21.5 - 6.9);
export const PLANTE_ENFANT: P[] = PLANTE.map(([x, y]) => {
  let nx = x;
  if (x < 40 && y > YM1 && y < YTALON) nx = Math.min(x, xMedial(y)); // voûte comblée
  if (y < 120) nx = 49 + (nx - 49) * (1 + 0.07 * Math.min(1, (120 - y) / 40)); // avant-pied plus large
  return [r2(nx), y];
});
export const ORTEILS_ENFANT: [number, number, number, number, number][] = ORTEILS.map(([cx, cy, rx, ry, r], i) => {
  const k = i ? 0.62 : 0.55;
  return [r2(49 + (cx - 49) * 1.08), r2(cy + ry * (1 - k)), r2(rx * 1.12), r2(ry * k), r2(r * 0.6)];
});

/** Pied à un âge donné : interpolation entre le pied du tout-petit (t = 0) et le pied adulte (t = 1) */
export function piedCroissance(t: number): { plante: P[]; orteils: [number, number, number, number, number][] } {
  const m = (a: number, b: number) => +(a + (b - a) * t).toFixed(1);
  return {
    plante: PLANTE.map(([x, y], i) => [m(PLANTE_ENFANT[i][0], x), m(PLANTE_ENFANT[i][1], y)] as P),
    orteils: ORTEILS.map((o, i) => o.map((v, k) => m(ORTEILS_ENFANT[i][k], v)) as [number, number, number, number, number]),
  };
}

/** Trajet du centre de pression pendant le pas : talon → bord externe → têtes métatarsiennes → hallux (repère du pied) */
export const TRAJET = 'M48 207 C55 184 69 160 72 134 C75 108 66 88 47 75 C35 66 25 42 22 16';
/** Trajet du centre de pression échantillonné (polyligne), pour le modèle du pas (pas.ts) */
export const TRAJET_POINTS = echantillonner(TRAJET, 8)[0].pts.map(([x, y]) => ({ x: r2(x), y: r2(y) }));

// ———————————————————————————————————————————————————— Semelle orthopédique (POD-AT-0004), repère du pied

/**
 * Semelle orthopédique vue de dessus (L/l ≈ 2,63), sur le contour du pied de même vue : contour, talonnette, soutien de voûte,
 * barre rétrocapitale (en arrière des têtes métatarsiennes), coque vue de dessous (limite rétrocapitale).
 */
export const SEMELLE_POINTS: P[] = EZ_SEMELLE.points as P[];
export const SEMELLE = EZ_SEMELLE.contour;
export const SEMELLE_ELEMENTS = { talonnette: EZ_SEMELLE.talonnette, voute: EZ_SEMELLE.voute, barre: EZ_SEMELLE.barre, coque: EZ_SEMELLE.coque, limiteCoque: EZ_SEMELLE.limiteCoque as P[] };

// ———————————————————————————————————————————————————— Squelette vu de dessous (marque « anatomie plantaire »)

const surAxe = (a: P, b: P, t: number): P => [r2(a[0] + (b[0] - a[0]) * t), r2(a[1] + (b[1] - a[1]) * t)];
/**
 * Squelette stylisé du pied (même repère, même orientation que CONTOUR_PIED) : os du tarse en ellipses [cx, cy, rx, ry, rotation°],
 * métatarsiens de leur base à leur tête (MTP de l'atome) en segments [x1, y1, x2, y2], phalanges de chaque orteil (2 pour l'hallux,
 * 3 pour les autres), de la MTP au bout de l'orteil.
 */
export const OS = {
  calcaneum: [48, 191, 15, 21, 0] as [number, number, number, number, number],
  tarse: [
    [44, 160, 10.5, 9, -8], // talus
    [30, 142, 6.5, 5, -15], // naviculaire
    [68, 150, 7, 10, 4], // cuboïde
    [26, 127, 4.5, 5.5, -6], // cunéiformes
    [37, 125, 4, 5.5, 0],
    [48, 127, 4, 5.5, 6],
  ] as [number, number, number, number, number][],
  metatarsiens: ([[25, 119], [38, 118], [49, 120], [60, 125], [75, 135]] as P[]).map((b, i) => [...b, ...CONTOUR_PIED.mtp[i]]) as [number, number, number, number][],
  phalanges: EZ_PIED.orteils.map((o, i) => {
    const a = o.pivot as P, bout: P = [o.bout[0], o.bout[1] + (i ? 3 : 4)];
    const coupes = i ? [0, 0.48, 0.74, 1] : [0, 0.56, 1];
    return coupes.slice(1).map((t, k) => [...surAxe(a, bout, coupes[k] + 0.03), ...surAxe(a, bout, t - 0.03)]);
  }) as [number, number, number, number][][],
};

// ———————————————————————————————————————————————————— Profil médial (POD-AT-0003 + squelette POD-AT-0008)

/**
 * Pied GAUCHE vu de son côté interne, orteils à droite (convention ÉcranZen), sol en y = 62, talon à x ≈ −2, pulpe de l'hallux à
 * x ≈ 123 ; la jambe monte hors de tout cadre. Une seule géométrie pour tous les dessins de profil (talon, taping, semelle, voûtes,
 * senior) et pour les marques « anatomie ».
 */
export const SOL_PROFIL = 62;
export type Voute = 'normale' | 'creuse' | 'plate';
const OS_PROFIL = EZ_PROFIL.os;

/** Déformation de l'arche (voûte normale, creuse, plate) : bosse entre l'appui du talon et la tête de M1 */
const ARCHE = { debut: 16, fin: 80 };
const bosse = (x: number) => (x <= ARCHE.debut || x >= ARCHE.fin ? 0 : Math.sin((Math.PI * (x - ARCHE.debut)) / (ARCHE.fin - ARCHE.debut)) ** 2);
const lisseT = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

export function piedDeProfil(voute: Voute = 'normale') {
  // k < 0 : arche relevée (pied creux : pente du calcanéum plus forte, métatarsiens plongeants) ; k > 0 : arche affaissée (pied plat)
  const k = { normale: 0, creuse: -9, plate: 4.5 }[voute];
  const bTalus = bosse(36);
  const deplacement = (x: number, y: number) => k * (bTalus + (bosse(x) - bTalus) * lisseT((y - 18) / 18));
  const osPt = (x: number, y: number): P => [x, Math.min(SOL_PROFIL - 1.2, y + deplacement(x, y))];
  const peauPt = (x: number, y: number): P => {
    if (y > 50 && x > ARCHE.debut && x < ARCHE.fin) {
      // plante sous l'arche : au sol pour le pied plat, relevée pour le pied creux
      if (voute === 'plate') return [x, SOL_PROFIL - (SOL_PROFIL - y) * (1 - 0.95 * lisseT(bosse(x) * 3))];
      return [x, Math.min(SOL_PROFIL, y + k * bosse(x))];
    }
    return [x, y + deplacement(x, y)];
  };
  const os = (d: string) => (k ? deformerChemin(d, osPt) : d);
  const peau = (d: string) => (k ? deformerChemin(d, peauPt) : d);
  const O = OS_PROFIL;
  return {
    voute,
    sol: SOL_PROFIL,
    /** Peau du pied et de la jambe (aplat) et son contour (trait ouvert : la jambe sort du cadre) */
    peau: peau(EZ_PROFIL.corps),
    contour: peau(EZ_PROFIL.contour),
    /** Hallux au premier plan, orteils 2 à 4 en arrière-plan, ongle */
    hallux: EZ_PROFIL.hallux,
    halluxContour: EZ_PROFIL.halluxContour,
    orteils: EZ_PROFIL.orteilsLateraux,
    ongle: EZ_PROFIL.ongle,
    /** Arc de la malléole médiale (un seul petit arc) */
    malleole: peau(EZ_PROFIL.malleole),
    /**
     * Os : aplat (`d`) et contour (`trait`, ouvert pour le tibia et la fibula : aucun trait horizontal) ; `ton` 1 = arrière-plan
     * (fibula, latérale). Ordre de peinture : fibula, puis tibia, talus, calcanéus, colonne médiale.
     */
    os: [
      { nom: 'fibula', d: os(O.fibula), trait: os(O.fibulaTrait), ton: 1 },
      { nom: 'tibia', d: os(O.tibia), trait: os(O.tibiaTrait), ton: 0 },
      ...(['talus', 'calcaneus', 'naviculaire', 'cuneiforme1', 'metatarsien1'] as const).map((n) => ({ nom: n, d: os(O[n]), trait: os(O[n]), ton: 0 })),
      ...O.phalanges1.map((d, i) => ({ nom: `phalange${i + 1}`, d: os(d), trait: os(d), ton: 0 })),
    ],
    /** Calcanéus avec épine (variante, sans rouge ni rond de douleur : la forme seule) */
    calcaneusEpine: os(O.calcaneusEpine),
    /** Aponévrose plantaire : une seule bande qui s'amincit, de la tubérosité à la base de P1, enroulée sous la tête de M1 */
    aponevrose: os(EZ_PROFIL.aponevrose),
    /** Insertion de l'aponévrose (processus médial de la tubérosité calcanéenne) */
    insertion: osPt(12.7, 55.4),
    /** Articulation métatarso-phalangienne de l'hallux, malléole médiale (repères) */
    mtp: EZ_PROFIL.pivotMtp as P,
    malleoleMediale: osPt(...(EZ_PROFIL.malleoleMediale as P)),
    /** Pression illustrative sur le SOL sous la plante, du talon (x ≈ 0) aux orteils (x ≈ 123) */
    appui: (x: number) => {
      const g = (c: number, s: number) => Math.exp(-(((x - c) / s) ** 2));
      const milieu = { normale: 0.28, creuse: 0, plate: 0.62 }[voute];
      return Math.min(1, 0.95 * g(11.8, 8) + milieu * g(48, 20) * (x > 22 && x < 76 ? 1 : 0) + 0.9 * g(83, 7) + 0.55 * g(116, 4.5));
    },
  };
}

/** Semelle orthopédique de profil (POD-AT-0005), même repère que le profil : le pied posé dessus est relevé de `releve` */
export const SEMELLE_PROFIL = EZ_PROFIL.semelle;

/**
 * Profil pour les marques du logo « anatomie » : le même squelette (POD-AT-0008), jambe coupée à y = −18 (contour ouvert à la
 * coupe). `os` : version détaillée (fibula en arrière-plan, ton 1) ; `principaux` : en-tête ; `masses` : favicon (aplats).
 * `epure` : contour de peau ouvert, os au trait, appuis sur le sol.
 */
const COUPE_LOGO = -18;
const osLogo = (d: string) => couperSous(d, COUPE_LOGO, 5);
const OS_LOGO = Object.fromEntries((['tibia', 'fibula', 'talus', 'calcaneus', 'naviculaire', 'cuneiforme1', 'metatarsien1'] as const).map((n) => [n, osLogo(OS_PROFIL[n])])) as Record<string, { plein: string; trait: string }>;
const PHAL_LOGO = OS_PROFIL.phalanges1.map((d) => ({ plein: d, trait: d }));
const tonLogo = (t: number) => (o: { plein: string; trait: string }) => ({ d: o.plein, trait: o.trait, ton: t });
const PEAU_LOGO = couperSous(EZ_PROFIL.contour, COUPE_LOGO, 5).trait;
export const PROFIL = {
  x0: -2,
  largeur: 125.4,
  haut: COUPE_LOGO,
  hauteur: SOL_PROFIL - COUPE_LOGO,
  sol: SOL_PROFIL,
  masses: [OS_LOGO.tibia.plein, OS_LOGO.fibula.plein, OS_LOGO.talus.plein, OS_LOGO.calcaneus.plein, OS_LOGO.naviculaire.plein, OS_LOGO.cuneiforme1.plein, OS_LOGO.metatarsien1.plein, ...OS_PROFIL.phalanges1],
  principaux: [
    ...[OS_LOGO.fibula].map(tonLogo(1)),
    ...[OS_LOGO.tibia, OS_LOGO.talus, OS_LOGO.calcaneus, OS_LOGO.metatarsien1, ...PHAL_LOGO].map(tonLogo(0)),
  ],
  os: [
    ...[OS_LOGO.fibula].map(tonLogo(1)),
    ...[OS_LOGO.tibia, OS_LOGO.talus, OS_LOGO.calcaneus, OS_LOGO.naviculaire, OS_LOGO.cuneiforme1, OS_LOGO.metatarsien1, ...PHAL_LOGO].map(tonLogo(0)),
  ],
  reflets: '',
  epure: {
    contour: PEAU_LOGO,
    /** Appuis sur le sol : [x, niveau de pression 0–1] (talon, têtes métatarsiennes, pulpe de l'hallux ; rien sous l'arche) */
    appuis: [[6, 0.75], [12, 1], [18, 0.75], [77, 0.6], [83, 1], [89, 0.7], [111, 0.45], [117, 0.8]] as [number, number][],
    sol: SOL_PROFIL + 1.5,
    os: [OS_LOGO.tibia.trait, OS_LOGO.fibula.trait, OS_LOGO.talus.trait, OS_LOGO.calcaneus.trait, OS_LOGO.naviculaire.trait, OS_LOGO.cuneiforme1.trait, OS_LOGO.metatarsien1.trait, ...OS_PROFIL.phalanges1],
    principaux: [OS_LOGO.tibia.trait, OS_LOGO.talus.trait, OS_LOGO.calcaneus.trait, OS_LOGO.metatarsien1.trait, ...OS_PROFIL.phalanges1],
    compact: [OS_LOGO.talus.plein, OS_LOGO.calcaneus.plein, OS_LOGO.naviculaire.plein, OS_LOGO.cuneiforme1.plein, OS_LOGO.metatarsien1.plein, ...OS_PROFIL.phalanges1],
  },
};

// ———————————————————————————————————————————————————— Rubans (marque « rubans »)

/**
 * Rubans : deux bords de la plante (interne avec la voûte, externe) et l'arc des orteils, posés sur le contour du pied réel. Chaque
 * ruban : points de la ligne médiane et épaisseurs aux mêmes points (pleins aux appuis, déliés à la voûte et aux extrémités).
 */
export const RUBANS: { points: P[]; epaisseurs: number[] }[] = [
  {
    // Bord interne : talon → voûte creusée → 1re tête métatarsienne → hallux
    points: [[56, 215], [36, 212], [27, 198], [25, 176], [27, 152], [24, 128], [16, 104], [10, 82], [11, 62], [17, 38], [21, 18], [22, 6]],
    epaisseurs: [1, 13, 20, 22, 14, 4, 3.5, 11, 18, 16, 9, 1],
  },
  {
    // Bord externe : du 5e métatarsien au talon, ruban plus fin
    points: [[80, 44], [86, 66], [88, 96], [84, 128], [79, 156], [76, 182], [70, 204], [56, 214]],
    epaisseurs: [1, 6, 10, 11, 8.5, 7.5, 5, 1],
  },
  {
    // Arc des orteils, du 2e au 5e
    points: [[40, 13], [55, 20], [68, 27], [80, 35]],
    epaisseurs: [1, 9, 8, 1],
  },
];

/**
 * Ruban à épaisseur modulée : la ligne médiane (Catmull-Rom échantillonnée) décalée de part et d'autre
 * d'une demi-épaisseur interpolée, en un contour fermé (pleins et déliés, pointes aux extrémités).
 */
export function ruban(points: P[], epaisseurs: number[], facteur = 1, pas = 8): string {
  const n = points.length;
  const pt = (i: number) => points[Math.max(0, Math.min(n - 1, i))];
  const gauche: P[] = [];
  const droite: P[] = [];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    for (let s = 0; s < pas || (i === n - 2 && s === pas); s++) {
      const t = s / pas;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const df = (a: number, b: number, c: number, d: number) => 0.5 * ((-a + c) + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (-a + 3 * b - 3 * c + d) * t2);
      const x = f(p0[0], p1[0], p2[0], p3[0]);
      const y = f(p0[1], p1[1], p2[1], p3[1]);
      const dx = df(p0[0], p1[0], p2[0], p3[0]);
      const dy = df(p0[1], p1[1], p2[1], p3[1]);
      const l = Math.hypot(dx, dy) || 1;
      const e = (epaisseurs[i] + (epaisseurs[i + 1] - epaisseurs[i]) * (t * t * (3 - 2 * t))) * facteur / 2;
      gauche.push([x - (dy / l) * e, y + (dx / l) * e]);
      droite.push([x + (dy / l) * e, y - (dx / l) * e]);
    }
  }
  const f = (p: P) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return `M${gauche.map(f).join(' L')} L${droite.reverse().map(f).join(' L')} Z`;
}

/**
 * Chaussure de course de profil (repère 100 × 50, pointe à droite), dessinée à plat puis inclinée par la
 * marque (propulsion : talon levé, pointe vers le sol). Semelle intermédiaire épaisse au talon et cambrée
 * (drop, pointe relevée), fenêtre d'amorti au talon, tige à col ouvert, empeigne avant (zone de la trame).
 */
export const CHAUSSURE = {
  /** Centre de rotation et inclinaison (degrés, sens horaire) */
  centre: [52, 28] as P,
  inclinaison: 17,
  semelle: 'M10 32 C22 33.5 42 35.2 61 36 C75 36.6 87 35.8 95.5 33.4 C97.5 36.8 94 41 87 42 C70 44.2 46 44.8 23 44.8 C14.5 44.8 9.6 41.6 9.2 37 C9 34.6 9.2 33 10 32 Z',
  tige: 'M10.2 31.6 C8.4 24 9.6 16 14.2 11.6 C18.6 13.6 23.6 14.6 28.2 13 L31.6 7.6 C34.6 6.4 37.6 7.4 38.8 10 C48 15.2 62 22 76 26.2 C86 29 92.6 30.8 95.4 33.2 C86.6 35.6 74.6 36.4 61 35.8 C42 35 22 33.2 10.2 31.6 Z',
  /** Fenêtre d'amorti au talon (en creux dans la semelle) */
  fenetre: 'M16.5 38.4 C16.5 37.2 17.4 36.6 18.8 36.7 L28.6 37.4 C30 37.5 30.8 38.2 30.6 39.3 C30.4 40.4 29.4 40.9 28 40.8 L18.6 40.4 C17.3 40.3 16.5 39.6 16.5 38.4 Z',
  /** Renfort de talon : la découpe de la tige au-dessus de la semelle */
  renfort: 'M10.4 25 C15 25.5 19.5 27.6 21.5 31.4',
  /** Lacets : barrettes [x1, y1, x2, y2] le long de l'ouverture */
  lacets: [[40.5, 15.2, 44.2, 11.4], [47, 18.6, 50.7, 14.8], [53.5, 21.8, 57.2, 18], [60, 24.6, 63.6, 20.8]] as [number, number, number, number][],
  /** Empeigne avant : polygone où se pose la trame de points */
  empeigne: [[66, 27.2], [78, 30.4], [88, 32.6], [86, 34.6], [74, 35.4], [64, 34.6]] as P[],
  /** Crantage : encoches remontant du bord de la semelle, posées le long de ce bord (talon → pointe) */
  crantage: [[18, 44.6], [46, 44.8], [86, 42]] as P[],
  /** Ligne de semelle seule (favicon) */
  ligne: 'M11 41 C30 43.4 62 43.6 93 37.6',
  /** Lignes de vitesse derrière le talon */
  vitesse: 'M-1 20 H6.5 M1.5 27 H7',
};

/**
 * Jambe de profil (repère 100 × 100, pointe à droite), en fin d'appui : talon levé, appui sur l'avant-pied et les orteils, tibia
 * incliné vers l'avant. Crête tibiale à l'avant, galbe du gastrocnémien à l'arrière, tendon d'Achille, cheville fine, talon arrondi,
 * voûte, avant-pied et orteils à plat AU SOL (y = 85,6). La cuisse continue au-dessus du cadre (y < 0) : la jambe sort du cadre,
 * jamais coupée net au genou. Zones d'appui en bandes sur le sol, sous la plante.
 */
export const JAMBE = {
  silhouette: 'M53.4 -40 L55.8 7.7 C57.6 9.4 57.8 12.8 56.6 15 C56.1 16 56.2 17.4 55.8 18.8 L41.5 61 C43.5 64.5 47 68 51.5 72.5 C55 76 58 78.5 60.5 79.6 C62 80.3 63 80.6 64.5 80.6 C67 80.6 69.4 81.8 69.6 83.6 C69.8 85 69 85.6 67.4 85.6 L56 85.6 C52.5 85.6 50.5 84.6 48.8 83 C44 78.5 39.5 75.6 35.5 74.4 C31.5 73.2 27.6 71 27 66.6 C26.5 63 28 60.6 29.4 58.6 C31.2 55.4 33.6 51.5 34.6 47.5 C35.4 44 35.2 40.5 34.2 36.5 C32.6 30.5 32 23 33.8 16.5 C35.2 11.5 37.6 7 40.2 4.3 L35.4 -40',
  /** Détail (version détaillée) : la malléole externe, suggérée par un arc */
  details: 'M36.8 56.2 C39.2 55.4 41 57.4 40.4 60',
  /** Disque de fond, en retrait vers le haut et l'arrière : la jambe le traverse */
  disque: [34, 34, 26] as [number, number, number],
  sol: { y: 85.6, x1: 8, x2: 92 },
  /** Zones d'appui en bandes sous la plante [x1, x2, niveau] : trace du talon (déjà levé), avant-pied, orteils */
  appuis: [[27, 33, 0.15], [44, 52, 1], [58.5, 66, 0.6]] as [number, number, number][],
};
