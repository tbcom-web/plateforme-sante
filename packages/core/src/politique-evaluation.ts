// POLITIQUE D'ÉVALUATION UNIQUE (demande de Paul du 2026-10-09 : « J'aime les méthodes pour noter / A-B tester, mais je veux le plus
// possible éviter les RÉPÉTITIONS d'éléments : quand quelque chose est mauvais, qu'il réapparaisse le moins possible ; que les
// MEILLEURS éléments et ceux JAMAIS NOTÉS apparaissent en premier à noter »). Documentation : docs/politique-evaluation.md.
//
// Une seule politique pour TOUTES les surfaces de notation (Arrivages, tuiles « Donner mon avis », Nouveautés, tri, duels, recettes
// complètes, Dégustation, présélection et tournoi de la chaîne, kits, Atelier) :
//
// 1. MÉMOIRE COMMUNE DES EXPOSITIONS : un élément (ou une combinaison exacte) montré à Paul, où, quand, avec quel résultat (choisi,
//    pas choisi, « celle qui ne va pas », noté, ignoré, accepté, refusé). Reconstituée à partir des journaux existants (notes, duels,
//    grilles de la Dégustation et de la présélection, tournoi, recettes, kits : expositionsDepuisJournaux) et du journal `expositions`
//    (migration 0054 : écrans passés sans réponse, décisions des Arrivages et leurs raisons) ; sans la table, mémoire du navigateur.
//    Une exposition dans une surface compte PARTOUT.
// 2. DÉLAI DE RETOUR : un élément déjà montré (ou un élément de son GROUPE VISUEL : même illustration de base, même série de photos,
//    variantes) ne revient pas avant `delaiEcrans` écrans ni avant `delaiJours` jours, sauf pour départager un classement serré
//    (departageSerre) ou quand plus rien d'autre n'est disponible (retour forcé, le plus ancien d'abord, signalé).
// 3. SIGNAL NÉGATIF IMPLICITE : montré `kImplicite` fois sans jamais être choisi / gardé / noté ≥ 3 ★, ou sorti en « celle qui ne va
//    pas » : traité comme ≤ 2 ★ (exclu des files, rétrogradé de `effetImplicite` dans la génération), réversible par « Réévaluer ».
//    Idem pour une combinaison exacte.
// 4. PRIORITÉ DE LA FILE : 0 modifié depuis sa note, 1 jamais noté à FORT POTENTIEL (note prédite ≥ 4, base ou ingrédients 4-5 ★,
//    nouveauté acceptée), 2 jamais notés restants, 3 départage des BONS éléments incertains (≥ 3 ★, une seule note ou avis partagés) ;
//    jamais les tranchés (1 ★ / 5 ★), jamais les exclus, jamais un « vu sans être choisi », jamais deux éléments du même groupe
//    visuel sur un écran.
// 5. INDICATEURS : taux de répétition (part des écrans qui montrent un élément déjà vu dans les `fenetreRepetition` derniers écrans,
//    objectif < 5 %), qualité moyenne présentée, part de jamais-notés, tendance sur 30 jours.
// Module PUR, déterministe, sans dépendance réseau (règles apprises : regles-apprises.ts ; preuve : politique-evaluation-simulation.ts).

import { baseDeCle } from './bases-illustrations';
import { avecReevaluations, type Reevaluation, type Tranches } from './tranches';

// ---------------------------------------------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------------------------------------------

export const POLITIQUE_EVALUATION = {
  /** Délai de retour : écrans (toutes surfaces) avant qu'un élément ou son groupe visuel ne revienne */
  delaiEcrans: 50,
  /** … et jours */
  delaiJours: 2,
  /** Signal négatif implicite : expositions « à choisir » sans jamais être choisi */
  kImplicite: 3,
  /** « Celle qui ne va pas » : nombre de fois qui suffit (sans jamais être choisi) */
  pireImplicite: 1,
  /** Effet (étoiles) d'un élément implicite négatif dans la génération : rétrogradé, pas interdit */
  effetImplicite: -0.75,
  /** Potentiel (note prédite, étoiles) d'un jamais-noté prioritaire */
  seuilPotentiel: 4,
  /** Note moyenne minimale d'un élément noté pour revenir en départage ; incertitude (écart des notes) qui le justifie */
  departageNoteMin: 3,
  departageEcartMin: 2,
  /** Écart de force (étoiles ou θ) sous lequel un duel de départage peut ignorer le délai */
  ecartDepartage: 0.25,
  /** Fenêtre du taux de répétition, objectif */
  fenetreRepetition: 50,
  objectifRepetition: 0.05,
  /** Purge documentée du journal des expositions */
  purgeJours: 180,
} as const;
export type ReglagesPolitique = { -readonly [K in keyof typeof POLITIQUE_EVALUATION]: number };
const reglages = (r?: Partial<ReglagesPolitique> | null): ReglagesPolitique => ({ ...POLITIQUE_EVALUATION, ...(r ?? {}) });

export const SURFACES_EVALUATION = [
  { id: 'tuiles', libelle: 'Donner mon avis' },
  { id: 'nouveautes', libelle: 'Nouveautés à noter' },
  { id: 'arrivages', libelle: 'Arrivages' },
  { id: 'tri', libelle: 'Tri' },
  { id: 'duels', libelle: 'Duels' },
  { id: 'recettes', libelle: 'Recettes complètes' },
  { id: 'degustation', libelle: 'Dégustation' },
  { id: 'preselection', libelle: 'Présélection de la chaîne' },
  { id: 'tournoi', libelle: 'Tournoi de la chaîne' },
  { id: 'kits', libelle: 'Kits d’images' },
  { id: 'atelier', libelle: 'Atelier' },
] as const;
export type SurfaceEvaluation = (typeof SURFACES_EVALUATION)[number]['id'];
export const estSurfaceEvaluation = (x: unknown): x is SurfaceEvaluation => SURFACES_EVALUATION.some((s) => s.id === x);

