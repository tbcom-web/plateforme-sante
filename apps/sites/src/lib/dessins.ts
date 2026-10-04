// Association des soins et des articles aux dessins techniques de la marque (components/dessins).

export type NomDessin = 'analyse' | 'semelle' | 'soin' | 'diabete' | 'sport' | 'enfant' | 'equilibre' | 'talon' | 'appuis';

/** Dessin de chaque soin du catalogue ; « analyse » par défaut */
const DESSIN_SOIN: Record<string, NomDessin> = {
  'bilan-podologique': 'analyse',
  'semelles-orthopediques': 'semelle',
  'soins-de-pedicurie': 'soin',
  'pied-diabetique': 'diabete',
  'podologie-du-sport': 'sport',
  'podologie-enfant': 'enfant',
  posturologie: 'equilibre',
  'podologie-du-senior': 'equilibre',
  'verrues-plantaires': 'appuis',
  'ongle-incarne': 'soin',
  'douleur-talon': 'talon',
  laser: 'soin',
  'k-taping': 'sport',
};

export const dessinSoin = (slug: string): NomDessin => DESSIN_SOIN[slug] ?? 'analyse';

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
