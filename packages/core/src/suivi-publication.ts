// Suivi d'une publication pour le praticien (back-office) : fonctions pures, sans accès réseau.
// Le serveur admin lit l'état en base (sites.publication_*), les étapes du job GitHub Actions et le fichier /version.json
// du site en ligne, puis interpreterSuivi() en tire des étapes lisibles. La progression suit les étapes réelles du
// workflow .github/workflows/publier-site.yml : jamais de pourcentage inventé.

export const ETAPES_PUBLICATION = [
  { id: 'preparation', libelle: 'Préparation de la publication' },
  { id: 'contenus', libelle: 'Récupération de vos contenus' },
  { id: 'mise_en_page', libelle: 'Mise en page et mise en forme des illustrations' },
  { id: 'mise_en_ligne', libelle: 'Mise en ligne sécurisée' },
  { id: 'verifications', libelle: 'Dernières vérifications' },
] as const;

export type IdEtapePublication = (typeof ETAPES_PUBLICATION)[number]['id'];
export type EtatEtape = 'faite' | 'en_cours' | 'a_venir';

/** Pas d'un job GitHub (API GET /repos/{repo}/actions/runs/{id}/jobs). */
export type PasGithub = { name: string; status: string; conclusion: string | null };
export type JobGithub = { id?: number; name: string; status: string; conclusion: string | null; steps?: PasGithub[] };
export type RunGithub = { id: number; status: string; conclusion: string | null; created_at: string; display_title?: string; path?: string; name?: string };

/** Durée au-delà de laquelle une publication « en cours » est réputée interrompue (le workflow dure environ une minute). */
export const DUREE_MAX_PUBLICATION_MS = 30 * 60_000;
/** Attente de la nouvelle version en ligne après la fin du workflow, avant d'afficher « en ligne, mise à jour en cours ». */
export const DELAI_VERIFICATION_MS = 60_000;
/** File d'attente GitHub au-delà de laquelle on prévient que les serveurs sont sollicités. */
export const ATTENTE_LONGUE_MS = 2 * 60_000;

/**
 * Étape praticien d'un pas technique du workflow (null : pas ignoré, ex. nettoyage ou signalement d'échec).
 * Noms actuels et anciens (publication groupée d'avant le suivi) reconnus.
 */
export function etapeDuPas(nom: string): IdEtapePublication | null {
  const n = nom.trim();
  if (/^(Post |Complete job)|Signaler l.échec/i.test(n)) return null;
  if (/^Set up job$|checkout|setup-node/i.test(n)) return 'preparation';
  if (/npm ci|^Préparer/i.test(n)) return 'contenus';
  if (/^Construire/i.test(n)) return 'mise_en_page';
  if (/Cloudflare|^Déployer|Publication réussie|Passer le site en ligne/i.test(n)) return 'mise_en_ligne';
  return null;
}

const pasTermine = (p: PasGithub) => p.status === 'completed' && p.conclusion !== 'failure' && p.conclusion !== 'cancelled';

/**
 * Nombre d'étapes praticien terminées (0 à 4) d'après les pas du job : une étape est faite quand tous ses pas sont
 * terminés et que l'étape suivante a commencé ou que le job est fini. Les étapes restent dans l'ordre (monotone).
 */
export function etapesFaites(job: JobGithub | null): number {
  if (!job?.steps?.length) return 0;
  const parEtape = new Map<IdEtapePublication, PasGithub[]>();
  for (const p of job.steps) {
    const e = etapeDuPas(p.name);
    if (e) parEtape.set(e, [...(parEtape.get(e) ?? []), p]);
  }
  let faites = 0;
  for (const { id } of ETAPES_PUBLICATION.slice(0, 4)) {
    const pas = parEtape.get(id) ?? [];
    if (!pas.length || !pas.every(pasTermine)) break;
    faites++;
  }
  return faites;
}

export type CauseEchec = 'construction' | 'serveur_indisponible' | 'remplacee' | 'annulee' | 'interrompue' | 'lancement';

/** Cause d'un job GitHub terminé sans succès, d'après sa conclusion et ses annotations (messages GitHub). */
export function causeEchecGithub(job: Pick<JobGithub, 'conclusion' | 'steps'> | null, annotations: string[] = []): CauseEchec {
  const texte = annotations.join('\n');
  if (/higher priority waiting request|Canceling since/i.test(texte)) return 'remplacee';
  if (/not acquired by Runner|runner .*(lost|offline|shutdown)|lost communication with the server/i.test(texte)) return 'serveur_indisponible';
  if (job?.conclusion === 'cancelled') return job.steps?.length ? 'annulee' : 'serveur_indisponible';
  return 'construction';
}

