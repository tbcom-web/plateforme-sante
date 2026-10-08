// Pictogrammes : TROIS DIRECTIONS DE STYLE à l'essai (2026-10-08, brouillons « À revoir », rien de branché sur les sites).
//
// Retour de Paul sur la planche du 2026-10-08 : « Bof bof les icônes… » ; famille des pictos à 2,57 ★ (27 sur 54 à 2 ★ ou moins,
// « trait trop épais » 14 fois, « illisible en petit », accent vert invisible sur fond vert). Diagnostic : retours/PICTOS-DIAGNOSTIC.md.
// Avant de redessiner les ~60 pictos, Paul choisit une direction sur un ÉCHANTILLON de 12 pictos représentatifs, dessinés dans les
// trois directions avec la MÊME anatomie (géométries partagées de pied.ts et de la bibliothèque, via OUTILS_PICTOS de pictos.ts) :
//
//   A « Trait fin »   grille 24, trait unique optique (1,5 px de 20 à 24 px, 1,75 à 32, 2 à 48), coins et bouts ronds, monochrome ;
//                     accent = UNE petite pastille pleine sur le détail qui porte le sens. Lisible dès 20 px.
//   B « Duotone »     grille 24, même trait optique, la masse principale remplie d'une teinte claire de l'accent (opacité 0,2, lisible
//                     sur fond clair comme sombre), détail porteur de sens en aplat d'accent plein. Lisible dès 24 px.
//   C « Éditorial »   grille 64, sans contour : médaillon pâle, silhouette en aplat d'accent, UNE découpe (le fond qui traverse : ongle,
//                     voûte, aiguilles, hublot), détails à l'encre. Mini-illustration pour 40 à 96 px (cartes, en-têtes de soin).
//
// Règles communes : aucune lettre, aucun chiffre, aucun logo ; aucune couleur littérale (currentColor, --picto-accent / --accent),
// aucun <style>, aucun identifiant ; orteils : formule égyptienne, 5 orteils quand des orteils sont dessinés ; douleur jamais en
// cible ; peau jamais noire (« pied nécrosé ») ; accent contrôlé à ≥ 3:1 contre le fond (couleursPictoSur : sinon une variante).
// Clés d'inventaire : `picto:<id>@direction-<a|b|c>` (variantes du picto de base `picto:<id>`, bases-illustrations.ts) et
// `picto:style-icones-<a|b|c>` (tuile « Style d'icônes » : la planche de la direction en situation).
import { OUTILS_PICTOS as O } from './pictos';
import { SEMELLE, SEMELLE_ELEMENTS, PLANTE, PLANTE_ENFANT, ORTEILS_ENFANT, CONTOUR_PIED, CHAUSSURE, echantillonner, type P } from './pied';
import { MEDIAL, VOISINS, LAME, LATERAL_INCARNE } from './bibliotheque/hallux-gros-plan';
import { contraste, melanger } from './couleurs';
import { NEUTRES } from './charte';
import type { Gamme } from './gammes';

export const DIRECTIONS_PICTOS = ['a', 'b', 'c'] as const;
export type DirectionPicto = (typeof DIRECTIONS_PICTOS)[number];
export const estDirectionPicto = (x: unknown): x is DirectionPicto => (DIRECTIONS_PICTOS as readonly unknown[]).includes(x);

