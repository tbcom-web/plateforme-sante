// IMAGES FIXES des « animations du pied » (entete-pied.ts, commit 5f9b9ca : « juste WOW », Paul, 2026-10-09). Les animations
// vivent dans le premier écran ; leurs versions FIXES servent d'illustrations de thème et de fiches, dans la grammaire des dessins
// notés 4-5 ★ (dessins.ts : classes trait, peau, fin, zone, cote… de dessins.css ; registres relevé et pédagogique) :
//  - « trail-montagne » (repère 240 × 180) : la carte de montagne de pi-trail-montagne — courbes de niveau, crête, sentier en
//    lacets, pas le long du sentier (petites silhouettes du pied validé), sommet ; kit « Sport · trail / randonnée » (#trail
//    #randonnee) ;
//  - « chronometre » (repère 120 × 90, GRAMMAIRE DU MATÉRIEL : corpsEquipement) : le chronomètre de pi-chrono, cadran gradué SANS
//    chiffre, aiguille arrêtée, petit compteur, traits de vitesse ; rattaché au sport ;
//  - « talon-douloureux » (repère 240 × 180, pédagogique) : l'image finale de pi-talon — la silhouette validée du pied en aplat doux
//    et UN seul halo abricot autour du talon (jamais rouge, jamais une cible : un cercle, aucun anneau concentrique, aucune croix) ;
//    fiche « douleur au talon » (talalgie, #douleur-talon).
//
// AUCUN DESSIN NOUVEAU : toutes les géométries viennent de entete-pied-geo.ts (dérivé des géométries validées par
// entete-pied-derive.ts) ou des tracés de l'animation (chronomètre), mis à l'échelle. Aucun chiffre, aucun texte, aucune couleur
// littérale, aucun <style> ; identifiants préfixés. Tous BROUILLONS : « À revoir » dans /admin/illustrations, « Nouveau » dans
// « Donner mon avis » ; seul Paul les valide (images-fixes-pied.test.ts).
import { GEO_PIED as G } from './entete-pied-geo';
import type { AnimationPied } from './entete-pied';

// ———————————————————————————————————————————————————— Fiches

export const IMAGES_FIXES_PIED = ['trail-montagne', 'chronometre', 'talon-douloureux'] as const;
export type ImageFixePied = (typeof IMAGES_FIXES_PIED)[number];
export const estImageFixePied = (x: unknown): x is ImageFixePied => typeof x === 'string' && (IMAGES_FIXES_PIED as readonly string[]).includes(x);

export type RegistreFixe = 'releve' | 'pedagogique';

export interface FicheImageFixe {
  libelle: string;
  /** Ce que montre l'image (le regard du pédicure-podologue) */
  regard: string;
  /** Animation d'origine (entete-pied.ts) dont l'image reprend la géométrie */
  animation: AnimationPied;
  registres: readonly RegistreFixe[];
  /** Repère : 240 × 180 (dessins) ou 120 × 90 (grammaire du matériel) */
  repere: '240x180' | '120x90';
  /** Sujets des visuels par défaut (sujets-visuels.ts) */
  sujets: readonly string[];
  /** Hashtags par défaut (FORME_HASHTAG) : sujet, activités, soin (#<slug>) */
  hashtags: readonly string[];
}

export const FICHES_IMAGES_FIXES: Readonly<Record<ImageFixePied, FicheImageFixe>> = {
  'trail-montagne': {
    libelle: 'Montagne : sentier de trail et de randonnée',
    regard: 'Une carte en courbes de niveau : deux sommets reliés par une crête, le sentier en lacets jusqu’au sommet et les pas le long du sentier ; aucune valeur, aucun personnage',
    animation: 'pi-trail-montagne', registres: ['releve', 'pedagogique'], repere: '240x180',
    sujets: ['sport'], hashtags: ['sport', 'trail', 'randonnee', 'montagne', 'sentier'],
  },
  chronometre: {
    libelle: 'Chronomètre de sport',
    regard: 'Un chronomètre à cadran gradué sans chiffre, l’aiguille arrêtée, le petit compteur et des traits de vitesse : l’entraînement, sans aucun temps affiché',
    animation: 'pi-chrono', registres: ['releve', 'pedagogique'], repere: '120x90',
    sujets: ['sport'], hashtags: ['sport', 'chronometre', 'entrainement', 'materiel'],
  },
  'talon-douloureux': {
    libelle: 'Douleur au talon',
    regard: 'Le pied en aplat doux et un seul halo abricot autour du talon : là où se situe la douleur (talalgie), sans cible ni rouge',
    animation: 'pi-talon', registres: ['pedagogique'], repere: '240x180',
    sujets: ['semelles', 'sport', 'senior'], hashtags: ['talon', 'douleur-talon', 'talalgie', 'semelles'],
  },
};

