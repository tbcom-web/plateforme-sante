// Pictogrammes : DIRECTION D « icônes illustrées » à l'essai (2026-10-08, brouillons « À revoir », rien de branché sur les sites).
//
// Source : planche 5 « Patients et domaines de pratique » générée par Paul avec ChatGPT (image générée par IA, propriété de Paul,
// 2026-10-08). Demande de Paul : « des icônes SVG / HTML coloriables à partir de cette série… Ne prends rien qui soit douteux
// anatomiquement, mais améliore si besoin. » Chaque case est vectorisée en aplats (icones-illustrees-traces.ts, fichier généré) et
// chaque aplat est rattaché à un RÔLE de couleur : les couleurs viennent de la gamme (couleursIconesIllustrees), jamais de l'image.
//
// Mini-illustrations rondes : aplats doux sur une tache de fond normalisée (la même pour toutes), accent + accent clair + accent
// chaud, encre pour les traits foncés, peau neutre constante (ANATOMIE.peau, la même dans toutes les gammes : inclusive, jamais
// teintée par la gamme). Usage : cartes de thèmes et de soins, en-têtes, ≥ 64 px (64, 96, 128). JAMAIS en 24 px : en dessous de
// 64 px, les détails (lacets, crampons, nervures) deviennent du bruit ; pour 20–48 px, la direction A, B ou C (pictos-directions.ts).
//
// Anatomie (règle de Paul) : chaque case passée à la loupe. Retenues telles quelles : rien d'anatomique douteux (chaussures, jambes
// vêtues, pointes). Améliorées : le pied douteux est REMPLACÉ par la géométrie validée d'ÉcranZen (pied.ts : profil médial
// POD-AT-0003, plante POD-AT-0001), dans le même style d'aplats. Écartées : voir ICONES_ILLUSTREES_ECARTEES (raison écrite).
//
// Clés d'inventaire : `picto:<id>@direction-d` (bases à part entière, sans héritage : bases-illustrations.ts) et
// `picto:style-icones-d` (tuile « Style d'icônes » : la planche D en situation). Couleurs : variables CSS `--ic-<rôle>` (posées par
// variablesIconesIllustrees sur le conteneur, ou inlinées avec l'option `gamme`) ; aucune couleur littérale dans les tracés.
import { OUTILS_PICTOS as O } from './pictos';
import { piedDeProfil, couperSous, deformerChemin, PLANTE, CONTOUR_PIED, type P } from './pied';
import { TRACES_ICONES_ILLUSTREES } from './icones-illustrees-traces';
import { ANATOMIE, NEUTRES } from './charte';
import { contraste, melanger, rvb } from './couleurs';
import { gamme as gammeParId, type Gamme } from './gammes';

// ———————————————————————————————————————————————————— Rôles de couleur

/** Rôles de couleur, dans l'ordre de peinture (clair → foncé) */
export const ROLES_ICONES = ['fond', 'blanc', 'peau', 'peau-ombre', 'accent-clair', 'neutre', 'accent-chaud', 'accent', 'encre'] as const;
export type RoleIcone = (typeof ROLES_ICONES)[number];
/** Formes qui portent le sens : contrastées à ≥ 3:1 contre le fond (WCAG 1.4.11, composants graphiques) */
export const ROLES_SIGNIFIANTS: readonly RoleIcone[] = ['accent', 'accent-chaud', 'encre', 'neutre'];
export const CONTRASTE_ICONES = 3;
/** Peau constante (toutes gammes) : teintes anatomiques validées d'ÉcranZen (ANATOMIE) */
export const PEAU_ICONES = { peau: ANATOMIE.peau, ombre: ANATOMIE.peauOmbre } as const;
/** Accent chaud par défaut (corail orangé, teinte ≈ 19°) : jamais rouge (diabète, R6.2 du goût de Paul) */
const CORAIL = '#E98B5F';
/** Teinte (degrés) d'une couleur */
export function teinte(h: string): number {
  const [r, g, b] = rvb(h).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 0;
  const t = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (t * 60 + 360) % 360;
}
/** Accent chaud : orangé ou abricot (teinte 15° à 50°), jamais rouge ni rose */
export const estChaudNonRouge = (h: string) => { const t = teinte(h); return t >= 15 && t <= 50; };

/** Fonce `c` (mélange vers `vers`) jusqu'à ≥ 3:1 contre `fond` */
function assurer(c: string, fond: string, vers: string): string {
  let x = c;
  for (let t = 0.08; contraste(x, fond) < CONTRASTE_ICONES && t <= 1; t += 0.08) x = melanger(c, vers, t);
  return x;
}

