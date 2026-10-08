// Hashtags des visuels (demande de Paul, 2026-10-07 : « pouvoir taguer aussi des thèmes ou ajouter des hashtags
// manuellement pour aider à la classification »). Complément LIBRE des sujets (sujets-visuels.ts, liste fermée) : #trail,
// #sneakers, #plage… saisis à la main sur n'importe quel asset (clé de l'inventaire : photo:…, dessin:…, heros:…).
// Journal en AJOUT SEUL (table assets_hashtags, migration 0029) ; état courant = dernière action par (clé, hashtag).
// Module pur, déterministe : normalisation, lecture d'une saisie, suggestions (tags Pixabay, description Pexels, requête),
// autocomplétion, état courant, assets d'un hashtag (pour le générateur, plus tard), synthèse Markdown.

export const ACTIONS_HASHTAG = ['ajout', 'retrait'] as const;
export type ActionHashtag = (typeof ACTIONS_HASHTAG)[number];

/** Hashtags au plus par saisie (et par visuel lors d'un « Garder ») */
export const HASHTAGS_MAX = 15;
/** Forme stockée : minuscules, sans accents ni espaces, tirets autorisés, 2 à 30 caractères (même contrainte en base) */
export const FORME_HASHTAG = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])$/;

export const estHashtag = (h: unknown): h is string => typeof h === 'string' && FORME_HASHTAG.test(h);

/**
 * « #Pédicurie », « Running Shoes », « chaussure_de_sport » → « pedicurie », « running-shoes », « chaussure-de-sport ».
 * null si le résultat ne fait pas 2 à 30 caractères.
 */
export function normaliserHashtag(brut: unknown): string | null {
  const h = debutHashtag(brut);
  return estHashtag(h) ? h : null;
}

