import { BANDEAU_EXEMPLES } from '@plateforme/core';

// Bandeau discret de l'aperçu quand le KIT DÉMO est posé (packages/core/src/kit-demo.ts) : cabinet et praticiens FICTIFS, photos
// d'exemple jamais publiées ; invitation à téléverser ses vraies photos (cabinet, portrait). `lien` : où les ajouter, facultatif.
export default function BandeauExemples({ lien }: { lien?: { href: string; libelle: string } }) {
  return (
    <div role="note" aria-label="Photos d’exemple" className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
      <span aria-hidden className="mt-0.5 inline-block size-2 shrink-0 rounded-full bg-amber-500" />
      <p className="min-w-0 flex-1">
        <strong className="font-semibold">{BANDEAU_EXEMPLES.titre}.</strong> {BANDEAU_EXEMPLES.texte}
      </p>
      {lien && <a href={lien.href} className="inline-flex min-h-9 items-center rounded-lg bg-white px-2.5 font-semibold text-amber-950 ring-1 ring-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700">{lien.libelle}</a>}
    </div>
  );
}
