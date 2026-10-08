'use client';

// « Photos que vous avez déjà notées ≥ 4 ★ mais sans sujet » (vue Kits d'images et Trier par sujet ; kits-images.ts, photosARattacher) :
// chaque photo avec son sujet IMPLICITE (jeu de photos, catégorie de la photo intégrée, sujet de la photo libre) pré-coché ; « Valider
// tout » / « Valider la sélection » l'enregistre comme un ajout de Paul (assets_sujets). Rien d'automatique sans son clic. Les boutons
// annoncent combien de photos 4-5 ★ entreront dans le vivier de chaque sujet.
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { gainsRattachement, libelleSujetKit, type PhotoARattacher } from '@plateforme/core';
import { rattacherSujets } from '@/app/admin/retours/kits/actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export default function RattacherNotees({ photos }: { photos: PhotoARattacher[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [coches, setCoches] = useState<Record<string, boolean>>(() => Object.fromEntries(photos.map((p) => [p.cle, true])));
  const [sujets, setSujets] = useState<Record<string, string>>(() => Object.fromEntries(photos.map((p) => [p.cle, p.sujetPropose])));
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const tous = useMemo(() => photos.map((p) => ({ cle: p.cle, sujet: sujets[p.cle] ?? p.sujetPropose })), [photos, sujets]);
  const choisis = useMemo(() => tous.filter((p) => coches[p.cle] !== false), [tous, coches]);
  const gains = (l: readonly { sujet: string }[]) => Object.entries(gainsRattachement(l)).sort((a, b) => b[1] - a[1]).map(([s, n]) => `+${n} ${libelleSujetKit(s)}`).join(', ');
  const valider = async (l: { cle: string; sujet: string }[]) => {
    if (!l.length || occupe) return;
    setOccupe(true);
    const r = await rattacherSujets(l).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setMessage(r.message);
    setOccupe(false);
    if (r.ok) router.refresh();
  };
  if (!photos.length) return null;
  return (
    <section aria-labelledby="rattacher-notees" className="grid gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="rattacher-notees" className="text-sm font-semibold text-amber-950">Photos que vous avez déjà notées ≥ 4 ★ mais sans sujet : {photos.length}</h2>
        <button type="button" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)} className={`min-h-10 rounded-lg px-3 text-sm font-semibold text-teal-900 underline ${focus}`}>{ouvert ? 'Masquer' : 'Voir et rattacher'}</button>
      </div>
      <p className="text-xs text-amber-950">Sujet proposé d’après le jeu de photos, la catégorie ou la recherche d’origine ; rien n’est enregistré sans votre validation.</p>
      {message && <p role="status" className="text-sm text-neutral-800">{message}</p>}
      {ouvert && (
        <>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {photos.map((p) => (
              <li key={p.cle} className={`grid content-start gap-1 rounded-xl border bg-white p-1.5 ${coches[p.cle] !== false ? 'border-teal-700' : 'border-black/10 opacity-60'}`}>
                <label className="grid cursor-pointer gap-1">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
                    {p.importee
                      ? <Image src={p.url} alt="" fill sizes="(max-width: 767px) 50vw, 16vw" className="object-cover" />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={p.url} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />}
                  </div>
                  <span className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={coches[p.cle] !== false} onChange={(e) => setCoches((c) => ({ ...c, [p.cle]: e.target.checked }))} className="size-4" />
                    {String(p.note).replace('.', ',')}★
                  </span>
                </label>
                <select value={sujets[p.cle]} onChange={(e) => setSujets((s) => ({ ...s, [p.cle]: e.target.value }))} aria-label="Sujet" className="min-h-9 rounded-md border border-neutral-300 bg-white px-1 text-xs">
                  {p.sujets.map((s) => <option key={s} value={s}>{libelleSujetKit(s)}</option>)}
                </select>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={occupe} onClick={() => void valider(tous)} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white disabled:opacity-50 ${focus}`}>Valider tout ({gains(tous)})</button>
            <button type="button" disabled={occupe || !choisis.length} onClick={() => void valider(choisis)} className={`min-h-11 rounded-xl border border-teal-800 px-4 text-sm font-semibold text-teal-900 disabled:opacity-50 ${focus}`}>Valider la sélection ({choisis.length ? gains(choisis) : 'aucune'})</button>
          </div>
        </>
      )}
    </section>
  );
}
