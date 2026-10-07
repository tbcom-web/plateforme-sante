// Pictogrammes « podologie » propres à la marque : jeu d'icônes au trait, grille 48 × 48 (nets à 24, 32 et 48 px).
//
// Grammaire (docs/charte-graphique.md, « Pictogrammes ») :
//  - un seul trait (PICTO.trait, en unités de la grille : 1,5 px à 24 px ; variante PICTO.traitFort : 2 px à 24 px), posé UNE fois sur
//    la racine <svg> : aucun élément ne redéfinit l'épaisseur ; extrémités et angles arrondis ; couleur `currentColor` ;
//  - un accent facultatif (une seule couleur : `--picto-accent`, sinon `--accent` de la gamme) sur UN détail (ongle, goutte, trajet…) ;
//  - aucun aplat, sauf micro-détails (points d'orteils d'une empreinte, points de trame, point d'un « ? ») ;
//  - aucune couleur littérale, aucun <style> (WebKit), aucun identifiant (plusieurs pictos par page) : rendu en ligne, quelques
//    centaines d'octets chacun ;
//  - anatomie : les pieds, empreintes, semelle, profil, jambe et chaussure de course sont DÉRIVÉS de la géométrie partagée
//    (`pied.ts` : CONTOUR_PIED, EMPREINTE(S), SEMELLE, piedDeProfil, JAMBE, CHAUSSURE, TRAJET), simplifiés et mis à l'échelle — jamais
//    redessinés à l'œil. Pied droit vu de dessus : hallux à gauche ; vu de dessous : hallux à droite ; profil : pied gauche vu côté
//    interne, orteils à droite, cheville et jambe visibles (sinon lecture « main »), la jambe sort du cadre ;
//  - douleur = rond CREUX discret + un arc ≤ 70 % ; jamais de cible, de viseur, de cercle plein rouge ni de pointillés sur la peau.
//
// API : `svgPicto(id, { taille, accent, trait, titre, classe })`, `PICTOS` (liste et libellés), `pictoSoin(slug)`,
// `pictoEquipement(id)`, `PICTOS_SOINS`, `PICTOS_EQUIPEMENTS`. Les noms « picto:<id> » sont aussi acceptés par `svgIcone`
// (`@plateforme/core/icones`), ce qui permet de remplacer une icône Iconify par un picto métier en gardant le repli.
import {
  CONTOUR_PIED,
  EMPREINTE,
  SEMELLE,
  SEMELLE_ELEMENTS,
  TRAJET,
  PLANTE_ENFANT,
  ORTEILS_ENFANT,
  JAMBE,
  CHAUSSURE,
  piedDeProfil,
  echantillonner,
  dansEmpreinte,
  dansPolygone,
  PLANTE,
  largeurA,
  chaikin,
  type P,
} from './pied';
import { PICTO } from './charte';
import { MEDIAL, LATERAL_NORMAL, VOISINS, LAME } from './bibliotheque/hallux-gros-plan';
import { PLAQUE_DURILLON } from './bibliotheque/soins-ongles';
import { FORMES } from './bibliotheque/formes';
import { SPORTS, FICHES_SPORTS, pictoSport, idPictoSport, type Sport } from './sports';

// ———————————————————————————————————————————————————— Outils de tracé

type Transfo = (x: number, y: number) => P;
const r1 = (v: number) => +v.toFixed(1);

/** Ramer–Douglas–Peucker : garde les points qui s'écartent de plus de `tol` de la corde */
function rdp(pts: P[], tol: number): P[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
  let max = 0, k = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = l > 1e-6 ? Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / l : Math.hypot(pts[i][0] - a[0], pts[i][1] - a[1]);
    if (d > max) { max = d; k = i; }
  }
  return max > tol ? [...rdp(pts.slice(0, k + 1), tol).slice(0, -1), ...rdp(pts.slice(k), tol)] : [a, b];
}

