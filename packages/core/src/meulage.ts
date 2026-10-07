// Animation « meulage » (2026-10-06, demande de Paul, statut À REVOIR dans /admin/illustrations) : le meulage d'un ongle épaissi,
// en quatre étapes lisibles par un patient, sur la géométrie VALIDÉE de l'illustration « ongles-epais » (POD-AT-0003, état
// « ongle-epais », bibliotheque/formes.ts ; fraise et pièce à main de bibliotheque/soins-ongles.ts, même graisse de contour) :
//   a. l'hallux de profil, ongle nettement épaissi (lame en couches, lamelles visibles) ;
//   b. la fraise du micromoteur arrive dans l'axe de la pièce à main et se pose sur le DOS de l'ongle (rotation suggérée par les
//      goujures, lente : jamais de flou ni de vitesse) ;
//   c. meulage : la fraise balaie doucement le dos de l'ongle, quelques poussières fines ; l'épaisseur diminue couche par couche
//      (trois couches qui s'effacent, la lamelle suivante devient le contour net) en respectant la courbure de la lame (HAS 2020,
//      « Le pied de la personne âgée » § 3.4.2 : plaques unguéales hypertrophiques, fraisage en respectant la courbure) ;
//   d. résultat : lame affinée (≈ 5 u, encore un peu épaisse : pas un ongle « neuf »), contour net, léger reflet lisse qui glisse
//      une fois ; la fraise se retire dans son axe puis s'efface ; pause ; fondu de toute la scène et reprise (jamais d'ongle qui
//      « repousse » à l'image : piège « fin de boucle », pieges-illustration.md).
// Aucun sang, aucune rougeur, aucun contact de la fraise avec la peau, aucune douleur suggérée, aucun geste brusque.
//
// UNE source, deux rendus :
// - SITE (svgMeulage, format « site », 400 × 300) : AUCUN texte (règle de Paul du 2026-10-06) ; registres relevé et pédagogique ;
//   couleurs de la charte par variables (--dessin-*, --peau, --ongle…) ; SVG + CSS (cssMeulage), aucun script ; l'état SANS
//   animation est l'image figée (fraise posée, ongle épais, poussières) : mouvements réduits, aperçus, svgAnimationFixe('meulage').
// - ÉCRANZEN (formats « 16x9 » 1920 × 1080 et « 9x16 » 1080 × 1920) : mêmes calques, étiquettes sobres FACULTATIVES (désactivées
//   par défaut) qui apparaissent étape par étape, réglées sur la règle de lecture d'ÉcranZen (grammaire § 6 : ≥ 72 px en 1080p,
//   ≥ 2 s + 0,5 s par mot entièrement net) : cycle de 12 s (CYCLE_ECRANZEN_MS) au lieu de 10 s sur les sites (--cycle-geste).
//   Export image par image : packages/contenus/scripts/exporter-animation.mjs (window.ezAller(t), comme le moteur de Reels).
// Le calendrier (CALENDRIER_MEULAGE) est en secondes d'un cycle de 12 s ; les images clés sont en pourcentage du cycle : le site
// joue la même animation en 10 s.
import { FORMES } from './bibliotheque/formes';
import { CORRESPONDANCE_JETONS } from './bibliotheque/rendu';
import { TRAIT, COURBES, CYCLES } from './charte';

type P = [number, number];
export type FormatMeulage = 'site' | '16x9' | '9x16';
export type RegistreMeulage = 'releve' | 'pedagogique';

/** Durée d'un cycle en salle d'attente (règle de lecture des étiquettes) ; le site joue le même cycle en CYCLES.geste */
export const CYCLE_ECRANZEN_MS = 12000;
const BASE = 12; // secondes du calendrier
const pc = (s: number) => `${+((s / BASE) * 100).toFixed(3)}%`;
const f1 = (v: number) => +v.toFixed(2);

