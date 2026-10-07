// « Habillage » d'une recette du studio : typographie (typo.ts), jeu de détails (details.ts) et menu (menus.ts). Ce module relie ces
// trois ingrédients au reste : tirages pondérés par les notes (dés 🎲 du panneau « Typographie & détails », verrous par axe),
// normalisation, clés apprises et notables, feuille CSS unique et attributs de la racine (data-td, data-mn) pour le site et
// l'aperçu. Une composition sans habillage (anciennes recettes) se rend exactement comme avant : réglages par défaut, CSS vide.
// Module pur.

import { AXES_TYPO, TYPO_PAR_DEFAUT, clesTypo, cssTypo, normaliserTypo, estTypoParDefaut, libelleTypo, type AxeTypo, type ReglagesTypo } from './typo';
import { DETAILS_PAR_DEFAUT, ELEMENTS_DETAILS, JEUX_DETAILS, clesDetails, cssDetails, detailsDuJeu, estDetailsParDefaut, libelleDetails, normaliserDetails, type ElementDetails, type ReglagesDetails } from './details';
import { AXES_MENU, MENU_PAR_DEFAUT, clesMenu, cssMenu, estMenuParDefaut, libelleMenu, menusPermis, normaliserMenu, type AxeMenu, type ReglagesMenu } from './menus';
import type { Gabarit } from './modeles';

export type Habillage = { typo: ReglagesTypo; details: ReglagesDetails; menu: ReglagesMenu };
export const HABILLAGE_PAR_DEFAUT: Habillage = { typo: TYPO_PAR_DEFAUT, details: DETAILS_PAR_DEFAUT, menu: MENU_PAR_DEFAUT };

/** Habillage reçu (recette, brouillon), remis dans les valeurs connues et les menus permis du gabarit */
export function normaliserHabillage(brut: { typo?: unknown; details?: unknown; menu?: unknown } | null | undefined, g?: Gabarit): Habillage {
  return { typo: normaliserTypo(brut?.typo), details: normaliserDetails(brut?.details), menu: normaliserMenu(brut?.menu, g) };
}
export const estHabillageParDefaut = (h: Habillage) => estTypoParDefaut(h.typo) && estDetailsParDefaut(h.details) && estMenuParDefaut(h.menu);

/**
 * Feuille CSS de l'habillage (typo + détails + menu) et attributs de la racine. `mono` : la mono des données est chargée (registre
 * relevé du gabarit classique) — l'italique d'accent passe alors en couleur (3 fichiers de police au plus).
 */
