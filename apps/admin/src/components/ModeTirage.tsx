'use client';

// Réglage « Favoris d'abord · Équilibré · Découverte » (favoris.ts, demande de Paul du 2026-10-08) : pondération des tirages du
// Studio, de la tuile « Recettes complètes » et du générateur. Persistant par navigateur (localStorage), partagé entre les pages
// ouvertes (événement), défaut « Favoris d'abord ».
import { useCallback, useEffect, useState } from 'react';
import { estModeTirage, MODE_TIRAGE_DEFAUT, MODES_TIRAGE, type ModeTirage } from '@plateforme/core';

const CLE = 'tirage:mode';
const EVENEMENT = 'tirage:mode';
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

function lire(): ModeTirage {
  try { const v = localStorage.getItem(CLE); return estModeTirage(v) ? v : MODE_TIRAGE_DEFAUT; } catch { return MODE_TIRAGE_DEFAUT; }
}

export function useModeTirage(): [ModeTirage, (m: ModeTirage) => void] {
  const [mode, setMode] = useState<ModeTirage>(MODE_TIRAGE_DEFAUT);
  useEffect(() => {
    setMode(lire());
    const f = () => setMode(lire());
    window.addEventListener(EVENEMENT, f);
    window.addEventListener('storage', f);
    return () => { window.removeEventListener(EVENEMENT, f); window.removeEventListener('storage', f); };
  }, []);
  const changer = useCallback((m: ModeTirage) => {
    try { localStorage.setItem(CLE, m); } catch { /* stockage indisponible */ }
    setMode(m);
    window.dispatchEvent(new Event(EVENEMENT));
  }, []);
  return [mode, changer];
}

export default function ChoixModeTirage({ mode, onChange }: { mode: ModeTirage; onChange: (m: ModeTirage) => void }) {
  return (
    <div role="radiogroup" aria-label="Tirages" className="flex flex-wrap items-center gap-1 rounded-xl bg-neutral-100 p-1 text-sm">
      {MODES_TIRAGE.map((m) => (
        <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} title={m.detail} onClick={() => onChange(m.id)}
          className={`min-h-9 rounded-lg px-2.5 font-semibold ${focus} ${mode === m.id ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700'}`}>{m.nom}</button>
      ))}
    </div>
  );
}
