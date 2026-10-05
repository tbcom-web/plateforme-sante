// KIT : contenu × identité → tout ce qu'il faut pour afficher, contrôler et exporter un mois de publications.
// Fonctions pures (aucun DOM) : le navigateur pose le HTML, le générateur Node écrit le JSON.

import { feuilleCharte } from '@plateforme/core';
import dessinsCss from '@plateforme/core/dessins.css';
import { composer, personnaliser, styleIdentite } from './composer';
import { FEUILLE_GABARITS, rendrePublication } from './gabarits';
import { verifierPublication, verifierSujet, type OptionsControle } from './garde-fous';
import { styleCss, variablesIdentite } from './identite';
import { sujet as trouverSujet } from './sujets';
import type { Programmation } from './calendrier';
import type { Controle, Identite, PublicationPersonnalisee, Style } from './types';

/** Feuille complète (charte + dessins + gabarits) : à poser une fois dans la page */
export const feuilleKit = () => `${feuilleCharte()}${dessinsCss}${FEUILLE_GABARITS}`;

export type ElementKit = {
  programmation: Programmation;
  publication?: PublicationPersonnalisee;
  controle: Controle;
};

/** Compose et contrôle les publications d'une programmation pour une identité (sans rendu) */
export function composerKit(prog: Programmation[], i: Identite, options: OptionsControle = {}): ElementKit[] {
  return prog.filter((p) => p.format !== 'reel').map((p) => {
    const s = trouverSujet(p.sujet);
    if (!s) return { programmation: p, controle: { erreurs: [`sujet « ${p.sujet} » inconnu`], avertissements: [] } };
    const cs = verifierSujet(s, undefined, options);
    if (cs.erreurs.length) return { programmation: p, controle: cs };
    const pub = personnaliser(composer(s, p.format as 'carrousel'), s, i);
    const cp = verifierPublication(pub);
    return { programmation: p, publication: cp.erreurs.length ? undefined : pub, controle: { erreurs: [...cs.erreurs, ...cp.erreurs], avertissements: [...cs.avertissements, ...cp.avertissements] } };
  });
}

/** HTML du kit d'une identité : conteneur porteur des variables de l'identité, une publication par bloc */
export function rendreKit(kit: ElementKit[], i: Identite, style: Style = styleIdentite(i)): string {
  const blocs = kit.map((e) => e.publication
    ? `<div class="cz-publication" data-publication="${e.publication.id}" data-date="${e.programmation.date}">${rendrePublication(e.publication, i, style)}</div>`
    : `<div class="cz-publication cz-publication--refusee" data-publication="${e.programmation.sujet}.${e.programmation.format}"><p>✗ Non généré : ${e.controle.erreurs.length} règle(s) non respectée(s)</p></div>`);
  return `<div class="cz-kit" data-style="${style}" style="${styleCss(variablesIdentite(i, style))}">${blocs.join('')}</div>`;
}
