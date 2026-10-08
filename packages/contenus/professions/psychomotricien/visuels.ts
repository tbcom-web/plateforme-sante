// VISUELS du pack Psychomotricien : liste priorisée, visuels PARTAGÉS avec la podologie (clés existantes), visuels à CRÉER,
// prompts d'images au format de prompts-images.ts (scènes { fr, en } par sujet et par fiche, contraintes négatives, refus
// déontologiques), pictos à dessiner et motif signature proposé pour l'univers « psychomotricité ».
//
// Règles (en plus de REGLES_DEONTOLOGIQUES et CONTRAINTES_NEGATIVES du core, toujours appliquées) :
// - aucun enfant identifiable : visage hors cadre, de dos ou flou ; mains, pieds, silhouettes ; jamais un mineur de face ;
// - aucune détresse : pas de pleurs, de colère, d'enfant isolé ou contenu, pas de scène d'échec scolaire ;
// - aucun handicap montré de façon spectaculaire, aucune étiquette (« autiste », « dys ») dans l'image ou sa légende ;
// - jamais présenté comme un vrai patient, un vrai praticien ni la vraie salle du cabinet ;
// - pas d'avant / après ni de « progrès » montré (écriture « avant / après » comprise).
// Les animations ne viennent qu'après validation des images de base (mémoire « Animations après ingrédients »).

import type { IdSource } from './sources';

type Texte = { fr: string; en: string };

/** Priorité : 1 = premier écran et pages des thèmes principaux ; 2 = fiches ; 3 = pages secondaires, réseaux sociaux */
export type VisuelPsychomot = {
  id: string;
  libelle: string;
  priorite: 1 | 2 | 3;
  type: 'photo' | 'illustration' | 'picto';
  /** Thèmes ou fiches qui l'utilisent */
  usages: readonly string[];
  /** Partagé avec la podologie : clés existantes (photo /photos/…, dessin, picto) ; absent = à créer */
  partage?: readonly string[];
  /** Remarque de réutilisation (recadrage, vérification) */
  note?: string;
};

