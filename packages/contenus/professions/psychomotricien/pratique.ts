// Pratique « psychomotricien » au format de pratiques.ts (PratiqueProfession) : thèmes, médiations (activités), publics, profils
// de référence. À brancher dans PRATIQUES (packages/core/src/pratiques.ts) quand le pack sera relu ; en attendant, contrôlée par
// controlerPratique (controle.ts).
//
// Thèmes rattachés au décret d'actes (CSP R4332-1, [csp-r4332-1]) : chaque thème ne regroupe que des actes listés par l'article
// (2° éducation précoce, 3° a à l, 4° contribution par approche corporelle). Pas d'âge limite dans le décret : bébés, enfants,
// adolescents, adultes, personnes âgées.
// Thème « sante-mentale » DIFFÉRÉ (actif: false) : le 4° parle de « contribution » au traitement ; formulations à valider par un
// psychomotricien avant de le proposer. Thème « relaxation » actif mais présenté uniquement comme moyen d'un suivi prescrit
// (« techniques de relaxation dynamique », R4332-1 3°), jamais comme offre de bien-être.

import type { PratiqueProfession } from '@plateforme/core';

export const PRATIQUE_PSYCHOMOTRICIEN: PratiqueProfession = {
  profession: 'psychomotricien',
  vocabulaire: { metier: 'psychomotricien', discipline: 'psychomotricité', generaliste: 'un cabinet de psychomotricité' },
  themes: [
    { id: 'petite-enfance', libelle: 'Bébés et petite enfance', court: 'Bébés', sujetVisuel: 'petite-enfance', pour: 'la petite enfance', actif: true,
      soins: ['developpement-du-tout-petit', 'bilan-psychomoteur', 'tonus-emotions-relaxation'] },
    { id: 'apprentissages', libelle: 'Enfants : motricité et apprentissages', court: 'Enfants', sujetVisuel: 'apprentissages', pour: 'les enfants', actif: true,
      soins: ['maladresse-coordination', 'espace-temps-schema-corporel', 'attention-agitation', 'bilan-psychomoteur', 'reeducation-psychomotrice'] },
    { id: 'graphomotricite', libelle: 'Écriture et graphisme (graphomotricité)', court: 'Écriture', sujetVisuel: 'ecriture', pour: 'le geste d’écrire', actif: true,
      soins: ['graphomotricite', 'maladresse-coordination', 'bilan-psychomoteur'] },
    { id: 'tnd', libelle: 'Troubles du neurodéveloppement', court: 'TND', sujetVisuel: 'tnd', pour: 'les troubles du neurodéveloppement', actif: true,
      soins: ['parcours-pco', 'bilan-psychomoteur', 'maladresse-coordination', 'attention-agitation', 'developpement-du-tout-petit'] },
    { id: 'adolescents', libelle: 'Adolescents', court: 'Ados', sujetVisuel: 'adolescents', pour: 'les adolescents', actif: true,
      soins: ['tonus-emotions-relaxation', 'image-du-corps', 'graphomotricite', 'reeducation-psychomotrice'] },
    { id: 'adultes', libelle: 'Adultes', court: 'Adultes', sujetVisuel: 'adultes', pour: 'les adultes', actif: true,
      soins: ['tonus-emotions-relaxation', 'image-du-corps', 'reeducation-psychomotrice'] },
    { id: 'seniors', libelle: 'Personnes âgées : équilibre et autonomie', court: 'Seniors', sujetVisuel: 'seniors', pour: 'les personnes âgées', actif: true,
      soins: ['equilibre-marche-age', 'bilan-psychomoteur', 'reeducation-psychomotrice'] },
    { id: 'relaxation', libelle: 'Tonus, émotions et relaxation', court: 'Relaxation', sujetVisuel: 'relaxation', pour: 'la régulation du tonus et des émotions', actif: true,
      soins: ['tonus-emotions-relaxation', 'reeducation-psychomotrice'] },
    { id: 'sante-mentale', libelle: 'Santé mentale : approche corporelle', court: 'Santé psy', sujetVisuel: 'adultes', pour: 'la santé mentale', actif: false,
      soins: ['image-du-corps', 'tonus-emotions-relaxation'] },
  ],
  // Médiations (outils des séances, R4332-1 3° : relaxation dynamique, éducation gestuelle, expression corporelle ou plastique,
  // activités rythmiques, de jeu, d'équilibration et de coordination). `scene` absent : aucune scène dessinée existante.
  activites: [
    { id: 'jeu-moteur', libelle: 'Jeux et parcours de motricité', court: 'parcours moteur', hashtags: ['motricite', 'parcours-moteur'], themes: ['petite-enfance', 'apprentissages', 'tnd'],
      soins: ['maladresse-coordination', 'developpement-du-tout-petit'], requetes: ['children motor skills obstacle course mats', 'soft play foam blocks'],
      precision: 'parcours de motricité en mousse colorée dans une salle claire, sans enfant identifiable' },
    { id: 'motricite-fine', libelle: 'Motricité fine et construction', court: 'motricité fine', hashtags: ['motricite-fine'], themes: ['petite-enfance', 'apprentissages', 'graphomotricite', 'tnd'],
      soins: ['maladresse-coordination', 'graphomotricite'], requetes: ['child hands wooden blocks', 'hands stacking wooden shapes'],
      precision: 'mains d’enfant qui empilent des formes en bois sur une table claire, cadrage serré sur les mains' },
    { id: 'graphisme', libelle: 'Graphisme et écriture', court: 'graphisme', hashtags: ['graphomotricite', 'ecriture'], themes: ['graphomotricite', 'apprentissages', 'adolescents'],
      soins: ['graphomotricite'], requetes: ['child hand pencil drawing lines', 'pencil grip paper loops'],
      precision: 'main qui trace des boucles au crayon sur une grande feuille, cadrage sur la main et la feuille' },
    { id: 'equilibre-coordination', libelle: 'Équilibre et coordination', court: 'équilibre', hashtags: ['equilibre', 'coordination'], themes: ['apprentissages', 'seniors', 'tnd'],
      soins: ['equilibre-marche-age', 'maladresse-coordination'], requetes: ['balance beam low feet', 'feet walking on a line'],
      precision: 'pieds qui avancent sur une poutre basse ou une ligne au sol, vue de côté au ras du sol' },
    { id: 'relaxation', libelle: 'Relaxation et conscience du corps', court: 'relaxation', hashtags: ['relaxation', 'tonus'], themes: ['relaxation', 'adolescents', 'adultes'],
      soins: ['tonus-emotions-relaxation'], requetes: ['person lying on mat relaxation', 'hands resting on belly breathing'],
      precision: 'personne allongée sur un tapis, mains posées sur le ventre, tête hors cadre, lumière douce' },
    { id: 'rythme-expression', libelle: 'Rythme et expression corporelle', court: 'rythme', hashtags: ['rythme', 'expression-corporelle'], themes: ['petite-enfance', 'apprentissages', 'adolescents'],
      soins: ['espace-temps-schema-corporel', 'reeducation-psychomotrice'], requetes: ['hand drum rhythm', 'colorful scarves movement'],
      precision: 'petit tambourin et foulards colorés posés sur un tapis de salle de motricité' },
    { id: 'marche', libelle: 'Marche et déplacements', court: 'marche', hashtags: ['marche', 'autonomie'], themes: ['seniors'],
      soins: ['equilibre-marche-age'], requetes: ['older adult walking hallway handrail', 'senior feet walking indoor'],
      precision: 'pieds d’une personne âgée en chaussures fermées qui marche dans un couloir clair, main sur la rampe' },
  ],
  publics: [
    { id: 'bebes', libelle: 'Bébés et tout-petits', themes: ['petite-enfance'] },
    { id: 'enfants', libelle: 'Enfants', themes: ['apprentissages', 'graphomotricite', 'tnd'] },
    { id: 'adolescents', libelle: 'Adolescents', themes: ['adolescents'] },
    { id: 'adultes', libelle: 'Adultes', themes: ['adultes', 'relaxation'] },
    { id: 'personnes-agees', libelle: 'Personnes âgées', themes: ['seniors'] },
  ],
  profils: [
    { id: 'petite-enfance', court: 'Petite enfance', principal: 'petite-enfance', secondaires: ['tnd'], activites: ['jeu-moteur', 'rythme-expression'], publics: ['bebes'] },
    { id: 'enfant-apprentissages', court: 'Enfant · apprentissages', principal: 'apprentissages', secondaires: ['graphomotricite'], activites: ['jeu-moteur', 'motricite-fine'], publics: ['enfants'] },
    { id: 'ecriture', court: 'Écriture', principal: 'graphomotricite', secondaires: ['apprentissages'], activites: ['graphisme', 'motricite-fine'], publics: ['enfants', 'adolescents'] },
    { id: 'tnd-pco', court: 'TND · parcours PCO', principal: 'tnd', secondaires: ['petite-enfance', 'apprentissages'], activites: ['jeu-moteur', 'motricite-fine'], publics: ['bebes', 'enfants'] },
    { id: 'ados-adultes', court: 'Ados et adultes', principal: 'adolescents', secondaires: ['adultes', 'relaxation'], activites: ['relaxation'], publics: ['adolescents', 'adultes'] },
    { id: 'seniors', court: 'Personnes âgées', principal: 'seniors', secondaires: [], activites: ['equilibre-coordination', 'marche'], publics: ['personnes-agees'] },
    { id: 'generaliste', court: 'Généraliste', principal: null, secondaires: [], activites: [], publics: [] },
  ],
};

