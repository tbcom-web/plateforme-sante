// RÈGLES APPRISES DES RETOURS DE PAUL (demande du 2026-10-09 : « que ça s'améliore à chaque fois avec les insights que je donne »).
// Page « Ce que j'ai compris de tes retours » (/admin/retours/compris) ; documentation : docs/politique-evaluation.md.
//
// Les commentaires et étiquettes (Pour / Contre des tuiles et des recettes, zones, « celle qui ne va pas », raisons de refus des
// Arrivages, étiquettes des duels, tickets d'avis de la chaîne) deviennent des RÈGLES appliquées PARTOUT (files d'évaluation,
// générateur, sourcing de photos). Extraction SIMPLE et TRANSPARENTE :
//   1. un CATALOGUE fermé de règles candidates, chacune avec ses déclencheurs (étiquettes + mots-clés du commentaire) et sa cible
//      (attribut mesurable de l'élément : densité du profil d'harmonie, saturation d'une gamme, alertes « visage », « clipart »…) ;
//   2. support = nombre de retours NÉGATIFS qui déclenchent la règle ET portent sur au moins un élément ciblé ; cohérence =
//      support / retours négatifs déclencheurs ; active si support ≥ `supportMin` (3) et cohérence ≥ `coherenceMin` (0,5) ;
//   3. effet = −min(effetMax, 0,15 × support) étoile (plafond par règle 0,75 ★, cumul par élément −1 ★), ou ÉCARTER (photos de
//      visage, texte / marque, anatomie douteuse) ; au plus `maxRegles` (12) règles actives, les mieux soutenues ;
//   4. réversible : « Désactiver » (table regles_apprises_reglages, 0054 ; sans la table, cookie) ; une règle désactivée reste
//      listée, sans effet.
// Mots fréquents des commentaires négatifs non couverts par le catalogue : listés (« pas encore compris »), jamais appliqués.
// Module pur.

import { ETIQUETTES_HARMONIE, type ProfilHarmonie } from './harmonie';
import { gamme as gammeParId } from './gammes';
import { rvb } from './couleurs';

export const REGLAGES_REGLES = { supportMin: 3, coherenceMin: 0.5, parSupport: 0.15, plafondCumule: 1, maxRegles: 12 } as const;

export type AttributsElement = {
  /** Profil d'harmonie (−1 à 1) : c contraste, r rondeur, d densité, e énergie, t température, f formalité */
  profil?: ProfilHarmonie | null;
  /** Saturation (0-1) de la couleur principale (gammes) */
  saturation?: number | null;
  /** Alertes posées par Claude en regardant l'image (propositions-claude-tags.ts) */
  alertes?: readonly string[] | null;
  /** Hashtags du visuel */
  hashtags?: readonly string[] | null;
};

export type ActionRegle = 'penaliser' | 'ecarter';
export type RegleCatalogue = {
  id: string;
  /** « Trop chargé » répété sur des éléments denses */
  constat: string;
  /** « Pénaliser la densité forte » */
  action: string;
  type: ActionRegle;
  effetMax: number;
  /** Ce qui est visé, en clair */
  portee: string;
  etiquettes: readonly string[];
  mots: RegExp;
  cible: (cle: string, a: AttributsElement) => boolean;
  /** Contraintes ajoutées au sourcing de photos quand la règle est active */
  sourcing?: { saturationMax?: number; saturationMin?: number; luminositeMin?: number; motsInterdits?: readonly string[] };
};

const alerte = (a: AttributsElement, ...ids: string[]) => (a.alertes ?? []).some((x) => ids.includes(x));
const tag = (a: AttributsElement, re: RegExp) => (a.hashtags ?? []).some((x) => re.test(x));
const p = (a: AttributsElement, k: keyof ProfilHarmonie) => a.profil?.[k] ?? 0;

