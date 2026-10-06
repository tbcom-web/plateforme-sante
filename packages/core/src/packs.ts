// Spécialités du praticien : couche 3 de la charte (sous l'univers métier, voir univers.ts).
//
// Le site a une spécialité principale (et éventuellement une secondaire), tirées des sujets n° 1 et 2 du praticien
// (themes.ts, specialitesDesPriorites ; réglables ensuite dans le formulaire complet), une gamme de couleurs et un modèle. La spécialité pilote les visuels : photos par défaut, vidéos (boucles courtes et muettes),
// dessins prioritaires, animation d'accueil, soins mis en avant. Ses propres photos passent toujours en
// premier ; le modèle leur applique un traitement de teinte pour garder l'unité graphique.
// Règle de cohérence : toute ressource d'une spécialité respecte la charte (traitement du style, aucun visage,
// mention illustrative sur les schémas).
//
// Historique : ce fichier s'appelait « packs visuels » ; `PackVisuel`, `SPECIALITES`, `packVisuel`,
// `fusionnerPack`, `LIBELLES_ANIMATIONS` et `specialiteDuProfil` restent exportés à l'identique.

import type { NomDessin } from './univers';

export const ANIMATIONS = ['podoscope', 'coureur', 'trajectoire', 'premiers-pas', 'semelle', 'meulage'] as const;
export type Animation = (typeof ANIMATIONS)[number];

/** Libellés des animations, pour l'éditeur */
export const LIBELLES_ANIMATIONS: Record<Animation, string> = {
  podoscope: 'empreintes de podoscope en points de pression',
  coureur: 'coureur en pleine foulée',
  trajectoire: 'trajet du centre de pression pendant le pas',
  'premiers-pas': 'petites empreintes de premiers pas',
  semelle: 'semelles tracées en courbes de niveau',
  meulage: 'meulage d’un ongle épaissi à la fraise, en étapes',
};

/** Vidéo d'une spécialité : boucle courte et muette, avec image d'attente (rendu prévu plus tard) */
export type VideoSpecialite = { src: string; poster: string; usage: 'accueil' | 'panorama' };

export type Specialite = {
  value: string;
  label: string;
  description: string;
  /** Animation d'accueil proposée (le praticien peut la désactiver) */
  animation: Animation | null;
  photos: { accueil: string; panorama: string; diaporama: string[] };
  /** Vidéos facultatives (boucles muettes) */
  videos?: VideoSpecialite[];
  /** Dessins techniques à privilégier (illustrations, couvertures) */
  dessins?: NomDessin[];
  /** Slugs des soins du catalogue à présenter en premier */
  soins?: string[];
  /** Niveaux (1 à 5) de la palette de données à mettre en avant, facultatif */
  accentsDonnees?: (1 | 2 | 3 | 4 | 5)[];
};
/** Ancien nom de la spécialité, conservé pour les imports existants */
export type PackVisuel = Specialite;

export const SPECIALITES: Specialite[] = [
  {
    value: 'generale',
    label: 'Podologie générale',
    description: 'Soins, semelles, bilans : la pratique de cabinet au quotidien.',
    animation: 'podoscope',
    photos: {
      accueil: '/photos/cabinet-lumiere.webp',
      panorama: '/photos/generale-parquet.webp',
      diaporama: ['/photos/cabinet-lumiere.webp', '/photos/generale-pieds-nus.webp', '/photos/generale-pied-profil.webp', '/photos/examen-mains.webp', '/photos/generale-pied-sol.webp'],
    },
    dessins: ['analyse', 'soin', 'semelle'],
    soins: ['bilan-podologique', 'soins-de-pedicurie', 'semelles-orthopediques'],
  },
  {
    value: 'sport',
    label: 'Podologie du sport',
    description: 'Course, foulée, prévention des blessures, semelles de sport.',
    animation: 'coureur',
    photos: {
      accueil: '/photos/sport-foulee-herbe.webp',
      panorama: '/photos/sport-trail.webp',
      diaporama: ['/photos/sport-foulee-herbe.webp', '/photos/sport-course.webp', '/photos/sport-trail.webp', '/photos/sport-chaussure.webp', '/photos/sport-lacage.webp'],
    },
    dessins: ['sport', 'appuis', 'analyse'],
    soins: ['podologie-du-sport', 'semelles-orthopediques', 'k-taping', 'bilan-podologique'],
    accentsDonnees: [4, 5],
  },
  {
    value: 'posture',
    label: 'Posture et biomécanique',
    description: 'Analyse de la marche, examen sur plateforme, posturologie.',
    animation: 'trajectoire',
    photos: {
      accueil: '/photos/analyse-plateforme.webp',
      panorama: '/photos/posture-marche-sable.webp',
      diaporama: ['/photos/analyse-plateforme.webp', '/photos/posture-marche-sable.webp', '/photos/posture-empreintes.webp', '/photos/posture-escalier.webp', '/photos/posture-pieds-herbe.webp'],
    },
    dessins: ['equilibre', 'analyse', 'semelle'],
    soins: ['posturologie', 'bilan-podologique', 'semelles-orthopediques'],
  },
  {
    value: 'enfant',
    label: 'Podologie de l’enfant',
    description: 'Croissance, marche, chaussage de l’enfant.',
    animation: 'premiers-pas',
    photos: {
      accueil: '/photos/enfant-bebe.webp',
      panorama: '/photos/enfant-chaussures.webp',
      diaporama: ['/photos/enfant-bebe.webp', '/photos/enfant-pied.webp', '/photos/enfant-herbe.webp', '/photos/enfant-chaussons.webp', '/photos/enfant-baskets.webp'],
    },
    dessins: ['enfant', 'analyse'],
    soins: ['podologie-enfant', 'semelles-orthopediques', 'bilan-podologique'],
    accentsDonnees: [1, 2],
  },
  {
    value: 'soins',
    label: 'Soins et prévention',
    description: 'Pédicurie, pied diabétique, seniors, soins à domicile.',
    animation: 'semelle',
    photos: {
      accueil: '/photos/soin-talon.webp',
      panorama: '/photos/examen-mains.webp',
      diaporama: ['/photos/soin-talon.webp', '/photos/examen-mains.webp', '/photos/soins-pied-tenu.webp', '/photos/soins-bandages.webp', '/photos/generale-pied-profil.webp'],
    },
    dessins: ['soin', 'diabete', 'talon'],
    soins: ['soins-de-pedicurie', 'pied-diabetique', 'podologie-du-senior', 'ongle-incarne', 'soins-a-domicile'],
  },
  {
    // Spécialité de l'univers « Pied diabétique et soins » (catalogue-univers.ts) : l'accueil montre le schéma du
    // dépistage au monofilament (3 sites, IWGDF / HAS), sans animation ni lecture de pression (pas de rouge « pic »
    // sur un public diabétique). Aucun pied nu en marche dans les photos (conseil Ameli : éviter de marcher pieds nus).
    value: 'diabete',
    label: 'Pied diabétique',
    description: 'Dépistage, gradation du risque podologique, soins et prévention des plaies.',
    animation: null,
    photos: {
      accueil: '/photos/soins-pied-tenu.webp',
      panorama: '/photos/examen-mains.webp',
      diaporama: ['/photos/soins-pied-tenu.webp', '/photos/examen-mains.webp', '/photos/soin-talon.webp', '/photos/soins-bandages.webp', '/photos/chaussage.webp'],
    },
    dessins: ['diabete', 'soin', 'senior'],
    soins: ['pied-diabetique', 'soins-de-pedicurie', 'ongle-incarne', 'podologie-du-senior', 'cors-durillons'],
  },
];