/** Règles écrites de chaque direction (affichées dans l'admin, la planche et retours/PICTOS-DIAGNOSTIC.md) */
export const FICHES_DIRECTIONS: Readonly<Record<DirectionPicto, {
  nom: string; court: string; grille: number; tailleMini: number; tailleNominale: number;
  /** Épaisseur du trait (px à l'écran) selon la taille d'affichage : épaisseur optique, jamais proportionnelle */
  traitPx: Readonly<Record<number, number>>;
  regles: readonly string[];
}>> = {
  a: {
    nom: 'Direction A — Trait fin', court: 'Trait fin', grille: 24, tailleMini: 20, tailleNominale: 24,
    traitPx: { 20: 1.5, 24: 1.5, 32: 1.75, 48: 2, 64: 2.25, 96: 2.75 },
    regles: [
      'Grille 24, zone utile 20 (2 de marge), formes posées sur la demi-unité.',
      'Un seul trait, optique : 1,5 px de 20 à 24 px, 1,75 px à 32, 2 px à 48 (jamais grossi avec l’icône).',
      'Bouts et angles ronds, rayon des coins 2 ; deux traits parallèles toujours séparés d’au moins 2 épaisseurs.',
      'Détail réduit à ce qui se lit à 20 px : une silhouette, au plus deux traits intérieurs.',
      'Accent : UNE petite pastille pleine, sur le détail qui porte le sens (repli inflammé, voûte, embout, voyant).',
      'Monochrome sinon (currentColor) : se pose sur n’importe quel fond.',
    ],
  },
  b: {
    nom: 'Direction B — Duotone doux', court: 'Duotone', grille: 24, tailleMini: 24, tailleNominale: 32,
    traitPx: { 20: 1.5, 24: 1.5, 32: 1.75, 48: 2, 64: 2.25, 96: 2.75 },
    regles: [
      'Grille 24, même trait optique que A, mêmes silhouettes.',
      'La masse principale (pied, semelle, chaussure, maison…) est remplie d’une teinte claire de l’accent (opacité 0,2) : plus chaleureux, lisible sur fond clair comme sombre.',
      'Le détail porteur de sens est un aplat d’accent plein ; tout le reste au trait.',
      'Mêmes coins et bouts ronds que A : la différence est la matière (teinte), pas le dessin.',
      'Taille mini : 24 px (à 20 px la teinte bave sur le trait).',
    ],
  },
  c: {
    nom: 'Direction C — Éditorial', court: 'Éditorial', grille: 64, tailleMini: 40, tailleNominale: 64,
    traitPx: { 40: 2, 48: 2.25, 64: 2.5, 96: 3 },
    regles: [
      'Grille 64, pour 40 à 96 px : un médaillon pâle (accent à 12 %) porte la figure.',
      'Pas de contour : la silhouette est un aplat d’accent ; les détails sont des découpes (le fond qui traverse : ongle, voûte, hublot, aiguilles).',
      'Une seule découpe majeure par picto, détails d’objet à l’encre (embout, poignée, manche).',
      'Peau jamais à l’encre (un pied noir se lit « nécrosé ») : peau en aplat d’accent ou en teinte.',
      'Taille mini : 40 px ; en dessous, utiliser la direction A.',
    ],
  },
};

/** Les 12 pictos de l'échantillon (ids des pictos actuels : base `picto:<id>`), dans l'ordre de la planche */
export const ECHANTILLON_DIRECTIONS = [
  'ongle-incarne', 'semelle-orthopedique', 'monofilament', 'premiers-pas', 'senior-canne', 'sport-course',
  'podoscope', 'verrue-plantaire', 'hygiene-autoclave', 'horaires', 'stationnement', 'soins-domicile',
] as const;
export type IdEchantillon = (typeof ECHANTILLON_DIRECTIONS)[number];

export const LIBELLES_ECHANTILLON: Readonly<Record<IdEchantillon, string>> = {
  'ongle-incarne': 'Ongle incarné', 'semelle-orthopedique': 'Semelle orthopédique', monofilament: 'Pied diabétique (monofilament)',
  'premiers-pas': 'Enfant, premiers pas', 'senior-canne': 'Senior', 'sport-course': 'Sport, course', podoscope: 'Bilan (podoscope)',
  'verrue-plantaire': 'Verrue plantaire', 'hygiene-autoclave': 'Hygiène, stérilisation', horaires: 'Horaires',
  stationnement: 'Accès, stationnement', 'soins-domicile': 'Soins à domicile',
};

/** Clé d'inventaire d'un picto dans une direction (variante de `picto:<id>`) */
export const cleDirection = (id: string, d: DirectionPicto) => `picto:${id}@direction-${d}`;
/** Clé de la tuile « Style d'icônes » d'une direction */
export const cleStyleIcones = (d: DirectionPicto) => `picto:style-icones-${d}`;
const CLE_DIRECTION = /^picto:([a-z0-9-]+)@direction-([abc])$/;
/** `picto:ongle-incarne@direction-b` → { id, direction } ; autre → null */
export function lireCleDirection(cle: string): { id: string; direction: DirectionPicto } | null {
  const m = CLE_DIRECTION.exec(cle);
  return m ? { id: m[1], direction: m[2] as DirectionPicto } : null;
}

// ———————————————————————————————————————————————————— Description commune (espace de dessin 48 × 48)

/**
 * Une partie d'un picto, dans l'espace de dessin 48 × 48 (A et B : ×0,5 → grille 24 ; C : ×4/3 → grille 64) :
 *  - `masse` : silhouette fermée (A : trait ; B : trait + teinte claire ; C : aplat d'accent) ;
 *  - `trait` : ligne (A, B : trait ; C : selon `c` : découpe dans la masse, encre, ou omise) ;
 *  - `point` : détail porteur de sens, plein (A, B : accent ; C : selon `c`, encre par défaut) ;
 *  - `creux` : trou d'une masse (A, B : trait ; C : découpe en pair-impair dans la masse qui précède).
 */
