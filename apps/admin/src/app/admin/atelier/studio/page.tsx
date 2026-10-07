import { resumeRenforts, universDuParcours } from '@plateforme/core';
import Link from 'next/link';
import { exigerAdmin } from '@/lib/admin';
import { getPoidsAtelier } from '@/lib/atelier';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getPhotosBanque, getRecettes } from '@/lib/recettes';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import Studio from './Studio';

export const metadata = { title: 'Super admin · Studio de recettes' };

// Studio de recettes (niveau 3 de docs/ingredients-recettes.md) : un site complet pour un scénario, des dés par dimension
// (couleurs, polices, visuels, photos, structure — par type de page et par élément —, effets), verrous et retour en arrière,
// puis « Enregistrer cette recette ». Les recettes bien notées passent en premier dans le parcours /creer.
export default async function PageStudio() {
  await exigerAdmin();
  const [modeles, catalogue, marquesImportees, { univers }, poids, photos, { recettes, migrationManquante }] = await Promise.all([
    getModelesDisponibles(), getCatalogue(), getMarquesImportees(), getUnivers(), getPoidsAtelier(), getPhotosBanque({ nonImportees: true }), getRecettes(),
  ]);
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm"><Link href="/admin/atelier" className="font-semibold text-teal-900 underline">← Atelier des propositions</Link></p>
        <h1 className="mt-1 text-2xl font-bold">Studio de recettes</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Lancez les dés dimension par dimension (verrouillez ce qui vous plaît) jusqu’à un site qui vous convient, puis enregistrez la recette.
          Les garde-fous restent toujours actifs : contrastes AA, diabète sans rouge vif, posture jamais, mots métier insécables, illustrations sans texte.
          Clavier : c couleurs · p polices · v visuels · f photos · s structure · e effets · espace tout changer.
        </p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration 0032 à exécuter (<code>supabase/migrations/0032_recettes.sql</code>) : le studio fonctionne, mais les recettes et les notes d’éléments ne peuvent pas encore être enregistrées.
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
      />
    </div>
  );
}
