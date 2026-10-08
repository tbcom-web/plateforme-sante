'use client';

// Question « Activités à mettre en avant » (profils de pratique, packages/core/src/profils.ts) : posée dans l'étape des sujets quand
// un thème choisi s'y prête (sport, enfants…). Choix multiple, 3 au plus, dans l'ordre (numéros visibles, flèches pour réordonner).
// Les activités et leurs libellés viennent des données de la profession (pratiques.ts) : rien de propre à un métier ici.
import { activitesProposees, ACTIVITES_MAX, basculerActivite, deplacerActivite, type PratiqueProfession } from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export default function ChoixActivites({ pratique, themes, valeur, onChange }: { pratique: PratiqueProfession; themes: readonly string[]; valeur: readonly string[]; onChange: (v: string[]) => void }) {
  const proposees = activitesProposees(pratique, themes);
  if (!proposees.length) return null;
  const plein = valeur.length >= ACTIVITES_MAX;
  const libelle = (id: string) => proposees.find((a) => a.id === id)?.libelle ?? id;
  return (
    <fieldset className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 sm:p-5" aria-describedby="activites-aide">
      <legend className="sr-only">Activités à mettre en avant</legend>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-semibold">Activités à mettre en avant <span className="text-sm font-normal text-neutral-600">(facultatif)</span></p>
        <p className="text-sm text-neutral-600" aria-live="polite">{valeur.length} sur {ACTIVITES_MAX}</p>
      </div>
      <p id="activites-aide" className="text-sm text-neutral-700">Les patients que vous suivez le plus souvent. Les images et l’ordre des soins de votre site en tiennent compte.</p>
      <ul className="flex flex-wrap gap-2">
        {proposees.map((a) => {
          const rang = valeur.indexOf(a.id);
          const actif = rang >= 0;
          return (
            <li key={a.id}>
              <button
                type="button"
                aria-pressed={actif}
                disabled={!actif && plein}
                onClick={() => onChange(basculerActivite(pratique, valeur, a.id, themes))}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm ${focus} disabled:opacity-40 ${actif ? 'border-teal-700 bg-teal-50 font-semibold text-teal-950' : 'border-neutral-300 bg-white hover:bg-neutral-50'}`}
              >
                {actif && <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-teal-800 text-xs font-bold text-white">{rang + 1}</span>}
                {a.libelle}
              </button>
            </li>
          );
        })}
      </ul>
      {valeur.length > 1 && (
        <ol className="grid gap-1.5" aria-label="Ordre des activités">
          {valeur.map((id, i) => (
            <li key={id} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-1 text-sm">
              <span><span className="font-semibold">{i + 1}.</span> {libelle(id)}</span>
              <span className="flex gap-1">
                <button type="button" onClick={() => onChange(deplacerActivite(valeur, id, -1))} disabled={i === 0} aria-label={`Monter ${libelle(id)}`} className={`size-11 rounded-lg hover:bg-neutral-200 disabled:invisible ${focus}`}>↑</button>
                <button type="button" onClick={() => onChange(deplacerActivite(valeur, id, 1))} disabled={i === valeur.length - 1} aria-label={`Descendre ${libelle(id)}`} className={`size-11 rounded-lg hover:bg-neutral-200 disabled:invisible ${focus}`}>↓</button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </fieldset>
  );
}
