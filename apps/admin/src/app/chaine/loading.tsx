// Chargement d'une étape de la chaîne (navigation lente quand la base traîne) : un retour immédiat au toucher, au lieu d'un
// bouton qui semble ne rien faire (retour de Paul du 2026-10-10 : « je clique sur jouer la grille 26, rien ne se passe »).
export default function ChargementChaine() {
  return (
    <div role="status" aria-live="polite" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-5 text-sm">
      <span className="flex items-center gap-3 font-semibold text-teal-900">
        <span className="size-5 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" aria-hidden="true" />
        Chargement de l’étape…
      </span>
      <span className="text-neutral-600">Les designs se préparent ; quelques secondes si la base est lente.</span>
    </div>
  );
}
