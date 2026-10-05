// Studio portrait : opérations sur les pixels (tableaux typés, sans DOM), exécutées dans le navigateur de l'admin.
// Flou par boîtes (séparable, O(n)), filtre guidé pour épouser les contours (cheveux), nettoyage des couleurs du bord
// (le fond d'origine ne « bave » pas sur le nouveau fond), statistiques et application de la retouche, réduction de bruit
// et netteté légères. Aucune modification des traits : pas de lissage de peau, pas de déformation.
import { courbeRetouche, type MesuresMasque, type Rect, type Retouche, type StatsPhoto } from '@plateforme/core/portrait';

/** Flou par boîte (moyenne sur (2r+1)², bords répliqués), séparable : un passage horizontal puis vertical. */
export function flouBoite(src: Float32Array, l: number, h: number, r: number): Float32Array {
  const rr = Math.max(0, Math.round(r));
  if (rr === 0) return src.slice();
  const tmp = new Float32Array(l * h);
  const out = new Float32Array(l * h);
  const n = 2 * rr + 1;
  for (let y = 0; y < h; y++) {
    const o = y * l;
    let s = 0;
    for (let k = -rr; k <= rr; k++) s += src[o + Math.min(l - 1, Math.max(0, k))];
    for (let x = 0; x < l; x++) {
      tmp[o + x] = s / n;
      s += src[o + Math.min(l - 1, x + rr + 1)] - src[o + Math.max(0, x - rr)];
    }
  }
  for (let x = 0; x < l; x++) {
    let s = 0;
    for (let k = -rr; k <= rr; k++) s += tmp[Math.min(h - 1, Math.max(0, k)) * l + x];
    for (let y = 0; y < h; y++) {
      out[y * l + x] = s / n;
      s += tmp[Math.min(h - 1, y + rr + 1) * l + x] - tmp[Math.max(0, y - rr) * l + x];
    }
  }
  return out;
}

/** Niveaux de gris (0 à 1) d'une image RGBA */
export function niveauxGris(d: Uint8ClampedArray, l: number, h: number): Float32Array {
  const g = new Float32Array(l * h);
  for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = (0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]) / 255;
  return g;
}

/**
 * Filtre guidé (He, Sun, Tang) : le masque `p` prend les contours de l'image `guide` (mèches de cheveux, oreilles, col).
 * `r` : rayon en pixels, `eps` : régularisation (plus petit = suit davantage les contours).
 */
export function filtreGuide(p: Float32Array, guide: Float32Array, l: number, h: number, r: number, eps: number): Float32Array {
  const n = l * h;
  const II = new Float32Array(n), Ip = new Float32Array(n);
  for (let i = 0; i < n; i++) { II[i] = guide[i] * guide[i]; Ip[i] = guide[i] * p[i]; }
  const mI = flouBoite(guide, l, h, r), mp = flouBoite(p, l, h, r), mII = flouBoite(II, l, h, r), mIp = flouBoite(Ip, l, h, r);
  const a = II, b = Ip; // réutilisés
  for (let i = 0; i < n; i++) {
    const varI = mII[i] - mI[i] * mI[i];
    const cov = mIp[i] - mI[i] * mp[i];
    a[i] = cov / (varI + eps);
    b[i] = mp[i] - a[i] * mI[i];
  }
  const ma = flouBoite(a, l, h, r), mb = flouBoite(b, l, h, r);
  const q = new Float32Array(n);
  for (let i = 0; i < n; i++) q[i] = ma[i] * guide[i] + mb[i];
  return q;
}

/**
 * Affinage du masque brut du détourage : filtre guidé sur l'image (contours, cheveux), courbe douce (bords nets sans
 * escalier) puis léger fondu du bord.
 */
export function affinerMasque(brut: Float32Array, guide: Float32Array, l: number, h: number): Float32Array {
  const cote = Math.max(l, h);
  const q = filtreGuide(brut, guide, l, h, Math.max(2, Math.round(cote * 0.008)), 1.5e-3);
  for (let i = 0; i < q.length; i++) {
    const x = Math.min(1, Math.max(0, (q[i] - 0.22) / 0.6));
    q[i] = x * x * (3 - 2 * x) * 0.6 + x * 0.4;
  }
  return flouBoite(q, l, h, Math.max(1, Math.round(cote / 900)));
}

