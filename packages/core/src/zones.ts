// Zones signalées sur un rendu noté (demande de Paul du 2026-10-07 : « un sélectionneur de zone sur les illustrations, images,
// rendus… pour identifier les zones à revoir »).
//
// Paul trace un rectangle ou une ellipse sur l'aperçu (AnnotateurZones, admin), y ajoute une étiquette rapide et un commentaire
// court ; plusieurs zones numérotées par élément. Les coordonnées sont NORMALISÉES (0 à 1) par rapport à la surface notée, pour
// rester justes quelle que soit la taille d'affichage ; chaque zone garde l'appareil du rendu (ordinateur ou mobile).
// Le lot de zones porte son contexte : appareil, empreinte de l'élément noté, type de page et largeur de rendu pour une page.
// Enregistré avec la note (colonne jsonb `zones` de assets_notes, atelier_notes, recettes_notes, defauts_mobile ; migration 0034),
// exporté dans retours/ (JSON et une ligne par zone dans SYNTHESE.md) et dessiné en surimpression (svgSurimpression) dans
// l'avant / après de l'admin et dans les PNG de scripts/rendre-assets.mjs (--zones).
// Module pur.

import type { AppareilRetour } from './rendu-mobile';

export const FORMES_ZONE = ['rect', 'ellipse'] as const;
export type FormeZone = (typeof FORMES_ZONE)[number];

/** Étiquettes rapides d'une zone */
export const ETIQUETTES_ZONE = [
  { id: 'a-revoir', libelle: 'À revoir' },
  { id: 'anatomie', libelle: 'Anatomie' },
  { id: 'trop-petit', libelle: 'Trop petit' },
  { id: 'couleur', libelle: 'Couleur' },
  { id: 'texte', libelle: 'Texte' },
  { id: 'alignement', libelle: 'Mal aligné' },
  { id: 'coupe', libelle: 'Coupé' },
  // Studio de recettes, « À améliorer » (2026-10-08) : étiquettes rapides des zones de page (studio-organisation.ts)
  { id: 'trop-charge', libelle: 'Trop chargé' },
  { id: 'illisible', libelle: 'Illisible' },
  { id: 'image', libelle: 'Image' },
  { id: 'espacement', libelle: 'Espacement' },
  { id: 'typo', libelle: 'Typographie' },
] as const;
export type EtiquetteZone = (typeof ETIQUETTES_ZONE)[number]['id'];
export const estEtiquetteZone = (x: unknown): x is EtiquetteZone => ETIQUETTES_ZONE.some((e) => e.id === x);
export const libelleEtiquetteZone = (id: string) => ETIQUETTES_ZONE.find((e) => e.id === id)?.libelle ?? id;

/** Une zone : position et taille normalisées (0 à 1, origine en haut à gauche de la surface notée) */
export type Zone = {
  forme: FormeZone;
  x: number;
  y: number;
  l: number;
  h: number;
  etiquette: EtiquetteZone;
  commentaire: string;
  appareil: Exclude<AppareilRetour, 'les-deux'>;
};

/** Lot de zones d'une note, avec son contexte */
export type ZonesNote = {
  appareil: AppareilRetour;
  /** Empreinte de l'élément noté (8 caractères hexadécimaux) ou adresse d'image ; null si inconnue */
  empreinte: string | null;
  /** Type de page (studio, pages) */
  page?: string | null;
  /** Largeur de rendu en pixels (pages : 1280 ordinateur, 390 téléphone) */
  largeur?: number | null;
  zones: Zone[];
};

export const LIMITES_ZONES = { zones: 12, commentaire: 200, tailleMin: 0.01 } as const;

const arrondi = (x: number) => Math.round(x * 10000) / 10000;
const borne = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x));

/**
 * Zone à partir d'un tracé en pixels (coins de départ et d'arrivée, dans n'importe quel sens) sur une surface de `largeur` ×
 * `hauteur` pixels : coordonnées normalisées, bornées à la surface, arrondies au dix-millième ; null si la zone est trop petite.
 */
export function zoneDepuisPixels(
  a: { x: number; y: number }, b: { x: number; y: number }, largeur: number, hauteur: number,
  autres: Partial<Pick<Zone, 'forme' | 'etiquette' | 'commentaire' | 'appareil'>> = {},
): Zone | null {
  if (!(largeur > 0) || !(hauteur > 0)) return null;
  const x0 = borne(Math.min(a.x, b.x) / largeur), x1 = borne(Math.max(a.x, b.x) / largeur);
  const y0 = borne(Math.min(a.y, b.y) / hauteur), y1 = borne(Math.max(a.y, b.y) / hauteur);
  if (x1 - x0 < LIMITES_ZONES.tailleMin || y1 - y0 < LIMITES_ZONES.tailleMin) return null;
  return normaliserZone({ forme: 'rect', etiquette: 'a-revoir', commentaire: '', appareil: 'ordinateur', ...autres, x: x0, y: y0, l: x1 - x0, h: y1 - y0 });
}

/** Déplace une zone (décalage normalisé), sans sortir de la surface */
export function deplacerZone(z: Zone, dx: number, dy: number): Zone {
  return { ...z, x: arrondi(borne(z.x + dx, 0, 1 - z.l)), y: arrondi(borne(z.y + dy, 0, 1 - z.h)) };
}

