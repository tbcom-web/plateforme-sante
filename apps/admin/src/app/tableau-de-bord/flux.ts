'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getMonSite } from '@/lib/sites';
import { declencherPublication } from '@/lib/publication';

export type Proposition = {
  article_id: string;
  statut: 'propose' | 'publie' | 'ignore';
  article: { titre: string; resume: string; theme: string; date_publication: string } | null;
};

export async function getPropositions(siteId: string): Promise<Proposition[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('site_articles')
    .select('article_id, statut, article:articles_flux(titre, resume, theme, date_publication)')
    .eq('site_id', siteId)
    .order('propose_le', { ascending: false })
    .returns<Proposition[]>();
  return data ?? [];
}

/** Publier, ignorer ou retirer un article du flux sur le site du praticien connecté. */
export async function deciderArticle(articleId: string, statut: 'publie' | 'ignore'): Promise<{ ok: boolean; message: string }> {
  const site = await getMonSite();
  if (!site.id) return { ok: false, message: 'Site introuvable.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('site_articles')
    .update({ statut, decide_le: new Date().toISOString() })
    .eq('site_id', site.id)
    .eq('article_id', articleId);
  if (error) return { ok: false, message: 'Action impossible.' };

  let message = statut === 'publie' ? 'Article ajouté à votre site.' : 'Article retiré de vos propositions.';
  if (site.statut === 'en_ligne') {
    const r = await declencherPublication(site.id);
    message += r.ok ? ' Votre site sera mis à jour d’ici 2 à 3 minutes.' : ` ${r.message}`;
  }
  revalidatePath('/tableau-de-bord');
  return { ok: true, message };
}
