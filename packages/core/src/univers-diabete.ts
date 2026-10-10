// Univers DIABÈTE (demande de Paul du 2026-10-09 : « creuser l'univers diabète pour créer des illustrations SVG dans un style
// moderne qui colle avec les modèles ; identifier des icônes / illustrations à mettre au premier plan ou en avant en page
// d'accueil »). Analyse et liste priorisée : docs/univers-diabete.md.
//
// Deux familles, toutes BROUILLONS (« À revoir » dans /admin/illustrations, « Nouveau » dans « Donner mon avis ») :
//  - 3 HÉROS de premier écran (clé `heros:diabete-<id>:releve|pedagogique`, base `heros:diabete-<id>`), dessinés dans le repère
//    240 × 180 et habillés comme les héros des thèmes (heros-themes.ts : paysage 16:9, portrait 3:4, fond plan sombre en relevé,
//    aplat doux en pédagogique). Ils n'arrivent sur un site QUE validés par Paul (kit du sujet, kits-visuels.ts : praticien =
//    visuels validés seulement) ;
//  - 8 ILLUSTRATIONS de cartes (clé `dessin:diabete-<id>:releve|pedagogique`, base `dessin:diabete-<id>`), dans la GRAMMAIRE DU
//    MATÉRIEL (dessins.ts, corpsEquipement, notée 4,4-5 ★) : repère 120 × 90, sol au trait fin, contour au trait fort sur aplat
//    clair, détails au trait fin ; en relevé, l'« afficheur » porte trois marques de la palette, en pédagogique une zone d'accent.
//
// RÈGLES (graphiste-sante, illustrateur-medical, juge-gout-paul, pieges-illustration.md, gout-paul.md) :
//  - AUCUNE anatomie inventée : pas de main, pas de jambe, pas d'orteil redessiné. Un pied ne se montre que par une géométrie
//    validée : plante vue de dessous (CONTOUR_PIED, POD-AT-0001/0002), semelle (SEMELLE = EZ_SEMELLE) et ses courbes de niveau
//    (courbesRelief : le style « empreintes en lignes de niveau » que Paul adore). La chaussure est le profil de la chaussure de
//    running de la bibliothèque (EZ-HTML/chaussure-running, 5 ★), redessiné dans nos classes, sans maille ni marque ;
//  - JAMAIS DE ROUGE (diabète) : seules les trois premières couleurs de la palette (--d-bas, --d-froid, --d-doux : bleu, bleu-vert,
//    jaune) et l'accent de la gamme ; jamais --d-haut ni --d-chaud ; aucune couleur littérale, aucun <style>, aucun texte ;
//  - pas d'instrument en premier écran (« il faut rassurer ») : le monofilament reste dans la carte « test de sensibilité » ;
//  - une seule idée par image, objets reliés (posés sur le même sol), aucune plaie, aucun sang.
import { CONTOUR_PIED, SEMELLE, SEMELLE_POINTS, chaikin, echantillonner, deformerChemin, type P } from './pied';
import { courbesRelief, SITES_MONOFILAMENT } from './dessins';
import { FORMES } from './bibliotheque/formes';
import { cheminLisse } from './sports';
import { habillerHeros, type FormatHeros, type SansFond } from './heros-themes';
import type { Registre } from './dessins';

// ———————————————————————————————————————————————————— Fiches (sujets, hashtags)

export interface FicheUniversDiabete {
  libelle: string;
  /** Ce que montre l'élément (le regard du pédicure-podologue) */
  regard: string;
  /** Message de santé sous-entendu et sa source vérifiable (jamais affiché dans l'image) */
  source: string;
  /** Hashtags par défaut (forme FORME_HASHTAG) ; « diabete » rattache l'élément au vivier du sujet (kits-visuels.ts) */
  hashtags: readonly string[];
}

const AMELI_SUIVI = 'ameli.fr, « Suivi des pieds du diabétique »';

/** Héros du premier écran (clé `heros:diabete-<id>:<registre>`) */
export const HEROS_DIABETE = ['diabete-nature-morte', 'diabete-sensibilite', 'diabete-miroir'] as const;
export type HerosDiabete = (typeof HEROS_DIABETE)[number];
export const estHerosDiabete = (x: unknown): x is HerosDiabete => typeof x === 'string' && (HEROS_DIABETE as readonly string[]).includes(x);

/** Illustrations de cartes (clé `dessin:diabete-<id>:<registre>`) */
export const DESSINS_DIABETE = ['diabete-sensibilite-test', 'diabete-chaussettes', 'diabete-creme', 'diabete-ongles', 'diabete-chaussons', 'diabete-chaussure', 'diabete-bilan', 'diabete-toilette'] as const;
export type DessinDiabete = (typeof DESSINS_DIABETE)[number];
export const estDessinDiabete = (x: unknown): x is DessinDiabete => typeof x === 'string' && (DESSINS_DIABETE as readonly string[]).includes(x);

/** Registres livrés (le trait continu n'est pas encore dessiné : il viendra après l'avis de Paul) */
export const REGISTRES_DIABETE = ['releve', 'pedagogique'] as const;