export function cssHabillage(h: Habillage, opts: { police?: unknown; gabarit?: Gabarit; mono?: boolean } = {}): string {
  return cssTypo(h.typo, { police: opts.police, mono: opts.mono }) + cssDetails(h.details) + cssMenu(h.menu, opts.gabarit ?? 'tableau');
}
export function attributsHabillage(h: Habillage, g: Gabarit = 'tableau'): { 'data-td'?: string; 'data-mn'?: string } {
  return {
    ...(estTypoParDefaut(h.typo) && estDetailsParDefaut(h.details) ? {} : { 'data-td': h.details.jeu }),
    ...(estMenuParDefaut(normaliserMenu(h.menu, g)) ? {} : { 'data-mn': `${h.menu.ordinateur}-${h.menu.mobile}` }),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Tirages (dés du studio)
// ---------------------------------------------------------------------------------------------------------------

/** Axes du panneau « Typographie & détails » : chacun a son dé, son retour et son verrou (`hab:<groupe>:<axe>`) */
export type AxeHabillage = { groupe: 'typo'; axe: AxeTypo } | { groupe: 'details'; axe: ElementDetails | 'jeu' } | { groupe: 'menu'; axe: AxeMenu };
export const verrouAxe = (a: AxeHabillage) => `hab:${a.groupe}:${a.axe}`;

function choisir<T>(l: readonly { v: T; p: number }[], r: () => number, eviter?: T): T {
  const c = l.length > 1 && eviter !== undefined ? l.filter((x) => x.v !== eviter) : l;
  const total = c.reduce((s, x) => s + Math.max(0, x.p), 0);
  let x = r() * (total || c.length);
  for (const e of c) { x -= total ? Math.max(0, e.p) : 1; if (x < 0) return e.v; }
  return c[c.length - 1].v;
}
const masse = (e: number) => 2 ** Math.max(-3, Math.min(2, e));
/** Préférences douces : les valeurs sages sortent plus souvent que les extrêmes (le hasard reste ouvert) */
const PREFERENCES: Record<string, number> = {
  'typo:echelle:affirmee': 1.6, 'typo:casse:normale': 1.8, 'typo:graisse:paire': 1.6, 'typo:interlettrage:normal': 1.5, 'typo:alignement:gauche': 1.5,
  'details:densite:aeree': 1.5, 'menu:ordinateur:gabarit': 1.4, 'menu:mobile:gabarit': 1.2, 'menu:rdv:gabarit': 1.5,
};

/**
 * Tire l'habillage : axes non verrouillés seulement (`verrous` : identifiants verrouAxe), pondérés par les notes apprises
 * (`effet(cle)` : clés atelier `typo=<axe>:<v>`, `details=…`, `menu=…`). `axes` absent : tout l'habillage ; le jeu de détails tiré
 * pose tous ses éléments (sauf verrouillés). Déterministe pour un même générateur.
 */
export function tirerHabillage(h: Habillage, r: () => number, opts: { axes?: readonly AxeHabillage[]; verrous?: readonly string[]; effet?: (cle: string) => number; gabarit?: Gabarit } = {}): Habillage {
  const verrous = new Set(opts.verrous ?? []);
  const effet = opts.effet ?? (() => 0);
  const g = opts.gabarit ?? 'tableau';
  const tous: AxeHabillage[] = opts.axes ? [...opts.axes] : [
    ...(Object.keys(AXES_TYPO) as AxeTypo[]).map((axe) => ({ groupe: 'typo' as const, axe })),
    { groupe: 'details', axe: 'jeu' },
    ...(Object.keys(AXES_MENU) as AxeMenu[]).map((axe) => ({ groupe: 'menu' as const, axe })),
  ];
  const typo = { ...h.typo } as Record<string, string>;
  let details = { ...h.details } as Record<string, string>;
  const menu = { ...h.menu } as Record<string, string>;
  const poids = (groupe: string, axe: string, v: string) => (PREFERENCES[`${groupe}:${axe}:${v}`] ?? 1) * masse(effet(`${groupe}=${axe}:${v}`));
  for (const a of tous) {
    if (verrous.has(verrouAxe(a))) continue;
    if (a.groupe === 'typo') {
      const vals = (AXES_TYPO[a.axe] as readonly { id: string }[]).map((x) => x.id);
      typo[a.axe] = choisir(vals.map((v) => ({ v, p: poids('typo', a.axe, v) })), r, opts.axes ? typo[a.axe] : undefined);
    } else if (a.groupe === 'details' && a.axe === 'jeu') {
      const jeu = choisir(JEUX_DETAILS.map((j) => ({ v: j.id as string, p: (j.id === 'gabarit' ? 0.5 : 1) * masse(effet(`details=jeu:${j.id}`)) })), r, details.jeu);
      const nouveau = detailsDuJeu(jeu) as Record<string, string>;
      for (const e of Object.keys(ELEMENTS_DETAILS)) if (verrous.has(`hab:details:${e}`)) nouveau[e] = details[e];
      details = nouveau;
    } else if (a.groupe === 'details') {
      const vals = (ELEMENTS_DETAILS[a.axe as ElementDetails] as readonly { id: string }[]).map((x) => x.id);
      details[a.axe] = choisir(vals.map((v) => ({ v, p: poids('details', a.axe, v) })), r, details[a.axe]);
    } else {
      const vals = menusPermis(g)[a.axe] as readonly string[];
      menu[a.axe] = choisir(vals.map((v) => ({ v, p: poids('menu', a.axe, v) })), r, opts.axes ? menu[a.axe] : undefined);
    }
  }
  return normaliserHabillage({ typo, details, menu }, g);
}

// ---------------------------------------------------------------------------------------------------------------
// Apprentissage, notables, libellés
// ---------------------------------------------------------------------------------------------------------------

/** Clés apprises (atelier) : une par axe, `typo=<axe>:<v>`, `details=jeu:<id>` et `details=<élément>:<v>`, `menu=<axe>:<v>` */
export function clesAtelierHabillage(h: Habillage): string[] {
  return [
    ...(Object.keys(AXES_TYPO) as AxeTypo[]).map((a) => `typo=${a}:${h.typo[a]}`),
    `details=jeu:${h.details.jeu}`, ...(Object.keys(ELEMENTS_DETAILS) as ElementDetails[]).map((e) => `details=${e}:${h.details[e]}`),
    ...(Object.keys(AXES_MENU) as AxeMenu[]).map((a) => `menu=${a}:${h.menu[a]}`),
  ];
}
/** Clés notables (assets_notes : types typo, details, menu) renforcées par la note d'une recette */
export const clesNotablesHabillage = (h: Habillage, police: unknown): string[] => [...clesTypo(police, h.typo), ...clesDetails(h.details), ...clesMenu(h.menu)];
/** Lignes lisibles (studio, export) */
export const libellesHabillage = (h: Habillage): { dimension: string; valeur: string }[] => [
  { dimension: 'Typographie', valeur: libelleTypo(h.typo) },
  { dimension: 'Détails', valeur: libelleDetails(h.details) },
  { dimension: 'Menu', valeur: libelleMenu(h.menu) },
];