/** Zone reçue (formulaire, base) : forme vérifiée, valeurs bornées ; invalide → null */
export function normaliserZone(brut: unknown): Zone | null {
  if (!brut || typeof brut !== 'object') return null;
  const o = brut as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
  let x = n(o.x), y = n(o.y), l = n(o.l), h = n(o.h);
  if ([x, y, l, h].some(Number.isNaN)) return null;
  x = borne(x); y = borne(y);
  l = borne(l, 0, 1 - x); h = borne(h, 0, 1 - y);
  if (l < LIMITES_ZONES.tailleMin || h < LIMITES_ZONES.tailleMin) return null;
  return {
    forme: o.forme === 'ellipse' ? 'ellipse' : 'rect',
    x: arrondi(x), y: arrondi(y), l: arrondi(l), h: arrondi(h),
    etiquette: estEtiquetteZone(o.etiquette) ? o.etiquette : 'a-revoir',
    commentaire: typeof o.commentaire === 'string' ? o.commentaire.replace(/\s+/g, ' ').trim().slice(0, LIMITES_ZONES.commentaire) : '',
    appareil: o.appareil === 'mobile' ? 'mobile' : 'ordinateur',
  };
}

/** Lot de zones reçu : contexte vérifié, 12 zones au plus ; aucun ou invalide → null (rien n'est enregistré) */
export function normaliserZones(brut: unknown): ZonesNote | null {
  if (!brut || typeof brut !== 'object') return null;
  const o = brut as Record<string, unknown>;
  const zones = (Array.isArray(o.zones) ? o.zones : []).map(normaliserZone).filter((z): z is Zone => z !== null).slice(0, LIMITES_ZONES.zones);
  if (!zones.length) return null;
  const appareil: AppareilRetour = o.appareil === 'mobile' || o.appareil === 'ordinateur' ? o.appareil : 'les-deux';
  const empreinte = typeof o.empreinte === 'string' && /^[0-9a-f]{8}$/.test(o.empreinte) ? o.empreinte : null;
  const page = typeof o.page === 'string' && /^[a-z-]{2,30}$/.test(o.page) ? o.page : null;
  const largeur = typeof o.largeur === 'number' && Number.isInteger(o.largeur) && o.largeur >= 200 && o.largeur <= 4000 ? o.largeur : null;
  return { appareil, empreinte, ...(page ? { page } : {}), ...(largeur ? { largeur } : {}), zones };
}

/** Forme stockée (colonne jsonb `zones`) : clés dans un ordre stable */
export function serialiserZones(z: ZonesNote | null): string | null {
  const n = normaliserZones(z);
  if (!n) return null;
  return JSON.stringify({
    appareil: n.appareil, empreinte: n.empreinte, ...(n.page ? { page: n.page } : {}), ...(n.largeur ? { largeur: n.largeur } : {}),
    zones: n.zones.map((x) => ({ forme: x.forme, x: x.x, y: x.y, l: x.l, h: x.h, etiquette: x.etiquette, commentaire: x.commentaire, appareil: x.appareil })),
  });
}

/** Position lisible d'une zone : « en haut à droite », « au centre », « en bas » */
export function positionZone(z: Pick<Zone, 'x' | 'y' | 'l' | 'h'>): string {
  const cx = z.x + z.l / 2, cy = z.y + z.h / 2;
  const v = cy < 1 / 3 ? 'haut' : cy > 2 / 3 ? 'bas' : '';
  const hz = cx < 1 / 3 ? 'gauche' : cx > 2 / 3 ? 'droite' : '';
  if (!v && !hz) return 'au centre';
  if (!v) return `à ${hz}`;
  if (!hz) return `en ${v}`;
  return `en ${v} à ${hz}`;
}

/** Ligne de synthèse : « zone 2 en haut à droite (mobile) : anatomie — « le pouce est trop long » » */
export function ligneZone(z: Zone, i: number): string {
  return `zone ${i + 1} ${positionZone(z)}${z.appareil === 'mobile' ? ' (mobile)' : ''} : ${libelleEtiquetteZone(z.etiquette).toLowerCase()}${z.commentaire ? ` — « ${z.commentaire} »` : ''}`;
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Surimpression SVG des zones (admin : avant / après, rendu mobile à revoir ; scripts/rendre-assets.mjs --zones) : contour
 * orange en pointillés épais, voile léger, pastille numérotée. `largeur` × `hauteur` : taille de la surface en pixels.
 */
export function svgSurimpression(zones: readonly Zone[], largeur: number, hauteur: number, opts: { couleur?: string } = {}): string {
  const c = opts.couleur ?? '#ff5a1f';
  const r = Math.max(10, Math.round(Math.min(largeur, hauteur) * 0.028));
  const trait = Math.max(2, Math.round(r / 4));
  const formes = zones.map((z, i) => {
    const x = z.x * largeur, y = z.y * hauteur, l = z.l * largeur, h = z.h * hauteur;
    const contour = z.forme === 'ellipse'
      ? `<ellipse cx="${(x + l / 2).toFixed(1)}" cy="${(y + h / 2).toFixed(1)}" rx="${(l / 2).toFixed(1)}" ry="${(h / 2).toFixed(1)}"`
      : `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${l.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(8, l / 6).toFixed(1)}"`;
    const px = Math.min(largeur - r, Math.max(r, x)), py = Math.min(hauteur - r, Math.max(r, y));
    return `<g>${contour} fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-width="${trait}" stroke-dasharray="${trait * 3} ${trait * 2}"/>`
      + `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r}" fill="${c}" stroke="#fff" stroke-width="${Math.max(1, trait / 2)}"/>`
      + `<text x="${px.toFixed(1)}" y="${(py + r * 0.36).toFixed(1)}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="${Math.round(r * 1.05)}" fill="#fff">${i + 1}</text>`
      + `<title>${esc(ligneZone(z, i))}</title></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} ${hauteur}" width="${largeur}" height="${hauteur}" aria-hidden="true">${formes}</svg>`;
}

/** Lignes Markdown d'un lot de zones (SYNTHESE.md) */
export const lignesZones = (z: ZonesNote | null | undefined): string[] => (z?.zones ?? []).map((x, i) => ligneZone(x, i));