/** Courbe passant par les points (Catmull-Rom → Bézier), ouverte ou fermée */
function courbe(pts: P[], ferme: boolean): string {
  const n = pts.length;
  if (n < 2) return '';
  const pt = (i: number) => (ferme ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < (ferme ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return ferme ? `${d}Z` : d;
}

/**
 * Simplifie un tracé de la géométrie partagée pour la grille 48 : échantillonné, transformé (échelle, miroir, rotation), réduit
 * (RDP, tolérance en unités de la grille), puis relissé. `garder` filtre les points (coupe d'une jambe au bord du cadre).
 */
function simplifier(d: string, t: Transfo, tol = 0.35, garder?: (p: P) => boolean): string {
  return echantillonner(d, 8)
    .flatMap((s) => {
      const pts = s.pts.map(([x, y]) => t(x, y));
      if (!garder) return [{ pts, ferme: s.ferme }];
      // Morceaux continus dans la zone gardée (une coupe ne laisse jamais de trait de coupe)
      const morceaux: P[][] = [];
      let m: P[] = [];
      for (const p of pts) { if (garder(p)) m.push(p); else if (m.length) { morceaux.push(m); m = []; } }
      if (m.length) morceaux.push(m);
      return morceaux.map((q) => ({ pts: q, ferme: false }));
    })
    .filter((s) => s.pts.length > 1)
    .map((s) => {
      let pts = rdp(s.ferme && s.pts.length > 2 && Math.hypot(s.pts[0][0] - s.pts.at(-1)![0], s.pts[0][1] - s.pts.at(-1)![1]) < 0.01 ? s.pts.slice(0, -1) : s.pts, tol);
      if (s.ferme && pts.length > 2) { const fin = pts.at(-1)!; if (Math.hypot(fin[0] - pts[0][0], fin[1] - pts[0][1]) < 0.3) pts = pts.slice(0, -1); }
      return courbe(pts, s.ferme);
    })
    .join('');
}

/** Transformation : échelle `s`, centre source (cx, cy) amené en (x, y), miroir horizontal, rotation (degrés) */
const placer = (s: number, [cx, cy]: P, [x, y]: P, { miroir = false, rot = 0 } = {}): Transfo => {
  const a = (rot * Math.PI) / 180, c = Math.cos(a), si = Math.sin(a);
  return (px, py) => {
    const u = (px - cx) * s * (miroir ? -1 : 1), v = (py - cy) * s;
    return [x + u * c - v * si, y + u * si + v * c];
  };
};

const cercle = (cx: number, cy: number, r: number) => `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0Z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${r1(cx - rx)} ${r1(cy)}a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(2 * rx)} 0a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-2 * rx)} 0Z`;
/** Arc de cercle de a1 à a2 (degrés, 0 = droite, sens horaire à l'écran) */
const arc = (cx: number, cy: number, r: number, a1: number, a2: number) => {
  const p = (a: number) => [r1(cx + r * Math.cos((a * Math.PI) / 180)), r1(cy + r * Math.sin((a * Math.PI) / 180))];
  const [x1, y1] = p(a1), [x2, y2] = p(a2);
  return `M${x1} ${y1}A${r1(r)} ${r1(r)} 0 ${Math.abs(a2 - a1) > 180 ? 1 : 0} ${a2 > a1 ? 1 : 0} ${x2} ${y2}`;
};

// ———————————————————————————————————————————————————— Formes de base (dérivées de pied.ts)

/** Pied droit (repère 92 × 222) : hauteur utile du bout de l'hallux (y ≈ 3) au talon (y ≈ 219,5) */
const PIED = { haut: 3, bas: 219.5, cx: 49.3 };
const PIED_L = PIED.bas - PIED.haut;

/**
 * Plante (vue de dessous : miroir, hallux à droite), hauteur `h` (bout de l'hallux → talon), centrée en `centre`. Contour exact de la
 * plante (PLANTE, bord distal par les commissures) ; orteils en pastilles pleines posées sur leurs bouts (CONTOUR_PIED.bouts,
 * formule égyptienne). Exception des pictos à la règle « orteils intégrés au contour » : à 24 px, des orteils intégrés de 1,3 px se
 * fondent en une tache ; les pastilles restent lisibles (même convention que l'empreinte).
 */
function plante(h: number, centre: P, { miroir = true, rot = 0 } = {}): Partie[] {
  const s = h / PIED_L;
  const t = placer(s, [PIED.cx, (PIED.haut + PIED.bas) / 2], centre, { miroir, rot });
  const corps = courbe(rdp(PLANTE.map(([x, y]) => t(x, y)), 0.3), true);
  const orteils = CONTOUR_PIED.bouts.map(([x, y], i) => {
    const [rx, ry] = i ? [1.25, 1.45] : [2.1, 2.4];
    const [cx, cy] = t(x + (i ? 0 : 1), y + ry / s - 9);
    return ellipse(cx, cy, rx, ry);
  }).join('');
  return [trait(corps), plein(orteils)];
}

/** Pied droit vu de dessus (hallux à gauche), du bout des orteils à la cheville ; la jambe descend et sort du cadre par le bas */
function dessus(h: number, centre: P, coupeBas = 47.5) {
  const t = placer(h / PIED_L, [PIED.cx, (PIED.haut + PIED.bas) / 2], centre);
  const garder = (p: P) => p[1] <= coupeBas;
  const s = h / PIED_L;
  const [nx, ny] = t(21.5, 17);
  return {
    trait: simplifier(CONTOUR_PIED.dorsal.trait, t, 0.25, garder),
    ongle: ellipse(nx, ny, 6 * s, 7.5 * s),
    malleoles: simplifier(CONTOUR_PIED.dorsal.malleoles, t, 0.3, garder),
  };
}

/** Décale un contour fermé vers l'extérieur de `e` (le trait se pose AUTOUR de la zone : sa face interne suit le vrai bord) */
function decaler(pts: P[], e: number): P[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    let nx = ty / l, ny = -tx / l;
    if (dansPolygone(pts, p[0] + nx * 0.05, p[1] + ny * 0.05)) { nx = -nx; ny = -ny; }
    return [p[0] + nx * e, p[1] + ny * e] as P;
  });
}
/** Contour(s) fermé(s) transformé(s), décalé(s) de la demi-épaisseur du trait, réduit(s) et lissé(s) */
function contourDecale(d: string, t: Transfo, e = PICTO.trait / 2, tol = 0.3): string {
  return echantillonner(d, 6)
    .filter((s) => s.pts.length > 3)
    .map((s) => {
      let pts = s.pts.map(([x, y]) => t(x, y));
      if (Math.hypot(pts[0][0] - pts.at(-1)![0], pts[0][1] - pts.at(-1)![1]) < 0.2) pts = pts.slice(0, -1);
      // points rapprochés (≥ 0,4 u) avant le décalage, pour des normales stables
      pts = pts.reduce<P[]>((acc, p) => (!acc.length || Math.hypot(p[0] - acc.at(-1)![0], p[1] - acc.at(-1)![1]) > 0.4 ? [...acc, p] : acc), []);
      const q = rdp([...decaler(pts, e), decaler(pts, e)[0]], tol).slice(0, -1);
      return courbe(q, true);
    })
    .join('');
}

const polyFerme = (pts: P[]) => `M${pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' L')} Z`;
/** Pied creux : la trace sans la bande externe entre l'avant-pied et le talon (deux appuis), bouts arrondis (Chaikin) */
const EMPREINTE_CREUSE = [[0, 98], [168, 230]].map(([a, b]) => polyFerme(chaikin(EMPREINTE.polygone.filter(([, y]) => y >= a && y <= b), 3))).join(' ');
/** Pied plat : voûte au sol — le bord médial de la trace suit le bord médial de la plante (2,5 u en dedans) entre les têtes et le talon */
const EMPREINTE_PLATE_ANCIENNE = (() => {
  const droite: P[] = [], gauche: P[] = [];
  for (let y = 58; y <= 216; y += 4) {
    const e = largeurA(EMPREINTE.polygone, y), p = largeurA(PLANTE, y);
    if (!e) continue;
    const g = p && y > 78 && y < 200 ? Math.min(e[0], p[0] + 2.5 + 2 * Math.sin(((y - 78) / 122) * Math.PI)) : e[0];
    droite.push([e[1], y]); gauche.push([g, y]);
  }
  return polyFerme(chaikin([...droite, ...gauche.reverse()], 2));
})();

