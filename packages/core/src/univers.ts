// Univers métier : couche 2 de la charte. Chaque profession traduit les invariants de la marque
// (charte.ts) dans sa propre culture visuelle : un motif signature, une palette « de données » (ce que
// ses examens mesurent), ses familles de dessins et d'animations, et ses spécialités (couche 3 : photos,
// vidéos, dessins prioritaires, soins mis en avant). Nous définissons les univers ; le praticien choisit
// ensuite sa spécialité (et une secondaire), sa gamme de couleurs et son modèle.
//
// Seule la podologie est implémentée. Les autres professions (kinésithérapie : vecteurs de mouvement et
// amplitudes ; ostéopathie : lignes de tension ; orthophonie : ondes sonores ; sage-femme : courbes douces)
// suivront le même type : voir docs/charte-graphique.md, « Ajouter une profession ».

import { interpoler } from './couleurs';
import { SPECIALITES, ANIMATIONS, type Animation, type Specialite } from './packs';

/** Dessins techniques de la podologie (apps/sites/src/components/dessins/Dessin.astro) */
export const DESSINS_PODOLOGIE = ['analyse', 'semelle', 'soin', 'diabete', 'sport', 'enfant', 'equilibre', 'talon', 'appuis'] as const;
export type NomDessin = (typeof DESSINS_PODOLOGIE)[number];

/**
 * Marques (icônes du logo) d'un univers : chacune traduit un geste ou un examen du métier. Le dessin est
 * produit par logos.ts (svgMarque), dans la grammaire de la charte ; ici, l'identifiant, le libellé
 * proposé au praticien et l'idée métier.
 */
export type MarqueLogo = { id: string; nom: string; sens: string };

/** Marques de la podologie : géométrie du pied (pied.ts), trame de pression, pointillés du podoscope… */
export const MARQUES_PODOLOGIE = [
  { id: 'empreinte', nom: 'Empreinte', sens: 'Relevé au podoscope : contour de la plante en pointillés, orteils et deux points d’appui (talon, 1re tête métatarsienne).' },
  { id: 'trame', nom: 'Trame de pression', sens: 'Baropodométrie : la plante en trame hexagonale de points, dont la taille suit la pression.' },
  { id: 'courbes', nom: 'Courbes de niveau', sens: 'Semelle thermoformée : contours imbriqués de la plante, comme les lignes d’un relief.' },
  { id: 'trajet', nom: 'Centre de pression', sens: 'Analyse du pas : trajet du centre de pression du talon au gros orteil, sur le contour du pied.' },
  { id: 'appuis', nom: 'Polygone d’appui', sens: 'Posturologie et stabilométrie : les deux pieds, le polygone d’appui et le centre de gravité, marqué d’un point.' },
  { id: 'voute', nom: 'Voûte plantaire', sens: 'Examen statique : l’arche interne vue de profil, cotée entre le sol et son sommet.' },
  { id: 'anatomie', nom: 'Anatomie du pied', sens: 'Le squelette stylisé dans le contour de la plante : calcanéum, tarse, cinq rayons métatarsiens et phalanges, têtes métatarsiennes marquées comme zones d’appui.' },
  { id: 'semelle-sport', nom: 'Semelle de course', sens: 'Podologie du sport : une semelle de course vue de dessous, crantage en lignes à l’avant-pied et en points au talon, renfort talon.' },
  { id: 'podoscope-data', nom: 'Relevé de pression', sens: 'Baropodométrie, version données : la plante en points colorés selon la pression (du bleu au rouge), avec une échelle graduée.' },
  { id: 'chaussure-marathon', nom: 'Chaussure de course', sens: 'Analyse de la foulée et conseil de chaussage : une chaussure de course de profil, semelle intermédiaire et drop, deux lignes de vitesse.' },
  { id: 'monogramme', nom: 'Monogramme', sens: 'Initiales du cabinet dans la police des titres, soulignées par une échelle de pression graduée.' },
] as const satisfies readonly MarqueLogo[];
export type NomMarque = (typeof MARQUES_PODOLOGIE)[number]['id'];

/** Motif signature d'un univers : la texture qui le rend reconnaissable */
export type MotifSignature = {
  id: string;
  nom: string;
  /** Ce que le motif représente dans la pratique du métier */
  sens: string;
};

/** Palette de données : 5 niveaux, du plus faible au plus fort, avec leurs arrêts d'interpolation */
export type PaletteDonnees = {
  /** Grandeur représentée (pression, amplitude, tension…) */
  grandeur: string;
  libelles: [string, string, string, string, string];
  couleurs: [string, string, string, string, string];
  arrets: [number, number, number, number, number];
};

export type UniversMetier = {
  id: string;
  nom: string;
  /** Slugs des professions rattachées (table professions) */
  professions: string[];
  motif: MotifSignature;
  donnees: PaletteDonnees;
  /** Familles de dessins et d'animations disponibles */
  dessins: readonly string[];
  animations: readonly string[];
  /** Spécialités proposées au praticien (couche 3) */
  specialites: Specialite[];
  specialiteParDefaut: string;
  /** Marques proposées pour le logo (logos.ts) et marque par défaut */
  marques: readonly MarqueLogo[];
  marqueParDefaut: string;
};

/** Palette de pression de la podologie (relevé de baropodométrie) : bleu → vert d'eau → jaune → orange → rouge */
export const PRESSION = ['#3e7bfa', '#22c3a6', '#ffc23d', '#ff7a2f', '#f0352f'] as const;
export const ARRETS_PRESSION = [0, 0.35, 0.6, 0.8, 1] as const;

export const UNIVERS = {
  podologie: {
    id: 'podologie',
    nom: 'Podologie',
    professions: ['pedicure-podologue', 'podologue'],
    motif: { id: 'trame-pression', nom: 'Trame de pression', sens: 'Relevé de podoscope et de baropodométrie : points en trame hexagonale colorés par la pression, contours en pointillés.' },
    donnees: {
      grandeur: 'pression plantaire',
      libelles: ['faible', 'modérée', 'moyenne', 'forte', 'pic'],
      couleurs: [...PRESSION],
      arrets: [...ARRETS_PRESSION],
    },
    dessins: DESSINS_PODOLOGIE,
    animations: ANIMATIONS,
    specialites: SPECIALITES,
    specialiteParDefaut: 'generale',
    marques: MARQUES_PODOLOGIE,
    marqueParDefaut: 'empreinte',
  },
} satisfies Record<string, UniversMetier>;

export const UNIVERS_LISTE: UniversMetier[] = Object.values(UNIVERS);

/** Univers d'un identifiant (ou d'un slug de profession) ; podologie par défaut */
export const universMetier = (id: string): UniversMetier =>
  UNIVERS_LISTE.find((u) => u.id === id || u.professions.includes(id)) ?? UNIVERS.podologie;

export const paletteDonnees = (u: UniversMetier) => u.donnees;

/** Couleur de la palette de données d'un univers pour une valeur entre 0 et 1 */
export const couleurDonnee = (u: UniversMetier, v: number) => interpoler(u.donnees.couleurs, u.donnees.arrets, v);

/** Couleur de pression (podologie) pour une valeur entre 0 et 1 */
export const couleurPression = (v: number) => interpoler(PRESSION, ARRETS_PRESSION, v);

export type { Animation, Specialite };