/** Étapes (lecture patient) et étiquettes facultatives d'ÉcranZen ; temps en secondes d'un cycle de 12 s, étiquette entièrement nette */
export const ETAPES_MEULAGE = [
  { id: 'ongle-epais', etiquette: 'Ongle épaissi', lignes: ['Ongle', 'épaissi'], net: [-0.2, 2.8] },
  { id: 'meulage', etiquette: 'Meulage à la fraise', lignes: ['Meulage', 'à la fraise'], net: [3.3, 7.3] },
  { id: 'ongle-affine', etiquette: 'Ongle affiné', lignes: ['Ongle', 'affiné'], net: [7.8, 10.8] },
] as const;

/** Texte alternatif (aria-label, title) : le sujet de l'animation, jamais incrusté sur les sites */
export const ALT_MEULAGE = 'Meulage d’un ongle épaissi : la fraise du micromoteur affine l’ongle de l’hallux couche par couche.';

// ———————————————————————————————————————————————————— Géométrie (repère de POD-AT-0003, unités de la forme)

/** Bézier cubique échantillonnée (n segments, extrémités comprises) */
function bezier(a: P, b: P, c: P, d: P, n: number): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]] as P;
  });
}
/** Trois segments de Bézier mis bout à bout (même nombre de points par segment : les dessus se correspondent point à point) */
const dessus = (s: [P, P, P, P][]): P[] => s.flatMap((g, i) => bezier(...g, 10).slice(i ? 1 : 0));
/** Dessus de la lame ÉPAISSE : tracé exact de POD-AT-0003 (« ongle-epais »), de la sortie du repli au bord libre */
const T0 = dessus([
  [[421, 391.5], [428, 388.4], [436, 384.6], [446, 383.4]],
  [[446, 383.4], [453, 382.6], [459, 382.7], [463, 383.4]],
  [[463, 383.4], [465.4, 383.9], [467, 386], [467, 388.6]],
]);
/**
 * Dessus de la lame AFFINÉE : parallèle au lit (même courbure), ≈ 5 u d'épaisseur (≈ 2,5 mm à cette échelle : 1 cm ≈ 21 u ; l'ongle
 * épais en fait ≈ 19 u, ≈ 9 mm), qui rejoint en pente douce la lame sous le repli proximal. Le bord libre affiné suit la courbure
 * de l'orteil et dépasse la pulpe de ≈ 2 mm (une lame fine horizontale très longue se lirait « griffe » ou « ongle pointu »).
 */
const T3 = dessus([
  // Près du repli proximal, la lame n'est pas meulée sous la peau : le dessus remonte en pente douce jusqu'au bord du repli
  [[421, 391.5], [430, 389.8], [438, 394], [448, 397]],
  [[448, 397], [454, 398.2], [459, 399.4], [462.6, 400.3]],
  [[462.6, 400.3], [464, 400.7], [464.8, 401.4], [464.8, 402.6]],
]);
/** Dessus intermédiaire au niveau k (0 = épais, 3 = affiné), point à point */
const niveau = (k: number): P[] => T0.map((p, i) => [p[0] + (T3[i][0] - p[0]) * (k / 3), p[1] + (T3[i][1] - p[1]) * (k / 3)]);
const pts = (l: P[]) => l.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' L');
/** Bout de la lame affinée et lit de l'ongle (dessous de la lame, inchangé, tracé de POD-AT-0003), jusqu'au départ du dessus affiné */
const LIT = 'C464.8,404 464.2,404.9 463.3,404.9 L455,404.6 C447,402.6 435,399.6 424,397.4 C421.4,396.6 420.2,394 421,391.5 Z';

/** Fraise (centre au repos, posée sur le dos de l'ongle épais en x ≈ 446) et axe de la pièce à main, repris de soins-ongles.ts */
const B: P = [447, 377.6];
const RF = 5.6;
const AXE: P = [Math.cos((-52 * Math.PI) / 180), Math.sin((-52 * Math.PI) / 180)];
/** Centre de la fraise posée sur le dessus du niveau k, à l'abscisse x (normale extérieure au dessus) */
function contact(k: number, x: number): P {
  const l = niveau(k);
  let i = l.findIndex((p) => p[0] >= x);
  if (i < 1) i = 1;
  const [a, b] = [l[i - 1], l[i]], t = (x - a[0]) / (b[0] - a[0] || 1);
  const p: P = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]], n = Math.hypot(dx, dy) || 1;
  const nn: P = dy / n > 0 ? [dy / n, -dx / n] : [-dy / n, dx / n];
  const v: P = nn[1] > 0 ? [-nn[0], -nn[1]] : nn;
  return [p[0] + v[0] * (RF + 0.2), p[1] + v[1] * (RF + 0.2)];
}
/** Déplacement de la fraise depuis sa position de repos (CSS translate, unités de la forme) */
const decalage = (c: P) => `translate(${f1(c[0] - B[0])}px,${f1(c[1] - B[1])}px)`;
const HORS = decalage([B[0] + AXE[0] * 90, B[1] + AXE[1] * 90]);

