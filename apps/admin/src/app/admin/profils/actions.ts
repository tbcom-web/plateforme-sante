'use server';

import { revalidatePath } from 'next/cache';
import { profilsDePratique, verifierPublicationRecette, type ElementBloquant } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getRecettes } from '@/lib/recettes';
import { getContexteVerification, professionAdmin } from '@/lib/profils';
import { createClient } from '@/lib/supabase/server';

// Publication d'une recette pour les praticiens (migration 0043, publication-recettes.ts). La vérification « aucun élément à
// valider » est REFAITE ici, côté serveur, juste avant d'écrire : jamais de publication silencieuse d'un élément « à valider ».

export type EtatPublication = { ok: boolean; message: string; bloquants?: ElementBloquant[] };

const ID = /^[0-9a-f-]{36}$/;

export async function publierRecette(recette: string, profils: string[], ordre: number | null): Promise<EtatPublication> {
  await exigerAdmin();
  if (!ID.test(recette)) return { ok: false, message: 'Recette inconnue.' };
  const profession = await professionAdmin();
  const connus = new Set(profilsDePratique(profession.id).map((p) => p.id));
  const cibles = [...new Set(profils)].filter((p) => connus.has(p)).slice(0, 12);
  if (!cibles.length) return { ok: false, message: 'Choisissez au moins un profil.' };
  const o = ordre !== null && Number.isInteger(ordre) && ordre >= 1 && ordre <= 999 ? ordre : null;
  const [{ recettes }, ctx] = await Promise.all([getRecettes(), getContexteVerification()]);
  const r = recettes.find((x) => x.id === recette);
  if (!r) return { ok: false, message: 'Recette introuvable.' };
  if (r.statut !== 'active') return { ok: false, message: 'Recette archivée : réactivez-la avant de la publier.' };
  const v = verifierPublicationRecette(r, ctx);
  if (!v.ok) return { ok: false, message: `${v.bloquants.length} élément${v.bloquants.length > 1 ? 's' : ''} à valider ou remplacer avant de publier.`, bloquants: v.bloquants };
  const supabase = await createClient();
  const { error } = await supabase.from('recettes_publications').upsert({ recette, profession: profession.id, profils: cibles, ordre: o, publiee: true }, { onConflict: 'recette' });
  if (error) return { ok: false, message: error.code === '42P01' || error.code === 'PGRST205' ? 'Migration 0043 à exécuter avant de publier.' : 'Publication impossible pour le moment.' };
  revalidatePath('/admin/profils');
  return { ok: true, message: `Publiée pour ${cibles.length} profil${cibles.length > 1 ? 's' : ''}.` };
}

export async function depublierRecette(recette: string): Promise<EtatPublication> {
  await exigerAdmin();
  if (!ID.test(recette)) return { ok: false, message: 'Recette inconnue.' };
  const supabase = await createClient();
  const { error } = await supabase.from('recettes_publications').update({ publiee: false }).eq('recette', recette);
  if (error) return { ok: false, message: 'Dépublication impossible pour le moment.' };
  revalidatePath('/admin/profils');
  return { ok: true, message: 'Recette dépubliée : les praticiens ne la voient plus en tête.' };
}
