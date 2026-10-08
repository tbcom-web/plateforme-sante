// PUBLICATION D'UNE RECETTE POUR LES PRATICIENS (décision de Paul du 2026-10-08 : « rends le flow de publication d'une recette
// simple ; les recettes doivent être facilement visibles par les praticiens et apparaître en fonction de leur spécialité »).
// Données : table recettes_publications (migration 0042) : une ligne par recette, profession + profils cibles, ordre manuel
// facultatif, publiée ou non (dépublier = publiee à false, jamais de suppression).
//
// 1. profilsCiblesParDefaut : profils pré-cochés d'après le scénario de la recette (thème n° 1 ; activités si elle en a).
// 2. verifierPublicationRecette : AUCUNE publication silencieuse d'un élément « à valider ». Bloquent la publication :
//    - un ingrédient « à valider » (INGREDIENTS_A_VALIDER : premiers écrans du lot 2, animations d'en-tête, portraits) non validé ;
//    - un élément dont le statut de revue n'est pas « validé » alors qu'il en a un (« à revoir » : à valider ; « à retravailler »,
//      « retiré » : à remplacer) ;
//    - un élément exclu (moyenne ou dernière note ≤ 2 ★) ;
//    - une photo non importée (aperçu d'une banque libre : jamais sur un site).
//    Chaque élément bloquant a un lien qui l'ouvre (/admin/retours?cle=…). Les éléments sans statut (code validé du produit : gammes,
//    modèles, polices…) ne bloquent pas.
// 3. recettesPourPraticien (/creer) : d'abord les recettes PUBLIÉES pour les profils les plus proches du praticien (meilleur profil,
//    ordre manuel, note), avec leur badge « Conçu pour … », puis les autres recettes (recettesPourScenario), sans doublon.
// Module pur.

import { clesRecette, estPhotoHebergee, recettesPourScenario, clesStructure, type Recette } from './recettes';
import { scenarioDeRecette, type ScenarioRecette } from './simulateur';
import { INGREDIENTS_A_VALIDER, estAValider } from './heros-photo-variantes';
import { clePhoto } from './assets-poids';
import { PRATIQUES, PROFESSION_PRATIQUE_DEFAUT, type PratiqueProfession } from './pratiques';
import { badgeConcuPour, meilleursProfils, profilsDePratique, type ProfilPratique, type ReponsesPratique } from './profils';

export type PublicationRecette = {
  recette: string;
  profession: string;
  profils: string[];
  /** Ordre manuel (1 = en tête) ; null : ordre automatique */
  ordre: number | null;
  publiee: boolean;
  publieeLe?: string | null;
};

const ID_PROFIL = /^[a-z0-9-]{2,40}$/;

/** Ligne de recettes_publications (ou de recettes_publiees()) → publication ; invalide → null */
export function publicationDepuisLigne(l: Record<string, unknown> | null | undefined): PublicationRecette | null {
  if (!l || typeof l.recette !== 'string') return null;
  const profils = Array.isArray(l.profils) ? [...new Set((l.profils as unknown[]).filter((x): x is string => typeof x === 'string' && ID_PROFIL.test(x)))].slice(0, 12) : [];
  if (!profils.length) return null;
  const ordre = Number.isInteger(l.ordre) && (l.ordre as number) >= 1 && (l.ordre as number) <= 999 ? (l.ordre as number) : null;
  return {
    recette: l.recette, profession: typeof l.profession === 'string' && l.profession ? l.profession : PROFESSION_PRATIQUE_DEFAUT, profils, ordre,
    publiee: l.publiee !== false, publieeLe: typeof l.publiee_le === 'string' ? l.publiee_le : null,
  };
}

/** Profils cochés d'office : ceux du thème n° 1 du scénario (et, si le scénario a des activités, ceux qui en ont une) */
export function profilsCiblesParDefaut(sc: Pick<ScenarioRecette, 'principaux' | 'secondaires'> & { activites?: readonly string[] }, profession?: string | null, registre: readonly PratiqueProfession[] = PRATIQUES): string[] {
  const profils = profilsDePratique(profession, registre);
  const un = sc.principaux[0];
  if (!un) return profils.filter((p) => p.principal === null).map((p) => p.id);
  const duTheme = profils.filter((p) => p.principal === un);
  const acts = sc.activites ?? [];
  const avecActivite = acts.length ? duTheme.filter((p) => p.activites.some((a) => acts.includes(a))) : [];
  return (avecActivite.length ? avecActivite : duTheme).map((p) => p.id);
}

export type RaisonBlocage = 'a-valider' | 'a-remplacer' | 'exclu' | 'non-importee';
export type ElementBloquant = { cle: string; raison: RaisonBlocage; texte: string; href: string };
export type VerificationPublication = { ok: boolean; bloquants: ElementBloquant[]; verifies: number };

export type ContexteVerification = {
  /** Statuts de revue (illustrations_statuts) : valide, a_revoir, a_retravailler, retire */
  statuts?: Readonly<Record<string, string>> | null;
  /** Ingrédients « à valider » validés par Paul */
  valides?: ReadonlySet<string> | null;
  /** Clés exclues (≤ 2 ★, retirées : contexte-images.ts) */
  exclues?: ReadonlySet<string> | null;
};

/** Lien qui ouvre un élément dans « Donner mon avis » */
export const lienElement = (cle: string) => `/admin/retours?cle=${encodeURIComponent(cle)}`;

