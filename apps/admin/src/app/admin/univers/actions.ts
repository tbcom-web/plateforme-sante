'use server';

import { revalidatePath } from 'next/cache';
import { universCatalogue, validerUnivers, type StatutUnivers } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getModelesDisponibles } from '@/lib/modeles';
import { getCatalogue } from '@/lib/sites';
import { getUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export type ResultatStatut = { ok: boolean; message: string };

/**
 * Change le statut d'un univers. « valide » : seulement si le préréglage est valide (modèles disponibles, soins du
 * catalogue) ; un univers « differe » (faible niveau de preuve) ne peut être ni validé ni rendu proposable.
 */
export async function changerStatutUnivers(id: string, statut: Exclude<StatutUnivers, 'differe'>): Promise<ResultatStatut> {
  await exigerAdmin();
  const u = universCatalogue(id);
  if (!u) return { ok: false, message: 'Univers inconnu.' };
  if (u.statut === 'differe') return { ok: false, message: 'Sujet à faible niveau de preuve : proposé plus tard, après validation déontologique.' };
  if (!['brouillon', 'valide', 'retire'].includes(statut)) return { ok: false, message: 'Statut inconnu.' };
  if (statut === 'valide') {
    const [modeles, catalogue] = await Promise.all([getModelesDisponibles(), getCatalogue()]);
    const erreurs = validerUnivers(u, { modeles: modeles.map((m) => m.manifeste), soinsConnus: catalogue.map((c) => c.slug) });
    if (erreurs.length) return { ok: false, message: `Préréglage à corriger : ${erreurs.join(' ')}` };
  }
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('univers_statuts').upsert({
    id,
    statut,
    valide_par: statut === 'valide' ? (user?.email ?? null) : null,
    valide_le: statut === 'valide' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: 'Enregistrement impossible : la base de données est-elle à jour (mise à jour 0018, univers) ?' };
  revalidatePath('/admin/univers');
  return { ok: true, message: statut === 'valide' ? `« ${u.nom} » est proposé aux praticiens.` : `« ${u.nom} » : ${statut === 'retire' ? 'retiré du catalogue' : 'repassé en brouillon'}.` };
}
