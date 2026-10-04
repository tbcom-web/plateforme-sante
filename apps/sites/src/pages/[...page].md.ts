// Version Markdown de chaque page (/index.md, /soins/x.md…), annoncée par <link rel="alternate" type="text/markdown">.
// Non indexée (X-Robots-Tag: noindex) et rattachée à la page HTML (en-tête Link canonical) : voir astro.config.mjs.
import type { APIRoute, GetStaticPaths } from 'astro';
import { pagesMarkdown, cheminMarkdown, documentMarkdown, reponseTexte } from '../lib/agents';

export const getStaticPaths: GetStaticPaths = () =>
  pagesMarkdown().map((p) => ({ params: { page: cheminMarkdown(p.path).slice(1, -3) }, props: { page: p } }));

export const GET: APIRoute = ({ props }) => reponseTexte(documentMarkdown(props.page), 'text/markdown');
