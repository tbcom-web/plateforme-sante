// MODÈLE = DESIGN (décision de Paul du 2026-10-09 : « je préfère voir une série de modèles très très grande, voire infinie, où je
// sélectionne ceux qui me plaisent SANS thème précis ; les modèles embarquent par défaut les thèmes d'images et d'icônes cohérents »).
// Un modèle de la chaîne est un DESIGN indépendant du profil : structure par page, gamme ou couleur, polices et typographie, détails,
// menus, premier écran, style d'illustration ou photo, traitement, effets. Les IMAGES ne font pas partie du choix : à chaque rendu,
// elles viennent du kit du profil (profils.ts, kitDuProfil : visuels de l'activité, sinon visuels du thème sans autre activité).
// - designDe : composition → design (photos et sujet du premier écran retirés) ;
// - habillerPourProfil : design + profil de démonstration → composition rendue avec les images du profil ;
// - profilsCompatibles : profils où le design est à sa place (familles de style par sujet, harmonie.ts) ; pré-calculés à la validation ;
// - profilDemo / jeuxDeDemo : profil tiré pour un rendu ; un jeu de démonstration par famille de thèmes pour le testeur.
// Pur, déterministe pour une graine.

import { FAMILLES_PAR_SUJET, familleDominante, type IdFamilleStyle } from './harmonie';
import { reparerComposition, tirerPhotos, type CompositionRecette, type ContexteRecette } from './recettes';
import { profilsDePratique } from './profils';

export type ProfilDemo = { id: string; nom: string; sujets: readonly string[]; scenario: { principaux: string[]; secondaires: string[]; couleurs: string[] } };

/** Design d'une composition : sans photos ni sujet du premier écran (ils viendront du kit du profil) */
export function designDe(x: CompositionRecette | Record<string, unknown>): Record<string, unknown> {
  const o = JSON.parse(JSON.stringify(x)) as Record<string, unknown> & { visuels?: Record<string, unknown> };
  return { ...o, photos: [], visuels: { ...(o.visuels ?? {}), herosSujet: null } };
}

function rng(graine: number) {
  let s = graine >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Design rendu pour un profil : sujet du premier écran = thème n° 1 du profil, photos tirées dans les photos du CONTEXTE (à limiter
 * par l'appelant au kit du profil : visuels de l'activité ou du thème, jamais une autre activité), puis garde-fous du scénario.
 */
export function habillerPourProfil(design: CompositionRecette, c: ContexteRecette, graine = 1): CompositionRecette {
  const y: CompositionRecette = { ...design, visuels: { ...design.visuels, herosSujet: c.sujets[0] ?? null }, photos: design.visuels.style === 'photos' ? tirerPhotos(c, rng(graine)) : [] };
  return reparerComposition(y, c);
}

/** Familles de style dominantes du design (la première fait foi) */
export const familleDuDesign = (x: CompositionRecette): IdFamilleStyle => familleDominante(x as never)[0].id;

/**
 * Profils compatibles : poids de la famille dominante du design pour le thème n° 1 du profil (FAMILLES_PAR_SUJET) ≥ `seuil` (1) ;
 * thème sans table : compatible. Exemple : un design « Graphique pop » (0,3 pour diabète et 0,2 pour senior) n'est pas proposé à ces
 * profils. Pré-calculés à la validation, confirmés par Paul.
 */
export function profilsCompatibles<P extends Pick<ProfilDemo, 'id' | 'sujets'>>(x: CompositionRecette, profils: readonly P[], seuil = 1): P[] {
  const f = familleDuDesign(x);
  return profils.filter((p) => { const t = FAMILLES_PAR_SUJET[p.sujets[0] ?? '']; return !t || (t[f] ?? 1) >= seuil; });
}

/** Profil de démonstration tiré pour un rendu (jamais `eviter` s'il y en a d'autres) */
export function profilDemo<P extends { id: string }>(profils: readonly P[], graine: number, eviter?: string | null): P | null {
  const l = profils.filter((p) => p.id !== eviter);
  const pool = l.length ? l : profils;
  return pool.length ? pool[Math.floor(rng(graine)() * pool.length)] : null;
}

/** Un jeu de démonstration par famille de thèmes (thème n° 1) parmi les profils compatibles : jeux du testeur de modèles */
export function jeuxDeDemo<P extends Pick<ProfilDemo, 'id' | 'sujets'>>(profils: readonly P[]): P[] {
  const vus = new Set<string>();
  return profils.filter((p) => { const k = p.sujets[0] ?? ''; if (vus.has(k)) return false; vus.add(k); return true; });
}

/**
 * Jeux du testeur pour un modèle : un profil par famille de thèmes parmi ses profils compatibles (tags), sinon parmi tous les profils
 * de la profession. Exporté dans retours/modeles-a-tester.json (champ `jeux`) : le testeur passe toutes les pages pour CHACUN.
 */
export function jeuxDuModele(profession: string, profilsCompatiblesIds: readonly string[]): string[] {
  let tous: { id: string; sujets: string[] }[] = [];
  try { tous = profilsDePratique(profession).filter((p) => p.principal).map((p) => ({ id: p.id, sujets: [p.principal!, ...p.secondaires] })); } catch { tous = []; }
  const compatibles = tous.filter((p) => profilsCompatiblesIds.includes(p.id));
  return jeuxDeDemo(compatibles.length ? compatibles : tous).map((p) => p.id);
}
