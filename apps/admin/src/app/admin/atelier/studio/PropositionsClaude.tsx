'use client';

// « Propositions de Claude » (Studio de recettes) : les meilleures recettes choisies par le directeur artistique
// (.claude/agents/directeur-artistique.md, retours/recettes-proposees.json), par scénario, avec leurs raisons.
// - « Ouvrir dans le Studio » : composition chargée dans le Studio (scénario de la proposition, verrous à zéro) ;
// - « Enregistrer comme recette » : recette enregistrée sans note (Paul la note ensuite dans le Studio) ;
// - « Pas convaincu » (+ remarque) : journalisé (directeur_avis, 0035 ; sinon navigateur + export) pour améliorer le directeur.
import { useEffect, useMemo, useState } from 'react';
import { libellesComposition, modeleIntegre, normaliserComposition, type CompositionRecette } from '@plateforme/core';
import { dernieresDecisions, type AvisDirecteur, type LotPropositions, type PropositionClaude } from '@/lib/directeur-format';
import { enregistrerRecette } from './actions';
import { journaliserAvisDirecteur } from './actions-directeur';
import { avisLocaux, ajouterAvisLocal, exporterAvisLocaux } from './avis-locaux';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const bouton = `inline-flex min-h-11 items-center justify-center rounded-lg border px-3 text-sm ${focus}`;

/** Événement écouté par le Studio : charge une composition (scénario de la proposition, verrous à zéro) */
export const EVENEMENT_OUVRIR = 'studio:ouvrir-proposition';
export type DetailOuvrir = { nom: string; sujets: string[]; couleurs: string[]; composition: CompositionRecette; /** Scénario complet (simulateur.ts) */ scenario?: { principaux: string[]; secondaires: string[]; couleurs: string[]; soins: string[] } };

const compositionDe = (p: PropositionClaude) => normaliserComposition(p.composition, { sujets: p.scenario.sujets, principaux: p.scenario.principaux.length, couleursPreferees: p.scenario.couleurs, modele: modeleIntegre });

