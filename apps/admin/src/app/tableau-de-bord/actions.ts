'use server';

import { revalidatePath } from 'next/cache';
import { getMonSite } from '@/lib/sites';
import { declencherPublication } from '@/lib/publication';

export type EtatPublication = { ok: boolean; message: string } | null;

// Demande la publication du site du praticien connecté (workflow GitHub « publier-site »).
export async function publierSite(): Promise<EtatPublication> {
  const site = await getMonSite(); // lecture via RLS : uniquement le site du praticien connecté
  if (!site.id) return { ok: false, message: 'Créez d’abord votre site.' };

  // Informations manquantes : jamais bloquantes, le site affiche une mention à la place (replis.ts).
  const r = await declencherPublication(site.id);
  revalidatePath('/tableau-de-bord');
  return r;
}
