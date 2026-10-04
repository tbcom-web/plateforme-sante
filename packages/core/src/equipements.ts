// Catalogue du matériel et de l'hygiène du cabinet (rubrique « Matériel et hygiène »).
// Vocabulaire tiré des recommandations de l'Ordre (ONPP : stérilisation, traçabilité, plateau technique).
// Chaque phrase dit ce que le matériel permet ou garantit, sans promesse de résultat ni comparaison :
// le praticien ne coche que ce qui est réellement présent au cabinet.
import type { NomDessin } from './univers';

export type CategorieEquipement = 'hygiene' | 'examen' | 'semelles' | 'soins';

export const CATEGORIES_EQUIPEMENTS: { value: CategorieEquipement; label: string }[] = [
  { value: 'hygiene', label: 'Hygiène et stérilisation' },
  { value: 'examen', label: 'Examen et analyse' },
  { value: 'semelles', label: 'Fabrication des semelles' },
  { value: 'soins', label: 'Soins' },
];

export type Equipement = {
  id: string;
  libelle: string;
  categorie: CategorieEquipement;
  /** Phrase factuelle destinée aux patients : ce que le matériel permet ou garantit */
  phrase: string;
  /** Mention courte pour la bande « en bref » de l'accueil (équipements d'hygiène marquants) */
  fait?: string;
  /** Libellé très court (bandeau « Hygiène » de l'accueil) */
  court?: string;
  /** Soins du catalogue concernés (slugs) : la fiche du soin le mentionne si le cabinet l'a coché */
  soins?: string[];
  /** Mention sur la fiche d'un soin (sinon le libellé) */
  mentionSoin?: string;
  /** Icône au trait (« prefixe:nom », jeux d'icônes locaux) */
  icone: string;
  /** Dessin de la charte associé, facultatif */
  dessin?: NomDessin;
};