const EMPREINTE_PLATE = (() => {
  // Bord médial entre la tête de M1 (y ≈ 83) et le talon (y ≈ 192) ramené sur la corde : plus de concavité de voûte
  const [a, b] = [PLANTE.find(([, y]) => y >= 82.9)!, PLANTE.find(([x, y]) => y >= 190 && x < 48)!];
  const corde = (y: number) => a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
  return polyFerme(chaikin(PLANTE.map(([x, y]) => (x < 48 && y > a[1] && y < b[1] ? [Math.min(x, corde(y)), y] : [x, y]) as P), 2));
})();
void EMPREINTE_PLATE_ANCIENNE;

/** Empreinte (trace d'appui + pulpes en points pleins), pied droit (hallux à gauche) sauf `miroir` */
// Petites traces (h < 24) : pulpes écartées du trait pour rester séparées
function empreinte(h: number, centre: P, { miroir = false, rot = 0, contour = EMPREINTE.contour, pulpes = true } = {}) {
  const L = 216.97 - 4.9; // pulpe de l'hallux (y ≈ 4,9) → talon
  const t = placer(h / L, [PIED.cx, (4.9 + 216.97) / 2], centre, { miroir, rot });
  const s = h / L;
  return {
    trait: contourDecale(contour, t),
    points: pulpes ? EMPREINTE.pulpes.map(([cx, cy, rx, ry], i) => { const [x, y] = t(cx, cy - (i ? 3 : 4) - (h < 24 ? 1.9 / s : 0)); const m = h < 24 ? 0.7 : 1; return ellipse(x, y, Math.max(m, rx * s * (i ? 0.9 : 0.85)), Math.max(m * 1.1, ry * s * (i ? 0.9 : 0.85))); }).join('') : '',
    t,
  };
}

/** Profil (pied gauche vu côté interne, orteils à droite), sol en `sol`, longueur talon → hallux `l`, jambe coupée hors cadre */
function profil(l: number, [x0, sol]: P, { voute = 'normale' as 'normale' | 'creuse' | 'plate', haut = 0 } = {}) {
  const p = piedDeProfil(voute);
  const s = l / 126.6; // talon (x ≈ −2,3) → pulpe de l'hallux (x ≈ 124,3)
  const t: Transfo = (x, y) => [x0 + (x + 2.3) * s, sol - (p.sol - y) * s];
  const garder = (q: P) => q[1] >= haut;
  return {
    trait: simplifier(`${p.contour} ${p.halluxContour}`, t, 0.3, garder),
    malleole: simplifier(p.malleole, t, 0.2),
    insertion: t(...p.insertion),
    t,
    s,
  };
}

// ———————————————————————————————————————————————————— Pictogrammes

/** Partie d'un picto : un tracé au trait, éventuellement à l'accent, ou un micro-aplat (`plein`) */
type Partie = { d: string; accent?: boolean; plein?: boolean };
type Def = { libelle: string; famille: Famille; parties: () => Partie[] };
export type Famille = 'anatomie' | 'pathologies' | 'chaussage' | 'examens' | 'soins' | 'cabinet' | 'pratique' | 'sports';
export const FAMILLES_PICTOS: Record<Famille, string> = {
  anatomie: 'Le pied',
  pathologies: 'Motifs de consultation',
  chaussage: 'Semelles et chaussage',
  examens: 'Examens et matériel',
  soins: 'Soins et publics',
  cabinet: 'Cabinet',
  pratique: 'Infos pratiques',
  sports: 'Sports',
};

const trait = (d: string): Partie => ({ d });
const accent = (d: string): Partie => ({ d, accent: true });
const plein = (d: string, acc = false): Partie => ({ d, plein: true, accent: acc });

/**
 * Avant-pied vu de dessus (pied droit : hallux à gauche), cinq orteils jointifs et l'avant-pied qui sort du cadre par le bas :
 * hallux nettement plus large, bouts décroissants (formule égyptienne), orteils à peine plus longs que larges (jamais des doigts).
 */
const ORTEILS_DESSUS = {
  peau: 'M5.5 46V12.5A6.5 6.5 0 0 1 18.5 12.5V15.6V12.3A3.75 3.75 0 0 1 26 12.3V15.6V15A3.5 3.5 0 0 1 33 15V18.4V18.3A3.25 3.25 0 0 1 39.5 18.3V21.6V22A3 3 0 0 1 45.5 22V46',
  ongle: 'M8.8 11.6C8.8 10.8 9.4 10.4 10.2 10.4H13.8C14.6 10.4 15.2 10.8 15.2 11.6V14.4C15.2 15.8 13.8 16.6 12 16.6S8.8 15.8 8.8 14.4Z',
  ongle2: 'M20.3 12.6C20.5 11.4 21.3 10.9 22.25 10.9S24 11.4 24.2 12.6',
};

/**
 * Gros plan de l'hallux du pied droit vu de dessus (bibliotheque/hallux-gros-plan.ts, fenêtre 112 × 158 ramenée ×0,55) : hallux, bord
 * du 2e orteil, l'avant-pied sort du cadre en bas ; lame à ≈ 0,57 de la largeur de l'orteil, bord libre droit.
 */
function halluxGros() {
  const t: Transfo = (x, y) => [x * 0.55, y * 0.55 - 2];
  const garder = (p: P) => p[0] <= 46.5 && p[1] <= 46.5;
  return {
    peau: simplifier(courbe([...MEDIAL, ...LATERAL_NORMAL, ...VOISINS.slice(0, -2)], false), t, 0.25, garder),
    lame: simplifier(courbe(LAME, true), t, 0.2),
  };
}

