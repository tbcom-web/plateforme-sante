import Link from 'next/link';
import { exigerAdmin } from '@/lib/admin';
import { getReevaluations, getTranches } from '@/lib/tranches';
import ElementsTranches from './ElementsTranches';

export const metadata = { title: 'Super admin · Éléments tranchés' };

// Éléments tranchés (règle de Paul du 2026-10-08, packages/core/src/tranches.ts) : notés 1 ★ (plus jamais montrés, ni à évaluer ni
// dans une composition) et 5 ★ ou gardés (plus jamais redemandés, toujours utilisés comme favoris) ; « Réévaluer » les remet dans la file.
export default async function PageTranches() {
  await exigerAdmin();
  const [{ details }, { migrationManquante }] = await Promise.all([getTranches(), getReevaluations()]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <p className="text-sm"><Link href="/admin/retours" className="font-semibold text-teal-900 underline">← Donner mon avis</Link></p>
        <h1 className="mt-1 text-2xl font-bold">Éléments tranchés</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Notés 1 ★ : ils ne réapparaissent plus nulle part, ni à noter ni dans les sites générés. Notés 5 ★ (ou gardés) : ils ne vous sont
          plus redemandés, mais restent utilisés comme favoris. Si vous changez d’avis, « Réévaluer » remet l’élément dans la file.
        </p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration à exécuter (<code>supabase/migrations/0041_elements_reevalues.sql</code>) : la règle s’applique déjà, mais « Réévaluer » ne peut pas encore être enregistré.
        </p>
      )}
      <ElementsTranches details={details} />
    </div>
  );
}
