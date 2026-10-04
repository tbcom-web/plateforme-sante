'use server';

import { revalidatePath } from 'next/cache';
import { MODELES_INTEGRES, validerManifeste } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { declencherPublications, sitesConcernes } from '@/lib/publication';
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

/**
 * Enregistre une fiche modifiée dans l'éditeur. La version est incrémentée automatiquement.
 * nouvelId : enregistre une copie sous un autre identifiant (duplication).
 * appliquer : active la version et republie tout de suite les sites en ligne qui utilisent ce modèle.
 */
export async function enregistrerModele(brut: unknown, nouvelId?: string, appliquer = false): Promise<ResultatImport> {
  await exigerAdmin();
  const fiche = { ...(brut as Record<string, unknown>) };
  if (nouvelId) fiche.id = nouvelId;
  const supabase = await createClient();
  const { data: existant } = await supabase.from('modeles').select('version, actif').eq('id', String(fiche.id ?? '')).maybeSingle();
  const integre = MODELES_INTEGRES.find((m) => m.id === fiche.id);
  // Copie sous un nouvel identifiant : version 1 ; sinon, version suivante (base ou modèle intégré).
  fiche.version = nouvelId && !existant ? 1 : Math.max(Number(fiche.version) || 1, existant?.version ?? 0, integre?.version ?? 0) + 1;
  const { erreurs, modele } = validerManifeste(fiche);
  if (!modele) return { ok: false, message: 'La fiche contient des erreurs.', erreurs };

  const { error } = await supabase.from('modeles').upsert({
    id: modele.id,
    nom: modele.nom,
    manifeste: modele,
    version: modele.version,
    actif: appliquer || (existant?.actif ?? false),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: 'Enregistrement impossible. La migration 0010 a-t-elle été exécutée ?' };
  revalidatePath('/admin/modeles');
  revalidatePath(`/admin/modeles/${modele.id}`);
  if (appliquer) {
    const sites = await sitesConcernes({ modele: modele.id });
    const r = await declencherPublications(sites.map((s) => s.id));
    return {
      ok: r.ok,
      message: sites.length
        ? `Version ${modele.version} active. ${r.message} (${sites.length} site${sites.length > 1 ? 's' : ''} en ligne, 2 à 3 minutes).`
        : `Version ${modele.version} active. Aucun site en ligne n’utilise encore ce modèle.`,
    };
  }
  return {
    ok: true,
    message: existant?.actif
      ? `Version ${modele.version} enregistrée (active). Appliquez-la aux sites avec le bouton ci-dessus.`
      : `Version ${modele.version} enregistrée (inactive). Activez-la depuis la liste des modèles.`,
  };
}