const DEFS: Record<string, Def> = {
  // ——— Le pied
  'pied-profil': {
    libelle: 'Pied de profil',
    famille: 'anatomie',
    parties: () => { const p = profil(40, [4, 41]); return [trait(p.trait), trait(p.malleole)]; },
  },
  'pied-dessus': {
    libelle: 'Pied vu de dessus',
    famille: 'anatomie',
    // Dessiné sur les proportions de CONTOUR_PIED (avant-pied ≈ 0,38 L, cheville ≈ 0,7 × avant-pied) : à cette taille, le tracé exact
    // des orteils se fond ; orteils jointifs à bouts décroissants, malléole médiale plus haute que la latérale, jambe hors cadre
    parties: () => [
      trait('M15.6 47.5V41.4C15.6 39.8 14.2 38.8 14.2 37C14.2 35.6 13.7 34.4 13.3 32.8C12.2 28.6 11 24 11 19V9.3A4.25 4.25 0 0 1 19.5 9.3V11.6V10A2.5 2.5 0 0 1 24.5 10V12.2V12.4A2.35 2.35 0 0 1 29.2 12.4V14.4V15.1A2.1 2.1 0 0 1 33.4 15.1V17.2V18.4A1.9 1.9 0 0 1 37.2 18.4V22C37.2 27 35.8 31.4 34.6 34.8C33.8 37 33.8 38.4 33.6 39.6C33.4 40.8 32.6 41.6 32.6 43V47.5'),
      accent('M13.2 9.9V8.4C13.2 7.2 14.1 6.6 15.25 6.6S17.3 7.2 17.3 8.4V9.9C17.3 10.9 16.4 11.5 15.25 11.5S13.2 10.9 13.2 9.9Z'),
    ],
  },
  plante: {
    libelle: 'Plante du pied',
    famille: 'anatomie',
    parties: () => plante(40, [24, 24]),
  },
  empreintes: {
    libelle: "Paire d'empreintes",
    famille: 'anatomie',
    parties: () => {
      const g = empreinte(36, [13, 25], { miroir: true, rot: -5 }), d = empreinte(36, [35, 25], { rot: 5 });
      return [trait(g.trait), trait(d.trait), plein(g.points, true), plein(d.points, true)];
    },
  },
  'hallux-ongle': {
    libelle: 'Gros orteil et ongle',
    famille: 'anatomie',
    parties: () => [trait(ORTEILS_DESSUS.peau), accent(ORTEILS_DESSUS.ongle)],
  },

  // ——— Soins de l'ongle et des orteils (fiches de la migration 0020) : gros plan de l'hallux (bibliotheque/hallux-gros-plan.ts) et
  // coupe de l'orteil en griffe (bibliotheque/soins-ongles.ts), mêmes géométries que les dessins
  orthonyxie: {
    libelle: 'Orthonyxie',
    famille: 'soins',
    // Gros plan de l'hallux et de son ongle ; agrafe en fil à l'accent : crochets sous les bords de la lame, boucle d'activation
    parties: () => {
      const h = halluxGros();
      return [trait(h.peau), trait(h.lame), accent(`M10.8 22.6C10.6 21 11.4 20.2 12.8 20.2H18.1M23.3 20.2H28.6C30 20.2 30.8 21 30.6 22.6${cercle(20.7, 17.6, 2.6)}`)];
    },
  },
  onychoplastie: {
    libelle: 'Onychoplastie',
    famille: 'soins',
    // Gros plan de l'hallux : partie avant de l'ongle reconstituée (front de repousse et hachures à l'accent), ongle naturel à la base
    parties: () => {
      const h = halluxGros();
      return [trait(h.peau), trait(h.lame), accent('M13.4 23.4C17 22.2 24.6 22.2 28.2 23.4M15.2 19.6L19.4 13.4M21 19.6L25.2 13.4')];
    },
  },
  orthoplastie: {
    libelle: 'Orthoplastie',
    famille: 'soins',
    // Schéma classique (v3, 2026-10-06), même sujet que le dessin : l'avant-pied vu de dessus (ORTEILS_DESSUS) et, à l'accent, le
    // manchon en silicone qui coiffe le 2e orteil, réduit à sa bande (bombée vers le bout : elle entoure l'orteil) ; à 24-48 px, un
    // manchon dessiné en entier se fond dans le contour de l'orteil
    parties: () => [trait(ORTEILS_DESSUS.peau), trait(ORTEILS_DESSUS.ongle), accent('M19.2 14C21 13.4 23.5 13.4 25.3 14')],
  },

  // ——— Motifs de consultation
  'ongle-incarne': {
    libelle: 'Ongle incarné',
    famille: 'pathologies',
    // Bord médial de la lame qui s'enfonce dans le repli ; repli latéral (médial) enflé, en accent, hors de la lame
    parties: () => [
      trait('M5.5 46V19.4'),
      accent('M5.5 19.4C2.8 17.8 2.8 12.2 5.5 10.6'),
      trait(ORTEILS_DESSUS.peau.replace('M5.5 46V12.5', 'M5.5 10.6V12.5')),
      trait('M8.8 11.6C8.8 10.8 9.4 10.4 10.2 10.4H13.8C14.6 10.4 15.2 10.8 15.2 11.6V14.4C15.2 15.8 13.8 16.6 12 16.6C10.8 16.6 9.8 16.2 9.2 15.6'),
      trait('M8.8 11.6C8.4 13.6 7.4 15 5.9 15.6'),
    ],
  },
  'mycose-ongle': {
    libelle: "Mycose de l'ongle",
    famille: 'pathologies',
    // Lame épaissie au bord libre (bord en zigzag, friable) et strie transversale : sans rendu « dégoûtant »
    parties: () => [
      trait(ORTEILS_DESSUS.peau),
      trait('M8.8 11.4V14.4C8.8 15.8 10.2 16.6 12 16.6S15.2 15.8 15.2 14.4V11.4'),
      accent('M8.8 11.4C10 10 11 12.2 12 10.6C13 12.2 14 10 15.2 11.4M10.8 14.2H13.2'),
    ],
  },
  'ongle-epais': {
    libelle: 'Ongle épais',
    famille: 'pathologies',
    // Hallux de profil (POD-AT-0003, état « ongle-epais ») : ongle épaissi à l'accent, fraise posée sur le dos de l'ongle
    parties: () => {
      const corps = FORMES['pied-profil-ongle-epais'].corps;
      const chemin = (debut: string) => { const i = corps.lastIndexOf(`d="${debut}`); return corps.slice(i + 3, corps.indexOf('"', i + 3)); };
      const t: Transfo = (x, y) => [2 + (x - 380) * 0.49, 43 + (y - 440) * 0.49];
      const dos = chemin('M358,377 C372,382');
      const B: P = [34.3, 11.4], u: P = [0.92, -0.39], n: P = [0.39, 0.92];
      const at = (s: number, w: number): P => [B[0] + u[0] * s + n[0] * w, B[1] + u[1] * s + n[1] * w];
      const outil = `M${at(2.4, 0).map(r1).join(' ')}L${at(6, 0).map(r1).join(' ')}M${[at(6, -2), at(13.4, -2), at(13.4, 2), at(6, 2)].map((p) => p.map(r1).join(' ')).join('L')}Z`;
      return [
        trait(simplifier(`M334,371 C342,372 350,374 358,377 ${dos.replace(/^M358,377/, '')}`, t, 0.3, (p) => p[0] >= 1.5 && p[1] <= 46.5)),
        accent(simplifier(chemin('M421,391.5'), t, 0.25)),
        trait(`${cercle(B[0], B[1], 2.4)}${outil}`),
      ];
    },
  },
  'cor-durillon': {
    libelle: 'Cor et durillon',
    famille: 'pathologies',
    // Schéma classique (v3, 2026-10-06) : la plante et un point plein à l'accent sous l'avant-pied, sur la plaque du durillon des
    // dessins (PLAQUE_DURILLON, têtes des 2e et 3e métatarsiens, même transformation que la plante) ; un point, jamais un anneau
    parties: () => {
      const t = placer(40 / PIED_L, [PIED.cx, (PIED.haut + PIED.bas) / 2], [24, 24], { miroir: true });
      const n = PLAQUE_DURILLON.length, [x, y] = t(PLAQUE_DURILLON.reduce((a, p) => a + p[0], 0) / n, PLAQUE_DURILLON.reduce((a, p) => a + p[1], 0) / n);
      return [...plante(40, [24, 24]), plein(ellipse(x, y, 3.3, 2.3), true)];
    },
  },
  'verrue-plantaire': {
    libelle: 'Verrue plantaire',
    famille: 'pathologies',
    // Petite lésion ronde sous l'avant-pied (côté hallux), points noirs du milieu : micro-points
    parties: () => [...plante(40, [24, 24]), accent(cercle(27.6, 14.6, 2.6)), plein(`${cercle(27, 14, 0.55)}${cercle(28.3, 14.4, 0.55)}${cercle(27.5, 15.4, 0.55)}`, true)],
  },
  'talon-douloureux': {
    libelle: 'Douleur au talon',
    famille: 'pathologies',
    // Rond creux à l'insertion de l'aponévrose (processus médial de la tubérosité calcanéenne) + un arc (≤ 70 %)
    parties: () => {
      const p = profil(40, [4, 41]);
      void p.insertion;
      return [trait(p.trait), accent(cercle(13.6, 35.8, 3.1)), accent(arc(13.6, 35.8, 6.4, -75, 5))];
    },
  },
  'pied-plat': {
    libelle: 'Pied plat',
    famille: 'pathologies',
    parties: () => { const e = empreinte(40, [24, 24], { contour: EMPREINTE_PLATE }); return [trait(e.trait), plein(e.points, true)]; },
  },
  'pied-creux': {
    libelle: 'Pied creux',
    famille: 'pathologies',
    parties: () => { const e = empreinte(40, [24, 24], { contour: EMPREINTE_CREUSE }); return [trait(e.trait), plein(e.points, true)]; },
  },

  // ——— Semelles et chaussage
  'semelle-orthopedique': {
    libelle: 'Semelle orthopédique',
    famille: 'chaussage',
    // Contour (L/l ≈ 2,6) et soutien de voûte (côté interne) à l'accent ; à 24 px, une barre en travers se lirait « bride de tong »
    parties: () => {
      const t = placer(40 / 227.6, [49, 107.9], [24, 24], { rot: 0 });
      return [trait(simplifier(SEMELLE, t, 0.3)), accent('M17.6 20C20 21.4 22.9 25.4 23.4 28.5C23.7 30.8 21.8 33.4 19.4 35')];
    },
  },
  'chaussure-ville': {
    libelle: 'Chaussure de ville',
    famille: 'chaussage',
    parties: () => [
      trait('M9.6 17.5H17C19 20.6 22.3 22 26.4 22.4C33.4 23.2 39.4 26.6 42.2 30.2C43.8 32.4 43.5 35.5 41.2 36H20.5L20 40H10.4L9.4 36C8.6 30.4 8.4 23 9.6 17.5Z'),
      trait('M9.2 32H42.8'),
      accent('M23.5 22.2L25.6 26.4M27.6 22.8L29.6 26.8'),
    ],
  },
  'chaussure-course': {
    libelle: 'Chaussure de course',
    famille: 'chaussage',
    parties: () => {
      const t = placer(0.44, [52, 26], [24, 25]);
      const lacets = CHAUSSURE.lacets.slice(0, 3).map(([x1, y1, x2, y2]) => { const [a, b] = t(x1, y1), [c, d] = t(x2, y2); return `M${r1(a)} ${r1(b)}L${r1(c)} ${r1(d)}`; }).join('');
      return [trait(simplifier(CHAUSSURE.tige, t, 0.3)), trait(simplifier(CHAUSSURE.semelle, t, 0.3)), accent(lacets)];
    },
  },
  'chaussure-enfant': {
    libelle: "Chaussure d'enfant",
    famille: 'chaussage',
    // Bout large et rond, tige montante, bride auto-agrippante à l'accent
    parties: () => [
      trait('M9.5 14.5H17.5V21.5C20.5 23.6 24.6 24.2 29 24.6C35.6 25.4 41 28.6 41.6 33.6C42 37.4 39.8 39.5 36 39.5H12C9 39.5 7.4 37.6 7.4 35V17.5C7.4 15.8 8.2 14.5 9.5 14.5Z'),
      trait('M7.4 34H41.8'),
      accent('M17.5 23.4L24.6 30.6'),
    ],
  },
  'premiers-pas': {
    libelle: 'Premiers pas',
    famille: 'chaussage',
    // Deux empreintes de tout-petit (voûte comblée par le coussinet graisseux : trace pleine), décalées d'un pas (≈ 1,9 longueur)
    parties: () => {
      // Marche vers le haut à droite (≈ 30°) : pas ≈ 1,9 longueur de pied ; pieds tournés de 22° et 38° (légère ouverture)
      const trace = (centre: P, miroir: boolean, rot: number) => {
        const s = 17 / 216, t = placer(s, [49, 110], centre, { miroir, rot });
        const contour = contourDecale(polyFerme(PLANTE_ENFANT), t);
        const orteils = ORTEILS_ENFANT.map(([cx, cy, rx, ry]) => { const [x, y] = t(cx, cy - 3.4 / s); return ellipse(x, y, Math.max(0.9, rx * s), Math.max(1, ry * s)); }).join('');
        return [trait(contour), plein(orteils, true)];
      };
      return [...trace([16.8, 37.4], true, 22), ...trace([32.3, 10.6], false, 38)];
    },
  },

  // ——— Examens et matériel
  bilan: {
    libelle: 'Bilan podologique',
    famille: 'examens',
    // Plante et loupe à côté (jamais un rond posé sur la peau) ; dans la loupe, trois points de la trame
    parties: () => [
      ...plante(38, [15, 23], { miroir: false }),
      trait(`${cercle(33, 29, 7.5)}M38.4 34.4L43 39`),
      plein(`${cercle(30.4, 29.6, 1.1)}${cercle(33.4, 27.2, 1.1)}${cercle(35.4, 30.6, 1.1)}`, true),
    ],
  },
  'analyse-marche': {
    libelle: 'Analyse de la marche',
    famille: 'examens',
    // Empreinte et trajet du centre de pression : talon → bord externe → têtes métatarsiennes → hallux
    parties: () => {
      const e = empreinte(40, [24, 24], { pulpes: true });
      const fin = e.t(22, 16);
      return [trait(e.trait), plein(e.points), accent(simplifier(TRAJET, e.t, 0.25)), plein(cercle(fin[0], fin[1], 1.6), true)];
    },
  },
  podoscope: {
    libelle: 'Podoscope',
    famille: 'examens',
    // Caisson vu de côté : vitre sur le dessus, miroir incliné dedans (à l'accent), pied posé sur la vitre
    parties: () => {
      const p = profil(22, [8, 27], { haut: 0 });
      return [trait(p.trait), trait('M5 28.5H43V43C43 44.1 42.1 45 41 45H7C5.9 45 5 44.1 5 43Z'), accent('M8.2 42.4L39.8 31.4')];
    },
  },
  'plateforme-pression': {
    libelle: 'Plateforme de pression',
    famille: 'examens',
    // Plaque vue de dessus et trace d'appui (zones de contact réelles). La trame de points de la marque est illisible à 24 px :
    // elle reste aux dessins et animations.
    parties: () => {
      const e = empreinte(30, [24, 25.5]);
      return [trait('M11 5H37C39.8 5 42 7.2 42 10V38C42 40.8 39.8 43 37 43H11C8.2 43 6 40.8 6 38V10C6 7.2 8.2 5 11 5Z'), accent(e.trait), plein(e.points, true)];
    },
  },
  monofilament: {
    libelle: 'Test au monofilament',
    famille: 'examens',
    // Profil, filament perpendiculaire à la plante (tête de M1), plié en C HORS de la peau ; manche dessous
    parties: () => {
      const p = profil(34, [5, 29], { haut: 0 });
      return [trait(p.trait), accent('M29.8 40.6C27 38 27 33.4 29.8 30.6'), trait('M28 40.6H31.6V46.4H28Z')];
    },
  },
  'k-taping': {
    libelle: 'K-taping',
    famille: 'examens',
    // Bande en Y DANS le contour : sous le talon, le long du tendon d'Achille, deux queues sur le mollet
    parties: () => {
      const p = profil(40, [4, 41]);
      return [trait(p.trait), accent('M12 39.6C8.4 39.4 6.2 38.2 6.2 35.8C6.4 32.6 8.4 30.4 8.8 28C9.2 25.4 9.3 23.4 9.3 21.4V16M9.3 16C8.8 11.4 8.4 7.4 8.4 4M9.3 16C10.8 11.6 12 7.6 12.4 4')];
    },
  },
  instruments: {
    libelle: 'Instruments de soin',
    famille: 'cabinet',
    // Pince à ongles fermée (becs arrondis, sans lame visible), ressort entre les manches
    parties: () => [
      trait('M5 24C5 21.4 7.4 19.8 10.4 20.4L15.6 22.2M5 24C5 26.6 7.4 28.2 10.4 27.6L15.6 25.8'),
      accent(cercle(18.4, 24, 2.6)),
      trait('M21 22.6C28 21.4 35 20 43 19M21 25.4C28 26.6 35 28 43 29'),
      trait('M30.6 21.8C32.2 22.8 32.2 25.2 30.6 26.2'),
    ],
  },
  'hygiene-autoclave': {
    libelle: 'Hygiène et stérilisation',
    famille: 'cabinet',
    // Autoclave : caisson, porte ronde, écran ; contrôle validé (coche) à l'accent
    parties: () => [
      trait('M9 10H39C41.2 10 43 11.8 43 14V36C43 38.2 41.2 40 39 40H9C6.8 40 5 38.2 5 36V14C5 11.8 6.8 10 9 10ZM10 40V43M38 40V43'),
      trait(cercle(19, 25, 8.5)),
      trait('M32 16.5H38'),
      accent('M31.8 27.6L34.4 30.2L38.6 25.6'),
    ],
  },
  'fauteuil-soins': {
    libelle: 'Fauteuil de soins',
    famille: 'cabinet',
    // Dossier incliné, assise, repose-jambes relevé, colonne et socle
    parties: () => [
      trait('M7.6 10.6C8 8.6 10.4 8 11.4 9.8L17 25H30.4L38.8 19.2C40.4 18.2 42.4 19.2 42 21.2L41.6 22.4L32 29.6H15.2C14.2 29.6 13.4 29 13 28.2Z'),
      trait('M23 29.6V39M14 41.5H32'),
      accent('M13 16.5H6.5'),
    ],
  },

  // ——— Soins et publics
  'pied-diabetique': {
    libelle: 'Pied diabétique',
    famille: 'soins',
    // Plante et goutte posée à côté (jamais au bout d'un objet, jamais sur la peau), sans cœur
    parties: () => [...plante(40, [17, 24]), accent('M36.5 24.5C36.5 24.5 31 31.2 31 35A5.5 5.5 0 0 0 42 35C42 31.2 36.5 24.5 36.5 24.5Z')],
  },
  'soins-domicile': {
    libelle: 'Soins à domicile',
    famille: 'soins',
    // Maison et empreinte à l'intérieur
    parties: () => {
      const p = plante(17, [24, 31.2]);
      return [trait('M5.5 22.5L24 6.5L42.5 22.5M10 19V41.5H38V19'), { ...p[0], accent: true }, { ...p[1], accent: true }];
    },
  },
  'senior-canne': {
    libelle: 'Senior et canne',
    famille: 'soins',
    // Pied de profil et canne presque verticale, embout au sol un peu en avant des orteils
    parties: () => {
      const p = profil(24, [3, 42.5]);
      return [trait(p.trait), accent('M36.4 9.6C36.4 4.8 43.6 4.8 43.6 9.6L44.4 42.8')];
    },
  },
  'sport-course': {
    libelle: 'Sport et course',
    famille: 'soins',
    // Jambe en fin d'appui (géométrie JAMBE), sol, lignes de vitesse à l'accent
    parties: () => {
      const t = placer(0.44, [48.5, 85.6], [25, 42]);
      return [trait(simplifier(JAMBE.silhouette, t, 0.3, (q) => q[1] >= -2)), trait('M9 44.6H41'), accent('M5 24H11M7.5 31.5H12.5')];
    },
  },

  // ——— Infos pratiques
  'conseil-faq': {
    libelle: 'Conseils et questions',
    famille: 'pratique',
    parties: () => [
      trait('M11 8H37C40.3 8 43 10.7 43 14V29C43 32.3 40.3 35 37 35H23L14 42V35H11C7.7 35 5 32.3 5 29V14C5 10.7 7.7 8 11 8Z'),
      accent('M19.2 17.6C19.4 14.8 21.4 13.2 24 13.2C26.8 13.2 28.8 15 28.8 17.6C28.8 21 24 21.4 24 24.6'),
      plein(cercle(24, 29.2, 1.9), true),
    ],
  },
  'rendez-vous': {
    libelle: 'Rendez-vous',
    famille: 'pratique',
    parties: () => [
      trait('M11 9.5H37C39.8 9.5 42 11.7 42 14.5V37C42 39.8 39.8 42 37 42H11C8.2 42 6 39.8 6 37V14.5C6 11.7 8.2 9.5 11 9.5ZM6 18.5H42M16 5.5V12.5M32 5.5V12.5'),
      accent('M17.5 30.2L22 34.6L30.8 25.8'),
    ],
  },
  accessibilite: {
    libelle: 'Accès personnes à mobilité réduite',
    famille: 'pratique',
    // Fauteuil roulant vu de côté (sans personnage)
    parties: () => [
      trait('M10 8.5H14.5V27.5H30L33.5 37.5H39'),
      trait(cercle(21, 32.5, 10)),
      accent(cercle(37.5, 41.5, 2.4)),
    ],
  },
  telephone: {
    libelle: 'Téléphone',
    famille: 'pratique',
    parties: () => [trait('M14.2 6H19L22 14.2L18.4 17.6C20.8 23 25 27.2 30.4 29.6L33.8 26L42 29V33.8C42 38.2 38.8 41.4 34.6 41.2C20.6 40.2 7.8 27.4 6.8 13.4C6.6 9.2 9.8 6 14.2 6Z')],
  },
  itineraire: {
    libelle: 'Adresse et itinéraire',
    famille: 'pratique',
    parties: () => [
      trait('M24 41.5C24 41.5 37 30.6 37 19.5A13 13 0 0 0 11 19.5C11 30.6 24 41.5 24 41.5Z'),
      accent(cercle(24, 19.5, 4.6)),
    ],
  },
  horaires: {
    libelle: 'Horaires',
    famille: 'pratique',
    parties: () => [trait(cercle(24, 24, 18.5)), accent('M24 12.5V24L31.5 28.5')],
  },
  honoraires: {
    libelle: 'Honoraires et règlement',
    famille: 'pratique',
    // Étiquette de prix (sans symbole monétaire)
    parties: () => [
      trait('M25.6 6H39C40.7 6 42 7.3 42 9V22.4C42 23.2 41.7 24 41.1 24.5L24.5 41.1C23.3 42.3 21.4 42.3 20.3 41.1L6.9 27.7C5.7 26.6 5.7 24.7 6.9 23.5L23.5 6.9C24 6.3 24.8 6 25.6 6Z'),
      accent(cercle(34, 14, 2.8)),
    ],
  },
  'carte-vitale': {
    libelle: 'Carte de santé et conventionnement',
    famille: 'pratique',
    // Carte générique à puce (aucun logo officiel)
    parties: () => [
      trait('M9 11H39C41.2 11 43 12.8 43 15V33C43 35.2 41.2 37 39 37H9C6.8 37 5 35.2 5 33V15C5 12.8 6.8 11 9 11Z'),
      accent('M12.5 18H18.5C19.3 18 20 18.7 20 19.5V24C20 24.8 19.3 25.5 18.5 25.5H12.5C11.7 25.5 11 24.8 11 24V19.5C11 18.7 11.7 18 12.5 18Z'),
      trait('M11 31H22M27 31H37'),
    ],
  },
};

