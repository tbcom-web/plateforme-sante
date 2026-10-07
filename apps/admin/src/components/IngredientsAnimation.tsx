// Ingrédients de base d'une animation (packages/core/src/animations-sources.ts) et leur statut dans /admin/illustrations.
// Règle de Paul : pas d'animation avant que ses images de base soient validées. Si un ingrédient n'est pas « Validé » :
// « Animation en attente », liens vers chaque ingrédient et bouton « Noter d'abord ses ingrédients » (session de notation).
import { LIBELLES_STATUTS_ILLUSTRATION, type EtatAnimation, type StatutIllustration } from '@plateforme/core';

const PASTILLES: Record<StatutIllustration, string> = {
  a_revoir: 'bg-amber-100 text-amber-900',
  valide: 'bg-teal-100 text-teal-900',
  a_retravailler: 'bg-rose-100 text-rose-900',
  retire: 'bg-neutral-200 text-neutral-700',
};

export const lienIngredient = (cle: string) => `/admin/illustrations?cle=${encodeURIComponent(cle)}`;

export default function IngredientsAnimation({ etat, onNoterIngredients }: { etat: EtatAnimation; onNoterIngredients?: () => void }) {
  return (
    <section aria-label="Ingrédients de base de l’animation"
      className={`grid gap-2 rounded-xl p-3 text-sm ring-1 ${etat.enAttente ? 'bg-amber-50 ring-amber-300' : 'bg-teal-50/60 ring-teal-200'}`}>
      {etat.enAttente ? (
        <p className="font-semibold text-amber-950">
          Animation en attente : notez / validez d’abord ses images de base
          <span className="block text-xs font-normal text-amber-900">
            {etat.aValider.length} ingrédient{etat.aValider.length > 1 ? 's' : ''} sur {etat.ingredients.length} pas encore « Validé ». L’animation se refait à partir d’eux, jamais l’inverse.
          </span>
        </p>
      ) : <p className="font-semibold text-teal-950">Ingrédients de base : tous validés</p>}
      <ul className="grid gap-1.5">
        {etat.ingredients.map((i) => (
          <li key={i.cle} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PASTILLES[i.statut]}`}>{i.inconnu ? 'Introuvable' : LIBELLES_STATUTS_ILLUSTRATION[i.statut]}</span>
            <a href={lienIngredient(i.cle)} className="min-w-0 flex-1 font-medium text-teal-900 underline underline-offset-2 hover:no-underline">{i.role}</a>
            <code className="basis-full break-all text-[11px] text-neutral-500">{i.cle}</code>
          </li>
        ))}
      </ul>
      {etat.enAttente && onNoterIngredients && (
        <button type="button" onClick={onNoterIngredients}
          className="min-h-11 w-fit rounded-lg bg-amber-800 px-3 text-sm font-semibold text-white hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2">
          Noter d’abord ses ingrédients ({etat.aValider.length})
        </button>
      )}
    </section>
  );
}