/** Cause d'un échec déjà enregistré en base (colonne publication_erreur). */
export function causeEchecEnregistre(erreur: string | null): CauseEchec {
  const e = erreur ?? '';
  if (/indisponible|not acquired/i.test(e)) return 'serveur_indisponible';
  if (/n.a pas pu démarrer|non configurée/i.test(e)) return 'lancement';
  if (/interrompue/i.test(e)) return 'annulee';
  return 'construction';
}

/** Message enregistré en base quand le serveur admin constate l'échec d'un job (le workflow n'a pas pu le signaler). */
export const MESSAGES_ECHEC_ENREGISTRES: Partial<Record<CauseEchec, string>> = {
  serveur_indisponible: 'Service de publication momentanément indisponible (aucun serveur disponible).',
  annulee: 'Publication interrompue avant la fin.',
};

const DETAILS_ECHEC: Record<CauseEchec, string> = {
  construction: 'Une étape de la mise en ligne a échoué. Votre site en ligne n’a pas changé.',
  serveur_indisponible: 'Le service de publication était momentanément indisponible. Votre site en ligne n’a pas changé : vous pouvez réessayer dans quelques minutes.',
  remplacee: 'Une publication plus récente a pris le relais.',
  annulee: 'La publication a été interrompue avant la fin. Votre site en ligne n’a pas changé.',
  interrompue: 'La publication n’a pas répondu à temps. Votre site en ligne n’a pas changé.',
  lancement: 'Le service de publication n’a pas pu être joint. Votre site en ligne n’a pas changé.',
};

