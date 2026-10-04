// Outils de couleur partagés par la charte, les univers métier et les gammes : conversions,
// interpolation dans une palette, luminance et contraste (WCAG 2.x).

export type Rvb = [number, number, number];

/** Conversion #rgb ou #rrggbb → [r, v, b] */
export const rvb = (h: string): Rvb => {
  const brut = h.replace('#', '');
  const plein = brut.length === 3 ? [...brut].map((c) => c + c).join('') : brut;
  const n = parseInt(plein, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Conversion [r, v, b] → #rrggbb */
export const hex = (c: readonly number[]) =>
  `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

/** Mélange de deux couleurs #rrggbb (t = part de b) */
export const melanger = (a: string, b: string, t: number) => {
  const [x, y] = [rvb(a), rvb(b)];
  return hex(x.map((c, i) => c + (y[i] - c) * t));
};

/**
 * Interpolation linéaire dans une palette à arrêts (valeur entre 0 et 1). Base des palettes de données
 * des univers métier (pression pour la podologie). Retourne #rrggbb.
 */
export function interpoler(palette: readonly string[], arrets: readonly number[], v: number): string {
  const t = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
  for (let k = 1; k < arrets.length; k++) {
    if (t <= arrets[k]) {
      const u = (t - arrets[k - 1]) / (arrets[k] - arrets[k - 1] || 1);
      return melanger(palette[k - 1], palette[k], u);
    }
  }
  return palette[palette.length - 1];
}

const canal = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
/** Luminance relative (WCAG) */
export const luminance = (h: string) => {
  const [r, v, b] = rvb(h);
  return 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
};
/** Rapport de contraste entre deux couleurs (1 à 21) */
export const contraste = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** Contraste AA : 4,5:1 pour le texte courant, 3:1 pour les grands textes et éléments graphiques */
export const contrasteAA = (texte: string, fond: string, grand = false) => contraste(texte, fond) >= (grand ? 3 : 4.5);

/** Distance perceptive approchée entre deux couleurs (« redmean ») */
export function distance(a: string, b: string) {
  const [x, y] = [rvb(a), rvb(b)];
  const r = (x[0] + y[0]) / 2;
  const [dr, dv, db] = [x[0] - y[0], x[1] - y[1], x[2] - y[2]];
  return Math.sqrt((2 + r / 256) * dr * dr + 4 * dv * dv + (2 + (255 - r) / 256) * db * db);
}
