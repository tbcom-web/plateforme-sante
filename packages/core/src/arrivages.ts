// ARRIVAGES (décision de Paul du 2026-10-08) : boîte d'entrée UNIQUE de tout ce qui est nouveau. Un geste : ACCEPTER (l'élément
// entre au frigo : utilisable par le générateur) ou REFUSER. Ce qui n'est pas accepté n'est pas utilisable par le générateur.
// Aucun nouveau statut dupliqué : chaque source garde son mécanisme existant (docs/espaces-admin.md, « Correspondance ») :
//
// | Source                                   | En attente                         | Accepter                                   | Refuser                         |
// |------------------------------------------|------------------------------------|--------------------------------------------|---------------------------------|
// | Photos à découvrir (Pexels, Pixabay)     | candidate jamais vue               | « Garder » + import WebP → `validee`       | « Rejeter » (photos_libres_avis)|
// | Photos gardées non importées, images     | photos_libres `a_valider`          | import WebP (déjà hébergée : rien) →       | `retiree`                       |
// |   générées importées                     |                                    |   `validee`                                |                                 |
// | Nouveautés du code (inventaire-connu)    | récente, jamais notée, statut nul  | statut `accepte` (0044) ou note rapide     | statut `retire`                 |
// |                                          |   ou « À revoir »                  |   (une note vaut acceptation, sauf 1 ★)    |                                 |
//
// Annuler la dernière action : photo → `a_valider` ; nouveauté → statut précédent (sinon « À revoir », qui la remet en attente).
// Pur.

import { baseDeCle } from './bases-illustrations';
import { familleNouveaute, libelleLot } from './nouveautes';

export type EtatArrivage = 'en_attente' | 'accepte' | 'refuse';

export type SourceArrivage = 'photos-libres' | 'images-generees' | 'nouveautes' | 'contenus';
export const SOURCES_ARRIVAGES: readonly { id: SourceArrivage; libelle: string }[] = [
  { id: 'photos-libres', libelle: 'Photos à découvrir (Pexels, Pixabay)' },
  { id: 'images-generees', libelle: 'Images générées importées' },
  { id: 'nouveautes', libelle: 'Nouveautés poussées par Claude' },
  { id: 'contenus', libelle: 'Contenus (textes des packs)' },
];

/** Types d'ingrédients (Arrivages et Frigo) */
export type TypeIngredient = 'photo' | 'illustration' | 'icone' | 'animation' | 'palette' | 'police' | 'mise-en-page' | 'element';
export const TYPES_INGREDIENTS: readonly { id: TypeIngredient; libelle: string; pluriel: string }[] = [
  { id: 'photo', libelle: 'Photo', pluriel: 'Photos' },
  { id: 'illustration', libelle: 'Illustration', pluriel: 'Illustrations' },
  { id: 'icone', libelle: 'Icône', pluriel: 'Icônes' },
  { id: 'animation', libelle: 'Animation', pluriel: 'Animations' },
  { id: 'palette', libelle: 'Palette', pluriel: 'Palettes' },
  { id: 'police', libelle: 'Police', pluriel: 'Polices' },
  { id: 'mise-en-page', libelle: 'Mise en page', pluriel: 'Mises en page' },
  { id: 'element', libelle: 'Élément', pluriel: 'Éléments' },
];
/** Type d'un arrivage : ingrédient du frigo, ou texte d'un pack de contenus (contenus-revue.ts) */
export type TypeArrivage = TypeIngredient | 'contenu';

/** Filtres de type des Arrivages (demande de Paul du 2026-10-09) : Visuels · Icônes · Animations · Mises en page · Contenus */
export const FILTRES_TYPES_ARRIVAGES: readonly { id: string; libelle: string; types: readonly TypeArrivage[] }[] = [
  { id: 'visuels', libelle: 'Visuels', types: ['photo', 'illustration', 'palette'] },
  { id: 'icones', libelle: 'Icônes', types: ['icone'] },
  { id: 'animations', libelle: 'Animations', types: ['animation'] },
  { id: 'mises-en-page', libelle: 'Mises en page', types: ['mise-en-page', 'police', 'element'] },
  { id: 'contenus', libelle: 'Contenus', types: ['contenu'] },
];
/** Filtre de type d'un arrivage (chaque type est dans exactement un filtre) */
export const filtreTypeArrivage = (t: TypeArrivage) => FILTRES_TYPES_ARRIVAGES.find((f) => f.types.includes(t))!.id;

export type LotArrivages = { id: string; libelle: string; date: string; cles: string[] };

/**
 * Lots des nouveautés en attente (même découpage et même libellé que la tuile « Nouveautés à noter » : famille × date,
 * « Style d'icônes A/B/C/D · 46 · 08/10 ») ; plus récents d'abord, puis par libellé.
 */
