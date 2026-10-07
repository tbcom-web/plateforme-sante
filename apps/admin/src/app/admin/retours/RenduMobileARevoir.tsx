'use client';

// « Rendu mobile à revoir » (accueil de Donner mon avis) : la liste de corrections des défauts d'adaptation mobile (0034).
// Par élément : rendu téléphone avec les zones signalées en surimpression, étiquettes, remarques, statut (à corriger, corrigé,
// sans objet) ; « Modifié (mobile) » quand la feuille responsive a changé depuis le signalement (VERSIONS_MOBILE) : à revalider
// (lien vers la carte, qui montre le rendu mobile actuel et le bloc « Rendu mobile »).
import { useMemo, useState } from 'react';
import {
  empreinteMobile, etatsMobile, libelleEtiquetteMobile, ligneZone, LIBELLES_STATUTS_MOBILE, STATUTS_DEFAUT_MOBILE,
  type Asset, type MarqueImportee, type ModeleManifeste, type RetourMobile, type StatutDefautMobile, type Univers,
} from '@plateforme/core';
import ApercuStudio from '@/components/ApercuStudio';
import { SurimpressionZones } from '@/components/AnnotateurZones';
import type { SoinCatalogue } from '@/lib/sites';
import { changerStatutRenduMobile } from './actions-mobile';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Props = {
  retours: RetourMobile[];
  migrationManquante: boolean;
  inventaire: Asset[];
  empreinte: (a: Asset) => string | null;
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
};

export default function RenduMobileARevoir({ retours: initiaux, migrationManquante, inventaire, empreinte, proposes, modeles, catalogue, marquesImportees, themesActives }: Props) {
  const [retours, setRetours] = useState(initiaux);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const parCle = useMemo(() => new Map(inventaire.map((a) => [a.cle, a])), [inventaire]);
  const etats = useMemo(() => etatsMobile(retours, (k) => { const a = parCle.get(k); return empreinteMobile(k, a ? empreinte(a) : null); }), [retours, parCle, empreinte]);
  const liste = [...etats.values()].filter((e) => e.ouverts.length).sort((a, b) => Number(b.modifie) - Number(a.modifie) || b.ouverts.length - a.ouverts.length);

  const changer = async (r: RetourMobile, statut: StatutDefautMobile) => {
    if (!r.id) return;
    const res = await changerStatutRenduMobile(r.id, statut).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setMessage(res.message);
    if (res.ok) setRetours((l) => l.map((x) => (x.id === r.id ? { ...x, statut } : x)));
  };

  const renduTelephone = (cle: string, r: RetourMobile) => {
    const a = parCle.get(cle);
    const zones = r.zones?.zones.filter((z) => z.appareil === 'mobile') ?? [];
    let rendu: React.ReactNode = <p className="p-4 text-xs text-neutral-600">Rendu indisponible.</p>;
    if (a?.rendu.kind === 'studio') rendu = <ApercuStudio nu mobile cle={cle} proposes={proposes} modeles={modeles} catalogue={catalogue} marquesImportees={marquesImportees} themesActives={themesActives} />;
    else if (a?.rendu.kind === 'svg') rendu = <div className="grid aspect-[3/4] place-items-center bg-white p-4" style={{ color: 'var(--encre)' }}><div className="h-full w-full [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: a.rendu.svg() }} /></div>;
    // eslint-disable-next-line @next/next/no-img-element
    else if (a?.rendu.kind === 'image') rendu = <img src={a.rendu.src} alt="" className="block aspect-[3/4] w-full object-cover" />;
    return (
      <SurimpressionZones zones={zones} className="mx-auto w-[260px] max-w-full overflow-hidden rounded-[22px] bg-neutral-100 ring-4 ring-neutral-800">
        <div aria-hidden="true">{rendu}</div>
      </SurimpressionZones>
    );
  };

  return (
    <section aria-labelledby="rt-mobile" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-sky-200 bg-sky-50/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="rt-mobile" className="text-lg font-semibold">Rendu mobile à revoir <span className="text-sm font-normal text-neutral-600">({liste.length})</span></h2>
        <p className="text-xs text-neutral-600">Le choix reste bon : seule la déclinaison téléphone est à corriger (Claude ou le graphiste, puis revalidation).</p>
      </div>
      {migrationManquante && <p className="text-sm text-amber-900">Migration 0034 à exécuter (<code>supabase/migrations/0034_retours_page_appareil_zones.sql</code>) : retours mobiles indisponibles.</p>}
      {!migrationManquante && !liste.length && <p className="text-sm text-neutral-600">Aucun défaut d’adaptation mobile ouvert. Signalez-en depuis le bloc « Rendu mobile » d’une carte ou du studio.</p>}
      <ul className="grid gap-2">
        {liste.slice(0, 30).map((e) => {
          const a = parCle.get(e.cle);
          return (
            <li key={e.cle} className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-black/10">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="min-w-0">{a?.titre ?? e.cle}</strong>
                <code className="break-all text-xs text-neutral-500">{e.cle}</code>
                {e.modifie && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">Modifié (mobile) : à revalider</span>}
                <a href={`/admin/retours?cle=${encodeURIComponent(e.cle)}`} className={`ml-auto min-h-11 content-center rounded-lg px-2 text-sm font-semibold text-teal-900 underline ${focus}`}>Revoir sur la carte</a>
                <button type="button" aria-expanded={ouvert === e.cle} onClick={() => setOuvert(ouvert === e.cle ? null : e.cle)} className={`min-h-11 rounded-lg border border-neutral-300 px-3 text-sm ${focus}`}>{ouvert === e.cle ? 'Masquer le rendu' : 'Rendu téléphone et zones'}</button>
              </div>
              {e.ouverts.map((r, k) => (
                <div key={r.id ?? k} className="grid gap-1 border-t border-black/5 pt-2 text-sm">
                  <p className="text-neutral-800">{r.le ? <span className="tabular-nums text-neutral-500">{new Date(r.le).toLocaleDateString('fr-FR')} · </span> : null}{r.etiquettes.map(libelleEtiquetteMobile).join(', ') || 'À revoir'}{r.note ? ` · ${r.note}★ mobile` : ''}{r.page ? ` · page ${r.page}` : ''}</p>
                  {r.remarque && <p className="text-neutral-700">« {r.remarque} »</p>}
                  {r.zones && r.zones.zones.length > 0 && <ol className="grid gap-0.5 text-xs text-orange-950">{r.zones.zones.map((z, i) => <li key={i}>{ligneZone(z, i)}</li>)}</ol>}
                  <div role="group" aria-label="Statut du défaut" className="flex flex-wrap gap-1">
                    {STATUTS_DEFAUT_MOBILE.map((s) => (
                      <button key={s} type="button" aria-pressed={r.statut === s} disabled={!r.id} onClick={() => void changer(r, s)}
                        className={`min-h-11 rounded-lg px-2.5 text-xs font-semibold ring-1 ${focus} ${r.statut === s ? 'bg-sky-900 text-white ring-sky-900' : 'bg-white ring-black/15 hover:bg-neutral-50'}`}>{LIBELLES_STATUTS_MOBILE[s]}</button>
                    ))}
                  </div>
                  {ouvert === e.cle && renduTelephone(e.cle, r)}
                </div>
              ))}
            </li>
          );
        })}
      </ul>
      <p role="status" className="min-h-4 text-xs text-neutral-600">{message}</p>
    </section>
  );
}