/** Clés d'inventaire (`dessin:<id>:<registre>`, base `dessin:<id>`) */
export const CLES_IMAGES_FIXES: readonly string[] = IMAGES_FIXES_PIED.flatMap((n) => FICHES_IMAGES_FIXES[n].registres.map((r) => `dessin:${n}:${r}`));

/** Hashtags par défaut des images fixes (kits.ts, HASHTAGS_PAR_DEFAUT) */
export const HASHTAGS_IMAGES_FIXES: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  IMAGES_FIXES_PIED.flatMap((n) => FICHES_IMAGES_FIXES[n].registres.map((r) => [`dessin:${n}:${r}`, [...new Set(FICHES_IMAGES_FIXES[n].hashtags)].sort()] as const)),
);

// ———————————————————————————————————————————————————— Outils

const r1 = (v: number) => Math.round(v * 10) / 10;
const echapper = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
/**
 * Pose un tracé de entete-pied-geo.ts (commandes M, C absolues ; q, t, z relatives) par une échelle (sx, sy) et une translation :
 * les coordonnées sont recalculées (le trait garde la graisse de la charte, aucune transformation SVG).
 */
export function poserChemin(d: string, sx: number, sy: number, ox: number, oy: number): string {
  let out = '';
  for (const [, c, args] of d.matchAll(/([a-zA-Z])([^a-zA-Z]*)/g)) {
    const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    const abs = c !== 'z' && c !== 'Z' && c === c.toUpperCase();
    out += c + n.map((v, i) => r1(i % 2 ? v * sy + (abs ? oy : 0) : v * sx + (abs ? ox : 0))).join(' ');
  }
  return out;
}

// ———————————————————————————————————————————————————— Montagne (trail, randonnée)

/** Scène 300 × 240 de l'animation → repère 240 × 180 (échelle 0,75, centrée) ; courbes de niveau en × 4 */
const M_ECH = 0.75, M_X = 7.5, M_Y = 0;
const scene = (d: string) => poserChemin(d, M_ECH, M_ECH, M_X, M_Y);
const scene4 = (d: string) => poserChemin(d, M_ECH / 4, M_ECH / 4, M_X, M_Y);
/** Teintes hypsométriques du relevé (palette de l'univers, du pied du relief vers le sommet) */
const TEINTES = ['var(--d-bas)', 'var(--d-froid)', 'var(--d-doux)', 'var(--d-haut)', 'var(--d-chaud)'];
/** Silhouette validée du pied (× 4) réduite à un PAS : longueur ≈ 6 unités du repère */
const E_PAS = 0.0072;

function corpsMontagne(R: boolean, id: string): string {
  const niveaux = G.montagne.niveaux.map((n) => ({ k: n.k, d: scene4(n.d) }));
  const sentier = scene(G.montagne.sentier), crete = scene4(G.montagne.crete);
  // Pas : silhouette du pied (gauche en miroir), orientée dans le sens de la marche, centrée sur le point du sentier
  const pas = G.montagne.pas.map(([x, y, a], i) => {
    const gauche = i % 2 === 0, [px, py] = [x * M_ECH + M_X, y * M_ECH + M_Y];
    return `<use href="#${id}-pas" transform="translate(${r1(px)} ${r1(py)})rotate(${a})scale(${gauche ? -E_PAS : E_PAS} ${E_PAS})translate(-184 -444)"></use>`;
  }).join('');
  // Sommet (repère du sommet de l'animation : triangle sur le point le plus haut)
  const sommet = scene('M176 57l8 13h-16z');
  const grille = R ? `<g class="grille">${[30, 60, 90, 120, 150].map((y) => `<line x1="12" x2="228" y1="${y}" y2="${y}"></line>`).join('')}</g>` : '';
  const courbes = niveaux.map(({ k, d }) => R
    ? `<path class="niveau-montagne" style="--k:${k}" d="${d}" stroke="${TEINTES[k]}" fill="${TEINTES[k]}"></path>`
    : `<path class="niveau-montagne" style="--k:${k}" d="${d}"></path>`).join('');
  const aplats = R ? '' : `<path class="peau-seule" d="${niveaux[0].d}"></path><path class="zone" d="${niveaux[3].d}"></path><path class="zone zone--forte" d="${niveaux[4].d}"></path>`;
  return `<defs><path id="${id}-pas" d="${G.adulte}"></path></defs>${grille}${aplats}${courbes}<path class="${R ? 'pointille' : 'tiret-fin'}" d="${crete}"></path>` +
    `<path class="${R ? 'trait--moyen' : 'filament'}" d="${sentier}"></path><g class="${R ? 'pas-trace' : 'pas-trace pas-trace--pedago'}">${pas}</g>` +
    `<path class="sommet${R ? ' sommet--releve' : ''}" d="${sommet}"></path>`;
}