export function lotsArrivages(enAttente: readonly { cle: string; date: string }[]): (LotArrivages & { titre: string })[] {
  const m = new Map<string, LotArrivages>();
  for (const { cle, date } of enAttente) {
    const f = familleNouveaute(cle);
    const id = `${f.id}@${date}`;
    const l = m.get(id) ?? { id, libelle: f.libelle, date, cles: [] };
    l.cles.push(cle);
    m.set(id, l);
  }
  return [...m.values()].map((l) => ({ ...l, titre: libelleLot(l) }))
    .sort((a, b) => (a.date === b.date ? a.libelle.localeCompare(b.libelle, 'fr') : a.date < b.date ? 1 : -1));
}

/** Lot d'une nouveauté */
export const lotDeCle = (cle: string, date: string) => `${familleNouveaute(cle).id}@${date}`;

export const estTypeIngredient = (x: unknown): x is TypeIngredient => TYPES_INGREDIENTS.some((t) => t.id === x);

/** Type d'ingrédient d'une clé d'inventaire */
export function typeIngredient(cle: string): TypeIngredient {
  const [t, a] = cle.split(':');
  if (t === 'photo') return 'photo';
  if (t === 'picto') return 'icone';
  if (t === 'animation' || (t === 'composant' && (a === 'entete-anim' || a === 'visuel-heros' || a === 'transition'))) return 'animation';
  if (t === 'gamme') return 'palette';
  if (t === 'typo') return 'police';
  if (t === 'structure' || t === 'modele' || t === 'menu' || (t === 'composant' && a === 'accueil')) return 'mise-en-page';
  if (t === 'dessin' || t === 'ligne' || t === 'heros' || t === 'materiel' || t === 'biblio') return 'illustration';
  return 'element';
}

/** Statut d'une revue (illustrations_statuts) qui sort l'élément des arrivages */
const ACCEPTES = new Set(['accepte', 'valide']);
const REFUSES = new Set(['retire', 'a_retravailler']);

/**
 * État d'une nouveauté du code : statut décisif (accepté / validé, retiré / à retravailler) d'abord ; sinon une note (de la clé ou
 * de son illustration de base) vaut acceptation, sauf une dernière note de 1 ★ (tranchée : refusée) ; sinon en attente.
 */
export function etatNouveaute(cle: string, o: {
  statuts: Readonly<Record<string, string | undefined>>;
  /** Dernière note par clé (1 à 5) */
  dernieresNotes: Readonly<Record<string, number | undefined>>;
}): EtatArrivage {
  const s = o.statuts[cle];
  if (s && ACCEPTES.has(s)) return 'accepte';
  if (s && REFUSES.has(s)) return 'refuse';
  const b = baseDeCle(cle);
  const n = o.dernieresNotes[cle] ?? (b ? o.dernieresNotes[b] : undefined);
  if (typeof n === 'number') return n <= 1 ? 'refuse' : 'accepte';
  return 'en_attente';
}

/** État d'une photo libre ou d'une image générée (photos_libres.statut) */
export const etatPhotoLibre = (statut: string): EtatArrivage => (statut === 'validee' ? 'accepte' : statut === 'retiree' ? 'refuse' : 'en_attente');

/** Nouveautés (clés récentes du registre, nouveautes.ts) en attente, dans l'ordre reçu */
export function nouveautesEnAttente(
  recentes: readonly { cle: string; date: string }[],
  o: Parameters<typeof etatNouveaute>[1] & { connues?: { has(cle: string): boolean } },
): { cle: string; date: string }[] {
  return recentes.filter((r) => (!o.connues || o.connues.has(r.cle)) && etatNouveaute(r.cle, o) === 'en_attente');
}

/**
 * Clés que le générateur ne doit pas utiliser (registre d'exclusion, contexte-images.ts) : nouveautés en attente ou refusées dans
 * les arrivages (le refus d'une police, d'un menu… n'était jusqu'ici exclu que par une note de 1 ★).
 */
export function clesExcluesArrivages(
  recentes: readonly { cle: string; date: string }[],
  o: Parameters<typeof etatNouveaute>[1],
): string[] {
  return recentes.filter((r) => etatNouveaute(r.cle, o) !== 'accepte').map((r) => r.cle);
}

/** Statut à remettre pour annuler une décision sur une nouveauté : le précédent, sinon « À revoir » (de nouveau en attente) */
export const statutAnnulation = (precedent: string | null | undefined) => (precedent && precedent !== 'accepte' && precedent !== 'retire' ? precedent : 'a_revoir');

/** Geste au clavier : A / → accepter, R / ← refuser */
export function gesteClavier(touche: string): 'accepter' | 'refuser' | null {
  if (touche === 'a' || touche === 'A' || touche === 'ArrowRight') return 'accepter';
  if (touche === 'r' || touche === 'R' || touche === 'ArrowLeft') return 'refuser';
  return null;
}

/** Geste au doigt : glissement horizontal au-delà du seuil (px), vers la droite = accepter */
export function gesteGlisse(dx: number, dy: number, seuil = 90): 'accepter' | 'refuser' | null {
  if (Math.abs(dx) < seuil || Math.abs(dy) > Math.abs(dx)) return null;
  return dx > 0 ? 'accepter' : 'refuser';
}
