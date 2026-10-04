// Trame hexagonale de points, façon relevé de baropodométrie : chaque point de la plante est coloré
// et dimensionné selon la pression (bleu → vert d'eau → jaune → orange → rouge). Calculée au build,
// sans script côté navigateur. Pour rester léger, les points d'un même niveau forment un seul tracé
// (sous-chemins de longueur nulle à bouts ronds) : une dizaine de <path> par pied au lieu de centaines de cercles.
// Palette, pas de la trame et diamètres des points viennent de la charte. Source unique, partagée par les
// dessins du site (apps/sites, via components/dessins/trame.ts) et par les marques du logo (logos.ts).
import { PLANTE, CONTOUR_PIED, EMPREINTE, dansEmpreinte, dansPulpe, dansPolygone, lisser, type P } from './pied';
import { TRAME } from './charte';
import { PRESSION, couleurPression } from './univers';

/** Palette de pression (univers podologie de la charte), réexportée pour les composants */
export { PRESSION, couleurPression };

/** Profils d'appui illustratifs (sans valeur de mesure) */
export type Appui = 'normal' | 'creux' | 'plat' | 'avant' | 'talon' | 'reparti' | 'enfant';

const g = (x: number, y: number, cx: number, cy: number, s: number) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));

/** Le point (repère du pied 92 × 222) est-il sur le pied réel (plante ou orteil, CONTOUR_PIED) ? */
export function dansPlante(x: number, y: number): boolean {
  return dansPolygone(PLANTE, x, y) || CONTOUR_PIED.polygonesOrteils.some((o) => dansPolygone(o, x, y));
}

// Repères de l'empreinte (atome POD-SC-0007 / POD-AT-0002) : talon, têtes métatarsiennes (MTP), bord externe, pulpes.
const [M1, M2, M3, M4, M5] = CONTOUR_PIED.mtp;
const HALLUX = EMPREINTE.pulpes[0];
/** Contact au sol selon le profil d'appui : trace d'appui réelle (normal), bande externe interrompue (creux), plante entière (plat, enfant) */
function contact(appui: Appui, x: number, y: number): boolean {
  if (appui === 'plat' || appui === 'enfant') return dansPolygone(PLANTE, x, y) || dansPulpe(x, y);
  if (appui === 'creux') return dansEmpreinte(x, y) && !(y > 104 && y < 168);
  return dansEmpreinte(x, y);
}

/** Pression illustrative en un point du pied droit (repère 92 × 222) : 0 = pas de contact (voûte, hors empreinte) */
export function pression(appui: Appui, x: number, y: number): number {
  if (!contact(appui, x, y)) return 0;
  const orteil = dansPulpe(x, y);
  const T = (s: number) => g(x, y, 48, 198, s);
  const tete = (m: P, s: number) => g(x, y, m[0], m[1] + 6, s);
  let v: number;
  switch (appui) {
    case 'creux':
      v = 0.1 + 1.0 * T(13) + 0.95 * tete(M1, 10) + 0.7 * tete(M2, 9) + 0.5 * g(x, y, HALLUX[0], HALLUX[1], 7) + 0.2 * g(x, y, 78, 132, 9);
      break;
    case 'plat':
      v = 0.3 + 0.5 * T(18) + 0.4 * tete(M2, 14) + 0.3 * g(x, y, 30, 140, 18);
      break;
    case 'avant':
      v = 0.12 + 0.5 * T(15) + 1.0 * tete(M1, 10) + 0.9 * tete(M2, 10) + 0.6 * g(x, y, HALLUX[0], HALLUX[1], 7);
      break;
    case 'talon':
      v = 0.14 + 1.05 * T(11) + 0.45 * tete(M2, 14) + 0.2 * g(x, y, 76, 132, 12);
      break;
    case 'reparti':
      v = Math.min(0.56, 0.36 + 0.1 * T(30) + 0.08 * tete(M2, 28) + Math.sin(x * 0.4 + y * 0.23) * 0.03);
      break;
    case 'enfant':
      v = 0.24 + 0.4 * T(20) + 0.32 * tete(M2, 18);
      break;
    default:
      v = 0.13 + 0.9 * T(15) + 0.75 * tete(M1, 11) + 0.6 * tete(M2, 10) + 0.5 * tete(M3, 10) + 0.4 * tete(M4, 9) + 0.35 * tete(M5, 9) + 0.55 * g(x, y, HALLUX[0], HALLUX[1], 7) + 0.25 * g(x, y, 78, 132, 14);
  }
  if (orteil) v = Math.max(v, 0.3);
  return Math.max(0.04, Math.min(1, v));
}

