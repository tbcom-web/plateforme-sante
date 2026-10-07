// Bibliothèque & retours (/admin/illustrations, migration 0027) : TOUS les assets notables, du picto au modèle de structure.
//
// Inventaire unifié (inventaireAssets), calculé depuis les listes du core :
// - illustrations (inventaireIllustrations, illustrations.ts) : pictos, dessins (relevé, pédagogique), traits continus,
//   matériel, images fixes des animations, héros de thème, éléments de la bibliothèque ;
// - photos : banque intégrée (PHOTOS_INTEGREES = apps/sites/public/photos) et photos des jeux de photos (passées en option,
//   lues dans la table jeux_photos) ;
// - modèles de structure : les 4 structures du parcours (aperçu /modeles-essai/<gabarit>.webp) ;
// - gammes de couleurs (GAMMES).
// Les combinaisons complètes (thème entier) se notent dans l'atelier (/admin/atelier).
//
// Chaque asset a une clé stable (`picto:orthonyxie`, `photo:sport-course`, `modele:clair-pratique`, `gamme:cobalt`…) : notes
// (assets_notes, 0027) et statuts (illustrations_revues / illustrations_statuts, 0021) l'enregistrent. Étiquettes rapides
// adaptées à la famille de l'asset ; synthèse des tendances et retours en Markdown (page et export quotidien vers le dépôt).

import { texteRemarques } from './remarques';
import { CLE_ASSET, clePhoto, statsAssets, typeDeCle, LISSAGE_ASSETS, type TypeAsset } from './assets-poids';
import { inventaireIllustrations, type StatutIllustration } from './illustrations';
import { PHOTOS_INTEGREES } from './jeux-photos';
import { creditPhotoIntegree, libelleCreditIntegree } from './credits-photos';
import { GAMMES } from './gammes';
import { STRUCTURES, LIBELLES_STRUCTURES } from './propositions';
import { universCatalogue } from './catalogue-univers';
import { ETIQUETTES_STUDIO, FAMILLES_COMPOSANTS, LIBELLES_VARIANTES, NOMS_SECTIONS_VARIABLES, ORDRES_ACCUEIL, PAGES_STRUCTURE } from './recettes';
import { JEUX_EFFETS } from './effets';
import { libelleCleTypo, toutesClesTypo } from './typo';
import { libelleCleDetails, toutesClesDetails } from './details';
import { libelleCleMenu, toutesClesMenu } from './menus';
import { VARIANTES_SECTIONS } from './modeles';

export * from './assets-poids';

export const LIBELLES_TYPES_ASSET: Record<TypeAsset, string> = {
  picto: 'Pictos et icônes',
  dessin: 'Dessins',
  ligne: 'Traits continus',
  materiel: 'Matériel',
  animation: 'Animations',
  heros: 'Héros de thème',
  biblio: 'Bibliothèque',
  photo: 'Photos',
  modele: 'Modèles de structure',
  gamme: 'Gammes de couleurs',
  structure: 'Structures de pages',
  effets: 'Jeux d’effets',
  composant: 'Éléments (présentation)',
  typo: 'Typographies',
  details: 'Détails',
  menu: 'Menus',
};

// ---------------------------------------------------------------------------------------------------------------
// Étiquettes rapides par famille
// ---------------------------------------------------------------------------------------------------------------

export type FamilleEtiquettes = 'icone' | 'illustration' | 'photo' | 'modele' | 'gamme' | 'studio';
export type EtiquetteAsset = { id: string; libelle: string; positive: boolean };

