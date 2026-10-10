// ANALYSE DE LA FOULÉE (retours de Paul du 2026-10-10 : « le coureur, on dirait plus un robot qu'autre chose » puis « je verrais plus
// des chiffres qui apparaissent sur une image de coureur, sur un pied de course, avec les données classiques qui apparaissent dans
// un style technique »). Remplace, dans les tirages par défaut du héros « sport », le squelette à rotules (animation:coureur) :
//  - les JAMBES d'un coureur en aplat plein (silhouette fluide, sans rotule ni point d'articulation), chaussures de course, à
//    l'instant de l'attaque du pied ;
//  - par-dessus, une SUPERPOSITION « analyse de course » au trait fin : sol gradué, aplomb du bassin, ligne de la semelle et arc de
//    l'angle d'attaque, trajectoire de la pointe du pied sur un cycle ;
//  - et les DONNÉES CLASSIQUES d'une analyse de foulée (cadence, temps de contact, angle d'attaque, oscillation verticale, longueur
//    de foulée), en police mono tabulaire : valeurs plausibles et GÉNÉRIQUES d'un coureur loisir, illustratives — jamais un résultat
//    de patient, aucune norme, aucun « normal / anormal », aucune promesse (exception aux « aucun chiffre » accordée par Paul pour
//    ce visuel technique seulement).
//
// AUCUNE ANATOMIE INVENTÉE : poses, jambes et chaussures viennent de foulee.ts (cinématique Novacheck 1998, chaussure de course aux
// proportions réelles) et des demi-largeurs des « tubes de jambe » du héros sport (heros-scenes.ts : galbe du mollet à l'arrière,
// cheville fine). La trajectoire du pied est CALCULÉE (pointe de la chaussure sur un cycle, bassin fixe : la boucle d'un tapis).
//
// Trois sorties, mêmes tracés :
//  - svgAnalyseCourse() : illustration héros du thème sport (heros-themes.ts, registres relevé et pédagogique), paysage et portrait
//    (portrait : trois données) — couleurs en variables (--dessin-trait, --dessin-accent), compatibles « sans fond » ;
//  - htmlAnalyseCourse() / cssAnalyseCourse() : visuel animé du premier écran (clé composant:entete-anim:pi-analyse-course) — le
//    tracé se dessine, les données apparaissent une à une, leur compteur défile puis se fige ; image FIXE finale (sans script,
//    réduction des animations) ; transform, opacity et stroke-dashoffset seulement ;
//  - la même liste de données sert à la superposition sur PHOTO (photo-trace.ts : tracés « analyse » et « analyse-anime »).
// Tout est « à valider » : rien n'est montré à un praticien avant la validation de Paul.

import { poseCoureur, type Pt } from './foulee';

/** Donnée classique d'une analyse de foulée (valeur illustrative, unités françaises) */
export interface DonneeCourse { id: string; libelle: string; valeur: string; unite: string }

/**
 * Valeurs GÉNÉRIQUES et plausibles d'un coureur loisir à allure d'endurance (≈ 10-11 km/h) : cadence 170-180 pas/min, contact
 * 220-260 ms, attaque 5-10°, oscillation 7-9 cm, foulée 1,1-1,3 m. Ordre = ordre d'affichage (téléphone : les trois premières).
 */
export const DONNEES_COURSE: readonly DonneeCourse[] = [
  { id: 'cadence', libelle: 'Cadence', valeur: '176', unite: 'pas/min' },
  { id: 'contact', libelle: 'Contact au sol', valeur: '238', unite: 'ms' },
  { id: 'attaque', libelle: 'Attaque du pied', valeur: '7', unite: '°' },
  { id: 'oscillation', libelle: 'Oscillation verticale', valeur: '8,2', unite: 'cm' },
  { id: 'foulee', libelle: 'Longueur de foulée', valeur: '1,18', unite: 'm' },
];
/** Données montrées sur téléphone (format portrait, petite boîte) */
export const DONNEES_TELEPHONE = 3;

/** Étapes du compteur qui défile (valeurs croissantes puis la valeur finale), même nombre de décimales */
export function etapesCompteur(valeur: string, n = 5): string[] {
  const dec = valeur.split(',')[1]?.length ?? 0, v = Number(valeur.replace(',', '.'));
  const f = (x: number) => x.toFixed(dec).replace('.', ',');
  return [...(n === 4 ? [0.3, 0.68, 0.92] : [0.18, 0.46, 0.71, 0.88, 0.96].slice(0, n - 1)).map((t) => f(v * t)), valeur];
}

