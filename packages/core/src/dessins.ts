// Dessins techniques de la marque, en chaîne SVG : source unique du site (components/dessins/Dessin.astro,
// simple enveloppe), des animations d'accueil (components/animations/*) et de l'aperçu de l'admin.
// Trait anatomique fin, contours en pointillés (relevé de podoscope), trame hexagonale de points colorés par
// la pression, courbes de niveau. Même géométrie de pied partout (pied.ts), même trame (trame.ts).
// Couleurs (surchargeables par le parent) : --dessin-trait, --dessin-accent, --dessin-fond ; le reste vient
// de la charte. Les styles sont dans dessins.css (importé une fois par le site et par l'admin).
// Les traits marqués « trace » se dessinent quand le bloc parent apparaît (.pret.vu).
//
// Deux registres pour chaque dessin :
// - « releve » (par défaut) : langage du relevé de podoscope — trame de points colorés par la pression,
//   légendes graduées, lectures en mono ;
// - « pedagogique » : schéma de manuel d'anatomie — trait monochrome (--dessin-trait), un seul accent doux
//   (--dessin-accent), aplat clair (--dessin-fond), étiquettes simples ; ni trame, ni lecture, ni légende.
//
// svgAnimationFixe : image fixe et fidèle de chaque animation d'accueil, pour les aperçus (fond transparent,
// l'appelant pose le fond sombre « plan ») ; en registre pédagogique, le schéma calme du même sujet.
import { CONTOUR, ORTEILS, PLANTE, PLANTE_ENFANT, ORTEILS_ENFANT, TRAJET, SEMELLE, PROFIL, piedCroissance, dansPolygone, lisser, type P } from './pied';
import { trame, pointsTrame, grouperTrame, isolignes, dansPlante, pression, type Appui, type Champ } from './trame';
import { PRESSION, ARRETS_PRESSION, couleurPression, type NomDessin } from './univers';
import { TRAIT, TRAME, NEUTRES, PLAN, POINTILLE, POLICE_MONO, TYPO, transparence } from './charte';
import type { Animation } from './packs';

/** Registre graphique d'un dessin : relevé de podoscope (données) ou schéma pédagogique (trait seul) */
export type Registre = 'releve' | 'pedagogique';
export const REGISTRES: readonly Registre[] = ['releve', 'pedagogique'];

const r1 = (v: number) => +v.toFixed(1);
const echapper = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// ———————————————————————————————————————————————————— Géométrie

/** Transformation affine [a, b, c, d, e, f] : x' = a·x + c·y + e, y' = b·x + d·y + f */
type Affine = [number, number, number, number, number, number];
const appliquer = (m: Affine, x: number, y: number): P => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/**
 * Pied posé dans un dessin : centre de la plante (46, 111) en (cx, cy), orteils orientés selon `angle`
 * (degrés, 0 = vers le haut), échelle `e`, pied gauche par symétrie, `etirement` de la largeur (pied d'enfant).
 */
const poser = (cx: number, cy: number, angle: number, e: number, gauche = false, etirement = 1): Affine => {
  const t = (angle * Math.PI) / 180, cos = Math.cos(t), sin = Math.sin(t);
  const sx = e * etirement * (gauche ? -1 : 1), sy = e;
  const a = cos * sx, b = sin * sx, c = -sin * sy, d = cos * sy;
  return [a, b, c, d, cx - a * 46 - c * 111, cy - b * 46 - d * 111];
};
/** Applique une transformation à un tracé en coordonnées absolues (commandes M, C, L, Z) : le trait garde sa graisse */
const transformer = (d: string, m: Affine) =>
  d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, (_, x, y) => appliquer(m, +x, +y).map(r1).join(' '));

/** Orteils en tracés fermés (ellipses échantillonnées), pour pouvoir les transformer comme le contour */
const ORTEILS_TRACE = ORTEILS.map(([cx, cy, rx, ry, r]) => {
  const t = (r * Math.PI) / 180;
  const pts: P[] = Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * 2 * Math.PI;
    return [r1(cx + rx * Math.cos(a) * Math.cos(t) - ry * Math.sin(a) * Math.sin(t)), r1(cy + rx * Math.cos(a) * Math.sin(t) + ry * Math.sin(a) * Math.cos(t))];
  });
  return lisser(pts);
}).join(' ');
/** Contour de la plante et des orteils détachés (empreinte au podoscope) en un seul tracé */
const PIED_TRACE = `${CONTOUR} ${ORTEILS_TRACE}`;

type Orteils = [number, number, number, number, number][];
/** Le point est-il dans un orteil (ellipse prolongée vers la plante, pour le rattacher au pied) ? */
function dansOrteil(x: number, y: number, [cx, cy, rx, ry, r]: Orteils[number]): boolean {
  const t = (-r * Math.PI) / 180;
  const u = (x - cx) * Math.cos(t) - (y - cy) * Math.sin(t), v = (x - cx) * Math.sin(t) + (y - cy) * Math.cos(t);
  return (u / rx) ** 2 + (v / ry) ** 2 <= 1 || (v > 0 && v < ry + 10 && Math.abs(u) < rx * 0.78);
}
/** Le point est-il dans le pied (plante et orteils) ? */
const dansPied = (plante: P[], orteils: Orteils) => (x: number, y: number) => dansPolygone(plante, x, y) || orteils.some((o) => dansOrteil(x, y, o));
const memoSilhouette = new Map<string, string>();
/**
 * Silhouette du pied vu de dessous, orteils intégrés au contour (registre pédagogique, croissance) : le bord
 * de la plante (talon, voûte, bord externe) puis, à l'avant, l'arrondi de chaque orteil séparé du suivant par
 * un petit pli, le tout lissé en un seul tracé fermé. Mêmes points que la plante (pied.ts).
 */
function silhouette(plante: P[] = PLANTE, orteils: Orteils = ORTEILS): string {
  const cle = JSON.stringify([plante, orteils]);
  const deja = memoSilhouette.get(cle);
  if (deja) return deja;
  const sur = ([cx, cy, rx, ry, r]: Orteils[number], a: number): P => {
    const t = (r * Math.PI) / 180, u = (a * Math.PI) / 180;
    return [r1(cx + rx * Math.cos(u) * Math.cos(t) - ry * Math.sin(u) * Math.sin(t)), r1(cy + rx * Math.cos(u) * Math.sin(t) + ry * Math.sin(u) * Math.cos(t))];
  };
  const points: P[] = [...plante.slice(0, 14)];
  orteils.forEach((o, i) => {
    const angles = i === 0 ? [176, 224, 270, 316, 4] : [186, 240, 300, 354];
    points.push(...angles.map((a) => sur(o, a)));
    const suivant = orteils[i + 1];
    if (suivant) {
      // Pli entre deux orteils : sous le milieu de leurs bords voisins
      const [x1] = sur(o, 0), [x2] = sur(suivant, 180);
      points.push([r1((x1 + x2) / 2), r1((o[1] + suivant[1]) / 2 + 0.3 * (o[3] + suivant[3]) / 2)]);
    }
  });
  points.push(...plante.slice(21));
  const d = lisser(points);
  memoSilhouette.set(cle, d);
  return d;
}
/** Empreinte du pied de l'enfant (plante comblée ; orteils ronds, détachés comme sur un relevé) */
const dansEnfant = (x: number, y: number) =>
  dansPolygone(PLANTE_ENFANT, x, y) || ORTEILS_ENFANT.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);

