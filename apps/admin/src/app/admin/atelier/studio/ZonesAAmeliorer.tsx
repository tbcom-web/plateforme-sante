'use client';

// « À améliorer » (Studio, retour de Paul du 2026-10-08 : « je focuserais sur la partie permettant de sélectionner les parties
// qui doivent être améliorées en sélectionnant des zones ») : liste des zones tracées sur la page affichée (ordinateur et
// téléphone), chacune avec une étiquette rapide (trop chargé, illisible, mal aligné, couleur, image, espacement, typographie…),
// un texte facultatif et « Supprimer ». Les zones restent en surimpression sur l'aperçu et partent avec la recette.
import { ETIQUETTES_AMELIORER, libelleEtiquetteZone, LIMITES_ZONES, type EtiquetteZone, type Zone } from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const ORANGE = '#c2410c';

type Props = {
  zonesOrdinateur: Zone[];
  zonesMobile: Zone[];
  onZonesOrdinateur: (z: Zone[]) => void;
  onZonesMobile: (z: Zone[]) => void;
  mode: boolean;
  onMode: (m: boolean) => void;
  /** Nom de la page affichée */
  page: string;
  /** Zones des autres pages (rappel) */
  autres: number;
};

function Liste({ zones, onChange, appareil }: { zones: Zone[]; onChange: (z: Zone[]) => void; appareil: 'ordinateur' | 'mobile' }) {
  const modifier = (i: number, d: Partial<Zone>) => onChange(zones.map((z, k) => (k === i ? { ...z, ...d } : z)));
  return (
    <>
      {zones.map((z, i) => (
        <li key={`${appareil}-${i}`} className="grid gap-1.5 rounded-lg bg-white p-2 text-sm ring-1 ring-black/10" data-zone={`${appareil}-${i + 1}`}>
          <div className="flex items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: ORANGE }} aria-hidden="true">{i + 1}</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{appareil === 'mobile' ? 'Téléphone' : 'Ordinateur'} · zone {i + 1}</span>
            <button type="button" onClick={() => onChange(zones.filter((_, k) => k !== i))} className={`ml-auto min-h-11 rounded-lg px-2 text-sm text-red-800 hover:bg-red-50 ${focus}`} aria-label={`Supprimer la zone ${i + 1} (${appareil})`}>Supprimer</button>
          </div>
          <div role="radiogroup" aria-label={`Ce qui ne va pas, zone ${i + 1} (${appareil})`} className="flex flex-wrap gap-1">
            {ETIQUETTES_AMELIORER.map((e) => (
              <button key={e} type="button" role="radio" aria-checked={z.etiquette === e} onClick={() => modifier(i, { etiquette: e as EtiquetteZone })}
                className={`min-h-9 rounded-full border px-2.5 text-xs ${focus} ${z.etiquette === e ? 'border-orange-700 bg-orange-700 font-semibold text-white' : 'border-neutral-300 bg-white hover:bg-orange-50'}`}>{libelleEtiquetteZone(e)}</button>
            ))}
          </div>
          <input value={z.commentaire} onChange={(e) => modifier(i, { commentaire: e.target.value.slice(0, LIMITES_ZONES.commentaire) })} maxLength={LIMITES_ZONES.commentaire}
            placeholder="Précision (facultatif)" aria-label={`Précision, zone ${i + 1} (${appareil})`} className="min-h-11 w-full rounded-lg border border-neutral-300 px-2 text-base md:text-sm" />
        </li>
      ))}
    </>
  );
}

export default function ZonesAAmeliorer({ zonesOrdinateur, zonesMobile, onZonesOrdinateur, onZonesMobile, mode, onMode, page, autres }: Props) {
  const n = zonesOrdinateur.length + zonesMobile.length;
  return (
    <section aria-labelledby="st-ameliorer" className="grid gap-2 rounded-2xl border border-orange-200 bg-orange-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="st-ameliorer" className="text-base font-semibold">À améliorer · {page} <span className="font-normal text-neutral-600">({n} zone{n > 1 ? 's' : ''}{autres ? ` · ${autres} sur les autres pages` : ''})</span></h2>
        {n > 0 && <button type="button" onClick={() => { onZonesOrdinateur([]); onZonesMobile([]); }} className={`min-h-11 rounded-lg px-2 text-sm text-neutral-700 underline ${focus}`}>Tout effacer sur cette page</button>}
      </div>
      {!n && (
        <p className="text-sm text-neutral-700">
          {mode ? 'Tracez un rectangle sur l’aperçu ordinateur ou téléphone, puis dites ce qui ne va pas.' : <>Touchez <button type="button" onClick={() => onMode(true)} className={`font-semibold text-orange-800 underline ${focus}`}>À améliorer</button> (touche z) puis tracez une zone sur l’aperçu.</>}
        </p>
      )}
      {n > 0 && (
        <ol className="grid gap-1.5" aria-label="Zones à améliorer">
          <Liste zones={zonesOrdinateur} onChange={onZonesOrdinateur} appareil="ordinateur" />
          <Liste zones={zonesMobile} onChange={onZonesMobile} appareil="mobile" />
        </ol>
      )}
    </section>
  );
}
