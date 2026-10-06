// Brouillon de site édité dans le back-office (colonne sites.config), version 2.
// Modèle issu de l'analyse des 79 sites webpodologue (docs/referentiel-sites-praticiens.md).
import { MODELES_INTEGRES } from './modeles';
import { specialiteDuProfil } from './packs';
import { nettoyerEquipements, nettoyerEquipementsAutres } from './equipements';
import type { Horaire, SiteConfig } from './types';
import { horaireDe, normaliserHoraires, noteAvecNonLus, JOURS_SEMAINE } from './horaires';
import type { Voix } from './lexique';
import type { SectionAccueil } from './modeles';
import type { Registre } from './dessins';
import { deduirePriorites, normaliserPriorites, type Priorites } from './themes';

export type MiseEnPage = SiteConfig['theme']['mise_en_page'];
export type StyleImages = SiteConfig['theme']['style_images'];

export type Pays = 'FR' | 'BE' | 'CH';
export type Profil = 'proximite' | 'groupe' | 'sport' | 'prevention' | 'technique';
/** Identifiant d'un modèle de présentation (intégré ou importé par l'admin) */
export type Modele = string;
export type StatutPraticien = 'titulaire' | 'collaborateur' | 'remplacant';
export type TypeLieu = 'cabinet' | 'maison_sante' | 'pole_sante' | 'centre_medical';
export type ModeRdv = 'en_ligne' | 'telephone' | 'les_deux';

export type PraticienDraft = {
  id: string;
  prenom: string;
  nom: string;
  statut: StatutPraticien;
  /** France : n° d'inscription au tableau de l'Ordre (9 chiffres) */
  numeroOrdre: string;
  /** France : RPPS (11 chiffres), facultatif */
  rpps: string;
  /** Belgique : n° INAMI (5-XXXXX-XX-XXX) */
  inami: string;
  /** Suisse : membre de la Société Suisse des Podologues */
  membreSsp: boolean;
  /** Suisse : n° RCC/ZSR */
  rcc: string;
  diplome: string;
  ecole: string;
  formations: string[];
  /** Compétences mises en avant (slugs du catalogue) */
  orientations: string[];
  /** Sports suivis (profil sport) */
  sports: string[];
  /** Lien de RDV propre au praticien (sinon celui du cabinet) */
  rdvUrl: string;
  /** Jours de présence, si différents du cabinet (ex. « Vendredi et samedi ») */
  presence: string;
  bio: string;
  /** URL publique du portrait (facultatif) */
  photo: string;
  /** Portrait composé par le studio (portrait.ts) : photo retouchée, photo détourée, style, cadrage et rendus ; absent = photo simple */
  portrait?: import('./portrait').PortraitStudio;
};

export type LieuDraft = {
  id: string;
  type: TypeLieu;
  /** Nom du lieu : « Maison de santé des Brotteaux » ; vide pour un cabinet simple */
  nom: string;
  adresse: string;
  complement: string;
  codePostal: string;
  ville: string;
  /** Les 7 jours, lundi → dimanche, plages structurées (horaires.ts) */
  horaires: Horaire[];
  /** « Sur rendez-vous uniquement » affiché sous les horaires */
  surRendezVous: boolean;
  /** Note courte sous les horaires (« Fermé en août »), contrôlée par le lexique ; garde aussi les anciens horaires non interprétés */
  noteHoraires: string;
};

