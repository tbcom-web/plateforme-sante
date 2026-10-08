'use client';

// « Compléter ce kit » (/admin/retours/kits, demande de Paul du 2026-10-08 : « il faut que le tool suggère des photos à ajouter au
// kit ») : les emplacements vides ou faibles un par un (mode file). Pour chacun : suggestions de la BANQUE d'abord (« Utiliser ici »
// = sujet + hashtag de l'emplacement ajoutés à la photo, le kit se recompose ; « Pas pour ici » = mémorisé), puis NOUVELLES
// (Pexels / Pixabay, requêtes ciblées : « Garder » = lien seulement, #<emplacement> et #kit-<sujet> pré-cochés ; elle entre dans le
// kit après « Valider et importer » dans /admin/photos). Clavier : U utiliser, G garder, X pas pour ici, → emplacement suivant,
// ↑ ↓ suggestion précédente / suivante.
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cleCandidat, LICENCES_SOURCES, type EmplacementAFaire, type SuggestionBanque } from '@plateforme/core';
import type { PhotoEnAttenteKit } from '@/lib/kits-images';
import type { CandidatAffiche } from '../actions-photos';
import { garderPourKit, pasPourIci, suggestionsNouvelles, utiliserIci } from './actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const CLE_REFUS = 'kits:pas-ici';
const RAISONS: Record<EmplacementAFaire['raison'], string> = { vide: 'vide', faible: 'photo non notée ou < 3,5 ★', complement: 'complément d’un autre sujet' };

type Item = { kind: 'banque'; s: SuggestionBanque } | { kind: 'nouvelle'; c: CandidatAffiche };