/**
 * Couleurs des rôles pour une gamme. Fond : accent très pâle (tache) ; accent : celui de la gamme ; accent clair : accent éclairci ;
 * accent chaud : le duo de la gamme s'il est orangé (abricot), sinon un corail orangé — jamais rouge ; encre ; neutre (gris des
 * chaussures) ; blanc ; peau et ombre de peau constantes. Formes signifiantes foncées jusqu'à ≥ 3:1 contre le fond.
 */
export function couleursIconesIllustrees(g: Gamme): Record<RoleIcone, string> {
  const fond = melanger(g.accent, NEUTRES.blanc, 0.9);
  const encreG = g.encre ?? NEUTRES.encre;
  const chaud = g.duo && estChaudNonRouge(g.duo) ? g.duo : CORAIL;
  return {
    fond,
    blanc: NEUTRES.blanc,
    peau: PEAU_ICONES.peau,
    'peau-ombre': PEAU_ICONES.ombre,
    'accent-clair': melanger(g.accent, NEUTRES.blanc, 0.55),
    neutre: assurer(melanger(encreG, NEUTRES.blanc, 0.5), fond, encreG),
    'accent-chaud': assurer(chaud, fond, '#5a2a12'),
    accent: assurer(g.accent, fond, encreG),
    encre: assurer(encreG, fond, '#000000'),
  };
}

/** Variables CSS à poser sur le conteneur (`--ic-<rôle>`) */
export function variablesIconesIllustrees(g: Gamme): Record<string, string> {
  const c = couleursIconesIllustrees(g);
  return Object.fromEntries(ROLES_ICONES.map((r) => [`--ic-${r}`, c[r]]));
}
const v = (r: RoleIcone) => `var(--ic-${r})`;

// ———————————————————————————————————————————————————— Fiches, sources, écartées

export const ICONES_ILLUSTREES_IDS = ['sport', 'seniors', 'pied-diabetique', 'travail', 'soins-domicile', 'randonnee', 'danse', 'troubles-marche', 'prevention-chutes', 'enfant-sportif'] as const;
export type IdIconeIllustree = (typeof ICONES_ILLUSTREES_IDS)[number];

export const cleIconeIllustree = (id: string) => `picto:${id}@direction-d`;
export const CLE_STYLE_ICONES_D = 'picto:style-icones-d';
const CLE_D = /^picto:([a-z0-9-]+)@direction-d$/;
export function lireCleIconeIllustree(cle: string): IdIconeIllustree | null {
  const m = CLE_D.exec(cle);
  return m && (ICONES_ILLUSTREES_IDS as readonly string[]).includes(m[1]) ? (m[1] as IdIconeIllustree) : null;
}

export type FicheIconeIllustree = {
  id: IdIconeIllustree;
  /** Numéro de la case sur la planche 5 */
  numero: number;
  titre: string;
  /** « vectorisée » : la case telle quelle ; « améliorée » : pied remplacé par la géométrie validée (pied.ts) */
  traitement: 'vectorisee' | 'amelioree';
  /** Revue anatomique de la case */
  anatomie: string;
  /** Sujets suggérés (sujets des visuels) et hashtags suggérés : PROPOSITIONS, rien n'est rattaché d'office (aucun kit, aucun site) */
  sujets: readonly string[];
  hashtags: readonly string[];
};

