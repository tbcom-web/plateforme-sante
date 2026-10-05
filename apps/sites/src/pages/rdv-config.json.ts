// Lu par la fonction Cloudflare /rdv pour connaître l'adresse de redirection (cabinet + un lien par praticien).
import type { APIRoute } from 'astro';
import { site } from '../lib/site';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      siteId: site.id,
      // Sans lien utilisable (replis.ts) : la rubrique « Prise de rendez-vous » du site, jamais une redirection vide.
      url: site.rdv.url || '/acces#rdv',
      praticiens: site.praticiens.map((p) => p.rdvUrl || site.rdv.url || '/acces#rdv'),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
