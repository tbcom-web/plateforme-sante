// Kits de visuels (niveau 2 de la boucle ingrédients → kits → recettes, docs/ingredients-recettes.md) : un jeu cohérent
// d'ingrédients (niveau 1) autour d'un sujet. Premier kit : « Sports » (demande de Paul, 2026-10-07 : « commencer un kit de thèmes
// d'icônes etc. sur les sports : basket, tennis, football, rugby, etc. »).
//
// Structure de données seulement (pas encore d'interface dédiée) : chaque élément du kit donne, pour une variante du sujet (un
// sport), la clé de son picto, de son trait continu et de son dessin pédagogique dans l'inventaire (illustrations.ts), et ses
// hashtags par défaut. Les clés suivent celles de l'inventaire : la revue (statut, notes, sujets, hashtags) se fait dans
// /admin/illustrations et /admin/retours, comme pour tout ingrédient. Un kit reste « brouillon » tant que Paul n'a pas validé ses
// ingrédients ; seul Paul passe un ingrédient en « Validé ».
import { SPORTS, FICHES_SPORTS, idPictoSport, type Sport } from './sports';
import { STYLES_EXPERIMENTAUX, SUJETS_STYLES, cleStyleExperimental, hashtagsStyleExperimental } from './styles-experimentaux';
import { HASHTAGS_UNIVERS } from './dessins-univers';
import { HASHTAGS_UNIVERS_DIABETE } from './univers-diabete';
import { HASHTAGS_IMAGES_FIXES } from './images-fixes-pied';
import { HASHTAGS_ANALYSE_COURSE } from './analyse-course';

export type StatutKit = 'brouillon' | 'valide' | 'retire';

export interface ElementKit {
  /** Variante du sujet (ex. « basket ») */
  id: string;
  libelle: string;
  /** Ce que montre l'élément (le regard du pédicure-podologue) */
  regard: string;
  /** Clés de l'inventaire (illustrations.ts) */
  picto: string;
  ligne: string;
  pedagogique: string;
  /** Hashtags par défaut, portés par les trois ingrédients (hashtags.ts : Paul peut en ajouter ou en retirer) */
  hashtags: readonly string[];
}

export interface Kit {
  id: string;
  libelle: string;
  /** Sujet des visuels (sujets-visuels.ts) porté par défaut par chaque ingrédient du kit */
  sujet: string;
  statut: StatutKit;
  /** Date de création (AAAA-MM-JJ) */
  cree: string;
  elements: readonly ElementKit[];
}

/** Clés d'inventaire des ingrédients d'un sport */
export const clesSport = (s: Sport) => ({ picto: `picto:${idPictoSport(s)}`, ligne: `ligne:sport-${s}`, pedagogique: `dessin:sport-${s}:pedagogique` });

export const KIT_SPORTS: Kit = {
  id: 'sports',
  libelle: 'Sports',
  sujet: 'sport',
  statut: 'brouillon',
  cree: '2026-10-07',
  elements: SPORTS.map((s) => ({
    id: s,
    libelle: FICHES_SPORTS[s].libelle,
    regard: FICHES_SPORTS[s].regard,
    ...clesSport(s),
    hashtags: ['sport', ...FICHES_SPORTS[s].hashtags.filter((h) => h !== 'sport')],
  })),
};

export const KITS: readonly Kit[] = [KIT_SPORTS];

/** Clés de tous les ingrédients d'un kit */
export const clesDuKit = (k: Kit): string[] => k.elements.flatMap((e) => [e.picto, e.ligne, e.pedagogique]);

/** Kits dont fait partie un ingrédient (clé de l'inventaire) */
export const kitsDeCle = (cle: string): Kit[] => KITS.filter((k) => clesDuKit(k).includes(cle));

/** Sujets par défaut apportés par les kits à un ingrédient (sujets-visuels.ts, via le champ `soins` de l'inventaire) */
export const sujetsDesKits = (cle: string): string[] => [...new Set(kitsDeCle(cle).map((k) => k.sujet))];

/**
 * Hashtags par défaut, dans le code (clé → hashtags triés) : ceux des éléments des kits. Paul les voit comme les autres et peut en
 * retirer (le journal assets_hashtags enregistre le retrait) ou en ajouter (hashtags.ts, hashtagsDepuisLignes(lignes, défauts)).
 */
export const HASHTAGS_PAR_DEFAUT: Readonly<Record<string, readonly string[]>> = Object.fromEntries([
  ...KITS.flatMap((k) => k.elements.flatMap((e) => [e.picto, e.ligne, e.pedagogique].map((cle) => [cle, [...new Set(e.hashtags)].sort()] as const))),
  // Registres expérimentaux (styles-experimentaux.ts) : #style-<style>, #style-experimental et le sujet (filtre de /admin/retours)
  ...STYLES_EXPERIMENTAUX.flatMap((st) => SUJETS_STYLES.map((s) => [cleStyleExperimental(s, st), hashtagsStyleExperimental(s, st)] as const)),
  // Planche « ce qui manque » (2026-10-08, dessins-univers.ts) : hashtags suggérés des illustrations et pictos nouveaux
  ...Object.entries(HASHTAGS_UNIVERS),
  // Univers diabète (2026-10-09, univers-diabete.ts) : #diabete rattache chaque élément au vivier du sujet (à valider par Paul)
  ...Object.entries(HASHTAGS_UNIVERS_DIABETE),
  // Images fixes des animations du pied (2026-10-10, images-fixes-pied.ts) : #trail #randonnee (kit « Sport · trail / randonnée »),
  // #douleur-talon (fiche du soin), #sport
  ...Object.entries(HASHTAGS_IMAGES_FIXES),
  // Analyse de la foulée (2026-10-10, analyse-course.ts) : #sport #course #running #marathon (kit « Sport · course »)
  ...Object.entries(HASHTAGS_ANALYSE_COURSE),
]);
