// « À VALIDER » : UN SEUL POINT D'ENTRÉE PAR SUJET (demande de Paul du 2026-10-10 : « il y a trop d'endroits pour noter les arrivages,
// il faut un point d'entrée pour valider la représentation graphique d'un sujet ; au niveau des notes, juste dire OK, possibilité de
// laisser un commentaire ; rendre l'expérience notation > création de modèles la plus ludique et addictive possible »).
// Documentation : docs/a-valider.md.
//
// SUJETS : les profils de pratique de référence de la profession (Sport · golf, Diabète, Enfant…, pratiques.ts), un sujet « commun »
// par thème dont tous les profils ont une activité (Sport (commun) : visuels de sport sans activité reconnue), « Commun à tous »
// (mises en page, polices, menus, animations sans sujet) et « Textes » (contenus des packs à valider).
// Chaque nouveauté rejoint UN sujet (sujetDeCle) : activité reconnue dans sa clé, ses étiquettes, son adresse (profils.ts,
// activitesReconnues : « un-golf-green » → Sport · golf) ; sinon thème (« diabete-bilan » → Diabète, ou thèmes par défaut de
// l'inventaire) ; sinon « Commun à tous ». Les éléments des kits d'un profil (kitDuProfil) appartiennent à ce profil.
//
// GESTES (une carte à la fois) et CORRESPONDANCE AVEC L'APPRENTISSAGE (poids inchangés, journal assets_notes) :
//   ✓ OK          → note 4      (commentaire → « ce qui va bien », colonne positif)
//   ❤ J'adore     → note 5      (commentaire → positif)
//   ✗ Pas OK      → note 2      (commentaire → « ce qui ne va pas », colonne negatif)
//   ✗ Pas OK une seconde fois sur le même élément (dernière note ≤ 2, ou « à retravailler ») → note 1 (« ne plus jamais montrer ») ;
//     1 n'est JAMAIS donné au premier « Pas OK » — sauf choix explicite « Ne plus jamais montrer ».
//   « Plus tard »  → aucune note (écran passé : exposition « ignore », délai de retour de la politique d'évaluation).
// Nouveautés en attente (Arrivages) : OK / J'adore les accepte (statut « accepte », entrent au frigo) et les rattachent au sujet
// (thème + hashtag de l'activité) ; Pas OK les met « à retravailler » (commentaire exporté à Claude), le second « Pas OK » les retire.
// Rien n'est « Validé » automatiquement : « Valider pour les sites » reste un geste explicite de Paul en fin de sujet.
//
// LUDIQUE (sobre) : objectif quotidien, série de jours, combo de décisions rapides, pari du juge (« Claude pensait que tu allais
// aimer »), sujet complet, et la récompense concrète : assez d'éléments OK → « Créer des modèles <sujet> » (présélection de la chaîne
// filtrée sur le profil). Module PUR, déterministe.

import { activitesReconnues, profilsDePratique, type ProfilPratique } from './profils';
import { pratiqueDe, PRATIQUES, type PratiqueProfession } from './pratiques';
import { fileEvaluation, groupeVisuel, ordonnerBoiteEntree, type ContextePolitique } from './politique-evaluation';

// ---------------------------------------------------------------------------------------------------------------
// Gestes → notes
// ---------------------------------------------------------------------------------------------------------------

export type GesteSujet = 'ok' | 'adore' | 'pas-ok' | 'plus-tard';
export const GESTES_SUJET: readonly GesteSujet[] = ['ok', 'adore', 'pas-ok', 'plus-tard'];
export const estGesteSujet = (x: unknown): x is GesteSujet => (GESTES_SUJET as readonly unknown[]).includes(x);

/** Notes du journal assets_notes données par les gestes (poids de l'apprentissage inchangés) */
export const NOTES_GESTES = { ok: 4, adore: 5, pasOk: 2, jamais: 1 } as const;

