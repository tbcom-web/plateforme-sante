// Association des soins et des articles aux dessins techniques de la marque (components/dessins).
// La liste des dessins appartient à l'univers métier (packages/core/src/univers.ts).
import type { NomDessin } from '@plateforme/core';
export type { NomDessin };
import { visuelSoin } from './visuels-soins';

/** Dessin de chaque soin (source unique : lib/visuels-soins.ts) */
export const dessinSoin = (slug: string): NomDessin => visuelSoin(slug).dessin;

// Mots-clés du thème (ou du titre) d'un article → dessin de couverture, du plus précis au plus général.
const MOTS: [RegExp, NomDessin][] = [
  [/diab|monofilament|sensibilit/, 'diabete'],
  [/sport|course|coureur|running|trail|marathon|foulee/, 'sport'],
  [/enfant|bebe|croissance|premiers pas|ado/, 'enfant'],
  [/postur|equilibre|chute|senior|vertige/, 'equilibre'],
  [/semelle|orthese|chaussure|chaussage/, 'semelle'],
  [/talon|aponevr|epine/, 'talon'],
  [/verrue|appui|metatars|durillon/, 'appuis'],
  [/ongle|cor\b|pedicurie|soin|hygiene/, 'soin'],
];
const normaliser = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Dessin de couverture d'un article, d'après son thème puis son titre */
export function dessinArticle(theme = '', titre = ''): NomDessin {
  for (const texte of [theme, titre].map(normaliser)) {
    const trouve = MOTS.find(([re]) => re.test(texte));
    if (trouve) return trouve[1];
  }
  return 'analyse';
}
