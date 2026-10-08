// Planche « ce qui manque » (demande de Paul, 2026-10-08 : « ce serait bien d'ajouter d'autres illustrations / éléments d'icônes
// d'univers liés à la podologie ; tu peux essayer de regarder ce qui manque comme illustrations ? »). Analyse : retours/MANQUES-
// ILLUSTRATIONS.md. Ce module porte les ILLUSTRATIONS nouvelles (registre pédagogique, repère 240 × 180) et la fiche (sujets,
// hashtags) de chaque élément nouveau, illustrations ET pictos (les pictos eux-mêmes sont dans pictos.ts, famille par famille).
// Tous BROUILLONS : « À revoir » dans /admin/illustrations et « Nouveau » dans « Donner mon avis » ; seul Paul les valide. Aucune
// animation (règle de Paul : jamais d'animation avant validation des images de base).
//
// RÈGLES (graphiste-sante, illustrateur-medical, docs/referentiels/pieges-illustration.md) :
//  - aucun pied dessiné à l'œil : vue de dessus / de dessous = CONTOUR_PIED (POD-AT-0001/0002), profil = piedDeProfil (POD-AT-0003) ;
//    une pathologie se montre en DÉFORMANT la géométrie validée (champ de déformation continu : les contours restent raccordés),
//    jamais en redessinant ;
//  - schémas classiques (comme le durillon v3) : une seule idée, aucun texte, aucune légende, aucun os ni coupe pour une lésion de
//    peau ; couleur sur la peau seulement pour la lésion montrée, localisée, en teinte « corne » (jamais de rouge) ;
//  - une chaussure est l'enveloppe du pied validé (sports.ts : chaussure), jamais un dessin posé à côté ;
//  - mêmes classes que dessins.css (peau-douce, peau-seule, trait, fin, ongle-dessus, durillon, halo, piece, piece-coque, sol) :
//    couleurs de la gamme et de la charte seulement, aucune couleur littérale, aucun <style>, aucun texte.
import { CONTOUR_PIED, PLANTE, deformerChemin, echantillonner, dansPolygone, chaikin, type P } from './pied';
import { EZ_PIED } from './bibliotheque/geometrie';
import { chaussure, cheminLisse, type ModeleChaussure } from './sports';

// ———————————————————————————————————————————————————— Fiches des éléments nouveaux (illustrations et pictos)

/** Illustrations nouvelles (clé d'inventaire `dessin:<id>:pedagogique`, base `dessin:<id>`) */
export const DESSINS_UNIVERS = ['hallux-valgus', 'chaussage-adapte', 'crevasses-talon', 'auto-examen'] as const;
export type DessinUnivers = (typeof DESSINS_UNIVERS)[number];
export const estDessinUnivers = (x: unknown): x is DessinUnivers => typeof x === 'string' && (DESSINS_UNIVERS as readonly string[]).includes(x);

export interface FicheElementUnivers {
  libelle: string;
  /** Ce que montre l'élément (le regard du pédicure-podologue) */
  regard: string;
  /** Sujets des visuels par défaut (sujets-visuels.ts) */
  sujets: readonly string[];
  /** Hashtags suggérés par défaut (FORME_HASHTAG : minuscules, sans accents, tirets) */
  hashtags: readonly string[];
}

