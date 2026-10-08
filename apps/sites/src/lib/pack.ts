// Pack de la profession du site (packages/core/src/packs-professions.ts) : textes propres au métier (discipline du titre
// « Cabinet de … », instance, diplôme, règles professionnelles, lien du pied de page, nom générique du cabinet). Aucun mot de
// métier codé en dur dans les gabarits : tout vient d'ici (docs/architecture-professions.md).
import { packProfession } from '@plateforme/core';
import { site } from './site';

export const pack = packProfession(site.profession.slug);
/** « pédicurie-podologie » (FR), « podologie » (BE, CH), « psychomotricité »… */
export const discipline = pack.discipline[site.pays];
/** Lien de l'instance professionnelle dans le pied de page (absent : aucun lien) */
export const lienInstance = pack.lienInstance[site.pays];
