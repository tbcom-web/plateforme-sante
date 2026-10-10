// COMPOSEUR (demande validée par Paul le 2026-10-11 : « que l'agent crée un modèle en sélectionnant lui-même les photos et éléments
// de la base pour créer un modèle magnifique pour un podo du sport qui fait aussi du diabète par exemple […] propose une série de
// modèles que je valide in fine — on peut juste sélectionner la liste des plus beaux »). Documentation : docs/chaine-modeles.md.
//
// Entrée : un PROFIL réel de cabinet (thèmes principaux + secondaires + activités : « Sport + Diabète », ou un profil de pratique),
// le contexte de tirage (poids appris, photos du KIT du profil, modèles), les notes des éléments, les éléments tranchés, les notes
// prédites par le juge, les éléments validés et les images validées de chaque thème du profil.
// Méthode (pure, déterministe pour une graine) :
//   1. AMBIANCE unique pour tout le site : familles de style pondérées par TOUS les thèmes du profil (moyenne géométrique : le n° 1
//      compte pour 60 %, les autres se partagent le reste) et par les préférences apprises (duels, Dégustation) ; une famille que l'un
//      des thèmes refuse (diabète → Graphique pop 0,3) recule sans disparaître. Règles dures de l'harmonie et garde-fous du core
//      (diabète : jamais de rouge vif, de relevé, d'effets « Vivant » ni d'animation vive) appliqués au profil ENTIER.
//   2. CANDIDATS : quelques centaines de tirages harmonieux (tirerDansFamille) répartis selon ces poids, poussés vers le 100 % 4-5 ★
//      (versQuatreCinq, aucun élément nouveau) ; photos tirées dans le kit du profil seulement.
//   3. FILTRE : règle dure, garde-fou, élément ou composition REFUSÉS (1 ★, ≤ 2,5 ★) → écarté. Un élément qui n'est ni 4-5 ★, ni favori,
//      ni validé est un REPLI : gardé (signalé) seulement quand rien de bon n'a pu prendre sa place ; il devient un MANQUE (liste de
//      sortie, pour l'Atelier des manques).
//   4. SCORE (0-100) : juge (notes de Paul, sinon note prédite) 30 % · jauge 4-5 ★ 25 % · harmonie (règles souples + apprentissage)
//      25 % · préférences apprises des éléments (duels, Dégustation, recettes) 10 % · accord de la famille avec le profil 10 % ; −8 par
//      repli.
//   5. SÉLECTION DIVERSE : les meilleurs d'abord, jamais deux designs quasi identiques (DISTANCE_MIN : au moins deux dimensions
//      visibles différentes, toujours) ; on cherche d'abord des propositions nettement distinctes (4 dimensions visibles, structure /
//      premier écran / palette, deux par famille au plus), puis on relâche par paliers.
//   6. VISUELS PAR PAGE : chaque thème du profil garde ses images (kit validé) avec son TON (énergie pour le sport, calme pour le
//      diabète : jamais d'animation) ; un thème sans illustration, photo ou icône validée est un manque.
// Sortie : N propositions (design + composition habillée pour le profil, score, « pourquoi ce choix »), manques, statistiques.
// Module pur.

import { cleComposition } from './duels';
import { designDe } from './chaine-design';
import { DIMENSIONS_VISIBLES, ecartCompositions, legendeDirection } from './degustation-directions';
import { compatibiliteFamille, ecrireDimension, etiquetteIngredient, valeursDimensionHarmonie, FAMILLES_PAR_SUJET, FAMILLES_STYLE, familleDominante, familleStyle, poidsHarmonie, scoreHarmonie, tirerDansFamille, violationsDures, type ContexteHarmonie, type IdFamilleStyle } from './harmonie';
import { avecBonusQuatreCinq, dimensionElement, dimensionsAvecFavori, elementsComposition, noteElement, versQuatreCinq, type NotesElements } from './qualite';
import { LIBELLES_VARIANTES, NOMS_SECTIONS_VARIABLES, alea, compositionInitiale, photosIntegreesBanque, controlerComposition, outilsHarmonie, reparerComposition, sujetsActifs, tirerPhotos, type CompositionRecette, type ContexteRecette } from './recettes';
import { themeParId } from './themes';
import { LIBELLES_STRUCTURES, REGLES_THEMES } from './propositions';
import { gamme } from './gammes';
import { pairePolices } from './modeles';
import { clePhoto } from './assets-poids';
import { lireCleTraitementPhotos } from './traitements-photos';
import type { Tranches } from './tranches';

// ---------------------------------------------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------------------------------------------

/** Profil réel d'un cabinet : thèmes principaux (le n° 1 d'abord), secondaires, activités mises en avant */
export type ProfilComposeur = { id?: string; nom?: string; principaux: readonly string[]; secondaires?: readonly string[]; activites?: readonly string[] };