/** « Ce qui va bien » (positive) et « Ce qui ne va pas » : deux rangées d'étiquettes cliquables par famille d'asset */
export const ETIQUETTES_ASSETS: Record<FamilleEtiquettes, readonly EtiquetteAsset[]> = {
  icone: [
    { id: 'parfait', libelle: 'Parfait', positive: true },
    { id: 'lisible-petit', libelle: 'Lisible en petit', positive: true },
    { id: 'sens-clair', libelle: 'Sens immédiat', positive: true },
    { id: 'coherent', libelle: 'Cohérent avec les autres', positive: true },
    { id: 'illisible-petit', libelle: 'Illisible en petit', positive: false },
    { id: 'style-different', libelle: 'Style différent', positive: false },
    { id: 'trop-detaille', libelle: 'Trop détaillé', positive: false },
    { id: 'sens-flou', libelle: 'Sens pas clair', positive: false },
    { id: 'trait-epais', libelle: 'Trait trop épais', positive: false },
  ],
  illustration: [
    { id: 'waouh', libelle: 'Waouh', positive: true },
    { id: 'anatomie-juste', libelle: 'Anatomie juste', positive: true },
    { id: 'elegant', libelle: 'Élégant', positive: true },
    { id: 'clair', libelle: 'Se comprend vite', positive: true },
    { id: 'anatomie-fausse', libelle: 'Anatomie fausse', positive: false },
    { id: 'trop-charge', libelle: 'Trop chargé', positive: false },
    { id: 'fade', libelle: 'Fade', positive: false },
    { id: 'clipart', libelle: 'Clipart', positive: false },
    { id: 'style-different', libelle: 'Style différent', positive: false },
    { id: 'illisible-mobile', libelle: 'Illisible sur mobile', positive: false },
  ],
  photo: [
    { id: 'parfaite', libelle: 'Parfaite', positive: true },
    { id: 'naturelle', libelle: 'Naturelle, pas posée', positive: true },
    { id: 'belle-lumiere', libelle: 'Belle lumière', positive: true },
    { id: 'dans-le-sujet', libelle: 'Bien dans le sujet', positive: true },
    { id: 'trop-stock', libelle: 'Trop « stock »', positive: false },
    { id: 'mal-cadree', libelle: 'Mal cadrée', positive: false },
    { id: 'couleurs-fades', libelle: 'Couleurs fades', positive: false },
    { id: 'hors-sujet', libelle: 'Hors sujet', positive: false },
    { id: 'floue', libelle: 'Floue ou trop compressée', positive: false },
  ],
  modele: [
    { id: 'parfait', libelle: 'Parfait', positive: true },
    { id: 'pro', libelle: 'Fait pro', positive: true },
    { id: 'lisible', libelle: 'Lisible', positive: true },
    { id: 'aere', libelle: 'Aéré', positive: true },
    { id: 'trop-charge', libelle: 'Trop chargé', positive: false },
    { id: 'pas-pro', libelle: 'Pas assez pro', positive: false },
    { id: 'illisible-mobile', libelle: 'Illisible sur mobile', positive: false },
    { id: 'fade', libelle: 'Fade', positive: false },
    { id: 'date', libelle: 'Daté', positive: false },
  ],
  gamme: [
    { id: 'parfaite', libelle: 'Parfaite', positive: true },
    { id: 'harmonieuse', libelle: 'Harmonieuse', positive: true },
    { id: 'apaisante', libelle: 'Apaisante', positive: true },
    { id: 'pro', libelle: 'Fait pro', positive: true },
    { id: 'couleurs-jurent', libelle: 'Couleurs qui jurent', positive: false },
    { id: 'fade', libelle: 'Fade', positive: false },
    { id: 'criarde', libelle: 'Criarde', positive: false },
    { id: 'pas-pro', libelle: 'Pas assez pro', positive: false },
    { id: 'contraste-faible', libelle: 'Contraste faible', positive: false },
  ],
  /** Structures de pages, éléments et jeux d'effets (studio de recettes, recettes.ts) */
  studio: ETIQUETTES_STUDIO,
};

/** Famille d'étiquettes d'un type d'asset */
export function familleEtiquettes(t: TypeAsset): FamilleEtiquettes {
  if (t === 'picto') return 'icone';
  if (t === 'structure' || t === 'composant' || t === 'effets' || t === 'typo' || t === 'details' || t === 'menu') return 'studio';
  if (t === 'photo' || t === 'modele' || t === 'gamme') return t;
  return 'illustration';
}

export const etiquettesDuType = (t: TypeAsset) => ETIQUETTES_ASSETS[familleEtiquettes(t)];
export const estEtiquetteDuType = (t: TypeAsset, id: unknown) => etiquettesDuType(t).some((e) => e.id === id);

const TOUTES_ETIQUETTES = new Map(Object.values(ETIQUETTES_ASSETS).flat().map((e) => [e.id, e.libelle]));
export const libelleEtiquetteAsset = (id: string) => TOUTES_ETIQUETTES.get(id) ?? id;