/** Même nettoyage que normaliserHashtag, sans contrainte de longueur (saisie en cours : « t », « #Tr ») */
export function debutHashtag(brut: unknown): string {
  if (typeof brut !== 'string') return '';
  return brut
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
    .replace(/^#+/, '')
    .replace(/[\s_'’.]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Saisie libre → hashtags : « #trail #sneakers », « trail, sneakers », « trail; sneakers » (espaces, virgules,
 * points-virgules et # séparent). Normalisés, sans doublon, dans l'ordre de saisie, HASHTAGS_MAX au plus.
 * `rejetes` : morceaux impossibles à normaliser (trop courts, trop longs, vides).
 */
export function lireHashtags(texte: unknown, max = HASHTAGS_MAX): { hashtags: string[]; rejetes: string[] } {
  const hashtags: string[] = [];
  const rejetes: string[] = [];
  for (const m of String(texte ?? '').split(/[\s,;#]+/)) {
    if (!m) continue;
    const h = normaliserHashtag(m);
    if (!h) { rejetes.push(m); continue; }
    if (!hashtags.includes(h) && hashtags.length < max) hashtags.push(h);
  }
  return { hashtags, rejetes };
}

/** Liste reçue d'un navigateur → hashtags valides, sans doublon, HASHTAGS_MAX au plus */
export function hashtagsValides(l: unknown, max = HASHTAGS_MAX): string[] {
  if (!Array.isArray(l)) return [];
  const res: string[] = [];
  for (const x of l) {
    const h = normaliserHashtag(x);
    if (h && !res.includes(h) && res.length < max) res.push(h);
  }
  return res;
}

/** Mots vides anglais et français ignorés dans les descriptions (Pexels ne fournit pas de tags, seulement un texte) */
const MOTS_VIDES = new Set([
  'a', 'an', 'and', 'are', 'at', 'by', 'for', 'from', 'in', 'into', 'is', 'of', 'on', 'or', 'over', 'the', 'their', 'to', 'with', 'while', 'his', 'her', 'its',
  'photo', 'photography', 'image', 'picture', 'free', 'stock', 'person', 'people', 'someone', 'close', 'up', 'closeup', 'view', 'shot',
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'en', 'sur', 'avec', 'pour', 'dans', 'au', 'aux',
]);

/**
 * Suggestions automatiques (non cochées) pour une photo candidate : tags de Pixabay (« running shoes » → running-shoes),
 * à défaut mots porteurs de la description Pexels, puis la requête de recherche. Sans les hashtags déjà choisis.
 */
export function suggestionsHashtags(c: { tags?: readonly string[] | null; description?: string | null; requete?: string | null }, deja: readonly string[] = [], max = 8): string[] {
  const res: string[] = [];
  const ajouter = (x: string) => {
    const h = normaliserHashtag(x);
    if (h && !deja.includes(h) && !res.includes(h) && !MOTS_VIDES.has(h) && res.length < max) res.push(h);
  };
  for (const t of c.tags ?? []) ajouter(t);
  if (!(c.tags ?? []).length && c.description) {
    for (const m of c.description.split(/[^\p{L}\p{N}-]+/u)) if (m.length >= 4) ajouter(m);
  }
  if (c.requete) ajouter(c.requete);
  return res;
}

/**
 * Autocomplétion : hashtags connus (déjà utilisés, mots-clés de recherche…) qui commencent par la saisie, puis ceux qui la
 * contiennent ; fréquence décroissante puis ordre alphabétique. Saisie vide : les plus fréquents.
 */
export function completerHashtag(saisie: string, connus: readonly string[] | Readonly<Record<string, number>>, exclus: readonly string[] = [], max = 8): string[] {
  const freq = Array.isArray(connus) ? Object.fromEntries((connus as readonly string[]).map((h) => [h, 1])) : (connus as Readonly<Record<string, number>>);
  const q = debutHashtag(saisie);
  const tous = Object.keys(freq).filter((h) => estHashtag(h) && !exclus.includes(h));
  const ordre = (a: string, b: string) => (freq[b] ?? 0) - (freq[a] ?? 0) || a.localeCompare(b);
  if (!q) return tous.sort(ordre).slice(0, max);
  const debut = tous.filter((h) => h.startsWith(q)).sort(ordre);
  const dedans = tous.filter((h) => !h.startsWith(q) && h.includes(q)).sort(ordre);
  return [...debut, ...dedans].slice(0, max);
}

/** Ligne du journal (ou de assets_hashtags_effectifs) */
export type LigneHashtag = { cle: string; hashtag: string; action: ActionHashtag | string; le?: string | null };

/** État courant : hashtags de chaque asset (ordre alphabétique), clés triées ; un asset sans hashtag n'apparaît pas */
export type HashtagsAssets = Record<string, string[]>;

/**
 * Journal → état courant : dernière action par (clé, hashtag), dans l'ordre des dates puis de lecture. `defauts` : hashtags par
 * défaut tirés du code (kits.ts, HASHTAGS_PAR_DEFAUT), appliqués AVANT le journal — un retrait de Paul les enlève, un ajout s'y ajoute.
 */
export function hashtagsDepuisLignes(lignes: readonly LigneHashtag[], defauts: Readonly<Record<string, readonly string[]>> = {}): HashtagsAssets {
  const triees = lignes.map((l, i) => ({ l, i })).sort((a, b) => String(a.l.le ?? '').localeCompare(String(b.l.le ?? '')) || a.i - b.i);
  const etat = new Map<string, Map<string, ActionHashtag>>();
  for (const [cle, hs] of Object.entries(defauts)) {
    const m = new Map<string, ActionHashtag>();
    for (const h of hs) if (estHashtag(h)) m.set(h, 'ajout');
    if (m.size) etat.set(cle, m);
  }
  for (const { l } of triees) {
    if (!estHashtag(l.hashtag) || (l.action !== 'ajout' && l.action !== 'retrait') || typeof l.cle !== 'string' || !l.cle) continue;
    const m = etat.get(l.cle) ?? new Map<string, ActionHashtag>();
    m.set(l.hashtag, l.action);
    etat.set(l.cle, m);
  }
  const res: HashtagsAssets = {};
  for (const cle of [...etat.keys()].sort()) {
    const h = [...etat.get(cle)!].filter(([, a]) => a === 'ajout').map(([x]) => x).sort();
    if (h.length) res[cle] = h;
  }
  return res;
}

/** Mise à jour locale après une action (même règle que la base) */
export function appliquerHashtag(etat: HashtagsAssets, cle: string, hashtag: string, action: ActionHashtag): HashtagsAssets {
  const avant = etat[cle] ?? [];
  const apres = action === 'ajout' ? [...new Set([...avant, hashtag])].sort() : avant.filter((h) => h !== hashtag);
  const res = { ...etat };
  if (apres.length) res[cle] = apres; else delete res[cle];
  return res;
}

/** Hashtags d'un asset */
export const hashtagsDe = (etat: HashtagsAssets | null | undefined, cle: string): string[] => etat?.[cle] ?? [];

/**
 * Assets portant un hashtag (générateur, filtres de la bibliothèque) : clés triées. La saisie est normalisée
 * (« #Trail » = « trail »). `parmi` : restreint à ces clés (inventaire courant).
 */
export function assetsDuHashtag(etat: HashtagsAssets | null | undefined, hashtag: string, parmi?: readonly string[]): string[] {
  const h = normaliserHashtag(hashtag);
  if (!h || !etat) return [];
  const cles = Object.keys(etat).filter((k) => etat[k].includes(h));
  return (parmi ? cles.filter((k) => parmi.includes(k)) : cles).sort();
}

/** Fréquence de chaque hashtag (nombre d'assets) : autocomplétion, synthèse */
export function frequencesHashtags(etat: HashtagsAssets | null | undefined): Record<string, number> {
  const f: Record<string, number> = {};
  for (const l of Object.values(etat ?? {})) for (const h of l) f[h] = (f[h] ?? 0) + 1;
  return f;
}

/** Un asset passe-t-il le filtre ? (hashtag exact, ou recherche partielle « tra » → #trail) */
export function correspondHashtag(etat: HashtagsAssets | null | undefined, cle: string, filtre: string, partiel = false): boolean {
  const q = partiel ? debutHashtag(filtre) : normaliserHashtag(filtre);
  if (!q) return !debutHashtag(filtre);
  return hashtagsDe(etat, cle).some((h) => (partiel ? h.includes(q) : h === q));
}

/** Section « Hashtags des visuels » (retours/SYNTHESE.md) */
export function markdownHashtags(etat: HashtagsAssets, opts: { titres?: Record<string, string>; titre?: string } = {}): string {
  const l = [opts.titre ?? '## Hashtags des visuels', ''];
  const f = frequencesHashtags(etat);
  const tags = Object.keys(f).sort((a, b) => f[b] - f[a] || a.localeCompare(b));
  if (!tags.length) { l.push('Aucun hashtag pour l’instant.'); return l.join('\n'); }
  l.push(`${tags.length} hashtag${tags.length > 1 ? 's' : ''} sur ${Object.keys(etat).length} visuel${Object.keys(etat).length > 1 ? 's' : ''}.`, '');
  for (const h of tags) {
    const cles = assetsDuHashtag(etat, h);
    l.push(`- #${h} (${cles.length}) : ${cles.map((k) => `\`${k}\`${opts.titres?.[k] ? ` ${opts.titres[k]}` : ''}`).join(', ')}`);
  }
  return l.join('\n');
}