/** Thèmes actifs du profil, dans l'ordre (principaux puis secondaires) */
export const sujetsDuProfilComposeur = (p: ProfilComposeur): string[] => sujetsActifs([...p.principaux, ...(p.secondaires ?? [])]);

/** Clé stable d'un profil (« sport+diabete~course ») : mémoire par profil, adresse de la page */
export function cleProfilComposeur(p: ProfilComposeur): string {
  const s = sujetsDuProfilComposeur(p);
  const a = [...new Set(p.activites ?? [])];
  return `${s.join('+') || 'cabinet'}${a.length ? `~${a.join('.')}` : ''}`;
}

/** Profil depuis sa clé (« sport+diabete~course ») ; thèmes inconnus ignorés */
export function profilComposeurDepuisCle(cle: string): ProfilComposeur {
  const [t, a] = String(cle ?? '').split('~');
  const s = sujetsActifs((t ?? '').split('+').filter(Boolean));
  return { principaux: s.slice(0, 1), secondaires: s.slice(1), activites: (a ?? '').split('.').filter((x) => /^[a-z0-9-]{2,30}$/.test(x)) };
}

/** Nom lisible (« Sport + Diabète ») */
export const nomProfilComposeur = (p: ProfilComposeur): string => p.nom ?? (sujetsDuProfilComposeur(p).map((s) => themeParId(s)?.court ?? s).join(' + ') || 'Cabinet');

/** Ton visuel d'un thème : l'énergie du sport, le calme du diabète et des seniors (jamais d'animation), la douceur de l'enfant */
export type TonSujet = 'energie' | 'calme' | 'doux' | 'net';
export const TONS_SUJETS: Readonly<Record<string, TonSujet>> = { sport: 'energie', diabete: 'calme', senior: 'calme', pedicurie: 'calme', enfant: 'doux', ongles: 'net', semelles: 'net' };
export const tonDuSujet = (s: string): TonSujet => TONS_SUJETS[s] ?? 'net';
const MOTS_TONS: Record<TonSujet, string> = { energie: 'énergie', calme: 'calme', doux: 'douceur', net: 'netteté' };

/**
 * Familles de style du profil ENTIER (une ambiance pour tout le site) : moyenne géométrique des poids par thème (FAMILLES_PAR_SUJET ;
 * n° 1 : 60 %, les autres se partagent 40 %), multipliée par 2^(préférence apprise). Triées, la meilleure d'abord.
 */
export function famillesDuProfil(sujets: readonly string[], appris?: Partial<Record<IdFamilleStyle, number>> | null): { id: IdFamilleStyle; poids: number }[] {
  const s = sujets.filter((x) => FAMILLES_PAR_SUJET[x]);
  const l = s.length ? s : ['cabinet'];
  const w = (i: number) => (l.length === 1 ? 1 : i === 0 ? 0.6 : 0.4 / (l.length - 1));
  return FAMILLES_STYLE.map((f) => {
    const geo = l.reduce((acc, x, i) => acc * Math.pow(Math.max(0.05, FAMILLES_PAR_SUJET[x][f.id] ?? 1), w(i)), 1);
    return { id: f.id, poids: Math.round(geo * Math.pow(2, appris?.[f.id] ?? 0) * 1000) / 1000 };
  }).sort((a, b) => b.poids - a.poids || FAMILLES_STYLE.findIndex((f) => f.id === a.id) - FAMILLES_STYLE.findIndex((f) => f.id === b.id));
}

// ---------------------------------------------------------------------------------------------------------------
// Entrée, sortie
// ---------------------------------------------------------------------------------------------------------------

/** Images validées d'un thème du profil (kit : profils.ts, visuelsDeLActivite) */
export type ImagesSujet = { sujet: string; activite?: string | null; illustration: string | null; photos: readonly string[]; icone: string | null; animation?: string | null; repli?: boolean };

export type EntreeComposeur = {
  profil: ProfilComposeur;
  /** Contexte de tirage : poids appris, PHOTOS DU KIT du profil, modèles ; sujets = ceux du profil (posés par composer) */
  contexte: Omit<ContexteRecette, 'sujets'> & { sujets?: readonly string[] };
  /** Notes des éléments (poids.notesElements par défaut) */
  notes?: NotesElements | null;
  tranches?: Pick<Tranches, 'refuses' | 'favoris'> | null;
  /** Notes prédites par le juge (clé → note 1-5, la plus récente) */
  predictions?: Readonly<Record<string, number>> | null;
  /** Éléments validés (ingrédients « à valider » validés, illustrations validées) : comptés comme bons */
  valides?: ReadonlySet<string> | null;
  /** Images validées de chaque thème (visuels par page) */
  images?: readonly ImagesSujet[] | null;
  /** Propositions à rendre (8) */
  n?: number;
  /** Candidats générés (240) */
  candidats?: number;
  graine?: number;
  /** Relance des dés vers le 100 % 4-5 ★ (versQuatreCinq) : plus lent ; défaut : non (les tirages sont déjà orientés) */
  ameliorer?: boolean;
};

