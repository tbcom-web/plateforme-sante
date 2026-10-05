'use client';

import { useState, useTransition } from 'react';
import { STATUTS, type Statut } from '@/lib/libelles';
import { basculerEdition, basculerTest, changerProprietaire, changerStatut, publierCommeAdmin, reessayerPublication, type Resultat, type ResultatRattachement } from './actions';
import LienACopier from './LienACopier';

type Props = { id: string; statut: Statut; test: boolean; edition: boolean; manques: string[]; dejaPublie: boolean; relancer: boolean };

export default function ActionsSite({ id, statut, test, edition, manques, dejaPublie, relancer }: Props) {
  const [resultat, setResultat] = useState<Resultat | ResultatRattachement>(null);
  const [enCours, demarrer] = useTransition();
  const lancer = (f: () => Promise<Resultat | ResultatRattachement>) => demarrer(async () => setResultat(await f()));

  const publier = () => {
    if (statut === 'suspendu') {
      setResultat({ ok: false, message: 'Site suspendu : changez d’abord son statut pour le publier.' });
      return;
    }
    const avertissement = manques.length
      ? `Site incomplet :\n- ${manques.join('\n- ')}\n\n${test ? 'Site de test : il sera publié quand même.' : 'La publication sera refusée tant que ces points manquent.'}\n\n`
      : '';
    if (!confirm(`${avertissement}Publier le brouillon actuel ? Il remplacera la version en ligne.`)) return;
    lancer(() => publierCommeAdmin(id));
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={enCours}
          onClick={publier}
          className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
        >
          Publier
        </button>
        {relancer && dejaPublie && (
          <button
            type="button"
            disabled={enCours}
            title="Relance la publication de la version déjà validée, sans le brouillon"
            onClick={() => lancer(() => reessayerPublication(id))}
            className="rounded-lg border border-red-700 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
          >
            Réessayer
          </button>
        )}
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            className="accent-violet-700"
            checked={test}
            disabled={enCours}
            onChange={(e) => lancer(() => basculerTest(id, e.target.checked))}
          />
          Test
        </label>
        <label className="flex items-center gap-1.5 text-xs" title="Option payante : textes guidés de l’éditeur visuel et ajout de pages">
          <input
            type="checkbox"
            className="accent-amber-600"
            checked={edition}
            disabled={enCours}
            onChange={(e) => {
              const actif = e.target.checked;
              if (!actif && !confirm('Retirer l’option « Édition » ? Les textes personnalisés restent enregistrés mais ne seront plus publiés.')) return;
              lancer(() => basculerEdition(id, actif));
            }}
          />
          Édition
        </label>
        <select
          aria-label="Statut"
          value={statut}
          disabled={enCours}
          onChange={(e) => lancer(() => changerStatut(id, e.target.value as Statut))}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
        >
          {(Object.keys(STATUTS) as Statut[]).map((s) => <option key={s} value={s}>{STATUTS[s].label}</option>)}
        </select>
        <button
          type="button"
          disabled={enCours}
          onClick={() => {
            const email = prompt('E-mail du nouveau propriétaire (il recevra un lien de rattachement à usage unique) :');
            if (email) lancer(() => changerProprietaire(id, email));
          }}
          className="text-xs font-semibold text-neutral-600 underline-offset-4 hover:underline disabled:opacity-50"
        >
          Changer de propriétaire
        </button>
      </div>
      {resultat && (
        <div className={`text-xs ${resultat.ok ? 'text-teal-800' : 'text-red-700'}`}>
          <p>{resultat.message}</p>
          {'lien' in resultat && resultat.lien && <LienACopier lien={resultat.lien} />}
        </div>
      )}
    </div>
  );
}
