'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { publierCommeAdmin } from '../../actions';
import { affecterJeu, basculerPhotosPremium, retirerAuSort, type Resultat } from '../../photos/actions';

type Props = {
  siteId: string;
  premium: boolean;
  jeuActuel: string;
  /** Jeux affectables : partagés actifs de la spécialité et exclusifs actifs du site */
  disponibles: { id: string; nom: string }[];
};

export default function PhotosSite({ siteId, premium, jeuActuel, disponibles }: Props) {
  const router = useRouter();
  const [choix, setChoix] = useState(jeuActuel);
  const [resultat, setResultat] = useState<Resultat>(null);
  const [enCours, demarrer] = useTransition();
  const lancer = (f: () => Promise<Resultat>) => demarrer(async () => { setResultat(await f()); router.refresh(); });

  return (
    <div className="grid gap-3 border-t border-neutral-100 pt-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <select value={choix} onChange={(e) => setChoix(e.target.value)} aria-label="Jeu de photos" className="rounded-lg border border-neutral-300 px-3 py-2">
          <option value="">Photos intégrées</option>
          {disponibles.map((j) => <option key={j.id} value={j.id}>{j.nom}</option>)}
        </select>
        <button type="button" disabled={enCours || choix === jeuActuel} onClick={() => lancer(() => affecterJeu(siteId, choix))} className="rounded-lg bg-teal-800 px-3 py-2 font-semibold text-white hover:bg-teal-900 disabled:opacity-50">
          Affecter
        </button>
        <button type="button" disabled={enCours} onClick={() => lancer(() => retirerAuSort(siteId))} className="rounded-lg border border-neutral-300 px-3 py-2 font-medium hover:bg-neutral-50 disabled:opacity-50">
          Nouveau tirage au hasard
        </button>
        <button type="button" disabled={enCours} onClick={() => lancer(() => publierCommeAdmin(siteId))} className="rounded-lg border border-teal-800 px-3 py-2 font-medium text-teal-900 hover:bg-teal-50 disabled:opacity-50">
          Publier le site
        </button>
      </div>
      <label className="flex items-center gap-2" title="Option du package premium, cochée après validation de la commerciale (contrat signé)">
        <input
          type="checkbox"
          checked={premium}
          disabled={enCours}
          className="size-4 accent-amber-600"
          onChange={(e) => {
            const actif = e.target.checked;
            if (!actif && !confirm('Retirer l’option « photos premium » ? Les jeux exclusifs restent enregistrés.')) return;
            lancer(() => basculerPhotosPremium(siteId, actif));
          }}
        />
        Photos premium (contrat signé)
      </label>
      {resultat && <p className={resultat.ok ? 'text-teal-800' : 'text-red-700'}>{resultat.message}</p>}
    </div>
  );
}