type Role = 'masse' | 'trait' | 'point' | 'creux';
type Partie = { role: Role; d: string; c?: 'decoupe' | 'encre' | 'encre-douce' | 'forme' | 'omis'; seul?: DirectionPicto[] };
const masse = (d: string, x: Partial<Partie> = {}): Partie => ({ role: 'masse', d, ...x });
const ligne = (d: string, x: Partial<Partie> = {}): Partie => ({ role: 'trait', d, ...x });
const point = (d: string, x: Partial<Partie> = {}): Partie => ({ role: 'point', d, ...x });
const creux = (d: string, x: Partial<Partie> = {}): Partie => ({ role: 'creux', d, ...x });

const { simplifier, placer, courbe, rdp, cercle, ellipse } = O;
const r1 = (v: number) => +v.toFixed(2);
const rect = (x: number, y: number, l: number, h: number, r: number) =>
  `M${r1(x + r)} ${r1(y)}H${r1(x + l - r)}A${r} ${r} 0 0 1 ${r1(x + l)} ${r1(y + r)}V${r1(y + h - r)}A${r} ${r} 0 0 1 ${r1(x + l - r)} ${r1(y + h)}H${r1(x + r)}A${r} ${r} 0 0 1 ${r1(x)} ${r1(y + h - r)}V${r1(y + r)}A${r} ${r} 0 0 1 ${r1(x + r)} ${r1(y)}Z`;
const poly = (pts: P[], ferme = true) => `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}${ferme ? 'Z' : ''}`;

/** Plante (vue de dessous, hallux à droite) : contour exact de PLANTE ; orteils en pastilles posées sur leurs bouts (5) */
function planteDessous(h: number, centre: P, { enfant = false, rot = 0 } = {}): { contour: string; orteils: string } {
  const L = 216.5; // bout de l'hallux (y ≈ 3) → talon (y ≈ 219,5)
  const s = h / L;
  const t = placer(s, [49.3, 111.25], centre, { miroir: true, rot });
  const contour = courbe(rdp((enfant ? PLANTE_ENFANT : PLANTE).map(([x, y]) => t(x, y)), 0.25), true);
  const orteils = enfant
    ? ORTEILS_ENFANT.map(([cx, cy, rx, ry]) => { const [x, y] = t(cx, cy - 3.5 / s); return ellipse(x, y, Math.max(0.75, rx * s * 0.95), Math.max(0.85, ry * s * 0.95)); }).join('')
    : CONTOUR_PIED.bouts.map(([x, y], i) => { const [rx, ry] = i ? [1.25, 1.45] : [2.1, 2.4]; const k = h / 40; const [cx, cy] = t(x + (i ? 0 : 1), y + (ry * k) / s - 9); return ellipse(cx, cy, rx * k, ry * k); }).join('');
  return { contour, orteils };
}

/** Gros plan de l'hallux droit vu de dessus (bibliotheque/hallux-gros-plan.ts) ; `incarne` : bord latéral bombé (même géométrie) */
function hallux(incarne: boolean, k = 0.55, dx = 0, dy = -2) {
  const t = (x: number, y: number): P => [x * k + dx, y * k + dy];
  const garder = (p: P) => p[0] <= 46.5 && p[1] <= 46.5;
  const lateral = incarne ? LATERAL_INCARNE : undefined;
  const pts = [...MEDIAL, ...(lateral ?? [[47, 13.2], [55, 17.6], [60.6, 25], [63.6, 36], [64.5, 50], [64.3, 64], [64.2, 76], [64.8, 84]] as P[]), ...VOISINS.slice(0, -2)];
  return {
    peau: simplifier(courbe(pts, false), t, 0.25, garder),
    lame: simplifier(courbe(LAME, true), t, 0.2),
    t,
  };
}

/**
 * Surface d'une silhouette tracée en plusieurs morceaux ouverts (profil coupé au bord du cadre, gros plan de l'hallux) : les morceaux
 * sont échantillonnés puis enchaînés bout à bout (le plus proche d'abord, retourné au besoin) et refermés — c'est la surface que
 * remplissent la teinte de B et l'aplat de C. Un tracé déjà fermé est rendu tel quel.
 */
