import Link from 'next/link';
import { notFound } from 'next/navigation';
import { libellePageModele, modeTestPourEtape, statutModele, ticketsOuverts } from '@plateforme/core';
import BoutonTesterModele from '@/components/BoutonTesterModele';
import RapportTestModele from '@/components/RapportTestModele';
import { lireResultatTestModele } from '@/lib/tests-modeles';
import { exigerContributeur, faireTournerChaine, LECTURE_CHAINE } from '@/lib/chaine-modeles';
import { guidageChaine } from '@/lib/chaine-guidage';
import ProchaineEtape from '../../ProchaineEtape';
import { donneesGeneration, donneesRendu, profilsDemo } from '../../donnees';
import ApercuDesignImages from '../../images-situation';
import { candidatesImagesDemo, lireChoixImages } from '../../donnees-images';
import { verrousDeLaFiche } from '../../validation';
import ApercuModele from '../../ApercuModele';
import Validation from './Validation';

export const metadata = { title: 'Chaîne · Fiche du modèle' };

// Fiche d'un modèle : versions et journal des corrections, tickets, qui a la main, et 8. VALIDATION FINALE (Paul) : verrous
// automatiques, tags pré-remplis à vérifier, « Publier pour les praticiens ». Après publication, signaler une zone rouvre une
// retouche sans dépublier.
export default async function PageFiche({ params }: { params: Promise<{ id: string }> }) {
  const moi = await exigerContributeur();
  const { id } = await params;
  const { chaine } = await faireTournerChaine(null);
  const f = chaine.fiches.find((x) => x.id === id);
  // Lecture en échec (délai) : message et lien, pas une page « introuvable »
  if (!f && chaine.erreurLecture) return <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" data-erreur-lecture="">{LECTURE_CHAINE} <Link href={`/chaine`} className="font-semibold underline">Tableau de la chaîne</Link></p>;
  if (!f) notFound();
  // Chaîne guidée : prochaine étape de la profession du modèle (bandeau compact : on travaille déjà ici)
  const { action } = await guidageChaine({ moi, profession: f.profession, chaine, autoImport: false });
  const [rendu, { verrous, jauge, bloquants }, rapport, gen, demo, choix] = await Promise.all([donneesRendu(), verrousDeLaFiche(f, chaine), lireResultatTestModele(f.id, f.versionCourante).catch(() => null), donneesGeneration(), profilsDemo(), lireChoixImages()]);
  const candidates = f.profil === null ? await candidatesImagesDemo(choix.lignes) : {};
  // Design (profil nul) : rendu avec le kit de chaque profil compatible (tags pré-calculés, confirmés par Paul)
  const compatibles = demo.profils.filter((p) => f.tags.profils.includes(p.id));
  const profilsRendu = compatibles.length ? compatibles : demo.profils;
  const modeTest = modeTestPourEtape(f.statut);
  const versions = chaine.versions.filter((v) => v.modele === f.id).sort((a, b) => b.version - a.version);
  const courante = versions.find((v) => v.version === f.versionCourante);
  const tickets = chaine.tickets.filter((t) => t.modele === f.id).sort((a, b) => b.numero - a.numero);
  const st = statutModele(f.statut);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div>
        <ProchaineEtape action={action} compact ici={`/chaine/modele/${f.id}`} />
        <p className="mt-2 text-sm"><Link href="/chaine" className="inline-flex min-h-11 items-center font-semibold text-teal-900 underline">← Tableau</Link></p>
        <h1 className="mt-1 text-2xl font-bold">{f.nom}</h1>
        <p className="mt-1 text-sm text-neutral-700" data-statut={f.statut}>Étape {st.etape} · {st.libelle} · v{f.versionCourante}{f.versionPubliee ? ` · en ligne : v${f.versionPubliee}` : ''}{f.rang ? ` · rang ${f.rang} au tournoi` : ''} · {ticketsOuverts(tickets).length} ticket(s) ouvert(s)</p>
        <p className="text-sm text-neutral-600">Fini quand : {st.fini}</p>
        {/* Geste de l'étape au premier écran (téléphone : l'aperçu et la validation font plusieurs écrans) */}
        {modeTest && <div className="mt-2"><BoutonTesterModele modele={f.id} version={f.versionCourante} mode={modeTest} /></div>}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid min-w-0 content-start gap-2">
          {courante && (f.profil === null
            ? <ApercuDesignImages modele={f.id} design={courante.composition} profils={profilsRendu} poids={gen.poids} photos={gen.photos} rendu={rendu} hauteur={480} scenarioDefaut={f.scenario} candidates={candidates} choix={choix.lignes.filter((l) => l.modele === f.id)} migrationImages={choix.migrationManquante} />
            : <ApercuModele composition={courante.composition} scenario={f.scenario} rendu={rendu} appareil="ordinateur" hauteur={480} />)}
          {f.profil === null && <p className="text-xs text-neutral-600" data-profils-compatibles={compatibles.length}>Profils compatibles (pré-calculés, à confirmer dans les tags) : {compatibles.map((p) => p.nom).join(', ') || 'aucun'}</p>}
          <Link href={`/chaine/revision/${f.id}`} className="inline-flex min-h-11 items-center justify-self-start rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold" data-action="signaler">{f.statut === 'publie' ? 'Signaler une zone (rouvre une retouche, reste en ligne)' : f.statut === 'pret-validation' ? 'Publier (relecture guidée)' : 'Relecture guidée'}</Link>
        </div>
        <Validation
          modele={f.id}
          validateur={moi.role === 'validateur'}
          statut={f.statut}
          verrous={verrous}
          jauge={jauge ? jauge.texte : null}
          bloquants={bloquants}
          tags={f.tags}
          tagsValides={f.tagsValides}
          verdict={courante?.test?.verdict ?? null}
          justification={f.justificationVersion === f.versionCourante ? f.justificationTest ?? null : null}
        />
      </div>
      <section aria-labelledby="fi-test" className="grid gap-2">
        <h2 id="fi-test" className="font-semibold">Testeur de modèles · v{f.versionCourante}</h2>
        <RapportTestModele resultat={rapport} />
      </section>
      <section aria-labelledby="fi-versions" className="grid gap-2">
        <h2 id="fi-versions" className="font-semibold">Versions</h2>
        <ol className="grid gap-1 text-sm">
          {versions.map((v) => (
            <li key={v.version} className="rounded-lg bg-white px-3 py-2 ring-1 ring-black/5" data-version={v.version}>
              <span className="font-semibold">v{v.version}</span> · {v.auteur === 'claude' ? 'Claude' : v.auteur === 'testeur' ? 'agent' : 'équipe'} · testeur : {v.test ? v.test.verdict : '—'}
              <ul className="mt-1 list-disc pl-5 text-neutral-700">{v.journal.map((l, i) => <li key={i}>{l.texte}</li>)}</ul>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="fi-tickets" className="grid gap-2">
        <h2 id="fi-tickets" className="font-semibold">Tickets</h2>
        <ul className="grid gap-1 text-sm">
          {tickets.map((t) => <li key={t.numero} className="rounded-lg bg-white px-3 py-2 ring-1 ring-black/5">#{t.numero} · {t.origine === 'testeur' ? 'agent' : 'humain'} · {libellePageModele(t.page)} ({t.appareil}) · {t.etiquette}{t.commentaire ? ` : ${t.commentaire}` : ''} · <em>{t.statut}</em> · v{t.versionOuverture}{t.versionCorrection ? ` → v${t.versionCorrection}` : ''}</li>)}
          {!tickets.length && <li className="text-neutral-600">Aucun ticket.</li>}
        </ul>
      </section>
    </div>
  );
}
