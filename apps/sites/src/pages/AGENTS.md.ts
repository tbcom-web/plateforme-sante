// Consignes pour les agents IA (convention AGENTS.md) : ce que le site permet et les limites d'un site de santé.
import type { APIRoute } from 'astro';
import { consignesAgents, reponseTexte } from '../lib/agents';

export const GET: APIRoute = () => reponseTexte(consignesAgents(), 'text/markdown');
