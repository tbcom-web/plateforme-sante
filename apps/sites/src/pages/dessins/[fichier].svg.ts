// Dessins de la marque en fichiers SVG statiques, générés au build : /dessins/<nom>.svg (registre relevé),
// /dessins/<nom>-pedagogique.svg, /dessins/empreintes-<appui>.svg et /dessins/materiel-<équipement>.svg
// (et -pedagogique). Les pages les référencent par <svg><use href="/dessins/….svg#d"/></svg>
// (components/dessins/Dessin.astro, Empreintes.astro, gabarit/Materiel.astro) : le tracé
// n'est plus recopié dans chaque page (HTML léger, fichier mis en cache d'une page à l'autre), et les couleurs
// restent celles du site et de la surface, héritées à travers <use> (--dessin-*, --pression-*, accent de la gamme).
import type { APIRoute, GetStaticPaths } from 'astro';
import css from '@plateforme/core/dessins.css?raw';
import { DESSINS_PODOLOGIE, EQUIPEMENTS_DESSINES, symboleDessin, symboleEmpreintes, symboleEquipement, type NomDessin } from '@plateforme/core';
import type { Appui } from '../../components/dessins/trame';

const APPUIS: Appui[] = ['normal', 'creux', 'plat', 'avant', 'talon', 'reparti', 'enfant'];
// Contour des empreintes : pointillés à la couleur du texte de la page
const CSS_EMPREINTES = '.empreintes__contour{fill:none;stroke:currentColor;stroke-width:var(--pointille-leger-point);stroke-dasharray:var(--pointille);opacity:var(--pointille-leger-opacite)}';

/**
 * Feuille réduite aux règles utiles au fichier : sans commentaires, sans animations ni règles d'apparition
 * (.pret, réservées au dessin posé dans la page) et sans les règles dont aucune classe n'apparaît dans le tracé.
 */
function styleUtile(feuille: string, contenu: string): string {
  const classes = new Set([...contenu.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
  return feuille
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@(?:keyframes|media)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
    .split('}')
    .map((r) => r.trim())
    .filter((r) => {
      const selecteur = r.split('{')[0];
      if (!r.includes('{') || selecteur.includes('.pret')) return false;
      const utiles = [...selecteur.matchAll(/\.([\w-]+)/g)].map((m) => m[1]).filter((c) => c !== 'dessin');
      return utiles.length === 0 || utiles.some((c) => classes.has(c));
    })
    .map((r) => `${r.replace(/\s+/g, ' ').replace(/\s*([{};:,>])\s*/g, '$1')}}`)
    .join('');
}

export const getStaticPaths: GetStaticPaths = () => [
  ...DESSINS_PODOLOGIE.flatMap((nom) => [
    { params: { fichier: nom }, props: { contenu: symboleDessin(nom as NomDessin), style: css } },
    { params: { fichier: `${nom}-pedagogique` }, props: { contenu: symboleDessin(nom as NomDessin, { registre: 'pedagogique' }), style: css } },
  ]),
  ...APPUIS.map((a) => ({ params: { fichier: `empreintes-${a}` }, props: { contenu: symboleEmpreintes(a), style: CSS_EMPREINTES } })),
  ...EQUIPEMENTS_DESSINES.flatMap((id) => [
    { params: { fichier: `materiel-${id}` }, props: { contenu: symboleEquipement(id), style: css } },
    { params: { fichier: `materiel-${id}-pedagogique` }, props: { contenu: symboleEquipement(id, { registre: 'pedagogique' }), style: css } },
  ]),
];

export const GET: APIRoute = ({ props }) =>
  new Response(`<svg xmlns="http://www.w3.org/2000/svg"><style>${styleUtile(props.style, props.contenu)}</style>${props.contenu}</svg>`, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