/** Courbe ouverte passant par les points (Catmull-Rom) */
function courbe(points: P[]): string {
  const n = points.length;
  const pt = (i: number) => points[Math.max(0, Math.min(n - 1, i))];
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

/** Enveloppe convexe (polygone d'appui de deux pieds) */
function enveloppe(points: P[]): P[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const x = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const bas: P[] = [], haut: P[] = [];
  for (const q of p) { while (bas.length > 1 && x(bas[bas.length - 2], bas[bas.length - 1], q) <= 0) bas.pop(); bas.push(q); }
  for (const q of [...p].reverse()) { while (haut.length > 1 && x(haut[haut.length - 2], haut[haut.length - 1], q) <= 0) haut.pop(); haut.push(q); }
  return [...bas.slice(0, -1), ...haut.slice(0, -1)];
}
/** Points du contour d'un pied (plante et pointe des orteils), pour une enveloppe */
const POINTS_PIED: P[] = [...PLANTE, ...ORTEILS.map(([cx, cy, , ry]) => [cx, cy - ry] as P)];

/** Pseudo-aléatoire déterministe (rendu serveur = rendu navigateur) */
const hasard = (graine: number) => () => ((graine = (graine * 16807) % 2147483647) - 1) / 2147483646;

/** Statokinésigramme illustratif : oscillations du centre de pression autour de (cx, cy) */
function oscillations(cx: number, cy: number, ax: number, ay: number, n = 34, graine = 7): string {
  const h = hasard(graine);
  let x = 0, y = 0;
  const pts: P[] = [];
  for (let i = 0; i < n; i++) {
    x = x * 0.72 + (h() - 0.5) * 0.9; y = y * 0.72 + (h() - 0.5) * 0.9;
    pts.push([cx + x * ax, cy + y * ay]);
  }
  return courbe(pts);
}

// ———————————————————————————————————————————————————— Champs illustratifs (sans valeur de mesure)

const g2 = (x: number, y: number, cx: number, cy: number, sx: number, sy = sx) => Math.exp(-((x - cx) ** 2) / (2 * sx * sx) - ((y - cy) ** 2) / (2 * sy * sy));
/** Têtes métatarsiennes (repère du pied droit), du 1er au 5e rayon */
const TETES: P[] = [[30, 62], [44, 56], [54, 58], [63, 63], [71, 70]];

/**
 * Semelle thermoformée en courbes d'appui : cuvette du talon, soutien de la voûte (interne), appui
 * latéral, barre des têtes métatarsiennes, hallux et pulpe des orteils. Nul au bord du repère.
 */
export function champSemelle(x: number, y: number): number {
  let v = 0.98 * g2(x, y, 47, 192, 12.5, 15);
  TETES.forEach(([a, b], i) => (v += [0.62, 0.5, 0.46, 0.4, 0.34][i] * g2(x, y, a, b, 7.5, 8)));
  v += 0.9 * g2(x, y, 27, 18, 6.5, 8);
  // Socle : surface de contact de l'empreinte (voûte exclue), orteils compris
  // (moyenne sur cinq points pour un bord lisse ; petits orteils exclus, la semelle les couvre)
  if (!(y < 38 && x > 36)) {
    const contact = (a: number, b: number) => (dansPlante(a, b) && pression('normal', a, b) > 0 ? 1 : 0);
    v += 0.2 * (contact(x, y) + contact(x - 3, y) + contact(x + 3, y) + contact(x, y - 3) + contact(x, y + 3)) / 5;
  }
  v += 0.26 * g2(x, y, 69, 128, 6.5, 30);
  v += 0.4 * g2(x, y, 33, 124, 6, 17);
  return v;
}
/** Seuils des courbes de la semelle, du niveau faible au pic (couleurs de la palette de pression) */
const SEUILS_SEMELLE = [0.17, 0.33, 0.5, 0.67, 0.84] as const;
let memoSemelle: ReturnType<typeof isolignes> | null = null;
/** Courbes de niveau de la semelle (repère du pied droit) : un groupe de boucles par seuil */
export const courbesSemelle = () => (memoSemelle ??= isolignes(champSemelle, SEUILS_SEMELLE, 2, 6, 3));

/** Pied d'enfant qui marche : appui marqué au talon et sous l'avant-pied, voûte encore peu creusée */
const champEnfant = (x: number, y: number) =>
  pression('enfant', x, y) > 0 ? Math.min(1, 0.3 + 0.7 * g2(x, y, 47, 192, 14, 17) + 0.55 * g2(x, y, 42, 60, 17, 12) + 0.5 * g2(x, y, 27, 17, 8) + 0.12 * g2(x, y, 68, 130, 10, 26)) : 0;

/** Zones d'appui d'une empreinte (registre pédagogique) : surface de contact et zones de forte pression */
const memoEmpreinte = new Map<string, { contact: string; fort: string }>();
function empreinte(appui: Appui): { contact: string; fort: string } {
  const deja = memoEmpreinte.get(appui);
  if (deja) return deja;
  const [contact, fort] = isolignes((x, y) => (dansPlante(x, y) ? pression(appui, x, y) : 0), [0.03, 0.62], 2.5, 6, 3);
  const z = { contact: contact.boucles.join(' '), fort: fort.boucles.join(' ') };
  memoEmpreinte.set(appui, z);
  return z;
}

// ———————————————————————————————————————————————————— Briques des dessins (repère 240 × 180)

// Échelle d'un pied (repère 92 × 222) dans le dessin.
const E = 0.68;
const piedDroit = (x: number, y: number, e = E) => `translate(${x} ${y}) scale(${e})`;
const piedGauche = (x: number, y: number, e = E) => `translate(${r1(x + 92 * e)} ${y}) scale(${-e} ${e})`;
// Sites du test au monofilament (repère du pied).
const SITES: [number, number][] = [[27, 16], [56, 20], [75, 35], [24, 62], [48, 50], [72, 62], [34, 120], [68, 132], [48, 196]];

/** Trame de points d'un pied (un tracé par niveau de pression) */
const traceTrame = (appui: Appui, pas?: number) =>
  `<g class="trame">${trame(appui, pas).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}" style="--k:${n.k}"></path>`).join('')}</g>`;
/** Trame d'un champ quelconque (repère du pied) */
const traceChamp = (champ: Champ, pas?: number) =>
  `<g class="trame">${grouperTrame(pointsTrame(champ, pas), pas).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}" style="--k:${n.k}"></path>`).join('')}</g>`;
