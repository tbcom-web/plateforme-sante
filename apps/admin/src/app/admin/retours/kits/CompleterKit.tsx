'use client';

// « Compléter ce kit » (/admin/retours/kits) — COUCHE 2 (assemblage) : les emplacements vides ou faibles un par un, avec les photos du
// VIVIER CURÉ du sujet seulement (suggestions-kits.ts, suggestionsVivier) : (1) notées ≥ 4 ★ étiquetées pour l'emplacement, (2) ≥ 3,5 ★,
// (3) pas encore notées (notation rapide en ligne, touches 1-5), (4) < 3,5 ★ ; sinon vivier d'un sujet voisin, signalé.
// « Utiliser ici » = sujet + hashtag de l'emplacement ; photo gardée non importée : « Importer et utiliser » (même import que
// /admin/photos) ; « Pas pour ici » mémorisé. Vivier insuffisant : « Trouver des photos » → Photos à découvrir (COUCHE 1) pré-filtré
// sur le sujet et les requêtes ciblées de l'emplacement, puis retour au kit.
// Clavier : U utiliser (ou importer et utiliser), X pas pour ici, 1-5 noter, ↑ ↓ suggestion, → emplacement suivant.
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EmplacementAFaire, SuggestionVivier } from '@plateforme/core';
import type { PhotoEnAttenteKit } from '@/lib/kits-images';
import { importerEtUtiliser, noterPhotoKit, pasPourIci, utiliserIci } from './actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const CLE_REFUS = 'kits:pas-ici';
const RAISONS: Record<EmplacementAFaire['raison'], string> = { vide: 'vide', faible: 'photo non notée ou < 3,5 ★', complement: 'complément d’un autre sujet' };
const COULEURS_RANG: Record<number, string> = { 1: 'bg-teal-100 text-teal-900', 2: 'bg-teal-50 text-teal-900', 3: 'bg-neutral-100 text-neutral-700', 4: 'bg-neutral-100 text-neutral-600', 5: 'bg-amber-100 text-amber-900', 6: 'bg-violet-100 text-violet-900' };

type AFaire = EmplacementAFaire & { banque: SuggestionVivier[]; manque: string | null; trouver: string };

