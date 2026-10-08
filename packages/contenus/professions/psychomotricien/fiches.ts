// Fiches « pour quels troubles » et actes : forme de la table soins_catalogue (slug, titre_court, titre, resume, corps, faq),
// + sources, thèmes et picto. `bilan-psychomoteur` et `reeducation-psychomotrice` reprennent les slugs des soins de
// démonstration du pack provisoire (packages/core/src/packs-professions.ts, soinsDemo).
//
// Règles de rédaction (docs/professions/psychomotricien.md §7) : aucun diagnostic posé par le psychomotricien (le bilan
// psychomoteur n'est pas un diagnostic médical) ; la lecture et l'orthographe relèvent de l'orthophoniste (R4332-1 3° l exclut
// « la rééducation du langage écrit ») ; aucune promesse ; « sur prescription médicale » ([csp-r4332-1]).
// Chaque liste de troubles reprend les termes de R4332-1 3° (a à l) et 4°, reformulés pour les parents ([csp-r4332-1]).

import type { FicheMotif } from './types';

const PRESCRIPTION = 'Les séances sont réalisées sur prescription médicale. Le médecin reste l’interlocuteur pour le diagnostic et le suivi médical.';

export const FICHES_PSYCHOMOT: readonly FicheMotif[] = [
  {
    slug: 'bilan-psychomoteur', titreCourt: 'Bilan psychomoteur', titre: 'Bilan psychomoteur à {ville}', picto: 'bilan-psychomoteur',
    themes: ['petite-enfance', 'apprentissages', 'graphomotricite', 'tnd', 'seniors'], sources: ['csp-r4332-1'],
    resume: 'Une évaluation du développement et des fonctions psychomotrices, sur prescription médicale, avant tout suivi.',
    corps: `## À quoi sert le bilan psychomoteur ?

Le bilan décrit comment la personne utilise son corps pour bouger, agir, apprendre et entrer en relation : coordination, équilibre, motricité fine, tonus, repérage dans l’espace et dans le temps, image du corps, attention.

Il ne pose pas de diagnostic médical : le diagnostic relève du médecin. Le bilan aide à décider, avec le médecin, si un suivi en psychomotricité est utile et sur quels objectifs.

## Déroulement

1. **Entretien** avec la personne, ou avec les parents pour un enfant : histoire du développement, vie quotidienne, école ou travail, demande du médecin.
2. **Épreuves et observations** sous forme de jeux, de tracés, d’exercices d’équilibre ou de coordination, adaptés à l’âge.
3. **Compte rendu écrit**, remis à la famille et transmis au médecin prescripteur, puis échange sur les suites possibles.

Le bilan se déroule en une ou plusieurs rencontres selon l’âge et la situation.

## À apporter

L’ordonnance du médecin, le carnet de santé pour un enfant, les comptes rendus déjà réalisés (orthophonie, ergothérapie, psychologie, médecin), et pour un enfant scolarisé quelques cahiers ou productions écrites.`,
    faq: [
      { q: 'Faut-il une ordonnance pour un bilan psychomoteur ?', r: 'Oui. Le Code de la santé publique prévoit que le psychomotricien intervient sur prescription médicale, après un examen par le médecin.', sources: ['csp-r4332-1'] },
      { q: 'Le bilan psychomoteur est-il un diagnostic ?', r: 'Non. Il décrit le développement et les fonctions psychomotrices. Le diagnostic, par exemple d’un trouble du neurodéveloppement, est posé par le médecin.', sources: ['csp-r4332-1'] },
      { q: 'Combien de temps dure le bilan ?', r: 'La durée est indiquée par le cabinet : {duree_bilan}. Le compte rendu écrit est remis ensuite.' },
    ],
  },
  {
    slug: 'reeducation-psychomotrice', titreCourt: 'Séances de psychomotricité', titre: 'Séances de psychomotricité à {ville}', picto: 'seance',
    themes: ['apprentissages', 'adolescents', 'adultes', 'seniors', 'relaxation'], sources: ['csp-r4332-1'],
    resume: 'Un suivi en séances individuelles ou en petit groupe, sur des objectifs fixés après le bilan, avec des points d’étape réguliers.',
    corps: `## Comment se passent les séances ?

Après le bilan, des objectifs sont fixés avec la personne, ou avec la famille pour un enfant. Les séances passent par le mouvement et le jeu : parcours de motricité, jeux de coordination et d’équilibre, activités de construction, graphisme, rythme, expression corporelle, relaxation.

Le rythme et la durée du suivi dépendent des objectifs et sont revus régulièrement. Des points d’étape sont faits avec la famille et, si besoin, avec le médecin, l’école ou les autres professionnels qui accompagnent la personne.

## Séances individuelles ou en groupe

Selon les besoins, les séances sont individuelles ou en petit groupe. La durée d’une séance est indiquée par le cabinet : {duree_seance}.

## Sur prescription médicale

${PRESCRIPTION}`,
    faq: [
      { q: 'Combien de séances faut-il prévoir ?', r: 'Il n’y a pas de nombre fixé à l’avance : il dépend des objectifs fixés après le bilan. Le suivi est réévalué régulièrement avec la famille et le médecin.' },
      { q: 'Les parents assistent-ils aux séances ?', r: 'Cela dépend de l’âge de l’enfant et des objectifs. Un temps d’échange avec les parents est prévu régulièrement.' },
    ],
  },
  {
    slug: 'developpement-du-tout-petit', titreCourt: 'Développement du tout-petit', titre: 'Psychomotricité du bébé et du tout-petit à {ville}', picto: 'tout-petit',
    themes: ['petite-enfance', 'tnd'], sources: ['csp-r4332-1'],
    resume: 'Éducation précoce et stimulation psychomotrice quand le développement moteur ou le tonus d’un bébé inquiète le médecin.',
    corps: `## Pour quelles situations ?

Le médecin peut prescrire un bilan psychomoteur quand il constate, chez un bébé ou un jeune enfant :

- un retard dans les acquisitions motrices (tenir sa tête, s’asseoir, se déplacer, marcher) ;
- un tonus inhabituel, un bébé très raide ou au contraire peu tonique ;
- des difficultés à s’apaiser, à explorer ou à entrer en relation par le corps et le regard.

## Ce que fait le psychomotricien

Le Code de la santé publique prévoit l’« éducation précoce et stimulation psychomotrices » et la rééducation des retards du développement psychomoteur et des troubles de la régulation tonique. Les séances se font avec les parents, par le jeu, le portage, les changements de position et l’exploration de l’environnement.

## Sur prescription médicale

${PRESCRIPTION}`,
    faq: [
      { q: 'À partir de quel âge un bébé peut-il être suivi ?', r: 'Les textes ne fixent pas d’âge minimum : un bébé peut être vu dès les premiers mois, sur prescription médicale.', sources: ['csp-r4332-1'] },
      { q: 'Les parents participent-ils ?', r: 'Oui, pour les tout-petits les séances se font avec un parent, qui peut reprendre certains jeux à la maison.' },
    ],
  },
  {
    slug: 'maladresse-coordination', titreCourt: 'Maladresse et coordination', titre: 'Maladresse et troubles de la coordination à {ville}', picto: 'coordination',
    themes: ['apprentissages', 'tnd', 'graphomotricite'], sources: ['csp-r4332-1'],
    resume: 'Un enfant qui tombe souvent, peine à s’habiller, à faire du vélo ou à découper : un bilan pour comprendre ses difficultés de coordination.',
    corps: `## Signes qui amènent à consulter

- gestes lents ou imprécis dans la vie quotidienne : s’habiller, lacer ses chaussures, utiliser des couverts ;
- difficultés dans les jeux de ballon, le vélo, les jeux de cour ;
- difficultés à découper, coller, dessiner, écrire ;
- fatigue ou découragement devant ces activités.

## Ce que dit le cadre légal

Le psychomotricien prend en charge, sur prescription médicale, les « maladresses motrices et gestuelles » et les dyspraxies (Code de la santé publique). Le diagnostic d’un trouble développemental de la coordination est posé par le médecin.

## Les séances

Jeux de coordination, d’équilibre et de motricité fine, adaptés à l’âge et aux centres d’intérêt de l’enfant, et conseils pour la maison et l’école.

${PRESCRIPTION}`,
    faq: [
      { q: 'Mon enfant est-il simplement maladroit ?', r: 'Seul un examen médical, complété si besoin par un bilan psychomoteur, permet de le dire. Parlez-en à son médecin.' },
      { q: 'Le psychomotricien travaille-t-il avec l’école ?', r: 'Avec l’accord des parents, il peut échanger avec l’enseignant et proposer des aménagements simples.' },
    ],
  },
  {
    slug: 'graphomotricite', titreCourt: 'Écriture (graphomotricité)', titre: 'Difficultés d’écriture et graphomotricité à {ville}', picto: 'ecriture',
    themes: ['graphomotricite', 'apprentissages', 'adolescents'], sources: ['csp-r4332-1'],
    resume: 'Une écriture lente, douloureuse ou difficile à relire : le psychomotricien travaille le geste d’écrire, pas l’orthographe.',
    corps: `## Signes qui amènent à consulter

- écriture lente, qui ne suit pas le rythme de la classe ;
- tenue du crayon crispée, douleurs à la main ou au poignet ;
- lettres mal formées, lignes irrégulières, écriture difficile à relire ;
- évitement ou fatigue devant l’écrit.

## Le geste d’écrire, pas la langue écrite

Le Code de la santé publique confie au psychomotricien la rééducation des troubles de la graphomotricité, **à l’exclusion de la rééducation du langage écrit**. Le psychomotricien travaille la posture, la tenue de l’outil, le relâchement du geste, la fluidité du tracé et l’organisation sur la feuille. La lecture et l’orthographe relèvent de l’orthophoniste.

## Les séances

Graphisme, jeux de motricité fine, relaxation de la main et du bras, puis transfert vers l’écriture scolaire. Si l’écriture reste très coûteuse, l’usage de l’ordinateur peut être discuté avec l’école et les autres professionnels.

${PRESCRIPTION}`,
    faq: [
      { q: 'Psychomotricien ou orthophoniste pour l’écriture ?', r: 'Le psychomotricien travaille le geste d’écrire (graphomotricité). L’orthophoniste prend en charge la lecture, l’orthographe et la langue écrite. Les deux suivis peuvent se compléter.', sources: ['csp-r4332-1'] },
      { q: 'À quel âge consulter pour l’écriture ?', r: 'Souvent à l’école élémentaire, quand l’écriture devient un outil de travail. Le médecin juge de l’intérêt d’un bilan.' },
    ],
  },
  {
    slug: 'espace-temps-schema-corporel', titreCourt: 'Repères dans l’espace et le temps', titre: 'Schéma corporel, latéralité, repères dans l’espace et le temps à {ville}', picto: 'reperes',
    themes: ['apprentissages', 'tnd'], sources: ['csp-r4332-1'],
    resume: 'Connaître son corps, sa droite et sa gauche, se repérer sur une page ou dans la journée : des bases du quotidien et des apprentissages.',
    corps: `## Signes qui amènent à consulter

- difficultés à nommer ou situer les parties de son corps ;
- confusion entre droite et gauche au-delà de l’âge habituel ;
- difficultés à se repérer sur une feuille, dans un tableau, dans un lieu ;
- difficultés avec le rythme, l’ordre des étapes, la notion de durée.

## Ce que dit le cadre légal

Les troubles du schéma corporel, de la latéralité et de l’organisation spatio-temporelle font partie des troubles que le psychomotricien prend en charge sur prescription médicale (Code de la santé publique).

## Les séances

Jeux corporels, parcours, activités rythmiques et de construction, repérage sur soi puis sur l’espace et la feuille.

${PRESCRIPTION}`,
    faq: [
      { q: 'Mon enfant confond sa droite et sa gauche : faut-il consulter ?', r: 'Ces repères se construisent progressivement. Si la confusion persiste et gêne les apprentissages, parlez-en à son médecin.' },
    ],
  },
  {
    slug: 'attention-agitation', titreCourt: 'Agitation, inhibition, attention', titre: 'Agitation, inhibition et attention à {ville}', picto: 'attention',
    themes: ['apprentissages', 'tnd'], sources: ['csp-r4332-1'],
    resume: 'Un enfant qui ne tient pas en place, ou au contraire très en retrait : un travail par le corps, en complément du suivi médical.',
    corps: `## Pour quelles situations ?

- agitation motrice importante, difficulté à rester posé ou à attendre ;
- au contraire, enfant très en retrait, qui ose peu bouger ou s’exprimer par le corps ;
- difficultés à maintenir son attention dans une activité.

## Ce que dit le cadre légal

L’« instabilité psychomotrice » et l’« inhibition psychomotrice » figurent parmi les troubles que le psychomotricien prend en charge sur prescription médicale (Code de la santé publique). Le diagnostic d’un trouble du déficit de l’attention avec ou sans hyperactivité (TDAH) est posé par le médecin ; la psychomotricité fait partie des accompagnements possibles, à côté du suivi médical.

## Les séances

Jeux de régulation du mouvement, alternance d’activités dynamiques et calmes, conscience du corps, relaxation, organisation des tâches.

${PRESCRIPTION}`,
    faq: [
      { q: 'La psychomotricité remplace-t-elle le suivi médical ?', r: 'Non. Elle s’inscrit dans le projet de soins défini avec le médecin, qui reste l’interlocuteur pour le diagnostic et les traitements.' },
    ],
  },
  {
    slug: 'tonus-emotions-relaxation', titreCourt: 'Tonus, émotions et relaxation', titre: 'Tonus, émotions et relaxation à {ville}', picto: 'relaxation',
    themes: ['relaxation', 'adolescents', 'adultes', 'petite-enfance'], sources: ['csp-r4332-1'],
    resume: 'Quand les émotions passent par des tensions du corps : un travail de relaxation et de conscience corporelle, dans le cadre d’un suivi prescrit.',
    corps: `## Pour quelles situations ?

- tensions corporelles importantes, difficultés à se détendre ;
- émotions difficiles à repérer ou à réguler, qui s’expriment par le corps ;
- difficultés à trouver une posture confortable, crispations dans les gestes.

## Ce que dit le cadre légal

Le Code de la santé publique cite les « troubles de la maturation et de la régulation tonique », les « troubles tonico-émotionnels » et, parmi les moyens de la rééducation, les « techniques de relaxation dynamique ». La relaxation est ici un outil de soin, proposé après un bilan, dans le cadre d’un suivi prescrit.

## Les séances

Relaxation adaptée à l’âge, respiration, conscience du corps, alternance de mouvements et de temps calmes, mise en mots des sensations.

${PRESCRIPTION}`,
    faq: [
      { q: 'Proposez-vous des séances de relaxation sans suivi ?', r: 'La relaxation fait partie des outils du suivi en psychomotricité, après un bilan et sur prescription médicale.', sources: ['csp-r4332-1'] },
    ],
  },
  {
    slug: 'image-du-corps', titreCourt: 'Image du corps', titre: 'Image et représentation du corps à {ville}', picto: 'image-corps',
    themes: ['adolescents', 'adultes', 'sante-mentale'], sources: ['csp-r4332-1'],
    resume: 'Une approche corporelle qui contribue, avec l’équipe soignante, à la prise en charge de difficultés liées à l’image du corps.',
    corps: `## Pour quelles situations ?

Le psychomotricien peut contribuer, par des techniques d’approche corporelle, au traitement des troubles de la représentation du corps, qu’ils soient d’origine psychique ou physique (Code de la santé publique). Il intervient alors en complément du suivi assuré par le médecin et, le cas échéant, l’équipe de soins.

## Les séances

Conscience du corps, relaxation, mouvement, expression corporelle ou plastique, mise en mots des sensations, à un rythme adapté à la personne.

${PRESCRIPTION}`,
    faq: [
      { q: 'Le psychomotricien remplace-t-il le médecin ou le psychologue ?', r: 'Non. Le Code de la santé publique parle de « contribution » au traitement : le psychomotricien travaille avec les autres professionnels qui accompagnent la personne.', sources: ['csp-r4332-1'] },
    ],
  },
  {
    slug: 'equilibre-marche-age', titreCourt: 'Équilibre et marche (personnes âgées)', titre: 'Équilibre, marche et autonomie des personnes âgées à {ville}', picto: 'equilibre-senior',
    themes: ['seniors'], sources: ['csp-r4332-1', 'ppa-esa'],
    resume: 'Équilibre, coordination, confiance dans les déplacements : un suivi sur prescription médicale, au cabinet, à domicile ou en établissement.',
    corps: `## Pour quelles situations ?

- appréhension à marcher, à se relever, à sortir seul ;
- difficultés d’équilibre ou de coordination dans les gestes du quotidien ;
- perte de repères dans l’espace ou dans la journée.

## Ce que fait le psychomotricien

Le Code de la santé publique cite les activités « d’équilibration et de coordination » parmi les moyens de la rééducation psychomotrice, sans limite d’âge. Les séances travaillent l’équilibre, la marche, le relevé du sol, la conscience du corps et la confiance dans les déplacements, en lien avec le médecin et les autres soignants.

## À domicile : les équipes spécialisées Alzheimer

Pour une personne atteinte de la maladie d’Alzheimer ou d’une maladie apparentée, des équipes spécialisées Alzheimer (ESA), qui comprennent des psychomotriciens et des ergothérapeutes, interviennent à domicile sur prescription médicale. Leurs séances sont prises en charge par l’Assurance maladie.

${PRESCRIPTION}`,
    faq: [
      { q: 'Les séances peuvent-elles avoir lieu à domicile ?', r: 'Selon l’organisation du cabinet : {domicile}. Les équipes spécialisées Alzheimer interviennent à domicile sur prescription médicale.', sources: ['ppa-esa'] },
    ],
  },
  {
    slug: 'parcours-pco', titreCourt: 'Parcours PCO (troubles du neurodéveloppement)', titre: 'Parcours de bilan et d’intervention précoce (PCO) à {ville}', picto: 'parcours-pco',
    themes: ['tnd', 'petite-enfance'], sources: ['decret-2025-770', 'handicap-fiche-forfait-2025', 'ameli-tnd-medecin'],
    resume: 'Pour un enfant orienté par une plateforme de coordination et d’orientation, bilan et séances pris en charge par l’Assurance maladie.',
    corps: `## Qu’est-ce que ce parcours ?

Quand un médecin repère chez un enfant un écart inhabituel de développement, il peut l’orienter vers une plateforme de coordination et d’orientation (PCO) pour les troubles du neurodéveloppement. Le médecin de la plateforme prescrit le parcours : bilans et interventions précoces, notamment en psychomotricité.

## Ce que prévoient les textes

- la prescription initiale doit intervenir avant le douzième anniversaire de l’enfant ;
- le parcours dure un an, renouvelable une fois sur prescription médicale ;
- les bilans et séances réalisés par un psychomotricien qui a signé un contrat avec la plateforme sont pris en charge par l’Assurance maladie : la famille n’a rien à payer au psychomotricien pour ces bilans et séances.

## Au cabinet

{contrat_pco}`,
    faq: [
      { q: 'Comment entrer dans le parcours ?', r: 'Parlez-en au médecin de l’enfant (médecin traitant, pédiatre, médecin de PMI ou scolaire), qui peut adresser une demande à la plateforme de votre territoire.', sources: ['handicap-fiche-forfait-2025', 'ameli-tnd-medecin'] },
      { q: 'Jusqu’à quel âge ?', r: 'La prescription initiale doit intervenir avant le douzième anniversaire de l’enfant. Le parcours dure un an, renouvelable une fois.', sources: ['decret-2025-770'] },
      { q: 'Y a-t-il quelque chose à payer ?', r: 'Non pour les bilans et séances du parcours réalisés par un psychomotricien qui a signé un contrat avec la plateforme : ils sont payés par l’Assurance maladie.', sources: ['decret-2025-770', 'ameli-tnd-medecin'] },
    ],
  },
];

/** Texte du champ {contrat_pco} selon la réponse d'onboarding « contrat-pco » */
export const TEXTE_CONTRAT_PCO = {
  oui: 'Le cabinet a signé un contrat avec la plateforme de coordination et d’orientation de {territoire_pco}. Pour un enfant orienté par cette plateforme, le bilan et les séances du parcours sont pris en charge par l’Assurance maladie.',
  non: 'Le cabinet n’a pas de contrat avec une plateforme de coordination et d’orientation. Pour un enfant orienté par une plateforme, celle-ci communique la liste des professionnels avec lesquels elle travaille.',
} as const;
