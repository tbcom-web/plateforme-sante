// Duels « Mobile seulement » (demande de Paul du 2026-10-08 : « il faut faire des duels Mobile only quand c'est pertinent,
// surtout pour évaluer les tailles, les espacements, les menus »). Module PUR.
//
// 1. TABLE dimension → appareil où le duel se juge : « mobile » quand le rendu téléphone est décisif (tailles et casse,
//    densité / détails, menus, barre d'actions du bas, cartes de soins empilées, premier écran, animation d'en-tête, portraits
//    empilés, paire de polices = typographie du corps), « les-deux » sinon. Préfixes couverts : typo:*, composant:<famille>.
// 2. PART : PART_DUELS_MOBILES (≈ 40 %) des duels d'une dimension « mobile » sont montrés QU'EN cadre téléphone (appareil
//    enregistré « mobile ») ; le filtre « Mobile seulement » de l'accueil des duels les enchaîne tous ainsi.
// 3. APPRENTISSAGE : en plus du poids global (où une note ou un duel sur téléphone pèse déjà 1,25), les duels joués sur
//    téléphone donnent des effets PROPRES AU MOBILE (renfortsDuelsMobiles, Bradley-Terry des seuls duels mobiles, ±0,5 ★),
//    rangés dans PoidsAtelier.mobile. Le générateur et le Studio (effetAtelier, recettes.ts) les ajoutent à l'effet global
//    selon la PORTÉE de la clé : 1 pour un réglage qui n'existe que sur téléphone (menu=mobile:…, barre d'actions
//    variante=contact:barre|flottant), 0,5 pour un réglage partagé dont le rendu téléphone compte beaucoup (typo, détails,
//    police, cartes, premier écran), 0 sinon. Les garde-fous et règles dures passent toujours avant.
import { renfortsDuels, type Duel } from './duels';

export type AppareilJugement = 'ordinateur' | 'mobile' | 'les-deux';

/** Dimensions (ou familles composant:<f>) où le rendu téléphone est décisif */
const MOBILES = new Set(['typo', 'details', 'menu', 'polices', 'police-couleurs']);
const FAMILLES_MOBILES = new Set(['contact', 'soins-forme', 'accueil', 'entete-anim', 'portraits', 'praticiens', 'sujets', 'horaires']);

/** Appareil où se juge une dimension de duel */
export function appareilDimension(dimension: string | null | undefined): AppareilJugement {
  if (!dimension) return 'les-deux';
  if (dimension.startsWith('typo:')) return 'mobile';
  if (dimension.startsWith('composant:')) return FAMILLES_MOBILES.has(dimension.slice(10)) ? 'mobile' : 'les-deux';
  return MOBILES.has(dimension) ? 'mobile' : 'les-deux';
}

export const PART_DUELS_MOBILES = 0.4;

/** Ce duel est-il « Mobile seulement » ? (`r` : tirage uniforme [0, 1[ ; filtre « Mobile seulement » : toujours) */
export function duelMobileSeulement(dimension: string | null | undefined, r: number, opts: { part?: number; serie?: boolean } = {}): boolean {
  if (appareilDimension(dimension) !== 'mobile') return false;
  return Boolean(opts.serie) || r < (opts.part ?? PART_DUELS_MOBILES);
}

/** Portée mobile d'une clé apprise (atelier) : 1 réglage propre au téléphone, 0,5 partagé mais décisif sur téléphone, 0 sinon */
export function porteeMobile(cle: string): number {
  if (cle.startsWith('menu=mobile:') || /^variante=contact:(barre|flottant)$/.test(cle)) return 1;
  if (/^(typo|details|police)=/.test(cle) || /^variante=(soins-forme|accueil|entete-anim|portraits|praticiens|sujets|horaires|contact):/.test(cle)) return 0.5;
  return 0;
}

/** Effets propres au mobile : duels joués sur téléphone seulement (même modèle et mêmes plafonds que renfortsDuels) */
export function renfortsDuelsMobiles(duels: readonly Duel[]): Record<string, number> {
  return renfortsDuels(duels.filter((d) => d.appareil === 'mobile')).atelier;
}

/** Effet d'une clé pour le générateur : global + portée × effet mobile */
export function effetAvecMobile(effets: Readonly<Record<string, number>> | undefined, mobile: Readonly<Record<string, number>> | null | undefined, cle: string): number {
  const g = effets?.[cle] ?? 0;
  const m = mobile?.[cle] ?? 0;
  return m ? Math.round((g + porteeMobile(cle) * m) * 1000) / 1000 : g;
}
