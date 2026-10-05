// Point d'entrée NAVIGATEUR (paquet IIFE « Contenus », dist/contenus.js) : aperçu instantané d'un kit pour une identité,
// sans construction ni serveur. Utilisé par la page d'aperçu (scripts/generer.mjs), l'export Playwright, et demain
// l'admin et l'aperçu gratuit.
//
//   Contenus.monter(element, identite, { style })  → pose le kit du mois, ajuste les textes, renvoie { ms, defauts }
//   Contenus.changerStyle / changerCouleurs        → mise à jour en direct (variables CSS seulement, sans recomposer)
export * from './index';
export { ajuster, controlerRendu, contrasteRvb, ZONE_UTILE_STORY } from './rendu-navigateur';

import { MOIS_TYPE_OCTOBRE, type Programmation } from './calendrier';
import { composerKit, feuilleKit, rendreKit, type ElementKit } from './kit';
import { ajuster, controlerRendu, type DefautRendu } from './rendu-navigateur';
import { styleIdentite } from './composer';
import { styleCss, variablesIdentite } from './identite';
import type { Identite, Style } from './types';

let feuillePosee = false;
/** Pose la feuille du kit (charte, dessins, gabarits) et les polices, une fois par page */
export function poserFeuille(polices = '') {
  if (feuillePosee) return;
  const s = document.createElement('style');
  s.textContent = polices + feuilleKit();
  document.head.appendChild(s);
  feuillePosee = true;
}

export type ResultatMontage = { ms: number; msParPublication: number[]; defauts: DefautRendu[]; kit: ElementKit[] };

/** Monte le kit d'une identité dans un élément : composition, rendu, ajustement, contrôle — mesuré */
export async function monter(el: HTMLElement, i: Identite, o: { style?: Style; programmation?: Programmation[]; controler?: boolean } = {}): Promise<ResultatMontage> {
  const t0 = performance.now();
  const style = o.style ?? styleIdentite(i);
  const kit = composerKit(o.programmation ?? MOIS_TYPE_OCTOBRE, i);
  el.innerHTML = rendreKit(kit, i, style);
  await document.fonts.ready;
  const msParPublication: number[] = [];
  for (const bloc of Array.from(el.querySelectorAll<HTMLElement>('.cz-publication'))) {
    const t = performance.now();
    ajuster(bloc);
    msParPublication.push(performance.now() - t);
  }
  const ms = performance.now() - t0;
  const defauts = o.controler === false ? [] : Array.from(el.querySelectorAll<HTMLElement>('section.cz')).flatMap(controlerRendu);
  return { ms, msParPublication, defauts, kit };
}

/** Mise à jour en direct des couleurs (gamme ou couleur libre) : seules les variables changent, puis réajustement */
export function changerCouleurs(el: HTMLElement, i: Identite, style: Style = styleIdentite(i)) {
  const kit = el.querySelector<HTMLElement>('.cz-kit');
  if (kit) kit.setAttribute('style', styleCss(variablesIdentite(i, style)));
}
