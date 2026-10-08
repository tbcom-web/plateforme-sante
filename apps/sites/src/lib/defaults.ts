// Textes par défaut par profession (accroche, FAQ générale), utilisés tant que le praticien ne les a pas personnalisés : pack
// de la profession (packages/core/src/packs-professions.ts). Profession inconnue : pack de la profession par défaut.
import { packProfession } from '@plateforme/core';

export const defautsProfession = (slug: string) => packProfession(slug).defauts;

/** Titre professionnel du pays dans le pack de la profession (« Pédicure-podologue », « Podologue ES », « Psychomotricien ») */
export const titreMetierProfession = (slug: string, pays: 'FR' | 'BE' | 'CH'): string | undefined => packProfession(slug).titre[pays];
