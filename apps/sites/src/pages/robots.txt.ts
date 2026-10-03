import type { APIRoute } from 'astro';
import { absUrl } from '../lib/site';

// Moteurs de recherche et robots des assistants IA explicitement autorisés.
const robotsIA = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Bingbot'];

export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /rdv',
      '',
      ...robotsIA.flatMap((bot) => [`User-agent: ${bot}`, 'Allow: /', 'Disallow: /rdv', '']),
      `Sitemap: ${absUrl('/sitemap.xml')}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
