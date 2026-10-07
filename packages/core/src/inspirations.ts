// Inspirations (demande de Paul, 2026-10-07 : « la clé de mon business, des illustrations, icônes et images vraiment belles
// pour communiquer sur les thèmes des patients »). Paul ajoute une image de référence (fichier ou capture collée, lien
// facultatif), dit ce qui lui plaît (étiquettes), ce qu'on veut en tirer, et l'associe à un sujet et/ou un type d'élément.
// L'image reste dans un stockage PRIVÉ (bucket « inspirations », lecture admin, URL signées) : RÉFÉRENCE D'INSPIRATION
// UNIQUEMENT, jamais copiée ni réutilisée sur les sites.
//
// Ce module est pur : étiquettes, validation, quantification de la palette dominante (pixels RVBA → 5-6 couleurs),
// palettes récurrentes entre inspirations et gammes CANDIDATES (contrastes AA vérifiés par verifierGamme). Une gamme
// candidate n'est JAMAIS ajoutée automatiquement aux gammes : c'est une proposition pour Paul et Claude.

import { contraste, distance, hex, rvb } from './couleurs';
import { NEUTRES } from './charte';
import { GAMMES, verifierGamme, type Gamme } from './gammes';
import { estSujetVisuel, SUJETS_VISUELS } from './photos-libres';

export const REGLE_INSPIRATIONS = 'Référence d’inspiration uniquement : jamais copiée ni réutilisée sur les sites.';

// ---------------------------------------------------------------------------------------------------------------
// Étiquettes, types, validation
// ---------------------------------------------------------------------------------------------------------------

/** « Ce qui plaît » */
export const ETIQUETTES_INSPIRATION: readonly { id: string; libelle: string }[] = [
  { id: 'couleurs', libelle: 'Couleurs' },
  { id: 'composition', libelle: 'Composition' },
  { id: 'typographie', libelle: 'Typographie' },
  { id: 'style-illustration', libelle: 'Style d’illustration' },
  { id: 'ambiance', libelle: 'Ambiance' },
  { id: 'mise-en-page-mobile', libelle: 'Mise en page mobile' },
  { id: 'icones', libelle: 'Icônes' },
];

/** Type d'élément visé */
export const TYPES_ELEMENT_INSPIRATION: readonly { id: string; libelle: string }[] = [
  { id: 'illustration', libelle: 'Illustration' },
  { id: 'icone', libelle: 'Icône' },
  { id: 'photo', libelle: 'Photo' },
  { id: 'animation', libelle: 'Animation' },
  { id: 'palette', libelle: 'Couleurs' },
  { id: 'typographie', libelle: 'Typographie' },
  { id: 'mise-en-page', libelle: 'Mise en page' },
  { id: 'reseaux-sociaux', libelle: 'Publication réseaux sociaux' },
];

export const OBJECTIF_MAX = 500;
export const PALETTE_MAX = 6;

export type CouleurPalette = { hex: string; part: number };

export type InspirationSaisie = {
  etiquettes: string[];
  objectif: string;
  sujet: string | null;
  typeElement: string | null;
  lien: string | null;
  palette: CouleurPalette[];
};

const HEX = /^#[0-9a-f]{6}$/;

/** Palette nettoyée : 6 couleurs au plus, #rrggbb minuscules, parts entre 0 et 1 */
export function normaliserPalette(brut: unknown): CouleurPalette[] {
  const l = Array.isArray(brut) ? brut : [];
  return l
    .map((c) => ({ hex: String((c as CouleurPalette)?.hex ?? '').toLowerCase(), part: Number((c as CouleurPalette)?.part) }))
    .filter((c) => HEX.test(c.hex) && Number.isFinite(c.part) && c.part >= 0 && c.part <= 1)
    .map((c) => ({ hex: c.hex, part: Math.round(c.part * 1000) / 1000 }))
    .slice(0, PALETTE_MAX);
}

/** Lien facultatif : http(s) seulement, 500 caractères au plus */
export function normaliserLien(brut: unknown): string | null {
  const t = typeof brut === 'string' ? brut.trim() : '';
  if (!t || t.length > 500) return null;
  try { const u = new URL(t); return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null; } catch { return null; }
}