export function surfacePicto(d: string): string {
  if (/[Zz]\s*$/.test(d.trim()) && (d.match(/M/g) ?? []).length === 1) return d;
  const morceaux = echantillonner(d, 6).map((m) => m.pts).filter((m) => m.length > 1);
  if (!morceaux.length) return d;
  const chaine: P[] = [...morceaux.shift()!];
  const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  while (morceaux.length) {
    const fin = chaine[chaine.length - 1];
    let k = 0, inv = false, best = Infinity;
    morceaux.forEach((m, i) => { const a = dist(fin, m[0]), b = dist(fin, m[m.length - 1]); if (a < best) { best = a; k = i; inv = false; } if (b < best) { best = b; k = i; inv = true; } });
    const m = morceaux.splice(k, 1)[0];
    chaine.push(...(inv ? [...m].reverse() : m));
  }
  // Fermeture le long du cadre : un morceau coupé au bord droit et un autre au bord bas se rejoignent par le coin (jamais en diagonale)
  const [debut, fin] = [chaine[0], chaine[chaine.length - 1]];
  const vertical = (q: P) => q[0] <= 2 || q[0] >= 45.8, horizontal = (q: P) => q[1] <= 2 || q[1] >= 45.8;
  if (vertical(fin) && !horizontal(fin) && horizontal(debut) && !vertical(debut)) chaine.push([fin[0], debut[1]]);
  else if (horizontal(fin) && !vertical(fin) && vertical(debut) && !horizontal(debut)) chaine.push([debut[0], fin[1]]);
  // poignées de courbe bornées au cadre (aux coins, la courbe de Catmull-Rom les pousse dehors)
  return courbe(rdp(chaine, 0.15), true).replace(/-?\d*\.?\d+/g, (n) => String(Math.min(48, Math.max(0, +n))));
}

