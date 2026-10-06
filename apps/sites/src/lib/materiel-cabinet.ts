// Dessins au trait continu du matériel (registre « ligne », core : svgEquipement) en fichiers SVG AUTONOMES pour <img loading="lazy">
// (/dessins/trait/materiel-<id>.svg) : la section « Matériel et hygiène » (components/MaterielCabinet.astro) se charge sans
// JavaScript et seulement à l'approche de l'écran. Une image ne reçoit pas les variables CSS de la page : la couleur du trait
// (encre de la gamme du cabinet, sinon encre de la charte) est fixée dans le fichier au build, qui est propre à chaque site.
// Aucun <style> dans le fichier (WebKit) : épaisseur et couleur sont en attributs, comme dans tous les dessins en ligne.
import { createHash } from 'node:crypto';
import { EQUIPEMENTS_DESSINES, NEUTRES, gamme, svgEquipement, variantesGamme } from '@plateforme/core';
import { site } from './site';

const g = gamme(site.theme.gamme);
/** Couleur du trait : encre assortie de la gamme (gammes vitaminées) ou encre de la charte */
const ENCRE = g ? variantesGamme(g).encre : NEUTRES.encre;

/** Fichier SVG autonome du dessin au trait d'un équipement (repère 120 × 90) */
function fichier(id: string): string {
  const svg = svgEquipement(id, { registre: 'ligne', id: `t-${id}` })
    .replace(/var\(--dessin-ligne, var\(--dessin-trait, currentColor\)\)/g, ENCRE)
    .replace(/;--ligne-debut:[\d.]+;--ligne-part:[\d.]+/g, '')
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="90" ');
  return svg;
}

export const FICHIERS_TRAIT: ReadonlyMap<string, string> = new Map(EQUIPEMENTS_DESSINES.map((id) => [`materiel-${id}`, fichier(id)]));

/** Adresse versionnée (empreinte du contenu) du dessin au trait d'un équipement, ou '' s'il n'a pas de dessin */
export function urlTraitMateriel(id: string): string {
  const contenu = FICHIERS_TRAIT.get(`materiel-${id}`);
  if (!contenu) return '';
  return `/dessins/trait/materiel-${id}.svg?v=${createHash('sha256').update(contenu).digest('hex').slice(0, 10)}`;
}
