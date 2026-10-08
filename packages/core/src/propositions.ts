// Propositions de sites « prêtes à l'emploi » (parcours /creer, étape « Votre site » ; demande de Paul du 2026-10-07).
//
// À partir des SUJETS du praticien (themes.ts : le n° 1 surtout, le n° 2 et les sujets traités aussi en nuance) et de ses
// COULEURS PRÉFÉRÉES (étape « Vos couleurs » : 0 à 3 teintes nommées simplement), le générateur propose des combinaisons
// d'éléments existants et validés :
//   structure (4 sites du parcours : Clair et pratique / tableau, Simple et proche / village, Élégant et sobre / revue,
//   Technique et précis / technique) × gamme de couleurs (gammes.ts, 17 gammes aux contrastes AA vérifiés) × style
//   d'illustration (relevé de points de pression, illustrations douces, trait fin, photos) × animation d'accueil
//   (structure Technique seulement) × héros du sujet n° 1 (heros-themes.ts).
//
// Règles (testées, propositions.test.ts) :
// 1. Lots de 3, du plus pertinent au moins pertinent, puis exploration (couleurs voisines, autres registres) : « Charger
//    plus » en ajoute indéfiniment (jusqu'à épuisement des ~250 combinaisons), sans doublon.
// 2. Dans un lot : 3 structures différentes, 3 gammes différentes, 3 styles d'illustration différents ; au moins une gamme
//    sobre et une vitaminée quand les couleurs choisies le permettent.
// 3. Premier lot : il couvre les couleurs choisies (une par couleur, dans l'ordre de préférence ; une seule couleur : les
//    trois la reprennent ; deux : la 3e est un duo ou l'une des deux).
// 4. Chaque proposition reflète le sujet n° 1 (table REGLES_THEMES : structures, styles, gammes et animation qui lui vont) ;
//    le sujet n° 2 nuance (bonus de structure et de style, animation de remplacement), sans jamais lever une exclusion du n° 1.
// 5. Diabète : jamais de relevé de pression (rouge « pic »), jamais la structure Technique, aucune gamme rouge vif ni rose ;
//    un « corail » ou un « rouge » choisi est servi en version adoucie (terracotta, sable). Posture (sujet différé) : jamais
//    prise en compte, jamais d'animation « trajectoire ».
// 6. Structure Technique : relevé ou photos seulement (ses surfaces sombres ne portent pas les schémas clairs).
// 7. Déterminisme : mêmes sujets, mêmes couleurs, même graine (et mêmes poids) → mêmes lots, dans le même ordre.
// 8. Apprentissage (atelier-poids.ts, option `poids`) : les notes de l'atelier réordonnent les combinaisons et écartent les
//    franchement mal notées, sans jamais lever une règle ci-dessus (elles ne portent que sur des combinaisons déjà permises).
//    Les notes des assets (assets-poids.ts, `poids.assets`) s'y ajoutent : héros, animations, gammes, modèles, photos et
//    dessins bien notés passent devant ; mal notés, « retirés » ou « à retravailler » reculent ou sont écartés.
//
// Module pur, sans dépendance d'exécution.

import { universCatalogue } from './catalogue-univers';
import type { ModeVisuel, SiteDraft } from './draft';
import type { Registre } from './dessins';
import { GAMMES, gamme as gammeParId, type Gamme } from './gammes';
import type { Animation } from './packs';
import { themeParId, type Priorites } from './themes';
import { BONUS_ATELIER, bonusAtelier, type PoidsAtelier } from './atelier-poids';
import { bonusAssets } from './assets-poids';
import { SPECIALITES } from './packs';
import { bonusRecettesApprises, harmonieCombinaison } from './harmonie';

/** Poids de l'harmonie graphique (harmonie.ts) dans la pertinence d'une proposition (points par unité d'accord) */
const BONUS_HARMONIE = 3;

// ---------------------------------------------------------------------------------------------------------------
// Styles d'illustration
// ---------------------------------------------------------------------------------------------------------------

export const STYLES_ILLUSTRATION = ['releve', 'pedagogique', 'ligne', 'photos'] as const;
export type StyleIllustration = (typeof STYLES_ILLUSTRATION)[number];

/** Libellés du praticien (sans jargon) */
export const LIBELLES_STYLES: Record<StyleIllustration, { nom: string; description: string }> = {
  releve: { nom: 'Relevé', description: 'Points de pression, façon examen au podoscope' },
  pedagogique: { nom: 'Illustrations douces', description: 'Schémas calmes qui expliquent' },
  ligne: { nom: 'Trait fin', description: 'Dessin au trait continu, élégant' },
  photos: { nom: 'Photos', description: 'Photos liées à vos sujets, teintées à vos couleurs' },
};

