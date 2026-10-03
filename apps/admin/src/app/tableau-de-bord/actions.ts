'use server';

import { revalidatePath } from 'next/cache';
import { getMonSite, manques } from '@/lib/sites';
import { declencherPublication } from '@/lib/publication';

export type EtatPublication = { ok: boolean; message: string } | null;

// Demande la publication du site du praticien connecté (workflow GitHub « publier-site »).
export async function publierSite(): Promise<EtatPublication> {
  const site = await getMonSite(); // lecture via RLS : uniquement le site du praticien connecté
  if (!site.id) return { ok: false, message: 'Créez d’abord votre site.' };

  const aFaire = manques(site.draft);
  if (aFaire.length > 0) return { ok: false, message: `Il manque : ${aFaire.join(', ')}.` };

  const r = await declencherPublication(site.id);
  revalidatePath('/tableau-de-bord');
  return r;
}
