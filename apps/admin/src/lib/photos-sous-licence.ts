import 'server-only';
import { cache } from 'react';
import { createHash } from 'node:crypto';
import {
  cheminPhotoSousLicence, construireLigneLicence, contientGpsExif, controlerFichierLicence, controlerPhotosPremium, largeursPhotoLicence, photosPremiumDans,
  photoSousLicenceDepuisLigne, type DeclarationLicence, type PhotoSousLicence, type StatutRattachement,
} from '@plateforme/core';
import { convertirWebp } from '@/lib/photos-libres';
import { createClient } from '@/lib/supabase/server';

// PHOTOS SOUS LICENCE (banques payantes, migration 0057 ; règles : packages/core/src/photos-sous-licence.ts, docs/photos-sous-licence.md).
// Import par Paul (fichier envoyé, AUCUN téléchargement depuis une banque, aucune API payante) : contrôles, conversion WebP 640 / 1280 /
// 1920 px SANS métadonnées (même conversion que les photos libres), stockage photos/banque/licence/<apercu|achetee>/, traçabilité dans
// photos_sous_licence (statut « à valider »). Lectures : admin (toutes les photos et rattachements) ; contrôle de publication d'un site.

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const MIGRATION_0057 = 'Migration à exécuter (supabase/migrations/0057_photos_sous_licence.sql) : les photos sous licence et l’option Photos premium l’attendent.';

export async function migration0057Manquante(supabase?: Supabase): Promise<boolean> {
  try {
    const s = supabase ?? (await createClient());
    const { error } = await s.from('photos_sous_licence').select('id').limit(1);
    return Boolean(error);
  } catch {
    return true;
  }
}

const COLONNES = 'id, id_fichier, banque, banque_nom, id_image, page_url, contributeur, titre, sujet, type_licence, statut_licence, telecharge_le, titulaire, date_achat, reference_licence, expire_le, sites_par_licence, credit_requis, credit_texte, restrictions, personne_reconnaissable, licence_url, url, statut, importe_le';
const COLONNES_SITES = 'photo_id, site_id, statut, reference_licence, titulaire, date_achat, expire_le, demande_le';

/** Toutes les photos sous licence avec leurs rattachements (admin) ; migrationManquante : tables absentes */
async function getPhotosSousLicenceSansMemo(): Promise<{ photos: PhotoSousLicence[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const [{ data, error }, { data: sites }] = await Promise.all([
    supabase.from('photos_sous_licence').select(COLONNES).order('importe_le', { ascending: false }).limit(2000),
    supabase.from('photos_sous_licence_sites').select(COLONNES_SITES).limit(5000),
  ]);
  if (error) return { photos: [], migrationManquante: true };
  const parPhoto = new Map<string, Record<string, unknown>[]>();
  for (const r of (sites ?? []) as Record<string, unknown>[]) parPhoto.set(String(r.photo_id), [...(parPhoto.get(String(r.photo_id)) ?? []), r]);
  return { photos: ((data ?? []) as Record<string, unknown>[]).map((l) => photoSousLicenceDepuisLigne(l, parPhoto.get(String(l.id)) ?? [])), migrationManquante: false };
}
export const getPhotosSousLicence = cache(getPhotosSousLicenceSansMemo);

/** Noms lisibles des sites (cabinet, sinon adresse courte, sinon identifiant) : liste, alertes et export CSV */
export async function nomsDesSites(): Promise<Record<string, string>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('sites').select('id, slug, nom:config->cabinet->>nom').limit(5000);
    return Object.fromEntries(((data ?? []) as unknown as { id: string; slug: string | null; nom: string | null }[]).map((s) => [s.id, s.nom || s.slug || s.id.slice(0, 8)]));
  } catch {
    return {};
  }
}