export type NiveauTrame = { k: number; couleur: string; epaisseur: number; d: string };
/** Point de la trame (repère du pied 92 × 222) et sa valeur de pression (0 = pas de contact) */
export type PointTrame = { x: number; y: number; v: number };
/** Champ de pression : profil illustratif nommé, ou fonction (x, y) → 0..1 dans le repère du pied droit */
export type Champ = Appui | ((x: number, y: number) => number);

const NIVEAUX = TRAME.niveaux;
const memo = new Map<string, NiveauTrame[]>();

/**
 * Points de la trame hexagonale posés sur la plante, avec leur pression (les points sans contact sont omis).
 * `dedans` : forme du pied (par défaut le pied réel adulte ; le contact est ensuite décidé par le champ : empreinte).
 */
export function pointsTrame(champ: Champ = 'normal', pas: number = TRAME.pas, dedans: (x: number, y: number) => boolean = dansPlante): PointTrame[] {
  const f = typeof champ === 'function' ? champ : (x: number, y: number) => pression(champ, x, y);
  const points: PointTrame[] = [];
  for (let rang = 0, y = 3; y <= 221; rang++, y += pas * 0.866) {
    for (let x = 6 + (rang % 2 ? pas / 2 : 0); x <= 92; x += pas) {
      if (!dedans(x, y)) continue;
      const v = f(x, y);
      if (v > 0) points.push({ x: +x.toFixed(1), y: +y.toFixed(1), v: Math.min(1, v) });
    }
  }
  return points;
}

/** Niveau (0 à TRAME.niveaux − 1), couleur et épaisseur des points d'une valeur v */
export const niveauTrame = (v: number, pas: number = TRAME.pas) => {
  const k = Math.min(NIVEAUX - 1, Math.floor(v * NIVEAUX));
  const m = (k + 0.5) / NIVEAUX;
  return { k, couleur: couleurPression(m), epaisseur: +(pas * (TRAME.diametre.min + (TRAME.diametre.max - TRAME.diametre.min) * m)).toFixed(2) };
};

/**
 * Regroupe des points en tracés : un tracé par niveau de pression, et par groupe si `groupe` est donné
 * (par exemple une bande, du talon vers les orteils, pour une apparition progressive). Trié par groupe
 * puis par niveau. Rendu : <path d stroke={couleur} stroke-width={epaisseur} stroke-linecap="round" />.
 */
export function grouperTrame(points: PointTrame[], pas: number = TRAME.pas, groupe: (p: PointTrame) => number = () => 0): (NiveauTrame & { g: number })[] {
  const traces = new Map<string, { g: number; k: number; d: string }>();
  for (const p of points) {
    const { k } = niveauTrame(p.v, pas);
    const g = groupe(p);
    const cle = `${g}-${k}`;
    const t = traces.get(cle) ?? { g, k, d: '' };
    t.d += `M${p.x} ${p.y}h0`;
    traces.set(cle, t);
  }
  return [...traces.values()]
    .sort((a, b) => a.g - b.g || a.k - b.k)
    .map(({ g, k, d }) => ({ g, ...niveauTrame((k + 0.5) / NIVEAUX, pas), d }));
}

/**
 * Points de la trame regroupés par niveau de pression. `pas` : écart entre deux points (repère du pied).
 * Rendu : <path d stroke={couleur} stroke-width={epaisseur} stroke-linecap="round" />.
 */
export function trame(appui: Appui = 'normal', pas: number = TRAME.pas): NiveauTrame[] {
  const cle = `${appui}-${pas}`;
  const deja = memo.get(cle);
  if (deja) return deja;
  const niveaux = grouperTrame(pointsTrame(appui, pas), pas).map(({ k, couleur, epaisseur, d }) => ({ k, couleur, epaisseur, d }));
  memo.set(cle, niveaux);
  return niveaux;
}

