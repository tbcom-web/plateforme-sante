import 'server-only';
import { cache } from 'react';
import {
  appliquerRecette,
  appliquerReglages,
  type ReglagesSite,
  appliquerUnivers,
  avecPrioritesParcours,
  avecStatut,
  CATALOGUE_UNIVERS,
  normaliserDraft,
  universCatalogue,
  type LigneStatutUnivers,
  type ResultatUnivers,
  type SiteDraft,
  type Univers,
  universApplicableAuParcours,
} from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { getModelesDisponibles } from '@/lib/modeles';
import { getCatalogue } from '@/lib/sites';
import { jeuPhotosAEnregistrer } from '@/lib/jeux-photos';
import { themesActives } from '@/lib/themes';
import { getRecettesLecture } from '@/lib/recettes';

// Univers du catalogue côté serveur : statuts enregistrés (table univers_statuts, migration 0018), nombre de sites
// qui les utilisent, et application d'un univers au brouillon d'un site (parcours praticien, phase B).

type Client = Awaited<ReturnType<typeof createClient>>;

/** Catalogue avec les statuts posés par l'admin ; erreur : migration 0018 pas encore installée */
async function getUniversSansMemo(supabase?: Client): Promise<{ univers: Univers[]; erreur: boolean }> {
  const client = supabase ?? (await createClient());
  const { data, error } = await client.from('univers_statuts').select('id, statut, valide_par, valide_le');
  const lignes = new Map(((data ?? []) as LigneStatutUnivers[]).map((l) => [l.id, l]));
  return { univers: CATALOGUE_UNIVERS.map((u) => avecStatut(u, lignes.get(u.id))), erreur: Boolean(error) };
}
export const getUnivers = cache(getUniversSansMemo);

/** Nombre de sites (brouillon) par univers appliqué */
export async function sitesParUnivers(supabase?: Client): Promise<Record<string, number>> {
  const client = supabase ?? (await createClient());
  const { data } = await client.from('sites').select('univers:config->theme->>univers');
  const n: Record<string, number> = {};
  for (const l of (data ?? []) as { univers: string | null }[]) if (l.univers) n[l.univers] = (n[l.univers] ?? 0) + 1;
  return n;
}

/**
 * Applique un univers au brouillon d'un site et l'enregistre (jamais la version en ligne : la publication reste un
 * geste distinct). Identité conservée (appliquerUnivers) ; jeu de photos retiré au sort si la spécialité change.
 * Seuls les univers validés sont applicables, sauf par le super admin (préparation, aperçu).
 * Parcours guidé (/creer, `parcours: true`) : les trois modèles du parcours sont applicables même en brouillon
 * (catalogue de départ choisi par Paul, universApplicableAuParcours). RLS : le praticien ne modifie que ses sites.
 */
export async function appliquerUniversAuSite(
  siteId: string,
  universId: string,
  opts: { admin?: boolean; version?: string | null; parcours?: boolean; reglages?: Partial<ReglagesSite> & { proposition?: string | null; recette?: string | null } } = {},
): Promise<{ ok: boolean; message: string; resultat?: Omit<ResultatUnivers, 'draft'>; version?: string; draft?: SiteDraft }> {
  const supabase = await createClient();
  const { univers } = await getUnivers(supabase);
  const u = univers.find((x) => x.id === universId) ?? universCatalogue(universId);
  if (!u) return { ok: false, message: 'Univers inconnu.' };
  const { data: site } = await supabase.from('sites').select('config, updated_at').eq('id', siteId).maybeSingle();
  if (!site) return { ok: false, message: 'Site introuvable.' };
  if (opts.version && site.updated_at !== opts.version) return { ok: false, message: 'Modifié ailleurs entre-temps : rechargez la page.' };

  const [modeles, catalogue] = await Promise.all([getModelesDisponibles(), getCatalogue()]);
  const avant = normaliserDraft(site.config);
  const r = appliquerUnivers(avant, u, {
    modeles: modeles.map((m) => m.manifeste),
    soinsConnus: catalogue.map((c) => c.slug),
    autoriserNonValide: (Boolean(opts.admin) && u.statut !== 'differe') || (Boolean(opts.parcours) && universApplicableAuParcours(u)),
  });
  if (r.erreurs.length) return { ok: false, message: r.erreurs.join(' ') };
  // Parcours : les sujets choisis par le praticien (étape 1) priment sur le préréglage du modèle (spécialités, soins en avant).
  if (opts.parcours) r.draft = avecPrioritesParcours(r.draft, { soinsConnus: catalogue.map((c) => c.slug), themesActives: themesActives() });
  // Proposition choisie (étape « Votre site ») ou réglages ajustés : gamme, style d'illustration, animation (valeurs contrôlées
  // par appliquerReglages : gamme connue, style compatible avec la structure).
  if (opts.reglages) r.draft = appliquerReglages(r.draft, opts.reglages);
  // Recette du studio choisie (parcours) : relue côté serveur (recettes_lecture, actives et bien notées), jamais reçue telle quelle
  if (opts.reglages?.recette) {
    const recette = (await getRecettesLecture(4)).find((x) => x.id === opts.reglages!.recette);
    const a = recette ? appliquerRecette(r.draft, recette.composition, { id: recette.id, proposes: [u], modeles: modeles.map((m) => m.manifeste), soinsConnus: catalogue.map((c) => c.slug), themesActives: themesActives() }) : null;
    if (a) r.draft = { ...a.draft, theme: { ...a.draft.theme, proposition: `recette~${recette!.id}` } };
  }
  r.draft.theme.jeuPhotos = r.draft.theme.jeuPhotos || (await jeuPhotosAEnregistrer(supabase, siteId, avant.theme, r.draft.theme.specialite));

  const { data, error } = await supabase.from('sites').update({ config: r.draft }).eq('id', siteId).eq('updated_at', site.updated_at).select('updated_at').maybeSingle();
  if (error || !data) return { ok: false, message: 'Enregistrement impossible (modifié entre-temps ?). Réessayez.' };
  const { draft, ...resultat } = r;
  return { ok: true, message: `Univers « ${u.nom} » appliqué au brouillon. Vérifiez puis publiez.`, resultat, version: data.updated_at, draft };
}