// ---------------------------------------------------------------------------------------------------------------
// Inventaire unifié
// ---------------------------------------------------------------------------------------------------------------

export type RenduAsset =
  | { kind: 'svg'; svg: () => string; svgVariante?: () => string; fond: 'grille' | 'plan' | 'doux' | 'clair'; petit?: boolean }
  | { kind: 'image'; src: string; largeur: number; hauteur: number }
  | { kind: 'gamme'; gamme: string }
  /** Structure de page, élément ou jeu d'effets (studio de recettes) : rendu par l'aperçu de site de l'admin */
  | { kind: 'studio'; cle: string };

export interface Asset {
  cle: string;
  type: TypeAsset;
  titre: string;
  detail?: string;
  /** Fichier ou réglage à retoucher */
  source: string;
  /** Soins ou sujets concernés (filtre) */
  soins: string[];
  statutParDefaut: StatutIllustration;
  rendu: RenduAsset;
}

/** Photo d'un jeu de photos (table jeux_photos) */
export type PhotoDeJeu = {
  url: string; jeu: string; specialite: string; /** Sujet choisi (photos libres « Photos à découvrir ») */ sujet?: string;
  /** Source et licence (sources-photos.ts : photo libre, envoyée avec sa provenance, Adobe Stock, praticien, « Source à renseigner ») */
  credit?: string;
};

const nomFichier = (url: string) => url.split('?')[0].split('/').pop() ?? url;

let base: Asset[] | null = null;

/** Assets toujours présents (code) : illustrations, photos intégrées, modèles, gammes */
function assetsDuCode(): Asset[] {
  if (base) return base;
  const l: Asset[] = inventaireIllustrations().map((i) => ({
    cle: i.cle,
    type: typeDeCle(i.cle) ?? 'dessin',
    titre: i.titre,
    detail: i.detail,
    source: i.source,
    soins: i.soins,
    statutParDefaut: i.statutParDefaut,
    rendu: { kind: 'svg', svg: i.svg, svgVariante: i.svgVariante, fond: i.fond, petit: i.type === 'picto' },
  }));
  for (const url of PHOTOS_INTEGREES) {
    const cle = clePhoto(url)!;
    const nom = cle.slice('photo:'.length);
    l.push({
      // Source et licence affichées sur la carte (bibliothèque, Donner mon avis) : crédit Unsplash typé (credits-photos.ts)
      cle, type: 'photo', titre: nom, detail: 'Banque intégrée',
      source: (() => { const c = creditPhotoIntegree(url); return c ? `${libelleCreditIntegree(c)} — apps/sites/public/photos/${nomFichier(url)}` : `apps/sites/public/photos/${nomFichier(url)} · Source à renseigner`; })(),
      soins: [nom.split('-')[0]], statutParDefaut: 'a_revoir', rendu: { kind: 'image', src: url, largeur: 1600, hauteur: 1067 },
    });
  }
  for (const u of STRUCTURES) {
    const gabarit = universCatalogue(u)?.preReglage.modele ?? u;
    l.push({
      cle: `modele:${u}`, type: 'modele', titre: LIBELLES_STRUCTURES[u], detail: `Structure du parcours · gabarit « ${gabarit} »`,
      source: `packages/core/src/catalogue-univers.ts — '${u}' ; apps/sites (gabarit ${gabarit})`, soins: [],
      statutParDefaut: 'a_revoir', rendu: { kind: 'image', src: `/modeles-essai/${gabarit}.webp`, largeur: 600, hauteur: 1067 },
    });
  }
  for (const g of GAMMES) {
    l.push({
      cle: `gamme:${g.id}`, type: 'gamme', titre: g.nom, detail: `${g.id} · ${g.famille === 'vitaminee' ? 'vitaminée' : 'sobre'}`,
      source: `packages/core/src/gammes.ts — '${g.id}'`, soins: [], statutParDefaut: 'a_revoir', rendu: { kind: 'gamme', gamme: g.id },
    });
  }
  base = l;
  return l;
}

