'use client';

// Sujets d'un visuel (puces) : sujets effectifs = défauts du code ± ajouts / retraits de Paul (sujets-visuels.ts, table
// assets_sujets, migration 0028). × retire un sujet, + en ajoute un ; « modifié par vous » signale une surcharge.
import { useState } from 'react';
import { SUJETS_VISUELS, sujetsDuVisuel, type SurchargesSujets, type VisuelSujets } from '@plateforme/core';
import { basculerSujetAsset } from '@/app/admin/retours/actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-1';
const libelle = (id: string) => SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? id;

/** Surcharge mise à jour localement après une action (même règle que la base : dernière action par sujet) */
export function appliquerAction(s: SurchargesSujets, cle: string, sujet: string, action: 'ajout' | 'retrait'): SurchargesSujets {
  const x = s[cle] ?? { ajouts: [], retraits: [] };
  const ajouts = action === 'ajout' ? [...new Set([...x.ajouts, sujet])] : x.ajouts.filter((y) => y !== sujet);
  const retraits = action === 'retrait' ? [...new Set([...x.retraits, sujet])] : x.retraits.filter((y) => y !== sujet);
  return { ...s, [cle]: { ajouts, retraits } };
}

type Props = {
  visuel: VisuelSujets;
  surcharges: SurchargesSujets;
  onChange: (s: SurchargesSujets) => void;
  compact?: boolean;
};

export default function SujetsVisuel({ visuel, surcharges, onChange, compact = false }: Props) {
  const [message, setMessage] = useState('');
  const [ajout, setAjout] = useState(false);
  const e = sujetsDuVisuel(visuel, surcharges);
  const autres = SUJETS_VISUELS.filter((s) => !e.sujets.includes(s.id));

  const agir = async (sujet: string, action: 'ajout' | 'retrait') => {
    const avant = surcharges;
    onChange(appliquerAction(surcharges, visuel.cle, sujet, action));
    setAjout(false);
    const r = await basculerSujetAsset(visuel.cle, sujet, action).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setMessage(r.ok ? `${libelle(sujet)} : ${action === 'ajout' ? 'ajouté' : 'retiré'}. Le générateur en tient compte.` : r.message);
    if (!r.ok) onChange(avant);
  };

  return (
    <div className="grid gap-1.5">
      <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>Sujets associés</p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Sujets associés">
        {e.sujets.map((s) => {
          const ajoute = e.ajoutes.includes(s);
          return (
            <li key={s} className={`flex min-h-9 items-center gap-1 rounded-full pl-3 pr-1 text-sm ${ajoute ? 'bg-teal-700 text-white' : 'bg-teal-50 text-teal-950 ring-1 ring-teal-200'}`}>
              {libelle(s)}
              {ajoute && <span className="text-[11px] opacity-90">· modifié par vous</span>}
              <button type="button" onClick={() => void agir(s, 'retrait')} aria-label={`Retirer le sujet ${libelle(s)}`}
                className={`grid size-8 place-items-center rounded-full text-base leading-none hover:bg-black/10 ${focus}`}>×</button>
            </li>
          );
        })}
        {e.retires.map((s) => (
          <li key={s} className="flex min-h-9 items-center gap-1 rounded-full bg-neutral-100 pl-3 pr-1 text-sm text-neutral-600 ring-1 ring-neutral-200">
            <span className="line-through">{libelle(s)}</span>
            <span className="text-[11px]">· retiré par vous</span>
            <button type="button" onClick={() => void agir(s, 'ajout')} aria-label={`Rétablir le sujet ${libelle(s)}`}
              className={`grid size-8 place-items-center rounded-full text-base leading-none hover:bg-black/10 ${focus}`}>↺</button>
          </li>
        ))}
        {!e.sujets.length && !e.retires.length && <li className="text-xs text-neutral-500">Aucun sujet (visuel général).</li>}
        <li>
          {ajout ? (
            <select autoFocus defaultValue="" onChange={(x) => x.target.value && void agir(x.target.value, 'ajout')} onBlur={() => setAjout(false)}
              className="min-h-9 rounded-full border border-neutral-300 bg-white px-2 text-sm" aria-label="Sujet à ajouter">
              <option value="">Ajouter…</option>
              {autres.filter((s) => !e.retires.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
            </select>
          ) : (
            <button type="button" onClick={() => setAjout(true)} disabled={!autres.length}
              className={`min-h-9 rounded-full border border-dashed border-neutral-400 px-3 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 ${focus}`}>+ Sujet</button>
          )}
        </li>
      </ul>
      {message && <p role="status" className="text-xs text-neutral-600">{message}</p>}
    </div>
  );
}
