// Association des soins et des articles aux dessins techniques de la marque (components/dessins).
// La liste des dessins appartient à l'univers métier (packages/core/src/univers.ts).
import type { NomDessin } from '@plateforme/core';
export type { NomDessin };
import { jeu, visuelSoin } from './visuels-soins';

/** Dessin de chaque soin (source unique : jeu visuel, lib/visuels-soins.ts) */
export const dessinSoin = (slug: string): NomDessin => visuelSoin(slug).dessin;

// Mots-clés du thème (ou du titre) d'un article → dessin de couverture, du plus précis au plus général.
const MOTS: [RegExp, NomDessin][] = [
  [/diab|monofilament|sensibilit/, 'diabete'],
  [/incarn|ongle/, 'ongle'],
  [/verrue/, 'verrue'],
  [/laser/, 'laser'],
  [/taping|tape|strapping|bande adhesive|contention/, 'taping'],
  [/senior|chute|equilibre.*age|personne agee|canne/, 'senior'],
  [/sport|course|coureur|running|trail|marathon|foulee/, 'sport'],
  [/enfant|bebe|croissance|premiers pas|ado|pointure/, 'enfant'],
  [/valgus|varus|arriere-pied|arriere du pied/, 'arriere-pied'],
  [/pied plat|pied creux|voute|cambrure|arche/, 'voutes'],
  [/talon|aponevr|epine|fasciite/, 'talon'],
  [/postur|equilibre|vertige|stabilo/, 'equilibre'],
  [/semelle|orthese|chaussure|chaussage/, 'semelle'],
  [/appui|metatars|durillon|cor/, 'appuis'],
  [/pedicurie|soin|hygiene|callosit/, 'soin'],
];
const normaliser = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Dessin de couverture d'un article, d'après son thème puis son titre ; sinon celui du jeu visuel (spécialité) */
export function dessinArticle(theme = '', titre = ''): NomDessin {
  for (const texte of [theme, titre].map(normaliser)) {
    const trouve = MOTS.find(([re]) => re.test(texte));
    if (trouve) return trouve[1];
  }
  return jeu.couverture;
}