/** Trame hexagonale dans un disque (repère du dessin) : valeur maximale au centre, décroissante au bord */
function trameDisque(cx: number, cy: number, r: number, pas: number, garder: (x: number, y: number) => boolean = () => true): string {
  const pts = [];
  for (let rang = 0, y = cy - r; y <= cy + r; rang++, y += pas * 0.866) {
    for (let x = cx - r + (rang % 2 ? pas / 2 : 0); x <= cx + r; x += pas) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d <= 1 && garder(x, y)) pts.push({ x: r1(x), y: r1(y), v: Math.min(1, 1.08 - d * 0.85) });
    }
  }
  return `<g class="trame">${grouperTrame(pts, pas).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}" style="--k:${n.k}"></path>`).join('')}</g>`;
}

const mono = (x: number, y: number, t: string, classe = '', ancre = 'start') =>
  `<text class="mono${classe ? ` ${classe}` : ''}" x="${r1(x)}" y="${r1(y)}"${ancre === 'start' ? '' : ` text-anchor="${ancre}"`}>${t}</text>`;
/** Étiquette du registre pédagogique, reliée au point désigné par un renvoi fin */
const etiquette = (x: number, y: number, t: string, ancre: 'start' | 'end' | 'middle' = 'start') =>
  `<text class="etiquette" x="${r1(x)}" y="${r1(y)}"${ancre === 'start' ? '' : ` text-anchor="${ancre}"`}>${t}</text>`;
const renvoi = (x1: number, y1: number, x2: number, y2: number) =>
  `<path class="renvoi" d="M${r1(x1)} ${r1(y1)} L${r1(x2)} ${r1(y2)}"></path><circle class="ancre" cx="${r1(x1)}" cy="${r1(y1)}" r="1.6"></circle>`;
/** Légende graduée verticale de la pression (registre relevé) */
const legende = (degrade: string, x = 218, y = 30, h = 116) =>
  `<g class="legende"><rect x="${x}" y="${y}" width="5" height="${h}" fill="url(#${degrade})"></rect>${[0, 0.25, 0.5, 0.75, 1]
    .map((t) => `<line class="cote" x1="${x - 4}" x2="${x - 1}" y1="${r1(y + h * t)}" y2="${r1(y + h * t)}"></line>`)
    .join('')}${mono(x + 2.5, y - 6, '+', '', 'middle')}${mono(x + 2.5, y + h + 12, '−', '', 'middle')}</g>`;

// Soin : loupe sur l'ongle du gros orteil, reliée au détail agrandi par ses deux tangentes extérieures.
const S = { x: 14, y: 20, e: 0.64 };
const c1 = { x: S.x + (92 - 27) * S.e, y: S.y + 9 * S.e, r: 12 };
const c2 = { x: 170, y: 92, r: 56 };
/** Tangentes extérieures communes à deux cercles (loupe et détail agrandi) */
function tangentes(a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  const t = Math.atan2(dy, dx), k = Math.acos((a.r - b.r) / d);
  return [t + k, t - k].map((n) => `<line class="trace liaison" pathLength="1" x1="${r1(a.x + a.r * Math.cos(n))}" y1="${r1(a.y + a.r * Math.sin(n))}" x2="${r1(b.x + b.r * Math.cos(n))}" y2="${r1(b.y + b.r * Math.sin(n))}"></line>`).join('');
}

// Sport : chaussure de course de profil (talon à gauche), hauteurs de semelle au talon et à l'avant-pied.
const SOL = 150;
const LACETS = [[118, 82], [129, 88], [140, 94], [151, 99], [162, 104]];

// Profil du pied (pied articulé, épure : peau ouverte, colonne interne du squelette) posé dans le dessin.
const PF = { s: 1.62, x: 22, y: 52.7 };
const profil: Affine = [PF.s, 0, 0, PF.s, PF.x, PF.y];
const [RX, RY, RK] = PROFIL.epure.reduction;
const osProfil: Affine = [PF.s * RK, 0, 0, PF.s * RK, PF.x + PF.s * RX, PF.y + PF.s * RY];
const enProfil = (x: number, y: number) => appliquer(profil, x, y);
/** Plante du pied de profil : talon, voûte (relevée), têtes métatarsiennes, pulpe des orteils */
const PLANTE_PROFIL = 'M13.5 58.5 C24 58.5 32 57.6 40 55.4 C52 52.4 66 52.6 80 55.6 C90 57.8 104 58.6 116.5 58.5';

/** Contexte d'un dessin : identifiants internes et registre */
type Contexte = { pied: string; sil: string; degrade: string; loupe: string; R: boolean };

/** Corps de chaque dessin (repère 240 × 180) */
function corps(nom: NomDessin, c: Contexte): string {
  const { pied, sil, degrade, loupe, R } = c;
  const use = (classe: string) => (/\btrait\b/.test(classe) ? `<use href="#${sil}" class="${classe}"></use>` : `<use href="#${pied}" class="${classe}"></use>`);
  // Pied du registre : pointillés (relevé) ou trait avec aplat clair (pédagogique)
  const contour = (leger = false) => (R ? use(leger ? 'pointille pointille--leger' : 'pointille') : use('trait peau'));
  const zones = (appui: Appui) => (R ? '' : `<path class="zone" d="${empreinte(appui).contact}"></path><path class="zone zone--forte" d="${empreinte(appui).fort}"></path>`);
  const grille = (ys: number[]) => (R ? `<g class="grille">${ys.map((y) => `<line x1="16" x2="200" y1="${y}" y2="${y}"></line>`).join('')}</g>` : '');

  switch (nom) {
    case 'analyse':
      return `<g>${grille([40, 80, 120, 160])}${[piedGauche(52, 12), piedDroit(126, 12)]
        .map((t) => `<g transform="${t}">${contour(true)}${R ? traceTrame('normal') : zones('normal')}</g>`)
        .join('')}${R ? legende(degrade) : `${renvoi(170, 52, 196, 40)}${etiquette(198, 42, 'Avant-pied')}${renvoi(172, 142, 196, 152)}${etiquette(198, 155, 'Talon')}${renvoi(150, 100, 196, 96)}${etiquette(198, 99, 'Voûte')}`}</g>`;

    case 'appuis':
      return `<g>${grille([30, 60, 90, 120, 150])}<g transform="${piedDroit(30, 8, 0.74)}">${contour(true)}${R ? `${traceTrame('avant')}<circle class="anneau-chaud" cx="32" cy="60" r="14"></circle><circle class="anneau-chaud pulse" cx="32" cy="60" r="14"></circle>` : zones('avant')}</g>${
        R
          ? `<line class="trace fin" pathLength="1" x1="${30 + 32 * 0.74 + 11}" y1="${8 + 60 * 0.74 - 6}" x2="150" y2="38"></line>${mono(152, 40, 'zone d’appui')}<g class="barres">${mono(128, 122, 'pic')}<rect class="piste" x="148" y="117" width="56" height="5"></rect><rect class="barre" x="148" y="117" width="49" height="5" fill="var(--d-chaud)"></rect>${mono(128, 136, 'moy.')}<rect class="piste" x="148" y="131" width="56" height="5"></rect><rect class="barre" x="148" y="131" width="25" height="5" fill="var(--d-froid)"></rect></g><g class="legende"><rect x="218" y="30" width="5" height="116" fill="url(#${degrade})"></rect><path class="curseur" d="M213 44 l-6 -3.5 v7 z"></path></g>`
          : `${renvoi(66, 52, 120, 40)}${etiquette(124, 43, 'Zone d’appui')}`
      }</g>`;

    case 'semelle': {
      // À gauche, la semelle vue de dessus en courbes d'appui ; à droite, le pied de profil posé sur la
      // semelle : talonnette, soutien de voûte qui comble l'espace sous l'arche, appui sous l'avant-pied.
      const courbes = courbesSemelle()
        .map(({ boucles }, k) =>
          R
            ? `<path class="trace niveau" pathLength="1" d="${boucles.join(' ')}" style="--k:${k};stroke:${PRESSION[k]};stroke-width:${r1(TRAIT.normal / 0.62)}"></path>`
            : `<path class="iso" d="${boucles.join(' ')}" style="--k:${k};stroke-opacity:${r1(0.35 + k * 0.15)};stroke-width:${r1(TRAIT.normal / 0.62)}"></path>`,
        )
        .join('');
      const vue: Affine = [1.12, 0, 0, 1.12, 104, 80];
      const ep = PROFIL.epure;
      const sur = (x: number, y: number) => appliquer(vue, x, y);
      // Semelle de profil : dessus qui épouse la plante (cuvette du talon, voûte comblée), dessous à plat
      const dessus: P[] = [[3.6, 49], [4.6, 55], [9.5, 58.4], [16, 59], [26, 58.4], [38, 55.8], [50, 53.1], [60, 53.1], [72, 55.3], [84, 57.8], [98, 58.9], [110, 59.1]];
      const semelle = `${courbe(dessus.map(([x, y]) => sur(x, y)))} L${sur(113, 61.6).map(r1).join(' ')} L${sur(9, 61.6).map(r1).join(' ')} C${sur(5, 61.6).map(r1).join(' ')} ${sur(3, 58).map(r1).join(' ')} ${sur(3.6, 49).map(r1).join(' ')} Z`;
      const sol = r1(sur(0, 61.6)[1] + 1);
      const reperes: [number, number, string][] = [[9, 61, 'Talonnette'], [54, 61, 'Soutien de voûte'], [94, 61, 'Avant-pied']];
      return `<g><g transform="${piedDroit(16, 22, 0.62)}"><path class="${R ? 'semelle-bord' : 'trait peau'}" d="${SEMELLE}"></path>${courbes}</g><line class="sol" x1="98" y1="${sol}" x2="236" y2="${sol}"></line><path class="${R ? 'semelle-profil' : 'semelle-profil semelle-profil--pedago'}" d="${semelle}"></path><path class="trait peau" d="${transformer(`${ep.talon} ${ep.dos}`, vue)}"></path><path class="os os--leger" d="${transformer(ep.os.join(' '), [1.12 * RK, 0, 0, 1.12 * RK, 104 + 1.12 * RX, 80 + 1.12 * RY])}"></path><path class="trait" d="${transformer(PLANTE_PROFIL, vue)}"></path>${reperes
        .map(([x, y, t], k) => {
          const [ax, ay] = sur(x, y);
          const [lx, ly, ancre] = ([[100, 164, 'start'], [162, 176, 'middle'], [236, 164, 'end']] as const)[k];
          return `${renvoi(ax, ay, lx, ly - 8)}${R ? mono(lx, ly, t.toLowerCase(), k === 1 ? 'mono--accent' : '', ancre) : etiquette(lx, ly, t, ancre)}`;
        })
        .join('')}${R ? `${mono(16, 14, 'COURBES D’APPUI')}${mono(232, 22, 'semelle thermoformée', 'mono--accent', 'end')}` : ''}</g>`;
    }

    case 'soin':
      return `<g><g transform="${piedGauche(S.x, S.y, S.e)}">${use('trait peau')}${ORTEILS.map(
        ([cx, cy, rx, ry, r]) => `<rect class="ongle-petit" x="${cx - rx * 0.55}" y="${cy - ry * 0.8}" width="${rx * 1.1}" height="${ry * 0.85}" rx="${rx * 0.45}" transform="rotate(${r} ${cx} ${cy})"></rect>`,
      ).join('')}</g><circle class="trace mire" cx="${r1(c1.x)}" cy="${r1(c1.y)}" r="${c1.r}" pathLength="1"></circle>${tangentes(c1, c2)}<circle class="fond-loupe" cx="${c2.x}" cy="${c2.y}" r="${c2.r}"></circle><g clip-path="url(#${loupe})" class="zoom"><path class="trace${R ? '' : ' peau'}" pathLength="1" d="M136 162 C134 128 136 88 149 68 C157 54 183 54 191 68 C204 88 206 128 204 162"></path><path class="trace ongle" pathLength="1" d="M150 84 C151 72 189 72 190 84 L193 124 C183 131 157 131 147 124 Z"></path><path class="trace fin" pathLength="1" d="M155 121 C163 111 177 111 185 121"></path><path class="trace fin" pathLength="1" d="M152 82 C162 77 178 77 188 82"></path><path class="sillon" d="M143 82 C139 98 139 114 142 132"></path><path class="sillon" d="M197 82 C201 98 201 114 198 132"></path>${
        R
          ? `<circle class="anneau-chaud pulse" cx="142" cy="104" r="9"></circle>${(
              [[142, 96, 3.2, 'var(--d-chaud)'], [141.2, 106, 2.8, 'var(--d-haut)'], [142, 116, 2.2, 'var(--d-doux)']] as const
            )
              .map(([x, y, r, col], k) => `<circle class="point" cx="${x}" cy="${y}" r="${r}" fill="${col}" style="--k:${k}"></circle>`)
              .join('')}`
          : `<path class="zone zone--forte" d="M139 90 C135 104 136 118 140 128 C144 118 145 102 143 90 Z"></path>`
      }</g><circle class="trace loupe" cx="${c2.x}" cy="${c2.y}" r="${c2.r}" pathLength="1"></circle>${
        R ? mono(c2.x + c2.r + 2, c2.y + c2.r + 10, '× 6', '', 'end') : `${etiquette(c2.x, c2.y + c2.r + 14, 'Ongle et sillons', 'middle')}`
      }</g>`;

    case 'diabete':
      return `<g><g transform="${piedDroit(56, 10, 0.72)}">${contour()}${SITES.map(
        ([x, y], k) => `<g style="--k:${k}" class="site"><circle class="anneau" cx="${x}" cy="${y}" r="8.5"></circle><circle class="point" cx="${x}" cy="${y}" r="3" fill="var(--d-accent)" style="--k:${k}"></circle></g>`,
      ).join('')}</g><g class="filament"><rect class="trace${R ? '' : ' peau'}" pathLength="1" x="176" y="24" width="12" height="62" rx="6"></rect><path class="trace" pathLength="1" d="M182 86 C182 104 178 116 168 126"></path><circle class="point" cx="168" cy="126" r="2.6" fill="${R ? 'var(--d-chaud)' : 'var(--d-accent)'}" style="--k:10"></circle></g>${
        R ? mono(170, 150, '10 g · 9 sites') : `${etiquette(170, 40, 'Monofilament', 'end')}${etiquette(166, 150, 'Points testés', 'middle')}`
      }</g>`;

    case 'sport':
      // Courbe de force verticale pendant l'appui (double bosse : impact puis propulsion), sol, semelle
      // crantée (plus épaisse au talon : drop), tige, cotes des hauteurs de semelle, force de réaction du sol.
      return `<g>${
        R
          ? `<g class="courbe"><line class="cote" x1="172" y1="44" x2="230" y2="44"></line><line class="cote" x1="172" y1="44" x2="172" y2="10"></line><path class="trace force-courbe" pathLength="1" d="M172 44 C176 44 177 22 181 20 C184 19 185 29 189 29 C195 29 197 12 204 12 C212 12 214 44 222 44"></path>${mono(174, 9, 'F(t)')}</g>`
          : ''
      }<line class="sol" x1="12" y1="${SOL}" x2="232" y2="${SOL}"></line><g class="hachures">${Array.from(
        { length: 22 },
        (_, k) => `<line x1="${16 + k * 10}" y1="${SOL + 2}" x2="${10 + k * 10}" y2="${SOL + 8}"></line>`,
      ).join(
        '',
      )}</g><path class="trace semelle${R ? '' : ' peau'}" pathLength="1" d="M44 126 C37 129 35 138 36 143 C37 147 41 150 47 150 L150 150 C172 150 196 147 213 138 C218 135 218 131 212 131 C200 132 186 133 172 133 C140 132 90 128 44 126 Z"></path><path class="trace fin" pathLength="1" d="M38 144.5 C40 145 43 145 47 145 L150 145 C171 145 193 142.5 209 135"></path><path class="crampons" d="M49 147.6 L150 147.6 C171 147.6 192 145 208 137"></path><path class="trace fin" pathLength="1" d="M44 136 C80 138 130 140 170 141 C186 141 200 139 210 136"></path><path class="trace" pathLength="1" d="M44 126 C38 112 38 98 44 88 C48 82 55 81 60 85 C66 90 75 91 83 87 C89 83 93 77 99 73 C103 70 108 71 110 75 C123 89 150 102 180 112 C196 117 208 123 212 131"></path><path class="trace fin" pathLength="1" d="M49 121 C46 110 47 99 53 92"></path><path class="trace fin" pathLength="1" d="M180 133 C186 123 200 122 210 127"></path><path class="trace fin" pathLength="1" d="M66 122 C92 116 128 112 166 111"></path><path class="trace fin" pathLength="1" d="M45 89 C41 86 41 81 45 80 C48 79 51 81 52 84"></path>${LACETS.map(
        ([x, y], k) => `<g><circle class="oeillet" cx="${x}" cy="${y}" r="1.5"></circle><line class="lacet" x1="${x + 2.4}" y1="${y - 4.6}" x2="${x - 2.4}" y2="${y + 4.6}" style="--k:${k}"></line></g>`,
      ).join('')}${
        R
          ? `<line class="guide" x1="20" y1="126" x2="44" y2="126"></line><line class="cote" x1="24" y1="126" x2="24" y2="${SOL}"></line><line class="cote" x1="21" y1="126" x2="27" y2="126"></line>${mono(20, 141, '32', '', 'end')}<line class="guide" x1="172" y1="133" x2="230" y2="133"></line><line class="cote" x1="226" y1="133" x2="226" y2="${SOL}"></line><line class="cote" x1="223" y1="133" x2="229" y2="133"></line>${mono(231, 145, '24')}${mono(124, 172, 'drop 8 mm', 'mono--accent', 'middle')}<line class="trace force" pathLength="1" x1="62" y1="${SOL}" x2="55" y2="104"></line><path class="force-fleche" d="M51.2 112.8 L55 103.2 L60.6 111.8"></path><circle class="point" cx="62" cy="${SOL}" r="3" fill="var(--d-chaud)" style="--k:2"></circle>${mono(62, 112, 'FRS', 'mono--chaud')}`
          : `<path class="zone zone--forte" d="M40 140 C40 146 43 148 48 148 L110 148 C110 144 108 141 104 140 Z"></path>${renvoi(80, 146, 96, 166)}${etiquette(100, 170, 'Semelle et amorti')}${renvoi(120, 92, 150, 62)}${etiquette(152, 60, 'Tige')}`
      }</g>`;

    case 'enfant': {
      // Croissance du pied : le même pied à 1, 3, 6 et 10 ans, alignés au talon, pointure en regard. Le pied
      // du tout-petit paraît plat : le coussinet graisseux comble encore la voûte (physiologique).
      const AGES = [{ age: '1 an', p: 20, t: 0, l: 12.5 }, { age: '3 ans', p: 25, t: 0.3, l: 15.5 }, { age: '6 ans', p: 30, t: 0.62, l: 19 }, { age: '10 ans', p: 34, t: 0.9, l: 22 }];
      const X0 = 104, Y0 = 170, REGLE = 176;
      const pieds = AGES.map((a, k) => {
        // Le pied du tout-petit est proportionnellement plus large : la largeur s'affine avec l'âge
        const e = (0.7 * a.l) / 22, large = 1 + 0.22 * (1 - a.t);
        const m: Affine = [e * large, 0, 0, e, X0 - 48 * e * large, Y0 - 219 * e];
        const { plante, orteils } = piedCroissance(a.t);
        const haut = Math.min(...orteils.map(([, cy, , ry]) => cy - ry));
        return { ...a, k, e, m, plante, orteils, y: r1(Y0 - (219 - haut) * e), x: r1(X0 + (27 - 48) * e * large) };
      });
      const petit = pieds[0];
      const trameBebe = R
        ? grouperTrame(pointsTrame((x, y) => Math.min(1, 0.32 + 0.6 * g2(x, y, 47, 192, 15, 18) + 0.42 * g2(x, y, 44, 62, 18, 13) + 0.38 * g2(x, y, 27, 20, 8)), TRAME.pasEnfant, dansEnfant), TRAME.pasEnfant)
            .map((n) => `<path d="${poserTrame(n.d, petit.m)}" stroke="${n.couleur}" stroke-width="${r1(n.epaisseur * petit.e)}"></path>`)
            .join('')
        : '';
      const contours = [...pieds]
        .reverse()
        .map((q) => {
          const d = transformer(silhouette(q.plante, q.orteils), q.m);
          if (R) return `<path class="pointille ${q.k ? 'pointille--leger' : ''}" d="${d}"></path>`;
          return `<path class="${q.k ? 'trait croissance' : 'trait peau'}" d="${d}" style="--age:${q.k}"></path>`;
        })
        .join('');
      const [cx, cy] = appliquer(petit.m, 22, 128);
      return `<g>${contours}${R ? `<g class="trame">${trameBebe}</g>` : `<ellipse class="zone zone--forte" cx="${r1(cx + 1)}" cy="${r1(cy)}" rx="${r1(6 * petit.e * 1.6)}" ry="${r1(24 * petit.e)}"></ellipse>`}<line class="trace" pathLength="1" x1="${REGLE}" y1="${Y0}" x2="${REGLE}" y2="${r1(pieds[3].y - 6)}"></line><line class="cote" x1="${REGLE - 4}" y1="${Y0}" x2="${REGLE + 4}" y2="${Y0}"></line>${pieds
        .map((q) => `<line class="guide" x1="${q.x}" y1="${q.y}" x2="${REGLE}" y2="${q.y}"></line><line class="cote" x1="${REGLE - 4}" y1="${q.y}" x2="${REGLE + 4}" y2="${q.y}"></line>${R ? mono(REGLE + 8, q.y + 2.5, `${q.age} · ${q.p}`) : etiquette(REGLE + 8, q.y + 2.5, `${q.age} · ${q.p}`)}`)
        .join('')}${R ? mono(REGLE - 6, Y0 + 9, 'âge · pointure', 'mono--accent', 'end') : `${etiquette(REGLE - 6, Y0 + 9, 'âge · pointure', 'end')}${renvoi(cx - 3, cy, 40, 112)}${etiquette(8, 100, 'Voûte comblée')}${etiquette(8, 109, 'par un coussinet')}`}</g>`;
    }

    case 'equilibre': {
      // Stabilométrie : deux pieds sur la plateforme, polygone de sustentation, oscillations du centre de pression
      const tg = poser(92, 104, -4, 0.52, true), td = poser(148, 104, 4, 0.52);
      const poly = enveloppe([...POINTS_PIED.map(([x, y]) => appliquer(tg, x, y)), ...POINTS_PIED.map(([x, y]) => appliquer(td, x, y))]);
      const polygone = `M${poly.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')} Z`;
      const piedPose = (m: Affine) =>
        R
          ? `<path class="pointille pointille--leger" d="${transformer(PIED_TRACE, m)}"></path>${grouperTrame(pointsTrame('reparti'), TRAME.pas)
              .map((n) => `<path d="${poserTrame(n.d, m)}" stroke="${n.couleur}" stroke-width="${r1(n.epaisseur * 0.52)}"></path>`)
              .join('')}`
          : `<path class="trait peau" d="${transformer(silhouette(), m)}"></path>`;
      return `<g>${R ? '' : `<path class="zone" d="${polygone}"></path>`}<path class="trace polygone" pathLength="1" d="${polygone}"></path>${piedPose(tg)}${piedPose(td)}<path class="trace oscillation" pathLength="1" d="${oscillations(120, 112, 7, 10, 22)}"></path><circle class="point" cx="120" cy="112" r="3" fill="${R ? 'var(--d-chaud)' : 'var(--d-accent)'}" style="--k:2"></circle>${
        R ? `${mono(16, 22, 'STABILOMÉTRIE')}${mono(16, 32, 'surface 92 mm² · 30 s', 'mono--accent')}${mono(224, 172, 'polygone d’appui', '', 'end')}` : `${etiquette(16, 24, 'Polygone d’appui')}${renvoi(124, 118, 150, 170)}${etiquette(154, 173, 'Oscillations du corps')}`
      }</g>`;
    }

    case 'talon': {
      // Douleur au talon : pied de profil (peau, colonne interne du squelette), aponévrose plantaire tendue du
      // calcanéum aux têtes métatarsiennes, zone d'insertion sur la tubérosité du calcanéum.
      const ep = PROFIL.epure;
      const [ix, iy] = enProfil(16, 52.5);
      const aponevrose = [[85, 49], [90, 51.5], [95, 54]].map(([x, y]) => transformer(`M14 54 C30 57 50 56 64 54.5 C72 53.4 78 ${y - 2} ${x} ${y}`, profil)).join(' ');
      return `<g><line class="sol" x1="12" y1="${r1(enProfil(0, 58.5)[1] + 1.5)}" x2="232" y2="${r1(enProfil(0, 58.5)[1] + 1.5)}"></line><path class="trait${R ? '' : ' peau'}" d="${transformer(`${ep.talon} ${ep.dos}`, profil)}"></path><path class="trait" d="${transformer(PLANTE_PROFIL, profil)}"></path><path class="os" d="${transformer(ep.os.join(' '), osProfil)}"></path><path class="aponevrose" d="${aponevrose}"></path>${
        R
          ? `${trameDisque(ix, iy, 13, 3.4)}<line class="trace fin" pathLength="1" x1="${r1(ix + 4)}" y1="${r1(iy + 6)}" x2="70" y2="168"></line>${mono(72, 170, 'insertion calcanéenne')}${mono(232, 22, 'APONÉVROSE PLANTAIRE', '', 'end')}${mono(232, 32, 'mise en tension · appui talon', 'mono--accent', 'end')}`
          : `<ellipse class="zone zone--forte" cx="${r1(ix)}" cy="${r1(iy)}" rx="11" ry="8"></ellipse>${renvoi(ix - 4, iy - 10, 30, 22)}${etiquette(20, 18, 'Calcanéum')}${renvoi(enProfil(55, 55.6)[0], enProfil(55, 55.6)[1], 112, 172)}${etiquette(116, 175, 'Aponévrose plantaire')}`
      }</g>`;
    }

    case 'ongle': {
      // Ongle incarné : coupe transversale du gros orteil — tablette de l'ongle, lit, phalange, bourrelets
      // latéraux ; à droite, le bord de l'ongle s'enfonce sous le bourrelet enflammé.
      const garder = (x: number, y: number) => y > 68 && x > 164;
      return `<g><path class="trait peau" d="M92 84 C88 79 82 78 76 81 C64 88 60 102 62 116 C66 138 94 152 128 152 C162 152 190 138 194 116 C197 98 194 80 184 72 C176 66 168 70 166 78"></path><path class="os" d="M100 122 C98 108 112 102 128 102 C144 102 158 108 156 122 C154 134 142 140 128 140 C114 140 102 134 100 122 Z"></path><path class="tiret-fin" d="M96 94 C112 84 146 82 162 90"></path><path class="ongle-coupe" d="M90 86 C104 70 150 66 166 78 C169 81 170 86 169 92 C166 87 162 84 158 82 C142 74 110 76 94 90 Z"></path>${
        R
          ? `${trameDisque(178, 86, 15, 3.6, garder)}${mono(16, 22, 'COUPE TRANSVERSALE · HALLUX')}<line class="trace fin" pathLength="1" x1="190" y1="98" x2="208" y2="126"></line>${mono(232, 138, 'bord latéral', '', 'end')}${mono(232, 148, 'bourrelet', 'mono--chaud', 'end')}`
          : `<path class="zone zone--forte" d="M166 78 C168 70 176 66 184 72 C192 80 194 92 186 98 C180 102 172 100 170 92 C170 86 168 82 166 78 Z"></path>${renvoi(128, 74, 128, 40)}${etiquette(128, 34, 'Ongle', 'middle')}${renvoi(186, 76, 210, 46)}${etiquette(210, 40, 'Bourrelet', 'middle')}${renvoi(108, 90, 52, 56)}${etiquette(52, 50, 'Lit de l’ongle', 'middle')}${renvoi(128, 138, 128, 166)}${etiquette(132, 172, 'Phalange')}`
      }</g>`;
    }

    case 'laser': {
      // Laser : pièce à main au-dessus de l'avant-pied, faisceau étroit sur une zone précise (sous la 2e tête)
      const m = poser(70, 96, 0, 0.72);
      const [sx, sy] = appliquer(m, 44, 58);
      const tip: P = [124, 40];
      const dx = sx - tip[0], dy = sy - tip[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
      const corpsPiece = (() => {
        const a = (Math.atan2(-uy, -ux) * 180) / Math.PI;
        return `<g transform="translate(${tip[0]} ${tip[1]}) rotate(${r1(a)})"><path class="trait${R ? '' : ' peau'}" d="M6 -4 L22 -6.5 L92 -6.5 C96 -6.5 98 -4 98 0 C98 4 96 6.5 92 6.5 L22 6.5 L6 4 C3 3.6 2 2 2 0 C2 -2 3 -3.6 6 -4 Z"></path><path class="fin" d="M22 -6.5 L22 6.5 M30 -6.5 L30 6.5 M70 -6.5 L70 6.5"></path><path class="fin" d="M98 0 C112 0 118 12 128 22"></path></g>`;
      })();
      const faisceau = `M${r1(tip[0] - uy * 1.6)} ${r1(tip[1] + ux * 1.6)} L${r1(sx - uy * 4)} ${r1(sy + ux * 4)} L${r1(sx + uy * 4)} ${r1(sy - ux * 4)} L${r1(tip[0] + uy * 1.6)} ${r1(tip[1] - ux * 1.6)} Z`;
      return `<g><path class="${R ? 'pointille pointille--leger' : 'trait peau'}" d="${transformer(R ? PIED_TRACE : silhouette(), m)}"></path>${R ? '' : `<path class="tiret-fin" d="${transformer('M14 66 C30 58 50 56 80 64', m)}"></path>`}<path class="faisceau" d="${faisceau}"></path><line class="faisceau-axe" x1="${tip[0]}" y1="${tip[1]}" x2="${r1(sx)}" y2="${r1(sy)}"></line>${corpsPiece}${
        R
          ? `${trameDisque(sx, sy, 7, 2.6)}${mono(232, 162, 'IMPULSION · Ø 4 mm', '', 'end')}${mono(232, 172, '2e tête métatarsienne', 'mono--accent', 'end')}`
          : `<circle class="zone zone--forte" cx="${r1(sx)}" cy="${r1(sy)}" r="6"></circle>${renvoi(sx - 4, sy + 6, 30, 130)}${etiquette(16, 140, 'Zone traitée')}${etiquette(196, 62, 'Pièce à main', 'middle')}`
      }</g>`;
    }

    case 'senior': {
      // Prévention des chutes : polygone d'appui et oscillations à l'arrêt ; à la marche, pas raccourcis
      const tg = poser(40, 88, -6, 0.48, true), td = poser(84, 88, 6, 0.48);
      const poly = enveloppe([...POINTS_PIED.map(([x, y]) => appliquer(tg, x, y)), ...POINTS_PIED.map(([x, y]) => appliquer(td, x, y))]);
      const polygone = `M${poly.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')} Z`;
      const pas = [0, 1, 2, 3].map((i) => poser(i % 2 ? 184 : 162, 140 - i * 32, 0, 0.27, i % 2 === 0));
      const pied = (m: Affine, leger = false) => `<path class="${R ? (leger ? 'pointille pointille--leger' : 'pointille') : 'trait peau'}" d="${transformer(R ? PIED_TRACE : silhouette(), m)}"></path>`;
      const talons = [0, 1, 2, 3].map((i) => 140 - i * 32 + 94 * 0.27);
      return `<g>${R ? '' : `<path class="zone" d="${polygone}"></path>`}<path class="trace polygone" pathLength="1" d="${polygone}"></path>${pied(tg, true)}${pied(td, true)}<path class="trace oscillation" pathLength="1" d="${oscillations(62, 104, 10, 13, 24, 11)}"></path><line class="guide" x1="173" y1="176" x2="173" y2="10"></line>${pas
        .map((m) => (R ? `${pied(m, true)}${grouperTrame(pointsTrame('normal', 12), 12).map((n) => `<path d="${poserTrame(n.d, m)}" stroke="${n.couleur}" stroke-width="${r1(n.epaisseur * 0.27)}"></path>`).join('')}` : pied(m)))
        .join('')}<g>${talons
        .map((y) => `<line class="cote" x1="212" x2="220" y1="${r1(y)}" y2="${r1(y)}"></line>`)
        .join('')}<line class="cote" x1="216" x2="216" y1="${r1(talons[3])}" y2="${r1(talons[0])}"></line></g>${
        R ? `${mono(16, 22, 'APPUI BIPODAL')}${mono(16, 172, 'oscillations · 30 s', 'mono--accent')}${mono(236, r1(talons[0] + 12), '0,38 m', '', 'end')}` : `${etiquette(16, 22, 'Polygone d’appui')}${etiquette(16, 174, 'Oscillations')}${etiquette(236, r1(talons[0] + 12), 'Pas raccourcis', 'end')}`
      }</g>`;
    }

    case 'taping': {
      // K-taping : pied de profil, une bande en étrier sous le talon et le long du tendon d'Achille,
      // une seconde de la voûte vers l'avant de la cheville. Bandes à largeur constante, extrémités arrondies.
      const ep = PROFIL.epure;
      const bande = (pts: P[], largeur: number) => {
        const d = courbe(pts.map(([x, y]) => enProfil(x, y)));
        return `<path class="bande" d="${d}" style="stroke-width:${largeur}"></path>`;
      };
      const achille: P[] = [[34, 56], [21, 56.2], [12, 53], [7.5, 45], [8, 36], [12.5, 27], [15.6, 16], [16, 2], [16, -11]];
      const voute: P[] = [[24, 55.6], [40, 53.2], [54, 51], [68, 51.4], [82, 53.6], [92, 55.2]];
      const motif = (pts: P[]) => (R ? `<path class="bande-motif" d="${courbe(pts.map(([x, y]) => enProfil(x, y)))}"></path>` : '');
      return `<g><line class="sol" x1="12" y1="${r1(enProfil(0, 58.5)[1] + 1.5)}" x2="232" y2="${r1(enProfil(0, 58.5)[1] + 1.5)}"></line><path class="trait peau" d="${transformer(`${ep.talon} ${ep.dos}`, profil)}"></path><path class="trait" d="${transformer(PLANTE_PROFIL, profil)}"></path><path class="os os--leger" d="${transformer(ep.os.join(' '), osProfil)}"></path>${bande(achille, 9)}${motif(achille)}${bande(voute, 8)}${motif(voute)}${
        R
          ? `${mono(232, 22, 'K-TAPING', '', 'end')}${mono(232, 32, 'tendon d’Achille · voûte', 'mono--accent', 'end')}${mono(232, 42, 'tension 25 %', '', 'end')}`
          : `${renvoi(enProfil(16, 4)[0] + 4, enProfil(16, 4)[1], 64, 30)}${etiquette(66, 30, 'Bande adhésive')}${renvoi(enProfil(60, 51.2)[0], enProfil(60, 51.2)[1] + 2, 150, 172)}${etiquette(154, 175, 'Soutien de la voûte')}`
      }</g>`;
    }

    case 'verrue': {
      // Verrue plantaire : point d'appui précis sous la 2e tête métatarsienne ; loupe : la verrue interrompt
      // les lignes de la peau, petits points noirâtres (capillaires) dans un anneau de corne.
      const t = { x: 20, y: 10, e: 0.72 };
      const champ = (x: number, y: number) => Math.min(1, 0.72 * pression('normal', x, y) + 1.1 * g2(x, y, 44, 57, 4.5));
      const v = { x: t.x + 44 * t.e, y: t.y + 57 * t.e, r: 8 };
      const z = { x: 168, y: 92, r: 54 };
      const rv = 17;
      // Lignes de la peau : horizontales légèrement courbées, coupées autour de la verrue
      const lignes = Array.from({ length: 13 }, (_, i) => {
        const y = z.y - 48 + i * 8;
        const dy = Math.abs(y - z.y);
        if (dy >= rv + 3) return `M${z.x - 60} ${y} Q${z.x} ${y + 5} ${z.x + 60} ${y}`;
        const w = Math.sqrt((rv + 3) ** 2 - dy ** 2);
        return `M${z.x - 60} ${y} L${r1(z.x - w)} ${y + 3} M${r1(z.x + w)} ${y + 3} L${z.x + 60} ${y}`;
      }).join(' ');
      const h = hasard(3);
      const papilles = Array.from({ length: 16 }, () => {
        const a = h() * 2 * Math.PI, d = Math.sqrt(h()) * (rv - 5);
        return [r1(z.x + d * Math.cos(a)), r1(z.y + d * Math.sin(a)), r1(1 + h() * 1.1)] as const;
      });
      const verrue = `M${z.x - rv} ${z.y} C${z.x - rv} ${z.y - 11} ${z.x - 10} ${z.y - rv} ${z.x + 1} ${z.y - rv + 0.5} C${z.x + 12} ${z.y - rv + 1} ${z.x + rv + 0.5} ${z.y - 9} ${z.x + rv} ${z.y + 1} C${z.x + rv - 1} ${z.y + 11} ${z.x + 9} ${z.y + rv} ${z.x - 1} ${z.y + rv - 0.5} C${z.x - 11} ${z.y + rv - 1} ${z.x - rv} ${z.y + 10} ${z.x - rv} ${z.y} Z`;
      return `<g><g transform="${piedDroit(t.x, t.y, t.e)}">${R ? `${use('pointille pointille--leger')}${traceChamp(champ)}` : `${use('trait peau')}${zones('normal')}`}</g><circle class="trace mire" cx="${r1(v.x)}" cy="${r1(v.y)}" r="${v.r}" pathLength="1"></circle>${tangentes(v, z)}<circle class="fond-loupe" cx="${z.x}" cy="${z.y}" r="${z.r}"></circle><g clip-path="url(#${loupe})" transform="translate(${z.x - c2.x} ${z.y - c2.y})"><g transform="translate(${c2.x - z.x} ${c2.y - z.y})"><path class="dermato" d="${lignes}"></path><path class="${R ? 'corne' : 'zone'}" d="${verrue}"></path><path class="trait" d="${verrue}"></path>${papilles
        .map(([x, y, r]) => `<circle class="papille" cx="${x}" cy="${y}" r="${r}"${R ? ` fill="${couleurPression(0.75 + r / 9)}"` : ''}></circle>`)
        .join('')}</g></g><circle class="trace loupe" cx="${z.x}" cy="${z.y}" r="${z.r}" pathLength="1"></circle>${
        R ? `${mono(z.x + z.r + 2, z.y + z.r + 10, '× 8', '', 'end')}${mono(z.x, 24, 'Ø 6 mm · zone d’appui', '', 'middle')}` : `${etiquette(z.x, z.y + z.r + 14, 'Lignes de la peau interrompues', 'middle')}${renvoi(z.x - 4, z.y - 12, z.x - 30, 30)}${etiquette(z.x - 30, 24, 'Verrue', 'middle')}`
      }</g>`;
    }
  }
  return '';
}