/** Domaine d'un lien (export public : jamais l'adresse complète) */
export const domaineDuLien = (lien: string | null | undefined) => {
  if (!lien) return null;
  try { return new URL(lien).hostname.replace(/^www\./, ''); } catch { return null; }
};

/** Contrôle d'une inspiration saisie ; au moins une étiquette ou un objectif, un sujet ou un type facultatifs */
export function validerInspiration(brut: Partial<Record<keyof InspirationSaisie, unknown>>): { inspiration: InspirationSaisie | null; erreurs: string[] } {
  const etiquettes = [...new Set((Array.isArray(brut.etiquettes) ? brut.etiquettes : []).filter((e): e is string => ETIQUETTES_INSPIRATION.some((x) => x.id === e)))];
  const objectif = String(brut.objectif ?? '').replace(/\s+/g, ' ').trim().slice(0, OBJECTIF_MAX);
  const sujet = estSujetVisuel(brut.sujet) ? brut.sujet : null;
  const typeElement = TYPES_ELEMENT_INSPIRATION.some((t) => t.id === brut.typeElement) ? String(brut.typeElement) : null;
  const lien = normaliserLien(brut.lien);
  const palette = normaliserPalette(brut.palette);
  const erreurs: string[] = [];
  if (!etiquettes.length && !objectif) erreurs.push('Dites ce qui vous plaît (une étiquette au moins) ou ce qu’on veut en tirer.');
  if (brut.lien && String(brut.lien).trim() && !lien) erreurs.push('Lien invalide (adresse http ou https).');
  return erreurs.length ? { inspiration: null, erreurs } : { inspiration: { etiquettes, objectif, sujet, typeElement, lien, palette }, erreurs };
}

// ---------------------------------------------------------------------------------------------------------------
// Quantification de la palette dominante
// ---------------------------------------------------------------------------------------------------------------

/**
 * Palette dominante d'une image : pixels RVBA (ImageData.data, image réduite côté navigateur), regroupés par cases de
 * 4 bits par canal, puis cases voisines fusionnées (distance perceptive < `seuil`), les `n` groupes les plus présents.
 * Pixels transparents ignorés ; couleurs négligeables (moins de `partMin`, 1 % par défaut : lissage des bords) écartées.
 * Déterministe, sans dépendance.
 */
export function quantifierPalette(pixels: ArrayLike<number>, opts: { n?: number; seuil?: number; pas?: number; partMin?: number } = {}): CouleurPalette[] {
  const nb = Math.max(1, Math.min(PALETTE_MAX, opts.n ?? 6));
  const seuil = opts.seuil ?? 56;
  const pas = Math.max(1, Math.floor(opts.pas ?? 1));
  const cases = new Map<number, [number, number, number, number]>();
  let total = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4 * pas) {
    if (pixels[i + 3] < 128) continue;
    const r = pixels[i], v = pixels[i + 1], b = pixels[i + 2];
    const k = ((r >> 4) << 8) | ((v >> 4) << 4) | (b >> 4);
    const c = cases.get(k);
    if (c) { c[0] += r; c[1] += v; c[2] += b; c[3]++; } else cases.set(k, [r, v, b, 1]);
    total++;
  }
  if (!total) return [];
  // Cases les plus peuplées d'abord ; clé en second critère (ordre stable, résultat reproductible)
  const triees = [...cases.entries()].sort((a, b) => b[1][3] - a[1][3] || a[0] - b[0]).map(([, c]) => c);
  const groupes: { somme: [number, number, number]; n: number; hex: string }[] = [];
  for (const [r, v, b, k] of triees) {
    const h = hex([r / k, v / k, b / k]);
    const g = groupes.find((x) => distance(x.hex, h) < seuil);
    if (g) {
      g.somme[0] += r; g.somme[1] += v; g.somme[2] += b; g.n += k;
      g.hex = hex([g.somme[0] / g.n, g.somme[1] / g.n, g.somme[2] / g.n]);
    } else groupes.push({ somme: [r, v, b], n: k, hex: h });
  }
  const min = (opts.partMin ?? 0.01) * total;
  return groupes
    .filter((g) => g.n >= min)
    .sort((a, b) => b.n - a.n)
    .slice(0, nb)
    .map((g) => ({ hex: g.hex, part: Math.round((g.n / total) * 1000) / 1000 }));
}