export type ContexteGeste = {
  /** Dernière note de l'élément (null : jamais noté) */
  derniereNote?: number | null;
  /** Statut de revue courant (illustrations_statuts) */
  statut?: string | null;
  /** Choix explicite « Ne plus jamais montrer » */
  jamais?: boolean;
};

/** Le dernier avis sur l'élément était-il déjà un « Pas OK » (≤ 2 ★, ou à retravailler) ? */
export const dejaPasOk = (c: ContexteGeste = {}) => (typeof c.derniereNote === 'number' && c.derniereNote <= 2) || c.statut === 'a_retravailler';

/** Note d'un geste : OK 4, J'adore 5, Pas OK 2 (1 au second « Pas OK » ou sur choix explicite), « Plus tard » : aucune */
export function noteDuGeste(geste: GesteSujet, c: ContexteGeste = {}): number | null {
  if (geste === 'ok') return NOTES_GESTES.ok;
  if (geste === 'adore') return NOTES_GESTES.adore;
  if (geste === 'pas-ok') return c.jamais || dejaPasOk(c) ? NOTES_GESTES.jamais : NOTES_GESTES.pasOk;
  return null;
}

/** Commentaire libre → colonnes existantes : « ce qui va bien » (OK, J'adore) ou « ce qui ne va pas » (Pas OK) */
export function remarquesDuGeste(geste: GesteSujet, texte: string | null | undefined): { positif: string | null; negatif: string | null } {
  const t = String(texte ?? '').trim().slice(0, 2000) || null;
  if (!t || geste === 'plus-tard') return { positif: null, negatif: null };
  return geste === 'pas-ok' ? { positif: null, negatif: t } : { positif: t, negatif: null };
}

/** Statut de revue d'une NOUVEAUTÉ en attente après le geste : accepte (OK, J'adore), à retravailler (Pas OK), retiré (note 1) */
export function statutNouveauteDuGeste(geste: GesteSujet, note: number | null): 'accepte' | 'a_retravailler' | 'retire' | null {
  if (geste === 'ok' || geste === 'adore') return 'accepte';
  if (geste === 'pas-ok') return note === NOTES_GESTES.jamais ? 'retire' : 'a_retravailler';
  return null;
}

/** Résultat d'exposition (politique d'évaluation) d'un geste */
export const expositionDuGeste = (geste: GesteSujet): 'note' | 'ignore' => (geste === 'plus-tard' ? 'ignore' : 'note');

/** Geste au clavier : → / O = OK, ← / N = Pas OK, ↑ / L (« love ») = J'adore, ↓ / P = Plus tard */
export function gesteSujetClavier(touche: string): GesteSujet | null {
  const t = touche.length === 1 ? touche.toLowerCase() : touche;
  if (t === 'ArrowRight' || t === 'o') return 'ok';
  if (t === 'ArrowLeft' || t === 'n') return 'pas-ok';
  if (t === 'ArrowUp' || t === 'l') return 'adore';
  if (t === 'ArrowDown' || t === 'p') return 'plus-tard';
  return null;
}

