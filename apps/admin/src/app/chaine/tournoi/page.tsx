import Link from 'next/link';
import { CHAINE, groupeTournoi, TOURNOI_GRILLES, tournoiDuProfil } from '@plateforme/core';
import { exigerContributeur, faireTournerChaine, MIGRATION_CHAINE } from '@/lib/chaine-modeles';
import { donneesGeneration, donneesRendu, profilsDemo } from '../donnees';
import Tournoi from './Tournoi';

export const metadata = { title: 'Chaîne · Tournoi' };

// 2. TOURNOI EN GRILLES (retour de Paul du 2026-10-09 : « 160 batailles, c'est énorme ») : « tes 2 préférées parmi 6 » entre les
// designs candidats de la PROFESSION (anciens modèles : par profil), les 6 rendus avec le MÊME profil de démonstration ; a priori
// (J'aime, juge, jauge), seul le top 10 est recherché, arrêt quand il est sûr à 90 % (tournoi-grilles.ts, docs/chaine-modeles.md).
// Plusieurs contributeurs en parallèle : chaque grille est réservée à un votant.
export default async function PageTournoi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerContributeur();
  const sp = await searchParams;
  const { profession, profils } = await profilsDemo();
  const [{ chaine }, rendu, gen] = await Promise.all([faireTournerChaine(profession.id), donneesRendu(), donneesGeneration()]);
  const demande = (Array.isArray(sp.profil) ? sp.profil[0] : sp.profil) || null;
  const groupes = [...new Set([`${profession.id}|*`, ...chaine.fiches.filter((f) => f.statut === 'candidat').map(groupeTournoi)])];
  const groupe = `${profession.id}|${demande ?? '*'}`;
  const cand = chaine.fiches.filter((f) => f.statut === 'candidat' && groupeTournoi(f) === groupe);
  const t = tournoiDuProfil(chaine, cand.map((f) => f.id));
  const nom = (g: string) => { const p = g.split('|')[1]; return p === '*' ? 'Designs de la profession' : `${profils.find((x) => x.id === p)?.nom ?? p} (ancien tournoi par profil)`; };
  const versions = Object.fromEntries(cand.map((f) => [f.id, { nom: f.nom, design: chaine.versions.find((v) => v.modele === f.id && v.version === f.versionCourante)?.composition ?? {} }]));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">Tournoi</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Touchez vos 2 préférés parmi 6 (et, si vous voulez, celui qui ne va pas). On ne cherche que les {TOURNOI_GRILLES.top} meilleurs : le tournoi s’arrête tout seul quand ils sont sûrs à {Math.round(TOURNOI_GRILLES.certitude * 100)} %.</p>
      </div>
      {chaine.migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_CHAINE}</p>}
      {groupes.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label="Tournois">
          {groupes.map((g) => { const p = g.split('|')[1]; return <Link key={g} href={p === '*' ? '/chaine/tournoi' : `/chaine/tournoi?profil=${encodeURIComponent(p)}`} aria-current={g === groupe ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${g === groupe ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-300 bg-white'}`}>{nom(g)}</Link>; })}
        </nav>
      )}
      {!t.ouvert ? (
        <p className="rounded-2xl border border-black/10 bg-white p-5 text-sm">{t.texte}. <Link href="/chaine/preselection" className="font-semibold text-teal-900 underline">Présélectionner</Link></p>
      ) : t.arrete ? (
        <p className="rounded-2xl border border-black/10 bg-white p-5 text-sm" data-etat-tournoi="arrete">{t.texte} : les finalistes sont dans le tableau.</p>
      ) : (
        <Tournoi profil={demande} versions={versions} profils={profils} rendu={rendu} poids={gen.poids} photos={gen.photos} budget={TOURNOI_GRILLES.budget} ouverture={CHAINE.ouvertureTournoi} />
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