export default function CompleterKit({ sujet, aFaire, compteur, enAttente }: { sujet: string; aFaire: AFaire[]; compteur: string; enAttente: PhotoEnAttenteKit[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [i, setI] = useState(0);
  const [sel, setSel] = useState(0);
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [refusLocaux, setRefusLocaux] = useState<string[]>([]);
  useEffect(() => { try { const l = JSON.parse(localStorage.getItem(CLE_REFUS) ?? '[]'); setRefusLocaux(Array.isArray(l) ? l : []); } catch { /* indisponible */ } }, []);
  const e = aFaire[Math.min(i, Math.max(0, aFaire.length - 1))];
  const items = useMemo(() => (e ? e.banque.filter((s) => !refusLocaux.includes(`${e.emplacement}|${s.cle}`)) : []), [e, refusLocaux]);
  const attente = e ? enAttente.filter((x) => x.emplacement === e.emplacement) : [];

  const agir = async (f: () => Promise<{ ok: boolean; message: string }>) => {
    if (occupe) return;
    setOccupe(true);
    const r = await f().catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setMessage(r.message);
    setOccupe(false);
    if (r.ok) router.refresh();
  };
  const utiliser = (s: SuggestionVivier | undefined) => {
    if (!s || !e) return;
    if (s.aImporter) { if (s.idLibre) void agir(() => importerEtUtiliser(s.idLibre!, sujet, e.emplacement)); return; }
    void agir(() => utiliserIci(s.cle, sujet, e.emplacement));
  };
  const noter = (s: SuggestionVivier | undefined, n: number) => { if (s) void agir(() => noterPhotoKit(s.cle, n)); };
  const refuser = async (s: SuggestionVivier | undefined) => {
    if (!s || !e) return;
    const l = [...refusLocaux, `${e.emplacement}|${s.cle}`];
    setRefusLocaux(l);
    try { localStorage.setItem(CLE_REFUS, JSON.stringify(l.slice(-2000))); } catch { /* indisponible */ }
    const r = await pasPourIci(s.cle, e.emplacement).catch(() => ({ ok: false, message: 'Connexion perdue : refus gardé dans ce navigateur.' }));
    setMessage(r.message);
  };
  const suivant = () => { setI((x) => Math.min(aFaire.length - 1, x + 1)); setSel(0); setMessage(''); };

  const refs = useRef({ utiliser, refuser, noter, suivant, items, sel });
  refs.current = { utiliser, refuser, noter, suivant, items, sel };
  useEffect(() => {
    if (!ouvert) return;
    const f = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (ev.ctrlKey || ev.metaKey || ev.altKey || (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      const { items: l, sel: s } = refs.current;
      const k = ev.key.toLowerCase();
      if (k === 'u') { ev.preventDefault(); refs.current.utiliser(l[s]); }
      else if (k === 'x') { ev.preventDefault(); void refs.current.refuser(l[s]); }
      else if (/^[1-5]$/.test(k)) { ev.preventDefault(); refs.current.noter(l[s], Number(k)); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); refs.current.suivant(); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); setSel((x) => Math.min(l.length - 1, x + 1)); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); setSel((x) => Math.max(0, x - 1)); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [ouvert]);

  const carte = (s: SuggestionVivier, k: number) => (
    <li key={s.url} onClick={() => setSel(k)} className={`grid content-start gap-1.5 rounded-xl border bg-white p-1.5 ${k === sel ? 'border-teal-700 ring-2 ring-teal-700' : 'border-black/10'}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
        {s.aImporter
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={s.url} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
          : <Image src={s.url} alt="" fill sizes="(max-width: 767px) 50vw, 16vw" className="object-cover" />}
      </div>
      <span className={`justify-self-start rounded px-1.5 py-0.5 text-[11px] font-semibold ${COULEURS_RANG[s.rang]}`}>{s.libelle}</span>
      <span className="text-[11px] text-neutral-600">{s.note !== null ? `${String(s.note).replace('.', ',')}★` : 'non notée'}{s.etiquetee ? ' · étiquetée ici' : ''}{s.aImporter ? ' · gardée, pas encore importée' : ''}</span>
      <span role="group" aria-label="Noter" className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} étoile${n > 1 ? 's' : ''}`} onClick={() => noter(s, n)} className={`grid size-8 place-items-center text-lg ${focus} ${s.note !== null && n <= Math.round(s.note) ? 'text-amber-500' : 'text-neutral-300'} hover:text-amber-400`}>★</button>
        ))}
      </span>
      <span className="flex flex-wrap gap-1">
        <button type="button" disabled={occupe} onClick={() => utiliser(s)} className={`min-h-9 rounded-lg bg-teal-800 px-2 text-xs font-semibold text-white disabled:opacity-50 ${focus}`}>{s.aImporter ? 'Importer et utiliser' : s.aRattacher ? 'Rattacher et utiliser' : 'Utiliser ici'} <kbd className="hidden md:inline">U</kbd></button>
        <button type="button" onClick={() => void refuser(s)} className={`min-h-9 rounded-lg border border-neutral-300 px-2 text-xs ${focus}`}>Pas pour ici <kbd className="hidden md:inline">X</kbd></button>
      </span>
    </li>
  );

  return (
    <section aria-labelledby="kit-completer" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-0.5">
          <h2 id="kit-completer" className="text-base font-semibold">Compléter ce kit <span className="text-sm font-normal text-neutral-500">(à partir de vos photos curées)</span></h2>
          <p className="text-sm text-neutral-700" role="status">{compteur} · {aFaire.length} emplacement{aFaire.length > 1 ? 's' : ''} à compléter</p>
        </div>
        {aFaire.length > 0 && <button type="button" onClick={() => { setOuvert((o) => !o); setI(0); setSel(0); }} aria-expanded={ouvert} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white ${focus}`}>{ouvert ? 'Fermer' : 'Compléter ce kit'}</button>}
      </div>
      {!ouvert && aFaire.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 text-xs">
          {aFaire.map((x, k) => <li key={x.emplacement}><button type="button" onClick={() => { setOuvert(true); setI(k); setSel(0); }} className={`min-h-9 rounded-full bg-amber-50 px-2.5 text-amber-900 ring-1 ring-amber-200 ${focus}`}>{x.libelle} · {RAISONS[x.raison]} · {x.banque.length} photo{x.banque.length > 1 ? 's' : ''} du vivier</button></li>)}
        </ul>
      )}
      {ouvert && e && (
        <div className="grid gap-2">
          <p className="text-sm"><strong>Emplacement {i + 1}/{aFaire.length} : {e.libelle}</strong> — {RAISONS[e.raison]}{e.note !== null ? ` (${String(e.note).replace('.', ',')}★)` : ''}</p>
          {attente.length > 0 && <p className="text-xs text-amber-900">{attente.length} photo{attente.length > 1 ? 's' : ''} gardée{attente.length > 1 ? 's' : ''} pour cet emplacement, en attente d’import.</p>}
          {message && <p role="status" className="text-sm text-neutral-800">{message}</p>}
          {items.length ? <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Photos du vivier">{items.map(carte)}</ul>
            : <p className="text-sm text-neutral-600">Aucune photo curée disponible pour cet emplacement.</p>}
          {(e.manque || !items.length) && (
            <p className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
              <span>{e.manque ?? `Vivier insuffisant pour ${e.libelle.toLowerCase()}`}</span>
              <Link href={e.trouver} className={`inline-flex min-h-9 items-center rounded-lg bg-white px-3 font-semibold text-teal-900 ring-1 ring-teal-800 ${focus}`}>Trouver des photos →</Link>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={suivant} disabled={i >= aFaire.length - 1} className={`ml-auto min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white disabled:opacity-50 ${focus}`}>Emplacement suivant →</button>
          </div>
          <p className="hidden text-xs text-neutral-500 md:block">Clavier : U utiliser ici · 1-5 noter la photo · X pas pour ici · ↑ ↓ photo · → emplacement suivant</p>
        </div>
      )}
    </section>
  );
}