/**
 * Entrée proposée pour le parcours client (forme de ProfessionParcours, packages/core/src/onboarding-professions.ts, agent
 * Onboarding). Code TRE_G15 96 vérifié ([ans-tre-g15]) ; bascule ADELI → RPPS le 13/03/2024 ([ans-bascule-adeli], à revérifier) ;
 * code de diplôme d'État de l'annuaire NON vérifié : laissé vide. `disponible: false` tant que le pack n'est pas relu.
 */
export const PARCOURS_PSYCHOMOTRICIEN = {
  id: 'psychomotricien',
  libelle: 'Psychomotricien ou psychomotricienne',
  codesRpps: ['96'],
  disponible: false,
  codesDiplomeEtat: [] as string[],
  diplomeEtat: 'Diplôme d’État de psychomotricien',
  // Angles tirés d'un diplôme universitaire réel de l'annuaire (rien n'est coché sans donnée réelle)
  angles: [
    { motif: /g[ée]riatr|g[ée]ronto|personne[s]? [âa]g[ée]e/i, theme: 'seniors' },
    { motif: /p[ée]rinat|petite enfance|b[ée]b[ée]/i, theme: 'petite-enfance' },
    { motif: /autis|neurod[ée]velop|\bTND\b|\bTSA\b/i, theme: 'tnd' },
  ],
} as const;