export const FICHES_DESSINS_UNIVERS: Readonly<Record<DessinUnivers, FicheElementUnivers>> = {
  'hallux-valgus': {
    libelle: 'Hallux valgus',
    regard: 'Le pied droit vu de dessus : gros orteil dévié vers les autres, saillie de la tête du 1er métatarsien (« oignon »)',
    sujets: ['pedicurie', 'semelles'], hashtags: ['hallux-valgus', 'oignon', 'avant-pied', 'chaussage'],
  },
  'chaussage-adapte': {
    libelle: 'Chaussage adapté',
    regard: 'Le pied dans une chaussure confort : bout large et haut, fermeture à scratch, contrefort, talon bas, semelle ferme',
    sujets: ['diabete', 'senior'], hashtags: ['chaussage', 'chaussure-confort', 'prevention', 'scratch'],
  },
  'crevasses-talon': {
    libelle: 'Talon sec et crevasses',
    regard: 'Le talon vu de dessous : bord épaissi (hyperkératose) et fines fissures, cadré sur le talon',
    sujets: ['pedicurie', 'diabete'], hashtags: ['crevasses', 'talon', 'hyperkeratose', 'peau-seche'],
  },
  'auto-examen': {
    libelle: 'Auto-examen au miroir',
    regard: 'La plante du pied vue dans un miroir sur pied : regarder sous ses pieds chaque jour, sans instrument',
    sujets: ['diabete', 'senior'], hashtags: ['auto-examen', 'miroir', 'prevention', 'plante-du-pied'],
  },
};

/**
 * Pictos nouveaux (pictos.ts, clé `picto:<id>`) : sujets et hashtags par défaut. Aucun n'est branché sur les sites (PICTOS_SOINS
 * inchangé) tant que Paul ne l'a pas validé.
 */
export const FICHES_PICTOS_UNIVERS: Readonly<Record<string, FicheElementUnivers>> = {
  'chaussure-confort': { libelle: 'Chaussure confort à scratch', regard: 'Chaussure basse à bout large et haut, une bride auto-agrippante large, talon bas', sujets: ['senior', 'diabete'], hashtags: ['chaussage', 'chaussure-confort', 'scratch'] },
  'auto-examen': { libelle: 'Auto-examen au miroir', regard: 'Miroir sur pied et plante du pied reflétée', sujets: ['diabete', 'senior'], hashtags: ['auto-examen', 'miroir', 'prevention'] },
  'creme-hydratation': { libelle: 'Crème et hydratation', regard: 'Tube de crème (sans marque) et noisette de crème', sujets: ['pedicurie', 'diabete'], hashtags: ['creme', 'hydratation', 'peau-seche', 'conseil'] },
  laser: { libelle: 'Laser', regard: 'Pièce à main et faisceau étroit sur une zone précise', sujets: ['pedicurie', 'ongles'], hashtags: ['laser', 'soin'] },
  'hygiene-mains': { libelle: 'Hygiène des mains', regard: 'Flacon pompe de solution hydroalcoolique et goutte', sujets: ['general', 'pedicurie'], hashtags: ['hygiene', 'mains', 'cabinet'] },
  chaussettes: { libelle: 'Chaussettes adaptées', regard: 'Chaussette de profil, bord côte souple (sans élastique qui serre)', sujets: ['diabete', 'senior'], hashtags: ['chaussettes', 'chaussage', 'prevention'] },
  stationnement: { libelle: 'Stationnement', regard: 'Voiture vue de dessus entre les deux lignes d’une place', sujets: ['general'], hashtags: ['acces', 'parking', 'infos-pratiques'] },
  transports: { libelle: 'Transports en commun', regard: 'Bus ou tram vu de face', sujets: ['general'], hashtags: ['acces', 'transports', 'infos-pratiques'] },
};

/** Clé d'inventaire → fiche (illustrations et pictos nouveaux) */
export const FICHES_UNIVERS_PAR_CLE: Readonly<Record<string, FicheElementUnivers>> = Object.fromEntries([
  ...DESSINS_UNIVERS.map((d) => [`dessin:${d}:pedagogique`, FICHES_DESSINS_UNIVERS[d]] as const),
  ...Object.entries(FICHES_PICTOS_UNIVERS).map(([id, f]) => [`picto:${id}`, f] as const),
]);

/** Sujets par défaut d'un élément nouveau (inventaire : champ `soins`, lu par sujets-visuels.ts) */
export const sujetsUnivers = (cle: string): string[] => [...(FICHES_UNIVERS_PAR_CLE[cle]?.sujets ?? [])];

/** Hashtags par défaut des éléments nouveaux (kits.ts, HASHTAGS_PAR_DEFAUT) */
export const HASHTAGS_UNIVERS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  Object.entries(FICHES_UNIVERS_PAR_CLE).map(([cle, f]) => [cle, [...new Set(f.hashtags)].sort()] as const),
);

