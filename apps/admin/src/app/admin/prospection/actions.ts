'use server';

import { revalidatePath } from 'next/cache';
import { estStatutProspection } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

// Suivi de la commerciale sur un praticien du RPPS (/admin/prospection, migration 0055 : RLS admin, auteur et date posés par la base).

export type EtatSuivi = { ok: boolean; message: string } | null;

export async function enregistrerSuivi(rpps: string, _: EtatSuivi, f: FormData): Promise<EtatSuivi> {
  await exigerAdmin();
  if (!/^\d{11}$/.test(rpps)) return { ok: false, message: 'Praticien invalide.' };
  const statut = String(f.get('statut') ?? '');
  const relance = String(f.get('relance') ?? '');
  const note = String(f.get('note') ?? '').trim().slice(0, 2000);
  if (!estStatutProspection(statut)) return { ok: false, message: 'Statut invalide.' };
  if (relance && !/^\d{4}-\d{2}-\d{2}$/.test(relance)) return { ok: false, message: 'Date invalide.' };
  const { error } = await (await createClient()).from('prospection_suivi').upsert({ rpps, statut, note, relance_le: relance || null });
  revalidatePath('/admin/prospection');
  return error ? { ok: false, message: 'Enregistrement impossible.' } : { ok: true, message: 'Enregistré.' };
}
