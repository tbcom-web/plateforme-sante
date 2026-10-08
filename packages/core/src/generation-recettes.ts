// Génération des recettes complètes à noter HORS du fil principal (perf, 2026-10-08 : genererCandidates prenait ~1 s par lot
// dans /admin/retours/recettes et figeait la page). La demande est sérialisable (postMessage vers un Web Worker) : contexte
// (poids, photos, fiches des modèles, mode de tirage), options (graine, ensembles en listes) et contexte d'images (photos
// exclues, kits, vivier : contexte-images.ts, registre du module à reposer dans le worker). executerDemandeGeneration rend exactement
// ce que genererCandidates rend dans la page pour la même graine (generation-recettes.test.ts).
import { definirContexteImages, type KitCompact } from './contexte-images';
import { modeleIntegre, type ModeleManifeste } from './modeles';
import { definirAnimationsPretes } from './heros-photo-variantes';
import { contexteScenario, genererCandidates, type CandidateRecette, type StatsNotation } from './notation-recettes';
import type { ContexteRecette } from './recettes';
import type { ScenarioRecette } from './simulateur';

export type DemandeGeneration = {
  scenario: ScenarioRecette;
  contexte: Pick<ContexteRecette, 'poids' | 'photos' | 'modeTirage'>;
  /** Fiches des modèles disponibles (sinon modèles intégrés) */
  modeles: readonly ModeleManifeste[];
  options: { n: number; graine: number; iterations?: number; refusees: readonly string[]; aValider: readonly string[]; deja: readonly string[]; stats?: StatsNotation | null };
  /** Contexte d'images de la page (absent : registre inchangé) */
  images?: { exclues: readonly string[]; kits: Record<string, KitCompact>; vivier: Record<string, readonly string[]> | null } | null;
  /** Animations d'illustrations prêtes (images de base validées) de la page : registre reposé dans le worker */
  animationsPretes?: readonly string[] | null;
};

/** Modèle d'après les fiches disponibles (même règle que la page : fiche importée, sinon intégrée) */
export const modeleDesFiches = (modeles: readonly ModeleManifeste[]) => (id: string) => modeles.find((m) => m.id === id) ?? modeleIntegre(id);

export function executerDemandeGeneration(d: DemandeGeneration): CandidateRecette[] {
  if (d.images) definirContexteImages({ exclues: d.images.exclues, kits: d.images.kits, vivier: d.images.vivier });
  if (d.animationsPretes) definirAnimationsPretes(d.animationsPretes);
  const aValider = new Set(d.options.aValider);
  return genererCandidates(d.scenario, contexteScenario(d.scenario, { ...d.contexte, modele: modeleDesFiches(d.modeles) }), {
    n: d.options.n, graine: d.options.graine, iterations: d.options.iterations, refusees: new Set(d.options.refusees),
    estAValider: (k) => aValider.has(k), deja: new Set(d.options.deja), stats: d.options.stats,
  });
}