// ———————————————————————————————————————————————————— Outils

type Affine = [number, number, number, number, number, number];
const r1 = (v: number) => +v.toFixed(1);
const appliquer = (m: Affine, x: number, y: number): P => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/** Applique une transformation de point aux coordonnées d'un chemin (sommets et poignées) ; arrondi au dixième */
const deformer = (d: string, f: (x: number, y: number) => P) => deformerChemin(d, f).replace(/(\d+\.\d)\d+/g, '$1');
const transformer = (d: string, m: Affine) => deformer(d, (x, y) => appliquer(m, x, y));
/**
 * Déformation NON linéaire d'un chemin : échantillonné finement (sommets ET courbes), chaque point déformé, puis relissé. Déformer les
 * poignées d'une courbe de Bézier par un champ non uniforme écarterait deux tracés qui partagent un bord (aplat et contour).
 */
const deformerDense = (d: string, f: (x: number, y: number) => P) =>
  echantillonner(d, 14).map((q) => cheminLisse(q.pts.map(([x, y]) => f(x, y)), q.ferme, 0.04)).join(' ');
const lisseT = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };
const tourner = ([x, y]: P, [cx, cy]: P, deg: number): P => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy;
  return [cx + c * dx - s * dy, cy + s * dx + c * dy];
};
/** Pied posé : centre de la plante (46, 111) en (cx, cy), échelle e, pied gauche par symétrie (même convention que dessins.ts) */
const poser = (cx: number, cy: number, e: number, miroir = false): Affine => {
  const sx = miroir ? -e : e;
  return [sx, 0, 0, e, cx - sx * 46, cy - e * 111];
};
const echapper = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const halo = (id: string, classe: string) =>
  `<radialGradient id="${id}"><stop offset="0.4" class="${classe}" stop-opacity="0.6"></stop><stop offset="1" class="${classe}" stop-opacity="0"></stop></radialGradient>`;
/** Lissage de Chaikin d'une polyligne OUVERTE (les bouts restent en place) */
function chaikinOuvert(pts: readonly P[], passes = 2): P[] {
  let q = [...pts];
  for (let k = 0; k < passes; k++) {
    const r: P[] = [q[0]];
    for (let i = 0; i + 1 < q.length; i++) { const [a, b] = [q[i], q[i + 1]]; r.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); }
    r.push(q[q.length - 1]);
    q = r;
  }
  return q;
}
const poly = (pts: readonly P[], ferme = true) => `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')}${ferme ? ' Z' : ''}`;

// ———————————————————————————————————————————————————— Hallux valgus : déformation continue du pied validé (vue de dessus)

/**
 * Hallux valgus (pied droit vu de dessus, hallux à gauche) : chaque orteil tourne autour de SA métatarso-phalangienne vers le bord
 * externe (hallux ≈ 17°, au-delà du seuil de 15° : Radiopaedia, « Hallux valgus angle » ; petits orteils de moins en moins, poussés
 * par l'hallux), et le bord interne bombe à la tête du 1er métatarsien (l'« oignon »). Un SEUL champ de déformation, appliqué à
 * toutes les couches (peau, contours, ongles, plis) : rotation pleine au-dessus des MTP, nulle sous elles (fondu sur ≈ 16 u), et,
 * entre deux rayons, mélange linéaire des deux rotations — les orteils, le dos du pied et la saillie restent raccordés sans retouche.
 */
export const HALLUX_VALGUS = { angles: [20, 15, 11, 7, 3], bosse: 6.2, bosseY: 63.5, bosseH: 9.5 } as const;
const PIVOTS = EZ_PIED.orteils.map((o) => o.pivot as P);
const AXES_X = PIVOTS.map(([x]) => x);

