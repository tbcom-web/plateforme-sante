// Packs visuels par spécialité : photos par défaut et animation d'accueil.
//
// Le praticien choisit un style (modèle) et une spécialité. La spécialité fournit les visuels
// (ses propres photos passent toujours en premier) ; le style leur applique un traitement
// (teinte, contraste) pour garder une unité graphique avec un seul jeu de photos par spécialité.
// Les photos par défaut ne montrent pas de visage, pour ne jamais passer pour le praticien.

export const ANIMATIONS = ['podoscope', 'coureur'] as const;
export type Animation = (typeof ANIMATIONS)[number];

export type PackVisuel = {
  value: string;
  label: string;
  description: string;
  /** Animation d'accueil proposée (le praticien peut la désactiver) */
  animation: Animation | null;
  photos: { accueil: string; panorama: string; diaporama: string[] };
};

export const SPECIALITES: PackVisuel[] = [
  {
    value: 'generale',
    label: 'Podologie générale',
    description: 'Soins, semelles, bilans : la pratique de cabinet au quotidien.',
    animation: 'podoscope',
    photos: {
      accueil: '/photos/cabinet-lumiere.webp',
      panorama: '/photos/examen-mains.webp',
      diaporama: ['/photos/cabinet-lumiere.webp', '/photos/soin-talon.webp', '/photos/chaussage.webp', '/photos/analyse-plateforme.webp'],
    },
  },
  {
    value: 'sport',
    label: 'Podologie du sport',
    description: 'Course, foulée, prévention des blessures, semelles de sport.',
    animation: 'coureur',
    photos: {
      accueil: '/photos/sport-course.webp',
      panorama: '/photos/analyse-plateforme.webp',
      diaporama: ['/photos/sport-course.webp', '/photos/accueil-observation-marche.webp', '/photos/analyse-plateforme.webp', '/photos/chaussage.webp'],
    },
  },
  {
    value: 'posture',
    label: 'Posture et biomécanique',
    description: 'Analyse de la marche, examen sur plateforme, posturologie.',
    animation: 'podoscope',
    photos: {
      accueil: '/photos/analyse-plateforme.webp',
      panorama: '/photos/accueil-observation-marche.webp',
      diaporama: ['/photos/analyse-plateforme.webp', '/photos/accueil-observation-marche.webp', '/photos/chaussage.webp', '/photos/cabinet-lumiere.webp'],
    },
  },
  {
    value: 'enfant',
    label: 'Podologie de l’enfant',
    description: 'Croissance, marche, chaussage de l’enfant.',
    animation: 'podoscope',
    photos: {
      accueil: '/photos/enfant-pied.webp',
      panorama: '/photos/chaussage.webp',
      diaporama: ['/photos/enfant-pied.webp', '/photos/chaussage.webp', '/photos/cabinet-lumiere.webp', '/photos/accueil-observation-marche.webp'],
    },
  },
  {
    value: 'soins',
    label: 'Soins et prévention',
    description: 'Pédicurie, pied diabétique, seniors, soins à domicile.',
    animation: null,
    photos: {
      accueil: '/photos/soin-talon.webp',
      panorama: '/photos/examen-mains.webp',
      diaporama: ['/photos/soin-talon.webp', '/photos/examen-mains.webp', '/photos/cabinet-lumiere.webp', '/photos/chaussage.webp'],
    },
  },
];

export const packVisuel = (value: string) => SPECIALITES.find((s) => s.value === value) ?? SPECIALITES[0];

/** Spécialité proposée par défaut selon le profil de cabinet. */
export const specialiteDuProfil = (profil: string) =>
  ({ sport: 'sport', technique: 'posture', prevention: 'soins' } as Record<string, string>)[profil] ?? 'generale';
