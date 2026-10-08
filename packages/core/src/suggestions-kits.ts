// Suggestions pour compléter un KIT D'IMAGES (demande de Paul du 2026-10-08 : « pour les kits de photos, il faut que le tool
// suggère des photos à ajouter au kit »). Pour chaque emplacement vide ou faible d'un kit (kits-images.ts) :
// 1. SUGGESTIONS DE LA BANQUE (suggestionsBanque) : photos déjà importées ou intégrées, non exclues (contexte-images.ts), pas encore
//    dans le kit, qui pourraient convenir sans être étiquetées pour cet emplacement :
//      score = 3 si la photo est du sujet (1,5 voisin, 1 « général ») + 2 par mot de l'emplacement trouvé dans ses hashtags, son nom
//              ou sa requête d'origine + 2 · (note − 3) (note inconnue : 0) + 3 · effet appris
//    jamais une photo refusée « Pas pour ici » pour CET emplacement. « Utiliser ici » = sujet + hashtag de l'emplacement (#<slug du
//    soin>, #accueil, #cabinet, #page-sujet) ajoutés à la photo : le kit se recompose.
// 2. SUGGESTIONS NOUVELLES (Pexels / Pixabay) : requêtes ciblées par soin et emplacement (REQUETES_EMPLACEMENTS, anglais, toujours des
//    pieds, des chaussures ou un cabinet de soin), tirées par couverture (choisirRequete). « Garder » = lien seulement, sujet + hashtag
//    de l'emplacement + #kit-<sujet> pré-cochés ; la photo n'entre dans le kit qu'une fois importée (« en attente d'import »).
// Pur, sans réseau.

import { clePhoto, scoreAssetPourSujet } from './assets-poids';
import { imageExclue } from './contexte-images';
import type { NotesPhotos } from './favoris';
import { libelleEmplacement, libelleSujetKit, type DonneesKits, type KitImages } from './kits-images';
import type { PhotoBanque } from './recettes';

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
// Suggestions de la banque
// ---------------------------------------------------------------------------------------------------------------

/** Sujets voisins (une photo d'un voisin peut convenir) */
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

const mots = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((m) => m.length >= 3);
/** Mots d'un emplacement : slug du soin (sans « podologie », « soins »…) + mots de ses requêtes */
export function motsEmplacement(sujet: string, emplacement: string): Set<string> {
  const vides = new Set(['podologie', 'soins', 'soin', 'des', 'les', 'care', 'foot', 'feet', 'clinic', 'and', 'the', 'with']);
  return new Set([...mots(hashtagEmplacement(emplacement)), ...requetesEmplacement(sujet, emplacement).flatMap(mots), ...(emplacement === 'accueil' || emplacement === 'page-sujet' ? [sujet] : [])].filter((m) => !vides.has(m)));
}

export type SuggestionBanque = { url: string; cle: string; score: number; note: number | null; raisons: string[]; sujets: readonly string[] };

/**
 * Photos de la banque qui pourraient remplir un emplacement (meilleures d'abord, `n` au plus) : importées ou intégrées, jamais
 * exclues, ni déjà dans le kit, ni refusées « Pas pour ici » pour cet emplacement, ni déjà étiquetées pour lui.
 */
export function suggestionsBanque(kit: KitImages, emplacement: string, d: DonneesKits & { requetes?: Readonly<Record<string, string>> }, refus: ReadonlySet<string> = new Set(), n = 6): SuggestionBanque[] {
  const sujet = kit.sujet;
  const dans = new Set(kit.photos.map((p) => p.url));
  const voisins = SUJETS_VOISINS[sujet] ?? ['general'];
  const motsE = motsEmplacement(sujet, emplacement);
  const tagE = hashtagEmplacement(emplacement);
  const notes: NotesPhotos = d.notes ?? {};
  const res: SuggestionBanque[] = [];
  for (const p of d.banque as readonly PhotoBanque[]) {
    const cle = p.cle ?? clePhoto(p.url);
    if (!cle || p.importee === false || dans.has(p.url) || imageExclue(p.url, d.exclues) || imageExclue(cle, d.exclues) || /posture/.test(p.url)) continue;
    if (d.assets?.statuts[cle] || refus.has(cleRefusKit(emplacement, cle))) continue;
    const tags = (d.hashtags?.[cle] ?? []).map((t) => t.replace(/^#/, ''));
    if (tags.includes(tagE)) continue;
    const note = notes[cle]?.m ?? null;
    if (note !== null && note <= 2) continue;
    const raisons: string[] = [];
    let s = 0;
    if (p.sujets.includes(sujet)) { s += 3; raisons.push(`sujet ${libelleSujetKit(sujet)}`); }
    else if (p.sujets.some((x) => voisins.includes(x) && x !== 'general')) { s += 1.5; raisons.push('sujet voisin'); }
    else if (p.sujets.includes('general')) s += 1;
    else continue;
    const texte = new Set([...tags.flatMap(mots), ...mots(cle), ...mots(d.requetes?.[p.url] ?? '')]);
    const communs = [...motsE].filter((m) => texte.has(m));
    if (communs.length) { s += 2 * communs.length; raisons.push(`« ${communs.slice(0, 3).join(', ')} »`); }
    if (note !== null) { s += 2 * (note - 3); raisons.push(`${String(note).replace('.', ',')}★`); }
    s += 3 * scoreAssetPourSujet(cle, sujet, d.assets);
    res.push({ url: p.url, cle, score: Math.round(s * 100) / 100, note, raisons, sujets: p.sujets });
  }
  return res.sort((a, b) => b.score - a.score || (a.url < b.url ? -1 : 1)).slice(0, n);
}
