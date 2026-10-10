// Ouverture d'un sujet (« À valider ») : retour immédiat au toucher de la tuile (audit « mobile seul » du 2026-10-10 : ~450 ms sans
// rien à l'écran sur téléphone pendant le rendu serveur des cartes).
export default function ChargementSujet() {
  return (
    <div role="status" aria-live="polite" className="grid gap-3 rounded-3xl border border-black/5 bg-white p-5 text-sm">
      <span className="flex items-center gap-3 font-semibold text-teal-900">
        <span className="size-5 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" aria-hidden="true" />
        Préparation des cartes…
      </span>
      <span className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-neutral-100" aria-hidden="true" />
    </div>
  );
}