export const FICHES_ICONES_ILLUSTREES: Readonly<Record<IdIconeIllustree, FicheIconeIllustree>> = {
  sport: { id: 'sport', numero: 1, titre: 'Podologie du sport', traitement: 'vectorisee', anatomie: 'Chaussure de course et jambe vêtue d’une chaussette : rien d’anatomique à vérifier.', sujets: ['sport'], hashtags: ['course', 'running', 'chaussure-de-sport'] },
  seniors: { id: 'seniors', numero: 3, titre: 'Podologie des seniors', traitement: 'vectorisee', anatomie: 'Pantalon, chaussures fermées, canne à embout au sol en avant et en dehors du pied : juste. Pantalon recoloré en accent clair.', sujets: ['senior'], hashtags: ['senior', 'canne', 'marche'] },
  'pied-diabetique': { id: 'pied-diabetique', numero: 4, titre: 'Pied diabétique', traitement: 'amelioree', anatomie: 'Source : talon bulbeux, malléole absente, petite lésion dans la loupe (sens inquiétant). Remplacé par le profil médial validé (POD-AT-0003, pied.ts) ; loupe d’examen sur l’avant-pied, sans lésion ; badge « + » ; aucun rouge.', sujets: ['diabete'], hashtags: ['pied-diabetique', 'diabete', 'prevention'] },
  travail: { id: 'travail', numero: 5, titre: 'Podologie du travail', traitement: 'vectorisee', anatomie: 'Chaussure de sécurité à crampons, pantalon de travail : rien d’anatomique à vérifier.', sujets: ['general'], hashtags: ['travail', 'chaussure-de-securite', 'station-debout'] },
  'soins-domicile': { id: 'soins-domicile', numero: 6, titre: 'Soins à domicile', traitement: 'amelioree', anatomie: 'Empreinte de la source à orteils en ronds (clipart, R2 du goût de Paul) : remplacée par la plante validée (POD-AT-0001, pied.ts), 5 orteils, formule égyptienne.', sujets: ['general', 'senior'], hashtags: ['domicile', 'visite-a-domicile'] },
  randonnee: { id: 'randonnee', numero: 7, titre: 'Podologie de la randonnée', traitement: 'vectorisee', anatomie: 'Chaussure de marche, montagnes, sapin : rien d’anatomique à vérifier.', sujets: ['sport'], hashtags: ['randonnee', 'trail', 'montagne'] },
  danse: { id: 'danse', numero: 8, titre: 'Podologie de la danse', traitement: 'vectorisee', anatomie: 'Deux pointes sur la plateforme, jambes croisées, rubans à la cheville : plausible. Pied avant recoloré en chausson (la source le confondait avec la peau) ; rubans simplifiés.', sujets: ['sport'], hashtags: ['danse', 'pointes', 'ballet'] },
  'troubles-marche': { id: 'troubles-marche', numero: 9, titre: 'Troubles de la marche', traitement: 'vectorisee', anatomie: 'Jambes de dos, semelle levée, traces de semelles (pas d’orteils dessinés) : juste. Pointillé de trajectoire retiré (bruit à 64 px).', sujets: ['general', 'senior'], hashtags: ['marche', 'analyse-de-la-marche', 'equilibre'] },
  'prevention-chutes': { id: 'prevention-chutes', numero: 10, titre: 'Prévention des chutes', traitement: 'amelioree', anatomie: 'Source : pied sur la pointe, orteils recroquevillés et confondus (2 visibles), posture qui évoque le déséquilibre. Remplacé par le profil médial validé posé à plat sur le tapis ; bouclier gardé.', sujets: ['senior'], hashtags: ['chutes', 'equilibre', 'senior'] },
  'enfant-sportif': { id: 'enfant-sportif', numero: 12, titre: 'Podologie de l’enfant sportif', traitement: 'vectorisee', anatomie: 'Basket et ballon, jambe vêtue : rien d’anatomique à vérifier.', sujets: ['enfant', 'sport'], hashtags: ['enfant', 'football', 'sport'] },
};

/** Cases de la planche écartées du commit, avec la raison (rien d'anatomie inventée non vérifiée) */
export const ICONES_ILLUSTREES_ECARTEES: readonly { numero: number; titre: string; raison: string }[] = [
  { numero: 2, titre: 'Podologie pédiatrique', raison: 'Orteils non dénombrables (pied avant : orteils fondus sous un seul ongle, pied arrière : 4 visibles) et jambes aux proportions d’adulte pour un sujet « enfant ». Pas d’équivalent validé de jambe d’enfant de profil dans pied.ts : écartée plutôt qu’inventée.' },
  { numero: 11, titre: 'Pied rhumatologique', raison: 'Squelette inventé (tarse en galets, métatarsiens sans têtes, phalanges confondues, fibula sans malléole latérale) et douleur en cible rouge (interdit : « douleur jamais en cible »). Le squelette validé (pied.ts, POD-AT-0008) est au trait, d’un autre registre : écartée.' },
];

