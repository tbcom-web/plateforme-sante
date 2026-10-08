// Sources et licences de TOUTES les images (demande de Paul, 2026-10-07 : « assure-toi que les images enregistrées
// enregistrent la source et éventuellement la licence associée »). Module pur :
// - banque intégrée (apps/sites/public/photos) : crédits Unsplash typés (credits-photos.ts) ;
// - photos libres Pexels / Pixabay : traçabilité de photos_libres (0028, 0031), dès « Garder » ;
// - images générées par IA importées par Paul (banque/ia/…) : traçabilité de photos_libres, source « ia » (0040 : outil, prompt, conditions) ;
// - photos envoyées à la main par l'admin dans la banque (banque/jeux/…, banque/sites/… d'un jeu « banque ») : provenance
//   OBLIGATOIRE à l'envoi (table photos_sources, migration 0031) — Adobe Stock (référence de licence), photo personnelle /
//   réalisée pour le cabinet (auteur), autre banque (nom, adresse, licence) ; sinon « Source à renseigner » ;
// - Adobe Stock d'un jeu exclusif : licences_photos (0016), au nom du client ;
// - photos des praticiens (dossier <site_id>/, jeux « praticien ») : leurs photos, pas de licence exigée.
// Un seul récapitulatif (/admin/photos → Sources et licences) et le même export CSV.

import { creditPhotoIntegree, CREDITS_PHOTOS_INTEGREES, LICENCE_UNSPLASH } from './credits-photos';
import type { LigneLicenceCsv } from './photos-libres';

// ---------------------------------------------------------------------------------------------------------------
// Provenance des photos envoyées à la main
// ---------------------------------------------------------------------------------------------------------------

export const PROVENANCES_PHOTO = ['adobe-stock', 'personnelle', 'autre-banque'] as const;
export type ProvenancePhoto = (typeof PROVENANCES_PHOTO)[number];
export const LIBELLES_PROVENANCES: Record<ProvenancePhoto, string> = {
  'adobe-stock': 'Adobe Stock',
  personnelle: 'Photo personnelle / réalisée pour le cabinet',
  'autre-banque': 'Autre banque d’images',
};

/** Source d'une photo envoyée à la main (ligne de photos_sources, sans auteur du compte) */
export type SourcePhotoManuelle = {
  provenance: ProvenancePhoto;
  /** Adobe Stock : référence de la licence */
  referenceLicence?: string | null;
  /** Photo personnelle : auteur (photographe, cabinet) */
  auteur?: string | null;
  /** Autre banque : nom, page de la photo, licence (+ lien) */
  banque?: string | null;
  urlSource?: string | null;
  licence?: string | null;
  licenceUrl?: string | null;
};

const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const https = (v: unknown) => { const t = texte(v, 400); try { return t && new URL(t).protocol === 'https:' ? t : ''; } catch { return ''; } };

/** Champs obligatoires selon la provenance ; valeurs nettoyées (sans les champs des autres provenances) */
export function validerSourcePhoto(e: unknown): { source: SourcePhotoManuelle | null; erreurs: string[] } {
  const x = (e ?? {}) as Record<string, unknown>;
  const provenance = x.provenance as ProvenancePhoto;
  const erreurs: string[] = [];
  if (!PROVENANCES_PHOTO.includes(provenance)) return { source: null, erreurs: ['Choisissez la provenance de la photo.'] };
  if (provenance === 'adobe-stock') {
    const referenceLicence = texte(x.referenceLicence, 80);
    if (!referenceLicence) erreurs.push('Référence de la licence Adobe Stock obligatoire.');
    return erreurs.length ? { source: null, erreurs } : { source: { provenance, referenceLicence }, erreurs };
  }
  if (provenance === 'personnelle') {
    const auteur = texte(x.auteur, 120);
    if (!auteur) erreurs.push('Auteur de la photo obligatoire (photographe ou cabinet).');
    return erreurs.length ? { source: null, erreurs } : { source: { provenance, auteur }, erreurs };
  }
  const banque = texte(x.banque, 80);
  const urlSource = https(x.urlSource);
  const licence = texte(x.licence, 120);
  const licenceUrl = https(x.licenceUrl) || null;
  if (!banque) erreurs.push('Nom de la banque obligatoire.');
  if (!urlSource) erreurs.push('Adresse (https) de la photo dans la banque obligatoire.');
  if (!licence) erreurs.push('Licence obligatoire.');
  return erreurs.length ? { source: null, erreurs } : { source: { provenance, banque, urlSource, licence, licenceUrl, auteur: texte(x.auteur, 120) || null }, erreurs };
}