export type DetailScore = { juge: number; jauge: number; harmonie: number; appris: number; profil: number; replis: number };

export type PageComposeur = { sujet: string; nom: string; ton: TonSujet; activite: string | null; illustration: string | null; photos: string[]; icone: string | null; animation: string | null; repli: boolean };

export type PropositionComposeur = {
  /** Clé du DESIGN (sans images) : celle de la chaîne */
  cle: string;
  /** Design (sans photos ni sujet du premier écran) : ce que « Garder » enregistre */
  design: Record<string, unknown>;
  /** Composition habillée pour le profil (rendu) */
  x: CompositionRecette;
  famille: IdFamilleStyle;
  nomFamille: string;
  legende: string;
  score: number;
  detail: DetailScore;
  /** Éléments 4-5 ★ / total (jauge) */
  qualite: { bons: number; total: number };
  /** Éléments de repli (ni 4-5 ★, ni favoris, ni validés) */
  replis: string[];
  /** « Pourquoi ce choix », une phrase */
  pourquoi: string;
  /** Visuels de chaque page de thème */
  pages: PageComposeur[];
};

export type ManqueComposeur = {
  id: string;
  type: 'element' | 'image';
  /** Dimension (dimensionElement) ou famille d'image (illustration, photo, icone) */
  dimension: string;
  sujet: string | null;
  texte: string;
  /** Exemple d'élément de repli */
  exemple: string | null;
  /** Nombre de candidats concernés (éléments) */
  frequence: number;
};

export type ResultatComposeur = {
  profil: { cle: string; nom: string; sujets: string[]; activites: string[] };
  propositions: PropositionComposeur[];
  manques: ManqueComposeur[];
  familles: { id: IdFamilleStyle; poids: number }[];
  stats: { candidats: number; uniques: number; admis: number; ecartes: Record<RaisonEcart, number>; /** Éléments refusés le plus souvent tirés (diagnostic) */ refusFrequents: { cle: string; n: number }[] };
};

export type RaisonEcart = 'regle-dure' | 'garde-fou' | 'refuse' | 'doublon';

/** Poids du score (somme 1) et pénalité par repli */
export const POIDS_COMPOSEUR = { juge: 0.25, jauge: 0.2, harmonie: 0.25, appris: 0.1, profil: 0.2, repli: 3 } as const;
/** Écart de score toléré sous la meilleure proposition (au-delà : moins de propositions plutôt qu'une moins belle) */
export const ECART_SCORE_MAX = 22;
/** Jamais deux propositions quasi identiques : au moins ces dimensions visibles différentes (palette, polices, premier écran, style, structure) */
export const DISTANCE_MIN = { dimensions: 2 } as const;
/** Paliers de diversité : on cherche d'abord des propositions nettement distinctes, puis on relâche (jamais sous DISTANCE_MIN) */
export const PALIERS_DIVERSITE = [
  { dimensions: 4, distance: 0.16, cles: 2, parFamille: 2, parPalette: 1, parAccueil: 1 },
  { dimensions: 3, distance: 0.1, cles: 2, parFamille: 2, parPalette: 2, parAccueil: 2 },
  { dimensions: 3, distance: 0.05, cles: 1, parFamille: 3, parPalette: 2, parAccueil: 2 },
  { dimensions: DISTANCE_MIN.dimensions, distance: 0, cles: 1, parFamille: 4, parPalette: 3, parAccueil: 3 },
] as const;

// ---------------------------------------------------------------------------------------------------------------
// Évaluation d'un candidat
// ---------------------------------------------------------------------------------------------------------------

const hache = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const borne = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const arrondi = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

type Evaluation = { rejet: RaisonEcart | null; elements: string[]; bons: string[]; replis: string[] };

/** Un élément est BON : noté ≥ 4 ★, favori (5 ★ ou gardé) ou validé */
export function elementBon(cle: string, o: { notes?: NotesElements | null; tranches?: Pick<Tranches, 'favoris'> | null; valides?: ReadonlySet<string> | null }): boolean {
  const n = noteElement(cle, o.notes);
  return (n !== null && n >= 4) || Boolean(o.tranches?.favoris.has(cle)) || Boolean(o.valides?.has(cle));
}

/** Un élément est REFUSÉ : tranché à 1 ★ (ou combinaison refusée), ou noté ≤ 2,5 ★ en moyenne */
export function elementRefuse(cle: string, o: { notes?: NotesElements | null; tranches?: Pick<Tranches, 'refuses'> | null }): boolean {
  if (o.tranches?.refuses.has(cle)) return true;
  const n = noteElement(cle, o.notes);
  return n !== null && n < 2.5;
}