/** Une recette peut-elle être publiée pour les praticiens ? Liste de ce qu'il faut valider ou remplacer avant (voir l'en-tête). */
export function verifierPublicationRecette(r: Pick<Recette, 'composition' | 'sujets'>, ctx: ContexteVerification = {}): VerificationPublication {
  const cles = [...new Set([...clesRecette(r.composition, r.sujets).assets, ...clesStructure(r.composition)])];
  const bloquants: ElementBloquant[] = [];
  const vus = new Set<string>();
  const bloquer = (cle: string, raison: RaisonBlocage, texte: string) => { if (!vus.has(cle)) { vus.add(cle); bloquants.push({ cle, raison, texte, href: lienElement(cle) }); } };
  for (const u of r.composition.photos) {
    if (!estPhotoHebergee(u)) bloquer(u, 'non-importee', 'Photo pas encore importée');
  }
  for (const cle of cles) {
    const st = ctx.statuts?.[cle];
    if (ctx.exclues?.has(cle)) bloquer(cle, 'exclu', 'Élément noté ≤ 2 ★ ou retiré : à remplacer');
    else if (INGREDIENTS_A_VALIDER.has(cle) && estAValider(cle, ctx.valides) && st !== 'valide') bloquer(cle, 'a-valider', 'À valider');
    else if (st === 'a_revoir') bloquer(cle, 'a-valider', 'À valider (statut « à revoir »)');
    else if (st === 'a_retravailler' || st === 'retire') bloquer(cle, 'a-remplacer', st === 'retire' ? 'Retiré : à remplacer' : 'À retravailler : à remplacer');
  }
  for (const u of r.composition.photos) {
    const k = clePhoto(u);
    if (k && ctx.exclues?.has(k)) bloquer(k, 'exclu', 'Photo notée ≤ 2 ★ ou retirée : à remplacer');
  }
  return { ok: bloquants.length === 0, bloquants, verifies: cles.length + r.composition.photos.length };
}

/** Publications actives d'une profession qui visent un profil */
export const publicationsDuProfil = (publications: readonly PublicationRecette[], profil: Pick<ProfilPratique, 'id' | 'profession'>) =>
  publications.filter((p) => p.publiee && p.profession === profil.profession && p.profils.includes(profil.id));

const parOrdre = (a: { ordre: number | null; note: number | null; id: string }, b: { ordre: number | null; note: number | null; id: string }) =>
  (a.ordre ?? 1000) - (b.ordre ?? 1000) || (b.note ?? 0) - (a.note ?? 0) || (a.id < b.id ? -1 : 1);

/** Recettes publiées pour un profil (API publique), ordre manuel puis note */
export function recettesPubliees(profil: Pick<ProfilPratique, 'id' | 'profession'>, recettes: readonly Recette[], publications: readonly PublicationRecette[]): Recette[] {
  const pubs = new Map(publicationsDuProfil(publications, profil).map((p) => [p.recette, p]));
  return recettes.filter((r) => r.statut === 'active' && pubs.has(r.id))
    .map((r) => ({ r, ordre: pubs.get(r.id)!.ordre, note: r.note, id: r.id })).sort(parOrdre).map((x) => x.r);
}

export type RecettePourPraticien = { recette: Recette; profil: ProfilPratique | null; badge: string | null; publiee: boolean };

/**
 * Ordre des recettes de l'étape « Votre site » (/creer) : recettes PUBLIÉES des profils les plus proches (profil le plus proche
 * d'abord, puis ordre manuel, note), badge « Conçu pour … » ; puis les autres (recettesPourScenario, praticien), sans doublon.
 * Jamais une recette publiée qui contiendrait un ingrédient « à valider » (la vérification est refaite à la lecture).
 */
export function recettesPourPraticien(e: {
  reponses: ReponsesPratique;
  recettes: readonly Recette[];
  publications: readonly PublicationRecette[];
  scenario: ScenarioRecette;
  defautsMobile?: ReadonlySet<string>;
  valides?: ReadonlySet<string> | null;
  registre?: readonly PratiqueProfession[];
  min?: number;
}): RecettePourPraticien[] {
  const profils = meilleursProfils(e.reponses, { registre: e.registre });
  const praticienOk = (r: Recette) => !clesStructure(r.composition).some((k) => INGREDIENTS_A_VALIDER.has(k) && estAValider(k, e.valides));
  const pris = new Set<string>();
  const publiees: RecettePourPraticien[] = [];
  for (const { profil } of profils) {
    for (const r of recettesPubliees(profil, e.recettes, e.publications)) {
      if (pris.has(r.id) || !praticienOk(r)) continue;
      pris.add(r.id);
      publiees.push({ recette: r, profil, badge: badgeConcuPour(profil), publiee: true });
    }
  }
  const autres = recettesPourScenario(e.recettes.filter((r) => !pris.has(r.id)), e.scenario, e.min ?? 4, e.defautsMobile, { praticien: true, valides: e.valides })
    .map((recette) => ({ recette, profil: null, badge: null, publiee: false }));
  return [...publiees, ...autres];
}

/** Scénario d'une recette avec ses activités éventuelles (composition.scenario.activites, facultatif) */
export function scenarioPublication(r: Pick<Recette, 'sujets' | 'couleursPreferees' | 'scenario'> & { activites?: readonly string[] }): ScenarioRecette & { activites: string[] } {
  return { ...scenarioDeRecette(r), activites: [...(r.activites ?? [])] };
}
