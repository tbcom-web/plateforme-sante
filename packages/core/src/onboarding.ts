// Onboarding client (/commencer, demande de Paul du 2026-10-08) : fonctions pures du parcours « landing » qui prépare le
// site du praticien en quelques minutes : profession (registre onboarding-professions.ts et pratiques.ts, déduite du RPPS quand c'est possible),
// identité préremplie depuis l'Annuaire Santé (annuaire-sante.ts) et CONFIRMÉE par le praticien, sujets, activités
// sportives, couleurs, puis « Choisissez votre style » : 2 à 3 tours de « J'aime / Pas pour moi » sur de vrais rendus de SON
// site, qui convergent vers sa proposition. Rien n'est publié ; aucune donnée de l'annuaire n'est gardée sans confirmation.
//
// Préférences du CLIENT (choixClient) : enregistrées dans le brouillon de SON site (sites.config.choixClient), jamais dans
// le goût global de Paul (atelier, duels, notes) ; lues par /admin/choix-clients. Les sessions de test n'écrivent rien.
import { draftVide, type SiteDraft } from './draft';
import { normaliserPriorites, type Priorites } from './themes';
import { normaliserReponsesMetier, professionParcours, type ProfessionParcours, type ReponsesMetier } from './onboarding-professions';
import { questionActivites, normaliserActivites } from './profils';
import type { PratiqueProfession } from './pratiques';

// ---------------------------------------------------------------------------------------------------------------------
// Étapes et avancement (« Votre site est prêt à 80 % »)
// ---------------------------------------------------------------------------------------------------------------------

export type EtapeOnboarding = 'profession' | 'identite' | 'sujets' | 'activites' | 'couleurs' | 'style' | 'rendu';

/**
 * Étapes du parcours : l'étape « activités » n'existe que si un thème choisi s'y prête (pratique du métier, profils.ts :
 * questionActivites) ; aucun métier codé en dur.
 */
export function etapesOnboarding(pratique: PratiqueProfession | undefined, priorites: Priorites | null | undefined, themesActivites?: readonly string[]): EtapeOnboarding[] {
  const tous = [...(priorites?.principaux ?? []), ...(priorites?.secondaires ?? [])];
  // Seulement pour les thèmes qui s'y prêtent vraiment (ex. Sport : onboarding-professions.ts, themesActivites)
  const themes = themesActivites ? tous.filter((t) => themesActivites.includes(t)) : tous;
  const sport = Boolean(pratique && themes.length && questionActivites(pratique, themes));
  return ['profession', 'identite', 'sujets', ...(sport ? ['activites' as const] : []), 'couleurs', 'style', 'rendu'];
}

/** Thèmes proposés par la pratique d'un métier (actifs seulement, ordre des données) */
export const themesDuMetier = (pratique: PratiqueProfession | undefined) => (pratique?.themes ?? []).filter((t) => t.actif).map((t) => t.id);

/** Poids de chaque étape dans l'avancement affiché (somme 100 sans l'étape activités ; elle prend sur les sujets) */
const POIDS: Record<EtapeOnboarding, number> = { profession: 10, identite: 25, sujets: 15, activites: 5, couleurs: 10, style: 25, rendu: 15 };

/**
 * Avancement en pourcentage (arrondi à 5) : étapes faites / étapes du parcours, pondérées. Jamais 100 avant le rendu ;
 * jamais 0 une fois la profession choisie.
 */
export function avancementOnboarding(faites: readonly EtapeOnboarding[], etapes: readonly EtapeOnboarding[]): number {
  const total = etapes.reduce((s, e) => s + POIDS[e], 0);
  if (!total) return 0;
  const fait = etapes.filter((e) => faites.includes(e)).reduce((s, e) => s + POIDS[e], 0);
  const v = Math.round(((100 * fait) / total) / 5) * 5;
  return faites.includes('rendu') ? Math.min(100, v) : Math.min(95, v);
}

/** Phrase de l'avancement, sobre */
export const phraseAvancement = (pourcent: number) => (pourcent >= 100 ? 'Votre site est prêt' : `Votre site est prêt à ${pourcent} %`);

// ---------------------------------------------------------------------------------------------------------------------
// Identité confirmée → brouillon du site
// ---------------------------------------------------------------------------------------------------------------------

export type SourceIdentite = 'annuaire' | 'demonstration' | 'saisie';

