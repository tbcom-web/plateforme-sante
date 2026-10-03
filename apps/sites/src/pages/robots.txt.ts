import type { APIRoute } from 'astro';
import { site, absUrl } from '../lib/site';

// Moteurs de recherche et robots des assistants IA explicitement autorisés.
const robotsIA = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Bingbot'];

const txt = (lignes: string[]) =>
  new Response(lignes.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

export const GET: APIRoute = () => {
  // Site de démonstration (praticien fictif) : aucune indexation.
  if (site.demo) return txt(['User-agent: *', 'Disallow: /', '']);

  return txt([
    'User-agent: *',
    'Allow: /',
    'Disallow: /rdv',
    '',
    ...robotsIA.flatMap((bot) => [`User-agent: ${bot}`, 'Allow: /', 'Disallow: /rdv', '']),
    `Sitemap: ${absUrl('/sitemap.xml')}`,
    '',
  ]);
};