/**
 * Kit Sports (2026-10-07, brouillons) : le picto de chaque sport est la scène du sport (sports.ts : pied validé chaussé, ballon,
 * pédale…) recadrée sur la grille 48 et simplifiée — même géométrie que le trait continu et le dessin pédagogique, jamais redessinée.
 * Le détail à l'accent est l'objet du sport (ballon, crampons, pédale, ski, lignes de vitesse) ; la jambe sort du cadre par le haut.
 */
function pictoDeSport(sport: Sport): Partie[] {
  const { region: [x0, y0, c], traits, accents } = pictoSport(sport);
  const e = 44 / c;
  const t: Transfo = (x, y) => [2 + (x - x0) * e, 2 + (y - y0) * e];
  const dans = (q: P) => q[0] >= 2.2 && q[0] <= 45.8 && q[1] >= 2.2 && q[1] <= 45.8;
  const d = (l: P[][]) => l.map((q) => `M${q.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')}`).join(' ');
  // Points de contrôle bornés à la grille (aux angles vifs d'une semelle, la courbe de Catmull-Rom les pousse hors du cadre)
  const borner = (x: string) => x.replace(/-?\d*\.?\d+/g, (n) => String(Math.min(46.5, Math.max(1.5, +n))));
  return [trait(borner(simplifier(d(traits), t, 0.4, dans))), accent(borner(simplifier(d(accents), t, 0.35, dans)))];
}
const DEFS_SPORTS: Record<string, Def> = Object.fromEntries(
  SPORTS.map((s) => [idPictoSport(s), { libelle: FICHES_SPORTS[s].libelle, famille: 'sports' as Famille, parties: () => pictoDeSport(s) }]),
);
Object.assign(DEFS, DEFS_SPORTS);