const DEFS: Record<IdEchantillon, () => Partie[]> = {
  // Gros plan de l'hallux incarné (bord latéral gonflé, géométrie validée de la bibliothèque) ; lame dont le bord latéral plonge sous
  // le repli ; pastille : le repli inflammé, ENTRE la lame et la peau (jamais sur la lame, jamais une cible)
  'ongle-incarne': () => {
    const h = hallux(true);
    const [a, b] = [h.t(53.6, 26), h.t(53.4, 60)];
    const repli = `M${r1(a[0])} ${r1(a[1])}C${r1(a[0] + 6.4)} ${r1(a[1] + 3)} ${r1(b[0] + 6.4)} ${r1(b[1] - 6)} ${r1(b[0])} ${r1(b[1])}C${r1(b[0] + 2.4)} ${r1(b[1] - 7)} ${r1(a[0] + 2.4)} ${r1(a[1] + 5)} ${r1(a[0])} ${r1(a[1])}Z`;
    return [masse(h.peau), creux(h.lame), point(repli, { c: 'encre-douce' })];
  },
  // Semelle (contour ÉcranZen, L/l ≈ 2,6) et soutien de voûte (élément de la semelle) côté interne
  'semelle-orthopedique': () => {
    const t = placer(40 / 227.6, [49, 107.9], [24, 24]);
    return [masse(simplifier(SEMELLE, t, 0.3)), point(simplifier(SEMELLE_ELEMENTS.voute, t, 0.3), { c: 'decoupe' })];
  },
  // Test au monofilament : profil (pied gauche côté interne), filament perpendiculaire à la plante sous la tête de M1, plié en UN C
  // bombé vers les orteils, HORS de la peau ; manche dessous (pastille)
  monofilament: () => {
    const p = O.profil(38, [4, 30], { haut: 0 });
    const x = 31.2;
    return [
      masse(p.trait), ligne(p.malleole, { c: 'decoupe' }),
      ligne(`M${x} 38.6C${x + 2} 36.4 ${x + 2} 33.2 ${x} 31.2`, { c: 'encre' }),
      point(rect(x - 2.2, 38.6, 4.4, 7.6, 1.8), { c: 'encre' }),
    ];
  },
  // Adulte face à enfant (comparaison voulue et aimée) : grande plante et plante de tout-petit (voûte comblée), orteils en pastilles
  'premiers-pas': () => {
    const ad = planteDessous(38, [16.5, 24]);
    const en = planteDessous(21, [35.5, 32.5], { enfant: true });
    return [masse(ad.contour, { c: 'forme' }), point(ad.orteils, { c: 'forme' }), masse(en.contour), point(en.orteils, { c: 'forme' })];
  },
  // Pied de profil (jambe hors cadre) et canne à crosse, embout au sol un peu en avant des orteils (pastille)
  'senior-canne': () => {
    const p = O.profil(30, [3, 43]);
    return [
      masse(p.trait), ligne(p.malleole, { c: 'decoupe' }),
      ligne('M34.6 10.8C34.6 6.2 41.6 6.2 41.6 10.8V40.2', { c: 'encre' }),
      point(rect(39.6, 40.2, 4, 3.6, 1.4), { c: 'encre' }),
    ];
  },
  // Chaussure de course inclinée en propulsion (géométrie CHAUSSURE), fenêtre d'amorti (pastille), deux lignes de vitesse
  'sport-course': () => {
    const t = placer(0.42, [52, 28], [25.5, 26], { rot: 0 });
    const tige = simplifier(CHAUSSURE.tige, t, 0.3);
    const semelle = simplifier(CHAUSSURE.semelle, t, 0.3);
    return [
      masse(tige), masse(semelle, { c: 'forme' }),
      point(simplifier(CHAUSSURE.fenetre, t, 0.25), { c: 'decoupe' }),
      ligne('M3.5 20.5H9M5 26.5H10', { c: 'encre' }),
    ];
  },
  // Podoscope de côté : caisson, vitre, pied posé dessus ; sur la face avant, le reflet de la plante (pastille couchée)
  podoscope: () => {
    const p = O.profil(27, [7.5, 26.5], { haut: 0 });
    const reflet = planteDessous(20, [24, 35.5], { rot: -90 });
    return [
      masse(p.trait, { c: 'forme' }), ligne(p.malleole, { c: 'decoupe' }),
      masse(rect(4.5, 26.5, 39, 17, 2.4)),
      ligne('M4.5 26.5H43.5', { c: 'decoupe', seul: ['c'] }),
      point(reflet.contour, { c: 'decoupe' }),
    ];
  },
  // Plante vue de dessous (5 orteils) ; verrue sous la tête du 1er métatarsien : pastille et ses points noirs (découpes en C)
  'verrue-plantaire': () => {
    const pl = planteDessous(40, [24, 24]);
    const [vx, vy] = [27.4, 20];
    return [
      masse(pl.contour), point(pl.orteils, { c: 'forme' }),
      point(cercle(vx, vy, 2.9), { c: 'encre' }),
    ];
  },
  // Autoclave : caisson, porte ronde avec ses plateaux et sa poignée (sinon « machine à laver »), écran ; voyant de cycle (pastille)
  'hygiene-autoclave': () => [
    masse(rect(4.5, 11, 39, 27, 3)),
    ligne('M9 38V41.5M39 38V41.5', { c: 'encre' }),
    ligne(cercle(18.5, 24.5, 8.2), { c: 'decoupe' }),
    ligne('M12.2 28.2H24.8', { c: 'decoupe' }),
    ligne(rect(14.2, 22.6, 8.2, 5.6, 1.2), { c: 'decoupe' }),
    ligne('M28.4 20.4V28.6', { c: 'decoupe' }),
    ligne(rect(32.5, 16, 7, 4.5, 1.2), { c: 'decoupe' }),
    point(cercle(36, 29, 2), { c: 'encre' }),
  ],
  // Horloge : cadran, aiguilles (sans chiffres), centre en pastille
  horaires: () => [
    masse(cercle(24, 24, 19)),
    ligne('M24 12.5V24L31 28.5', { c: 'decoupe' }),
    point(cercle(24, 24, 2.4), { c: 'encre' }),
  ],
  // Voiture vue de face (sans lettre « P ») : caisse, pare-brise, rétroviseurs, roues ; phares en pastilles
  stationnement: () => [
    masse('M10.8 21.5L13.6 12.6C14.2 10.6 16 9.5 18 9.5H30C32 9.5 33.8 10.6 34.4 12.6L37.2 21.5C39.6 22.4 41.5 24.6 41.5 27.5V34.5C41.5 35.6 40.6 36.5 39.5 36.5H8.5C7.4 36.5 6.5 35.6 6.5 34.5V27.5C6.5 24.6 8.4 22.4 10.8 21.5Z'),
    ligne('M11 21.5H37', { c: 'decoupe' }),
    ligne('M10 36.5V40.5C10 41.6 10.9 42.5 12 42.5H14C15.1 42.5 16 41.6 16 40.5V36.5M32 36.5V40.5C32 41.6 32.9 42.5 34 42.5H36C37.1 42.5 38 41.6 38 40.5V36.5', { c: 'encre' }),
    ligne('M8.6 17.5H5.6M39.4 17.5H42.4', { c: 'encre' }),
    point(`${cercle(13.4, 28.6, 2.4)}${cercle(34.6, 28.6, 2.4)}`, { c: 'decoupe' }),
  ],
  // Maison et plante du pied, centrée et assez grande, loin du sol ; toit en chevron
  'soins-domicile': () => {
    const pl = planteDessous(21, [24, 28.6]);
    return [
      masse('M6 21.4L24 6.5L42 21.4M10 18.2L10 41.5C10 42.6 10.9 43.5 12 43.5L36 43.5C37.1 43.5 38 42.6 38 41.5L38 18.2', { c: 'forme' }),
      masse(pl.contour, { c: 'decoupe' }), point(pl.orteils, { c: 'decoupe' }),
    ];
  },
};

// ———————————————————————————————————————————————————— Mise à l'échelle des tracés

