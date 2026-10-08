// Combinaisons COMPLÈTES de l'atelier (retour de Paul du 2026-10-08 : « je ne vois pas dans les combinaisons les nouveaux
// headers »). Une proposition du générateur des praticiens (propositions.ts) fixe structure, gamme, style, animation et héros ;
// l'atelier la complète avec TOUS les autres ingrédients du Studio, tirés par les mêmes dés (recettes.ts, donc par l'harmonie :
// harmonie.ts, règles dures jamais violées, garde-fous du core toujours actifs) :
//   - dimensions du registre (DIMENSIONS_RECETTE) non fixées par la proposition : polices, effets, traitement des photos,
//     typographie, jeu de détails, menu ;
//   - un dé par type de page (PAGES_STRUCTURE) et un dé par famille d'éléments (FAMILLES_COMPOSANTS) : premiers écrans photo et
//     organiques (`composant:accueil`), animations d'en-tête (`composant:entete-anim`), transitions, portraits des praticiens…
// Aucune liste figée : un nouveau dé ajouté au registre ou une nouvelle famille d'éléments entre seul dans les combinaisons.
// Les ingrédients « à valider » (INGREDIENTS_A_VALIDER) SONT tirés ici (l'atelier est pour Paul : badge « à valider ») ; seul le
// générateur des praticiens les exclut (ContexteRecette.praticien). Pondération : celle des dés (poids appris), inchangée ici.
// Déterministe : même proposition, même contexte, même graine → même composition. Module pur.

import {
  alea, clesRecette, compositionInitiale, DIMENSIONS_RECETTE, FAMILLES_COMPOSANTS, PAGES_STRUCTURE, reparerComposition,
  outilsHarmonie, tirerDimension, tirerHabillageRecette, tirerPage, type CompositionRecette, type ContexteRecette, type DimensionRecette, type PageStructure,
} from './recettes';
import type { Proposition } from './propositions';
import { corrigerHarmonie, violationsDures } from './harmonie';
import { estAValider } from './heros-photo-variantes';
import { gamme as gammeParId } from './gammes';
import type { Variantes } from './modeles';

/** Dimensions fixées par la proposition du générateur (le reste du registre est tiré) */
export const DIMENSIONS_FIXEES_ATELIER: readonly DimensionRecette[] = ['couleurs', 'visuels', 'structure', 'photos'];

/** Dés de l'atelier, dérivés du registre : dimensions non fixées, chaque type de page, chaque famille d'éléments */
export function desAtelier(): string[] {
  return [
    ...DIMENSIONS_RECETTE.map((d) => d.id).filter((d) => !DIMENSIONS_FIXEES_ATELIER.includes(d)),
    ...PAGES_STRUCTURE.map((p) => `page:${p.id}`),
    ...FAMILLES_COMPOSANTS.map((f) => `composant:${f}`),
  ];
}

const hache = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** La proposition elle-même, en composition (structure, gamme, style, animation, héros, photos montrées) */
function socle(p: Proposition, c: ContexteRecette, photos: readonly string[]): CompositionRecette {
  const x = compositionInitiale(c, hache(p.id));
  return reparerComposition({
    ...x, structure: p.univers, gamme: p.gamme, couleur: gammeParId(p.gamme)?.accent ?? x.couleur,
    visuels: { style: p.style, herosSujet: p.heros, animation: p.animation }, photos: p.style === 'photos' ? [...photos] : [],
  }, c);
}

/** Remet les ingrédients de la proposition (un dé ne les change jamais : ils sont notés comme le praticien les voit) */
const garder = (p: CompositionRecette, y: CompositionRecette, c: ContexteRecette): CompositionRecette =>
  reparerComposition({ ...y, structure: p.structure, gamme: p.gamme, couleur: p.couleur, visuels: p.visuels, photos: p.photos }, c);

/**
 * Composition complète d'une proposition : chaque dé de l'atelier est lancé (pages et éléments : environ deux fois sur trois, pour
 * garder aussi des présentations « du modèle »), dans un ordre fixe, par les fonctions de tirage du Studio.
 */
export function compositionAtelier(p: Proposition, c: ContexteRecette, photos: readonly string[] = [], graine = 0): CompositionRecette {
  const ctx: ContexteRecette = { ...c, praticien: false };
  const base = socle(p, ctx, photos);
  const r = alea(hache(`${p.id}|${graine}`), 'atelier');
  let x = base;
  for (const de of desAtelier()) {
    const g = hache(`${p.id}|${graine}|${de}`);
    let y = x;
    if (de.startsWith('page:')) { if (r() < 0.67) y = tirerPage(x, { page: de.slice(5) as PageStructure }, ctx, g); }
    else if (de.startsWith('composant:')) { if (r() < 0.67) y = tirerPage(x, { composant: de.slice(10) as keyof Variantes }, ctx, g); }
    else if (de === 'typo' || de === 'details' || de === 'menu') y = tirerHabillageRecette(x, de, ctx, g);
    else y = tirerDimension(x, de as DimensionRecette, ctx, g);
    x = garder(base, y, ctx);
  }
  // Règles dures d'harmonie (ex. formes rondes avec la structure Technique) : corrigées comme « Corriger » du Studio
  const outils = outilsHarmonie(ctx);
  for (let k = 0; k < 8; k++) {
    const v = violationsDures(x, { sujets: ctx.sujets });
    if (!v.length) break;
    const y = garder(base, corrigerHarmonie(x, v[0], outils), ctx);
    if (JSON.stringify(y) === JSON.stringify(x)) break;
    x = y;
  }
  return x;
}

/** Ingrédients « à valider » présents dans une composition (badge de la carte) */
export function aValiderDansComposition(x: CompositionRecette, valides?: ReadonlySet<string> | null): string[] {
  return Object.entries(x.sections.variantes as Record<string, string>).map(([s, v]) => `composant:${s}:${v}`).filter((k) => estAValider(k, valides));
}

const PREFIXES_REGLAGES = ['police=', 'ordre=', 'effets=', 'variante=', 'typo=', 'details=', 'menu=', 'traitement='];
/** Réglages notés avec la combinaison (clés de l'atelier, mêmes que l'apprentissage des recettes) : tout sauf la proposition elle-même */
export function reglagesAtelier(x: CompositionRecette, sujets: readonly string[]): string[] {
  const cles = clesRecette(x, sujets).atelier.filter((k) => PREFIXES_REGLAGES.some((p) => k.startsWith(p)));
  return [...new Set([...cles, `traitement=${x.traitement.id}${x.traitement.grain ? '+grain' : ''}`])].sort();
}
export const estReglageAtelier = (k: unknown): k is string => typeof k === 'string' && k.length <= 120 && /^[a-z]+=[^\s&]{1,110}$/.test(k) && PREFIXES_REGLAGES.some((p) => k.startsWith(p));
