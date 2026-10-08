'use server';

import { revalidatePath } from 'next/cache';
import { clePhoto, estCleAsset, hashtagEmplacement, hashtagsValides, PREFIXE_REFUS_KIT, SUJETS_KITS } from '@plateforme/core';
import { validerDecisionClassement } from '@plateforme/core/classement-visuels';
import { importerPhotoLibre } from '../../photos/actions';
import { exigerAdmin } from '@/lib/admin';
import { MIGRATION_KITS } from '@/lib/kits-images';
import { createClient, getUser } from '@/lib/supabase/server';

// « Noter ce kit » (/admin/retours/kits, migration 0039) : note de 1 à 5 et / ou « Garder ce kit » (action de Paul seulement).
// Les photos du kit sont revérifiées (emplacements connus, URL de photo hébergée ou intégrée).

export type SaisieKit = { sujet: string; rang: number; cle: string; photos: { emplacement: string; url: string }[]; note: number | null; garder: boolean; remarque?: string; appareil?: string };

const URL_PHOTO = /^(\/photos\/[a-z0-9-]{1,120}\.(webp|jpe?g|png|avif)|https:\/\/[^\s]{1,400}\/storage\/v1\/object\/public\/photos\/[^\s]{1,300})$/;
const EMPLACEMENT = /^(accueil|page-sujet|cabinet|soin:[a-z0-9-]{1,60})$/;

export async function noterKit(s: SaisieKit): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  if (!(SUJETS_KITS as readonly string[]).includes(s?.sujet)) return { ok: false, message: 'Sujet inconnu.' };
  if (!/^kit:[a-z-]{2,30}:[0-9a-f]{8}$/.test(s.cle ?? '')) return { ok: false, message: 'Kit inconnu.' };
  const note = Number.isInteger(s.note) && (s.note as number) >= 1 && (s.note as number) <= 5 ? (s.note as number) : null;
  if (!note && !s.garder) return { ok: false, message: 'Donnez une note ou gardez le kit.' };
  const photos = (Array.isArray(s.photos) ? s.photos : []).filter((p) => p && EMPLACEMENT.test(p.emplacement) && URL_PHOTO.test(p.url)).slice(0, 40).map((p) => ({ emplacement: p.emplacement, url: p.url }));
  if (!photos.length) return { ok: false, message: 'Kit vide.' };
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('kits_images_notes').insert({
    sujet: s.sujet, rang: Math.max(0, Math.min(99, Math.floor(s.rang) || 0)), cle: s.cle, photos, note, garder: s.garder === true,
    remarque: String(s.remarque ?? '').trim().slice(0, 1000) || null, appareil: s.appareil === 'mobile' || s.appareil === 'ordinateur' ? s.appareil : 'les-deux', auteur: user?.id ?? null,
  });
  if (error) return { ok: false, message: MIGRATION_KITS, migrationManquante: true };
  revalidatePath('/admin/retours/kits');
  return { ok: true, message: s.garder ? 'Kit gardé : il passe en premier pour ce sujet.' : `Kit noté ${note}★.` };
}

// ---------------------------------------------------------------------------------------------------------------
// Compléter un kit (suggestions-kits.ts) : couche 2, le vivier curé seulement (Pexels / Pixabay = couche 1, Photos à découvrir)
// ---------------------------------------------------------------------------------------------------------------

const EMPLACEMENT_KIT = /^(accueil|page-sujet|cabinet|soin:[a-z0-9-]{1,40})$/;

/**
 * « Utiliser ici » : ajoute à la photo le sujet du kit et le hashtag de l'emplacement (#<slug du soin>, #cabinet…) dans les
 * journaux existants (assets_sujets 0028, assets_hashtags 0029) ; le kit se recompose au prochain affichage.
 */
export async function utiliserIci(cle: string, sujet: string, emplacement: string): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  if (!estCleAsset(cle) || !cle.startsWith('photo:')) return { ok: false, message: 'Photo inconnue.' };
  if (!(SUJETS_KITS as readonly string[]).includes(sujet) || !EMPLACEMENT_KIT.test(emplacement)) return { ok: false, message: 'Emplacement inconnu.' };
  const tag = hashtagEmplacement(emplacement);
  if (!hashtagsValides([tag]).length) return { ok: false, message: 'Hashtag invalide.' };
  const user = await getUser();
  const supabase = await createClient();
  const auteur = user?.id ?? null;
  const { error: e1 } = await supabase.from('assets_sujets').insert({ cle_asset: cle, sujet, action: 'ajout', auteur });
  const { error: e2 } = await supabase.from('assets_hashtags').insert({ cle_asset: cle, hashtag: tag, action: 'ajout', auteur });
  if (e1 && e2) return { ok: false, message: 'Migrations 0028 et 0029 à exécuter : sujet et hashtag non enregistrés.' };
  revalidatePath('/admin/retours/kits');
  return { ok: true, message: `Photo placée : sujet ${sujet}, #${tag}${e1 ? ' (sujet non enregistré : migration 0028)' : ''}${e2 ? ' (hashtag non enregistré : migration 0029)' : ''}.` };
}

