// Rendu SVG des éléments de la bibliothèque partagée (formes reprises d'ÉcranZen, formes.ts) dans la charte des sites.
//
// Les formes portent des variables --ez-<jeton> (jetons ÉcranZen : peau-2, trait, os…). Ce fichier les relie aux variables de la
// charte des sites, une fois par dessin (style de la balise <svg>), selon le registre :
// - « pedagogique » : illustration à plat, comme en salle d'attente ÉcranZen — peau (--peau…), os, tendon, ongle de la charte
//   (ANATOMIE), objets dans la palette de données (--pression-1…5) et l'accent du cabinet ; contour --dessin-trait ;
// - « releve » : dessin technique monochrome — aplats --dessin-fond, ombres et matières en mélanges du trait (--dessin-trait), un seul
//   accent (--dessin-accent) pour les structures désignées (aponévrose, tendon, pièces de semelle) ; aucune couleur de peau.
// Les deux registres suivent --dessin-trait / --dessin-fond / --dessin-accent du parent (fond plan : .surface-plan) comme svgDessin.
// Aucune couleur littérale : uniquement des variables de la charte (packages/core/src/charte.ts) et des color-mix() entre elles.
import { TRAIT } from '../charte';
import type { Registre } from '../dessins';
import { FORMES as FORMES_EZ, JETONS_FORMES } from './formes';
import { FORMES_DERIVEES } from './derivees';
/** Jetons propres aux formes dérivées (absents des formes ÉcranZen générées) */
const JETONS_DERIVES = ['inflammation'] as const;

/** Formes ÉcranZen (générées) et formes dérivées côté sites (derivees.ts) */
const FORMES = { ...FORMES_EZ, ...FORMES_DERIVEES };

const TR = 'var(--dessin-trait, var(--encre))';
const FD = 'var(--dessin-fond, var(--blanc))';
const AC = 'var(--dessin-accent, var(--accent-vif, var(--encre)))';
const EN = 'var(--encre)';
const BL = 'var(--blanc)';
const m = (a: string, p: number, b: string) => `color-mix(in srgb, ${a} ${p}%, ${b})`;
const P = (k: number) => `var(--pression-${k})`;

/**
 * Correspondance jeton ÉcranZen → couleur des sites, par registre : [pédagogique, relevé].
 * Jetons des formes géométriques (thème zen-doux d'ÉcranZen) puis palettes des éléments HTML colorés (préfixes so- : semelle
 * orthopédique, ch- : chaussure de running, pr- : praticien). Documentée dans docs/charte-graphique.md (« Bibliothèque partagée »).
 */
export const CORRESPONDANCE_JETONS: Record<string, readonly [string, string]> = {
  // Traits et fonds
  trait: [TR, TR],
  encre: [EN, TR],
  fond: [FD, FD],
  blanc: [BL, FD],
  noir: ['var(--nuit)', TR],
  accent: [AC, AC],
  'neutre-clair': [m(TR, 18, FD), m(TR, 8, FD)],
  // Anatomie (jamais de couleur de peau en relevé : aplat du fond, ombres en trait léger)
  'peau-1': ['var(--peau-clair)', FD],
  'peau-2': ['var(--peau)', FD],
  'peau-ombre': ['var(--peau-ombre)', m(TR, 10, FD)],
  ongle: ['var(--ongle)', FD],
  os: ['var(--os)', FD],
  tendon: ['var(--tendon)', m(AC, 22, FD)],
  // Repli enflammé (formes dérivées côté sites) : un peu plus sombre que la peau, localisé ; accent léger en monochrome
  inflammation: [m('var(--peau-ombre)', 88, P(5)), m(AC, 24, FD)],
  // Objets de la géométrie (semelle POD-AT-0004/0005, sandale, chaussure TRV-AT-0009) : palette de données
  chaussure: [m(TR, 62, FD), m(TR, 12, FD)],
  'semelle-ardoise': [m(EN, 72, BL), m(TR, 16, FD)],
  'semelle-lavande': [m(P(1), 55, BL), m(AC, 28, FD)],
  'semelle-moutarde': [P(3), m(AC, 45, FD)],
  'semelle-sarcelle-clair': [m(P(2), 45, BL), m(AC, 12, FD)],
  // Masques de fondu (luminance) : toujours blanc → noir, quel que soit le fond
  'masque-plein': [BL, BL],
  'masque-vide': ['var(--nuit)', 'var(--nuit)'],
  // Semelle orthopédique (élément HTML, palette « sport ») : recouvrement --pression-2, coque --pression-1, élément --pression-3
  'so-recouvrement': [P(2), m(TR, 9, FD)],
  'so-recClair': [m(P(2), 55, BL), m(TR, 4, FD)],
  'so-recOmbre': [m(P(2), 70, EN), m(TR, 14, FD)],
  'so-perfo': [m(P(2), 45, EN), m(TR, 30, FD)],
  'so-dessousRec': [m(P(2), 85, EN), m(TR, 6, FD)],
  'so-coque': [P(1), m(AC, 24, FD)],
  'so-coqueClair': [m(P(1), 60, BL), m(AC, 12, FD)],
  'so-trame': ['rgb(var(--blanc-rgb) / 0.22)', 'rgb(var(--blanc-rgb) / 0)'],
  'so-talonnette': [m(EN, 85, BL), m(TR, 30, FD)],
  'so-talClair': [m(EN, 65, BL), m(TR, 18, FD)],
  'so-element': [P(3), AC],
  'so-elemClair': [m(P(3), 55, BL), m(AC, 50, FD)],
  'so-patine': [m(P(2), 75, BL), m(TR, 6, FD)],
  'so-contour': [m(P(2), 35, EN), TR],
  // Chaussure de running (élément HTML, palette « glacier ») : tige à l'accent du cabinet, mousse claire, gomme ardoise
  'ch-tige': [AC, m(TR, 14, FD)],
  'ch-tigeOmbre': [m(AC, 75, EN), m(TR, 22, FD)],
  'ch-tigeClair': [m(AC, 70, BL), m(TR, 8, FD)],
  'ch-maille': ['rgb(var(--blanc-rgb) / 0.16)', 'rgb(var(--blanc-rgb) / 0.1)'],
  'ch-col': [m(AC, 60, EN), m(TR, 30, FD)],
  'ch-languette': [m(EN, 4, BL), FD],
  'ch-lacets': [BL, m(TR, 45, FD)],
  'ch-mousse': [m(EN, 4, BL), FD],
  'ch-mousseClair': [BL, FD],
  'ch-mousseOmbre': [m(EN, 14, BL), m(TR, 10, FD)],
  'ch-gomme': [m(EN, 62, BL), m(TR, 35, FD)],
  'ch-gommeOmbre': [m(EN, 72, BL), m(TR, 45, FD)],
  'ch-gommeClair': [m(EN, 48, BL), m(TR, 25, FD)],
  'ch-crampon': [m(EN, 70, BL), m(TR, 50, FD)],
  'ch-contour': [m(AC, 40, EN), TR],
  // Praticien neutre (élément HTML) : blouse blanche, encolure et pied brodé à l'accent du cabinet
  'pr-accent': [AC, AC],
  'pr-dessous': [m(AC, 85, EN), m(TR, 40, FD)],
  'pr-teinte': [m(AC, 50, BL), m(TR, 20, FD)],
  'pr-blouse-base': [m(EN, 3, BL), FD],
  'pr-blouse-clair': [BL, FD],
  'pr-blouse-ombre': [m(EN, 13, BL), m(TR, 10, FD)],
  'pr-blouse-profond': [m(EN, 25, BL), m(TR, 20, FD)],
};

