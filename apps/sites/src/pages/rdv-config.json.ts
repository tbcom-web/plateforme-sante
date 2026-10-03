// Lu par la fonction Cloudflare /rdv pour connaître l'adresse de redirection (cabinet + un lien par praticien).
import type { APIRoute } from 'astro';
import { site } from '../lib/site';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      siteId: site.id,
      url: site.rdv.url,
      praticiens: site.praticiens.map((p) => p.rdvUrl || site.rdv.url),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