// ———————————————————————————————————————————————————— Calendrier (secondes d'un cycle de 12 s)

const ARRIVEE: [number, number] = [2.4, 3.6];
const COUCHE = 1.2667; // durée d'une couche
const t0 = (k: number) => ARRIVEE[1] + k * COUCHE;
const FIN_MEULAGE = t0(3); // 7.4
const RETRAIT: [number, number] = [FIN_MEULAGE, 8.2];
const ECLAT: [number, number] = [8.0, 9.0];
const SCENE = { sortie: [11.0, 11.4], entree: [11.4, 11.8] } as const;
/** Départ du site : la pose de l'image figée (fraise posée, ongle encore épais, poussières), sans saut à l'apparition */
const DEPART_SITE = 3.78;

// ———————————————————————————————————————————————————— Rendu

/** Variables de couleur (jetons ÉcranZen → charte des sites, comme rendu.ts) et épaisseurs (unités de la forme) */
function variables(registre: RegistreMeulage, ech: number): string {
  const r = registre === 'releve' ? 1 : 0;
  const v = ['trait', 'peau-2', 'peau-ombre', 'ongle', 'blanc', 'orthese', 'metal'].map((j) => `--ez-${j}:${CORRESPONDANCE_JETONS[j][r]}`);
  v.push(`--ez-ep-fin:${f1(TRAIT.fin * ech)}`, `--ez-ep-normal:${f1(TRAIT.normal * ech)}`, `--ez-ep-epais:${f1(TRAIT.fort * ech)}`);
  // Reflet « lisse » : clair sur l'ongle pédagogique, trait clair sur l'aplat sombre du relevé (jamais l'accent : lu « outil »)
  v.push(`--mg-reflet:${r ? 'var(--dessin-trait, var(--encre))' : 'var(--blanc)'}`);
  return v.join(';');
}

