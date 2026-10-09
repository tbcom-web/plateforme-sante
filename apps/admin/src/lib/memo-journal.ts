import 'server-only';
import { createClient } from '@/lib/supabase/server';

// Lectures volumineuses MÉMORISÉES ENTRE REQUÊTES (2026-10-09, « la Dégustation est lente ») : le journal des duels (≈ 10 Mo en
// production, compositions comprises) était relu à chaque page. Il est gardé en mémoire sur l'instance serveur, par compte, tant
// que la table n'a pas changé : signature = nombre de lignes + date de la plus récente (une requête d'une ligne). Une insertion
// ou une suppression change la signature → relecture complète ; jamais de donnée périmée après un nouveau duel.
// Signature illisible (erreur, délai) : lecture directe, rien n'est mémorisé.

type Entree = { signature: string; valeur: Promise<unknown> };
const memo = new Map<string, Entree>();
const MAX_ENTREES = 40;

/** Signature d'une table (nombre de lignes et dernière date), ou null si illisible */
export async function signatureTable(table: string, colonneDate = 'created_at'): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, count, error } = await supabase.from(table).select(colonneDate, { count: 'exact' }).order(colonneDate, { ascending: false }).limit(1);
    if (error) return null;
    const derniere = (data?.[0] as unknown as Record<string, unknown> | undefined)?.[colonneDate];
    return `${count ?? '?'}|${String(derniere ?? '')}`;
  } catch {
    return null;
  }
}

/**
 * Résultat de `lire()` mémorisé pour (nom, compte) tant que la signature des `tables` ne change pas. `utilisateur` : identifiant
 * du compte (les lectures dépendent de ses droits). Un échec de `lire()` n'est pas mémorisé.
 */
export async function memoParSignature<T>(nom: string, utilisateur: string | null | undefined, tables: readonly string[], lire: () => Promise<T>): Promise<T> {
  if (!utilisateur) return lire();
  const sigs = await Promise.all(tables.map((t) => signatureTable(t)));
  if (sigs.some((s) => s === null)) return lire();
  const signature = sigs.join('§');
  const cle = `${nom}|${utilisateur}`;
  const e = memo.get(cle);
  if (e && e.signature === signature) return e.valeur as Promise<T>;
  const valeur = lire();
  memo.delete(cle);
  if (memo.size >= MAX_ENTREES) memo.delete(memo.keys().next().value!);
  memo.set(cle, { signature, valeur });
  valeur.catch(() => { if (memo.get(cle)?.valeur === valeur) memo.delete(cle); });
  return valeur;
}