export const VISUELS_PSYCHOMOT: readonly VisuelPsychomot[] = [
  // ——— Priorité 1
  { id: 'enfant-formes', libelle: 'Mains d’enfant qui assemblent des formes en bois', priorite: 1, type: 'photo', usages: ['accueil', 'apprentissages', 'maladresse-coordination'] },
  { id: 'parcours-motricite', libelle: 'Parcours de motricité en mousse dans une salle claire (sans enfant ou de dos)', priorite: 1, type: 'photo', usages: ['accueil', 'apprentissages', 'cabinet-et-acces', 'reeducation-psychomotrice'] },
  { id: 'ecriture-main', libelle: 'Main qui trace des boucles au crayon sur une grande feuille', priorite: 1, type: 'photo', usages: ['graphomotricite'] },
  { id: 'bebe-tapis', libelle: 'Bébé sur un tapis d’éveil, vu de dos ou de dessus, mains d’un parent', priorite: 1, type: 'photo', usages: ['petite-enfance', 'developpement-du-tout-petit'] },
  { id: 'senior-marche', libelle: 'Pieds d’une personne âgée qui marche, main sur une rampe', priorite: 1, type: 'photo', usages: ['seniors', 'equilibre-marche-age'],
    partage: ['scene:senior (prompts-images.ts, SCENES_SUJETS.senior)', 'picto:senior-canne', 'dessin:senior'], note: 'La scène « senior » de la podologie (chaussures fermées, allée, canne) convient ; la photo posture-escalier est rattachée au thème posture (différé) : ne pas la réutiliser.' },
  { id: 'equilibre-poutre', libelle: 'Pieds sur une poutre basse ou une ligne au sol', priorite: 1, type: 'photo', usages: ['apprentissages', 'seniors'],
    partage: ['dessin:equilibre (univers.ts, DESSINS_PODOLOGIE)'], note: 'Vérifier que le dessin « equilibre » ne porte pas de lecture de pression ni de polygone d’appui (posturologie).' },
  // ——— Priorité 2
  { id: 'premiers-pas', libelle: 'Premiers pas d’un tout-petit dans l’herbe, mains d’un adulte', priorite: 2, type: 'photo', usages: ['petite-enfance'],
    partage: ['/photos/enfant-bebe.webp', '/photos/enfant-herbe.webp', 'scene:enfant (SCENES_SUJETS.enfant)', 'picto:premiers-pas', 'dessin:enfant'], note: 'Partage direct : déjà sans visage, cadrage sur les pieds.' },
  { id: 'enfant-marche', libelle: 'Enfant qui marche ou court, vu de dos, chaussures', priorite: 2, type: 'photo', usages: ['apprentissages', 'pour-qui'],
    partage: ['/photos/enfant-baskets.webp', '/photos/enfant-chaussures.webp', '/photos/enfant-pied.webp'] },
  { id: 'relaxation-tapis', libelle: 'Personne allongée sur un tapis, mains sur le ventre, tête hors cadre', priorite: 2, type: 'photo', usages: ['relaxation', 'tonus-emotions-relaxation', 'adultes'] },
  { id: 'rythme-foulards', libelle: 'Tambourin et foulards colorés sur un tapis', priorite: 2, type: 'photo', usages: ['espace-temps-schema-corporel', 'petite-enfance'] },
  { id: 'adolescent-dessin', libelle: 'Mains d’adolescent qui dessinent ou écrivent, posture assise', priorite: 2, type: 'photo', usages: ['adolescents', 'graphomotricite'] },
  { id: 'salle-nature-morte', libelle: 'Détail d’ambiance : ballon de motricité, cerceau, tapis (jamais présenté comme le cabinet)', priorite: 2, type: 'photo', usages: ['cabinet-et-acces'] },
  { id: 'illustration-trajectoires', libelle: 'Illustration : silhouette en mouvement et ses trajectoires (motif signature)', priorite: 2, type: 'illustration', usages: ['accueil', 'la-psychomotricite'] },
  // ——— Priorité 3
  { id: 'parent-enfant-jeu', libelle: 'Mains d’un parent et d’un enfant qui jouent ensemble (balle, cubes)', priorite: 3, type: 'photo', usages: ['pour-qui', 'bilan-et-suivi'] },
  { id: 'pco-parcours', libelle: 'Illustration : étapes du parcours PCO (médecin → plateforme → bilans → séances)', priorite: 3, type: 'illustration', usages: ['parcours-pco', 'tarifs-et-prise-en-charge'] },
  { id: 'pictos-pratiques', libelle: 'Pictos pratiques (rendez-vous, accès, horaires, téléphone, itinéraire, stationnement, transports, accessibilité, FAQ)', priorite: 3, type: 'picto', usages: ['cabinet-et-acces', 'faq'],
    partage: ['picto:rendez-vous', 'picto:accessibilite', 'picto:telephone', 'picto:itineraire', 'picto:horaires', 'picto:stationnement', 'picto:transports', 'picto:conseil-faq', 'picto:honoraires'],
    note: 'NE PAS partager « carte-vitale » (laisserait croire à un remboursement en libéral).' },
];

// ---------------------------------------------------------------------------------------------------------------
// Prompts : scènes au format de prompts-images.ts (SCENES_SUJETS / SCENES_SOINS), à brancher quand l'univers sera implémenté
// ---------------------------------------------------------------------------------------------------------------

export const SCENES_SUJETS_PSYCHOMOT: Readonly<Record<string, Texte>> = {
  'petite-enfance': {
    en: 'a baby lying on a soft play mat seen from above and behind, reaching for a fabric ball, a parent’s hands gently nearby, head out of frame',
    fr: 'un bébé allongé sur un tapis d’éveil, vu de dessus et de dos, qui tend la main vers une balle en tissu, les mains d’un parent à côté, tête hors cadre',
  },
  apprentissages: {
    en: 'a child’s hands assembling simple wooden shapes on a light table, close framing on the hands, colourful but calm',
    fr: 'les mains d’un enfant qui assemblent des formes simples en bois sur une table claire, cadrage serré sur les mains, coloré mais calme',
  },
  ecriture: {
    en: 'a hand holding a plain pencil and drawing large loops on a big sheet of paper, relaxed wrist, light wooden table',
    fr: 'une main qui tient un crayon uni et trace de grandes boucles sur une grande feuille, poignet détendu, table en bois clair',
  },
  tnd: {
    en: 'colourful foam motor-skills blocks and a low balance beam arranged in a bright, calm room, no person in frame',
    fr: 'des modules de motricité en mousse colorée et une poutre basse disposés dans une salle lumineuse et calme, personne dans le cadre',
  },
  adolescents: {
    en: 'the hands and forearms of a teenager drawing in a sketchbook at a desk, sitting upright and relaxed, head out of frame',
    fr: 'les mains et les avant-bras d’un adolescent qui dessine dans un carnet à un bureau, assis droit et détendu, tête hors cadre',
  },
  adultes: {
    en: 'an adult seated on a large exercise ball, feet flat on the floor, seen from the shoulders down, calm bright room',
    fr: 'un adulte assis sur un grand ballon, pieds à plat au sol, vu des épaules aux pieds, salle claire et calme',
  },
  seniors: {
    en: 'an older adult’s feet in comfortable closed shoes walking along a bright hallway, one hand resting on a handrail',
    fr: 'les pieds d’une personne âgée en chaussures fermées confortables qui marche dans un couloir clair, une main posée sur la rampe',
  },
  relaxation: {
    en: 'a person lying on a mat with hands resting on the belly, seen from the chest down, soft natural light, a folded blanket nearby',
    fr: 'une personne allongée sur un tapis, mains posées sur le ventre, vue de la poitrine aux pieds, lumière naturelle douce, une couverture pliée à côté',
  },
};