/** « Pas pour ici » : refus mémorisé pour CET emplacement (classement_suggestions, raison kit-pas-ici:<clé>) */
export async function pasPourIci(cle: string, emplacement: string): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  if (!estCleAsset(cle) || !EMPLACEMENT_KIT.test(emplacement)) return { ok: false, message: 'Photo inconnue.' };
  const raison = `${PREFIXE_REFUS_KIT}${cle}`;
  const d = validerDecisionClassement({ contexte: 'photos', nature: 'hashtag', valeur: hashtagEmplacement(emplacement), decision: 'refusee', raison });
  if (!d || d.raison !== raison) return { ok: false, message: 'Refus non mémorisable (clé trop longue).' };
  const supabase = await createClient();
  const { error } = await supabase.from('classement_suggestions').insert(d);
  if (error) return { ok: false, message: 'Migration 0033 à exécuter : refus gardé dans ce navigateur seulement.', migrationManquante: true };
  return { ok: true, message: 'Elle ne sera plus proposée ici.' };
}

/** Notation rapide dans la file (couche 1 depuis la couche 2) : note de la photo, comme les autres notes d'assets (assets_notes) */
export async function noterPhotoKit(cle: string, note: number): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  if (!estCleAsset(cle) || !cle.startsWith('photo:')) return { ok: false, message: 'Photo inconnue.' };
  if (!Number.isInteger(note) || note < 1 || note > 5) return { ok: false, message: 'Note de 1 à 5.' };
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('assets_notes').insert({ cle_asset: cle, type: 'photo', note, etiquettes: [], auteur: user?.id ?? null });
  if (error) return { ok: false, message: 'Migration 0027 à exécuter : note non enregistrée.' };
  revalidatePath('/admin/retours/kits');
  return { ok: true, message: note <= 2 ? `${note}★ : la photo sort du vivier.` : `${note}★ enregistrée.` };
}

/**
 * « Importer et utiliser » : photo GARDÉE non importée du vivier → même import que /admin/photos (importerPhotoLibre : relue à la
 * source, WebP sans métadonnées, traçabilité, sujets et hashtags reportés), puis sujet + hashtag de l'emplacement sur la photo importée.
 */
export async function importerEtUtiliser(idLibre: string, sujet: string, emplacement: string): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  if (!/^[0-9a-f-]{36}$/.test(idLibre)) return { ok: false, message: 'Photo inconnue.' };
  if (!(SUJETS_KITS as readonly string[]).includes(sujet) || !EMPLACEMENT_KIT.test(emplacement)) return { ok: false, message: 'Emplacement inconnu.' };
  const r = await importerPhotoLibre(idLibre);
  if (!r?.ok) return { ok: false, message: r?.message ?? 'Import impossible.' };
  const supabase = await createClient();
  const { data } = await supabase.from('photos_libres').select('url, statut').eq('id', idLibre).maybeSingle();
  const cle = data?.url ? clePhoto(data.url as string) : null;
  if (!cle || data?.statut !== 'validee') return { ok: false, message: 'Import non confirmé : voir Jeux de photos.' };
  const u = await utiliserIci(cle, sujet, emplacement);
  return { ok: u.ok, message: u.ok ? `Importée et placée : ${u.message}` : u.message };
}

/**
 * Rattacher au vivier des photos déjà notées ≥ 4 ★ (bloc « Photos notées ≥ 4 ★ sans sujet ») : chaque choix validé par Paul
 * devient un ajout de sujet dans assets_sujets (rien d'automatique). 500 au plus.
 */
export async function rattacherSujets(choix: { cle: string; sujet: string }[]): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  const l = (Array.isArray(choix) ? choix : []).filter((c) => c && estCleAsset(c.cle) && c.cle.startsWith('photo:') && (SUJETS_KITS as readonly string[]).includes(c.sujet)).slice(0, 500);
  if (!l.length) return { ok: false, message: 'Aucune photo sélectionnée.' };
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('assets_sujets').insert(l.map((c) => ({ cle_asset: c.cle, sujet: c.sujet, action: 'ajout', auteur: user?.id ?? null })));
  if (error) return { ok: false, message: 'Migration 0028 à exécuter : sujets non enregistrés.' };
  revalidatePath('/admin/retours/kits');
  revalidatePath('/admin/retours/tri');
  return { ok: true, message: `${l.length} photo${l.length > 1 ? 's' : ''} rattachée${l.length > 1 ? 's' : ''} à leur sujet : elles entrent dans le vivier.` };
}