/**
 * Personne détourée : RGBA dont les couleurs du bord sont « décontaminées » (la part du fond d'origine est retirée des
 * pixels semi-transparents), alpha = masque. Évite le liseré clair ou sombre autour des cheveux sur un nouveau fond.
 */
export function detourer(d: Uint8ClampedArray, alpha: Float32Array, l: number, h: number): Uint8ClampedArray {
  const n = l * h;
  const r = Math.max(4, Math.round(Math.max(l, h) * 0.03));
  const inv = new Float32Array(n);
  for (let i = 0; i < n; i++) inv[i] = 1 - alpha[i];
  const poids = flouBoite(inv, l, h, r);
  const fonds: Float32Array[] = [];
  for (let c = 0; c < 3; c++) {
    const v = new Float32Array(n);
    for (let i = 0; i < n; i++) v[i] = d[i * 4 + c] * inv[i];
    fonds.push(flouBoite(v, l, h, r));
  }
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const a = alpha[i];
    const p = i * 4;
    if (a >= 0.97 || a <= 0.02 || poids[i] < 1e-3) {
      out[p] = d[p]; out[p + 1] = d[p + 1]; out[p + 2] = d[p + 2];
    } else {
      // Équation du mélange : I = a·F + (1 − a)·B → F = (I − (1 − a)·B) / a (exacte quand le fond B est bien estimé)
      const k = Math.max(a, 0.04);
      for (let c = 0; c < 3; c++) {
        const fond = fonds[c][i] / poids[i];
        out[p + c] = (d[p + c] - (1 - a) * fond) / k;
      }
    }
    out[p + 3] = Math.round(a * 255);
  }
  return out;
}

/** Statistiques pour la retouche ; le sujet est la boîte du visage, sinon la silhouette (alpha > 0,5), sinon toute l'image. */
export function statsPhoto(d: Uint8ClampedArray, l: number, h: number, visage: Rect | null, alpha: Float32Array | null): StatsPhoto {
  const lum = new Array(256).fill(0);
  let sr = 0, sv = 0, sb = 0;
  let sujetS = 0, sujetN = 0;
  const x0 = visage ? Math.max(0, Math.floor(visage.x + visage.l * 0.2)) : 0, x1 = visage ? Math.min(l, Math.ceil(visage.x + visage.l * 0.8)) : 0;
  const y0 = visage ? Math.max(0, Math.floor(visage.y + visage.h * 0.25)) : 0, y1 = visage ? Math.min(h, Math.ceil(visage.y + visage.h * 0.85)) : 0;
  const n = l * h;
  const dansBoite = (i: number) => { const x = i % l, y = (i - x) / l; return x >= x0 && x < x1 && y >= y0 && y < y1; };
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const r = d[p], v = d[p + 1], b = d[p + 2];
    const y = 0.299 * r + 0.587 * v + 0.114 * b;
    lum[Math.min(255, Math.round(y))]++;
    sr += r; sv += v; sb += b;
    if (visage ? dansBoite(i) : alpha !== null && alpha[i] > 0.5) { sujetS += y; sujetN++; }
  }
  // Point blanc : 3 % des pixels les plus clairs, hors pixels brûlés (≥ 250) et hors visage
  let seuil = 255, cumul = 0;
  for (let k = 255; k >= 0; k--) { cumul += lum[k]; if (cumul >= n * 0.03) { seuil = k; break; } }
  const clairs: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (visage && dansBoite(i)) continue;
    const y = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
    if (y >= seuil && y < 250) { clairs[0] += d[p]; clairs[1] += d[p + 1]; clairs[2] += d[p + 2]; clairs[3]++; }
  }
  return { luminance: lum, moyenne: [sr / n, sv / n, sb / n], clairs, sujet: sujetN > 100 ? sujetS / sujetN : undefined };
}