/** Inventaire complet ; `photosJeux` : photos des jeux de photos (stockage), ajoutées après la banque intégrée */
export function inventaireAssets(opts: { photosJeux?: readonly PhotoDeJeu[] } = {}): Asset[] {
  const l = assetsDuCode();
  if (!opts.photosJeux?.length) return l;
  const vues = new Set(l.map((a) => a.cle));
  const ajout: Asset[] = [];
  for (const p of opts.photosJeux) {
    const cle = clePhoto(p.url);
    if (!cle || vues.has(cle)) continue;
    vues.add(cle);
    ajout.push({
      cle, type: 'photo', titre: nomFichier(p.url), detail: `Jeu « ${p.jeu} » (${p.specialite})`, source: `${p.credit ? `${p.credit} — ` : ''}Stockage Supabase « photos » — ${cle.slice(6)}`,
      soins: [p.sujet ?? p.specialite], statutParDefaut: 'a_revoir', rendu: { kind: 'image', src: p.url, largeur: 1600, hauteur: 1067 },
    });
  }
  return ajout.length ? [...l, ...ajout] : l;
}

// ---------------------------------------------------------------------------------------------------------------
// Studio de recettes : structures de pages, éléments, jeux d'effets (tuiles de « Donner mon avis »)
// ---------------------------------------------------------------------------------------------------------------

/** Fichiers à retoucher par famille d'élément (gabarits Astro et aperçu de l'admin) */
const SOURCES_FAMILLES: Record<string, string> = {
  accueil: 'apps/sites/src/components/gabarits/PremierEcran.astro',
  theme: 'apps/sites/src/pages/themes/[theme].astro (page-theme--<variante>) ; apps/admin/src/components/ApercuPages.tsx',
  article: 'apps/sites/src/pages/actualites/[slug].astro (article--<variante>) ; apps/admin/src/components/ApercuPages.tsx',
  soins: 'apps/sites/src/components/gabarits/Soins.astro',
  sujets: 'apps/sites/src/components/SujetsAccueil.astro',
  horaires: 'apps/sites/src/components/gabarits/VenirAuCabinet.astro',
  infos: 'apps/sites/src/components/gabarits/VenirAuCabinet.astro, PlanAcces.astro',
  galerie: 'apps/sites/src/components/gabarits/Accueil.astro (galerie)',
  contact: 'apps/sites/src/components/gabarits/Coquille.astro (c-contact, c-flottant)',
  praticiens: 'apps/sites/src/components/gabarits/Praticiens.astro',
  faq: 'apps/sites/src/components/gabarits/Faq.astro',
  pied: 'apps/sites/src/components/gabarits/Coquille.astro (c-pied)',
  actualites: 'apps/sites/src/components/gabarits/Actus.astro',
  'soins-forme': 'packages/core/src/formes.ts',
};
const libelleVariante = (f: string, v: string) => LIBELLES_VARIANTES[f]?.[v] ?? v;

let studio: Asset[] | null = null;

/**
 * Inventaire du studio (tuiles « Structures de pages », « Éléments » et « Effets » de /admin/retours) : chaque présentation
 * d'élément (`composant:<famille>:<variante>`), chaque structure de page des gabarits tableau, village, revue
 * (`structure:<page>:<ordre et variantes>`, même découpage que clesStructure) et chaque jeu d'effets (`effets:<jeu>`).
 * Hors de la bibliothèque des illustrations (inventaireAssets) : ces éléments ne sont pas des images.
 */
