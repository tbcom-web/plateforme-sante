// Attributs d'harmonie des ingrédients d'habillage (paires de polices, typographie, jeux de détails et éléments, menus), pour le
// moteur de règles d'harmonie du Studio (harmonie.ts) : il contraint le tirage aléatoire pour que les ingrédients tirés ensemble
// se répondent. Chaque valeur porte :
// - famille : une ou plusieurs parmi editorial, technique, doux, pop, classique, nature, minimal ;
// - rondeur, contraste, energie, formalite : 0 à 1 (0 = anguleux / faible contraste / calme / décontracté) ;
// - expressif : élément fort qui ne doit pas se cumuler avec un autre élément expressif sur le même écran ;
// - polices seulement : categorie (genre typographique) et capitalesOk (lisible en MAJUSCULES espacées).
// Valeurs posées par le directeur artistique (2026-10-07), à ajuster d'après les notes de Paul. Module pur.

import type { PoliceTitres, PoliceTexte } from './modeles';

export type FamilleHarmonie = 'editorial' | 'technique' | 'doux' | 'pop' | 'classique' | 'nature' | 'minimal';
export type AttributsHarmonie = { famille: readonly FamilleHarmonie[]; rondeur: number; contraste: number; energie: number; formalite: number; expressif: boolean };
export type CategoriePolice = 'serif-editoriale' | 'didone' | 'grotesque' | 'geometrique' | 'humaniste' | 'slab' | 'condensee' | 'ronde' | 'mono' | 'script';
export type AttributsPolice = AttributsHarmonie & { categorie: CategoriePolice; capitalesOk: boolean };

const a = (famille: FamilleHarmonie[], rondeur: number, contraste: number, energie: number, formalite: number, expressif = false): AttributsHarmonie => ({ famille, rondeur, contraste, energie, formalite, expressif });
const p = (categorie: CategoriePolice, capitalesOk: boolean, x: AttributsHarmonie): AttributsPolice => ({ ...x, categorie, capitalesOk });

/** Polices (titres ou texte) */
export const ATTRIBUTS_POLICES: Record<PoliceTitres | PoliceTexte, AttributsPolice> = {
  inter: p('grotesque', true, a(['minimal', 'technique'], 0.3, 0.2, 0.4, 0.6)),
  manrope: p('geometrique', true, a(['doux', 'minimal'], 0.6, 0.2, 0.4, 0.5)),
  fraunces: p('serif-editoriale', true, a(['editorial', 'nature'], 0.6, 0.6, 0.5, 0.6, true)),
  instrument: p('serif-editoriale', false, a(['editorial'], 0.3, 0.7, 0.4, 0.8, true)),
  schibsted: p('grotesque', true, a(['technique', 'editorial'], 0.2, 0.4, 0.6, 0.6)),
  nunito: p('ronde', true, a(['doux'], 0.9, 0.2, 0.4, 0.3)),
  geist: p('geometrique', true, a(['minimal', 'technique'], 0.4, 0.2, 0.4, 0.6)),
  publicsans: p('grotesque', true, a(['classique', 'minimal'], 0.4, 0.2, 0.3, 0.7)),
  bodoni: p('didone', true, a(['editorial', 'classique'], 0.2, 0.95, 0.4, 0.9, true)),
  newsreader: p('serif-editoriale', true, a(['editorial', 'classique'], 0.4, 0.5, 0.3, 0.8)),
  playfair: p('didone', true, a(['editorial', 'classique'], 0.4, 0.9, 0.5, 0.8, true)),
  dmserif: p('didone', true, a(['editorial', 'pop'], 0.5, 0.85, 0.6, 0.6, true)),
  youngserif: p('serif-editoriale', true, a(['nature', 'doux', 'classique'], 0.7, 0.4, 0.4, 0.5, true)),
  lora: p('serif-editoriale', true, a(['classique', 'nature'], 0.6, 0.5, 0.3, 0.7)),
  cormorant: p('serif-editoriale', false, a(['editorial', 'classique'], 0.4, 0.8, 0.3, 0.95, true)),
  robotoslab: p('slab', true, a(['technique', 'classique'], 0.3, 0.3, 0.5, 0.6)),
  spacegrotesk: p('grotesque', true, a(['technique', 'pop'], 0.3, 0.3, 0.7, 0.4, true)),
  outfit: p('geometrique', true, a(['pop', 'doux'], 0.8, 0.2, 0.7, 0.3)),
  oswald: p('condensee', true, a(['pop', 'technique'], 0.1, 0.4, 0.9, 0.4, true)),
  quicksand: p('ronde', true, a(['doux'], 1, 0.1, 0.4, 0.2)),
  jakarta: p('geometrique', true, a(['pop', 'minimal'], 0.6, 0.3, 0.6, 0.5)),
  figtree: p('geometrique', true, a(['doux', 'minimal'], 0.6, 0.2, 0.5, 0.4)),
  dmsans: p('geometrique', true, a(['minimal', 'doux'], 0.6, 0.2, 0.4, 0.5)),
  worksans: p('grotesque', true, a(['minimal', 'editorial'], 0.4, 0.2, 0.4, 0.6)),
  sourcesans: p('humaniste', true, a(['classique', 'nature'], 0.5, 0.2, 0.3, 0.6)),
  mono: p('mono', true, a(['technique'], 0.2, 0.3, 0.6, 0.5, true)),
};