/** Applique la retouche (courbes par canal puis saturation très légère) en place, alpha inchangé. */
export function appliquerRetouche(d: Uint8ClampedArray, r: Retouche): void {
  const luts = [courbeRetouche(r, 0), courbeRetouche(r, 1), courbeRetouche(r, 2)];
  const s = r.saturation;
  for (let p = 0; p < d.length; p += 4) {
    const R = luts[0][d[p]], V = luts[1][d[p + 1]], B = luts[2][d[p + 2]];
    const y = 0.299 * R + 0.587 * V + 0.114 * B;
    d[p] = y + (R - y) * s; d[p + 1] = y + (V - y) * s; d[p + 2] = y + (B - y) * s;
  }
}

/**
 * Réduction de bruit légère : chaque pixel tend vers la moyenne 3 × 3 seulement là où l'écart est faible (grain du capteur
 * dans les zones unies) ; les contours et les détails (cils, mèches, texture de la peau marquée) sont conservés.
 */
export function debruiter(d: Uint8ClampedArray, l: number, h: number, force = 0.35): void {
  const sigma = 4;
  const canaux = [0, 1, 2].map((c) => {
    const v = new Float32Array(l * h);
    for (let i = 0; i < v.length; i++) v[i] = d[i * 4 + c];
    return flouBoite(v, l, h, 1);
  });
  for (let i = 0; i < l * h; i++) {
    const p = i * 4;
    const ecart = Math.abs(0.299 * (d[p] - canaux[0][i]) + 0.587 * (d[p + 1] - canaux[1][i]) + 0.114 * (d[p + 2] - canaux[2][i]));
    const w = force * Math.exp(-(ecart * ecart) / (2 * sigma * sigma));
    for (let c = 0; c < 3; c++) d[p + c] = d[p + c] + w * (canaux[c][i] - d[p + c]);
  }
}

/** Netteté légère (masque flou 3 × 3, seuil pour ne pas accentuer le grain), à la taille finale. */
export function accentuer(d: Uint8ClampedArray, l: number, h: number, force = 0.3): void {
  const canaux = [0, 1, 2].map((c) => {
    const v = new Float32Array(l * h);
    for (let i = 0; i < v.length; i++) v[i] = d[i * 4 + c];
    return flouBoite(v, l, h, 1);
  });
  for (let i = 0; i < l * h; i++) {
    const p = i * 4;
    for (let c = 0; c < 3; c++) {
      const delta = d[p + c] - canaux[c][i];
      if (Math.abs(delta) > 2) d[p + c] = d[p + c] + force * delta;
    }
  }
}

/**
 * Flou du fond seul (convolution normalisée) : les pixels de la personne (alpha) sont exclus, le fond flouté ne garde
 * pas de halo sombre ou clair autour de la silhouette. `alpha` : 0 à 255 (canal alpha de la personne détourée).
 */
export function flouFond(d: Uint8ClampedArray, alpha: Uint8ClampedArray, l: number, h: number, r: number): void {
  const rr = Math.max(1, Math.round(r / 1.7));
  const n = l * h;
  let w: Float32Array = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 1 - alpha[i * 4 + 3] / 255;
  const plein = d.slice();
  flouRGBA(plein, l, h, r);
  const canaux: Float32Array[] = [];
  for (let c = 0; c < 3; c++) {
    let v: Float32Array = new Float32Array(n);
    for (let i = 0; i < n; i++) v[i] = d[i * 4 + c] * w[i];
    for (let k = 0; k < 3; k++) v = flouBoite(v, l, h, rr);
    canaux.push(v);
  }
  for (let k = 0; k < 3; k++) w = flouBoite(w, l, h, rr);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) d[i * 4 + c] = w[i] > 0.04 ? canaux[c][i] / w[i] : plein[i * 4 + c];
    d[i * 4 + 3] = 255;
  }
}

/** Flou d'une image RGBA (trois passages de boîte ≈ flou gaussien) */
export function flouRGBA(d: Uint8ClampedArray, l: number, h: number, r: number): void {
  const rr = Math.max(1, Math.round(r / 1.7));
  for (let c = 0; c < 4; c++) {
    let v: Float32Array = new Float32Array(l * h);
    for (let i = 0; i < v.length; i++) v[i] = d[i * 4 + c];
    for (let k = 0; k < 3; k++) v = flouBoite(v, l, h, rr);
    for (let i = 0; i < v.length; i++) d[i * 4 + c] = v[i];
  }
}