/** Registre des sources des icônes illustrées (traçabilité) */
export const SOURCE_ICONES_ILLUSTREES = {
  source: 'image générée par IA — ChatGPT, Paul, 2026-10-08',
  outil: 'ChatGPT (OpenAI)',
  auteur: 'Paul (propriétaire de l’image)',
  date: '2026-10-08',
  planche: 'Planche 5 · Patients et domaines de pratique · 12 icônes',
  traitement: 'Vectorisation en aplats (rôles de couleur), nettoyage, cadrage 128, tache normalisée ; pieds douteux remplacés par pied.ts (ÉcranZen)',
} as const;
export const SOURCES_ICONES_ILLUSTREES: Readonly<Record<string, string>> = Object.fromEntries(
  ICONES_ILLUSTREES_IDS.map((id) => [cleIconeIllustree(id), `${SOURCE_ICONES_ILLUSTREES.source} — planche 5, case ${FICHES_ICONES_ILLUSTREES[id].numero}${FICHES_ICONES_ILLUSTREES[id].traitement === 'amelioree' ? ' (pied : géométrie validée pied.ts)' : ''}`]),
);

/** Fiche de la direction D (affichée avec A, B, C dans l'admin) */
export const FICHE_DIRECTION_D = {
  nom: 'Direction D — Icônes illustrées', court: 'Illustrée', grille: 128, tailleMini: 64, tailleNominale: 96,
  tailles: [64, 96, 128] as readonly number[],
  regles: [
    'Mini-illustration ronde, grille 128 : tache de fond normalisée, aplats doux sans contour.',
    'Rôles de couleur (peau, accent, accent clair, accent chaud, encre, neutre, fond, blanc) alimentés par la gamme ; formes signifiantes ≥ 3:1 sur la tache.',
    'Peau constante (ANATOMIE.peau) dans toutes les gammes ; accent chaud orangé, jamais rouge.',
    'Usage : cartes de thèmes et de soins, ≥ 64 px. Jamais en 24 px (utiliser A, B ou C).',
    'Pieds : géométrie validée de pied.ts (ÉcranZen) ; 5 orteils quand des orteils sont dessinés.',
  ] as readonly string[],
} as const;

/** Icône D ↔ picto de l'échantillon A/B/C (même sujet : duels « même picto, deux styles ») */
export const CORRESPONDANCE_ECHANTILLON_D: Readonly<Partial<Record<IdIconeIllustree, string>>> = {
  sport: 'sport-course', seniors: 'senior-canne', 'pied-diabetique': 'monofilament', 'soins-domicile': 'soins-domicile',
};

// ———————————————————————————————————————————————————— Géométrie validée (pied.ts) dans le style d'aplats

/** Tache de fond normalisée (la même pour toutes les icônes) */
export const TACHE_ICONES = 'M64 12C88 10 112 26 116 52C120 76 110 104 84 114C62 122 34 118 20 98C6 78 10 46 26 28C36 17 50 13 64 12Z';

/** `trait` : épaisseur d'un tracé au trait ; `separe` : formes construites qui se chevauchent (un <path> par sous-chemin, sinon la règle pair-impair des aplats vectorisés y percerait des trous) */
type Calque = { role: RoleIcone; d: string; trait?: number; separe?: boolean };
const { simplifier, placer, courbe, rdp, ellipse, cercle } = O;
const chaines = (x: unknown): string => (Array.isArray(x) ? x.join(' ') : String(x ?? ''));

/**
 * Pied gauche de profil médial (ÉcranZen POD-AT-0003), sol en `sol`, talon en `x0`, longueur talon → hallux `l` ; jambe coupée en
 * y = `haut` (sort du cadre). Peau en aplat, orteils latéraux en ombre de peau, ongle de l'hallux en blanc, malléole médiale.
 */
function piedProfilAplats(l: number, x0: number, sol: number, haut = 0): Calque[] {
  const p = piedDeProfil('normale');
  const s = l / 126.6;
  const t = (x: number, y: number): P => [x0 + (x + 2.3) * s, sol - (p.sol - y) * s];
  const coupeEz = p.sol - (sol - haut) / s;
  // transformation exacte de chaque coordonnée (sommets et poignées) : la géométrie validée n'est ni simplifiée ni retouchée
  const T = (d: string) => deformerChemin(d, (x, y) => t(x, y).map((n) => +n.toFixed(1)) as P);
  return [
    { role: 'peau-ombre', d: T(chaines(p.orteils)), separe: true },
    { role: 'peau', d: `${T(couperSous(p.peau, coupeEz, 8).plein)}${T(p.hallux)}`, separe: true },
    { role: 'blanc', d: T(p.ongle), separe: true },
    { role: 'peau-ombre', d: T(p.malleole), trait: Math.max(1, 1.6 * s * 2) },
  ];
}

