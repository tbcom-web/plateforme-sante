// PHOTOS SOUS LICENCE (banques payantes) et option « Photos premium » (demande de Paul du 2026-10-09 : « importer des images "avec
// licence" qui font beau sur les modèles de démo, nécessitant ensuite un abonnement payant pour les photos »). Module PUR.
// Règles tirées des conditions des banques : docs/photos-sous-licence.md (Adobe Stock, Getty / iStock, Shutterstock, Unsplash+).
//
// - IMPORT par Paul (fichier ou lot, /admin/photos-sous-licence) : AUCUN téléchargement automatique, aucun compte, aucune API payante.
//   Traçabilité obligatoire (validerDeclarationLicence) : banque, identifiant et page de l'image, type (aperçu/comp, standard, étendue),
//   statut (APERÇU SEULEMENT / ACHETÉE), titulaire, date d'achat, référence, sites par licence, crédit, restrictions, usage sensible.
// - APERÇU SEULEMENT (licence « comp ») : dossier banque/licence/apercu/ ; DÉMO uniquement, comme une image démo (kit-demo.ts :
//   estImageNonPubliable) : jamais enregistré dans un brouillon, publication bloquée. Durée de la licence comp suivie (90 j / 30 j).
// - ACHETÉE : dossier banque/licence/achetee/ ; utilisable seulement sur les sites RATTACHÉS par une licence achetée pour ce site
//   (photos_sous_licence_sites, migration 0057), non expirée, dans la limite des sites par licence (une licence = un client).
// - OFFRE « Photos premium » : badge « Photo premium » dans les aperçus ; côté praticien, « Cette photo nécessite l'option Photos
//   premium » : demander l'option (enregistrement d'une demande, aucun paiement, aucun e-mail) ou remplacer la photo.
// - PUBLICATION : controlerPhotosPremium (BLOQUANT, lib/publication.ts) ; construction Astro : photo sans licence → repli.

import { contientGpsExif, typeImageDepuisOctets, TAILLE_MAX_IMAGE_GENEREE, TYPES_IMAGES_GENEREES, type TypeImageGeneree } from './images-generees';
import { estApercuSousLicence, estPhotoSousLicence, estSujetVisuel, largeursAProduire, type LigneLicenceCsv } from './photos-libres';
import { sujetExclu } from './prompts-images';

// ---------------------------------------------------------------------------------------------------------------
// Banques, types et statuts
// ---------------------------------------------------------------------------------------------------------------

export type BanquePayante = {
  id: string;
  libelle: string;
  /** Conditions officielles (enregistrées avec chaque photo) */
  licenceUrl: string;
  /** Durée de la licence d'aperçu (« comp ») en jours ; null : pas d'aperçu proposé par la banque */
  joursApercu: number | null;
  /** Format du crédit quand il est exigé ({contributeur}) */
  credit: string;
  /** Modèle reconnaissable dans un sujet de santé : interdit (Adobe Stock § 4.1(E)) plutôt que « mention de modèle » */
  santeReconnaissableInterdit: boolean;
};

export const BANQUES_PAYANTES: readonly BanquePayante[] = [
  { id: 'adobe-stock', libelle: 'Adobe Stock', licenceUrl: 'https://stock.adobe.com/license-terms', joursApercu: 90, credit: '{contributeur} / stock.adobe.com', santeReconnaissableInterdit: true },
  { id: 'istock', libelle: 'iStock', licenceUrl: 'https://www.istockphoto.com/legal/license-agreement', joursApercu: 30, credit: 'iStock.com/{contributeur}', santeReconnaissableInterdit: false },
  { id: 'getty', libelle: 'Getty Images', licenceUrl: 'https://www.gettyimages.com/eula', joursApercu: 30, credit: '{contributeur} via Getty Images', santeReconnaissableInterdit: false },
  // Durée de la « Comp Use » non lue dans le texte (page bloquée aux robots) : 30 jours par prudence, à confirmer
  { id: 'shutterstock', libelle: 'Shutterstock', licenceUrl: 'https://www.shutterstock.com/license', joursApercu: 30, credit: '{contributeur} / Shutterstock.com', santeReconnaissableInterdit: false },
  { id: 'unsplash-plus', libelle: 'Unsplash+', licenceUrl: 'https://unsplash.com/plus/license', joursApercu: null, credit: '{contributeur} / Unsplash+', santeReconnaissableInterdit: false },
  { id: 'autre', libelle: 'Autre banque payante', licenceUrl: '', joursApercu: 30, credit: '{contributeur}', santeReconnaissableInterdit: false },
];
export const banquePayante = (id: string | null | undefined) => BANQUES_PAYANTES.find((b) => b.id === id);
export const libelleBanque = (id: string | null | undefined, autre?: string | null) => (id === 'autre' ? String(autre ?? '').trim().slice(0, 60) || 'Autre banque' : banquePayante(id)?.libelle ?? '—');