/** Paires de polices (PAIRES_POLICES, modeles.ts) : attributs de la police des titres, nuancés par celle du texte */
export const ATTRIBUTS_PAIRES: Record<string, AttributsPolice> = {
  grotesque: p('grotesque', true, a(['technique', 'editorial'], 0.2, 0.4, 0.6, 0.6)),
  geometrique: p('geometrique', true, a(['minimal', 'technique'], 0.4, 0.2, 0.4, 0.6)),
  publique: p('grotesque', true, a(['classique', 'minimal'], 0.4, 0.2, 0.3, 0.7)),
  revue: p('didone', true, a(['editorial', 'classique'], 0.2, 0.95, 0.4, 0.9, true)),
  editoriale: p('serif-editoriale', true, a(['editorial', 'nature'], 0.6, 0.6, 0.5, 0.6, true)),
  douce: p('geometrique', true, a(['doux', 'minimal'], 0.6, 0.2, 0.4, 0.5)),
  'serif-fine': p('serif-editoriale', false, a(['editorial'], 0.3, 0.7, 0.4, 0.8, true)),
  ronde: p('ronde', true, a(['doux'], 0.9, 0.2, 0.4, 0.3)),
  clinique: p('grotesque', true, a(['minimal', 'technique'], 0.3, 0.2, 0.3, 0.7)),
  didone: p('didone', true, a(['editorial', 'classique'], 0.4, 0.9, 0.5, 0.8, true)),
  affiche: p('didone', true, a(['editorial', 'pop'], 0.5, 0.85, 0.6, 0.6, true)),
  gazette: p('serif-editoriale', true, a(['editorial', 'classique'], 0.4, 0.5, 0.3, 0.8)),
  humaniste: p('serif-editoriale', true, a(['classique', 'nature'], 0.6, 0.5, 0.3, 0.7)),
  luxe: p('serif-editoriale', false, a(['editorial', 'classique'], 0.4, 0.8, 0.3, 0.95, true)),
  vintage: p('serif-editoriale', true, a(['nature', 'doux', 'classique'], 0.7, 0.4, 0.4, 0.5, true)),
  slab: p('slab', true, a(['technique', 'classique'], 0.3, 0.3, 0.5, 0.6)),
  spatiale: p('grotesque', true, a(['technique', 'pop'], 0.3, 0.3, 0.7, 0.4, true)),
  pop: p('geometrique', true, a(['pop', 'doux'], 0.8, 0.2, 0.7, 0.3)),
  condensee: p('condensee', true, a(['pop', 'technique'], 0.1, 0.4, 0.9, 0.4, true)),
  'ronde-douce': p('ronde', true, a(['doux'], 1, 0.1, 0.4, 0.2)),
  jakarta: p('geometrique', true, a(['pop', 'minimal'], 0.6, 0.3, 0.6, 0.5)),
  'grotesque-douce': p('geometrique', true, a(['minimal', 'doux'], 0.6, 0.2, 0.5, 0.5)),
  mono: p('mono', true, a(['technique'], 0.2, 0.3, 0.6, 0.5, true)),
};