function evaluer(x: CompositionRecette, c: ContexteRecette, e: EntreeComposeur, notes: NotesElements | null | undefined): Evaluation {
  const elements = elementsComposition(x, c.sujets);
  const vide = { elements, bons: [], replis: [] };
  if (violationsDures(x as never, c as unknown as ContexteHarmonie).length) return { rejet: 'regle-dure', ...vide };
  if (controlerComposition(x, c).length) return { rejet: 'garde-fou', ...vide };
  // Style « Photos » sans photo validée du kit : jamais (premier écran vide)
  if (x.visuels.style === 'photos' && !x.photos.length) return { rejet: 'garde-fou', ...vide };
  const o = { notes, tranches: e.tranches, valides: e.valides };
  if (elements.some((k) => elementRefuse(k, o)) || e.tranches?.refuses.has(cleComposition(designDe(x)))) return { rejet: 'refuse', ...vide };
  const bons = elements.filter((k) => elementBon(k, o));
  return { rejet: null, elements, bons, replis: elements.filter((k) => !bons.includes(k)) };
}

/** Dimension d'harmonie d'une clé d'élément remplaçable (palette, polices, typographie, détails, menus, présentations, effets, traitement) */
export function dimensionDeCle(k: string): { dim: string; v: string; grain?: boolean; prefixe: string } | null {
  const p = k.split(':');
  const t = lireCleTraitementPhotos(k);
  if (t) return { dim: 'traitement', v: t.id, grain: t.grain, prefixe: 'effets:photos-' };
  if (p.length === 2 && p[0] === 'gamme') return { dim: 'gamme', v: p[1], prefixe: 'gamme:' };
  if (p.length === 2 && p[0] === 'effets') return { dim: 'effets', v: p[1], prefixe: 'effets:' };
  if (p.length !== 3) return null;
  if (p[0] === 'typo' && p[1] === 'police') return { dim: 'police', v: p[2], prefixe: 'typo:police:' };
  if (p[0] === 'typo' && p[1] !== 'combinaison') return { dim: `typo.${p[1]}`, v: p[2], prefixe: `typo:${p[1]}:` };
  if (p[0] === 'details') return { dim: `details.${p[1]}`, v: p[2], prefixe: `details:${p[1]}:` };
  if (p[0] === 'menu') return { dim: `menu.${p[1]}`, v: p[2], prefixe: `menu:${p[1]}:` };
  if (p[0] === 'composant' && p[1] !== 'paire') return { dim: `v.${p[1]}`, v: p[2], prefixe: `composant:${p[1]}:` };
  return null;
}

/**
 * SÉLECTION des éléments (le cœur du composeur) : chaque élément refusé ou « à compléter » d'un candidat est remplacé, s'il en existe,
 * par un élément BON de la même dimension (le mieux noté d'abord), compatible avec la famille du candidat, sans nouvelle règle dure ni
 * garde-fou levé (reparerComposition). Ce qui reste sans remplaçant est un repli.
 */
function selectionnerBons(x0: CompositionRecette, f: IdFamilleStyle, c: ContexteRecette, bonsPar: ReadonlyMap<string, readonly { cle: string; n: number }[]>, o: { notes?: NotesElements | null; tranches?: Pick<Tranches, 'refuses' | 'favoris'> | null; valides?: ReadonlySet<string> | null }): CompositionRecette {
  let x = x0;
  const aRemplacer = (y: CompositionRecette) => elementsComposition(y, c.sujets).filter((k) => !elementBon(k, o)).sort((a, b) => Number(elementRefuse(b, o)) - Number(elementRefuse(a, o)));
  // Coût : un refusé pèse comme dix éléments à compléter
  const cout = (l: readonly string[]) => l.length + 10 * l.filter((z) => elementRefuse(z, o)).length;
  let reste = aRemplacer(x);
  const tentes = new Set<string>();
  for (let tour = 0; tour < 24 && reste.length; tour++) {
    const k = reste.find((z) => !tentes.has(z));
    if (!k) break;
    tentes.add(k);
    const d = dimensionDeCle(k);
    if (!d) continue;
    const bons = (bonsPar.get(d.prefixe) ?? []).filter((b) => b.cle !== k && !(d.prefixe === 'effets:' && b.cle.startsWith('effets:photos-')));
    // Élément REFUSÉ sans remplaçant 4-5 ★ : la meilleure valeur non refusée de la dimension (elle devient un repli, signalé)
    const secours = elementRefuse(k, o) && d.dim !== 'traitement' ? valeursDimensionHarmonie(d.dim).map((v) => `${d.prefixe}${v}`).filter((z) => z !== k && !elementRefuse(z, o) && !bons.some((b) => b.cle === z))
      .map((z) => ({ cle: z, n: noteElement(z, o.notes) ?? 3 })).sort((p, q) => q.n - p.n || p.cle.localeCompare(q.cle)) : [];
    const alternatives = [...bons.slice(0, 6), ...secours.slice(0, 4)];
    const avant = violationsDures(x as never, c as unknown as ContexteHarmonie).length;
    for (const b of alternatives) {
      const db = dimensionDeCle(b.cle);
      if (!db || db.dim !== d.dim || compatibiliteFamille(d.dim, db.v, f) === 'exclu') continue;
      let y = d.dim === 'traitement' ? { ...x, traitement: { id: db.v, grain: Boolean(db.grain) } } as CompositionRecette : ecrireDimension(x as never, d.dim, db.v) as unknown as CompositionRecette;
      y = reparerComposition(y, c);
      const r = aRemplacer(y);
      if (r.includes(k) || cout(r) >= cout(reste) || r.some((z) => elementRefuse(z, o) && !reste.includes(z))) continue;
      if (violationsDures(y as never, c as unknown as ContexteHarmonie).length > avant || controlerComposition(y, c).length) continue;
      x = y; reste = r;
      break;
    }
  }
  return x;
}