export const EQUIPEMENTS: Equipement[] = [
  // ---- Hygiène et stérilisation ----
  {
    id: 'autoclave-classe-b',
    court: 'Autoclave classe B',
    libelle: 'Stérilisateur autoclave de classe B',
    categorie: 'hygiene',
    phrase: 'Les instruments réutilisables sont stérilisés à la vapeur d’eau sous pression au cabinet, selon un cycle contrôlé à chaque charge.',
    fait: 'Stérilisation autoclave classe B',
    icone: 'tabler:temperature',
  },
  {
    id: 'sachets-individuels',
    court: 'Sachets individuels',
    libelle: 'Instruments en sachets stériles individuels',
    categorie: 'hygiene',
    phrase: 'Chaque jeu d’instruments est conditionné en sachet scellé et ouvert devant le patient, au début du soin.',
    soins: ['soins-de-pedicurie', 'ongle-incarne', 'pied-diabetique', 'verrues-plantaires'],
    mentionSoin: 'Instruments stériles en sachet individuel, ouvert devant vous',
    icone: 'tabler:box-seam',
  },
  {
    id: 'usage-unique',
    court: 'Usage unique',
    libelle: 'Matériel à usage unique',
    categorie: 'hygiene',
    phrase: 'Lames de bistouri, gants et champs de soin sont à usage unique et éliminés après chaque patient.',
    soins: ['soins-de-pedicurie', 'ongle-incarne', 'verrues-plantaires'],
    mentionSoin: 'Lames et petit matériel à usage unique',
    icone: 'tabler:needle',
  },
  {
    id: 'tracabilite-sterilisation',
    court: 'Cycles tracés',
    libelle: 'Traçabilité des cycles de stérilisation',
    categorie: 'hygiene',
    phrase: 'Chaque cycle est enregistré (date, numéro de cycle, tests de contrôle) dans un registre conservé au cabinet.',
    fait: 'Stérilisation tracée à chaque cycle',
    icone: 'tabler:list-check',
  },
  {
    id: 'aspiration',
    court: 'Aspiration des poussières',
    libelle: 'Micromoteur avec aspiration',
    categorie: 'hygiene',
    phrase: 'Le meulage des ongles et des callosités se fait avec une aspiration intégrée, qui limite la dispersion des poussières.',
    soins: ['soins-de-pedicurie', 'pied-diabetique'],
    mentionSoin: 'Micromoteur avec aspiration des poussières',
    icone: 'tabler:propeller',
  },
  // ---- Examen et analyse ----
  {
    id: 'podoscope',
    libelle: 'Podoscope',
    categorie: 'examen',
    phrase: 'Plateau éclairé avec miroir, sur lequel le patient se tient debout : il permet d’observer les zones d’appui de la plante des pieds.',
    soins: ['bilan-podologique', 'podologie-enfant', 'semelles-orthopediques'],
    mentionSoin: 'Examen des appuis sur podoscope',
    icone: 'tabler:footsteps',
    dessin: 'appuis',
  },
  {
    id: 'plateforme-pression',
    libelle: 'Plateforme de pression (baropodométrie)',
    categorie: 'examen',
    phrase: 'Plateforme à capteurs qui enregistre la répartition des pressions sous les pieds, en position debout et pendant la marche.',
    soins: ['bilan-podologique', 'posturologie', 'podologie-du-sport', 'semelles-orthopediques'],
    mentionSoin: 'Examen sur plateforme de pression',
    icone: 'tabler:grid-dots',
    dessin: 'analyse',
  },
  {
    id: 'analyse-video',
    libelle: 'Analyse vidéo de la marche et de la course',
    categorie: 'examen',
    phrase: 'La marche ou la course est filmée puis revue au ralenti avec le patient, image par image.',
    soins: ['bilan-podologique', 'podologie-du-sport', 'podologie-enfant'],
    mentionSoin: 'Analyse vidéo de la marche ou de la course',
    icone: 'tabler:video',
    dessin: 'sport',
  },
  {
    id: 'tapis-de-course',
    libelle: 'Tapis de course',
    categorie: 'examen',
    phrase: 'Il permet d’observer la foulée à allure régulière, avec les chaussures habituelles du patient.',
    soins: ['podologie-du-sport'],
    mentionSoin: 'Observation de la foulée sur tapis de course',
    icone: 'tabler:treadmill',
    dessin: 'sport',
  },
  {
    id: 'monofilament-diapason',
    libelle: 'Monofilament et diapason',
    categorie: 'examen',
    phrase: 'Outils du dépistage de la perte de sensibilité du pied, utilisés notamment dans le suivi du pied diabétique.',
    soins: ['pied-diabetique', 'podologie-du-senior'],
    mentionSoin: 'Test de sensibilité au monofilament et au diapason',
    icone: 'tabler:wave-sine',
    dessin: 'diabete',
  },
  // ---- Fabrication des semelles ----
  {
    id: 'scanner-3d',
    libelle: 'Scanner 3D du pied',
    categorie: 'semelles',
    phrase: 'Il relève la forme du pied en trois dimensions, sans contact, pour concevoir les semelles.',
    soins: ['semelles-orthopediques'],
    mentionSoin: 'Prise d’empreinte au scanner 3D',
    icone: 'tabler:scan',
    dessin: 'semelle',
  },
  {
    id: 'empreinte-mousse',
    libelle: 'Empreinte en mousse ou moulage',
    categorie: 'semelles',
    phrase: 'Le pied est moulé dans une mousse à empreinte ou par moulage direct, pour reproduire sa forme.',
    soins: ['semelles-orthopediques'],
    mentionSoin: 'Prise d’empreinte en mousse ou par moulage',
    icone: 'tabler:layers-subtract',
    dessin: 'semelle',
  },
  {
    id: 'fraiseuse-numerique',
    libelle: 'Fraiseuse numérique (CFAO)',
    categorie: 'semelles',
    phrase: 'Les semelles conçues sur ordinateur sont usinées au cabinet, dans un bloc de matériau, à partir de l’empreinte numérique.',
    soins: ['semelles-orthopediques'],
    mentionSoin: 'Semelles conçues et usinées au cabinet (CFAO)',
    icone: 'tabler:cube',
    dessin: 'semelle',
  },
  {
    id: 'atelier-semelles',
    libelle: 'Atelier de fabrication des semelles',
    categorie: 'semelles',
    phrase: 'Les semelles sont fabriquées et ajustées sur place, ce qui permet les retouches lors du contrôle.',
    soins: ['semelles-orthopediques'],
    mentionSoin: 'Fabrication et retouches à l’atelier du cabinet',
    icone: 'tabler:tools',
    dessin: 'semelle',
  },
  {
    id: 'thermoformage',
    libelle: 'Thermoformage',
    categorie: 'semelles',
    phrase: 'Les matériaux des semelles sont chauffés puis mis en forme sur l’empreinte du pied.',
    soins: ['semelles-orthopediques'],
    mentionSoin: 'Semelles thermoformées',
    icone: 'tabler:flame',
    dessin: 'semelle',
  },
  // ---- Soins ----
  {
    id: 'fauteuil-soins',
    libelle: 'Fauteuil de soins réglable',
    categorie: 'soins',
    phrase: 'Fauteuil réglable en hauteur et en inclinaison, pour installer le patient selon le soin.',
    icone: 'tabler:armchair',
  },
  {
    id: 'laser',
    libelle: 'Laser',
    categorie: 'soins',
    phrase: 'Utilisé pour certaines affections de la peau et des ongles, selon l’indication posée lors de l’examen.',
    soins: ['laser', 'verrues-plantaires'],
    mentionSoin: 'Laser au cabinet, selon l’indication',
    icone: 'tabler:sparkles',
    dessin: 'soin',
  },
];