/** Ce que le praticien a CONFIRMÉ ou saisi (jamais la fiche brute de l'annuaire) */
export type IdentiteConfirmee = {
  prenom: string;
  nom: string;
  nomCabinet: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  /** RPPS (11 chiffres) : seulement si le praticien l'a saisi ou confirmé */
  rpps: string;
  /** Diplôme d'État confirmé (intitulé du registre des professions) */
  diplomeEtat: boolean;
  /**
   * Diplômes universitaires CONFIRMÉS, seulement parmi ceux que la source donne réellement (diplomesSource) : l'Annuaire Santé
   * n'en publie pas pour les pédicures-podologues (docs/rpps-annuaire.md), la liste reste donc vide avec lui.
   */
  diplomesUniversitaires: string[];
  source: SourceIdentite;
};

export const identiteVide = (): IdentiteConfirmee => ({
  prenom: '', nom: '', nomCabinet: '', adresse: '', codePostal: '', ville: '', telephone: '', rpps: '', diplomeEtat: false, diplomesUniversitaires: [], source: 'saisie',
});

/** DU gardés : seulement ceux que la source a réellement fournis (jamais un DU inventé ou recopié d'ailleurs) */
export function diplomesConfirmes(choisis: readonly string[], diplomesSource: readonly string[]): string[] {
  const connus = new Set(diplomesSource.map((x) => x.trim()).filter(Boolean));
  return [...new Set(choisis.map((x) => x.trim()).filter((x) => connus.has(x)))].slice(0, 6);
}

export type ReponsesOnboarding = {
  profession: string;
  identite: IdentiteConfirmee;
  priorites: Priorites;
  activites: string[];
  /** undefined = étape pas vue, [] = « laissez-nous proposer » */
  couleurs: string[] | undefined;
};

const ligne = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * Brouillon du site à partir des réponses (identité confirmée, sujets, activités, couleurs). Le site garde les mêmes règles
 * que le parcours /creer (le serveur renettoie tout à l'enregistrement). Activités : celles de la pratique du métier permises par
 * les thèmes choisis (profils.ts). Le profil du site « sport » est posé si le thème n° 1 est « sport ».
 */
export function brouillonOnboarding(r: ReponsesOnboarding, p: ProfessionParcours, pratique: PratiqueProfession, base: SiteDraft = draftVide()): SiteDraft {
  const i = r.identite;
  const ville = ligne(i.ville, 80);
  const praticien = {
    ...base.praticiens[0],
    prenom: ligne(i.prenom, 60),
    nom: ligne(i.nom, 60),
    rpps: /^\d{11}$/.test(i.rpps.replace(/\s/g, '')) ? i.rpps.replace(/\s/g, '') : '',
    diplome: i.diplomeEtat && p.diplomeEtat ? p.diplomeEtat : '',
    formations: i.diplomesUniversitaires.map((x) => ligne(x, 160)).filter(Boolean).slice(0, 6),
    sports: normaliserActivites(pratique, r.activites, [...r.priorites.principaux, ...r.priorites.secondaires]),
  };
  const lieu = { ...base.lieux[0], adresse: ligne(i.adresse, 160), codePostal: ligne(i.codePostal, 10), ville };
  const priorites = normaliserPriorites(r.priorites);
  const d: SiteDraft = {
    ...base,
    profil: priorites.principaux[0] === 'sport' ? 'sport' : base.profil,
    cabinet: { ...base.cabinet, nom: ligne(i.nomCabinet, 120), ville, telephone: ligne(i.telephone, 25) },
    lieux: [lieu, ...base.lieux.slice(1)],
    praticiens: [praticien, ...base.praticiens.slice(1)],
    priorites,
    ...(r.couleurs !== undefined ? { couleursPreferees: r.couleurs.slice(0, 3) } : {}),
  };
  // Activités aussi au niveau du site (champ `activites` des profils de pratique : visuels de l'activité, ordre des soins)
  return praticien.sports.length ? { ...d, activites: praticien.sports } : d;
}

// ---------------------------------------------------------------------------------------------------------------------
// « Choisissez votre style » : tours de J'aime / Pas pour moi qui convergent
// ---------------------------------------------------------------------------------------------------------------------

/** Ce qu'il faut d'une proposition pour le jeu (propositions du générateur et recettes du studio) */
export type CandidatStyle = { id: string; univers: string; style: string; gamme: string; famille: string; police?: string | null };
export type Verdict = 'aime' | 'non';
export type AvisStyle = Record<string, Verdict>;

export const TOURS_STYLE_MAX = 3;
/** Cartes par tour : 4 au premier (téléphone : une grille 2 × 2 lisible), puis 4, puis 3 */
export const TAILLES_TOURS = [4, 4, 3] as const;

const ATTRIBUTS = ['univers', 'style', 'gamme', 'famille', 'police'] as const;
type Attribut = (typeof ATTRIBUTS)[number];
const valeur = (c: CandidatStyle, a: Attribut) => (a === 'police' ? c.police ?? '' : c[a]);
/** Importance de chaque attribut dans le goût (la structure et le style d'illustration se voient le plus) */
const IMPORTANCE: Record<Attribut, number> = { univers: 1.2, style: 1.2, gamme: 1, famille: 0.6, police: 0.4 };

/** Poids appris des avis : +1 par « J'aime », -1 par « Pas pour moi », pour chaque valeur d'attribut */
export function poidsDesAvis(pool: readonly CandidatStyle[], avis: AvisStyle): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of pool) {
    const v = avis[c.id];
    if (!v) continue;
    for (const a of ATTRIBUTS) {
      const x = valeur(c, a);
      if (!x) continue;
      const k = `${a}:${x}`;
      m.set(k, (m.get(k) ?? 0) + (v === 'aime' ? 1 : -1));
    }
  }
  return m;
}