/** Corps du dessin (unités de la forme) : orteil de POD-AT-0003 sans sa lame, lame en couches, repli, fraise, poussières, reflet */
function corps(): string {
  const base = FORMES['pied-profil-ongle-epais'].corps;
  const debutLame = base.indexOf('<g><path d="M421,391.5');
  const debutRepli = base.indexOf('<g><path d="M399,387.2');
  if (debutLame < 0 || debutRepli < debutLame) throw new Error('meulage : lame ou repli de POD-AT-0003 introuvable (forme changée ?)');
  const orteil = base.slice(0, debutLame), repli = base.slice(debutRepli);
  const fill = 'fill:var(--ez-ongle)';
  const trait = (op: number) => `stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin)${op < 1 ? `;stroke-opacity:${op}` : ''}`;
  // Lame affinée (dessous de tout), puis les trois couches à meuler, de la plus profonde (2) à la plus haute (0)
  const lame = `<path d="M${pts(T3)} ${LIT}" style="${fill};${trait(1)}"/>` + `<path class="mg-bord mg-bord--3" d="M${pts(T3)}" style="${trait(1)}" stroke-opacity="0.35"/>`;
  const couches = [2, 1, 0].map((k) => {
    const haut = niveau(k), bas = niveau(k + 1);
    const forme = `M${pts(haut)} L${pts([...bas].reverse())} Z`;
    // Bord exposé : le dessus de la couche et son bout (bord libre) ; lamelle discrète tant qu'une couche la recouvre
    const bord = `M${pts(haut)} L${pts([bas[bas.length - 1]])}`;
    return `<g class="mg-couche mg-couche--${k}"><path d="${forme}" style="${fill}"/>` +
      `<path class="mg-bord mg-bord--${k}" d="${bord}" style="${trait(1)}"${k ? ' stroke-opacity="0.35"' : ''}/>` +
      (k === 0 ? '<path d="M431,388 C437,385.6 444,384.6 452,384.4" style="stroke:var(--ez-blanc);stroke-width:var(--ez-ep-fin)"/>' : '') + '</g>';
  }).join('');
  // Reflet lisse sur la lame affinée : un trait clair qui glisse une fois, puis reste discret
  const reflet = 'M436,393.8 C441,395 445,396.6 451,398.3';
  const eclat = `<path class="mg-eclat" d="${reflet}" pathLength="1" stroke-dasharray="0.22 1.4" stroke-dashoffset="0.22" opacity="0" style="stroke:var(--mg-reflet);stroke-width:var(--ez-ep-normal)"/>` +
    `<path class="mg-reflet" d="${reflet}" opacity="0" style="stroke:var(--mg-reflet);stroke-width:var(--ez-ep-fin)"/>`;
  // Pièce à main et fraise : tracés de soins-ongles.ts (ongleEpaisMeulage), corps prolongé hors cadre
  const at = (s: number, w: number): P => [B[0] + AXE[0] * s - AXE[1] * w, B[1] + AXE[1] * s + AXE[0] * w];
  const f = (p: P) => `${f1(p[0])},${f1(p[1])}`;
  const poly = (l: P[]) => `M${l.map(f).join(' L')} Z`;
  const tige = poly([at(3, -1.4), at(16, -1.4), at(16, 1.4), at(3, 1.4)]);
  const nez = poly([at(16, -2.6), at(28, -5.6), at(28, 5.6), at(16, 2.6)]);
  const corpsOutil = poly([at(28, -6.6), at(160, -7.6), at(160, 7.6), at(28, 6.6)]);
  const bagues = [40, 46, 52].map((s) => `M${f(at(s, -6.7))} L${f(at(s, 6.7))}`).join(' ');
  // Goujures : trois cordes décentrées (symétrie d'ordre 3) qui tournent lentement ; le cercle invisible centre la rotation (fill-box)
  const goujures = [0, 120, 240].map((a) => {
    const r = (d: number): P => [B[0] + RF * 0.82 * Math.cos(((a + d) * Math.PI) / 180), B[1] + RF * 0.82 * Math.sin(((a + d) * Math.PI) / 180)];
    return `M${f(r(0))} L${f(r(140))}`;
  }).join(' ');
  // Poussières d'ongle : naissent au contact (sous la fraise, côté bord libre) et filent vers l'avant en s'éteignant ; position figée = en vol
  const pied: P = [B[0] + 2.4, B[1] + RF - 0.6];
  const poussieres = [[-8, 1.3, 7], [-24, 1.1, 10], [-40, 1, 5], [6, 0.9, 12], [-56, 0.8, 8]].map(([a, r, x], i) =>
    `<g transform="rotate(${a} ${f(pied)})"><circle class="mg-poussiere mg-poussiere--${i}" cx="${f1(pied[0])}" cy="${f1(pied[1])}" r="${r}" transform="translate(${x} 0)" style="fill:var(--ez-orthese)"/></g>`).join('');
  const outil = `<g class="mg-outil">` +
    `<path d="${corpsOutil}" style="fill:var(--ez-metal);stroke:var(--ez-trait);stroke-width:var(--ez-ep-normal)"/>` +
    `<path d="${bagues}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.5"/>` +
    `<path d="${nez}" style="fill:var(--ez-metal);stroke:var(--ez-trait);stroke-width:var(--ez-ep-normal)"/>` +
    `<path d="${tige}" style="fill:var(--ez-trait)"/>` +
    `<circle cx="${B[0]}" cy="${B[1]}" r="${RF}" style="fill:var(--ez-orthese);stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin)"/>` +
    `<g class="mg-goujures"><circle cx="${B[0]}" cy="${B[1]}" r="${RF}" fill="none"/><path d="${goujures}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.55"/></g>` +
    `<g class="mg-poussieres">${poussieres}</g></g>`;
  return `<g class="mg-scene">${orteil}<g class="mg-ongle">${lame}${couches}${eclat}</g>${repli}${outil}</g>`;
}

