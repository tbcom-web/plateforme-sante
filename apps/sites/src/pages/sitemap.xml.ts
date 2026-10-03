import type { APIRoute } from 'astro';
import { site, absUrl } from '../lib/site';

export const GET: APIRoute = () => {
  const derniere = [...site.articles].map((a) => a.date).sort().at(-1);
  const urls: { path: string; lastmod?: string }[] = [
    { path: '/', lastmod: derniere },
    { path: '/soins' },
    ...site.soins.map((s) => ({ path: `/soins/${s.slug}` })),
    { path: '/a-propos' },
    ...(site.articles.length > 0 ? [{ path: '/actualites', lastmod: derniere }] : []),
    ...site.articles.map((a) => ({ path: `/actualites/${a.slug}`, lastmod: a.date })),
    { path: '/mentions-legales' },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${absUrl(u.path)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
