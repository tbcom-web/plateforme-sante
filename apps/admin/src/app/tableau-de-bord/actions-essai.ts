'use server';

import { revalidatePath } from 'next/cache';
import { getMonSite } from '@/lib/sites';
import { declencherApercuEssai } from '@/lib/publication';
import { createClient } from '@/lib/supabase/server';

export type EtatActionEssai = { ok: boolean; message: string } | null;

/** « Demander la mise en ligne » : la demande apparaît dans /admin/leads ; la conseillère vérifie puis valide. */
export async function demanderMiseEnLigne(): Promise<EtatActionEssai> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('demander_mise_en_ligne_essai');
  revalidatePath('/tableau-de-bord');
  if (error) return { ok: false, message: /créez/.test(error.message) ? 'Créez d’abord votre site.' : 'La demande n’a pas pu être enregistrée. Réessayez.' };
  return { ok: true, message: 'Demande envoyée : votre conseillère vous contacte pour vérifier les informations avant la mise en ligne.' };
}

/** Régénère la version d'essai (aperçu privé) depuis le brouillon actuel. */
export async function mettreAJourEssai(): Promise<EtatActionEssai> {
  const site = await getMonSite();
  if (!site.id) return { ok: false, message: 'Créez d’abord votre site.' };
  const r = await declencherApercuEssai(site.id);
  revalidatePath('/tableau-de-bord');
  return r;
}
