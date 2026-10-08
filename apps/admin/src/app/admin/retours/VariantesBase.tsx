'use client';

// Illustration de BASE → variantes dans « Donner mon avis » (demande de Paul, 2026-10-08 : « noter juste l'illustration
// "basique" »). Modèle : packages/core/src/bases-illustrations.ts.
// - inventaireParBase : la file « à noter » dédoublonnée — chaque groupe de variantes (registres, styles, trait continu, héros
//   d'un thème…) devient UNE carte : l'illustration basique, notée sous la clé de base (dessin:orthonyxie, heros:sport…).
// - VariantesRepliees : sous la carte, « Voir les N variantes » (vignettes, sans obligation de noter), les variantes nouvelles
//   sans aucun signal (à comparer en duel plutôt qu'à noter) et « Comparer ses variantes en duel ».
import Link from 'next/link';
import { dedoublonnerParBase, LIBELLES_STATUTS_ILLUSTRATION, libelleVariante, regrouperParBase, titreDeBase, typeDeCle, variantesADuel, type Asset, type GroupeBase, type StatutIllustration } from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

/** Carte de base : le représentant sous la clé de base, titre sans le nom du style, sujets de toutes les variantes */
function carteDeBase(g: GroupeBase<Asset>): Asset {
  const r = g.representant;
  return {
    ...r,
    cle: g.base,
    type: typeDeCle(g.base) ?? r.type,
    titre: titreDeBase(r.titre, r.cle),
    detail: `Illustration de base · ${g.variantes.length} variante${g.variantes.length > 1 ? 's' : ''} (${g.variantes.map((v) => libelleVariante(v.cle)).join(', ')}) : votre note vaut pour toutes`,
    soins: [...new Set(g.variantes.flatMap((v) => v.soins))],
  };
}

/** Inventaire « à noter » dédoublonné par base, et les groupes (clé de base → variantes) */
export function inventaireParBase(inventaire: readonly Asset[]): { notables: Asset[]; groupes: Map<string, GroupeBase<Asset>> } {
  const { groupes } = regrouperParBase(inventaire);
  return { notables: dedoublonnerParBase(inventaire, carteDeBase), groupes: new Map(groupes.map((g) => [g.base, g])) };
}

function Vignette({ a, aDuel }: { a: Asset; aDuel: boolean }) {
  const svg = a.rendu.kind === 'svg' ? a.rendu.svg() : '';
  return (
    <li className="grid gap-1">
      <div className={`grid aspect-[4/3] place-items-center overflow-hidden rounded-lg p-1.5 ring-1 ring-black/10 ${a.rendu.kind === 'svg' && a.rendu.fond === 'grille' ? 'surface-grille' : ''}`}
        style={{ background: a.rendu.kind === 'svg' && a.rendu.fond === 'doux' ? 'var(--doux)' : 'var(--fond)', color: 'var(--encre)' }}>
        {svg ? <div className="rt-svg h-full w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="text-xs text-neutral-500">{a.titre}</span>}
      </div>
      <span className="text-xs font-medium leading-tight">{libelleVariante(a.cle)}</span>
      {aDuel && <span className="w-fit rounded-full bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold text-sky-900">Nouvelle : en duel</span>}
    </li>
  );
}

/** « Voir les N variantes » (repliées), variantes à comparer en duel et lien vers le duel des variantes */
export default function VariantesRepliees({ groupe, signaux, statut, onStatut }: {
  groupe: GroupeBase<Asset>; signaux: ReadonlySet<string>;
  /** Statut posé sur la base (vaut pour les variantes sans statut propre) */
  statut?: StatutIllustration; onStatut?: (s: StatutIllustration) => void;
}) {
  const aDuel = new Set(variantesADuel(groupe, signaux));
  const n = groupe.variantes.length;
  return (
    <div className="grid gap-2 rounded-xl bg-neutral-50 p-3 ring-1 ring-black/10">
      <p className="text-sm">
        <strong>Illustration de base</strong> : votre note vaut pour ses {n} variante{n > 1 ? 's' : ''} (chacune garde un petit écart si vous la notez ou la comparez à part).
      </p>
      {aDuel.size > 0 && <p className="text-xs text-sky-900">{aDuel.size} variante{aDuel.size > 1 ? 's' : ''} jamais vue{aDuel.size > 1 ? 's' : ''} : à comparer en duel plutôt qu’à noter.</p>}
      <details className="group">
        <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg px-1 text-sm font-semibold text-teal-900 ${focus}`}>
          <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span> Voir les {n} variante{n > 1 ? 's' : ''}
          <span className="font-normal text-neutral-500">(sans obligation de les noter)</span>
        </summary>
        <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {groupe.variantes.map((v) => <Vignette key={v.cle} a={v} aDuel={aDuel.has(v.cle)} />)}
        </ul>
      </details>
      {onStatut && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-neutral-600">Statut de la base (vaut pour les variantes) :</span>
          {(['a_retravailler', 'retire', 'a_revoir'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={statut === s} onClick={() => onStatut(s)}
              className={`min-h-9 rounded-lg px-2 font-semibold ring-1 ${focus} ${statut === s ? 'bg-neutral-800 text-white ring-neutral-800' : 'bg-white ring-black/15 hover:bg-neutral-100'}`}>
              {LIBELLES_STATUTS_ILLUSTRATION[s]}
            </button>
          ))}
        </div>
      )}
      <Link href={`/admin/retours/duel/variantes?base=${encodeURIComponent(groupe.base)}`}
        className={`flex min-h-11 w-fit items-center rounded-xl border border-teal-800 px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>
        Comparer ses variantes en duel (contraste, style…)
      </Link>
    </div>
  );
}