type P = [number, number];
const r = (v: number) => Math.round(v);
const r1 = (v: number) => Math.round(v * 10) / 10;
/** Courbe ouverte (Catmull-Rom → Bézier), coordonnées entières */
function courbe(points: P[]): string {
  const n = points.length, pt = (i: number) => points[Math.max(0, Math.min(n - 1, i))];
  let d = `M${r(points[0][0])} ${r(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    d += `C${r(p1[0] + (p2[0] - p0[0]) / 6)} ${r(p1[1] + (p2[1] - p0[1]) / 6)} ${r(p2[0] - (p3[0] - p1[0]) / 6)} ${r(p2[1] - (p3[1] - p1[1]) / 6)} ${r(p2[0])} ${r(p2[1])}`;
  }
  return d;
}
/** Courbe fermée (Catmull-Rom) */
function fermee(points: P[]): string {
  const n = points.length, pt = (i: number) => points[(i + n) % n];
  let d = `M${r(pt(0)[0])} ${r(pt(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    d += `C${r(p1[0] + (p2[0] - p0[0]) / 6)} ${r(p1[1] + (p2[1] - p0[1]) / 6)} ${r(p2[0] - (p3[0] - p1[0]) / 6)} ${r(p2[1] - (p3[1] - p1[1]) / 6)} ${r(p2[0])} ${r(p2[1])}`;
  }
  return `${d}Z`;
}
const mi = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * Phase dessinée : juste avant le contact du talon droit (fin d'oscillation, p = 0,985) — pied d'attaque pointe relevée au-dessus
 * du sol, jambe arrière en début d'oscillation (genou fléchi, talon qui remonte) : l'instant que mesure l'angle d'attaque.
 */
export const PHASE_ANALYSE = 0.985;

/**
 * Profil de la jambe d'un coureur loisir / marathonien en bonne santé (retour de Paul du 2026-10-10 : « les jambes font un peu
 * anorexique »), vue de profil, en fractions de la longueur de jambe L (hanche → cheville), d'après les épaisseurs d'un adulte
 * sportif (cuisse ≈ 17-19 cm, genou ≈ 11 cm, mollet ≈ 12 cm, cheville ≈ 6-7 cm pour L ≈ 85 cm) : cuisse ≈ 0,22 L en haut (elle
 * s'élargit vers le bassin), ≈ 0,19 L à mi-cuisse, genou ≈ 0,12 L (rotule devant, creux poplité derrière), mollet galbé ≈ 0,14 L
 * au tiers haut de la jambe (le galbe est DERRIÈRE, le tibia reste presque droit devant), tendon d'Achille et cheville ≈ 0,07 L.
 * Chaque point : [segment (0 cuisse, 1 jambe), position le long du segment, demi-largeur devant, demi-largeur derrière].
 */
const PROFIL_JAMBE: [0 | 1, number, number, number][] = [
  [0, -0.02, 0.108, 0.114], [0, 0.5, 0.094, 0.096], [0, 0.78, 0.078, 0.074], [0, 0.97, 0.064, 0.06],
  [1, 0.1, 0.056, 0.07], [1, 0.3, 0.052, 0.088], [1, 0.5, 0.046, 0.074], [1, 0.75, 0.039, 0.047], [1, 1, 0.034, 0.036],
];

/** Géométrie de la scène dans un repère donné : jambes, chaussures, sol, tracés de l'analyse */
function geometrie(L: number, x0: number, sol: number) {
  const pose = poseCoureur(PHASE_ANALYSE, L);
  const X = (q: Pt): P => [x0 + q.x, sol + q.y];
  const jambe = (j: (typeof pose)['droite']) => {
    const H = X(j.hanche), K = X(j.genou), A = X(j.cheville);
    // Axe : cuisse (hanche → genou) puis jambe (genou → cheville) ; le haut de la cuisse se fond dans la page (masque)
    const axe: P[] = PROFIL_JAMBE.map(([s, t]) => (s === 0 ? mi(H, K, t) : mi(K, A, t)));
    // Normale de chaque point : celle de son segment, moyennée au genou (contour continu, sans pli artificiel)
    const dir = (u: P, v: P): P => { const l = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1; return [(v[0] - u[0]) / l, (v[1] - u[1]) / l]; };
    const dc = dir(H, K), dj = dir(K, A);
    const g: P[] = [], d: P[] = [];
    PROFIL_JAMBE.forEach(([s, t, av, ar], i) => {
      const q = axe[i];
      const w = s === 0 ? Math.max(0, (t - 0.75) / 0.5) : Math.max(0, (0.25 - t) / 0.5);
      const tx = (s === 0 ? dc[0] * (1 - w) + dj[0] * w : dj[0] * (1 - w) + dc[0] * w), ty = (s === 0 ? dc[1] * (1 - w) + dj[1] * w : dj[1] * (1 - w) + dc[1] * w);
      const l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
      g.push([q[0] + nx * ar * L, q[1] + ny * ar * L]); d.push([q[0] - nx * av * L, q[1] - ny * av * L]);
    });
    const ch = j.chaussure.map(X);
    // Semelle intermédiaire : bande du talon à la pointe, au-dessus du contour bas de la chaussure (drop : plus épaisse au talon)
    // (bande fermée : contour bas talon → pointe, puis la ligne de la semelle au retour), comme la semelle blanche d'une chaussure de course
    const haut: P[] = [mi(ch[1], ch[13], 0.2), mi(ch[3], ch[12], 0.32), mi(ch[6], ch[11], 0.22), mi(ch[7], ch[10], 0.32)];
    const semelle = fermee([ch[1], ch[2], ch[3], ch[4], ch[5], ch[6], ch[7], ch[8], ...[...haut].reverse()]);
    return { jambe: fermee([...g, ...[...d].reverse()]), chaussure: fermee(ch), semelle, talon: ch[4], pointe: ch[8], A };
  };
  const avant = jambe(pose.droite), arriere = jambe(pose.gauche);
  // Trajectoire de la pointe du pied sur un cycle, bassin fixe (référence d'un tapis de course) : la boucle classique
  const boucle: P[] = Array.from({ length: 13 }, (_, i) => { const q = poseCoureur(i / 12, L); return [x0 + q.droite.orteil.x, Math.min(sol - 1, sol + q.droite.orteil.y - (q.bassin.y - pose.bassin.y))]; });
  // Ligne de la semelle du pied d'attaque (talon → pointe), prolongée vers l'avant ; angle avec le sol
  const [tx, ty] = avant.talon, [px, py] = avant.pointe;
  const angle = Math.atan2(ty - py, px - tx);
  return { avant, arriere, boucle, angle, talon: avant.talon, bassinX: x0, hautBassin: sol + pose.bassin.y, sol };
}

export type FormatAnalyse = 'paysage' | 'portrait' | 'scene';
/** Repères : héros paysage 640 × 360, portrait 360 × 480 ; visuel animé (jambes et tracés seuls, données en HTML) 300 × 300 */
export const REPERES_ANALYSE: Record<FormatAnalyse, { l: number; h: number }> = { paysage: { l: 640, h: 360 }, portrait: { l: 360, h: 480 }, scene: { l: 300, h: 300 } };

/**
 * Mise en page : jambes (longueur L, bassin x0, sol) et panneau de données dessiné (héros seulement, corps lisibles une fois le héros
 * réduit) — « colonne » en paysage (libellé au-dessus de la valeur, trois données), « lignes » en portrait (libellé à gauche,
 * valeur à droite, trois données, au-dessus des jambes).
 */
type Panneau = { x: number; y: number; dy: number; l: number; n: number; lignes: boolean; tl: number; tv: number; tu: number };
const MISE: Record<FormatAnalyse, { L: number; x0: number; sol: number; panneau: Panneau | null }> = {
  paysage: { L: 330, x0: 196, sol: 334, panneau: { x: 428, y: 66, dy: 102, l: 200, n: 3, lignes: false, tl: 18, tv: 40, tu: 18 } },
  portrait: { L: 252, x0: 170, sol: 458, panneau: { x: 22, y: 58, dy: 58, l: 316, n: DONNEES_TELEPHONE, lignes: true, tl: 17, tv: 34, tu: 17 } },
  scene: { L: 252, x0: 150, sol: 286, panneau: null },
};

const POLICE_MONO = 'font-family:var(--police-mono,monospace)';

/**
 * Corps de la scène (sans racine) : classes ac-* ; couleurs par variables --ac-t (trait, jambes, textes) et --ac-a (accent :
 * chaussures, tracés). Le haut des cuisses se fond dans la page (masque : jamais une jambe coupée net). `anime` : longueurs
 * normalisées des tracés qui se dessinent.
 */
export function corpsAnalyseCourse(format: FormatAnalyse, o: { anime?: boolean } = {}): string {
  const R = REPERES_ANALYSE[format], m = MISE[format];
  const G = geometrie(m.L, m.x0, m.sol);
  const pl = o.anime ? ' pathLength="1"' : '';
  // Sol gradué (une graduation tous les 0,1 L, plus longue tous les 0,5 L)
  const x1 = 12, x2 = m.panneau && !m.panneau.lignes ? m.panneau.x - 20 : R.l - 12;
  let ticks = '';
  for (let k = -20; k <= 20; k++) { const x = m.x0 + k * 0.1 * m.L; if (x > x1 + 4 && x < x2 - 4) ticks += `M${r(x)} ${m.sol}v${k % 5 ? 4 : 8}`; }
  // Aplomb du bassin (pointillé), du haut des jambes au sol
  const aplomb = `M${r(G.bassinX)} ${r(Math.max(4, G.hautBassin))}V${m.sol}`;
  // Angle d'attaque : semelle prolongée, horizontale au talon, arc
  const [tx, ty] = G.talon, ra = 0.26 * m.L, a = G.angle;
  const semelleProlongee = `M${r(tx)} ${r(ty)}L${r(tx + Math.cos(a) * 0.42 * m.L)} ${r(ty - Math.sin(a) * 0.42 * m.L)}`;
  const horizontale = `M${r(tx)} ${r(ty)}h${r(0.42 * m.L)}`;
  const arc = `M${r(tx + ra)} ${r(ty)}A${r(ra)} ${r(ra)} 0 0 0 ${r1(tx + Math.cos(a) * ra)} ${r1(ty - Math.sin(a) * ra)}`;
  // Viseur du contact : quatre coins autour du talon (jamais un point sur la peau)
  const v = 0.05 * m.L, w = 0.022 * m.L;
  const viseur = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => `M${r(tx + sx * v)} ${r(ty + sy * v - sy * w)}v${r(sy * w)}h${r(-sx * w)}`).join('');
  // Fondu du haut des cuisses (du bassin vers le milieu de la cuisse)
  const id = `ac-${format}`, y0 = r(G.hautBassin + 0.01 * m.L), y1 = r(G.hautBassin + 0.17 * m.L);
  const masque = `<defs><linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}"><stop offset="0" stop-color="#fff" stop-opacity="0"></stop><stop offset="1" stop-color="#fff"></stop></linearGradient><mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="${R.l}" height="${R.h}"><rect width="${R.l}" height="${R.h}" fill="url(#${id}g)"></rect></mask></defs>`;
  const lignes = `<path class="ac-g" d="M${x1} ${m.sol}H${x2}${ticks}"${pl}/><path class="ac-p" d="${aplomb}"/><path class="ac-b" d="${courbe(G.boucle)}"/>`;
  const jambes = `<g class="ac-j" mask="url(#${id}m)"><g class="ac-jl"><path d="${G.arriere.jambe}"/><path d="${G.arriere.chaussure}" class="ac-c"/></g><path d="${G.avant.jambe}"/><path d="${G.avant.chaussure}" class="ac-c"/><path d="${G.avant.semelle}" class="ac-s"/></g>`;
  const mesure = `<g class="ac-m"><path class="ac-h" d="${horizontale}"/><path class="ac-h" d="${semelleProlongee}"/><path class="ac-a" d="${arc}"${pl}/><path class="ac-v" d="${viseur}"/></g>`;
  // Étiquette de l'angle, au bout de l'arc
  const am = a / 2, ex = tx + Math.cos(am) * (ra + 0.05 * m.L), ey = ty - Math.sin(am) * (ra + 0.05 * m.L);
  const angleTexte = `<text class="ac-e" x="${r(ex)}" y="${r(ey + 5)}" font-size="${r1(0.06 * m.L)}">${DONNEES_COURSE[2].valeur}°</text>`;
  return `${masque}${lignes}${jambes}${mesure}<g style="${POLICE_MONO}">${angleTexte}${m.panneau ? panneau(m.panneau) : ''}</g>`;
}

/** Panneau dessiné des données (héros) : libellé (capitales espacées), valeur mono, unité */
function panneau(p: Panneau): string {
  return DONNEES_COURSE.slice(0, p.n).map((d, i) => {
    const x = p.x, y = p.y + i * p.dy;
    // Le degré fait partie de la valeur (même corps), les autres unités suivent en petit ; chasse fixe ≈ 0,6 em par caractère
    const deg = d.unite === '°' ? '°' : '', unite = deg ? '' : d.unite;
    const lv = (d.valeur.length + deg.length) * p.tv * 0.6, eu = 5, lu = unite.length * p.tu * 0.6;
    // Lignes (portrait) : valeur et unité calées à droite, sur la ligne du libellé ; colonne : valeur sous le libellé
    const xv = p.lignes ? r(x + p.l - lu - (unite ? eu : 0) - lv) : x, yv = p.lignes ? y + 6 : r(y + p.tv + 6);
    return `<g class="ac-d"><path class="ac-f" d="M${x} ${p.lignes ? y - 30 : y - 22}h${p.l}"/><text class="ac-l" x="${x}" y="${y}" font-size="${p.tl}">${d.libelle.toUpperCase()}</text>` +
      `<text class="ac-w" x="${xv}" y="${yv}" font-size="${p.tv}">${d.valeur}${deg}</text>${unite ? `<text class="ac-u" x="${r(xv + lv + eu)}" y="${yv}" font-size="${p.tu}">${unite}</text>` : ''}</g>`;
  }).join('');
}

/** Feuille des tracés (état FIXE), commune au héros et au visuel animé : variables --ac-t (trait), --ac-a (accent) de l'hôte */
const CSS_TRACES = `.ac-j{fill:var(--ac-t)}.ac-jl{opacity:.62}.ac-c{fill:var(--ac-a)}.ac-s{fill:var(--ac-t);opacity:.92}.ac-g,.ac-p,.ac-f{stroke:var(--ac-t);stroke-width:1.2;opacity:.6}
.ac-p{stroke-dasharray:2 6}.ac-b,.ac-h,.ac-a,.ac-v{stroke:var(--ac-a);stroke-width:1.6}.ac-b{stroke-width:2.2;stroke-dasharray:0 7}.ac-h{stroke-dasharray:5 4}.ac-a{stroke-width:2.4}.ac-e{fill:var(--ac-a);font-weight:600}`.replace(/\n/g, '');
/** Feuille de l'image FIXE du héros : tracés + panneau dessiné */
export const CSS_ANALYSE_FIXE = `${CSS_TRACES}.ac-f{opacity:.35}.ac-l,.ac-w,.ac-u{fill:var(--ac-t)}.ac-w{font-weight:600}.ac-l,.ac-u{opacity:.82}.ac-l{letter-spacing:.06em}`;
const FEUILLE_FIXE = CSS_ANALYSE_FIXE;

/** Corps d'un héros de thème (heros-themes.ts, repère du format) : couleurs du héros (--dessin-trait, --dessin-accent) */
export const corpsHerosAnalyse = (format: Exclude<FormatAnalyse, 'scene'>) =>
  `<g class="dessin--analyse-course" style="--ac-t:var(--dessin-trait,currentColor);--ac-a:var(--dessin-accent,currentColor)"><style>${FEUILLE_FIXE}</style>${corpsAnalyseCourse(format)}</g>`;

/** Illustration fixe (<svg> complet : inventaire, duels) — couleurs : --dessin-trait, --dessin-accent */
export function svgAnalyseCourse(format: Exclude<FormatAnalyse, 'scene'> = 'paysage', o: { classe?: string } = {}): string {
  const R = REPERES_ANALYSE[format];
  return `<svg class="dessin dessin--analyse-course${o.classe ? ` ${o.classe}` : ''}" viewBox="0 0 ${R.l} ${R.h}" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round" style="--ac-t:var(--dessin-trait,currentColor);--ac-a:var(--dessin-accent,currentColor)"><style>${FEUILLE_FIXE}</style>${corpsAnalyseCourse(format)}</svg>`;
}

// ———————————————————————————————————————————————————— Données en HTML (visuel animé, photo) : corps en px, toujours lisibles

/**
 * Lignes de données (<dl> : libellé, valeur, unité) ; `anime` : étapes du compteur superposées (<i>, cachées hors lecture), la
 * valeur finale (<span>) apparaît quand le compteur s'arrête. Rang `ac-r<i>` : les deux dernières sont masquées en boîte étroite.
 */
export function htmlDonneesCourse(anime: boolean, classe: string): string {
  return `<dl class="${classe}">${DONNEES_COURSE.map((d, i) => {
    const deg = d.unite === '°' ? '°' : '';
    const etapes = anime ? etapesCompteur(d.valeur, 4).slice(0, -1).map((e, j) => `<i${j ? ` style="--j:${j}"` : ''}>${e}${deg}</i>`).join('') : '';
    return `<div class="ac-r ac-r${i + 1}" style="--i:${i}"><dt>${d.libelle}</dt><dd><b>${etapes}<span>${d.valeur}${deg}</span></b>${deg ? '' : ` ${d.unite}`}</dd></div>`;
  }).join('')}</dl>`;
}
/** Feuille commune des lignes de données (couleurs par l'hôte : color, --ac-a) */
const CSS_DONNEES = (c: string) => `.${c}{margin:0;font:500 12.5px/1.2 var(--police-mono,monospace)}.${c} .ac-r{padding:0 0 7px 10px;border-left:2px solid var(--ac-a);margin:0 0 9px}.${c} .ac-r:last-child{margin:0}
.${c} dt{text-transform:uppercase;letter-spacing:.08em;font-size:11.5px;opacity:.88}.${c} dd{margin:3px 0 0;font-variant-numeric:tabular-nums}.${c} b{position:relative;display:inline-block;font-size:21px;font-weight:600}.${c} i{position:absolute;left:0;top:0;font-style:normal;opacity:0}`;
/** Lecture des compteurs : chaque ligne entre (décalée de `pas`), son compteur défile (3 étapes de 120 ms, chacune visible le temps de
 * son animation seulement, sans remplissage) puis se fige */
const LECTURE_DONNEES = (sel: string, c: string, debut: number, pas: number, k: string, glisse = true) => `${sel} .${c} .ac-r{animation:${k}-r .5s cubic-bezier(.2,.8,.3,1) both;animation-delay:calc(${debut}s + var(--i) * ${pas}ms)}
${sel} .${c} i{animation:${k}-k .12s linear;animation-delay:calc(${debut}s + var(--i) * ${pas}ms + var(--j,0) * 120ms)}${sel} .${c} span{animation:${k}-o 0s both;animation-delay:calc(${debut + 0.36}s + var(--i) * ${pas}ms)}
@keyframes ${k}-r{from{opacity:0${glisse ? ';transform:translateX(10px)' : ''}}}@keyframes ${k}-k{0%,100%{opacity:1}}@keyframes ${k}-o{from{opacity:0}}`;

// ———————————————————————————————————————————————————— Visuel animé du premier écran (pi-analyse-course)

/** Balisage du visuel animé (contenu de la boîte .ea : entete-pied.ts) : jambes et tracés en SVG, données en HTML */
export const svgAnalyseCourseScene = () => `<svg viewBox="0 0 300 300" fill="none" stroke-linecap="round" stroke-linejoin="round" class="ac-sc">${corpsAnalyseCourse('scene', { anime: true })}</svg>${htmlDonneesCourse(true, 'ac-dl')}`;

/**
 * Feuille du visuel animé, `R` = sélecteur de lecture (« .ea-joue .ea--pi-analyse-course ») : les jambes apparaissent, le sol se
 * trace, l'aplomb, la trajectoire et l'angle se dessinent, puis chaque donnée entre et son compteur défile avant de se figer
 * (≈ 4 s). Hors lecture : l'image finale. Couleurs du panneau de la gamme : --ea-t (trait), couleur vive mêlée au trait (accent).
 * Boîte étroite (téléphone) : trois données.
 */
export const cssAnalyseCourseScene = (R: string) => `.ea--pi-analyse-course{--ac-t:var(--ea-t);--ac-a:color-mix(in oklab,var(--hp-vif) 72%,var(--ea-t));container-type:size;color:var(--ea-t)}
svg.ac-sc{inset:6% auto 6% 2%;width:60%;height:88%;stroke:none}.ac-dl{position:absolute;right:6%;top:50%;transform:translateY(-50%);width:34%}
@container (max-width:440px){.ac-dl .ac-r4,.ac-dl .ac-r5{display:none}.ac-dl{width:38%}.ac-dl b{font-size:19px}}
${CSS_TRACES}${CSS_DONNEES('ac-dl')}
${R} .ac-j{animation:ea-ac-o .6s ease-out both}${R} .ac-g,${R} .ac-a{stroke-dasharray:1;animation:ea-ac-t 1s ease-in-out both;animation-delay:.3s}${R} .ac-a{animation-delay:1.3s}
${R} .ac-p{animation:ea-ac-o .5s ease-out both;animation-delay:.7s}${R} .ac-b{animation:ea-ac-o 1s ease-out both;animation-delay:.9s}${R} .ac-h,${R} .ac-v,${R} .ac-e{animation:ea-ac-o .5s ease-out both;animation-delay:1.4s}
@keyframes ea-ac-t{0%{stroke-dashoffset:1}100%{stroke-dashoffset:0}}
${LECTURE_DONNEES(R, 'ac-dl', 1.6, 420, 'ea-ac')}`;

// ———————————————————————————————————————————————————— Superposition sur PHOTO (photo-trace.ts : analyse, analyse-anime)

/**
 * Viseur de la photo (quatre coins, trait fin) et plaque de lecture : données en blanc sur une plaque sombre translucide (contraste
 * AA quelle que soit la photo : blanc sur noir à 62 % posé sur du blanc ≥ 6:1), filet d'accent clair. Téléphone (boîte étroite) :
 * trois données. `anime` : compteurs pour la lecture au chargement.
 */
export const htmlAnalysePhoto = (anime: boolean): string =>
  `<svg class="tp-vs" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M4 14V4h8M88 4h8v10M96 86v10h-8M12 96H4V86"/></svg>${htmlDonneesCourse(anime, 'tp-a')}`;

/** Feuille de la superposition sur photo (classe de l'hôte : .hp__tp--<t>) */
export const cssAnalysePhoto = (t: string, anime: boolean) => `.hp__tp--${t}{container-type:inline-size;filter:none;--ac-a:color-mix(in srgb,var(--hp-vif,#fff) 55%,#fff)}.hp__tp--${t} .tp-vs{stroke-width:1.5px;opacity:.85}
${CSS_DONNEES('tp-a')}.tp-a{position:absolute;top:5%;right:5%;padding:10px 14px 8px;min-width:178px;border-radius:10px;background:rgb(8 12 16/.62);color:#fff}
@container (max-width:520px){.tp-a .ac-r4,.tp-a .ac-r5{display:none}.tp-a{min-width:0;padding:8px 12px 6px}.tp-a b{font-size:19px}}${anime ? `
@media (prefers-reduced-motion:no-preference){.hp__tp--${t} .tp-vs{animation:hp-ac-o .6s .2s ease-out both}.tp-a{animation:hp-ac-o .5s .5s ease-out both}
${LECTURE_DONNEES('.hp__tp--' + t, 'tp-a', 0.8, 380, 'hp-ac', false)}}` : ''}`;

// ———————————————————————————————————————————————————— Inventaire (illustrations.ts), hashtags (kits.ts)

/** Registres livrés de l'image fixe (inventaire `dessin:analyse-course:<registre>`) */
export const REGISTRES_ANALYSE_COURSE = ['releve', 'pedagogique'] as const;
export const FICHE_ANALYSE_COURSE = {
  libelle: 'Analyse de la foulée (course à pied)',
  regard: 'Les jambes d’un coureur en aplat à l’attaque du pied, chaussures de course (semelle intermédiaire et drop lisibles), sol gradué, aplomb du bassin, angle d’attaque et trajectoire du pied ; données classiques d’une analyse de course, valeurs génériques illustratives',
  sujets: ['sport'] as const,
  // #running rattache au kit « Sport · course » (activité course : #course-a-pied, #running) ; jamais #trail en plus (un visuel de
  // deux activités sort des deux kits, profils.ts)
  hashtags: ['course', 'course-a-pied', 'marathon', 'running', 'sport'] as const,
};
export const CLES_ANALYSE_COURSE: readonly string[] = REGISTRES_ANALYSE_COURSE.map((r) => `dessin:analyse-course:${r}`);
export const HASHTAGS_ANALYSE_COURSE: Readonly<Record<string, readonly string[]>> = Object.fromEntries(CLES_ANALYSE_COURSE.map((c) => [c, [...FICHE_ANALYSE_COURSE.hashtags]]));