/**
 * Résultat d'une exposition : `choisi` (préférée d'une grille, gagnant d'un duel, « J'aime »), `pas-choisi`, `pire` (« celle qui ne va
 * pas », « les deux sont mauvais »), `note` (note d'étoiles, égalité d'un duel), `ignore` (écran passé sans réponse), `accepte`,
 * `refuse` (Arrivages, « Pas pour ici »).
 */
export const RESULTATS_EXPOSITION = ['choisi', 'pas-choisi', 'pire', 'note', 'ignore', 'accepte', 'refuse'] as const;
export type ResultatExposition = (typeof RESULTATS_EXPOSITION)[number];
export const estResultatExposition = (x: unknown): x is ResultatExposition => (RESULTATS_EXPOSITION as readonly unknown[]).includes(x);

export type Exposition = {
  cle: string;
  surface: SurfaceEvaluation;
  /** Identifiant de l'écran (plusieurs éléments montrés ensemble partagent l'écran) */
  ecran: string;
  /** Date ISO */
  le: string;
  resultat: ResultatExposition;
  /** Note d'étoiles (résultat `note`) */
  note?: number | null;
  /** Étiquettes (Pour / Contre, raisons de refus, « celle qui ne va pas ») et commentaire : lus par regles-apprises.ts */
  etiquettes?: readonly string[] | null;
  texte?: string | null;
};

const CLE_VALIDE = /^[a-z][a-z0-9-]*:[^\s]{1,200}$/;
const ECRAN_VALIDE = /^[a-z0-9][a-z0-9:._|@-]{0,159}$/;

/** Ligne reçue du navigateur ou lue en base → exposition valide, ou null */
export function lireExposition(l: Record<string, unknown> | null | undefined): Exposition | null {
  if (!l) return null;
  const cle = String(l.cle ?? '');
  const surface = l.surface;
  const resultat = l.resultat;
  const ecran = String(l.ecran ?? '');
  const le = String(l.le ?? l.created_at ?? '');
  if (!CLE_VALIDE.test(cle) || !estSurfaceEvaluation(surface) || !estResultatExposition(resultat) || !ECRAN_VALIDE.test(ecran) || !/^\d{4}-\d{2}-\d{2}/.test(le)) return null;
  const note = Number.isInteger(l.note) && (l.note as number) >= 1 && (l.note as number) <= 5 ? (l.note as number) : null;
  const etiquettes = Array.isArray(l.etiquettes) ? (l.etiquettes as unknown[]).filter((x): x is string => typeof x === 'string' && /^[a-z0-9-]{1,40}$/.test(x)).slice(0, 12) : [];
  const texte = typeof l.texte === 'string' && l.texte.trim() ? l.texte.trim().slice(0, 500) : null;
  return { cle, surface, ecran, le, resultat, ...(note !== null ? { note } : {}), ...(etiquettes.length ? { etiquettes } : {}), ...(texte ? { texte } : {}) };
}

/** Identifiant d'écran côté navigateur : `<surface>:<horodatage base 36>:<aléa>` */
export const nouvelEcran = (surface: SurfaceEvaluation, maintenant = Date.now(), r: () => number = Math.random) => `${surface}:${maintenant.toString(36)}:${Math.floor(r() * 1e9).toString(36)}`;

// ---------------------------------------------------------------------------------------------------------------
// Groupes visuels (déduplication entre surfaces)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Groupe visuel d'une clé : deux éléments du même groupe sont « le même visuel » pour Paul (on n'en montre qu'un à la fois, et le
 * délai de retour vaut pour tout le groupe). Illustration de base (variantes de registre, de style, de contraste, trait continu,
 * héros : bases-illustrations.ts), série de photos (même nom au numéro ou à la taille près), variantes « @… » (directions d'icônes,
 * rendus), images posées sur un fond (`…&surface:…`). Le reste : la clé elle-même.
 */
export function groupeVisuel(cle: string): string {
  if (!cle) return cle;
  const sansSuffixe = cle.split('&')[0].replace(/@[a-z0-9=._-]+$/, '');
  const base = baseDeCle(sansSuffixe);
  if (base) return base;
  if (sansSuffixe.startsWith('photo:')) {
    const k = sansSuffixe.replace(/\?.*$/, '');
    const nom = k.split('/').pop() ?? k;
    return `${k.slice(0, k.length - nom.length)}${nom.replace(/\.(webp|jpe?g|png|avif)$/, '').replace(/-(\d{2,4}w?)$/, '').replace(/(-\d+)+$/, '')}`;
  }
  return sansSuffixe;
}

// ---------------------------------------------------------------------------------------------------------------
// Expositions reconstituées depuis les journaux existants
// ---------------------------------------------------------------------------------------------------------------

