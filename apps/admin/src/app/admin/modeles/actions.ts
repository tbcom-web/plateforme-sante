'use server';

import { revalidatePath } from 'next/cache';
import { validerManifeste } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export type ResultatImport = { ok: boolean; message: string; erreurs?: string[] } | null;

/** Importe (ou met à jour) une fiche de modèle. Elle arrive inactive : à activer après vérification. */
export async function importerModele(_: ResultatImport, form: FormData): Promise<ResultatImport> {
  await exigerAdmin();
  const texte = String(form.get('manifeste') ?? '').slice(0, 20000);
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return { ok: false, message: 'Le texte collé n’est pas du JSON valide.' };
  }
  const { erreurs, modele } = validerManifeste(brut);
  if (!modele) return { ok: false, message: 'La fiche contient des erreurs.', erreurs };

  const supabase = await createClient();
  const { data: existant } = await supabase.from('modeles').select('version').eq('id', modele.id).maybeSingle();
  if (existant && modele.version <= existant.version) {
    return { ok: false, message: `Un modèle « ${modele.id} » existe déjà en version ${existant.version} : augmentez « version ».` };
  }
  const { error } = await supabase.from('modeles').upsert({
    id: modele.id,
    nom: modele.nom,
    manifeste: modele,
    version: modele.version,
    actif: false,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: 'Import impossible. La migration 0010 a-t-elle été exécutée ?' };
  revalidatePath('/admin/modeles');
  return { ok: true, message: `Modèle « ${modele.nom} » (v${modele.version}) importé. Activez-le pour le proposer aux praticiens.` };
}

export async function basculerModele(id: string, actif: boolean) {
  await exigerAdmin();
  const supabase = await createClient();
  await supabase.from('modeles').update({ actif, updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/modeles');
}

export async function supprimerModele(id: string) {
  await exigerAdmin();
  const supabase = await createClient();
  await supabase.from('modeles').delete().eq('id', id);
  revalidatePath('/admin/modeles');
}
