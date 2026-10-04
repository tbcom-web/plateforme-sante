// Trame hexagonale de points, façon relevé de baropodométrie : chaque point de la plante est coloré
// et dimensionné selon la pression (bleu → vert d'eau → jaune → orange → rouge). Calculée au build,
// sans script côté navigateur. Pour rester léger, les points d'un même niveau forment un seul tracé
// (sous-chemins de longueur nulle à bouts ronds) : une dizaine de <path> par pied au lieu de centaines de cercles.
import { PLANTE, ORTEILS } from '../animations/pied';

/** Palette de pression de la marque, de la plus faible à la plus forte */
export const PRESSION = ['#3e7bfa', '#22c3a6', '#ffc23d', '#ff7a2f', '#f0352f'] as const;
const ARRETS = [0, 0.35, 0.6, 0.8, 1];

const rvb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Couleur de la palette continue pour une pression entre 0 et 1 */
export function couleurPression(v: number): string {
  const t = Math.max(0, Math.min(1, v));
  for (let k = 1; k < ARRETS.length; k++) {
    if (t <= ARRETS[k]) {
      const u = (t - ARRETS[k - 1]) / (ARRETS[k] - ARRETS[k - 1]);
      const [a, b] = [rvb(PRESSION[k - 1]), rvb(PRESSION[k])];
      return `#${a.map((c, i) => Math.round(c + (b[i] - c) * u).toString(16).padStart(2, '0')).join('')}`;
    }
  }
  return PRESSION[4];
}

/** Profils d'appui illustratifs (sans valeur de mesure) */
export type Appui = 'normal' | 'creux' | 'plat' | 'avant' | 'talon' | 'reparti' | 'enfant';

const g = (x: number, y: number, cx: number, cy: number, s: number) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));

function dansPlante(x: number, y: number): boolean {
  let dedans = false;
  for (let i = 0, j = PLANTE.length - 1; i < PLANTE.length; j = i++) {
    const [xi, yi] = PLANTE[i];
    const [xj, yj] = PLANTE[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans || ORTEILS.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
}

// Creusement de la voûte interne (zone sans contact au sol), en unités du repère du pied.
const VOUTE: Record<Appui, number> = { normal: 20, creux: 34, plat: 0, avant: 20, talon: 22, reparti: 16, enfant: 6 };

/** Pression illustrative en un point du pied droit (repère 92 × 222) : 0 = pas de contact */
export function pression(appui: Appui, x: number, y: number): number {
  if (y > 90 && y < 166 && x < 30 + VOUTE[appui] * Math.sin(((y - 90) / 76) * Math.PI)) return 0;
  const orteil = y < 36;
  let v: number;
  switch (appui) {
    case 'creux':
      v = 0.1 + 1.0 * g(x, y, 47, 197, 13) + 0.95 * g(x, y, 32, 60, 10) + 0.7 * g(x, y, 52, 53, 9) + 0.5 * g(x, y, 27, 16, 7) + 0.2 * g(x, y, 72, 120, 9);
      break;
    case 'plat':
      v = 0.3 + 0.5 * g(x, y, 47, 194, 18) + 0.4 * g(x, y, 40, 60, 14) + 0.3 * g(x, y, 34, 124, 18);
      break;
    case 'avant':
      v = 0.12 + 0.5 * g(x, y, 47, 194, 15) + 1.0 * g(x, y, 32, 60, 10) + 0.9 * g(x, y, 52, 52, 10) + 0.6 * g(x, y, 27, 16, 7);
      break;
    case 'talon':
      v = 0.14 + 1.05 * g(x, y, 47, 198, 11) + 0.45 * g(x, y, 40, 60, 14) + 0.2 * g(x, y, 70, 130, 12);
      break;
    case 'reparti':
      v = Math.min(0.56, 0.36 + 0.1 * g(x, y, 47, 194, 30) + 0.08 * g(x, y, 45, 60, 28) + Math.sin(x * 0.4 + y * 0.23) * 0.03);
      break;
    case 'enfant':
      v = 0.24 + 0.4 * g(x, y, 47, 194, 20) + 0.32 * g(x, y, 42, 60, 18);
      break;
    default:
      v = 0.13 + 0.9 * g(x, y, 47, 194, 15) + 0.75 * g(x, y, 30, 62, 11) + 0.6 * g(x, y, 50, 54, 10) + 0.45 * g(x, y, 68, 64, 10) + 0.55 * g(x, y, 27, 16, 7) + 0.25 * g(x, y, 70, 130, 14);
  }
  if (orteil) v = Math.max(v, 0.3);
  return Math.max(0.04, Math.min(1, v));
}

export type NiveauTrame = { k: number; couleur: string; epaisseur: number; d: string };

const NIVEAUX = 9;
const memo = new Map<string, NiveauTrame[]>();

/**
 * Points de la trame regroupés par niveau de pression. `pas` : écart entre deux points (repère du pied).
 * Rendu : <path d stroke={couleur} stroke-width={epaisseur} stroke-linecap="round" />.
 */
export function trame(appui: Appui = 'normal', pas = 6.2): NiveauTrame[] {
  const cle = `${appui}-${pas}`;
  const deja = memo.get(cle);
  if (deja) return deja;
  const traces: string[] = Array.from({ length: NIVEAUX }, () => '');
  for (let rang = 0, y = 3; y <= 221; rang++, y += pas * 0.866) {
    for (let x = 6 + (rang % 2 ? pas / 2 : 0); x <= 88; x += pas) {
      if (!dansPlante(x, y)) continue;
      const v = pression(appui, x, y);
      if (v <= 0) continue;
      const k = Math.min(NIVEAUX - 1, Math.floor(v * NIVEAUX));
      traces[k] += `M${x.toFixed(1)} ${y.toFixed(1)}h0`;
    }
  }
  const niveaux = traces
    .map((d, k) => {
      const v = (k + 0.5) / NIVEAUX;
      return { k, couleur: couleurPression(v), epaisseur: +(pas * (0.3 + 0.5 * v)).toFixed(2), d };
    })
    .filter((n) => n.d);
  memo.set(cle, niveaux);
  return niveaux;
}
