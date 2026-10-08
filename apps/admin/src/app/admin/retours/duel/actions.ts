'use server';

import { revalidatePath } from 'next/cache';
import { estCleAsset, validerDuel } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { colonneProfessionAbsente, MIGRATION_DUELS } from '@/lib/duels';
import { professionDegustation } from '@/lib/degustation';
import { createClient, getUser } from '@/lib/supabase/server';

/**
 * Enregistre un duel « A ou B ? » (journal en ajout seul, migration 0037). Photos et illustrations : clés d'assets ; compositions :
 * `compo:<hachage>`. Sans la migration : migrationManquante (la page garde le duel dans le navigateur).
 */
export async function enregistrerDuel(brut: Record<string, unknown>, remarque?: string | null): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  const v = validerDuel(brut ?? {});
  if (!v.ok) return { ok: false, message: v.message };
  const d = v.duel;
  if ((d.type === 'photo' || d.type === 'illustration') && (!estCleAsset(d.aCle) || !estCleAsset(d.bCle))) return { ok: false, message: 'Éléments du duel invalides.' };
  if (d.type !== 'photo' && d.type !== 'illustration' && (!d.aCle.startsWith('compo:') || !d.bCle.startsWith('compo:'))) return { ok: false, message: 'Compositions du duel invalides.' };
  const [user, profession] = await Promise.all([getUser(), professionDegustation()]);
  const supabase = await createClient();
  const ligne = {
    type: d.type, scenario: d.scenario, a_cle: d.aCle, b_cle: d.bCle, a_ingredients: d.aIngredients, b_ingredients: d.bIngredients,
    dimension_differente: d.dimension, resultat: d.resultat, etiquettes: d.etiquettes ?? [], appareil: d.appareil ?? null, prediction: d.prediction ?? null,
    remarque: typeof remarque === 'string' && remarque.trim() ? remarque.trim().slice(0, 1000) : null, auteur: user?.id ?? null,
  };
  // Profession de l'en-tête (migration 0051) ; sans la colonne, duel enregistré comme avant (profession par défaut)
  let { error } = await supabase.from('duels').insert({ ...ligne, profession: profession.id });
  if (colonneProfessionAbsente(error)) ({ error } = await supabase.from('duels').insert(ligne));
  if (error) return { ok: false, message: MIGRATION_DUELS, migrationManquante: true };
  revalidatePath('/admin/retours');
  return { ok: true, message: 'Duel enregistré.' };
}
