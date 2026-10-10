'use client';

// « Sourcer les séries photos » (demande de Paul du 2026-10-10 : banque de photos pour Basket, Tennis, Golf, Cyclisme, rattrapage
// course et trail / randonnée) : lance le sourcing de chaque profil sous le seuil, L'UN APRÈS L'AUTRE (une action serveur par profil :
// clés Pexels / Pixabay de Vercel, quotas de sourcing-photos.ts). Les séries arrivent dans « À valider », sujet du profil.
// Rien n'est importé avant l'acceptation de Paul.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { sourcerSeries } from '../arrivages/actions-series';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Ligne = { profil: string; libelle: string; href: string; etat: 'attente' | 'cours' | 'ok' | 'vide' | 'erreur'; message?: string };

export default function SourcerSeriesActivites({ profils, pret }: { profils: { id: string; libelle: string; photos: number; href: string }[]; pret: boolean }) {
  const router = useRouter();
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const occupe = Boolean(lignes?.some((l) => l.etat === 'attente' || l.etat === 'cours'));
  if (!profils.length) return null;
  const lancer = async () => {
    const l: Ligne[] = profils.map((p) => ({ profil: p.id, libelle: p.libelle, href: p.href, etat: 'attente' }));
    setLignes([...l]);
    for (let i = 0; i < l.length; i++) {
      l[i] = { ...l[i], etat: 'cours' };
      setLignes([...l]);
      const r = await sourcerSeries({ profil: l[i].profil }).catch(() => ({ ok: false, message: 'Connexion perdue : relancez.', series: [] }));
      l[i] = { ...l[i], etat: r.series.length ? 'ok' : r.ok ? 'vide' : 'erreur', message: r.message };
      setLignes([...l]);
      // Clé absente ou limite atteinte : inutile de continuer
      if (!r.ok && /Clé API|Limite|migration/i.test(r.message)) { for (let j = i + 1; j < l.length; j++) l[j] = { ...l[j], etat: 'erreur', message: 'Non lancé.' }; setLignes([...l]); break; }
    }
    router.refresh();
  };
  return (
    <section aria-labelledby="titre-sourcer-series" className="grid gap-2 rounded-2xl border border-teal-800/20 bg-teal-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 id="titre-sourcer-series" className="text-base font-semibold text-neutral-900">Photos à compléter</h2>
          <p className="max-w-2xl text-sm text-neutral-700">
            {profils.map((p) => `${p.libelle} (${p.photos} photo${p.photos > 1 ? 's' : ''})`).join(' · ')}. L’agent cherche des séries cohérentes
            (pied, chaussure, appui, terrain ; sans logo, visage, enfant ni texte). Elles arrivent ici, dans chaque sujet. Rien n’est importé sans ton OK.
          </p>
        </div>
        {pret
          ? <button type="button" onClick={() => void lancer()} disabled={occupe} className={`min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>
              {occupe ? 'Sourcing en cours…' : `Sourcer les séries photos (${profils.length})`}
            </button>
          : <span className="text-xs text-neutral-500">Sourcing : clé API à configurer (PEXELS_API_KEY ou PIXABAY_API_KEY dans Vercel)</span>}
      </div>
      {lignes && (
        <ul className="grid gap-1 text-sm" role="status">
          {lignes.map((l) => (
            <li key={l.profil} className="flex flex-wrap gap-x-2">
              <span className="font-semibold">{l.libelle}</span>
              <span className={l.etat === 'erreur' ? 'text-amber-900' : 'text-neutral-700'}>
                {l.etat === 'attente' ? 'en attente' : l.etat === 'cours' ? 'recherche en cours (1 à 2 min)…' : l.message}
              </span>
              {l.etat === 'ok' && <Link href={l.href} className="font-semibold text-teal-900 underline">Valider</Link>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
