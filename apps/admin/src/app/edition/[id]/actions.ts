'use server';

import { revalidatePath } from 'next/cache';
import { normaliserDraft, validerPersonnalisation, controlerPublication, type Alerte } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { declencherApercu, declencherPublication } from '@/lib/publication';
import { enregistrerSite } from '@/app/mon-site/actions';

const UUID = /^[0-9a-f-]{36}$/;

/** Site lisible par l'utilisateur connecté (son site, ou n'importe lequel pour un admin, via RLS). */
async function lireSite(siteId: string) {
  if (!UUID.test(siteId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('sites').select('id, slug, options, config').eq('id', siteId).maybeSingle();
  return data;
}

export type ResultatEdition = { ok: boolean; message: string; refus?: Record<string, string>; alertes?: Record<string, Alerte[]> };

/**
 * Enregistre les modifications de l'éditeur visuel.
 * textes : clé → texte (chaîne vide = retour au standard) ; photos : emplacement → URL déjà envoyée.
 */
export async function enregistrerEdition(siteId: string, textes: Record<string, string>, photos: Record<string, string>): Promise<ResultatEdition> {
  const site = await lireSite(siteId);
  if (!site) return { ok: false, message: 'Site introuvable.' };
  const d = normaliserDraft(site.config);
  const edition = Boolean((site.options as { edition?: boolean } | null)?.edition);

  // Textes : fusion avec l'existant, puis contrôle (zones connues, longueur, lexique, option « édition »).
  const fusion: Record<string, string> = { ...d.perso.textes };
  for (const [cle, valeur] of Object.entries(textes)) {
    if (valeur.trim()) fusion[cle] = valeur; else delete fusion[cle];
  }
  const controle = validerPersonnalisation(fusion, edition);

  // Photos : emplacements connus uniquement (l'URL est revérifiée à l'enregistrement du brouillon).
  for (const [emplacement, url] of Object.entries(photos)) {
    let m: RegExpMatchArray | null;
    if (emplacement === 'photos.accueil') d.photos.accueil = url;
    else if (emplacement === 'photos.panorama') d.photos.panorama = url;
    else if ((m = emplacement.match(/^photos\.cabinet\.(\d)$/))) d.photos.cabinet[Number(m[1])] = url;
    else if ((m = emplacement.match(/^praticien\.(\d+)\.photo$/)) && d.praticiens[Number(m[1])]) d.praticiens[Number(m[1])].photo = url;
  }
  d.photos.cabinet = d.photos.cabinet.filter(Boolean);
  d.perso = { textes: controle.textes };

  const r = await enregistrerSite(siteId, d);
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath(`/edition/${siteId}`);
  const nbRefus = Object.keys(controle.refus).length;
  return {
    ok: nbRefus === 0,
    message: nbRefus ? `${nbRefus} texte(s) non enregistré(s) : voir les remarques.` : 'Modifications enregistrées.',
    refus: controle.refus,
    alertes: controle.alertes,
  };
}

/** Régénère l'aperçu privé du brouillon. */
export async function lancerApercu(siteId: string) {
  const site = await lireSite(siteId);
  if (!site) return { ok: false, message: 'Site introuvable.' };
  return declencherApercu(siteId);
}

/** Date de génération de l'aperçu en ligne (null s'il n'existe pas encore). */
export async function etatApercu(siteId: string): Promise<{ slug: string | null; genere: string | null }> {
  const site = await lireSite(siteId);
  if (!site?.slug) return { slug: null, genere: null };
  try {
    const r = await fetch(`https://apercu.${site.slug}.pages.dev/apercu.json`, { cache: 'no-store' });
    return { slug: site.slug, genere: r.ok ? ((await r.json()) as { genere: string }).genere : null };
  } catch {
    return { slug: site.slug, genere: null };
  }
}

/** Publie le site (mêmes contrôles que le tableau de bord). */
export async function publierDepuisEdition(siteId: string) {
  const site = await lireSite(siteId);
  if (!site) return { ok: false, message: 'Site introuvable.' };
  const { bloquants } = controlerPublication(normaliserDraft(site.config));
  if (bloquants.length) return { ok: false, message: `Avant de publier : ${bloquants.join(' · ')}` };
  return declencherPublication(siteId);
}