/** Poids des rayons (fonctions « chapeau » entre les axes des orteils : somme = 1) */
function poidsRayons(x: number): number[] {
  const w = [0, 0, 0, 0, 0];
  if (x <= AXES_X[0]) { w[0] = 1; return w; }
  if (x >= AXES_X[4]) { w[4] = 1; return w; }
  for (let i = 0; i < 4; i++) {
    if (x >= AXES_X[i] && x <= AXES_X[i + 1]) { const t = (x - AXES_X[i]) / (AXES_X[i + 1] - AXES_X[i]); w[i] = 1 - t; w[i + 1] = t; }
  }
  return w;
}
/** Part de la rotation d'un rayon en (x, y) : 1 au-dessus de la MTP (distal), 0 sous elle (proximal) */
const partDistale = (y: number, pivot: P) => lisseT((pivot[1] + 6 - y) / 16);
/** Saillie médiale à la tête de M1 (déplacement vers le bord interne, x décroissant) */
const saillie = (x: number, y: number, f = 1) => -HALLUX_VALGUS.bosse * f * Math.exp(-(((y - HALLUX_VALGUS.bosseY) / HALLUX_VALGUS.bosseH) ** 2)) * lisseT((18 - x) / 9);

/** Déformation du dos du pied (mélange des rayons) ; `orteil` : un orteil seul suit son rayon (pas de mélange) */
function champHallux(orteil: number | null, f = 1, angles: readonly number[] = HALLUX_VALGUS.angles) {
  return (x: number, y: number): P => {
    const w = orteil === null ? poidsRayons(x) : [0, 1, 2, 3, 4].map((i) => (i === orteil ? 1 : 0));
    let dx = 0, dy = 0;
    w.forEach((wi, i) => {
      if (!wi) return;
      const [rx, ry] = tourner([x, y], PIVOTS[i], angles[i] * f * partDistale(y, PIVOTS[i]));
      dx += wi * (rx - x); dy += wi * (ry - y);
    });
    return [x + dx + saillie(x, y, f), y + dy];
  };
}

/**
 * Pied droit vu de dessus en hallux valgus (repère du pied), en couches : le dos (aplat et contour), puis chaque orteil (aplat, pli,
 * ongle, contour) de l'hallux au 5e — un orteil posé APRÈS son voisin le recouvre : si l'hallux dévié touche le 2e orteil, il passe
 * dessous (présentation la plus fréquente), jamais un contour d'hallux tracé par-dessus le 2e orteil.
 */
export function piedHalluxValgus(f = 1, angles: readonly number[] = HALLUX_VALGUS.angles) {
  const dos = champHallux(null, f, angles);
  const orteils = EZ_PIED.orteils.map((o, i) => ({ c: champHallux(i, f, angles), o }));
  return {
    dos: { peau: deformerDense(EZ_PIED.dos, dos), contour: deformerDense(EZ_PIED.contourDos, dos), pli: EZ_PIED.cheville.pli },
    orteils: orteils.map(({ c, o }) => ({ peau: deformerDense(o.peau, c), contour: deformerDense(o.contour, c), ongle: deformerDense(o.ongle, c), pli: deformerDense(o.pliDorsal, c) })),
    /** Centre de la saillie (bord interne, tête de M1) */
    saillie: dos(6.6, HALLUX_VALGUS.bosseY),
    /** Polygones des orteils déformés (contrôles) */
    polygones: orteils.map(({ c, o }) => (o.polygone as P[]).map(([x, y]) => c(x, y))),
  };
}

// ———————————————————————————————————————————————————— Plante vue de dessous, talon

/** Couche plantaire (vue de dessous = miroir du repère du pied) posée par `m` : peau douce, plis, contour */
const planteReelle = (m: Affine, plis = true) =>
  `<g class="peau-douce">${CONTOUR_PIED.plantaire.peaux.map((p) => `<path class="peau-seule" d="${transformer(p, m)}"></path>`).join('')}${plis ? `<path class="fin fin--leger" d="${transformer(CONTOUR_PIED.plantaire.plis, m)}"></path>` : ''}<path class="trait" d="${transformer(CONTOUR_PIED.plantaire.trait, m)}"></path></g>`;

