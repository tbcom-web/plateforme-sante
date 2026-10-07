'use client';

// « Envoyer mes retours à Claude maintenant » : lance l'export des retours vers le dépôt (workflow exporter-retours.yml,
// aussi lancé chaque nuit). Claude les lit ensuite dans retours/SYNTHESE.md (docs/retours.md).
import { useState, useTransition } from 'react';
import { envoyerRetoursAClaude } from '@/app/admin/retours/actions';

export default function EnvoyerRetours({ compact = false }: { compact?: boolean }) {
  const [enCours, demarrer] = useTransition();
  const [r, setR] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div className="grid gap-1">
      <button type="button" disabled={enCours}
        onClick={() => demarrer(async () => setR(await envoyerRetoursAClaude().catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.' }))))}
        className={`min-h-11 rounded-xl border border-teal-800 bg-white px-4 text-sm font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 ${compact ? '' : 'w-full sm:w-auto'}`}>
        {enCours ? 'Envoi…' : 'Envoyer mes retours à Claude maintenant'}
      </button>
      <p role="status" className={`text-xs ${r && !r.ok ? 'text-red-800' : 'text-neutral-600'}`}>{r?.message ?? ''}</p>
    </div>
  );
}
