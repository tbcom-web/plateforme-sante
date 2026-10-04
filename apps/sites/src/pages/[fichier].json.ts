// Fichier technique de l'aperçu (APERCU=1) : /apercu.json indique la date de génération,
// pour que le back-office sache quand le nouvel aperçu est en ligne. Absent du site publié.
import type { APIRoute } from 'astro';
import { APERCU } from '../lib/edition';

export function getStaticPaths() {
  return APERCU ? [{ params: { fichier: 'apercu' } }] : [];
}

const genere = new Date().toISOString();

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ genere }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
