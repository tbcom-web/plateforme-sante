import { modeleIntegre, normaliserComposition, resumeRenforts, universDuParcours } from '@plateforme/core';
import Link from 'next/link';
import { exigerAdmin } from '@/lib/admin';
import { getPoidsAtelier } from '@/lib/atelier';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getPhotosBanque, getRecettes } from '@/lib/recettes';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import { getAvisDirecteur, getManques, getPropositionsClaude } from '@/lib/directeur';
import { dernieresDecisions } from '@/lib/directeur-format';
import Studio from './Studio';
import ManquesSignales from './ManquesSignales';
import type { DetailOuvrir } from './PropositionsClaude';

export const metadata = { title: 'Super admin · Studio de recettes' };

// Studio de recettes (niveau 3 de docs/ingredients-recettes.md), réorganisé le 2026-10-08 (retour de Paul : « le studio devient
// un peu chaotique… créer des recettes élégantes et les enregistrer… focus sur la sélection des zones à améliorer… laisser la
// possibilité de bloquer certains éléments ») : un seul geste — composer (dés et verrous rangés en six groupes), affiner (« À
// améliorer » : zones tracées sur l'aperçu), enregistrer (nom proposé, une appréciation facultative, zones jointes).
// Les propositions de Claude ne prennent plus de place ici : lien compact vers leur tuile de notation (/admin/retours/recettes),
// qui rouvre une proposition dans le Studio par `?proposition=<id>` (ou une recette par `?recette=<id>`).
export default async function PageStudio({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const params = await searchParams;
  const [modeles, catalogue, marquesImportees, { univers }, poids, photos, { recettes, migrationManquante }] = await Promise.all([
    getModelesDisponibles(), getCatalogue(), getMarquesImportees(), getUnivers(), getPoidsAtelier(), getPhotosBanque({ nonImportees: true }), getRecettes(),
  ]);
  // Directeur artistique (.claude/agents/directeur-artistique.md) : propositions (lien compact) et manques signalés (onglet du bas)
  const [lotClaude, manques, { avis }] = await Promise.all([getPropositionsClaude(), getManques(), getAvisDirecteur()]);
  const decisions = dernieresDecisions(avis, 'proposition');
  const aNoter = lotClaude.propositions.filter((p) => !decisions[p.id]).length;

  // Ouverture par l'adresse (tuile de notation des recettes complètes : « Ouvrir dans le Studio »)
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  const idProposition = un(params.proposition);
  const p = idProposition ? lotClaude.propositions.find((x) => x.id === idProposition) : undefined;
  const composition = p ? normaliserComposition(p.composition, { sujets: p.scenario.sujets, principaux: p.scenario.principaux.length, couleursPreferees: p.scenario.couleurs, modele: modeleIntegre }) : null;
  const propositionInitiale: DetailOuvrir | null = p && composition
    ? { nom: p.nom, sujets: p.scenario.sujets, couleurs: p.scenario.couleurs, composition, scenario: { principaux: p.scenario.principaux, secondaires: p.scenario.secondaires, couleurs: p.scenario.couleurs, soins: p.scenario.soins } }
    : null;
  const recetteInitiale = un(params.recette);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-sm"><Link href="/admin/cuisine/atelier" className="font-semibold text-teal-900 underline">← Atelier</Link></p>
          <h1 className="mt-1 text-2xl font-bold">Studio de recettes</h1>
          <p className="mt-0.5 text-sm text-neutral-600">Composer, signaler ce qui est à améliorer, enregistrer. Garde-fous toujours actifs (contrastes, diabète sans rouge vif, posture jamais).</p>
        </div>
        {lotClaude.propositions.length > 0 && (
          <Link href="/admin/retours/recettes" className="flex min-h-11 items-center rounded-lg px-1 text-sm font-semibold text-teal-900 underline">
            {aNoter > 0 ? `${aNoter} recette${aNoter > 1 ? 's' : ''} de Claude à noter →` : 'Recettes de Claude →'}
          </Link>
        )}
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration 0032 à exécuter (<code>supabase/migrations/0032_recettes.sql</code>) : le studio fonctionne, mais les recettes ne peuvent pas encore être enregistrées.
        </p>
      )}
      <Studio
        proposes={universDuParcours(univers)}
        modeles={modeles}
        catalogue={catalogue}
        marquesImportees={marquesImportees}
        themesActives={themesActives()}
        poids={poids}
        photos={photos}
        recettes={recettes}
        renforts={resumeRenforts(recettes, 8)}
        migrationManquante={migrationManquante}
        propositionInitiale={propositionInitiale}
        recetteInitiale={recetteInitiale}
        manques={manques.length ? { nombre: manques.length, contenu: <ManquesSignales manques={manques} avis={avis} /> } : null}
      />
    </div>
  );
}
