// Favicon généré à partir du logo du site : marque choisie (site.theme.logo), version compacte lisible
// en 16 px, aux couleurs de la gamme (ou de la couleur libre) et selon le traitement du modèle.
import type { APIRoute } from 'astro';
import { svgFavicon, validerChoixLogo } from '@plateforme/core';
import { site } from '../lib/site';

export const GET: APIRoute = () => {
  const nom = site.praticiens.length > 1 ? site.cabinet.nom : `${site.praticiens[0].prenom} ${site.praticiens[0].nom}`;
  const svg = svgFavicon(validerChoixLogo(site.theme.logo, site.profession.slug), site.modele, site.theme, nom);
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
