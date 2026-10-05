import { definitionChamp, validerPersonnalisation } from '@plateforme/core';

/**
 * Textes de l'éditeur visuel à enregistrer. Sans l'option « édition », les textes des zones guidées déjà enregistrés
 * sont conservés tels quels (ils ne sont simplement plus publiés : la construction du site les écarte) ; ils
 * reviennent en ligne si l'option est réactivée. Les nouveaux textes passent devant.
 */
export function textesAConserver(anciens: unknown, nouveaux: Record<string, string>, edition: boolean): Record<string, string> {
  if (edition) return nouveaux;
  const guides = Object.entries(validerPersonnalisation(anciens, true).textes).filter(([cle]) => definitionChamp(cle)?.niveau === 'guide');
  return { ...Object.fromEntries(guides), ...nouveaux };
}

/** Remarques à montrer : seulement pour les zones modifiées dans cette session (pas pour les textes conservés). */
export function refusDesModifiees(refus: Record<string, string>, modifiees: string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(refus).filter(([cle]) => modifiees.includes(cle)));
}
