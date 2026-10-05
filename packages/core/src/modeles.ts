// Modèles de présentation des sites.
//
// Un modèle ne contient AUCUN code : c'est une fiche (JSON) qui combine des sections déjà développées
// et testées, et règle polices, arrondis et couleurs. Tout ce qui compte pour le référencement
// (adresses des pages, title, description, H1, données structurées, sitemap, llms.txt, liens internes)
// est produit par le moteur et ne dépend jamais du modèle : changer de modèle ne change pas le SEO.
// Couche 5 de la charte graphique (voir charte.ts et docs/charte-graphique.md) : le modèle règle la mise
// en page ; les invariants (traits, trame, mouvement…) viennent de la charte, les couleurs de la gamme.

import { GAMMES } from './gammes';
import type { Registre } from './dessins';

/**
 * Sections possibles de l'accueil. « etapes » : premier rendez-vous en trois étapes (rendez-vous, venue,
 * consultation), composé à partir des informations déjà saisies, sans intertitre (aucun titre SEO ajouté).
 */
export const SECTIONS_ACCUEIL = ['faits', 'etapes', 'competences', 'panorama', 'praticiens', 'galerie', 'actualites', 'acces', 'faq'] as const;
export type SectionAccueil = (typeof SECTIONS_ACCUEIL)[number];

/** Types d'accueil : diaporama plein écran, photo plein écran, titre + photo côte à côte, grande photo du lieu + carte de contact */
export const HEROS = ['diaporama', 'plein', 'scinde', 'lieu'] as const;
export type Hero = (typeof HEROS)[number];

/**
 * Registre des illustrations du site (voir docs/charte-graphique.md, « Deux registres ») :
 * « releve » = trame de pression, lectures en mono, fonds plan sombres ; « pedagogique » = schémas de manuel au
 * trait, fonds clairs, sans trame, sans lecture de données, sans ligne de scan, sans sur-titres numérotés ; « ligne » = dessins au
 * trait continu (one-line art, ligne.ts), le tracé se dessine à l'apparition (registre proposé pour l'univers Zen : REGISTRE_PROPOSE).
 */
export const REGISTRES_MODELE: readonly Registre[] = ['releve', 'pedagogique', 'ligne'];
/**
 * Registre PROPOSÉ par modèle (non appliqué : les fiches gardent leur jeton `registre`, rien ne change pour les sites en ligne).
 * Zen : le trait continu, doux et épuré, s'accorde à sa typographie légère et à ses formes arrondies. À arbitrer par Paul
 * (variantes de trait et de boucles : docs/charte-graphique.md, « Registre ligne »).
 * TODO(univers) : à reprendre dans le préréglage de l'univers Zen du catalogue d'univers (catalogue-univers.ts) quand il sera stabilisé.
 */
export const REGISTRE_PROPOSE: Readonly<Record<string, Registre>> = { zen: 'ligne' };

export const POLICES_TITRES = ['inter', 'manrope', 'fraunces', 'instrument', 'schibsted', 'nunito'] as const;
export type PoliceTitres = (typeof POLICES_TITRES)[number];
export const POLICES_TEXTE = ['inter', 'manrope', 'nunito'] as const;
export type PoliceTexte = (typeof POLICES_TEXTE)[number];
/** Traitement appliqué aux photos pour l'unité graphique du style */
export const TRAITEMENTS_IMAGES = ['naturel', 'chaud', 'doux', 'contraste'] as const;
export type TraitementImages = (typeof TRAITEMENTS_IMAGES)[number];
/**
 * Texture discrète des sections alternées et des surfaces « plan » : quadrillage de plan d'architecte,
 * trame hexagonale de points (relevé de baropodométrie), courbes de niveau (semelle thermoformée), ou rien.
 */
export const MOTIFS = ['plan', 'trame', 'courbes', 'aucun'] as const;
export type Motif = (typeof MOTIFS)[number];
/**
 * Traitement de la marque du logo (logos.ts) : « plein » = marque claire sur une tuile à la couleur du
 * cabinet ; « trait » = marque à la couleur du cabinet, sans tuile ; « plan » = marque sur tuile « plan
 * d'architecte », points de pression en couleurs de données.
 */
export const TRAITEMENTS_MARQUE = ['plein', 'trait', 'plan'] as const;
export type TraitementMarque = (typeof TRAITEMENTS_MARQUE)[number];

