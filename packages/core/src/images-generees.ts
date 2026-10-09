// IMAGES GÉNÉRÉES PAR IA importées par Paul (demande du 2026-10-08 ; prompts : prompts-images.ts). Couche 1 (curation) : même
// pipeline que les photos libres (WebP 640 / 1280 / 1920 px au plus, SANS métadonnées), dossier photos/banque/ia/<sujet>/, ligne
// de traçabilité dans photos_libres (source « ia », migration 0040), statut « à valider », puis notation, tri et kits comme les
// autres photos. Module PUR : contrôles du fichier (type réel, taille, dimensions, EXIF de localisation), chemins, traçabilité.
// Aucun appel à un service d'IA : Paul génère lui-même et déclare l'outil, la date, le prompt et les conditions de l'outil.
//
// Règles : étiquette « Image générée » partout dans l'admin ; sur les sites, mention dans les crédits (mentionCreditPhotos) ; jamais
// dans la galerie du cabinet (estImageGeneree, kits-images.ts et jeux-photos.ts) : elle serait prise pour le vrai cabinet.
//
// USAGE (demande de Paul du 2026-10-08 : « un set d'images de cabinet […] et des photos fictives de praticiens […] dans mon kit de
// base ») : choix OBLIGATOIRE à l'import, enregistré (ia_usage, migration 0048).
// - « demo » : Démo uniquement (par défaut pour le cabinet et les praticiens) ; fichier rangé dans banque/ia/demo-<profession>/
//   (estImageDemo) : aperçus seulement (kit-demo.ts), jamais dans la banque des sites ni dans un site publié.
// - « site » : utilisable sur les sites, image GÉNÉRIQUE non présentée comme le cabinet (hygiène, matériel, ambiance, illustration
//   d'un sujet) : case de confirmation dédiée, mention IA des crédits, jamais dans la galerie « Le cabinet ».
// Cabinet (galerie, panorama) et praticiens (portrait, en situation) : « demo » seulement, jamais « site ».

import { estImageGeneree, estSujetVisuel, largeursAProduire, versionLicence } from './photos-libres';
import { estProfession, PROFESSION_PAR_DEFAUT } from './professions';
import { motifsRefus, motifsRefusPraticienFictif, partiePositive, sujetExclu } from './prompts-images';

// ---------------------------------------------------------------------------------------------------------------
// Usage et emplacement (migration 0048)
// ---------------------------------------------------------------------------------------------------------------

export type UsageImageGeneree = 'demo' | 'site';
export const LIBELLES_USAGES_IA: Record<UsageImageGeneree, string> = {
  demo: 'Démo uniquement',
  site: 'Utilisable sur les sites (générique, non présenté comme le cabinet)',
};

export type EmplacementIa = {
  id: string;
  libelle: string;
  /** Usages permis ; le premier est l'usage par défaut */
  usages: readonly UsageImageGeneree[];
  groupe: 'cabinet' | 'praticien' | 'generique';
};

/** Emplacements d'une image générée importée (galerie cabinet démo, portrait démo, hygiène, matériel…) */
export const EMPLACEMENTS_IA: readonly EmplacementIa[] = [
  { id: 'demo-galerie', libelle: 'Galerie du cabinet (démo)', usages: ['demo'], groupe: 'cabinet' },
  { id: 'demo-panorama', libelle: 'Panorama du cabinet (démo)', usages: ['demo'], groupe: 'cabinet' },
  { id: 'demo-portrait', libelle: 'Portrait de praticien fictif (démo)', usages: ['demo'], groupe: 'praticien' },
  { id: 'demo-situation', libelle: 'Praticien fictif en situation (démo)', usages: ['demo'], groupe: 'praticien' },
  { id: 'hygiene', libelle: 'Hygiène et stérilisation', usages: ['demo', 'site'], groupe: 'generique' },
  { id: 'materiel', libelle: 'Matériel', usages: ['demo', 'site'], groupe: 'generique' },
  { id: 'ambiance', libelle: 'Détail d’ambiance', usages: ['demo', 'site'], groupe: 'generique' },
  { id: 'illustration', libelle: 'Illustration d’un sujet (trou d’un kit)', usages: ['site'], groupe: 'generique' },
];
export const emplacementIa = (id: string | null | undefined) => EMPLACEMENTS_IA.find((e) => e.id === id);
/** Usage par défaut d'un emplacement (« Démo uniquement » pour le cabinet et les praticiens) */
export const usageParDefaut = (emplacement: string | null | undefined): UsageImageGeneree => emplacementIa(emplacement)?.usages[0] ?? 'site';
/** Portrait ou praticien en situation : visage FICTIF permis (prompt avec la mention « entièrement fictif ») */
export const emplacementPraticien = (emplacement: string | null | undefined) => emplacementIa(emplacement)?.groupe === 'praticien';

