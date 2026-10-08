// Personas du MODE CLIENT TEST (super admin) : points de départ en un clic, données de DÉMONSTRATION fictives (fiches de
// l'annuaire de démonstration, packages/core/src/annuaire-sante.ts). Jamais un vrai praticien.
import type { EtapeOnboarding } from '@plateforme/core/onboarding';

export type PersonaTest = {
  id: string;
  titre: string;
  /** Fiche de démonstration de l'annuaire (persona de DEMOS_ANNUAIRE), null = parcours vierge */
  fiche: string | null;
  sujets: { principaux: string[]; secondaires: string[] };
  activites: string[];
  couleurs: string[];
};

export const PERSONAS_TEST: readonly PersonaTest[] = [
  { id: 'vierge', titre: 'Vierge', fiche: null, sujets: { principaux: [], secondaires: [] }, activites: [], couleurs: [] },
  { id: 'sport-basket', titre: 'Sport · basket', fiche: 'sport-basket', sujets: { principaux: ['sport', 'semelles'], secondaires: ['ongles'] }, activites: ['basket', 'course'], couleurs: ['bleu'] },
  { id: 'diabete-senior', titre: 'Diabète senior', fiche: 'diabete-senior', sujets: { principaux: ['diabete', 'senior'], secondaires: ['pedicurie'] }, activites: [], couleurs: ['vert'] },
  { id: 'enfant', titre: 'Enfant', fiche: 'enfant', sujets: { principaux: ['enfant', 'semelles'], secondaires: [] }, activites: [], couleurs: ['jaune', 'turquoise'] },
];

/** Étapes où le mode test peut sauter directement (les réponses précédentes viennent du persona) */
export const ETAPES_SAUT_TEST: readonly { id: EtapeOnboarding; titre: string }[] = [
  { id: 'identite', titre: 'Vos informations' },
  { id: 'sujets', titre: 'Vos sujets' },
  { id: 'activites', titre: 'Vos activités' },
  { id: 'couleurs', titre: 'Vos couleurs' },
  { id: 'style', titre: 'Choisissez votre style' },
];