// ———————————————————————————————————————————————————— Chronomètre (grammaire du matériel, repère 120 × 90)

/** Scène de pi-chrono (boîtier de rayon 76 centré en 158 ; 130) → repère 120 × 90 (rayon 29 centré en 64 ; 46) */
const C0 = { x: 158, y: 130 }, C = { x: 64, y: 46, k: 29 / 76 };
const ch = (x: number, y: number): [number, number] => [r1(C.x + (x - C0.x) * C.k), r1(C.y + (y - C0.y) * C.k)];
const polaire = (r: number, deg: number, cx = C.x, cy = C.y): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [r1(cx + r * Math.sin(a)), r1(cy - r * Math.cos(a))];
};
/** Angle de l'aiguille arrêtée (celui de l'image finale de l'animation) */
export const ANGLE_AIGUILLE = 48;

function corpsChrono(R: boolean): string {
  const k = C.k;
  // Couronne (bouton et tige) en haut, poussoir à 42° : tracés de l'animation, mis à l'échelle
  const [bx, by] = ch(148, 34), [tx, ty] = ch(152, 44);
  const bouton = `M${bx} ${by}h${r1(20 * k)}a${r1(5 * k)} ${r1(5 * k)} 0 0 1 0 ${r1(10 * k)}h${r1(-20 * k)}a${r1(5 * k)} ${r1(5 * k)} 0 0 1 0 ${r1(-10 * k)}z`;
  const tige = `M${tx} ${ty}h${r1(12 * k)}v${r1(10 * k + 0.6)}h${r1(-12 * k)}z`;
  const R0 = 76 * k, Rc = 64 * k;
  const graduations = Array.from({ length: 60 }, (_, i) => {
    const majeure = i % 5 === 0, [x1, y1] = polaire(majeure ? Rc - 5.6 : Rc - 3.2, i * 6), [x2, y2] = polaire(Rc - 1.6, i * 6);
    return { majeure, d: `M${x1} ${y1}L${x2} ${y2}` };
  });
  const mineures = graduations.filter((g) => !g.majeure).map((g) => g.d).join(''), majeures = graduations.filter((g) => g.majeure).map((g) => g.d).join('');
  // Temps écoulé : secteur du haut du cadran jusqu'à l'aiguille (relevé : quatre tranches de la palette ; pédagogique : zone d'accent)
  const rs = Rc - 7.4;
  const secteur = (a0: number, a1: number) => { const [x0, y0] = polaire(rs, a0), [x1, y1] = polaire(rs, a1); return `M${C.x} ${C.y}L${x0} ${y0}A${r1(rs)} ${r1(rs)} 0 0 1 ${x1} ${y1}Z`; };
  const ecoule = R
    ? ['var(--d-bas)', 'var(--d-froid)', 'var(--d-doux)', 'var(--d-haut)'].map((c, i) => `<path d="${secteur((i * ANGLE_AIGUILLE) / 4, ((i + 1) * ANGLE_AIGUILLE) / 4)}" fill="${c}" fill-opacity="0.32" stroke="none"></path>`).join('')
    : `<path class="zone zone--forte" d="${secteur(0, ANGLE_AIGUILLE)}"></path>`;
  // Aiguille (queue de 12, longueur 54 de la scène), petit compteur (centre 158 ; 160, rayon 13) et son aiguille à 130°
  const [ax1, ay1] = polaire(-12 * k, ANGLE_AIGUILLE), [ax2, ay2] = polaire(54 * k, ANGLE_AIGUILLE);
  const [sx, sy] = ch(158, 160), [px, py] = polaire(10 * k, 130, sx, sy);
  // Traits de vitesse (à gauche, comme dans l'animation)
  const vitesse = [[24, 104, 70], [10, 128, 70], [32, 152, 70]].map(([x1, y, x2]) => { const [a, b] = ch(x1, y), [c] = ch(x2, y); return `M${a} ${b}H${c}`; }).join('');
  return `<path class="trait--leger" d="${vitesse}"></path>` +
    `<path class="trait peau" d="${tige}"></path><path class="trait peau" d="${tige}" transform="rotate(42 ${C.x} ${C.y})"></path><path class="trait peau" d="${bouton}"></path>` +
    `<circle class="trait peau" cx="${C.x}" cy="${C.y}" r="${r1(R0)}"></circle><circle class="fin" cx="${C.x}" cy="${C.y}" r="${r1(Rc)}"></circle>${ecoule}` +
    `<path class="fin" d="${mineures}"></path><path class="trait--moyen" d="${majeures}"></path>` +
    `<circle class="fin" cx="${sx}" cy="${sy}" r="${r1(13 * k)}"></circle><path class="trait--fin" d="M${sx} ${sy}L${px} ${py}"></path>` +
    `<path class="${R ? 'aiguille aiguille--releve' : 'aiguille'}" d="M${ax1} ${ay1}L${ax2} ${ay2}"></path><circle class="canne-embout" cx="${C.x}" cy="${C.y}" r="1.9"></circle>`;
}