export const CATALOGUE_REGLES: readonly RegleCatalogue[] = [
  {
    id: 'densite-forte', constat: '« Trop chargé » répété sur des éléments denses', action: 'Pénaliser la densité forte', type: 'penaliser', effetMax: 0.75,
    portee: 'détails, mises en page, polices et menus au profil dense (densité ≥ 0,35)',
    etiquettes: ['trop-charge', 'trop-detaille', 'trop-chargé'], mots: /trop charg|surcharg|charg[ée]|dense|fouillis|touffu|bourr[ée]|trop de choses|encombr/i,
    cible: (_k, a) => p(a, 'd') >= 0.35,
  },
  {
    id: 'gammes-saturees', constat: '« Couleur criarde » sur des palettes vives', action: 'Pénaliser les gammes saturées', type: 'penaliser', effetMax: 0.75,
    portee: 'gammes dont la couleur principale est très saturée (≥ 0,6) ou « vitaminées » à forte énergie',
    etiquettes: ['couleurs-jurent', 'criard', 'couleur-criarde'], mots: /criard|flashy|fluo|satur|agressi|p[ée]tant|trop vi(f|ve)|jure(nt)?\b|tape[- ]à[- ]l/i,
    cible: (k, a) => (k.startsWith('gamme:') || k.startsWith('photo:')) && ((a.saturation ?? 0) >= 0.6 || (k.startsWith('gamme:') && p(a, 'e') >= 0.6)),
    sourcing: { saturationMax: 0.55 },
  },
  {
    id: 'photos-visage', constat: '« Photo de visage » sur des photos de personnes', action: 'Écarter les photos avec un visage reconnaissable', type: 'ecarter', effetMax: 0.75,
    portee: 'photos signalées « visage reconnaissable » ou étiquetées #visage / #portrait',
    etiquettes: ['visage', 'photo-visage'], mots: /visage|portrait|t[eê]te de|on voit (la|sa) (t[eê]te|figure)|figure|selfie/i,
    cible: (k, a) => k.startsWith('photo:') && (alerte(a, 'visage-reconnaissable') || tag(a, /^(visage|portrait|selfie)/)),
    sourcing: { motsInterdits: ['model', 'posing', 'headshot', 'selfie', 'smile', 'smiling'] },
  },
  {
    id: 'fade', constat: '« Fade » sur des éléments ternes', action: 'Pénaliser les éléments sans énergie ni contraste', type: 'penaliser', effetMax: 0.5,
    portee: 'éléments au profil d’énergie faible (≤ −0,3) et sans contraste ; photos « sombres ou floues »',
    etiquettes: ['fade', 'couleurs-fades'], mots: /\bfade|terne|triste|p[âa]lot|morne|sans relief|plat\b|d[ée]lav/i,
    cible: (k, a) => (k.startsWith('photo:') ? alerte(a, 'sombre-ou-flou') || (a.saturation !== null && a.saturation !== undefined && a.saturation < 0.18) : p(a, 'e') <= -0.3 && p(a, 'c') <= 0.2),
    sourcing: { saturationMin: 0.2, luminositeMin: 0.35 },
  },
  {
    id: 'clipart', constat: '« Clipart » sur des illustrations', action: 'Pénaliser les illustrations au rendu clipart', type: 'penaliser', effetMax: 0.75,
    portee: 'illustrations et icônes signalées « clipart » ou « vieillot »',
    etiquettes: ['clipart'], mots: /clip ?art|cartoon|gnangnan|enfantin|bande dessin|kitsch/i,
    cible: (k, a) => /^(dessin|heros|ligne|picto|materiel|biblio):/.test(k) && alerte(a, 'clipart', 'vieillot'),
  },
  {
    id: 'illisible-mobile', constat: '« Illisible » sur des réglages fins ou petits', action: 'Pénaliser les typographies fines ou modestes', type: 'penaliser', effetMax: 0.5,
    portee: 'échelle modeste, graisse fine, polices très fines (densité ≤ −0,6) ; icônes « illisibles en petit »',
    etiquettes: ['illisible-mobile', 'illisible-petit'], mots: /illisible|trop petit|trop fin|on ne lit pas|se lit mal|pas lisible/i,
    cible: (k, a) => /^typo:(echelle:modeste|graisse:fine)$/.test(k) || (k.startsWith('typo:police:') && p(a, 'd') <= -0.6),
  },
  {
    id: 'texte-marque', constat: '« Texte » ou « marque » visibles sur des photos', action: 'Écarter les photos avec texte, logo ou marque', type: 'ecarter', effetMax: 0.75,
    portee: 'photos signalées « texte, logo ou marque visible »',
    etiquettes: ['texte-marque', 'marque'], mots: /\blogo|marque visible|\bmarque\b|texte (sur|dans)|filigrane|watermark|inscription/i,
    cible: (k, a) => k.startsWith('photo:') && alerte(a, 'texte-ou-marque'),
  },
  {
    id: 'anatomie', constat: '« Anatomie fausse » sur des dessins douteux', action: 'Écarter les visuels à l’anatomie douteuse', type: 'ecarter', effetMax: 0.75,
    portee: 'visuels signalés « anatomie douteuse » par Claude',
    etiquettes: ['anatomie-fausse'], mots: /anatomi|orteil(s)? (en trop|bizarre)|pied bizarre|difforme|six orteils/i,
    cible: (_k, a) => alerte(a, 'anatomie-douteuse'),
  },
  {
    id: 'trop-stock', constat: '« Trop stock » sur des photos posées', action: 'Pénaliser les photos au rendu IA ou trop posées', type: 'penaliser', effetMax: 0.5,
    portee: 'photos signalées « rendu IA suspect » ou étiquetées #stock / #pose',
    etiquettes: ['trop-stock'], mots: /\bstock\b|banque d.images|trop pos[ée]|artificiel|fait ia|rendu ia/i,
    cible: (k, a) => k.startsWith('photo:') && (alerte(a, 'rendu-ia-suspect') || tag(a, /^(stock|pose)/)),
  },
];

