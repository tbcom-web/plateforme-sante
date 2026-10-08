'use server';

import { revalidatePath } from 'next/cache';
import { SUJETS_KITS } from '@plateforme/core';
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
