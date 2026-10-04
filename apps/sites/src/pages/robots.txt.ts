import type { APIRoute } from 'astro';
import { ROBOTS_AGENTS, ROBOTS_ENTRAINEMENT, SIGNAUX_CONTENU, ligneSignauxContenu } from '@plateforme/core';
import { site, absUrl } from '../lib/site';

// Moteurs de recherche et robots des assistants IA nommément autorisés ; usages déclarés par Content Signals
// (https://contentsignals.org). Réglages communs dans packages/core/src/agents.ts.
const txt = (lignes: string[]) =>
  new Response(lignes.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

export const GET: APIRoute = () => {
  // Site de démonstration (praticien fictif) : aucune indexation.
  if (site.demo) return txt(['User-agent: *', 'Disallow: /', '']);

  const signal = ligneSignauxContenu();
  const entrainementRefuse = SIGNAUX_CONTENU['ai-train'] === 'no';
  const autorises = ROBOTS_AGENTS.filter((r) => !(entrainementRefuse && (ROBOTS_ENTRAINEMENT as readonly string[]).includes(r)));
  const regles = [signal, 'Allow: /', 'Disallow: /rdv', ''];

  return txt([
    '# Usages autorisés du contenu (Content Signals) : search = résultats de recherche ; ai-input = réponses',
    '# des assistants IA citant le site ; ai-train = entraînement de modèles. Résumé pour les IA : /llms.txt',
    '',
    'User-agent: *',
    ...regles,
    ...autorises.map((r) => `User-agent: ${r}`),
    ...regles,
    ...(entrainementRefuse ? [...ROBOTS_ENTRAINEMENT.map((r) => `User-agent: ${r}`), 'Disallow: /', ''] : []),
    `Sitemap: ${absUrl('/sitemap.xml')}`,
    '',
  ]);
};
