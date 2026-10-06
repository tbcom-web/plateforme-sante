import { markdownAtelier, poidsAtelier, syntheseAtelier, universDuParcours } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getNotesAtelier } from '@/lib/atelier';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import Atelier from './Atelier';
import Synthese from './Synthese';

export const metadata = { title: 'Super admin · Atelier des propositions' };

// Atelier des propositions : Paul fait défiler les combinaisons du générateur (exactement celles du parcours /creer, mêmes
// fonctions), les note, et le générateur apprend de ses notes (packages/core/src/atelier-poids.ts).
export default async function PageAtelier() {
  await exigerAdmin();
  const [{ notes, migrationManquante }, catalogue, modeles, marquesImportees, { univers }] = await Promise.all([
    getNotesAtelier(), getCatalogue(), getModelesDisponibles(), getMarquesImportees(), getUnivers(),
  ]);
  const synthese = syntheseAtelier(notes);
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  const poids = poidsAtelier(notes);
  // Combinaisons déjà notées (clé stable des ingrédients) : nombre de notes et dernière note
  const dejaNotees: Record<string, { n: number; derniere: number }> = {};
  for (const x of notes) {
    const d = dejaNotees[x.cle];
    if (d) d.n++;
    else dejaNotees[x.cle] = { n: 1, derniere: x.note };
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Atelier des propositions</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Les combinaisons du générateur, exactement comme le parcours les propose (mêmes sujets, mêmes couleurs, mêmes lots).
          Chaque note améliore l’ordre des propositions : une note isolée compte peu, des notes concordantes comptent beaucoup.
          Les règles (diabète sans rouge, posture jamais, contrastes, trois propositions variées) ne sont jamais levées.
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
        poids={poids.n ? poids : null}
        dejaNotees={dejaNotees}
        migrationManquante={migrationManquante}
      />
    </div>
  );
}
