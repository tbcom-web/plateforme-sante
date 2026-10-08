// Propositions de tags de Claude (demande de Paul, 2026-10-08 : « On me demande de taguer les images de ma bibliothèque… Peux-tu
// les taguer à ma place, et éventuellement noter les meilleurs éléments à partir de mes critères de goût ? »).
//
// Claude a regardé chaque visuel (rendus PNG, photos publiques) et propose, dans retours/propositions-claude-tags.json :
// sujets (SUJETS_VISUELS), activités (sports.ts), hashtags de soins / d'emplacements, professions (professions.ts ; hors registre :
// identifiant libre normalisé), une description factuelle, des alertes, et une NOTE PRÉDITE selon docs/gout-paul.md.
//
// Règles (aucune exception) :
//   - rien n'est une décision de Paul tant qu'il n'a pas cliqué : « Valider » écrit les tags cochés dans assets_sujets /
//     assets_hashtags (auteur = Paul) et trace l'origine dans classement_suggestions (raison « proposition Claude ») ;
//   - la note prédite n'est JAMAIS une note de Paul : elle sert à ordonner les files d'évaluation, à mesurer l'accord avec Paul
//     (calibration, section automatique de retours/CALIBRATION.md), et au plus d'a priori FAIBLE et PLAFONNÉ (POIDS_A_PRIORI_CLAUDE)
//     pour un élément jamais noté ; jamais pour exclure ni valider un élément ;
//   - jamais le sujet « posture » ni un hashtag « postur… » (sujets à faible preuve).
// Module pur, déterministe, sans dépendance réseau.

import { estHashtagExclu, SUJETS_EXCLUS } from './dictionnaire-metier';
import { hashtagsValides, normaliserHashtag } from './hashtags';
import { estSujetVisuel, SUJETS_VISUELS } from './photos-libres';
import { PROFESSIONS } from './professions';
import { SPORTS, FICHES_SPORTS } from './sports';

export const VERSION_PROPOSITIONS_CLAUDE = 1;

// ---------------------------------------------------------------------------------------------------------------
// Vocabulaire
// ---------------------------------------------------------------------------------------------------------------

/** Alertes posées par Claude en regardant l'image (affichées dans l'interface de validation) */
export const ALERTES_CLAUDE = {
  'anatomie-douteuse': 'Anatomie douteuse',
  'texte-ou-marque': 'Texte, logo ou marque visible',
  'visage-reconnaissable': 'Visage reconnaissable',
  'sang-ou-plaie': 'Sang ou plaie',
  'rendu-ia-suspect': 'Rendu IA suspect',
  doublon: 'Doublon quasi identique',
  'sombre-ou-flou': 'Sombre ou flou',
  tatouage: 'Tatouage',
  instruments: 'Instruments ou geste invasif',
  clipart: 'Clipart',
  incomprehensible: 'Sens pas clair',
  juxtaposition: 'Éléments non reliés',
  'objet-peu-reconnaissable': 'Objet peu reconnaissable',
  vieillot: 'Vieillot',
  cible: 'Lu comme une cible',
} as const;
export type AlerteClaude = keyof typeof ALERTES_CLAUDE;
export const estAlerteClaude = (a: unknown): a is AlerteClaude => typeof a === 'string' && Object.prototype.hasOwnProperty.call(ALERTES_CLAUDE, a);

/** Activités : sports de sports.ts, plus quelques activités de marche ; libellés lisibles */
export const ACTIVITES_CLAUDE: Readonly<Record<string, string>> = {
  ...Object.fromEntries(SPORTS.map((s) => [s, FICHES_SPORTS[s].libelle])),
  marche: 'Marche',
  'marche-nordique': 'Marche nordique',
  yoga: 'Yoga et étirements',
  volley: 'Volley-ball',
};

/**
 * Professions hors registre (professions.ts n'a qu'une profession active) : identifiants libres normalisés, gardés pour le jour
 * où l'ostéopathie et la kinésithérapie seront ouvertes. « pedicure-podologue » est ramené à l'identifiant du registre.
 */
export const PROFESSIONS_HORS_REGISTRE: Readonly<Record<string, string>> = {
  kinesitherapeute: 'Kinésithérapeute',
  osteopathe: 'Ostéopathe',
};
const ALIAS_PROFESSIONS: Readonly<Record<string, string>> = { 'pedicure-podologue': 'podologue', podologie: 'podologue', kine: 'kinesitherapeute', osteo: 'osteopathe' };