export type ModeleManifeste = {
  /** Identifiant stable (minuscules, chiffres, tirets) */
  id: string;
  nom: string;
  description: string;
  /**
   * Effet recherché, en quelques mots (« Moderne et technique », « Simple et rassurant ») : c'est par lui que le
   * praticien choisit son modèle dans le formulaire. Facultatif (sinon le nom). 40 caractères maximum.
   */
  effet?: string;
  version: number;
  /** En-tête : opaque, ou transparent sur l'image d'accueil puis opaque au défilement */
  entete: 'opaque' | 'transparent';
  accueil: {
    /** diaporama plein écran, photo unique plein écran, titre + photo côte à côte, ou grande photo du lieu */
    hero: Hero;
    /** Assombrissement de l'image d'accueil pour la lisibilité du titre (0 à 90 %) */
    voile: number;
    /** Ordre des sections sous l'en-tête d'accueil */
    sections: SectionAccueil[];
  };
  competences: 'liste' | 'cartes';
  /** Pied de page : sombre (encre), à la couleur du cabinet, ou clair */
  pied: 'sombre' | 'accent' | 'clair';
  /** Apparition des sections au défilement */
  animations: 'douces' | 'aucune';
  /** Couleur proposée au praticien quand il choisit ce modèle (#rrggbb), facultatif */
  couleurConseillee?: string;
  /** Gammes de couleurs recommandées avec ce modèle (identifiants de GAMMES), facultatif */
  gammes?: string[];
  jetons: {
    policeTitres: PoliceTitres;
    policeTexte: PoliceTexte;
    /** Graisse des titres (300 à 800) */
    graisseTitres: number;
    /** Arrondi des cartes et images, en px (0 à 40) */
    rayon: number;
    /** Forme des boutons */
    boutons: 'pilule' | 'arrondi' | 'carre';
    /** « couleur » : boutons à la couleur du cabinet ; « encre » : boutons bleu nuit */
    accent: 'couleur' | 'encre';
    /** Fond des pages (#rrggbb) */
    fond: string;
    /** Traitement des photos : naturel, chaud (beige, terracotta), doux (pastel), contraste (profond) */
    images: TraitementImages;
    /** Fond des sections alternées (#rrggbb), facultatif (sinon teinte de la couleur du cabinet) */
    fondDoux?: string;
    /** Texture des sections (défaut : plan) */
    motif?: Motif;
    /** Fond des surfaces sombres « plan d'architecte » (#rrggbb), facultatif (sinon couleur du cabinet assombrie) */
    plan?: string;
    /** Couleur des lectures de données sur fond sombre : légendes, lignes de scan (#rrggbb), facultatif */
    signal?: string;
    /** Traitement de la marque du logo, facultatif (sinon déduit des autres jetons : voir traitementLogo) */
    logo?: TraitementMarque;
    /** Registre des illustrations, animations, matériel et bibliothèque (défaut : releve) */
    registre?: Registre;
  };
};

const TOUTES = [...SECTIONS_ACCUEIL];

