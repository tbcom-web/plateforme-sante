'use client';

// Duel A/B du tournoi : deux sites complets côte à côte (empilés sur téléphone), ordinateur ou téléphone, A / Égalité / B, touches ← = →.
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ApercuModele, { type RenduChaine, type ScenarioChaine } from '../ApercuModele';
import { voter } from '../actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
type Cote = { id: string; nom: string; composition: Record<string, unknown> };

export default function Duel({ profil, a, b, scenario, rendu }: { profil: string; a: Cote; b: Cote; scenario: ScenarioChaine; rendu: RenduChaine }) {
  const router = useRouter();
  const [appareil, setAppareil] = useState<'ordinateur' | 'mobile'>('mobile');
  const [message, setMessage] = useState('');
  const [enCours, demarrer] = useTransition();
  useEffect(() => { if (window.innerWidth >= 1024) setAppareil('ordinateur'); }, []);
  const choisir = useCallback((resultat: 'a' | 'b' | 'egalite') => {
    demarrer(async () => {
      const r = await voter({ profil, a: a.id, b: b.id, resultat, appareil });
      setMessage(r.message);
      if (r.ok) router.refresh();
    });
  }, [profil, a.id, b.id, appareil, router]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') choisir('a'); else if (e.key === 'ArrowRight') choisir('b'); else if (e.key === '=') choisir('egalite'); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [choisir]);
  const h = appareil === 'mobile' ? 520 : 420;
  return (
    <div className="grid gap-3" data-duel={`${a.id}|${b.id}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={() => setAppareil(appareil === 'mobile' ? 'ordinateur' : 'mobile')} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`}>{appareil === 'mobile' ? 'Voir sur ordinateur' : 'Voir sur téléphone'}</button>
        {message && <span role="status" className="text-neutral-700">{message}</span>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[{ c: a, k: 'a' as const, l: 'A' }, { c: b, k: 'b' as const, l: 'B' }].map(({ c, k, l }) => (
          <div key={c.id} className="grid gap-2 rounded-2xl border border-black/10 bg-white p-2">
            <ApercuModele composition={c.composition} scenario={scenario} rendu={rendu} appareil={appareil} hauteur={h} />
            <button type="button" disabled={enCours} onClick={() => choisir(k)} className={`min-h-12 rounded-xl bg-teal-800 px-4 text-base font-semibold text-white disabled:opacity-60 ${focus}`} data-voter={k}>Je préfère {l}</button>
          </div>
        ))}
      </div>
      <button type="button" disabled={enCours} onClick={() => choisir('egalite')} className={`min-h-11 justify-self-center rounded-lg border border-neutral-300 bg-white px-4 ${focus}`} data-voter="egalite">Égalité</button>
    </div>
  );
}
