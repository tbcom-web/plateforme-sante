// Brouillon de site édité dans le back-office (colonne sites.config), version 2.
// Modèle issu de l'analyse des 79 sites webpodologue (docs/referentiel-sites-praticiens.md).
import { MODELES_INTEGRES } from './modeles';
import { specialiteDuProfil } from './packs';
import type { Horaire, SiteConfig } from './types';
import type { Voix } from './lexique';

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
  horaires: Horaire[];
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
  domicile: { actif: boolean; creneaux: string; secteurs: string[] };
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
    animation: boolean;
  };
  /** Réception des articles du flux de contenus */
  flux: { mode: 'manuel' | 'auto'; themes: string[] };
  /** URLs publiques des photos (stockage Supabase) */
  photos: { accueil: string; panorama: string; cabinet: string[] };
  /** Slugs des compétences choisies dans le catalogue de la profession */
  soins: string[];
  /** Textes personnalisés dans l'éditeur visuel (surcouche du standard, voir personnalisation.ts) */
  perso: { textes: Record<string, string> };
};

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
  { value: 'prevention', label: 'Prévention et soins', description: 'Pied diabétique, seniors, visites à domicile.', voix: 'tiers', modele: 'proximite' },
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
  JOURS.map((jour) => ({ jour, heures: jour === 'Samedi' || jour === 'Dimanche' ? 'Fermé' : '9h00–12h30, 14h00–19h00' }));

export const praticienVide = (statut: StatutPraticien = 'titulaire'): PraticienDraft => ({
  id: id(), prenom: '', nom: '', statut, numeroOrdre: '', rpps: '', inami: '', membreSsp: false, rcc: '',
  diplome: '', ecole: '', formations: [], orientations: [], sports: [], rdvUrl: '', presence: '', bio: '', photo: '',
});

export const lieuVide = (): LieuDraft => ({
  id: id(), type: 'cabinet', nom: '', adresse: '', complement: '', codePostal: '', ville: '', horaires: horairesParDefaut(),
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
  domicile: { actif: false, creneaux: '', secteurs: [] },
  message: { texte: '', jusquAu: '' },
  conventionnement: '',
  theme: { couleur: COULEURS_SUGGEREES[0], modele: 'proximite', specialite: 'generale', specialiteSecondaire: '', gamme: '', animation: true },
  photos: { accueil: '', panorama: '', cabinet: [] },
  flux: { mode: 'manuel', themes: [] },
  soins: [],
  perso: { textes: {} },
});

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
      domicile: { ...vide.domicile, ...d.domicile },
      message: { ...vide.message, ...d.message },
      theme: { ...vide.theme, specialite: specialiteDuProfil(d.profil), ...d.theme },
      flux: { ...vide.flux, ...d.flux, themes: Array.isArray(d.flux?.themes) ? d.flux.themes : [] },
      photos: { ...vide.photos, ...d.photos, cabinet: Array.isArray(d.photos?.cabinet) ? d.photos.cabinet : [] },
      lieux: Array.isArray(d.lieux) && d.lieux.length ? d.lieux.map((l: any) => ({ ...lieuVide(), ...l })) : vide.lieux,
      praticiens: Array.isArray(d.praticiens) && d.praticiens.length ? d.praticiens.map((p: any) => ({ ...praticienVide(), ...p })) : vide.praticiens,
      soins: Array.isArray(d.soins) ? d.soins : [],
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
    lieux: [{ ...lieuVide(), adresse: c1.adresse ?? '', codePostal: c1.codePostal ?? '', ville: c1.ville ?? '', horaires: c1.horaires ?? horairesParDefaut() }],
    praticiens: [{ ...praticienVide(), prenom: p1.prenom ?? '', nom: p1.nom ?? '', rpps: rpps.length === 11 ? rpps : '', numeroOrdre: rpps.length === 9 ? rpps : '' }],
    acces: { ...vide.acces, pmr: Boolean(c1.pmr) },
    rdv: { mode: d.rdv?.url ? 'les_deux' : 'telephone', outil: d.rdv?.plateforme || 'Doctolib', url: d.rdv?.url ?? '' },
    theme: { ...vide.theme, couleur: d.theme?.couleur ?? vide.theme.couleur },
    soins: Array.isArray(d.soins) ? d.soins : [],
  };
}
