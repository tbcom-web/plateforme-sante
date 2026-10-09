import 'server-only';
import { controlerImagesDemo, gardeApercuEssai, gardeProduction, normaliserDraft } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { getRole } from '@/lib/admin';
import { essaiBloqueProduction, proprietaireSansAcces } from '@/lib/essai';
import { controlerPremiumSite } from '@/lib/photos-sous-licence';

type Resultat = { ok: boolean; message: string };

/** Lance un workflow GitHub Actions (workflow_dispatch) avec ses paramètres. */
export async function lancerWorkflow(fichier: string, inputs: Record<string, string>): Promise<Resultat | null> {
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

const UUID = /^[0-9a-f-]{36}$/;

/**
 * Garde « anonyme = jamais de workflow » (0025, aussi en SQL) : un site dont le propriétaire n'a pas créé son accès
 * (session anonyme, ou essai sans CGU) n'a ni aperçu par workflow, ni publication, quel que soit le demandeur. Le
 * praticien voit le rendu dans son navigateur. Renvoie le refus, ou null si l'action est permise.
 */
async function refusSansAcces(siteId: string): Promise<Resultat | null> {
  const { data } = await (await createClient()).auth.getUser();
  const sansAcces = Boolean(data.user?.is_anonymous) || (await proprietaireSansAcces(siteId));
  const garde = gardeApercuEssai({ anonyme: sansAcces, cguAcceptees: !sansAcces });
  if (garde.autorisee) return null;
  if ((await getRole()) === 'admin') return { ok: false, message: 'Le praticien n’a pas encore créé son accès : ni aperçu privé ni publication pour ce site.' };
  return { ok: false, message: garde.raison };
}

/**
 * Contrôle BLOQUANT (kit-demo.ts) : une image de DÉMONSTRATION (cabinet ou praticien fictif) dans la configuration ENREGISTRÉE
 * (brouillon brut, et version publiée pour une republication) empêche toute construction du site, même privée. normaliserDraft
 * les retire déjà à chaque enregistrement : ce contrôle attrape une configuration écrite autrement (import, script, ancienne
 * version). Message clair, rien n'est lancé.
 */
async function refusImagesDemo(siteId: string, colonne: 'config' | 'config_publiee' = 'config'): Promise<Resultat | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('sites').select(colonne).eq('id', siteId).maybeSingle();
  const config = (data as Record<string, unknown> | null)?.[colonne] ?? null;
  const c = controlerImagesDemo(config);
  if (!c.ok) return { ok: false, message: c.message };
  // PHOTOS PREMIUM (photos-sous-licence.ts, 0057) : chaque photo sous licence doit avoir une licence achetée, rattachée à CE site,
  // non expirée, dans la limite de sa licence ; sinon rien n'est construit (« Cette photo nécessite l'option Photos premium »).
  const p = await controlerPremiumSite(supabase, siteId, config);
  return p.ok ? null : { ok: false, message: p.message };
}

/**
 * Publie un site : fige le brouillon en version publiée (config → config_publiee, fonction demander_publication),
 * puis lance le workflow GitHub qui construit le site depuis cette version. Refusé pour un site suspendu.
 */
export async function declencherPublication(siteId: string): Promise<Resultat> {
  if (!UUID.test(siteId)) return { ok: false, message: 'Site invalide.' };
  const refus = await refusSansAcces(siteId);
  if (refus) return refus;
  const demo = await refusImagesDemo(siteId);
  if (demo) return demo;
  // Garde « essai = aperçu seulement » (aussi en SQL dans demander_publication et dans le workflow) : un site d'essai
  // non validé n'est jamais publié en production. Pour le praticien, « Publier » met à jour sa version d'essai privée ;
  // l'admin passe par « Valider et mettre en ligne » (/admin/leads), qui valide d'abord l'essai.
  const garde = gardeProduction({ enEssai: await essaiBloqueProduction(siteId), valideLe: null });
  if (!garde.autorisee) {
    if ((await getRole()) === 'admin') return { ok: false, message: 'Site en version d’essai : validez-le d’abord (Essais → « Valider et mettre en ligne »).' };
    return declencherApercuEssai(siteId);
  }
  const supabase = await createClient();
  // Derniers articles du flux pour un site créé après leur diffusion (rubrique Actualités) ; sans effet si la
  // fonction n'existe pas encore (base sans la mise à jour 0022) : la publication continue.
  const rattrapage = await supabase.rpc('rattraper_articles', { p_site: siteId });
  if (rattrapage.error && rattrapage.error.code !== 'PGRST202') console.error('rattraper_articles', rattrapage.error);
  const { error } = await supabase.rpc('demander_publication', { p_site: siteId });
  // Fonction absente (base sans la mise à jour 0017) : publication à l'ancienne, depuis le brouillon.
  const sansSuivi = error?.code === 'PGRST202';
  if (error && !sansSuivi) {
    if (/suspendu/i.test(error.message)) return { ok: false, message: 'Site suspendu : il ne peut pas être publié.' };
    console.error('demander_publication', error);
    return { ok: false, message: 'La publication n’a pas pu être enregistrée. Réessayez dans un instant.' };
  }
  const erreur = await lancerWorkflow('publier-site.yml', { site_id: siteId, mode: 'production' });
  if (erreur) {
    if (!sansSuivi) await supabase.rpc('signaler_echec_publication', { p_site: siteId, p_message: erreur.message });
    return erreur;
  }
  return { ok: true, message: 'Publication lancée.' };
}

