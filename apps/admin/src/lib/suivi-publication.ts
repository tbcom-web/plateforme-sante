import 'server-only';
import {
  causeEchecGithub,
  idRunDepuisUrl,
  interpreterSuivi,
  jobDuSite,
  MESSAGES_ECHEC_ENREGISTRES,
  runsCandidats,
  versionConcorde,
  type JobGithub,
  type RunGithub,
  type VueSuivi,
} from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { essaiBloqueProduction } from '@/lib/essai';

// Suivi réel d'une publication (route /api/sites/[id]/publication) : état en base, étapes du job GitHub Actions, puis
// vérification que le site en ligne sert la nouvelle version (/version.json). Le jeton GitHub reste côté serveur.

const REPO = /^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_REPO ?? '') ? process.env.GITHUB_REPO! : 'tbcom-web/plateforme-sante';
const UUID = /^[0-9a-f-]{36}$/;
const SLUG = /^[a-z0-9-]{1,63}$/;

// Petit cache mémoire : plusieurs onglets ou visiteurs qui suivent la même publication ne multiplient pas les appels GitHub
// (limite de 5 000 requêtes/h avec le jeton, 60 sans). Les annotations d'un job terminé ne changent plus.
const cache = new Map<string, { expire: number; valeur: unknown }>();
const enCache = (cle: string, ttl: number, lire: () => Promise<unknown>) => {
  const c = cache.get(cle);
  if (c && c.expire > Date.now()) return Promise.resolve(c.valeur);
  return lire().then((valeur) => {
    if (cache.size > 300) cache.clear();
    if (valeur !== null) cache.set(cle, { expire: Date.now() + ttl, valeur });
    return valeur;
  });
};

/** Lecture de l'API GitHub, avec le jeton de publication s'il existe (jamais renvoyé au navigateur). */
async function github<T>(chemin: string, ttl = 2_000): Promise<T | null> {
  return enCache(chemin, ttl, async () => {
    const appel = (jeton?: string) =>
      fetch(`https://api.github.com/repos/${REPO}/${chemin}`, {
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      });
    try {
      const jeton = process.env.GITHUB_TOKEN;
      let r = await appel(jeton);
      // Jeton sans droit de lecture des Actions : lecture publique (dépôt public).
      if (jeton && (r.status === 401 || r.status === 403)) r = await appel();
      return r.ok ? ((await r.json()) as T) : null;
    } catch {
      return null;
    }
  }) as Promise<T | null>;
}

const jobsDuRun = async (id: number) => (await github<{ jobs: JobGithub[] }>(`actions/runs/${id}/jobs?per_page=100`))?.jobs ?? null;

/**
 * Job GitHub de la demande en cours : run connu (lien enregistré par le workflow) ou, s'il ne l'est pas encore (file
 * d'attente) ou s'il a été remplacé, run le plus récent du site créé depuis la demande.
 */
async function trouverJob(siteId: string, runUrl: string | null, demandeeLe: string | null): Promise<{ runId: number; job: JobGithub } | null> {
  const connu = idRunDepuisUrl(runUrl);
  if (connu) {
    const job = jobDuSite((await jobsDuRun(connu)) ?? [], siteId);
    // Run annulé : peut-être remplacé par une publication plus récente, cherchée ci-dessous.
    if (job && !(job.status === 'completed' && job.conclusion === 'cancelled')) return { runId: connu, job };
    if (!job) return null;
  }
  if (!demandeeLe) return null;
  const depuis = new Date(Date.parse(demandeeLe) - 30_000).toISOString().slice(0, 19) + 'Z';
  const liste = await github<{ workflow_runs: RunGithub[] }>(`actions/runs?event=workflow_dispatch&per_page=30&created=${encodeURIComponent(`>=${depuis}`)}`);
  const { directs, groupes } = runsCandidats(liste?.workflow_runs ?? [], siteId, demandeeLe);
  for (const run of directs.slice(0, 3)) {
    const job = jobDuSite((await jobsDuRun(run.id)) ?? [], siteId);
    if (job) return { runId: run.id, job };
  }
  for (const run of groupes.slice(0, 3)) {
    const job = (await jobsDuRun(run.id))?.find((j) => j.name.includes(siteId));
    if (job) return { runId: run.id, job };
  }
  // Aucune publication plus récente : le run connu (annulé) est interprété tel quel (remplacé, interrompu…).
  const ancien = connu ? jobDuSite((await jobsDuRun(connu)) ?? [], siteId) : null;
  return connu && ancien ? { runId: connu, job: ancien } : null;
}

/** Messages GitHub d'un job terminé sans succès (ex. « The job was not acquired by Runner… »). */
async function annotations(job: JobGithub): Promise<string[]> {
  if (!job.id) return [];
  const liste = await github<{ message: string; annotation_level: string }[]>(`check-runs/${job.id}/annotations`, 10 * 60_000);
  return (liste ?? []).filter((a) => a.annotation_level === 'failure').map((a) => a.message);
}