export const MODELES_INTEGRES: ModeleManifeste[] = [
  {
    id: 'proximite',
    nom: 'Proximité',
    effet: 'Clair et factuel',
    description: 'Clair et factuel, aux couleurs du cabinet. Titre et photo côte à côte, typographie grotesque affirmée.',
    version: 2,
    entete: 'opaque',
    accueil: { hero: 'scinde', voile: 0, sections: TOUTES },
    competences: 'liste',
    pied: 'sombre',
    animations: 'douces',
    gammes: ['canard', 'cobalt', 'ardoise', 'sauge'],
    jetons: { policeTitres: 'schibsted', policeTexte: 'inter', graisseTitres: 750, rayon: 18, boutons: 'pilule', accent: 'couleur', fond: '#ffffff', images: 'naturel', fondDoux: '#eef1f4', motif: 'trame', signal: '#6ff2c2', logo: 'plein' },
  },
  {
    id: 'premium',
    nom: 'Médical premium',
    effet: 'Moderne et technique',
    description: 'Bleu nuit et typographie fine, esprit clinique haut de gamme.',
    version: 1,
    entete: 'opaque',
    accueil: { hero: 'scinde', voile: 0, sections: TOUTES },
    competences: 'liste',
    pied: 'sombre',
    animations: 'douces',
    gammes: ['encre', 'cobalt', 'ardoise'],
    jetons: { policeTitres: 'inter', policeTexte: 'inter', graisseTitres: 500, rayon: 14, boutons: 'arrondi', accent: 'encre', fond: '#ffffff', images: 'naturel', fondDoux: '#f4f5f4', motif: 'plan', plan: '#123c8c', signal: '#6ff2c2', logo: 'trait' },
  },
  {
    id: 'prestige',
    nom: 'Prestige',
    effet: 'Élégant et immersif',
    description: 'Diaporama plein écran, en-tête transparent, grands titres élégants.',
    version: 1,
    entete: 'transparent',
    accueil: { hero: 'diaporama', voile: 55, sections: ['faits', 'competences', 'praticiens', 'panorama', 'galerie', 'actualites', 'acces', 'faq'] },
    competences: 'cartes',
    pied: 'sombre',
    animations: 'douces',
    gammes: ['canard', 'prune', 'encre', 'sable'],
    jetons: { policeTitres: 'fraunces', policeTexte: 'inter', graisseTitres: 420, rayon: 6, boutons: 'pilule', accent: 'couleur', fond: '#ffffff', images: 'contraste', fondDoux: '#f6f3ee', motif: 'courbes', signal: '#e9c98f', logo: 'trait' },
  },
  {
    id: 'zen',
    nom: 'Zen',
    effet: 'Doux et apaisant',
    description: 'Tons pastel et grande photo apaisante, typographie légère, formes très arrondies.',
    version: 1,
    entete: 'transparent',
    accueil: { hero: 'plein', voile: 35, sections: ['competences', 'faits', 'praticiens', 'panorama', 'acces', 'galerie', 'actualites', 'faq'] },
    competences: 'cartes',
    pied: 'accent',
    animations: 'douces',
    couleurConseillee: '#2f6f6a',
    gammes: ['sauge', 'canard', 'sable'],
    jetons: { policeTitres: 'manrope', policeTexte: 'manrope', graisseTitres: 300, rayon: 30, boutons: 'pilule', accent: 'couleur', fond: '#fbfcfb', images: 'doux', fondDoux: '#eef4f1', motif: 'courbes', signal: '#bdf0da', logo: 'plein' },
  },
  {
    id: 'atelier',
    nom: 'Atelier',
    effet: 'Chaleureux et éditorial',
    description: 'Beige chaud et terracotta, esprit maison de design : serif éditoriale, angles nets.',
    version: 1,
    entete: 'opaque',
    accueil: { hero: 'scinde', voile: 0, sections: ['faits', 'competences', 'panorama', 'praticiens', 'galerie', 'acces', 'actualites', 'faq'] },
    competences: 'liste',
    pied: 'clair',
    animations: 'douces',
    couleurConseillee: '#b0583a',
    gammes: ['terracotta', 'sable', 'prune'],
    jetons: { policeTitres: 'instrument', policeTexte: 'inter', graisseTitres: 400, rayon: 2, boutons: 'carre', accent: 'couleur', fond: '#f7f2ec', images: 'chaud', fondDoux: '#efe6dc', motif: 'plan', plan: '#3a1f17', signal: '#f2b880', logo: 'plan' },
  },
  {
    // Registre pédagogique : pour les cabinets qui veulent un site simple, lisible et rassurant (patientèle âgée,
    // cabinet de village). L'accueil est la photo du lieu ; les sections sont courtes ; aucune lecture de données.
    // Toutes les sections porteuses d'un intertitre sont présentes (SEO identique aux autres modèles).
    id: 'simple',
    nom: 'Simple et pédagogique',
    effet: 'Simple et rassurant',
    description: 'Grande photo du lieu, téléphone bien visible, textes courts en gros caractères, schémas explicatifs calmes.',
    version: 1,
    entete: 'opaque',
    accueil: { hero: 'lieu', voile: 0, sections: ['competences', 'etapes', 'faq', 'praticiens', 'panorama', 'galerie', 'acces', 'actualites'] },
    competences: 'liste',
    pied: 'clair',
    animations: 'aucune',
    couleurConseillee: '#3f6b4f',
    gammes: ['sauge', 'canard', 'sable', 'ardoise'],
    jetons: { policeTitres: 'nunito', policeTexte: 'nunito', graisseTitres: 750, rayon: 16, boutons: 'arrondi', accent: 'couleur', fond: '#fcfcfa', images: 'naturel', fondDoux: '#f1f4ef', motif: 'aucun', logo: 'plein', registre: 'pedagogique' },
  },
];

