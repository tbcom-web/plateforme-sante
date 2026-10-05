import { exigerAdmin } from '@/lib/admin';
import { getRevuesIllustrations } from '@/lib/illustrations';
import RevueIllustrations from './RevueIllustrations';

export const metadata = { title: 'Super admin · Illustrations' };

export default async function PageIllustrations() {
  await exigerAdmin();
  const { statuts, revues, migrationManquante } = await getRevuesIllustrations();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Revue des illustrations</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Toutes les illustrations du code (dessins, matériel, animations, pictos, bibliothèque), à valider ou à faire retravailler.
          Chaque retour est daté et conservé. « Copier les retours à traiter » prépare la liste pour l’agent graphiste.
        </p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration 0021 à exécuter (<code>supabase/migrations/0021_revues_illustrations.sql</code>) : les illustrations s’affichent, mais les retours ne peuvent pas encore être enregistrés.
        </p>
      )}
      <RevueIllustrations statuts={statuts} revues={revues} migrationManquante={migrationManquante} />
    </div>
  );
}
