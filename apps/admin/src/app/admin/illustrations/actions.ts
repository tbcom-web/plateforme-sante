'use server';

import { revalidatePath } from 'next/cache';
import { estStatutIllustration, inventaireIllustrations, LIBELLES_STATUTS_ILLUSTRATION, type StatutIllustration } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { createClient, getUser } from '@/lib/supabase/server';

export type ResultatRevue = { ok: boolean; message: string; le?: string };

/**
 * Ajoute un retour au journal d'une illustration (statut au moment du retour + commentaire facultatif). Le statut courant
 * (illustrations_statuts) suit par déclencheur. Le journal n'est jamais réécrit : corriger = ajouter un nouveau retour.
 */
export async function ajouterRevue(cle: string, statut: StatutIllustration, commentaire: string, empreinte: string | null): Promise<ResultatRevue> {
  await exigerAdmin();
  if (!inventaireIllustrations().some((i) => i.cle === cle)) return { ok: false, message: 'Illustration inconnue.' };
  if (!estStatutIllustration(statut)) return { ok: false, message: 'Statut inconnu.' };
  const texte = commentaire.trim().slice(0, 4000) || null;
  const user = await getUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('illustrations_revues')
    .insert({ cle, statut, commentaire: texte, empreinte: empreinte && /^[0-9a-f]{8}$/.test(empreinte) ? empreinte : null, auteur: user?.id ?? null })
    .select('created_at')
    .maybeSingle();
  if (error) return { ok: false, message: 'Enregistrement impossible : la base de données est-elle à jour (migration 0021, revues des illustrations) ?' };
  revalidatePath('/admin/illustrations');
  return { ok: true, message: `${LIBELLES_STATUTS_ILLUSTRATION[statut]}${texte ? ' · commentaire enregistré' : ''}.`, le: data?.created_at };
}
