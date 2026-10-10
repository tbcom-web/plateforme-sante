'use client';

// Propositions du composeur, EN GRAND et en situation (téléphone d'abord) : la meilleure d'abord, « pourquoi ce choix », jauge 4-5 ★.
// On touche « Garder » sur celles qui plaisent puis « Garder (n) » : même action que la présélection (vérification automatique).
import { useState } from 'react';
import Link from 'next/link';
import ApercuModele, { type RenduChaine, type ScenarioChaine } from '../ApercuModele';
import { garderPreselection, type PropositionPreselection } from '../actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export type PropositionAffichee = {
  cle: string; nom: string; design: Record<string, unknown>; rendue: Record<string, unknown>; ingredients: Record<string, unknown>;
  legende: string; pourquoi: string; score: number; rang: number; qualite: { bons: number; total: number }; replis: number;
};

type Props = { propositions: PropositionAffichee[]; scenario: ScenarioChaine; rendu: RenduChaine; profilDemo: string; nomProfil: string };

export default function Propositions({ propositions, scenario, rendu, profilDemo, nomProfil }: Props) {
  const [appareil, setAppareil] = useState<'mobile' | 'ordinateur'>('mobile');
  const [choix, setChoix] = useState<string[]>([]);
  const [gardes, setGardes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const basculer = (cle: string) => setChoix((l) => (l.includes(cle) ? l.filter((k) => k !== cle) : [...l, cle]));

  const garder = async () => {
    const l = propositions.filter((p) => choix.includes(p.cle) && !gardes.includes(p.cle));
    if (!l.length) return;
    setEnCours(true);
    setMessage('Enregistrement…');
    let ajoutes = 0;
    const faits: string[] = [];
    try {
      // Par pages de 6 au plus (même action que la présélection)
      for (let i = 0; i < l.length; i += 6) {
        const page: PropositionPreselection[] = l.slice(i, i + 6).map((p) => ({
          cle: p.cle, nom: p.nom, design: p.design, ingredients: p.ingredients, profilDemo,
          composePour: { nom: nomProfil, principaux: scenario.principaux, secondaires: scenario.secondaires },
        }));
        const r = await garderPreselection({ propositions: page, selection: page.map((_, k) => k), appareil });
        if (!r.ok) { setMessage(r.message); break; }
        ajoutes += r.ajoutes ?? 0;
        faits.push(...page.map((p) => p.cle));
      }
      if (faits.length) setMessage(`${faits.length} modèle${faits.length > 1 ? 's' : ''} gardé${faits.length > 1 ? 's' : ''}${ajoutes < faits.length ? ` (${faits.length - ajoutes} déjà en file)` : ''} : la vérification automatique suit.`);
    } catch {
      setMessage('Enregistrement impossible pour le moment : réessayez.');
    } finally {
      setGardes((g) => [...g, ...faits]);
      setChoix((c) => c.filter((k) => !faits.includes(k)));
      setEnCours(false);
    }
  };

  if (!propositions.length) return null;
  const hauteur = appareil === 'mobile' ? 560 : 340;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={() => setAppareil(appareil === 'mobile' ? 'ordinateur' : 'mobile')} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`} data-action="appareil">{appareil === 'mobile' ? 'Voir sur ordinateur' : 'Voir sur téléphone'}</button>
        <Link href="/chaine" className={`inline-flex min-h-11 items-center rounded-lg border border-teal-800 px-3 font-semibold text-teal-900 ${focus}`}>Voir le tableau</Link>
      </div>
      <ol className={`grid gap-4 ${appareil === 'mobile' ? 'sm:grid-cols-2 xl:grid-cols-4' : 'lg:grid-cols-2'}`}>
        {propositions.map((p, i) => {
          const choisi = choix.includes(p.cle), garde = gardes.includes(p.cle);
          return (
            <li key={p.cle} className={`grid min-w-0 content-start gap-2 rounded-2xl border bg-white p-2 ${choisi || garde ? 'border-teal-700 ring-2 ring-teal-700' : 'border-black/10'}`} data-proposition-composeur={p.rang}>
              <div className="pointer-events-none overflow-hidden rounded-xl">
                <ApercuModele composition={p.rendue} scenario={scenario} rendu={rendu} appareil={appareil} hauteur={hauteur} vignette precharger={i < 4} />
              </div>
              <div className="grid gap-1 px-1">
                <p className="flex items-baseline justify-between gap-2 text-sm font-semibold"><span>{p.rang}. {p.legende.split(' · ')[0]}</span><span className="shrink-0 text-xs font-normal text-neutral-600" title="Score du composeur (juge, jauge 4-5 ★, harmonie, préférences, accord avec le profil)">{p.score}/100</span></p>
                <p className="text-sm text-neutral-800" data-pourquoi="">{p.pourquoi}</p>
                <p className="text-xs text-neutral-600">{p.legende}</p>
              </div>
              <button type="button" aria-pressed={choisi || garde} disabled={garde || enCours} onClick={() => basculer(p.cle)}
                className={`min-h-11 rounded-lg px-3 font-semibold ${garde ? 'bg-teal-50 text-teal-900' : choisi ? 'bg-teal-800 text-white' : 'border border-teal-800 bg-white text-teal-900'} ${focus}`} data-action="garder-un">
                {garde ? 'Gardé ✓' : choisi ? 'À garder ✓' : 'Garder ce modèle'}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-xl bg-white/95 p-1.5 shadow-lg ring-1 ring-black/10 backdrop-blur">
        <button type="button" onClick={() => void garder()} disabled={!choix.length || enCours} className={`min-h-11 rounded-lg bg-teal-800 px-4 font-semibold text-white disabled:opacity-50 ${focus}`} data-action="garder">Garder ({choix.length})</button>
        {message && <span role="status" className="text-sm text-neutral-700">{message}</span>}
      </div>
    </div>
  );
}