/**
 * Dessin technique complet (<svg>…</svg>), décoratif (aria-hidden). `id` préfixe les identifiants internes
 * (symbole du pied, dégradé, découpe) : il doit être unique dans la page. Par défaut, déterministe
 * (`d-${nom}`) pour que le rendu serveur et le rendu navigateur de l'admin coïncident.
 * `registre` : « releve » (par défaut, relevé de podoscope) ou « pedagogique » (schéma au trait).
 */
export function svgDessin(nom: NomDessin, opts: { id?: string; classe?: string; registre?: Registre } = {}): string {
  const id = opts.id ?? `d-${nom}`;
  const registre = opts.registre ?? 'releve';
  const pied = `${id}-pied`, sil = `${id}-sil`, degrade = `${id}-degrade`, loupe = `${id}-loupe`;
  const classes = ['dessin', `dessin--${nom}`, `dessin--${registre}`, opts.classe].filter(Boolean).join(' ');
  const zoom = nom === 'verrue' ? { x: 168, y: 92, r: 54 } : c2;
  const defs =
    `<defs><symbol id="${pied}" viewBox="0 0 92 222" width="92" height="222" overflow="visible"><path d="${CONTOUR}"></path>` +
    ORTEILS.map(([cx, cy, rx, ry, r]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${cx} ${cy})"></ellipse>`).join('') +
    `</symbol><symbol id="${sil}" viewBox="0 0 92 222" width="92" height="222" overflow="visible"><path d="${silhouette()}"></path></symbol><linearGradient id="${degrade}" x1="0" y1="1" x2="0" y2="0">` +
    PRESSION.map((c, k) => `<stop offset="${ARRETS_PRESSION[k]}" stop-color="${c}"></stop>`).join('') +
    `</linearGradient><clipPath id="${loupe}"><circle cx="${zoom.x}" cy="${zoom.y}" r="${zoom.r - 1}"></circle></clipPath></defs>`;
  return `<svg class="${echapper(classes)}" viewBox="0 0 240 180" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${defs}${corps(nom, { pied, sil, degrade, loupe, R: registre === 'releve' })}</svg>`;
}

/**
 * Dessin en symbole autonome, pour un fichier SVG statique (site : /dessins/<nom>.svg, servi une fois et mis
 * en cache) que la page référence par <use href="…#d">. Les styles (dessins.css) sont posés dans le fichier
 * par l'appelant ; les couleurs (--dessin-*, --pression-*, accent de la gamme) sont héritées de la page à
 * travers <use>, le dessin suit donc le site et la surface où il est posé. Identifiant du symbole : « d ».
 */
export function symboleDessin(nom: NomDessin, opts: { registre?: Registre } = {}): string {
  const svg = svgDessin(nom, { id: 'f', registre: opts.registre });
  const classe = svg.match(/class="([^"]*)"/)?.[1] ?? 'dessin';
  const interieur = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  return `<symbol id="d" viewBox="0 0 240 180" overflow="visible"><g class="${classe}" fill="none" stroke-linecap="round" stroke-linejoin="round">${interieur}</g></symbol>`;
}