/** Plante vue de dessous (POD-AT-0001), hallux à droite : contour exact de PLANTE et 5 orteils posés sur leurs bouts */
function planteAplats(h: number, centre: P, rot = 0): string {
  const L = 216.5;
  const s = h / L;
  const t = placer(s, [49.3, 111.25], centre, { miroir: true, rot });
  const contour = courbe(rdp(PLANTE.map(([x, y]) => t(x, y)), 0.25), true);
  const k = h / 40;
  const orteils = CONTOUR_PIED.bouts.map(([x, y], i) => { const [rx, ry] = i ? [1.25, 1.45] : [2.1, 2.4]; const [cx, cy] = t(x + (i ? 0 : 1), y + (ry * k) / s - 9); return ellipse(cx, cy, rx * k, ry * k); }).join('');
  return `${contour}${orteils}`;
}

/** Calques construits (géométrie validée) posés AU-DESSUS des aplats vectorisés */
const CONSTRUITS: Partial<Record<IdIconeIllustree, () => Calque[]>> = {
  // Maison vectorisée (empreinte de la source retirée), plante validée au centre du mur, en accent chaud
  'soins-domicile': () => [{ role: 'accent-chaud', d: planteAplats(36, [64.5, 74], 8), separe: true }],
  // Bouclier vectorisé ; tapis redessiné (celui de la source gardait la trace de l'ancien pied) ; pied posé à plat (profil médial validé)
  'prevention-chutes': () => [
    { role: 'accent-clair', d: 'M12 100C14 92 40 89 70 89C98 89 118 93 118 100C118 107 98 111 68 111C38 111 10 108 12 100Z' },
    ...piedProfilAplats(68, 22, 99, 4),
  ],
  // Entièrement construit : profil médial validé, loupe d'examen (anneau blanc) sur l'avant-pied, badge « + », deux traits de mouvement
  'pied-diabetique': () => {
    const pied = piedProfilAplats(76, 20, 104, 4);
    // loupe sur la tête du 1er métatarsien (zone d'examen du pied diabétique), sans lésion dessinée
    const [lx, ly, lr] = [71, 96, 11];
    return [
      ...pied,
      { role: 'blanc', d: cercle(lx, ly, lr), trait: 3.2 },
      { role: 'accent', d: cercle(96, 42, 12) },
      { role: 'blanc', d: 'M93.6 34.5h4.8v5.1h5.1v4.8h-5.1v5.1h-4.8v-5.1h-5.1v-4.8h5.1Z' },
      { role: 'encre', d: 'M111 60l3.5-5M112.5 68l6-2', trait: 2.2 },
    ];
  },
};

// ———————————————————————————————————————————————————— Rendu

export type OptionsIconeIllustree = {
  /** Taille d'affichage en px (≥ 64 conseillé ; défaut 96) */
  taille?: number;
  /** Largeur / hauteur de l'élément (défaut `taille` px ; « 100% » dans les tuiles) */
  largeur?: string;
  titre?: string;
  classe?: string;
  /** Gamme dont les variables --ic-* sont inlinées sur la racine (aperçus autonomes) ; sinon le conteneur les fournit */
  gamme?: Gamme | string;
};

/** Calques d'une icône (rôle + tracé), dans l'ordre de peinture */
export function calquesIconeIllustree(id: IdIconeIllustree): Calque[] {
  const traces = TRACES_ICONES_ILLUSTREES[id] ?? {};
  const l: Calque[] = ROLES_ICONES.filter((r) => traces[r]).map((r) => ({ role: r, d: traces[r]! }));
  return [...l, ...(CONSTRUITS[id]?.() ?? [])];
}

const memo = new Map<string, string>();
function corps(id: IdIconeIllustree): string {
  let c = memo.get(id);
  if (c) return c;
  const plein = (role: RoleIcone, d: string, regle = ' fill-rule="evenodd"') => `<path d="${d}" fill="${v(role)}"${regle} stroke="${v(role)}" stroke-width=".4"/>`;
  c = `<path d="${TACHE_ICONES}" fill="${v('fond')}"/>` + calquesIconeIllustree(id).map((k) => (k.separe ? k.d.split(/(?=M)/).filter(Boolean).map((d) => plein(k.role, d.trim(), '')).join('') : k.trait
    ? `<path d="${k.d}" fill="none" stroke="${v(k.role)}" stroke-width="${k.trait}" stroke-linecap="round"/>`
    // un liseré de la même couleur referme les joints entre aplats voisins (anticrénelage)
    : plein(k.role, k.d))).join('');
  memo.set(id, c);
  return c;
}