/**
 * Bord épaissi du talon (hyperkératose du bord postérieur, en croissant) : bande DANS la peau, entre le contour du talon et une courbe
 * décalée vers l'intérieur (≈ 6,5 u au bord postérieur, s'amincit vers les bords latéral et médial) ; fissures FINES, perpendiculaires
 * au bord, à peine coudées (une crevasse n'est jamais un rayon droit ni une plaie ouverte), de longueurs inégales ; repère du pied.
 */
export function bordTalon(): { bande: P[]; fissures: P[][] } {
  const talon = PLANTE.filter(([, y]) => y >= 178);
  const c: P = [48, 190];
  const ext = chaikinOuvert(talon, 3);
  const epaisseur = (p: P) => 6.5 * lisseT((p[1] - 184) / 22);
  const int = ext.map((p) => { const dx = c[0] - p[0], dy = c[1] - p[1], l = Math.hypot(dx, dy) || 1, e = epaisseur(p); return [p[0] + (dx / l) * e, p[1] + (dy / l) * e] as P; });
  const bande = [...ext, ...int.reverse()];
  const angles = [-150, -122, -97, -74, -48];
  const longueurs = [5, 7, 6.2, 7.4, 5.2];
  const fissures = angles.map((a, k) => {
    const u = (a * Math.PI) / 180, dir: P = [Math.cos(u), -Math.sin(u)], nrm: P = [-dir[1], dir[0]];
    let r = 0;
    while (r < 60 && dansPolygone(PLANTE, c[0] + dir[0] * (r + 0.5), c[1] + dir[1] * (r + 0.5))) r += 0.5;
    const l = longueurs[k], z = k % 2 ? 1 : -1;
    // départ à 1,2 u du bord (dans la peau), deux segments à peine coudés (±0,8 u)
    return [0, 0.45, 1].map((t, i) => { const d = r - 1.2 - t * l, o = i === 1 ? 0.8 * z : 0; return [c[0] + dir[0] * d + nrm[0] * o, c[1] + dir[1] * d + nrm[1] * o] as P; });
  });
  return { bande, fissures };
}

// ———————————————————————————————————————————————————— Chaussure confort (enveloppe du profil validé)

/**
 * Chaussure confort (prévention : diabète, seniors) : basse, col sous les malléoles un peu remonté au talon (contrefort), tige
 * rembourrée (épaisseur 3,6 u ≈ 7 mm), boîte des orteils large et haute (bout + 4,4 u), talon bas (≈ 1,8 cm de semelle), semelle
 * ferme en légère bascule à l'avant (relevé 2,4 u) ; fermeture par deux brides auto-agrippantes (ni lacet ni couture sur le dessus des orteils).
 */
export const CHAUSSURE_CONFORT: ModeleChaussure = {
  col: [[-12, 29], [8, 29.5], [20, 33], [32, 33.5], [42, 27], [48, 20], [54, 16], [60, 13]],
  tige: 3.6, bout: 4.4, talon: 9, avant: 6.4, releve: 2.4, debord: [0.6, 0.5],
};

// ———————————————————————————————————————————————————— Corps des illustrations

type Ctx = { id: string };

