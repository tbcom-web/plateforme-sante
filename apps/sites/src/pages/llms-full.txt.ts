// Contenu complet du site en un seul fichier Markdown (convention llms-full.txt), pour les assistants IA.
import type { APIRoute } from 'astro';
import { site, absUrl } from '../lib/site';
import { pagesMarkdown, sectionMarkdown, reponseTexte, dateMaj } from '../lib/agents';

export const GET: APIRoute = () =>
  reponseTexte(
    [
      `# ${site.cabinet.nom} : contenu complet du site`,
      '',
      `> Contenu du site ${absUrl('/')} en Markdown, mis à jour le ${dateMaj}. Résumé : ${absUrl('/llms.txt')}.`,
      '',
      // Chaque page devient une section de niveau 2.
      pagesMarkdown().map(sectionMarkdown).join('\n---\n\n'),
    ].join('\n'),
    'text/plain',
  );
