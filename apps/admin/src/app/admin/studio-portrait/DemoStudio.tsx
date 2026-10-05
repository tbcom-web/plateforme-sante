'use client';

import { lazy, Suspense, useState } from 'react';
import { GAMMES } from '@plateforme/core';
import { POIDS_CIBLE_MOBILE, type PortraitStudio } from '@plateforme/core/portrait';
import type { ResultatStudio } from '@/lib/portrait/envoi';

const StudioPortrait = lazy(() => import('@/components/StudioPortrait'));

// Démonstration du studio (mode sans envoi) : choix de la gamme, ouverture du studio, fichiers produits.
export default function DemoStudio() {
  const [gamme, setGamme] = useState(GAMMES[0].id);
  const [ouvert, setOuvert] = useState<'nouveau' | 'reprise' | null>(null);
  const [resultat, setResultat] = useState<ResultatStudio | null>(null);
  const theme = { couleur: GAMMES.find((g) => g.id === gamme)?.accent ?? '#1f6b64', gamme };
  const portrait: PortraitStudio | undefined = resultat?.portrait;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Gamme du site</span>
          <select value={gamme} onChange={(e) => setGamme(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 px-3">
            {GAMMES.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setOuvert('nouveau')} className="min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900">Ouvrir le studio</button>
        {portrait?.source && (
          <button type="button" onClick={() => setOuvert('reprise')} className="min-h-11 rounded-lg px-4 text-sm font-semibold ring-1 ring-neutral-300 hover:bg-neutral-50">
            Reprendre le portrait (recomposition sans détourage)
          </button>
        )}
      </div>

      {resultat && portrait && (
        <div className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-sm">
            Style <strong>{portrait.style}</strong>, couleurs <strong>{portrait.couleurs}</strong>, retouche {portrait.retouche ? 'oui' : 'non'}, détourage {portrait.detouree ? 'gardé' : 'non'}.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            {[...portrait.rendus.portrait, ...portrait.rendus.carre].map((r) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={r.url} src={r.url} alt="" width={Math.min(r.l, 240)} height={Math.round((Math.min(r.l, 240) * r.h) / r.l)} className={r.l === r.h ? 'rounded-full' : 'rounded-lg'} />
            ))}
          </div>
          <table className="text-sm">
            <tbody>
              {resultat.fichiers.map((f) => (
                <tr key={f.nom} className={/-p640\./.test(f.nom) && f.octets > POIDS_CIBLE_MOBILE ? 'text-red-700' : ''}>
                  <td className="pr-4 font-mono text-xs">{f.nom}</td>
                  <td className="text-right">{Math.round(f.octets / 102.4) / 10} Ko</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ouvert && (
        <Suspense fallback={<p className="text-sm" role="status">Préparation du studio…</p>}>
          <StudioPortrait
            siteId={null}
            praticienId="essai"
            nom="Essai"
            theme={theme}
            initial={ouvert === 'reprise' ? portrait : undefined}
            onFermer={() => setOuvert(null)}
            onValider={(r) => { setResultat(r); setOuvert(null); }}
          />
        </Suspense>
      )}
    </div>
  );
}
