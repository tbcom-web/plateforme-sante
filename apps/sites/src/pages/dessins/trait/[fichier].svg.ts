// Dessins au trait du matériel en fichiers SVG autonomes (/dessins/trait/materiel-<id>.svg), pour <img loading="lazy"> :
// contenu et adresse versionnée dans lib/materiel-cabinet.ts.
import type { APIRoute, GetStaticPaths } from 'astro';
import { FICHIERS_TRAIT } from '../../../lib/materiel-cabinet';

export const getStaticPaths: GetStaticPaths = () => [...FICHIERS_TRAIT].map(([fichier, contenu]) => ({ params: { fichier }, props: { contenu } }));

export const GET: APIRoute = ({ props }) => new Response(props.contenu, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