export type IdPicto = keyof typeof DEFS;

/** Liste des pictos (ordre de la planche), avec libellé et famille */
export const PICTOS: { id: string; libelle: string; famille: Famille }[] = Object.entries(DEFS).map(([id, d]) => ({ id, libelle: d.libelle, famille: d.famille }));
export const pictoExiste = (id: string): boolean => id in DEFS;

// Calculés une fois (formes dérivées de la géométrie partagée)
const memo = new Map<string, Partie[]>();
const parties = (id: string) => {
  let p = memo.get(id);
  if (!p) { p = DEFS[id].parties().filter((q) => q.d); memo.set(id, p); }
  return p;
};

export type OptionsPicto = {
  /** Taille en px ou unité CSS (défaut 1em) */
  taille?: string | number;
  /** Détail à l'accent (`--picto-accent`, sinon `--accent`) ; sinon tout en currentColor */
  accent?: boolean;
  /** Épaisseur : `normal` (1,5 px à 24 px, défaut) ou `fort` (2 px à 24 px) */
  trait?: 'normal' | 'fort';
  /** Texte alternatif ; absent = décoratif (aria-hidden) */
  titre?: string;
  classe?: string;
};

/** Couleur de l'accent (variable de la charte, jamais de valeur littérale) */
export const PICTO_ACCENT = 'var(--picto-accent,var(--accent,currentColor))';