export const packVisuel = (value: string) => SPECIALITES.find((s) => s.value === value) ?? SPECIALITES[0];
/** Spécialité d'un identifiant (alias explicite de packVisuel) */
export const specialite = packVisuel;

/**
 * Spécialité proposée par défaut selon le profil de cabinet, quand aucun sujet n'est choisi (les sujets priment :
 * themes.ts, appliquerPriorites). Jamais « posture » par défaut : sujets à faible niveau de preuve,
 * proposés seulement après validation déontologique (règle de Paul, 2026-10-05) ; le profil « technique » mène à la générale.
 */
export const specialiteDuProfil = (profil: string) =>
  ({ sport: 'sport', prevention: 'soins' } as Record<string, string>)[profil] ?? 'generale';

const unique = <T>(l: (T | undefined | null | false | '')[]) => [...new Set(l.filter(Boolean) as T[])];

/**
 * Spécialité principale + secondaire : la principale donne l'accueil (photo, animation, vidéo d'accueil,
 * libellé) ; la secondaire complète les visuels (diaporama, vidéos, dessins, soins mis en avant).
 */
export function fusionnerSpecialites(principale: Specialite, secondaire?: Specialite | null): Specialite {
  if (!secondaire || secondaire.value === principale.value) return principale;
  const videos = [...(principale.videos ?? []), ...(secondaire.videos ?? []).filter((v) => v.usage !== 'accueil')];
  return {
    ...principale,
    photos: {
      accueil: principale.photos.accueil,
      panorama: principale.photos.panorama || secondaire.photos.panorama,
      diaporama: unique([...principale.photos.diaporama.slice(0, 3), ...secondaire.photos.diaporama.slice(0, 2), ...principale.photos.diaporama.slice(3)]),
    },
    ...(videos.length ? { videos } : {}),
    dessins: unique([...(principale.dessins ?? []), ...(secondaire.dessins ?? [])]),
    soins: unique([...(principale.soins ?? []), ...(secondaire.soins ?? [])]),
    ...(principale.accentsDonnees ?? secondaire.accentsDonnees ? { accentsDonnees: principale.accentsDonnees ?? secondaire.accentsDonnees } : {}),
  };
}

/** Personnalisation d'un pack par l'admin (table packs_visuels) ; les champs vides gardent le pack intégré. */
export type PersonnalisationPack = {
  photos?: { accueil?: string; panorama?: string; diaporama?: string[] };
  /** null : animation du pack intégré ; 'aucune' : pas d'animation */
  animation?: Animation | 'aucune' | null;
  /** Photo par soin (slug → URL), venue d'un jeu de photos ; appliquée par completerJeuVisuel (jeux-photos.ts) */
  soins?: Record<string, string>;
  /** Cadrage (CSS object-position) par URL de photo, venu d'un jeu de photos */
  cadrages?: Record<string, string>;
};

export function fusionnerPack(pack: Specialite, perso: PersonnalisationPack | null | undefined): Specialite {
  if (!perso) return pack;
  const p = perso.photos ?? {};
  const diaporama = (p.diaporama ?? []).filter(Boolean);
  return {
    ...pack,
    animation: perso.animation === 'aucune' ? null : perso.animation && (ANIMATIONS as readonly string[]).includes(perso.animation) ? perso.animation : pack.animation,
    photos: {
      accueil: p.accueil || pack.photos.accueil,
      panorama: p.panorama || pack.photos.panorama,
      diaporama: diaporama.length ? diaporama : pack.photos.diaporama,
    },
  };
}
