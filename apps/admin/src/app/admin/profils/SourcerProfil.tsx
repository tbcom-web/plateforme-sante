'use client';

// « Sourcer pour ce profil » / « Sourcer pour ce kit » / « Sourcer des photos » (docs/sourcing-photos.md) : l'agent cherche des photos
// Pexels / Pixabay pour les trous du profil (séries d'activité : series-photos-activites.ts) et propose 2-3 séries cohérentes, rangées
// dans « À valider » (sujet du profil) et dans les Arrivages. Rien n'est importé avant l'acceptation de Paul.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { sourcerSeries } from '../arrivages/actions-series';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export default function SourcerProfil({ profil, kit, pret, texte, lien, discret }: {
  profil?: string; kit?: string; libelle?: string; pret: boolean;
  /** Libellé du bouton (défaut : « Sourcer pour ce profil / ce kit ») */
  texte?: string;
  /** Où voir les séries proposées (défaut : Arrivages) ; null : la page se rafraîchit seulement */
  lien?: { href: string; libelle: string } | null;
  /** Bouton secondaire (raccourci sous une tuile) */
  discret?: boolean;
}) {
  const router = useRouter();
  const [etat, setEtat] = useState<{ occupe: boolean; ok?: boolean; message?: string; n?: number }>({ occupe: false });
  if (!pret) return <span className="text-xs text-neutral-500">Sourcing : clé API à configurer</span>;
  const voir = lien === undefined ? { href: '/admin/arrivages?source=series-photos', libelle: 'Voir dans les Arrivages' } : lien;
  const lancer = async () => {
    setEtat({ occupe: true });
    const r = await sourcerSeries(kit ? { kit } : { profil }).catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.', series: [] }));
    setEtat({ occupe: false, ok: r.ok, message: r.message, n: r.series.length });
    if (r.series.length) router.refresh();
  };
  const style = discret
    ? 'min-h-11 rounded-lg border border-teal-800/30 bg-white px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50'
    : 'min-h-11 rounded-lg bg-teal-800 px-3 text-sm font-semibold text-white hover:bg-teal-900';
  return (
    <span className="grid gap-1">
      <button type="button" onClick={() => void lancer()} disabled={etat.occupe} className={`${style} disabled:opacity-50 ${focus}`}>
        {etat.occupe ? 'Sourcing en cours… (1 à 2 min)' : texte ?? (kit ? 'Sourcer pour ce kit' : 'Sourcer pour ce profil')}
      </button>
      {etat.message && (
        <span role="status" className={`max-w-sm text-xs ${etat.ok ? 'text-teal-900' : 'text-amber-900'}`}>
          {etat.message}{etat.n && voir ? <> <Link href={voir.href} className="font-semibold underline">{voir.libelle}</Link></> : null}
        </span>
      )}
    </span>
  );
}
