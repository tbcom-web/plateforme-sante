import 'server-only';
import { changementsGenerateurDiffere, type PoidsAtelier } from '@plateforme/core';

// « Ce que vos avis ont changé » (/admin/retours) : différences du générateur avec et sans apprentissage, ~1 s de calcul au
// volume ×10 (lots de propositions de chaque sujet, deux fois) refait à CHAQUE ouverture de la page (mesuré au profileur, perf
// vague 2, 2026-10-10). Résultat gardé sur l'instance pour les mêmes poids (texte JSON identique) : fonction pure des poids,
// même résultat qu'un nouveau calcul ; nouveaux poids (un avis de plus) → nouveau calcul, toujours envoyé après l'affichage.
type Changements = Awaited<ReturnType<typeof changementsGenerateurDiffere>>;
let dernier: { texte: string; promesse: Promise<Changements> } | null = null;

export function changementsDesPoids(poids: PoidsAtelier | null): Promise<Changements> {
  const texte = JSON.stringify(poids ?? null);
  if (dernier?.texte === texte) return dernier.promesse;
  const promesse = changementsGenerateurDiffere(poids);
  dernier = { texte, promesse };
  promesse.catch(() => { if (dernier?.promesse === promesse) dernier = null; });
  return promesse;
}
