import 'server-only';
import { createHash } from 'node:crypto';
import {
  cheminImageGeneree, clePhoto, construireTracabiliteIa, contientGpsExif, controlerFichierIa, hashtagsValides, largeursImageGeneree, type DeclarationIa,
} from '@plateforme/core';
import { convertirWebp } from '@/lib/photos-libres';
import { createClient } from '@/lib/supabase/server';

// Import d'une IMAGE GÉNÉRÉE PAR IA (packages/core/src/images-generees.ts, migration 0040) : fichier envoyé par Paul (ordinateur ou
// téléphone), contrôlé (type réel, taille, dimensions, localisation EXIF refusée), converti en WebP 640 / 1280 / 1920 px au plus SANS
// métadonnées (même conversion que les photos libres), hébergé dans photos/banque/ia/<sujet>/, tracé dans photos_libres (source « ia »,
// statut « à valider »), sujet et hashtags du trou enregistrés (assets_sujets, assets_hashtags). Aucun appel à un service d'IA.

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Auteur des images générées : Paul (il écrit le prompt, choisit et importe l'image) */
export const AUTEUR_IMAGES_GENEREES = 'Paul Tremblot';

/** Colonnes de 0040 présentes ? (sinon : « Migration à exécuter », rien n'est envoyé) */
export async function migration0040Manquante(supabase?: Supabase): Promise<boolean> {
  try {
    const s = supabase ?? (await createClient());
    const { error } = await s.from('photos_libres').select('ia_outil').limit(1);
    return Boolean(error);
  } catch {
    return true;
  }
}

async function chargerSharp() {
  const m = (await import('sharp')) as unknown as { default?: typeof import('sharp') } & typeof import('sharp');
  return typeof m.default === 'function' ? m.default : m;
}

export type ResultatImportIa = { ok: true; message: string; url: string; id: string } | { ok: false; message: string; migration?: boolean; erreurs?: string[] };

export async function importerImageGeneree(supabase: Supabase, e: { octets: Buffer; typeAnnonce: string | null; declaration: DeclarationIa; auteurId: string | null }): Promise<ResultatImportIa> {
  if (await migration0040Manquante(supabase)) return { ok: false, migration: true, message: 'Migration à exécuter (supabase/migrations/0040_images_generees.sql) : l’image n’a pas été envoyée.' };

  // Dimensions (orientation EXIF appliquée) et localisation : lues par sharp, recoupées avec la lecture directe des octets
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
  const c = controlerFichierIa({ octets, typeAnnonce: e.typeAnnonce, largeur, hauteur, gps: gps || contientGpsExif(octets) });
  if (!c.ok) return { ok: false, message: c.erreurs.join(' '), erreurs: c.erreurs };

  const id = createHash('sha256').update(e.octets).digest('hex').slice(0, 16);
  const { data: deja } = await supabase.from('photos_libres').select('id').eq('source', 'ia').eq('id_source', id).maybeSingle();
  if (deja) return { ok: false, message: 'Cette image a déjà été importée.' };

  const largeurs = largeursImageGeneree(largeur);
  let fichiers: { largeur: number; donnees: Buffer }[];
  try {
    // Conversion WebP : orientation appliquée, TOUTES les métadonnées retirées (EXIF, XMP, ICC), jamais d'agrandissement
    fichiers = await convertirWebp(e.octets, largeurs);
  } catch (err) {
    console.error('Images générées : conversion WebP impossible', err);
    return { ok: false, message: 'Conversion WebP impossible sur le serveur. Réessayez.' };
  }
  const stockage = supabase.storage.from('photos');
  for (const f of fichiers) {
    const { error } = await stockage.upload(cheminImageGeneree(e.declaration.sujet, id, f.largeur), f.donnees, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
    if (error && !/exist|duplicate/i.test(error.message)) {
      console.error('Images générées : envoi dans le stockage', error);
      return { ok: false, message: `Envoi dans le stockage impossible : ${error.message}.` };
    }
  }
  const url = stockage.getPublicUrl(cheminImageGeneree(e.declaration.sujet, id, Math.max(...largeurs))).data.publicUrl;
  const { ligne, erreurs } = construireTracabiliteIa({ declaration: e.declaration, id, auteurNom: AUTEUR_IMAGES_GENEREES, importeLe: new Date(), largeurs, urlPrincipale: url, largeur, hauteur });
  if (!ligne) return { ok: false, message: `Traçabilité incomplète : ${erreurs.join(' ')}`, erreurs };
  const { error } = await supabase.from('photos_libres').insert({ ...ligne, auteur: e.auteurId, updated_at: ligne.importe_le });
  if (error) {
    console.error('Images générées : traçabilité non enregistrée', error);
    return { ok: false, message: /ia_|source_check|schema cache|does not exist/i.test(error.message) ? 'Migration à exécuter (supabase/migrations/0040_images_generees.sql).' : `Fichiers hébergés mais traçabilité non enregistrée : ${error.message}` };
  }
  // Sujet et hashtags du trou (cochés par Paul) sur la clé de l'image : elle entre dans le vivier du sujet après validation
  const cle = clePhoto(url);
  const tags = hashtagsValides(e.declaration.hashtags ?? []);
  if (cle) {
    await supabase.from('assets_sujets').insert({ cle_asset: cle, sujet: e.declaration.sujet, action: 'ajout', auteur: e.auteurId });
    if (tags.length) await supabase.from('assets_hashtags').insert(tags.map((h) => ({ cle_asset: cle, hashtag: h, action: 'ajout', auteur: e.auteurId })));
  }
  return {
    ok: true, id, url,
    message: `Importée « à valider » : ${largeurs.join(', ')} px, sans métadonnées, sujet ${e.declaration.sujet}${tags.length ? `, ${tags.map((t) => `#${t}`).join(' ')}` : ''}. Notez-la et validez-la dans Jeux de photos.`,
  };
}
