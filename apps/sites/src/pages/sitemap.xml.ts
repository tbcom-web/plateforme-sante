import type { APIRoute } from 'astro';
import { site, absUrl } from '../lib/site';
import { dateMaj } from '../lib/agents';
import { navigation } from '../lib/navigation';
import { conseils } from '../lib/conseils';

export const GET: APIRoute = () => {
  const derniere = [...site.articles].map((a) => a.date).sort().at(-1);
  // Pages du cabinet : date de la dernière modification de la fiche ; actualités : date de l'article.
  const recente = [dateMaj, derniere].filter(Boolean).sort().at(-1);
  const urls: { path: string; lastmod?: string }[] = [
    { path: '/', lastmod: recente },
    ...navigation.pages.map((path) => ({ path, lastmod: dateMaj })),
    { path: '/soins', lastmod: dateMaj },
    ...site.soins.map((s) => ({ path: `/soins/${s.slug}`, lastmod: dateMaj })),
    { path: '/le-cabinet', lastmod: dateMaj },
    { path: '/acces', lastmod: dateMaj },
    ...(site.articles.length > 0 ? [{ path: '/actualites', lastmod: derniere }] : []),
    ...site.articles.map((a) => ({ path: `/actualites/${a.slug}`, lastmod: a.date })),
    ...(conseils.length > 0 ? [{ path: '/conseils', lastmod: dateMaj }, ...conseils.map((c) => ({ path: `/conseils/${c.slug}`, lastmod: dateMaj }))] : []),
    { path: '/mentions-legales', lastmod: dateMaj },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${absUrl(u.path)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