export const FICHES_UNIVERS_DIABETE: Readonly<Record<HerosDiabete | DessinDiabete, FicheUniversDiabete>> = {
  'diabete-nature-morte': {
    libelle: 'Prendre soin de ses pieds (nature morte)',
    regard: 'Une chaussure fermée et confortable, une paire de chaussettes et un pot de crème posés ensemble sur le sol : le quotidien qui protège les pieds, sans instrument',
    source: `${AMELI_SUIVI} : chaussures confortables et adaptées, chaussettes appropriées, peau sèche à hydrater`,
    hashtags: ['diabete', 'prevention', 'chaussage', 'chaussettes', 'hydratation'],
  },
  'diabete-sensibilite': {
    libelle: 'Sensibilité des pieds (semelles en lignes de niveau)',
    regard: 'Les deux semelles en lignes de niveau, trois points doux sur chaque plante (pulpe du gros orteil, têtes du 1er et du 5e métatarsien) : là où l’on vérifie la sensibilité',
    source: `${AMELI_SUIVI} : examen annuel de la sensibilité (test au monofilament) ; sites : HAS, « Prévention du pied à risque » (fiche outil du parcours diabète de type 2, 2025)`,
    hashtags: ['diabete', 'sensibilite', 'prevention', 'semelles', 'depistage'],
  },
  'diabete-miroir': {
    libelle: 'Auto-examen au miroir (miroir penché)',
    regard: 'Un miroir posé au sol, penché, dans lequel se reflète la plante du pied : regarder sous ses pieds chaque jour',
    source: `${AMELI_SUIVI} : inspecter ses pieds chaque jour, un miroir pour le dessous des pieds ou l’aide d’un proche`,
    hashtags: ['diabete', 'auto-examen', 'miroir', 'prevention', 'plante-du-pied'],
  },
  'diabete-sensibilite-test': {
    libelle: 'Test de sensibilité au monofilament',
    regard: 'La plante vue de dessous et ses trois sites (pulpe de l’hallux, têtes de M1 et M5), le monofilament posé à côté : l’examen de la sensibilité, sans main',
    source: `${AMELI_SUIVI} : examen annuel avec test au monofilament ; HAS, fiche outil « Prévention du pied à risque » (2025)`,
    hashtags: ['diabete', 'monofilament', 'sensibilite', 'depistage', 'bilan'],
  },
  'diabete-chaussettes': {
    libelle: 'Chaussettes adaptées',
    regard: 'Une paire de chaussettes de profil, bord côte souple, sans couture ni reprise visible',
    source: `${AMELI_SUIVI} : porter des chaussettes appropriées ; « changées chaque jour, sans reprise ni trou » (ameli.fr)`,
    hashtags: ['diabete', 'chaussettes', 'chaussage', 'prevention'],
  },
  'diabete-creme': {
    libelle: 'Hydrater la peau',
    regard: 'Un tube et un pot de crème émolliente, sans marque : hydrater la peau sèche (sauf entre les orteils)',
    source: 'ameli.fr : hydrater la peau sèche avec un émollient, sauf entre les orteils',
    hashtags: ['diabete', 'creme', 'hydratation', 'peau-seche', 'conseil'],
  },
  'diabete-ongles': {
    libelle: 'Soin des ongles : limer, couper droit',
    regard: 'Une lime à ongles et un coupe-ongles à lames droites : limer plutôt que couper, couper droit et pas trop court',
    source: `${AMELI_SUIVI} : limer les ongles plutôt que les couper, les couper droit et non en demi-cercle`,
    hashtags: ['diabete', 'ongles', 'coupe-ongles', 'lime', 'conseil'],
  },
  'diabete-chaussons': {
    libelle: 'Ne pas marcher pieds nus',
    regard: 'Une paire de chaussons fermés vus de dessus (semelle validée en lignes de niveau dans l’ouverture) : toujours chaussé, même à la maison',
    source: 'Fédération française des diabétiques, « Pied diabétique » : éviter de marcher pieds nus, même à la maison ; ameli.fr : protéger ses pieds',
    hashtags: ['diabete', 'chaussons', 'pieds-nus', 'prevention'],
  },
  'diabete-chaussure': {
    libelle: 'Chaussure fermée et confortable',
    regard: 'Une chaussure fermée, souple et large de profil (géométrie de la chaussure de la bibliothèque) : vérifier l’intérieur avant de l’enfiler',
    source: `${AMELI_SUIVI} : chaussures confortables et adaptées, vérifier l’intérieur avant de les enfiler`,
    hashtags: ['diabete', 'chaussage', 'chaussure', 'prevention'],
  },
  'diabete-bilan': {
    libelle: 'Bilan podologique et suivi',
    regard: 'Une fiche de bilan sur sa planchette : la semelle en lignes de niveau et trois cases cochées (examen, gradation du risque, conseils)',
    source: 'ameli.fr (pédicure-podologue), « Diabète : prévenir les complications du pied » : examen des pieds et gradation du risque, éducation, évaluation du chaussage ; bilan transmis au médecin traitant',
    hashtags: ['diabete', 'bilan', 'gradation', 'suivi', 'medecin-traitant'],
  },
  'diabete-toilette': {
    libelle: 'Toilette des pieds',
    regard: 'Une bassine d’eau, un thermomètre de bain et une serviette pliée : eau tiède vérifiée, pieds bien séchés',
    source: `${AMELI_SUIVI} : bonne hygiène des pieds ; Fédération française des diabétiques : vérifier la température de l’eau, bien sécher entre les orteils`,
    hashtags: ['diabete', 'hygiene', 'toilette', 'prevention'],
  },
};

/** Clés d'inventaire de l'univers diabète (héros puis dessins, relevé et pédagogique) */
export const CLES_UNIVERS_DIABETE: readonly string[] = [
  ...HEROS_DIABETE.flatMap((h) => REGISTRES_DIABETE.map((r) => `heros:${h}:${r}`)),
  ...DESSINS_DIABETE.flatMap((d) => REGISTRES_DIABETE.map((r) => `dessin:${d}:${r}`)),
];

/** Hashtags par défaut (kits.ts, HASHTAGS_PAR_DEFAUT) : clé → hashtags triés */
export const HASHTAGS_UNIVERS_DIABETE: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  CLES_UNIVERS_DIABETE.map((cle) => [cle, [...new Set(FICHES_UNIVERS_DIABETE[cle.split(':')[1] as HerosDiabete].hashtags)].sort()] as const),
);

// ———————————————————————————————————————————————————— Outils

