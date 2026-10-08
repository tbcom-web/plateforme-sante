'use server';

import { revalidatePath } from 'next/cache';
import { exigerAdmin } from '@/lib/admin';
import { MIGRATION_TRANCHES } from '@/lib/tranches';
import { createClient, getUser } from '@/lib/supabase/server';

/** « Réévaluer » : l'élément ou la combinaison revient dans la file (notes antérieures ignorées par la règle des tranchés, 0041) */
export async function reevaluer(cles: string[]): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  const l = [...new Set((Array.isArray(cles) ? cles : []).filter((k) => typeof k === 'string' && k.length >= 3 && k.length <= 220 && !/\s/.test(k)))].slice(0, 200);
  if (!l.length) return { ok: false, message: 'Rien à réévaluer.' };
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('elements_reevalues').insert(l.map((cle) => ({ cle, auteur: user?.id ?? null })));
  if (error) return { ok: false, message: MIGRATION_TRANCHES, migrationManquante: true };
  for (const p of ['/admin/retours', '/admin/retours/tranches', '/admin/retours/duel', '/admin/retours/recettes', '/admin/atelier']) revalidatePath(p);
  return { ok: true, message: `${l.length} élément${l.length > 1 ? 's' : ''} remis dans la file : ${l.length > 1 ? 'ils vous seront' : 'il vous sera'} de nouveau proposé${l.length > 1 ? 's' : ''}.` };
}