/** Identifiant d'un lot importé en une fois (même set, mêmes métadonnées) : 12 caractères hexadécimaux */
export const ID_LOT_IA = /^[0-9a-f]{12}$/;
/** Nombre de fichiers d'un import en lot (un set de 8 à 12 images) */
export const LOT_MAX_IA = 12;

/** Dossier d'une image générée : banque/ia/demo-<profession>/ (démo) ou banque/ia/<sujet>/ (utilisable sur les sites) */
export const dossierDeclaration = (d: { sujet: string; usage?: UsageImageGeneree | null; profession?: string | null }) =>
  d.usage === 'demo' ? `banque/ia/demo-${d.profession || PROFESSION_PAR_DEFAUT}` : dossierImagesGenerees(d.sujet);

export const SOURCE_IMAGE_GENEREE = 'ia' as const;
export const LIBELLE_IMAGE_GENEREE = 'Image générée';

export const OUTILS_IA: readonly { id: string; libelle: string }[] = [
  { id: 'chatgpt', libelle: 'ChatGPT (OpenAI)' },
  { id: 'midjourney', libelle: 'Midjourney' },
  { id: 'firefly', libelle: 'Adobe Firefly' },
  { id: 'gemini', libelle: 'Google Gemini' },
  { id: 'autre', libelle: 'Autre outil' },
];

/** Libellé de l'outil déclaré (« autre » : nom saisi par Paul) */
export const libelleOutilIa = (id: string, autre?: string | null) =>
  id === 'autre' ? String(autre ?? '').trim().slice(0, 60) : OUTILS_IA.find((o) => o.id === id)?.libelle ?? '';

/** Avertissement affiché à l'import (et rappelé dans la doc) */
export const AVERTISSEMENT_CONDITIONS =
  'Vérifiez vous-même les conditions d’utilisation de l’outil (usage commercial, propriété des images, mentions exigées) : elles changent selon l’outil et l’abonnement. Collez-en le résumé et le lien.';

// ---------------------------------------------------------------------------------------------------------------
// Contrôles du fichier
// ---------------------------------------------------------------------------------------------------------------

export const TYPES_IMAGES_GENEREES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type TypeImageGeneree = (typeof TYPES_IMAGES_GENEREES)[number];
/** Taille maximale envoyée au serveur (limite des fonctions Vercel : 4,5 Mo par requête) ; au-delà, le navigateur réencode */
export const TAILLE_MAX_IMAGE_GENEREE = 4 * 1024 * 1024;
/** Taille maximale choisie sur l'ordinateur ou le téléphone (avant réencodage dans le navigateur) */
export const TAILLE_MAX_FICHIER_CHOISI = 30 * 1024 * 1024;
/** Dimensions minimales : grand côté ≥ 1024 px, petit côté ≥ 768 px (formats des générateurs courants) */
export const GRAND_COTE_MIN_IA = 1024;
export const PETIT_COTE_MIN_IA = 768;