type Affine = [number, number, number, number, number, number];
const r1 = (v: number) => +v.toFixed(1);
const ap = (m: Affine, x: number, y: number): P => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const tf = (d: string, m: Affine) => deformerChemin(d, (x, y) => ap(m, x, y)).replace(/(\d+\.\d)\d+/g, '$1');
/** Déformation non linéaire d'un chemin (échantillonné, chaque point déformé, relissé) */
const dense = (d: string, f: (x: number, y: number) => P) => echantillonner(d, 10).map((q) => cheminLisse(q.pts.map(([x, y]) => f(x, y)), q.ferme, 0.05)).join(' ');
const poly = (pts: readonly P[], ferme = true) => `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')}${ferme ? ' Z' : ''}`;
const echapper = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
/** Trois couleurs FROIDES de la palette (jamais --d-haut ni --d-chaud : pas de rouge pour le diabète) */
export const COULEURS_DIABETE = ['var(--d-bas)', 'var(--d-froid)', 'var(--d-doux)'] as const;
/** « Afficheur » : trois marques de la palette (relevé) ou une zone d'accent (pédagogique), comme le matériel */
const marques = (R: boolean, x: number, y: number, l = 3, dx = 4.4, vertical = false, ep = 'var(--trait-marque)') =>
  R ? COULEURS_DIABETE.map((c, k) => `<path d="M${r1(x + k * dx)} ${y} ${vertical ? `v-${l}` : `h${l}`}" stroke="${c}" stroke-width="${ep}"></path>`).join('')
    : `<path class="zone zone--forte" d="M${r1(x - 1)} ${r1(y - (vertical ? l + 1 : 2))} H${r1(x + 2 * dx + (vertical ? 1 : l) + 1)} V${r1(y + 2)} H${r1(x - 1)} Z"></path>`;
const sol = (y = 84, x0 = 4, x1 = 116) => `<line class="cote" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"></line>`;

// ———————————————————————————————————————————————————— Géométries réutilisées

/** Plante du pied droit vue de dessous (miroir du repère du pied : hallux à droite), posée par `m` */
const plante = (m: Affine, R: boolean, plis = true) => {
  const mm: Affine = [-m[0], -m[1], m[2], m[3], m[4] + 92 * m[0], m[5] + 92 * m[1]];
  return R
    ? `<path class="pointille" d="${tf(CONTOUR_PIED.plantaire.trait, mm)}"></path>`
    : `<g class="peau-douce">${CONTOUR_PIED.plantaire.peaux.map((p) => `<path class="peau-seule" d="${tf(p, mm)}"></path>`).join('')}${plis ? `<path class="fin fin--leger" d="${tf(CONTOUR_PIED.plantaire.plis, mm)}"></path>` : ''}<path class="trait" d="${tf(CONTOUR_PIED.plantaire.trait, mm)}"></path></g>`;
};
/** Sites du test (repère du pied droit) vus de dessous, posés par `m` (même miroir que `plante`) */
const sitesSous = (m: Affine): P[] => SITES_MONOFILAMENT.map(([x, y]) => ap(m, 92 - x, y));

/** Courbes de niveau de la semelle (relief, jamais une carte de pression) posées par `m`, avec la teinte du registre */
function niveaux(m: Affine, R: boolean, ep = 'var(--trait-fort)'): string {
  const c = courbesRelief();
  return c.map(({ boucles }, k) => {
    const couleur = R ? COULEURS_DIABETE[Math.min(2, Math.floor((k * 3) / c.length))] : 'var(--d-accent)';
    const op = R ? 0.9 : r1(0.3 + (0.6 * k) / (c.length - 1));
    return boucles.map((d) => `<path d="${tf(d, m)}" stroke="${couleur}" stroke-opacity="${op}" stroke-width="${ep}"></path>`).join('');
  }).join('');
}
/** Semelle vue de dessus posée par `m` (repère du pied droit ; `m` à déterminant négatif = semelle gauche) */
const semelle = (m: Affine, R: boolean, ep?: string) =>
  `<path class="${R ? 'trait trait--moyen' : 'trait peau'}" d="${tf(SEMELLE, m)}"${R ? ' fill="var(--d-fond)" fill-opacity="0.18"' : ''}></path>${niveaux(m, R, ep)}`;

/**
 * Chaussure fermée de profil : géométrie de la chaussure de running de la bibliothèque (EZ-HTML/chaussure-running, profil,
 * notée 5 ★), lue dans FORMES (aucune recopie) : tige, semelle, col, languette, passants du laçage. Repère d'origine 1040 × 430.
 */
function chaussureBiblio() {
  const c = FORMES['chaussure-running-profil'].corps;
  const clip = (id: string) => c.match(new RegExp(`<clipPath id="EZID-${id}"><path d="([^"]+)"`))?.[1] ?? '';
  const parStyle = (style: string) => [...c.matchAll(new RegExp(`<path d="([^"]+)"[^>]*style="fill:var\\(--ez-ch-${style}\\)"`, 'g'))].map((x) => x[1]);
  const lacets = [...c.matchAll(/<path d="(M[\d.]+,[\d.]+ L[\d.]+,[\d.]+)" stroke-width="5"/g)].map((x) => x[1]);
  return { tige: clip('tige'), semelle: clip('sem'), col: parStyle('col')[0] ?? '', languette: parStyle('tigeClair').find((d) => d.startsWith('M354')) ?? '', lacets };
}
let memoCh: ReturnType<typeof chaussureBiblio> | null = null;
const CH = () => (memoCh ??= chaussureBiblio());
/** Chaussure posée : semelle sur le sol `y`, pointe vers la droite, longueur ≈ `l`, bord gauche en `x` */
function chaussure(x: number, y: number, l: number, R: boolean): string {
  const k = l / 900, m: Affine = [k, 0, 0, k, x - 38 * k, y - 447 * k];
  const ch = CH();
  const t = (d: string) => tf(d.replace(/,/g, ' '), m);
  // Bande de la mousse (intermédiaire) : ligne parallèle au bas de la semelle ; en relevé, trois filets de la palette
  const filets = [0, 1, 2].map((i) => `M${r1(x + 18 * k * 10)} ${r1(y - (60 - i * 22) * k)} H${r1(x + 760 * k)}`);
  return `<path class="trait peau" d="${t(ch.semelle)}"></path>${R
    ? filets.map((d, i) => `<path d="${d}" stroke="${COULEURS_DIABETE[i]}" stroke-width="var(--trait-normal)"></path>`).join('')
    : `<path class="zone" d="${t(ch.semelle)}"></path>`}` +
    `<path class="trait peau" d="${t(ch.tige)}"></path><path class="piece-coque" d="${t(ch.col)}"></path><path class="fin" d="${t(ch.languette)}"></path>` +
    `<path class="lacet" d="${ch.lacets.map((d) => t(d)).join(' ')}"></path><path class="trait trait--moyen" d="${t(ch.tige)}"></path>`;
}