type CoteDuel = { element?: string | null } | null | undefined;
export type JournauxEvaluation = {
  /** Notes des tuiles (assets_notes) */
  notesAssets?: readonly { cle: string; note: number; le?: string | null; etiquettes?: readonly string[] | null; texte?: string | null }[];
  /** Notes de l'atelier (clé de combinaison) */
  notesAtelier?: readonly { cle: string; note: number; le?: string | null; etiquettes?: readonly string[] | null; texte?: string | null }[];
  /** Recettes complètes notées (clé compo:…) */
  recettes?: readonly { cle?: string | null; note: number | null; garder?: boolean; le?: string | null; contre?: readonly string[]; texte?: string | null }[];
  /** Duels A/B */
  duels?: readonly { aCle: string; bCle: string; aIngredients?: CoteDuel; bIngredients?: CoteDuel; resultat: string; le?: string | null; etiquettes?: readonly string[] | null; remarque?: string | null }[];
  /** Grilles de la Dégustation et de la présélection (degustation_choix) */
  grilles?: readonly { format: string; dimension: string; session?: string | null; propositions: readonly { cle: string; ingredients?: CoteDuel }[]; meilleures: readonly number[]; pire: number | null; le?: string | null }[];
  /** Grilles répondues du tournoi de la chaîne (identifiants de fiches) */
  tournoi?: readonly { propositions: readonly string[]; meilleures: readonly number[]; pire: number | null; le?: string | null }[];
  /** Kits d'images notés (photos montrées) */
  kits?: readonly { sujet: string; note: number | null; garder?: boolean; photos: readonly { url: string; cle?: string | null }[]; le?: string | null }[];
};

/** Clé d'une fiche de la chaîne des modèles (tournoi) */
export const cleModeleChaine = (id: string) => `modele-chaine:${id}`;
const jour0 = '1970-01-01T00:00:00.000Z';
const hache = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

/**
 * Expositions reconstituées : chaque décision déjà journalisée est une exposition (une note : `note` ; un duel : gagnant `choisi`,
 * perdant `pas-choisi`, égalité `note`, « les deux sont mauvais » `pire` ; une grille : préférées `choisi`, « celle qui ne va pas »
 * `pire`, les autres `pas-choisi`). Élément jugé = l'élément classé du côté (ingredients.element), plus la combinaison exacte (clé du
 * côté) quand elle diffère. Grilles sans session et au format « directions » : présélection de la chaîne.
 */
export function expositionsDepuisJournaux(j: JournauxEvaluation): Exposition[] {
  const r: Exposition[] = [];
  const pousser = (cles: readonly (string | null | undefined)[], e: Omit<Exposition, 'cle'>) => {
    for (const k of new Set(cles.filter((x): x is string => Boolean(x) && CLE_VALIDE.test(x!)))) r.push({ cle: k, ...e });
  };
  for (const n of j.notesAssets ?? []) pousser([n.cle], { surface: 'tuiles', ecran: `note:${hache(`${n.cle}|${n.le ?? ''}`)}`, le: n.le ?? jour0, resultat: 'note', note: n.note, etiquettes: n.etiquettes ?? null, texte: n.texte ?? null });
  for (const n of j.notesAtelier ?? []) pousser([n.cle], { surface: 'atelier', ecran: `atelier:${hache(`${n.cle}|${n.le ?? ''}`)}`, le: n.le ?? jour0, resultat: 'note', note: n.note, etiquettes: n.etiquettes ?? null, texte: n.texte ?? null });
  for (const n of j.recettes ?? []) {
    if (!n.cle) continue;
    const note = n.note ?? (n.garder ? 5 : null);
    pousser([n.cle], { surface: 'recettes', ecran: `recette:${hache(`${n.cle}|${n.le ?? ''}`)}`, le: n.le ?? jour0, resultat: note !== null ? 'note' : 'ignore', note, etiquettes: n.contre ?? null, texte: n.texte ?? null });
  }
  for (const d of j.duels ?? []) {
    const ecran = `duel:${hache(`${d.aCle}|${d.bCle}|${d.le ?? ''}`)}`;
    const le = d.le ?? jour0;
    const res = (c: 'a' | 'b'): ResultatExposition => (d.resultat === 'mauvais' ? 'pire' : d.resultat === 'egalite' ? 'note' : d.resultat === c ? 'choisi' : 'pas-choisi');
    const etq = d.etiquettes?.length ? d.etiquettes : null;
    pousser([d.aIngredients?.element, d.aCle], { surface: 'duels', ecran, le, resultat: res('a'), etiquettes: etq, texte: d.remarque ?? null });
    pousser([d.bIngredients?.element, d.bCle], { surface: 'duels', ecran, le, resultat: res('b'), etiquettes: etq, texte: d.remarque ?? null });
  }
  for (const g of j.grilles ?? []) {
    const surface: SurfaceEvaluation = !g.session && g.format === 'directions' ? 'preselection' : 'degustation';
    const ecran = `grille:${hache(`${g.propositions.map((p) => p.cle).join('|')}|${g.le ?? ''}`)}`;
    g.propositions.forEach((p, i) => {
      const resultat: ResultatExposition = g.meilleures.includes(i) ? 'choisi' : g.pire === i ? 'pire' : 'pas-choisi';
      pousser([p.ingredients?.element, p.cle], { surface, ecran, le: g.le ?? jour0, resultat, ...(resultat === 'pire' ? { etiquettes: ['celle-qui-ne-va-pas'] } : {}) });
    });
  }
  for (const g of j.tournoi ?? []) {
    const ecran = `tournoi:${hache(`${g.propositions.join('|')}|${g.le ?? ''}`)}`;
    g.propositions.forEach((id, i) => pousser([cleModeleChaine(id)], { surface: 'tournoi', ecran, le: g.le ?? jour0, resultat: g.meilleures.includes(i) ? 'choisi' : g.pire === i ? 'pire' : 'pas-choisi' }));
  }
  for (const k of j.kits ?? []) {
    const ecran = `kit:${hache(`${k.sujet}|${k.le ?? ''}`)}`;
    const note = k.note ?? (k.garder ? 5 : null);
    pousser(k.photos.map((p) => p.cle ?? null), { surface: 'kits', ecran, le: k.le ?? jour0, resultat: note !== null ? 'note' : 'ignore', note });
  }
  return r;
}

