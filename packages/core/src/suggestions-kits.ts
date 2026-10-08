// Compléter un KIT D'IMAGES : COUCHE 2 (assemblage) à partir de la COUCHE 1 (curation) — demande de Paul du 2026-10-08 : « d'abord on
// curate les bonnes images, ensuite à partir des images curated on assemble ».
// - Couche 1 (curation) : Photos à découvrir, tri par sujet, notes, /admin/photos. Une photo entre dans le VIVIER CURÉ d'un sujet
//   quand Paul l'a retenue ET étiquetée avec ce sujet (kits-images.ts, estCuree / vivierCure), jamais si elle est exclue.
// - Couche 2 (assemblage) : les kits et « Compléter ce kit » ne piochent QUE dans ce vivier. Suggestions par emplacement
//   (suggestionsVivier), dans cet ordre : (1) notées ≥ 4 ★ avec le hashtag de l'emplacement, (2) notées ≥ 3,5 ★ du sujet, (3) non
//   encore notées (notation rapide en ligne), (4) notées entre 2 et 3,5 ★ ; vivier épuisé : (6) photos notées ≥ 4 ★ du même sujet
//   IMPLICITE pas encore rattachées (« Rattacher et utiliser ») ; seulement ensuite : (5) vivier d'un sujet VOISIN, signalé.
//   Une photo gardée non importée est proposée avec « Importer et utiliser » (même import que /admin/photos).
// - Vivier insuffisant pour un emplacement : « Trouver des photos » ouvre Photos à découvrir (couche 1) sur le sujet, avec les requêtes
//   ciblées de l'emplacement (REQUETES_SOINS…) et le hashtag de l'emplacement pré-coché.
// Pur, sans réseau.

import { libelleEmplacement, libelleSujetKit, photosARattacher, vivierCure, type DonneesKits, type KitImages } from './kits-images';

/** Requêtes ciblées (anglais) par soin du catalogue ; toujours des pieds, des ongles, des chaussures ou un cabinet de soin */
export const REQUETES_SOINS: Readonly<Record<string, readonly string[]>> = {
  'bilan-podologique': ['foot pressure plate analysis', 'podiatrist examining foot', 'gait analysis treadmill feet'],
  'semelles-orthopediques': ['custom insoles fitting', 'orthotic insoles shoes', 'foot scan insoles'],
  'soins-de-pedicurie': ['pedicure care feet clinic', 'podiatrist foot care', 'foot care treatment'],
  'pied-diabetique': ['diabetic foot care', 'foot examination monofilament', 'diabetic socks feet'],
  'podologie-du-sport': ['runner feet shoes', 'sport shoes running track', 'athlete foot taping'],
  'podologie-enfant': ['child feet walking', 'kids shoes first steps', 'toddler barefoot walking'],
  'podologie-du-senior': ['senior feet comfortable shoes', 'elderly walking shoes', 'senior foot care'],
  'verrues-plantaires': ['plantar wart foot', 'foot sole skin care', 'sole of foot closeup'],
  'ongle-incarne': ['ingrown toenail care', 'toenail care podiatry', 'big toe nail'],
  'douleur-talon': ['heel pain foot', 'heel stretch plantar fascia', 'foot heel massage'],
  laser: ['laser foot treatment', 'toenail laser therapy', 'foot clinic laser'],
  'k-taping': ['kinesiology tape ankle', 'ankle taping athlete', 'foot kinesio tape'],
  orthonyxie: ['toenail brace', 'ingrown toenail care', 'toenail correction'],
  onychoplastie: ['toenail reconstruction', 'toenail repair care', 'healthy toenails closeup'],
  orthoplastie: ['toe silicone orthosis', 'toe separator silicone', 'hammer toe care'],
  'mycose-ongles': ['toenail fungus care', 'toenail treatment', 'foot nail care'],
  'cors-durillons': ['foot corn callus care', 'callus removal foot', 'foot skin care pumice'],
  'ongles-epais': ['thick toenail care', 'toenail grinding podiatry', 'toenail care tools'],
  'soins-a-domicile': ['home foot care elderly', 'podiatrist home visit feet', 'foot care at home'],
};