/**
 * Chaussure (même pose que `chaussure`) avec une chaussette rentrée dans l'ouverture : la tige de la chaussette (tube, bord côte
 * replié) sort du col, légèrement inclinée vers le talon ; dessinée AVANT la chaussure, qui en cache le bas.
 */
function chausseteDansChaussure(x: number, y: number, l: number, R: boolean): string {
  const k = l / 900, m: Affine = [k, 0, 0, k, x - 38 * k, y - 447 * k];
  const q = (pts: P[]) => pts.map(([px, py]) => ap(m, px, py));
  const tube = q([[118, 200], [96, 30], [92, -60], [262, -84], [270, 0], [300, 190]]);
  const bord = q([[92, -60], [262, -84], [264, -30], [94, -6]]);
  const ouverture = q([[92, -60], [170, -92], [262, -84], [180, -52]]);
  const cotes = Array.from({ length: 7 }, (_, i) => { const t = (i + 1) / 8; const [a1, b1] = q([[92 + 170 * t, -60 - 24 * t], [94 + 170 * t, -6 - 24 * t]]); return `M${r1(a1[0])} ${r1(a1[1])} L${r1(b1[0])} ${r1(b1[1])}`; }).join(' ');
  const [p1] = q([[150, -40]]);
  return `<path class="trait peau" d="${cheminLisse(tube, true, 0.05)}"></path><path class="${R ? 'fin' : 'zone zone--forte'}" d="${cheminLisse(bord, true, 0.05)}"></path><path class="fin" d="${cotes}"></path>` +
    `<path class="trait peau" d="${cheminLisse(ouverture, true, 0.05)}"></path><path class="piece-coque" d="${cheminLisse(ouverture, true, 0.05)}"></path>` +
    (R ? COULEURS_DIABETE.map((c, i) => `<circle cx="${r1(p1[0] + i * 4.6)}" cy="${r1(p1[1] + 14 - i * 0.6)}" r="1.3" fill="${c}" stroke="none"></circle>`).join('') : '') +
    `<path class="trait" d="${cheminLisse(tube, true, 0.05)}"></path>${chaussure(x, y, l, R)}`;
}

// ———————————————————————————————————————————————————— Objets (dessinés : aucun n'est une anatomie)

/** Chaussette de profil (tube coudé : bord côte, talon, pied, bout arrondi), bord côte en `x, y`, taille `e` (1 ≈ 60 u de haut) */
function chaussette(x: number, y: number, e: number, R: boolean, fond = false): string {
  const p = (px: number, py: number): P => [x + px * e, y + py * e];
  const contour: P[] = [p(0, 0), p(0, 40), p(1.5, 50), p(8, 57), p(18, 59.5), p(52, 59.5), p(62, 58.5), p(67, 54), p(66, 47.5), p(60, 44), p(40, 39.5), p(26, 35.5), p(22, 30), p(22, 0)];
  const d = cheminLisse(chaikin(contour, 2), true, 0.05);
  const cote = Array.from({ length: 6 }, (_, i) => `M${r1(x + (3 + i * 3.2) * e)} ${r1(y + 1.5 * e)} V${r1(y + 10 * e)}`).join(' ');
  const talon = cheminLisse([p(0.5, 44), p(5, 52), p(14, 55.5), p(18, 59)], false, 0.05);
  return `<path class="trait peau" d="${d}"${fond ? ' fill-opacity="1"' : ''}></path><path class="fin" d="${cote} M${r1(x)} ${r1(y + 11 * e)} H${r1(x + 22 * e)}"></path><path class="fin" d="${talon}"></path>${
    R ? COULEURS_DIABETE.map((c, k) => `<circle cx="${r1(x + (6 + k * 5) * e)}" cy="${r1(y + 18 * e)}" r="${r1(1.2 * Math.max(0.8, e))}" fill="${c}" stroke="none"></circle>`).join('') : `<path class="zone zone--forte" d="M${r1(x + 0.6 * e)} ${r1(y + 0.6 * e)} H${r1(x + 21.4 * e)} V${r1(y + 10.6 * e)} H${r1(x + 0.6 * e)} Z"></path>`
  }<path class="trait" d="${d}"></path>`;
}

/** Pot de crème ouvert (3/4) : base `x` (centre) sur le sol `y`, rayon `r` ; crème lisse, une vague au centre */
function pot(x: number, y: number, r: number, R: boolean): string {
  const h = r * 0.9, ry = r * 0.32;
  const corps = `M${r1(x - r)} ${r1(y - h)} V${r1(y - ry * 0.3)} A${r} ${r1(ry)} 0 0 0 ${r1(x + r)} ${r1(y - ry * 0.3)} V${r1(y - h)}`;
  const haut = `M${r1(x - r)} ${r1(y - h)} A${r} ${r1(ry)} 0 1 0 ${r1(x + r)} ${r1(y - h)} A${r} ${r1(ry)} 0 1 0 ${r1(x - r)} ${r1(y - h)} Z`;
  const creme = `M${r1(x - r * 0.84)} ${r1(y - h + 0.6)} A${r1(r * 0.84)} ${r1(ry * 0.8)} 0 1 0 ${r1(x + r * 0.84)} ${r1(y - h + 0.6)} A${r1(r * 0.84)} ${r1(ry * 0.8)} 0 1 0 ${r1(x - r * 0.84)} ${r1(y - h + 0.6)} Z`;
  const vague = `M${r1(x - r * 0.36)} ${r1(y - h + 0.4)} C${r1(x - r * 0.12)} ${r1(y - h - ry * 0.7)} ${r1(x + r * 0.2)} ${r1(y - h + ry * 0.5)} ${r1(x + r * 0.4)} ${r1(y - h - ry * 0.2)}`;
  const bande = `M${r1(x - r)} ${r1(y - h * 0.62)} A${r} ${r1(ry)} 0 0 0 ${r1(x + r)} ${r1(y - h * 0.62)}`;
  return `<path class="trait peau" d="${corps} Z"></path><path class="fin" d="${bande}"></path>${marques(R, x - 5, r1(y - h * 0.3), 2.6, 3.8)}<path class="trait peau" d="${haut}"></path><path class="${R ? 'fin' : 'zone zone--forte'}" d="${creme}"></path><path class="fin" d="${vague}"></path><path class="trait" d="${corps}"></path>`;
}

