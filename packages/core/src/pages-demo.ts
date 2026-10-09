// Contenus de démonstration des pages du studio (page d'un article, page d'un sujet) et outils partagés par les gabarits Astro
// (apps/sites/src/pages/actualites/[slug].astro) et l'aperçu de l'admin : sommaire des intertitres d'un article.
// Le texte de l'article de démonstration est celui du site de démonstration (apps/sites/src/data/sites/demo-podologue-lyon.ts) :
// factuel, sans promesse, au vocabulaire du métier. Module pur.

import type { Article } from './types';

/** Article de démonstration (sujet Sport) : un vrai conseil, avec intertitres, liste et image 16:9 de la banque intégrée */
export const ARTICLE_DEMO: Article = {
  slug: 'preparer-ses-pieds-course-a-pied',
  titre: 'Préparer ses pieds avant une course à pied',
  resume: 'Chaussures, ongles, ampoules : les bons réflexes dans les semaines qui précèdent une course.',
  date: '2026-09-22',
  theme: 'Sport',
  image: '/photos/sport-course.webp',
  imageAlt: 'Jambes d’un coureur en chaussures de course sur une route',
  corps: `Que vous prépariez votre premier 10 km ou un marathon, vos pieds vont être très sollicités. Voici quelques repères simples pour arriver serein le jour J.

## Plusieurs semaines avant

- **Choisissez vos chaussures tôt** et faites-les travailler à l’entraînement. Évitez de courir avec une paire neuve le jour de la course.
- **Faites le point** si vous ressentez une douleur qui revient à chaque sortie. Un bilan podologique permet d’en rechercher la cause.

## La semaine de la course

- Coupez vos ongles **quelques jours avant**, droits et pas trop courts.
- Hydratez la peau des pieds, sauf entre les orteils.
- Testez vos chaussettes : sans coutures épaisses, bien ajustées.

## Après la course

Prenez quelques minutes pour regarder vos pieds. Une ampoule se protège avec un pansement adapté ; un ongle noir ou une douleur persistante méritent un avis professionnel.`,
};

/** Identifiant d'ancre d'un intertitre : minuscules sans accents, mots reliés par des tirets */
export function idIntertitre(titre: string): string {
  return titre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'partie';
}

/** Intertitres de niveau 2 d'un texte Markdown (« ## … »), avec leur ancre (uniques) */
export function sommaireMarkdown(corps: string): { titre: string; id: string }[] {
  const vus = new Map<string, number>();
  return [...corps.matchAll(/^##\s+(.+?)\s*#*\s*$/gm)].map((m) => {
    const titre = m[1].replace(/[*_`]/g, '').trim();
    const base = idIntertitre(titre);
    const n = (vus.get(base) ?? 0) + 1;
    vus.set(base, n);
    return { titre, id: n > 1 ? `${base}-${n}` : base };
  });
}

/**
 * Ancre posée sur chaque <h2> d'un HTML rendu (dans l'ordre de sommaireMarkdown) : le texte des intertitres ne change pas
 * (SEO identique), seul un attribut id s'ajoute (lien du sommaire).
 */
export function ancrerIntertitres(html: string, sommaire: readonly { id: string }[]): string {
  let i = 0;
  return html.replace(/<h2(\s[^>]*)?>/g, (tout, attrs: string | undefined) => {
    const s = sommaire[i++];
    if (!s || /\sid=/.test(attrs ?? '')) return tout;
    return `<h2${attrs ?? ''} id="${s.id}">`;
  });
}

/** Minutes de lecture (200 mots par minute, au moins 1) */
export const minutesLecture = (corps: string) => Math.max(1, Math.round(corps.split(/\s+/).length / 200));