export function inventaireStudio(): Asset[] {
  if (studio) return studio;
  const l: Asset[] = [];
  for (const f of FAMILLES_COMPOSANTS) {
    for (const v of VARIANTES_SECTIONS[f] as readonly string[]) {
      if (f === 'soins-forme' && v === 'gabarit') continue; // « celle du modèle » : pas une forme à juger seule
      l.push({
        cle: `composant:${f}:${v}`, type: 'composant', titre: `${NOMS_SECTIONS_VARIABLES[f] ?? f} : ${libelleVariante(f, v)}`,
        detail: `Élément · ${NOMS_SECTIONS_VARIABLES[f] ?? f}`, source: SOURCES_FAMILLES[f] ?? 'apps/sites/src/components/gabarits', soins: [f],
        statutParDefaut: 'a_revoir', rendu: { kind: 'studio', cle: `composant:${f}:${v}` },
      });
    }
  }
  for (const p of PAGES_STRUCTURE) {
    // Combinaisons des variantes de la page (et de l'ordre de l'accueil) : produit cartésien, dans l'ordre de clesStructure
    const axes: { f: string; valeurs: readonly string[] }[] = [
      ...(p.ordre ? [{ f: 'ordre', valeurs: ORDRES_ACCUEIL.map((o) => o.id as string) }] : []),
      ...p.sections.map((f) => ({ f: f as string, valeurs: VARIANTES_SECTIONS[f] as readonly string[] })),
    ];
    let combos: string[][] = [[]];
    for (const a of axes) combos = combos.flatMap((c) => a.valeurs.map((v) => [...c, v]));
    for (const c of combos) {
      const cle = `structure:${p.id}:${c.join('-')}`;
      const libelles = c.map((v, i) => (axes[i].f === 'ordre' ? ORDRES_ACCUEIL.find((o) => o.id === v)?.nom ?? v : axes.length === 1 ? libelleVariante(axes[i].f, v) : `${NOMS_SECTIONS_VARIABLES[axes[i].f] ?? axes[i].f} ${libelleVariante(axes[i].f, v).toLowerCase()}`));
      l.push({
        cle, type: 'structure', titre: `${p.nom} : ${libelles.join(' · ')}`, detail: `Structure de page · ${p.nom}`,
        source: 'packages/core/src/recettes.ts (PAGES_STRUCTURE) ; apps/sites/src/components/gabarits', soins: [p.id],
        statutParDefaut: 'a_revoir', rendu: { kind: 'studio', cle },
      });
    }
  }
  for (const j of JEUX_EFFETS) {
    l.push({
      cle: `effets:${j.id}`, type: 'effets', titre: `Effets « ${j.nom} »`, detail: j.description,
      source: 'packages/core/src/effets.ts', soins: [], statutParDefaut: 'a_revoir', rendu: { kind: 'studio', cle: `effets:${j.id}` },
    });
  }
  // Habillage (habillage.ts) : chaque paire de polices et chaque valeur de typographie, chaque jeu et élément de détails, chaque
  // menu ; rendus en spécimen (typo, détails) ou en premier écran (menus) par l'aperçu de l'admin
  for (const cle of toutesClesTypo()) l.push({ cle, type: 'typo', titre: libelleCleTypo(cle), detail: 'Typographie', source: 'packages/core/src/typo.ts', soins: [], statutParDefaut: 'a_revoir', rendu: { kind: 'studio', cle } });
  for (const cle of toutesClesDetails()) l.push({ cle, type: 'details', titre: libelleCleDetails(cle), detail: 'Détails', source: 'packages/core/src/details.ts', soins: [], statutParDefaut: 'a_revoir', rendu: { kind: 'studio', cle } });
  for (const cle of toutesClesMenu()) l.push({ cle, type: 'menu', titre: libelleCleMenu(cle), detail: 'Menu', source: 'packages/core/src/menus.ts', soins: [], statutParDefaut: 'a_revoir', rendu: { kind: 'studio', cle } });
  studio = l;
  return l;
}

/** Clé connue de l'inventaire (sans les photos des jeux : celles-ci sont vérifiées à part) */
export const estAssetDuCode = (cle: string) => CLE_ASSET.test(cle) && assetsDuCode().some((a) => a.cle === cle);

/** Titres de l'inventaire du code (synthèse, export) */
export function titresAssets(): Record<string, string> {
  return Object.fromEntries([...assetsDuCode(), ...inventaireStudio()].map((a) => [a.cle, a.detail && a.type !== 'photo' ? `${a.titre} (${a.detail.split(' · ')[0]})` : a.titre]));
}

// ---------------------------------------------------------------------------------------------------------------
// Synthèse des tendances
// ---------------------------------------------------------------------------------------------------------------

export type NoteAssetLue = {
  cle: string; note: number; etiquettes?: readonly string[] | null; commentaire?: string | null;
  /** Champs libres « Ce qui va bien » / « Ce qui ne va pas » (0028) ; `commentaire` reste pour les notes plus anciennes */
  positif?: string | null; negatif?: string | null; le?: string | null;
};

export type StatutAssetLu = { cle: string; statut: StatutIllustration | string; commentaire?: string | null; le?: string | null };