/** Multiplie un tracé SVG (commandes absolues et relatives, arcs compris) par `k`, puis le décale de (dx, dy) */
export function echelleTrace(d: string, k: number, dx = 0, dy = 0): string {
  const jetons = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let out = '', cmd = '', i = 0, n = 0;
  const f = (v: number) => String(+v.toFixed(2));
  while (i < jetons.length) {
    const j = jetons[i];
    if (/[A-Za-z]/.test(j)) { cmd = j; out += j; i++; n = 0; if (/[Zz]/.test(j)) continue; continue; }
    const abs = cmd === cmd.toUpperCase();
    const C = cmd.toUpperCase();
    const v = +j;
    let r: number;
    if (C === 'A') {
      const pos = n % 7;
      r = pos < 2 ? v * k : pos < 5 ? v : abs ? v * k + (pos === 5 ? dx : dy) : v * k;
    } else if (C === 'H') r = abs ? v * k + dx : v * k;
    else if (C === 'V') r = abs ? v * k + dy : v * k;
    else r = abs ? v * k + (n % 2 === 0 ? dx : dy) : v * k;
    out += (out && /[\d.]$/.test(out) ? ' ' : '') + f(r);
    n++; i++;
  }
  return out;
}

// ———————————————————————————————————————————————————— Rendu

/** Couleur d'accent (variable de la charte, jamais de valeur littérale) */
export const ACCENT_DIRECTION = 'var(--picto-accent,var(--accent,currentColor))';
/** Fond derrière le picto (découpes de la direction C) */
export const FOND_DIRECTION = 'var(--picto-fond,var(--fond,transparent))';

export type OptionsDirection = {
  /** Taille d'affichage en px (règle l'épaisseur optique) ; défaut : taille nominale de la direction */
  taille?: number;
  /** Largeur / hauteur de l'élément (défaut : `taille` px) ; « 100% » dans les tuiles */
  largeur?: string;
  /** Accent (défaut vrai) ; sinon tout en currentColor */
  accent?: boolean;
  titre?: string;
  classe?: string;
};

/** Épaisseur du trait en px pour une taille d'affichage (interpolation dans la table optique de la direction) */
export function traitOptique(d: DirectionPicto, taille: number): number {
  const t = FICHES_DIRECTIONS[d].traitPx;
  const ks = Object.keys(t).map(Number).sort((a, b) => a - b);
  if (taille <= ks[0]) return t[ks[0]];
  for (let i = 1; i < ks.length; i++) if (taille <= ks[i]) { const [a, b] = [ks[i - 1], ks[i]]; return +(t[a] + ((taille - a) / (b - a)) * (t[b] - t[a])).toFixed(3); }
  return t[ks[ks.length - 1]];
}

/** Épaisseur en unités de la grille de la direction pour une taille d'affichage */
export const traitDirection = (d: DirectionPicto, taille: number) => +((traitOptique(d, taille) * FICHES_DIRECTIONS[d].grille) / taille).toFixed(3);

const memo = new Map<string, Partie[]>();
const partiesDe = (id: IdEchantillon) => { let p = memo.get(id); if (!p) { p = DEFS[id](); memo.set(id, p); } return p; };

/** Corps (éléments <path>) d'un picto dans une direction, dans la grille de la direction */
function corps(id: IdEchantillon, d: DirectionPicto, accent: boolean, traitU: number): string {
  const parts = partiesDe(id).filter((p) => !p.seul || p.seul.includes(d));
  const acc = (prop: 'fill' | 'stroke') => (accent ? ` style="${prop}:${ACCENT_DIRECTION}"` : '');
  if (d !== 'c') {
    const k = 0.5;
    return parts.map((p) => {
      const t = echelleTrace(p.d, k);
      if (p.role === 'point') return `<path d="${t}" fill="currentColor" stroke="none"${acc('fill')}/>`;
      // B : la masse est d'abord remplie d'une teinte claire de l'accent, puis tracée
      if (p.role === 'masse' && d === 'b') return `<path d="${echelleTrace(surfacePicto(p.d), k)}" fill="currentColor" fill-opacity="0.2" stroke="none"${acc('fill')}/><path d="${t}"/>`;
      return `<path d="${t}"/>`;
    }).join('');
  }
  // C : grille 64, sans contour ; médaillon, masses en aplat d'accent (découpes en pair-impair), encre, découpes au fond
  const k = 4 / 3, dx = 0, dy = 0;
  const T = (s: string) => echelleTrace(s, k, dx, dy);
  const out: string[] = [`<circle cx="32" cy="32" r="31" fill="currentColor" fill-opacity="${accent ? 0.14 : 0.08}" stroke="none"${acc('fill')}/>`];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const role = p.c ?? (p.role === 'masse' ? 'forme' : p.role === 'creux' ? 'decoupe' : p.role === 'point' ? 'encre' : 'decoupe');
    if (role === 'omis') continue;
    const ferme = /[Zz]\s*$/.test(p.d.trim()) || p.role === 'point';
    if (p.role === 'masse' && role === 'forme') {
      // creux qui suivent : percés dans la masse (pair-impair)
      let d = T(surfacePicto(p.d));
      while (parts[i + 1]?.role === 'creux') { d += T(parts[++i].d); }
      out.push(`<path d="${d}" fill="currentColor" fill-rule="evenodd" stroke="none"${acc('fill')}/>`);
      continue;
    }
    if (role === 'forme') { out.push(ferme ? `<path d="${T(p.d)}" fill="currentColor" stroke="none"${acc('fill')}/>` : `<path d="${T(p.d)}"${acc('stroke')}/>`); continue; }
    if (role === 'encre-douce') { out.push(`<path d="${T(p.d)}" fill="currentColor" fill-opacity="0.5" stroke="none"/>`); continue; }
    if (role === 'encre') { out.push(ferme && p.role !== 'trait' ? `<path d="${T(p.d)}" fill="currentColor" stroke="none"/>` : `<path d="${T(p.d)}"/>`); continue; }
    // découpe : le fond traverse (plein ou trait couleur du fond)
    out.push(ferme && p.role !== 'trait' ? `<path d="${T(p.d)}" fill="currentColor" stroke="none" style="fill:${FOND_DIRECTION}"/>` : `<path d="${T(p.d)}" style="stroke:${FOND_DIRECTION}"/>`);
  }
  return out.join('');
}

