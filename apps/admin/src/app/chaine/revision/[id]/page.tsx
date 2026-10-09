import Link from 'next/link';
import { notFound } from 'next/navigation';
import { etatRevision, modeTestPourEtape, pagesChangees, statutModele } from '@plateforme/core';
import BoutonTesterModele from '@/components/BoutonTesterModele';
import RapportTestModele from '@/components/RapportTestModele';
import { lireResultatTestModele } from '@/lib/tests-modeles';
import { exigerContributeur, faireTournerChaine } from '@/lib/chaine-modeles';
import { donneesGeneration, donneesRendu } from '../../donnees';
import Revision from './Revision';

export const metadata = { title: 'Chaîne · Avis page par page' };

// 4. AVIS HUMAIN page par page (8 pages × ordinateur et téléphone, uniformes pour tous les modèles) après le check de l'agent :
// entourer une zone ou toucher un élément + étiquette + commentaire → ticket ; 🔒 verrouiller ce qui plaît, 🎲 relancer le reste ;
// « Rien à signaler sur cette page ». 7. REVALIDATION : seulement ce qui a changé, avant / après, en 1 clic.
export default async function PageRevision({ params }: { params: Promise<{ id: string }> }) {
  const moi = await exigerContributeur();
  const { id } = await params;
  const { chaine } = await faireTournerChaine(null);
  const f = chaine.fiches.find((x) => x.id === id);
  if (!f) notFound();
  const [rendu, gen, rapport] = await Promise.all([donneesRendu(), donneesGeneration(), lireResultatTestModele(f.id, f.versionCourante).catch(() => null)]);
  const modeTest = modeTestPourEtape(f.statut);
  const v = chaine.versions.find((x) => x.modele === f.id && x.version === f.versionCourante) ?? null;
  const prec = chaine.versions.find((x) => x.modele === f.id && x.version === f.versionCourante - 1) ?? null;
  const tickets = chaine.tickets.filter((t) => t.modele === f.id);
  const rev = etatRevision(f.versionCourante, chaine.revues.filter((r) => r.modele === f.id), tickets, prec ? { precedente: prec.version, changees: pagesChangees(prec.composition, v?.composition) } : undefined);
  const st = statutModele(f.statut);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <p className="text-sm"><Link href="/chaine" className="font-semibold text-teal-900 underline">← Tableau</Link> · <Link href={`/chaine/modele/${f.id}`} className="underline">Fiche du modèle</Link></p>
        <h1 className="mt-1 text-2xl font-bold">{f.nom} <span className="text-base font-semibold text-neutral-600">· v{f.versionCourante} · {st.libelle}</span></h1>
      </div>
      {!v ? <p className="text-sm">Version introuvable.</p> : (
        <Revision
          moi={moi.id}
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
        />
      )}
      {/* Rapport du testeur (contrôles, avant / après du re-check, tickets avec vignettes) : surtout utile en revalidation */}
      <details className="rounded-2xl border border-violet-200 bg-white p-3" open={f.statut === 'revalidation'}>
        <summary className="min-h-11 cursor-pointer font-semibold">Rapport du testeur · v{f.versionCourante}</summary>
        <div className="mt-2 grid gap-2">
          {modeTest && <BoutonTesterModele modele={f.id} version={f.versionCourante} mode={modeTest} />}
          <RapportTestModele resultat={rapport} />
        </div>
      </details>
    </div>
  );
}
