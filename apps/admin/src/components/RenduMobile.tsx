'use client';

// Bloc « Rendu mobile » (demande de Paul du 2026-10-07) : SÉPARÉ de la note du choix. « Le choix est bon, mais la déclinaison
// téléphone est à revoir » : ✓ Mobile OK / ✗ Mobile à revoir, étiquettes mobiles, remarque libre, note mobile facultative,
// zones tracées sur le rendu mobile (passées par le parent). Un « Mobile à revoir » ne pénalise jamais le choix : il ouvre un
// défaut d'adaptation rattaché à l'élément (defauts_mobile, 0034), corrigé ensuite dans sa feuille responsive.
import { useState } from 'react';
import { ETIQUETTES_MOBILE, type ZonesNote } from '@plateforme/core';
import { signalerRenduMobile } from '@/app/admin/retours/actions-mobile';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Props = {
  cle: string;
  /** Empreinte mobile courante (empreinteMobile) */
  empreinte?: string | null;
  page?: string | null;
  recette?: string | null;
  /** Zones tracées sur le rendu mobile (envoyées avec « Mobile à revoir ») */
  zones?: ZonesNote | null;
  /** Retour enregistré : le parent vide les zones mobiles (elles appartiennent au défaut, plus à la note du choix) */
  onEnregistre?: (verdict: 'ok' | 'a_revoir') => void;
  /** Défauts déjà ouverts sur l'élément */
  ouverts?: number;
  modifie?: boolean;
  libelle?: string;
};

export default function RenduMobile({ cle, empreinte = null, page = null, recette = null, zones = null, onEnregistre, ouverts = 0, modifie = false, libelle }: Props) {
  const [verdict, setVerdict] = useState<'ok' | 'a_revoir' | null>(null);
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [remarque, setRemarque] = useState('');
  const [note, setNote] = useState<number | null>(null);
  const [statut, setStatut] = useState<{ ok: boolean; message: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const envoyer = async (v: 'ok' | 'a_revoir') => {
    setEnvoi(true);
    const r = await signalerRenduMobile({ cle, verdict: v, etiquettes: v === 'ok' ? etiquettes.filter((e) => e === 'parfait-sur-mobile') : etiquettes, remarque, note, zones: v === 'a_revoir' ? zones : null, empreinte, page, recette, largeur: 390 })
      .catch(() => ({ ok: false, message: 'Connexion perdue : retour mobile non enregistré.' }));
    setEnvoi(false);
    setStatut(r);
    if (r.ok) { onEnregistre?.(v); setVerdict(null); setEtiquettes([]); setRemarque(''); setNote(null); }
  };
  const basculer = (id: string) => setEtiquettes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const nbZones = zones?.zones.length ?? 0;

  return (
    <section aria-label={`Rendu mobile${libelle ? ` : ${libelle}` : ''}`} className="grid gap-2 rounded-xl bg-sky-50/60 p-3 ring-1 ring-sky-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-sky-950">Rendu mobile <span className="font-normal text-neutral-600">(adaptation téléphone, à part du choix)</span></p>
        {(ouverts > 0 || modifie) && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${modifie ? 'bg-amber-100 text-amber-950' : 'bg-rose-100 text-rose-900'}`}>{modifie ? 'Modifié (mobile) : à revalider' : `${ouverts} défaut${ouverts > 1 ? 's' : ''} ouvert${ouverts > 1 ? 's' : ''}`}</span>}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" disabled={envoi} onClick={() => void envoyer('ok')} className={`min-h-11 rounded-lg px-2 text-sm font-semibold ring-1 ${focus} bg-white text-teal-900 ring-teal-700 hover:bg-teal-50 disabled:opacity-50`}>✓ Mobile OK</button>
        <button type="button" aria-pressed={verdict === 'a_revoir'} onClick={() => setVerdict(verdict === 'a_revoir' ? null : 'a_revoir')} className={`min-h-11 rounded-lg px-2 text-sm font-semibold ring-1 ${focus} ${verdict === 'a_revoir' ? 'bg-rose-700 text-white ring-rose-700' : 'bg-white text-rose-900 ring-rose-700 hover:bg-rose-50'}`}>✗ Mobile à revoir</button>
      </div>
      {verdict === 'a_revoir' && (
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ce qui gêne sur mobile">
            {ETIQUETTES_MOBILE.filter((e) => !e.positive).map((e) => (
              <button key={e.id} type="button" aria-pressed={etiquettes.includes(e.id)} onClick={() => basculer(e.id)}
                className={`min-h-11 rounded-full border px-3 text-sm ${focus} ${etiquettes.includes(e.id) ? 'border-rose-800 bg-rose-800 text-white' : 'border-neutral-200 bg-white'}`}>{e.libelle}</button>
            ))}
          </div>
          <label className="grid gap-1 text-sm"><span>Remarque <span className="text-neutral-500">facultative</span></span>
            <textarea value={remarque} onChange={(e) => setRemarque(e.target.value)} rows={2} maxLength={2000} placeholder="Ex. la photo est coupée en haut, le bouton est caché par la barre" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" />
          </label>
          <div role="group" aria-label="Note mobile facultative" className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-neutral-600">Note mobile (facultative) :</span>
            {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={note === n} onClick={() => setNote(note === n ? null : n)} className={`min-h-11 min-w-11 rounded-lg border text-sm ${focus} ${note === n ? 'border-sky-900 bg-sky-900 text-white' : 'border-neutral-300 bg-white'}`}>{n}★</button>)}
          </div>
          <p className="text-xs text-neutral-600">{nbZones ? `${nbZones} zone${nbZones > 1 ? 's' : ''} tracée${nbZones > 1 ? 's' : ''} sur le rendu mobile partiront avec ce signalement.` : 'Astuce : « Signaler une zone » (z) sur le rendu mobile pour montrer où.'}</p>
          <button type="button" disabled={envoi} onClick={() => void envoyer('a_revoir')} className={`min-h-11 rounded-lg bg-rose-800 px-3 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-50 ${focus}`}>Signaler le rendu mobile à revoir</button>
        </div>
      )}
      <p role="status" className={`min-h-4 text-xs ${statut && !statut.ok ? 'text-red-800' : 'text-neutral-600'}`}>{statut?.message ?? ''}</p>
    </section>
  );
}
