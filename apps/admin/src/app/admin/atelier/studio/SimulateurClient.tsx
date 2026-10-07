'use client';

// « Simuler un client » (Studio de recettes, demande de Paul du 2026-10-07) : les MÊMES contrôles que le parcours /creer — sujets
// principaux ordonnés 1-2-3 et secondaires (ChoixSujets, étape 1), couleurs aimées ou « Laissez-nous proposer »
// (EtapeCouleursPreferees, étape 2), soins cochés d'office d'après les sujets (mêmes règles que l'étape « Vos soins ») — plus le nom
// et la ville du cabinet de démonstration et « Client au hasard ». Le rendu du Studio reste ensuite dans ce scénario (simulateur.ts).
import {
  alea, libelleScenario, soinsDuScenario, soinsEnAvantDesPriorites, soinsSuggeresParcours, prioritesDuScenario, scenarioAuHasard,
  type Priorites, type ScenarioRecette,
} from '@plateforme/core';
import ChoixSujets from '@/components/ChoixSujets';
import type { SoinCatalogue } from '@/lib/sites';
import { EtapeCouleursPreferees } from '../../../creer/EtapeSite';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export type CabinetDemo = { nom: string; ville: string };

type Props = {
  scenario: ScenarioRecette;
  onChange: (s: ScenarioRecette) => void;
  cabinet: CabinetDemo;
  onCabinet: (c: CabinetDemo) => void;
  catalogue: SoinCatalogue[];
  themesActives: string[];
  /** Colonne étroite (Studio sur grand écran, paramètres à gauche) : une seule colonne, sans cadre ni titre */
  compact?: boolean;
};

export default function SimulateurClient({ scenario, onChange, cabinet, onCabinet, catalogue, themesActives, compact = false }: Props) {
  const slugs = catalogue.map((c) => c.slug);
  const priorites = prioritesDuScenario(scenario);
  const coches = soinsDuScenario(scenario, slugs);
  // Soins proposés : ceux des sujets (soin pivot de chaque principal d'abord), comme l'étape « Vos soins » du parcours
  const suggestions = (() => { const l = soinsSuggeresParcours({ priorites }, undefined, slugs); return [...new Set([...soinsEnAvantDesPriorites(priorites, l), ...l])]; })();
  const autres = catalogue.filter((c) => !suggestions.includes(c.slug) && coches.includes(c.slug)).map((c) => c.slug);
  const titre = (slug: string) => catalogue.find((c) => c.slug === slug)?.titre_court ?? slug;
  // Sujets changés : soins remis à ceux cochés d'office pour ces sujets (comme un nouveau client)
  const majSujets = (p: Priorites) => onChange({ ...scenario, principaux: p.principaux, secondaires: p.secondaires, soins: [] });
  const basculerSoin = (slug: string) => onChange({ ...scenario, soins: coches.includes(slug) ? coches.filter((x) => x !== slug) : [...coches, slug] });
  const auHasard = () => onChange(scenarioAuHasard(alea(Math.floor(Math.random() * 1e9)), slugs));

  return (
    <section aria-labelledby="st-simulateur" className={compact ? 'grid gap-3 px-3 pb-3' : 'grid gap-4 rounded-2xl border border-black/10 bg-white p-4'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 flex-1 basis-56 gap-1">
          <h2 id="st-simulateur" className={compact ? 'sr-only' : 'text-lg font-semibold'}>Simuler un client</h2>
          <p className="max-w-3xl text-sm text-neutral-600">Mêmes choix que dans le parcours « Créer mon site ». Le rendu reste dans ce scénario : visuels de ces sujets seulement, pages que ce client aurait ; une recette enregistrée garde ce scénario.</p>
          <p className="text-sm font-medium text-teal-900" aria-live="polite">{libelleScenario({ ...scenario, soins: coches })} · {coches.length} soin{coches.length > 1 ? 's' : ''}</p>
        </div>
        <button type="button" onClick={auHasard} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 ${focus}`}>🎲 Client au hasard</button>
      </div>
      <details open className="group rounded-xl border border-neutral-200 p-3">
        <summary className={`min-h-11 cursor-pointer content-center text-base font-semibold ${focus}`}>1. Vos sujets</summary>
        <div className="mt-2 max-w-3xl"><ChoixSujets priorites={priorites} onChange={majSujets} soins={coches} soinsConnus={slugs} themesActives={themesActives} /></div>
      </details>
      <div className={compact ? 'grid gap-3' : 'grid gap-4 lg:grid-cols-2 lg:items-start'}>
        <details open className="rounded-xl border border-neutral-200 p-3">
          <summary className={`min-h-11 cursor-pointer content-center text-base font-semibold ${focus}`}>2. Vos couleurs</summary>
          <div className="mt-2"><EtapeCouleursPreferees valeur={scenario.couleurs} onChange={(couleurs) => onChange({ ...scenario, couleurs })} /></div>
        </details>
        <div className="grid gap-4">
          <fieldset className="grid gap-2 rounded-xl border border-neutral-200 p-3">
            <legend className="px-1 text-base font-semibold">3. Vos soins</legend>
            <p className="text-sm text-neutral-600">Cochés d’office d’après les sujets, comme dans le parcours. Chaque soin coché a sa fiche dans les onglets.</p>
            <ul className={compact ? 'grid gap-1' : 'grid gap-1 sm:grid-cols-2'}>
              {[...suggestions, ...autres].map((slug) => (
                <li key={slug}>
                  <label className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-neutral-50">
                    <input type="checkbox" checked={coches.includes(slug)} onChange={() => basculerSoin(slug)} className="size-5 accent-teal-800" />
                    {titre(slug)}
                  </label>
                </li>
              ))}
            </ul>
            {scenario.soins.length > 0 && <button type="button" onClick={() => onChange({ ...scenario, soins: [] })} className={`min-h-11 justify-self-start rounded px-1 text-sm font-semibold text-teal-800 underline ${focus}`}>Revenir aux soins cochés d’office</button>}
          </fieldset>
          <fieldset className={`grid gap-2 rounded-xl border border-neutral-200 p-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
            <legend className="px-1 text-base font-semibold">Cabinet de démonstration</legend>
            <label className="grid gap-1 text-sm"><span className="font-medium">Nom du cabinet</span>
              <input value={cabinet.nom} onChange={(e) => onCabinet({ ...cabinet, nom: e.target.value })} maxLength={80} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-base md:text-sm" />
            </label>
            <label className="grid gap-1 text-sm"><span className="font-medium">Ville</span>
              <input value={cabinet.ville} onChange={(e) => onCabinet({ ...cabinet, ville: e.target.value })} maxLength={60} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-base md:text-sm" />
            </label>
          </fieldset>
        </div>
      </div>
    </section>
  );
}