/** Déclaration des variables d'une gamme (attribut style de la racine) : seules valeurs littérales, toujours dans des variables */
export function styleVariablesIcones(g: Gamme | string): string {
  const gm = typeof g === 'string' ? gammeParId(g) : g;
  if (!gm) return '';
  return Object.entries(variablesIconesIllustrees(gm)).map(([k, x]) => `${k}:${x}`).join(';');
}

/** SVG en ligne d'une icône illustrée (direction D), ou null si l'id est inconnu */
export function svgIconeIllustree(id: string, opts: OptionsIconeIllustree = {}): string | null {
  if (!(ICONES_ILLUSTREES_IDS as readonly string[]).includes(id)) return null;
  const taille = opts.taille ?? FICHE_DIRECTION_D.tailleNominale;
  const l = opts.largeur ?? `${taille}`;
  const echappe = (s: string) => s.replace(/[<&>"]/g, '');
  const a11y = opts.titre ? ` role="img" aria-label="${echappe(opts.titre)}"` : ' aria-hidden="true"';
  const titre = opts.titre ? `<title>${echappe(opts.titre)}</title>` : '';
  const style = opts.gamme ? ` style="${styleVariablesIcones(opts.gamme)}"` : '';
  const classe = ['icone-illustree', `icone-illustree--${id}`, opts.classe].filter(Boolean).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${l}" height="${l}" class="${classe}" focusable="false"${a11y}${style}>${titre}${corps(id as IdIconeIllustree)}</svg>`;
}

/** Tuile de l'inventaire : icône seule, gamme Canard inlinée (la tuile n'a pas de variables --ic-*) */
export const svgTuileIllustree = (id: string, g: Gamme | string = 'canard') => svgIconeIllustree(id, { taille: 128, largeur: '100%', gamme: g }) ?? '';

const barre = (x: number, y: number, l: number, h = 5, o = 0.18) => `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${h / 2}" fill="${v('encre')}" fill-opacity="${o}"/>`;
const pose = (id: IdIconeIllustree, x: number, y: number, t: number) => (svgIconeIllustree(id, { taille: t }) ?? '').replace('<svg xmlns="http://www.w3.org/2000/svg" ', `<svg x="${x}" y="${y}" `);

/**
 * Planche « Style d'icônes » de la direction D, EN SITUATION (tuile `picto:style-icones-d`) : cartes de thèmes de l'accueil
 * (ordinateur, icônes à 64 px) et la même page sur téléphone (64 px). Aucune icône sous 64 px. Textes simulés par des barres.
 */
export function svgPlancheIllustree(g: Gamme | string = 'canard'): string {
  const ids = ICONES_ILLUSTREES_IDS;
  const out: string[] = [];
  out.push(`<rect x="8" y="8" width="452" height="384" rx="10" fill="${v('blanc')}" stroke="${v('encre')}" stroke-opacity="0.15" stroke-width="1"/>`);
  out.push(barre(24, 24, 150, 9, 0.5), barre(24, 40, 220, 5));
  ids.slice(0, 8).forEach((id, i) => {
    const x = 24 + (i % 4) * 108, y = 60 + Math.floor(i / 4) * 160;
    out.push(`<rect x="${x}" y="${y}" width="98" height="148" rx="10" fill="${v('fond')}" fill-opacity="0.45"/>`);
    out.push(pose(id, x + 17, y + 12, 64), barre(x + 12, y + 92, 72, 6, 0.45), barre(x + 12, y + 106, 60), barre(x + 12, y + 118, 46));
  });
  out.push(`<rect x="480" y="8" width="152" height="384" rx="18" fill="${v('blanc')}" stroke="${v('encre')}" stroke-opacity="0.3" stroke-width="2"/>`);
  out.push(barre(494, 30, 90, 8, 0.5));
  ids.slice(0, 4).forEach((id, i) => {
    const y = 50 + i * 82;
    out.push(`<rect x="490" y="${y}" width="132" height="74" rx="10" fill="${v('fond')}" fill-opacity="0.45"/>`, pose(id, 494, y + 5, 64), barre(562, y + 26, 52, 6, 0.45), barre(562, y + 38, 40));
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="100%" height="100%" fill="none" class="planche-direction planche-direction--d" aria-hidden="true" focusable="false" style="${styleVariablesIcones(g)}">${out.join('')}</svg>`;
}