/**
 * Le site en ligne (https://<slug>.pages.dev) sert-il la version de cette demande ? Version d'essai : aperçu privé
 * (https://apercu.<slug>.pages.dev/apercu.json, qui porte aussi l'horodatage de la demande).
 */
async function versionEnLigne(slug: string, demandeeLe: string | null, runId: number | null, essai = false): Promise<boolean> {
  if (!SLUG.test(slug)) return false;
  try {
    const url = essai ? `https://apercu.${slug}.pages.dev/apercu.json` : `https://${slug}.pages.dev/version.json`;
    const r = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(4_000) });
    return r.ok && versionConcorde(await r.json(), demandeeLe, runId);
  } catch {
    return false;
  }
}

export type ReponseSuivi = VueSuivi & { lien: string | null; journal?: string | null };

type Ligne = {
  slug: string | null;
  domaine: string | null;
  publication_etat: 'en_cours' | 'ok' | 'echec' | null;
  publication_run_url: string | null;
  publication_debut: string | null;
  publication_fin: string | null;
  publication_erreur: string | null;
  publication_demandee_at: string | null;
};

/**
 * Suivi de la publication d'un site, pour son propriétaire ou un admin (lecture par la RLS : null si le site n'est pas
 * accessible). `admin` : ajoute le lien du journal GitHub.
 */
export async function suiviPublication(siteId: string, admin = false): Promise<ReponseSuivi | null> {
  if (!UUID.test(siteId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('sites')
    .select('slug, domaine, publication_etat, publication_run_url, publication_debut, publication_fin, publication_erreur, publication_demandee_at')
    .eq('id', siteId)
    .maybeSingle();
  const s = data as Ligne | null;
  if (!s) return null;
  // Version d'essai non validée : la « publication » est l'aperçu privé (jamais la production).
  const essai = await essaiBloqueProduction(siteId);

  const base = { etat: s.publication_etat, debut: s.publication_debut, fin: s.publication_fin, erreur: s.publication_erreur };
  const maintenant = Date.now();
  let trouve: { runId: number; job: JobGithub } | null = null;
  let notes: string[] = [];
  let versionConfirmee: boolean | null = null;

  if (base.etat === 'en_cours') {
    trouve = await trouverJob(siteId, s.publication_run_url, s.publication_demandee_at);
    if (trouve?.job.status === 'completed' && trouve.job.conclusion !== 'success') notes = await annotations(trouve.job);
  }
  const runId = trouve?.runId ?? idRunDepuisUrl(s.publication_run_url);
  if (base.etat === 'ok' && s.slug) versionConfirmee = await versionEnLigne(s.slug, s.publication_demandee_at, runId, essai);

  let vue = interpreterSuivi({ base, job: trouve?.job ?? null, annotations: notes, versionConfirmee, maintenant });

  // Job terminé sans succès que le workflow n'a pas pu signaler (jamais lancé faute de serveur, annulé) : l'échec est
  // enregistré pour que le tableau de bord et l'admin le voient (pas pour une publication remplacée par une plus récente).
  if (vue.phase === 'echec' && base.etat === 'en_cours' && trouve) {
    const cause = causeEchecGithub(trouve.job, notes);
    const message = MESSAGES_ECHEC_ENREGISTRES[cause] ?? 'La construction ou la mise en ligne a échoué : voir le journal de publication.';
    await supabase.rpc('signaler_echec_publication', { p_site: siteId, p_message: message });
  }
  // Workflow réussi, base pas encore à jour (dernière étape en cours d'écriture) : vérification en ligne directe.
  if (vue.phase === 'verification' && base.etat === 'en_cours' && s.slug && (await versionEnLigne(s.slug, s.publication_demandee_at, runId, essai))) {
    vue = interpreterSuivi({ base: { ...base, etat: 'ok', fin: new Date(maintenant).toISOString() }, job: null, versionConfirmee: true, maintenant });
  }

  const hote = essai ? (s.slug ? `apercu.${s.slug}.pages.dev` : null) : s.domaine || (s.slug ? `${s.slug}.pages.dev` : null);
  if (essai && (vue.phase === 'en_ligne' || vue.phase === 'en_ligne_propagation')) {
    vue = {
      ...vue,
      titre: 'Votre version d’essai est prête',
      detail: vue.phase === 'en_ligne'
        ? 'Lien privé, non indexé par les moteurs de recherche : vous pouvez le partager.'
        : 'Lien privé, non indexé. La mise à jour peut prendre encore quelques instants à apparaître.',
    };
  }
  return {
    ...vue,
    lien: hote ? `https://${hote}` : null,
    ...(admin ? { journal: runId ? `https://github.com/${REPO}/actions/runs/${runId}` : s.publication_run_url } : {}),
  };
}
