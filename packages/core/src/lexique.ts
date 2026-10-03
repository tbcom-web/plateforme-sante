// Lexique de la profession : termes à privilégier, formulations à éviter, mentions attendues.
// Sert de garde-fou à tous les textes (bibliothèque, saisie du praticien, flux de contenu).
// Inspiré des sites webpodologue en production et des usages des Ordres.

export type Voix = 'je' | 'nous' | 'tiers';

export type NiveauConformite = 'strict' | 'standard' | 'libre';

/** Compétences telles que les praticiens les nomment sur leurs sites. */
export const COMPETENCES_PODOLOGUE = [
  'Pédicurie',
  'Podologie',
  'Bilan podologique',
  'Semelles orthopédiques',
  'Podo-diabétologie',
  'Podopédiatrie',
  'Podologie du sport',
  'Posturologie',
  'Réflexologie plantaire',
  'K-Taping',
  'Verrues plantaires',
  'Laser',
  'Rééducation',
  'Prévention',
  'Soins à domicile',
] as const;

/** Formulations à remplacer : [à éviter, à préférer, raison]. */
export const PREFERER: [RegExp, string, string][] = [
  [/\bspécialiste (du|de la|des|en)\b/gi, 'orienté(e) vers', 'Le titre de spécialiste n’est pas reconnu pour la profession.'],
  [/\bspécialisée? (dans|en)\b/gi, 'formé(e) à', 'Préférer la formation suivie à une spécialité.'],
  [/\bguérir\b/gi, 'prendre en charge', 'Aucune promesse de guérison.'],
  [/\bsoulager définitivement\b/gi, 'aider à soulager', 'Aucune promesse de résultat.'],
  [/\bpodologue\b(?!-)/gi, 'pédicure-podologue', 'Titre complet attendu dans les titres et mentions.'],
];

/** Termes bloquants par défaut (publicité, promesse, superlatif, prix promotionnel). */
export const INTERDITS: { motif: RegExp; raison: string }[] = [
  { motif: /\b(le|la|les) meilleure?s?\b/gi, raison: 'Superlatif comparatif' },
  { motif: /\bn°\s?1\b|\bnuméro un\b|\bleader\b/gi, raison: 'Revendication de primauté' },
  { motif: /\bgaranti(e|s|es)?\b|\b100\s?%/gi, raison: 'Promesse de résultat' },
  { motif: /\bmiracle\b|\brévolutionnaire\b|\binfaillible\b/gi, raison: 'Formulation publicitaire' },
  { motif: /\bsans (aucune )?douleur\b|\bindolore\b/gi, raison: 'Promesse sur le ressenti du patient' },
  { motif: /\bimmédiat(e|s|es)?\b|\binstantané(e|s|es)?\b|\bdéfinitif(ve|s|ves)?\b/gi, raison: 'Promesse de délai ou de résultat' },
  { motif: /\bpromo(tion)?s?\b|\bréduction\b|\boffert(e|s|es)?\b|\b-\d+\s?%/gi, raison: 'Prix promotionnel' },
  { motif: /\bsans attente\b|\bjamais de retard\b/gi, raison: 'Engagement impossible à garantir' },
];

export type Alerte = { extrait: string; raison: string; suggestion?: string; bloquante: boolean };

/** Contrôle un texte selon le niveau de conformité choisi par le praticien. */
export function verifierTexte(texte: string, niveau: NiveauConformite = 'standard'): Alerte[] {
  const alertes: Alerte[] = [];
  for (const { motif, raison } of INTERDITS) {
    for (const m of texte.matchAll(motif)) {
      alertes.push({ extrait: m[0], raison, bloquante: niveau === 'strict' });
    }
  }
  if (niveau !== 'libre') {
    for (const [motif, suggestion, raison] of PREFERER) {
      for (const m of texte.matchAll(motif)) alertes.push({ extrait: m[0], raison, suggestion, bloquante: false });
    }
  }
  return alertes;
}

/** Accorde une phrase type selon la voix choisie. */
export function selonVoix(voix: Voix, formes: { je: string; nous: string; tiers: string }) {
  return formes[voix];
}

/** Mention d'inscription à l'Ordre, telle qu'affichée sur les sites. */
export const mentionOrdre = (numero: string, ordre = 'Ordre des Pédicures-Podologues') =>
  `N° d’inscription au tableau de l’${ordre} : ${numero}`;
