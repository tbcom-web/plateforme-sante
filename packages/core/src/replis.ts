// Replis du site publié : aucune information manquante n'empêche de créer ni de publier un site (règle de Paul,
// 2026-10-05). Chaque manque est signalé en avertissement à la saisie (controles.ts) et le site affiche à la place une
// mention sobre, jamais un crochet, un « à compléter » ou un champ vide. Fonctions pures, utilisées au chargement des
// données du site (apps/sites/src/lib/supabase.ts) et dans les textes communs des gabarits (apps/sites/src/lib/textes.ts).
import { SPECIALITES } from './packs';

/** Mentions affichées à la place d'une information absente. Ton métier, sans promesse. */
export const REPLIS = {
  adresse: 'Adresse communiquée à la prise de rendez-vous',
  horaires: 'Sur rendez-vous',
  nomCabinet: 'Cabinet de pédicurie-podologie',
  equipe: 'L’équipe du cabinet',
  rdvCabinet: 'Prise de rendez-vous au cabinet',
} as const;

/** Texte provisoire laissé dans un champ libre : « [NumOrdre] », « xxx », « lorem ipsum ». */
export const TEXTE_PROVISOIRE = /\[[^\]]{2,30}\]|\bx{3,}\b|\blorem ipsum\b/i;

/** Retire les paragraphes contenant un texte provisoire (le passage n'est pas publié plutôt qu'affiché). */
export function retirerTextesProvisoires(texte: string | undefined | null): string {
  if (!texte) return '';
  return texte
    .split(/\n\s*\n/)
    .filter((p) => !TEXTE_PROVISOIRE.test(p))
    .join('\n\n')
    .trim();
}

/** Ligne courte (nom, titre) : vide si elle contient un texte provisoire. */
export const ligneSansProvisoire = (t: string | undefined | null) => (t && !TEXTE_PROVISOIRE.test(t) ? t.trim() : '');

/**
 * Remplace le jeton {ville} des textes du catalogue. Sans ville, la préposition qui le précède part avec lui
 * (« Bilan podologique à {ville} » → « Bilan podologique »), sans espace double ni ponctuation orpheline.
 */
export function avecVille(texte: string, ville: string): string {
  if (ville.trim()) return texte.replaceAll('{ville}', ville.trim());
  return texte
    .replace(/,?\s+(?:à|sur|de|près de|autour de|en)\s+\{ville\}/gi, '')
    .replace(/\s*\(\{ville\}\)/g, '')
    .replace(/\{ville\}/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/ +([,.;:!?])/g, '$1')
    .trim();
}

/** « à Lyon » ; vide sans ville (jamais de « à » orphelin). */
export const aVille = (ville: string) => (ville.trim() ? `à ${ville.trim()}` : '');

/** Téléphone utilisable pour un lien « tel: » (au moins 9 chiffres). */
export const telephoneUtilisable = (t: string | undefined | null) => (t ?? '').replace(/\D/g, '').length >= 9;

/** Adresse complète et publiable (rue, code postal valide pour le pays, ville). */
export function adresseUtilisable(l: { adresse: string; codePostal: string; ville: string }, pays = 'FR'): boolean {
  if (!l.adresse.trim() || !l.codePostal.trim() || !l.ville.trim()) return false;
  const cp = l.codePostal.trim();
  if (pays === 'FR') return /^\d{5}$/.test(cp);
  if (pays === 'BE' || pays === 'CH') return /^\d{4}$/.test(cp);
  return true;
}

/** Nom affiché d'un praticien : « Prénom Nom », le nom seul, sinon '' (praticien non présenté nommément). */
export const nomAffiche = (p: { prenom: string; nom: string }) => (ligneSansProvisoire(p.nom) ? `${ligneSansProvisoire(p.prenom)} ${ligneSansProvisoire(p.nom)}`.trim() : '');

/**
 * Soins présentés quand aucune compétence n'est cochée : soins mis en avant par l'univers, sinon ceux de la spécialité
 * (et de la secondaire), sinon ceux de la podologie générale ; seulement ceux qui existent dans le catalogue.
 */
export function soinsParDefaut(o: { specialite?: string; specialiteSecondaire?: string; soinsEnAvant?: string[] }, catalogue: string[]): string[] {
  const de = (v?: string) => SPECIALITES.find((s) => s.value === v)?.soins ?? [];
  const candidats = [...(o.soinsEnAvant ?? []), ...de(o.specialite), ...de(o.specialiteSecondaire)];
  const retenus = [...new Set(candidats)].filter((s) => catalogue.includes(s));
  return retenus.length ? retenus : de('generale').filter((s) => catalogue.includes(s));
}

/** Prise de rendez-vous effective : en ligne (lien précis), par téléphone, par e-mail, sinon au cabinet. */
export type ModeContact = 'en-ligne' | 'telephone' | 'email' | 'cabinet';
export function modeContact(o: { rdvEnLigne: boolean; telephone: string; email?: string }): ModeContact {
  if (o.rdvEnLigne) return 'en-ligne';
  if (telephoneUtilisable(o.telephone)) return 'telephone';
  if (o.email && /^\S+@\S+\.\S+$/.test(o.email)) return 'email';
  return 'cabinet';
}