export type LigneSyntheseAsset = { cle: string; titre: string; type: TypeAsset; n: number; moyenne: number; lissee: number; effet: number; etiquettes: [string, number][] };

export type SyntheseAssets = {
  total: number;
  moyenne: number;
  repartition: [number, number, number, number, number];
  parType: { type: TypeAsset; libelle: string; notes: number; assets: number; moyenne: number }[];
  meilleures: LigneSyntheseAsset[];
  pires: LigneSyntheseAsset[];
  etiquettes: { id: string; libelle: string; total: number; assets: { titre: string; nb: number }[] }[];
  aRetravailler: { cle: string; titre: string; commentaire: string | null; le: string | null }[];
  retires: { cle: string; titre: string }[];
  commentaires: { cle: string; titre: string; note: number; etiquettes: string[]; commentaire: string; positif: string | null; negatif: string | null; le: string | null }[];
};

const arr2 = (x: number) => Math.round(x * 100) / 100;

/** Tendances des notes d'assets (tête de /admin/illustrations, Markdown, export quotidien) */
export function syntheseAssets(
  notes: readonly NoteAssetLue[],
  opts: { statuts?: readonly StatutAssetLu[]; titres?: Record<string, string>; nb?: number } = {},
): SyntheseAssets {
  const titre = (cle: string) => opts.titres?.[cle] ?? cle;
  const nb = opts.nb ?? 10;
  const { n, moyenne, cles } = statsAssets(notes);
  const repartition: SyntheseAssets['repartition'] = [0, 0, 0, 0, 0];
  for (const x of notes) if (Number.isInteger(x.note) && x.note >= 1 && x.note <= 5) repartition[x.note - 1]++;
  const lignes: LigneSyntheseAsset[] = [...cles.values()].map((s) => ({
    cle: s.cle, titre: titre(s.cle), type: s.type, n: s.n, moyenne: arr2(s.moyenne), lissee: arr2(s.lissee), effet: s.effet,
    etiquettes: Object.entries(s.etiquettes).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)),
  })).sort((a, b) => b.lissee - a.lissee || b.n - a.n || (a.cle < b.cle ? -1 : 1));
  const parType = [...new Set(lignes.map((l) => l.type))].map((type) => {
    const ls = lignes.filter((l) => l.type === type);
    const notesT = ls.reduce((s, l) => s + l.n, 0);
    return { type, libelle: LIBELLES_TYPES_ASSET[type], notes: notesT, assets: ls.length, moyenne: arr2(ls.reduce((s, l) => s + l.moyenne * l.n, 0) / notesT) };
  }).sort((a, b) => b.notes - a.notes || (a.type < b.type ? -1 : 1));
  const meilleures = lignes.filter((l) => l.effet > 0).slice(0, nb);
  const pires = lignes.filter((l) => l.effet < 0 && !meilleures.includes(l)).slice(-nb).reverse();
  const totaux = new Map<string, number>();
  for (const x of notes) for (const e of new Set(x.etiquettes ?? [])) totaux.set(e, (totaux.get(e) ?? 0) + 1);
  const etiquettes = [...totaux.entries()].map(([id, total]) => ({
    id, libelle: libelleEtiquetteAsset(id), total,
    assets: lignes.map((l) => ({ titre: l.titre, nb: l.etiquettes.find(([e]) => e === id)?.[1] ?? 0 })).filter((x) => x.nb > 0)
      .sort((a, b) => b.nb - a.nb || (a.titre < b.titre ? -1 : 1)).slice(0, 5),
  })).sort((a, b) => b.total - a.total || (a.id < b.id ? -1 : 1));
  const statuts = opts.statuts ?? [];
  const aRetravailler = statuts.filter((s) => s.statut === 'a_retravailler').map((s) => ({ cle: s.cle, titre: titre(s.cle), commentaire: s.commentaire?.trim() || null, le: s.le ?? null }))
    .sort((a, b) => String(b.le ?? '').localeCompare(String(a.le ?? '')) || (a.cle < b.cle ? -1 : 1));
  const retires = statuts.filter((s) => s.statut === 'retire').map((s) => ({ cle: s.cle, titre: titre(s.cle) })).sort((a, b) => (a.cle < b.cle ? -1 : 1));
  const commentaires = notes.filter((x) => texteRemarques(x))
    .slice().sort((a, b) => String(b.le ?? '').localeCompare(String(a.le ?? '')) || (a.cle < b.cle ? -1 : 1)).slice(0, 40)
    .map((x) => ({
      cle: x.cle, titre: titre(x.cle), note: x.note, etiquettes: [...(x.etiquettes ?? [])], commentaire: (x.commentaire ?? '').trim(),
      positif: x.positif?.trim() || null, negatif: x.negatif?.trim() || null, le: x.le ?? null,
    }));
  return { total: n, moyenne: arr2(moyenne), repartition, parType, meilleures, pires, etiquettes, aRetravailler, retires, commentaires };
}