export function scoreStyle(c: CandidatStyle, poids: Map<string, number>): number {
  return ATTRIBUTS.reduce((s, a) => s + IMPORTANCE[a] * (poids.get(`${a}:${valeur(c, a)}`) ?? 0), 0);
}

/** Nombre d'attributs différents entre deux propositions (variété d'une grille) */
const ecart = (a: CandidatStyle, b: CandidatStyle) => ATTRIBUTS.filter((k) => valeur(a, k) !== valeur(b, k)).length;

/**
 * Grille d'un tour (0, 1, 2) : au premier tour, les propositions les plus VARIÉES (ordre de pertinence d'entrée conservé
 * pour départager) ; ensuite, parmi celles pas encore montrées, les mieux notées par les avis (« garde ce qu'il aime »),
 * choisies pour différer entre elles sur le reste (« fait varier le reste »). Déterministe.
 */
export function grilleDuTour(pool: readonly CandidatStyle[], avis: AvisStyle, tour: number, dejaVus: ReadonlySet<string> = new Set()): CandidatStyle[] {
  const taille = TAILLES_TOURS[Math.min(tour, TAILLES_TOURS.length - 1)];
  const poids = poidsDesAvis(pool, avis);
  const restants = pool.filter((c) => !dejaVus.has(c.id) && !avis[c.id]);
  const rang = new Map(pool.map((c, i) => [c.id, i]));
  const ordre = tour === 0
    ? restants
    : [...restants].sort((a, b) => scoreStyle(b, poids) - scoreStyle(a, poids) || (rang.get(a.id)! - rang.get(b.id)!));
  const grille: CandidatStyle[] = [];
  for (const seuil of [3, 2, 1, 0]) {
    for (const c of ordre) {
      if (grille.length >= taille) break;
      if (grille.includes(c)) continue;
      // Après le premier tour, une proposition franchement rejetée (score très négatif) n'est montrée qu'en dernier recours
      if (tour > 0 && seuil > 0 && scoreStyle(c, poids) < -1.5) continue;
      if (grille.every((x) => ecart(x, c) >= seuil)) grille.push(c);
    }
    if (grille.length >= taille) break;
  }
  return grille;
}

/** Proposition retenue : la mieux notée parmi les « J'aime » ; sans « J'aime », la mieux notée de toutes (puis l'ordre d'entrée) */
export function propositionRetenue<T extends CandidatStyle>(pool: readonly T[], avis: AvisStyle): T | undefined {
  const poids = poidsDesAvis(pool, avis);
  const aimes = pool.filter((c) => avis[c.id] === 'aime');
  const liste = aimes.length ? aimes : pool.filter((c) => avis[c.id] !== 'non');
  return [...(liste.length ? liste : pool)].sort((a, b) => scoreStyle(b, poids) - scoreStyle(a, poids))[0];
}

/** Proposition suivante (« Autre proposition » sur le rendu) : la suivante dans l'ordre des scores, en boucle */
export function propositionSuivante<T extends CandidatStyle>(pool: readonly T[], avis: AvisStyle, actuelle: string | null): T | undefined {
  const poids = poidsDesAvis(pool, avis);
  const liste = pool.filter((c) => avis[c.id] !== 'non').sort((a, b) => scoreStyle(b, poids) - scoreStyle(a, poids));
  if (!liste.length) return pool[0];
  const i = liste.findIndex((c) => c.id === actuelle);
  return liste[(i + 1) % liste.length];
}

