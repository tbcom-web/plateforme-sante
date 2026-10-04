// Cinématique d'une foulée de course, vue de profil : SOURCE UNIQUE de l'image fixe (dessins.ts, coureurFixe) et de l'animation
// du site (apps/sites/src/components/animations/Coureur.astro). Aucune dépendance : importable côté navigateur (@plateforme/core/foulee).
//
// Courbes angulaires simplifiées d'après Novacheck (1998, « The biomechanics of running », course ≈ 3,2 m/s), cycle commencé au contact
// du talon droit (p = 0) :
//  - appui 0 → 0,38 du cycle (35–40 %), envol 0,38 → 0,5, puis appui gauche 0,5 → 0,88 et second envol ;
//  - hanche (cuisse / verticale) : fléchie au contact (≈ 25°), extension maximale au décollement des orteils (≈ −20°), flexion
//    maximale en fin d'oscillation (≈ 38°) ;
//  - genou : ≈ 20° au contact, flexion d'amortissement maximale EN APPUI vers 15 % (≈ 38°), presque tendu au décollement (≈ 18°),
//    flexion maximale en oscillation (≈ 95°) vers 65 %, ré-extension avant le contact ;
//  - pied : attaque du talon (pointe relevée), pied à plat de ≈ 8 % à 20 %, puis talon qui se lève jusqu'au décollement ; en
//    oscillation, cheville proche du neutre.
// Le pied d'appui est FIXÉ au sol (point de contact sur la ligne du tapis) : la hauteur du bassin en découle ; pendant l'envol, le
// bassin suit une parabole. Bras opposés aux jambes (le bras droit avance quand la jambe gauche avance), coude fléchi ≈ 90°.

export type Pt = { x: number; y: number };
export type Jambe = { hanche: Pt; genou: Pt; cheville: Pt; talon: Pt; orteil: Pt; angleGenou: number; appui: boolean };
export type Pose = { bassin: Pt; epaule: Pt; tete: Pt; droite: Jambe; gauche: Jambe; brasDroit: { coude: Pt; main: Pt }; brasGauche: { coude: Pt; main: Pt } };

/** Fin de l'appui (décollement des orteils), en fraction du cycle */
export const APPUI = 0.38;
const RAD = Math.PI / 180;

/** Interpolation périodique (Catmull-Rom) de clés [p, valeur], p croissant dans [0, 1[ */
function periodique(cles: [number, number][]) {
  const n = cles.length;
  return (p: number) => {
    const q = ((p % 1) + 1) % 1;
    let i = n - 1;
    for (let k = 0; k < n; k++) if (cles[k][0] <= q) i = k;
    const at = (k: number) => { const j = ((k % n) + n) % n; return [cles[j][0] + Math.floor(k / n) * 1, cles[j][1]]; };
    const [p0, v0] = at(i - 1), [p1, v1] = at(i), [p2, v2] = at(i + 1), [, v3] = at(i + 2);
    const t = (q - p1) / (p2 - p1 || 1);
    void p0;
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * v1 + (-v0 + v2) * t + (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 + (-v0 + 3 * v1 - 3 * v2 + v3) * t3);
  };
}

/** Cuisse par rapport à la verticale (°, avant positif) */
export const hanche = periodique([[0, 25], [0.15, 8], [0.38, -20], [0.5, -8], [0.65, 18], [0.82, 38], [0.93, 30]]);
/** Flexion du genou (°) */
export const genou = periodique([[0, 20], [0.15, 38], [0.3, 26], [0.38, 18], [0.5, 50], [0.65, 95], [0.78, 75], [0.9, 28]]);
/** Inclinaison du pied en oscillation (°, pointe relevée positive, par rapport au tibia + 90°) */
const chevilleOscillation = periodique([[0, 6], [0.38, -24], [0.5, -16], [0.65, -2], [0.85, 6]]);