/** Geste au doigt : droite = OK, gauche = Pas OK, haut = J'adore (au-delà du seuil, axe dominant) */
export function gesteSujetGlisse(dx: number, dy: number, seuil = 80): GesteSujet | null {
  if (Math.abs(dx) >= seuil && Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'ok' : 'pas-ok';
  if (dy <= -seuil * 1.2 && Math.abs(dy) > Math.abs(dx) * 1.5) return 'adore';
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Sujets
// ---------------------------------------------------------------------------------------------------------------

export const SUJET_COMMUN = 'commun';
export const SUJET_TEXTES = 'textes';
const PREFIXE_THEME = 'theme-';

export type SujetValidation = {
  id: string;
  libelle: string;
  /** Profil de pratique de référence (présélection de la chaîne filtrée), null : sujet commun ou textes */
  profil: string | null;
  /** Thème principal (rattachement d'une nouveauté acceptée : assets_sujets) */
  theme: string | null;
  /** Hashtags de l'activité du profil (rattachement : assets_hashtags) */
  hashtags: string[];
  ordre: number;
};

/** Sujets de la profession : profils de référence (hors généraliste), thèmes « (commun) », Commun à tous, Textes */
export function sujetsValidation(profession?: string | null, registre: readonly PratiqueProfession[] = PRATIQUES): SujetValidation[] {
  const p = pratiqueDe(profession ?? null, registre);
  const profils = profilsDePratique(p.profession, registre).filter((x) => x.principal);
  const l: SujetValidation[] = profils.map((x, i) => ({
    id: x.id, libelle: x.court, profil: x.id, theme: x.principal, ordre: i,
    hashtags: x.activites.flatMap((a) => p.activites.find((y) => y.id === a)?.hashtags.slice(0, 1) ?? []),
  }));
  for (const t of p.themes) {
    const duTheme = profils.filter((x) => x.principal === t.id);
    if (duTheme.length && duTheme.every((x) => x.activites.length)) l.push({ id: `${PREFIXE_THEME}${t.id}`, libelle: `${t.court} (commun)`, profil: null, theme: t.id, hashtags: [], ordre: l.length });
  }
  l.push({ id: SUJET_COMMUN, libelle: 'Commun à tous', profil: null, theme: null, hashtags: [], ordre: l.length });
  l.push({ id: SUJET_TEXTES, libelle: 'Textes', profil: null, theme: null, hashtags: [], ordre: l.length + 1 });
  return l;
}

const jetons = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));

/**
 * Sujet d'un élément : activité reconnue (profil de référence de cette activité, sinon « <thème> (commun) »), puis thème nommé dans
 * la clé ou thèmes par défaut de l'inventaire (`themes`), puis « Commun à tous ». Contenus des packs (`contenu:`) : « Textes ».
 */
export function sujetDeCle(cle: string, o: { profession?: string | null; tags?: readonly string[]; url?: string | null; requete?: string | null; themes?: readonly string[]; registre?: readonly PratiqueProfession[] } = {}): string {
  if (cle.startsWith('contenu:')) return SUJET_TEXTES;
  const registre = o.registre ?? PRATIQUES;
  const p = pratiqueDe(o.profession ?? null, registre);
  const profils = profilsDePratique(p.profession, registre).filter((x) => x.principal);
  const activites = activitesReconnues({ cle, tags: o.tags, url: o.url, requete: o.requete }, p);
  for (const a of activites) {
    const prof = profils.find((x) => x.activites.includes(a));
    if (prof) return prof.id;
  }
  const versTheme = (t: string): string | null => {
    const duTheme = profils.filter((x) => x.principal === t);
    if (!duTheme.length) return null;
    return duTheme.find((x) => !x.activites.length)?.id ?? `${PREFIXE_THEME}${t}`;
  };
  if (activites.length) {
    const t = p.activites.find((x) => x.id === activites[0])?.themes[0];
    const s = t ? versTheme(t) : null;
    if (s) return s;
  }
  const j = jetons(`${cle} ${(o.tags ?? []).join(' ')}`);
  for (const t of p.themes) if (j.has(t.id)) { const s = versTheme(t.id); if (s) return s; }
  for (const t of o.themes ?? []) { const s = versTheme(t); if (s) return s; }
  return SUJET_COMMUN;
}

/** Profil de référence d'un sujet (null : commun, textes) */
export const profilDuSujet = (s: Pick<SujetValidation, 'profil'>, profession?: string | null): ProfilPratique | null =>
  (s.profil ? profilsDePratique(profession ?? null).find((x) => x.id === s.profil) ?? null : null);

// ---------------------------------------------------------------------------------------------------------------
// Progression et ordre des sujets
// ---------------------------------------------------------------------------------------------------------------

export type ResumeSujet = {
  id: string;
  /** Nouveautés en attente (arrivages) */
  nouveautes: number;
  /** Cartes encore à voir (nouveautés comprises) */
  aVoir: number;
  /** Éléments jugés OK (note ≥ 4) */
  ok: number;
  /** Éléments OK, pas encore validés pour les sites */
  aValiderPourSites: number;
  total: number;
  ordre: number;
};