/** Requêtes des emplacements de page, par sujet (premier écran, page sujet) et pour le cabinet */
export const REQUETES_PAGES: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  accueil: {
    enfant: ['child barefoot grass', 'kids feet playing'], sport: ['trail running shoes', 'runner feet sunrise'], senior: ['senior walking shoes park', 'elderly feet walking'],
    diabete: ['healthy feet care', 'foot care clinic'], ongles: ['healthy toenails feet', 'foot spa care'], semelles: ['insoles shoes closeup', 'footprint sand'],
    pedicurie: ['podiatrist foot clinic', 'foot care treatment'], general: ['barefoot feet grass', 'feet walking path'],
  },
  'page-sujet': {
    enfant: ['kids shoes', 'baby first steps feet'], sport: ['running shoes track', 'hiking boots trail'], senior: ['comfortable shoes senior', 'senior foot care'],
    diabete: ['diabetic foot examination', 'foot moisturizer care'], ongles: ['toenail care', 'pedicure tools'], semelles: ['orthotic insoles', 'shoe fitting feet'],
    pedicurie: ['foot care clinic', 'podiatry instruments sterilized'], general: ['feet walking', 'foot care'],
  },
};
export const REQUETES_CABINET: readonly string[] = ['podiatry clinic interior', 'foot clinic treatment chair', 'medical clinic waiting room', 'podiatrist office'];

/** Mots qui garantissent le métier : chaque requête en contient au moins un */
export const MOTS_METIER = ['foot', 'feet', 'toe', 'toenail', 'nail', 'heel', 'sole', 'plantar', 'insole', 'shoe', 'shoes', 'boots', 'barefoot', 'footprint', 'ankle', 'podiatr', 'pedicure', 'gait', 'clinic', 'running', 'runner', 'walking'];

/** Requêtes d'un emplacement d'un kit (soin : celles du soin ; sinon celles de la page pour le sujet ; cabinet) */
export function requetesEmplacement(sujet: string, emplacement: string): string[] {
  if (emplacement.startsWith('soin:')) return [...(REQUETES_SOINS[emplacement.slice(5)] ?? [`${emplacement.slice(5).replace(/-/g, ' ')} foot care`])];
  if (emplacement === 'cabinet') return [...REQUETES_CABINET];
  return [...(REQUETES_PAGES[emplacement]?.[sujet] ?? REQUETES_PAGES[emplacement]?.general ?? ['foot care'])];
}

/** Hashtag qui étiquette une photo pour un emplacement (#<slug du soin>, #accueil, #cabinet, #page-sujet) */
export const hashtagEmplacement = (emplacement: string) => (emplacement.startsWith('soin:') ? emplacement.slice(5) : emplacement);
/** Hashtag des photos gardées pour un kit (/admin/photos : « pour le kit Enfant · orthonyxie ») */
export const hashtagKit = (sujet: string) => `kit-${sujet}`;

/** Lecture des hashtags d'une photo gardée pour un kit : sujet et emplacement ; null si aucune */
export function etiquetteKit(hashtags: readonly string[]): { sujet: string; emplacement: string | null; libelle: string } | null {
  const k = hashtags.find((h) => h.startsWith('kit-'));
  if (!k) return null;
  const sujet = k.slice(4);
  const autre = hashtags.find((h) => h !== k && (REQUETES_SOINS[h] || ['accueil', 'cabinet', 'page-sujet'].includes(h)));
  const emplacement = autre ? (REQUETES_SOINS[autre] ? `soin:${autre}` : autre) : null;
  return { sujet, emplacement, libelle: `pour le kit ${libelleSujetKit(sujet)}${emplacement ? ` · ${emplacement.startsWith('soin:') ? emplacement.slice(5).replace(/-/g, ' ') : libelleEmplacement(emplacement).toLowerCase()}` : ''}` };
}

// ---------------------------------------------------------------------------------------------------------------
// Emplacements à compléter, compteur
// ---------------------------------------------------------------------------------------------------------------

export type EmplacementAFaire = { emplacement: string; libelle: string; raison: 'vide' | 'faible' | 'complement'; photo: string | null; note: number | null };

/**
 * Emplacements d'un kit à compléter, dans l'ordre (premier écran, page sujet, soins, cabinet) : vide (trou ou galerie incomplète),
 * faible (photo non notée ou < 3,5 ★), complément (photo d'un autre sujet ou « général »).
 */
export function emplacementsAFaire(kit: KitImages, soins: readonly string[], galerie = 4): EmplacementAFaire[] {
  const r: EmplacementAFaire[] = [];
  const voir = (e: string) => {
    const p = kit.photos.find((x) => x.emplacement === e);
    if (!p) r.push({ emplacement: e, libelle: libelleEmplacement(e), raison: 'vide', photo: null, note: null });
    else if (p.complement) r.push({ emplacement: e, libelle: libelleEmplacement(e), raison: 'complement', photo: p.url, note: p.note });
    else if (p.note === null || p.note < 3.5) r.push({ emplacement: e, libelle: libelleEmplacement(e), raison: 'faible', photo: p.url, note: p.note });
  };
  voir('accueil');
  voir('page-sujet');
  for (const s of soins) voir(`soin:${s}`);
  const cab = kit.photos.filter((x) => x.emplacement === 'cabinet');
  const faibleCab = cab.find((p) => p.complement || p.note === null || p.note < 3.5);
  if (cab.length < galerie) r.push({ emplacement: 'cabinet', libelle: libelleEmplacement('cabinet'), raison: 'vide', photo: null, note: null });
  else if (faibleCab) r.push({ emplacement: 'cabinet', libelle: libelleEmplacement('cabinet'), raison: faibleCab.complement ? 'complement' : 'faible', photo: faibleCab.url, note: faibleCab.note });
  return r;
}

