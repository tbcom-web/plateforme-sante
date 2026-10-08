import Link from 'next/link';
import * as core from '@plateforme/core';
import { clesRefusees, normaliserScenario, palmaresNotation, SCENARIOS_TYPES, scenarioDeRecette, libelleScenario, statsNotation, universDuParcours, type ScenarioRecette } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getPoidsAtelier } from '@/lib/atelier';
import { getPropositionsClaude } from '@/lib/directeur';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getLignesAssetsApprentissage, getNotationsAdmin, getNotationsApprentissage } from '@/lib/notation-recettes';
import { getPhotosBanque, getRecettes } from '@/lib/recettes';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import NotationRecettes from './NotationRecettes';

export const metadata = { title: 'Super admin · Recettes complètes' };

// Tuile « Recettes complètes » (demande de Paul du 2026-10-08) : une recette entière à la fois (générée par le système sans Claude,
// ou proposée par Claude), aperçu ordinateur + téléphone, étoiles, Pour / Contre, « Garder cette recette ». Chaque note se
// répercute EN DIRECT sur les ingrédients et leurs combinaisons (packages/core/src/notation-recettes.ts, migration 0038) ; onglet
// « Ce que le système a appris » : palmarès auto-noté par sujet.
export default async function PageRecettesCompletes() {
  await exigerAdmin();
  const [modeles, catalogue, marquesImportees, { univers }, poids, photos, { recettes }, lot, { notations, migrationManquante }, apprentissage, lignesAssets] = await Promise.all([
    getModelesDisponibles(), getCatalogue(), getMarquesImportees(), getUnivers(), getPoidsAtelier(), getPhotosBanque(), getRecettes(), getPropositionsClaude(),
    getNotationsAdmin(), getNotationsApprentissage(), getLignesAssetsApprentissage(),
  ]);
  const stats = statsNotation(apprentissage);
  const refusees = [...clesRefusees({ assets: lignesAssets, stats })];
  // « À valider » : statut « à revoir » de la bibliothèque, et nouveaux ingrédients déclarés à valider par le core (premiers écrans
  // du lot 2, animations d'en-tête : INGREDIENTS_A_VALIDER, lu s'il existe) — seulement en exploration, signalés
  const declares = (core as unknown as { INGREDIENTS_A_VALIDER?: ReadonlySet<string> }).INGREDIENTS_A_VALIDER;
  const aValider = [...new Set([...lignesAssets.filter((l) => l.statut === 'a_revoir').map((l) => l.cle), ...(declares ? [...declares] : [])])];
  // Scénarios à générer : scénarios types (sujet n° 1 × couleurs), puis ceux des recettes de Paul et des propositions de Claude
  const vus = new Set<string>();
  const scenarios: { id: string; libelle: string; scenario: ScenarioRecette }[] = [];
  const ajouter = (id: string, s: ScenarioRecette, libelle?: string) => {
    const n = normaliserScenario(s);
    const k = JSON.stringify([n.principaux, n.secondaires, n.couleurs]);
    if (!n.principaux.length || vus.has(k) || scenarios.length >= 10) return;
    vus.add(k);
    scenarios.push({ id, libelle: libelle ?? libelleScenario(n), scenario: { ...n, soins: [] } });
  };
  for (const t of SCENARIOS_TYPES) ajouter(t.id, t.scenario, t.libelle);
  for (const r of recettes.filter((x) => x.statut === 'active' && (x.note ?? 0) >= 4)) ajouter(`recette-${r.id.slice(0, 8)}`, scenarioDeRecette(r));
  for (const p of lot.propositions) ajouter(`claude-${p.scenario.id}`, { principaux: p.scenario.principaux, secondaires: p.scenario.secondaires, couleurs: p.scenario.couleurs, soins: [] });
  const gardees = notations.filter((n) => n.garder).length;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <p className="text-sm"><Link href="/admin/retours" className="font-semibold text-teal-900 underline">← Donner mon avis</Link></p>
        <h1 className="mt-1 text-2xl font-bold">Recettes complètes</h1>
        <p className="mt-1 hidden max-w-3xl text-sm text-neutral-600 md:block">
          Une recette entière à la fois, générée par le système à partir de vos notes (ou proposée par Claude). Donnez des étoiles (touches 1 à 5),
          ce qui va et ce qui ne va pas, gardez celles qui vous plaisent vraiment. Chaque avis pondère aussitôt les ingrédients et leurs combinaisons :
          les recettes suivantes en tiennent compte.
        </p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration à exécuter (<code>supabase/migrations/0038_recettes_notation.sql</code>) : la tuile fonctionne, mais vos notes restent dans ce navigateur
          (« Garder cette recette » enregistre quand même la recette dans « Mes recettes »).
        </p>
      )}
      <NotationRecettes
        scenarios={scenarios}
        propositions={lot.propositions}
        notees={[...new Set(notations.map((n) => n.cle).filter((k): k is string => Boolean(k)))]}
        resume={{ notes: notations.length, gardees, apprises: stats.n }}
        stats={stats}
        palmares={palmaresNotation(stats)}
        refusees={refusees}
        aValider={aValider}
        migrationManquante={migrationManquante}
        proposes={universDuParcours(univers)}
        modeles={modeles}
        catalogue={catalogue}
        marquesImportees={marquesImportees}
        themesActives={themesActives()}
        poids={poids}
        photos={photos}
      />
    </div>
  );
}