/** Type réel d'après les premiers octets (le type annoncé par le navigateur ne fait pas foi) */
export function typeImageDepuisOctets(o: Uint8Array): TypeImageGeneree | null {
  if (o.length >= 8 && o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47 && o[4] === 0x0d && o[5] === 0x0a && o[6] === 0x1a && o[7] === 0x0a) return 'image/png';
  if (o.length >= 3 && o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return 'image/jpeg';
  if (o.length >= 12 && o[0] === 0x52 && o[1] === 0x49 && o[2] === 0x46 && o[3] === 0x46 && o[8] === 0x57 && o[9] === 0x45 && o[10] === 0x42 && o[11] === 0x50) return 'image/webp';
  return null;
}

/** L'en-tête TIFF d'un bloc EXIF commence-t-il ici (« II*\0 » ou « MM\0* ») ? */
const enTeteTiff = (o: Uint8Array, i: number) =>
  i + 8 <= o.length && ((o[i] === 0x49 && o[i + 1] === 0x49 && o[i + 2] === 0x2a && o[i + 3] === 0x00) || (o[i] === 0x4d && o[i + 1] === 0x4d && o[i + 2] === 0x00 && o[i + 3] === 0x2a));

/** Le bloc TIFF qui commence en `t` déclare-t-il des données GPS (balise 0x8825 de l'IFD0, IFD GPS non vide) ? */
function tiffAvecGps(o: Uint8Array, t: number): boolean {
  const le = o[t] === 0x49;
  const u16 = (i: number) => (i + 2 <= o.length ? (le ? o[i] | (o[i + 1] << 8) : (o[i] << 8) | o[i + 1]) : -1);
  const u32 = (i: number) => (i + 4 <= o.length ? (le ? (o[i] | (o[i + 1] << 8) | (o[i + 2] << 16) | (o[i + 3] << 24)) >>> 0 : ((o[i] << 24) | (o[i + 1] << 16) | (o[i + 2] << 8) | o[i + 3]) >>> 0) : -1);
  const ifd0 = u32(t + 4);
  if (ifd0 < 8) return false;
  const n = u16(t + ifd0);
  if (n <= 0 || n > 500) return false;
  for (let k = 0; k < n; k++) {
    const e = t + ifd0 + 2 + k * 12;
    if (u16(e) !== 0x8825) continue;
    const gps = u32(e + 8);
    if (gps < 8) return true;
    const nGps = u16(t + gps);
    // IFD GPS présent : au moins une entrée autre que la seule version (0x0000) = des coordonnées
    if (nGps <= 0) return false;
    for (let j = 0; j < nGps && j < 64; j++) if (u16(t + gps + 2 + j * 12) > 0) return true;
    return false;
  }
  return false;
}

/**
 * Données de LOCALISATION dans les métadonnées EXIF (JPEG APP1, PNG eXIf, WebP EXIF, ou bloc EXIF brut de sharp) ? Une image
 * générée n'en a pas : leur présence trahit une photo d'appareil. Refusée à l'import (les métadonnées sont de toute façon retirées).
 */
export function contientGpsExif(o: Uint8Array): boolean {
  const limite = Math.min(o.length, 512 * 1024);
  for (let i = 0; i + 8 < limite; i++) {
    // « Exif\0\0 » (JPEG, sharp) puis en-tête TIFF ; ou en-tête TIFF direct (PNG eXIf, WebP EXIF)
    if (o[i] === 0x45 && o[i + 1] === 0x78 && o[i + 2] === 0x69 && o[i + 3] === 0x66 && o[i + 4] === 0 && o[i + 5] === 0 && enTeteTiff(o, i + 6)) {
      if (tiffAvecGps(o, i + 6)) return true;
    } else if (enTeteTiff(o, i) && i > 0) {
      // Chunk PNG « eXIf » ou WebP « EXIF » juste avant (8 octets : type + taille, ou taille + type)
      const avant = String.fromCharCode(...o.slice(Math.max(0, i - 8), i));
      if (/eXIf|EXIF/.test(avant) && tiffAvecGps(o, i)) return true;
    } else if (i === 0 && enTeteTiff(o, 0) && tiffAvecGps(o, 0)) return true;
  }
  return false;
}

export type ControleFichier = { ok: true; type: TypeImageGeneree } | { ok: false; erreurs: string[] };

/** Contrôles serveur du fichier : type réel, taille, dimensions minimales, localisation EXIF */
export function controlerFichierIa(e: { octets: Uint8Array; typeAnnonce?: string | null; largeur: number; hauteur: number; gps?: boolean }): ControleFichier {
  const erreurs: string[] = [];
  const type = typeImageDepuisOctets(e.octets);
  if (!type) erreurs.push('Format refusé : PNG, JPEG ou WebP seulement.');
  else if (e.typeAnnonce && !(TYPES_IMAGES_GENEREES as readonly string[]).includes(e.typeAnnonce)) erreurs.push('Type de fichier inattendu (PNG, JPEG ou WebP).');
  if (e.octets.length > TAILLE_MAX_IMAGE_GENEREE) erreurs.push(`Fichier trop lourd (${Math.round(TAILLE_MAX_IMAGE_GENEREE / 1024 / 1024)} Mo au plus).`);
  if (!e.octets.length) erreurs.push('Fichier vide.');
  const grand = Math.max(e.largeur, e.hauteur), petit = Math.min(e.largeur, e.hauteur);
  if (!(grand >= GRAND_COTE_MIN_IA && petit >= PETIT_COTE_MIN_IA)) erreurs.push(`Image trop petite (${e.largeur} × ${e.hauteur} px) : grand côté ${GRAND_COTE_MIN_IA} px et petit côté ${PETIT_COTE_MIN_IA} px au moins.`);
  if (e.gps ?? contientGpsExif(e.octets)) erreurs.push('Localisation GPS dans les métadonnées : c’est une photo d’appareil, pas une image générée. Refusée.');
  return erreurs.length || !type ? { ok: false, erreurs } : { ok: true, type };
}

// ---------------------------------------------------------------------------------------------------------------
// Chemins
// ---------------------------------------------------------------------------------------------------------------

/** Identifiant d'une image générée : 16 caractères hexadécimaux (début de l'empreinte SHA-256 du fichier envoyé) */
export const ID_IMAGE_GENEREE = /^[0-9a-f]{16}$/;
export const dossierImagesGenerees = (sujet: string) => `banque/ia/${sujet}`;
export const cheminImageGeneree = (sujet: string, id: string, largeur: number) => `${dossierImagesGenerees(sujet)}/ia-${id}-${largeur}.webp`;
/** Chemin d'après la déclaration : banque/ia/demo-<profession>/… pour une image « Démo uniquement » */
export const cheminImageDeclaree = (d: { sujet: string; usage?: UsageImageGeneree | null; profession?: string | null }, id: string, largeur: number) => `${dossierDeclaration(d)}/ia-${id}-${largeur}.webp`;
// estImageGeneree (adresse, chemin ou clé banque/ia/…) est dans photos-libres.ts : kits-images.ts et jeux-photos.ts s'en servent

// ---------------------------------------------------------------------------------------------------------------
// Traçabilité (ligne de photos_libres, source « ia », migration 0040)
// ---------------------------------------------------------------------------------------------------------------

export type DeclarationIa = {
  sujet: string;
  outil: string;
  outilAutre?: string | null;
  /** Date de génération déclarée (AAAA-MM-JJ) */
  genereLe: string;
  prompt: string;
  /** Résumé des conditions d'utilisation de l'outil, saisi par Paul */
  conditions: string;
  conditionsUrl?: string | null;
  /** Paul a vérifié que les conditions autorisent l'usage commercial */
  conditionsVerifiees: boolean;
  /** Paul a vérifié l'image (anatomie, aucun texte, aucun visage, aucune marque) */
  imageVerifiee: boolean;
  hashtags?: readonly string[];
  /** Trou d'origine (<sujet>|<emplacement>), facultatif */
  trou?: string | null;
  /** Usage (absent : « site », comportement d'avant 0048) */
  usage?: UsageImageGeneree;
  /** Emplacement (EMPLACEMENTS_IA ; absent : « illustration ») */
  emplacement?: string;
  /** Profession du kit démo (professions.ts) */
  profession?: string;
  /** Lot importé en une fois (ID_LOT_IA), facultatif */
  lot?: string | null;
  /** Usage « site » : Paul confirme une image générique, sans pièce identifiable, jamais présentée comme le cabinet */
  generiqueConfirme?: boolean;
};

export type LigneImageGeneree = {
  source: 'ia';
  id_source: string;
  auteur_nom: string;
  auteur_url: null;
  page_url: null;
  licence: string;
  licence_version: string;
  licence_url: string | null;
  telecharge_le: string;
  importe_le: string;
  mots_cles: string[];
  requete: string;
  sujet: string;
  chemin: string;
  url: string;
  largeurs: number[];
  largeur_originale: number;
  hauteur_originale: number;
  etiquettes: string[];
  statut: 'a_valider';
  apercu_url: null;
  ia_outil: string;
  ia_prompt: string;
  ia_conditions: string;
  ia_conditions_verifiees: true;
  ia_genere_le: string;
  ia_trou: string | null;
  /** Migration 0048 */
  ia_usage: UsageImageGeneree;
  ia_emplacement: string;
  ia_lot: string | null;
};

/** Colonnes de la migration 0048 (retirées d'une ligne « site / illustration » quand la migration manque) */
export const COLONNES_0048 = ['ia_usage', 'ia_emplacement', 'ia_lot'] as const;
/** Déclaration de l'ancien import (avant 0048) : enregistrable sans les colonnes de 0048 */
export const declarationSans0048 = (d: Pick<DeclarationIa, 'usage' | 'emplacement' | 'lot'>) => (d.usage ?? 'site') === 'site' && (d.emplacement ?? 'illustration') === 'illustration' && !d.lot;

export const PROMPT_MAX = 4000;
export const CONDITIONS_MAX = 1000;
const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const https = (v: unknown) => { const t = String(v ?? '').trim().slice(0, 400); try { return t && new URL(t).protocol === 'https:' ? t : ''; } catch { return ''; } };
const texte = (v: unknown, max: number) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);

