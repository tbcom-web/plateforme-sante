// FICHES CONSEILS POUR LES PATIENTS (demande de Paul du 2026-10-10) : contenus courts et pratiques (un écran : gestes utiles, ce
// qu'il vaut mieux ne pas faire, quand consulter), rédigés dans les packs de contenus de chaque profession
// (packages/contenus/professions/<profession>/conseils.ts), relus par Paul dans les Arrivages (contenus-revue.ts, nature
// « conseil »), affichés sur le site : bloc « Fiches conseils » de chaque page de soin et page « Fiches conseils » (/conseils).
//
// Relation soin ↔ fiches : plusieurs fiches par soin, une fiche peut servir plusieurs soins (`soins` de la fiche).
// Choix du praticien : `fichesConseils` du brouillon (draft.ts ; cases de l'étape « Contenus » du parcours, préréglées par
// l'univers). Une fiche décochée n'apparaît pas sur son site. Sans choix enregistré (sites antérieurs) : les fiches liées à ses soins.
// Publication : seules les fiches ACCEPTÉES par Paul pour leur texte actuel (empreinte) sont servies aux sites publiés
// (`slugsAcceptes`) ; les démonstrations locales (fichiers apps/sites/src/data/sites, jamais publiées) les montrent toutes.
// Sujets à faible niveau de preuve (posturologie, réflexologie) : jamais affichés. Module pur.

import { contenusDuPack, etatContenu, type NatureContenu, type PackContenus, type RevueContenu } from './contenus-revue';

export type ConseilPatient = {
  /** Identifiant stable (adresse /conseils/<slug>, clé de revue, case de l'éditeur) */
  slug: string;
  /** Titre (H1 de la fiche) */
  titre: string;
  /** Une phrase : de quoi parle la fiche (meta description, ≤ 160 caractères) */
  resume: string;
  /** Picto du site (pictos.ts, sans le préfixe « picto: ») */
  picto?: string;
  /** Gestes utiles, une phrase par point */
  points: readonly string[];
  /** Ce qu'il vaut mieux ne pas faire soi-même */
  aEviter?: readonly string[];
  /** Situations qui doivent faire consulter */
  quandConsulter: readonly string[];
  /** Soins du catalogue concernés (slugs de soins_catalogue) */
  soins: readonly string[];
  /** Identifiants des sources du pack */
  sources: readonly string[];
};

/** Fiches montrées dans le bloc d'une page de soin (peu d'information d'un coup) */
export const CONSEILS_PAR_SOIN_MAX = 3;

const FAIBLE_PREUVE = /posturo|r[ée]flexo/i;
const autorisee = (c: Pick<ConseilPatient, 'slug' | 'titre'>) => !FAIBLE_PREUVE.test(`${c.slug} ${c.titre}`);

/**
 * Fiches affichées sur un site :
 * - `acceptees` : slugs acceptés par Paul (site publié) ; absent = démonstration locale (toutes) ;
 * - `choix` : fiches cochées par le praticien (draft.fichesConseils) ; absent = celles liées à au moins un soin du site ;
 * - jamais une fiche à faible niveau de preuve. Ordre : celui du pack.
 */
export function conseilsDuSite(o: {
  conseils: readonly ConseilPatient[];
  soinsDuSite: readonly string[];
  choix?: readonly string[] | null;
  acceptees?: ReadonlySet<string> | null;
}): ConseilPatient[] {
  return o.conseils.filter((c) =>
    autorisee(c)
    && (!o.acceptees || o.acceptees.has(c.slug))
    && (o.choix ? o.choix.includes(c.slug) : c.soins.some((s) => o.soinsDuSite.includes(s))),
  );
}

/** Fiches liées à un soin, parmi celles du site, dans l'ordre du pack */
export const conseilsDuSoin = (slug: string, conseils: readonly ConseilPatient[], max = CONSEILS_PAR_SOIN_MAX) =>
  conseils.filter((c) => c.soins.includes(slug)).slice(0, max);

/** Corps Markdown d'une fiche (page /conseils/<slug>.md, llms-full.txt, aperçu de revue) */
export function markdownConseil(c: Pick<ConseilPatient, 'points' | 'aEviter' | 'quandConsulter'>, niveau = 2): string {
  const h = '#'.repeat(niveau);
  const liste = (l: readonly string[]) => l.map((x) => `- ${x}`).join('\n');
  return [
    `${h} Les gestes utiles`, '', liste(c.points),
    ...(c.aEviter?.length ? ['', `${h} À ne pas faire soi-même`, '', liste(c.aEviter)] : []),
    '', `${h} Quand consulter`, '', liste(c.quandConsulter),
  ].join('\n');
}

/** Statut courant d'une clé de revue (table illustrations_statuts : cle, statut, empreinte) */
export type LigneStatutContenu = { cle: string; statut: string; empreinte?: string | null };

/**
 * Identifiants des contenus d'une nature (« conseil », « article ») ACCEPTÉS par Paul pour leur texte actuel : statut « valide »
 * et empreinte égale à celle du texte du pack. Un texte modifié après la revue n'est plus servi tant qu'il n'est pas relu.
 */
export function slugsAcceptes(pack: PackContenus, nature: NatureContenu, statuts: readonly LigneStatutContenu[]): Set<string> {
  const revues = new Map<string, RevueContenu>(statuts.map((s) => [s.cle, { statut: s.statut, empreinte: s.empreinte ?? null }]));
  return new Set(contenusDuPack(pack).filter((c) => c.nature === nature && etatContenu(c, revues.get(c.cle)) === 'accepte').map((c) => c.id));
}
