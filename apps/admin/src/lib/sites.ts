import 'server-only';
import { cache } from 'react';
import { controlerPublication, draftVide, normaliserDraft, type ResultatControle, type SiteDraft } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { lireEnCache, TAGS_DONNEES } from '@/lib/cache-donnees';

export type SoinCatalogue = { slug: string; titre_court: string; resume: string; icone?: string | null; titre?: string; corps?: string };

export type EtatPublication = 'en_cours' | 'ok' | 'echec';

/** Suivi de la dernière publication (migration 0017) */
export type SuiviPublication = {
  etat: EtatPublication | null;
  runUrl: string | null;
  debut: string | null;
  fin: string | null;
  erreur: string | null;
  /** Date à laquelle la version en ligne a été figée (« Publier ») */
  publieeLe: string | null;
};

export type MonSite = {
  id: string | null;
  statut: 'brouillon' | 'en_ligne' | 'suspendu';
  domaine: string | null;
  draft: SiteDraft;
  /** Date de dernière modification du brouillon : version lue, pour le verrou optimiste de l'enregistrement */
  updatedAt: string | null;
  /** Le brouillon diffère de la version publiée (false si inconnu) */
  modifsNonPubliees: boolean;
  /** Une version a déjà été figée pour publication */
  dejaPublie: boolean;
  publication: SuiviPublication;
};

const COLONNES = 'id, statut, domaine, config, updated_at';
const COLONNES_SUIVI = `${COLONNES}, published_at, modifs_non_publiees, publiee_le, publication_etat, publication_run_url, publication_debut, publication_fin, publication_erreur`;

type Ligne = {
  id: string;
  statut: MonSite['statut'];
  domaine: string | null;
  config: unknown;
  updated_at: string;
  published_at?: string | null;
  modifs_non_publiees?: boolean;
  publiee_le?: string | null;
  publication_etat?: EtatPublication | null;
  publication_run_url?: string | null;
  publication_debut?: string | null;
  publication_fin?: string | null;
  publication_erreur?: string | null;
};

const versSite = (l: Ligne): MonSite => ({
  id: l.id,
  statut: l.statut,
  domaine: l.domaine,
  updatedAt: l.updated_at,
  draft: normaliserDraft(l.config),
  dejaPublie: Boolean(l.publiee_le || l.published_at),
  // publiee_le est renseignée en même temps que config_publiee (demander_publication, reprise de 0017).
  modifsNonPubliees: Boolean(l.modifs_non_publiees && l.publiee_le),
  publication: {
    etat: l.publication_etat ?? null,
    runUrl: l.publication_run_url ?? null,
    debut: l.publication_debut ?? null,
    fin: l.publication_fin ?? null,
    erreur: l.publication_erreur ?? null,
    publieeLe: l.publiee_le ?? null,
  },
});

type Requete = (colonnes: string) => PromiseLike<{ data: unknown; error: unknown }>;

/** Lit avec les colonnes de suivi ; sans elles si la migration 0017 n'est pas encore passée. */
async function lireSite(requete: Requete): Promise<Ligne | null> {
  const r = await requete(COLONNES_SUIVI);
  if (!r.error) return (r.data as Ligne | null) ?? null;
  const repli = await requete(COLONNES);
  return (repli.data as Ligne | null) ?? null;
}

/** Site d'un client, pour l'admin (RLS : seul un admin lit les sites des autres). */
export async function getSiteParId(id: string): Promise<MonSite | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const data = await lireSite((c) => supabase.from('sites').select(c).eq('id', id).maybeSingle());
  return data ? versSite(data) : null;
}

/** Site du praticien connecté (un seul par compte pour le MVP), ou un brouillon vide. */
export async function getMonSite(): Promise<MonSite> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  // Filtre explicite sur le propriétaire : un admin voit tous les sites via RLS.
  const data = await lireSite((c) =>
    supabase.from('sites').select(c).eq('owner', auth.user?.id ?? '').order('created_at').limit(1).maybeSingle(),
  );
  if (!data) {
    return {
      id: null, statut: 'brouillon', domaine: null, draft: draftVide(), updatedAt: null, modifsNonPubliees: false, dejaPublie: false,
      publication: { etat: null, runUrl: null, debut: null, fin: null, erreur: null, publieeLe: null },
    };
  }
  return versSite(data);
}

// Gardé dans le cache de données (cache-donnees.ts, invalidé par la modification d'un soin : app/admin/actions.ts)
async function getCatalogueSansMemo(profession = 'podologue'): Promise<SoinCatalogue[]> {
  return lireEnCache('catalogue', TAGS_DONNEES.catalogue, [profession], async (supabase) => {
    const { data, error } = await supabase
      .from('soins_catalogue')
      .select('*')
      .eq('profession_slug', profession)
      .order('position');
    return error ? { ok: false, repli: (data ?? []) as SoinCatalogue[] } : { ok: true, valeur: (data ?? []) as SoinCatalogue[] };
  });
}
export const getCatalogue = cache(getCatalogueSansMemo);

/** Contrôles avant publication (conseils et remplacements ; plus rien de bloquant), sur un brouillon v1 ou v2. */
export function controles(d: unknown): ResultatControle {
  return controlerPublication(normaliserDraft(d));
}

/**
 * Informations manquantes, remplacées sur le site publié par une mention sobre (replis.ts). Elles n'empêchent JAMAIS de
 * publier (règle de Paul, 2026-10-05) : elles sont listées « à compléter » et dans la confirmation « Publier quand même ».
 */
export function manques(d: unknown): string[] {
  return controles(d).remplacements;
}