/** « Kit Enfant : 7/10 emplacements avec une photo ≥ 4 ★ » */
export function compteurKit(kit: KitImages, soins: readonly string[], galerie = 4): { bons: number; total: number; texte: string } {
  const total = 2 + soins.length + galerie;
  const ok = (e: string) => kit.photos.filter((p) => p.emplacement === e && !p.complement && (p.note ?? 0) >= 4).length;
  const bons = ok('accueil') + ok('page-sujet') + soins.reduce((s, x) => s + Math.min(1, ok(`soin:${x}`)), 0) + Math.min(galerie, ok('cabinet'));
  return { bons, total, texte: `Kit ${libelleSujetKit(kit.sujet)} : ${bons}/${total} emplacements avec une photo ≥ 4 ★` };
}

// ---------------------------------------------------------------------------------------------------------------
// Suggestions du vivier curé
// ---------------------------------------------------------------------------------------------------------------

/** Sujets voisins (leur vivier n'est proposé que si celui du sujet ne donne rien) */
export const SUJETS_VOISINS: Readonly<Record<string, readonly string[]>> = {
  enfant: ['general', 'sport'], sport: ['semelles', 'general'], senior: ['pedicurie', 'diabete', 'general'], diabete: ['pedicurie', 'senior', 'general'],
  ongles: ['pedicurie', 'general'], semelles: ['sport', 'general'], pedicurie: ['ongles', 'diabete', 'senior', 'general'], general: [],
};

/** Clé de refus « Pas pour ici » (mémorisée : classement_suggestions, raison `kit-pas-ici:<clé>`) */
export const cleRefusKit = (emplacement: string, cle: string) => `${hashtagEmplacement(emplacement)}|${cle}`;
export const PREFIXE_REFUS_KIT = 'kit-pas-ici:';
/** Refus relus du journal classement_suggestions (contexte photos, nature hashtag, décision refusée, raison kit-pas-ici:<clé>) */
export function refusKitDepuisLignes(lignes: readonly { contexte?: string; nature?: string; valeur: string; decision: string; raison?: string | null }[]): Set<string> {
  const r = new Set<string>();
  for (const l of lignes) if (l.decision === 'refusee' && l.raison?.startsWith(PREFIXE_REFUS_KIT)) r.add(`${l.valeur}|${l.raison.slice(PREFIXE_REFUS_KIT.length)}`);
  return r;
}

export const RANGS_SUGGESTION = {
  1: 'Notée ≥ 4 ★, étiquetée pour cet emplacement',
  2: 'Notée ≥ 3,5 ★',
  3: 'Pas encore notée',
  4: 'Notée moins de 3,5 ★',
  5: 'Sujet voisin',
  6: 'Notée ≥ 4 ★, pas encore rattachée',
} as const;
export type RangSuggestion = keyof typeof RANGS_SUGGESTION;

export type SuggestionVivier = {
  url: string; cle: string; note: number | null; rang: RangSuggestion; etiquetee: boolean;
  /** Sujet voisin dont vient la photo (rang 5), sinon null */
  voisin: string | null;
  /** Rang 6 : photo bien notée du même sujet implicite, à rattacher (« Rattacher et utiliser » : sujet + hashtag) */
  aRattacher?: boolean;
  /** Gardée mais pas encore importée : « Importer et utiliser » (identifiant photos_libres) */
  aImporter: boolean; idLibre: string | null;
  libelle: string;
};

/**
 * Suggestions d'un emplacement, du vivier curé SEULEMENT (jamais une photo non étiquetée avec le sujet, non retenue ou exclue), hors
 * photos déjà dans le kit et refus « Pas pour ici » de cet emplacement ; ordre : rang, étiquette de l'emplacement, note, effet.
 */
