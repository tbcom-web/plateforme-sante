'use client';

// Import des designs proposés par Claude (retours/recettes-proposees.json, ids « canon- ») comme candidats : bouton discret de la
// présélection, ou gros bouton du bandeau « Prochaine étape » (chaîne guidée). La page se recharge ensuite (nouvelle prochaine étape).
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { importerPropositionsClaude } from './import-claude';

export default function BoutonImporterClaude({ libelle = 'Importer les propositions de Claude comme candidats', principal = false }: { libelle?: string; principal?: boolean }) {
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const classe = principal
    ? 'flex min-h-12 w-full items-center justify-center rounded-xl bg-teal-800 px-5 text-base font-semibold text-white shadow-sm hover:bg-teal-900 disabled:opacity-60 sm:w-auto'
    : 'min-h-11 rounded-lg bg-white px-3 text-sm font-medium ring-1 ring-neutral-300 hover:bg-neutral-50 disabled:opacity-60';
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={enCours} data-action-guidee={principal ? '' : undefined} onClick={() => demarrer(async () => { const r = await importerPropositionsClaude(); setMessage(r.message); if (r.ok) router.refresh(); })}
        className={`${classe} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2`}>
        {enCours ? 'Import…' : libelle}
      </button>
      {message && <span role="status" className="text-sm text-neutral-700">{message}</span>}
    </div>
  );
}