/** Tube de crème couché (bout serti à gauche, bouchon à droite), axe à hauteur `y`, de `x` à `x + l` */
function tube(x: number, y: number, l: number, R: boolean, sol = y + l * 0.13): string {
  const h0 = l * 0.1, h1 = l * 0.16; // demi-hauteur au bout serti, à l'épaule
  const xe = x + l * 0.74, xb = x + l * 0.8, xf = x + l;
  const c = sol - h1; // l'axe : le tube repose sur le sol
  const corps = `M${r1(x + 2)} ${r1(c - h0)} C${r1(x + l * 0.3)} ${r1(c - h0)} ${r1(xe - l * 0.2)} ${r1(c - h1)} ${r1(xe)} ${r1(c - h1)} Q${r1(xb)} ${r1(c - h1)} ${r1(xb)} ${r1(c - h1 * 0.55)} V${r1(c + h1 * 0.55)} Q${r1(xb)} ${r1(c + h1)} ${r1(xe)} ${r1(c + h1)} C${r1(xe - l * 0.2)} ${r1(c + h1)} ${r1(x + l * 0.3)} ${r1(c + h0)} ${r1(x + 2)} ${r1(c + h0)} Z`;
  const serti = `M${r1(x)} ${r1(c - h0 - 1)} H${r1(x + 5)} V${r1(c + h0 + 1)} H${r1(x)} Z`;
  const stries = Array.from({ length: 3 }, (_, i) => `M${r1(x + 1.2 + i * 1.3)} ${r1(c - h0)} V${r1(c + h0)}`).join(' ');
  const bouchon = `M${r1(xb)} ${r1(c - h1 * 0.62)} H${r1(xf - 1.5)} Q${r1(xf)} ${r1(c - h1 * 0.62)} ${r1(xf)} ${r1(c - h1 * 0.4)} V${r1(c + h1 * 0.4)} Q${r1(xf)} ${r1(c + h1 * 0.62)} ${r1(xf - 1.5)} ${r1(c + h1 * 0.62)} H${r1(xb)} Z`;
  const cannelures = Array.from({ length: 4 }, (_, i) => `M${r1(xb + 3 + i * ((xf - xb - 5) / 3))} ${r1(c - h1 * 0.45)} V${r1(c + h1 * 0.45)}`).join(' ');
  return `<path class="trait peau" d="${corps}"></path>${marques(R, x + l * 0.3, r1(c + 0.5), l * 0.07, l * 0.1)}<path class="trait peau" d="${serti}"></path><path class="fin" d="${stries}"></path><path class="trait peau" d="${bouchon}"></path><path class="fin" d="${cannelures}"></path>`;
}

// ———————————————————————————————————————————————————— Illustrations de cartes (repère 120 × 90)