/** Étiquettes « négatives » connues (raisons de refus des Arrivages, puces des tuiles) */
export const RAISONS_REFUS: readonly { id: string; libelle: string }[] = [
  { id: 'trop-charge', libelle: 'Trop chargé' },
  { id: 'couleur-criarde', libelle: 'Couleur criarde' },
  { id: 'photo-visage', libelle: 'Photo de visage' },
  { id: 'fade', libelle: 'Fade' },
  { id: 'clipart', libelle: 'Clipart' },
  { id: 'texte-marque', libelle: 'Texte ou marque' },
  { id: 'anatomie-fausse', libelle: 'Anatomie fausse' },
  { id: 'hors-sujet', libelle: 'Hors sujet' },
  { id: 'trop-stock', libelle: 'Trop « stock »' },
];

// ---------------------------------------------------------------------------------------------------------------
// Attributs d'un élément
// ---------------------------------------------------------------------------------------------------------------

/** Clé de l'étiquette d'harmonie d'une clé d'élément (gamme:x, police:x, typo.axe:v, details.el:v, menu.axe:v, v.famille:v…) */
export function cleHarmonie(cle: string): string | null {
  const q = cle.split(':');
  if (q[0] === 'gamme' && q[1]) return `gamme:${q[1]}`;
  if (q[0] === 'typo' && q[1] === 'police' && q[2]) return `police:${q[2]}`;
  if (q[0] === 'typo' && q[1] && q[2]) return `typo.${q[1]}:${q[2]}`;
  if (q[0] === 'details' && q[1] && q[2]) return `details.${q[1]}:${q[2]}`;
  if (q[0] === 'menu' && q[1] && q[2]) return `menu.${q[1]}:${q[2]}`;
  if (q[0] === 'composant' && q[1] && q[2]) return `v.${q[1]}:${q[2]}`;
  if (q[0] === 'effets' && q[1]?.startsWith('photos-')) return `traitement:${q[1].slice(7)}`;
  if (q[0] === 'effets' && q[1]) return `effets:${q[1]}`;
  if (q[0] === 'modele' && q[1]) return `structure:${q[1]}`;
  return null;
}