/** Bornes du texte libre « autre matériel » */
export const EQUIPEMENTS_AUTRES_MAX = 300;

const IDS = new Set(EQUIPEMENTS.map((e) => e.id));

/** Ne garde que les identifiants connus, sans doublon, dans l'ordre du catalogue. */
export function nettoyerEquipements(brut: unknown): string[] {
  const liste = Array.isArray(brut) ? brut.filter((x): x is string => typeof x === 'string' && IDS.has(x)) : [];
  return EQUIPEMENTS.map((e) => e.id).filter((id) => liste.includes(id));
}

/** Texte libre : une ligne par élément, espaces resserrés, longueur bornée. */
export function nettoyerEquipementsAutres(brut: unknown): string {
  if (typeof brut !== 'string') return '';
  return brut
    .replace(/[<>]/g, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, EQUIPEMENTS_AUTRES_MAX);
}

/** Équipements cochés, groupés par catégorie (catégories vides omises). */
export function equipementsParCategorie(ids: string[]): { categorie: (typeof CATEGORIES_EQUIPEMENTS)[number]; equipements: Equipement[] }[] {
  return CATEGORIES_EQUIPEMENTS.map((categorie) => ({
    categorie,
    equipements: EQUIPEMENTS.filter((e) => e.categorie === categorie.value && ids.includes(e.id)),
  })).filter((g) => g.equipements.length > 0);
}

/** Mentions sobres pour la fiche d'un soin : seulement le matériel coché qui concerne ce soin. */
export function equipementsDuSoin(slug: string, ids: string[]): string[] {
  return EQUIPEMENTS.filter((e) => ids.includes(e.id) && e.soins?.includes(slug)).map((e) => e.mentionSoin ?? e.libelle);
}

/** Mention de la bande « en bref » : premier équipement d'hygiène coché qui en a une. */
export function faitEquipement(ids: string[]): string {
  return EQUIPEMENTS.find((e) => e.fait && ids.includes(e.id))?.fait ?? '';
}

/** Résumé de l'hygiène pour un bandeau : trois mentions courtes au plus (« Autoclave classe B · Sachets individuels · Usage unique »). */
export function resumeHygiene(ids: string[]): string {
  return EQUIPEMENTS.filter((e) => e.categorie === 'hygiene' && e.court && ids.includes(e.id)).slice(0, 3).map((e) => e.court).join(' · ');
}