/**
 * Paire d'empreintes en trame de points (repère 210 × 236, pied gauche à gauche), en symbole « d » pour un
 * fichier statique : contours en pointillés (couleur courante de la page) et trame colorée par la pression.
 */
export function symboleEmpreintes(appui: Appui): string {
  const pied = (t: string) =>
    `<g transform="${t}"><path class="empreintes__contour" d="${PIED_TRACE}"></path>${trame(appui)
      .map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}"></path>`)
      .join('')}</g>`;
  return `<symbol id="d" viewBox="0 0 210 236" overflow="visible"><g fill="none" stroke-linecap="round">${pied('translate(10 7) scale(-1 1) translate(-92 0)')}${pied('translate(108 7)')}</g></symbol>`;
}

// ———————————————————————————————————————————————————— Animations d'accueil (repère 400 × 300)
// Contenus partagés par les composants animés du site (components/animations/*) et par les images fixes :
// même tracé, mêmes couleurs ; les composants n'ajoutent que le mouvement (classes et variables --i, --b…).

const F = 'viewBox="0 0 400 300" aria-hidden="true" preserveAspectRatio="xMidYMid meet" fill="none" stroke-linecap="round" stroke-linejoin="round"';
/** Couleur d'accent des animations sur fond sombre (même cascade que les composants du site) */
const ACCENT = `var(--accent-pale, var(--signal, ${PLAN.signal}))`;
/** Trait et texte des animations : papier sur fond sombre (par défaut), encre si le composant est sur fond clair */
const TRAIT_ANIM = `var(--anim-trait, ${NEUTRES.papier})`;
/** Taille des lectures mono dans le repère 400 × 300 (même taille apparente que dans les dessins 240 × 180) */
const TAILLE_MONO = r1((TYPO.donneesDessin * 400) / 240);
const lecture = (x: number, y: number, t: string, opts: { gras?: boolean; ancre?: string; couleur?: string; opacite?: number } = {}) =>
  `<text x="${r1(x)}" y="${r1(y)}" fill="${opts.couleur ?? TRAIT_ANIM}" fill-opacity="${opts.opacite ?? 0.72}" font-size="${TAILLE_MONO}" font-family="${echapper(POLICE_MONO)}"${opts.gras ? ' font-weight="600"' : ''}${opts.ancre ? ` text-anchor="${opts.ancre}"` : ''} letter-spacing="0.4" stroke="none">${t}</text>`;
const contourPointille = (d: string, leger = false, opacite?: number) => {
  const p = leger ? POINTILLE.leger : POINTILLE.contour;
  return `<path d="${d}" stroke="${TRAIT_ANIM}" stroke-width="${p.point}" stroke-dasharray="0 ${p.ecart}" stroke-opacity="${opacite ?? p.opacite}"></path>`;
};
/** Points d'une trame posés dans le repère de l'animation (graisse mise à l'échelle) */
/** Matrice SVG d'une transformation affine */
const matrice = (m: Affine) => `matrix(${m.map((v) => +v.toFixed(4)).join(' ')})`;
const poserTrame = (d: string, m: Affine) => d.replace(/M(-?[\d.]+) (-?[\d.]+)h0/g, (_, x, y) => `M${appliquer(m, +x, +y).map(r1).join(' ')}h0`);

/** Podoscope : deux empreintes en trame de points, pression à l'instant où le pied gauche est sur le talon */
function podoscopeFixe(): string {
  const zone = (y: number) => (y > 150 ? 0 : y > 38 ? 1 : 2);
  return [true, false]
    .map((gauche) => {
      const ox = 200 + (gauche ? -92 * 1.2 : 92 * 0.2);
      const oy = (300 - 222) / 2 + (gauche ? 222 * 0.04 : -222 * 0.04);
      // Phase du pas (voir Podoscope.astro) : gauche au talon, droit sur les orteils
      const centre = gauche ? 0 : 2;
      const pts = pointsTrame('normal').map((p) => {
        const z = zone(p.y);
        const base = [0.55, 0.62, 0.38][z];
        const bonus = z === centre ? 0.45 : z === (centre + 2) % 3 ? 0.1 : 0;
        return { x: r1(ox + (gauche ? 92 - p.x : p.x)), y: r1(oy + p.y), v: Math.min(1, (base + bonus) * (0.55 + 0.45 * p.v)) };
      });
      return grouperTrame(pts).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}" stroke-opacity="${r1(0.35 + 0.65 * ((n.k + 0.5) / TRAME.niveaux))}"></path>`).join('');
    })
    .join('');
}