/** Effet recherché d'un modèle (choix dans le formulaire du praticien) : celui de la fiche, sinon son nom. */
export const effetModele = (m: Pick<ModeleManifeste, 'nom' | 'effet'>) => m.effet || m.nom;
/** Registre des illustrations d'un modèle (défaut : relevé, pour les fiches antérieures au jeton). */
export const registreModele = (m: Pick<ModeleManifeste, 'jetons'>): Registre => m.jetons.registre ?? 'releve';

const HEX = /^#[0-9a-f]{6}$/i;
const parmi = (v: unknown, valeurs: readonly string[]) => valeurs.includes(v as string);

/**
 * Vérifie une fiche de modèle importée. Retourne la liste des erreurs (vide si valide) et,
 * si elle est valide, la fiche complétée (valeurs par défaut) et réduite aux champs connus.
 */
export function validerManifeste(brut: unknown): { erreurs: string[]; modele?: ModeleManifeste } {
  const e: string[] = [];
  const m = brut as Partial<ModeleManifeste> | null;
  if (!m || typeof m !== 'object') return { erreurs: ['La fiche doit être un objet JSON.'] };
  if (typeof m.id !== 'string' || !/^[a-z0-9-]{3,40}$/.test(m.id)) e.push('« id » : 3 à 40 caractères (minuscules, chiffres, tirets).');
  if (typeof m.nom !== 'string' || !m.nom.trim() || m.nom.length > 60) e.push('« nom » : obligatoire, 60 caractères maximum.');
  if (typeof m.description !== 'string' || m.description.length > 200) e.push('« description » : 200 caractères maximum.');
  if (m.effet !== undefined && (typeof m.effet !== 'string' || m.effet.length > 40)) e.push('« effet » : 40 caractères maximum.');
  if (!Number.isInteger(m.version) || (m.version as number) < 1) e.push('« version » : entier positif.');
  if (!parmi(m.entete, ['opaque', 'transparent'])) e.push('« entete » : « opaque » ou « transparent ».');
  if (!m.accueil || !parmi(m.accueil.hero, HEROS)) e.push(`« accueil.hero » : ${HEROS.join(', ')}.`);
  const voile = m.accueil?.voile ?? 50;
  if (!Number.isInteger(voile) || voile < 0 || voile > 90) e.push('« accueil.voile » : entre 0 et 90.');
  const sections = m.accueil?.sections;
  if (!Array.isArray(sections) || sections.length === 0) e.push('« accueil.sections » : liste non vide.');
  else {
    const inconnues = sections.filter((s) => !parmi(s, SECTIONS_ACCUEIL));
    if (inconnues.length) e.push(`Sections inconnues : ${inconnues.join(', ')}. Possibles : ${SECTIONS_ACCUEIL.join(', ')}.`);
    if (new Set(sections).size !== sections.length) e.push('Une section ne peut apparaître qu’une fois.');
    for (const requise of ['competences', 'acces'] as const) {
      if (!sections.includes(requise)) e.push(`La section « ${requise} » est obligatoire (contenu utile au référencement local).`);
    }
  }
  if (!parmi(m.competences, ['liste', 'cartes'])) e.push('« competences » : « liste » ou « cartes ».');
  const pied = m.pied ?? 'sombre';
  if (!parmi(pied, ['sombre', 'accent', 'clair'])) e.push('« pied » : « sombre », « accent » ou « clair ».');
  const animations = m.animations ?? 'douces';
  if (!parmi(animations, ['douces', 'aucune'])) e.push('« animations » : « douces » ou « aucune ».');
  if (m.couleurConseillee !== undefined && !HEX.test(m.couleurConseillee)) e.push('« couleurConseillee » : couleur au format #rrggbb.');
  if (m.gammes !== undefined && (!Array.isArray(m.gammes) || m.gammes.some((g) => !GAMMES.some((x) => x.id === g)))) {
    e.push(`« gammes » : liste parmi ${GAMMES.map((g) => g.id).join(', ')}.`);
  }
  const j = m.jetons;
  if (!j) e.push('« jetons » : obligatoire.');
  else {
    if (!parmi(j.policeTitres, POLICES_TITRES)) e.push(`« jetons.policeTitres » : ${POLICES_TITRES.join(', ')}.`);
    if (j.policeTexte !== undefined && !parmi(j.policeTexte, POLICES_TEXTE)) e.push(`« jetons.policeTexte » : ${POLICES_TEXTE.join(' ou ')}.`);
    if (!Number.isInteger(j.graisseTitres) || j.graisseTitres < 300 || j.graisseTitres > 800) e.push('« jetons.graisseTitres » : entre 300 et 800.');
    if (!Number.isInteger(j.rayon) || j.rayon < 0 || j.rayon > 40) e.push('« jetons.rayon » : entre 0 et 40.');
    if (j.boutons !== undefined && !parmi(j.boutons, ['pilule', 'arrondi', 'carre'])) e.push('« jetons.boutons » : « pilule », « arrondi » ou « carre ».');
    if (!parmi(j.accent, ['couleur', 'encre'])) e.push('« jetons.accent » : « couleur » ou « encre ».');
    if (j.fond !== undefined && !HEX.test(j.fond)) e.push('« jetons.fond » : couleur au format #rrggbb.');
    if (j.images !== undefined && !parmi(j.images, TRAITEMENTS_IMAGES)) e.push(`« jetons.images » : ${TRAITEMENTS_IMAGES.join(', ')}.`);
    if (j.fondDoux !== undefined && !HEX.test(j.fondDoux)) e.push('« jetons.fondDoux » : couleur au format #rrggbb.');
    if (j.motif !== undefined && !parmi(j.motif, MOTIFS)) e.push(`« jetons.motif » : ${MOTIFS.join(', ')}.`);
    if (j.plan !== undefined && !HEX.test(j.plan)) e.push('« jetons.plan » : couleur au format #rrggbb.');
    if (j.signal !== undefined && !HEX.test(j.signal)) e.push('« jetons.signal » : couleur au format #rrggbb.');
    if (j.logo !== undefined && !parmi(j.logo, TRAITEMENTS_MARQUE)) e.push(`« jetons.logo » : ${TRAITEMENTS_MARQUE.join(', ')}.`);
    if (j.registre !== undefined && !parmi(j.registre, REGISTRES_MODELE)) e.push(`« jetons.registre » : ${REGISTRES_MODELE.join(' ou ')}.`);
  }
  if (e.length) return { erreurs: e };

  // Valeurs par défaut pour les champs facultatifs ; aucun champ inconnu n'est conservé.
  const v = m as ModeleManifeste;
  return {
    erreurs: [],
    modele: {
      id: v.id,
      nom: v.nom.trim(),
      description: v.description,
      ...(v.effet?.trim() ? { effet: v.effet.trim() } : {}),
      version: v.version,
      entete: v.entete,
      accueil: { hero: v.accueil.hero, voile, sections: v.accueil.sections },
      competences: v.competences,
      pied,
      animations,
      ...(v.couleurConseillee ? { couleurConseillee: v.couleurConseillee } : {}),
      ...(v.gammes?.length ? { gammes: v.gammes } : {}),
      jetons: {
        policeTitres: v.jetons.policeTitres,
        policeTexte: v.jetons.policeTexte ?? 'inter',
        graisseTitres: v.jetons.graisseTitres,
        rayon: v.jetons.rayon,
        boutons: v.jetons.boutons ?? 'pilule',
        accent: v.jetons.accent,
        fond: v.jetons.fond ?? '#ffffff',
        images: v.jetons.images ?? 'naturel',
        ...(v.jetons.fondDoux ? { fondDoux: v.jetons.fondDoux } : {}),
        motif: v.jetons.motif ?? 'plan',
        ...(v.jetons.plan ? { plan: v.jetons.plan } : {}),
        ...(v.jetons.signal ? { signal: v.jetons.signal } : {}),
        ...(v.jetons.logo ? { logo: v.jetons.logo } : {}),
        registre: v.jetons.registre ?? 'releve',
      },
    },
  };
}

export const modeleIntegre = (id: string) => MODELES_INTEGRES.find((m) => m.id === id) ?? MODELES_INTEGRES[0];
