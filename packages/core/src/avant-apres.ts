// Avant / après (demande de Paul, 2026-10-07) : quand un élément noté a été modifié depuis (empreinte différente), l'espace
// « Donner mon avis » et la bibliothèque montrent côte à côte la version notée (« Avant », avec la note et les remarques) et
// la version actuelle (« Après »).
// - À chaque note, un INSTANTANÉ du rendu noté est enregistré (assets_notes.apercu, migration 0028) : SVG minifié (60 Ko au
//   plus) pour les dessins, pictos, héros, animations ; pour les photos et structures l'adresse de l'image ; pour les gammes
//   leurs couleurs (JSON).
// - Pour les notes plus anciennes (sans instantané) : ARCHIVES des rendus d'un commit (scripts/archiver-assets.mjs →
//   apps/admin/public/archives/assets-<commit>.json.gz + index.json), cherchées par clé + empreinte notée.
// Module pur.

import { empreinteSvg } from './illustrations';
import { GAMMES, type Gamme } from './gammes';
import type { Asset } from './assets';
import { cssEffets } from './effets';
import { cssHabillage, normaliserHabillage } from './habillage';
import { cssFormes } from './formes';

export const APERCU_MAX = 60 * 1024;

/** SVG minifié (espaces entre balises et répétés) */
export const minifierSvg = (svg: string) => svg.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();

/**
 * Empreinte d'un élément du studio : sa feuille CSS quand elle vit dans le core (jeu d'effets, forme des cartes), pour que
 * Paul le revoie « modifié » après retouche ; null pour les autres (présentations des gabarits Astro).
 */
export function empreinteStudio(cle: string): string | null {
  const [type, a, b] = cle.split(':');
  if (type === 'effets') { const css = cssEffets(a); return css ? empreinteSvg(css) : null; }
  if (type === 'composant' && a === 'soins-forme') { const css = cssFormes(b); return css ? empreinteSvg(css) : null; }
  // Habillage : la feuille CSS de la valeur (typographie, détails, menu) ; une retouche de la feuille → « Modifié » à revoir
  if (type === 'typo' || type === 'details' || type === 'menu') {
    const h = normaliserHabillage(type === 'typo' ? { typo: { [a]: b } } : type === 'details' ? { details: a === 'jeu' ? { jeu: b } : { [a]: b } } : { menu: { [a]: b } });
    const css = cssHabillage(h, { police: type === 'typo' && a === 'police' ? b : undefined }) + (type === 'typo' && a === 'police' ? b : '');
    return css ? empreinteSvg(css) : null;
  }
  return null;
}

/** Empreinte d'une gamme : ses couleurs (une gamme retouchée change d'empreinte) */
export const empreinteGamme = (g: Gamme) => empreinteSvg(JSON.stringify(g));

/**
 * Empreinte du rendu d'un asset (SVG : celle de son rendu, comme depuis 0027 ; gamme : ses couleurs) ; null pour les photos
 * et les structures (fichiers d'image, suivis par leur adresse).
 */
export function empreinteAsset(a: Asset, svg?: string | null, gammes: readonly Gamme[] = GAMMES): string | null {
  if (a.rendu.kind === 'svg') return empreinteSvg(svg ?? a.rendu.svg());
  if (a.rendu.kind === 'gamme') { const id = a.rendu.gamme; const g = gammes.find((x) => x.id === id); return g ? empreinteGamme(g) : null; }
  if (a.rendu.kind === 'studio') return empreinteStudio(a.rendu.cle);
  return null;
}

export type Instantane =
  | { kind: 'svg'; svg: string }
  | { kind: 'image'; src: string }
  | { kind: 'gamme'; gamme: Gamme };

/** Instantané d'un rendu, sérialisé pour la colonne apercu (null si trop lourd) */
export function instantaneAsset(a: Asset, svg?: string | null, gammes: readonly Gamme[] = GAMMES): string | null {
  if (a.rendu.kind === 'svg') {
    const s = minifierSvg(svg ?? a.rendu.svg());
    return s.length <= APERCU_MAX ? s : null;
  }
  if (a.rendu.kind === 'image') return a.rendu.src.slice(0, 400);
  if (a.rendu.kind === 'studio') return null; // élément du studio : rendu vivant, pas d'instantané
  const id = a.rendu.gamme;
  const g = gammes.find((x) => x.id === id);
  return g ? JSON.stringify(g) : null;
}

/** Instantané relu (colonne apercu ou archive) → rendu affichable */
export function lireInstantane(apercu: string | null | undefined): Instantane | null {
  const t = (apercu ?? '').trim();
  if (!t || t.length > APERCU_MAX) return null;
  if (t.startsWith('<svg')) return { kind: 'svg', svg: t };
  if (t.startsWith('{')) {
    try {
      const g = JSON.parse(t) as Gamme;
      return typeof g.accent === 'string' && typeof g.fond === 'string' ? { kind: 'gamme', gamme: g } : null;
    } catch { return null; }
  }
  if (/^(https?:\/\/|\/)[^\s<>"]+$/.test(t)) return { kind: 'image', src: t };
  return null;
}

/** Archive des rendus d'un commit : clé → { e : empreinte, a : instantané } */
export type ArchiveAssets = { commit: string; date: string; assets: Record<string, { e: string; a: string }> };
export type IndexArchives = { archives: { commit: string; date: string; fichier: string; n: number }[] };

/**
 * Archive d'un inventaire (script archiver-assets) : `inventaire` et `gammes` viennent du code du commit archivé (rendus et
 * couleurs de CETTE version) ; empreintes calculées comme au moment de la note.
 */
export function archiverInventaire(inventaire: readonly Asset[], commit: string, date: string, gammes: readonly Gamme[] = GAMMES): ArchiveAssets {
  const assets: ArchiveAssets['assets'] = {};
  for (const a of inventaire) {
    if (a.rendu.kind === 'image' || a.rendu.kind === 'studio') continue; // photos et structures : l'adresse suffit, le fichier n'est pas archivé
    const svg = a.rendu.kind === 'svg' ? a.rendu.svg() : null;
    const e = empreinteAsset(a, svg, gammes);
    const ap = instantaneAsset(a, svg, gammes);
    if (e && ap) assets[a.cle] = { e, a: ap };
  }
  return { commit, date, assets };
}

/** Rendu « avant » d'une note : son instantané, sinon l'archive dont l'empreinte correspond (la plus récente d'abord) */
export function rendusAvant(note: { cle: string; empreinte: string | null; apercu?: string | null }, archives: readonly ArchiveAssets[]): Instantane | null {
  const direct = lireInstantane(note.apercu);
  if (direct) return direct;
  if (!note.empreinte) return null;
  for (const ar of archives) {
    const x = ar.assets[note.cle];
    if (x && x.e === note.empreinte) return lireInstantane(x.a);
  }
  return null;
}