const RANG_RESULTAT: Record<ResultatExposition, number> = { ignore: 0, note: 1, 'pas-choisi': 1, choisi: 2, pire: 2, accepte: 2, refuse: 2 };

/**
 * Fusion des sources (journaux reconstitués, table `expositions`, mémoire du navigateur) : une exposition par (surface, écran, clé),
 * la plus informative (un écran journalisé « ignoré » puis décidé ailleurs garde la décision) ; triées par date.
 */
export function fusionnerExpositions(...sources: readonly (readonly Exposition[])[]): Exposition[] {
  const m = new Map<string, Exposition>();
  for (const l of sources) for (const e of l) {
    const k = `${e.surface}|${e.ecran}|${e.cle}`;
    const p = m.get(k);
    if (!p || RANG_RESULTAT[e.resultat] > RANG_RESULTAT[p.resultat] || (RANG_RESULTAT[e.resultat] === RANG_RESULTAT[p.resultat] && (e.etiquettes?.length ?? 0) > (p.etiquettes?.length ?? 0))) m.set(k, e);
  }
  return [...m.values()].sort((a, b) => (a.le < b.le ? -1 : a.le > b.le ? 1 : a.ecran < b.ecran ? -1 : a.ecran > b.ecran ? 1 : a.cle < b.cle ? -1 : 1));
}

/** Purge documentée : expositions de plus de `jours` jours retirées (même règle que la fonction SQL purger_expositions, 0054) */
export function purgerExpositions(l: readonly Exposition[], maintenant: string, jours: number = POLITIQUE_EVALUATION.purgeJours): Exposition[] {
  const limite = new Date(new Date(maintenant).getTime() - jours * 86400000).toISOString();
  return l.filter((e) => e.le >= limite);
}

// ---------------------------------------------------------------------------------------------------------------
// Mémoire
// ---------------------------------------------------------------------------------------------------------------

export type StatExposition = {
  n: number;
  /** Choisi, accepté, noté ≥ 3 ★ */
  positifs: number;
  /** Pas choisi, ignoré, noté ≤ 2 ★ */
  nonChoisis: number;
  pires: number;
  refus: number;
  noteMax: number | null;
  dernierRang: number;
  dernierLe: string;
};
export type EcranMemoire = { id: string; le: string; surface: SurfaceEvaluation; cles: string[]; groupes: string[] };
export type MemoireExpositions = { ecrans: EcranMemoire[]; parCle: Map<string, StatExposition>; parGroupe: Map<string, { dernierRang: number; dernierLe: string; n: number }> };

/** Mémoire : écrans dans l'ordre chronologique et statistiques par clé et par groupe ; « Réévaluer » efface ce qui précède */
export function memoireExpositions(expos: readonly Exposition[], reev: readonly Reevaluation[] = []): MemoireExpositions {
  const l = fusionnerExpositions(avecReevaluations(expos, reev));
  const parEcran = new Map<string, EcranMemoire>();
  for (const e of l) {
    const k = `${e.surface}|${e.ecran}`;
    const x = parEcran.get(k) ?? { id: e.ecran, le: e.le, surface: e.surface, cles: [], groupes: [] };
    if (e.le < x.le) x.le = e.le;
    if (!x.cles.includes(e.cle)) x.cles.push(e.cle);
    const g = groupeVisuel(e.cle);
    if (!x.groupes.includes(g)) x.groupes.push(g);
    parEcran.set(k, x);
  }
  const ecrans = [...parEcran.values()].sort((a, b) => (a.le < b.le ? -1 : a.le > b.le ? 1 : a.id < b.id ? -1 : 1));
  const rangEcran = new Map(ecrans.map((x, i) => [`${x.surface}|${x.id}`, i]));
  const parCle = new Map<string, StatExposition>();
  const parGroupe = new Map<string, { dernierRang: number; dernierLe: string; n: number }>();
  for (const e of l) {
    const rang = rangEcran.get(`${e.surface}|${e.ecran}`) ?? 0;
    const s = parCle.get(e.cle) ?? { n: 0, positifs: 0, nonChoisis: 0, pires: 0, refus: 0, noteMax: null, dernierRang: -1, dernierLe: '' };
    s.n++;
    const note = e.resultat === 'note' && typeof e.note === 'number' ? e.note : null;
    if (e.resultat === 'choisi' || e.resultat === 'accepte' || (note !== null && note >= 3)) s.positifs++;
    if (e.resultat === 'pas-choisi' || e.resultat === 'ignore' || (note !== null && note <= 2)) s.nonChoisis++;
    if (e.resultat === 'pire') { s.pires++; s.nonChoisis++; }
    if (e.resultat === 'refuse') s.refus++;
    if (note !== null) s.noteMax = Math.max(s.noteMax ?? 0, note);
    if (rang >= s.dernierRang) { s.dernierRang = rang; s.dernierLe = e.le; }
    parCle.set(e.cle, s);
    const g = groupeVisuel(e.cle);
    const sg = parGroupe.get(g) ?? { dernierRang: -1, dernierLe: '', n: 0 };
    sg.n++;
    if (rang >= sg.dernierRang) { sg.dernierRang = rang; sg.dernierLe = e.le; }
    parGroupe.set(g, sg);
  }
  return { ecrans, parCle, parGroupe };
}

