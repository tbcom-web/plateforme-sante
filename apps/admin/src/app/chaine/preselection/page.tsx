import Link from 'next/link';
import { CHAINE } from '@plateforme/core';
import { exigerContributeur, lireChaine, LECTURE_CHAINE, MIGRATION_CHAINE } from '@/lib/chaine-modeles';
import { donneesGeneration, donneesRendu, profilsDemo } from '../donnees';
import Preselection from './Preselection';
import BoutonImporterClaude from '../BoutonImporterClaude';
import { getEtatPolitique } from '@/lib/politique-evaluation';
import { professionDegustation } from '@/lib/degustation';
import { guidageChaine, prechargerGuidage } from '@/lib/chaine-guidage';
import ProchaineEtape from '../ProchaineEtape';

export const metadata = { title: 'Chaîne · Présélection' };
// « Garder » (garderPreselection) écrit fiche puis version pour chaque design : délai large, pour qu'une base lente n'interrompe
// jamais l'action entre les deux (2026-10-10 : deux fiches restées sans version, design vide dans le tournoi)
export const maxDuration = 300;

// 1. PRÉSÉLECTION INFINIE, SANS THÈME (décision de Paul du 2026-10-09) : un modèle est un DESIGN ; chaque page de 6 est rendue avec un
// profil de démonstration tiré parmi ceux de la profession (et SES images : kit du profil, jamais une autre activité), en variant
// les profils de page en page pour juger le design. On touche ce qui plaît ; « Voir avec un autre thème » sur chaque carte.
// ?profil=<id> (« Créer des modèles <sujet> » du point d'entrée « À valider », sujets-validation.ts) : designs montrés avec ce seul profil
export default async function PagePreselection({ searchParams }: PageProps<'/chaine/preselection'>) {
  const moi = await exigerContributeur();
  prechargerGuidage();
  // Toutes les lectures partent ENSEMBLE (2026-10-10, perf de la chaîne) : la chaîne n'attend plus les profils de démonstration
  // (profession lue dans le cookie du sélecteur, la même que celle des profils)
  const profession0 = await professionDegustation();
  const [sp, { profession, profils: tous }, rendu, gen, lue, politique] = await Promise.all([
    searchParams, profilsDemo(), donneesRendu(), donneesGeneration(), lireChaine(profession0.id, { versions: 'utiles' }), getEtatPolitique(),
  ]);
  const cible = typeof sp.profil === 'string' ? tous.find((p) => p.id === sp.profil) ?? null : null;
  const profils = cible ? [cible] : tous;
  // Chaîne guidée : prochaine étape (les designs de Claude ne sont importés que par le bouton : un design importé est gardé)
  const { action, chaine, importes } = await guidageChaine({ moi, profession: profession.id, chaine: lue });
  // Politique d'évaluation unique : compositions montrées récemment (toutes surfaces) pas reproposées pendant le délai de retour ;
  // éléments vus sans être choisis exclus par les tranches (gen.tranches)
  const recentes = politique.ecrans.flatMap((e) => e.cles.filter((k) => k.startsWith('compo:')));
  const candidats = chaine.fiches.filter((f) => f.profil === null && f.statut === 'candidat').length;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">Choisir</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Des designs de site à l’infini, six par page, montrés chaque fois avec un cabinet différent (et ses images). Touchez ceux qui vous plaisent, puis « Garder » : chaque design gardé part seul en vérification ({CHAINE.maxVerification} à la fois, les plus aimés d’abord).</p>
      </div>
      <ProchaineEtape action={action} importes={importes} compact ici="/chaine/preselection" />
      {/* Composeur (2026-10-11) : les plus beaux modèles assemblés seuls pour un profil de cabinet (ex. Sport + Diabète) */}
      <Link href={cible ? `/chaine/composer?profil=${encodeURIComponent(cible.id)}` : '/chaine/composer'} className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-800/30 bg-teal-50 p-3 text-sm text-teal-950 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700" data-action="composer-profil">
        <span><strong>Proposer des modèles pour un profil</strong> · le composeur assemble seul ses plus beaux modèles{cible ? ` pour « ${cible.nom} »` : ' (ex. Sport + Diabète)'}</span>
        <span aria-hidden="true">→</span>
      </Link>
      {cible && <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-950 ring-1 ring-teal-200">Designs montrés avec le profil <strong>{cible.nom}</strong> et ses images (depuis « À valider »). <a className="underline" href="/chaine/preselection">Tous les profils</a></p>}
      {chaine.migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_CHAINE}</p>}
      {chaine.erreurLecture && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" data-erreur-lecture="">{LECTURE_CHAINE}</p>}
      {!profils.length ? <p className="text-sm">Aucun profil de démonstration pour cette profession.</p> : (
        <div id="etape-travail" className="grid gap-3"><Preselection profils={profils} candidats={candidats} dejaVues={[...chaine.fiches.map((f) => f.cle), ...recentes]} rendu={rendu} poids={gen.poids} photos={gen.photos} tranches={gen.tranches} politique={politique} />
        <details className="text-sm text-neutral-700"><summary className="min-h-11 cursor-pointer">Autres sources de designs</summary><div className="mt-2"><BoutonImporterClaude /></div></details></div>
      )}
    </div>
  );
}
