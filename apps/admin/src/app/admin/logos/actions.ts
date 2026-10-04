'use server';

import { revalidatePath } from 'next/cache';
import { importerMarqueSvg, marquesLogo } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export type ResultatMarque = { ok: boolean; message: string; erreurs?: string[] } | null;

/** Importe une marque de logo (SVG nettoyé) ; elle arrive inactive. */
export async function importerMarque(_: ResultatMarque, form: FormData): Promise<ResultatMarque> {
  await exigerAdmin();
  const id = String(form.get('id') ?? '').trim().toLowerCase();
  if (marquesLogo('podologie').some((m) => m.id === id)) return { ok: false, message: `« ${id} » est déjà une marque intégrée : choisissez un autre identifiant.` };
  const { erreurs, marque } = importerMarqueSvg(String(form.get('svg') ?? ''), {
    id,
    nom: String(form.get('nom') ?? ''),
    sens: String(form.get('sens') ?? ''),
  });
  if (!marque) return { ok: false, message: 'Import refusé.', erreurs };

  const supabase = await createClient();
  const { error } = await supabase.from('marques_logo').upsert({
    id: marque.id, metier: 'podologie', nom: marque.nom, sens: marque.sens, view_box: marque.viewBox, contenu: marque.contenu,
    actif: false, updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: 'Enregistrement impossible. La migration 0013 a-t-elle été exécutée ?' };
  revalidatePath('/admin/logos');
  return { ok: true, message: `Marque « ${marque.nom} » importée (inactive). Vérifiez l’aperçu puis activez-la.` };
}

export async function basculerMarque(id: string, actif: boolean) {
  await exigerAdmin();
  const supabase = await createClient();
  await supabase.from('marques_logo').update({ actif, updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/logos');
}

export async function supprimerMarque(id: string) {
  await exigerAdmin();
  const supabase = await createClient();
  await supabase.from('marques_logo').delete().eq('id', id).eq('actif', false);
  revalidatePath('/admin/logos');
}
