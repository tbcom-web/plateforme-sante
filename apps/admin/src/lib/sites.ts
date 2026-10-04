import 'server-only';
import { controlerPublication, draftVide, normaliserDraft, type ResultatControle, type SiteDraft } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

export type SoinCatalogue = { slug: string; titre_court: string; resume: string; icone?: string | null; titre?: string; corps?: string };

export type MonSite = {
  id: string | null;
  statut: 'brouillon' | 'en_ligne' | 'suspendu';
  domaine: string | null;
  draft: SiteDraft;
  updatedAt: string | null;
};

/** Site du praticien connecté (un seul par compte pour le MVP), ou un brouillon vide. */
/** Site d'un client, pour l'admin (RLS : seul un admin lit les sites des autres). */
export async function getSiteParId(id: string): Promise<MonSite | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('sites').select('id, statut, domaine, config, updated_at').eq('id', id).maybeSingle();
  if (!data) return null;
  return { id: data.id, statut: data.statut, domaine: data.domaine, updatedAt: data.updated_at, draft: normaliserDraft(data.config) };
}

export async function getMonSite(): Promise<MonSite> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  // Filtre explicite sur le propriétaire : un admin voit tous les sites via RLS.
  const { data } = await supabase
    .from('sites')
    .select('id, statut, domaine, config, updated_at')
    .eq('owner', auth.user?.id ?? '')
    .order('created_at')
    .limit(1)
    .maybeSingle();

  const vide = draftVide();
  if (!data) return { id: null, statut: 'brouillon', domaine: null, draft: vide, updatedAt: null };

  return {
    id: data.id,
    statut: data.statut,
    domaine: data.domaine,
    updatedAt: data.updated_at,
    draft: normaliserDraft(data.config),
  };
}

export async function getCatalogue(profession = 'podologue'): Promise<SoinCatalogue[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('soins_catalogue')
    .select('*')
    .eq('profession_slug', profession)
    .order('position');
  return data ?? [];
}

/** Contrôles avant publication (bloquants + conseils), sur un brouillon v1 ou v2. */
export function controles(d: unknown): ResultatControle {
  return controlerPublication(normaliserDraft(d));
}

/** Points bloquants restant à compléter avant de pouvoir publier. */
export function manques(d: unknown): string[] {
  return controles(d).bloquants;
}