/** Structures du parcours (UNIVERS_PARCOURS, parcours.ts), redéclarées ici pour éviter une dépendance circulaire */
export const STRUCTURES = ['clair-pratique', 'simple-proche', 'elegant-sobre', 'technique-precis'] as const;
export type Structure = (typeof STRUCTURES)[number];

/** Libellés courts des structures (cartes) */
export const LIBELLES_STRUCTURES: Record<Structure, string> = {
  'clair-pratique': 'Clair et pratique',
  'simple-proche': 'Simple et proche',
  'elegant-sobre': 'Élégant et sobre',
  'technique-precis': 'Technique et précis',
};

/** Styles possibles avec une structure : Technique = relevé ou photos (surfaces sombres) ; les autres, les quatre */
export const stylesCompatibles = (u: string | undefined | null): StyleIllustration[] =>
  u === 'technique-precis' ? ['releve', 'photos'] : [...STYLES_ILLUSTRATION];

/** Registre des dessins de la structure (préréglage de l'univers), utilisé en style « photos » */
const registreStructure = (u: Structure): Registre => universCatalogue(u)?.preReglage.registre ?? 'releve';

/** Registre et style visuel effectifs d'un style d'illustration */
export function reglageStyle(style: StyleIllustration, u: Structure): { registre: Registre; modeVisuel: ModeVisuel } {
  return style === 'photos' ? { registre: registreStructure(u), modeVisuel: 'photos' } : { registre: style, modeVisuel: 'illustrations' };
}

/** Style d'illustration lu dans un thème enregistré (choix explicite, sinon déduit du style visuel et du registre) */
export function styleDuTheme(t: Pick<SiteDraft['theme'], 'modeVisuel' | 'registre' | 'styleIllustration'>): StyleIllustration {
  if (t.styleIllustration && (STYLES_ILLUSTRATION as readonly string[]).includes(t.styleIllustration)) return t.styleIllustration;
  if (t.modeVisuel === 'photos') return 'photos';
  return t.registre ?? 'releve';
}

// ---------------------------------------------------------------------------------------------------------------
// Couleurs préférées (étape « Vos couleurs »)
// ---------------------------------------------------------------------------------------------------------------

export type CouleurPreferee = {
  id: string;
  /** Nom simple montré au praticien */
  nom: string;
  /** Teinte de la pastille */
  hex: string;
  /** Gammes qui la portent, avec la force de la correspondance (3 = couleur principale, 2 = duo ou proche, 1 = voisine) */
  gammes: readonly (readonly [string, 1 | 2 | 3])[];
  /** Versions adoucies, servies quand le sujet exclut les gammes vives (diabète : pas de rouge vif) */
  adoucies?: readonly string[];
};

export const COULEURS_PREFEREES: readonly CouleurPreferee[] = [
  { id: 'bleu', nom: 'Bleu', hex: '#2d5bff', gammes: [['cobalt', 3], ['cobalt-abricot', 3], ['ardoise', 1], ['lavande', 1], ['corail-nuit', 1]] },
  { id: 'bleu-nuit', nom: 'Bleu nuit', hex: '#1f2f5c', gammes: [['corail-nuit', 3], ['encre', 2], ['mangue', 2], ['ardoise', 2], ['cobalt', 1]] },
  { id: 'turquoise', nom: 'Turquoise', hex: '#1f9e94', gammes: [['canard', 3], ['menthe', 3], ['pasteque', 1], ['sauge', 1]] },
  { id: 'vert', nom: 'Vert', hex: '#4f8a3a', gammes: [['sauge', 3], ['pistache', 3], ['canard', 1], ['menthe', 1]] },
  { id: 'jaune', nom: 'Jaune', hex: '#ffc83a', gammes: [['tournesol', 3], ['mangue', 2], ['lavande', 1]], adoucies: ['sable'] },
  { id: 'orange', nom: 'Orange', hex: '#ff9a3c', gammes: [['mangue', 3], ['cobalt-abricot', 2], ['corail', 1], ['terracotta', 1]], adoucies: ['sable', 'terracotta'] },
  { id: 'corail', nom: 'Corail', hex: '#ff7a5c', gammes: [['corail-nuit', 3], ['corail', 3], ['pasteque', 2], ['cobalt-abricot', 1]], adoucies: ['terracotta', 'sable'] },
  { id: 'rouge', nom: 'Rouge', hex: '#c0392b', gammes: [['corail', 3], ['pasteque', 2], ['terracotta', 1]], adoucies: ['terracotta', 'sable'] },
  { id: 'rose', nom: 'Rose', hex: '#ff6f91', gammes: [['pasteque', 3], ['pistache', 2], ['prune', 1]], adoucies: ['prune', 'lavande'] },
  { id: 'violet', nom: 'Violet', hex: '#6f4cff', gammes: [['lavande', 3], ['prune', 2], ['menthe', 1]] },
  { id: 'prune', nom: 'Prune', hex: '#6b2f5f', gammes: [['prune', 3], ['menthe', 2], ['lavande', 1]] },
  { id: 'terracotta', nom: 'Terracotta', hex: '#b5583a', gammes: [['terracotta', 3], ['sable', 2], ['corail', 1]] },
  { id: 'sable', nom: 'Beige', hex: '#d8b98a', gammes: [['sable', 3], ['mangue', 1], ['terracotta', 1]] },
  { id: 'gris', nom: 'Gris', hex: '#5b6b7b', gammes: [['ardoise', 3], ['encre', 2], ['tournesol', 1]] },
  { id: 'noir', nom: 'Noir', hex: '#16202a', gammes: [['encre', 3], ['ardoise', 2], ['corail-nuit', 1]] },
];

