'use client';

import { createContext, useContext, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ajouterProfessionIngredients, refuserSuggestionsPartage } from './actions-professions';

// Frigo : professions des ingrédients (docs/architecture-professions.md). Chips « Professions » sur chaque élément, « Aussi pour
// <profession> » en un clic, sélection et partage en lot (barre collante), suggestions de partage à valider (Oui / Non).
// Aucun libellé de métier codé en dur : tout vient du registre (props).

type P = { id: string; court: string };
type Ctx = { choisis: Set<string>; basculer: (cle: string) => void; vider: () => void; tout: (cles: string[]) => void };
const Selection = createContext<Ctx | null>(null);

const COMMUN = 'commun';
const bouton = 'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50';

function useAction() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState('');
  const lancer = (f: () => Promise<{ ok: boolean; message: string }>) => demarrer(async () => { const r = await f(); setMessage(r.message); router.refresh(); });
  return { enCours, message, lancer };
}

/** Fournit la sélection du lot aux cartes et à la barre */
export function SelectionProfessions({ children }: { children: ReactNode }) {
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const basculer = (cle: string) => setChoisis((s) => { const n = new Set(s); if (n.has(cle)) n.delete(cle); else n.add(cle); return n; });
  return <Selection.Provider value={{ choisis, basculer, vider: () => setChoisis(new Set()), tout: (cles) => setChoisis(new Set(cles)) }}>{children}</Selection.Provider>;
}

/** Chips « Professions » d'un élément + case du lot + « Aussi pour … » en un clic */
export function ChipsProfessions({ cle, professions, toutes, migrationManquante }: { cle: string; professions: string[]; toutes: P[]; migrationManquante: boolean }) {
  const ctx = useContext(Selection);
  const { enCours, message, lancer } = useAction();
  const commun = professions.includes(COMMUN);
  const manquantes = commun ? [] : toutes.filter((p) => !professions.includes(p.id));
  const libelle = (id: string) => toutes.find((p) => p.id === id)?.court ?? id;
  return (
    <div className="grid gap-1.5">
      <p className="flex flex-wrap items-center gap-1 text-xs" aria-label="Professions">
        {commun
          ? <span className="rounded-full bg-neutral-800 px-2 py-0.5 font-semibold text-white">Commun</span>
          : professions.map((p) => <span key={p} className="rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-900 ring-1 ring-teal-800/20">{libelle(p)}</span>)}
        {!commun && professions.length > 1 && <span className="text-neutral-500">partagé</span>}
      </p>
      {!commun && (
        <div className="flex flex-wrap items-center gap-1.5">
          {ctx && (
            <label className="inline-flex min-h-11 items-center gap-1.5 text-xs">
              <input type="checkbox" className="size-5 accent-teal-800" checked={ctx.choisis.has(cle)} onChange={() => ctx.basculer(cle)} />
              Lot
            </label>
          )}
          {manquantes.map((p) => (
            <button key={p.id} type="button" disabled={enCours || migrationManquante} title={migrationManquante ? 'Migration 0046 à exécuter' : undefined}
              onClick={() => lancer(() => ajouterProfessionIngredients([cle], p.id))}
              className={`${bouton} bg-white text-xs text-teal-900 ring-1 ring-teal-800/30 hover:bg-teal-50`}>
              Aussi pour {p.court}
            </button>
          ))}
        </div>
      )}
      {message && <p role="status" className="text-xs text-neutral-600">{message}</p>}
    </div>
  );
}

/** Barre du lot : sélection de la page, « Aussi pour … » sur tous les éléments choisis */
export function BarreLot({ cles, toutes, courante, migrationManquante }: { cles: string[]; toutes: P[]; courante: string; migrationManquante: boolean }) {
  const ctx = useContext(Selection);
  const { enCours, message, lancer } = useAction();
  if (!ctx) return null;
  const n = ctx.choisis.size;
  const autres = toutes.filter((p) => p.id !== courante);
  return (
    <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-2 text-sm shadow-lg ring-1 ring-black/10 backdrop-blur">
      <span className="px-1 font-semibold tabular-nums">{n} choisi{n > 1 ? 's' : ''}</span>
      <button type="button" className={`${bouton} bg-neutral-100`} onClick={() => ctx.tout(cles)}>Toute la page</button>
      {n > 0 && <button type="button" className={`${bouton} bg-neutral-100`} onClick={ctx.vider}>Vider</button>}
      {autres.map((p) => (
        <button key={p.id} type="button" disabled={!n || enCours || migrationManquante}
          onClick={() => lancer(async () => { const r = await ajouterProfessionIngredients([...ctx.choisis], p.id); if (r.ok) ctx.vider(); return r; })}
          className={`${bouton} bg-teal-800 text-white`}>
          Aussi pour {p.court}{n ? ` (${n})` : ''}
        </button>
      ))}
      {migrationManquante && <span className="text-xs text-amber-900">Migration 0046 à exécuter.</span>}
      {message && <span role="status" className="text-xs text-neutral-600">{message}</span>}
    </div>
  );
}

/** Suggestion de partage : Oui (rattacher) / Non (ne plus proposer), un élément ou toutes celles affichées */
export function DecisionSuggestion({ cles, profession, court, migrationManquante, tout = false }: { cles: string[]; profession: string; court: string; migrationManquante: boolean; tout?: boolean }) {
  const { enCours, message, lancer } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" disabled={enCours || migrationManquante || !cles.length} onClick={() => lancer(() => ajouterProfessionIngredients(cles, profession))}
        className={`${bouton} ${tout ? 'bg-teal-800 text-white' : 'bg-teal-50 text-xs text-teal-900 ring-1 ring-teal-800/30'}`}>
        {tout ? `Aussi pour ${court} : les ${cles.length}` : `Oui, aussi pour ${court}`}
      </button>
      {!tout && (
        <button type="button" disabled={enCours || migrationManquante} onClick={() => lancer(() => refuserSuggestionsPartage(cles, profession))}
          className={`${bouton} bg-white text-xs text-neutral-700 ring-1 ring-black/10`}>
          Non
        </button>
      )}
      {message && <span role="status" className="text-xs text-neutral-600">{message}</span>}
    </div>
  );
}