/** Genres de polices hors du ton d'un thème */
export const GENRES_A_EVITER: Readonly<Partial<Record<TonSujet, readonly string[]>>> = { calme: ['mono', 'condensee'], doux: ['mono', 'condensee', 'slab'] };

/** Palette visible (gamme, sinon couleur libre) */
const paletteDe = (x: CompositionRecette) => x.gamme || x.couleur;

/**
 * Accord avec le profil (0-1) : famille (40 %), structure (30 %) et style d'illustration (20 %) conseillés par CHAQUE thème
 * (REGLES_THEMES, moyenne géométrique n° 1 : 60 %), palette conseillée par l'un des thèmes (10 %).
 */
export function accordProfil(x: CompositionRecette, famille: IdFamilleStyle, sujets: readonly string[], poidsFamille: ReadonlyMap<string, number>, maxPoids: number): number {
  const l = sujets.filter((s) => REGLES_THEMES[s]);
  const s = l.length ? l : ['cabinet'];
  const w = (i: number) => (s.length === 1 ? 1 : i === 0 ? 0.6 : 0.4 / (s.length - 1));
  const geo = (f: (r: (typeof REGLES_THEMES)[string]) => number | undefined) => s.reduce((acc, x, i) => acc * Math.pow(Math.max(0.1, (f(REGLES_THEMES[x]) ?? 0.3) / 3), w(i)), 1);
  const fam = borne((poidsFamille.get(famille) ?? 0) / maxPoids);
  const st = borne(geo((r) => r.structures[x.structure as never]));
  const sty = borne(geo((r) => r.styles[x.visuels.style as never]));
  const pal = x.gamme && s.some((y) => REGLES_THEMES[y].gammes.includes(x.gamme)) ? 1 : 0.6;
  // Polices au ton du profil : ni mono ni condensée pour le calme (diabète, seniors) ni la douceur (enfants)
  const genre = etiquetteIngredient('police', x.police)?.genre ?? '';
  const malus = s.reduce((acc, y, i) => acc + ((GENRES_A_EVITER[tonDuSujet(y)] ?? []).includes(genre) ? w(i) : 0), 0);
  return borne(0.4 * fam + 0.3 * st + 0.2 * sty + 0.1 * pal - 0.35 * malus);
}

/** Note d'un élément pour le juge : celle de Paul, sinon la note prédite, sinon null */
function noteJuge(k: string, notes: NotesElements | null | undefined, preds: Readonly<Record<string, number>> | null | undefined): number | null {
  return noteElement(k, notes) ?? (typeof preds?.[k] === 'number' ? preds[k] : null);
}

// ---------------------------------------------------------------------------------------------------------------
// Composeur
// ---------------------------------------------------------------------------------------------------------------

/** Répartition des candidats entre familles : proportionnelle au poids, au moins 4 pour une famille admise (poids ≥ 0,5) */
export function repartitionCandidats(familles: readonly { id: IdFamilleStyle; poids: number }[], total: number): { id: IdFamilleStyle; n: number }[] {
  const admises = familles.filter((f) => f.poids >= 0.5);
  const somme = admises.reduce((s, f) => s + f.poids, 0) || 1;
  return admises.map((f) => ({ id: f.id, n: Math.max(4, Math.round((total * f.poids) / somme)) }));
}