export const MEMOIRE_VIDE: MemoireExpositions = { ecrans: [], parCle: new Map(), parGroupe: new Map() };

/**
 * Délai de retour : l'élément (ou un élément de son groupe visuel) a été montré dans les `delaiEcrans` derniers écrans (toutes
 * surfaces) ou depuis moins de `delaiJours` jours.
 */
export function enDelai(cle: string, m: MemoireExpositions | null | undefined, o: { maintenant?: string; reglages?: Partial<ReglagesPolitique> | null } = {}): boolean {
  if (!m) return false;
  const g = m.parGroupe.get(groupeVisuel(cle));
  if (!g) return false;
  const r = reglages(o.reglages);
  if (m.ecrans.length - 1 - g.dernierRang < r.delaiEcrans) return true;
  if (o.maintenant && g.dernierLe && new Date(o.maintenant).getTime() - new Date(g.dernierLe).getTime() < r.delaiJours * 86400000) return true;
  return false;
}

/** Écrans écoulés depuis la dernière exposition du groupe (Infinity : jamais montré) */
export function ecransDepuis(cle: string, m: MemoireExpositions | null | undefined): number {
  const g = m?.parGroupe.get(groupeVisuel(cle));
  return g && m ? m.ecrans.length - 1 - g.dernierRang : Infinity;
}

/** Exception au délai : départage d'un classement serré (écart de force sous le seuil) */
export const departageSerre = (forceA: number, forceB: number, seuil: number = POLITIQUE_EVALUATION.ecartDepartage) => Math.abs(forceA - forceB) < seuil;

// ---------------------------------------------------------------------------------------------------------------
// Signal négatif implicite
// ---------------------------------------------------------------------------------------------------------------

export type ImpliciteNegatif = { cle: string; raison: 'jamais-choisi' | 'pire'; expositions: number; pires: number; dernier: string };

/**
 * Éléments (et combinaisons exactes) vus sans jamais être choisis : au moins `kImplicite` expositions non choisies (pas choisi,
 * ignoré, « celle qui ne va pas ») ou `pireImplicite` fois « celle qui ne va pas », et AUCUN signal positif (choisi, accepté, noté
 * ≥ 3 ★). Les refus explicites (Arrivages) et les notes ≤ 2 ★ relèvent déjà des tranches et des exclusions.
 */
export function implicitesNegatifs(m: MemoireExpositions, o: { reglages?: Partial<ReglagesPolitique> | null } = {}): ImpliciteNegatif[] {
  const r = reglages(o.reglages);
  const l: ImpliciteNegatif[] = [];
  for (const [cle, s] of m.parCle) {
    if (s.positifs > 0 || (s.noteMax !== null && s.noteMax >= 3)) continue;
    if (s.pires >= r.pireImplicite) l.push({ cle, raison: 'pire', expositions: s.n, pires: s.pires, dernier: s.dernierLe });
    else if (s.nonChoisis >= r.kImplicite) l.push({ cle, raison: 'jamais-choisi', expositions: s.n, pires: s.pires, dernier: s.dernierLe });
  }
  return l.sort((a, b) => (a.dernier < b.dernier ? 1 : a.dernier > b.dernier ? -1 : a.cle < b.cle ? -1 : 1));
}

/** Tranches des implicites : refusés pour les files d'évaluation (tranches.ts : fusionnerTranches) */
export const tranchesImplicites = (l: readonly Pick<ImpliciteNegatif, 'cle'>[]): Tranches => ({ refuses: new Set(l.map((x) => x.cle)), favoris: new Set(), notes: new Set() });

/** Renforts de génération : chaque implicite rétrogradé de `effetImplicite` (assets ; cumul plafonné par fusionnerRenforts) */
export function renfortsImplicites(l: readonly Pick<ImpliciteNegatif, 'cle'>[], effet: number = POLITIQUE_EVALUATION.effetImplicite): Record<string, number> {
  return Object.fromEntries(l.filter((x) => !x.cle.startsWith('modele-chaine:')).map((x) => [x.cle, effet]));
}

// ---------------------------------------------------------------------------------------------------------------
// File d'évaluation
// ---------------------------------------------------------------------------------------------------------------

export type CandidatPolitique = {
  cle: string;
  /** Note moyenne explicite (null : jamais noté), nombre de notes, écart des notes */
  note?: number | null;
  n?: number;
  ecart?: number;
  /** Tranché (1 ★ / 5 ★) */
  tranche?: boolean;
  /** Modifié depuis sa dernière note (avant / après à juger) */
  modifie?: boolean;
  /** Potentiel d'un jamais-noté : note prédite par le juge ou Claude, note de sa base, moyenne de ses ingrédients */
  potentiel?: number | null;
  /** Nouveauté acceptée dans les Arrivages */
  nouveauteAcceptee?: boolean;
};

export type ContextePolitique = {
  memoire?: MemoireExpositions | null;
  /** Implicites négatifs (clés) */
  implicites?: ReadonlySet<string> | null;
  /** Exclus (≤ 2 ★, retirés, à retravailler, refusés aux Arrivages) */
  exclus?: ReadonlySet<string> | null;
  /** Règles apprises : pénalité (étoiles ≤ 0) et écartement par clé (regles-apprises.ts, effetRegles) */
  regles?: ((cle: string) => { effet: number; ecarte: boolean }) | null;
  maintenant?: string;
  reglages?: Partial<ReglagesPolitique> | null;
};

