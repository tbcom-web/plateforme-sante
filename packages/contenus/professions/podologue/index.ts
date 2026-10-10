// PACK COMPLÉMENTAIRE « PÉDICURE-PODOLOGUE » (demande de Paul du 2026-10-10) : contenus ajoutés à une profession déjà ouverte,
// sans toucher à ses pages ni à son catalogue de soins (table soins_catalogue) :
// - articles pré-écrits (articles.ts) : revus dans les Arrivages, puis importés en brouillon dans le flux (/admin/flux) ;
// - fiches conseils pour les patients (conseils.ts, format ConseilPatient du core) : revues dans les Arrivages, puis servies aux
//   sites publiés (bloc « Fiches conseils » des pages de soin, page /conseils) seulement une fois acceptées pour leur texte actuel.
// Statut « complement » : la progression compte ces contenus, mais le pack ne ferme jamais la profession (progressionPack).
// Structure réutilisable : une autre profession ajoute `articles` et `conseils` à son propre pack, avec les mêmes formats.

import { ARTICLES_PODOLOGUE } from './articles';
import { CONSEILS_PODOLOGUE } from './conseils';
import { SOURCES_PODOLOGUE } from './sources';

export const PACK_PODOLOGUE = {
  profession: 'podologue',
  statut: 'complement' as 'complement',
  date: '2026-10-10',
  sources: SOURCES_PODOLOGUE,
  articles: ARTICLES_PODOLOGUE,
  conseils: CONSEILS_PODOLOGUE,
} as const;

export { controlerPackPodologue } from './controle';
export { ARTICLES_PODOLOGUE, CONSEILS_PODOLOGUE };
