'use client';

// « Sourcer pour ce profil » / « Sourcer pour ce kit » (docs/sourcing-photos.md) : l'agent cherche des photos Pexels / Pixabay pour les trous du profil et
// propose 2-3 séries cohérentes dans les Arrivages. Rien n'est importé avant l'acceptation de Paul.
import Link from 'next/link';
import { useState } from 'react';
import { sourcerSeries } from '../arrivages/actions-series';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export default function SourcerProfil({ profil, kit, pret }: { profil?: string; kit?: string; libelle?: string; pret: boolean }) {
  const [etat, setEtat] = useState<{ occupe: boolean; ok?: boolean; message?: string; n?: number }>({ occupe: false });
  if (!pret) return <span className="text-xs text-neutral-500">Sourcing : clé API à configurer</span>;
  const lancer = async () => {
    setEtat({ occupe: true });
    const r = await sourcerSeries(kit ? { kit } : { profil }).catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.', series: [] }));
    setEtat({ occupe: false, ok: r.ok, message: r.message, n: r.series.length });
  };
  return (
    <span className="grid gap-1">
      <button type="button" onClick={() => void lancer()} disabled={etat.occupe}
        className={`min-h-11 rounded-lg bg-teal-800 px-3 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>
        {etat.occupe ? 'Sourcing en cours…' : kit ? 'Sourcer pour ce kit' : 'Sourcer pour ce profil'}
      </button>
      {etat.message && (
        <span role="status" className={`max-w-sm text-xs ${etat.ok ? 'text-teal-900' : 'text-amber-900'}`}>
          {etat.message}{etat.n ? <> <Link href="/admin/arrivages?source=series-photos" className="font-semibold underline">Voir dans les Arrivages</Link></> : null}
        </span>
      )}
    </span>
  );
}