/** Épaisseurs ÉcranZen (fin, normal, épais) → traits de la charte (fin, normal, fort), ramenés du repère 240 u des dessins au repère 512 u des atomes. */
const ECHELLE_TRAIT = 512 / 240;
const EPAISSEURS: Record<string, number> = { fin: TRAIT.fin, normal: TRAIT.normal, epais: TRAIT.fort };

/** Jetons utilisés par les formes et sans correspondance (contrôle : doit rester vide). */
export const jetonsSansCorrespondance = (): string[] =>
  JETONS_FORMES.filter((j) => !j.startsWith('ep-') && !CORRESPONDANCE_JETONS[j]);

let compteur = 0;
const echapper = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Identifiants des formes disponibles (une forme = un élément dans une vue et un état). */
export const FORMES_BIBLIOTHEQUE = Object.keys(FORMES);

/**
 * SVG d'une forme de la bibliothèque (clé de FORMES). `registre` : « pedagogique » (défaut) ou « releve ».
 * `titre` : alternative textuelle (sinon aria-hidden). `classe` : classes ajoutées à la balise <svg>. `echelleTrait` : unités de la
 * forme par unité d'affichage (forme posée dans un dessin : les traits gardent les graisses de la charte).
 */
export function svgForme(cle: string, opts: { registre?: Registre; titre?: string; classe?: string; id?: string; echelleTrait?: number } = {}): string {
  const f = FORMES[cle];
  if (!f) throw new Error(`bibliothèque : forme inconnue « ${cle} »`);
  const r = (opts.registre ?? 'pedagogique') === 'releve' ? 1 : 0;
  const vars: string[] = [];
  for (const j of [...JETONS_FORMES, ...JETONS_DERIVES]) {
    if (j.startsWith('ep-')) vars.push(`--ez-${j}:${+(EPAISSEURS[j.slice(3)] * (opts.echelleTrait ?? ECHELLE_TRAIT)).toFixed(2)}`);
    else if (CORRESPONDANCE_JETONS[j] && f.corps.includes(`--ez-${j})`)) vars.push(`--ez-${j}:${CORRESPONDANCE_JETONS[j][r]}`);
  }
  const corps = f.ids ? f.corps.split('EZID').join(opts.id ?? `ez${++compteur}`) : f.corps;
  const classes = ['bibliotheque', `bibliotheque--${r ? 'releve' : 'pedagogique'}`, opts.classe].filter(Boolean).join(' ');
  const a11y = opts.titre ? `role="img" aria-label="${echapper(opts.titre)}"` : 'aria-hidden="true"';
  return `<svg class="${echapper(classes)}" viewBox="${f.viewBox.join(' ')}" ${a11y} fill="none" stroke-linecap="round" stroke-linejoin="round" style="${vars.join(';')}">${corps}</svg>`;
}