// ---------------------------------------------------------------------------------------------------------------
// Teinte, saturation, luminosité (dérivés des gammes candidates)
// ---------------------------------------------------------------------------------------------------------------

export function tslDe(c: string): [number, number, number] {
  const [r, v, b] = rvb(c).map((x) => x / 255);
  const max = Math.max(r, v, b), min = Math.min(r, v, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const t = max === r ? (v - b) / d + (v < b ? 6 : 0) : max === v ? (b - r) / d + 2 : (r - v) / d + 4;
  return [t / 6, s, l];
}
export function depuisTsl(t: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (x: number) => {
    const u = x < 0 ? x + 1 : x > 1 ? x - 1 : x;
    return u < 1 / 6 ? p + (q - p) * 6 * u : u < 1 / 2 ? q : u < 2 / 3 ? p + (q - p) * (2 / 3 - u) * 6 : p;
  };
  return hex([f(t + 1 / 3), f(t), f(t - 1 / 3)].map((x) => x * 255));
}

/** Couleur « chromatique » : assez saturée et ni presque blanche ni presque noire (candidate à l'accent) */
export const estChromatique = (c: string) => { const [, s, l] = tslDe(c); return s >= 0.22 && l >= 0.12 && l <= 0.88; };

// ---------------------------------------------------------------------------------------------------------------
// Palettes récurrentes et gammes candidates
// ---------------------------------------------------------------------------------------------------------------

export type InspirationPalette = { id: string; palette: readonly CouleurPalette[]; sujet?: string | null };

export type CouleurRecurrente = { hex: string; inspirations: number; part: number; sujets: string[] };

/**
 * Couleurs qui reviennent d'une inspiration à l'autre : couleurs des palettes (part ≥ 4 %) regroupées par proximité
 * (distance < `seuil`), triées par nombre d'inspirations puis par part cumulée. `min` : nombre minimal d'inspirations.
 */
export function palettesRecurrentes(inspirations: readonly InspirationPalette[], opts: { seuil?: number; min?: number } = {}): CouleurRecurrente[] {
  const seuil = opts.seuil ?? 64;
  const min = opts.min ?? 2;
  const couleurs = inspirations.flatMap((i) => normaliserPalette(i.palette).filter((c) => c.part >= 0.04).map((c) => ({ ...c, id: i.id, sujet: i.sujet ?? null })));
  couleurs.sort((a, b) => b.part - a.part || a.hex.localeCompare(b.hex));
  const groupes: { r: number; v: number; b: number; poids: number; hex: string; ids: Set<string>; sujets: Set<string> }[] = [];
  for (const c of couleurs) {
    const [r, v, b] = rvb(c.hex);
    let g = groupes.find((x) => distance(x.hex, c.hex) < seuil);
    if (!g) { g = { r: 0, v: 0, b: 0, poids: 0, hex: c.hex, ids: new Set(), sujets: new Set() }; groupes.push(g); }
    g.r += r * c.part; g.v += v * c.part; g.b += b * c.part; g.poids += c.part;
    g.hex = hex([g.r / g.poids, g.v / g.poids, g.b / g.poids]);
    g.ids.add(c.id);
    if (c.sujet) g.sujets.add(c.sujet);
  }
  return groupes
    .filter((g) => g.ids.size >= min)
    .sort((a, b) => b.ids.size - a.ids.size || b.poids - a.poids)
    .map((g) => ({ hex: g.hex, inspirations: g.ids.size, part: Math.round(g.poids * 1000) / 1000, sujets: [...g.sujets].sort() }));
}

/** Assombrit (luminosité seule, saturation plafonnée) jusqu'à `min` contre chacun des `fonds` */
function foncer(c: string, fonds: readonly string[], min: number): string {
  const [t, s0, l0] = tslDe(c);
  const s = Math.min(s0, 0.8);
  let x = c;
  for (let l = l0; l > 0.04 && Math.min(...fonds.map((f) => contraste(x, f))) < min; l -= 0.01) x = depuisTsl(t, s, l);
  return x;
}
/** Éclaircit jusqu'à `min` contre `fond` */
function eclaircir(c: string, fond: string, min: number): string {
  const [t, s] = tslDe(c);
  let l = Math.max(tslDe(c)[2], 0.55);
  let x = depuisTsl(t, s, l);
  for (; l < 0.97 && contraste(x, fond) < min; l += 0.01) x = depuisTsl(t, s, l);
  return x;
}

export type GammeCandidate = {
  gamme: Gamme;
  /** Défauts AA (verifierGamme) : vide = conforme */
  defauts: string[];
  conforme: boolean;
  /** Couleurs récurrentes d'origine (accent, accompagnement) */
  origine: string[];
  inspirations: number;
  /** Gamme existante la plus proche (accent) et distance : une candidate trop proche n'apporte rien */
  proche: { id: string; nom: string; distance: number };
};

/**
 * Gamme candidate tirée d'une couleur récurrente (accent) et, si possible, d'une seconde (signal) : accent assombri jusqu'au
 * texte blanc lisible (4,5:1) et lisible sur les fonds, fonds très clairs de la même teinte, plan sombre, signal éclairci
 * jusqu'à 4,5:1 sur le plan. Contrôlée par verifierGamme (mêmes règles AA que les gammes du code).
 */
export function gammeDepuisCouleurs(accentBrut: string, second: string | null, id: string, nom: string): Gamme {
  const [t, s] = tslDe(accentBrut);
  const fond = depuisTsl(t, Math.min(s, 0.3), 0.985);
  const fondDoux = depuisTsl(t, Math.min(s, 0.35), 0.945);
  const accent = foncer(foncer(accentBrut, [NEUTRES.blanc], 4.6), [fond, fondDoux, NEUTRES.blanc], 4.6);
  const [ta, sa, la] = tslDe(accent);
  const accentFonce = foncer(depuisTsl(ta, sa, Math.max(0.08, la - 0.1)), [NEUTRES.blanc], 4.6);
  const plan = depuisTsl(t, Math.min(s, 0.5), 0.14);
  const signal = eclaircir(second && estChromatique(second) ? second : accentBrut, plan, 4.6);
  return { id, nom, accent, accentFonce, fond, fondDoux, plan, signal, famille: 'sobre' };
}

/** Gammes candidates (3 au plus) tirées des couleurs récurrentes chromatiques ; jamais ajoutées automatiquement */
export function gammesCandidates(recurrentes: readonly CouleurRecurrente[], max = 3): GammeCandidate[] {
  const chromatiques = recurrentes.filter((c) => estChromatique(c.hex));
  const res: GammeCandidate[] = [];
  for (const c of chromatiques) {
    if (res.length >= max) break;
    // Deux candidates trop proches : une seule
    if (res.some((r) => distance(r.origine[0], c.hex) < 90)) continue;
    const second = chromatiques.find((x) => x !== c && distance(x.hex, c.hex) >= 120)?.hex ?? null;
    const id = `candidate-${c.hex.slice(1)}`;
    const gamme = gammeDepuisCouleurs(c.hex, second, id, `Candidate ${res.length + 1}`);
    const defauts = verifierGamme(gamme);
    const plus = [...GAMMES].map((g) => ({ id: g.id, nom: g.nom, distance: Math.round(distance(g.accent, gamme.accent)) })).sort((a, b) => a.distance - b.distance)[0];
    res.push({ gamme, defauts, conforme: defauts.length === 0, origine: [c.hex, ...(second ? [second] : [])], inspirations: c.inspirations, proche: plus });
  }
  return res;
}

/** Code TypeScript d'une gamme candidate (à coller dans gammes.ts après décision de Paul) */
export function codeGamme(g: Gamme): string {
  return `{ id: '${g.id}', nom: '${g.nom}', accent: '${g.accent}', accentFonce: '${g.accentFonce}', fond: '${g.fond}', fondDoux: '${g.fondDoux}', plan: '${g.plan}', signal: '${g.signal}' },`;
}

// ---------------------------------------------------------------------------------------------------------------
// Export (dépôt public) et synthèse
// ---------------------------------------------------------------------------------------------------------------

export type LigneInspiration = {
  etiquettes: string[] | null;
  objectif: string | null;
  sujet: string | null;
  type_element: string | null;
  lien: string | null;
  palette: unknown;
  created_at: string;
};

export type InspirationExportee = {
  jour: string | null;
  sujet: string | null;
  type: string | null;
  etiquettes: string[];
  objectif: string | null;
  palette: CouleurPalette[];
  /** Domaine du lien seulement (jamais l'adresse complète, jamais l'image ni une URL signée) */
  domaine: string | null;
};

export function inspirationPourExport(l: LigneInspiration): InspirationExportee {
  return {
    jour: typeof l.created_at === 'string' ? l.created_at.slice(0, 10) : null,
    sujet: estSujetVisuel(l.sujet) ? l.sujet : null,
    type: TYPES_ELEMENT_INSPIRATION.some((t) => t.id === l.type_element) ? l.type_element : null,
    etiquettes: (l.etiquettes ?? []).filter((e) => ETIQUETTES_INSPIRATION.some((x) => x.id === e)),
    objectif: typeof l.objectif === 'string' && l.objectif.trim() ? l.objectif.trim() : null,
    palette: normaliserPalette(l.palette),
    domaine: domaineDuLien(l.lien),
  };
}

/** Synthèse Markdown des inspirations (retours/SYNTHESE.md) */
export function markdownInspirations(l: readonly InspirationExportee[], opts: { titre?: string } = {}): string {
  const lignes = [opts.titre ?? '## Inspirations', ''];
  if (!l.length) return [...lignes, 'Aucune inspiration pour l’instant.'].join('\n');
  lignes.push(`${l.length} inspiration${l.length > 1 ? 's' : ''}. ${REGLE_INSPIRATIONS}`, '');
  const compte = (cles: (string | null)[]) => {
    const m = new Map<string, number>();
    for (const c of cles) if (c) m.set(c, (m.get(c) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const libE = (id: string) => ETIQUETTES_INSPIRATION.find((e) => e.id === id)?.libelle ?? id;
  const libS = (id: string) => SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? id;
  lignes.push(`Ce qui plaît : ${compte(l.flatMap((x) => x.etiquettes)).map(([e, n]) => `${libE(e)} (${n})`).join(', ') || '—'}`);
  lignes.push(`Sujets : ${compte(l.map((x) => x.sujet)).map(([s, n]) => `${libS(s)} (${n})`).join(', ') || '—'}`);
  const objectifs = l.filter((x) => x.objectif).slice(-8);
  if (objectifs.length) {
    lignes.push('', 'Ce qu’on veut en tirer (les plus récents) :');
    for (const x of objectifs) lignes.push(`- ${x.jour ?? ''}${x.sujet ? ` · ${libS(x.sujet)}` : ''} : ${x.objectif}`);
  }
  const rec = palettesRecurrentes(l.map((x, i) => ({ id: String(i), palette: x.palette, sujet: x.sujet })));
  lignes.push('', `Couleurs récurrentes : ${rec.slice(0, 8).map((c) => `${c.hex} (${c.inspirations})`).join(', ') || 'pas encore (il faut au moins deux inspirations proches)'}`);
  const cand = gammesCandidates(rec);
  if (cand.length) {
    lignes.push('', 'Gammes candidates (proposition, jamais ajoutées automatiquement) :');
    for (const c of cand) lignes.push(`- ${c.gamme.nom} ${c.conforme ? '(AA conforme)' : `(${c.defauts.length} défaut(s) AA)`}, proche de « ${c.proche.nom} » : \`${codeGamme(c.gamme)}\``);
  }
  return lignes.join('\n');
}
