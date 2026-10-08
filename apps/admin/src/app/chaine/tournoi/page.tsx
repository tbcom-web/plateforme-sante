import Link from 'next/link';
import { CHAINE, etatTournoi, prochainDuel } from '@plateforme/core';
import { exigerContributeur, faireTournerChaine, MIGRATION_CHAINE } from '@/lib/chaine-modeles';
import { donneesRendu, profilsChaine } from '../donnees';
import Duel from './Duel';

export const metadata = { title: 'Chaîne · Tournoi' };

// 2. TOURNOI : duels A/B entre candidats d'un profil, appariement « suisse » automatique (niveaux proches, incertitude, jamais deux
// fois la même paire pour un votant tant qu'il y en a d'autres), multi-votants (Bradley-Terry agrégé, vote du validateur ×2), arrêt
// automatique quand le classement est stable ; les 10 premiers deviennent finalistes (automate).
export default async function PageTournoi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const moi = await exigerContributeur();
  const sp = await searchParams;
  const { profession, profils } = await profilsChaine();
  const [{ chaine }, rendu] = await Promise.all([faireTournerChaine(profession.id), donneesRendu()]);
  const demande = Array.isArray(sp.profil) ? sp.profil[0] : sp.profil;
  // Profil par défaut : celui dont le tournoi est ouvert et non arrêté
  const etats = profils.map((p) => ({ p, ids: chaine.fiches.filter((f) => f.profil === p.id && f.statut === 'candidat').map((f) => f.id) })).map((x) => ({ ...x, t: etatTournoi(x.ids, chaine.votes) }));
  const choisi = etats.find((x) => x.p.id === demande) ?? etats.find((x) => x.t.ouvert && !x.t.arrete) ?? etats[0];
  if (!choisi) return <p className="text-sm">Aucun profil.</p>;
  const { p: profil, ids, t } = choisi;
  const paire = t.ouvert && !t.arrete ? prochainDuel(ids, chaine.votes, { votant: moi.id, graine: chaine.votes.length + 1 }) : null;
  const fiche = (id: string) => chaine.fiches.find((f) => f.id === id)!;
  const version = (id: string) => chaine.versions.find((v) => v.modele === id && v.version === fiche(id).versionCourante)?.composition ?? {};
  const mesVotes = chaine.votes.filter((v) => v.votant === moi.id && ids.includes(v.a)).length;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">Tournoi · {profil.nom}</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Lequel préférez-vous pour un praticien de ce profil ? Les duels sont choisis automatiquement ; le tournoi s’arrête tout seul quand le classement ne bouge plus, et les {CHAINE.finalistes} premiers passent en finale.</p>
      </div>
      {chaine.migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_CHAINE}</p>}
      <nav className="flex flex-wrap gap-2" aria-label="Profils">
        {etats.map((x) => <Link key={x.p.id} href={`/chaine/tournoi?profil=${encodeURIComponent(x.p.id)}`} aria-current={x.p.id === profil.id ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${x.p.id === profil.id ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-300 bg-white'}`}>{x.p.nom} · {x.ids.length}</Link>)}
      </nav>
      <p className="text-sm text-neutral-700" data-etat-tournoi={t.raison}>{t.texte} · vos votes : {mesVotes}</p>
      {paire ? (
        <Duel profil={profil.id} a={{ id: paire[0], nom: fiche(paire[0]).nom, composition: version(paire[0]) }} b={{ id: paire[1], nom: fiche(paire[1]).nom, composition: version(paire[1]) }}
          scenario={fiche(paire[0]).scenario} rendu={rendu} />
      ) : (
        <p className="rounded-2xl border border-black/10 bg-white p-5 text-sm">{t.ouvert ? 'Tournoi terminé pour ce profil : les finalistes sont dans le tableau.' : `Le tournoi s’ouvre à ${CHAINE.ouvertureTournoi} candidats. `}<Link href={`/chaine/preselection?profil=${encodeURIComponent(profil.id)}`} className="font-semibold text-teal-900 underline">Présélectionner</Link></p>
      )}
      {t.classement.length > 0 && (
        <details className="rounded-2xl border border-black/10 bg-white p-3 text-sm">
          <summary className="min-h-11 cursor-pointer font-semibold">Classement agrégé ({t.classement.length})</summary>
          <ol className="mt-2 grid gap-1">
            {t.classement.slice(0, 20).map((l) => <li key={l.id} className="flex gap-2"><span className="w-8 text-right font-semibold">{l.rang}</span><span className="truncate">{fiche(l.id).nom}</span><span className="ml-auto text-neutral-600">{l.n} duels · θ {l.theta.toFixed(2)} ± {l.sigma.toFixed(2)}</span></li>)}
          </ol>
        </details>
      )}
    </div>
  );
}