/** Mesures du masque pour le score de confiance */
export function mesurerMasque(alpha: Float32Array, l: number, h: number, visage: Rect | null): MesuresMasque {
  let fond = 0, incertain = 0;
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i];
    if (a > 0.5) fond++;
    if (a > 0.15 && a < 0.85) incertain++;
  }
  let visageMoy: number | null = null;
  if (visage) {
    let s = 0, n = 0;
    const x0 = Math.max(0, Math.floor(visage.x + visage.l * 0.25)), x1 = Math.min(l, Math.ceil(visage.x + visage.l * 0.75));
    const y0 = Math.max(0, Math.floor(visage.y + visage.h * 0.25)), y1 = Math.min(h, Math.ceil(visage.y + visage.h * 0.75));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += alpha[y * l + x]; n++; }
    visageMoy = n ? s / n : null;
  }
  let bas = 0;
  for (let x = 0; x < l; x++) if (alpha[(h - 1) * l + x] > 0.5) bas++;
  return { surface: fond / alpha.length, incertain: fond ? incertain / fond : 1, visage: visageMoy, basTouche: bas > l * 0.08 };
}

/** Haut de la silhouette et tête (centre et largeur, mesurés un peu sous le haut), pour cadrer sans visage détecté. */
export function silhouette(alpha: Float32Array, l: number, h: number): { haut: number; cxTete: number; largeurTete: number } | null {
  let haut = -1;
  for (let y = 0; y < h && haut < 0; y++) {
    let n = 0;
    for (let x = 0; x < l; x++) if (alpha[y * l + x] > 0.5) n++;
    if (n > l * 0.01) haut = y;
  }
  if (haut < 0) return null;
  // Largeur de la tête : médiane des largeurs sur une bande sous le haut (les cheveux ne comptent pas trop)
  const largeurs: { l: number; c: number }[] = [];
  for (let y = haut + Math.round(h * 0.03); y < Math.min(h, haut + Math.round(h * 0.12)); y += 2) {
    let x0 = -1, x1 = -1;
    for (let x = 0; x < l; x++) if (alpha[y * l + x] > 0.5) { if (x0 < 0) x0 = x; x1 = x; }
    if (x0 >= 0) largeurs.push({ l: x1 - x0 + 1, c: (x0 + x1) / 2 });
  }
  if (!largeurs.length) return null;
  largeurs.sort((a, b) => a.l - b.l);
  const m = largeurs[Math.floor(largeurs.length / 2)];
  return { haut, cxTete: m.c, largeurTete: m.l };
}

/** Rééchantillonne un masque (bilinéaire) à une autre taille */
export function redimensionnerMasque(m: Float32Array, l0: number, h0: number, l: number, h: number): Float32Array {
  if (l0 === l && h0 === h) return m;
  const out = new Float32Array(l * h);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(h0 - 1, Math.max(0, ((y + 0.5) * h0) / h - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(h0 - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < l; x++) {
      const fx = Math.min(l0 - 1, Math.max(0, ((x + 0.5) * l0) / l - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(l0 - 1, x0 + 1), tx = fx - x0;
      const a = m[y0 * l0 + x0] * (1 - tx) + m[y0 * l0 + x1] * tx;
      const b = m[y1 * l0 + x0] * (1 - tx) + m[y1 * l0 + x1] * tx;
      out[y * l + x] = a * (1 - ty) + b * ty;
    }
  }
  return out;
}

/** Le masque désigne-t-il le fond plutôt que la personne ? (bords de l'image plus « pleins » que le centre) */
export function masqueInverse(m: Float32Array, l: number, h: number): boolean {
  let bord = 0, nb = 0, centre = 0, nc = 0;
  for (let x = 0; x < l; x++) { bord += m[x]; nb++; }
  for (let y = 0; y < h; y++) { bord += m[y * l] + m[y * l + l - 1]; nb += 2; }
  for (let y = Math.round(h * 0.3); y < Math.round(h * 0.7); y++) for (let x = Math.round(l * 0.35); x < Math.round(l * 0.65); x++) { centre += m[y * l + x]; nc++; }
  return nb > 0 && nc > 0 && bord / nb > centre / nc + 0.2;
}
