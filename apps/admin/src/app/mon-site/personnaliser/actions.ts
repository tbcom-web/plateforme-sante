'use server';

import { revalidatePath } from 'next/cache';
import {
  blocsDuModele, casseLaCharte, controlerPersonnalisations, lirePersonnalisations, normaliserDraft, normaliserReglagesPerso, nouvelleVersionPerso,
  pageCommeLeModele, type AlertePerso, type ParPerso, type ReglagesPerso,
} from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { getRole } from '@/lib/admin';
import { getCatalogue } from '@/lib/sites';
import { declencherPublication } from '@/lib/publication';
import { journaliser } from '@/lib/personnalisations-site';

export type ResultatPerso = { ok: boolean; message: string; version?: string; revision?: number; conflit?: boolean; alertes?: AlertePerso[] };

const UUID = /^[0-9a-f-]{36}$/;
const CONFLIT = 'Le site a été modifié ailleurs entre-temps (autre onglet, formulaire, conseiller) : rechargez la page. Vos réglages restent affichés.';

/** Site modifiable par l'utilisateur connecté : le sien, ou n'importe lequel pour l'admin (RLS + contrôle explicite) */
async function siteModifiable(siteId: string) {
  if (!UUID.test(siteId)) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from('sites').select('id, owner, profession_slug, config, updated_at').eq('id', siteId).maybeSingle();
  if (!data) return null;
  const admin = (await getRole()) === 'admin';
  if (!admin && data.owner !== auth.user.id) return null;
  return { supabase, site: data, par: (admin && data.owner !== auth.user.id ? 'admin' : 'praticien') as ParPerso };
}

/** Contexte des contrôles : titres des pages (débordement) et blocs du modèle de chaque page personnalisée */
async function controler(reglages: ReglagesPerso, config: unknown, profession: string) {
  const d = normaliserDraft(config);
  const catalogue = await getCatalogue(profession).catch(() => []);
  const modele = Object.fromEntries(Object.keys(reglages.pages ?? {}).map((cle) => {
    const s = catalogue.find((c) => `soin:${c.slug}` === cle) as { corps?: string; faq?: { q: string; r: string }[] } | undefined;
    return [cle, blocsDuModele(s?.corps ?? '', s?.faq ?? [], profession)];
  }));
  const titres = [...catalogue.filter((c) => d.soins.includes(c.slug)).map((c) => c.titre_court), d.cabinet.ville, d.cabinet.nom].filter(Boolean) as string[];
  return { alertes: controlerPersonnalisations(reglages, { titres, majuscules: d.theme.typo?.casse === 'majuscules', modele, profession, nomsPages: Object.fromEntries(catalogue.map((c) => [`soin:${c.slug}`, c.titre_court])) }), modele };
}

/**
 * Enregistre les réglages comme NOUVELLE version (brouillon : le site en ligne ne change qu'à la publication). Verrou optimiste sur
 * updated_at : rien n'est écrasé si le site a changé depuis l'ouverture. Pages identiques au modèle : retirées (elles suivront le
 * catalogue).
 */
export async function enregistrerPersonnalisations(siteId: string, brut: ReglagesPerso, version: string | null, opts: { note?: string; action?: 'enregistrement' | 'restauration' | 'annulation' } = {}): Promise<ResultatPerso> {
  const acces = await siteModifiable(siteId);
  if (!acces) return { ok: false, message: 'Site introuvable ou non modifiable avec ce compte.' };
  const { supabase, site, par } = acces;
  if (version && site.updated_at !== version) return { ok: false, conflit: true, message: CONFLIT };
  const reglages = normaliserReglagesPerso(brut);
  const { alertes, modele } = await controler(reglages, site.config, site.profession_slug ?? 'podologue');
  for (const [cle, blocs] of Object.entries(reglages.pages ?? {})) if (modele[cle] && pageCommeLeModele(modele[cle], blocs)) delete reglages.pages![cle];
  if (reglages.pages && !Object.keys(reglages.pages).length) delete reglages.pages;
  const p = nouvelleVersionPerso(lirePersonnalisations(site.config), reglages, par, new Date().toISOString(), opts.note);
  const config = { ...(site.config as Record<string, unknown>), personnalisations: p };
  let requete = supabase.from('sites').update({ config }).eq('id', siteId);
  if (version) requete = requete.eq('updated_at', version);
  const { data, error } = await requete.select('updated_at').maybeSingle();
  if (error) return { ok: false, message: 'Enregistrement impossible. Réessayez dans un instant.' };
  if (!data) return { ok: false, conflit: true, message: CONFLIT };
  await journaliser(siteId, p, opts.action ?? 'enregistrement', casseLaCharte(alertes), opts.note);
  revalidatePath('/mon-site/personnaliser');
  return { ok: true, message: `Modifications enregistrées (version ${p.revision}), pas encore en ligne : « Publier les modifications » met le site à jour.`, version: data.updated_at, revision: p.revision, alertes };
}

/** Enregistre puis publie par le circuit habituel (version figée, construction ; essai : aperçu privé seulement) */
export async function publierPersonnalisations(siteId: string, brut: ReglagesPerso, version: string | null): Promise<ResultatPerso> {
  const r = await enregistrerPersonnalisations(siteId, brut, version);
  if (!r.ok) return r;
  const p = await declencherPublication(siteId);
  if (p.ok) {
    const acces = await siteModifiable(siteId);
    if (acces) await journaliser(siteId, lirePersonnalisations(acces.site.config), 'publication', casseLaCharte(r.alertes ?? []));
  }
  return { ...r, ok: p.ok, message: p.ok ? `Version ${r.revision} enregistrée. Publication lancée : le site sera à jour dans quelques minutes.` : `Enregistré, pas encore en ligne : ${p.message}` };
}

/** Admin / commercial : annule TOUTES les personnalisations d'un site (retour au modèle), nouvelle version vide */
export async function annulerPersonnalisations(siteId: string, version: string | null): Promise<ResultatPerso> {
  if ((await getRole()) !== 'admin') return { ok: false, message: 'Réservé à l’administration.' };
  const r = await enregistrerPersonnalisations(siteId, {}, version, { note: 'Personnalisations annulées par l’administration', action: 'annulation' });
  revalidatePath('/admin/personnalisations');
  return r;
}
