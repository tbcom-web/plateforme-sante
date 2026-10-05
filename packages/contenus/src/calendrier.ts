// Calendrier éditorial saisonnier (octobre → septembre) et « mois type » d'un cabinet.
// Repères d'actualité repris du calendrier ÉcranZen (studio/catalogue/calendrier.json, sources consultées le 2026-09-29) :
// Semaine bleue (début octobre), Journée mondiale du diabète (14 novembre), reprise du sport (janvier), printemps (course,
// semelles), été (piscine, sandales), rentrée (enfants). Jamais de date dans l'image d'un contenu réutilisable (référentiel
// éthique : date admise en légende, une fois, retirée à la republication).

import { SUJETS } from './sujets';
import type { Format, Mois, Sujet } from './types';

export const MOIS_EDITORIAUX: Mois[] = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const NOMS_MOIS = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Repères du mois (affichés dans l'admin, jamais dans l'image) */
export const REPERES: Partial<Record<Mois, string>> = {
  10: 'Semaine bleue (retraités et personnes âgées), début octobre',
  11: 'Journée mondiale du diabète, 14 novembre',
  1: 'Reprise du sport après les fêtes',
  4: 'Printemps : course, randonnée',
  6: 'Été : sandales, piscine',
  9: 'Rentrée scolaire',
};

/** Calendrier : sujets conseillés par mois, d'octobre à septembre */
export function calendrier(sujets: Sujet[] = SUJETS): { mois: Mois; nom: string; repere?: string; sujets: string[] }[] {
  return MOIS_EDITORIAUX.map((mois) => ({ mois, nom: NOMS_MOIS[mois], repere: REPERES[mois], sujets: sujets.filter((s) => s.mois.includes(mois)).map((s) => s.id) }));
}

export type Programmation = { date: string; sujet: string; format: Exclude<Format, 'reel'> | 'reel' };

/**
 * Mois type d'octobre 2026 (cabinet de démo) : 8 contenus (4 carrousels, 2 posts, 1 Story, 1 post de fiche Google) + 1 Reel,
 * deux publications par semaine. L'ordre est vérifié par verifierEnchainements().
 */
export const MOIS_TYPE_OCTOBRE: Programmation[] = [
  { date: '2026-10-06', sujet: 'chez-soi-chaussures-qui-tiennent', format: 'carrousel' },
  { date: '2026-10-08', sujet: 'bien-choisir-ses-chaussures', format: 'post' },
  { date: '2026-10-13', sujet: 'pedicure-podologue-qui-est-ce', format: 'carrousel' },
  { date: '2026-10-15', sujet: 'ongles-epais-se-faire-aider', format: 'story' },
  { date: '2026-10-20', sujet: 'semelles-neuves-progressivement', format: 'reel' },
  { date: '2026-10-21', sujet: 'ongle-incarne-couper-droit', format: 'carrousel' },
  { date: '2026-10-22', sujet: 'cor-chaussure-qui-appuie', format: 'post' },
  { date: '2026-10-27', sujet: 'semelles-orthopediques-c-est-quoi', format: 'carrousel' },
  { date: '2026-10-29', sujet: 'diabete-regarder-ses-pieds', format: 'google' },
];

/** Enchaînements interdits (ÉcranZen garde-fous.js : apres_interdit / avant_interdit) : [sujet, sujet qui ne le suit jamais] */
export const ENCHAINEMENTS_INTERDITS: [string, string, string][] = [
  // GATE 1 ÉcranZen 040 (cloisonnement bilan → dispositif) : prêt pour le jour où un sujet posturologie sera activé
  ['bilan-postural', 'semelles-neuves-progressivement', 'GATE 1 ÉcranZen 040 : un contenu « bilan postural » n’est jamais suivi d’un contenu semelles'],
  ['bilan-postural', 'semelles-orthopediques-c-est-quoi', 'GATE 1 ÉcranZen 040 : un contenu « bilan postural » n’est jamais suivi d’un contenu semelles'],
];

export function verifierEnchainements(prog: Programmation[]): string[] {
  const tri = [...prog].sort((a, b) => a.date.localeCompare(b.date));
  const E: string[] = [];
  tri.forEach((p, k) => {
    const suivant = tri[k + 1];
    if (!suivant) return;
    for (const [a, b, pourquoi] of ENCHAINEMENTS_INTERDITS) if (p.sujet === a && suivant.sujet === b) E.push(`${p.date} → ${suivant.date} : ${pourquoi}`);
  });
  return E;
}