export function suggestionsVivier(kit: KitImages, emplacement: string, d: DonneesKits, refus: ReadonlySet<string> = new Set(), n = 8): SuggestionVivier[] {
  const dans = new Set(kit.photos.map((p) => p.url));
  const tag = hashtagEmplacement(emplacement);
  const de = (sujet: string, voisin: string | null): (SuggestionVivier & { effet: number })[] => vivierCure(sujet, d)
    .filter((v) => !dans.has(v.p.url) && !refus.has(cleRefusKit(emplacement, v.cle)))
    .map((v) => {
      const etiquetee = v.tags.includes(tag);
      const rang: RangSuggestion = voisin ? 5 : v.note !== null && v.note >= 4 && etiquetee ? 1 : v.note !== null && v.note >= 3.5 ? 2 : v.note === null ? 3 : 4;
      return { url: v.p.url, cle: v.cle, note: v.note, rang, etiquetee, voisin, aImporter: !v.importee, idLibre: v.p.idLibre ?? null, effet: v.effet, libelle: voisin ? `${RANGS_SUGGESTION[5]} : ${libelleSujetKit(voisin)}` : RANGS_SUGGESTION[rang] };
    });
  let l = de(kit.sujet, null);
  // Vivier épuisé : d'abord les photos notées ≥ 4 ★ du même sujet IMPLICITE pas encore rattachées (avant tout voisin)
  if (!l.length) {
    l = photosARattacher(d, kit.sujet).filter((x) => !dans.has(x.url) && !refus.has(cleRefusKit(emplacement, x.cle))).map((x) => ({
      url: x.url, cle: x.cle, note: x.note, rang: 6 as RangSuggestion, etiquetee: false, voisin: null, aRattacher: true, aImporter: !x.importee, idLibre: x.idLibre, effet: 0,
      libelle: `Notée ${String(x.note).replace('.', ',')} ★, pas encore rattachée à ${libelleSujetKit(kit.sujet)}`,
    }));
  }
  if (!l.length) {
    const vues = new Set<string>();
    l = (SUJETS_VOISINS[kit.sujet] ?? []).flatMap((s) => de(s, s)).filter((x) => !vues.has(x.url) && Boolean(vues.add(x.url)));
  }
  return l.sort((a, b) => a.rang - b.rang || Number(b.etiquetee) - Number(a.etiquetee) || (b.note ?? 0) - (a.note ?? 0) || b.effet - a.effet || (a.url < b.url ? -1 : 1))
    .slice(0, n).map(({ effet: _e, ...x }) => x);
}

/** État du vivier d'un sujet : « Enfants : 14 photos curées · 9 notées ≥ 4 ★ · 3 non notées · emplacements couverts 6/9 » */
export function etatVivier(kit: KitImages, d: DonneesKits, soins: readonly string[], galerie = 4) {
  const v = vivierCure(kit.sujet, d);
  const notees4 = v.filter((x) => (x.note ?? 0) >= 4).length;
  const nonNotees = v.filter((x) => x.note === null).length;
  const aImporter = v.filter((x) => !x.importee).length;
  const total = 2 + soins.length + galerie;
  const n = (e: string) => kit.photos.filter((p) => p.emplacement === e).length;
  const couverts = Math.min(1, n('accueil')) + Math.min(1, n('page-sujet')) + soins.filter((s) => n(`soin:${s}`)).length + Math.min(galerie, n('cabinet'));
  return {
    photos: v.length, notees4, nonNotees, aImporter, couverts, total,
    texte: `${libelleSujetKit(kit.sujet)} : ${v.length} photo${v.length > 1 ? 's' : ''} curée${v.length > 1 ? 's' : ''} · ${notees4} notée${notees4 > 1 ? 's' : ''} ≥ 4 ★ · ${nonNotees} non notée${nonNotees > 1 ? 's' : ''}${aImporter ? ` · ${aImporter} à importer` : ''} · emplacements couverts ${couverts}/${total}`,
  };
}

/** « Vivier Enfants : 3 photos curées, aucune pour orthonyxie » quand aucune photo du vivier n'est étiquetée pour l'emplacement ; sinon null */
export function manqueVivier(sujet: string, emplacement: string, d: DonneesKits): string | null {
  const v = vivierCure(sujet, d);
  const tag = hashtagEmplacement(emplacement);
  if (v.some((x) => x.tags.includes(tag))) return null;
  const quoi = emplacement.startsWith('soin:') ? emplacement.slice(5).replace(/-/g, ' ') : libelleEmplacement(emplacement).toLowerCase();
  return `Vivier ${libelleSujetKit(sujet)} : ${v.length} photo${v.length > 1 ? 's' : ''} curée${v.length > 1 ? 's' : ''}, aucune pour ${quoi}`;
}

/** Lien « Trouver des photos » : Photos à découvrir (couche 1) pré-filtré sur le sujet et les requêtes de l'emplacement, puis retour au kit */
export const lienTrouverPhotos = (sujet: string, emplacement: string) =>
  `/admin/retours?type=decouvrir&sujet=${encodeURIComponent(sujet)}&emplacement=${encodeURIComponent(emplacement)}&retour=kits`;