/** Progression d'un sujet : part vue, sujet complet (plus rien à voir) */
export function progressionSujet(r: Pick<ResumeSujet, 'aVoir' | 'total' | 'ok'>): { vus: number; part: number; partOk: number; complet: boolean } {
  const vus = Math.max(0, r.total - r.aVoir);
  return { vus, part: r.total ? vus / r.total : 0, partOk: r.total ? Math.min(1, r.ok / r.total) : 0, complet: r.total > 0 && r.aVoir <= 0 };
}

/**
 * Sujets avec nouveautés d'abord — ceux d'un profil (golf, diabète…) avant « Commun à tous » et « Textes », puis les plus fournis —,
 * puis ceux qui ont encore des cartes à voir, puis l'ordre de la profession
 */
export function ordonnerSujets<T extends Pick<ResumeSujet, 'nouveautes' | 'aVoir' | 'ordre'> & { profil?: string | null }>(l: readonly T[]): T[] {
  const avec = (x: T) => Number(x.nouveautes > 0);
  return [...l].sort((a, b) => avec(b) - avec(a) || (avec(a) ? Number(Boolean(b.profil)) - Number(Boolean(a.profil)) : 0) || b.nouveautes - a.nouveautes || Number(b.aVoir > 0) - Number(a.aVoir > 0) || a.ordre - b.ordre);
}

/** Seuil de la récompense : éléments OK d'un sujet à partir duquel « Créer des modèles » s'ouvre */
export const SEUIL_MODELES = 6;

/** « Créer des modèles <sujet> » : profil de référence et assez d'éléments OK */
export const peutCreerModeles = (s: Pick<SujetValidation, 'profil'>, r: Pick<ResumeSujet, 'ok'>) => Boolean(s.profil) && r.ok >= SEUIL_MODELES;

/** Lien de la présélection de la chaîne filtrée sur le profil du sujet */
export const lienCreerModeles = (profil: string) => `/chaine/preselection?profil=${encodeURIComponent(profil)}`;

/** Lien du point d'entrée (un sujet, ou un lot de nouveautés : ouvre le sujet qui en contient le plus) */
export const lienSujet = (sujet: string) => `/admin/sujets/${encodeURIComponent(sujet)}`;
export const lienSujetsNouveautes = (lot: string) => `/admin/sujets?nouveautes=${encodeURIComponent(lot)}`;

/** Sujet qui contient le plus de clés d'un lot (à égalité : premier dans l'ordre des sujets), null si aucune */
export function sujetDuLot(cles: readonly string[], sujetDe: (cle: string) => string, ordre: readonly string[] = []): string | null {
  const n = new Map<string, number>();
  for (const k of cles) { const s = sujetDe(k); n.set(s, (n.get(s) ?? 0) + 1); }
  const rang = (s: string) => { const i = ordre.indexOf(s); return i < 0 ? ordre.length : i; };
  return [...n.entries()].sort((a, b) => b[1] - a[1] || rang(a[0]) - rang(b[0]))[0]?.[0] ?? null;
}

// ---------------------------------------------------------------------------------------------------------------
// File des cartes d'un sujet (politique d'évaluation : jamais notés d'abord, délai de retour, tranchés exclus)
// ---------------------------------------------------------------------------------------------------------------

export type CarteCandidate = {
  /** Identifiant de la carte (une clé peut avoir deux cartes : nouveauté puis élément du kit) */
  id: string;
  cle: string;
  /** Nouveauté en attente (arrivage) : toujours montrée en premier */
  nouveaute: boolean;
  note?: number | null;
  n?: number;
  tranche?: boolean;
  potentiel?: number | null;
  modifie?: boolean;
};

