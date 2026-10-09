'use client';

// Bouton de la présélection : propositions de designs de Claude (retours/recettes-proposees.json, ids « canon- ») → candidats.
import { useState, useTransition } from 'react';
import { importerPropositionsClaude } from './import-claude';

export default function BoutonImporterClaude() {
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={enCours} onClick={() => demarrer(async () => { const r = await importerPropositionsClaude(); setMessage(r.message); })}
        className="min-h-11 rounded-lg bg-white px-3 text-sm font-medium ring-1 ring-neutral-300 hover:bg-neutral-50 disabled:opacity-60">
        {enCours ? 'Import…' : 'Importer les propositions de Claude comme candidats'}
      </button>
      {message && <span role="status" className="text-sm text-neutral-700">{message}</span>}
    </div>
  );
}
