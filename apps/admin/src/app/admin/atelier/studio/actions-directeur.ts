'use server';

import { revalidatePath } from 'next/cache';
import { exigerAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import { estCleDirecteur, type DecisionDirecteur } from '@/lib/directeur-format';

// Avis de Paul sur le directeur artistique (migration 0035, table directeur_avis) : « Pas convaincu » / « Enregistrée » sur une
// proposition, « À faire » / « Pas utile » sur un manque. Sans la migration : migrationManquante, le Studio garde l'avis dans
// le navigateur (export manuel).

export type SaisieAvisDirecteur = { nature: 'proposition' | 'manque'; cle: string; decision: DecisionDirecteur; remarque?: string | null; profil?: string | null };

const PERMISES: Record<SaisieAvisDirecteur['nature'], readonly DecisionDirecteur[]> = { proposition: ['pas-convaincu', 'enregistree'], manque: ['a-faire', 'pas-utile'] };

export async function journaliserAvisDirecteur(s: SaisieAvisDirecteur): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  if (!PERMISES[s.nature]?.includes(s.decision) || !estCleDirecteur(s.cle)) return { ok: false, message: 'Avis invalide.' };
  const remarque = String(s.remarque ?? '').trim().slice(0, 1000) || null;
  const profil = typeof s.profil === 'string' && /^[0-9A-Za-z.-]{1,40}$/.test(s.profil) ? s.profil : null;
  const supabase = await createClient();
  const { error } = await supabase.from('directeur_avis').insert({ nature: s.nature, cle: s.cle, decision: s.decision, remarque, profil });
  if (error) return { ok: false, message: 'Migration 0035 à exécuter (supabase/migrations/0035_directeur_avis.sql) : avis gardé dans ce navigateur.', migrationManquante: true };
  revalidatePath('/admin/atelier/studio');
  return { ok: true, message: 'Avis enregistré : il servira à la prochaine passe du directeur artistique.' };
}