export type PalierPolitique = 0 | 1 | 2 | 3;
export const LIBELLES_PALIERS: Record<PalierPolitique, string> = { 0: 'Modifié depuis la note', 1: 'Jamais noté, fort potentiel', 2: 'Jamais noté', 3: 'Départage d’un bon élément incertain' };
export type RaisonExclusion = 'tranche' | 'exclu' | 'implicite' | 'regle' | 'connu' | 'delai';
export const LIBELLES_EXCLUSIONS: Record<RaisonExclusion, string> = {
  tranche: 'tranché (1 ★ ou 5 ★)', exclu: 'exclu (≤ 2 ★, retiré, refusé)', implicite: 'vu sans être choisi', regle: 'écarté par une règle apprise', connu: 'déjà noté, sans incertitude', delai: 'montré récemment',
};
export type EntreeFile<T> = { x: T; palier: PalierPolitique; score: number; ecrans: number };

/**
 * File d'évaluation selon la politique : paliers 0 → 3 (modifié, fort potentiel, jamais noté, départage), puis score (potentiel ou
 * note, pénalités des règles apprises), puis le moins récemment montré, puis l'ordre reçu. Les éléments en délai de retour sont
 * mis à part (`enDelai`) : servis seulement quand la file est vide (retour forcé, le plus ancien d'abord).
 */
export function fileEvaluation<T extends CandidatPolitique>(items: readonly T[], ctx: ContextePolitique = {}): { file: EntreeFile<T>[]; enDelai: EntreeFile<T>[]; exclus: { x: T; raison: RaisonExclusion }[] } {
  const r = reglages(ctx.reglages);
  const file: (EntreeFile<T> & { i: number })[] = [];
  const delai: (EntreeFile<T> & { i: number })[] = [];
  const exclus: { x: T; raison: RaisonExclusion }[] = [];
  items.forEach((x, i) => {
    if (x.tranche) return void exclus.push({ x, raison: 'tranche' });
    if (ctx.exclus?.has(x.cle)) return void exclus.push({ x, raison: 'exclu' });
    if (ctx.implicites?.has(x.cle)) return void exclus.push({ x, raison: 'implicite' });
    const reg = ctx.regles?.(x.cle) ?? { effet: 0, ecarte: false };
    if (reg.ecarte) return void exclus.push({ x, raison: 'regle' });
    const jamais = x.note === null || x.note === undefined;
    let palier: PalierPolitique;
    if (x.modifie) palier = 0;
    else if (jamais) palier = x.nouveauteAcceptee || (typeof x.potentiel === 'number' && x.potentiel + reg.effet >= r.seuilPotentiel) ? 1 : 2;
    else if ((x.note as number) >= r.departageNoteMin && (x.note as number) < 5 && ((x.n ?? 1) < 2 || (x.ecart ?? 0) >= r.departageEcartMin)) palier = 3;
    else return void exclus.push({ x, raison: 'connu' });
    const base = jamais ? (typeof x.potentiel === 'number' ? x.potentiel : 3) : (x.note as number);
    const e: EntreeFile<T> & { i: number } = { x, palier, score: Math.round((base + reg.effet) * 1000) / 1000, ecrans: ecransDepuis(x.cle, ctx.memoire), i };
    (enDelai(x.cle, ctx.memoire, { maintenant: ctx.maintenant, reglages: ctx.reglages }) ? delai : file).push(e);
  });
  const tri = (a: EntreeFile<T> & { i: number }, b: EntreeFile<T> & { i: number }) => a.palier - b.palier || b.score - a.score || (b.ecrans === a.ecrans ? 0 : b.ecrans > a.ecrans ? 1 : -1) || a.i - b.i;
  file.sort(tri);
  // Retour forcé : le plus anciennement montré d'abord, puis la priorité
  delai.sort((a, b) => (b.ecrans === a.ecrans ? tri(a, b) : b.ecrans - a.ecrans));
  const net = (l: (EntreeFile<T> & { i: number })[]) => l.map(({ i: _i, ...e }) => e);
  return { file: net(file), enDelai: net(delai), exclus };
}

/**
 * Écran de `n` éléments (1 pour une tuile, 2 pour un duel, 6 pour une grille) : les premiers de la file, jamais deux du même groupe
 * visuel ; complété par les « en délai » les plus anciens seulement si la file ne suffit pas (`retour` : nombre de retours forcés).
 * `parmi` : tirage parmi les `parmi` premiers du meilleur palier (variété, `aleatoire`) ; 1 = strictement le premier.
 */
