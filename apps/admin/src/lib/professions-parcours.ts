import 'server-only';
import { PROFESSIONS_PARCOURS, professionParcours } from '@plateforme/core/onboarding-professions';
import { estProfession, estProfessionPublique } from '@plateforme/core/professions';
import { PRATIQUES } from '@plateforme/core';
import { catalogueDuPack, packPubliable } from '@/lib/packs-contenus';
import type { SoinCatalogue } from '@/lib/sites';

// Ouverture d'une profession dans le parcours client (/essai/votre-site, demande de Paul du 2026-10-09) : une profession n'est
// proposée AU PUBLIC que si son parcours est disponible (onboarding-professions.ts), qu'elle est publique (professions.ts :
// statut « active ») ET que son pack de contenus est publiable (tous les contenus obligatoires acceptés dans les Arrivages :
// packPubliable). Sinon « Bientôt disponible » + liste d'attente. Le super admin en MODE TEST peut tester une profession EN
// PRÉPARATION (connue de l'admin, avec sa pratique) : bandeau « Profession en préparation », rien n'est écrit.

/** Profession ouverte au public dans le parcours client */
export async function professionOuverte(id: string | null | undefined): Promise<boolean> {
  const p = professionParcours(id);
  if (!p?.disponible || !estProfessionPublique(p.id)) return false;
  return packPubliable(p.id);
}

export type EtatsProfessionsParcours = {
  /** Ouvertes au public */
  ouvertes: string[];
  /** En préparation, testables (mode test du super admin seulement ; vide sinon) */
  preparation: string[];
  /** Catalogue de démonstration des professions en préparation (fiches du pack), mode test seulement */
  catalogues: Record<string, SoinCatalogue[]>;
};

export async function etatsProfessionsParcours(test: boolean): Promise<EtatsProfessionsParcours> {
  const ouvertes: string[] = [];
  for (const p of PROFESSIONS_PARCOURS) if (await professionOuverte(p.id)) ouvertes.push(p.id);
  const preparation = test
    ? PROFESSIONS_PARCOURS.filter((p) => !ouvertes.includes(p.id) && estProfession(p.id) && PRATIQUES.some((x) => x.profession === p.id)).map((p) => p.id)
    : [];
  const catalogues: Record<string, SoinCatalogue[]> = {};
  for (const id of preparation) { const c = catalogueDuPack(id); if (c) catalogues[id] = c; }
  return { ouvertes, preparation, catalogues };
}