/** Déclaration de Paul contrôlée (avant tout envoi de fichier) : erreurs lisibles, ou valeurs nettoyées */
export function validerDeclarationIa(d: Partial<DeclarationIa>, maintenant = new Date()): { declaration: DeclarationIa | null; erreurs: string[] } {
  const erreurs: string[] = [];
  const sujet = String(d.sujet ?? '');
  if (!estSujetVisuel(sujet)) erreurs.push('Choisissez le sujet de l’image.');
  else if (sujetExclu(sujet)) erreurs.push('Pas de posturologie ni de réflexologie.');
  const outil = String(d.outil ?? '');
  if (!OUTILS_IA.some((o) => o.id === outil)) erreurs.push('Indiquez l’outil utilisé.');
  else if (outil === 'autre' && libelleOutilIa('autre', d.outilAutre).length < 2) erreurs.push('Donnez le nom de l’outil utilisé.');
  const genereLe = String(d.genereLe ?? '');
  if (!JOUR.test(genereLe) || Number.isNaN(new Date(`${genereLe}T12:00:00Z`).getTime())) erreurs.push('Date de génération invalide.');
  else if (genereLe > maintenant.toISOString().slice(0, 10)) erreurs.push('La date de génération ne peut pas être dans le futur.');
  // Usage et emplacement : absents = ancien import (illustration d'un sujet, utilisable sur les sites)
  const emplacement = d.emplacement === undefined || d.emplacement === null || d.emplacement === '' ? 'illustration' : String(d.emplacement);
  const e = emplacementIa(emplacement);
  const usage: UsageImageGeneree | null = d.usage === undefined ? (e ? usageParDefaut(emplacement) : null) : d.usage === 'demo' || d.usage === 'site' ? d.usage : null;
  if (!e) erreurs.push('Choisissez l’emplacement de l’image.');
  if (!usage) erreurs.push('Choisissez l’usage : « Démo uniquement » ou « Utilisable sur les sites ».');
  else if (e && !e.usages.includes(usage)) erreurs.push(e.groupe === 'generique'
    ? 'Cet emplacement n’accepte pas cet usage.'
    : 'Cabinet et praticiens : « Démo uniquement ». Une image générée n’est jamais présentée comme le cabinet ou le praticien d’un site publié.');
  if (usage === 'site' && e?.groupe === 'generique' && emplacement !== 'illustration' && d.generiqueConfirme !== true)
    erreurs.push('Cochez : image générique, sans pièce identifiable, jamais présentée comme le cabinet du praticien.');
  const profession = d.profession ? String(d.profession) : PROFESSION_PAR_DEFAUT;
  if (!estProfession(profession)) erreurs.push('Profession inconnue.');
  const lot = d.lot ? String(d.lot) : null;
  if (lot && !ID_LOT_IA.test(lot)) erreurs.push('Lot invalide.');
  const praticien = emplacementPraticien(emplacement);
  const prompt = texte(d.prompt, PROMPT_MAX + 1);
  if (prompt.length < 20) erreurs.push('Collez le prompt utilisé (20 caractères au moins).');
  else if (prompt.length > PROMPT_MAX) erreurs.push(`Prompt trop long (${PROMPT_MAX} caractères au plus).`);
  // Praticien fictif (démo) : visage permis, mention « entièrement fictif » exigée ; sinon règles habituelles (aucun visage)
  else erreurs.push(...(praticien ? motifsRefusPraticienFictif(prompt) : motifsRefus(partiePositive(prompt))).map((m) => `Prompt refusé : ${m}`));
  const conditions = texte(d.conditions, CONDITIONS_MAX + 1);
  if (conditions.length < 10) erreurs.push('Renseignez les conditions d’utilisation de l’outil (10 caractères au moins).');
  else if (conditions.length > CONDITIONS_MAX) erreurs.push(`Conditions trop longues (${CONDITIONS_MAX} caractères au plus).`);
  const conditionsUrl = d.conditionsUrl ? https(d.conditionsUrl) : '';
  if (d.conditionsUrl && String(d.conditionsUrl).trim() && !conditionsUrl) erreurs.push('Lien des conditions : adresse https attendue.');
  if (d.conditionsVerifiees !== true) erreurs.push('Cochez : vous avez vérifié que les conditions de l’outil autorisent l’usage commercial.');
  if (d.imageVerifiee !== true) erreurs.push(praticien
    ? 'Cochez : vous avez vérifié l’image (personne fictive, aucun badge ni nom, aucun logo, mains et pieds corrects).'
    : 'Cochez : vous avez vérifié l’image (cinq orteils, aucun texte, aucun visage, aucune marque).');
  const trou = d.trou && /^[a-z-]{2,30}\|[a-z0-9:-]{2,90}$/.test(d.trou) ? d.trou : null;
  if (erreurs.length || !usage) return { declaration: null, erreurs: [...new Set(erreurs)] };
  return {
    erreurs,
    declaration: {
      sujet, outil, outilAutre: outil === 'autre' ? libelleOutilIa('autre', d.outilAutre) : null, genereLe, prompt, conditions,
      conditionsUrl: conditionsUrl || null, conditionsVerifiees: true, imageVerifiee: true, hashtags: [...(d.hashtags ?? [])], trou,
      usage, emplacement, profession, lot, generiqueConfirme: usage === 'site' && d.generiqueConfirme === true,
    },
  };
}