export type SiteDraft = {
  version: 2;
  pays: Pays;
  profil: Profil;
  voix: Voix;
  cabinet: {
    nom: string;
    ville: string;
    quartier: string;
    telephone: string;
    email: string;
    /** Communes voisines / secteurs, pour le référencement local */
    communes: string[];
  };
  lieux: LieuDraft[];
  praticiens: PraticienDraft[];
  acces: {
    pmr: boolean;
    parking: string;
    transports: string;
    autres: string[];
  };
  rdv: { mode: ModeRdv; outil: string; url: string };
  paiements: string[];
  /** Matériel et hygiène : identifiants du catalogue EQUIPEMENTS (equipements.ts) */
  equipements: string[];
  /** Autre matériel, texte libre facultatif (une ligne par élément) */
  equipementsAutres: string;
  /** jours : jours de visites possibles (cases de l'éditeur d'horaires) */
  domicile: { actif: boolean; creneaux: string; secteurs: string[]; jours: string[] };
  message: { texte: string; jusquAu: string };
  conventionnement: string;
  /** Style (modèle), spécialité (pack visuel) et animation d'accueil */
  theme: {
    couleur: string;
    modele: Modele;
    specialite: string;
    /** Spécialité secondaire : complète les visuels (diaporama, dessins, soins) ; '' = aucune */
    specialiteSecondaire: string;
    /** Gamme de couleurs de la charte ; '' = couleur libre (theme.couleur) */
    gamme: string;
    /** Style visuel : illustrations seules, photos seules ou mélange des deux */
    modeVisuel: ModeVisuel;
    /** Logo : marque de l'univers métier et disposition (voir logos.ts) */
    logo: { marque: string; disposition: 'horizontale' | 'empilee' | 'monogramme' };
    /** Logo existant du cabinet (fichier envoyé) : remplace la marque générée ; complet = contient déjà le nom */
    logoPerso: { url: string; complet: boolean };
    animation: boolean;
    /**
     * Jeu de photos affecté (table jeux_photos, voir jeux-photos.ts) : tiré au hasard à la création du site et à
     * chaque changement de spécialité principale, ou jeu exclusif posé par l'admin ; '' = photos intégrées.
     * Jamais choisi par le praticien (contrôlé côté serveur et en base).
     */
    jeuPhotos: string;
    /**
     * Univers du catalogue appliqué (catalogue-univers.ts, appliquerUnivers) ; absent : site composé à la main.
     * Les quatre champs suivants sont posés par l'univers et facultatifs (sites antérieurs inchangés).
     */
    univers?: string;
    /** Soins à présenter en premier, dans cet ordre (seuls les soins cochés dans « soins » sont affichés) */
    soinsEnAvant?: string[];
    /** Ordre des sections de l'accueil : permutation des sections du modèle, sinon ignoré (modeleDuSite) */
    sections?: SectionAccueil[];
    /** Registre des illustrations, s'il diffère de celui du modèle */
    registre?: Registre;
  };
  /** Réception des articles du flux de contenus */
  flux: { mode: 'manuel' | 'auto'; themes: string[] };
  /** URLs publiques des photos (stockage Supabase) */
  photos: { accueil: string; panorama: string; cabinet: string[] };
  /**
   * Hiérarchie du site (themes.ts) : jusqu'à 3 thèmes principaux par ordre de préférence (menu, cartes de l'accueil, pages
   * de thème) et jusqu'à 3 thèmes secondaires (« Aussi au cabinet »). Absent d'un brouillon ancien : déduit à la lecture
   * de la spécialité et des soins cochés (normaliserDraft).
   */
  priorites: Priorites;
  /** Slugs des compétences choisies dans le catalogue de la profession */
  soins: string[];
  /** Fiches conseils proposées aux patients (identifiants de SUJETS_FICHES_CONSEILS, catalogue-univers.ts), facultatif */
  fichesConseils?: string[];
  /** Textes personnalisés dans l'éditeur visuel (surcouche du standard, voir personnalisation.ts) */
  perso: { textes: Record<string, string> };
};

/**
 * Style visuel du site : illustrations techniques (recommandé, par défaut des nouveaux sites), photos, ou
 * mélange. Les illustrations sont le visuel principal de la plateforme : adaptées aux couleurs de chaque
 * site, sans personne à l'image ; les photos de banque restent un complément facultatif.
 * Les sites existants gardent la valeur enregistrée.
 */