/** Les N plus belles compositions pour un profil (voir l'en-tête) */
export function composer(e: EntreeComposeur): ResultatComposeur {
  const sujets = sujetsDuProfilComposeur(e.profil);
  const activites = [...new Set(e.profil.activites ?? [])];
  const n = e.n ?? 8, total = e.candidats ?? 240, g0 = e.graine ?? 1;
  const notes = e.notes ?? e.contexte.poids?.notesElements ?? null;
  // Photos du kit sans aucune photo refusée (1 ★, ≤ 2,5 ★)
  const photos = (e.contexte.photos ?? photosIntegreesBanque()).filter((p) => { const k = p.cle ?? clePhoto(p.url); return !k || !elementRefuse(k, { notes, tranches: e.tranches }); });
  const c0: ContexteRecette = { ...e.contexte, photos, sujets, principaux: Math.max(1, e.profil.principaux.length), modeTirage: e.contexte.modeTirage ?? 'favoris' };
  // Tirages orientés vers les 4-5 ★ (poids seulement : règles et garde-fous inchangés)
  const c = avecBonusQuatreCinq(c0, notes);
  const outils = outilsHarmonie(c);
  const appris = poidsHarmonie(c as unknown as ContexteHarmonie).familles;
  const familles = famillesDuProfil(sujets, appris);
  const poidsFamille = new Map(familles.map((f) => [f.id, f.poids]));
  const maxPoids = Math.max(...familles.map((f) => f.poids), 1e-6);
  const ecartes: Record<RaisonEcart, number> = { 'regle-dure': 0, 'garde-fou': 0, refuse: 0, doublon: 0 };
  const vus = new Set<string>();
  type Candidat = { cle: string; x: CompositionRecette; ev: Evaluation; famille: IdFamilleStyle };
  const admis: Candidat[] = [];
  let generes = 0;
  const causes = new Map<string, number>();
  // Éléments BONS disponibles par dimension (notes ≥ 4 ★, favoris, validés), le mieux noté d'abord : le vivier de la sélection
  const o = { notes, tranches: e.tranches, valides: e.valides };
  const bonsPar = new Map<string, { cle: string; n: number }[]>();
  for (const k of new Set([...Object.keys(notes ?? {}), ...(e.tranches?.favoris ?? []), ...(e.valides ?? [])])) {
    const d = dimensionDeCle(k);
    if (!d || !elementBon(k, o) || elementRefuse(k, o)) continue;
    const l = bonsPar.get(d.prefixe) ?? [];
    l.push({ cle: k, n: noteElement(k, notes) ?? 4.5 });
    bonsPar.set(d.prefixe, l);
  }
  for (const l of bonsPar.values()) l.sort((a, b) => b.n - a.n || a.cle.localeCompare(b.cle));
  for (const { id: f, n: nf } of repartitionCandidats(familles, total)) {
    for (let k = 0; k < nf; k++) {
      generes++;
      const g = hache(`${g0}|${f}|${k}`);
      let y = tirerDansFamille(f, compositionInitiale(c, g), [], c as unknown as ContexteHarmonie, g, outils as never) as CompositionRecette;
      if (e.ameliorer && notes && Object.keys(notes).length) y = versQuatreCinq(y, c, notes, { maxNouveaux: 0, essais: 2, graine: g }).composition;
      y = selectionnerBons(y, f, c0, bonsPar, o);
      // Photos du KIT du profil seulement (contexte de l'appelant) ; jamais de photos hors du style « Photos »
      y = y.visuels.style === 'photos' ? { ...y, photos: tirerPhotos(c, alea(g, 'photos-composeur')) } : { ...y, photos: [] };
      const design = designDe(y);
      // Même clé que la chaîne (garderPreselection : cleComposition(designDe(…)))
      const cle = cleComposition(design);
      if (vus.has(cle)) { ecartes.doublon++; continue; }
      vus.add(cle);
      const ev = evaluer(y, c0, e, notes);
      if (ev.rejet) { ecartes[ev.rejet]++; if (ev.rejet === 'refuse') for (const k of ev.elements.filter((z) => elementRefuse(z, o))) causes.set(k, (causes.get(k) ?? 0) + 1); continue; }
      admis.push({ cle, x: y, ev, famille: familleDominante(y as never, c as unknown as ContexteHarmonie)[0].id });
    }
  }

  // Score
  const effetsAssets = c0.poids?.assets?.effets ?? {};
  const noter = (a: Candidat) => {
    const notesJuge = a.ev.elements.map((k) => noteJuge(k, notes, e.predictions)).filter((v): v is number => v !== null);
    const juge = notesJuge.length ? borne((notesJuge.reduce((s, v) => s + v, 0) / notesJuge.length - 1) / 4) : 0.5;
    const jauge = a.ev.elements.length ? a.ev.bons.length / a.ev.elements.length : 0.5;
    const harmonie = scoreHarmonie(a.x as never, c0 as unknown as ContexteHarmonie).score / 100;
    const ef = a.ev.elements.map((k) => effetsAssets[k]).filter((v): v is number => typeof v === 'number');
    const appr = ef.length ? borne((ef.reduce((s, v) => s + v, 0) / ef.length + 1) / 2) : 0.5;
    const profil = accordProfil(a.x, a.famille, sujets, poidsFamille, maxPoids);
    const P = POIDS_COMPOSEUR;
    const score = 100 * (P.juge * juge + P.jauge * jauge + P.harmonie * harmonie + P.appris * appr + P.profil * profil) - P.repli * a.ev.replis.length;
    return { score: arrondi(score, 2), detail: { juge: arrondi(juge), jauge: arrondi(jauge), harmonie: arrondi(harmonie), appris: arrondi(appr), profil: arrondi(profil), replis: a.ev.replis.length } };
  };
  const notes2 = admis.map((a) => ({ a, ...noter(a) })).sort((p, q) => q.score - p.score || (p.a.cle < q.a.cle ? -1 : 1));

  // Sélection diverse
  const choisis: typeof notes2 = [];
  const distinctes = (p: CompositionRecette, q: CompositionRecette, palier: (typeof PALIERS_DIVERSITE)[number]) => {
    const ec = ecartCompositions(p, q);
    const cles = ['structure', 'accueil', 'palette'].filter((d) => ec.dimensions.includes(d)).length;
    return ec.dimensions.length >= Math.max(palier.dimensions, DISTANCE_MIN.dimensions) && ec.distance >= palier.distance && cles >= palier.cles;
  };
  for (const palier of PALIERS_DIVERSITE) {
    for (const p of notes2) {
      if (choisis.length >= n) break;
      if (choisis.includes(p)) continue;
      if (choisis.filter((q) => q.a.famille === p.a.famille).length >= palier.parFamille) continue;
      if (choisis.filter((q) => paletteDe(q.a.x) === paletteDe(p.a.x)).length >= palier.parPalette || choisis.filter((q) => q.a.x.police === p.a.x.police).length >= palier.parPalette + 1) continue;
      if (choisis.filter((q) => (q.a.x.sections.variantes.accueil ?? '') === (p.a.x.sections.variantes.accueil ?? '')).length >= palier.parAccueil) continue;
      if (choisis.length && p.score < choisis[0].score - ECART_SCORE_MAX) continue;
      if (choisis.every((q) => distinctes(p.a.x, q.a.x, palier))) choisis.push(p);
    }
    if (choisis.length >= n) break;
  }

  // Visuels par page de thème, manques d'images
  const pages: PageComposeur[] = sujets.map((s) => {
    const im = e.images?.find((i) => i.sujet === s) ?? null;
    const ton = tonDuSujet(s);
    return {
      sujet: s, nom: themeParId(s)?.court ?? s, ton, activite: im?.activite ?? null, illustration: im?.illustration ?? null, photos: [...(im?.photos ?? [])].slice(0, 3),
      icone: im?.icone ?? null, animation: ton === 'calme' ? null : im?.animation ?? null, repli: Boolean(im?.repli),
    };
  });
  const manques: ManqueComposeur[] = [];
  if (e.images) for (const p of pages) {
    const hashtag = p.activite ? `${p.sujet} · ${p.activite}` : p.sujet;
    if (!p.illustration) manques.push({ id: `image|${p.sujet}|illustration`, type: 'image', dimension: 'illustration', sujet: p.sujet, texte: `Pas d’illustration validée pour « ${p.nom} » (#${hashtag})`, exemple: null, frequence: 0 });
    if (!p.photos.length) manques.push({ id: `image|${p.sujet}|photo`, type: 'image', dimension: 'photo', sujet: p.sujet, texte: `Aucune photo validée pour « ${p.nom} » (#${hashtag})`, exemple: null, frequence: 0 });
    if (!p.icone) manques.push({ id: `image|${p.sujet}|icone`, type: 'image', dimension: 'icone', sujet: p.sujet, texte: `Pas d’icône validée pour « ${p.nom} » (#${hashtag})`, exemple: null, frequence: 0 });
    if (p.repli) manques.push({ id: `image|${p.sujet}|activite`, type: 'image', dimension: 'activite', sujet: p.sujet, texte: `Rien de validé pour l’activité « ${p.activite} » : images génériques de « ${p.nom} »`, exemple: null, frequence: 0 });
  }
  // Manques d'éléments : dimensions de repli des propositions retenues (puis de tous les admis), les plus fréquentes d'abord
  const avecFavori = dimensionsAvecFavori(notes, sujets);
  const parDim = new Map<string, ManqueComposeur>();
  const compter = (l: readonly Candidat[]) => {
    for (const a of l) for (const k of a.ev.replis) {
      const d = dimensionElement(k, sujets);
      if (!d) continue;
      const m = parDim.get(d.id);
      if (m) { m.frequence++; continue; }
      const fam = familleStyle(a.famille)?.nom ?? a.famille;
      const texte = avecFavori.has(d.id) ? `${d.nom} : aucun élément 4-5 ★ qui aille avec « ${fam} » (repli : ${k.split(':').slice(1).join(' · ')})` : `${d.nom} : aucun élément noté 4-5 ★ pour l’instant (repli : ${k.split(':').slice(1).join(' · ')})`;
      parDim.set(d.id, { id: `element|${d.id}`, type: 'element', dimension: d.id, sujet: d.id.startsWith('photo:') ? d.id.slice(6) : null, texte, exemple: k, frequence: 1 });
    }
  };
  compter(choisis.map((p) => p.a));
  manques.push(...[...parDim.values()].sort((a, b) => b.frequence - a.frequence || a.id.localeCompare(b.id)));

  // Propositions
  choisis.sort((p, q) => q.score - p.score || (p.a.cle < q.a.cle ? -1 : 1));
  const propositions: PropositionComposeur[] = choisis.map(({ a, score, detail }) => {
    const fam = familleStyle(a.famille)!;
    const aimes = a.ev.bons.map((k) => ({ k, n: noteElement(k, notes) ?? 0 })).filter((o) => o.n >= 4.5).sort((p, q) => q.n - p.n || p.k.localeCompare(q.k)).slice(0, 2)
      .map((o) => libelleCourt(o.k, sujets));
    const tons = [...new Set(sujets.slice(0, 3).map((s) => `${MOTS_TONS[tonDuSujet(s)]} ${articleSujet(s)}`))];
    const calme = sujets.some((s) => tonDuSujet(s) === 'calme') ? ' (ni rouge vif ni animation vive)' : '';
    const pourquoi = `${fam.nom} : ${tons.join(', ')}${calme}. ${a.ev.bons.length}/${a.ev.elements.length} éléments 4-5 ★${a.ev.replis.length ? ` (${a.ev.replis.length} à compléter)` : ''} · harmonie ${Math.round(detail.harmonie * 100)}/100${aimes.length ? ` · vous avez aimé ${aimes.join(', ')}` : ''}.`;
    return {
      cle: a.cle, design: designDe(a.x), x: a.x, famille: a.famille, nomFamille: fam.nom, legende: legendeDirection(a.x, a.famille).texte, score, detail,
      qualite: { bons: a.ev.bons.length, total: a.ev.elements.length }, replis: a.ev.replis, pourquoi, pages,
    };
  });
  return {
    profil: { cle: cleProfilComposeur(e.profil), nom: nomProfilComposeur(e.profil), sujets, activites },
    propositions, manques, familles,
    stats: { candidats: generes, uniques: vus.size, admis: admis.length, ecartes, refusFrequents: [...causes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([cle, n]) => ({ cle, n })) },
  };
}

