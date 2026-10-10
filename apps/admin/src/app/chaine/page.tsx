import Link from 'next/link';
import {
  attentesHumain, attentesMachines, CHAINE, compteursChaine, reserveCandidats, tournoiDuProfil, STATUTS_MODELE, statutModele, ticketsOuverts, type Main, type StatutModele,
} from '@plateforme/core';
import { professionDe, professionsAdmin } from '@plateforme/core/professions';
import { exigerContributeur, faireTournerChaine, getEquipe, LECTURE_CHAINE, MIGRATION_CHAINE } from '@/lib/chaine-modeles';
import { getNombreArrivages } from '@/lib/arrivages';
import { profilsDegustation } from '@/lib/degustation';
import { getProfession } from '@/lib/profession';
import { guidageChaine, prechargerGuidage } from '@/lib/chaine-guidage';
import ProchaineEtape from './ProchaineEtape';

export const metadata = { title: 'Chaîne des modèles' };

// Tableau de la chaîne : une colonne par étape avec compteur, qui a la main (agent, humain, Claude, Paul), filtres profession / profil,
// « Ce qui attend un humain » (par personne) et « Ce qui tourne tout seul ». L'ouverture de la page fait tourner l'automate.
const MAINS: Record<Main, { texte: string; classe: string }> = {
  humain: { texte: 'Humain', classe: 'bg-sky-100 text-sky-900' },
  agent: { texte: 'Agent', classe: 'bg-violet-100 text-violet-900' },
  claude: { texte: 'Claude', classe: 'bg-orange-100 text-orange-900' },
  paul: { texte: 'Paul', classe: 'bg-amber-100 text-amber-900' },
  auto: { texte: 'Automatique', classe: 'bg-neutral-100 text-neutral-700' },
  personne: { texte: '—', classe: 'bg-neutral-100 text-neutral-600' },
};
const COLONNES: StatutModele[] = ['candidat', 'finaliste', 'check-agent', 'avis-humain', 'retouche', 'recheck-agent', 'revalidation', 'pret-validation', 'publie'];