/** Saturation (TSL, 0-1) d'une couleur hexadécimale */
export function saturationHex(h: string): number {
  const [r, g, b] = rvb(h).map((x) => x / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

/**
 * Attributs d'un élément : profil d'harmonie (table ETIQUETTES_HARMONIE), saturation (gammes : couleur vive, sinon accent), alertes
 * et hashtags fournis (`extra` : propositions de Claude, assets_hashtags), saturation mesurée d'une photo si fournie.
 */
export function attributsDeCle(cle: string, extra?: { alertes?: Readonly<Record<string, readonly string[]>>; hashtags?: Readonly<Record<string, readonly string[]>>; saturations?: Readonly<Record<string, number>> } | null): AttributsElement {
  const h = cleHarmonie(cle);
  const e = h ? ETIQUETTES_HARMONIE[h] : undefined;
  const g = cle.startsWith('gamme:') ? gammeParId(cle.slice(6)) : undefined;
  const sat = g ? saturationHex(g.vif ?? g.accent) : extra?.saturations?.[cle];
  return { profil: e?.p ?? null, saturation: typeof sat === 'number' ? Math.round(sat * 1000) / 1000 : null, alertes: extra?.alertes?.[cle] ?? null, hashtags: extra?.hashtags?.[cle] ?? null };
}

// ---------------------------------------------------------------------------------------------------------------
// Apprentissage
// ---------------------------------------------------------------------------------------------------------------

export type SourceSignal = 'note' | 'recette' | 'duel' | 'grille' | 'arrivage' | 'ticket' | 'kit' | 'atelier';
export type SignalRetour = { cles: readonly string[]; etiquettes?: readonly string[] | null; texte?: string | null; negatif: boolean; source: SourceSignal; le?: string | null };

export type RegleApprise = {
  id: string; constat: string; action: string; type: ActionRegle; portee: string;
  /** Retours négatifs qui déclenchent la règle et visent un élément ciblé ; déclencheurs au total ; contre-exemples (retours positifs sur un élément ciblé) */
  support: number; declencheurs: number; contre: number; coherence: number;
  /** Effet (étoiles, ≤ 0) */
  effet: number;
  exemples: string[];
  sources: SourceSignal[];
  active: boolean; desactivee: boolean;
  depuis: string | null;
};

/** Le retour déclenche-t-il la règle (étiquette, ou mot-clé du commentaire) ? */
export const declenche = (r: Pick<RegleCatalogue, 'etiquettes' | 'mots'>, s: Pick<SignalRetour, 'etiquettes' | 'texte'>) =>
  (s.etiquettes ?? []).some((e) => r.etiquettes.includes(e)) || Boolean(s.texte && r.mots.test(s.texte));

/**
 * Règles apprises des retours : pour chaque règle du catalogue, support, cohérence, effet et exemples ; `active` si les seuils sont
 * atteints, la règle n'est pas désactivée et fait partie des `maxRegles` mieux soutenues. Triées : actives d'abord, puis support.
 */
export function apprendreRegles(signaux: readonly SignalRetour[], attributs: (cle: string) => AttributsElement, o: { desactivees?: ReadonlySet<string> | readonly string[]; reglages?: Partial<typeof REGLAGES_REGLES> } = {}): RegleApprise[] {
  const R = { ...REGLAGES_REGLES, ...(o.reglages ?? {}) };
  const off = new Set(o.desactivees ?? []);
  const cacheA = new Map<string, AttributsElement>();
  const attr = (k: string) => { let a = cacheA.get(k); if (!a) { a = attributs(k); cacheA.set(k, a); } return a; };
  const l = CATALOGUE_REGLES.map((r): RegleApprise => {
    let support = 0, declencheurs = 0, contre = 0;
    const exemples = new Map<string, number>();
    const sources = new Set<SourceSignal>();
    let depuis: string | null = null;
    for (const s of signaux) {
      const cibles = s.cles.filter((k) => r.cible(k, attr(k)));
      if (!s.negatif) { if (cibles.length && (s.etiquettes ?? []).some((e) => /waouh|parfait|elegant|harmonieux|lisible|pro\b/.test(e))) contre++; continue; }
      if (!declenche(r, s)) continue;
      declencheurs++;
      if (!cibles.length) continue;
      support++;
      sources.add(s.source);
      for (const k of cibles) exemples.set(k, (exemples.get(k) ?? 0) + 1);
      if (s.le && (!depuis || s.le > depuis)) depuis = s.le;
    }
    const coherence = declencheurs ? support / (declencheurs + 0.5 * contre) : 0;
    const effet = -Math.min(r.effetMax, R.parSupport * support);
    return {
      id: r.id, constat: r.constat, action: r.action, type: r.type, portee: r.portee, support, declencheurs, contre, coherence: Math.round(coherence * 100) / 100,
      effet: Math.round(effet * 100) / 100, exemples: [...exemples.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 6).map(([k]) => k),
      sources: [...sources].sort(), active: false, desactivee: off.has(r.id), depuis,
    };
  });
  const eligibles = l.filter((r) => r.support >= R.supportMin && r.coherence >= R.coherenceMin && !r.desactivee).sort((a, b) => b.support - a.support || b.coherence - a.coherence).slice(0, R.maxRegles);
  for (const r of eligibles) r.active = true;
  return l.sort((a, b) => Number(b.active) - Number(a.active) || b.support - a.support || (a.id < b.id ? -1 : 1));
}

/** Effet cumulé des règles actives sur un élément (≥ −plafondCumule) ; `ecarte` si une règle « écarter » le vise */
export function effetRegles(cle: string, regles: readonly RegleApprise[], attributs: (cle: string) => AttributsElement): { effet: number; ecarte: boolean; raisons: string[] } {
  let effet = 0, ecarte = false;
  const raisons: string[] = [];
  const a = attributs(cle);
  for (const r of regles) {
    if (!r.active) continue;
    const c = CATALOGUE_REGLES.find((x) => x.id === r.id);
    if (!c || !c.cible(cle, a)) continue;
    raisons.push(r.id);
    if (r.type === 'ecarter') ecarte = true;
    effet += r.effet;
  }
  return { effet: Math.max(-REGLAGES_REGLES.plafondCumule, Math.round(effet * 100) / 100), ecarte, raisons };
}

/** Pénalités (étoiles) et écartements des règles actives sur une liste de clés (seulement les clés touchées) */
export function penalitesRegles(cles: Iterable<string>, regles: readonly RegleApprise[], attributs: (cle: string) => AttributsElement): { penalites: Record<string, number>; ecartes: string[] } {
  const penalites: Record<string, number> = {};
  const ecartes: string[] = [];
  if (!regles.some((r) => r.active)) return { penalites, ecartes };
  for (const k of cles) {
    const e = effetRegles(k, regles, attributs);
    if (e.effet < 0) penalites[k] = e.effet;
    if (e.ecarte) ecartes.push(k);
  }
  return { penalites, ecartes };
}

/** Contraintes du sourcing de photos selon les règles actives (saturation, luminosité, mots interdits en plus) */
export function contraintesSourcing(regles: readonly RegleApprise[]): { saturationMax: number | null; saturationMin: number | null; luminositeMin: number | null; motsInterdits: string[]; regles: string[] } {
  const actives = regles.filter((r) => r.active).map((r) => CATALOGUE_REGLES.find((c) => c.id === r.id)).filter((c): c is RegleCatalogue => Boolean(c?.sourcing));
  const min = (l: (number | undefined)[]) => { const v = l.filter((x): x is number => typeof x === 'number'); return v.length ? Math.min(...v) : null; };
  const max = (l: (number | undefined)[]) => { const v = l.filter((x): x is number => typeof x === 'number'); return v.length ? Math.max(...v) : null; };
  return {
    saturationMax: min(actives.map((c) => c.sourcing!.saturationMax)), saturationMin: max(actives.map((c) => c.sourcing!.saturationMin)), luminositeMin: max(actives.map((c) => c.sourcing!.luminositeMin)),
    motsInterdits: [...new Set(actives.flatMap((c) => c.sourcing!.motsInterdits ?? []))], regles: actives.map((c) => c.id),
  };
}

/** Une photo analysée respecte-t-elle les contraintes apprises ? (raison sinon) */
export function respecteContraintes(car: { saturation?: number | null; luminosite?: number | null }, mots: readonly string[], c: ReturnType<typeof contraintesSourcing>): string | null {
  if (c.saturationMax !== null && typeof car.saturation === 'number' && car.saturation > c.saturationMax) return 'gammes-saturees';
  if (c.saturationMin !== null && typeof car.saturation === 'number' && car.saturation < c.saturationMin) return 'fade';
  if (c.luminositeMin !== null && typeof car.luminosite === 'number' && car.luminosite < c.luminositeMin) return 'fade';
  if (c.motsInterdits.some((m) => mots.includes(m))) return 'photos-visage';
  return null;
}

const MOTS_VIDES = new Set(['trop', 'pas', 'tres', 'plus', 'moins', 'est', 'sont', 'les', 'des', 'une', 'un', 'le', 'la', 'de', 'du', 'et', 'en', 'au', 'aux', 'que', 'qui', 'je', 'on', 'il', 'elle', 'ca', 'ce', 'cette', 'cest', 'avec', 'sans', 'pour', 'par', 'sur', 'dans', 'mais', 'bien', 'peu', 'assez', 'fait', 'faire', 'comme', 'aussi', 'tout', 'tous', 'rien', 'ici', 'pas', 'ne', 'se', 'sa', 'son', 'ses', 'mon', 'ma', 'mes', 'nous', 'vous', 'leur', 'y', 'a', 'l', 'd', 'j', 'n', 'c', 'qu', 'si', 'ou', 'donc', 'car', 'etre', 'avoir', 'encore', 'deja', 'vraiment']);

/** Mots fréquents des commentaires NÉGATIFS (≥ `min` occurrences), avec « couvert » si une règle du catalogue les comprend */
export function motsFrequents(signaux: readonly SignalRetour[], o: { min?: number; max?: number } = {}): { mot: string; n: number; couvert: boolean }[] {
  const n = new Map<string, number>();
  for (const s of signaux) {
    if (!s.negatif || !s.texte) continue;
    const mots = new Set(s.texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter((m) => m.length >= 4 && !MOTS_VIDES.has(m)));
    for (const m of mots) n.set(m, (n.get(m) ?? 0) + 1);
  }
  return [...n.entries()].filter(([, v]) => v >= (o.min ?? 3)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, o.max ?? 12)
    .map(([mot, v]) => ({ mot, n: v, couvert: CATALOGUE_REGLES.some((r) => r.mots.test(mot)) }));
}

/** Retours de Paul → signaux pour l'apprentissage des règles (notes, recettes, duels, grilles, expositions, tickets) */
export function signauxDepuisRetours(o: {
  notes?: readonly { cle: string; note: number; etiquettes?: readonly string[] | null; texte?: string | null; le?: string | null }[];
  recettes?: readonly { cles: readonly string[]; note: number | null; contre?: readonly string[] | null; texte?: string | null; le?: string | null }[];
  duels?: readonly { perdant: readonly string[]; gagnant: readonly string[]; mauvais: boolean; etiquettes?: readonly string[] | null; texte?: string | null; le?: string | null }[];
  expositions?: readonly { cle: string; resultat: string; etiquettes?: readonly string[] | null; texte?: string | null; le?: string | null; surface?: string }[];
  tickets?: readonly { cles: readonly string[]; etiquette?: string | null; texte?: string | null; le?: string | null }[];
}): SignalRetour[] {
  const l: SignalRetour[] = [];
  for (const n of o.notes ?? []) l.push({ cles: [n.cle], etiquettes: n.etiquettes ?? null, texte: n.texte ?? null, negatif: n.note <= 2, source: 'note', le: n.le ?? null });
  for (const r of o.recettes ?? []) l.push({ cles: r.cles, etiquettes: r.contre ?? null, texte: r.texte ?? null, negatif: (r.note ?? 3) <= 2 || Boolean(r.contre?.length), source: 'recette', le: r.le ?? null });
  for (const d of o.duels ?? []) {
    if (d.mauvais) l.push({ cles: [...d.perdant, ...d.gagnant], etiquettes: d.etiquettes ?? null, texte: d.texte ?? null, negatif: true, source: 'duel', le: d.le ?? null });
    else if (d.etiquettes?.length || d.texte) l.push({ cles: d.perdant, etiquettes: d.etiquettes ?? null, texte: d.texte ?? null, negatif: true, source: 'duel', le: d.le ?? null });
  }
  for (const e of o.expositions ?? []) {
    if (e.resultat !== 'refuse' && e.resultat !== 'pire' && !(e.etiquettes?.length || e.texte)) continue;
    l.push({ cles: [e.cle], etiquettes: e.etiquettes ?? null, texte: e.texte ?? null, negatif: e.resultat === 'refuse' || e.resultat === 'pire' || e.resultat === 'ignore', source: e.surface === 'arrivages' ? 'arrivage' : e.surface === 'kits' ? 'kit' : 'grille', le: e.le ?? null });
  }
  for (const t of o.tickets ?? []) l.push({ cles: t.cles, etiquettes: t.etiquette ? [t.etiquette] : null, texte: t.texte ?? null, negatif: true, source: 'ticket', le: t.le ?? null });
  return l;
}