export type ModeVisuel = 'illustrations' | 'photos' | 'mixte';
export const MODES_VISUELS: { value: ModeVisuel; label: string; description: string }[] = [
  { value: 'illustrations', label: 'Illustrations (recommandé)', description: 'Dessins et animations techniques aux couleurs du cabinet, sans photo d’illustration. Vos propres photos restent affichées.' },
  { value: 'mixte', label: 'Mélange', description: 'Illustrations dans les listes ; photo sur la page de chaque soin quand elle est de qualité.' },
  { value: 'photos', label: 'Photos', description: 'Des photos partout : cabinet, soins, ambiance.' },
];

export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

export const PAYS: { value: Pays; label: string; titre: string; outilsRdv: string[]; paiements: string[] }[] = [
  { value: 'FR', label: 'France', titre: 'Pédicure-podologue', outilsRdv: ['Doctolib', 'RdvDoc', 'Maiia', 'Autre'], paiements: ['Carte bancaire', 'Chèques', 'Espèces'] },
  { value: 'BE', label: 'Belgique', titre: 'Podologue', outilsRdv: ['Rosa', 'Doctoranytime', 'Progenda', 'Autre'], paiements: ['Bancontact', 'Payconiq / QR code', 'Espèces', 'Virement'] },
  { value: 'CH', label: 'Suisse', titre: 'Podologue ES', outilsRdv: ['OneDoc', 'Medicosearch', 'Autre'], paiements: ['Carte bancaire', 'TWINT', 'Espèces', 'Facture'] },
];

export const PROFILS: { value: Profil; label: string; description: string; voix: Voix; modele: Modele }[] = [
  { value: 'proximite', label: 'Cabinet de proximité', description: 'Être trouvé facilement, avec les informations pratiques.', voix: 'tiers', modele: 'proximite' },
  { value: 'groupe', label: 'Cabinet de groupe / maison de santé', description: 'Plusieurs praticiens, un RDV par praticien.', voix: 'nous', modele: 'proximite' },
  { value: 'sport', label: 'Sport et posture', description: 'Podologie du sport, posturologie, analyse de la course.', voix: 'tiers', modele: 'premium' },
  { value: 'prevention', label: 'Prévention et soins', description: 'Pied diabétique, seniors, visites à domicile.', voix: 'tiers', modele: 'simple' },
  { value: 'technique', label: 'Techniques et équipements', description: 'Laser, plateforme podométrique, approche moderne.', voix: 'nous', modele: 'premium' },
];

export const VOIX: { value: Voix; label: string; exemple: string }[] = [
  { value: 'tiers', label: '3e personne', exemple: '« Camille Rousseau, pédicure-podologue, vous accueille… »' },
  { value: 'nous', label: 'Nous', exemple: '« Nous vous accueillons au cabinet… »' },
  { value: 'je', label: 'Je', exemple: '« Je vous accueille au cabinet… »' },
];

/** Modèles intégrés (les modèles importés par l'admin s'y ajoutent côté back-office). */
export const MODELES: { value: Modele; label: string; description: string }[] = MODELES_INTEGRES.map((m) => ({ value: m.id, label: m.nom, description: m.description }));

export const TYPES_LIEU: { value: TypeLieu; label: string }[] = [
  { value: 'cabinet', label: 'Cabinet libéral' },
  { value: 'maison_sante', label: 'Maison de santé' },
  { value: 'pole_sante', label: 'Pôle / espace de santé' },
  { value: 'centre_medical', label: 'Centre médical' },
];

export const STATUTS: { value: StatutPraticien; label: string }[] = [
  { value: 'titulaire', label: 'Titulaire' },
  { value: 'collaborateur', label: 'Collaborateur·rice' },
  { value: 'remplacant', label: 'Remplaçant·e' },
];

/** Thèmes des articles du flux de contenus. */
export const THEMES_FLUX = ['Prévention', 'Sport', 'Enfants', 'Diabète', 'Seniors', 'Saison', 'Actualité de la profession'] as const;

export const COULEURS_SUGGEREES = ['#1f6a64', '#2563a8', '#0b1c24', '#7b4fa0', '#b5583a', '#3d6b3a', '#b0802b'];

