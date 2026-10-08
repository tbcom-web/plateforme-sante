import Link from 'next/link';
import { estTypeDuel, modeDuel, inventaireAssets, statutsAvecHeritage, universDuParcours } from '@plateforme/core';
import { predictionsParCle } from '@plateforme/core/juge';
import { exigerAdmin } from '@/lib/admin';
import { getPhotosDesJeux, getSurchargesSujets } from '@/lib/assets-notes';
import { getPoidsAtelier } from '@/lib/atelier';
import { getDuels } from '@/lib/duels';
import { getRevuesIllustrations } from '@/lib/illustrations';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getPredictions } from '@/lib/predictions';
import { getPhotosBanque, getRecettes } from '@/lib/recettes';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import Duel from './Duel';

export const metadata = { title: 'Super admin · Duel A ou B' };

// Mode duel « A ou B ? » (demande de Paul, 2026-10-07) : deux propositions pour le même scénario ou le même sujet, une seule
// dimension changée la plupart du temps ; A, B, égalité, les deux sont mauvais (← → ↓ ↑, balayage sur téléphone). Classement
// Bradley-Terry par sujet, poids du générateur (duels.ts, migration 0037), accord avec le juge (retours/predictions.json).
export default async function PageDuel({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  const [{ duels, migrationManquante }, modeles, catalogue, marquesImportees, { univers }, poids, photos, { recettes }, photosJeux, surcharges, revues, predictions] = await Promise.all([
    getDuels(), getModelesDisponibles(), getCatalogue(), getMarquesImportees(), getUnivers(), getPoidsAtelier(), getPhotosBanque(), getRecettes(),
    getPhotosDesJeux(), getSurchargesSujets(), getRevuesIllustrations(), getPredictions(),
  ]);
  // Type de duel ou mode (palette, polices, tailles, police-palette : MODES_DUEL)
  const type = typeof sp.type === 'string' && (estTypeDuel(sp.type) || modeDuel(sp.type)) ? sp.type : null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <p className="text-sm"><Link href="/admin/retours" className="font-semibold text-teal-900 underline">← Donner mon avis</Link></p>
        <h1 className="mt-1 text-2xl font-bold">Duel : A ou B ?</h1>
        <p className="mt-1 hidden max-w-3xl text-sm text-neutral-600 md:block">
          Deux propositions pour le même client ou le même sujet ; le plus souvent une seule chose change. Choisissez vite :
          ← A, → B, ↓ égalité, ↑ les deux sont mauvais (sur téléphone : balayez). Chaque duel affine le classement par sujet et,
          modérément, les propositions du générateur.
        </p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration à exécuter (<code>supabase/migrations/0037_duels.sql</code>) : les duels fonctionnent, mais restent dans ce navigateur tant que la table n’existe pas.
        </p>
      )}
      <Duel
        historique={duels}
        migrationManquante={migrationManquante}
        proposes={universDuParcours(univers)}
        modeles={modeles}
        catalogue={catalogue}
        marquesImportees={marquesImportees}
        themesActives={themesActives()}
        poids={poids}
        photos={photos}
        recettes={recettes.filter((r) => r.statut === 'active')}
        photosJeux={photosJeux}
        surcharges={surcharges}
        statuts={statutsAvecHeritage(Object.fromEntries(revues.statuts.map((s) => [s.cle, s.statut])), inventaireAssets({ photosJeux }).map((a) => a.cle))}
        predictions={predictionsParCle(predictions)}
        typeInitial={type}
        mobileInitial={sp.mobile === '1'}
        pageInitiale={typeof sp.page === 'string' ? sp.page : null}
      />
    </div>
  );
}
