'use client';

// Rendu d'une version de modèle (même rendu que le Studio et la Dégustation : ApercuTheme), sur une page et un appareil donnés.
import '@plateforme/core/dessins.css';
import { memo, useMemo } from 'react';
import { appliquerRecette, vueDePage, type CompositionRecette, type MarqueImportee, type ModeleManifeste, type PageStructure, type Univers } from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import { draftStudio } from '@/components/ApercuStudio';
import type { SoinCatalogue } from '@/lib/sites';

export type RenduChaine = {
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
};

export type ScenarioChaine = { principaux: string[]; secondaires: string[]; couleurs: string[] };

type Props = {
  composition: Record<string, unknown> | CompositionRecette;
  scenario: ScenarioChaine;
  rendu: RenduChaine;
  page?: PageStructure;
  appareil: 'ordinateur' | 'mobile';
  hauteur: number;
  /** Vignette (rendu réduit, sans défilement) plutôt que cadre défilable */
  vignette?: boolean;
};

export default memo(function ApercuModele({ composition, scenario, rendu, page = 'accueil', appareil, hauteur, vignette }: Props) {
  const apercu = useMemo(() => appliquerRecette(draftStudio(scenario.principaux, scenario.secondaires, scenario.couleurs), composition as CompositionRecette, {
    proposes: rendu.proposes, modeles: rendu.modeles.map((m) => m.manifeste), soinsConnus: rendu.catalogue.map((c) => c.slug), themesActives: rendu.themesActives,
  }), [composition, scenario, rendu]);
  if (!apercu) return <p className="p-3 text-sm text-neutral-600">Aperçu indisponible.</p>;
  return (
    <ApercuTheme key={`${page}-${appareil}`} sansCommandes {...(vignette ? { vignette: hauteur } : { hauteurCadre: hauteur })} vueInitiale={vueDePage(page)} appareil={appareil === 'mobile' ? 'mobile' : 'bureau'}
      draft={apercu.draft} modele={apercu.modele} catalogue={rendu.catalogue} marquesImportees={rendu.marquesImportees} jeuPhotos={null} />
  );
});