export default async function TableauChaine({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const moi = await exigerContributeur();
  prechargerGuidage();
  const sp = await searchParams;
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const profession = un(sp.profession) ? professionDe(un(sp.profession)) : await getProfession();
  const pd = { id: profession.id, libelle: profession.court || profession.libelle, parDefaut: profession.id, specialites: profession.specialites };
  const [profils, bilan, equipe, arrivages] = await Promise.all([
    profilsDegustation(pd), faireTournerChaine(profession.id), getEquipe(), getNombreArrivages(profession).catch(() => null),
  ]);
  // Chaîne guidée : LA prochaine étape (tournoi calculé une fois, réutilisé par la colonne « Candidat ») ; import automatique des
  // designs de Claude s'il manque des candidats pour ouvrir le tournoi (la chaîne est alors relue)
  const candDesigns = (c: typeof bilan.chaine) => c.fiches.filter((f) => f.profil === null && f.statut === 'candidat').map((f) => f.id);
  const t0 = candDesigns(bilan.chaine).length ? tournoiDuProfil(bilan.chaine, candDesigns(bilan.chaine)) : null;
  const guide = await guidageChaine({ moi, profession: profession.id, chaine: bilan.chaine, tournoi: t0 });
  const chaine = guide.chaine;
  const tournoi = guide.importes ? (candDesigns(chaine).length ? tournoiDuProfil(chaine, candDesigns(chaine)) : null) : t0;
  const filtre = un(sp.profil);
  const fiches = chaine.fiches.filter((f) => !filtre || f.profil === filtre);
  const comptes = compteursChaine(fiches);
  // Designs (profil nul) : « tous profils » ; anciens modèles : nom du profil
  const nomProfil = (id: string | null) => (id ? profils.find((p) => p.id === id)?.nom ?? id : 'Design (profils compatibles)');
  const etat = { ...chaine, fiches };
  const personnes = moi.role === 'validateur' && equipe.length ? equipe : [{ id: moi.id, email: moi.email, role: moi.role }];
  const profilsVus = profils.filter((p) => !filtre || p.id === filtre).map((p) => ({ id: p.id, nom: p.nom, profession: profession.id }));
  const machines = attentesMachines(etat);
  const enBoucle = fiches.filter((f) => ['check-agent', 'avis-humain', 'retouche', 'recheck-agent', 'revalidation'].includes(f.statut)).length;
  const lien = (o: Record<string, string>) => `/chaine?${new URLSearchParams({ ...(un(sp.profession) ? { profession: profession.id } : {}), ...(filtre ? { profil: filtre } : {}), ...o }).toString()}`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <h1 className="text-2xl font-bold">Chaîne de production des modèles</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Suivez la prochaine étape : tout le reste avance seul. L’équipe choisit, vote et relit ; Paul valide à la fin.
        </p>
      </div>
      <ProchaineEtape action={guide.action} importes={guide.importes} ici="/chaine" />
      {chaine.migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_CHAINE}</p>}
      {chaine.erreurLecture && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" data-erreur-lecture="">{LECTURE_CHAINE}</p>}

      <form className="flex flex-wrap items-end gap-3 text-sm" action="/chaine">
        <label className="grid gap-1">Profession
          <select name="profession" defaultValue={profession.id} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
            {professionsAdmin().map((p) => <option key={p.id} value={p.id}>{p.court || p.libelle}</option>)}
          </select>
        </label>
        <label className="grid gap-1">Profil
          <select name="profil" defaultValue={filtre} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
            <option value="">Tous les profils</option>
            {profils.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </label>
        <button className="min-h-11 rounded-lg bg-teal-800 px-4 font-semibold text-white">Filtrer</button>
      </form>

      <section aria-labelledby="ch-humain" className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
          <h2 id="ch-humain" className="font-semibold">Ce qui attend un humain</h2>
          <div className="mt-2 grid gap-3">
            {personnes.map((p) => {
              const l = attentesHumain(etat, p, profilsVus);
              return (
                <div key={p.id} data-personne={p.email}>
                  <p className="text-sm font-semibold">{p.id === moi.id ? 'Vous' : p.email} <span className="font-normal text-neutral-600">· {p.role === 'validateur' ? 'validateur' : 'contributeur'} · {l.length} à faire</span></p>
                  <ul className="mt-1 grid gap-1 text-sm">
                    {l.slice(0, 8).map((a, i) => <li key={i}><Link href={a.href} className="flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-black/5 hover:bg-sky-50"><span className="font-medium">{a.nom}</span><span className="text-neutral-600">{a.texte}</span></Link></li>)}
                    {!l.length && <li className="text-neutral-600">Rien pour l’instant.</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
          <h2 className="font-semibold">Ce qui tourne tout seul</h2>
          <ul className="mt-2 grid gap-1 text-sm">
            <li className="text-neutral-700">Génération des candidats, filtre léger, appariements du tournoi, arrêt et finalistes, entrée dans la boucle ({enBoucle} / {CHAINE.maxRevision}), tickets du testeur, priorité des retouches, tags pré-remplis.</li>
            {machines.slice(0, 10).map((a, i) => <li key={i}><Link href={a.href} className="flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-black/5"><span className="font-medium">{a.nom}</span><span className="text-neutral-600">{a.texte}</span></Link></li>)}
          </ul>
          {(bilan.actions.length > 0 || bilan.tests > 0 || bilan.retouches > 0) && (
            <p className="mt-2 text-xs text-neutral-700" data-automate="">À l’instant : {bilan.actions.filter((a) => a.kind === 'statut').length} passage(s) d’étape, {bilan.tests} résultat(s) de test, {bilan.tickets} ticket(s) technique(s), {bilan.retouches} retouche(s) appliquée(s).</p>
          )}
        </div>
      </section>

      <section aria-labelledby="ch-colonnes">
        <h2 id="ch-colonnes" className="sr-only">Étapes</h2>
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <ol className="flex min-w-max gap-3">
            <li className="w-56 shrink-0 rounded-2xl border border-black/10 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">0 · Ingrédients</p>
              <p className="mt-1 text-2xl font-bold">{arrivages ?? '—'}</p>
              <p className="text-sm text-neutral-600">arrivages à trier</p>
              {moi.role === 'validateur' && <Link href="/admin/arrivages" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-teal-900 underline">Arrivages</Link>}
            </li>
            {COLONNES.map((s) => {
              const st = statutModele(s);
              const l = fiches.filter((f) => f.statut === s);
              return (
                <li key={s} className="w-64 shrink-0 rounded-2xl border border-black/10 bg-white p-3" data-colonne={s}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{st.etape} · {st.libelle}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${MAINS[st.main].classe}`}>{MAINS[st.main].texte}</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold" data-compteur={s}>{comptes[s]}</p>
                  {s === 'candidat' && (() => {
                    const r = reserveCandidats(chaine.fiches.filter((f) => f.profession === profession.id), null);
                    return <p className="text-xs text-neutral-600" data-tournoi={tournoi?.certitude ?? 0}>{tournoi?.ouvert ? `${r.texte} · ${tournoi.texte}` : `${r.n} / ${CHAINE.ouvertureTournoi} pour ouvrir le tournoi`}</p>;
                  })()}
                  {s === 'check-agent' && <p className="text-xs text-neutral-600">Boucle : {enBoucle} / {CHAINE.maxRevision}</p>}
                  <ul className="mt-2 grid max-h-80 gap-1.5 overflow-y-auto">
                    {l.slice(0, 30).map((f) => (
                      <li key={f.id}>
                        <Link href={['avis-humain', 'revalidation'].includes(s) ? `/chaine/revision/${f.id}` : `/chaine/modele/${f.id}`} className="block min-h-11 rounded-lg bg-neutral-50 px-2 py-1.5 text-sm ring-1 ring-black/5 hover:bg-teal-50">
                          <span className="block truncate font-medium">{f.nom}</span>
                          <span className="block text-xs text-neutral-600">{nomProfil(f.profil)} · v{f.versionCourante}{f.rang ? ` · rang ${f.rang}` : ''}{ticketsOuverts(chaine.tickets.filter((t) => t.modele === f.id)).length ? ` · ${ticketsOuverts(chaine.tickets.filter((t) => t.modele === f.id)).length} ticket(s)` : ''}{f.versionPubliee && s !== 'publie' ? ` · en ligne v${f.versionPubliee}` : ''}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="mt-2 text-sm text-neutral-600">Écartés : {comptes.ecarte}. <Link className="underline" href={lien({})}>Actualiser</Link> · <Link className="underline" href="/chaine/preselection">Présélectionner</Link> · <Link className="underline" href="/chaine/tournoi">Voter</Link></p>
        <p className="mt-1 text-xs text-neutral-500">Étapes : {STATUTS_MODELE.filter((s) => s.etape > 0).map((s) => `${s.etape}. ${s.libelle} (${MAINS[s.main].texte})`).join(' → ')}</p>
      </section>
    </div>
  );
}
