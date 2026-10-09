import { CHAINE } from '@plateforme/core';
import { exigerContributeur, lireChaine, MIGRATION_CHAINE } from '@/lib/chaine-modeles';
import { donneesGeneration, donneesRendu, profilsDemo } from '../donnees';
import Preselection from './Preselection';

export const metadata = { title: 'Chaîne · Présélection' };

// 1. PRÉSÉLECTION INFINIE, SANS THÈME (décision de Paul du 2026-10-09) : un modèle est un DESIGN ; chaque page de 6 est rendue avec un
// profil de démonstration tiré parmi ceux de la profession (et SES images : kit du profil, jamais une autre activité), en variant
// les profils de page en page pour juger le design. On touche ce qui plaît ; « Voir avec un autre thème » sur chaque carte.
export default async function PagePreselection() {
  await exigerContributeur();
  const { profession, profils } = await profilsDemo();
  const [rendu, gen, chaine] = await Promise.all([donneesRendu(), donneesGeneration(), lireChaine(profession.id)]);
  const candidats = chaine.fiches.filter((f) => f.profil === null && f.statut === 'candidat').length;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">Présélection</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Des designs de site à l’infini, six par page, montrés chaque fois avec un cabinet différent (et ses images). Touchez ceux qui vous plaisent, puis « Garder ». Objectif : {CHAINE.objectifCandidats} candidats.</p>
      </div>
      {chaine.migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_CHAINE}</p>}
      {!profils.length ? <p className="text-sm">Aucun profil de démonstration pour cette profession.</p> : (
        <Preselection profils={profils} candidats={candidats} dejaVues={chaine.fiches.map((f) => f.cle)} rendu={rendu} poids={gen.poids} photos={gen.photos} tranches={gen.tranches} />
      )}
    </div>
  );
}