function corps(nom: DessinUnivers, { id }: Ctx): string {
  switch (nom) {
    case 'hallux-valgus': {
      // Un seul pied, grand, la jambe sort du cadre par le bas ; halo discret « corne » sur la saillie (frottement dans la chaussure),
      // aucun axe ni angle dessiné (pas de texte ni de mesure) : la déviation se lit sur l'orteil.
      const m = poser(120, 101, 0.8);
      const p = piedHalluxValgus();
      const t = (d: string) => transformer(d, m);
      const [sx, sy] = appliquer(m, ...p.saillie);
      const orteils = p.orteils.map((o) => `<path class="peau-seule" d="${t(o.peau)}"></path><path class="fin" d="${t(o.pli)}"></path><path class="ongle-dessus ongle-dessus--fin ongle-naturel" d="${t(o.ongle)}"></path><path class="trait" d="${t(o.contour)}"></path>`).join('');
      return `<defs>${halo(`${id}-halo`, 'halo-durillon')}</defs><g class="peau-douce"><path class="peau-seule" d="${t(p.dos.peau)}"></path><path class="fin" d="${t(p.dos.pli)}"></path><ellipse class="halo" fill="url(#${id}-halo)" cx="${r1(sx + 4)}" cy="${r1(sy)}" rx="8" ry="10"></ellipse><path class="trait" d="${t(p.dos.contour)}"></path>${orteils}</g>`;
    }
    case 'crevasses-talon': {
      // Même grammaire que la verrue (5 ★) : la plante du pied droit vue de dessous (hallux à droite) et un médaillon relié au talon, qui
      // montre le bord épaissi (corne ocre doux, dans la peau) et de fines crevasses. Aucun anneau sur la peau, aucun texte.
      const k = 0.72, mP: Affine = [-k, 0, 0, k, 20 + 92 * k, 10];
      const z = { x: 170, y: 96, r: 56 };
      const talon: P = appliquer(mP, 48, 214);
      const v = { x: talon[0], y: talon[1], r: 2.5 };
      const { bande, fissures } = bordTalon();
      const surPetit = poly(chaikin(bande.map(([x, y]) => appliquer(mP, x, y)), 1));
      // Médaillon : le talon ×3, son bord postérieur (contour, corne, crevasses) dans la moitié basse du médaillon
      const e = 3, mZ: Affine = [-e, 0, 0, e, z.x + 48 * e, z.y + 34 - 219.5 * e];
      const bZ = poly(chaikin(bande.map(([x, y]) => appliquer(mZ, x, y)), 1));
      const fZ = fissures.map((q) => poly(q.map(([x, y]) => appliquer(mZ, x, y)), false)).join(' ');
      const d = Math.hypot(z.x - v.x, z.y - v.y), t = Math.atan2(z.y - v.y, z.x - v.x), kk = Math.acos((v.r - z.r) / d);
      const cone = [t + kk, t - kk].map((n) => `<line class="liaison" x1="${r1(v.x + v.r * Math.cos(n))}" y1="${r1(v.y + v.r * Math.sin(n))}" x2="${r1(z.x + z.r * Math.cos(n))}" y2="${r1(z.y + z.r * Math.sin(n))}"></line>`).join('');
      return `<clipPath id="${id}-loupe"><circle cx="${z.x}" cy="${z.y}" r="${z.r - 1}"></circle></clipPath>${planteReelle(mP)}<path class="durillon" d="${surPetit}"></path>${cone}<circle class="fond-loupe" cx="${z.x}" cy="${z.y}" r="${z.r}"></circle><g clip-path="url(#${id}-loupe)">${planteReelle(mZ, false)}<path class="durillon" d="${bZ}"></path><path class="trait--fin" d="${fZ}"></path></g><circle class="loupe" cx="${z.x}" cy="${z.y}" r="${z.r}"></circle>`;
    }
    case 'auto-examen': {
      // Miroir sur pied (miroir de table posé au sol : cadre ovale, fourche à deux pivots, tige, socle) dans lequel se reflète la plante
      // du pied droit (vue de dessous, entière) — on ne peut pas le prendre pour une loupe. Un seul reflet courbe sur le verre. Aucun
      // instrument, aucune main, aucune couleur sur la peau.
      const sol = 168, c: P = [120, 76], rx = 46, ry = 60;
      const ovale = (a: number, b: number) => `M${c[0] - a} ${c[1]} A${a} ${b} 0 1 0 ${c[0] + a} ${c[1]} A${a} ${b} 0 1 0 ${c[0] - a} ${c[1]} Z`;
      const glace = ovale(rx, ry), cadre = ovale(rx + 6, ry + 6);
      // Fourche : de chaque pivot (milieu des côtés du cadre), elle descend et se rejoint sous le cadre ; tige ; socle elliptique
      const xg = c[0] - rx - 9, xd = c[0] + rx + 9, yb = c[1] + ry + 16;
      const fourche = `M${xg} ${c[1]} C${xg} ${c[1] + 40} ${c[0] - 30} ${yb} ${c[0] - 4} ${yb} H${c[0] + 4} C${c[0] + 30} ${yb} ${xd} ${c[1] + 40} ${xd} ${c[1]}`;
      const tige = `M${c[0] - 3} ${yb} V${sol - 6} M${c[0] + 3} ${yb} V${sol - 6}`;
      const socle = `M${c[0] - 30} ${sol} C${c[0] - 30} ${sol - 5} ${c[0] - 18} ${sol - 7} ${c[0]} ${sol - 7} C${c[0] + 18} ${sol - 7} ${c[0] + 30} ${sol - 5} ${c[0] + 30} ${sol} Z`;
      const pivots = [xg, xd].map((x) => `<circle class="peau-seule" cx="${x}" cy="${c[1]}" r="3.6"></circle><circle class="piece piece--forte" cx="${x}" cy="${c[1]}" r="3.6"></circle><circle class="trait trait--fin" cx="${x}" cy="${c[1]}" r="3.6"></circle>`).join('');
      const e = 0.5;
      const m: Affine = [-e, 0, 0, e, c[0] + 48 * e, c[1] - 111 * e];
      const reflet = `M${r1(c[0] + rx * 0.42)} ${r1(c[1] - ry * 0.8)} A${r1(rx * 0.9)} ${r1(ry * 0.9)} 0 0 1 ${r1(c[0] + rx * 0.8)} ${r1(c[1] - ry * 0.34)}`;
      return `<clipPath id="${id}-glace"><path d="${glace}"></path></clipPath><line class="sol" x1="40" y1="${sol}" x2="200" y2="${sol}"></line>` +
        `<path class="trait trait--moyen" d="${fourche} ${tige}"></path><path class="peau-seule" d="${socle}"></path><path class="piece-coque" d="${socle}"></path><path class="trait trait--moyen" d="${socle}"></path>` +
        `<path class="peau-seule" d="${cadre}"></path><path class="piece piece--forte" d="${cadre}"></path><path class="peau-seule" d="${glace}"></path><path class="piece" d="${glace}"></path>` +
        `<g clip-path="url(#${id}-glace)">${planteReelle(m)}</g><path class="trait trait--moyen" d="${cadre}"></path><path class="trait trait--fin" d="${glace}"></path><path class="fin" d="${reflet}"></path>${pivots}`;
    }
    case 'chaussage-adapte': {
      // Profil validé (pied gauche vu côté interne, orteils à droite) dans la chaussure confort ; la jambe, visible au-dessus du col,
      // sort du cadre par le haut ; brides auto-agrippantes en accent fort (l'objet, jamais la peau) ; bout renforcé, contrefort et col
      // rembourré au trait fin ; sol.
      const c = chaussure(CHAUSSURE_CONFORT);
      const k = 1.3, X0 = 120 - ((c.x0 + c.x1) / 2) * k, Y0 = 160 - c.sol * k;
      const m: Affine = [k, 0, 0, k, X0, Y0];
      const tp = (l: readonly P[]) => l.map(([x, y]) => appliquer(m, x, y));
      const [jArr, jAv] = [c.jambe[0] ?? [], c.jambe[1] ?? []];
      const haut = (q: P[]) => [...q, [q[q.length - 1][0], -400] as P, [q[0][0], -400] as P];
      const DESSUS = 62.6;
      // Dessus de la tige (bord avant, du col à la pointe) : y en fonction de x
      const dessus = [...c.avant].sort((u, v) => u[0] - v[0]);
      const yDessus = (x: number) => { for (let i = 1; i < dessus.length; i++) if (dessus[i][0] >= x) { const [a, b] = [dessus[i - 1], dessus[i]]; return a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]); } return dessus[dessus.length - 1]?.[1] ?? 30; };
      // Brides : deux bandes en travers du cou-de-pied, du dessus vers l'arrière et le bas (bout arrondi côté talon)
      // Bride presque verticale (elle passe en travers du cou-de-pied), large, bout arrondi rabattu : un trait fin marque la languette
      // qu'on attrape ; jamais deux bandes obliques fines (lecture « bandes décoratives » d'une marque)
      const bride = (x: number, l = 10) => {
        const x2 = x + l, y1 = yDessus(x) + 0.4, y2 = yDessus(x2) + 0.4, h = 23;
        const g: P = [x - 3.2, y1 + h], d: P = [x2 - 3.6, y2 + h];
        const forme = cheminLisse(tp([[x, y1], [x2, y2], [x2 - 1.8, (y2 + d[1]) / 2], d, [(g[0] + d[0]) / 2, (g[1] + d[1]) / 2 + 2.6], g, [x - 1.6, (y1 + g[1]) / 2]]), true, 0.05);
        const languette = cheminLisse(tp([[g[0] + 0.6, g[1] - 4.2], [(g[0] + d[0]) / 2, (g[1] + d[1]) / 2 - 3.6], [d[0] - 0.6, d[1] - 4.2]]), false, 0.05);
        return { forme, languette };
      };
      const brides = [bride(50), bride(66)];
      // Bout renforcé (ligne parallèle à la pointe), contrefort (talon), col rembourré (doublure au trait fin)
      const xb = c.x1 - 21;
      const bout = cheminLisse(tp([[xb, yDessus(xb) + 0.8], [xb + 5, (yDessus(xb) + DESSUS) / 2], [xb + 2, DESSUS - 0.4]]), false, 0.05);
      const contrefort = cheminLisse(tp([[22, 34.4], [14, 44], [8, 54], [5, DESSUS - 0.4]]), false, 0.05);
      const colDouble = cheminLisse(tp(c.col.filter(([x]) => x > -6 && x < 44).map(([x, y]) => [x, y + 2.8] as P)), false, 0.05);
      const sol = r1(appliquer(m, 0, c.sol)[1]);
      return `<line class="sol" x1="14" y1="${sol}" x2="226" y2="${sol}"></line>` +
        `<g class="peau-douce"><path class="peau-seule" d="${cheminLisse(tp(haut([...jArr, ...c.col, ...jAv])), true)}"></path></g>` +
        `<path class="trait" d="${cheminLisse(tp(jArr), false)} ${cheminLisse(tp(jAv), false)}"></path>` +
        c.semelles.map((q) => `<path class="peau-seule" d="${cheminLisse(tp(q), true, 0.05)}"></path><path class="piece-coque" d="${cheminLisse(tp(q), true, 0.05)}"></path><path class="trait trait--fin" d="${cheminLisse(tp(q), true, 0.05)}"></path>`).join('') +
        `<path class="peau-seule" d="${cheminLisse(tp(c.tige), true)}"></path><path class="piece" d="${cheminLisse(tp(c.tige), true)}"></path>` +
        `<path class="fin" d="${bout} ${contrefort} ${colDouble}"></path>` +
        `<path class="trait trait--moyen" d="${cheminLisse(tp(c.arriere), false)} ${cheminLisse(tp(c.avant), false)} ${cheminLisse(tp(c.col), false)}"></path>` +
        brides.map((b) => `<path class="peau-seule" d="${b.forme}"></path><path class="piece piece--forte" d="${b.forme}"></path><path class="fin" d="${b.languette}"></path><path class="trait--fin" d="${b.forme}"></path>`).join('');
    }
  }
  return '';
}

/** Illustration nouvelle (<svg>, repère 240 × 180, registre pédagogique), décorative (aria-hidden) ; `id` préfixe les identifiants */
export function svgDessinUnivers(nom: DessinUnivers, opts: { id?: string; classe?: string } = {}): string {
  const id = opts.id ?? `du-${nom}`;
  const classes = ['dessin', `dessin--${nom}`, 'dessin--pedagogique', opts.classe].filter(Boolean).join(' ');
  return `<svg class="${echapper(classes)}" viewBox="0 0 240 180" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${corps(nom, { id })}</svg>`;
}