/** Identifiant d'un run d'après son lien (https://github.com/o/r/actions/runs/123…). */
export function idRunDepuisUrl(url: string | null | undefined): number | null {
  const m = String(url ?? '').match(/\/actions\/runs\/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Job d'un site dans un run : publication seule (un job) ou groupée (« publier (<site_id>) / publier »). */
export function jobDuSite(jobs: JobGithub[], siteId: string): JobGithub | null {
  return jobs.find((j) => j.name.includes(siteId)) ?? (jobs.length === 1 ? jobs[0] : null);
}

/**
 * Runs candidats d'une demande de publication, du plus récent au plus ancien : runs « publier-site » dont le titre porte
 * l'identifiant du site (run-name du workflow), créés au plus tôt 30 s avant la demande (écart d'horloge toléré).
 * Les runs « publier-sites » (publication groupée) sont renvoyés à part : leur titre ne cite pas les sites.
 */
export function runsCandidats(runs: RunGithub[], siteId: string, demandeeLe: string | null): { directs: RunGithub[]; groupes: RunGithub[] } {
  const depuis = demandeeLe ? Date.parse(demandeeLe) - 30_000 : 0;
  const recents = runs.filter((r) => Date.parse(r.created_at) >= depuis).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return {
    directs: recents.filter((r) => /publier-site\.yml$/.test(r.path ?? '') && (r.display_title ?? '').includes(siteId)),
    groupes: recents.filter((r) => /publier-sites\.yml$/.test(r.path ?? '')),
  };
}

/** Le fichier /version.json servi par le site correspond-il à la publication demandée ? */
export function versionConcorde(version: unknown, demandeeLe: string | null, runId?: number | null): boolean {
  if (!version || typeof version !== 'object') return false;
  const v = version as { publication?: unknown; run?: unknown };
  if (runId && v.run != null && String(v.run) === String(runId)) return true;
  if (!demandeeLe || typeof v.publication !== 'string' || !v.publication) return false;
  const a = Date.parse(v.publication), b = Date.parse(demandeeLe);
  return Number.isFinite(a) && a === b;
}

export type PhaseSuivi = 'aucune' | 'attente' | 'en_cours' | 'verification' | 'en_ligne' | 'en_ligne_propagation' | 'echec';

export type EntreeSuivi = {
  /** Colonnes sites.publication_* */
  base: { etat: 'en_cours' | 'ok' | 'echec' | null; debut: string | null; fin: string | null; erreur: string | null };
  /** Job GitHub de la demande en cours (null : pas encore trouvé ou pas encore créé) */
  job: JobGithub | null;
  /** Le run trouvé est terminé (sa conclusion peut différer de celle du job, ex. « failure » pour un job jamais lancé) */
  runConclusion?: string | null;
  annotations?: string[];
  /** Le site en ligne sert la nouvelle version (null : pas encore vérifié) */
  versionConfirmee: boolean | null;
  maintenant: number;
};

export type VueSuivi = {
  phase: PhaseSuivi;
  etapes: { id: IdEtapePublication; libelle: string; etat: EtatEtape }[];
  /** Étapes terminées sur le total (progression réelle) */
  faites: number;
  total: number;
  titre: string;
  detail: string;
  /** Plus rien à suivre : le client arrête d'interroger le serveur */
  termine: boolean;
  /** Cause d'un échec (le serveur l'enregistre en base si le workflow n'a pas pu le faire) */
  cause?: CauseEchec;
};

const etapesAvec = (faites: number, enCours: boolean) =>
  ETAPES_PUBLICATION.map((e, i) => ({ ...e, etat: (i < faites ? 'faite' : i === faites && enCours ? 'en_cours' : 'a_venir') as EtatEtape }));

const vue = (phase: PhaseSuivi, faites: number, titre: string, detail = '', extra: Partial<VueSuivi> = {}): VueSuivi => {
  const fini = phase === 'en_ligne' || phase === 'en_ligne_propagation' || phase === 'echec' || phase === 'aucune';
  return {
    phase,
    etapes: etapesAvec(faites, !fini),
    faites,
    total: ETAPES_PUBLICATION.length,
    titre,
    detail,
    termine: fini,
    ...extra,
  };
};

const echec = (cause: CauseEchec, erreur?: string | null, faites = 0) =>
  vue('echec', faites, 'La publication n’a pas abouti', cause === 'construction' && /^Site incomplet/.test(erreur ?? '') ? `${erreur!.replace(/\.?\s*$/, '.')} Votre site en ligne n’a pas changé.` : DETAILS_ECHEC[cause], { cause });

/** Vue du suivi d'une publication, d'après l'état en base, le job GitHub et la vérification du site en ligne. */
export function interpreterSuivi(e: EntreeSuivi): VueSuivi {
  const { base, job, maintenant } = e;
  if (!base.etat) return vue('aucune', 0, '');
  if (base.etat === 'echec') return echec(causeEchecEnregistre(base.erreur), base.erreur);

  if (base.etat === 'ok') {
    const total = ETAPES_PUBLICATION.length;
    if (e.versionConfirmee) return vue('en_ligne', total, 'Ça y est, votre site est en ligne', 'La nouvelle version est publiée.');
    const depuis = base.fin ? maintenant - Date.parse(base.fin) : Infinity;
    if (depuis > DELAI_VERIFICATION_MS) {
      return vue('en_ligne_propagation', total, 'Votre site est en ligne', 'La mise à jour peut prendre encore quelques instants à apparaître partout.');
    }
    return vue('verification', 4, 'Dernières vérifications…', 'Nous vérifions que la nouvelle version est bien visible en ligne.');
  }

  // Publication en cours
  if (base.debut && maintenant - Date.parse(base.debut) > DUREE_MAX_PUBLICATION_MS) return echec('interrompue');
  const faites = etapesFaites(job);
  if (job?.status === 'completed') {
    if (job.conclusion === 'success' && e.runConclusion !== 'failure') {
      return vue('verification', 4, 'Dernières vérifications…', 'Nous vérifions que la nouvelle version est bien visible en ligne.');
    }
    const cause = causeEchecGithub(job, e.annotations);
    if (cause === 'remplacee') return vue('attente', 0, 'Une publication plus récente prend le relais…', 'Vos dernières modifications seront toutes publiées.');
    return echec(cause, null, faites);
  }
  if (!job || job.status !== 'in_progress' || !job.steps?.length) {
    const attente = base.debut ? maintenant - Date.parse(base.debut) : 0;
    return vue(
      'attente',
      0,
      'En attente d’une place de publication…',
      attente > ATTENTE_LONGUE_MS
        ? 'Les serveurs de publication sont très sollicités : la vôtre démarrera dès qu’une place se libère. Votre site en ligne reste inchangé d’ici là.'
        : 'La publication prend environ une minute.',
    );
  }
  const courante = ETAPES_PUBLICATION[Math.min(faites, ETAPES_PUBLICATION.length - 1)];
  return vue('en_cours', faites, `${courante.libelle}…`, 'La publication prend environ une minute.');
}
