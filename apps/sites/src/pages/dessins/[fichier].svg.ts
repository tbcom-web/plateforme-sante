// Dessins de la marque en fichiers SVG statiques, générés au build : /dessins/<nom>.svg (registre relevé),
// /dessins/<nom>-pedagogique.svg, /dessins/empreintes-<appui>.svg et /dessins/materiel-<équipement>.svg
// (et -pedagogique). Les pages les référencent par <svg><use href="/dessins/….svg#d"/></svg>
// (components/dessins/Dessin.astro, Empreintes.astro, gabarit/Materiel.astro) : le tracé
// n'est plus recopié dans chaque page (HTML léger, fichier mis en cache d'une page à l'autre), et les couleurs
// restent celles du site et de la surface, héritées à travers <use> (--dessin-*, --pression-*, accent de la gamme).
// Styles EN LIGNE (core : fichiers-svg.ts) : WebKit (iPhone) ignore la feuille <style> d'un SVG externe référencé par <use>.
import type { APIRoute, GetStaticPaths } from 'astro';
import css from '@plateforme/core/dessins.css?raw';
import { fichierSvg } from '@plateforme/core/fichiers-svg';
import { DESSINS_PODOLOGIE, EQUIPEMENTS_DESSINES, symboleDessin, symboleEmpreintes, symboleEquipement, type NomDessin } from '@plateforme/core';
import type { Appui } from '../../components/dessins/trame';

const APPUIS: Appui[] = ['normal', 'creux', 'plat', 'avant', 'talon', 'reparti', 'enfant'];
// Contour des empreintes : pointillés à la couleur du texte de la page
const CSS_EMPREINTES = '.empreintes__contour{fill:none;stroke:currentColor;stroke-width:var(--pointille-leger-point);stroke-dasharray:var(--pointille);opacity:var(--pointille-leger-opacite)}';

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
  new Response(fichierSvg(props.contenu, props.style), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
