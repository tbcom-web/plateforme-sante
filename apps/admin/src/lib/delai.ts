// Délai maximal des lectures NON ESSENTIELLES de l'admin (retour de Paul du 2026-10-09 : « l'admin ne charge pas » après
// connexion). Une lecture lente (table volumineuse, Supabase chargé, API GitHub qui ne répond pas) ne doit jamais bloquer
// l'affichage : passé le délai, la page s'affiche avec le repli (compteur à 0, indicateurs absents, politique vide). La lecture
// continue en arrière-plan ; son résultat est simplement ignoré.

/** Résultat de `p`, ou `repli` si `p` échoue ou dépasse `ms` millisecondes */
export function avecDelai<T>(p: Promise<T>, ms: number, repli: T): Promise<T> {
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<T>((ok) => { minuteur = setTimeout(() => ok(repli), ms); });
  return Promise.race([p.catch(() => repli), delai]).finally(() => clearTimeout(minuteur));
}

/** Délais (ms) : compteurs (menu, tableau de bord), contexte d'images du layout, politique d'évaluation (pages, tableau de bord) */
export const DELAIS = { compteurs: 2500, contexte: 5000, politique: 4000 } as const;