export const SCENES_FICHES_PSYCHOMOT: Readonly<Record<string, Texte>> = {
  'bilan-psychomoteur': {
    en: 'a small set of simple test materials on a light table: wooden cubes, a few coloured pencils, a sheet with drawn shapes, plain unmarked items',
    fr: 'un petit ensemble de matériel simple sur une table claire : cubes en bois, quelques crayons de couleur, une feuille avec des formes dessinées, rien de marqué',
  },
  'maladresse-coordination': {
    en: 'a child’s feet stepping into coloured hoops laid on the floor, seen from the knees down',
    fr: 'les pieds d’un enfant qui avancent dans des cerceaux colorés posés au sol, vus des genoux aux pieds',
  },
  graphomotricite: {
    en: 'a child’s hand with a relaxed pencil grip tracing a wavy line on paper, close-up',
    fr: 'la main d’un enfant, tenue du crayon détendue, qui trace une ligne ondulée sur une feuille, gros plan',
  },
  'espace-temps-schema-corporel': {
    en: 'a small hand drum and colourful light scarves resting on a play mat',
    fr: 'un petit tambourin et des foulards légers colorés posés sur un tapis de jeu',
  },
  'equilibre-marche-age': {
    en: 'the feet of an older adult stepping along a line of soft markers on the floor, comfortable closed shoes',
    fr: 'les pieds d’une personne âgée qui avancent le long d’une ligne de repères souples au sol, chaussures fermées confortables',
  },
};

/** Nature morte d'ambiance (format « cabinet » : jamais présentée comme la salle du praticien) */
export const SCENE_SALLE_PSYCHOMOT: Texte = {
  en: 'a large exercise ball, a coloured hoop and a rolled foam mat against a light wall, soft daylight',
  fr: 'un grand ballon, un cerceau coloré et un tapis en mousse roulé contre un mur clair, lumière du jour douce',
};

/** Contraintes négatives PROPRES à ce pack, ajoutées aux CONTRAINTES_NEGATIVES du core */
export const CONTRAINTES_NEGATIVES_PSYCHOMOT: readonly { id: string; en: string; fr: string; mj: string }[] = [
  { id: 'enfant-identifiable', en: 'no identifiable child: child seen from behind, from above or only hands and feet, never a child’s face', fr: 'aucun enfant identifiable : de dos, de dessus, ou seulement les mains et les pieds, jamais le visage d’un enfant', mj: 'child face, kid portrait' },
  { id: 'detresse', en: 'no distress: no crying, anger, fear, isolation, restraint or failure scene', fr: 'aucune détresse : ni pleurs, ni colère, ni peur, ni isolement, ni contention, ni scène d’échec', mj: 'crying, sad child, tantrum, restraint' },
  { id: 'etiquette', en: 'no visible disability shown as spectacle, no medical device on a child, no label or sign', fr: 'aucun handicap montré comme un spectacle, aucun appareillage sur un enfant, aucune étiquette ni pancarte', mj: 'wheelchair focus, hospital, label' },
  { id: 'ecole', en: 'no school uniform, no school logo, no graded work or marks on paper', fr: 'pas d’uniforme ni de logo d’école, pas de copie notée ni d’annotation sur la feuille', mj: 'uniform, grades, red marks' },
];

