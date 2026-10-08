'use client';

// Planche d'un menu à noter (retour de Paul du 2026-10-08 : « difficile de noter les menus sans pouvoir les afficher ») : le menu
// en entier et en action, dans le site de démonstration (ApercuStudio) et le vrai cadre d'appareil.
// Ordinateur : la barre en haut de page avec la rubrique active, défilable (barre collante, transparente → pleine), le survol
// simulé, l'état après défilement. Téléphone : interactif (bouton « Menu » cliquable, défilement) et ouvert (panneau plein écran,
// tiroir, barre d'onglets…) côte à côte. « Ouvrir / fermer le menu » (touche o) pilote l'aperçu interactif. L'ouverture reproduit
// le script du site (SCRIPT_MENU : classe mn-ouvert sur la racine, aria-expanded, « Fermer ») : PiloteApercu.
import { useEffect, useState, type ReactNode } from 'react';
import type { MarqueImportee, ModeleManifeste, Univers } from '@plateforme/core';
import ApercuStudio from '@/components/ApercuStudio';
import PiloteApercu from '@/components/RepereEvaluation';
import type { SoinCatalogue } from '@/lib/sites';

type Props = {
  cle: string;
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
  /** Sélecteurs encadrés (repère « Vous notez ») et repère affiché */
  selecteurs: readonly string[];
  repereVisible: boolean;
};

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

function Etat({ titre, detail, children, className = '' }: { titre: string; detail?: string; children: ReactNode; className?: string }) {
  return (
    <figure className={`grid min-w-0 content-start gap-1 ${className}`}>
      <figcaption className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{titre}{detail && <span className="font-normal normal-case tracking-normal"> · {detail}</span>}</figcaption>
      <div aria-hidden="true" className="overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10">{children}</div>
    </figure>
  );
}

export default function PlancheMenu({ cle, selecteurs, repereVisible, ...p }: Props) {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => { setOuvert(false); }, [cle]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)))) return;
      if (e.key === 'o' || e.key === 'O') { e.preventDefault(); setOuvert((x) => !x); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);
  // Cadres à hauteur imposée (jamais paresseux) : tous les états montés et défilables
  const studio = (mobile: boolean, x: { hauteur: number }) => <ApercuStudio nu cle={cle} mobile={mobile} {...x} {...p} />;
  const pilote = { selecteurs, visible: repereVisible, cle };

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOuvert((x) => !x)} aria-pressed={ouvert} className={`min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 ${focus}`}>
          {ouvert ? 'Fermer le menu' : 'Ouvrir le menu'} <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 text-xs md:inline">o</kbd>
        </button>
        <p className="text-sm text-neutral-600">Le bouton « Menu » des aperçus est cliquable ; faites défiler l’aperçu interactif pour voir la barre collante.</p>
      </div>

      <section aria-label="Menu sur ordinateur" className="grid gap-2">
        <h3 className="text-sm font-bold text-slate-900">Ordinateur</h3>
        <Etat titre="Interactif" detail="rubrique active, défilez">
          <PiloteApercu {...pilote} defiler={null} menu={{ rubriqueActive: true }}>{studio(false, { hauteur: 300 })}</PiloteApercu>
        </Etat>
        <div className="grid gap-3 sm:grid-cols-2">
          <Etat titre="Survol simulé" detail="deuxième rubrique">
            <PiloteApercu {...pilote} defiler={null} menu={{ rubriqueActive: true, survol: true }}>{studio(false, { hauteur: 200 })}</PiloteApercu>
          </Etat>
          <Etat titre="Après défilement" detail="barre collante">
            <PiloteApercu {...pilote} defiler={520} menu={{ rubriqueActive: true }}>{studio(false, { hauteur: 200 })}</PiloteApercu>
          </Etat>
        </div>
      </section>

      <section aria-label="Menu sur téléphone" className="grid gap-2">
        <h3 className="text-sm font-bold text-slate-900">Téléphone</h3>
        <div className="grid grid-cols-2 gap-3 sm:max-w-[640px]">
          <Etat titre={ouvert ? 'Interactif (ouvert)' : 'Fermé'} detail="interactif">
            <PiloteApercu {...pilote} defiler={null} menu={{ ouvert, onBascule: setOuvert, rubriqueActive: true }}>{studio(true, { hauteur: 520 })}</PiloteApercu>
          </Etat>
          <Etat titre="Ouvert">
            <PiloteApercu {...pilote} defiler={null} menu={{ ouvert: true, rubriqueActive: true }}>{studio(true, { hauteur: 520 })}</PiloteApercu>
          </Etat>
        </div>
      </section>
    </div>
  );
}
