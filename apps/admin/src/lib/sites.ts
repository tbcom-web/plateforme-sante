import 'server-only';
import { draftVide, type SiteDraft } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

export type SoinCatalogue = { slug: string; titre_court: string; resume: string; icone?: string | null };

export type MonSite = {
  id: string | null;
  statut: 'brouillon' | 'en_ligne' | 'suspendu';
  domaine: string | null;
  draft: SiteDraft;
  updatedAt: string | null;
};

/** Site du praticien connecté (un seul par compte pour le MVP), ou un brouillon vide. */
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

  const config = (data.config ?? {}) as Partial<SiteDraft>;
  return {
    id: data.id,
    statut: data.statut,
    domaine: data.domaine,
    updatedAt: data.updated_at,
    draft: {
      praticien: { ...vide.praticien, ...config.praticien },
      cabinet: { ...vide.cabinet, ...config.cabinet },
      rdv: { ...vide.rdv, ...config.rdv },
      theme: { ...vide.theme, ...config.theme },
      soins: config.soins ?? [],
    },
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

/** Étapes restant à compléter avant de pouvoir publier. */
export function manques(d: Partial<SiteDraft> | null | undefined): string[] {
  const p = d?.praticien;
  const c = d?.cabinet;
  const m: string[] = [];
  if (!p?.prenom || !p?.nom) m.push('Votre nom');
  if (!/^\d{11}$/.test(p?.rpps ?? '')) m.push('Votre numéro RPPS (11 chiffres)');
  if (!c?.adresse || !c?.ville || !c?.codePostal) m.push('L’adresse du cabinet');
  if (!c?.telephone) m.push('Le téléphone du cabinet');
  if (!/^https:\/\//.test(d?.rdv?.url ?? '')) m.push('Le lien de prise de rendez-vous');
  if (!d?.soins?.length) m.push('Au moins un soin');
  return m;
}