/** Refus déontologiques propres (demandes libres de Paul) ; s'ajoutent à MOTIFS_INTERDITS du core */
export const MOTIFS_INTERDITS_PSYCHOMOT: readonly { id: string; motif: string; re: RegExp }[] = [
  { id: 'detresse', motif: 'Aucune détresse (pleurs, colère, isolement).', re: /\b(pleur\w*|cri(s|e)?|col[eè]re|crise|triste|cry\w*|tantrum|sad|distress\w*)\b/i },
  { id: 'etiquette', motif: 'Aucune étiquette de trouble dans l’image (autiste, dys, TDAH, handicapé).', re: /\b(autistes?|dyspraxiques?|dyslexiques?|tdah|handicap[ée]s?|autistic|disabled)\b/i },
  { id: 'progres', motif: 'Pas de « progrès » montré (avant / après d’écriture, résultat).', re: /\b(progr[eè]s|am[ée]lior\w*|progress|improv\w*)\b/i },
  { id: 'enfant-visage', motif: 'Jamais le visage d’un enfant.', re: /\b(sourire d'enfant|enfant souriant|child smiling|kid face|child'?s face)\b/i },
];

// ---------------------------------------------------------------------------------------------------------------
// Pictos à dessiner et motif signature
// ---------------------------------------------------------------------------------------------------------------

/** Pictos propres à dessiner (grammaire de la charte : trait, sans visage) */
export const PICTOS_A_DESSINER: readonly { id: string; libelle: string; idee: string }[] = [
  { id: 'bilan-psychomoteur', libelle: 'Bilan psychomoteur', idee: 'Cubes empilés et un crayon, une ligne de mouvement qui les relie.' },
  { id: 'seance', libelle: 'Séance', idee: 'Silhouette simplifiée en mouvement sur un tapis, trajectoire en pointillés.' },
  { id: 'tout-petit', libelle: 'Tout-petit', idee: 'Bébé à quatre pattes vu de profil, sans visage, arc de mouvement.' },
  { id: 'coordination', libelle: 'Coordination', idee: 'Balle et main, deux trajectoires qui se croisent.' },
  { id: 'ecriture', libelle: 'Écriture', idee: 'Main et crayon traçant une boucle continue.' },
  { id: 'reperes', libelle: 'Repères dans l’espace', idee: 'Silhouette au centre de flèches haut / bas / gauche / droite.' },
  { id: 'attention', libelle: 'Attention', idee: 'Cible douce : cercles concentriques et un point posé.' },
  { id: 'relaxation', libelle: 'Relaxation', idee: 'Silhouette allongée, ligne de respiration ondulée au-dessus.' },
  { id: 'image-corps', libelle: 'Image du corps', idee: 'Contour de silhouette en pointillés et son reflet plein.' },
  { id: 'equilibre-senior', libelle: 'Équilibre (personnes âgées)', idee: 'Pas sur une ligne, main posée sur une rampe.' },
  { id: 'parcours-pco', libelle: 'Parcours PCO', idee: 'Quatre étapes reliées : stéthoscope, plateforme (maison), cubes, silhouette en mouvement.' },
  { id: 'formes-construction', libelle: 'Formes de construction', idee: 'Rond, carré, triangle et arche empilés (base du motif signature).' },
];

/** Motif signature proposé pour l'univers « psychomotricité » (équivalent de la trame de pression en podologie) */
export const MOTIF_SIGNATURE_PSYCHOMOT = {
  id: 'trajectoires',
  nom: 'Trajectoires de mouvement',
  sens: 'Le mouvement et sa trace : lignes continues et pointillées qui suivent un geste (boucle d’écriture, lancer, pas sur une ligne), ponctuées de formes de construction simples (rond, carré, triangle, arche), comme sur une feuille d’épreuves de graphisme.',
  // Palette de données proposée (5 niveaux) : intensité du mouvement, du calme à l'élan ; aucun rouge (pas de lecture « alarme »)
  donnees: { grandeur: 'amplitude du mouvement', libelles: ['repos', 'lent', 'posé', 'ample', 'élan'], couleurs: ['#7aa6c2', '#6cc2a4', '#e8c35a', '#e8955a', '#b77ab8'], arrets: [0, 0.3, 0.55, 0.8, 1] },
  // Marques de logo proposées
  marques: [
    { id: 'boucle', nom: 'Boucle', sens: 'Une boucle d’écriture continue, tracée d’un seul geste.' },
    { id: 'formes', nom: 'Formes empilées', sens: 'Rond, carré et triangle empilés en équilibre.' },
    { id: 'trajet', nom: 'Trajet', sens: 'Une trajectoire en pointillés qui rebondit trois fois, comme une balle.' },
  ],
} as const;

/** Sources qui justifient les scènes (outils des séances cités par le décret d'actes) */
export const SOURCES_VISUELS: readonly IdSource[] = ['csp-r4332-1'];