/** Libellé d'une profession : registre d'abord, puis hors registre, sinon l'identifiant */
export function libelleProfession(id: string): string {
  return PROFESSIONS.find((p) => p.id === id)?.libelle ?? PROFESSIONS_HORS_REGISTRE[id] ?? id;
}
export const professionDuRegistre = (id: string) => PROFESSIONS.some((p) => p.id === id);

/** « Pédicure-podologue », « #Kiné » → identifiant normalisé (registre ou hors registre), null sinon */
export function normaliserProfession(brut: unknown): string | null {
  const h = normaliserHashtag(brut);
  if (!h) return null;
  return ALIAS_PROFESSIONS[h] ?? h;
}

/**
 * Hashtag sous lequel une profession validée est rangée (sans migration : assets_hashtags), ex. #profession-podologue.
 * Une colonne dédiée pourra les reprendre plus tard (docs/retours.md).
 */
export const hashtagProfession = (id: string) => normaliserHashtag(`profession-${id}`);

export const CONFIANCES_CLAUDE = ['forte', 'moyenne', 'faible'] as const;
export type ConfianceClaude = (typeof CONFIANCES_CLAUDE)[number];

// ---------------------------------------------------------------------------------------------------------------
// Lecture du fichier retours/propositions-claude-tags.json
// ---------------------------------------------------------------------------------------------------------------

export type PropositionTags = {
  cle: string;
  sujets: string[];
  activites: string[];
  hashtags: string[];
  professions: string[];
  description: string;
  alertes: AlerteClaude[];
  /** Note prédite (1-5) selon le profil de goût ; null si l'élément était déjà noté par Paul au moment de la proposition */
  notePredite: number | null;
  confiance: ConfianceClaude;
  justification: string | null;
  /** AAAA-MM-JJ */
  le: string;
  /** Version de docs/gout-paul.md */
  profil: string;
};

export type LotPropositionsTags = { version: number; le: string | null; profil: string | null; propositions: PropositionTags[] };

const CLE = /^[a-z]+:[^\s]{1,200}$/;
const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const texte = (x: unknown, max: number) => (typeof x === 'string' && x.trim() ? x.replace(/\s+/g, ' ').trim().slice(0, max) : null);

/** Une entrée du fichier → proposition normalisée (null si la clé est invalide) */
export function lirePropositionTags(cle: string, brut: unknown, defauts: { le?: string | null; profil?: string | null } = {}): PropositionTags | null {
  if (!CLE.test(cle) || !brut || typeof brut !== 'object') return null;
  const b = brut as Record<string, unknown>;
  const liste = (x: unknown) => (Array.isArray(x) ? x : []);
  const sujets = [...new Set(liste(b.sujets).filter((s): s is string => estSujetVisuel(s) && !SUJETS_EXCLUS.includes(s)))];
  const activites = [...new Set(liste(b.activites).map((a) => normaliserHashtag(a)).filter((a): a is string => Boolean(a) && !estHashtagExclu(a!)))].slice(0, 6);
  const hashtags = hashtagsValides(liste(b.hashtags)).filter((h) => !estHashtagExclu(h));
  const professions = [...new Set(liste(b.professions).map(normaliserProfession).filter((p): p is string => Boolean(p)))].slice(0, 6);
  const alertes = [...new Set(liste(b.alertes).filter(estAlerteClaude))];
  const n = Number(b.notePredite);
  const notePredite = Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
  const confiance = (CONFIANCES_CLAUDE as readonly unknown[]).includes(b.confiance) ? (b.confiance as ConfianceClaude) : 'faible';
  const le = typeof b.le === 'string' && JOUR.test(b.le) ? b.le : defauts.le && JOUR.test(defauts.le) ? defauts.le : '1970-01-01';
  const profil = texte(b.profil, 40) ?? defauts.profil ?? '';
  return { cle, sujets, activites, hashtags, professions, description: texte(b.description, 300) ?? '', alertes, notePredite, confiance, justification: texte(b.justification, 300), le, profil };
}

