'use client';

import { useState, useTransition } from 'react';
import type { ModeTest } from '@plateforme/core';
import { lancerTestModele } from '@/app/chaine/tests-actions';

// Bouton « Lancer le test » de la fiche d'un modèle (check initial d'un finaliste, re-check d'une version retouchée).
export default function BoutonTesterModele({ modele, version, mode }: { modele: string; version: number; mode: ModeTest }) {
  const [message, setMessage] = useState('');
  const [enCours, demarrer] = useTransition();
  return (
    <div className="grid gap-1">
      <button
        type="button"
        disabled={enCours}
        onClick={() => demarrer(async () => setMessage((await lancerTestModele(modele, version, mode)).message))}
        className="inline-flex min-h-11 items-center justify-self-start rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold disabled:opacity-60"
        data-action="tester-modele"
      >
        {enCours ? 'Lancement…' : mode === 'check' ? `Lancer le test (v${version})` : `Re-check de la v${version}`}
      </button>
      {message && <p role="status" className="text-sm text-neutral-700">{message}</p>}
    </div>
  );
}