export default function PropositionsClaude({ lot, avis, migrationManquante }: { lot: LotPropositions; avis: AvisDirecteur[]; migrationManquante: boolean }) {
  const [locaux, setLocaux] = useState<AvisDirecteur[]>([]);
  useEffect(() => setLocaux(avisLocaux()), []);
  const decisions = useMemo(() => dernieresDecisions([...avis, ...locaux], 'proposition'), [avis, locaux]);
  const [statut, setStatut] = useState<Record<string, string>>({});
  const [remarque, setRemarque] = useState<Record<string, string>>({});
  const [ouvertRemarque, setOuvertRemarque] = useState<string | null>(null);
  const scenarios = useMemo(() => {
    const m = new Map<string, PropositionClaude[]>();
    for (const p of lot.propositions) m.set(p.scenario.id, [...(m.get(p.scenario.id) ?? []), p]);
    return [...m.values()];
  }, [lot]);

  const dire = (id: string, message: string) => setStatut((s) => ({ ...s, [id]: message }));
  const journaliser = async (p: PropositionClaude, decision: 'pas-convaincu' | 'enregistree', texte: string | null) => {
    const r = await journaliserAvisDirecteur({ nature: 'proposition', cle: p.id, decision, remarque: texte, profil: lot.profil }).catch(() => ({ ok: false, message: 'Connexion perdue.', migrationManquante: true }));
    if (!r.ok && r.migrationManquante) setLocaux(ajouterAvisLocal({ nature: 'proposition', cle: p.id, decision, remarque: texte, le: new Date().toISOString() }));
    return r;
  };
  const ouvrir = (p: PropositionClaude) => {
    const composition = compositionDe(p);
    if (!composition) { dire(p.id, 'Composition illisible.'); return; }
    window.dispatchEvent(new CustomEvent<DetailOuvrir>(EVENEMENT_OUVRIR, { detail: { nom: p.nom, sujets: p.scenario.sujets, couleurs: p.scenario.couleurs, composition, scenario: { principaux: p.scenario.principaux, secondaires: p.scenario.secondaires, couleurs: p.scenario.couleurs, soins: p.scenario.soins } } }));
    dire(p.id, 'Ouverte dans le Studio (verrous à zéro).');
  };
  const enregistrer = async (p: PropositionClaude) => {
    const composition = compositionDe(p);
    if (!composition) { dire(p.id, 'Composition illisible.'); return; }
    const r = await enregistrerRecette({ nom: p.nom, sujets: p.scenario.sujets, couleurs: p.scenario.couleurs, scenario: { principaux: p.scenario.principaux, secondaires: p.scenario.secondaires, couleurs: p.scenario.couleurs, soins: p.scenario.soins }, composition, note: null, etiquettes: [] })
      .catch(() => ({ ok: false, message: 'Connexion perdue : recette non enregistrée.' }));
    dire(p.id, r.ok ? `${r.message} Notez-la dans « Mes recettes » (Ouvrir).` : r.message);
    if (r.ok) await journaliser(p, 'enregistree', null);
  };
  const pasConvaincu = async (p: PropositionClaude) => {
    const texte = (remarque[p.id] ?? '').trim() || null;
    const r = await journaliser(p, 'pas-convaincu', texte);
    dire(p.id, r.ok ? r.message : r.migrationManquante ? 'Avis gardé dans ce navigateur (migration 0035 à exécuter) : pensez à l’exporter.' : r.message);
    setOuvertRemarque(null);
  };

  return (
    <section aria-labelledby="st-claude" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 id="st-claude" className="text-lg font-semibold">Propositions de Claude <span className="text-sm font-normal text-neutral-500">({lot.propositions.length})</span></h2>
          <p className="max-w-3xl text-sm text-neutral-600">
            Recettes choisies par le directeur artistique : il part du générateur, change un élément à la fois, rend le site et garde ce qui est plus harmonieux.
            Score prédit d’après votre profil de goût{lot.profil ? ` (${lot.profil})` : ''}{lot.le ? `, passe du ${lot.le}` : ''} : seule votre note compte.
          </p>
        </div>
        {locaux.length > 0 && (
          <button type="button" onClick={() => exporterAvisLocaux(locaux)} className={`${bouton} border-amber-400 bg-amber-50`}>Exporter mes avis ({locaux.length})</button>
        )}
      </div>
      {migrationManquante && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 ring-1 ring-amber-200">Migration 0035 à exécuter (<code>supabase/migrations/0035_directeur_avis.sql</code>) : en attendant, vos avis restent dans ce navigateur (bouton « Exporter mes avis »).</p>}
      {!scenarios.length ? <p className="text-sm text-neutral-500">Aucune proposition pour l’instant (retours/recettes-proposees.json).</p> : scenarios.map((ps) => (
        <div key={ps[0].scenario.id} className="grid gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">{ps[0].scenario.libelle}</h3>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {ps.map((p) => {
              const x = compositionDe(p);
              const d = decisions[p.id];
              return (
                <li key={p.id} className={`grid min-w-0 content-start gap-2 rounded-xl border p-3 ${d?.decision === 'pas-convaincu' ? 'border-dashed border-neutral-300 opacity-75' : 'border-black/10'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-start gap-2">
                      {x && <span aria-hidden className="mt-1 size-4 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: x.couleur }} />}
                      <strong className="min-w-0 break-words">{p.rang}. {p.nom}</strong>
                    </span>
                    {p.score !== null && <span className="shrink-0 text-sm" title="Score prédit (juge du goût de Paul)">{p.score.toFixed(1)}★ prédit</span>}
                  </div>
                  {x && <p className="text-xs text-neutral-500">{libellesComposition(x).filter((l) => l.dimension !== 'Photos' || x.photos.length).map((l) => l.valeur).join(' · ')}</p>}
                  {p.raisons.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-teal-900">Pourquoi c’est harmonieux</p>
                      <ul className="mt-0.5 list-disc pl-4 text-sm text-neutral-800">{p.raisons.map((r) => <li key={r}>{r}</li>)}</ul>
                    </div>
                  )}
                  {p.reserves.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-900">Ce qui pourrait vous gêner</p>
                      <ul className="mt-0.5 list-disc pl-4 text-sm text-neutral-700">{p.reserves.map((r) => <li key={r}>{r}</li>)}</ul>
                    </div>
                  )}
                  {d && <p className="text-xs text-neutral-600">Votre avis : {d.decision === 'pas-convaincu' ? `pas convaincu${d.remarque ? ` (« ${d.remarque} »)` : ''}` : 'enregistrée comme recette'}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => ouvrir(p)} disabled={!x} className={`${bouton} border-teal-800 font-semibold text-teal-900 disabled:opacity-40`}>Ouvrir dans le Studio</button>
                    <button type="button" onClick={() => void enregistrer(p)} disabled={!x} className={`${bouton} border-neutral-300 disabled:opacity-40`}>Enregistrer comme recette</button>
                    <button type="button" onClick={() => setOuvertRemarque(ouvertRemarque === p.id ? null : p.id)} aria-expanded={ouvertRemarque === p.id} className={`${bouton} border-neutral-300`}>Pas convaincu</button>
                  </div>
                  {ouvertRemarque === p.id && (
                    <div className="grid gap-1.5">
                      <label className="grid gap-1 text-sm">Qu’est-ce qui ne va pas ? (facultatif)
                        <textarea value={remarque[p.id] ?? ''} onChange={(e) => setRemarque((r) => ({ ...r, [p.id]: e.target.value }))} rows={2} maxLength={1000} className="rounded-lg border border-neutral-300 p-2 text-sm" />
                      </label>
                      <button type="button" onClick={() => void pasConvaincu(p)} className={`${bouton} justify-self-start border-neutral-800 bg-neutral-900 font-semibold text-white`}>Envoyer</button>
                    </div>
                  )}
                  <p role="status" className="min-h-4 text-xs text-neutral-600">{statut[p.id] ?? ''}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
