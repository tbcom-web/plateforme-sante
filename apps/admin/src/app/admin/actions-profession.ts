'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { COOKIE_PROFESSION, estProfession } from '@plateforme/core/professions';
import { exigerAdmin } from '@/lib/admin';

/** Sélecteur de profession de l'en-tête : mémorise le choix (cookie un an), puis toutes les pages de l'admin se recalculent */
export async function choisirProfession(id: string): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  if (!estProfession(id)) return { ok: false, message: 'Profession inconnue.' };
  (await cookies()).set(COOKIE_PROFESSION, id, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Profession changée.' };
}