/** Cadrages (unités de la forme) : la lame au centre, la pièce à main sort par le haut à droite */
const CADRES = {
  site: { vb: [400, 300], dessin: [0, 0, 400, 300], recadrage: [348, 328, 152, 114] },
  '16x9': { vb: [1920, 1080], dessin: [0, 0, 1920, 1080], recadrage: [322, 330, 202, 113.6] },
  '16x9-etiquettes': { vb: [1920, 1080], dessin: [60, 40, 1180, 1000], recadrage: [356, 326, 141.6, 120] },
  '9x16': { vb: [1080, 1920], dessin: [0, 360, 1080, 1200], recadrage: [362, 316, 126, 140] },
  '9x16-etiquettes': { vb: [1080, 1920], dessin: [0, 300, 1080, 1000], recadrage: [356, 322, 141.6, 131] },
} as const;

/** Étiquettes d'ÉcranZen (facultatives) : texte sobre, deux lignes, ≥ 72 px en 1080p ; jamais sur les sites */
function etiquettes(format: Exclude<FormatMeulage, 'site'>): string {
  const [x, y, taille, ancre] = format === '16x9' ? [1290, 470, 84, 'start'] : [540, 1440, 88, 'middle'];
  return ETAPES_MEULAGE.map((e, i) =>
    `<text class="mg-etiquette mg-etiquette--${i}" x="${x}" y="${y}" text-anchor="${ancre}" opacity="${i ? 0 : 1}" style="font-family:var(--mg-police, sans-serif);font-size:${taille}px;font-weight:600;fill:var(--mg-texte, var(--papier))">` +
    e.lignes.map((l, j) => `<tspan x="${x}" dy="${j ? f1(taille * 1.12) : 0}">${l}</tspan>`).join('') + '</text>').join('');
}

/**
 * SVG de l'animation (balise <svg> complète). `anime` : ajoute la feuille d'animation (cssMeulage) ; sans elle, c'est l'image figée.
 * `etiquettes` : seulement en 16x9 / 9x16 (ÉcranZen), désactivées par défaut. `titre` : texte alternatif (sinon aria-hidden).
 */
export function svgMeulage(o: { format?: FormatMeulage; registre?: RegistreMeulage; etiquettes?: boolean; anime?: boolean; id?: string; classe?: string; titre?: string } = {}): string {
  const format = o.format ?? 'site';
  const avecTextes = Boolean(o.etiquettes) && format !== 'site';
  const c = CADRES[avecTextes ? (`${format}-etiquettes` as const) : format];
  const [dx, dy, dl, dh] = c.dessin, [rx, ry, rl, rh] = c.recadrage;
  // Épaisseurs : constantes en unités de la forme (le trait suit la taille du dessin), graisse de l'illustration « ongles-epais »
  const ech = 0.7;
  const registre = o.registre ?? 'releve';
  // Animé (site, vidéos) : le pied et la pièce à main continuent hors de la zone du dessin jusqu'aux bords du conteneur (16:9 de la
  // fiche, image vidéo), qui coupe lui-même (overflow: hidden) : jamais de bord droit coupé au milieu de l'image. Image figée : au cadre
  const deborde = o.anime ? ' overflow="visible"' : '';
  const classes = ['meulage', `meulage--${registre}`, `meulage--${format}`, o.classe].filter(Boolean).join(' ');
  const a11y = o.titre ? `role="img" aria-label="${o.titre.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  return `<svg${o.id ? ` id="${o.id}"` : ''} class="${classes}" viewBox="0 0 ${c.vb[0]} ${c.vb[1]}" ${a11y} preserveAspectRatio="xMidYMid meet"${deborde} fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    (o.anime ? `<style>${cssMeulage()}</style>` : '') +
    `<svg x="${dx}" y="${dy}" width="${dl}" height="${dh}" viewBox="${rx} ${ry} ${rl} ${rh}" preserveAspectRatio="xMidYMid slice" overflow="${deborde ? 'visible' : 'hidden'}" style="${variables(registre, ech)}">${corps()}</svg>` +
    (avecTextes ? etiquettes(format as Exclude<FormatMeulage, 'site'>) : '') + '</svg>';
}

