'use server';

import { revalidatePath } from 'next/cache';
import { ANIMATIONS, SPECIALITES, type PersonnalisationPack } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export type ResultatPack = { ok: boolean; message: string } | null;

// Seules les photos déposées dans le dossier « banque » du stockage sont acceptées.
const PREFIXE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/banque/`;
const photo = (v: unknown) => { const s = String(v ?? '').trim().slice(0, 400); return s.startsWith(PREFIXE) ? s : ''; };

export async function enregistrerPack(id: string, perso: PersonnalisationPack): Promise<ResultatPack> {
  await exigerAdmin();
  if (!SPECIALITES.some((s) => s.value === id)) return { ok: false, message: 'Spécialité inconnue.' };
  const animation = perso.animation === 'aucune' || (ANIMATIONS as readonly string[]).includes(perso.animation ?? '') ? perso.animation : null;
  const ligne = {
    id,
    photos: {
      accueil: photo(perso.photos?.accueil),
      panorama: photo(perso.photos?.panorama),
      diaporama: (perso.photos?.diaporama ?? []).map(photo).filter(Boolean).slice(0, 6),
    },
    animation,
    updated_at: new Date().toISOString(),
  };
  const supabase = await createClient();
  const { error } = await supabase.from('packs_visuels').upsert(ligne);
  if (error) return { ok: false, message: 'Enregistrement impossible : la base de données est-elle à jour (mise à jour 0011, banque visuelle) ?' };
  revalidatePath('/admin/visuels');
  return { ok: true, message: 'Enregistré. Les sites concernés l’afficheront à leur prochaine publication.' };
}
