import 'server-only';
import { createHash } from 'node:crypto';
import { changementsGenerateurDiffere, type PoidsAtelier } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// « Ce que vos avis ont changé » (/admin/retours) : différences du générateur avec et sans apprentissage, ~1 s de calcul au
// volume ×10 (lots de propositions de chaque sujet, deux fois) refait à CHAQUE ouverture de la page (mesuré au profileur, perf
// vague 2, 2026-10-10). Fonction pure des poids : résultat gardé
// 1. sur l'instance pour les mêmes poids (texte JSON identique) ;
// 2. en base (apprentissage_instantane, 0059, clé « changements|admin ») avec l'empreinte SHA-256 des poids comme signature : une
//    instance neuve le relit au lieu de le recalculer (premier chargement à froid). Mêmes poids → même résultat, au caractère près.
// Nouveaux poids (un avis de plus) → nouveau calcul, toujours envoyé après l'affichage. Sans 0059 ou lecture refusée : calcul seul.
type Changements = Awaited<ReturnType<typeof changementsGenerateurDiffere>>;
let dernier: { texte: string; promesse: Promise<Changements> } | null = null;
const CLE = 'changements|admin';

async function depuisBaseOuCalcul(poids: PoidsAtelier | null, texte: string): Promise<Changements> {
  const signature = `changements:${createHash('sha256').update(texte).digest('hex')}`;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
    const { data, error } = await supabase.from('apprentissage_instantane').select('signature, valeur').eq('cle', CLE).maybeSingle();
    if (!error && data && (data as { signature: string }).signature === signature) return JSON.parse((data as { valeur: string }).valeur) as Changements;
    if (error) supabase = null;
  } catch {
    supabase = null;
  }
  const v = await changementsGenerateurDiffere(poids);
  if (supabase) {
    const valeur = JSON.stringify(v);
    await supabase.from('apprentissage_instantane').upsert({ cle: CLE, portee: 'admin', signature, valeur, octets: valeur.length, calcule_le: new Date().toISOString() }, { onConflict: 'cle' })
      .then(() => null, () => null);
  }
  return v;
}

export function changementsDesPoids(poids: PoidsAtelier | null): Promise<Changements> {
  const texte = JSON.stringify(poids ?? null);
  if (dernier?.texte === texte) return dernier.promesse;
  const promesse = depuisBaseOuCalcul(poids, texte);
  dernier = { texte, promesse };
  promesse.catch(() => { if (dernier?.promesse === promesse) dernier = null; });
  return promesse;
}