export const COULEURS_PREFEREES_MAX = 3;
export const couleurPreferee = (id: string) => COULEURS_PREFEREES.find((c) => c.id === id);

/** Couleurs enregistrées : identifiants connus, sans doublon, 3 au plus ; absent ou invalide → undefined (étape pas encore vue) */
export function normaliserCouleursPreferees(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return [...new Set(v.filter((x): x is string => typeof x === 'string' && Boolean(couleurPreferee(x))))].slice(0, COULEURS_PREFEREES_MAX);
}

/** Ajoute une couleur (à la fin, s'il reste de la place) ou la retire */
export function basculerCouleur(liste: readonly string[] | undefined, id: string): string[] {
  const l = [...(liste ?? [])];
  if (l.includes(id)) return l.filter((x) => x !== id);
  if (!couleurPreferee(id) || l.length >= COULEURS_PREFEREES_MAX) return l;
  return [...l, id];
}

/** Force de la correspondance entre une gamme et une couleur choisie (0 à 3), en tenant compte des gammes exclues */
function correspondance(g: string, c: CouleurPreferee, exclues: readonly string[]): number {
  const vives = c.gammes.filter(([id]) => !exclues.includes(id));
  const f = vives.find(([id]) => id === g)?.[1] ?? 0;
  if (f) return f;
  // Toutes les gammes fortes de la couleur sont exclues (diabète et rouge) : version adoucie
  if (c.adoucies?.length && !vives.some(([, x]) => x >= 2)) {
    const i = c.adoucies.indexOf(g);
    if (i >= 0) return i === 0 ? 2.5 : 2;
  }
  return 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Table des règles par sujet
// ---------------------------------------------------------------------------------------------------------------

type Affinites<K extends string> = Partial<Record<K, number>>;

export type RegleTheme = {
  /** Affinité de chaque structure (0 à 3) ; absente = exclue */
  structures: Affinites<Structure>;
  /** Affinité de chaque style d'illustration (0 à 3) ; absent = exclu */
  styles: Affinites<StyleIllustration>;
  /** Gammes qui lui vont le mieux, dans l'ordre (sans couleur choisie, elles priment) */
  gammes: readonly string[];
  /** Gammes jamais proposées avec ce sujet n° 1 */
  exclues?: readonly string[];
  /** Animation d'accueil propre au sujet (structure Technique, relevé) ; null : image fixe du héros */
  animation: Animation | null;
  /** Animation de repli autorisée en exploration (structure Technique) */
  animationsVoisines?: readonly Animation[];
  /** Nom de la proposition selon le style d'illustration */
  noms: Record<StyleIllustration, string>;
  /** Ce que montre le style d'illustration (fin de la phrase de la carte) */
  montre: Record<StyleIllustration, string>;
};

/**
 * Règles par sujet (lisibles, testées). Sport : technique et dynamique (relevé + coureur) ; diabète : calme, sobre,
 * rassurant, contrastes élevés ; enfant : doux et vitaminé, pédagogique, premiers pas ; senior : simple et proche, grand
 * contraste ; ongles : élégant, pédagogique, médaillons d'hallux ; semelles : technique (semelle en courbes de niveau) ;
 * pédicurie : sobre, hygiène (instruments). « cabinet » : sans sujet choisi.
 */
export const REGLES_THEMES: Record<string, RegleTheme> = {
  sport: {
    structures: { 'technique-precis': 3, 'clair-pratique': 2, 'elegant-sobre': 1.5, 'simple-proche': 1 },
    styles: { releve: 3, photos: 2.5, ligne: 2, pedagogique: 1 },
    gammes: ['cobalt-abricot', 'mangue', 'prune', 'cobalt', 'pasteque', 'menthe', 'encre'],
    animation: 'coureur', animationsVoisines: ['podoscope'],
    noms: { releve: 'Foulée', photos: 'Terrain', ligne: 'Ligne', pedagogique: 'Club' },
    montre: { releve: 'la foulée en points de pression', photos: 'photos de course aux couleurs du cabinet', ligne: 'la foulée dessinée d’un trait fin', pedagogique: 'des schémas clairs de la chaussure et du strapping' },
  },
  diabete: {
    structures: { 'simple-proche': 3, 'clair-pratique': 2, 'elegant-sobre': 2 },
    styles: { pedagogique: 3, ligne: 2, photos: 2 },
    gammes: ['ardoise', 'menthe', 'cobalt', 'sauge', 'tournesol', 'encre'],
    exclues: ['pasteque', 'corail', 'corail-nuit', 'pistache'],
    animation: null,
    noms: { releve: 'Repère', photos: 'Suivi', ligne: 'Prévention', pedagogique: 'Repère' },
    montre: { releve: 'le dépistage expliqué', photos: 'photos de soins et d’examen des pieds', ligne: 'le geste de soin dessiné d’un trait fin', pedagogique: 'des schémas calmes pour suivre ses pieds' },
  },
  ongles: {
    structures: { 'elegant-sobre': 3, 'clair-pratique': 2, 'technique-precis': 2, 'simple-proche': 1 },
    styles: { pedagogique: 3, ligne: 3, releve: 1.5, photos: 1 },
    gammes: ['prune', 'lavande', 'cobalt', 'sable', 'corail-nuit', 'menthe'],
    animation: 'meulage',
    noms: { releve: 'Précision', photos: 'Atelier', ligne: 'Élégance', pedagogique: 'Clarté' },
    montre: { releve: 'le soin de l’ongle épaissi en relevé', photos: 'photos de soin teintées', ligne: 'l’ongle et l’hallux dessinés d’un trait fin', pedagogique: 'l’hallux en médaillon, des schémas pour comprendre chaque soin' },
  },
  enfant: {
    structures: { 'clair-pratique': 3, 'simple-proche': 2, 'elegant-sobre': 1.5, 'technique-precis': 1 },
    styles: { pedagogique: 3, ligne: 2, photos: 2, releve: 1 },
    gammes: ['lavande', 'pistache', 'tournesol', 'sauge', 'sable', 'pasteque'],
    exclues: ['encre'],
    animation: 'premiers-pas',
    noms: { releve: 'Premiers pas', photos: 'Famille', ligne: 'Douceur', pedagogique: 'Petits pas' },
    montre: { releve: 'les premiers pas en points de pression', photos: 'photos de petits pieds et de chaussures', ligne: 'les premiers pas dessinés d’un trait fin', pedagogique: 'des schémas simples pour les parents' },
  },
  senior: {
    structures: { 'simple-proche': 3, 'clair-pratique': 2, 'elegant-sobre': 1.5, 'technique-precis': 0.5 },
    styles: { pedagogique: 3, photos: 2, ligne: 1.5, releve: 0.5 },
    gammes: ['tournesol', 'ardoise', 'encre', 'sauge', 'cobalt', 'menthe'],
    animation: null,
    noms: { releve: 'Marche', photos: 'Confort', ligne: 'Sérénité', pedagogique: 'Proximité' },
    montre: { releve: 'la marche en relevé', photos: 'photos de soins, contrastes marqués', ligne: 'la marche dessinée d’un trait fin, lecture facile', pedagogique: 'gros caractères, téléphone et horaires d’abord' },
  },
  semelles: {
    structures: { 'technique-precis': 3, 'clair-pratique': 2, 'elegant-sobre': 1.5, 'simple-proche': 1 },
    styles: { releve: 3, ligne: 2, pedagogique: 2, photos: 1 },
    gammes: ['cobalt', 'menthe', 'mangue', 'encre', 'cobalt-abricot', 'terracotta'],
    animation: 'semelle', animationsVoisines: ['podoscope'],
    noms: { releve: 'Empreinte', photos: 'Mesure', ligne: 'Sur mesure', pedagogique: 'Atelier' },
    montre: { releve: 'la semelle tracée en courbes de niveau', photos: 'photos du cabinet et des chaussures', ligne: 'la semelle dessinée d’un trait fin', pedagogique: 'des schémas pour comprendre la fabrication' },
  },
  pedicurie: {
    structures: { 'simple-proche': 2.5, 'elegant-sobre': 2.5, 'clair-pratique': 2, 'technique-precis': 1 },
    styles: { pedagogique: 2.5, ligne: 2.5, photos: 2, releve: 1 },
    gammes: ['sable', 'menthe', 'cobalt', 'canard', 'ardoise', 'sauge'],
    animation: null,
    noms: { releve: 'Instruments', photos: 'Net', ligne: 'Soin', pedagogique: 'Douceur' },
    montre: { releve: 'le soin et le matériel stérilisé', photos: 'photos de soins, matériel stérilisé', ligne: 'pieds et instruments dessinés d’un trait fin', pedagogique: 'des schémas calmes sur l’hygiène et les soins' },
  },
  cabinet: {
    structures: { 'clair-pratique': 3, 'simple-proche': 2, 'technique-precis': 2, 'elegant-sobre': 2 },
    styles: { ligne: 2, pedagogique: 2, releve: 2, photos: 1.5 },
    gammes: ['cobalt-abricot', 'tournesol', 'cobalt', 'canard', 'mangue', 'sauge'],
    animation: 'podoscope',
    noms: { releve: 'Podoscope', photos: 'Lumière', ligne: 'Clair', pedagogique: 'Proche' },
    montre: { releve: 'les empreintes en points de pression', photos: 'photos du cabinet et des soins', ligne: 'dessins au trait fin, une idée par carte', pedagogique: 'des schémas simples, le plan et le téléphone d’abord' },
  },
};

/** Début de phrase de chaque structure */
const TON: Record<Structure, string> = {
  'technique-precis': 'Technique et précis',
  'clair-pratique': 'Clair et moderne',
  'simple-proche': 'Simple et lisible',
  'elegant-sobre': 'Élégant et sobre',
};

// ---------------------------------------------------------------------------------------------------------------
// Propositions
// ---------------------------------------------------------------------------------------------------------------

export type Proposition = {
  /** Identifiant stable et lisible : sujet~structure~gamme~style~animation */
  id: string;
  /** Nom évocateur et sobre (« Foulée », « Atelier ») */
  nom: string;
  /** Une ligne : ton de la structure et ce que montrent les illustrations */
  phrase: string;
  /** Structure (univers du parcours) */
  univers: Structure;
  gamme: string;
  famille: 'sobre' | 'vitaminee';
  style: StyleIllustration;
  registre: Registre;
  modeVisuel: ModeVisuel;
  /** Animation d'accueil (structure Technique en relevé), sinon null (image fixe) */
  animation: Animation | null;
  /** Spécialité dont les photos sont montrées (style photos), sinon null */
  photos: string | null;
  /** Sujet n° 1 (héros de l'accueil), sinon null */
  heros: string | null;
  /** Couleurs choisies que reprend la gamme */
  couleurs: string[];
  /** Nuances apportées par les autres sujets (texte court, pour la carte) */
  nuances: string[];
  /** Pertinence (plus haut = plus pertinent) */
  score: number;
};

export type EntreePropositions = { priorites?: Priorites | null; couleursPreferees?: readonly string[] | null };
export type OptionsPropositions = {
  graine?: number;
  /** Poids appris des notes de l'atelier (poidsAtelier) : réordonnent et écartent, sans lever aucun garde-fou */
  poids?: PoidsAtelier | null;
};

/** Sujets pris en compte : principaux puis secondaires, sans le sujet différé (posture), dans l'ordre */
function sujets(p: Priorites | null | undefined): string[] {
  const ids = [...(p?.principaux ?? []), ...(p?.secondaires ?? [])];
  return ids.filter((id) => themeParId(id)?.statut === 'actif' && REGLES_THEMES[id]);
}

/** Hachage déterministe court (départage stable des égalités, graine) */
function hache(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/** Photos montrées par le style « photos » d'une spécialité (accueil, panorama, diaporama) */
function photosSpecialite(id: string): string[] {
  const s = SPECIALITES.find((x) => x.value === id) ?? SPECIALITES[0];
  return [...new Set([s.photos.accueil, s.photos.panorama, ...s.photos.diaporama])];
}

type Candidat = Proposition & { cle: string; /** bonus de l'atelier (étoiles) */ bonus: number };

/** Toutes les combinaisons cohérentes avec les sujets, notées (pertinence décroissante) */
function candidats(e: EntreePropositions, opts: OptionsPropositions = {}): Candidat[] {
  const s = sujets(e.priorites);
  const n1 = s[0] ?? 'cabinet';
  const r1 = REGLES_THEMES[n1];
  const n2 = s[1];
  const r2 = n2 ? REGLES_THEMES[n2] : undefined;
  const autres = s.slice(2).map((id) => REGLES_THEMES[id]);
  const exclues = r1.exclues ?? [];
  const couleurs = (e.couleursPreferees ?? []).map(couleurPreferee).filter((c): c is CouleurPreferee => Boolean(c)).slice(0, COULEURS_PREFEREES_MAX);
  const graine = opts.graine ?? 0;
  const theme1 = themeParId(n1);
  const sortie: Candidat[] = [];

  for (const u of STRUCTURES) {
    const aU = r1.structures[u];
    if (aU === undefined) continue;
    for (const style of stylesCompatibles(u)) {
      const aS = r1.styles[style];
      if (aS === undefined) continue;
      for (const g of GAMMES) {
        if (exclues.includes(g.id)) continue;
        // Gamme : préférence du sujet (sans couleur choisie, elle prime), couleurs choisies (pondérées par leur rang)
        const rang = r1.gammes.indexOf(g.id);
        const aG = rang < 0 ? 0 : [3, 2.7, 2.2, 2, 1.2, 1, 0.8][rang] ?? 0.6;
        const forces = couleurs.map((c, i) => correspondance(g.id, c, exclues) * [1, 0.85, 0.7][i]);
        const aC = forces.length ? Math.max(...forces) : 0;
        const couleursReprises = couleurs.filter((c) => correspondance(g.id, c, exclues) >= 2).map((c) => c.id);
        // Nuances : sujet n° 2 (et suivants, plus légèrement)
        let nuance = 0;
        if (r2) nuance += 0.6 * ((r2.structures[u] ?? 0) + (r2.styles[style] ?? 0)) + (r2.gammes.slice(0, 3).includes(g.id) ? 0.8 : 0) - (r2.exclues?.includes(g.id) ? 1.5 : 0);
        for (const r of autres) nuance += 0.2 * ((r.structures[u] ?? 0) + (r.styles[style] ?? 0));
        // Animation : Technique en relevé seulement ; celle du sujet n° 1, sinon du n° 2, sinon image fixe ; voisines en exploration
        const animations: [Animation | null, number][] = [];
        if (u === 'technique-precis' && style === 'releve') {
          const propre = r1.animation ?? r2?.animation ?? null;
          animations.push([propre, 0]);
          for (const a of [r2?.animation, ...(r1.animationsVoisines ?? [])]) if (a && a !== propre && !animations.some(([x]) => x === a)) animations.push([a, -2.5]);
        } else animations.push([null, 0]);

        for (const [animation, bonusAnim] of animations) {
          // Harmonie graphique (harmonie.ts) : accord structure × style × gamme, ±1 point environ ; ne lève jamais une règle
          const harmonie = BONUS_HARMONIE * (harmonieCombinaison(u, style, g.id) - 0.7);
          const base = 3 * aU + 3 * aS + (couleurs.length ? 1 * aG + 4 * aC : 2.5 * aG) + nuance + bonusAnim + harmonie;
          const cle = `${n1}~${u}~${g.id}~${style}~${animation ?? '0'}`;
          const { registre, modeVisuel } = reglageStyle(style, u);
          const photos = style === 'photos' ? (theme1?.specialite ?? 'generale') : null;
          const bonus = opts.poids
            ? Math.min(BONUS_ATELIER.max, Math.max(BONUS_ATELIER.min,
              bonusAtelier({ structure: u, gamme: g.id, style, animation, theme1: n1, proposition: cle }, opts.poids)
              + bonusAssets({ structure: u, gamme: g.id, style, registre, modeVisuel, animation, heros: n1 === 'cabinet' ? null : n1, sujet: n1 === 'cabinet' ? null : n1, photos: photos ? photosSpecialite(photos) : [] }, opts.poids.assets)
              // Recettes complètes notées (notation-recettes.ts) : ingrédients et paires structure × style × gamme, sujet n° 1 compris
              + bonusRecettesApprises(opts.poids.harmonie, n1, { structure: u, style, gamme: g.id })))
            : 0;
          const nuances: string[] = [];
          if (n2 && animation && animation === r2?.animation && animation !== r1.animation) nuances.push(`Animation tirée de votre sujet « ${themeParId(n2)?.court} »`);
          if (n2 && r2?.gammes.slice(0, 3).includes(g.id) && !r1.gammes.slice(0, 2).includes(g.id)) nuances.push(`Couleurs proches de votre sujet « ${themeParId(n2)?.court} »`);
          sortie.push({
            cle,
            bonus,
            id: cle,
            nom: r1.noms[style],
            phrase: `${TON[u]} : ${r1.montre[style]}.`,
            univers: u,
            gamme: g.id,
            famille: g.famille === 'vitaminee' ? 'vitaminee' : 'sobre',
            style,
            registre,
            modeVisuel,
            animation,
            photos,
            heros: n1 === 'cabinet' ? null : n1,
            couleurs: couleursReprises,
            nuances,
            score: Math.round((base + BONUS_ATELIER.facteurScore * bonus + hache(`${graine}|${cle}`) * 0.4) * 1000) / 1000,
          });
        }
      }
    }
  }
  return sortie.sort((a, b) => b.score - a.score || (a.cle < b.cle ? -1 : 1));
}

/** Deux propositions d'un même lot sont-elles compatibles (structures, styles et gammes différents) ? */
const differentes = (a: Candidat, b: Candidat) => a.univers !== b.univers && a.style !== b.style && a.gamme !== b.gamme;

/**
 * Combinaisons écartées par l'apprentissage (bonus ≤ seuil). Pour que les lots restent variés (3 structures, 3 styles,
 * 3 gammes, une sobre et une vitaminée), chaque couple structure × style permis garde au moins 4 gammes différentes et ses
 * deux familles (sobre, vitaminée) quand il les avait : les meilleures sont rendues si l'apprentissage les avait toutes écartées.
 */
function ecarterMalNotes(tous: Candidat[]): Candidat[] {
  const gardes = new Set(tous.filter((c) => c.bonus > BONUS_ATELIER.seuilEcart));
  if (gardes.size === tous.length) return tous;
  const groupes = new Map<string, Candidat[]>();
  for (const c of tous) {
    const k = `${c.univers}|${c.style}`;
    groupes.set(k, [...(groupes.get(k) ?? []), c]);
  }
  for (const g of groupes.values()) {
    // g est déjà trié par pertinence décroissante
    const gammes = () => new Set(g.filter((c) => gardes.has(c)).map((c) => c.gamme));
    const cible = Math.min(4, new Set(g.map((c) => c.gamme)).size);
    for (const c of g) {
      if (gammes().size >= cible) break;
      if (!gammes().has(c.gamme)) gardes.add(c);
    }
    for (const f of ['sobre', 'vitaminee'] as const) {
      if (g.some((c) => c.famille === f) && !g.some((c) => c.famille === f && gardes.has(c))) gardes.add(g.find((c) => c.famille === f)!);
    }
  }
  return tous.filter((c) => gardes.has(c));
}

/**
 * Lots de 3 propositions, du plus pertinent au moins pertinent (« Charger plus » : nbLots croissant ; les lots déjà vus
 * ne changent jamais). Choix glouton : pour chaque place, la meilleure proposition restante qui respecte les contraintes du
 * lot (structures, styles, gammes différents ; une sobre et une vitaminée si possible ; premier lot : couverture des
 * couleurs choisies), les contraintes étant relâchées une à une si aucune ne convient. Une structure et un style déjà
 * beaucoup montrés reculent un peu (exploration progressive).
 */
export function lotsPropositions(e: EntreePropositions, nbLots: number, opts: OptionsPropositions = {}): Proposition[][] {
  const tous = opts.poids ? ecarterMalNotes(candidats(e, opts)) : candidats(e, opts);
  const couleurs = (e.couleursPreferees ?? []).filter((c) => couleurPreferee(c)).slice(0, COULEURS_PREFEREES_MAX);
  const vus = new Set<string>();
  const deja = new Map<string, number>();
  const lots: Proposition[][] = [];
  for (let n = 0; n < nbLots; n++) {
    const restants = tous.filter((c) => !vus.has(c.cle));
    if (restants.length < 3) break;
    const note = (c: Candidat) => c.score - 4 * (deja.get(`${c.univers}|${c.style}`) ?? 0) - 1.5 * (deja.get(c.gamme) ?? 0);
    const ordre = n === 0 ? restants : [...restants].sort((a, b) => note(b) - note(a) || (a.cle < b.cle ? -1 : 1));
    const lot: Candidat[] = [];
    for (let place = 0; place < 3; place++) {
      // Couleur visée par cette place (premier lot) : une par couleur, une seule couleur → toutes, deux → la 3e libre
      const visee = n === 0 && couleurs.length ? (couleurs.length === 1 ? couleurs[0] : couleurs[place]) : undefined;
      const familles = new Set(lot.map((c) => c.famille));
      const filtres: ((c: Candidat) => boolean)[] = [
        (c) => (!visee || c.couleurs.includes(visee)) && (place < 2 || familles.size > 1 || !familles.has(c.famille)),
        (c) => !visee || c.couleurs.includes(visee),
        (c) => place < 2 || familles.size > 1 || !familles.has(c.famille),
        () => true,
      ];
      let choisi: Candidat | undefined;
      for (const f of filtres) {
        choisi = ordre.find((c) => !lot.includes(c) && lot.every((x) => differentes(x, c)) && f(c));
        if (choisi) break;
      }
      // Dernier recours (combinaisons presque épuisées) : seulement une gamme et une structure différentes
      choisi ??= ordre.find((c) => !lot.includes(c) && lot.every((x) => x.gamme !== c.gamme && x.univers !== c.univers));
      choisi ??= ordre.find((c) => !lot.includes(c));
      if (!choisi) break;
      lot.push(choisi);
    }
    if (lot.length < 3) break;
    for (const c of lot) {
      vus.add(c.cle);
      deja.set(`${c.univers}|${c.style}`, (deja.get(`${c.univers}|${c.style}`) ?? 0) + 1);
      deja.set(c.gamme, (deja.get(c.gamme) ?? 0) + 1);
    }
    lots.push(lot.map(({ cle: _cle, bonus: _bonus, ...p }) => p));
  }
  return lots;
}

/** Les 3 premières propositions (premier lot) */
export function propositionsModeles(e: EntreePropositions, opts: OptionsPropositions = {}): Proposition[] {
  return lotsPropositions(e, 1, opts)[0] ?? [];
}

/**
 * Proposition retrouvée par son identifiant (enregistrement côté serveur, reprise) : recalculée à partir des sujets et des
 * couleurs, jamais lue telle quelle. Identifiant inconnu ou incohérent avec les sujets : null.
 */
export function propositionParId(e: EntreePropositions, id: string, opts: OptionsPropositions = {}): Proposition | null {
  const c = candidats(e, opts).find((x) => x.cle === id);
  if (!c) return null;
  const { cle: _cle, bonus: _bonus, ...p } = c;
  return p;
}

// ---------------------------------------------------------------------------------------------------------------
// Application au brouillon
// ---------------------------------------------------------------------------------------------------------------

/** Réglages effectifs du site (ce que l'étape « Ajuster » modifie) */
export type ReglagesSite = { gamme: string; style: StyleIllustration; animation: Animation | null };

/**
 * Pose les réglages d'une proposition (ou ajustés) sur le thème, la structure étant déjà appliquée (appliquerUnivers) :
 * gamme et couleur, style d'illustration (registre, style visuel), animation d'accueil, identifiant de la proposition.
 * Un style incompatible avec la structure est ramené au relevé ; une gamme inconnue garde la couleur actuelle.
 */
export function appliquerReglages(d: SiteDraft, r: Partial<ReglagesSite> & { proposition?: string | null }): SiteDraft {
  const u = (STRUCTURES as readonly string[]).includes(d.theme.univers ?? '') ? (d.theme.univers as Structure) : null;
  const theme = { ...d.theme };
  if (r.gamme !== undefined) {
    const g: Gamme | undefined = gammeParId(r.gamme);
    if (g) { theme.gamme = g.id; theme.couleur = g.accent; }
  }
  if (r.style !== undefined && (STYLES_ILLUSTRATION as readonly string[]).includes(r.style)) {
    const style = u && !stylesCompatibles(u).includes(r.style) ? 'releve' : r.style;
    const v = u ? reglageStyle(style, u) : style === 'photos' ? { registre: theme.registre ?? 'releve', modeVisuel: 'photos' as const } : { registre: style as Registre, modeVisuel: 'illustrations' as const };
    theme.styleIllustration = style;
    theme.registre = v.registre;
    theme.modeVisuel = v.modeVisuel;
  }
  if (r.animation !== undefined) {
    theme.animation = Boolean(r.animation);
    if (r.animation) theme.animationAccueil = r.animation;
    else delete theme.animationAccueil;
  }
  if (r.proposition !== undefined) {
    if (r.proposition) theme.proposition = r.proposition;
    else delete theme.proposition;
  }
  return { ...d, theme };
}

/** Pose une proposition (structure déjà appliquée) */
export const appliquerProposition = (d: SiteDraft, p: Proposition): SiteDraft =>
  appliquerReglages(d, { gamme: p.gamme, style: p.style, animation: p.animation, proposition: p.id });

/** Animation d'accueil d'un réglage : Technique en relevé seulement, celle des sujets ; sinon aucune */
export function animationPour(e: EntreePropositions, u: string | undefined | null, style: StyleIllustration): Animation | null {
  if (u !== 'technique-precis' || style !== 'releve') return null;
  const s = sujets(e.priorites);
  const r1 = REGLES_THEMES[s[0] ?? 'cabinet'];
  return r1.animation ?? (s[1] ? REGLES_THEMES[s[1]].animation : null) ?? null;
}

/** Gammes conseillées pour les couleurs choisies (ordre de préférence), sans les gammes exclues par le sujet n° 1 */
export function gammesDesCouleurs(e: EntreePropositions): string[] {
  const s = sujets(e.priorites);
  const exclues = REGLES_THEMES[s[0] ?? 'cabinet'].exclues ?? [];
  const couleurs = (e.couleursPreferees ?? []).map(couleurPreferee).filter((c): c is CouleurPreferee => Boolean(c));
  const ids = couleurs.flatMap((c) => GAMMES.map((g) => [g.id, correspondance(g.id, c, exclues)] as const).filter(([, f]) => f >= 2).sort((a, b) => b[1] - a[1]).map(([id]) => id));
  return [...new Set(ids)];
}