/** Pose d'une jambe à la phase p (0 = contact du talon), hanche en (0, 0), y vers le bas ; L = longueur de la jambe */
function jambe(p: number, L: number): Omit<Jambe, 'hanche'> & { hanche: Pt } {
  const q = ((p % 1) + 1) % 1;
  const a = hanche(q) * RAD;
  const g = { x: Math.sin(a) * L * 0.47, y: Math.cos(a) * L * 0.47 };
  const b = a - genou(q) * RAD; // le tibia se plie vers l'arrière
  const c = { x: g.x + Math.sin(b) * L * 0.47, y: g.y + Math.cos(b) * L * 0.47 };
  // Inclinaison du pied (°, pointe relevée positive) : en appui, attaque du talon → pied à plat → talon levé jusqu'au décollement
  let tangage: number;
  const appui = q < APPUI;
  if (appui) {
    const attaque = (b / RAD) + 6; // au contact : pointe relevée (cheville légèrement en flexion dorsale)
    tangage = q < 0.08 ? attaque * (1 - q / 0.08) : q < 0.2 ? 0 : -34 * ((q - 0.2) / (APPUI - 0.2)) ** 1.3;
  } else tangage = (b / RAD) + chevilleOscillation(q);
  const f = tangage * RAD;
  // Pied : talon 0,07 L derrière et 0,06 L sous la cheville ; orteils 0,22 L devant (longueur du pied ≈ 0,29 L)
  const sur = (u: number, v: number): Pt => ({ x: c.x + Math.cos(f) * u + Math.sin(f) * v, y: c.y - Math.sin(f) * u + Math.cos(f) * v });
  return { hanche: { x: 0, y: 0 }, genou: g, cheville: c, talon: sur(-0.07 * L, 0.06 * L), orteil: sur(0.22 * L, 0.06 * L), angleGenou: genou(q), appui };
}
/** Point le plus bas d'une jambe (talon ou orteil) sous la hanche */
const bas = (j: ReturnType<typeof jambe>) => Math.max(j.talon.y, j.orteil.y);

/** Hauteur de la hanche au-dessus du sol à la phase p (pied d'appui au sol ; parabole pendant l'envol) */
export function hauteurBassin(p: number, L: number): number {
  const q = ((p % 1) + 1) % 1;
  const enAppui = (r: number) => (r < APPUI ? bas(jambe(r, L)) : r >= 0.5 && r < 0.5 + APPUI ? bas(jambe(r - 0.5, L)) : null);
  const h = enAppui(q);
  if (h !== null) return h;
  // Envol : de la fin d'un appui au début du suivant, bassin un peu plus haut (≈ 0,05 L au sommet)
  const debut = q < 0.5 ? APPUI : 0.5 + APPUI, fin = q < 0.5 ? 0.5 : 1;
  const u = (q - debut) / (fin - debut);
  const hA = bas(jambe(APPUI - 1e-4, L)), hB = bas(jambe(0, L));
  return hA + (hB - hA) * u + 4 * 0.05 * L * u * (1 - u);
}

/**
 * Pose complète du coureur à la phase p, bassin en x = 0, SOL en y = 0 (y vers le bas). L : longueur de la jambe ; le tronc est
 * incliné de 6° vers l'avant. Côté droit = jambe dont le talon touche le sol à p = 0.
 */
export function poseCoureur(p: number, L: number): Pose {
  const yb = -hauteurBassin(p, L);
  const place = (j: ReturnType<typeof jambe>): Jambe => {
    const t = (q: Pt) => ({ x: q.x, y: q.y + yb });
    return { hanche: t(j.hanche), genou: t(j.genou), cheville: t(j.cheville), talon: t(j.talon), orteil: t(j.orteil), angleGenou: j.angleGenou, appui: j.appui };
  };
  const droite = place(jambe(p, L)), gauche = place(jambe(p + 0.5, L));
  const bassin = { x: 0, y: yb };
  const tronc = 6 * RAD;
  const epaule = { x: bassin.x + Math.sin(tronc) * L * 0.62, y: bassin.y - Math.cos(tronc) * L * 0.62 };
  const tete = { x: epaule.x + Math.sin(tronc) * L * 0.22, y: epaule.y - L * 0.21 };
  // Bras opposés aux jambes : le bras droit suit la cuisse GAUCHE (et inversement), amplitude réduite, coude fléchi ≈ 90°
  const bras = (cuisseOpposee: number) => {
    const a = (0.75 * (cuisseOpposee - 9)) * RAD;
    const coude = { x: epaule.x + Math.sin(a) * L * 0.3, y: epaule.y + Math.cos(a) * L * 0.3 };
    const fl = (85 + 10 * Math.sin(a)) * RAD;
    const b = a + fl;
    return { coude, main: { x: coude.x + Math.sin(b) * L * 0.27, y: coude.y + Math.cos(b) * L * 0.27 } };
  };
  return { bassin, epaule, tete, droite, gauche, brasDroit: bras(hanche(p + 0.5)), brasGauche: bras(hanche(p)) };
}

/** Recul du tapis par cycle, en longueurs de jambe : vitesse du pied posé à plat (le sol défile sous lui) */
export function reculParCycle(L: number): number {
  const a = jambe(0.08, L), b = jambe(0.2, L);
  return (a.cheville.x - b.cheville.x) / 0.12 / L;
}