/** Photos sous licence VALIDÉES (tirages du Studio, recettes à noter) : adresses et sujets ; aperçus dans leur durée de validité */
export async function photosPremiumPourBanque(): Promise<{ url: string; sujet: string }[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('photos_sous_licence').select('url, sujet').eq('statut', 'validee').limit(500);
    return error ? [] : ((data ?? []) as { url: string; sujet: string }[]).filter((p) => p.url);
  } catch {
    return [];
  }
}

/** Photos sous licence citées par une configuration, avec leurs rattachements (contrôle de publication d'un site) */
export async function photosDeLaConfig(supabase: Supabase, config: unknown): Promise<{ photos: PhotoSousLicence[]; erreur: boolean }> {
  const urls = photosPremiumDans(config);
  if (!urls.length) return { photos: [], erreur: false };
  const ids = [...new Set(urls.map((u) => /lic-([0-9a-f]{16})-/.exec(u)?.[1]).filter(Boolean) as string[])];
  const { data, error } = await supabase.from('photos_sous_licence').select(COLONNES).in('id_fichier', ids);
  if (error) return { photos: [], erreur: true };
  const lignes = (data ?? []) as Record<string, unknown>[];
  const { data: sites } = lignes.length
    ? await supabase.from('photos_sous_licence_sites').select(COLONNES_SITES).in('photo_id', lignes.map((l) => String(l.id)))
    : { data: [] };
  return { photos: lignes.map((l) => photoSousLicenceDepuisLigne(l, ((sites ?? []) as Record<string, unknown>[]).filter((r) => r.photo_id === l.id))), erreur: false };
}

const jourParis = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

/**
 * Contrôle BLOQUANT de publication (lib/publication.ts) : toute photo sous licence de la configuration doit avoir une licence achetée,
 * rattachée à CE site, non expirée, dans la limite de sa licence. Tables illisibles (migration 0057 absente) : une configuration qui
 * contient une photo sous licence n'est jamais publiée.
 */
export async function controlerPremiumSite(supabase: Supabase, siteId: string, config: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!photosPremiumDans(config, 1).length) return { ok: true };
  const { photos, erreur } = await photosDeLaConfig(supabase, config);
  if (erreur) return { ok: false, message: `Photo premium dans le site : ${MIGRATION_0057}` };
  const c = controlerPhotosPremium(config, { siteId, photos, jour: jourParis() });
  return c.ok ? c : { ok: false, message: c.message };
}

/** État des photos premium d'un site pour son propriétaire (fonction photos_premium_du_site : jamais de référence ni d'autre site) */
export async function etatPremiumDuSite(siteId: string): Promise<PhotoSousLicence[]> {
  if (!/^[0-9a-f-]{36}$/.test(siteId)) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('photos_premium_du_site', { p_site: siteId });
    if (error) return [];
    return ((data ?? []) as { id_fichier: string; statut_licence: string; statut_photo: string; rattachement: StatutRattachement; expire_le: string | null; sites_par_licence: number; rang: number }[]).map((r) => ({
      idFichier: r.id_fichier, url: '', banque: '', idImage: '', pageUrl: '', sujet: 'general', type: r.statut_licence === 'apercu' ? 'apercu' : 'standard',
      statutLicence: r.statut_licence === 'apercu' ? 'apercu' : 'achetee', etat: (r.statut_photo as PhotoSousLicence['etat']) ?? 'validee', telechargeLe: '',
      sitesParLicence: 1, creditRequis: false, personneReconnaissable: false,
      // Au-delà de la limite de la licence : vu comme « licence à acheter » par le praticien
      rattachements: [{ siteId, statut: r.rattachement === 'achetee' && r.rang >= Math.max(1, r.sites_par_licence) ? 'demandee' : r.rattachement, reference: '', expireLe: r.expire_le }],
    }));
  } catch {
    return [];
  }
}

async function chargerSharp() {
  const m = (await import('sharp')) as unknown as { default?: typeof import('sharp') } & typeof import('sharp');
  return typeof m.default === 'function' ? m.default : m;
}