// Conservés pour les anciens gabarits.
export const MISES_EN_PAGE: { value: MiseEnPage; label: string; description: string }[] = [
  { value: 'sobre', label: 'Sobre', description: 'Épuré et professionnel' },
  { value: 'chaleureux', label: 'Chaleureux', description: 'Rond, doux et accueillant' },
  { value: 'premium', label: 'Premium', description: 'Élégant, typographie à empattements' },
];
export const STYLES_IMAGES: { value: StyleImages; label: string }[] = [
  { value: 'organique', label: 'Formes organiques' },
  { value: 'lignes', label: 'Dessin au trait' },
  { value: 'minimal', label: 'Minimaliste' },
];

const id = () => Math.random().toString(36).slice(2, 10);

export const horairesParDefaut = (): Horaire[] =>
  JOURS.map((jour) => horaireDe(jour, jour === 'Samedi' || jour === 'Dimanche' ? [] : [{ debut: '09:00', fin: '12:30' }, { debut: '14:00', fin: '19:00' }]));

export const praticienVide = (statut: StatutPraticien = 'titulaire'): PraticienDraft => ({
  id: id(), prenom: '', nom: '', statut, numeroOrdre: '', rpps: '', inami: '', membreSsp: false, rcc: '',
  diplome: '', ecole: '', formations: [], orientations: [], sports: [], rdvUrl: '', presence: '', bio: '', photo: '',
});

export const lieuVide = (): LieuDraft => ({
  id: id(), type: 'cabinet', nom: '', adresse: '', complement: '', codePostal: '', ville: '', horaires: horairesParDefaut(), surRendezVous: false, noteHoraires: '',
});

export const draftVide = (): SiteDraft => ({
  version: 2,
  pays: 'FR',
  profil: 'proximite',
  voix: 'tiers',
  cabinet: { nom: '', ville: '', quartier: '', telephone: '', email: '', communes: [] },
  lieux: [lieuVide()],
  praticiens: [praticienVide()],
  acces: { pmr: false, parking: '', transports: '', autres: [] },
  rdv: { mode: 'les_deux', outil: 'Doctolib', url: '' },
  paiements: ['Carte bancaire', 'Chèques', 'Espèces'],
  equipements: [],
  equipementsAutres: '',
  domicile: { actif: false, creneaux: '', secteurs: [], jours: [] },
  message: { texte: '', jusquAu: '' },
  conventionnement: '',
  theme: { couleur: COULEURS_SUGGEREES[0], modele: 'proximite', specialite: 'generale', specialiteSecondaire: '', gamme: '', modeVisuel: 'illustrations', logo: { marque: 'empreinte', disposition: 'horizontale' }, logoPerso: { url: '', complet: true }, animation: true, jeuPhotos: '' },
  photos: { accueil: '', panorama: '', cabinet: [] },
  flux: { mode: 'manuel', themes: [] },
  priorites: { principaux: [], secondaires: [] },
  soins: [],
  perso: { textes: {} },
});

/**
 * Lieu complet, horaires structurés (7 jours, plages) : les anciens horaires en texte libre sont convertis, le texte non
 * interprétable passe dans la note du lieu (rien n'est perdu, horaires.ts).
 */
function lieuNormalise(l: Record<string, any>): LieuDraft {
  const { horaires, nonLus } = normaliserHoraires(Array.isArray(l?.horaires) ? l.horaires : horairesParDefaut());
  return {
    ...lieuVide(),
    ...l,
    horaires,
    surRendezVous: Boolean(l?.surRendezVous),
    noteHoraires: noteAvecNonLus(typeof l?.noteHoraires === 'string' ? l.noteHoraires : '', nonLus),
  };
}