// ---------------------------------------------------------------------------------------------------------------------
// Préférences du client (sites.config.choixClient)
// ---------------------------------------------------------------------------------------------------------------------

export type ChoixClient = {
  version: 1;
  /** Date du choix (ISO) */
  le: string;
  profession: string;
  /** D'où vient l'identité (annuaire, saisie) ; jamais « demonstration » : les tests n'écrivent rien */
  source: 'annuaire' | 'saisie';
  /** Avis donnés, dans l'ordre, avec le tour */
  avis: { id: string; verdict: Verdict; tour: number }[];
  /** Proposition retenue (identifiant de propositions.ts ou recette~id) */
  retenue: string | null;
  activites: string[];
  couleurs: string[];
  /** Réponses aux questions propres au métier (onboarding-professions.ts : contrat PCO…) ; absentes sans questions */
  reponses?: ReponsesMetier;
};

const ID_PROPOSITION = /^[a-z0-9~_.:-]{1,140}$/i;

/** Lecture prudente (données venues du navigateur) : bornée, identifiants vérifiés, sinon undefined */
export function normaliserChoixClient(v: unknown): ChoixClient | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const le = typeof o.le === 'string' && !Number.isNaN(Date.parse(o.le)) ? new Date(o.le).toISOString() : null;
  if (!le) return undefined;
  const avis = (Array.isArray(o.avis) ? o.avis : [])
    .map((a) => (a && typeof a === 'object' ? a as Record<string, unknown> : {}))
    .filter((a) => typeof a.id === 'string' && ID_PROPOSITION.test(a.id) && (a.verdict === 'aime' || a.verdict === 'non'))
    .slice(0, 30)
    .map((a) => ({ id: a.id as string, verdict: a.verdict as Verdict, tour: Math.max(0, Math.min(TOURS_STYLE_MAX, Math.round(Number(a.tour) || 0))) }));
  const ids = (x: unknown, max: number) => (Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]{1,40}$/.test(s)))].slice(0, max) : []);
  return {
    version: 1,
    le,
    profession: typeof o.profession === 'string' && /^[a-z-]{2,40}$/.test(o.profession) ? o.profession : '',
    source: o.source === 'annuaire' ? 'annuaire' : 'saisie',
    avis,
    retenue: typeof o.retenue === 'string' && ID_PROPOSITION.test(o.retenue) ? o.retenue : null,
    activites: ids(o.activites, 3),
    couleurs: ids(o.couleurs, 3),
    ...reponsesLues(o),
  };
}

/** Réponses du métier relues d'après les questions de la profession enregistrée (inconnues ou vides : rien) */
function reponsesLues(o: Record<string, unknown>): { reponses?: ReponsesMetier } {
  const p = typeof o.profession === 'string' ? professionParcours(o.profession) : undefined;
  const r = normaliserReponsesMetier(p, o.reponses);
  return Object.keys(r).length ? { reponses: r } : {};
}

/** Synthèse pour l'admin : combien de fois chaque proposition a été aimée, rejetée, retenue (sites des clients) */
export function syntheseChoixClients(choix: readonly (ChoixClient | undefined)[]): { id: string; aime: number; non: number; retenue: number }[] {
  const m = new Map<string, { id: string; aime: number; non: number; retenue: number }>();
  const ligneDe = (id: string) => { let l = m.get(id); if (!l) { l = { id, aime: 0, non: 0, retenue: 0 }; m.set(id, l); } return l; };
  for (const c of choix) {
    if (!c) continue;
    for (const a of c.avis) ligneDe(a.id)[a.verdict] += 1;
    if (c.retenue) ligneDe(c.retenue).retenue += 1;
  }
  return [...m.values()].sort((a, b) => b.retenue - a.retenue || b.aime - a.aime || a.non - b.non || (a.id < b.id ? -1 : 1));
}

// ---------------------------------------------------------------------------------------------------------------------
// Numérotation UNIQUE de /essai jusqu'à la fin de /creer (retour des personas du 2026-10-09)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Le parcours complet tel que le praticien le voit : 6 étapes pour voir son site (/essai/votre-site), puis 4 pour le finir
 * (/creer : horaires, soins, textes, accès). Les activités sont un second écran de l'étape « Vos sujets » : le compteur ne
 * saute jamais. /creer ne redemande pas sujets, couleurs, site ni cabinet (déjà faits).
 */
