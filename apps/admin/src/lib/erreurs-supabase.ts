// Relectures de repli (2026-10-09, « le Frigo met jusqu'à 120 s quand la base est lente ») : une lecture ne retente avec moins de
// colonnes QUE si l'erreur dit qu'une colonne manque (migration pas encore exécutée). Délai dépassé, réseau, table absente, droits :
// une seule tentative, le repli de la lecture s'applique aussitôt (plus d'enchaînement de requêtes de 20 s).

/** Erreur PostgREST « colonne inconnue » : 42703 (Postgres) ou PGRST204 (cache du schéma) */
export const colonneAbsente = (e: { code?: string; message?: string } | null | undefined) =>
  Boolean(e && (e.code === '42703' || e.code === 'PGRST204' || /column .* does not exist|Could not find the '.*' column/i.test(e.message ?? '')));