/** Convertit un brouillon (v1 ou v2 partiel) en v2 complet. */
export function normaliserDraft(brut: unknown): SiteDraft {
  const vide = draftVide();
  const d = (brut ?? {}) as Record<string, any>;

  if (d.version === 2) {
    return {
      ...vide,
      ...d,
      cabinet: { ...vide.cabinet, ...d.cabinet },
      acces: { ...vide.acces, ...d.acces },
      rdv: { ...vide.rdv, ...d.rdv },
      domicile: { ...vide.domicile, ...d.domicile, jours: Array.isArray(d.domicile?.jours) ? JOURS_SEMAINE.filter((j) => d.domicile.jours.includes(j)) : [] },
      message: { ...vide.message, ...d.message },
      // Brouillon enregistré sans style visuel : il garde l'ancien défaut (mélange), seul un nouveau site part en illustrations.
      theme: { ...vide.theme, modeVisuel: 'mixte', specialite: specialiteDuProfil(d.profil), ...d.theme, jeuPhotos: typeof d.theme?.jeuPhotos === 'string' ? d.theme.jeuPhotos : '' },
      flux: { ...vide.flux, ...d.flux, themes: Array.isArray(d.flux?.themes) ? d.flux.themes : [] },
      photos: { ...vide.photos, ...d.photos, cabinet: Array.isArray(d.photos?.cabinet) ? d.photos.cabinet : [] },
      lieux: Array.isArray(d.lieux) && d.lieux.length ? d.lieux.map((l: any) => lieuNormalise(l)) : vide.lieux,
      praticiens: Array.isArray(d.praticiens) && d.praticiens.length ? d.praticiens.map((p: any) => ({ ...praticienVide(), ...p })) : vide.praticiens,
      soins: Array.isArray(d.soins) ? d.soins : [],
      // Priorités enregistrées : normalisées ; absentes (brouillon antérieur) : déduites de la spécialité et des soins.
      priorites: d.priorites !== undefined && d.priorites !== null
        ? normaliserPriorites(d.priorites)
        : deduirePriorites({ soins: Array.isArray(d.soins) ? d.soins : [], theme: { specialite: d.theme?.specialite ?? specialiteDuProfil(d.profil), specialiteSecondaire: d.theme?.specialiteSecondaire, soinsEnAvant: Array.isArray(d.theme?.soinsEnAvant) ? d.theme.soinsEnAvant : [] } }),
      // Sites enregistrés avant la rubrique « Matériel et hygiène » : aucun équipement.
      equipements: nettoyerEquipements(d.equipements),
      equipementsAutres: nettoyerEquipementsAutres(d.equipementsAutres),
      perso: { textes: d.perso?.textes && typeof d.perso.textes === 'object' ? d.perso.textes : {} },
      version: 2,
    };
  }

  // Version 1 : un praticien, un cabinet.
  const p1 = d.praticien ?? {};
  const c1 = d.cabinet ?? {};
  const rpps = String(p1.rpps ?? '');
  return {
    ...vide,
    cabinet: { ...vide.cabinet, nom: c1.nom ?? '', ville: c1.ville ?? '', quartier: c1.quartier ?? '', telephone: c1.telephone ?? '' },
    lieux: [lieuNormalise({ adresse: c1.adresse ?? '', codePostal: c1.codePostal ?? '', ville: c1.ville ?? '', horaires: c1.horaires ?? horairesParDefaut() })],
    praticiens: [{ ...praticienVide(), prenom: p1.prenom ?? '', nom: p1.nom ?? '', rpps: rpps.length === 11 ? rpps : '', numeroOrdre: rpps.length === 9 ? rpps : '' }],
    acces: { ...vide.acces, pmr: Boolean(c1.pmr) },
    rdv: { mode: d.rdv?.url ? 'les_deux' : 'telephone', outil: d.rdv?.plateforme || 'Doctolib', url: d.rdv?.url ?? '' },
    theme: { ...vide.theme, modeVisuel: 'mixte', couleur: d.theme?.couleur ?? vide.theme.couleur },
    soins: Array.isArray(d.soins) ? d.soins : [],
    priorites: deduirePriorites({ soins: Array.isArray(d.soins) ? d.soins : [], theme: vide.theme }),
  };
}