/** Fichier complet ({ version, le, profil, propositions: { clé: … } }) → lot normalisé, clés triées ; entrée illisible → lot vide */
export function lirePropositionsTags(json: unknown): LotPropositionsTags {
  const vide: LotPropositionsTags = { version: VERSION_PROPOSITIONS_CLAUDE, le: null, profil: null, propositions: [] };
  if (!json || typeof json !== 'object') return vide;
  const j = json as Record<string, unknown>;
  const le = typeof j.le === 'string' && JOUR.test(j.le) ? j.le : null;
  const profil = texte(j.profil, 40);
  const brutes = j.propositions && typeof j.propositions === 'object' ? (j.propositions as Record<string, unknown>) : {};
  const propositions = Object.keys(brutes).sort().map((k) => lirePropositionTags(k, brutes[k], { le, profil })).filter((p): p is PropositionTags => p !== null);
  return { version: Number(j.version) || VERSION_PROPOSITIONS_CLAUDE, le, profil, propositions };
}

/** Tous les hashtags qu'une validation complète ajouterait : hashtags, activités, professions (#profession-…) */
export function hashtagsAValider(p: Pick<PropositionTags, 'hashtags' | 'activites' | 'professions'>): string[] {
  return hashtagsValides([...p.hashtags, ...p.activites, ...p.professions.map(hashtagProfession)], 30);
}

// ---------------------------------------------------------------------------------------------------------------
// Validation par Paul : ce qui s'écrit, et rien d'autre
// ---------------------------------------------------------------------------------------------------------------

export const RAISON_PROPOSITION_CLAUDE = 'proposition Claude';

export type ChoixValidation = { cle: string; sujets: readonly string[]; hashtags: readonly string[] };

export type EcrituresValidation = {
  /** assets_sujets (0028) : ajouts seulement, sujets absents des sujets effectifs */
  sujets: { cle: string; sujet: string; action: 'ajout' }[];
  /** assets_hashtags (0029) : ajouts seulement, hashtags absents de l'état courant */
  hashtags: { cle: string; hashtag: string; action: 'ajout' }[];
  /** classement_suggestions (0033) : chaque proposition acceptée ou refusée, raison « proposition Claude » */
  suggestions: { contexte: 'bibliotheque'; nature: 'sujet' | 'hashtag'; valeur: string; decision: 'acceptee' | 'refusee'; raison: string }[];
};

/**
 * Choix de Paul (tags cochés, éventuellement corrigés) → lignes à écrire. Un tag coché qui n'était pas proposé est écrit aussi
 * (correction de Paul) mais sans ligne « proposition Claude ». Aucune note, jamais.
 */
export function ecrituresValidation(
  choix: readonly ChoixValidation[],
  propositions: readonly PropositionTags[],
  etat: { sujets?: Readonly<Record<string, readonly string[]>>; hashtags?: Readonly<Record<string, readonly string[]>> } = {},
): EcrituresValidation {
  const parCle = new Map(propositions.map((p) => [p.cle, p]));
  const res: EcrituresValidation = { sujets: [], hashtags: [], suggestions: [] };
  const vus = new Set<string>();
  for (const c of choix) {
    if (!c || typeof c.cle !== 'string' || !CLE.test(c.cle) || vus.has(c.cle)) continue;
    vus.add(c.cle);
    const p = parCle.get(c.cle);
    const sujets = [...new Set((c.sujets ?? []).filter((s) => estSujetVisuel(s) && !SUJETS_EXCLUS.includes(s)))];
    const tags = hashtagsValides([...(c.hashtags ?? [])], 30).filter((h) => !estHashtagExclu(h));
    const dejaS = etat.sujets?.[c.cle] ?? [];
    const dejaH = etat.hashtags?.[c.cle] ?? [];
    for (const s of sujets) if (!dejaS.includes(s)) res.sujets.push({ cle: c.cle, sujet: s, action: 'ajout' });
    for (const h of tags) if (!dejaH.includes(h)) res.hashtags.push({ cle: c.cle, hashtag: h, action: 'ajout' });
    if (p) {
      const raison = `${RAISON_PROPOSITION_CLAUDE} ${c.cle}`.slice(0, 200);
      for (const s of p.sujets) res.suggestions.push({ contexte: 'bibliotheque', nature: 'sujet', valeur: s, decision: sujets.includes(s) ? 'acceptee' : 'refusee', raison });
      for (const h of hashtagsAValider(p)) res.suggestions.push({ contexte: 'bibliotheque', nature: 'hashtag', valeur: h, decision: tags.includes(h) ? 'acceptee' : 'refusee', raison });
    }
  }
  return res;
}

