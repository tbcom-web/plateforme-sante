// Visuels animés du premier écran (retour de Paul du 2026-10-08 : « quand je note / A-B teste les illustrations, je ne vois pas
// d'animations ») : les animations sont traitées comme des illustrations de héros. Module PUR.
//
// VERSION MINIMALE (en attendant `visuelsHerosAnimes` de l'agent des animations de héros, à qui elle laissera la place) : les
// animations de l'inventaire (type `animation`, clé `animation:<nom>`) d'un sujet, leur état (animations-sources.ts : en attente
// tant qu'un ingrédient de base n'est pas validé) et leur image fixe (le rendu SVG figé de l'asset, clé de duel `<clé>@fige`).
// Admissible en duel / tuile : pas « en attente » (images de base validées), jamais retirée.
//
// Option `heros` (heros-anime.ts, visuel animé du premier écran) : ajoute les animations qui tiennent EN GRAND à la place de
// l'illustration du héros — empreintes en lignes de niveau (em-*, dérivées des géométries validées), taches, onde, formes
// géométriques, animations d'illustrations (il-*, seulement une fois leurs images de base validées) — clé notable
// `composant:entete-anim:<a>`, `rendu: 'entete'` et leur image fixe en HTML + feuille (`fixe`, qui est aussi la dernière image
// de la lecture). Sans l'option : inchangé (animations de l'inventaire seulement).
import { animationDeCle, etatAnimation } from './animations-sources';
import { animationsHerosDuSujet, statutAnimationHeros } from './heros-anime';
import { ANIMATIONS_HEROS, LIBELLES_ANIMATIONS_ENTETE } from './heros-photo-variantes';
import type { Asset } from './assets';

export type VisuelHerosAnime = {
  cle: string; titre: string; animation: string; admissible: boolean; enAttente: boolean; imageFixe: string;
  /** Animation d'en-tête jouée en visuel du héros (option `heros`) : rendue par htmlVisuelAnime, pas par l'asset */
  rendu?: 'asset' | 'entete';
  /** Image fixe en HTML + feuille (animations d'en-tête) */
  fixe?: { html: string; css: string };
  /** « à valider » : montrée à Paul avec le badge, jamais à un praticien */
  aValider?: boolean;
};

/** Clé de duel de l'image fixe d'une animation (« l'animation apporte-t-elle quelque chose ? ») */
export const cleImageFixe = (cle: string) => `${cle}@fige`;
export const estImageFixe = (cle: string) => /^animation:[^\s@]+@fige$/.test(cle);
export const animationDeImageFixe = (cle: string) => (estImageFixe(cle) ? cle.slice(0, -5) : null);

/**
 * Animations de héros d'un sujet. `sujetsDe` : sujets effectifs d'un visuel (sujetsDuVisuel, surcharges de Paul comprises) ;
 * `statuts` : statuts de la bibliothèque (Validé, À retravailler, Retiré…).
 */
export function visuelsHerosAnimes(sujet: string, o: { assets: readonly Asset[]; sujetsDe: (a: Asset) => readonly string[]; statuts?: Readonly<Record<string, string>>; heros?: boolean }): VisuelHerosAnime[] {
  const statuts = (o.statuts ?? {}) as Record<string, never>;
  const entete: VisuelHerosAnime[] = !o.heros ? [] : ANIMATIONS_HEROS.flatMap((a) => {
    // Disponibles pour le sujet (les vives jamais pour le diabète ni les seniors) ; il-* en attente : listées, jamais admissibles
    const dispo = animationsHerosDuSujet(sujet, { statuts }).find((x) => x.animation === a);
    const statut = statutAnimationHeros(a, { statuts });
    if (!dispo && statut !== 'ingredients-en-attente') return [];
    const cle = `composant:entete-anim:${a}`;
    const enAttente = statut === 'ingredients-en-attente';
    return [{ cle, titre: LIBELLES_ANIMATIONS_ENTETE[a], animation: a, enAttente, admissible: !enAttente && o.statuts?.[cle] !== 'retire', imageFixe: cleImageFixe(cle), rendu: 'entete' as const, aValider: statut === 'a-valider', ...(dispo ? { fixe: dispo.imageFixe } : {}) }];
  });
  return [...entete, ...o.assets.filter((a) => a.type === 'animation' && o.sujetsDe(a).includes(sujet)).flatMap((a) => {
    const nom = animationDeCle(a.cle);
    if (!nom) return [];
    const e = etatAnimation(nom, statuts);
    const retiree = o.statuts?.[a.cle] === 'retire';
    return [{ cle: a.cle, titre: a.titre, animation: nom, enAttente: e.enAttente, admissible: !e.enAttente && !retiree, imageFixe: cleImageFixe(a.cle) }];
  })];
}
