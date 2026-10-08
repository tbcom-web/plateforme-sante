// Pratique « psychomotricien » (thèmes, médiations, publics, profils de référence) et entrée du parcours client : BRANCHÉES dans
// le core depuis le 2026-10-09 (source unique) — PRATIQUE_PSYCHOMOTRICIEN dans packages/core/src/pratiques.ts (thèmes dans
// themes.ts, THEMES_AUTRES_PROFESSIONS) et l'entrée « psychomotricien » de PROFESSIONS_PARCOURS
// (packages/core/src/onboarding-professions.ts : code TRE_G15 96, questions du métier dont « contrat PCO »). Le pack les
// réexporte et les contrôle (controle.ts : controlerPratique, questions identiques à ONBOARDING_PSYCHOMOT).
//
// Thèmes rattachés au décret d'actes (CSP R4332-1, [csp-r4332-1]) : chaque thème ne regroupe que des actes listés par l'article
// (2° éducation précoce, 3° a à l, 4° contribution par approche corporelle). Pas d'âge limite dans le décret : bébés, enfants,
// adolescents, adultes, personnes âgées.
// Thème « sante-mentale » DIFFÉRÉ (actif: false) : le 4° parle de « contribution » au traitement ; formulations à valider par un
// psychomotricien avant de le proposer. Thème « relaxation » actif mais présenté uniquement comme moyen d'un suivi prescrit
// (« techniques de relaxation dynamique », R4332-1 3°), jamais comme offre de bien-être.
// Statut : la profession reste EN PRÉPARATION (professions.ts) et `disponible: false` (jamais ouverte au public).

import { PRATIQUE_PSYCHOMOTRICIEN } from '@plateforme/core';
import { professionParcours, type ProfessionParcours } from '@plateforme/core/onboarding-professions';

export { PRATIQUE_PSYCHOMOTRICIEN };

/** Entrée du parcours client (core, onboarding-professions.ts) */
export const PARCOURS_PSYCHOMOTRICIEN: ProfessionParcours = professionParcours('psychomotricien')!;
