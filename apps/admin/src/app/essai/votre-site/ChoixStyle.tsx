'use client';

// « Choisissez votre style » (demande de Paul du 2026-10-08 : rendre la sélection ludique et rapide, sans perdre la sobriété) :
// de VRAIS rendus de SON site (ses informations, ses sujets, ses couleurs), « J'aime » / « Pas pour moi », 2 à 3 tours qui
// convergent (onboarding.ts : grilleDuTour garde ce qu'il aime et fait varier le reste). Téléphone : une carte à la fois
// (grand aperçu lisible) ; ordinateur : la grille du tour. Clavier : boutons ordinaires ; mouvements réduits respectés.
import { useState } from 'react';
import { TOURS_STYLE_MAX, type AvisStyle, type CandidatStyle, type Verdict } from '@plateforme/core/onboarding';
import { LIBELLES_STRUCTURES, LIBELLES_STYLES, gamme as gammeParId, type Proposition } from '@plateforme/core';
import type { ReactNode } from 'react';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export type CandidatPropose = CandidatStyle & { proposition: Proposition; /** « Conçu pour … » : recette publiée pour un profil de pratique proche */ badge?: string | null };

export default function ChoixStyle({
  grille, avis, tour, dernierTour, etroit, apercu, onAvis, onTourSuivant, onTerminer,
}: {
  /** Propositions du tour, figées à son ouverture (onboarding.ts, grilleDuTour) */
  grille: CandidatPropose[];
  avis: AvisStyle;
  tour: number;
  /** Plus de tour possible (dernier tour ou propositions épuisées) */
  dernierTour: boolean;
  etroit: boolean;
  /** Rendu réduit d'une proposition (ApercuTheme en vignette) */
  apercu: (p: Proposition, hauteur: number, mobile: boolean) => ReactNode;
  onAvis: (id: string, v: Verdict, tour: number) => void;
  onTourSuivant: () => void;
  onTerminer: () => void;
}) {
  const restantes = grille.filter((c) => !avis[c.id]);
  const aimes = Object.values(avis).filter((v) => v === 'aime').length;
  const fini = restantes.length === 0;
  // Téléphone : la première carte sans avis
  const courante = etroit ? restantes[0] : undefined;
  const [annonce, setAnnonce] = useState('');

  const donner = (c: CandidatPropose, v: Verdict) => {
    onAvis(c.id, v, tour);
    setAnnonce(v === 'aime' ? `« ${c.proposition.nom} » : vous aimez.` : `« ${c.proposition.nom} » : pas pour vous.`);
  };

  const carte = (c: CandidatPropose, grande: boolean) => {
    const g = gammeParId(c.gamme);
    const v = avis[c.id];
    // Toujours le rendu TÉLÉPHONE (celui que voient la plupart des patients) : grand sur téléphone, en grille sur ordinateur
    const hauteur = grande ? 440 : 400;
    return (
      <li key={c.id} className={`grid content-start gap-3 rounded-2xl border bg-white p-3 shadow-sm ${v === 'aime' ? 'border-teal-700 ring-2 ring-teal-700/25' : v === 'non' ? 'border-neutral-200 opacity-60' : 'border-black/10'}`}>
        <div aria-hidden="true" className={`mx-auto overflow-hidden rounded-[18px] ring-4 ring-neutral-800 ${grande ? 'w-[220px]' : 'w-[190px]'}`}>
          {apercu(c.proposition, hauteur, true)}
        </div>
        <div className="grid gap-0.5">
          {c.badge && <p className="justify-self-start rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-900">{c.badge}</p>}
          <h3 className="text-lg font-bold">{c.proposition.nom}</h3>
          <p className="text-sm text-neutral-600">{LIBELLES_STRUCTURES[c.proposition.univers]} · {LIBELLES_STYLES[c.proposition.style].nom}{g ? ` · ${g.nom}` : ''}</p>
        </div>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={`Votre avis sur « ${c.proposition.nom} »`}>
          <button type="button" onClick={() => donner(c, 'non')} aria-pressed={v === 'non'} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${focus} ${v === 'non' ? 'border-neutral-500 bg-neutral-100' : 'border-neutral-300 bg-white hover:bg-neutral-50'}`}>
            Pas pour moi
          </button>
          <button type="button" onClick={() => donner(c, 'aime')} aria-pressed={v === 'aime'} className={`min-h-12 rounded-xl px-3 text-sm font-semibold ${focus} ${v === 'aime' ? 'bg-teal-900 text-white' : 'bg-teal-800 text-white hover:bg-teal-900'}`}>
            J’aime
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-teal-900">Tour {tour + 1} sur {TOURS_STYLE_MAX}{tour > 0 ? ' : nous gardons ce que vous aimez' : ''}</p>
        <p className="text-sm text-neutral-600" aria-live="polite">{aimes} aimé{aimes > 1 ? 's' : ''}</p>
      </div>
      <p role="status" className="sr-only">{annonce}</p>

      {etroit && courante && (
        <>
          <p className="text-sm text-neutral-600">Proposition {grille.indexOf(courante) + 1} sur {grille.length}</p>
          <ul className="grid">{carte(courante, true)}</ul>
        </>
      )}
      {!etroit && <ul className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Propositions du tour">{grille.map((c) => carte(c, false))}</ul>}

      {(fini || (etroit && !courante)) && (
        <div className="grid gap-3 rounded-2xl bg-teal-50 p-4 text-teal-950 sm:flex sm:items-center sm:justify-between">
          <p className="text-sm">{aimes ? (dernierTour ? 'Votre proposition est prête.' : 'Merci. Un dernier tour pour affiner ?') : 'Aucune ne vous plaît ? Nous en proposons d’autres.'}</p>
          <div className="flex flex-wrap gap-2">
            {!dernierTour && (
              <button type="button" onClick={onTourSuivant} className={`min-h-12 rounded-xl border border-teal-800 bg-white px-4 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>
                {aimes ? 'Affiner encore' : 'Voir d’autres propositions'}
              </button>
            )}
            {aimes > 0 && (
              <button type="button" onClick={onTerminer} className={`min-h-12 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 ${focus}`}>
                Voir mon site
              </button>
            )}
          </div>
        </div>
      )}
      {!fini && aimes > 0 && (
        <button type="button" onClick={onTerminer} className={`justify-self-start rounded px-1 text-sm font-semibold text-teal-800 underline underline-offset-2 ${focus}`}>
          J’ai trouvé : voir mon site
        </button>
      )}
    </div>
  );
}