export type ResultatImportLicence = { ok: true; message: string; url: string; id: string } | { ok: false; message: string; migration?: boolean; erreurs?: string[] };

/** Import d'un fichier (aperçu ou fichier acheté) avec sa déclaration contrôlée */
export async function importerPhotoSousLicence(supabase: Supabase, e: { octets: Buffer; typeAnnonce: string | null; declaration: DeclarationLicence; auteurId: string | null }): Promise<ResultatImportLicence> {
  if (await migration0057Manquante(supabase)) return { ok: false, migration: true, message: `${MIGRATION_0057} La photo n’a pas été envoyée.` };
  let largeur = 0, hauteur = 0, gps = false;
  try {
    const sharp = await chargerSharp();
    const m = await sharp(e.octets, { failOn: 'error', limitInputPixels: 80_000_000 }).metadata();
    const tourne = (m.orientation ?? 1) >= 5;
    largeur = (tourne ? m.height : m.width) ?? 0;
    hauteur = (tourne ? m.width : m.height) ?? 0;
    gps = Boolean(m.exif && contientGpsExif(new Uint8Array(m.exif)));
  } catch {
    return { ok: false, message: 'Image illisible (fichier abîmé ou format non pris en charge).' };
  }
  const octets = new Uint8Array(e.octets.buffer, e.octets.byteOffset, e.octets.byteLength);
  const c = controlerFichierLicence({ octets, typeAnnonce: e.typeAnnonce, largeur, hauteur, statut: e.declaration.statut, gps: gps || contientGpsExif(octets) });
  if (!c.ok) return { ok: false, message: c.erreurs.join(' '), erreurs: c.erreurs };

  const id = createHash('sha256').update(e.octets).digest('hex').slice(0, 16);
  const { data: deja } = await supabase.from('photos_sous_licence').select('id').eq('id_fichier', id).maybeSingle();
  if (deja) return { ok: false, message: 'Ce fichier a déjà été importé.' };

  const largeurs = largeursPhotoLicence(largeur);
  let fichiers: { largeur: number; donnees: Buffer }[];
  try {
    fichiers = await convertirWebp(e.octets, largeurs);
  } catch (err) {
    console.error('Photos sous licence : conversion WebP impossible', err);
    return { ok: false, message: 'Conversion WebP impossible sur le serveur. Réessayez.' };
  }
  const stockage = supabase.storage.from('photos');
  for (const f of fichiers) {
    const { error } = await stockage.upload(cheminPhotoSousLicence(e.declaration.statut, id, f.largeur), f.donnees, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
    if (error && !/exist|duplicate/i.test(error.message)) {
      console.error('Photos sous licence : envoi dans le stockage', error);
      return { ok: false, message: `Envoi dans le stockage impossible : ${error.message}.` };
    }
  }
  const url = stockage.getPublicUrl(cheminPhotoSousLicence(e.declaration.statut, id, Math.max(...largeurs))).data.publicUrl;
  const { ligne, erreurs } = construireLigneLicence({ declaration: e.declaration, id, importeLe: new Date(), largeurs, urlPrincipale: url, largeur, hauteur });
  if (!ligne) return { ok: false, message: `Traçabilité incomplète : ${erreurs.join(' ')}`, erreurs };
  const { error } = await supabase.from('photos_sous_licence').insert({ ...ligne, auteur: e.auteurId, updated_at: ligne.importe_le });
  if (error) {
    console.error('Photos sous licence : traçabilité non enregistrée', error);
    return { ok: false, message: `Fichiers hébergés mais traçabilité non enregistrée : ${error.message}` };
  }
  return {
    ok: true, id, url,
    message: e.declaration.statut === 'apercu'
      ? `Aperçu importé « à valider » (${largeurs.join(', ')} px, sans métadonnées) : démo seulement, jamais publié.`
      : `Photo achetée importée « à valider » (${largeurs.join(', ')} px, sans métadonnées) : publiable seulement sur les sites qui auront leur licence.`,
  };
}
