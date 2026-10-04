// Plan du site en Markdown, pour les assistants IA (titres et liens vers chaque page et sa version Markdown).
import type { APIRoute } from 'astro';
import { planDuSite, reponseTexte } from '../lib/agents';

export const GET: APIRoute = () => reponseTexte(planDuSite(), 'text/markdown');
