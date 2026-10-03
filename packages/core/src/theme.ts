// Calcule la palette du site à partir d'une seule couleur choisie par le praticien,
// en garantissant un contraste AA (4,5:1) pour les textes et boutons.

type Rgb = [number, number, number];

const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as Rgb;

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

export function buildTheme(couleur: string) {
  const brand = hexToRgb(couleur);

  // Version foncée lisible sur fond blanc (liens, boutons avec texte blanc).
  let ink = brand;
  for (let i = 0; i < 30 && contrast(ink, WHITE) < 4.6; i++) ink = mix(ink, BLACK, 0.06);

  return {
    '--brand': toHex(brand),
    '--brand-ink': toHex(ink),
    '--brand-deep': toHex(mix(ink, BLACK, 0.35)),
    '--brand-soft': toHex(mix(brand, WHITE, 0.88)),
    '--brand-softer': toHex(mix(brand, WHITE, 0.94)),
    '--brand-line': toHex(mix(brand, WHITE, 0.7)),
  };
}

export const themeStyle = (couleur: string) =>
  Object.entries(buildTheme(couleur))
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