/** Coureur : squelette de profil en appui (même cinématique que Coureur.astro), marqueurs, traces et lectures */
function coureurFixe(): string {
  const RAD = Math.PI / 180;
  const hanche = (p: number) => 15 + 30 * Math.sin(2 * Math.PI * p);
  const genou = (p: number) => 25 + 45 * (1 + Math.cos(2 * Math.PI * p));
  const cheville = (p: number) => 8 * Math.sin(2 * Math.PI * (p + 0.15));
  type Pt = { x: number; y: number };
  const jambe = (h: Pt, p: number, l: number) => {
    const a = hanche(p) * RAD;
    const g = { x: h.x + Math.sin(a) * l * 0.48, y: h.y + Math.cos(a) * l * 0.48 };
    const b = a - genou(p) * RAD;
    const c = { x: g.x + Math.sin(b) * l * 0.47, y: g.y + Math.cos(b) * l * 0.47 };
    const f = b + cheville(p) * RAD;
    const o = { x: c.x + Math.cos(f) * l * 0.17, y: c.y - Math.sin(f) * l * 0.17 };
    return { g, c, o, angleGenou: genou(p) };
  };
  const bras = (e: Pt, p: number, l: number) => {
    const a = -hanche(p) * 0.85 * RAD + 10 * RAD;
    const coude = { x: e.x + Math.sin(a) * l * 0.3, y: e.y + Math.cos(a) * l * 0.3 };
    const b = a + 95 * RAD;
    return { coude, main: { x: coude.x + Math.sin(b) * l * 0.27, y: coude.y + Math.cos(b) * l * 0.27 } };
  };
  // Cadrage d'une scène d'accueil (plus haute que large) : le coureur occupe la hauteur comme dans le site
  const l = 400, h = 300, p = 0.32;
  const L = h * 0.72 * 0.5;
  const sol = h * 0.88;
  const vertical = (q: number) => sol - L * 0.97 - 5 * Math.cos(4 * Math.PI * q) * (L / 120);
  const bassin = { x: l * 0.5, y: vertical(p) };
  const tronc = 8 * RAD;
  const epaule = { x: bassin.x + Math.sin(tronc) * L * 0.62, y: bassin.y - Math.cos(tronc) * L * 0.62 };
  const tete = { x: epaule.x + Math.sin(tronc) * L * 0.2, y: epaule.y - L * 0.2 };
  const d = jambe(bassin, p, L), g = jambe(bassin, (p + 0.5) % 1, L);
  const bd = bras(epaule, (p + 0.5) % 1, L), bg = bras(epaule, p, L);
  const COULEURS = { cheville: PRESSION[2], genou: PRESSION[4], orteil: PRESSION[1] };
  const trait = (a: number) => transparence(NEUTRES.blanc, a);
  const seg = (a: Pt, b: Pt, w: number, c: string) => `<line x1="${r1(a.x)}" y1="${r1(a.y)}" x2="${r1(b.x)}" y2="${r1(b.y)}" stroke="${c}" stroke-width="${w}"></line>`;
  // Marqueur réfléchissant : point plein et halo (le halo lumineux du canvas)
  const marq = (m: Pt, r: number, c: string = NEUTRES.blanc) => `<circle cx="${r1(m.x)}" cy="${r1(m.y)}" r="${r1(r * 2.2)}" fill="${c}" fill-opacity="0.18"></circle><circle cx="${r1(m.x)}" cy="${r1(m.y)}" r="${r}" fill="${c}"></circle>`;
  const pale = trait(0.33);
  const [arriere, avant] = [+(TRAIT.marque * 0.85).toFixed(2), TRAIT.marque];
  // Grille du laboratoire et sol du tapis en pointillés ronds
  const pas = Math.max(24, L / 4);
  const grille: string[] = [];
  for (let x = (l / 2) % pas; x < l; x += pas) grille.push(`M${r1(x)} 0V${h}`);
  for (let y = sol % pas; y < h; y += pas) grille.push(`M0 ${r1(y)}H${l}`);
  // Traces des marqueurs sur deux foulées : les positions passées reculent avec le tapis (comme dans le canvas)
  const recul = L * 1.9 * 0.55; // px par cycle
  const traces = (['cheville', 'genou', 'orteil'] as const).map((cle) => {
    const pts: P[] = [];
    for (let i = 0; i <= 48; i++) {
      const age = (48 - i) / 32; // en cycles
      const q = (((p - age) % 1) + 1) % 1;
      const j = jambe({ x: bassin.x, y: vertical(q) }, q, L);
      const m = cle === 'cheville' ? j.c : cle === 'genou' ? j.g : j.o;
      const x = m.x - age * recul;
      if (x > l * 0.04) pts.push([x, m.y]);
    }
    return `<path d="${courbe(pts)}" stroke="${COULEURS[cle]}" stroke-width="${TRAIT.normal}" stroke-opacity="0.6"></path>`;
  });
  const a1 = Math.atan2(bassin.y - d.g.y, bassin.x - d.g.x), a2 = Math.atan2(d.c.y - d.g.y, d.c.x - d.g.x);
  let ecart = a2 - a1;
  if (ecart > Math.PI) ecart -= 2 * Math.PI;
  if (ecart < -Math.PI) ecart += 2 * Math.PI;
  const ra = L * 0.12;
  const arc = `<path d="M${r1(d.g.x + ra * Math.cos(a1))} ${r1(d.g.y + ra * Math.sin(a1))} A${r1(ra)} ${r1(ra)} 0 0 ${ecart < 0 ? 0 : 1} ${r1(d.g.x + ra * Math.cos(a1 + ecart))} ${r1(d.g.y + ra * Math.sin(a1 + ecart))}" stroke="${COULEURS.genou}" stroke-width="${TRAIT.normal}"></path>`;
  const police = Math.max(11, L / 11);
  const mono = `font-family="${echapper(POLICE_MONO)}"`;
  return (
    `<path d="${grille.join('')}" stroke="${trait(0.06)}" stroke-width="${TRAIT.fin}"></path>` +
    `<line x1="0" y1="${r1(sol + 2)}" x2="${l}" y2="${r1(sol + 2)}" stroke="${trait(0.35)}" stroke-width="${TRAIT.fort}" stroke-dasharray="0 ${POINTILLE.contour.ecart * 2.5}"></line>` +
    traces.join('') +
    seg(epaule, bg.coude, arriere, pale) + seg(bg.coude, bg.main, arriere, pale) +
    seg(bassin, g.g, arriere, pale) + seg(g.g, g.c, arriere, pale) + seg(g.c, g.o, arriere, pale) +
    seg(bassin, epaule, avant, ACCENT) + seg(bassin, d.g, avant, ACCENT) + seg(d.g, d.c, avant, ACCENT) + seg(d.c, d.o, avant, ACCENT) +
    seg(epaule, bd.coude, avant, ACCENT) + seg(bd.coude, bd.main, avant, ACCENT) +
    `<circle cx="${r1(tete.x)}" cy="${r1(tete.y)}" r="${r1(L * 0.085)}" stroke="${ACCENT}" stroke-width="${arriere}"></circle>` +
    [g.g, g.c, g.o, bg.coude].map((m) => `<circle cx="${r1(m.x)}" cy="${r1(m.y)}" r="3" fill="${pale}"></circle>`).join('') +
    marq(bassin, 4.5) + marq(epaule, 4.5) +
    marq(d.g, 4.5, COULEURS.genou) + marq(d.c, 4.5, COULEURS.cheville) + marq(d.o, 4, COULEURS.orteil) + marq(bd.coude, 4) +
    arc +
    `<text x="${r1(d.g.x + L * 0.16)}" y="${r1(d.g.y + 4)}" fill="${COULEURS.genou}" font-weight="600" font-size="${r1(police)}" ${mono}>${Math.round(180 - d.angleGenou)}°</text>` +
    `<g fill="${NEUTRES.papier}" opacity="0.75" font-size="${r1(police * 0.85)}" ${mono}><text x="${l * 0.05}" y="${h * 0.09}" font-weight="600">ANALYSE DE LA FOULÉE</text><text x="${l * 0.05}" y="${r1(h * 0.09 + police * 1.4)}">Cadence ${Math.round(120 / 0.72)} pas/min</text></g>`
  );
}