// ———————————————————————————————————————————————————— Mouvement (CSS, une feuille pour toutes les instances)

type Cle = [number, string, string?]; // [secondes, déclarations, courbe vers la clé suivante]
const images = (nom: string, cles: Cle[]) =>
  `@keyframes ${nom}{${cles.map(([s, d, c]) => `${pc(s)}{${d}${c ? `;animation-timing-function:${c}` : ''}}`).join('')}}`;
const op = (v: number) => `opacity:${v}`;
const so = (v: number) => `stroke-opacity:${v}`;
const tr = (v: string) => `transform:${v}`;
const ES = COURBES.entreeSortie, SO = COURBES.sortie, LIN = 'linear';

/**
 * Feuille d'animation. Le mouvement ne joue que sur `.meulage.en-vue` (posée à l'écran par le gabarit, jamais si le visiteur réduit
 * les mouvements ni si le modèle n'anime pas) ou sur `.meulage--lecture` (export vidéo, pilotée image par image). Durée du cycle :
 * --mg-duree si le parent la pose (ÉcranZen : 12 s), sinon --cycle-geste (site). Départ du site décalé sur la pose de l'image figée (--mg-depart).
 * Admin (lecture forcée, animations-lecture.ts) : `selecteur` remplace le déclencheur (ex. `.al-joue .meulage`) et `toujours` retire
 * la condition prefers-reduced-motion (l'admin la gère lui-même : bouton « Voir l'animation »). Sans option : feuille du site, inchangée.
 */
