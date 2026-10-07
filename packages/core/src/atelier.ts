// Atelier des propositions (/admin/atelier, super admin) : Paul fait défiler les combinaisons du générateur (propositions.ts),
// exactement comme le parcours les produit, et les note (1 à 5 étoiles, étiquettes rapides, commentaire facultatif).
// Ce module : étiquettes, ingrédients d'une proposition, synthèse des tendances et retours en Markdown.
// L'apprentissage lui-même (lissage, bonus) est dans atelier-poids.ts. Module pur.

import { clesAtelier, ingredientsCanoniques, statsAtelier, type IngredientsAtelier, type NoteAtelier, type StatCleAtelier } from './atelier-poids';
import { gamme as gammeParId } from './gammes';
import { LIBELLES_ANIMATIONS, type Animation } from './packs';
import {
  couleurPreferee, LIBELLES_STRUCTURES, LIBELLES_STYLES, REGLES_THEMES, type EntreePropositions, type Proposition, type StyleIllustration, type Structure,
} from './propositions';
import { themeParId } from './themes';
import { texteRemarques } from './remarques';
import { clePhoto } from './assets-poids';

export * from './atelier-poids';

// ---------------------------------------------------------------------------------------------------------------
// Étiquettes rapides
// ---------------------------------------------------------------------------------------------------------------

export const ETIQUETTES_ATELIER = [
  { id: 'waouh', libelle: 'Waouh', positive: true },
  { id: 'fade', libelle: 'Fade', positive: false },
  { id: 'couleurs-jurent', libelle: 'Couleurs qui jurent', positive: false },
  { id: 'illustration-petite', libelle: 'Illustration trop petite', positive: false },
  { id: 'trop-charge', libelle: 'Trop chargé', positive: false },
  { id: 'pas-pro', libelle: 'Pas assez pro', positive: false },
  { id: 'illisible-mobile', libelle: 'Illisible sur mobile', positive: false },
  { id: 'hors-sujet', libelle: 'Ne correspond pas au sujet', positive: false },
  // « Ce qui va bien » (espace « Donner mon avis », /admin/retours, 2026-10-07) : après les 8 historiques (raccourcis t + 1-8)
  { id: 'pro', libelle: 'Fait pro', positive: true },
  { id: 'harmonieux', libelle: 'Harmonieux', positive: true },
  { id: 'bien-dans-le-sujet', libelle: 'Bien dans le sujet', positive: true },
  { id: 'lisible', libelle: 'Lisible', positive: true },
] as const;
export type EtiquetteAtelier = (typeof ETIQUETTES_ATELIER)[number]['id'];
export const estEtiquetteAtelier = (x: unknown): x is EtiquetteAtelier => ETIQUETTES_ATELIER.some((e) => e.id === x);
export const libelleEtiquette = (id: string) => ETIQUETTES_ATELIER.find((e) => e.id === id)?.libelle ?? id;

// ---------------------------------------------------------------------------------------------------------------
// Ingrédients d'une proposition
// ---------------------------------------------------------------------------------------------------------------

/** Sujets pris en compte par le générateur (actifs, avec règles), dans l'ordre */
export function sujetsPris(e: EntreePropositions): string[] {
  const ids = [...(e.priorites?.principaux ?? []), ...(e.priorites?.secondaires ?? [])];
  return [...new Set(ids)].filter((id) => themeParId(id)?.statut === 'actif' && REGLES_THEMES[id]);
}