/** Typographie (typo.ts) : par axe, par valeur */
export const ATTRIBUTS_TYPO: Record<string, Record<string, AttributsHarmonie>> = {
  echelle: { modeste: a(['minimal', 'classique'], 0.5, 0.2, 0.2, 0.7), affirmee: a(['editorial', 'technique', 'classique'], 0.5, 0.5, 0.5, 0.5), spectaculaire: a(['pop', 'editorial'], 0.5, 0.9, 0.9, 0.3, true) },
  casse: { normale: a(['doux', 'classique', 'minimal', 'nature'], 0.6, 0.3, 0.4, 0.5), majuscules: a(['technique', 'pop', 'editorial'], 0.2, 0.7, 0.8, 0.6, true), 'petites-capitales': a(['editorial', 'classique'], 0.4, 0.5, 0.4, 0.8) },
  graisse: { paire: a(['classique', 'minimal'], 0.5, 0.4, 0.4, 0.5), fine: a(['editorial', 'minimal'], 0.4, 0.3, 0.3, 0.8), normale: a(['classique', 'doux'], 0.5, 0.3, 0.4, 0.6), grasse: a(['technique', 'pop'], 0.4, 0.7, 0.7, 0.4), noire: a(['pop'], 0.4, 0.9, 0.9, 0.3, true) },
  interlettrage: { serre: a(['pop', 'editorial'], 0.4, 0.6, 0.7, 0.5), normal: a(['classique', 'doux', 'minimal'], 0.5, 0.3, 0.4, 0.5), large: a(['editorial', 'minimal', 'technique'], 0.4, 0.4, 0.3, 0.8) },
  accent: { aucun: a(['minimal', 'technique'], 0.5, 0.2, 0.3, 0.6), italique: a(['editorial', 'classique'], 0.6, 0.6, 0.5, 0.7), couleur: a(['pop', 'doux'], 0.6, 0.6, 0.6, 0.4) },
  alignement: { gauche: a(['technique', 'minimal', 'editorial'], 0.4, 0.3, 0.5, 0.5), centre: a(['classique', 'doux', 'editorial'], 0.6, 0.3, 0.3, 0.7) },
  surtitre: { simple: a(['minimal', 'classique', 'doux'], 0.5, 0.2, 0.3, 0.5), filet: a(['editorial', 'classique'], 0.3, 0.4, 0.4, 0.7), numero: a(['technique', 'editorial'], 0.2, 0.4, 0.5, 0.6), pastille: a(['pop', 'doux'], 0.9, 0.5, 0.6, 0.3) },
};

/** Jeux de détails (details.ts) */
export const ATTRIBUTS_JEUX_DETAILS: Record<string, AttributsHarmonie> = {
  gabarit: a(['minimal', 'classique'], 0.5, 0.3, 0.3, 0.6),
  'editorial-chic': a(['editorial', 'minimal'], 0.2, 0.5, 0.3, 0.9),
  'graphique-pop': a(['pop'], 0.6, 0.9, 0.9, 0.2, true),
  'doux-rond': a(['doux', 'nature'], 1, 0.2, 0.4, 0.3),
  'technique-net': a(['technique', 'minimal'], 0.1, 0.5, 0.6, 0.6),
  'classique-sobre': a(['classique', 'minimal'], 0.5, 0.3, 0.3, 0.7),
  magazine: a(['editorial', 'pop'], 0.2, 0.8, 0.7, 0.5, true),
};

