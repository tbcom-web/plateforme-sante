import { markdownAtelier, notesElements, poidsAtelier, syntheseAtelier, universDuParcours } from '@plateforme/core';
import { getLignesAssetsApprentissage } from '@/lib/notation-recettes';
import { getTranches } from '@/lib/tranches';
import Link from 'next/link';
import EnvoyerRetours from '@/components/EnvoyerRetours';
import { exigerAdmin } from '@/lib/admin';
import { getNotesAtelier } from '@/lib/atelier';
import { getPoidsAssets } from '@/lib/assets-notes';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import { getPhotosBanque } from '@/lib/recettes';
import Atelier from './Atelier';
import Synthese from './Synthese';

export const metadata = { title: 'Super admin · Atelier des propositions' };

// Atelier des propositions : Paul fait défiler les combinaisons du générateur (exactement celles du parcours /creer, mêmes
// fonctions), les note, et le générateur apprend de ses notes (packages/core/src/atelier-poids.ts).
export default async function PageAtelier() {
  await exigerAdmin();
  const [{ notes, migrationManquante }, catalogue, modeles, marquesImportees, { univers }, assets, photos] = await Promise.all([
    getNotesAtelier(), getCatalogue(), getModelesDisponibles(), getMarquesImportees(), getUnivers(), getPoidsAssets(), getPhotosBanque(),
  ]);
  const synthese = syntheseAtelier(notes);
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  // Poids des combinaisons + notes et statuts des assets (0027) : exactement ce que reçoit le parcours
  const elements = notesElements(await getLignesAssetsApprentissage());
  const poids = { ...poidsAtelier(notes), ...(assets ? { assets } : {}), ...(Object.keys(elements).length ? { notesElements: elements } : {}) };
  // Combinaisons déjà notées (clé stable des ingrédients) : nombre de notes et dernière note
  const dejaNotees: Record<string, { n: number; derniere: number }> = {};
  for (const x of notes) {
    const d = dejaNotees[x.cle];
    if (d) d.n++;
    else dejaNotees[x.cle] = { n: 1, derniere: x.note };
  }

  return (
    <div className="grid gap-6">
      {/* Sobriété (retour de Paul du 2026-10-08) : deux portes claires — composer une recette (Studio) ou noter au hasard
          (Donner mon avis) ; ici, seulement les combinaisons du générateur à noter, sans doublon. */}
      <div className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-2xl font-bold">Atelier</h1>
          <EnvoyerRetours compact />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/admin/atelier/studio" className="grid gap-0.5 rounded-2xl bg-teal-800 p-4 text-white hover:bg-teal-900">
            <span className="text-base font-semibold">Composer une recette → Studio</span>
            <span className="text-sm text-white/85">Lancer les dés, bloquer ce qui plaît, signaler les zones à améliorer, enregistrer.</span>
          </Link>
          <Link href="/admin/retours?type=themes" className="grid gap-0.5 rounded-2xl border border-teal-800 bg-white p-4 text-teal-950 hover:bg-teal-50">
            <span className="text-base font-semibold">Noter au hasard → Donner mon avis</span>
            <span className="text-sm text-neutral-600">Une carte à la fois : thèmes, illustrations, photos, structures.</span>
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-neutral-600">
          Ci-dessous : les combinaisons du générateur, exactement comme le parcours les propose. Chaque note améliore l’ordre des
          propositions ; les règles (diabète sans rouge, posture jamais, contrastes) ne sont jamais levées.
        </p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration 0026 à exécuter (<code>supabase/migrations/0026_atelier_notes.sql</code>) : les combinaisons s’affichent, mais les notes ne peuvent pas encore être enregistrées.
        </p>
      )}
      <Synthese synthese={synthese} markdown={markdownAtelier(synthese, { date })} />
      <Atelier
        proposes={universDuParcours(univers)}
        modeles={modeles}
        catalogue={catalogue}
        marquesImportees={marquesImportees}
        themesActives={themesActives()}
        poids={poids.n || poids.assets || poids.notesElements ? poids : null}
        dejaNotees={dejaNotees}
        tranchees={[...(await getTranches()).tranches.refuses, ...(await getTranches()).tranches.favoris].filter((k) => k.startsWith('prop:'))}
        migrationManquante={migrationManquante}
        photos={photos}
      />
    </div>
  );
}
