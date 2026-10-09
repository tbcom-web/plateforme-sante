'use client';

// Carte d'une SÉRIE de l'agent dans les Arrivages (docs/sourcing-photos.md) : planche des vignettes de la source (sélection au clic),
// signature, cohérence, emplacement prévu de chaque photo, revue de Claude (écartées masquées), et APERÇU de la série appliquée sur un
// site d'exemple du profil avec le traitement photo commun (filtre de la recette, couleurs de la gamme). Rien n'est importé ici :
// les gestes (Accepter la série / la sélection, Autre série, Refuser) sont tenus par la file des Arrivages.
import { useId, useMemo, type CSSProperties } from 'react';
import { couleursTraitement, gamme as gammeParId, svgTraitementPhotos, variablesGamme, type IdTraitementPhotos } from '@plateforme/core';
import type { PhotoSerieAffichee, SerieAffichee } from './series';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const SOURCE: Record<string, string> = { pexels: 'Pexels', pixabay: 'Pixabay' };

function Jauge({ valeur, libelle }: { valeur: number; libelle: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between text-xs text-neutral-600"><span>{libelle}</span><span className="font-semibold tabular-nums text-neutral-900">{valeur}/100</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={valeur} aria-label={libelle}>
        <div className={`h-full rounded-full ${valeur >= 70 ? 'bg-teal-700' : valeur >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.max(3, valeur)}%` }} />
      </div>
    </div>
  );
}

function Vignette({ p, choisie, onBasculer }: { p: PhotoSerieAffichee; choisie: boolean; onBasculer: () => void }) {
  return (
    <li className="grid gap-1">
      <button type="button" aria-pressed={choisie} onClick={onBasculer} aria-label={`${choisie ? 'Retirer de' : 'Remettre dans'} la sélection : ${p.libelleEmplacement}`}
        className={`group relative block aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100 ring-2 ${focus} ${choisie ? 'ring-teal-700' : 'opacity-45 ring-transparent'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.apercu} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
        <span className="absolute left-1.5 top-1.5 max-w-[80%] truncate rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-900">{p.libelleEmplacement}</span>
        <span aria-hidden="true" className={`absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full text-sm font-bold ${choisie ? 'bg-teal-700 text-white' : 'bg-white/90 text-neutral-500'}`}>{choisie ? '✓' : ''}</span>
      </button>
      <span className="flex min-w-0 items-baseline justify-between gap-1 text-[11px] text-neutral-600">
        <a href={p.pageUrl} target="_blank" rel="noopener noreferrer" className="truncate underline">{p.auteur || 'Photo'} sur {SOURCE[p.source]}</a>
        <span className="shrink-0 tabular-nums" title="Qualité · pertinence">{Math.round(p.qualite * 100)} · {Math.round(p.pertinence * 100)}</span>
      </span>
    </li>
  );
}

/** Aperçu de la série appliquée sur un site d'exemple (premier écran, cartes, galerie) avec le traitement photo commun */
export function ApercuSerie({ serie, photos }: { serie: SerieAffichee; photos: PhotoSerieAffichee[] }) {
  const id = `tp-serie-${useId().replace(/[^a-z0-9]/gi, '')}`;
  const g = gammeParId(serie.gamme.id) ?? gammeParId('canard')!;
  const t = { id: serie.traitement.id as IdTraitementPhotos, grain: false };
  const svg = svgTraitementPhotos(t, couleursTraitement(g.id, g.accent), id);
  const style = useMemo(() => variablesGamme(g) as CSSProperties, [g]);
  const de = (e: (x: PhotoSerieAffichee) => boolean) => photos.filter(e);
  const heros = de((p) => p.emplacement === 'accueil')[0] ?? photos[0];
  const cartes = de((p) => p !== heros && p.emplacement !== 'reserve').slice(0, 3);
  const galerie = de((p) => p !== heros && !cartes.includes(p)).slice(0, 4);
  const filtre = svg ? { filter: `url(#${id})` } : undefined;
  const titre = serie.cible.pour ? serie.cible.pour.charAt(0).toUpperCase() + serie.cible.pour.slice(1) : serie.cible.libelle;
  return (
    <figure className="grid gap-2" aria-label="Aperçu de la série sur un site d’exemple">
      {svg && <span dangerouslySetInnerHTML={{ __html: svg }} />}
      <div className="overflow-hidden rounded-xl ring-1 ring-black/10" style={{ ...style, background: 'var(--fond)' }}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs" style={{ color: 'var(--plan)' }}>
          <strong className="text-sm">Cabinet Rousseau</strong>
          <span className="hidden gap-3 sm:flex"><span>Soins</span><span>Le cabinet</span><span>Contact</span></span>
        </div>
        {heros && (
          <div className="relative aspect-[16/8] overflow-hidden sm:aspect-[16/6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heros.apercu} alt="" className="absolute inset-0 h-full w-full object-cover" style={filtre} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
            <div className="relative grid h-full content-end gap-1.5 p-3 text-white sm:p-5">
              <p className="text-xs opacity-90">Cabinet de {serie.vocabulaire.discipline} · Lyon</p>
              <p className="max-w-md text-base font-bold leading-tight sm:text-xl">{titre}</p>
              <span className="w-fit rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--accent)' }}>Prendre rendez-vous</span>
            </div>
          </div>
        )}
        {cartes.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 p-2.5 sm:gap-3 sm:p-4" style={{ background: 'var(--doux)' }}>
            {cartes.map((p) => (
              <li key={p.cle} className="overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.apercu} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" style={filtre} />
                <p className="truncate px-2 py-1.5 text-[11px] font-semibold sm:text-xs" style={{ color: 'var(--plan)' }}>{p.libelleEmplacement.replace(/^(Activité|Soin|Thème) : /, '')}</p>
              </li>
            ))}
          </ul>
        )}
        {galerie.length > 0 && (
          <ul className="grid grid-cols-4 gap-1 p-2.5 sm:p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {galerie.map((p) => <li key={p.cle}><img src={p.apercu} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" style={filtre} /></li>)}
          </ul>
        )}
      </div>
      <figcaption className="text-xs text-neutral-600">Site d’exemple · gamme {serie.gamme.nom} · traitement « {serie.traitement.nom} » appliqué à toutes les photos (aperçus de la source, rien n’est importé).</figcaption>
    </figure>
  );
}

