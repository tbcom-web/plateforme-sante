// Fiches conseils : aide pour bien remplir chaque section du site, affichée dans le formulaire du praticien
// (et utile au gestionnaire qui le remplit pour lui). Ton factuel, une règle utile par point.
// Chaque fiche correspond à une étape du formulaire et décrit ce qu'elle produit sur le site.

export type PointConseil = { titre: string; conseil: string; exemple?: string };
export type FicheConseil = {
  /** Étape du formulaire (même ordre que ETAPES dans l'éditeur) */
  etape: string;
  /** Ce que cette étape alimente sur le site publié */
  surLeSite: string;
  points: PointConseil[];
};

export const FICHES_CONSEILS: FicheConseil[] = [
  {
    etape: 'Sujets',
    surLeSite: 'L’ordre du menu, les cartes en tête de l’accueil, une page par sujet et le regroupement des soins.',
    points: [
      { titre: 'Pourquoi choisir', conseil: 'Un patient cherche d’abord un sujet (« mon enfant », « mon diabète », « je cours »), pas un nom de soin. Vos sujets principaux le guident en un geste vers les bons soins.' },
      { titre: 'Accueil et menus', conseil: 'Les sujets principaux ouvrent le menu dans l’ordre choisi (sur téléphone, seul le n° 1 reste dans la barre, les autres sont en tête de « Soins ») et ont une carte en haut de l’accueil. Les sujets traités aussi apparaissent dans une rangée plus discrète « Aussi au cabinet ».' },
      { titre: 'Ordre', conseil: 'Le n° 1 est l’activité qui occupe le plus votre agenda : il choisit aussi le modèle proposé et les illustrations. Choisir moins de 3 sujets est possible.' },
      { titre: 'Soins', conseil: 'Un sujet ne s’affiche que si au moins un de ses soins est coché : cochez ensuite les soins réellement pratiqués.' },
      { titre: 'Bientôt disponible', conseil: 'La posture et l’équilibre seront proposés après validation déontologique : ces sujets ont un niveau de preuve encore faible.' },
    ],
  },
  {
    etape: 'Profil',
    surLeSite: 'Le ton de tous les textes, le modèle proposé et la spécialité qui choisit les illustrations.',
    points: [
      { titre: 'Profil du cabinet', conseil: 'Choisir celui qui décrit l’activité principale, pas l’activité souhaitée : il règle le modèle, la spécialité et la façon de s’exprimer.' },
      { titre: 'Façon de s’exprimer', conseil: '« Je » pour un praticien seul, « nous » pour un cabinet de groupe. Le même choix s’applique à tout le site.' },
    ],
  },
  {
    etape: 'Praticiens',
    surLeSite: 'Le bloc praticiens de l’accueil, la page « Le cabinet », le pied de page et les mentions légales.',
    points: [
      { titre: 'N° d’Ordre et RPPS', conseil: 'Les recopier tels quels depuis l’annuaire santé (annuaire.sante.fr) : les patients et l’Ordre les vérifient. Un numéro d’exemple bloque la publication.' },
      { titre: 'Diplôme et formations', conseil: 'Un intitulé officiel par ligne, avec l’année : « Diplôme d’État de pédicure-podologue, 2012 », « DU de podologie du sport, 2016 ».' },
      { titre: 'Orientations', conseil: 'Trois au maximum, celles pratiquées chaque semaine. Éviter les titres non reconnus par l’Ordre (« podo-diabétologue », « posturologue »).' },
      { titre: 'Présentation', conseil: '3 à 5 phrases factuelles : parcours, façon de travailler, publics reçus. Ni superlatif, ni promesse de résultat.', exemple: 'Installé à Toulon depuis 2014, je reçois beaucoup de coureurs et de randonneurs. Chaque bilan commence par un échange sur vos douleurs et vos activités.' },
      { titre: 'Portrait', conseil: 'Photo de face, lumière naturelle, fond neutre, tenue professionnelle. Sans portrait, le site affiche un monogramme : jamais la photo d’une autre personne.' },
    ],
  },
  {
    etape: 'Cabinet',
    surLeSite: 'L’adresse sur toutes les pages, la page « Accès », la carte et le référencement local ; le matériel sur la page « Le cabinet ».',
    points: [
      { titre: 'Adresse', conseil: 'L’adresse exacte, écrite comme sur la fiche Google du cabinet, avec le complément utile : étage, ascenseur, digicode.' },
      { titre: 'Quartier', conseil: 'Le nom usuel du quartier, que les patients comprennent (« quartier du Mourillon »). Il complète la ville, il ne la remplace jamais.' },
      { titre: 'Communes voisines', conseil: '5 à 10 communes d’où viennent réellement les patients : c’est le premier levier du référencement local.' },
      { titre: 'Accès', conseil: 'Stationnement, arrêt de bus ou de tram le plus proche, accès PMR : les questions que les patients posent au téléphone.' },
      { titre: 'Matériel et hygiène', conseil: 'Cocher seulement le matériel réellement présent au cabinet. L’hygiène et la stérilisation (autoclave, sachets ouverts devant le patient, usage unique) rassurent les patients et distinguent le soin podologique ; le matériel d’examen et de fabrication des semelles est aussi rappelé sur les pages de soin concernées.' },
    ],
  },
  {
    etape: 'Horaires',
    surLeSite: 'Le tableau des horaires (accueil, « Accès », pied de page) et les données lues par Google.',
    points: [
      { titre: 'Format', conseil: 'Toujours le même format (« 9h00–12h30 ») et « Fermé » plutôt qu’une case vide.' },
      { titre: 'Cohérence', conseil: 'Les mêmes horaires que sur la fiche Google et l’agenda en ligne : un écart fait perdre la confiance des patients.' },
    ],
  },
  {
    etape: 'Rendez-vous et infos',
    surLeSite: 'Tous les boutons « Prendre rendez-vous », la barre mobile et le bloc d’informations pratiques.',
    points: [
      { titre: 'Lien de rendez-vous', conseil: 'Coller le lien de la page du praticien sur la plateforme (pas l’accueil du site), puis le tester dans une fenêtre de navigation privée.' },
      { titre: 'Honoraires et conventionnement', conseil: 'Indiquer la situation exacte (conventionné ou non) et les tarifs des actes courants : bilan, semelles, soin de pédicurie. C’est la première question des patients.' },
      { titre: 'Message important', conseil: 'Court, avec une date de fin (fermeture, congés) : sinon il reste affiché.' },
    ],
  },
  {
    etape: 'Compétences',
    surLeSite: 'Une page par compétence cochée, la liste de l’accueil et les liens internes.',
    points: [
      { titre: 'Choix', conseil: 'Ne cocher que les soins réellement pratiqués : chaque coche crée une page publique indexée par Google.' },
      { titre: 'Ordre', conseil: 'Les trois premières compétences sont les plus visibles : mettre en tête l’activité principale (par exemple sport et semelles pour un cabinet orienté sport).' },
      { titre: 'Actualités', conseil: 'Commencer par la validation manuelle des articles proposés ; la publication automatique publie sans relecture.' },
    ],
  },
  {
    etape: 'Photos et style',
    surLeSite: 'L’apparence de tout le site : modèle, couleurs, illustrations, logo et icône de l’onglet.',
    points: [
      { titre: 'Style du site', conseil: 'Choisir l’effet recherché plutôt qu’un nom de modèle. « Simple et rassurant » convient à une patientèle âgée, à un cabinet de village ou à qui préfère la clarté : grande photo du lieu, téléphone bien visible, gros caractères, schémas explicatifs calmes. « Moderne et technique » met en avant l’examen et le matériel.' },
      { titre: 'Photo de la façade ou du village', conseil: 'Avec le style « Simple et rassurant », la photo d’accueil EST l’accueil du site : une photo nette de la façade, de la rue ou du village, prise de jour, en format paysage, sans personne reconnaissable. Sans photo, une photo d’illustration ou un schéma la remplace.' },
      { titre: 'Illustrations ou photos', conseil: 'Les illustrations, adaptées à vos couleurs, donnent un site cohérent sans photo. N’ajouter des photos que si elles sont nettes, lumineuses et montrent votre cabinet.' },
      { titre: 'Photos du cabinet', conseil: 'Format paysage, au moins 2000 px de large, pièces rangées, aucun patient identifiable. 3 à 6 photos variées : accueil, salle de soins, matériel.' },
      { titre: 'Gamme de couleurs', conseil: 'Garder une gamme conseillée pour le modèle : les contrastes y sont vérifiés pour la lecture. Une couleur personnalisée peut nuire à la lisibilité.' },
      { titre: 'Logo', conseil: 'Votre logo en PNG à fond transparent ; cocher « contient le nom » seulement si le nom y figure vraiment. Sinon, choisir une marque dessinée.' },
      { titre: 'Spécialité', conseil: 'La spécialité principale choisit l’animation d’accueil et les illustrations ; la secondaire les complète seulement.' },
    ],
  },
];

/** Fiche conseil d'une étape du formulaire */
export const ficheConseil = (etape: string) => FICHES_CONSEILS.find((f) => f.etape === etape);

/**
 * Fiche « Prendre son portrait au téléphone », affichée par le studio portrait de l'admin avant le choix de la photo.
 * Le studio corrige la lumière et peut remplacer le fond : la photo peut être prise n'importe où, sans matériel.
 */
export const CONSEILS_PHOTO_PORTRAIT: PointConseil[] = [
  { titre: 'Lumière', conseil: 'Face à une fenêtre, en journée, sans soleil direct ni lampe au plafond : la lumière du jour donne un teint naturel.' },
  { titre: 'Cadrage', conseil: 'Téléphone à hauteur des yeux, à un bras de distance (ou tenu par un collègue), tête et épaules dans l’image, sans zoom.' },
  { titre: 'Fond', conseil: 'Peu importe le fond : le studio peut le remplacer par une couleur du site ou le flouter. Évitez seulement une autre personne derrière vous.' },
  { titre: 'Portrait fidèle', conseil: 'Le studio corrige la lumière et les couleurs, jamais les traits ni la peau : le patient doit vous reconnaître à l’accueil.' },
];