/** Texte de la case « image vérifiée » selon l'emplacement (praticien fictif : visage permis) */
export const libelleVerificationImage = (emplacement: string | null | undefined) => (emplacementPraticien(emplacement)
  ? 'J’ai vérifié l’image : personne entièrement fictive (aucune ressemblance voulue), aucun badge ni nom, aucun logo, mains et pieds corrects (cinq doigts, cinq orteils), aucun texte.'
  : 'J’ai vérifié l’image : cinq orteils par pied, mains correctes, aucun texte, aucun visage reconnaissable, aucune marque.');

/**
 * Ligne de traçabilité complète d'une image générée importée : source « ia », identifiant (empreinte), auteur = Paul, outil,
 * date de génération, prompt, conditions de l'outil (+ lien), date d'import, fichiers produits. Statut « à valider ».
 */
export function construireTracabiliteIa(e: {
  declaration: DeclarationIa;
  id: string;
  auteurNom: string;
  importeLe: Date;
  largeurs: readonly number[];
  urlPrincipale: string;
  largeur: number;
  hauteur: number;
}): { ligne: LigneImageGeneree | null; erreurs: string[] } {
  const d = e.declaration;
  const erreurs: string[] = [];
  if (!ID_IMAGE_GENEREE.test(e.id)) erreurs.push('Identifiant de l’image invalide.');
  if (!estSujetVisuel(d.sujet)) erreurs.push('Sujet inconnu.');
  const outil = libelleOutilIa(d.outil, d.outilAutre);
  if (outil.length < 2) erreurs.push('Outil manquant.');
  if (!d.prompt.trim()) erreurs.push('Prompt manquant.');
  if (!d.conditions.trim()) erreurs.push('Conditions de l’outil manquantes.');
  if (!d.conditionsVerifiees) erreurs.push('Conditions non vérifiées.');
  const auteur = e.auteurNom.trim().slice(0, 120);
  if (!auteur) erreurs.push('Auteur manquant.');
  if (!e.largeurs.length) erreurs.push('Aucun fichier produit.');
  if (Number.isNaN(e.importeLe.getTime())) erreurs.push('Date d’import invalide.');
  if (!/^https?:\/\//.test(e.urlPrincipale)) erreurs.push('Adresse du fichier hébergé invalide.');
  if (!(e.largeur > 0 && e.hauteur > 0)) erreurs.push('Dimensions inconnues.');
  if (erreurs.length) return { ligne: null, erreurs };
  const largeurs = [...e.largeurs].sort((a, b) => a - b);
  const le = e.importeLe.toISOString();
  return {
    erreurs,
    ligne: {
      source: 'ia', id_source: e.id, auteur_nom: auteur, auteur_url: null, page_url: null,
      licence: `Conditions de ${outil}`.slice(0, 80), licence_version: versionLicence(e.importeLe).replace('texte en vigueur', 'conditions déclarées'), licence_url: d.conditionsUrl ?? null,
      telecharge_le: le, importe_le: le, mots_cles: [], requete: '', sujet: d.sujet,
      chemin: cheminImageDeclaree(d, e.id, Math.max(...largeurs)), url: e.urlPrincipale, largeurs,
      largeur_originale: e.largeur, hauteur_originale: e.hauteur, etiquettes: [], statut: 'a_valider', apercu_url: null,
      ia_outil: outil, ia_prompt: d.prompt, ia_conditions: d.conditions, ia_conditions_verifiees: true, ia_genere_le: d.genereLe, ia_trou: d.trou ?? null,
      ia_usage: d.usage ?? 'site', ia_emplacement: d.emplacement ?? 'illustration', ia_lot: d.lot ?? null,
    },
  };
}

/** Largeurs WebP à produire (mêmes que les photos libres, jamais d'agrandissement) */
export const largeursImageGeneree = (largeurSource: number) => largeursAProduire(largeurSource);

// ---------------------------------------------------------------------------------------------------------------
// Sites : crédits
// ---------------------------------------------------------------------------------------------------------------

export const MENTION_IMAGES_GENEREES = 'Certaines photos d’illustration sont des images générées par intelligence artificielle ; elles ne représentent ni des patients ni le cabinet';

/**
 * Mention « Crédits photos » des mentions légales d'un site (Adobe Stock, images générées, photos premium sous licence) ; null si
 * aucune. `premium` : crédits exigés par les licences des photos premium du site (photos-sous-licence.ts, creditsPhotosPremium).
 */
export function mentionCreditPhotos(e: { adobe?: boolean; ia?: boolean; urls?: readonly (string | null | undefined)[]; premium?: readonly string[] }): string | null {
  const l: string[] = [];
  if (e.adobe) l.push('Photos : Adobe Stock');
  for (const c of e.premium ?? []) if (c && !l.includes(c)) l.push(c);
  if (e.ia || (e.urls ?? []).some((u) => estImageGeneree(u))) l.push(MENTION_IMAGES_GENEREES);
  return l.length ? l.join('. ') : null;
}