export const PARCOURS_COMPLET = [
  'Votre profession', 'Vos informations', 'Vos sujets', 'Vos couleurs', 'Votre style', 'Votre site',
  'Vos horaires', 'Vos soins', 'Vos textes', 'Votre accès',
] as const;
export const TOTAL_PARCOURS = PARCOURS_COMPLET.length;
/** Étapes faites avant de voir son site */
export const ETAPES_AVANT_RENDU = 6;

const NUMERO_ONBOARDING: Record<EtapeOnboarding, number> = { profession: 1, identite: 2, sujets: 3, activites: 3, couleurs: 4, style: 5, rendu: 6 };
export const numeroOnboarding = (e: EtapeOnboarding) => NUMERO_ONBOARDING[e];

/** Étape de /creer (1 à 7, vérification) → numéro dans le parcours complet (sujets 3, couleurs 4, site 5, cabinet 2…) */
export function numeroCreer(etape: number, verification: boolean): number {
  if (verification) return 10;
  return ({ 1: 3, 2: 4, 3: 5, 4: 2, 5: 7, 6: 8, 7: 9 } as Record<number, number>)[etape] ?? 7;
}
/** Numéro du parcours complet → étape de /creer (null : étape de /essai/votre-site sans équivalent, ex. la profession) */
export function etapeCreerDuNumero(n: number): number | null {
  return ({ 2: 4, 3: 1, 4: 2, 5: 3, 6: 3, 7: 5, 8: 6, 9: 7 } as Record<number, number>)[n] ?? null;
}

/** Pourcentage du parcours complet (arrondi à 5) : étapes FAITES / total ; jamais 100 avant la fin */
export const pourcentageParcours = (faites: number) => Math.min(faites >= TOTAL_PARCOURS ? 100 : 95, Math.round(((100 * Math.max(0, faites)) / TOTAL_PARCOURS) / 5) * 5);

/** Le site vient du parcours client (choix enregistrés) : /creer reprend à « Vos horaires » et numérote sur 10 */
export const issuDuParcoursClient = (d: { choixClient?: unknown }) => Boolean(d.choixClient);

/** Noms propres et villes composés insécables À L'AFFICHAGE (trait d'union U+2011) ; le texte enregistré garde le vrai trait d'union */
export const insecable = (s: string) => s.replace(/(?<=[\p{L}\p{M}’'])-(?=[\p{L}\p{M}’'])/gu, '\u2011');

/** Brouillon pour un APERÇU : noms du praticien, du cabinet et villes insécables (jamais enregistré) */
export function apercuInsecable(d: SiteDraft): SiteDraft {
  return {
    ...d,
    cabinet: { ...d.cabinet, nom: insecable(d.cabinet.nom), ville: insecable(d.cabinet.ville) },
    lieux: d.lieux.map((l) => ({ ...l, ville: insecable(l.ville), nom: insecable(l.nom) })),
    praticiens: d.praticiens.map((x) => ({ ...x, prenom: insecable(x.prenom), nom: insecable(x.nom) })),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Description en clair d'une proposition (« Choisissez votre style ») : aucun nom interne (gamme, registre)
// ---------------------------------------------------------------------------------------------------------------------

export const LETTRES_PROPOSITIONS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

const TONS: Record<string, string> = { 'clair-pratique': 'Clair', 'simple-proche': 'Chaleureux', 'elegant-sobre': 'Sobre', 'technique-precis': 'Moderne' };
const VISUELS: Record<string, string> = { releve: 'schémas du pied', pedagogique: 'illustrations douces', ligne: 'dessins au trait', photos: 'photos' };

/**
 * « Sobre, bleu et beige, dessins au trait » : ton de la structure, deux couleurs nommées simplement (la plus proche des
 * couleurs que le praticien connaît, COULEURS_PREFEREES), style d'image en mots courants.
 */
export function descriptionClaire(p: { univers: string; style: string; gamme: string }, nommer: (hex: string) => string, couleurs: (gamme: string) => string[]): string {
  const noms = [...new Set(couleurs(p.gamme).map(nommer).filter(Boolean))].slice(0, 2);
  const c = noms.length === 2 ? `${noms[0]} et ${noms[1]}` : noms[0] ?? '';
  return [TONS[p.univers] ?? 'Sobre', c, VISUELS[p.style] ?? ''].filter(Boolean).join(', ');
}