// ---------------------------------------------------------------------------------------------------------------
// Ordre des files et a priori plafonné
// ---------------------------------------------------------------------------------------------------------------

/**
 * Poids MAXIMAL de la note prédite sur le score d'un élément jamais noté : ±0,25 ★ (5 prédit → +0,25 ; 1 prédit → −0,25),
 * multiplié par la confiance. Désactivable (option `actif`). Ne s'applique jamais à un élément déjà noté par Paul.
 */
export const POIDS_A_PRIORI_CLAUDE = 0.25;
export const FACTEUR_CONFIANCE: Record<ConfianceClaude, number> = { forte: 1, moyenne: 0.7, faible: 0.4 };

/** Effet de la note prédite sur le score (en étoiles), borné à ±POIDS_A_PRIORI_CLAUDE ; 0 si déjà noté, sans note ou désactivé */
export function aPrioriClaude(p: Pick<PropositionTags, 'notePredite' | 'confiance'> | null | undefined, o: { dejaNote?: boolean; actif?: boolean; poids?: number } = {}): number {
  if (!p || p.notePredite == null || o.dejaNote || o.actif === false) return 0;
  const poids = Math.min(POIDS_A_PRIORI_CLAUDE, Math.max(0, o.poids ?? POIDS_A_PRIORI_CLAUDE));
  const brut = ((p.notePredite - 3) / 2) * poids * FACTEUR_CONFIANCE[p.confiance];
  return Math.round(Math.max(-poids, Math.min(poids, brut)) * 1000) / 1000;
}

export type PrioriteTags = 'sans-sujet' | 'sans-hashtag' | 'complement';
export const LIBELLES_PRIORITE_TAGS: Record<PrioriteTags, string> = { 'sans-sujet': 'Sans sujet', 'sans-hashtag': 'Sans hashtag', complement: 'Compléments' };

/** Priorité de tagage : sans sujet effectif, puis sans hashtag, puis le reste */
export function prioriteTags(cle: string, etat: { sujets?: Readonly<Record<string, readonly string[]>>; hashtags?: Readonly<Record<string, readonly string[]>> }): PrioriteTags {
  const s = (etat.sujets?.[cle] ?? []).filter((x) => x !== 'general');
  if (!s.length) return 'sans-sujet';
  if (!(etat.hashtags?.[cle] ?? []).length) return 'sans-hashtag';
  return 'complement';
}

const RANG_CONFIANCE: Record<ConfianceClaude, number> = { forte: 0, moyenne: 1, faible: 2 };

/**
 * Tri « les plus prometteurs d'abord » (file d'évaluation) : jamais notés avant déjà notés, puis note prédite décroissante,
 * confiance, clé. Ne retire rien : un élément prédit 1 ★ reste dans la file, en fin.
 */
export function trierParNotePredite<T extends Pick<PropositionTags, 'cle' | 'notePredite' | 'confiance'>>(l: readonly T[], notees: ReadonlySet<string> = new Set()): T[] {
  return [...l].sort((a, b) =>
    Number(notees.has(a.cle)) - Number(notees.has(b.cle))
    || (b.notePredite ?? 0) - (a.notePredite ?? 0)
    || RANG_CONFIANCE[a.confiance] - RANG_CONFIANCE[b.confiance]
    || a.cle.localeCompare(b.cle));
}

// ---------------------------------------------------------------------------------------------------------------
// Calibration : accord prédiction / note de Paul
// ---------------------------------------------------------------------------------------------------------------

export type NotePaul = { cle: string; note: number; jour?: string | null };
export type PaireTags = { cle: string; predite: number; paul: number; confiance: ConfianceClaude; profil: string; jour: string };

/**
 * Paires (prédiction, première note de Paul donnée le jour de la proposition ou après) sur la même clé. Les notes antérieures
 * à la proposition ne comptent pas (Claude les connaissait peut-être).
 */
export function pairesPropositions(props: readonly PropositionTags[], notes: readonly NotePaul[]): PaireTags[] {
  const res: PaireTags[] = [];
  for (const p of props) {
    if (p.notePredite == null) continue;
    const apres = notes
      .filter((n) => n.cle === p.cle && Number.isInteger(n.note) && n.note >= 1 && n.note <= 5 && String(n.jour ?? '') >= p.le)
      .sort((a, b) => String(a.jour ?? '').localeCompare(String(b.jour ?? '')));
    if (apres.length) res.push({ cle: p.cle, predite: p.notePredite, paul: apres[0].note, confiance: p.confiance, profil: p.profil, jour: String(apres[0].jour ?? '') });
  }
  return res.sort((a, b) => a.jour.localeCompare(b.jour) || a.cle.localeCompare(b.cle));
}

