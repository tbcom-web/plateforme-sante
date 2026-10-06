// Fichiers techniques relus par le back-office, jamais indexés (X-Robots-Tag dans public/_headers, absents du sitemap) :
// - aperçu (APERCU=1) : /apercu.json indique la date de génération, pour savoir quand le nouvel aperçu est en ligne ;
//   pour une version d'essai, il porte aussi l'horodatage de la demande et le run (suivi « Voir mon site ») ;
// - site publié : /version.json porte l'horodatage de la demande de publication (PUBLICATION_VERSION) et le run GitHub
//   (PUBLICATION_RUN) : le back-office n'annonce « votre site est en ligne » qu'une fois cette version réellement servie.
import type { APIRoute } from 'astro';
import { APERCU } from '../lib/edition';

export function getStaticPaths() {
  return [{ params: { fichier: APERCU ? 'apercu' : 'version' } }];
}

const genere = new Date().toISOString();
const contenu = APERCU
  ? { genere, publication: process.env.PUBLICATION_VERSION || null, run: process.env.PUBLICATION_RUN || null }
  : { publication: process.env.PUBLICATION_VERSION || null, run: process.env.PUBLICATION_RUN || null, genere };

export const GET: APIRoute = () =>
  new Response(JSON.stringify(contenu), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