/** SVG en ligne d'un picto de l'échantillon dans une direction, ou null si l'id n'est pas dans l'échantillon */
export function svgPictoDirection(id: string, d: DirectionPicto, opts: OptionsDirection = {}): string | null {
  if (!(ECHANTILLON_DIRECTIONS as readonly string[]).includes(id) || !estDirectionPicto(d)) return null;
  const f = FICHES_DIRECTIONS[d];
  const taille = opts.taille ?? f.tailleNominale;
  const traitU = traitDirection(d, taille);
  const l = opts.largeur ?? `${taille}`;
  const echappe = (s: string) => s.replace(/[<&>"]/g, '');
  const a11y = opts.titre ? ` role="img" aria-label="${echappe(opts.titre)}"` : ' aria-hidden="true"';
  const titre = opts.titre ? `<title>${echappe(opts.titre)}</title>` : '';
  const classe = ['picto', `picto--direction-${d}`, opts.classe].filter(Boolean).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f.grille} ${f.grille}" width="${l}" height="${l}" fill="none" stroke="currentColor" stroke-width="${traitU}" stroke-linecap="round" stroke-linejoin="round" class="${classe}" focusable="false"${a11y}>${titre}${corps(id as IdEchantillon, d, opts.accent !== false, traitU)}</svg>`;
}

// ———————————————————————————————————————————————————— Couleurs sûres (accent jamais invisible)

export type FondPicto = 'blanc' | 'teinte' | 'sombre';
export const FONDS_PICTO: readonly FondPicto[] = ['blanc', 'teinte', 'sombre'];
/** Seuil de contraste des pictos (WCAG 1.4.11, composants graphiques) */
export const CONTRASTE_PICTO = 3;

/** Couleur du fond d'un type de fond dans une gamme : blanc (fond de page), teinté (aplat / accent pâle), sombre (plan) */
export function fondPicto(g: Gamme, f: FondPicto): string {
  if (f === 'blanc') return g.fond;
  if (f === 'sombre') return g.plan;
  return g.aplat ?? melanger(g.accent, NEUTRES.blanc, 0.78);
}

/**
 * Couleurs d'un picto sur un fond : trait (encre ou blanc, le plus lisible) et accent — l'accent de la gamme s'il atteint 3:1 contre
 * le fond, sinon la première variante qui l'atteint (accent foncé, vif, duo, signal, accent éclairci), à défaut le trait lui-même.
 * C'est la réponse au « sur fond vert, on ne voit pas le pied » : jamais un accent sous 3:1.
 */
export function couleursPictoSur(g: Gamme, f: FondPicto): { fond: string; trait: string; accent: string; contrasteAccent: number; varianteAccent: boolean } {
  const fond = fondPicto(g, f);
  const encre = g.encre ?? NEUTRES.encre;
  const trait = contraste(encre, fond) >= contraste(NEUTRES.blanc, fond) ? encre : NEUTRES.blanc;
  const candidats = f === 'sombre'
    ? [g.signal, g.vif, g.duo, melanger(g.accent, NEUTRES.blanc, 0.55), melanger(g.accent, NEUTRES.blanc, 0.7)]
    : [g.accent, g.accentFonce, g.duo, g.vif, melanger(g.accentFonce, NEUTRES.nuit, 0.4)];
  const ok = candidats.filter((c): c is string => Boolean(c)).find((c) => contraste(c, fond) >= CONTRASTE_PICTO);
  const accent = ok ?? trait;
  return { fond, trait, accent, contrasteAccent: +contraste(accent, fond).toFixed(2), varianteAccent: accent !== (f === 'sombre' ? g.signal : g.accent) };
}

/** Variables CSS à poser sur le conteneur d'un picto (couleur = trait, --picto-accent, --picto-fond) */
export function variablesPictoSur(g: Gamme, f: FondPicto): Record<string, string> {
  const c = couleursPictoSur(g, f);
  return { color: c.trait, '--picto-accent': c.accent, '--picto-fond': c.fond, background: c.fond };
}

// ———————————————————————————————————————————————————— Vues pour la notation (inventaire)

/** Picto seul pour une tuile de l'inventaire (taille nominale de la direction, épaisseur optique de cette taille) */
export const svgTuileDirection = (id: string, d: DirectionPicto) => svgPictoDirection(id, d, { taille: FICHES_DIRECTIONS[d].tailleNominale === 24 ? 48 : FICHES_DIRECTIONS[d].tailleNominale, largeur: '100%' }) ?? '';

/** Picto posé dans un SVG englobant (x, y, taille en unités de l'englobant = px nominaux) */
const pose = (id: IdEchantillon, d: DirectionPicto, x: number, y: number, t: number) =>
  (svgPictoDirection(id, d, { taille: t }) ?? '').replace('<svg xmlns="http://www.w3.org/2000/svg" ', `<svg x="${x}" y="${y}" `);
/** Ligne de texte simulée (barre grise : aucune lettre dans l'image) */
const barre = (x: number, y: number, l: number, h = 5, o = 0.18) => `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${h / 2}" fill="currentColor" fill-opacity="${o}"/>`;

/**
 * Planche « Style d'icônes » d'une direction, EN SITUATION (tuile de notation `picto:style-icones-<d>`) : cartes de soins de
 * l'accueil (ordinateur), infos pratiques (horaires, accès, domicile) et la même page sur téléphone. Textes simulés par des barres ;
 * couleurs : variables de la gamme (--fond, --doux, --accent), aucune couleur littérale.
 */
export function svgPlancheDirection(d: DirectionPicto): string {
  const soins: IdEchantillon[] = ['ongle-incarne', 'semelle-orthopedique', 'monofilament', 'premiers-pas', 'senior-canne', 'sport-course', 'podoscope', 'verrue-plantaire'];
  const infos: IdEchantillon[] = ['horaires', 'stationnement', 'soins-domicile', 'hygiene-autoclave'];
  const tc = d === 'c' ? 48 : 32;
  const fond = 'style="fill:var(--fond,transparent)"', doux = 'style="fill:var(--doux,var(--fond,transparent))"';
  const out: string[] = [];
  // Ordinateur : fenêtre
  out.push(`<rect x="8" y="8" width="452" height="384" rx="10" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>`);
  out.push(barre(24, 24, 150, 9, 0.5), barre(24, 40, 220, 5));
  soins.forEach((id, i) => {
    const x = 24 + (i % 4) * 108, y = 58 + Math.floor(i / 4) * 112;
    out.push(`<rect x="${x}" y="${y}" width="98" height="102" rx="8" ${fond} stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>`);
    out.push(pose(id, d, x + 12, y + 12, tc), barre(x + 12, y + 70, 64, 6, 0.45), barre(x + 12, y + 82, 50));
  });
  // Infos pratiques (bande douce)
  out.push(`<rect x="16" y="290" width="436" height="94" rx="8" ${doux}/>`);
  infos.forEach((id, i) => {
    const x = 28 + i * 106;
    out.push(pose(id, d, x, 304, d === 'c' ? 40 : 24), barre(x, 352, 70, 6, 0.45), barre(x, 364, 56));
  });
  // Téléphone
  out.push(`<rect x="480" y="8" width="152" height="384" rx="18" ${fond} stroke="currentColor" stroke-opacity="0.3" stroke-width="2"/>`);
  out.push(barre(494, 30, 90, 8, 0.5));
  soins.slice(0, 5).forEach((id, i) => {
    const y = 50 + i * 50;
    out.push(`<rect x="490" y="${y}" width="132" height="44" rx="8" ${doux}/>`, pose(id, d, 496, y + (d === 'c' ? 2 : 10), d === 'c' ? 40 : 24), barre(d === 'c' ? 542 : 528, y + 15, 70, 6, 0.45), barre(d === 'c' ? 542 : 528, y + 26, 50));
  });
  infos.slice(0, 3).forEach((id, i) => out.push(pose(id, d, 494 + i * 44, 316, d === 'c' ? 40 : 24), barre(494 + i * 44, 362, 30, 4)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="100%" height="100%" fill="none" class="planche-direction planche-direction--${d}" aria-hidden="true" focusable="false">${out.join('')}</svg>`;
}
