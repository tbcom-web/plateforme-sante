// Tuiles des sujets du point d'entrée « À valider » (présentation seule, sans lecture) : aperçu composite, nouveautés, progression
// (vus, part OK), « Complet ✓ », modèles prêts à créer ; bouton « Reprendre » vers le premier sujet. Utilisé par page.tsx.
// Sujet d'un profil avec moins de SEUIL_PHOTOS_SUJET photos : raccourci « Sourcer des photos » sous la tuile.
import Link from 'next/link';
import { lienSujet, peutCreerModeles, progressionSujet } from '@plateforme/core/sujets-validation';
import type { CarteSujet, ResumeSujetServeur } from '@/lib/sujets-validation';
import type { VisuelArrivage } from '../arrivages/Arrivages';
import SourcerProfil from '../profils/SourcerProfil';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

function Vignette({ carte, visuel }: { carte: CarteSujet; visuel: VisuelArrivage | null }) {
  const cadre = 'grid aspect-square place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5';
  const src = carte.kind === 'serie' ? carte.photosSerie?.[0]?.apercu : carte.kind === 'photo' || carte.famille === 'photo' ? carte.url : visuel?.kind === 'image' ? visuel.src : null;
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <span className={cadre}><img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /></span>;
  if (visuel?.kind === 'svg' && visuel.svg.length < 60_000) {
    return <span className={`${cadre} ${visuel.fond === 'plan' ? 'surface-plan' : visuel.fond === 'grille' ? 'surface-grille' : ''}`} style={{ background: visuel.fond === 'doux' ? 'var(--doux)' : visuel.fond === 'plan' || visuel.fond === 'grille' ? undefined : 'var(--fond)', color: 'var(--encre)' }}><span className="sv-svg block h-[84%] w-[84%]" dangerouslySetInnerHTML={{ __html: visuel.svg }} /></span>;
  }
  if (visuel?.kind === 'gamme') return <span className={`${cadre} grid-cols-3`}>{visuel.couleurs.slice(0, 3).map((c, i) => <span key={i} className="h-full w-full" style={{ background: c }} />)}</span>;
  const glyphe = carte.famille === 'contenu' ? 'Aa' : carte.famille === 'animation' ? '▶' : carte.famille === 'police' ? 'Ag' : '▦';
  return <span className={`${cadre} bg-teal-50 text-lg font-semibold text-teal-900`} aria-hidden="true">{glyphe}</span>;
}

export default function TuilesSujets({ sujets, cartes, apercus, sourcer = {}, pret = false, seuil = 6 }: {
  sujets: ResumeSujetServeur[]; cartes: Record<string, CarteSujet>; apercus: Record<string, VisuelArrivage | null>;
  /** Sujets à compléter en photos : profil et nombre de photos */
  sourcer?: Record<string, { profil: string; photos: number }>; pret?: boolean; seuil?: number;
}) {
  const carteDe = (id: string) => cartes[id];
  return (
    <>
      {sujets[0] && (
        <Link href={lienSujet(sujets[0].id)} className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-teal-800 px-5 py-3 text-white shadow-sm hover:bg-teal-900 ${focus}`}>
          <span className="grid">
            <span className="text-xs uppercase tracking-widest text-teal-100">Reprendre</span>
            <span className="text-lg font-semibold">{sujets[0].libelle}{sujets[0].nouveautes ? ` · ${sujets[0].nouveautes} nouveauté${sujets[0].nouveautes > 1 ? 's' : ''}` : ` · ${sujets[0].aVoir} à voir`}</span>
          </span>
          <span aria-hidden="true" className="text-2xl">→</span>
        </Link>
      )}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sujets.map((s) => {
          const p = progressionSujet(s);
          return (
            <li key={s.id} className="grid gap-1.5">
              <Link href={lienSujet(s.id)} className={`grid h-full gap-3 rounded-2xl border bg-white p-3 transition hover:border-teal-700/40 hover:shadow-sm ${s.nouveautes ? 'border-amber-300' : 'border-black/5'} ${focus}`}>
                <span className="grid grid-cols-3 gap-1.5">
                  {s.apercu.slice(0, 3).map((id) => <Vignette key={id} carte={carteDe(id)} visuel={apercus[id] ?? null} />)}
                  {Array.from({ length: Math.max(0, 3 - s.apercu.length) }, (_, i) => <span key={`v${i}`} className="aspect-square rounded-lg bg-neutral-100" />)}
                </span>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-semibold text-neutral-900">{s.libelle}</span>
                  {s.nouveautes > 0
                    ? <span className="shrink-0 rounded-full bg-amber-300 px-2 text-xs font-bold text-amber-950">{s.nouveautes} nouveau{s.nouveautes > 1 ? 'x' : ''}</span>
                    : p.complet ? <span className="shrink-0 rounded-full bg-teal-50 px-2 text-xs font-semibold text-teal-900 ring-1 ring-teal-200">Complet ✓</span> : null}
                </span>
                <span className="grid gap-1">
                  <span className="relative h-2 overflow-hidden rounded-full bg-neutral-200" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.part * 100)} aria-label={`${s.libelle} : ${Math.round(p.part * 100)} % vus`}>
                    <span className="absolute inset-y-0 left-0 rounded-full bg-teal-300" style={{ width: `${Math.round(p.part * 100)}%` }} />
                    <span className="absolute inset-y-0 left-0 rounded-full bg-teal-700" style={{ width: `${Math.round(p.partOk * 100)}%` }} />
                  </span>
                  <span className="flex flex-wrap justify-between gap-x-2 text-xs text-neutral-600">
                    <span><span className="font-semibold tabular-nums text-neutral-900">{s.ok}</span> OK · <span className="tabular-nums">{s.aVoir}</span> à voir</span>
                    {peutCreerModeles(s, s) && <span className="font-semibold text-teal-800">Modèles prêts à créer</span>}
                  </span>
                </span>
              </Link>
              {sourcer[s.id] && pret && (
                <SourcerProfil profil={sourcer[s.id].profil} pret={pret} discret lien={{ href: lienSujet(s.id), libelle: 'Valider' }}
                  texte={`Sourcer des photos (${sourcer[s.id].photos}/${seuil})`} />
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