export default function CompleterKit({ sujet, aFaire, compteur, enAttente }: { sujet: string; aFaire: (EmplacementAFaire & { banque: SuggestionBanque[] })[]; compteur: string; enAttente: PhotoEnAttenteKit[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [i, setI] = useState(0);
  const [sel, setSel] = useState(0);
  const [message, setMessage] = useState('');
  const [refusLocaux, setRefusLocaux] = useState<string[]>([]);
  useEffect(() => { try { const l = JSON.parse(localStorage.getItem(CLE_REFUS) ?? '[]'); setRefusLocaux(Array.isArray(l) ? l : []); } catch { /* indisponible */ } }, []);
  const [nouvelles, setNouvelles] = useState<Record<string, CandidatAffiche[]>>({});
  const [chargement, setChargement] = useState(false);
  const vues = useRef<string[]>([]);
  const e = aFaire[Math.min(i, Math.max(0, aFaire.length - 1))];
  const items: Item[] = useMemo(() => !e ? [] : [
    ...e.banque.filter((s) => !refusLocaux.includes(`${e.emplacement}|${s.cle}`)).map((s) => ({ kind: 'banque' as const, s })),
    ...(nouvelles[e.emplacement] ?? []).map((c) => ({ kind: 'nouvelle' as const, c })),
  ], [e, nouvelles, refusLocaux]);
  const attente = e ? enAttente.filter((x) => x.emplacement === e.emplacement) : [];

  const chercher = useCallback(async () => {
    if (!e || chargement) return;
    setChargement(true);
    const r = await suggestionsNouvelles(sujet, e.emplacement, vues.current).catch(() => ({ ok: false, message: 'Connexion perdue.', candidats: [] }));
    for (const c of r.candidats) vues.current.push(cleCandidat(c));
    setNouvelles((n) => ({ ...n, [e.emplacement]: [...(n[e.emplacement] ?? []), ...r.candidats] }));
    if (!r.ok) setMessage(r.message);
    setChargement(false);
  }, [e, sujet, chargement]);
  // File : les nouvelles suggestions se chargent quand la banque n'a rien (ou à la demande)
  useEffect(() => { if (ouvert && e && !e.banque.length && !nouvelles[e.emplacement]) void chercher(); }, [ouvert, e, nouvelles, chercher]);

  const retirer = (it: Item) => {
    if (it.kind === 'banque') setRefusLocaux((l) => [...l, `${e.emplacement}|${it.s.cle}`]);
    else setNouvelles((n) => ({ ...n, [e.emplacement]: (n[e.emplacement] ?? []).filter((c) => c !== it.c) }));
  };
  const utiliser = async (it: Item | undefined) => {
    if (!it || !e) return;
    if (it.kind === 'nouvelle') { await garder(it); return; }
    const r = await utiliserIci(it.s.cle, sujet, e.emplacement).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setMessage(r.message);
    if (r.ok) { setSel(0); router.refresh(); }
  };
  const garder = async (it: Item | undefined) => {
    if (!it || !e || it.kind !== 'nouvelle') return;
    const r = await garderPourKit(it.c.source, it.c.idSource, sujet, e.emplacement, it.c.requete).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setMessage(r.message);
    if (r.ok) { retirer(it); router.refresh(); }
  };
  const refuser = async (it: Item | undefined) => {
    if (!it || !e) return;
    retirer(it);
    if (it.kind === 'banque') {
      const l = [...refusLocaux, `${e.emplacement}|${it.s.cle}`];
      try { localStorage.setItem(CLE_REFUS, JSON.stringify(l.slice(-2000))); } catch { /* indisponible */ }
      const r = await pasPourIci(it.s.cle, e.emplacement).catch(() => ({ ok: false, message: 'Connexion perdue : refus gardé dans ce navigateur.' }));
      setMessage(r.message);
    } else setMessage('Elle ne sera plus proposée.');
  };
  const suivant = () => { setI((x) => Math.min(aFaire.length - 1, x + 1)); setSel(0); setMessage(''); };

  const refs = useRef({ utiliser, garder, refuser, suivant, items, sel });
  refs.current = { utiliser, garder, refuser, suivant, items, sel };
  useEffect(() => {
    if (!ouvert) return;
    const f = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (ev.ctrlKey || ev.metaKey || ev.altKey || (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      const { items: l, sel: s } = refs.current;
      const k = ev.key.toLowerCase();
      if (k === 'u') { ev.preventDefault(); void refs.current.utiliser(l[s]); }
      else if (k === 'g') { ev.preventDefault(); void refs.current.garder(l[s]); }
      else if (k === 'x') { ev.preventDefault(); void refs.current.refuser(l[s]); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); refs.current.suivant(); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); setSel((x) => Math.min(l.length - 1, x + 1)); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); setSel((x) => Math.max(0, x - 1)); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [ouvert]);

  const carte = (it: Item, k: number) => {
    const actif = k === sel;
    const src = it.kind === 'banque' ? it.s.url : it.c.apercu;
    return (
      <li key={it.kind === 'banque' ? it.s.url : cleCandidat(it.c)} onClick={() => setSel(k)}
        className={`grid content-start gap-1.5 rounded-xl border bg-white p-1.5 ${actif ? 'border-teal-700 ring-2 ring-teal-700' : 'border-black/10'}`}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
          {it.kind === 'banque'
            ? <Image src={src} alt="" fill sizes="(max-width: 767px) 50vw, 16vw" className="object-cover" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={src} alt={it.c.description || ''} referrerPolicy="no-referrer" className="size-full object-cover" />}
        </div>
        <span className="text-[11px] text-neutral-600">
          {it.kind === 'banque' ? <>Dans la banque{it.s.raisons.length ? ` · ${it.s.raisons.join(' · ')}` : ''}</> : <>Nouvelle · {LICENCES_SOURCES[it.c.source].libelle} · {it.c.auteur} · « {it.c.requete} »</>}
        </span>
        <span className="flex flex-wrap gap-1">
          {it.kind === 'banque'
            ? <button type="button" onClick={() => void utiliser(it)} className={`min-h-9 rounded-lg bg-teal-800 px-2 text-xs font-semibold text-white ${focus}`}>Utiliser ici <kbd className="hidden md:inline">U</kbd></button>
            : <button type="button" onClick={() => void garder(it)} className={`min-h-9 rounded-lg bg-teal-800 px-2 text-xs font-semibold text-white ${focus}`}>Garder <kbd className="hidden md:inline">G</kbd></button>}
          <button type="button" onClick={() => void refuser(it)} className={`min-h-9 rounded-lg border border-neutral-300 px-2 text-xs ${focus}`}>Pas pour ici <kbd className="hidden md:inline">X</kbd></button>
        </span>
      </li>
    );
  };

  return (
    <section aria-labelledby="kit-completer" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-0.5">
          <h2 id="kit-completer" className="text-base font-semibold">Compléter ce kit</h2>
          <p className="text-sm text-neutral-700" role="status">{compteur} · {aFaire.length} emplacement{aFaire.length > 1 ? 's' : ''} à compléter</p>
        </div>
        {aFaire.length > 0 && <button type="button" onClick={() => { setOuvert((o) => !o); setI(0); setSel(0); }} aria-expanded={ouvert} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white ${focus}`}>{ouvert ? 'Fermer' : 'Compléter ce kit'}</button>}
      </div>
      {!ouvert && aFaire.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 text-xs">
          {aFaire.map((x, k) => <li key={x.emplacement}><button type="button" onClick={() => { setOuvert(true); setI(k); setSel(0); }} className={`min-h-9 rounded-full bg-amber-50 px-2.5 text-amber-900 ring-1 ring-amber-200 ${focus}`}>{x.libelle} · {RAISONS[x.raison]}{x.banque.length ? ` · ${x.banque.length} suggestion${x.banque.length > 1 ? 's' : ''}` : ''}</button></li>)}
        </ul>
      )}
      {ouvert && e && (
        <div className="grid gap-2">
          <p className="text-sm"><strong>Emplacement {i + 1}/{aFaire.length} : {e.libelle}</strong> — {RAISONS[e.raison]}{e.note !== null ? ` (${String(e.note).replace('.', ',')}★)` : ''}</p>
          {attente.length > 0 && <p className="text-xs text-amber-900">{attente.length} photo{attente.length > 1 ? 's' : ''} gardée{attente.length > 1 ? 's' : ''} pour cet emplacement, en attente d’import (Jeux de photos → « Valider et importer »).</p>}
          {message && <p role="status" className="text-sm text-neutral-800">{message}</p>}
          {items.length ? <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Suggestions">{items.map(carte)}</ul>
            : <p className="text-sm text-neutral-600">{chargement ? 'Recherche de nouvelles photos…' : 'Aucune suggestion pour l’instant.'}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void chercher()} disabled={chargement} className={`min-h-11 rounded-xl border border-teal-800 px-3 text-sm font-semibold text-teal-900 disabled:opacity-50 ${focus}`}>Nouvelles photos (Pexels, Pixabay)</button>
            <button type="button" onClick={suivant} disabled={i >= aFaire.length - 1} className={`ml-auto min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white disabled:opacity-50 ${focus}`}>Emplacement suivant →</button>
          </div>
          <p className="hidden text-xs text-neutral-500 md:block">Clavier : U utiliser ici · G garder · X pas pour ici · ↑ ↓ suggestion · → emplacement suivant</p>
        </div>
      )}
    </section>
  );
}
