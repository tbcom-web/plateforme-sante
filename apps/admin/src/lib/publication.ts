import 'server-only';
import { createClient } from '@/lib/supabase/server';

/** Déclenche le workflow GitHub de publication pour un site. */
export async function declencherPublication(siteId: string): Promise<{ ok: boolean; message: string }> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return { ok: false, message: 'Publication non configurée (GITHUB_TOKEN / GITHUB_REPO).' };

  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/publier-site.yml/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    body: JSON.stringify({ ref: 'main', inputs: { site_id: siteId } }),
  });
  if (!r.ok) return { ok: false, message: `La publication n’a pas pu démarrer (GitHub ${r.status}).` };

  const supabase = await createClient();
  await supabase.from('sites').update({ publication_demandee_at: new Date().toISOString() }).eq('id', siteId);
  return { ok: true, message: 'Publication lancée : en ligne d’ici 2 à 3 minutes.' };
}