/**
 * Version d'essai : construit l'aperçu privé du brouillon (https://apercu.<slug>.pages.dev, jamais indexé) avec le suivi
 * de publication (demander_apercu_essai : propriétaire ou admin, essai en cours, ni suspendu ni terminé). Jamais de
 * production ici.
 */
export async function declencherApercuEssai(siteId: string): Promise<Resultat> {
  if (!UUID.test(siteId)) return { ok: false, message: 'Site invalide.' };
  const refus = await refusSansAcces(siteId);
  if (refus) return refus;
  const demo = await refusImagesDemo(siteId);
  if (demo) return demo;
  const supabase = await createClient();
  const rattrapage = await supabase.rpc('rattraper_articles', { p_site: siteId });
  if (rattrapage.error && rattrapage.error.code !== 'PGRST202') console.error('rattraper_articles', rattrapage.error);
  const { error } = await supabase.rpc('demander_apercu_essai', { p_site: siteId });
  if (error) {
    if (/suspendu/i.test(error.message)) return { ok: false, message: 'Votre version d’essai est suspendue : contactez votre conseillère.' };
    if (/accès requis/i.test(error.message)) return { ok: false, message: 'Créez votre accès (e-mail et mot de passe) pour obtenir le lien privé de votre site.' };
    if (/termin/i.test(error.message)) return { ok: false, message: 'Votre essai est terminé : passez à l’abonnement ou contactez votre conseillère.' };
    console.error('demander_apercu_essai', error);
    return { ok: false, message: 'La version d’essai n’a pas pu être préparée. Réessayez dans un instant.' };
  }
  const erreur = await lancerWorkflow('publier-site.yml', { site_id: siteId, mode: 'apercu' });
  if (erreur) {
    await supabase.rpc('signaler_echec_publication', { p_site: siteId, p_message: erreur.message });
    return erreur;
  }
  return { ok: true, message: 'Votre version d’essai est en préparation (environ une minute).' };
}

/** Construit l'aperçu privé du brouillon (éditeur visuel) : https://apercu.<slug>.pages.dev */
export async function declencherApercu(siteId: string): Promise<Resultat> {
  if (UUID.test(siteId)) {
    const refus = await refusSansAcces(siteId);
    if (refus) return refus;
    const demo = await refusImagesDemo(siteId);
    if (demo) return demo;
    const rattrapage = await (await createClient()).rpc('rattraper_articles', { p_site: siteId });
    if (rattrapage.error && rattrapage.error.code !== 'PGRST202') console.error('rattraper_articles', rattrapage.error);
  }
  const erreur = await lancerWorkflow('publier-site.yml', { site_id: siteId, mode: 'apercu' });
  return erreur ?? { ok: true, message: 'Aperçu en préparation (1 à 2 minutes).' };
}

/**
 * Republie la version déjà publiée de chaque site (propagation d'un changement partagé, « Réessayer »), par lots
 * de 100 sites. Le brouillon n'est jamais publié ici, et un site suspendu n'est jamais republié.
 */