export const TYPES_LICENCE = ['apercu', 'standard', 'etendue'] as const;
export type TypeLicence = (typeof TYPES_LICENCE)[number];
export const LIBELLES_TYPES_LICENCE: Record<TypeLicence, string> = {
  apercu: 'Aperçu / comp (filigrané ou basse définition)',
  standard: 'Licence standard',
  etendue: 'Licence étendue',
};

export const STATUTS_LICENCE = ['apercu', 'achetee'] as const;
export type StatutLicence = (typeof STATUTS_LICENCE)[number];
export const LIBELLES_STATUTS_LICENCE: Record<StatutLicence, string> = { apercu: 'APERÇU SEULEMENT', achetee: 'ACHETÉE' };

/** Rattachement d'une photo à un site (photos_sous_licence_sites) : demande du praticien, licence achetée par TBCOM, retrait */
export const STATUTS_RATTACHEMENT = ['demandee', 'achetee', 'retiree'] as const;
export type StatutRattachement = (typeof STATUTS_RATTACHEMENT)[number];
export const LIBELLES_RATTACHEMENTS: Record<StatutRattachement, string> = { demandee: 'Option demandée, licence à acheter', achetee: 'Licence achetée pour ce site', retiree: 'Retirée' };

/** Sujets où une personne reconnaissable suggérerait une pathologie (usage « sensible » des banques) */
export const SUJETS_SANTE_SENSIBLES = ['diabete', 'ongles', 'pedicurie'] as const;
/** Mention exigée par Getty, iStock, Shutterstock, Unsplash+ pour un modèle dans un sujet sensible */
export const MENTION_MODELE = 'Photo d’illustration : la personne représentée est un modèle';

export const LIBELLE_PHOTO_PREMIUM = 'Photo premium';
export const MESSAGE_OPTION_PREMIUM = 'Cette photo nécessite l’option Photos premium';

// ---------------------------------------------------------------------------------------------------------------
// Chemins
// ---------------------------------------------------------------------------------------------------------------

/** Identifiant du fichier : 16 caractères hexadécimaux (début de l'empreinte SHA-256 du fichier envoyé) */
export const ID_FICHIER_LICENCE = /^[0-9a-f]{16}$/;
export const ID_LOT_LICENCE = /^[0-9a-f]{12}$/;
export const LOT_MAX_LICENCE = 12;
export const dossierPhotosSousLicence = (statut: StatutLicence) => `banque/licence/${statut}`;
export const cheminPhotoSousLicence = (statut: StatutLicence, id: string, largeur: number) => `${dossierPhotosSousLicence(statut)}/lic-${id}-${largeur}.webp`;
/** Identifiant du fichier d'après son adresse, son chemin ou sa clé (null : pas une photo sous licence) */
export function idPhotoSousLicence(urlOuCle: string | null | undefined): string | null {
  const m = /banque\/licence\/(?:apercu|achetee)\/lic-([0-9a-f]{16})-\d{2,5}\.webp/.exec(String(urlOuCle ?? ''));
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Contrôles du fichier
// ---------------------------------------------------------------------------------------------------------------

export const TAILLE_MAX_PHOTO_LICENCE = TAILLE_MAX_IMAGE_GENEREE;
/** Fichier acheté : grand côté ≥ 1024 px ; aperçu « comp » (souvent basse définition) : ≥ 500 px */
export const GRAND_COTE_MIN_LICENCE = 1024;
export const GRAND_COTE_MIN_APERCU = 500;

export function controlerFichierLicence(e: { octets: Uint8Array; typeAnnonce?: string | null; largeur: number; hauteur: number; statut: StatutLicence; gps?: boolean }): { ok: true; type: TypeImageGeneree } | { ok: false; erreurs: string[] } {
  const erreurs: string[] = [];
  const type = typeImageDepuisOctets(e.octets);
  if (!type) erreurs.push('Format refusé : PNG, JPEG ou WebP seulement.');
  else if (e.typeAnnonce && !(TYPES_IMAGES_GENEREES as readonly string[]).includes(e.typeAnnonce)) erreurs.push('Type de fichier inattendu (PNG, JPEG ou WebP).');
  if (!e.octets.length) erreurs.push('Fichier vide.');
  if (e.octets.length > TAILLE_MAX_PHOTO_LICENCE) erreurs.push(`Fichier trop lourd (${Math.round(TAILLE_MAX_PHOTO_LICENCE / 1024 / 1024)} Mo au plus).`);
  const min = e.statut === 'apercu' ? GRAND_COTE_MIN_APERCU : GRAND_COTE_MIN_LICENCE;
  if (!(Math.max(e.largeur, e.hauteur) >= min)) erreurs.push(`Image trop petite (${e.largeur} × ${e.hauteur} px) : grand côté ${min} px au moins.`);
  if (e.gps ?? contientGpsExif(e.octets)) erreurs.push('Localisation GPS dans les métadonnées : refusée (les métadonnées sont de toute façon retirées, mais un fichier de banque n’en a pas).');
  return erreurs.length || !type ? { ok: false, erreurs } : { ok: true, type };
}

/** Largeurs WebP produites (mêmes que les photos libres, jamais d'agrandissement) */
export const largeursPhotoLicence = (largeurSource: number) => largeursAProduire(largeurSource);

// ---------------------------------------------------------------------------------------------------------------
// Déclaration (traçabilité obligatoire)
// ---------------------------------------------------------------------------------------------------------------

export type DeclarationLicence = {
  banque: string;
  banqueAutre?: string | null;
  /** Identifiant de l'image chez la banque */
  idImage: string;
  /** Page de l'image chez la banque (https) */
  pageUrl: string;
  contributeur?: string | null;
  titre?: string | null;
  sujet: string;
  type: TypeLicence;
  statut: StatutLicence;
  /** Date de téléchargement (aperçu : point de départ de la licence comp) */
  telechargeLe: string;
  /** Achetée : titulaire de la licence (TBCOM ou le client), date d'achat, référence de facture ou de licence */
  titulaire?: string | null;
  dateAchat?: string | null;
  reference?: string | null;
  /** Fin de la licence (null : perpétuelle) */
  expireLe?: string | null;
  /** Nombre de sites (clients) couverts par une licence : 1 par défaut (une licence = un client) */
  sitesParLicence?: number;
  creditRequis: boolean;
  creditTexte?: string | null;
  restrictions?: string | null;
  /** Une personne reconnaissable figure sur la photo */
  personneReconnaissable: boolean;
  /** Paul confirme : la photo ne suggère aucune pathologie ni atteinte de la personne représentée */
  aucunePathologie?: boolean;
  /** Paul a lu les conditions de la banque (aperçu, client, crédit, usage sensible) */
  conditionsVerifiees: boolean;
  lot?: string | null;
  hashtags?: readonly string[];
};

const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const jourValide = (v: unknown) => typeof v === 'string' && JOUR.test(v) && !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime());
const texte = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const https = (v: unknown) => { const t = texte(v, 400); try { return t && new URL(t).protocol === 'https:' ? t : ''; } catch { return ''; } };
const ID_IMAGE = /^[A-Za-z0-9._:-]{2,80}$/;