/** Éléments de détails (details.ts) : par élément, par valeur */
export const ATTRIBUTS_ELEMENTS_DETAILS: Record<string, Record<string, AttributsHarmonie>> = {
  separateur: { aucun: a(['minimal'], 0.5, 0.1, 0.2, 0.5), filet: a(['editorial', 'classique', 'minimal'], 0.2, 0.3, 0.2, 0.8), double: a(['editorial', 'classique'], 0.2, 0.5, 0.3, 0.9), ondulation: a(['doux', 'nature'], 1, 0.3, 0.5, 0.2), points: a(['technique', 'pop'], 0.7, 0.6, 0.6, 0.4, true) },
  souligne: { aucun: a(['minimal', 'classique'], 0.5, 0.1, 0.2, 0.6), trait: a(['technique', 'editorial'], 0.2, 0.7, 0.6, 0.5), surligneur: a(['pop'], 0.6, 0.8, 0.8, 0.2, true), vague: a(['doux', 'pop'], 1, 0.5, 0.6, 0.2, true) },
  citation: { gabarit: a(['minimal'], 0.5, 0.2, 0.2, 0.6), filet: a(['editorial', 'technique', 'classique'], 0.2, 0.4, 0.3, 0.7), guillemets: a(['editorial'], 0.6, 0.7, 0.5, 0.8, true), aplat: a(['doux', 'pop'], 0.8, 0.3, 0.4, 0.4) },
  badge: { gabarit: a(['minimal'], 0.6, 0.2, 0.3, 0.5), contour: a(['editorial', 'technique', 'minimal'], 0.6, 0.3, 0.3, 0.6), plein: a(['pop', 'doux'], 0.8, 0.7, 0.7, 0.3), carre: a(['technique'], 0.1, 0.4, 0.4, 0.6) },
  fond: { aucun: a(['minimal', 'classique'], 0.5, 0.1, 0.2, 0.6), trame: a(['technique'], 0.6, 0.3, 0.4, 0.5), grain: a(['editorial', 'nature'], 0.5, 0.2, 0.3, 0.6), formes: a(['doux', 'pop', 'nature'], 1, 0.4, 0.5, 0.2, true), grille: a(['technique', 'minimal'], 0, 0.3, 0.4, 0.6) },
  coins: { gabarit: a(['classique'], 0.5, 0.3, 0.3, 0.5), carres: a(['editorial', 'technique'], 0, 0.5, 0.5, 0.8), arrondis: a(['classique', 'doux'], 0.6, 0.3, 0.3, 0.5), 'tres-arrondis': a(['doux', 'pop'], 1, 0.3, 0.5, 0.2), mixtes: a(['pop'], 0.6, 0.6, 0.7, 0.2, true) },
  ombres: { gabarit: a(['classique'], 0.5, 0.3, 0.3, 0.5), aucune: a(['minimal', 'editorial', 'technique'], 0.4, 0.2, 0.2, 0.7), douce: a(['doux', 'classique'], 0.8, 0.2, 0.3, 0.5), portee: a(['pop'], 0.3, 0.9, 0.9, 0.2, true) },
  boutons: { gabarit: a(['classique'], 0.6, 0.5, 0.4, 0.5), contour: a(['editorial', 'minimal'], 0.4, 0.4, 0.3, 0.7), fleche: a(['editorial', 'technique'], 0.3, 0.5, 0.6, 0.6), pilule: a(['doux', 'pop'], 1, 0.5, 0.5, 0.3) },
  densite: { compacte: a(['technique'], 0.4, 0.5, 0.7, 0.4), aeree: a(['classique', 'doux', 'minimal'], 0.5, 0.3, 0.4, 0.5), 'tres-aeree': a(['editorial', 'minimal'], 0.4, 0.3, 0.2, 0.9) },
  cadre: { aucun: a(['minimal', 'technique'], 0.3, 0.2, 0.2, 0.6), arrondi: a(['classique', 'doux'], 0.7, 0.2, 0.3, 0.5), organique: a(['doux', 'nature'], 1, 0.4, 0.5, 0.2, true), decale: a(['pop', 'editorial'], 0.3, 0.8, 0.8, 0.3, true) },
};

/** Menus (menus.ts) : par axe, par variante */
export const ATTRIBUTS_MENUS: Record<string, Record<string, AttributsHarmonie>> = {
  ordinateur: {
    gabarit: a(['classique', 'minimal'], 0.5, 0.3, 0.3, 0.6), centre: a(['editorial', 'classique'], 0.5, 0.4, 0.4, 0.8, true), collante: a(['technique', 'minimal'], 0.3, 0.3, 0.5, 0.6),
    pastilles: a(['pop', 'doux'], 1, 0.5, 0.6, 0.3), souligne: a(['editorial', 'minimal'], 0.3, 0.3, 0.5, 0.6), transparente: a(['editorial', 'minimal'], 0.4, 0.2, 0.4, 0.6), laterale: a(['editorial'], 0.2, 0.6, 0.4, 0.8, true),
  },
  mobile: {
    gabarit: a(['classique', 'minimal'], 0.5, 0.3, 0.3, 0.6), defilant: a(['pop', 'technique'], 0.8, 0.4, 0.6, 0.4), panneau: a(['editorial'], 0.4, 0.6, 0.5, 0.7, true),
    tiroir: a(['classique', 'minimal'], 0.4, 0.3, 0.4, 0.6), onglets: a(['technique', 'pop'], 0.5, 0.4, 0.6, 0.4),
  },
  rdv: { gabarit: a(['classique', 'pop'], 0.6, 0.6, 0.5, 0.5), contour: a(['editorial', 'minimal'], 0.4, 0.4, 0.3, 0.7), flottant: a(['pop', 'doux'], 1, 0.7, 0.7, 0.3, true) },
};

/** Attributs d'une clé notable (`typo:police:<paire>`, `typo:<axe>:<v>`, `details:jeu:<id>`, `details:<élément>:<v>`, `menu:<axe>:<v>`) */
export function attributsHarmonieCle(cle: string): AttributsHarmonie | AttributsPolice | null {
  const [type, x, v] = cle.split(':');
  if (type === 'typo') return x === 'police' ? ATTRIBUTS_PAIRES[v] ?? null : ATTRIBUTS_TYPO[x]?.[v] ?? null;
  if (type === 'details') return x === 'jeu' ? ATTRIBUTS_JEUX_DETAILS[v] ?? null : ATTRIBUTS_ELEMENTS_DETAILS[x]?.[v] ?? null;
  if (type === 'menu') return ATTRIBUTS_MENUS[x]?.[v] ?? null;
  return null;
}
