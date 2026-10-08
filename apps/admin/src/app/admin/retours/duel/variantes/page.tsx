import Link from 'next/link';
import { exigerAdmin } from '@/lib/admin';
import { getDuels } from '@/lib/duels';
import DuelVariantes from './DuelVariantes';

export const metadata = { title: 'Super admin · Duel des variantes' };

// Duel des VARIANTES d'une illustration de base (demande de Paul, 2026-10-08 : « on peut faire des A/B testing de contraste si
// besoin ») : même dessin, deux variantes qui ne diffèrent que par UNE dimension — contraste (fort / doux / d'origine, filtre
// CSS au rendu, aucune source de dessin modifiée), style (registres, styles expérimentaux) ou couleurs (deux gammes).
// Duels de type « illustration », dimension « variante:<axe> » (table duels, 0037) ; le résultat devient l'écart propre de la
// variante (renfortsDuels, ajouté à l'effet hérité de la base). Lien « Comparer ses variantes en duel » des cartes de base.
export default async function PageDuelVariantes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  const { duels, migrationManquante } = await getDuels();
  const base = typeof sp.base === 'string' && /^[a-z]+:[a-z0-9-]{1,80}$/.test(sp.base) ? sp.base : null;
  const dimension = sp.dimension === 'style' || sp.dimension === 'couleur' ? sp.dimension : 'contraste';
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <p className="text-sm"><Link href="/admin/retours" className="font-semibold text-teal-900 underline">← Donner mon avis</Link> · <Link href="/admin/retours/duel" className="font-semibold text-teal-900 underline">Tous les duels</Link></p>
        <h1 className="mt-1 text-2xl font-bold">Duel des variantes</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Le même dessin, deux variantes : une seule chose change. Choisissez (← A, → B, ↓ égalité, ↑ les deux sont mauvais).
          Le résultat ajuste un peu la variante, sans toucher à la note de l’illustration de base.
        </p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration à exécuter (<code>supabase/migrations/0037_duels.sql</code>) : les duels restent dans ce navigateur tant que la table n’existe pas.
        </p>
      )}
      <DuelVariantes
        historique={duels.filter((d) => d.type === 'illustration' && d.dimension?.startsWith('variante:'))}
        baseInitiale={base}
        dimensionInitiale={dimension}
      />
    </div>
  );
}
