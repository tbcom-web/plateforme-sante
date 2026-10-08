import Link from 'next/link';
import { exigerAdmin } from '@/lib/admin';
import { getDuels } from '@/lib/duels';
import DuelPictos from './DuelPictos';

export const metadata = { title: 'Super admin · Duel du style des icônes' };

// « On compare : le style des icônes » (2026-10-08, retour de Paul « Bof bof les icônes… ») : trois directions de style à l'essai
// (pictos-directions.ts), deux modes — le MÊME picto dans deux directions (ou face au picto actuel), et la planche de 12 contre la
// planche de 12 en situation. Duels de type « illustration », dimension « variante:style » (table duels, 0037 : aucune migration) ;
// le résultat ajuste l'écart propre de chaque variante (renfortsDuels). Rien n'est branché sur les sites, rien n'est « Validé ».
export default async function PageDuelPictos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  const { duels, migrationManquante } = await getDuels();
  const mode = sp.mode === 'planches' ? 'planches' : 'picto';
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <p className="text-sm"><Link href="/admin/retours" className="font-semibold text-teal-900 underline">← Donner mon avis</Link> · <Link href="/admin/retours/duel" className="font-semibold text-teal-900 underline">Tous les duels</Link></p>
        <h1 className="mt-1 text-2xl font-bold">Duel : le style des icônes</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Trois directions à l’essai sur 12 pictos : A trait fin, B duotone doux, C éditorial. Choisissez (← A, → B, ↓ égalité,
          ↑ les deux sont mauvais). Après votre choix, les ~60 pictos seront redessinés dans la direction retenue.
        </p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration à exécuter (<code>supabase/migrations/0037_duels.sql</code>) : les duels restent dans ce navigateur tant que la table n’existe pas.
        </p>
      )}
      <DuelPictos historique={duels.filter((d) => d.type === 'illustration' && d.dimension === 'variante:style' && [d.aCle, d.bCle].every((k) => k.startsWith('picto:')))} modeInitial={mode} />
    </div>
  );
}