/** Pieds gauche et droit des animations en 400 × 300 */
const PIEDS_ANIM = [
  { transform: 'translate(178 40) scale(-1 1)', m: [-1, 0, 0, 1, 178, 40] as Affine },
  { transform: 'translate(222 40)', m: [1, 0, 0, 1, 222, 40] as Affine },
];

/**
 * Trajectoire : contours en pointillés, trame de pression par zone (talon, bord externe, avant-pied,
 * orteils) qui s'allume au passage du centre de pression, tracé du centre de pression. Classes : tj-pied
 * (--j : pied), tj-zone (--z : zone), tj-trajet, tj-point.
 */
export function contenuTrajectoire(prefixe = 'tj'): string {
  const zone = (y: number) => (y > 165 ? 0 : y > 95 ? 1 : y > 40 ? 2 : 3);
  // Trame de chaque zone, définie une fois dans le repère du pied et posée sur les deux pieds par <use>
  const defs = `<defs>${[0, 1, 2, 3]
    .map((z) => `<g id="${prefixe}-z${z}">${grouperTrame(pointsTrame('normal').filter((q) => zone(q.y) === z)).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}"></path>`).join('')}</g>`)
    .join('')}</defs>`;
  return (
    defs +
    PIEDS_ANIM.map(
      (p, j) =>
        `<g class="tj-pied" style="--j:${j}">${contourPointille(transformer(PIED_TRACE, p.m), true)}` +
        [0, 1, 2, 3].map((z) => `<use class="tj-zone" style="--z:${z}" href="#${prefixe}-z${z}" transform="${matrice(p.m)}"></use>`).join('') +
        `<path class="tj-trajet" d="${transformer(TRAJET, p.m)}" pathLength="1" stroke="${ACCENT}" stroke-width="${TRAIT.fort}"></path>` +
        `<circle class="tj-point" r="4.5" fill="${NEUTRES.blanc}" cx="0" cy="0" style="offset-path: path('${transformer(TRAJET, p.m)}')"></circle></g>`,
    ).join('') +
    lecture(24, 32, 'CENTRE DE PRESSION', { gras: true }) +
    lecture(24, 50, 'talon → bord externe → hallux', { couleur: ACCENT, opacite: 1 }) +
    lecture(140, 284, 'G', { ancre: 'middle' }) +
    lecture(260, 284, 'D', { ancre: 'middle' })
  );
}

/**
 * Premiers pas : petites empreintes d'enfant (pied plus court et plus large, voûte encore peu creusée)
 * en trame de points colorés par la pression, contour en pointillés, le long d'une ligne de marche en tirets.
 * Classes : pp-pas (--i : rang du pas) et pp-bande (--b : bande, du talon 0 aux orteils 4), pour faire
 * apparaître chaque empreinte du talon vers les orteils.
 */
export function contenuPremiersPas(prefixe = 'pp'): string {
  // Ligne de marche de l'enfant (bas gauche → haut droite) ; l'adulte marche à côté, à pas longs
  const ligne = (t: number): P => [70 + t * 232 + Math.sin(t * Math.PI) * 14, 264 - t * 232];
  const dir = (t: number) => { const [a, b] = ligne(t), [c, d] = ligne(t + 0.01), n = Math.hypot(c - a, d - b); return [(c - a) / n, (d - b) / n]; };
  // Pas du tout-petit : base large, pas irréguliers, pointe des pieds tournée vers l'extérieur
  const PAS = [[0.04, 6], [0.2, 9], [0.36, 4], [0.53, 11], [0.69, 8], [0.86, 5]];
  const e = 0.3, ecart = 22, PAS_ENFANT = TRAME.pasEnfant;
  const bande = (y: number) => (y > 162 ? 0 : y > 112 ? 1 : y > 64 ? 2 : y > 34 ? 3 : 4);
  const enfant = silhouette(PLANTE_ENFANT, ORTEILS_ENFANT);
  const champ = (x: number, y: number) => Math.min(1, 0.32 + 0.62 * g2(x, y, 47, 192, 15, 18) + 0.45 * g2(x, y, 44, 62, 18, 13) + 0.4 * g2(x, y, 27, 20, 8));
  const niveaux = grouperTrame(pointsTrame(champ, PAS_ENFANT, dansEnfant), PAS_ENFANT, (q) => bande(q.y));
  const empreintes = PAS.map(([t, ecartAngle], i) => {
    const [x, y] = ligne(t);
    const [dx, dy] = dir(t);
    const gauche = i % 2 === 0;
    const s = gauche ? 1 : -1;
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI - s * ecartAngle;
    const m = poser(x + s * dy * ecart, y - s * dx * ecart, angle, e, gauche, 1.15);
    return `<g class="pp-pas" style="--i:${i}">${contourPointille(transformer(enfant, m), true, POINTILLE.contour.opacite)}${[0, 1, 2, 3, 4].map((b) => `<use class="pp-bande" style="--b:${b}" href="#${prefixe}-b${b}" transform="${matrice(m)}"></use>`).join('')}</g>`;
  });
  // Pas de l'adulte, plus longs, en contour seul : on marche à côté de l'enfant
  const adulte = [0.22, 0.56, 0.9].map((t, i) => {
    const [x, y] = ligne(t);
    const [dx, dy] = dir(t);
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const d = 62 + (i % 2 ? 12 : -12);
    const m = poser(x - dy * d, y + dx * d, angle, 0.4, i % 2 === 0);
    return `<path d="${transformer(silhouette(), m)}" stroke="${TRAIT_ANIM}" stroke-width="${TRAIT.fin}" stroke-opacity="0.32"></path>`;
  });
  // Toise de croissance, graduée en âges
  const toise = [[1, '1 an', 200], [3, '3 ans', 152], [6, '6 ans', 92]] as const;
  // Bandes de trame du pied d'enfant (talon → orteils), définies une fois dans le repère du pied
  const defs = `<defs>${[0, 1, 2, 3, 4].map((b) => `<g id="${prefixe}-b${b}">${niveaux.filter((q) => q.g === b).map((q) => `<path d="${q.d}" stroke="${q.couleur}" stroke-width="${q.epaisseur}"></path>`).join('')}</g>`).join('')}</defs>`;
  return (
    defs +
    `<path d="${courbe(Array.from({ length: 21 }, (_, k) => ligne(k / 20)))}" stroke="${TRAIT_ANIM}" stroke-width="${TRAIT.fin}" stroke-dasharray="${POINTILLE.tiret}" stroke-opacity="0.3"></path>` +
    adulte.join('') +
    empreintes.join('') +
    `<path d="M34 214 V76" stroke="${TRAIT_ANIM}" stroke-width="${TRAIT.fin}" stroke-opacity="0.5"></path>` +
    toise.map(([, t, y]) => `<path d="M30 ${y} H40" stroke="${ACCENT}" stroke-width="${TRAIT.normal}"></path>${lecture(46, y + 4, t, { couleur: ACCENT, opacite: 1 })}`).join('') +
    Array.from({ length: 9 }, (_, k) => `<path d="M34 ${214 - k * 16} H38" stroke="${TRAIT_ANIM}" stroke-width="${TRAIT.filet}" stroke-opacity="0.5"></path>`).join('') +
    lecture(24, 32, 'PREMIERS PAS', { gras: true }) +
    lecture(24, 50, 'à côté des pas de l’adulte', { opacite: 0.55 })
  );
}

/**
 * Semelle : deux semelles thermoformées en courbes d'appui (cuvette du talon, soutien de voûte, barre
 * des têtes métatarsiennes, hallux), contour de la semelle, empreinte des orteils en pointillés.
 * Classes : sm-pied (--j : pied), sm-courbe (--k : niveau).
 */
export function contenuSemelle(prefixe = 'sm'): string {
  const courbes = courbesSemelle();
  // Courbes définies une fois (repère du pied droit) et posées sur les deux semelles par <use>
  const defs = `<defs>${courbes.map(({ boucles }, k) => boucles.map((d, i) => `<path id="${prefixe}-${k}-${i}" d="${d}" pathLength="1"></path>`).join('')).join('')}</defs>`;
  const pieds = PIEDS_ANIM.map((p, j) => {
    const m: Affine = [p.m[0], 0, 0, 1, p.m[0] < 0 ? 222 : 250, 38];
    return (
      `<g class="sm-pied" style="--j:${j}">` +
      `<path d="${transformer(SEMELLE, m)}" stroke="${TRAIT_ANIM}" stroke-width="${TRAIT.fin}" stroke-opacity="0.45"></path>` +
      `<path d="${transformer('M12 68 C30 56 54 54 82 70', m)}" stroke="${TRAIT_ANIM}" stroke-width="${TRAIT.filet}" stroke-dasharray="${POINTILLE.tiretCourt}" stroke-opacity="0.5"></path>` +
      courbes.map(({ boucles }, k) => boucles.map((_, i) => `<use class="sm-courbe" style="--k:${k}" href="#${prefixe}-${k}-${i}" transform="${matrice(m)}" stroke="${PRESSION[k]}" stroke-width="${TRAIT.fort}"></use>`).join('')).join('') +
      `</g>`
    );
  }).join('');
  const nuancier = PRESSION.map((c, k) => `<rect x="${24 + k * 14}" y="268" width="12" height="4" fill="${c}"></rect>`).join('');
  return defs + pieds + lecture(24, 32, 'COURBES D’APPUI', { gras: true }) + lecture(24, 50, 'semelle') + lecture(24, 66, 'thermoformée') + nuancier + lecture(24, 288, 'faible → pic', { opacite: 0.5 });
}

/** Schéma pédagogique associé à chaque animation (image fixe calme du registre pédagogique) */
const SCHEMA_ANIMATION: Record<Animation, NomDessin> = { podoscope: 'analyse', coureur: 'sport', trajectoire: 'equilibre', 'premiers-pas': 'enfant', semelle: 'semelle' };

/**
 * Image fixe d'une animation d'accueil (<svg>…</svg>, repère 400 × 300), fidèle à l'animation du site :
 * même géométrie de pied, même trame, même palette. Fond transparent : l'appelant pose le fond sombre.
 * En registre pédagogique : le schéma au trait du même sujet, centré (styles de dessins.css).
 */
export function svgAnimationFixe(animation: Animation, opts: { id?: string; registre?: Registre } = {}): string {
  const id = opts.id ?? `a-${animation}`;
  if (opts.registre === 'pedagogique') {
    const schema = svgDessin(SCHEMA_ANIMATION[animation], { id: `${id}-schema`, registre: 'pedagogique' }).replace('<svg ', '<svg x="30" y="22.5" width="340" height="255" ');
    return `<svg id="${echapper(id)}" class="animation-fixe animation-fixe--${animation} animation-fixe--pedagogique" ${F}>${schema}</svg>`;
  }
  const contenu =
    animation === 'podoscope' ? podoscopeFixe()
    : animation === 'coureur' ? coureurFixe()
    : animation === 'trajectoire' ? contenuTrajectoire(id)
    : animation === 'premiers-pas' ? contenuPremiersPas(id)
    : contenuSemelle(id);
  return `<svg id="${echapper(id)}" class="animation-fixe animation-fixe--${animation}" ${F}>${contenu}</svg>`;
}
