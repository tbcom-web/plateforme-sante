// Organisation du Studio de recettes (retour de Paul du 2026-10-08 : « le studio devient un peu chaotique… le but étant de créer
// des recettes élégantes et de les enregistrer, pas besoin de mettre autant de notes ; focus sur la sélection des zones à
// améliorer ; laisser la possibilité de bloquer certains éléments »).
//
// 1. REGISTRE DES DIMENSIONS → GROUPE : chaque dé du Studio a une clé (celle de son verrou : `couleurs`, `hab:typo:casse`,
//    `page:acces`, `composant:accueil`…) ; `groupeDeCle` la range dans l'un des six groupes repliables du panneau de gauche.
//    Les règles portent sur des préfixes : un nouveau dé (ex. `composant:entete-anim`) se range seul, sans toucher au Studio.
// 2. APPRÉCIATION À L'ENREGISTREMENT : une seule appréciation facultative (Élégante / Correcte / À revoir) remplace les étoiles
//    obligatoires ; elle devient la note de la recette (5 / 3 / 2), lue par l'apprentissage existant (renfortsPoids, plafond
//    ±0,75 ★ ; harmonie : ±0,75 ★ ; recettes ≥ 4 en tête de /creer).
// 3. ZONES À AMÉLIORER : tracées par page et par appareil, jointes à la recette (clé `ameliorations` de la composition jsonb,
//    aucune migration) ET journalisées dans recettes_notes (page, appareil, zones) avec une note de page fixe NOTE_ZONES_PAGE
//    = 2 ★, quel que soit le nombre de zones (plafonné : une ligne par page et par appareil ; seules les clés de cette page sont
//    touchées, clesPage) ; une ligne n'est ajoutée que si les zones de cette page et de cet appareil ont changé.
// Module pur.

import { normaliserZone, type Zone } from './zones';

// ---------------------------------------------------------------------------------------------------------------
// 1. Groupes
// ---------------------------------------------------------------------------------------------------------------

export const GROUPES_STUDIO = [
  { id: 'couleurs', nom: 'Couleurs' },
  { id: 'typographie', nom: 'Typographie' },
  { id: 'visuels', nom: 'Visuels & photos' },
  { id: 'premier-ecran', nom: 'Premier écran & animation' },
  { id: 'structure', nom: 'Structure des pages' },
  { id: 'details', nom: 'Détails & effets' },
] as const;
export type GroupeStudio = (typeof GROUPES_STUDIO)[number]['id'];

/** Règles du registre, de la plus précise à la plus générale (premier préfixe qui correspond) */
export const REGLES_GROUPES: readonly { prefixe: string; groupe: GroupeStudio }[] = [
  { prefixe: 'couleurs', groupe: 'couleurs' },
  { prefixe: 'gamme', groupe: 'couleurs' },
  { prefixe: 'polices', groupe: 'typographie' },
  { prefixe: 'typo', groupe: 'typographie' },
  { prefixe: 'hab:typo:', groupe: 'typographie' },
  { prefixe: 'visuels', groupe: 'visuels' },
  { prefixe: 'photos', groupe: 'visuels' },
  { prefixe: 'traitement', groupe: 'visuels' },
  // Premier écran : variante d'accueil, transitions du diaporama et entre sections, animation d'accueil, animation d'en-tête
  { prefixe: 'animation', groupe: 'premier-ecran' },
  { prefixe: 'composant:accueil', groupe: 'premier-ecran' },
  { prefixe: 'composant:transition', groupe: 'premier-ecran' },
  { prefixe: 'composant:sections', groupe: 'premier-ecran' },
  { prefixe: 'composant:entete', groupe: 'premier-ecran' },
  { prefixe: 'composant:heros', groupe: 'premier-ecran' },
  { prefixe: 'composant:visuel-heros', groupe: 'premier-ecran' },
  { prefixe: 'entete', groupe: 'premier-ecran' },
  { prefixe: 'effets', groupe: 'details' },
  { prefixe: 'details', groupe: 'details' },
  { prefixe: 'hab:details:', groupe: 'details' },
  { prefixe: 'menu', groupe: 'structure' },
  { prefixe: 'hab:menu:', groupe: 'structure' },
  { prefixe: 'structure', groupe: 'structure' },
  { prefixe: 'page:', groupe: 'structure' },
  { prefixe: 'composant:', groupe: 'structure' },
];

/** Groupe d'un dé (clé de verrou) ; inconnu → « Structure des pages » (un élément de page par défaut) */
export function groupeDeCle(cle: string): GroupeStudio {
  for (const r of REGLES_GROUPES) {
    // Préfixe sans « : » final : la clé entière ou suivie de « : » / « - » (« composant:accueil » ≠ « composant:accueillir »)
    if (r.prefixe.endsWith(':') ? cle.startsWith(r.prefixe) : cle === r.prefixe || cle.startsWith(`${r.prefixe}:`) || cle.startsWith(`${r.prefixe}-`)) return r.groupe;
  }
  return 'structure';
}