/** Déclaration de Paul contrôlée avant tout envoi de fichier : valeurs nettoyées, ou erreurs lisibles */
export function validerDeclarationLicence(d: Partial<DeclarationLicence>, maintenant = new Date()): { declaration: DeclarationLicence | null; erreurs: string[] } {
  const erreurs: string[] = [];
  const aujourdhui = maintenant.toISOString().slice(0, 10);
  const b = banquePayante(d.banque);
  if (!b) erreurs.push('Choisissez la banque.');
  const banqueAutre = d.banque === 'autre' ? texte(d.banqueAutre, 60) : null;
  if (d.banque === 'autre' && (banqueAutre ?? '').length < 2) erreurs.push('Donnez le nom de la banque.');
  const idImage = texte(d.idImage, 81);
  if (!ID_IMAGE.test(idImage)) erreurs.push('Identifiant de l’image chez la banque obligatoire (lettres, chiffres, . _ - :).');
  const pageUrl = https(d.pageUrl);
  if (!pageUrl) erreurs.push('Adresse (https) de l’image chez la banque obligatoire.');
  const sujet = String(d.sujet ?? '');
  if (!estSujetVisuel(sujet)) erreurs.push('Choisissez le sujet de la photo.');
  else if (sujetExclu(sujet)) erreurs.push('Pas de posturologie ni de réflexologie.');
  const type = (TYPES_LICENCE as readonly string[]).includes(String(d.type)) ? (d.type as TypeLicence) : null;
  if (!type) erreurs.push('Choisissez le type : aperçu (comp), standard ou étendue.');
  const statut: StatutLicence | null = type ? (type === 'apercu' ? 'apercu' : 'achetee') : null;
  if (d.statut && statut && d.statut !== statut) erreurs.push(statut === 'apercu' ? 'Un aperçu (comp) est « APERÇU SEULEMENT » : il n’est pas acheté.' : 'Une licence standard ou étendue est « ACHETÉE » : renseignez l’achat.');
  if (statut === 'apercu' && b && b.joursApercu === null) erreurs.push(`${b.libelle} ne propose pas d’aperçu (comp) : importez le fichier acheté.`);
  const telechargeLe = String(d.telechargeLe ?? '');
  if (!jourValide(telechargeLe)) erreurs.push('Date de téléchargement invalide.');
  else if (telechargeLe > aujourdhui) erreurs.push('La date de téléchargement ne peut pas être dans le futur.');
  let titulaire: string | null = null, dateAchat: string | null = null, reference: string | null = null, expireLe: string | null = null;
  if (statut === 'achetee') {
    titulaire = texte(d.titulaire, 120);
    if (titulaire.length < 2) erreurs.push('Titulaire de la licence obligatoire (TBCOM ou le client).');
    dateAchat = String(d.dateAchat ?? '');
    if (!jourValide(dateAchat)) erreurs.push('Date d’achat invalide.');
    else if (dateAchat > aujourdhui) erreurs.push('La date d’achat ne peut pas être dans le futur.');
    reference = texte(d.reference, 120);
    if (reference.length < 3) erreurs.push('Référence de la facture ou de la licence obligatoire.');
    expireLe = d.expireLe ? String(d.expireLe) : null;
    if (expireLe && (!jourValide(expireLe) || (jourValide(dateAchat) && expireLe < dateAchat))) erreurs.push('Fin de licence invalide (laisser vide pour une licence perpétuelle).');
  }
  const n = d.sitesParLicence === undefined || d.sitesParLicence === null ? 1 : Number(d.sitesParLicence);
  if (!Number.isInteger(n) || n < 1 || n > 100) erreurs.push('Nombre de sites par licence : entre 1 et 100 (1 : une licence par client).');
  const creditRequis = d.creditRequis === true;
  const creditTexte = texte(d.creditTexte, 160);
  if (creditRequis && creditTexte.length < 3) erreurs.push('Texte du crédit obligatoire quand la licence exige un crédit.');
  const restrictions = texte(d.restrictions, 1000);
  const personneReconnaissable = d.personneReconnaissable === true;
  if (personneReconnaissable && d.aucunePathologie !== true) erreurs.push('Personne reconnaissable : cochez « la photo ne suggère aucune pathologie ni atteinte de la personne » (usage sensible interdit).');
  if (personneReconnaissable && b?.santeReconnaissableInterdit && (SUJETS_SANTE_SENSIBLES as readonly string[]).includes(sujet))
    erreurs.push(`${b.libelle} interdit de suggérer une atteinte physique d’un modèle reconnaissable : choisissez une photo sans personne reconnaissable pour ce sujet.`);
  if (d.conditionsVerifiees !== true) erreurs.push('Cochez : vous avez lu les conditions de la banque (aperçu, client, crédit, usage sensible).');
  const lot = d.lot ? String(d.lot) : null;
  if (lot && !ID_LOT_LICENCE.test(lot)) erreurs.push('Lot invalide.');
  if (erreurs.length || !b || !type || !statut) return { declaration: null, erreurs: [...new Set(erreurs)] };
  return {
    erreurs,
    declaration: {
      banque: b.id, banqueAutre, idImage, pageUrl, contributeur: texte(d.contributeur, 120) || null, titre: texte(d.titre, 160) || null, sujet, type, statut, telechargeLe,
      titulaire, dateAchat, reference, expireLe, sitesParLicence: n, creditRequis, creditTexte: creditRequis ? creditTexte : null, restrictions: restrictions || null,
      personneReconnaissable, aucunePathologie: personneReconnaissable ? true : d.aucunePathologie === true, conditionsVerifiees: true, lot, hashtags: [...(d.hashtags ?? [])],
    },
  };
}