/** Ingrédients notés d'une proposition, dans son scénario (sujets, couleurs) */
export function ingredientsProposition(p: Proposition, e: EntreePropositions, photos: readonly string[] = []): IngredientsAtelier {
  const themes = sujetsPris(e);
  return ingredientsCanoniques({
    structure: p.univers,
    gamme: p.gamme,
    style: p.style,
    registre: p.registre,
    modeVisuel: p.modeVisuel,
    animation: p.animation,
    heros: p.heros,
    theme1: themes[0] ?? 'cabinet',
    themes,
    couleurs: (e.couleursPreferees ?? []).filter((c) => couleurPreferee(c)).slice(0, 3),
    proposition: p.id,
    // Photos réellement montrées (style « photos ») : clés de la banque, la note porte aussi sur elles
    ...(p.modeVisuel === 'photos' && photos.length ? { photos: photos.map(clePhoto).filter((k): k is string => Boolean(k)) } : {}),
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Libellés
// ---------------------------------------------------------------------------------------------------------------

const NOMS_DIMENSIONS: Record<string, string> = {
  structure: 'Structure', gamme: 'Gamme', style: 'Style', animation: 'Animation', theme1: 'Sujet n° 1', combinaison: 'Combinaison',
};

/** Libellé lisible d'une valeur d'ingrédient */
export function libelleValeur(dim: string, v: string): string {
  if (v === 'aucune') return dim === 'animation' ? 'image fixe' : 'aucun';
  switch (dim) {
    case 'structure': return LIBELLES_STRUCTURES[v as Structure] ?? v;
    case 'gamme': return gammeParId(v)?.nom ?? v;
    case 'style': return LIBELLES_STYLES[v as StyleIllustration]?.nom ?? v;
    case 'animation': return (LIBELLES_ANIMATIONS[v as Animation] ?? v).split(' ').slice(0, 3).join(' ');
    case 'theme1': return v === 'cabinet' ? 'Sans sujet' : themeParId(v)?.court ?? v;
    case 'combinaison': return libelleCombinaison(v);
    default: return v;
  }
}

/** « Sport · Technique et précis · Cobalt · Relevé · coureur » à partir d'un identifiant de proposition */
export function libelleCombinaison(id: string): string {
  const [t, u, g, s, a] = id.split('~');
  return [libelleValeur('theme1', t ?? ''), libelleValeur('structure', u ?? ''), libelleValeur('gamme', g ?? ''), libelleValeur('style', s ?? ''), a && a !== '0' ? libelleValeur('animation', a) : null]
    .filter(Boolean).join(' · ');
}

/** Libellé d'une clé d'agrégation (`structure=…&gamme=…`) */
export function libelleCleAtelier(cle: string): string {
  const parts = cle.split('&').map((x) => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)] as const; });
  if (parts.length === 1) {
    const [d, v] = parts[0];
    return d === 'combinaison' ? libelleCombinaison(v) : `${NOMS_DIMENSIONS[d] ?? d} : ${libelleValeur(d, v)}`;
  }
  return `${parts.map(([d]) => NOMS_DIMENSIONS[d] ?? d).join(' × ')} : ${parts.map(([d, v]) => libelleValeur(d, v)).join(' × ')}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Synthèse des tendances
// ---------------------------------------------------------------------------------------------------------------

export type NoteAtelierLue = NoteAtelier & { commentaire?: string | null; positif?: string | null; negatif?: string | null; le?: string | null };

export type LigneSyntheseAtelier = {
  cle: string; libelle: string; n: number; moyenne: number; lissee: number; effet: number;
  /** Étiquettes les plus fréquentes : [id, nombre] */
  etiquettes: [string, number][];
};

export type SyntheseAtelier = {
  total: number;
  moyenne: number;
  repartition: [number, number, number, number, number];
  /** Ingrédients seuls, du mieux au moins bien noté (lissé) */
  ingredients: LigneSyntheseAtelier[];
  paires: LigneSyntheseAtelier[];
  combinaisons: LigneSyntheseAtelier[];
  /** Pour chaque étiquette : total et ingrédients où elle revient le plus (part des notes de l'ingrédient) */
  etiquettes: { id: string; libelle: string; total: number; ingredients: { libelle: string; nb: number; part: number }[] }[];
  /** Derniers commentaires */
  commentaires: { combinaison: string; note: number; etiquettes: string[]; commentaire: string; positif: string | null; negatif: string | null; le: string | null }[];
};

const ligne = (s: StatCleAtelier): LigneSyntheseAtelier => ({
  cle: s.cle,
  libelle: libelleCleAtelier(s.cle),
  n: s.n,
  moyenne: Math.round(s.moyenne * 100) / 100,
  lissee: Math.round(s.lissee * 100) / 100,
  effet: s.effet,
  etiquettes: Object.entries(s.etiquettes).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)),
});

/** Tendances de l'atelier (tableau en tête de /admin/atelier, retours en Markdown) */
export function syntheseAtelier(notes: readonly NoteAtelierLue[]): SyntheseAtelier {
  const { n, moyenne, cles } = statsAtelier(notes);
  const repartition: SyntheseAtelier['repartition'] = [0, 0, 0, 0, 0];
  for (const x of notes) if (Number.isInteger(x.note) && x.note >= 1 && x.note <= 5) repartition[x.note - 1]++;
  const tri = (a: LigneSyntheseAtelier, b: LigneSyntheseAtelier) => b.lissee - a.lissee || b.n - a.n || (a.cle < b.cle ? -1 : 1);
  const toutes = [...cles.values()].map(ligne);
  const ingredients = toutes.filter((l) => cles.get(l.cle)!.type === 'ingredient').sort(tri);
  const etiquettes = ETIQUETTES_ATELIER.map((e) => {
    const total = notes.filter((x) => x.etiquettes?.includes(e.id)).length;
    const parIngredient = ingredients
      .map((l) => ({ libelle: l.libelle, nb: l.etiquettes.find(([id]) => id === e.id)?.[1] ?? 0, n: l.n }))
      .filter((x) => x.nb > 0)
      .map((x) => ({ libelle: x.libelle, nb: x.nb, part: Math.round((x.nb / x.n) * 100) / 100 }))
      .sort((a, b) => b.nb - a.nb || b.part - a.part || (a.libelle < b.libelle ? -1 : 1))
      .slice(0, 4);
    return { id: e.id, libelle: e.libelle, total, ingredients: parIngredient };
  }).filter((e) => e.total > 0).sort((a, b) => b.total - a.total);
  const commentaires = notes
    .filter((x) => texteRemarques(x))
    .slice()
    .sort((a, b) => String(b.le ?? '').localeCompare(String(a.le ?? '')))
    .slice(0, 30)
    .map((x) => ({
      combinaison: libelleCombinaison(String(x.ingredients.proposition ?? '')), note: x.note, etiquettes: [...(x.etiquettes ?? [])],
      commentaire: (x.commentaire ?? '').trim(), positif: x.positif?.trim() || null, negatif: x.negatif?.trim() || null, le: x.le ?? null,
    }));
  return {
    total: n,
    moyenne: Math.round(moyenne * 100) / 100,
    repartition,
    ingredients,
    paires: toutes.filter((l) => cles.get(l.cle)!.type === 'paire').sort(tri),
    combinaisons: toutes.filter((l) => cles.get(l.cle)!.type === 'combinaison').sort(tri),
    etiquettes,
    commentaires,
  };
}

/** Meilleures et pires lignes (au moins `min` notes), sans chevauchement */
export function extremesAtelier(l: readonly LigneSyntheseAtelier[], nb = 5, min = 1): { meilleures: LigneSyntheseAtelier[]; pires: LigneSyntheseAtelier[] } {
  const f = l.filter((x) => x.n >= min);
  const meilleures = f.filter((x) => x.effet > 0).slice(0, nb);
  const pires = f.filter((x) => x.effet < 0 && !meilleures.includes(x)).slice(-nb).reverse();
  return { meilleures, pires };
}

const etoiles = (x: number) => `${x.toFixed(2).replace('.', ',')} ★`;
const effet = (x: number) => `${x > 0 ? '+' : ''}${x.toFixed(2).replace('.', ',')}`;
const etq = (l: [string, number][]) => (l.length ? l.slice(0, 3).map(([id, nb]) => `${libelleEtiquette(id)} (${nb})`).join(', ') : '—');

/** « Copier mes retours » : synthèse en Markdown, à coller à Claude pour corriger les règles ou faire retoucher des illustrations */
export function markdownAtelier(s: SyntheseAtelier, opts: { date?: string } = {}): string {
  const l: string[] = [];
  l.push(`# Retours de l’atelier des propositions${opts.date ? ` (${opts.date})` : ''}`, '');
  l.push(`${s.total} notes, moyenne ${etoiles(s.moyenne)} — répartition : ${s.repartition.map((n, i) => `${i + 1}★ ${n}`).join(', ')}.`, '');
  const tableau = (titre: string, lignes: LigneSyntheseAtelier[]) => {
    if (!lignes.length) return;
    l.push(`## ${titre}`, '', '| Élément | Notes | Moyenne | Lissée | Effet | Étiquettes |', '|---|---:|---:|---:|---:|---|');
    for (const x of lignes) l.push(`| ${x.libelle} | ${x.n} | ${etoiles(x.moyenne)} | ${etoiles(x.lissee)} | ${effet(x.effet)} | ${etq(x.etiquettes)} |`);
    l.push('');
  };
  const ing = extremesAtelier(s.ingredients, 8);
  tableau('Ingrédients les mieux notés', ing.meilleures);
  tableau('Ingrédients les moins bien notés', ing.pires);
  const pai = extremesAtelier(s.paires, 8, 2);
  tableau('Associations à garder (paires)', pai.meilleures);
  tableau('Associations à revoir (paires)', pai.pires);
  const com = extremesAtelier(s.combinaisons, 8);
  tableau('Combinaisons préférées', com.meilleures);
  tableau('Combinaisons ratées', com.pires);
  if (s.etiquettes.length) {
    l.push('## Étiquettes les plus fréquentes', '');
    for (const e of s.etiquettes) l.push(`- **${e.libelle}** (${e.total}) : ${e.ingredients.map((x) => `${x.libelle} — ${x.nb} fois (${Math.round(x.part * 100)} %)`).join(' ; ') || '—'}`);
    l.push('');
  }
  if (s.commentaires.length) {
    l.push('## Commentaires', '');
    for (const c of s.commentaires) l.push(`- ${c.note}★ ${c.combinaison}${c.etiquettes.length ? ` [${c.etiquettes.map(libelleEtiquette).join(', ')}]` : ''} : ${texteRemarques(c)}`);
    l.push('');
  }
  l.push('Formule : moyenne lissée = (somme + K × moyenne générale) / (n + K), K = 10 par ingrédient, 12 par paire, 6 par combinaison ; effet = lissée − moyenne générale.');
  return l.join('\n');
}

/** Clés d'agrégation lisibles d'une combinaison (affichage de la composition notée) */
export const clesLisiblesAtelier = (i: Partial<IngredientsAtelier>) => clesAtelier(i).map((c) => ({ ...c, libelle: libelleCleAtelier(c.cle) }));
