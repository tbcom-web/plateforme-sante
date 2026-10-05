'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { normaliserDraft, THEMES_FLUX, verifierTexte } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { declencherPublication } from '@/lib/publication';
import { createClient } from '@/lib/supabase/server';

export type ChampsArticle = { titre: string; resume: string; corps: string; theme: string; date_publication: string; image: string; image_alt: string };
export type Resultat = { ok: boolean; message: string; alertes?: string[] } | null;

const t = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
// Seules les images déposées dans le dossier « banque/flux » du stockage sont acceptées.
const PREFIXE_IMAGES = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/banque/flux/`;

const slugifier = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

function nettoyer(c: ChampsArticle) {
  return {
    titre: t(c.titre, 160),
    resume: t(c.resume, 300),
    corps: t(c.corps, 20000),
    theme: (THEMES_FLUX as readonly string[]).includes(c.theme) ? c.theme : THEMES_FLUX[0],
    date_publication: /^\d{4}-\d{2}-\d{2}$/.test(c.date_publication) ? c.date_publication : new Date().toISOString().slice(0, 10),
    image: t(c.image, 400).startsWith(PREFIXE_IMAGES) ? t(c.image, 400) : '',
    image_alt: t(c.image_alt, 160),
  };
}

/** Contrôle lexical de l'article (niveau strict : le flux part sur de nombreux sites). */
function controler(v: ReturnType<typeof nettoyer>): string[] {
  return [v.titre, v.resume, v.corps].flatMap((txt) =>
    verifierTexte(txt, 'strict').filter((a) => a.bloquante).map((a) => `« ${a.extrait} » : ${a.raison}`),
  );
}

export async function enregistrerArticle(id: string | null, champs: ChampsArticle): Promise<Resultat> {
  await exigerAdmin();
  const v = nettoyer(champs);
  if (!v.titre || !v.resume || !v.corps) return { ok: false, message: 'Titre, résumé et texte sont obligatoires.' };
  if (v.image && v.image_alt.length < 10) return { ok: false, message: 'Décrivez l’image en une phrase (texte alternatif, utile au référencement et à l’accessibilité).' };
  const alertes = controler(v);
  if (alertes.length) return { ok: false, message: 'Le texte contient des formulations à revoir.', alertes };

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from('articles_flux').update({ ...v, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return { ok: false, message: 'Enregistrement impossible.' };
    revalidatePath('/admin/flux');
    return { ok: true, message: 'Enregistré.' };
  }
  const slug = `${slugifier(v.titre)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase.from('articles_flux').insert({ ...v, slug }).select('id').single();
  if (error || !data) return { ok: false, message: 'Création impossible : la base de données est-elle à jour (mise à jour 0009, flux) ?' };
  revalidatePath('/admin/flux');
  redirect(`/admin/flux/${data.id}`);
}

/** Propose l'article à tous les sites abonnés au thème ; publie directement pour les sites en mode automatique. */
export async function diffuserArticle(id: string): Promise<Resultat> {
  await exigerAdmin();
  const supabase = await createClient();
  const { data: article } = await supabase.from('articles_flux').select('id, theme, profession_slug, image, image_alt').eq('id', id).maybeSingle();
  if (!article) return { ok: false, message: 'Article introuvable.' };
  if (!article.image || !article.image_alt) return { ok: false, message: 'Ajoutez une image et son texte alternatif avant de diffuser l’article.' };

  const { data: sites } = await supabase
    .from('sites')
    .select('id, statut, config')
    .eq('profession_slug', article.profession_slug)
    .neq('statut', 'suspendu');

  const cibles = (sites ?? [])
    .map((s) => ({ ...s, d: normaliserDraft(s.config) }))
    .filter((s) => s.d.flux.themes.length === 0 || s.d.flux.themes.includes(article.theme));

  const { data: deja } = await supabase.from('site_articles').select('site_id').eq('article_id', id);
  const dejaProposes = new Set((deja ?? []).map((x) => x.site_id));
  const nouveaux = cibles.filter((s) => !dejaProposes.has(s.id));

  if (nouveaux.length) {
    const { error } = await supabase.from('site_articles').insert(
      nouveaux.map((s) => ({
        site_id: s.id,
        article_id: id,
        statut: s.d.flux.mode === 'auto' ? 'publie' : 'propose',
        decide_le: s.d.flux.mode === 'auto' ? new Date().toISOString() : null,
      })),
    );
    if (error) return { ok: false, message: 'Diffusion impossible.' };
  }
  await supabase.from('articles_flux').update({ statut: 'diffuse' }).eq('id', id);

  // Republie les sites en ligne qui ont publié automatiquement.
  const aRepublier = nouveaux.filter((s) => s.d.flux.mode === 'auto' && s.statut === 'en_ligne');
  for (const s of aRepublier) await declencherPublication(s.id);

  revalidatePath('/admin/flux');
  const auto = nouveaux.filter((s) => s.d.flux.mode === 'auto').length;
  return {
    ok: true,
    message: `Diffusé à ${nouveaux.length} site(s) : ${auto} publication(s) automatique(s), ${nouveaux.length - auto} proposition(s) en attente.`,
  };
}
