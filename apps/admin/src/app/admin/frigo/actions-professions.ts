'use server';

import { revalidatePath } from 'next/cache';
import { estProfession } from '@plateforme/core/professions';
import { lignesAjout, lignesRetrait, type LigneProfessionIngredient } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getRattachementsProfessions, MIGRATION_PROFESSIONS } from '@/lib/professions-ingredients';
import { createClient, getUser } from '@/lib/supabase/server';

// Frigo : professions des ingrédients (migration 0046). « Aussi pour <profession> » (un élément ou un lot), retrait (jamais la
// dernière profession), refus d'une suggestion de partage. Journal en ajout seul, au nom de Paul.

const CLE = /^[a-z]+:[^\s]{1,200}$/;
const MAX_LOT = 500;

async function ecrire(lignes: LigneProfessionIngredient[]): Promise<{ ok: boolean; message: string; n: number }> {
  if (!lignes.length) return { ok: true, message: 'Rien à changer.', n: 0 };
  const supabase = await createClient();
  const user = await getUser();
  const { error } = await supabase.from('assets_professions').insert(lignes.map((l) => ({ ...l, auteur: user?.id ?? null })));
  if (error) return { ok: false, message: MIGRATION_PROFESSIONS, n: 0 };
  revalidatePath('/admin/frigo');
  return { ok: true, message: `${lignes.length} élément${lignes.length > 1 ? 's' : ''} mis à jour.`, n: lignes.length };
}

const nettoyer = (cles: unknown) => (Array.isArray(cles) ? cles.filter((c): c is string => typeof c === 'string' && CLE.test(c)).slice(0, MAX_LOT) : []);

/** « Aussi pour <profession> » : un élément ou un lot (les communs et ceux qui l'ont déjà sont ignorés) */
export async function ajouterProfessionIngredients(cles: string[], profession: string) {
  await exigerAdmin();
  if (!estProfession(profession)) return { ok: false, message: 'Profession inconnue.', n: 0 };
  const { rattachements } = await getRattachementsProfessions();
  return ecrire(lignesAjout(nettoyer(cles), profession, rattachements));
}

/** Retire une profession (jamais la dernière d'un élément) */
export async function retirerProfessionIngredients(cles: string[], profession: string) {
  await exigerAdmin();
  if (!estProfession(profession)) return { ok: false, message: 'Profession inconnue.', n: 0 };
  const { rattachements } = await getRattachementsProfessions();
  return ecrire(lignesRetrait(nettoyer(cles), profession, rattachements));
}

/** Suggestion de partage refusée : plus reproposée (l'appartenance ne change pas) */
export async function refuserSuggestionsPartage(cles: string[], profession: string) {
  await exigerAdmin();
  if (!estProfession(profession)) return { ok: false, message: 'Profession inconnue.', n: 0 };
  return ecrire(nettoyer(cles).map((c) => ({ cle_asset: c, profession, action: 'refus' })));
}