export type MesureTags = { n: number; exactes: number; aUnPres: number; ecartMoyen: number; biais: number };

export function mesurerPaires(paires: readonly PaireTags[]): MesureTags {
  const n = paires.length;
  if (!n) return { n: 0, exactes: 0, aUnPres: 0, ecartMoyen: 0, biais: 0 };
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    n,
    exactes: paires.filter((p) => p.predite === p.paul).length,
    aUnPres: paires.filter((p) => Math.abs(p.predite - p.paul) <= 1).length,
    ecartMoyen: r2(paires.reduce((s, p) => s + Math.abs(p.predite - p.paul), 0) / n),
    biais: r2(paires.reduce((s, p) => s + (p.predite - p.paul), 0) / n),
  };
}

export const MARQUEURS_CALIBRATION_TAGS = ['<!-- propositions-claude-tags -->', '<!-- /propositions-claude-tags -->'] as const;

const pct = (a: number, n: number) => `${Math.round((a / n) * 100)} %`;
const virgule = (x: number) => x.toFixed(2).replace('.', ',');

/** Section « Propositions de tags : note prédite vs note de Paul » (retours/CALIBRATION.md, recalculée à chaque export) */
export function markdownCalibrationTags(lot: LotPropositionsTags, notes: readonly NotePaul[], opts: { jour?: string | null } = {}): string {
  const paires = pairesPropositions(lot.propositions, notes);
  const avecNote = lot.propositions.filter((p) => p.notePredite != null).length;
  const l = ['## Propositions de tags de Claude : note prédite vs note de Paul', ''];
  l.push(`Fichier retours/propositions-claude-tags.json (profil ${lot.profil ?? '—'}, ${lot.le ?? '—'}) : ${lot.propositions.length} visuels tagués, ${avecNote} notes prédites (éléments jamais notés). Notes de Paul données le jour de la proposition ou après${opts.jour ? `, jusqu’au ${opts.jour}` : ''} : ${paires.length}.`, '');
  if (!paires.length) { l.push('Pas encore de note de Paul sur ces éléments : la mesure se fera au prochain export.'); return l.join('\n'); }
  const lignes: [string, PaireTags[]][] = [['Toutes', paires], ...CONFIANCES_CLAUDE.map((c) => [`Confiance ${c}`, paires.filter((p) => p.confiance === c)] as [string, PaireTags[]])];
  l.push('| Échantillon | Notes | Exactes | À ±1 | Écart moyen | Biais |', '|---|---:|---:|---:|---:|---:|');
  for (const [nom, ps] of lignes) {
    if (!ps.length) continue;
    const m = mesurerPaires(ps);
    l.push(`| ${nom} | ${m.n} | ${m.exactes} (${pct(m.exactes, m.n)}) | ${m.aUnPres} (${pct(m.aUnPres, m.n)}) | ${virgule(m.ecartMoyen)} | ${m.biais >= 0 ? '+' : ''}${virgule(m.biais)} |`);
  }
  const ecarts = paires.filter((p) => Math.abs(p.predite - p.paul) >= 2).slice(-8);
  if (ecarts.length) {
    l.push('', 'Plus gros écarts :', '');
    for (const p of ecarts) l.push(`- \`${p.cle}\` : prédit ${p.predite} ★, Paul ${p.paul} ★ (${p.jour}, confiance ${p.confiance})`);
  }
  return l.join('\n');
}

/** Remplace (ou ajoute en fin) la section entre les marqueurs, sans toucher au reste du fichier */
export function remplacerSectionCalibrationTags(ancien: string, section: string): string {
  const [debut, fin] = MARQUEURS_CALIBRATION_TAGS;
  const i = ancien.indexOf(debut), j = ancien.indexOf(fin);
  if (i >= 0 && j > i) return `${ancien.slice(0, i + debut.length)}\n${section}\n${ancien.slice(j)}`;
  return `${ancien.replace(/\s*$/, '')}\n\n${debut}\n${section}\n${fin}\n`;
}

/** Libellé d'un sujet (interface) */
export const libelleSujetTags = (id: string) => SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? id;
