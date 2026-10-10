import Link from 'next/link';
import { CHAINE, groupeTournoi, TOURNOI_GRILLES, tournoiDuProfil, versionDe } from '@plateforme/core';
import { AUTOMATE_INCOMPLET, exigerContributeur, faireTournerChaine, LECTURE_CHAINE, MIGRATION_CHAINE } from '@/lib/chaine-modeles';
import { donneesGeneration, donneesRendu, profilsDemo } from '../donnees';
import Tournoi from './Tournoi';
import ProchaineEtape from '../ProchaineEtape';
import { guidageChaine } from '@/lib/chaine-guidage';
import { professionDegustation } from '@/lib/degustation';

export const metadata = { title: 'Chaîne · Tournoi' };
// Fin d'un tournoi (passages d'étape) et actions du tournoi (servirEcran, repondreGrille) : délai large (bug « grille 49 »)
export const maxDuration = 300;

// 2. TOURNOI EN GRILLES (retour de Paul du 2026-10-09 : « 160 batailles, c'est énorme ») : « tes 2 préférées parmi 6 » entre les
// designs candidats de la PROFESSION (anciens modèles : par profil), les 6 rendus avec le MÊME profil de démonstration ; a priori
// (J'aime, juge, jauge), seul le top 10 est recherché, arrêt quand il est sûr à 90 % (tournoi-grilles.ts, docs/chaine-modeles.md).
// Plusieurs contributeurs en parallèle : chaque grille est réservée à un votant.
export default async function PageTournoi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const moi = await exigerContributeur();
  // Toutes les lectures partent ENSEMBLE (2026-10-10, perf de la chaîne) : la chaîne n'attend plus les profils de démonstration
  // (profession lue dans le cookie du sélecteur, la même que celle des profils)
  const profession0 = await professionDegustation();
  const [sp, { profession, profils }, bilan, rendu, gen] = await Promise.all([
    searchParams, profilsDemo(), faireTournerChaine(profession0.id, { versions: 'utiles' }), donneesRendu(), donneesGeneration(),
  ]);
  const { chaine } = bilan;
  const demande = (Array.isArray(sp.profil) ? sp.profil[0] : sp.profil) || null;
  const groupes = [...new Set([`${profession.id}|*`, ...chaine.fiches.filter((f) => f.statut === 'candidat').map(groupeTournoi)])];
  const groupe = `${profession.id}|${demande ?? '*'}`;
  const cand = chaine.fiches.filter((f) => f.statut === 'candidat' && groupeTournoi(f) === groupe);
  const t = tournoiDuProfil(chaine, cand.map((f) => f.id));
  const nom = (g: string) => { const p = g.split('|')[1]; return p === '*' ? 'Designs de la profession' : `${profils.find((x) => x.id === p)?.nom ?? p} (ancien tournoi par profil)`; };
  // Chaîne guidée : la prochaine étape (tournoi des designs déjà calculé ; pas d'import ici, la présélection et le tableau s'en chargent)
  const { action } = await guidageChaine({ moi, profession: profession.id, chaine, tournoi: demande ? undefined : t, autoImport: false });
  const versions = Object.fromEntries(cand.map((f) => [f.id, { nom: f.nom, design: versionDe(chaine, f.id, f.versionCourante)?.composition ?? {} }]));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">Tournoi</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Touchez vos 2 préférés parmi 6 (et, si vous voulez, celui qui ne va pas). On ne cherche que les {TOURNOI_GRILLES.top} meilleurs : le tournoi s’arrête tout seul quand ils sont sûrs à {Math.round(TOURNOI_GRILLES.certitude * 100)} %.</p>
      </div>
      <ProchaineEtape action={action} ici="/chaine/tournoi" />
      {chaine.migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_CHAINE}</p>}
      {(bilan.erreur === 'automate' || bilan.echecs > 0) && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" data-automate-incomplet="">{AUTOMATE_INCOMPLET} <Link href="/chaine" className="font-semibold underline">Voir le tableau</Link></p>}
      {chaine.erreurLecture && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" data-erreur-lecture="">{LECTURE_CHAINE}</p>}
      {groupes.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label="Tournois">
          {groupes.map((g) => { const p = g.split('|')[1]; return <Link key={g} href={p === '*' ? '/chaine/tournoi' : `/chaine/tournoi?profil=${encodeURIComponent(p)}`} aria-current={g === groupe ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${g === groupe ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-300 bg-white'}`}>{nom(g)}</Link>; })}
        </nav>
      )}
      {!t.ouvert ? (
        <p id="etape-travail" className="rounded-2xl border border-black/10 bg-white p-5 text-sm">Pas encore de tournoi : {t.texte}. Il s’ouvre seul dès {CHAINE.ouvertureTournoi} candidats. <Link href="/chaine/preselection" className="font-semibold text-teal-900 underline">Présélectionner</Link></p>
      ) : t.arrete ? (
        <p id="etape-travail" className="rounded-2xl border border-black/10 bg-white p-5 text-sm" data-etat-tournoi="arrete">{t.texte} : le tournoi est terminé. <Link href="/chaine" className="font-semibold text-teal-900 underline">Voir les finalistes et la suite</Link></p>
      ) : (
        <div id="etape-travail"><Tournoi profil={demande} versions={versions} profils={profils} rendu={rendu} poids={gen.poids} photos={gen.photos} budget={TOURNOI_GRILLES.budget} ouverture={CHAINE.ouvertureTournoi} /></div>
      )}
      {t.classement.length > 0 && (
        <details className="rounded-2xl border border-black/10 bg-white p-3 text-sm">
          <summary className="min-h-11 cursor-pointer font-semibold">Classement (top {TOURNOI_GRILLES.top} recherché)</summary>
          <ol className="mt-2 grid gap-1">
            {t.classement.slice(0, 20).map((l) => <li key={l.id} className={`flex gap-2 ${l.rang === TOURNOI_GRILLES.top ? 'border-b border-dashed border-teal-700 pb-1' : ''}`}><span className="w-8 text-right font-semibold">{l.rang}</span><span className="truncate">{versions[l.id]?.nom ?? l.id}</span><span className="ml-auto text-neutral-600">{l.elimine ? 'éliminé · ' : ''}vu {l.apparitions} · choisi {l.choisi}</span></li>)}
          </ol>
        </details>
      )}
    </div>
  );
}