/** SVG en ligne d'un picto (chaîne), ou null s'il est inconnu. Aucun <style>, aucun identifiant, aucune couleur littérale. */
export function svgPicto(id: string, opts: OptionsPicto = {}): string | null {
  if (!pictoExiste(id)) return null;
  const taille = opts.taille ?? '1em';
  const t = typeof taille === 'number' ? String(taille) : taille;
  const echappe = (s: string) => s.replace(/[<&>"]/g, '');
  const corps = parties(id)
    .map((p) => {
      const couleur = p.accent && opts.accent ? ` style="${p.plein ? 'fill' : 'stroke'}:${PICTO_ACCENT}"` : '';
      return p.plein ? `<path d="${p.d}" fill="currentColor" stroke="none"${couleur}/>` : `<path d="${p.d}"${couleur}/>`;
    })
    .join('');
  const a11y = opts.titre ? ` role="img" aria-label="${echappe(opts.titre)}"` : ' aria-hidden="true"';
  const titre = opts.titre ? `<title>${echappe(opts.titre)}</title>` : '';
  const classe = ['picto', opts.classe].filter(Boolean).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PICTO.grille} ${PICTO.grille}" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="${opts.trait === 'fort' ? PICTO.traitFort : PICTO.trait}" stroke-linecap="round" stroke-linejoin="round" class="${classe}" focusable="false"${a11y}>${titre}${corps}</svg>`;
}

// ———————————————————————————————————————————————————— Correspondances (catalogue de soins, matériel)

/** Picto métier de chaque soin du catalogue (slug) ; un soin absent garde son icône (repli Iconify) */
export const PICTOS_SOINS: Record<string, IdPicto> = {
  'bilan-podologique': 'bilan',
  'semelles-orthopediques': 'semelle-orthopedique',
  'soins-de-pedicurie': 'hallux-ongle',
  'pied-diabetique': 'pied-diabetique',
  'podologie-du-sport': 'sport-course',
  'podologie-enfant': 'premiers-pas',
  posturologie: 'plateforme-pression',
  'podologie-du-senior': 'senior-canne',
  'verrues-plantaires': 'verrue-plantaire',
  'ongle-incarne': 'ongle-incarne',
  'douleur-talon': 'talon-douloureux',
  'k-taping': 'k-taping',
  // Fiches de la migration 0020
  orthonyxie: 'orthonyxie',
  onychoplastie: 'onychoplastie',
  orthoplastie: 'orthoplastie',
  'mycose-ongles': 'mycose-ongle',
  'cors-durillons': 'cor-durillon',
  'ongles-epais': 'ongle-epais',
  'soins-a-domicile': 'soins-domicile',
};

/** Picto métier d'un équipement du catalogue (equipements.ts) ; absent = icône Iconify de l'équipement */
export const PICTOS_EQUIPEMENTS: Record<string, IdPicto> = {
  'autoclave-classe-b': 'hygiene-autoclave',
  'tracabilite-sterilisation': 'hygiene-autoclave',
  podoscope: 'podoscope',
  'plateforme-pression': 'plateforme-pression',
  stabilometrie: 'plateforme-pression',
  'analyse-video': 'analyse-marche',
  'tapis-de-course': 'analyse-marche',
  'monofilament-diapason': 'monofilament',
  'empreinte-mousse': 'empreintes',
  'atelier-semelles': 'semelle-orthopedique',
  thermoformage: 'semelle-orthopedique',
  'fauteuil-soins': 'fauteuil-soins',
};

export const pictoSoin = (slug: string): IdPicto | null => PICTOS_SOINS[slug] ?? null;
export const pictoEquipement = (id: string): IdPicto | null => PICTOS_EQUIPEMENTS[id] ?? null;

