'use client';

// Rendu d'une version de modèle (même rendu que le Studio et la Dégustation : ApercuTheme), sur une page et un appareil donnés.
import '@plateforme/core/dessins.css';
import { Component, memo, useMemo, type ReactNode } from 'react';
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
  /** Vignette préchargée (montée avant d'arriver à l'écran : composeur) */
  precharger?: boolean;
};

export default memo(function ApercuModele({ composition, scenario, rendu, page = 'accueil', appareil, hauteur, vignette, precharger }: Props) {
  // Design vide ou illisible (2026-10-10, bug « grille 49 » : version absente de la lecture → design {} → exception dans
  // appliquerRecette, toute la page tombait) : « Aperçu indisponible » sur la carte, jamais une exception
  const apercu = useMemo(() => {
    if (!composition || typeof composition !== 'object' || !Object.keys(composition).length) return null;
    try {
      return appliquerRecette(draftStudio(scenario.principaux, scenario.secondaires, scenario.couleurs), composition as CompositionRecette, {
        proposes: rendu.proposes, modeles: rendu.modeles.map((m) => m.manifeste), soinsConnus: rendu.catalogue.map((c) => c.slug), themesActives: rendu.themesActives,
      });
    } catch (e) {
      console.error('Aperçu du modèle impossible', e);
      return null;
    }
  }, [composition, scenario, rendu]);
  if (!apercu) return <p className="grid place-items-center p-3 text-sm text-neutral-600" style={{ minHeight: Math.min(hauteur, 200) }} data-apercu-indisponible="">Aperçu indisponible.</p>;
  return (
    <GardeApercu>
    <ApercuTheme key={`${page}-${appareil}`} sansCommandes {...(vignette ? { vignette: hauteur } : { hauteurCadre: hauteur })} vueInitiale={vueDePage(page)} appareil={appareil === 'mobile' ? 'mobile' : 'bureau'}
      draft={apercu.draft} modele={apercu.modele} catalogue={rendu.catalogue} marquesImportees={rendu.marquesImportees} jeuPhotos={null} {...(precharger ? { paresseux: false } : {})} />
    </GardeApercu>
  );
});

/** Une exception pendant le rendu d'un aperçu reste dans sa carte (le reste de la page continue) */
class GardeApercu extends Component<{ children: ReactNode }, { erreur: boolean }> {
  state = { erreur: false };
  static getDerivedStateFromError() { return { erreur: true }; }
  componentDidCatch(e: unknown) { console.error('Aperçu du modèle en erreur', e); }
  render() { return this.state.erreur ? <p className="p-3 text-sm text-neutral-600" data-apercu-indisponible="">Aperçu indisponible.</p> : this.props.children; }
}
