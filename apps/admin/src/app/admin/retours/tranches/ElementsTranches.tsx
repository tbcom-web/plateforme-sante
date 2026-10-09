'use client';

// Liste des éléments tranchés (1 ★ / 5 ★), filtrable par état et par type, avec « Réévaluer » (un par un ou la sélection).
import { useRouter } from 'next/navigation';
import { useMemo, useState, type CSSProperties } from 'react';
import { gamme as gammeParId, inventaireAssets, libelleCleRenfort, LIBELLES_TYPES_ASSET, SURFACES_CSS, titresAssets, variablesCharte, variablesGamme, type Asset, type TypeAsset } from '@plateforme/core';
import type { DetailTranche } from '@/lib/tranches';
import Apercu from '../tri/ApercuVisuel';
import { reevaluer } from './actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const FAMILLES: Record<DetailTranche['famille'], string> = { element: 'Élément', combinaison: 'Combinaison de l’atelier', recette: 'Recette complète', duel: 'Duel (les deux mauvais)', implicite: 'Vu sans être choisi' };

const typeDe = (d: DetailTranche) => (d.famille === 'element' ? d.cle.slice(0, d.cle.indexOf(':')) : d.famille);

export default function ElementsTranches({ details }: { details: DetailTranche[] }) {
  const router = useRouter();
  const [etat, setEtat] = useState<'tous' | 'refuse' | 'favori'>('tous');
  const [type, setType] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const parCle = useMemo(() => new Map<string, Asset>(inventaireAssets().map((a) => [a.cle, a])), []);
  const titres = useMemo(() => titresAssets(), []);
  const types = useMemo(() => [...new Set(details.map(typeDe))].sort(), [details]);
  const l = details.filter((d) => (etat === 'tous' || d.etat === etat) && (!type || typeDe(d) === type));
  const libelleType = (t: string) => LIBELLES_TYPES_ASSET[t as TypeAsset] ?? FAMILLES[t as DetailTranche['famille']] ?? t;
  const titre = (d: DetailTranche) => (d.cle.startsWith('prop:') ? `Proposition ${d.cle.slice(5).replace(/~/g, ' · ')}` : d.cle.startsWith('compo:') ? `Composition ${d.cle.slice(6, 12)}` : titres[d.cle] ?? (libelleCleRenfort(d.cle) !== d.cle ? libelleCleRenfort(d.cle) : d.cle));
  const agir = async (cles: string[]) => {
    const r = await reevaluer(cles).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setMessage(r.message);
    if (r.ok) { setSel([]); router.refresh(); }
  };
  const style = useMemo(() => ({ ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) }) as CSSProperties, []);
  return (
    <div className="grid gap-3" style={style}>
      <style>{SURFACES_CSS + '.tr-svg svg{width:100%;height:100%;display:block}'}</style>
      <div className="flex flex-wrap items-end gap-2">
        <div role="group" aria-label="État" className="flex gap-1 rounded-xl bg-neutral-100 p-1">
          {([['tous', `Tous (${details.length})`], ['refuse', `1 ★ (${details.filter((d) => d.etat === 'refuse').length})`], ['favori', `5 ★ (${details.filter((d) => d.etat === 'favori').length})`]] as const).map(([id, nom]) => (
            <button key={id} type="button" aria-pressed={etat === id} onClick={() => setEtat(id)} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${focus} ${etat === id ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700'}`}>{nom}</button>
          ))}
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
            <option value="">Tous les types</option>
            {types.map((t) => <option key={t} value={t}>{libelleType(t)}</option>)}
          </select>
        </label>
        <button type="button" disabled={!sel.length} onClick={() => void agir(sel)} className={`ml-auto min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white disabled:opacity-40 ${focus}`}>Réévaluer la sélection ({sel.length})</button>
      </div>
      {message && <p role="status" className="text-sm text-neutral-800">{message}</p>}
      {!l.length ? <p className="rounded-2xl border border-black/10 bg-white p-6 text-center text-sm text-neutral-600">Aucun élément tranché pour ce filtre.</p> : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {l.map((d) => {
            const a = parCle.get(d.cle);
            const coche = sel.includes(d.cle);
            return (
              <li key={d.cle} className={`grid content-start gap-1.5 rounded-xl border bg-white p-1.5 ${coche ? 'border-teal-700 ring-2 ring-teal-700' : 'border-black/10'}`}>
                {a ? <Apercu a={a} /> : <div className="grid aspect-square place-items-center rounded-xl bg-neutral-100 p-2 text-center text-xs text-neutral-600">{FAMILLES[d.famille]}</div>}
                <span className="min-w-0 break-words text-xs font-semibold" title={d.cle}>{titre(d)}</span>
                <span className="flex flex-wrap items-center gap-1 text-[11px]">
                  <span className={`rounded px-1.5 py-0.5 font-semibold ${d.etat === 'refuse' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'}`}>{d.famille === 'implicite' ? 'Vu sans être choisi · plus montré à noter' : d.etat === 'refuse' ? '1 ★ · plus jamais montré' : '5 ★ · favori, plus redemandé'}</span>
                  <span className="text-neutral-500">{libelleType(typeDe(d))}{d.le ? ` · ${d.le.slice(0, 10)}` : ''}</span>
                </span>
                <span className="flex flex-wrap gap-1">
                  <label className="flex min-h-9 items-center gap-1 text-xs"><input type="checkbox" checked={coche} onChange={(e) => setSel((s) => (e.target.checked ? [...s, d.cle] : s.filter((x) => x !== d.cle)))} className="size-4" />Sélection</label>
                  <button type="button" onClick={() => void agir([d.cle])} className={`min-h-9 rounded-lg border border-teal-800 px-2 text-xs font-semibold text-teal-900 ${focus}`}>Réévaluer</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
