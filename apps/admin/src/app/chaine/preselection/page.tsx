import { CHAINE } from '@plateforme/core';
import { exigerContributeur, lireChaine, MIGRATION_CHAINE } from '@/lib/chaine-modeles';
import { donneesGeneration, donneesRendu, profilsChaine } from '../donnees';
import Preselection from './Preselection';

export const metadata = { title: 'Chaîne · Présélection' };

// 1. PRÉSÉLECTION « MODE ILLIMITÉ » : pages de 6 sites complets du même profil, générés automatiquement (grilles « Directions » :
// favoris 4-5 ★, harmonie, diversité garantie entre les 6), filtre léger (harmonie, exclus, déjà vus, rendus identiques). On touche
// ceux qui plaisent ; chaque page gardée verse des points (journal de la Dégustation) et les sites touchés deviennent candidats.
export default async function PagePreselection({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerContributeur();
  const sp = await searchParams;
  const { profession, profils } = await profilsChaine();
  const [rendu, gen, chaine] = await Promise.all([donneesRendu(), donneesGeneration(), lireChaine(profession.id)]);
  const demande = Array.isArray(sp.profil) ? sp.profil[0] : sp.profil;
  const profil = profils.find((p) => p.id === demande)?.id ?? profils[0]?.id ?? '';
  const candidats = Object.fromEntries(profils.map((p) => [p.id, chaine.fiches.filter((f) => f.profil === p.id && f.statut === 'candidat').length]));
  const dejaVues = chaine.fiches.map((f) => f.cle);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">Présélection</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Six sites complets du même profil par page, sans fin. Touchez ceux qui vous plaisent (autant que vous voulez), puis « Garder ». Objectif : {CHAINE.objectifCandidats} candidats par profil.</p>
      </div>
      {chaine.migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_CHAINE}</p>}
      {!profils.length ? <p className="text-sm">Aucun profil pour cette profession.</p> : (
        <Preselection profession={profession.id} profils={profils} profilInitial={profil} candidats={candidats} dejaVues={dejaVues} rendu={rendu} poids={gen.poids} photos={gen.photos} tranches={gen.tranches} />
      )}
    </div>
  );
}