export function cssMeulage(o: { selecteur?: string; toujours?: boolean } = {}): string {
  const S = ARRIVEE[1];
  // Fraise : arrive dans son axe, balaie chaque couche (milieu → bord libre → arrière → milieu, un niveau plus bas), se retire
  const outil: Cle[] = [[0, `${tr(HORS)};${op(0)}`], [ARRIVEE[0], `${tr(HORS)};${op(0)}`, SO], [ARRIVEE[0] + 0.3, op(1)], [S, `${tr(decalage(contact(0, 446)))};${op(1)}`, ES]];
  for (let k = 0; k < 3; k++) {
    outil.push([t0(k) + 0.32, tr(decalage(contact(k + 0.25, 456))), ES], [t0(k) + 0.95, tr(decalage(contact(k + 0.75, 436))), ES], [t0(k + 1), tr(decalage(contact(k + 1, 446))), ES]);
  }
  outil.push([RETRAIT[1] - 0.3, op(1)], [RETRAIT[1], `${tr(HORS)};${op(0)}`], [BASE, `${tr(HORS)};${op(0)}`]);
  // Couches : s'effacent pendant leur balayage ; reviennent pendant le fondu noir de la scène (11,4 s), jamais à l'écran
  const couche = (k: number) => images(`mg-couche-${k}`, [[0, op(1)], [t0(k) + 0.15, op(1), LIN], [t0(k + 1), op(0)], [SCENE.sortie[1] - 0.01, op(0)], [SCENE.sortie[1], op(1)], [BASE, op(1)]]);
  // Bord exposé : la lamelle sous la couche meulée devient le contour net
  const bord = (k: number) => images(`mg-bord-${k}`, [[0, so(0.35)], [t0(k - 1) + 0.15, so(0.35), LIN], [t0(k - 1) + 1, so(1)], [SCENE.sortie[1] - 0.01, so(1)], [SCENE.sortie[1], so(0.35)], [BASE, so(0.35)]]);
  const css = [
    images('mg-scene', [[0, op(1)], [SCENE.sortie[0], op(1), ES], [SCENE.sortie[1], op(0), ES], [SCENE.entree[1], op(1)], [BASE, op(1)]]),
    images('mg-outil', outil),
    couche(0), couche(1), couche(2), bord(1), bord(2), bord(3),
    images('mg-poussieres', [[0, op(0)], [S, op(0), LIN], [S + 0.15, op(1)], [FIN_MEULAGE - 0.15, op(1), LIN], [FIN_MEULAGE + 0.05, op(0)], [BASE, op(0)]]),
    images('mg-eclat', [[0, `${op(0)};stroke-dashoffset:0.22`], [ECLAT[0], `${op(0)};stroke-dashoffset:0.22`, LIN], [ECLAT[0] + 0.1, op(0.9)], [ECLAT[1] - 0.1, op(0.9), LIN], [ECLAT[1], `${op(0)};stroke-dashoffset:-1.1`], [BASE, `${op(0)};stroke-dashoffset:-1.1`]]),
    images('mg-reflet', [[0, op(0)], [ECLAT[1] - 0.3, op(0), ES], [ECLAT[1] + 0.3, op(0.55)], [SCENE.sortie[1] - 0.01, op(0.55)], [SCENE.sortie[1], op(0)], [BASE, op(0)]]),
    // Étiquettes (ÉcranZen) : fondus de 0,25 s, entièrement nettes pendant ETAPES_MEULAGE[].net
    images('mg-etiquette-0', [[0, op(1)], [2.8, op(1), ES], [3.05, op(0)], [SCENE.entree[0], op(0), ES], [SCENE.entree[1], op(1)], [BASE, op(1)]]),
    images('mg-etiquette-1', [[0, op(0)], [3.05, op(0), ES], [3.3, op(1)], [7.3, op(1), ES], [7.55, op(0)], [BASE, op(0)]]),
    images('mg-etiquette-2', [[0, op(0)], [7.55, op(0), ES], [7.8, op(1)], [10.8, op(1), ES], [11.1, op(0)], [BASE, op(0)]]),
    '@keyframes mg-tour{to{transform:rotate(360deg)}}',
    '@keyframes mg-poussiere{0%{transform:translate(0px,0px);opacity:0}15%{opacity:0.9}100%{transform:translate(13px,1.5px);opacity:0}}',
  ];
  const J = o.selecteur ?? ':is(.meulage.en-vue,.meulage--lecture)';
  const regles = [
    `.meulage{--mg-cycle:var(--mg-duree,var(--cycle-geste,${CYCLES.geste}ms));--mg-depart:calc(var(--mg-cycle) * -${+(DEPART_SITE / BASE).toFixed(4)})}`,
    '.meulage--lecture{--mg-depart:0s}',
    '.meulage .mg-goujures{transform-box:fill-box;transform-origin:center}',
    `${J} .mg-scene,${J} .mg-outil,${J} .mg-couche,${J} .mg-bord,${J} .mg-poussieres,${J} .mg-eclat,${J} .mg-reflet,${J} .mg-etiquette{animation-duration:var(--mg-cycle);animation-delay:var(--mg-depart);animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}`,
    `${J} .mg-scene{animation-name:mg-scene}${J} .mg-outil{animation-name:mg-outil}${J} .mg-poussieres{animation-name:mg-poussieres}${J} .mg-eclat{animation-name:mg-eclat}${J} .mg-reflet{animation-name:mg-reflet}`,
    [0, 1, 2].map((k) => `${J} .mg-couche--${k}{animation-name:mg-couche-${k}}${J} .mg-etiquette--${k}{animation-name:mg-etiquette-${k}}`).join(''),
    [1, 2, 3].map((k) => `${J} .mg-bord--${k}{animation-name:mg-bord-${k}}`).join(''),
    // Rotation lente (un tour en 1/8 de cycle : 1,25 s sur le site) ; poussières : cinq vols décalés, période 1/20 de cycle
    `${J} .mg-goujures{animation:mg-tour calc(var(--mg-cycle) / 8) linear infinite}`,
    `${J} .mg-poussiere{animation:mg-poussiere calc(var(--mg-cycle) / 20) ${COURBES.sortie} infinite both}`,
    [0, 1, 2, 3, 4].map((i) => `${J} .mg-poussiere--${i}{animation-delay:calc(var(--mg-cycle) / -100 * ${i})}`).join(''),
  ];
  if (o.toujours) return `${css.join('')}${regles.slice(3).join('')}${regles.slice(0, 3).join('')}`;
  return `${css.join('')}@media (prefers-reduced-motion:no-preference){${regles.slice(3).join('')}}${regles.slice(0, 3).join('')}`;
}