/**
 * Cartes à montrer, dans l'ordre : nouveautés en attente (boîte d'entrée : fort potentiel d'abord, jamais deux variantes d'un même
 * visuel à la suite), puis éléments du sujet selon la politique d'évaluation (modifiés, jamais notés, départages ; tranchés, exclus,
 * vus sans être choisis : jamais), les éléments en délai de retour à la fin. Jamais deux cartes de la même clé, jamais une clé
 * déjà décidée dans la séance.
 */
export function fileCartes<T extends CarteCandidate>(cartes: readonly T[], o: { ctx?: ContextePolitique; decidees?: ReadonlySet<string> } = {}): T[] {
  const vues = new Set<string>(o.decidees ?? []);
  const uniques: T[] = [];
  for (const c of cartes) { if (vues.has(c.cle)) continue; vues.add(c.cle); uniques.push(c); }
  const nouv = ordonnerBoiteEntree(uniques.filter((c) => c.nouveaute), { potentiel: (k) => uniques.find((c) => c.cle === k)?.potentiel ?? null, regles: o.ctx?.regles });
  const f = fileEvaluation(uniques.filter((c) => !c.nouveaute), o.ctx ?? {});
  return [...nouv, ...f.file.map((e) => e.x), ...f.enDelai.map((e) => e.x)];
}

/** Une carte est-elle « à voir » (compte dans la progression) : nouveauté, ou élément jamais noté ou entre 2 et 4 ★ non tranché */
export const carteAVoir = (c: Pick<CarteCandidate, 'nouveaute' | 'note' | 'tranche'>) => c.nouveaute || (!c.tranche && (c.note === null || c.note === undefined || (c.note > 2 && c.note < 4)));

/** Deux cartes consécutives d'un même groupe visuel (contrôle des tests) */
export const memeGroupe = (a: string, b: string) => groupeVisuel(a) === groupeVisuel(b);

// ---------------------------------------------------------------------------------------------------------------
// Ludique : objectif du jour, série, combo, pari du juge
// ---------------------------------------------------------------------------------------------------------------

export const OBJECTIF_QUOTIDIEN = 20;
/** Fenêtre d'un combo : décisions espacées de moins de 4 s */
export const FENETRE_COMBO_MS = 4000;

const jourAvant = (j: string, n: number) => { const d = new Date(`${j}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

/** Série : jours consécutifs avec au moins une décision, jusqu'à aujourd'hui (ou hier si rien encore aujourd'hui) */
export function serieDeJours(jours: Readonly<Record<string, number>>, aujourdhui: string): number {
  let i = (jours[aujourdhui] ?? 0) > 0 ? 0 : 1;
  let n = 0;
  while ((jours[jourAvant(aujourdhui, i)] ?? 0) > 0) { n++; i++; }
  return n;
}

/** Combo : décisions de la fin de la liste espacées de moins de `fenetre` ms (1 = décision isolée, 0 = aucune) */
export function comboDecisions(instants: readonly number[], fenetre = FENETRE_COMBO_MS): number {
  if (!instants.length) return 0;
  let n = 1;
  for (let i = instants.length - 1; i > 0; i--) { if (instants[i] - instants[i - 1] < fenetre && instants[i] >= instants[i - 1]) n++; else break; }
  return n;
}

/** Pari du juge : Claude pensait-il que tu allais aimer ? juste / raté (null : pas de prédiction, ou prédiction à 3 ★, ou « Plus tard ») */
export function verdictPari(predite: number | null | undefined, geste: GesteSujet): 'juste' | 'rate' | null {
  if (typeof predite !== 'number' || geste === 'plus-tard' || predite === 3) return null;
  const aime = geste !== 'pas-ok';
  return (predite >= 4) === aime ? 'juste' : 'rate';
}

/** Texte du pari affiché APRÈS la décision (jamais avant : Claude ne doit pas influencer) */
export function textePari(predite: number, verdict: 'juste' | 'rate'): string {
  const pense = predite >= 4 ? 'Claude pensait que tu allais aimer' : 'Claude pensait que ça ne te plairait pas';
  return `${pense} : ${verdict === 'juste' ? 'vu juste' : 'raté'}.`;
}