/** Crédit proposé par défaut pour une banque (format de la banque, contributeur saisi) */
export const creditParDefaut = (banque: string, contributeur?: string | null) => (banquePayante(banque)?.credit ?? '{contributeur}').replace('{contributeur}', texte(contributeur, 120) || 'Contributeur');

/** Ligne de photos_sous_licence (migration 0057) */
export type LignePhotoSousLicence = {
  id_fichier: string;
  banque: string;
  banque_nom: string | null;
  id_image: string;
  page_url: string;
  contributeur: string | null;
  titre: string | null;
  sujet: string;
  type_licence: TypeLicence;
  statut_licence: StatutLicence;
  telecharge_le: string;
  titulaire: string | null;
  date_achat: string | null;
  reference_licence: string | null;
  expire_le: string | null;
  sites_par_licence: number;
  credit_requis: boolean;
  credit_texte: string | null;
  restrictions: string | null;
  personne_reconnaissable: boolean;
  aucune_pathologie: boolean;
  licence_url: string | null;
  chemin: string;
  url: string;
  largeurs: number[];
  largeur_originale: number;
  hauteur_originale: number;
  lot: string | null;
  statut: 'a_valider';
  importe_le: string;
};

export function construireLigneLicence(e: { declaration: DeclarationLicence; id: string; importeLe: Date; largeurs: readonly number[]; urlPrincipale: string; largeur: number; hauteur: number }): { ligne: LignePhotoSousLicence | null; erreurs: string[] } {
  const d = e.declaration;
  const erreurs: string[] = [];
  if (!ID_FICHIER_LICENCE.test(e.id)) erreurs.push('Identifiant du fichier invalide.');
  if (!e.largeurs.length) erreurs.push('Aucun fichier produit.');
  if (!/^https?:\/\//.test(e.urlPrincipale)) erreurs.push('Adresse du fichier hébergé invalide.');
  if (!(e.largeur > 0 && e.hauteur > 0)) erreurs.push('Dimensions inconnues.');
  if (Number.isNaN(e.importeLe.getTime())) erreurs.push('Date d’import invalide.');
  if (erreurs.length) return { ligne: null, erreurs };
  const largeurs = [...e.largeurs].sort((a, b) => a - b);
  return {
    erreurs,
    ligne: {
      id_fichier: e.id, banque: d.banque, banque_nom: d.banque === 'autre' ? d.banqueAutre ?? null : null, id_image: d.idImage, page_url: d.pageUrl,
      contributeur: d.contributeur ?? null, titre: d.titre ?? null, sujet: d.sujet, type_licence: d.type, statut_licence: d.statut, telecharge_le: d.telechargeLe,
      titulaire: d.titulaire ?? null, date_achat: d.dateAchat ?? null, reference_licence: d.reference ?? null, expire_le: d.expireLe ?? null,
      sites_par_licence: d.sitesParLicence ?? 1, credit_requis: d.creditRequis, credit_texte: d.creditTexte ?? null, restrictions: d.restrictions ?? null,
      personne_reconnaissable: d.personneReconnaissable, aucune_pathologie: d.aucunePathologie === true, licence_url: banquePayante(d.banque)?.licenceUrl || null,
      chemin: cheminPhotoSousLicence(d.statut, e.id, Math.max(...largeurs)), url: e.urlPrincipale, largeurs, largeur_originale: e.largeur, hauteur_originale: e.hauteur,
      lot: d.lot ?? null, statut: 'a_valider', importe_le: e.importeLe.toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Achat d'une licence pour un site (« Marquer comme achetée pour le site X »)
// ---------------------------------------------------------------------------------------------------------------

export type AchatSite = { reference: string; titulaire: string; dateAchat: string; expireLe: string | null };

export function validerAchatSite(a: Partial<AchatSite>, maintenant = new Date()): { achat: AchatSite | null; erreurs: string[] } {
  const erreurs: string[] = [];
  const reference = texte(a.reference, 120);
  if (reference.length < 3) erreurs.push('Référence de la facture ou de la licence obligatoire.');
  const titulaire = texte(a.titulaire, 120);
  if (titulaire.length < 2) erreurs.push('Titulaire obligatoire (le praticien, licence transférée, ou TBCOM pour son compte).');
  const dateAchat = String(a.dateAchat ?? '');
  if (!jourValide(dateAchat)) erreurs.push('Date d’achat invalide.');
  else if (dateAchat > maintenant.toISOString().slice(0, 10)) erreurs.push('La date d’achat ne peut pas être dans le futur.');
  const expireLe = a.expireLe ? String(a.expireLe) : null;
  if (expireLe && (!jourValide(expireLe) || expireLe < dateAchat)) erreurs.push('Fin de licence invalide (vide : perpétuelle).');
  return erreurs.length ? { achat: null, erreurs } : { achat: { reference, titulaire, dateAchat, expireLe }, erreurs };
}

// ---------------------------------------------------------------------------------------------------------------
// Photos et rattachements (lecture) ; contrôle BLOQUANT de publication
// ---------------------------------------------------------------------------------------------------------------

export type Rattachement = { siteId: string; statut: StatutRattachement; reference?: string | null; titulaire?: string | null; dateAchat?: string | null; expireLe?: string | null; demandeLe?: string | null };
export type PhotoSousLicence = {
  id?: string;
  idFichier: string;
  url: string;
  banque: string;
  banqueNom?: string | null;
  idImage: string;
  pageUrl: string;
  contributeur?: string | null;
  sujet: string;
  type: TypeLicence;
  statutLicence: StatutLicence;
  /** Curation : à valider, validée (dans les tirages du Studio), retirée */
  etat: 'a_valider' | 'validee' | 'retiree';
  telechargeLe: string;
  titulaire?: string | null;
  dateAchat?: string | null;
  reference?: string | null;
  expireLe?: string | null;
  sitesParLicence: number;
  creditRequis: boolean;
  creditTexte?: string | null;
  restrictions?: string | null;
  personneReconnaissable: boolean;
  licenceUrl?: string | null;
  rattachements: readonly Rattachement[];
};

/** Adresses de photos sous licence trouvées n'importe où dans une valeur (brouillon, configuration), sans doublon */
export function photosPremiumDans(v: unknown, max = 50): string[] {
  const r = new Set<string>();
  const vus = new Set<unknown>();
  const parcourir = (x: unknown, profondeur: number) => {
    if (r.size >= max || profondeur > 12) return;
    if (typeof x === 'string') { if (estPhotoSousLicence(x)) r.add(x); return; }
    if (!x || typeof x !== 'object' || vus.has(x)) return;
    vus.add(x);
    for (const y of Array.isArray(x) ? x : Object.values(x as Record<string, unknown>)) parcourir(y, profondeur + 1);
  };
  parcourir(v, 0);
  return [...r];
}

export type RaisonPremium = 'apercu' | 'inconnue' | 'retiree' | 'demandee' | 'sans-licence' | 'expiree' | 'limite';
export const LIBELLES_RAISONS_PREMIUM: Record<RaisonPremium, string> = {
  apercu: 'aperçu (comp) : démo seulement, jamais publié',
  inconnue: 'photo sous licence sans traçabilité',
  retiree: 'photo retirée',
  demandee: 'option demandée, licence pas encore achetée',
  'sans-licence': 'aucune licence achetée pour ce site',
  expiree: 'licence expirée',
  limite: 'limite de sites de la licence dépassée',
};

const licenceExpiree = (expireLe: string | null | undefined, jour: string) => Boolean(expireLe && expireLe < jour);

/** Le site peut-il afficher cette photo ? (licence achetée, rattachée à CE site, non expirée, dans la limite de sa licence) */
export function etatLicencePourSite(p: PhotoSousLicence | undefined, siteId: string, jour: string): { ok: true } | { ok: false; raison: RaisonPremium } {
  if (!p) return { ok: false, raison: 'inconnue' };
  if (p.statutLicence === 'apercu') return { ok: false, raison: 'apercu' };
  if (p.etat === 'retiree') return { ok: false, raison: 'retiree' };
  const r = p.rattachements.find((x) => x.siteId === siteId);
  if (!r || r.statut === 'retiree') return { ok: false, raison: 'sans-licence' };
  if (r.statut === 'demandee') return { ok: false, raison: 'demandee' };
  if (licenceExpiree(r.expireLe, jour)) return { ok: false, raison: 'expiree' };
  // Une licence (même référence) couvre au plus sitesParLicence sites ; les sites rattachés au-delà (dans l'ordre d'achat) sont bloqués
  const memeRef = p.rattachements.filter((x) => x.statut === 'achetee' && (x.reference ?? '') === (r.reference ?? ''))
    .sort((a, b) => String(a.dateAchat ?? '').localeCompare(String(b.dateAchat ?? '')) || a.siteId.localeCompare(b.siteId));
  if (memeRef.findIndex((x) => x.siteId === siteId) >= Math.max(1, p.sitesParLicence)) return { ok: false, raison: 'limite' };
  return { ok: true };
}

export type ManquePremium = { url: string; raison: RaisonPremium };

export const MESSAGE_PHOTOS_PREMIUM = `${MESSAGE_OPTION_PREMIUM} : la licence de cette photo n’a pas encore été achetée pour ce site. Demandez l’option Photos premium (TBCOM achète la licence) ou remplacez la photo par une photo du kit ou la vôtre.`;

/** Contrôle BLOQUANT : chaque photo sous licence de la configuration a-t-elle une licence achetée valable pour ce site ? */
export function controlerPhotosPremium(config: unknown, o: { siteId: string; photos: readonly PhotoSousLicence[]; jour: string }): { ok: true } | { ok: false; message: string; manquantes: ManquePremium[] } {
  const urls = photosPremiumDans(config);
  if (!urls.length) return { ok: true };
  const parId = new Map(o.photos.map((p) => [p.idFichier, p]));
  const manquantes: ManquePremium[] = [];
  for (const url of urls) {
    const id = idPhotoSousLicence(url);
    const etat = estApercuSousLicence(url) ? ({ ok: false, raison: 'apercu' } as const) : etatLicencePourSite(id ? parId.get(id) : undefined, o.siteId, o.jour);
    if (!etat.ok) manquantes.push({ url, raison: etat.raison });
  }
  if (!manquantes.length) return { ok: true };
  const detail = [...new Set(manquantes.map((m) => LIBELLES_RAISONS_PREMIUM[m.raison]))].join(' ; ');
  return { ok: false, message: `${MESSAGE_PHOTOS_PREMIUM} (${manquantes.length} photo${manquantes.length > 1 ? 's' : ''} : ${detail}.)`, manquantes };
}

/** Adresses sous licence NON autorisées pour ce site (construction Astro : remplacées par leur repli, défense en profondeur) */
export const photosPremiumNonAutorisees = (config: unknown, o: { siteId: string; photos: readonly PhotoSousLicence[]; jour: string }): string[] => {
  const c = controlerPhotosPremium(config, o);
  return c.ok ? [] : c.manquantes.map((m) => m.url);
};

/** Crédits à afficher dans les mentions légales pour les photos premium autorisées présentes dans la configuration */
export function creditsPhotosPremium(config: unknown, o: { siteId: string; photos: readonly PhotoSousLicence[]; jour: string }): string[] {
  const parId = new Map(o.photos.map((p) => [p.idFichier, p]));
  const l: string[] = [];
  for (const url of photosPremiumDans(config)) {
    const p = parId.get(idPhotoSousLicence(url) ?? '');
    if (!p || !etatLicencePourSite(p, o.siteId, o.jour).ok) continue;
    if (p.creditRequis) l.push(`Photo : ${p.creditTexte || creditParDefaut(p.banque, p.contributeur)}`);
    // Modèle reconnaissable : mention « posé par un modèle » (Getty, iStock, Shutterstock, Unsplash+ ; prudence pour Adobe Stock)
    if (p.personneReconnaissable) l.push(MENTION_MODELE);
  }
  return [...new Set(l)];
}

// ---------------------------------------------------------------------------------------------------------------
// Côté praticien : option « Photos premium » ou remplacement
// ---------------------------------------------------------------------------------------------------------------

/** Photos premium du brouillon et leur état pour ce site (message du parcours et de /mon-site) */
export function photosPremiumDuDraft(d: unknown, o: { siteId?: string | null; photos?: readonly PhotoSousLicence[]; jour: string }): { url: string; etat: 'achetee' | 'demandee' | 'a-demander' | 'apercu' }[] {
  const parId = new Map((o.photos ?? []).map((p) => [p.idFichier, p]));
  return photosPremiumDans(d).map((url) => {
    if (estApercuSousLicence(url)) return { url, etat: 'apercu' as const };
    const p = parId.get(idPhotoSousLicence(url) ?? '');
    const r = o.siteId ? p?.rattachements.find((x) => x.siteId === o.siteId) : undefined;
    if (o.siteId && p && etatLicencePourSite(p, o.siteId, o.jour).ok) return { url, etat: 'achetee' as const };
    return { url, etat: r?.statut === 'demandee' ? ('demandee' as const) : ('a-demander' as const) };
  });
}

/** Brouillon sans les photos premium (« Remplacer ») : la photo du kit, celles du praticien ou l'illustration reprennent */
export function sansPhotosPremium<D extends object>(d: D, urls?: readonly string[]): D {
  const cibles = new Set(urls ?? photosPremiumDans(d));
  if (!cibles.size) return d;
  const retirer = (x: unknown): unknown => {
    if (typeof x === 'string') return cibles.has(x) ? '' : x;
    if (Array.isArray(x)) return x.filter((y) => !(typeof y === 'string' && cibles.has(y))).map(retirer);
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x as Record<string, unknown>).map(([k, v]) => [k, retirer(v)]));
    return x;
  };
  return retirer(d) as D;
}

// ---------------------------------------------------------------------------------------------------------------
// Admin : alertes et export CSV de conformité
// ---------------------------------------------------------------------------------------------------------------

/** Fin de la licence d'aperçu (comp) : date de téléchargement + durée de la banque */
export function finApercu(p: Pick<PhotoSousLicence, 'banque' | 'telechargeLe' | 'statutLicence'>): string | null {
  const j = banquePayante(p.banque)?.joursApercu;
  if (p.statutLicence !== 'apercu' || !j || !jourValide(p.telechargeLe)) return null;
  return new Date(new Date(`${p.telechargeLe}T12:00:00Z`).getTime() + j * 86_400_000).toISOString().slice(0, 10);
}

export type AlerteLicence = { niveau: 'bloquant' | 'attention'; message: string; photo?: string; site?: string };

export function alertesLicences(photos: readonly PhotoSousLicence[], jour: string, nomsSites: Readonly<Record<string, string>> = {}): AlerteLicence[] {
  const a: AlerteLicence[] = [];
  const nom = (id: string) => nomsSites[id] ?? id;
  const enAttente = new Set(photos.flatMap((p) => p.rattachements.filter((r) => r.statut === 'demandee').map((r) => r.siteId)));
  if (enAttente.size) a.push({ niveau: 'bloquant', message: `${enAttente.size} site${enAttente.size > 1 ? 's attendent' : ' attend'} l’achat d’une licence (option Photos premium demandée).` });
  for (const p of photos) {
    const titre = `${libelleBanque(p.banque, p.banqueNom)} ${p.idImage}`;
    if (p.statutLicence === 'achetee' && licenceExpiree(p.expireLe, jour)) a.push({ niveau: 'bloquant', photo: p.idFichier, message: `Licence expirée (${p.expireLe}) : ${titre}.` });
    for (const r of p.rattachements) {
      if (r.statut === 'achetee' && licenceExpiree(r.expireLe, jour)) a.push({ niveau: 'bloquant', photo: p.idFichier, site: r.siteId, message: `Licence expirée le ${r.expireLe} pour ${nom(r.siteId)} : ${titre}.` });
      const etat = r.statut === 'achetee' ? etatLicencePourSite(p, r.siteId, jour) : null;
      if (etat && !etat.ok && etat.raison === 'limite')
        a.push({ niveau: 'bloquant', photo: p.idFichier, site: r.siteId, message: `Limite de la licence ${r.reference ?? ''} dépassée (${p.sitesParLicence} site(s) par licence) : achetez une licence pour ${nom(r.siteId)} (${titre}).` });
    }
    const fin = finApercu(p);
    if (fin && fin < jour && p.etat !== 'retiree') a.push({ niveau: 'attention', photo: p.idFichier, message: `Aperçu expiré le ${fin} (licence « comp » de ${banquePayante(p.banque)?.joursApercu} jours) : retirez-le des démos ou achetez la licence (${titre}).` });
  }
  return a;
}

/** Lignes du CSV de conformité (même format que l'export des licences libres : csvLicences) : une ligne par photo et par site */
export function lignesCsvPhotosSousLicence(photos: readonly PhotoSousLicence[], nomsSites: Readonly<Record<string, string>> = {}): LigneLicenceCsv[] {
  const l: LigneLicenceCsv[] = [];
  for (const p of photos) {
    const base = {
      fournisseur: libelleBanque(p.banque, p.banqueNom), identifiant: p.idImage, auteur: p.contributeur ?? '', page: p.pageUrl, lienLicence: p.licenceUrl ?? banquePayante(p.banque)?.licenceUrl ?? '',
      fichier: p.url, importe: '',
    };
    const restrictions = [p.creditRequis ? `crédit : ${p.creditTexte}` : '', p.personneReconnaissable ? 'personne reconnaissable (usage sensible)' : '', p.restrictions ?? ''].filter(Boolean).join(' · ');
    l.push({
      ...base, licence: `${LIBELLES_TYPES_LICENCE[p.type]}${p.reference ? `, réf. ${p.reference}` : ''}${p.titulaire ? `, titulaire ${p.titulaire}` : ''}`,
      version: `${LIBELLES_STATUTS_LICENCE[p.statutLicence]}${p.sitesParLicence ? `, ${p.sitesParLicence} site(s) par licence` : ''}${restrictions ? ` · ${restrictions}` : ''}`,
      date: p.dateAchat ?? p.telechargeLe, sujet: p.sujet, statut: p.etat === 'validee' ? 'Validée' : p.etat === 'retiree' ? 'Retirée' : 'À valider',
    });
    for (const r of p.rattachements) {
      l.push({
        ...base, licence: r.reference ? `Licence du site, réf. ${r.reference}${r.titulaire ? `, titulaire ${r.titulaire}` : ''}` : 'Licence à acheter',
        version: r.expireLe ? `jusqu’au ${r.expireLe}` : r.statut === 'achetee' ? 'perpétuelle' : '', date: r.dateAchat ?? r.demandeLe?.slice(0, 10) ?? '',
        sujet: `site ${nomsSites[r.siteId] ?? r.siteId}`, statut: LIBELLES_RATTACHEMENTS[r.statut],
      });
    }
  }
  return l;
}

/** Ligne de base → PhotoSousLicence (lecture admin et construction) */
export function photoSousLicenceDepuisLigne(l: Record<string, unknown>, rattachements: readonly Record<string, unknown>[] = []): PhotoSousLicence {
  const s = (k: string) => (l[k] === null || l[k] === undefined ? null : String(l[k]));
  return {
    id: s('id') ?? undefined, idFichier: String(l.id_fichier ?? ''), url: String(l.url ?? ''), banque: String(l.banque ?? ''), banqueNom: s('banque_nom'), idImage: String(l.id_image ?? ''),
    pageUrl: String(l.page_url ?? ''), contributeur: s('contributeur'), sujet: String(l.sujet ?? 'general'), type: (l.type_licence as TypeLicence) ?? 'standard',
    statutLicence: (l.statut_licence as StatutLicence) ?? 'apercu', etat: (['a_valider', 'validee', 'retiree'].includes(String(l.statut)) ? l.statut : 'a_valider') as PhotoSousLicence['etat'],
    telechargeLe: String(l.telecharge_le ?? '').slice(0, 10), titulaire: s('titulaire'), dateAchat: s('date_achat'), reference: s('reference_licence'), expireLe: s('expire_le'),
    sitesParLicence: Number(l.sites_par_licence ?? 1) || 1, creditRequis: l.credit_requis === true, creditTexte: s('credit_texte'), restrictions: s('restrictions'),
    personneReconnaissable: l.personne_reconnaissable === true, licenceUrl: s('licence_url'),
    rattachements: rattachements.map((r) => ({
      siteId: String(r.site_id ?? ''), statut: (r.statut as StatutRattachement) ?? 'demandee', reference: (r.reference_licence as string | null) ?? null, titulaire: (r.titulaire as string | null) ?? null,
      dateAchat: (r.date_achat as string | null) ?? null, expireLe: (r.expire_le as string | null) ?? null, demandeLe: (r.demande_le as string | null) ?? null,
    })),
  };
}
