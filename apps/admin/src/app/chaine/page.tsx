import Link from 'next/link';
import {
  attentesHumain, attentesMachines, CHAINE, comparerProximite, compteursChaine, etapeVisibleDuStatut, fileVerification, modelesEnRelecture, pastilleVerification, raisonEcart,
  revisionDeFiche, STATUTS_MODELE, statutModele, ticketsOuverts, type FicheModele, type Main, type PastilleVerification, type StatutModele,
} from '@plateforme/core';
import { professionDe, professionsAdmin } from '@plateforme/core/professions';
import { AUTOMATE_INCOMPLET, exigerContributeur, faireTournerChaine, getEquipe, LECTURE_CHAINE, MIGRATION_CHAINE } from '@/lib/chaine-modeles';
import { profilsDegustation } from '@/lib/degustation';
import { getProfession } from '@/lib/profession';
import { guidageChaine, prechargerGuidage } from '@/lib/chaine-guidage';
import ProchaineEtape from './ProchaineEtape';

export const metadata = { title: 'Chaîne des modèles' };
// Passages d'étape de plusieurs modèles au même chargement (entrée en vérification, résultats du testeur) : délai large
export const maxDuration = 300;

// Tableau de la chaîne EN 3 ÉTAPES (décision de Paul du 2026-10-11 : « c'est un peu trop complexe… une seule relecture finale avant
// publication et ajout au catalogue ») : Choisir · Vérification (automatique, une pastille) · Relecture finale, puis le Catalogue. Les
// statuts internes, le tournoi et « ce qui tourne tout seul » restent dans la vue détaillée, repliée. L'ouverture de la page fait
// tourner l'automate, qui lance aussi les tests de la vérification (workflow tester-modele, rien n'est publié).
const MAINS: Record<Main, { texte: string; classe: string }> = {
  humain: { texte: 'Humain', classe: 'bg-sky-100 text-sky-900' },
  agent: { texte: 'Agent', classe: 'bg-violet-100 text-violet-900' },
  claude: { texte: 'Claude', classe: 'bg-orange-100 text-orange-900' },
  paul: { texte: 'Paul', classe: 'bg-amber-100 text-amber-900' },
  auto: { texte: 'Automatique', classe: 'bg-neutral-100 text-neutral-700' },
  personne: { texte: '—', classe: 'bg-neutral-100 text-neutral-600' },
};
const STATUTS_DETAIL: StatutModele[] = ['candidat', 'finaliste', 'check-agent', 'avis-humain', 'retouche', 'recheck-agent', 'revalidation', 'pret-validation', 'publie'];
/** Couleur de la pastille de vérification */
const PASTILLE: Record<PastilleVerification['etat'], string> = {
  file: 'bg-neutral-100 text-neutral-700', 'a-lancer': 'bg-neutral-100 text-neutral-700', 'en-cours': 'bg-violet-100 text-violet-900', bloque: 'bg-red-100 text-red-900',
  corrections: 'bg-orange-100 text-orange-900', 'chez-claude': 'bg-orange-100 text-orange-900', ok: 'bg-teal-100 text-teal-900', ecarte: 'bg-neutral-200 text-neutral-700',
};