/** Rangées regroupées dans l'ordre des groupes (ordre d'origine conservé dans chaque groupe) */
export function rangerParGroupe<T extends { cle: string }>(rangees: readonly T[]): { groupe: (typeof GROUPES_STUDIO)[number]; rangees: T[] }[] {
  return GROUPES_STUDIO.map((g) => ({ groupe: g, rangees: rangees.filter((r) => groupeDeCle(r.cle) === g.id) }));
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Appréciation
// ---------------------------------------------------------------------------------------------------------------

export const APPRECIATIONS = [
  { id: 'elegante', libelle: 'Élégante', note: 5 },
  { id: 'correcte', libelle: 'Correcte', note: 3 },
  { id: 'a-revoir', libelle: 'À revoir', note: 2 },
] as const;
export type Appreciation = (typeof APPRECIATIONS)[number]['id'];

export const noteAppreciation = (a: Appreciation | null | undefined): number | null => APPRECIATIONS.find((x) => x.id === a)?.note ?? null;

/** Appréciation affichée pour une note enregistrée (anciennes notes : 4 → null, gardée telle quelle et affichée « 4★ ») */
export function appreciationDeNote(note: number | null | undefined): Appreciation | null {
  if (note === 5) return 'elegante';
  if (note === 3) return 'correcte';
  if (note === 1 || note === 2) return 'a-revoir';
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Zones à améliorer
// ---------------------------------------------------------------------------------------------------------------

/** Note de page journalisée pour une page (et un appareil) qui a au moins une zone à améliorer */
export const NOTE_ZONES_PAGE = 2;

/** Étiquettes rapides proposées dans le Studio (sous-ensemble de ETIQUETTES_ZONE, zones.ts) */
export const ETIQUETTES_AMELIORER = ['trop-charge', 'illisible', 'alignement', 'couleur', 'image', 'espacement', 'typo', 'a-revoir'] as const;

/** Zones d'une page (onglet du Studio) pour un appareil */
export type AmeliorationPage = { onglet: string; page: string; appareil: 'ordinateur' | 'mobile'; zones: Zone[] };

/** Ameliorations reçues (composition jsonb, formulaire) : 40 lots au plus, 12 zones par lot, lots vides retirés */
export function normaliserAmeliorations(brut: unknown): AmeliorationPage[] {
  if (!Array.isArray(brut)) return [];
  const vus = new Set<string>();
  const res: AmeliorationPage[] = [];
  for (const o of brut.slice(0, 80)) {
    if (!o || typeof o !== 'object') continue;
    const x = o as Record<string, unknown>;
    const onglet = typeof x.onglet === 'string' && /^[a-z0-9:-]{2,80}$/.test(x.onglet) ? x.onglet : null;
    const page = typeof x.page === 'string' && /^[a-z-]{2,30}$/.test(x.page) ? x.page : null;
    const appareil: AmeliorationPage['appareil'] | null = x.appareil === 'mobile' ? 'mobile' : x.appareil === 'ordinateur' ? 'ordinateur' : null;
    if (!onglet || !page || !appareil || vus.has(`${onglet}|${appareil}`)) continue;
    const zones = (Array.isArray(x.zones) ? x.zones : []).map(normaliserZone).filter((z): z is Zone => z !== null).slice(0, 12).map((z) => ({ ...z, appareil }));
    if (!zones.length) continue;
    vus.add(`${onglet}|${appareil}`);
    res.push({ onglet, page, appareil, zones });
    if (res.length >= 40) break;
  }
  return res;
}

const empreinteLot = (a: AmeliorationPage) => JSON.stringify(a.zones.map((z) => [z.forme, z.x, z.y, z.l, z.h, z.etiquette, z.commentaire]));

/** Lots nouveaux ou modifiés par rapport à ceux déjà enregistrés (seuls eux sont journalisés) */
export function ameliorationsNouvelles(avant: readonly AmeliorationPage[], apres: readonly AmeliorationPage[]): AmeliorationPage[] {
  const anciens = new Map(avant.map((a) => [`${a.onglet}|${a.appareil}`, empreinteLot(a)]));
  return apres.filter((a) => anciens.get(`${a.onglet}|${a.appareil}`) !== empreinteLot(a));
}

/** Nombre total de zones */
export const nombreZones = (l: readonly AmeliorationPage[]) => l.reduce((s, a) => s + a.zones.length, 0);