// ---------------------------------------------------------------------------------------------------------------
// Classement d'une image d'après son adresse
// ---------------------------------------------------------------------------------------------------------------

export type TypeSourceImage = 'integree' | 'libre' | 'ia' | 'banque' | 'adobe' | 'praticien' | 'inconnue';
export const LIBELLES_TYPES_SOURCE: Record<TypeSourceImage, string> = {
  integree: 'Banque intégrée (Unsplash)',
  libre: 'Photo libre (Pexels / Pixabay)',
  ia: 'Image générée (IA)',
  banque: 'Envoyée dans la banque',
  adobe: 'Adobe Stock (licence du client)',
  praticien: 'Fournie par le praticien',
  inconnue: 'Origine inconnue',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Chemin dans le bucket « photos » d'une adresse de stockage Supabase (null : pas une photo du stockage) */
export function cheminStockagePhoto(url: string): string | null {
  const i = url.indexOf('/storage/v1/object/public/photos/');
  if (i < 0) return null;
  const c = decodeURIComponent(url.slice(i + '/storage/v1/object/public/photos/'.length).split('?')[0]);
  return c && !c.includes('..') ? c : null;
}

/**
 * Type de source d'après l'adresse et, pour le dossier d'un jeu exclusif, la source du jeu (« adobe », « praticien »,
 * « banque »). Dossier <site_id>/ : photo envoyée par le praticien depuis son espace.
 */
export function typeSourceImage(url: string, sourceDuJeu?: 'banque' | 'adobe' | 'praticien' | null): TypeSourceImage {
  if (/^\/photos\/[a-z0-9-]+\.(webp|jpe?g|png|avif)$/.test(url)) return creditPhotoIntegree(url) ? 'integree' : 'inconnue';
  const c = cheminStockagePhoto(url);
  if (!c) return 'inconnue';
  if (c.startsWith('banque/libres/')) return 'libre';
  if (c.startsWith('banque/ia/')) return 'ia';
  if (UUID.test(c.split('/')[0])) return 'praticien';
  if (c.startsWith('banque/sites/')) return sourceDuJeu === 'adobe' ? 'adobe' : sourceDuJeu === 'praticien' ? 'praticien' : 'banque';
  if (c.startsWith('banque/')) return 'banque';
  return 'inconnue';
}

// ---------------------------------------------------------------------------------------------------------------
// Récapitulatif « Sources et licences »
// ---------------------------------------------------------------------------------------------------------------

export type LigneSourceImage = {
  url: string;
  /** Chemin du stockage (photos envoyées : clé de photos_sources) */
  chemin: string | null;
  type: TypeSourceImage;
  fournisseur: string;
  auteur: string;
  /** Page d'origine de la photo */
  lien: string;
  licence: string;
  lienLicence: string;
  date: string;
  statut: string;
  /** Source ou licence manquante : « Source à renseigner » */
  aRenseigner: boolean;
  /** Où l'image est utilisée (jeux, sujet) */
  usage: string;
};

export type EntreeRecap = {
  /** Photos libres (photos_libres) */
  libres?: readonly { url: string | null; apercuUrl: string | null; source: 'pexels' | 'pixabay' | 'ia'; idSource: string; auteur: string; pageUrl: string | null; licence: string; licenceVersion: string; licenceUrl: string | null; telechargeLe: string | null; importeLe: string | null; statut: string; sujet: string; iaOutil?: string | null }[];
  /** Photos des jeux (adresse, nom et source du jeu) */
  photosJeux?: readonly { url: string; jeu: string; source: 'banque' | 'adobe' | 'praticien' }[];
  /** Sources des photos envoyées (photos_sources), par chemin */
  manuelles?: Readonly<Record<string, SourcePhotoManuelle & { le?: string | null }>>;
  /** Licences Adobe Stock (licences_photos) */
  adobe?: readonly { url: string; reference: string; dateAchat: string | null; transferee: boolean; site: string }[];
};

const LIB_STATUT_LIBRE: Record<string, string> = { a_valider: 'À valider', validee: 'Validée', retiree: 'Retirée' };
const ORDRE: TypeSourceImage[] = ['inconnue', 'banque', 'praticien', 'adobe', 'libre', 'ia', 'integree'];

/** Toutes les images avec leur source et leur licence (une ligne par image ; « à renseigner » d'abord) */
export function recapSourcesImages(e: EntreeRecap): LigneSourceImage[] {
  const l: LigneSourceImage[] = [];
  const vues = new Set<string>();
  const usages = new Map<string, string[]>();
  for (const p of e.photosJeux ?? []) usages.set(p.url, [...(usages.get(p.url) ?? []), p.jeu]);
  const usage = (url: string) => [...new Set(usages.get(url) ?? [])].join(', ');
  const ajouter = (x: LigneSourceImage) => { if (vues.has(x.url)) return; vues.add(x.url); l.push(x); };

  for (const c of CREDITS_PHOTOS_INTEGREES) {
    const url = `/photos/${c.fichier}`;
    ajouter({ url, chemin: null, type: 'integree', fournisseur: 'Unsplash', auteur: c.photographe, lien: c.urlSource, licence: LICENCE_UNSPLASH.nom, lienLicence: LICENCE_UNSPLASH.url, date: c.date, statut: 'Hébergée (banque intégrée)', aRenseigner: false, usage: usage(url) });
  }
  for (const p of e.libres ?? []) {
    const url = p.url ?? p.apercuUrl ?? `${p.source}:${p.idSource}`;
    // Image générée par IA (source « ia », migration 0040) : outil déclaré, auteur = Paul, conditions de l'outil
    const ia = p.source === 'ia';
    ajouter({
      url, chemin: p.url ? cheminStockagePhoto(p.url) : null, type: ia ? 'ia' : 'libre',
      fournisseur: ia ? `Image générée par IA${p.iaOutil ? ` (${p.iaOutil})` : ''}` : p.source === 'pexels' ? 'Pexels' : 'Pixabay', auteur: p.auteur, lien: p.pageUrl ?? '',
      licence: `${p.licence}, ${p.licenceVersion}`, lienLicence: p.licenceUrl ?? '', date: (p.importeLe ?? p.telechargeLe ?? '').slice(0, 10),
      statut: `${LIB_STATUT_LIBRE[p.statut] ?? p.statut}${p.url ? '' : ' (non importée)'}`, aRenseigner: false, usage: usage(url),
    });
  }
  const adobe = new Map((e.adobe ?? []).map((a) => [a.url, a]));
  for (const p of e.photosJeux ?? []) {
    if (vues.has(p.url)) continue;
    const type = typeSourceImage(p.url, p.source);
    const chemin = cheminStockagePhoto(p.url);
    const base = { url: p.url, chemin, type, usage: usage(p.url) };
    if (type === 'praticien') {
      ajouter({ ...base, fournisseur: 'Praticien', auteur: '', lien: '', licence: 'Photo fournie par le praticien', lienLicence: '', date: '', statut: 'Photo du praticien', aRenseigner: false });
    } else if (type === 'adobe') {
      const a = adobe.get(p.url);
      ajouter({ ...base, fournisseur: 'Adobe Stock', auteur: '', lien: '', licence: a ? `Adobe Stock, réf. ${a.reference}` : 'Adobe Stock', lienLicence: 'https://stock.adobe.com/license-terms', date: a?.dateAchat ?? '',
        statut: a ? (a.transferee ? 'Transférée au client' : 'Non transférée') : 'Licence à renseigner', aRenseigner: !a });
    } else if (type === 'banque') {
      const s = chemin ? e.manuelles?.[chemin] : undefined;
      ajouter({ ...base, ...ligneManuelle(s), date: s?.le?.slice(0, 10) ?? '', statut: s ? 'Source renseignée' : 'Source à renseigner', aRenseigner: !s });
    } else if (type === 'inconnue') {
      ajouter({ ...base, fournisseur: '', auteur: '', lien: '', licence: '', lienLicence: '', date: '', statut: 'Source à renseigner', aRenseigner: true });
    }
  }
  // Licences Adobe Stock enregistrées pour des photos qui ne sont plus dans un jeu (preuve conservée)
  for (const a of e.adobe ?? []) {
    ajouter({ url: a.url, chemin: cheminStockagePhoto(a.url), type: 'adobe', fournisseur: 'Adobe Stock', auteur: '', lien: '', licence: `Adobe Stock, réf. ${a.reference}`, lienLicence: 'https://stock.adobe.com/license-terms',
      date: a.dateAchat ?? '', statut: a.transferee ? 'Transférée au client' : 'Non transférée', aRenseigner: false, usage: usage(a.url) || `site ${a.site}` });
  }
  // Sources renseignées pour des photos qui ne sont plus dans un jeu : gardées dans le récapitulatif (preuve)
  for (const [chemin, s] of Object.entries(e.manuelles ?? {})) {
    if (l.some((x) => x.chemin === chemin)) continue;
    ajouter({ url: chemin, chemin, type: 'banque', ...ligneManuelle(s), date: s.le?.slice(0, 10) ?? '', statut: 'Source renseignée (photo hors jeux)', aRenseigner: false, usage: '' });
  }
  return l.sort((a, b) => Number(b.aRenseigner) - Number(a.aRenseigner) || ORDRE.indexOf(a.type) - ORDRE.indexOf(b.type));
}

function ligneManuelle(s: SourcePhotoManuelle | undefined): Pick<LigneSourceImage, 'fournisseur' | 'auteur' | 'lien' | 'licence' | 'lienLicence'> {
  if (!s) return { fournisseur: '', auteur: '', lien: '', licence: '', lienLicence: '' };
  if (s.provenance === 'adobe-stock') return { fournisseur: 'Adobe Stock', auteur: '', lien: '', licence: `Adobe Stock, réf. ${s.referenceLicence}`, lienLicence: 'https://stock.adobe.com/license-terms' };
  if (s.provenance === 'personnelle') return { fournisseur: 'Photo personnelle', auteur: s.auteur ?? '', lien: '', licence: 'Photo personnelle / réalisée pour le cabinet', lienLicence: '' };
  return { fournisseur: s.banque ?? '', auteur: s.auteur ?? '', lien: s.urlSource ?? '', licence: s.licence ?? '', lienLicence: s.licenceUrl ?? '' };
}

/** Libellé court de la source d'une image (cartes de la bibliothèque et de « Donner mon avis ») */
export function libelleSourceImage(x: LigneSourceImage): string {
  if (x.aRenseigner) return `${LIBELLES_TYPES_SOURCE[x.type]} · Source à renseigner`;
  if (x.type === 'praticien') return 'Photo fournie par le praticien';
  return [x.fournisseur, x.auteur, x.licence, x.lien].filter(Boolean).join(' · ');
}

/** Récapitulatif → lignes de l'export CSV des licences */
export const csvDepuisRecap = (l: readonly LigneSourceImage[]): LigneLicenceCsv[] => l.map((x) => ({
  fournisseur: x.fournisseur || LIBELLES_TYPES_SOURCE[x.type], identifiant: x.chemin ?? x.url, auteur: x.auteur, page: x.lien, licence: x.licence, version: '',
  lienLicence: x.lienLicence, date: x.date, sujet: x.usage, fichier: x.url, statut: x.statut,
  importe: x.type === 'libre' && x.statut.includes('non importée') ? '' : x.date,
}));