const etoiles = (x: number) => `${x.toFixed(2).replace('.', ',')} ★`;
const etq = (l: [string, number][]) => (l.length ? l.slice(0, 3).map(([id, nb]) => `${libelleEtiquetteAsset(id)} (${nb})`).join(', ') : '—');
const uneLigne = (t: string) => t.replace(/\s+/g, ' ').replace(/\|/g, '/');

/** « Copier mes retours » de la bibliothèque : synthèse en Markdown (à coller à Claude, ou retours/SYNTHESE.md) */
export function markdownAssets(s: SyntheseAssets, opts: { date?: string; titre?: string } = {}): string {
  const l: string[] = [];
  l.push(`${opts.titre ?? '# Retours sur les assets'}${opts.date ? ` (${opts.date})` : ''}`, '');
  l.push(`${s.total} notes, moyenne ${etoiles(s.moyenne)} — répartition : ${s.repartition.map((n, i) => `${i + 1}★ ${n}`).join(', ')}.`, '');
  if (s.parType.length) {
    l.push('### Par type d’asset', '', '| Type | Assets notés | Notes | Moyenne |', '|---|---:|---:|---:|');
    for (const t of s.parType) l.push(`| ${t.libelle} | ${t.assets} | ${t.notes} | ${etoiles(t.moyenne)} |`);
    l.push('');
  }
  const tableau = (titre: string, lignes: LigneSyntheseAsset[]) => {
    if (!lignes.length) return;
    l.push(`### ${titre}`, '', '| Asset | Clé | Notes | Moyenne | Lissée | Étiquettes |', '|---|---|---:|---:|---:|---|');
    for (const x of lignes) l.push(`| ${uneLigne(x.titre)} | \`${x.cle}\` | ${x.n} | ${etoiles(x.moyenne)} | ${etoiles(x.lissee)} | ${etq(x.etiquettes)} |`);
    l.push('');
  };
  tableau('Les mieux notés', s.meilleures);
  tableau('Les moins bien notés', s.pires);
  if (s.etiquettes.length) {
    l.push('### Étiquettes les plus fréquentes', '');
    for (const e of s.etiquettes) l.push(`- **${e.libelle}** (${e.total}) : ${e.assets.map((x) => `${uneLigne(x.titre)} (${x.nb})`).join(' ; ') || '—'}`);
    l.push('');
  }
  if (s.aRetravailler.length) {
    l.push(`### À retravailler (${s.aRetravailler.length})`, '');
    for (const r of s.aRetravailler) l.push(`- \`${r.cle}\` — ${uneLigne(r.titre)} : ${r.commentaire ? uneLigne(r.commentaire) : '(sans commentaire)'}`);
    l.push('');
  }
  if (s.retires.length) {
    l.push(`### Retirés (${s.retires.length})`, '', s.retires.map((r) => `\`${r.cle}\``).join(', '), '');
  }
  if (s.commentaires.length) {
    l.push('### Remarques récentes (ce qui va bien / ce qui ne va pas / commentaire)', '');
    for (const c of s.commentaires) l.push(`- ${c.note}★ \`${c.cle}\` ${uneLigne(c.titre)}${c.etiquettes.length ? ` [${c.etiquettes.map(libelleEtiquetteAsset).join(', ')}]` : ''} : ${texteRemarques(c)}`);
    l.push('');
  }
  l.push(`Formule : moyenne lissée = (somme + ${LISSAGE_ASSETS} × moyenne générale) / (n + ${LISSAGE_ASSETS}) ; « Retiré » et « À retravailler » pénalisent l’asset dans les propositions.`);
  return l.join('\n');
}
