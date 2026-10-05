/** « 0494959898 » ou « +33494959898 » → « 04 94 95 98 98 ». Laisse les autres formats intacts. */
export function formaterTelephone(brut: string): string {
  const chiffres = brut.replace(/[^\d+]/g, '').replace(/^\+33/, '0').replace(/^0033/, '0');
  return /^0\d{9}$/.test(chiffres) ? chiffres.replace(/(\d{2})(?=\d)/g, '$1 ') : brut.trim();
}

/**
 * Libellé du quartier : « Claret » → « quartier Claret » ; laissé tel quel s'il commence déjà par un mot
 * de lieu (« quartier du Mourillon », « centre-ville », « secteur nord ») ou s'il contient la ville (« Lyon 6e, quartier des
 * Brotteaux »). Vide si le quartier est absent ou identique à la ville.
 */
export function libelleQuartier(quartier: string, ville: string): string {
  const q = quartier.trim();
  if (!q || q.toLowerCase() === ville.trim().toLowerCase()) return '';
  if (ville && q.toLowerCase().includes(ville.trim().toLowerCase())) return q;
  return /^(quartier|secteur|centre|faubourg|hameau|village|bourg)\b/i.test(q) ? q : `quartier ${q}`;
}

/**
 * Lieu d'exercice en toutes lettres : le quartier complète toujours la ville, il ne la remplace jamais.
 * « à Toulon » ; « dans le quartier Claret, à Toulon » ; « à Lyon 6e, quartier des Brotteaux ».
 */
export function lieuEnClair(quartier: string, ville: string): string {
  const q = libelleQuartier(quartier, ville);
  // Sans ville (information manquante, voir replis.ts) : jamais de « à » orphelin.
  if (!ville.trim()) return q ? `dans le ${q.charAt(0).toLowerCase()}${q.slice(1)}` : '';
  if (!q) return `à ${ville}`;
  if (q.toLowerCase().includes(ville.trim().toLowerCase())) return `à ${q}`;
  return `dans le ${q.charAt(0).toLowerCase()}${q.slice(1)}, à ${ville}`;
}

/** Version courte pour les sur-titres et bandeaux : « Toulon, quartier Claret » (ou la ville seule). */
export function lieuCourt(quartier: string, ville: string): string {
  const q = libelleQuartier(quartier, ville);
  if (!q || !ville.trim()) return q || ville.trim();
  return q.toLowerCase().includes(ville.trim().toLowerCase()) ? q : `${ville}, ${q}`;
}

/**
 * Lien de rendez-vous qui mène à une page précise (chemin après le domaine). Un lien vers l'accueil de la
 * plateforme (« https://www.doctolib.fr/ ») ne permet pas au patient de trouver le praticien.
 */
export function lienRdvPrecis(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' && u.pathname.replace(/\/+$/, '') !== '';
  } catch {
    return false;
  }
}

/** Espace fine insécable (U+202F) avant « : ; ? ! », règle typographique française des titres. */
export const espacesFines = (texte: string) => texte.replace(/[  ]*([:;?!])(?=\s|$)/g, ' $1');
