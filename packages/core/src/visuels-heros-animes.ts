// Visuels animés du premier écran (retour de Paul du 2026-10-08 : « quand je note / A-B teste les illustrations, je ne vois pas
// d'animations ») : les animations sont traitées comme des illustrations de héros. Module PUR.
//
// VERSION MINIMALE (en attendant `visuelsHerosAnimes` de l'agent des animations de héros, à qui elle laissera la place) : les
// animations de l'inventaire (type `animation`, clé `animation:<nom>`) d'un sujet, leur état (animations-sources.ts : en attente
// tant qu'un ingrédient de base n'est pas validé) et leur image fixe (le rendu SVG figé de l'asset, clé de duel `<clé>@fige`).
// Admissible en duel / tuile : pas « en attente » (images de base validées), jamais retirée.
import { animationDeCle, etatAnimation } from './animations-sources';
import type { Asset } from './assets';

export type VisuelHerosAnime = { cle: string; titre: string; animation: string; admissible: boolean; enAttente: boolean; imageFixe: string };

/** Clé de duel de l'image fixe d'une animation (« l'animation apporte-t-elle quelque chose ? ») */
export const cleImageFixe = (cle: string) => `${cle}@fige`;
export const estImageFixe = (cle: string) => /^animation:[^\s@]+@fige$/.test(cle);
export const animationDeImageFixe = (cle: string) => (estImageFixe(cle) ? cle.slice(0, -5) : null);

/**
 * Animations de héros d'un sujet. `sujetsDe` : sujets effectifs d'un visuel (sujetsDuVisuel, surcharges de Paul comprises) ;
 * `statuts` : statuts de la bibliothèque (Validé, À retravailler, Retiré…).
 */
export function visuelsHerosAnimes(sujet: string, o: { assets: readonly Asset[]; sujetsDe: (a: Asset) => readonly string[]; statuts?: Readonly<Record<string, string>> }): VisuelHerosAnime[] {
  const statuts = (o.statuts ?? {}) as Record<string, never>;
  return o.assets.filter((a) => a.type === 'animation' && o.sujetsDe(a).includes(sujet)).flatMap((a) => {
    const nom = animationDeCle(a.cle);
    if (!nom) return [];
    const e = etatAnimation(nom, statuts);
    const retiree = o.statuts?.[a.cle] === 'retire';
    return [{ cle: a.cle, titre: a.titre, animation: nom, enAttente: e.enAttente, admissible: !e.enAttente && !retiree, imageFixe: cleImageFixe(a.cle) }];
  });
}
