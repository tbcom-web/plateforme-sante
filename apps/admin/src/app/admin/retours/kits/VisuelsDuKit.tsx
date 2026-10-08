'use client';

// Kit multi-visuels d'un sujet (kits-visuels.ts) : onglets « Photos · Illustrations · Icônes · Animations ». Les photos restent dans
// la planche ci-dessous ; ici, le héros et les illustrations (un seul style), les icônes des soins et des infos pratiques, les
// animations (jouées puis en pause, AnimationBornee), avec le badge « à valider » (jamais montré aux praticiens tant qu'il n'est pas validé).
import { useMemo, useState } from 'react';
import { inventaireAssets, LIBELLES_FAMILLES_KIT, libelleEmplacement, type Asset, type ElementKitVisuel, type KitVisuel } from '@plateforme/core';
import Apercu from '../tri/ApercuVisuel';
import AnimationBornee from './AnimationBornee';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const ONGLETS = ['illustration', 'icone', 'animation'] as const;
const LIBELLES_EMPL: Record<string, string> = { entete: 'En-tête', infos: 'Infos pratiques', autre: 'Autre icône' };
const STYLES: Record<string, string> = { releve: 'Relevé', pedagogique: 'Illustrations douces', ligne: 'Trait fin', decoupe: 'Papier découpé', riso: 'Risographie', volume: 'Volume doux', geometrique: 'Géométrique' };

export default function VisuelsDuKit({ kit }: { kit: KitVisuel }) {
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number]>('illustration');
  const parCle = useMemo(() => new Map<string, Asset>(inventaireAssets().map((a) => [a.cle, a])), []);
  const listes: Record<(typeof ONGLETS)[number], ElementKitVisuel[]> = {
    illustration: [...(kit.heros ? [{ ...kit.heros, emplacement: 'heros' }] : []), ...kit.illustrations],
    icone: kit.icones,
    animation: kit.animations,
  };
  const l = listes[onglet];
  return (
    <section aria-labelledby="kit-visuels" className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="kit-visuels" className="text-base font-semibold">Visuels du kit{kit.registre ? <span className="text-sm font-normal text-neutral-500"> · style {STYLES[kit.registre] ?? kit.registre}</span> : null}</h2>
        <div role="tablist" aria-label="Visuels du kit" className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
          <a href="#planche-photos" className={`min-h-9 rounded-lg px-3 py-1.5 text-sm font-semibold text-neutral-700 ${focus}`}>Photos</a>
          {ONGLETS.map((o) => (
            <button key={o} type="button" role="tab" aria-selected={onglet === o} onClick={() => setOnglet(o)} className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${focus} ${onglet === o ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700'}`}>
              {LIBELLES_FAMILLES_KIT[o].titre} ({listes[o].length})
            </button>
          ))}
        </div>
      </div>
      {!l.length ? <p className="text-sm text-neutral-600">Aucun visuel curé de ce type pour ce sujet : rattachez-en (bloc ci-dessus, Trier par sujet) ou complétez le kit.</p> : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {l.map((e) => {
            const a = parCle.get(e.cle);
            return (
              <li key={e.emplacement + e.cle} className="grid content-start gap-1 rounded-xl border border-black/10 bg-white p-1.5">
                {a ? (onglet === 'animation' ? <AnimationBornee><Apercu a={a} /></AnimationBornee> : <Apercu a={a} />) : <div className="aspect-square rounded-xl bg-neutral-100" />}
                <span className="text-xs font-semibold">{e.emplacement === 'heros' ? 'Héros' : LIBELLES_EMPL[e.emplacement] ?? libelleEmplacement(e.emplacement)}</span>
                <span className="flex flex-wrap gap-1 text-[11px] text-neutral-600">
                  <span>{e.note !== null ? `${String(e.note).replace('.', ',')}★` : 'non noté'}</span>
                  {e.aValider && <span className="rounded bg-amber-100 px-1 text-amber-900">à valider</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {kit.trous.length > 0 && <p className="text-xs text-amber-900">{kit.trous.slice(0, 4).join(' ')}</p>}
    </section>
  );
}