export default async function TableauChaine({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const moi = await exigerContributeur();
  prechargerGuidage();
  const sp = await searchParams;
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const profession = un(sp.profession) ? professionDe(un(sp.profession)) : await getProfession();
  const pd = { id: profession.id, libelle: profession.court || profession.libelle, parDefaut: profession.id, specialites: profession.specialites };
  const [profils, bilan, equipe] = await Promise.all([profilsDegustation(pd).catch(() => []), faireTournerChaine(profession.id, { versions: 'utiles' }), getEquipe().catch(() => [])]);
  const { action, chaine } = await guidageChaine({ moi, profession: profession.id, chaine: bilan.chaine });
  const fiches = chaine.fiches.filter((f) => f.profession === profession.id);
  const etat = { ...chaine, fiches };
  const relus = modelesEnRelecture(etat);
  const proximite = comparerProximite(etat);
  const file = fileVerification(etat);
  const suivi = chaine.lancements?.suivi ?? [];
  const pastille = (f: FicheModele) => pastilleVerification(etat, f, suivi, { relus, file });
  const visibles = (id: string) => fiches.filter((f) => etapeVisibleDuStatut(f.statut, relus.has(f.id)) === id);
  const gardes = file.filter((f) => f.statut === 'candidat');
  const verification = visibles('verification').sort(proximite);
  const relecture = visibles('relecture').sort(proximite);
  const catalogue = visibles('catalogue').sort((a, b) => (a.creeLe < b.creeLe ? 1 : -1));
  const ecartes = fiches.filter((f) => f.statut === 'ecarte');
  const comptes = compteursChaine(fiches);
  const personnes = moi.role === 'validateur' && equipe.length ? equipe : [{ id: moi.id, email: moi.email, role: moi.role }];
  const profilsVus = profils.map((p) => ({ id: p.id, nom: p.nom, profession: profession.id }));
  const nbTickets = (f: FicheModele) => ticketsOuverts(chaine.tickets.filter((t) => t.modele === f.id)).length;
  /** Sous-état de la relecture finale, en mots simples */
  const etatRelecture = (f: FicheModele): string => {
    if (f.statut === 'avis-humain') { const r = revisionDeFiche(etat, f); return `${r.faites} / ${r.total} pages vues`; }
    if (f.statut === 'retouche') return `Remarques chez Claude (${nbTickets(f)})`;
    if (f.statut === 'recheck-agent') return 'Version corrigée en vérification';
    if (f.statut === 'revalidation') return 'Pages modifiées à revoir';
    if (f.statut === 'pret-validation') return 'Prêt pour le catalogue';
    return statutModele(f.statut).libelle;
  };
  const carte = (f: FicheModele, texte: string, classe: string, href: string) => (
    <li key={f.id}>
      <Link href={href} className="block min-h-11 rounded-lg bg-neutral-50 px-2 py-1.5 text-sm ring-1 ring-black/5 hover:bg-teal-50" data-modele={f.id}>
        <span className="block truncate font-medium">{f.nom}</span>
        <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${classe}`} data-pastille="">{texte}</span>
      </Link>
    </li>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <h1 className="text-2xl font-bold">Chaîne des modèles</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Trois étapes : vous choisissez, la vérification est automatique, vous relisez une fois avant le catalogue.</p>
      </div>
      <ProchaineEtape action={action} ici="/chaine" />
      {chaine.migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_CHAINE}</p>}
      {(bilan.erreur === 'automate' || bilan.echecs > 0) && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" data-automate-incomplet="">{AUTOMATE_INCOMPLET} <Link href="/chaine" className="font-semibold underline">Recharger</Link></p>}
      {chaine.erreurLecture && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" data-erreur-lecture="">{LECTURE_CHAINE}</p>}

      <section aria-labelledby="ch-etapes" className="grid gap-3">
        <h2 id="ch-etapes" className="sr-only">Les 3 étapes et le catalogue</h2>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <li className="rounded-2xl border border-black/10 bg-white p-3" data-colonne="choisir">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">1 · Choisir</p>
            <p className="mt-1 text-2xl font-bold" data-compteur="choisir">{gardes.length}</p>
            <p className="text-sm text-neutral-600">gardé{gardes.length > 1 ? 's' : ''} en file · {CHAINE.maxVerification} vérifiés à la fois, les plus aimés d’abord</p>
            <Link href="/chaine/preselection" className="mt-2 flex min-h-11 items-center justify-center rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white" data-action="choisir">Choisir des designs</Link>
            <Link href="/chaine/composer" className="mt-2 flex min-h-11 items-center justify-center rounded-lg border border-teal-800 px-4 text-sm font-semibold text-teal-900" data-action="composer-profil">Proposer pour un profil</Link>
            <ul className="mt-2 grid max-h-72 gap-1.5 overflow-y-auto">
              {gardes.slice(0, 12).map((f, k) => carte(f, `${k + 1}${k ? 'e' : 'er'} de la file`, PASTILLE.file, `/chaine/modele/${f.id}`))}
            </ul>
          </li>
          <li className="rounded-2xl border border-black/10 bg-white p-3" data-colonne="verification">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">2 · Vérification <span className="font-normal normal-case tracking-normal">· automatique</span></p>
            <p className="mt-1 text-2xl font-bold" data-compteur="verification">{verification.length}</p>
            <p className="text-sm text-neutral-600">Le testeur passe chaque page, téléphone et ordinateur.</p>
            <ul className="mt-2 grid max-h-72 gap-1.5 overflow-y-auto">
              {verification.map((f) => { const p = pastille(f); return carte(f, p.texte, PASTILLE[p.etat], p.etat === 'corrections' ? `/chaine/revision/${f.id}` : `/chaine/modele/${f.id}`); })}
              {!verification.length && <li className="text-sm text-neutral-600">Rien en cours.</li>}
            </ul>
          </li>
          <li className="rounded-2xl border border-black/10 bg-white p-3" data-colonne="relecture">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">3 · Relecture finale</p>
            <p className="mt-1 text-2xl font-bold" data-compteur="relecture">{relecture.length}</p>
            <p className="text-sm text-neutral-600">Une seule relecture, page par page ; les corrections reviennent en avant / après.</p>
            <ul className="mt-2 grid max-h-72 gap-1.5 overflow-y-auto">
              {relecture.map((f) => carte(f, etatRelecture(f), f.statut === 'pret-validation' ? 'bg-amber-100 text-amber-900' : f.statut === 'retouche' || f.statut === 'recheck-agent' ? PASTILLE['chez-claude'] : 'bg-sky-100 text-sky-900', `/chaine/revision/${f.id}`))}
              {!relecture.length && <li className="text-sm text-neutral-600">Rien à relire pour l’instant.</li>}
            </ul>
          </li>
          <li className="rounded-2xl border border-teal-200 bg-teal-50/50 p-3" data-colonne="catalogue">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-900">Catalogue</p>
            <p className="mt-1 text-2xl font-bold" data-compteur="catalogue">{catalogue.length}</p>
            <p className="text-sm text-neutral-600">Modèles proposés aux praticiens.</p>
            <ul className="mt-2 grid max-h-72 gap-1.5 overflow-y-auto">
              {catalogue.map((f) => carte(f, `En ligne · v${f.versionPubliee ?? f.versionCourante}`, PASTILLE.ok, `/chaine/revision/${f.id}`))}
            </ul>
          </li>
        </ol>
        {ecartes.length > 0 && (
          <details className="text-sm text-neutral-700">
            <summary className="flex min-h-11 cursor-pointer items-center">Écartés : {ecartes.length}</summary>
            <ul className="mt-1 grid gap-1">
              {ecartes.slice(-8).reverse().map((f) => <li key={f.id}><Link href={`/chaine/modele/${f.id}`} className="inline-flex min-h-11 items-center gap-2 underline-offset-2 hover:underline"><span className="font-medium">{f.nom}</span><span className="text-neutral-600">{raisonEcart(etat, f)}</span></Link></li>)}
            </ul>
          </details>
        )}
        {(bilan.actions.length > 0 || bilan.tests > 0 || bilan.retouches > 0 || (bilan.testsLances ?? 0) > 0) && (
          <p className="text-xs text-neutral-700" data-automate="">À l’instant : {bilan.actions.filter((a) => a.kind === 'statut').length} passage(s) d’étape, {bilan.testsLances ?? 0} vérification(s) lancée(s), {bilan.tests} résultat(s) reçu(s), {bilan.retouches} correction(s) appliquée(s).</p>
        )}
        {chaine.lancements && !chaine.lancements.configure && verification.some((f) => f.statut === 'check-agent' || f.statut === 'recheck-agent') && (
          <p className="text-xs text-neutral-700" data-lancement-auto="non">Lancement automatique du testeur indisponible ici (GitHub non configuré) : « Lancer le test » sur la fiche du modèle.</p>
        )}
      </section>

      <details className="rounded-2xl border border-black/10 bg-white p-3" data-vue-detaillee="">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Vue détaillée (statuts internes, tournoi, équipe)</summary>
        <div className="mt-3 grid gap-5">
          <form className="flex flex-wrap items-end gap-3 text-sm" action="/chaine">
            <label className="grid gap-1">Profession
              <select name="profession" defaultValue={profession.id} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
                {professionsAdmin().map((p) => <option key={p.id} value={p.id}>{p.court || p.libelle}</option>)}
              </select>
            </label>
            <button className="min-h-11 rounded-lg bg-teal-800 px-4 font-semibold text-white">Afficher</button>
          </form>
          <p className="text-sm text-neutral-700">Le tournoi n’est plus une étape : il reste ouvert pour comparer des gardés, sans rien décider. <Link className="inline-flex min-h-11 items-center font-semibold text-teal-900 underline" href="/chaine/tournoi">Ouvrir le tournoi</Link></p>
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
                <li className="text-neutral-700">Entrée en vérification ({verification.length} / {CHAINE.maxVerification}), lancement du testeur ({CHAINE.testsParalleles} en parallèle au plus), défauts techniques, écart des designs toujours au rouge après correction, tags pré-remplis.</li>
                {attentesMachines(etat).slice(0, 10).map((a, i) => <li key={i}><Link href={a.href} className="flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-black/5"><span className="font-medium">{a.nom}</span><span className="text-neutral-600">{a.texte}</span></Link></li>)}
              </ul>
            </div>
          </section>
          <section aria-labelledby="ch-statuts">
            <h2 id="ch-statuts" className="font-semibold">Statuts internes</h2>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {STATUTS_DETAIL.map((s) => {
                const st = statutModele(s);
                return <li key={s} className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 ring-1 ring-black/5" data-statut-interne={s}><span>{st.libelle}</span><span className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${MAINS[st.main].classe}`}>{MAINS[st.main].texte}</span><span className="font-bold" data-compteur={s}>{comptes[s]}</span></span></li>;
              })}
            </ul>
            <p className="mt-2 text-xs text-neutral-500">Moteur : {STATUTS_MODELE.filter((s) => s.etape > 0).map((s) => s.libelle).join(' → ')}. Écartés : {comptes.ecarte}.</p>
          </section>
        </div>
      </details>
    </div>
  );
}