export function choisirEcran<T extends CandidatPolitique>(f: { file: readonly EntreeFile<T>[]; enDelai: readonly EntreeFile<T>[] }, n: number, o: { parmi?: number; aleatoire?: () => number; groupesExclus?: ReadonlySet<string> } = {}): { choix: EntreeFile<T>[]; retours: number } {
  const groupes = new Set(o.groupesExclus ?? []);
  const choix: EntreeFile<T>[] = [];
  const restants = [...f.file];
  const prendre = (l: EntreeFile<T>[], i: number) => { const e = l.splice(i, 1)[0]; groupes.add(groupeVisuel(e.x.cle)); choix.push(e); };
  while (choix.length < n && restants.length) {
    const libres = restants.map((e, i) => ({ e, i })).filter(({ e }) => !groupes.has(groupeVisuel(e.x.cle)));
    if (!libres.length) break;
    const tete = libres.filter(({ e }) => e.palier === libres[0].e.palier).slice(0, Math.max(1, o.parmi ?? 1));
    const k = tete[Math.min(tete.length - 1, Math.floor((o.aleatoire ?? Math.random)() * tete.length))];
    prendre(restants, k.i);
  }
  let retours = 0;
  const attente = [...f.enDelai];
  while (choix.length < n && attente.length) {
    const i = attente.findIndex((e) => !groupes.has(groupeVisuel(e.x.cle)));
    if (i < 0) break;
    prendre(attente, i);
    retours++;
  }
  return { choix, retours };
}

/**
 * Filtre de candidats pour les surfaces qui gardent leur propre tirage (duels, grilles, kits) : sans implicites ni exclus ni écartés
 * par une règle, et sans les éléments en délai tant qu'il en reste au moins `min` ; jamais vide si l'entrée ne l'était pas (sinon
 * l'entrée sans implicites, puis l'entrée).
 */
export function filtrerCandidatsPolitique<T extends { cle: string }>(candidats: readonly T[], ctx: ContextePolitique, min = 2): T[] {
  const ouverts = candidats.filter((c) => !ctx.implicites?.has(c.cle) && !ctx.exclus?.has(c.cle) && !ctx.regles?.(c.cle).ecarte);
  const frais = ouverts.filter((c) => !enDelai(c.cle, ctx.memoire, { maintenant: ctx.maintenant, reglages: ctx.reglages }));
  if (frais.length >= min) return frais;
  if (ouverts.length >= min) return [...ouverts].sort((a, b) => ecransDepuis(b.cle, ctx.memoire) - ecransDepuis(a.cle, ctx.memoire));
  return candidats.length ? [...candidats] : [];
}

/**
 * Dimensions (types d'éléments, formats de grille, catégories) qui ont encore au moins `n` éléments FRAIS (dans la file, hors délai) :
 * une surface qui tire une dimension la choisit parmi elles (une petite famille épuisée, 17 palettes par exemple, attend son tour au
 * lieu de reposer les mêmes) ; aucune : toutes (retour forcé, le plus ancien d'abord).
 */
export function dimensionsFraiches<D>(dims: readonly D[], candidatsDe: (d: D) => readonly CandidatPolitique[], n: number, ctx: ContextePolitique = {}): D[] {
  const ok = dims.filter((d) => fileEvaluation(candidatsDe(d), ctx).file.length >= n);
  return ok.length ? ok : [...dims];
}

/**
 * File d'une boîte d'entrée (Arrivages : tout y est jamais noté) : fort potentiel d'abord, pénalisés par une règle apprise ensuite,
 * écartés en dernier ; jamais deux éléments du même groupe visuel à la suite (tourniquet). Ordre reçu gardé à égalité.
 */
export function ordonnerBoiteEntree<T extends { cle: string }>(l: readonly T[], o: { potentiel?: (cle: string) => number | null; regles?: ContextePolitique['regles'] } = {}): T[] {
  const notes = l.map((x, i) => { const r = o.regles?.(x.cle) ?? { effet: 0, ecarte: false }; return { x, i, s: (o.potentiel?.(x.cle) ?? 3) + r.effet - (r.ecarte ? 10 : 0), g: groupeVisuel(x.cle) }; })
    .sort((a, b) => b.s - a.s || a.i - b.i);
  const res: T[] = [];
  let dernier: string | null = null;
  while (notes.length) {
    const k = Math.max(0, notes.findIndex((n) => n.g !== dernier));
    const [n] = notes.splice(k, 1);
    res.push(n.x);
    dernier = n.g;
  }
  return res;
}

/** Écran bloqué par la politique (élément jugé implicite, exclu, écarté ou en délai) : à re-tirer s'il reste des essais */
export function ecranBloque(cles: readonly (string | null | undefined)[], ctx: ContextePolitique): boolean {
  return cles.some((k) => Boolean(k) && (ctx.implicites?.has(k!) || ctx.exclus?.has(k!) || ctx.regles?.(k!).ecarte || enDelai(k!, ctx.memoire, { maintenant: ctx.maintenant, reglages: ctx.reglages })));
}

// ---------------------------------------------------------------------------------------------------------------
// État compact transmis au navigateur
// ---------------------------------------------------------------------------------------------------------------

/**
 * État de la politique envoyé aux pages : derniers écrans (clés, date), implicites, pénalités et écartements des règles apprises,
 * jamais-notés à fort potentiel. Compact : les 120 derniers écrans seulement (le délai de retour n'en lit que `delaiEcrans`).
 */
export type EtatPolitique = {
  ecrans: { id: string; surface: SurfaceEvaluation; le: string; cles: string[] }[];
  implicites: string[];
  penalites: Record<string, number>;
  ecartes: string[];
  fortPotentiel: string[];
  maintenant: string;
};
export const ETAT_POLITIQUE_VIDE: EtatPolitique = { ecrans: [], implicites: [], penalites: {}, ecartes: [], fortPotentiel: [], maintenant: jour0 };

