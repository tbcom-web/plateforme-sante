import Link from 'next/link';
import { activitesProposees, ingredientsDirection, meilleursProfils, pratiqueDe, profilsDePratique, serialiserComposition, themePratique } from '@plateforme/core';
import { sujetsDuProfilComposeur } from '@plateforme/core/composeur';
import { exigerContributeur } from '@/lib/chaine-modeles';
import { professionDegustation } from '@/lib/degustation';
import { profilDepuisParametre, propositionsComposeur } from '@/lib/composeur';
import { donneesRendu } from '../donnees';
import ChoixProfil from './ChoixProfil';
import Propositions, { type PropositionAffichee } from './Propositions';

export const metadata = { title: 'Chaîne · Proposer pour un profil' };
// « Garder » écrit fiche puis version pour chaque design (comme la présélection) ; premier calcul du composeur (~2 s) compris
export const maxDuration = 300;

// COMPOSEUR (étape 1 « Choisir », demande de Paul du 2026-10-11) : on choisit un profil de cabinet (profil de pratique, ou composition
// libre « Sport + Diabète ») ; le composeur assemble seul, à partir des éléments 4-5 ★ / validés et des images validées du profil, ses
// ~8 plus beaux modèles, tous différents. Montrés en grand, en situation (téléphone d'abord), avec « pourquoi ce choix » et ce qui
// manque ; « Garder » = la même action que la présélection (vérification automatique ensuite).
export default async function PageComposer({ searchParams }: PageProps<'/chaine/composer'>) {
  await exigerContributeur();
  const [sp, prof] = await Promise.all([searchParams, professionDegustation()]);
  const param = typeof sp.profil === 'string' ? sp.profil : '';
  const pr = pratiqueDe(prof.id);
  const references = profilsDePratique(prof.id).filter((p) => p.principal).map((p) => ({ id: p.id, nom: p.court }));
  const themes = pr.themes.filter((t) => t.actif).map((t) => ({ id: t.id, nom: t.court }));
  const activites = activitesProposees(pr, themes.map((t) => t.id)).map((a) => ({ id: a.id, nom: a.libelle, themes: [...a.themes] }));
  const profil = profilDepuisParametre(param, prof.id);
  const [r, rendu] = profil ? await Promise.all([propositionsComposeur(param), donneesRendu()]) : [null, null];

  let propositions: PropositionAffichee[] = [];
  let scenario = { principaux: [] as string[], secondaires: [] as string[], couleurs: [] as string[] };
  let profilDemo = references[0]?.id ?? '';
  if (profil && r) {
    const sujets = sujetsDuProfilComposeur(profil);
    const np = Math.max(1, profil.principaux.length);
    scenario = { principaux: sujets.slice(0, np), secondaires: sujets.slice(np), couleurs: [] };
    // Profil de démonstration enregistré avec le design gardé : le profil de pratique lui-même, sinon le plus proche
    profilDemo = profil.id ?? meilleursProfils({ profession: prof.id, principaux: profil.principaux, secondaires: profil.secondaires, activites: profil.activites }, { n: 1, seuil: 0 })[0]?.profil.id ?? profilDemo;
    propositions = r.propositions.map((x, i) => ({
      cle: x.cle, nom: `${x.nomFamille} · ${r.profil.nom}`.slice(0, 120), design: x.design, rendue: JSON.parse(serialiserComposition(x.x)),
      ingredients: ingredientsDirection(x.x, sujets, x.famille) as unknown as Record<string, unknown>, legende: x.legende, pourquoi: x.pourquoi, score: Math.round(x.score), rang: i + 1,
      qualite: x.qualite, replis: x.replis.length,
    }));
  }
  const nomThemes = (ids: readonly string[]) => ids.map((s) => themePratique(pr, s)?.court ?? s).join(', ');

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <p className="text-sm"><Link href="/chaine/preselection" className="underline">← Choisir</Link></p>
        <h1 className="text-2xl font-bold">Proposer des modèles pour un profil</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Choisissez un cabinet type : le composeur assemble seul ses plus beaux modèles avec les éléments notés 4-5 ★ et les images validées de ce profil. Gardez ceux qui vous plaisent, la vérification suit seule.</p>
      </div>
      <ChoixProfil references={references} themes={themes} activites={activites} actuel={param} />
      {param && !profil && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Profil inconnu : choisissez-en un ci-dessus.</p>}
      {profil && r && rendu && (
        <section aria-labelledby="cp-titre" className="grid gap-3" data-composeur={r.param}>
          <div>
            <h2 id="cp-titre" className="text-lg font-semibold">{r.profil.nom} : {propositions.length} modèle{propositions.length > 1 ? 's' : ''} proposé{propositions.length > 1 ? 's' : ''}</h2>
            <p className="text-sm text-neutral-600">Une ambiance pour tout le site ({nomThemes(r.profil.sujets)}) ; chaque page de thème garde ses images. {r.stats.candidats} compositions essayées, {r.stats.admis} dans les règles.</p>
          </div>
          {!propositions.length && <p className="rounded-lg bg-neutral-50 p-3 text-sm">Aucune composition assez belle pour ce profil pour l’instant : voir ce qui manque ci-dessous.</p>}
          <Propositions propositions={propositions} scenario={scenario} rendu={rendu} profilDemo={profilDemo} nomProfil={r.profil.nom} />
          {r.manques.length > 0 && (
            <details className="rounded-xl border border-black/10 bg-white p-3 text-sm" data-manques={r.manques.length}>
              <summary className="min-h-11 cursor-pointer font-semibold">Ce qui manque pour ce profil ({r.manques.length})</summary>
              <p className="mt-1 text-neutral-600">Le composeur a dû se replier sur ces emplacements : à créer ou à noter (futur Atelier des manques).</p>
              <ul className="mt-2 grid gap-1.5">
                {r.manques.map((m) => <li key={m.id} className="rounded-lg bg-neutral-50 px-2 py-1.5" data-manque={m.id}>{m.texte}{m.frequence > 1 ? ` · ${m.frequence} modèles` : ''}</li>)}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