export default function SerieArrivage({ serie, selection, onBasculer }: { serie: SerieAffichee; selection: ReadonlySet<string>; onBasculer: (cle: string) => void }) {
  const choisies = serie.photos.filter((p) => selection.has(p.cle));
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="grid content-start gap-2">
          <p className="flex flex-wrap gap-1.5" aria-label="Signature de la série">
            {serie.signature.mots.map((m) => <span key={m} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-900 ring-1 ring-teal-200">{m}</span>)}
          </p>
          <p className="flex flex-wrap items-center gap-1" aria-label="Palette de la série">
            {serie.palette.slice(0, 6).map((c) => <span key={c.hex} title={`${c.hex} · ${Math.round(c.part * 100)} %`} className="h-5 rounded ring-1 ring-black/10" style={{ background: c.hex, width: `${Math.max(14, Math.round(c.part * 160))}px` }} />)}
          </p>
          <p className="text-xs text-neutral-600">
            Pourquoi : {serie.cible.raison}. {serie.journal.requetes} requêtes, {serie.journal.candidates} candidates, {serie.journal.analysees} aperçus analysés{serie.journal.ecartees ? ` (écartées : ${serie.journal.ecartees})` : ''}.
          </p>
          {serie.revue && (
            <p className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-sm text-sky-950 ring-1 ring-sky-200">
              <strong>{serie.revue.libelle}</strong>{serie.revue.note ? ` · note prédite ${serie.revue.note} ★ (jamais une note de Paul)` : ''}{serie.revue.remarque ? ` · ${serie.revue.remarque}` : ''}
            </p>
          )}
        </div>
        <div className="grid content-start gap-2">
          <Jauge valeur={serie.coherence} libelle="Cohérence de la série" />
          <Jauge valeur={serie.score} libelle="Score global" />
          <p className="text-xs text-neutral-600">Gamme {serie.gamme.nom} · traitement « {serie.traitement.nom} »</p>
        </div>
      </div>

      <section aria-label="Planche de la série" className="grid gap-2">
        <h3 className="text-sm font-semibold">Planche · {choisies.length}/{serie.photos.length} sélectionnée{choisies.length > 1 ? 's' : ''} <span className="font-normal text-neutral-500">(cliquez une photo pour la retirer ou la remettre)</span></h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {serie.photos.map((p) => <Vignette key={p.cle} p={p} choisie={selection.has(p.cle)} onBasculer={() => onBasculer(p.cle)} />)}
        </ul>
        {serie.ecartees.length > 0 && (
          <details className="rounded-lg bg-neutral-50 p-2 text-sm ring-1 ring-black/5">
            <summary className={`cursor-pointer rounded ${focus}`}>{serie.ecartees.length} photo{serie.ecartees.length > 1 ? 's' : ''} écartée{serie.ecartees.length > 1 ? 's' : ''} par Claude</summary>
            <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {serie.ecartees.map((p) => (
                <li key={p.cle} className="grid gap-1 text-[11px] text-neutral-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.apercu} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-md object-cover opacity-60" />
                  <span>{p.raison}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <ApercuSerie serie={serie} photos={choisies.length ? choisies : serie.photos} />
    </div>
  );
}