// ———————————————————————————————————————————————————— Courbes de niveau

/**
 * Courbes de niveau (iso-lignes) d'un champ dans le repère du pied (92 × 222), par la méthode des carrés
 * marchants : pour chaque seuil, les boucles fermées où le champ vaut ce seuil, lissées (Catmull-Rom).
 * Le champ doit être nul au bord du repère pour que toutes les courbes se referment.
 * `maille` : pas de la grille de calcul (unités du pied) ; `min` : longueur minimale d'une boucle ;
 * `allege` : un point sur `allege` est gardé avant lissage (poids du tracé).
 */
export function isolignes(champ: (x: number, y: number) => number, seuils: readonly number[], maille = 2, min = 6, allege = 2): { seuil: number; boucles: string[] }[] {
  const nx = Math.ceil(96 / maille), ny = Math.ceil(226 / maille);
  const X = (i: number) => -2 + i * maille, Y = (j: number) => -2 + j * maille;
  const v: number[][] = Array.from({ length: nx + 1 }, (_, i) => Array.from({ length: ny + 1 }, (_, j) => champ(X(i), Y(j))));
  return seuils.map((s) => {
    // Segments de chaque case : extrémités repérées par l'arête traversée (clé stable)
    const point = (i1: number, j1: number, i2: number, j2: number): [string, P] => {
      const a = v[i1][j1], b = v[i2][j2], t = (s - a) / (b - a);
      return [`${i1},${j1},${i2},${j2}`, [X(i1) + (X(i2) - X(i1)) * t, Y(j1) + (Y(j2) - Y(j1)) * t]];
    };
    const voisins = new Map<string, string[]>();
    const coords = new Map<string, P>();
    const lier = (a: [string, P], b: [string, P]) => {
      coords.set(a[0], a[1]); coords.set(b[0], b[1]);
      voisins.set(a[0], [...(voisins.get(a[0]) ?? []), b[0]]);
      voisins.set(b[0], [...(voisins.get(b[0]) ?? []), a[0]]);
    };
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const c = (v[i][j] > s ? 8 : 0) | (v[i + 1][j] > s ? 4 : 0) | (v[i + 1][j + 1] > s ? 2 : 0) | (v[i][j + 1] > s ? 1 : 0);
        if (c === 0 || c === 15) continue;
        const haut = () => point(i, j, i + 1, j), droite = () => point(i + 1, j, i + 1, j + 1);
        const bas = () => point(i, j + 1, i + 1, j + 1), gauche = () => point(i, j, i, j + 1);
        const cas: Record<number, [() => [string, P], () => [string, P]][]> = {
          1: [[gauche, bas]], 2: [[bas, droite]], 3: [[gauche, droite]], 4: [[haut, droite]], 5: [[gauche, haut], [bas, droite]],
          6: [[haut, bas]], 7: [[gauche, haut]], 8: [[gauche, haut]], 9: [[haut, bas]], 10: [[gauche, bas], [haut, droite]],
          11: [[haut, droite]], 12: [[gauche, droite]], 13: [[bas, droite]], 14: [[gauche, bas]],
        };
        for (const [a, b] of cas[c]) lier(a(), b());
      }
    }
    // Chaînage des segments en boucles
    const vus = new Set<string>();
    const boucles: string[] = [];
    for (const depart of voisins.keys()) {
      if (vus.has(depart)) continue;
      const chaine: P[] = [];
      let cle: string | undefined = depart, prec = '';
      while (cle && !vus.has(cle)) {
        vus.add(cle);
        chaine.push(coords.get(cle)!);
        const suivant: string | undefined = (voisins.get(cle) ?? []).find((n) => n !== prec && !vus.has(n));
        prec = cle;
        cle = suivant;
      }
      if (chaine.length < min) continue;
      // Allègement : un point sur `allege`, arrondi au dixième, puis lissage
      const pts = chaine.filter((_, k) => k % allege === 0).map(([x, y]) => [+x.toFixed(1), +y.toFixed(1)] as P);
      boucles.push(lisser(pts));
    }
    return { seuil: s, boucles };
  });
}
