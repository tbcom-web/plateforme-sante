import { CHAINE } from '@plateforme/core';
import { exigerContributeur, lireChaine, LECTURE_CHAINE, MIGRATION_CHAINE } from '@/lib/chaine-modeles';
import { donneesGeneration, donneesRendu, profilsDemo } from '../donnees';
import Preselection from './Preselection';
import BoutonImporterClaude from '../BoutonImporterClaude';
import { getEtatPolitique } from '@/lib/politique-evaluation';
import { guidageChaine, prechargerGuidage } from '@/lib/chaine-guidage';
import ProchaineEtape from '../ProchaineEtape';

export const metadata = { title: 'Chaîne · Présélection' };

// 1. PRÉSÉLECTION INFINIE, SANS THÈME (décision de Paul du 2026-10-09) : un modèle est un DESIGN ; chaque page de 6 est rendue avec un
// profil de démonstration tiré parmi ceux de la profession (et SES images : kit du profil, jamais une autre activité), en variant
// les profils de page en page pour juger le design. On touche ce qui plaît ; « Voir avec un autre thème » sur chaque carte.
export default async function PagePreselection() {
  const moi = await exigerContributeur();
  prechargerGuidage();
  const { profession, profils } = await profilsDemo();
  const [rendu, gen, lue, politique] = await Promise.all([donneesRendu(), donneesGeneration(), lireChaine(profession.id), getEtatPolitique()]);
  // Chaîne guidée : prochaine étape ; s'il manque des candidats, les designs de Claude entrent seuls (chaîne relue)
  const { action, chaine, importes } = await guidageChaine({ moi, profession: profession.id, chaine: lue });
  // Politique d'évaluation unique : compositions montrées récemment (toutes surfaces) pas reproposées pendant le délai de retour ;
  // éléments vus sans être choisis exclus par les tranches (gen.tranches)
  const recentes = politique.ecrans.flatMap((e) => e.cles.filter((k) => k.startsWith('compo:')));
  const candidats = chaine.fiches.filter((f) => f.profil === null && f.statut === 'candidat').length;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">Présélection</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Des designs de site à l’infini, six par page, montrés chaque fois avec un cabinet différent (et ses images). Touchez ceux qui vous plaisent, puis « Garder ». Le tournoi s’ouvre dès {CHAINE.ouvertureTournoi} candidats.</p>
      </div>
      <ProchaineEtape action={action} importes={importes} ici="/chaine/preselection" />
      {chaine.migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_CHAINE}</p>}
      {chaine.erreurLecture && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" data-erreur-lecture="">{LECTURE_CHAINE}</p>}
      {!profils.length ? <p className="text-sm">Aucun profil de démonstration pour cette profession.</p> : (
        <div id="etape-travail" className="grid gap-3"><Preselection profils={profils} candidats={candidats} dejaVues={[...chaine.fiches.map((f) => f.cle), ...recentes]} rendu={rendu} poids={gen.poids} photos={gen.photos} tranches={gen.tranches} politique={politique} />
        <details className="text-sm text-neutral-700"><summary className="min-h-11 cursor-pointer">Autres sources de candidats</summary><div className="mt-2"><BoutonImporterClaude /></div></details></div>
      )}
    </div>
  );
}