export async function declencherPublications(siteIds: string[]): Promise<Resultat> {
  const demandes = [...new Set(siteIds)].filter((id) => UUID.test(id));
  if (!demandes.length) return { ok: true, message: 'Aucun site à republier.' };
  const supabase = await createClient();
  let lances = 0;
  let ignores = 0;
  let bloquesDemo = 0;
  let bloquesPremium = 0;
  for (let i = 0; i < demandes.length; i += 100) {
    const lot = demandes.slice(i, i + 100);
    const { data, error } = await supabase.from('sites').select('id, config, config_publiee').in('id', lot).neq('statut', 'suspendu');
    if (error) return { ok: false, message: 'Lecture des sites impossible.' };
    // Image de démonstration dans la version publiée (ou le brouillon d'un site sans version publiée) : jamais republié
    const sansDemo = (data ?? []).filter((s) => controlerImagesDemo(s.config_publiee ?? s.config).ok);
    // Photo premium sans licence pour le site : jamais republié (même contrôle que la publication)
    const premium = await Promise.all(sansDemo.map((s) => controlerPremiumSite(supabase, s.id as string, s.config_publiee ?? s.config)));
    const sains = sansDemo.filter((_, i) => premium[i].ok);
    bloquesPremium += sansDemo.length - sains.length;
    bloquesDemo += (data ?? []).length - sansDemo.length;
    const ids = sains.map((s) => s.id as string);
    ignores += lot.length - (data ?? []).length;
    if (!ids.length) continue;
    const maintenant = new Date().toISOString();
    const erreur = await lancerWorkflow('publier-sites.yml', { site_ids: JSON.stringify(ids) });
    if (erreur) {
      await supabase.from('sites').update({ publication_etat: 'echec', publication_fin: maintenant, publication_erreur: erreur.message }).in('id', ids);
      return lances ? { ok: false, message: `${lances} site(s) lancés, puis : ${erreur.message}` } : erreur;
    }
    const { error: suivi } = await supabase
      .from('sites')
      .update({ publication_demandee_at: maintenant, publication_etat: 'en_cours', publication_debut: maintenant, publication_fin: null, publication_erreur: null, publication_run_url: null })
      .in('id', ids);
    if (suivi) await supabase.from('sites').update({ publication_demandee_at: maintenant }).in('id', ids);
    lances += ids.length;
  }
  const suspendus = ignores ? ` ${ignores} site(s) suspendu(s) ou introuvable(s) ignoré(s).` : '';
  const demos = bloquesDemo ? ` ${bloquesDemo} site(s) non republié(s) : photo d’exemple (image de démonstration) à remplacer.` : '';
  const premiums = bloquesPremium ? ` ${bloquesPremium} site(s) non republié(s) : photo premium sans licence pour le site.` : '';
  return { ok: true, message: `${lances} site(s) en cours de republication (quelques minutes, 4 en parallèle).${suspendus}${demos}${premiums}` };
}

export type Cible = { specialite?: string; modele?: string; marque?: string; jeuPhotos?: string; soin?: string; tous?: boolean };

/**
 * Sites en ligne dont la version publiée utilise une ressource partagée : spécialité (photos et animation de la
 * banque visuelle), modèle, logo, jeu de photos, soin du catalogue, ou tous (charte, dessins, animations).
 * Les sites suspendus ne sont jamais concernés.
 */
export async function sitesConcernes(cible: Cible): Promise<{ id: string; nom: string }[]> {
  const supabase = await createClient();
  // Version publiée ; repli sur le brouillon pour un site publié avant la version publiée séparée.
  const [publies, anciens] = await Promise.all([
    supabase.from('sites').select('id, config:config_publiee').eq('statut', 'en_ligne').not('config_publiee', 'is', null),
    supabase.from('sites').select('id, config').eq('statut', 'en_ligne').is('config_publiee', null),
  ]);
  const lignes = publies.error
    ? ((await supabase.from('sites').select('id, config').eq('statut', 'en_ligne')).data ?? [])
    : [...(publies.data ?? []), ...(anciens.data ?? [])];
  return lignes
    .map((s) => ({ id: s.id as string, d: normaliserDraft(s.config) }))
    .filter(({ d }) =>
      cible.tous ||
      (cible.specialite && (d.theme.specialite === cible.specialite || d.theme.specialiteSecondaire === cible.specialite)) ||
      (cible.modele && d.theme.modele === cible.modele) ||
      (cible.marque && d.theme.logo?.marque === cible.marque) ||
      (cible.jeuPhotos && d.theme.jeuPhotos === cible.jeuPhotos) ||
      (cible.soin && d.soins.includes(cible.soin)),
    )
    .map(({ id, d }) => ({ id, nom: d.cabinet.nom || d.praticiens[0]?.nom || id }));
}
