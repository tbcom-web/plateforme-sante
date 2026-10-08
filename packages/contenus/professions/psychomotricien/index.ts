// PACK DE CONTENUS « PSYCHOMOTRICIEN » (demande de Paul du 2026-10-08 : première nouvelle profession).
// Statut : EN PRÉPARATION — non publiable avant relecture de Paul et d'un psychomotricien diplômé d'État.
// Recherche réglementaire et sources : docs/professions/psychomotricien.md. Format : LISEZMOI.md.

import { FICHES_PSYCHOMOT, TEXTE_CONTRAT_PCO } from './fiches';
import { FAQ_PSYCHOMOT, PAGES_PSYCHOMOT, PRISE_EN_CHARGE } from './pages';
import { PARCOURS_PSYCHOMOTRICIEN, PRATIQUE_PSYCHOMOTRICIEN } from './pratique';
import { SOURCES_PSYCHOMOT } from './sources';
import { MENTIONS_PSYCHOMOT, ONBOARDING_PSYCHOMOT, PACK_SITE_PSYCHOMOT, VOCABULAIRE_PSYCHOMOT } from './textes';
import type { StatutPack } from './types';
import {
  CONTRAINTES_NEGATIVES_PSYCHOMOT, MOTIF_SIGNATURE_PSYCHOMOT, MOTIFS_INTERDITS_PSYCHOMOT, PICTOS_A_DESSINER, SCENE_SALLE_PSYCHOMOT,
  SCENES_FICHES_PSYCHOMOT, SCENES_SUJETS_PSYCHOMOT, VISUELS_PSYCHOMOT,
} from './visuels';

export const PACK_PSYCHOMOTRICIEN = {
  profession: 'psychomotricien',
  statut: 'en-preparation' as StatutPack,
  date: '2026-10-09',
  /** Points à faire relire avant de passer le statut à « relu » (docs/professions/psychomotricien.md §8) */
  aRelire: [
    'Bascule ADELI → RPPS du 13/03/2024 (page esante.gouv.fr non lue directement).',
    'Code du diplôme d’État dans l’Annuaire Santé (non vérifié).',
    'Obligation de publier les tarifs sur le site (arrêté du 30/05/2018, texte intégral à relire).',
    'Formulations des fiches « tonus, émotions et relaxation » et « image du corps » ; thème « santé mentale » différé.',
    'Personnes âgées : aucune source officielle ne nomme le psychomotricien dans la prévention des chutes (le site n’en parle pas).',
    'Accueil sans prescription en pratique : le site écrit « sur prescription médicale » seulement.',
    'Comparaison avec l’orthophoniste et l’ergothérapeute (FAQ) : à relire par un professionnel.',
    'Belgique et Suisse : non recherchés (« [à rédiger] » dans le pack site).',
  ],
  sources: SOURCES_PSYCHOMOT,
  packSite: PACK_SITE_PSYCHOMOT,
  pratique: PRATIQUE_PSYCHOMOTRICIEN,
  parcours: PARCOURS_PSYCHOMOTRICIEN,
  pages: PAGES_PSYCHOMOT,
  priseEnCharge: PRISE_EN_CHARGE,
  fiches: FICHES_PSYCHOMOT,
  texteContratPco: TEXTE_CONTRAT_PCO,
  faq: FAQ_PSYCHOMOT,
  mentions: MENTIONS_PSYCHOMOT,
  onboarding: ONBOARDING_PSYCHOMOT,
  vocabulaire: VOCABULAIRE_PSYCHOMOT,
  visuels: {
    liste: VISUELS_PSYCHOMOT,
    scenesSujets: SCENES_SUJETS_PSYCHOMOT,
    scenesFiches: SCENES_FICHES_PSYCHOMOT,
    sceneSalle: SCENE_SALLE_PSYCHOMOT,
    contraintesNegatives: CONTRAINTES_NEGATIVES_PSYCHOMOT,
    motifsInterdits: MOTIFS_INTERDITS_PSYCHOMOT,
    pictos: PICTOS_A_DESSINER,
    motif: MOTIF_SIGNATURE_PSYCHOMOT,
  },
} as const;

/** Un pack « en préparation » n'est jamais publiable */
export const packPsychomotPubliable = () => PACK_PSYCHOMOTRICIEN.statut === 'publiable';

export { controlerPackPsychomot } from './controle';
