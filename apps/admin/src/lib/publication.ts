import 'server-only';
import { normaliserDraft } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

type Resultat = { ok: boolean; message: string };

/** Lance un workflow GitHub Actions (workflow_dispatch) avec ses paramètres. */
async function lancerWorkflow(fichier: string, inputs: Record<string, string>): Promise<Resultat | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return { ok: false, message: 'Publication non configurée (GITHUB_TOKEN / GITHUB_REPO).' };

  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${fichier}/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    body: JSON.stringify({ ref: 'main', inputs }),
  });
  return r.ok ? null : { ok: false, message: `La publication n’a pas pu démarrer (GitHub ${r.status}).` };
}

/** Déclenche le workflow GitHub de publication pour un site. */
export async function declencherPublication(siteId: string): Promise<Resultat> {
  const erreur = await lancerWorkflow('publier-site.yml', { site_id: siteId, mode: 'production' });
  if (erreur) return erreur;
  const supabase = await createClient();
  await supabase.from('sites').update({ publication_demandee_at: new Date().toISOString() }).eq('id', siteId);
  return { ok: true, message: 'Publication lancée : en ligne d’ici 2 à 3 minutes.' };
}

/** Construit l'aperçu privé du brouillon (éditeur visuel) : https://apercu.<slug>.pages.dev */
export async function declencherApercu(siteId: string): Promise<Resultat> {
  const erreur = await lancerWorkflow('publier-site.yml', { site_id: siteId, mode: 'apercu' });
  return erreur ?? { ok: true, message: 'Aperçu en préparation (1 à 2 minutes).' };
}

/** Publication groupée (propagation d'un changement partagé), par lots de 200 sites. */
export async function declencherPublications(siteIds: string[]): Promise<Resultat> {
  const ids = [...new Set(siteIds)];
  if (!ids.length) return { ok: true, message: 'Aucun site à republier.' };
  for (let i = 0; i < ids.length; i += 200) {
    const erreur = await lancerWorkflow('publier-sites.yml', { site_ids: JSON.stringify(ids.slice(i, i + 200)) });
    if (erreur) return erreur;
  }
  const supabase = await createClient();
  await supabase.from('sites').update({ publication_demandee_at: new Date().toISOString() }).in('id', ids);
  return { ok: true, message: `${ids.length} site(s) en cours de republication (quelques minutes, 4 en parallèle).` };
}

export type Cible = { specialite?: string; modele?: string; marque?: string; tous?: boolean };

/**
 * Sites en ligne qui utilisent une ressource partagée : spécialité (photos et animation de la banque visuelle),
 * modèle, ou tous (changement de charte, de dessins, d'animations).
 */
export async function sitesConcernes(cible: Cible): Promise<{ id: string; nom: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('sites').select('id, config').eq('statut', 'en_ligne');
  return (data ?? [])
    .map((s) => ({ id: s.id as string, d: normaliserDraft(s.config) }))
    .filter(({ d }) =>
      cible.tous ||
      (cible.specialite && (d.theme.specialite === cible.specialite || (d.theme as { specialiteSecondaire?: string }).specialiteSecondaire === cible.specialite)) ||
      (cible.modele && d.theme.modele === cible.modele) ||
      (cible.marque && d.theme.logo?.marque === cible.marque),
    )
    .map(({ id, d }) => ({ id, nom: d.cabinet.nom || d.praticiens[0]?.nom || id }));
}