function corpsDessin(nom: DessinDiabete, R: boolean, id: string): string {
  switch (nom) {
    case 'diabete-sensibilite-test': {
      // La plante du pied droit vue de dessous (hallux à droite) et ses trois sites (points pleins, jamais d'anneau ni de croix :
      // pas de « cible ») ; le monofilament couché sur le sol à droite (manche, filament droit) : l'instrument au repos, sans main.
      const k = 0.37, m: Affine = [k, 0, 0, k, 18, 2.5];
      const sites = sitesSous(m);
      // Monofilament au repos, couché sur le sol : manche, filament qui sort du bout en équerre (comme les monofilaments 10 g)
      const filament = `<path class="trait peau" d="M76 81 Q73 81 73 78.5 V74.5 Q73 72 76 72 H106 Q109 72 109 74.5 V78.5 Q109 81 106 81 Z"></path><path class="trait" d="M76 72 V81"></path><path class="filament" d="M74.5 72 C74 64 74.6 58 76.4 52"></path>`;
      return `${sol(84)}${plante(m, R)}${sites.map(([x, y], i) => `${R ? `<circle cx="${r1(x)}" cy="${r1(y)}" r="3.6" fill="${COULEURS_DIABETE[i]}" fill-opacity="0.25" stroke="none"></circle>` : ''}<circle cx="${r1(x)}" cy="${r1(y)}" r="2.1" fill="${R ? COULEURS_DIABETE[i] : 'var(--d-accent)'}" stroke="none"></circle>`).join('')}${filament}${marques(R, 86, 76.5, 2.6, 5)}`;
    }
    case 'diabete-chaussettes':
      // Une paire : la seconde chaussette, décalée, derrière la première (même forme)
      return `${sol(84)}${chaussette(46, 10, 1.0, R)}${chaussette(26, 22.8, 1.0, R, true)}`;
    case 'diabete-creme':
      return `${sol(84)}${tube(4, 0, 66, R, 84)}${pot(96, 84, 18, R)}`;
    case 'diabete-ongles': {
      // Vue de dessus, posés à plat : une lime à ongles (limer plutôt que couper) et des ciseaux à bouts ronds et LAMES DROITES
      // (couper droit, jamais en arrondi dans les coins) ; aucun instrument de soin du cabinet.
      const lime = 'M16 70 L70 18 Q74 14.6 77.4 18 Q80.6 21.4 77 25 L23 77 Q19.4 80.4 16 77 Q12.6 73.6 16 70 Z';
      const grain = Array.from({ length: 34 }, (_, i) => { const t = i / 33, cx = 22 + t * 50, cy = 70 - t * 48; return `M${r1(cx + ((i % 3) - 1) * 1.2)} ${r1(cy + ((i % 2) * 2 - 1) * 0.9 + ((i % 3) - 1) * 1.2)}h0`; }).join('');
      // Ciseaux : pivot (0, 0), pointe vers le haut, puis tournés de 28° et posés en (90, 46)
      const rot = (q: P[], deg: number, dx: number, dy: number) => { const a = (deg * Math.PI) / 180; return q.map(([x, y]) => [dx + x * Math.cos(a) - y * Math.sin(a), dy + x * Math.sin(a) + y * Math.cos(a)] as P); };
      const lame = (cote: number): P[] => [[-2.6 * cote, 3], [-3.2 * cote, -10], [-2 * cote, -26], [0, -32], [1.4 * cote, -28], [1.6 * cote, -10], [1 * cote, 3]];
      const branche = (cote: number): P[] => [[-1.6 * cote, 0], [5 * cote, 12], [6.4 * cote, 15.6], [2.6 * cote, 13], [-1 * cote, 4]];
      const pose = (q: P[], d = 0) => rot(q, 28 + d, 90, 46);
      const anneau = (cote: number) => { const [cx, cy] = pose([[8.4 * cote, 21]])[0]; return `<ellipse class="trait peau" cx="${r1(cx)}" cy="${r1(cy)}" rx="5.4" ry="6.8" transform="rotate(${28 + cote * 12} ${r1(cx)} ${r1(cy)})"></ellipse><ellipse class="${R ? 'fin' : 'zone zone--forte'}" cx="${r1(cx)}" cy="${r1(cy)}" rx="2.8" ry="4" transform="rotate(${28 + cote * 12} ${r1(cx)} ${r1(cy)})"></ellipse>`; };
      const [vx, vy] = pose([[0, 0]])[0];
      return `<path class="trait peau" d="${lime}"></path>${R ? `<path d="${grain}" stroke="var(--d-froid)" stroke-width="var(--trait-fort)"></path>` : `<path class="zone zone--forte" d="M21 71.6 L72 22 Q74.6 20.4 75.6 22.6 L24.6 72.6 Q22 74 21 71.6 Z"></path>`}<path class="fin" d="M46 44 L52 50.4"></path>` +
        `${anneau(-1)}${anneau(1)}<path class="trait peau" d="${cheminLisse(pose(branche(-1), 0), true, 0.04)}"></path><path class="trait peau" d="${cheminLisse(pose(branche(1), 0), true, 0.04)}"></path>` +
        `<path class="trait peau" d="${cheminLisse(pose(lame(1), -3), true, 0.04)}"></path><path class="trait peau" d="${cheminLisse(pose(lame(-1), 3), true, 0.04)}"></path><circle class="trait peau" cx="${r1(vx)}" cy="${r1(vy)}" r="1.8"></circle>${R ? marques(true, 26, 84, 3, 5) : ''}`;
    }
    case 'diabete-chaussons': {
      // Paire de chaussons FERMÉS vue de dessus : la semelle validée (SEMELLE) comme semelle du chausson, le dessus qui couvre
      // l'avant-pied, le contrefort qui ferme l'arrière ; dans l'ouverture, les courbes de niveau de la semelle (relief).
      const k = 0.3, piece = (gauche: boolean, cx: number, deg: number) => {
        const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), sx = gauche ? -k : k;
        const M: Affine = [sx * c, sx * s, -k * s, k * c, 0, 0];
        const [ox, oy] = ap(M, 46, 111);
        return [M[0], M[1], M[2], M[3], cx - ox, 45 - oy] as Affine;
      };
      const unite = (m: Affine, i: number) => {
        const clipO = `${id}-o${i}`;
        const dessus = SEMELLE_POINTS.filter(([, y]) => y < 116);
        const plus = (p: P): P => { const [x, y] = p; return [46 + (x - 46) * 1.1, y - 4]; };
        const empeigne = cheminLisse(chaikin([...dessus.map(plus), [92, 116], [88, 122], [60, 128], [30, 126], [4, 118]] as P[], 1).map(([x, y]) => ap(m, x, y)), true, 0.06);
        const arriere = cheminLisse(SEMELLE_POINTS.filter(([, y]) => y > 186).map(([x, y]) => ap(m, x, y)), false, 0.06);
        return `<clipPath id="${clipO}"><path d="${tf(SEMELLE, m)}"></path></clipPath><path class="trait peau" d="${tf(SEMELLE, m)}"></path><g clip-path="url(#${clipO})">${niveaux(m, R, 'var(--trait-normal)')}</g>` +
          `<path class="trait peau" d="${empeigne}"></path>${R ? '' : `<path class="zone" d="${empeigne}"></path>`}<path class="trait" d="${arriere}" stroke-width="var(--trait-marque)"></path><path class="trait trait--moyen" d="${empeigne}"></path>`;
      };
      return unite(piece(true, 44, -8), 0) + unite(piece(false, 76, 8), 1);
    }
    case 'diabete-chaussure':
      return `${sol(84)}${chaussure(10, 84, 100, R)}`;
    case 'diabete-bilan': {
      // Planchette à pince et fiche : la semelle en courbes de niveau (relief) et trois cases cochées ; aucune lettre, aucun chiffre
      const k = 0.28, m: Affine = [k, 0, 0, k, 26, 14];
      const cases = [30, 46, 62].map((y) => `<path class="trait trait--moyen" d="M66 ${y - 4} H74 V${y + 4} H66 Z"></path><path class="coche" d="M67.6 ${y + 0.4} L69.8 ${y + 2.6} L75.6 ${y - 4.4}"></path><path class="fin" d="M79 ${y} H96"></path>`).join('');
      return `${sol(88)}<path class="trait peau" d="M20 8 H102 Q106 8 106 12 V82 Q106 86 102 86 H20 Q16 86 16 82 V12 Q16 8 20 8 Z"></path><path class="trait peau" d="M22 12 H100 V80 H22 Z"></path><path class="trait peau" d="M48 4 H74 Q77 4 77 7 V12 Q77 14 75 14 H47 Q45 14 45 12 V7 Q45 4 48 4 Z"></path>${semelle(m, R, 'var(--trait-normal)')}${cases}${marques(R, 66, 74, 3, 5)}`;
    }
    case 'diabete-toilette': {
      // Bassine d'eau (coupe légère), thermomètre de bain posé dans l'eau, serviette pliée à côté
      const bassine = 'M8 52 L14 78 Q15 82 20 82 H64 Q69 82 70 78 L76 52';
      const eau = 'M12 60 q4 -2 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0';
      const thermo = 'M50 30 Q50 26 53 26 Q56 26 56 30 V58 Q58.6 60 58.6 63 Q58.6 67.6 53 67.6 Q47.4 67.6 47.4 63 Q47.4 60 50 58 Z';
      return `${sol(84)}<path class="trait peau" d="${bassine}"></path>${R ? '' : `<path class="zone" d="${eau} L71.6 60 L70 76 Q69 80 64 80 H20 Q15 80 14 76 L12.4 60 Z"></path>`}<path class="eau" d="${eau}"></path><path class="trait" d="M5 52 H79"></path>` +
        `<path class="trait peau" d="${thermo}"></path>${R ? `<path d="M53 62 V40" stroke="var(--d-froid)" stroke-width="var(--trait-marque)"></path><circle cx="53" cy="63" r="2.6" fill="var(--d-froid)" stroke="none"></circle>` : '<path class="zone zone--forte" d="M51.4 63 V40 H54.6 V63 Z"></path><circle class="zone zone--forte" cx="53" cy="63" r="3"></circle>'}<path class="fin" d="M56 34 H58 M56 40 H58 M56 46 H58"></path>` +
        `<path class="trait peau" d="M80 84 V70 Q80 66 84 66 H110 Q114 66 114 70 V84 Z"></path><path class="trait peau" d="M80 70 Q80 62 86 62 H108 Q114 62 114 68"></path><path class="fin" d="M80 75 H114 M80 79.6 H114"></path>${marques(R, 90, 82.4, 3, 5)}`;
    }
  }
  return '';
}

