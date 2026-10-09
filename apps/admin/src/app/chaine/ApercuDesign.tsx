'use client';

// Aperçu d'un DESIGN de la chaîne avec le kit d'un profil (chaine-design.ts) : sélecteur « Voir avec » parmi les profils compatibles.
import { useMemo, useState } from 'react';
import type { PageStructure, PhotoBanque, PoidsAtelier } from '@plateforme/core';
import ApercuModele, { type RenduChaine } from './ApercuModele';
import { contexteDuProfil, rendreDesign, type ProfilRendu } from './rendu-profil';

export function useRenduProfil(profils: ProfilRendu[], o: { poids: PoidsAtelier | null; photos: PhotoBanque[]; rendu: RenduChaine }) {
  const [id, setId] = useState(profils[0]?.id ?? '');
  const profil = profils.find((p) => p.id === id) ?? profils[0] ?? null;
  const ctx = useMemo(() => (profil ? contexteDuProfil(profil, { poids: o.poids, photos: o.photos, modeles: o.rendu.modeles }) : null), [profil, o.poids, o.photos, o.rendu.modeles]);
  const rendre = (design: Record<string, unknown>) => (profil && ctx ? rendreDesign(design, profil, ctx, 1) : design);
  const scenario = profil ? { principaux: profil.scenario.principaux, secondaires: profil.scenario.secondaires, couleurs: profil.scenario.couleurs } : null;
  const selecteur = profils.length > 1 ? (
    <label className="flex flex-wrap items-center gap-2 text-sm">Voir avec
      <select value={profil?.id ?? ''} onChange={(e) => setId(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm" data-action="voir-avec">
        {profils.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
      </select>
    </label>
  ) : null;
  return { profil, rendre, scenario, selecteur };
}

export default function ApercuDesign({ design, profils, poids, photos, rendu, page, appareil = 'ordinateur', hauteur, scenarioDefaut }: {
  design: Record<string, unknown>; profils: ProfilRendu[]; poids: PoidsAtelier | null; photos: PhotoBanque[]; rendu: RenduChaine; page?: PageStructure; appareil?: 'ordinateur' | 'mobile'; hauteur: number;
  scenarioDefaut: { principaux: string[]; secondaires: string[]; couleurs: string[] };
}) {
  const r = useRenduProfil(profils, { poids, photos, rendu });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const composition = useMemo(() => r.rendre(design), [design, r.profil?.id]);
  return (
    <div className="grid min-w-0 gap-2">
      {r.selecteur}
      <ApercuModele composition={composition} scenario={r.scenario ?? scenarioDefaut} rendu={rendu} page={page} appareil={appareil} hauteur={hauteur} />
    </div>
  );
}
