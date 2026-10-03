'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getMonSite, manques } from '@/lib/sites';

export type EtatPublication = { ok: boolean; message: string } | null;

// Demande la publication du site du praticien connecté (workflow GitHub « publier-site »).
export async function publierSite(): Promise<EtatPublication> {
  const site = await getMonSite(); // lecture via RLS : uniquement le site du praticien connecté
  if (!site.id) return { ok: false, message: 'Créez d’abord votre site.' };

  const aFaire = manques(site.draft);
  if (aFaire.length > 0) return { ok: false, message: `Il manque : ${aFaire.join(', ')}.` };

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return { ok: false, message: 'Publication non configurée (GITHUB_TOKEN / GITHUB_REPO).' };

  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/publier-site.yml/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main', inputs: { site_id: site.id } }),
  });
  if (!r.ok) return { ok: false, message: `La publication n’a pas pu démarrer (GitHub ${r.status}).` };

  const supabase = await createClient();
  await supabase.from('sites').update({ publication_demandee_at: new Date().toISOString() }).eq('id', site.id);

  revalidatePath('/tableau-de-bord');
  return { ok: true, message: 'Publication lancée : votre site sera en ligne d’ici 2 à 3 minutes.' };
}