/** Illustration de carte (<svg>, repère 120 × 90), décorative ; `id` préfixe les identifiants internes */
export function svgDessinDiabete(nom: DessinDiabete, opts: { registre?: Registre; id?: string; classe?: string } = {}): string {
  const registre = opts.registre === 'pedagogique' ? 'pedagogique' : 'releve';
  const id = opts.id ?? `dd-${nom}-${registre[0]}`;
  const classes = ['dessin', 'dessin--materiel', `dessin--${nom}`, `dessin--${registre}`, opts.classe].filter(Boolean).join(' ');
  return `<svg class="${echapper(classes)}" viewBox="0 0 120 90" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${corpsDessin(nom, registre === 'releve', id)}</svg>`;
}

// ———————————————————————————————————————————————————— Héros (repère 240 × 180, habillés par heros-themes.ts)

function corpsHeros(nom: HerosDiabete, R: boolean, id: string): string {
  switch (nom) {
    case 'diabete-nature-morte':
      // Le quotidien qui protège les pieds, en un seul groupe posé sur le sol : la chaussure fermée, une chaussette rentrée dans
      // son ouverture (bord côte qui dépasse), le pot de crème devant la pointe ; ombre douce commune. Aucun instrument.
      return `<line class="sol" x1="10" y1="152" x2="230" y2="152"></line><ellipse cx="128" cy="152" rx="96" ry="4" fill="currentColor" fill-opacity="0.08" stroke="none"></ellipse>` +
        `${chausseteDansChaussure(30, 150, 170, R)}${pot(192, 154, 22, R)}`;
    case 'diabete-sensibilite': {
      // Les deux semelles, voûtes face à face, en courbes de niveau ; trois points doux par plante (pulpe de l'hallux, têtes de M1
      // et de M5) : sites de l'examen de la sensibilité. Points pleins et halo flou : jamais d'anneau (pas de « cible »).
      const k = 0.7, y0 = 13;
      const droite: Affine = [k, 0, 0, k, 124, y0], gauche: Affine = [-k, 0, 0, k, 116, y0];
      const points = [gauche, droite].flatMap((m) => SITES_MONOFILAMENT.map(([x, y]) => ap(m, x, y)));
      return `<defs><radialGradient id="${id}-h"><stop offset="0" stop-color="var(--d-accent)" stop-opacity="0.55"></stop><stop offset="1" stop-color="var(--d-accent)" stop-opacity="0"></stop></radialGradient></defs>` +
        `${semelle(gauche, R)}${semelle(droite, R)}${points.map(([x, y], i) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="9" fill="url(#${id}-h)" stroke="none"></circle><circle cx="${r1(x)}" cy="${r1(y)}" r="3.4" fill="${R ? COULEURS_DIABETE[i % 3] : 'var(--d-accent)'}" stroke="var(--d-fond)" stroke-width="var(--trait-fin)"></circle>`).join('')}`;
    }
    case 'diabete-miroir': {
      // Miroir posé au sol, PENCHÉ (retour de Paul du 2026-10-08 sur l'auto-examen : « il faudrait qu'il soit penché ») : cadre ovale
      // basculé vers l'arrière (raccourci en hauteur) et incliné, épaisseur du cadre visible, béquille qui le retient, patin au sol ;
      // la plante du pied droit (vue de dessous, géométrie validée) se reflète dans la glace, suivant la même pose.
      const sol0 = 160, cx = 112, bas = 154, H = 150, W = 46, a = (14 * Math.PI) / 180;
      // (u, v) : u ∈ [-1, 1] en largeur, v ∈ [0, 1] du bas au haut de l'ovale ; raccourci 0,86, puis rotation autour du patin
      const pers = (u: number, v: number, dx = 0, dy = 0): P => {
        const x = u * W * (1 - 0.08 * v), y = -v * H * 0.86;
        return [cx + x * Math.cos(a) - y * Math.sin(a) + dx, bas + x * Math.sin(a) + y * Math.cos(a) + dy];
      };
      const ovale = (k: number, dx = 0, dy = 0, n = 72): P[] => Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2; return pers(k * Math.cos(t), 0.5 + 0.5 * k * Math.sin(t), dx, dy); });
      const dos = cheminLisse(ovale(1, 5, 2.5), true, 0.04), cadre = cheminLisse(ovale(1), true, 0.04), glace = cheminLisse(ovale(0.86), true, 0.04);
      const [hx, hy] = pers(0.2, 0.86, 5, 2.5);
      const bequille = `M${r1(hx)} ${r1(hy)} L${r1(cx + 74)} ${sol0}`;
      // Plante dans la glace : repère du pied (92 × 222) → (u, v) de l'ovale (vue de dessous : miroir en x)
      const f = (x: number, y: number): P => pers(((92 - x) - 46) / 46 * 0.5, 0.5 + ((111 - y) / 222) * 0.8);
      const reflet = R
        ? `<path class="pointille" d="${dense(CONTOUR_PIED.plantaire.trait, f)}"></path>`
        : `<g class="peau-douce">${CONTOUR_PIED.plantaire.peaux.map((p) => `<path class="peau-seule" d="${dense(p, f)}"></path>`).join('')}<path class="fin fin--leger" d="${dense(CONTOUR_PIED.plantaire.plis, f)}"></path><path class="trait" d="${dense(CONTOUR_PIED.plantaire.trait, f)}"></path></g>`;
      const [ax, ay] = pers(0.42, 0.84), [bx, by] = pers(0.74, 0.62);
      const eclat = `M${r1(ax)} ${r1(ay)} Q${r1((ax + bx) / 2 + 5)} ${r1((ay + by) / 2 - 3)} ${r1(bx)} ${r1(by)}`;
      const [px, py] = pers(0, 0);
      return `<line class="sol" x1="24" y1="${sol0}" x2="216" y2="${sol0}"></line><ellipse cx="${cx + 26}" cy="${sol0}" rx="66" ry="4" fill="currentColor" fill-opacity="0.08" stroke="none"></ellipse>` +
        `<path class="trait trait--moyen" d="${bequille}"></path><path class="peau-seule" d="${dos}"></path><path class="piece-coque" d="${dos}"></path><path class="trait trait--moyen" d="${dos}"></path>` +
        `<path class="trait peau" d="M${r1(px - 22)} ${sol0} Q${r1(px - 22)} ${r1(py - 3)} ${r1(px - 14)} ${r1(py - 3)} H${r1(px + 14)} Q${r1(px + 22)} ${r1(py - 3)} ${r1(px + 22)} ${sol0} Z"></path>` +
        `<path class="peau-seule" d="${cadre}"></path><path class="piece piece--forte" d="${cadre}"></path><path class="peau-seule" d="${glace}"></path><path class="${R ? 'miroir' : 'piece'}" d="${glace}"></path>` +
        `<clipPath id="${id}-g"><path d="${glace}"></path></clipPath><g clip-path="url(#${id}-g)">${reflet}</g><path class="trait" d="${cadre}"></path><path class="trait trait--fin" d="${glace}"></path><path class="fin" d="${eclat}"></path>` +
        (R ? COULEURS_DIABETE.map((c, i) => `<path d="M${r1(px - 8 + i * 6)} ${r1(sol0 - 3)} h3.4" stroke="${c}" stroke-width="var(--trait-marque)"></path>`).join('') : '');
    }
  }
  return '';
}

/** Cadrage 4:3 serré de chaque héros dans le repère 240 × 180 (le sujet remplit le premier écran) */
const VUES_HEROS: Record<HerosDiabete, string> = { 'diabete-nature-morte': '8 30 224 168', 'diabete-sensibilite': '12 4 216 162', 'diabete-miroir': '20 10 200 150' };

/** Dessin du héros seul (<svg>, repère 240 × 180), décoratif ; sert à l'inventaire et aux planches */
export function svgDessinHerosDiabete(nom: HerosDiabete, opts: { registre?: Registre; id?: string; classe?: string } = {}): string {
  const registre = opts.registre === 'pedagogique' ? 'pedagogique' : 'releve';
  const id = opts.id ?? `hd-${nom}-${registre[0]}`;
  const classes = ['dessin', `dessin--${nom}`, `dessin--${registre}`, opts.classe].filter(Boolean).join(' ');
  return `<svg class="${echapper(classes)}" viewBox="${VUES_HEROS[nom]}" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${corpsHeros(nom, registre === 'releve', id)}</svg>`;
}

/**
 * Héros du premier écran (<svg> au format paysage 640 × 360 ou portrait 360 × 480), habillé comme les héros des thèmes : fond plan
 * quadrillé en relevé, aplat doux en pédagogique, couleurs de la gamme. Sujet dans le <title> (jamais affiché).
 */
export function herosDiabete(nom: HerosDiabete, o: { format?: FormatHeros; registre?: Registre; gamme?: string | null; id?: string; classe?: string; sansFond?: SansFond | null } = {}): string {
  const registre = o.registre === 'pedagogique' ? 'pedagogique' : 'releve';
  const format = o.format ?? 'paysage';
  const id = o.id ?? `hd-${nom}-${format[0]}-${registre[0]}`;
  return habillerHeros(svgDessinHerosDiabete(nom, { registre, id: `${id}-d` }), { format, registre, gamme: o.gamme, titre: FICHES_UNIVERS_DIABETE[nom].libelle, classe: ['heros-theme--diabete', `heros-theme--${nom}`, o.classe].filter(Boolean).join(' '), sansFond: o.sansFond ?? null, id });
}

/** Clé d'inventaire d'un héros diabète → (nom, registre) ; null pour une autre clé */
export function lireCleHerosDiabete(cle: string | null | undefined): { nom: HerosDiabete; registre: 'releve' | 'pedagogique' } | null {
  const m = /^heros:(diabete-[a-z-]+):(releve|pedagogique)$/.exec(cle ?? '');
  return m && estHerosDiabete(m[1]) ? { nom: m[1], registre: m[2] as 'releve' | 'pedagogique' } : null;
}