export function etatPolitique(m: MemoireExpositions, o: { implicites: readonly Pick<ImpliciteNegatif, 'cle'>[]; penalites?: Record<string, number>; ecartes?: readonly string[]; fortPotentiel?: readonly string[]; maintenant: string; ecrans?: number }): EtatPolitique {
  return {
    ecrans: m.ecrans.slice(-(o.ecrans ?? 120)).map((e) => ({ id: e.id, surface: e.surface, le: e.le, cles: e.cles })),
    implicites: o.implicites.map((x) => x.cle), penalites: o.penalites ?? {}, ecartes: [...(o.ecartes ?? [])], fortPotentiel: [...(o.fortPotentiel ?? [])], maintenant: o.maintenant,
  };
}

/** Contexte de politique côté navigateur : état du serveur + expositions de la session (et mémoire de secours du navigateur) */
export function contexteDepuisEtat(e: EtatPolitique | null | undefined, session: readonly Exposition[] = [], maintenant?: string): ContextePolitique & { fortPotentiel: ReadonlySet<string> } {
  const etat = e ?? ETAT_POLITIQUE_VIDE;
  const base: Exposition[] = etat.ecrans.flatMap((x) => x.cles.map((cle) => ({ cle, surface: x.surface, ecran: x.id, le: x.le, resultat: 'note' as const })));
  const memoire = memoireExpositions([...base, ...session]);
  const ecartes = new Set(etat.ecartes);
  const penalites = etat.penalites;
  const implicites = new Set(etat.implicites);
  // Implicites de la session (ex. « celle qui ne va pas » dans cette session) : comptés aussi
  for (const x of implicitesNegatifs(memoireExpositions(session))) implicites.add(x.cle);
  return {
    memoire, implicites, maintenant: maintenant ?? etat.maintenant, fortPotentiel: new Set(etat.fortPotentiel),
    regles: (cle: string) => ({ effet: penalites[cle] ?? 0, ecarte: ecartes.has(cle) }),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Indicateurs
// ---------------------------------------------------------------------------------------------------------------

export type JourIndicateurs = { jour: string; ecrans: number; repetition: number | null; qualite: number | null; jamaisNotes: number | null };
export type IndicateursPolitique = {
  ecrans: number;
  /** Part des écrans (fenêtre : les `ecransMesure` derniers) qui montrent un élément (groupe visuel) déjà vu dans les `fenetre` écrans précédents */
  tauxRepetition: number | null;
  /** Qualité moyenne des éléments présentés : note connue de Paul, sinon note prédite (étoiles) */
  qualiteMoyenne: number | null;
  /** Part des éléments présentés jamais notés au moment de l'exposition */
  partJamaisNotes: number | null;
  regles: number;
  tendance: JourIndicateurs[];
  objectifRepetition: number;
};

const arrondi = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

/**
 * Indicateurs du tableau de bord sur la mémoire : taux de répétition, qualité moyenne présentée, part de jamais-notés, tendance par
 * jour sur `jours` jours. `qualite(cle)` : note moyenne connue (sinon prédite), null si inconnue ; `premiereNote(cle)` : date de la
 * première note (pour « jamais noté au moment de l'exposition »).
 */
export function indicateursPolitique(m: MemoireExpositions, o: { qualite: (cle: string) => number | null; premiereNote: (cle: string) => string | null; regles?: number; maintenant: string; jours?: number; fenetre?: number; ecransMesure?: number }): IndicateursPolitique {
  const fen = o.fenetre ?? POLITIQUE_EVALUATION.fenetreRepetition;
  const rep: boolean[] = [];
  const derniers = new Map<string, number>();
  m.ecrans.forEach((e, i) => {
    rep.push(e.groupes.some((g) => { const d = derniers.get(g); return d !== undefined && i - d <= fen; }));
    for (const g of e.groupes) derniers.set(g, i);
  });
  const mesure = (idx: readonly number[]) => {
    if (!idx.length) return { repetition: null, qualite: null, jamaisNotes: null };
    const q: number[] = []; let jamais = 0, total = 0;
    for (const i of idx) for (const k of m.ecrans[i].cles) {
      total++;
      const v = o.qualite(k);
      if (v !== null) q.push(v);
      const p = o.premiereNote(k);
      if (!p || p > m.ecrans[i].le) jamais++;
    }
    return { repetition: arrondi(idx.filter((i) => rep[i]).length / idx.length), qualite: q.length ? arrondi(q.reduce((s, x) => s + x, 0) / q.length, 2) : null, jamaisNotes: total ? arrondi(jamais / total) : null };
  };
  const n = m.ecrans.length;
  const recents = Array.from({ length: Math.min(n, o.ecransMesure ?? 200) }, (_, i) => n - Math.min(n, o.ecransMesure ?? 200) + i);
  const g = mesure(recents);
  const jours = o.jours ?? 30;
  const fin = new Date(o.maintenant);
  const tendance: JourIndicateurs[] = [];
  for (let j = jours - 1; j >= 0; j--) {
    const d = new Date(fin.getTime() - j * 86400000).toISOString().slice(0, 10);
    const idx = m.ecrans.map((e, i) => (e.le.slice(0, 10) === d ? i : -1)).filter((i) => i >= 0);
    tendance.push({ jour: d, ecrans: idx.length, ...mesure(idx) });
  }
  return { ecrans: n, tauxRepetition: g.repetition, qualiteMoyenne: g.qualite, partJamaisNotes: g.jamaisNotes, regles: o.regles ?? 0, tendance, objectifRepetition: POLITIQUE_EVALUATION.objectifRepetition };
}

/** « 3,2 % » */
export const pourcent = (x: number | null | undefined, d = 1) => (x === null || x === undefined ? '—' : `${(x * 100).toFixed(d).replace('.', ',')} %`);
