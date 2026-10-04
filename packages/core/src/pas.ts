// Déroulé du pas au podoscope : SOURCE UNIQUE du modèle de pression de l'image fixe (dessins.ts, podoscopeFixe) et de l'animation du
// site (apps/sites/src/components/animations/Podoscope.astro). Aucune dépendance : importable côté navigateur (@plateforme/core/pas).
//
// Règles (revue anatomique du 2026-10-04, correctif 13) : un pied en phase OSCILLANTE ne porte AUCUNE pression ; pendant l'appui, le
// centre de pression suit le trajet talon → bord externe → têtes métatarsiennes → hallux (pied.ts : TRAJET), la charge monte au
// contact du talon et retombe au décollement des orteils. Les deux pieds sont décalés d'un demi-cycle (double appui au début et à la
// fin de chaque appui). Illustratif, sans valeur de mesure.

export type Pt = { x: number; y: number };

/** Fin de l'appui à la marche (fraction du cycle d'un pied) : appui ≈ 60 %, oscillation ≈ 40 % */
export const APPUI_MARCHE = 0.62;
/** Phase du relevé fixe (image sans mouvement) : pied gauche à l'attaque du talon, pied droit en fin de poussée sur l'hallux */
export const PHASE_FIXE = 0.07;

/** Point du trajet du centre de pression (polyligne échantillonnée, repère du pied) à la fraction s de l'appui */
export function surTrajet(trajet: Pt[], s: number): Pt {
  const k = Math.max(0, Math.min(1, s)) * (trajet.length - 1);
  const i = Math.min(trajet.length - 2, Math.floor(k)), t = k - i;
  return { x: trajet[i].x + (trajet[i + 1].x - trajet[i].x) * t, y: trajet[i].y + (trajet[i + 1].y - trajet[i].y) * t };
}

const lisseT = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/**
 * Masque de contact selon l'avancée de l'appui s (0 → 1) et la zone du pied (repère du pied, y vers le talon) : le talon ne porte
 * plus rien après la mi-appui (aucune pression au talon pendant la poussée sur l'hallux), l'avant-pied n'est chargé qu'après
 * l'attaque du talon, les orteils seulement en fin d'appui. Transitions adoucies (≈ 0,05).
 */
export function masqueContact(y: number, s: number): number {
  const talon = 1 - lisseT(0.4, 0.5, s); // y > 150
  const avant = lisseT(0.07, 0.17, s); // y < 110
  const orteils = lisseT(0.3, 0.4, s); // y < 48
  const zone = (a: number, b: number) => lisseT(a, b, y); // 0 au-dessus de a, 1 en dessous de b
  const mTalon = zone(140, 160), mAvant = 1 - zone(100, 120), mOrteils = 1 - zone(42, 54);
  const milieu = 1 - mTalon - mAvant > 0 ? 1 - mTalon - mAvant : 0; // bord externe : chargé de l'attaque à la poussée
  return mTalon * talon + (mAvant - mOrteils) * avant + mOrteils * orteils + milieu * lisseT(0.03, 0.12, s) * (1 - lisseT(0.75, 0.9, s));
}

/**
 * Pression illustrative d'un point de l'empreinte (x, y, repère du pied ; `b` : relief du relevé statique 0–1) à la phase `phase`
 * du cycle de CE pied (0 = attaque du talon). 0 pendant l'oscillation.
 */
export function pressionPas(x: number, y: number, b: number, phase: number, trajet: Pt[]): number {
  const q = ((phase % 1) + 1) % 1;
  if (q >= APPUI_MARCHE) return 0;
  const s = q / APPUI_MARCHE;
  const charge = Math.min(1, s / 0.1) * Math.min(1, (1 - s) / 0.14);
  // Le centre de pression s'attarde au talon puis sous les têtes métatarsiennes (déroulé non linéaire)
  const c = surTrajet(trajet, s < 0.25 ? s * 0.8 : s < 0.75 ? 0.2 + (s - 0.25) * 1.3 : 0.85 + (s - 0.75) * 0.6);
  const d = Math.hypot(x - c.x, y - c.y);
  return Math.min(1, charge * masqueContact(y, s) * (0.22 + 0.78 * Math.exp(-((d / 36) ** 2))) * (0.6 + 0.4 * b));
}

/** Centre de pression (barycentre illustratif) à la phase donnée, ou null pendant l'oscillation */
export function centrePas(phase: number, trajet: Pt[]): Pt | null {
  const q = ((phase % 1) + 1) % 1;
  if (q >= APPUI_MARCHE) return null;
  const s = q / APPUI_MARCHE;
  return surTrajet(trajet, s < 0.25 ? s * 0.8 : s < 0.75 ? 0.2 + (s - 0.25) * 1.3 : 0.85 + (s - 0.75) * 0.6);
}
