'use client';

// Rendu d'un DESIGN avec un profil de démonstration (chaine-design.ts) : contexte du profil, photos limitées à son kit (jamais une
// autre activité), sujet du premier écran du profil. Même design + même profil + même graine = même rendu.
import { contexteScenario, habillerPourProfil, modeleIntegre, normaliserComposition, serialiserComposition, type CompositionRecette, type ContexteRecette, type ModeleManifeste, type PhotoBanque, type PoidsAtelier, type ScenarioRecette } from '@plateforme/core';

export type ProfilRendu = { id: string; nom: string; sujets: string[]; scenario: ScenarioRecette; photos: string[] | null };

export function contexteDuProfil(p: ProfilRendu, o: { poids: PoidsAtelier | null; photos: readonly PhotoBanque[]; modeles: { id: string; manifeste: ModeleManifeste }[] }): ContexteRecette {
  const modele = (id: string) => o.modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);
  const autorisees = p.photos ? new Set(p.photos) : null;
  // Photos du kit du profil ; profil sans kit : photos de ses sujets seulement
  const photos = o.photos.filter((x) => (autorisees ? autorisees.has(x.url) : x.sujets.some((s) => p.sujets.includes(s))));
  return contexteScenario(p.scenario, { poids: o.poids, photos, modele, modeTirage: 'favoris' });
}

/** Composition prête à rendre : le design habillé des images du profil */
export function rendreDesign(design: Record<string, unknown>, p: ProfilRendu, ctx: ContexteRecette, graine = 1): Record<string, unknown> {
  const x = normaliserComposition(design, ctx);
  if (!x) return design;
  return JSON.parse(serialiserComposition(habillerPourProfil(x as CompositionRecette, ctx, graine)));
}