// ———————————————————————————————————————————————————— Talon douloureux (aplat doux, un seul halo abricot)

/** Pose du pied de pi-talon (scène 300 × 240 : translate(103 8) scale(.252)) ramenée au repère 240 × 180, centrée */
const T_ECH = 0.252 * 0.75, T_X = 120 - 184 * T_ECH, T_Y = 6;
/** Halo : centre du talon de la trame de pression (48 ; 198 du repère du pied, × 4 = 192 ; 786), rayon de l'animation */
export const HALO_TALON = { cx: r1(T_X + 192 * T_ECH), cy: r1(T_Y + 786 * T_ECH), r: r1(116 * T_ECH) };

function corpsTalon(id: string): string {
  const pied = poserChemin(G.adulte, T_ECH, T_ECH, T_X, T_Y);
  const { cx, cy, r } = HALO_TALON;
  return `<defs><radialGradient id="${id}-halo"><stop offset="0" class="halo-abricot-stop" stop-opacity="0.6"></stop><stop offset="0.7" class="halo-abricot-stop" stop-opacity="0.46"></stop><stop offset="1" class="halo-abricot-stop" stop-opacity="0.34"></stop></radialGradient></defs>` +
    `<path class="aplat-doux" d="${pied}"></path><circle class="halo-abricot" cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}-halo)"></circle>`;
}

// ———————————————————————————————————————————————————— Rendu

/** Image fixe (<svg>), décorative (aria-hidden) ; `id` préfixe les identifiants ; registre absent ou non livré → le premier livré */
export function svgImageFixe(nom: ImageFixePied, opts: { registre?: RegistreFixe; id?: string; classe?: string } = {}): string {
  const f = FICHES_IMAGES_FIXES[nom];
  const registre = opts.registre && f.registres.includes(opts.registre) ? opts.registre : f.registres[f.registres.length - 1];
  const R = registre === 'releve';
  const id = opts.id ?? `if-${nom}-${registre[0]}`;
  const vue = f.repere === '120x90' ? '0 0 120 90' : '0 0 240 180';
  const classes = ['dessin', f.repere === '120x90' ? 'dessin--materiel' : '', `dessin--${nom}`, `dessin--${registre}`, opts.classe].filter(Boolean).join(' ');
  const corps = nom === 'trail-montagne' ? corpsMontagne(R, id) : nom === 'chronometre' ? corpsChrono(R) : corpsTalon(id);
  return `<svg class="${echapper(classes)}" viewBox="${vue}" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${corps}</svg>`;
}
