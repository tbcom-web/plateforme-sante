'use client';

// Paramètres du Studio rangés en six groupes repliables (retour de Paul du 2026-10-08 : « revoir l'organisation des éléments »).
// Chaque dé est décrit par une rangée (clé de verrou, titre, valeur actuelle, dé) ; le groupe vient du registre du core
// (groupeDeCle, studio-organisation.ts) : un nouveau dé se range seul. Une rangée = valeur actuelle · 🎲 · ← · 🔒 ; un choix
// direct (liste, styles…) s'ouvre en touchant la valeur. Les réglages axe par axe (`fin`) sont regroupés sous « Réglage fin ».
import { useEffect, useState, type ReactNode } from 'react';
import { rangerParGroupe, type GroupeStudio } from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const petitBase = `grid size-11 shrink-0 place-items-center rounded-lg border text-base ${focus} disabled:opacity-35`;
const petit = `${petitBase} border-neutral-200 bg-white hover:bg-neutral-50`;

export type RangeeStudio = {
  /** Clé du verrou et de l'historique (« couleurs », « hab:typo:casse », « page:acces », « composant:accueil »…) */
  cle: string;
  titre: string;
  valeur: string;
  onDe: () => void;
  touche?: string;
  /** Verrou parent qui bloque aussi ce dé (« structure » pour une page, « typo » pour un axe) */
  verrouParent?: string;
  /** Choix direct, ouvert en touchant la valeur */
  choix?: ReactNode;
  /** Réglage axe par axe : rangé sous « Réglage fin » */
  fin?: boolean;
};

type Props = {
  rangees: RangeeStudio[];
  verrous: readonly string[];
  onVerrou: (cle: string) => void;
  onPrecedent: (cle: string) => void;
  peutRevenir: (cle: string) => boolean;
};

const CLE_OUVERTS = 'studio:groupes-ouverts';

function Rangee({ r, verrous, onVerrou, onPrecedent, peutRevenir }: { r: RangeeStudio } & Omit<Props, 'rangees'>) {
  const [ouvert, setOuvert] = useState(false);
  const verrou = verrous.includes(r.cle);
  const bloque = verrou || Boolean(r.verrouParent && verrous.includes(r.verrouParent));
  const texte = (
    <>
      <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{r.titre}{r.touche && <kbd className="ml-1 rounded bg-neutral-100 px-1 font-normal normal-case">{r.touche}</kbd>}</span>
      <span className="block truncate text-sm text-neutral-900" title={r.valeur}>{r.valeur || '—'}</span>
    </>
  );
  return (
    <li className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-lg px-1.5 py-1 ${verrou ? 'bg-amber-50 ring-1 ring-amber-300' : ''}`} data-cle={r.cle}>
      {r.choix ? (
        <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} className={`min-h-11 min-w-0 rounded-md px-1 text-left hover:bg-neutral-50 ${focus}`} title="Choisir directement">
          {texte}
        </button>
      ) : <span className="min-w-0 px-1">{texte}</span>}
      <span className="flex gap-1">
        <button type="button" className={petit} onClick={r.onDe} disabled={bloque} aria-label={`Changer : ${r.titre}`} title={bloque ? 'Bloqué' : 'Changer'}>🎲</button>
        <button type="button" className={petit} onClick={() => onPrecedent(r.cle)} disabled={!peutRevenir(r.cle)} aria-label={`Précédent : ${r.titre}`} title="Revenir au précédent">←</button>
        <button type="button" className={verrou ? `${petitBase} border-amber-500 bg-amber-100` : petit} onClick={() => onVerrou(r.cle)} aria-pressed={verrou}
          aria-label={`${verrou ? 'Débloquer' : 'Bloquer'} : ${r.titre}`} title={verrou ? 'Bloqué : « Tout changer » n’y touche pas' : 'Bloquer'}>{verrou ? '🔒' : '🔓'}</button>
      </span>
      {ouvert && r.choix && <div className="col-span-2 grid gap-1 pb-1">{r.choix}</div>}
    </li>
  );
}

export default function ParametresGroupes({ rangees, verrous, onVerrou, onPrecedent, peutRevenir }: Props) {
  const [ouverts, setOuverts] = useState<GroupeStudio[]>([]);
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(CLE_OUVERTS) ?? '[]'); if (Array.isArray(v)) setOuverts(v); } catch { /* stockage indisponible */ } }, []);
  const basculer = (g: GroupeStudio, ouvert: boolean) => setOuverts((l) => {
    const n = ouvert ? [...new Set([...l, g])] : l.filter((x) => x !== g);
    try { localStorage.setItem(CLE_OUVERTS, JSON.stringify(n)); } catch { /* stockage indisponible */ }
    return n;
  });
  const commun = { verrous, onVerrou, onPrecedent, peutRevenir };
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5">
      {rangerParGroupe(rangees).filter((g) => g.rangees.length).map(({ groupe, rangees: rs }) => {
        const bloques = rs.filter((r) => verrous.includes(r.cle)).length;
        const principales = rs.filter((r) => !r.fin);
        const fines = rs.filter((r) => r.fin);
        return (
          <details key={groupe.id} open={ouverts.includes(groupe.id)} onToggle={(e) => basculer(groupe.id, (e.currentTarget as HTMLDetailsElement).open)}
            className="group min-w-0 rounded-xl border border-black/10 bg-white" data-groupe={groupe.id}>
            <summary className={`flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-xl px-3 ${focus}`}>
              <span aria-hidden="true" className="text-xs text-neutral-400 transition-transform group-open:rotate-90">▶</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{groupe.nom}</span>
                <span className="block truncate text-xs text-neutral-500">{principales.slice(0, 2).map((r) => r.valeur).filter(Boolean).join(' · ')}</span>
              </span>
              {bloques > 0 && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900" title={`${bloques} élément${bloques > 1 ? 's' : ''} bloqué${bloques > 1 ? 's' : ''}`}>🔒 {bloques}</span>}
            </summary>
            <ul className="grid gap-0.5 px-1.5 pb-2">
              {principales.map((r) => <Rangee key={r.cle} r={r} {...commun} />)}
              {fines.length > 0 && (
                <li>
                  <details className="rounded-lg border border-neutral-200">
                    <summary className={`flex min-h-11 cursor-pointer items-center px-2 text-sm text-neutral-700 ${focus}`}>Réglage fin ({fines.length}){fines.some((r) => verrous.includes(r.cle)) ? ' · 🔒' : ''}</summary>
                    <ul className="grid gap-0.5 p-1">{fines.map((r) => <Rangee key={r.cle} r={r} {...commun} />)}</ul>
                  </details>
                </li>
              )}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