const ARTICLES: Record<string, string> = { sport: 'du sport', diabete: 'pour le diabète', senior: 'pour les seniors', enfant: 'pour les enfants', ongles: 'pour les ongles', semelles: 'des semelles', pedicurie: 'des soins' };
const articleSujet = (s: string) => ARTICLES[s] ?? `pour ${(themeParId(s)?.court ?? s).toLowerCase()}`;

/** Libellé court d'un élément aimé (« la palette canard », « les polices grotesque ») */
function libelleCourt(k: string, sujets: readonly string[]): string {
  const p = k.split(':');
  if (p[0] === 'gamme') return `la palette « ${gamme(p[1])?.nom ?? p[1]} »`;
  if (p[0] === 'typo' && p[1] === 'police') return `les polices « ${pairePolices(p[2])?.nom ?? p[2]} »`;
  if (p[0] === 'composant' && LIBELLES_VARIANTES[p[1]]?.[p[2]]) return `${(NOMS_SECTIONS_VARIABLES[p[1]] ?? p[1]).toLowerCase()} « ${LIBELLES_VARIANTES[p[1]][p[2]]} »`;
  if (p[0] === 'modele') return `la structure « ${LIBELLES_STRUCTURES[p[1] as never] ?? p[1]} »`;
  if (p[0] === 'photo') return 'la photo du premier écran';
  const d = dimensionElement(k, sujets);
  return d ? `${d.nom.toLowerCase()} « ${p.slice(2).join(' ') || p[1]} »` : k;
}

/** Les deux propositions sont-elles assez différentes (jamais deux quasi identiques) ? */
export const propositionsDistinctes = (a: CompositionRecette, b: CompositionRecette) => ecartCompositions(a, b).dimensions.length >= DISTANCE_MIN.dimensions;

/** Dimensions visibles comparées (pour l'affichage « ce qui change ») */
export const DIMENSIONS_COMPOSEUR = DIMENSIONS_VISIBLES.map((d) => d.id);
