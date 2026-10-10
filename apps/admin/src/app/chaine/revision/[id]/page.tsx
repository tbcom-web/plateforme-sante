import Link from 'next/link';
import { notFound } from 'next/navigation';
import { demandeCorrectionsModele, etapeVisible, etatRevision, modelesEnRelecture, modeTestPourEtape, pagesChangees, pastilleVerification, statutModele } from '@plateforme/core';
import BoutonTesterModele from '@/components/BoutonTesterModele';
import RapportTestModele from '@/components/RapportTestModele';
import { lireResultatTestModele } from '@/lib/tests-modeles';
import { exigerContributeur, faireTournerChaine, LECTURE_CHAINE } from '@/lib/chaine-modeles';
import { guidageChaine } from '@/lib/chaine-guidage';
import ProchaineEtape from '../../ProchaineEtape';
import { donneesGeneration, donneesRendu, profilsDemo } from '../../donnees';
import { candidatesImagesDemo, lireChoixImages } from '../../donnees-images';
import { verrousDeLaFiche } from '../../validation';
import Revision from './Revision';

export const metadata = { title: 'Chaîne · Relecture finale' };

// RELECTURE FINALE (demande de Paul du 2026-10-10, une seule relecture depuis la chaîne en 3 étapes du 2026-10-11) : avis page par
// page (8 pages × téléphone puis ordinateur, une à la fois : ✓ Page OK ou ✎ Il manque / à corriger), récapitulatif et envoi des
// remarques à Claude ; pages modifiées seulement, avant / après ; écran « Ajouter au catalogue » (Paul). Avant la relecture : écran
// d'attente de la vérification automatique (corrections techniques : « Envoyer à Claude »). Structure figée dès « finaliste » :
// seules les images se choisissent, en situation.
export default async function PageRevision({ params }: { params: Promise<{ id: string }> }) {
  const moi = await exigerContributeur();
  const { id } = await params;
  const { chaine } = await faireTournerChaine(null);
  const f = chaine.fiches.find((x) => x.id === id);
  // Lecture en échec (délai) : message et lien, pas une page « introuvable »
  if (!f && chaine.erreurLecture) return <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" data-erreur-lecture="">{LECTURE_CHAINE} <Link href={`/chaine`} className="font-semibold underline">Tableau de la chaîne</Link></p>;
  if (!f) notFound();
  // Chaîne guidée : prochaine étape de la profession du modèle (bandeau compact : on travaille déjà ici)
  const { action } = await guidageChaine({ moi, profession: f.profession, chaine });
  const [rendu, gen, rapport, demo, choix] = await Promise.all([donneesRendu(), donneesGeneration(), lireResultatTestModele(f.id, f.versionCourante).catch(() => null), profilsDemo(), lireChoixImages()]);
  const candidates = f.profil === null ? await candidatesImagesDemo(choix.lignes) : {};
  const publication = f.statut === 'pret-validation' || f.statut === 'publie' ? await verrousDeLaFiche(f, chaine).then((x) => x.verrous).catch(() => []) : null;
  const compatibles = demo.profils.filter((p) => f.tags.profils.includes(p.id));
  const modeTest = modeTestPourEtape(f.statut);
  const v = chaine.versions.find((x) => x.modele === f.id && x.version === f.versionCourante) ?? null;
  const prec = chaine.versions.find((x) => x.modele === f.id && x.version === f.versionCourante - 1) ?? null;
  const tickets = chaine.tickets.filter((t) => t.modele === f.id);
  const rev = etatRevision(f.versionCourante, chaine.revues.filter((r) => r.modele === f.id), tickets, prec ? { precedente: prec.version, changees: pagesChangees(prec.composition, v?.composition) } : undefined);
  const st = statutModele(f.statut);
  const relu = modelesEnRelecture(chaine).has(f.id);
  const suivi = chaine.lancements?.suivi ?? [];
  const verification = pastilleVerification(chaine, f, suivi);
  const etape = etapeVisible(chaine, f);
  // Lancement à la main seulement si la vérification automatique est bloquée ou indisponible (GitHub non configuré)
  const testMain = Boolean(modeTest && (verification.etat === 'bloque' || (verification.etat === 'a-lancer' && chaine.lancements && !chaine.lancements.configure)));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <ProchaineEtape action={action} compact ici={`/chaine/revision/${f.id}`} />
        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-sm"><Link href="/chaine" className="inline-flex min-h-11 items-center font-semibold text-teal-900 underline">← Tableau</Link><Link href={`/chaine/modele/${f.id}`} className="inline-flex min-h-11 items-center underline">Fiche du modèle</Link></p>
        <h1 className="mt-1 text-2xl font-bold">{f.nom} <span className="text-base font-semibold text-neutral-600">· v{f.versionCourante} · {etape === 'choisir' ? 'Gardé' : etape === 'verification' ? 'Vérification' : etape === 'catalogue' ? 'Au catalogue' : etape === 'relecture' ? 'Relecture finale' : st.libelle}</span></h1>
        <p className="mt-1 text-sm text-neutral-600" data-verification={verification.etat}><span className="hidden sm:inline">Relecture finale : une page à la fois, jusqu’au catalogue. </span>{verification.texte}.</p>
      </div>
      {!v ? <p className="text-sm">Version introuvable.</p> : (
        <Revision
          moi={moi.id}
          validateur={moi.role === 'validateur'}
          fiche={{ id: f.id, statut: f.statut, version: f.versionCourante, scenario: f.scenario, nom: f.nom }}
          composition={v.composition}
          precedente={prec?.composition ?? null}
          journal={v.journal}
          test={v.test ? { verdict: v.test.verdict, controles: v.test.controles.filter((c) => c.verdict !== 'vert').map((c) => `${c.libelle}${c.detail ? ` : ${c.detail}` : ''}`) } : null}
          tickets={tickets}
          cellules={rev.cellules}
          rendu={rendu}
          poids={gen.poids}
          photos={gen.photos}
          profilsRendu={f.profil === null ? (compatibles.length ? compatibles : demo.profils) : []}
          candidates={candidates}
          choix={choix.lignes.filter((l) => l.modele === f.id)}
          migrationImages={choix.migrationManquante}
          demande={{ titre: relu ? `Corrections du modèle ${f.nom}` : `Corrections techniques du modèle ${f.nom}`, texte: demandeCorrectionsModele(f, tickets) }}
          relu={relu}
          verification={verification}
          publication={publication ? {
            verrous: publication,
            profils: demo.profils.map((x) => ({ id: x.id, nom: x.nom, coche: f.tags.profils.length ? f.tags.profils.includes(x.id) : compatibles.some((c) => c.id === x.id) })),
            publies: demo.profils.filter((x) => f.tags.profils.includes(x.id)).map((x) => x.nom),
          } : null}
        />
      )}
      {/* Rapport du testeur (contrôles, avant / après du re-check, tickets avec vignettes) : surtout utile en revalidation */}
      <details className="rounded-2xl border border-violet-200 bg-white p-3" open={f.statut === 'revalidation'}>
        <summary className="min-h-11 cursor-pointer font-semibold">Rapport de la vérification · v{f.versionCourante}</summary>
        <div className="mt-2 grid gap-2">
          {testMain && moi.role === 'validateur' && modeTest && <BoutonTesterModele modele={f.id} version={f.versionCourante} mode={modeTest} />}
          <RapportTestModele resultat={rapport} />
        </div>
      </details>
    </div>
  );
}
