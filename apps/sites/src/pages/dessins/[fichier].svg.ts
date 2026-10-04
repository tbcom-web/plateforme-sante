// Dessins de la marque en fichiers SVG statiques, générés au build : /dessins/<nom>.svg (registre relevé),
// /dessins/<nom>-pedagogique.svg, /dessins/empreintes-<appui>.svg et /dessins/materiel-<équipement>.svg
// (et -pedagogique). Les pages les référencent par <svg><use data-dessin="/dessins/….svg?v=…#d"/></svg>
// (components/dessins/Dessin.astro, Empreintes.astro, gabarit/Materiel.astro) : le tracé
// n'est plus recopié dans chaque page (HTML léger, fichier mis en cache d'une page à l'autre), et les couleurs
// restent celles du site et de la surface, héritées à travers <use> (--dessin-*, --pression-*, accent de la gamme).
// Contenu et adresse versionnée : lib/fichiers-dessins.ts.
import type { APIRoute, GetStaticPaths } from 'astro';
import { FICHIERS_DESSINS } from '../../lib/fichiers-dessins';

export const getStaticPaths: GetStaticPaths = () => [...FICHIERS_DESSINS].map(([fichier, contenu]) => ({ params: { fichier }, props: { contenu } }));

export const GET: APIRoute = ({ props }) =>
  new Response(props.contenu, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
