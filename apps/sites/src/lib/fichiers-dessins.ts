// Fichiers SVG des dessins de la marque (/dessins/<fichier>.svg), générés au build : contenu de chaque
// fichier et adresse versionnée (empreinte du contenu en paramètre « v »). Les pages pointent vers
// l'adresse versionnée ; le fichier peut ainsi être mis en cache sans limite (_headers, « immutable ») et
// tout dessin retouché change d'adresse au build suivant.
// Les composants posent l'adresse dans <use data-dessin> ; components/dessins/ChargeurDessins.astro la reporte
// dans href à l'approche de l'écran : aucun dessin n'est téléchargé pendant le premier affichage de la page.
// Styles EN LIGNE (core : fichiers-svg.ts) : WebKit ignore la feuille <style> d'un SVG externe référencé par <use>.
import { createHash } from 'node:crypto';
import css from '@plateforme/core/dessins.css?raw';
import { fichierSvg } from '@plateforme/core/fichiers-svg';
import { DESSINS_PODOLOGIE, EQUIPEMENTS_DESSINES, symboleDessin, symboleEmpreintes, symboleEquipement, type NomDessin } from '@plateforme/core';
import type { Appui } from '../components/dessins/trame';

const APPUIS: Appui[] = ['normal', 'creux', 'plat', 'avant', 'talon', 'reparti', 'enfant'];
// Contour des empreintes : pointillés à la couleur du texte de la page
const CSS_EMPREINTES = '.empreintes__contour{fill:none;stroke:currentColor;stroke-width:var(--pointille-leger-point);stroke-dasharray:var(--pointille);opacity:var(--pointille-leger-opacite)}';

/** Contenu de chaque fichier, par nom (« voutes », « voutes-pedagogique », « empreintes-reparti »…). */
export const FICHIERS_DESSINS: ReadonlyMap<string, string> = new Map(
  ([
    ...DESSINS_PODOLOGIE.flatMap((nom) => [
      [nom, symboleDessin(nom as NomDessin), css],
      [`${nom}-pedagogique`, symboleDessin(nom as NomDessin, { registre: 'pedagogique' }), css],
    ]),
    ...APPUIS.map((a) => [`empreintes-${a}`, symboleEmpreintes(a), CSS_EMPREINTES]),
    ...EQUIPEMENTS_DESSINES.flatMap((id) => [
      [`materiel-${id}`, symboleEquipement(id), css],
      [`materiel-${id}-pedagogique`, symboleEquipement(id, { registre: 'pedagogique' }), css],
    ]),
  ] as [string, string, string][]).map(([fichier, contenu, style]): [string, string] => [fichier, fichierSvg(contenu, style)]),
);

/** Adresse du symbole d'un fichier de dessin, versionnée par son contenu : « /dessins/voutes.svg?v=1a2b3c4d#d ». */
export function urlDessin(fichier: string): string {
  const contenu = FICHIERS_DESSINS.get(fichier);
  const version = contenu ? `?v=${createHash('sha256').update(contenu).digest('hex').slice(0, 10)}` : '';
  return `/dessins/${fichier}.svg${version}#d`;
}
