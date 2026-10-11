import 'server-only';
import { kitDuProfil, profilsDePratique, FAMILLES_KIT } from '@plateforme/core';
import { calculerManques, type EntreeManques, type ManqueDuComposeur, type ResultatManques } from '@plateforme/core/manques';
import { getDonneesKits, getDonneesVisuels } from '@/lib/kits-images';
import { getPoidsAtelier } from '@/lib/atelier';
import { createClient } from '@/lib/supabase/server';

// ATELIER DES MANQUES côté serveur (packages/core/src/manques.ts, demande de Paul du 2026-10-11) : kits de tous les profils de
// référence de la profession (éléments « à valider » compris, signalés), manques remontés par le COMPOSEUR (instantanés déjà
// calculés de chaque profil, apprentissage_instantane : aucun recalcul ici) et images générées déposées sur un manque
// (photos_libres.ia_trou « <sujet>|manque:… », migration 0040). Lectures en échec : repli sans elles (la page s'affiche toujours).

const sur = async <T,>(p: PromiseLike<T>, repli: T): Promise<T> => { try { return await p; } catch { return repli; } };

/** Manques du composeur gardés dans les instantanés (clé `composeur|<profession>|<profil>|<portée>`) */
async function manquesComposeur(profession: string): Promise<NonNullable<EntreeManques['composeur']>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('apprentissage_instantane').select('cle, valeur').like('cle', `composeur|${profession}|%`).limit(60)
    .abortSignal(AbortSignal.timeout(8000));
  if (error || !Array.isArray(data)) return [];
  const vus = new Set<string>();
  const l: NonNullable<EntreeManques['composeur']>[number][] = [];
  for (const x of data as { cle: string; valeur: string }[]) {
    const param = x.cle.split('|')[2] ?? '';
    if (!param || vus.has(param)) continue;
    try {
      const v = JSON.parse(x.valeur) as { profil?: { sujets?: string[]; activites?: string[] }; manques?: ManqueDuComposeur[] };
      if (!Array.isArray(v.manques)) continue;
      vus.add(param);
      l.push({ profil: param, sujets: v.profil?.sujets ?? [], activites: v.profil?.activites ?? [], manques: v.manques });
    } catch { /* instantané illisible : ignoré */ }
  }
  return l;
}

/** Images générées déposées sur un manque (trou « …|manque:… ») */
async function importsManques(): Promise<{ trou: string; statut: string; url: string | null }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('photos_libres').select('ia_trou, statut, url').eq('source', 'ia').like('ia_trou', '%|manque:%').limit(2000)
    .abortSignal(AbortSignal.timeout(8000));
  if (error || !Array.isArray(data)) return [];
  return (data as { ia_trou: string; statut: string; url: string | null }[]).map((x) => ({ trou: x.ia_trou, statut: x.statut, url: x.url }));
}

export type DonneesManques = ResultatManques & {
  notes: Record<string, { m: number; n: number }> | null;
  /** Instantanés du composeur lus */
  composeurLu: number;
  /** Références de style 4-5 ★ validées par `<sujet>|<famille>` : adresses des photos, clés des visuels (meilleures d'abord) */
  references: Record<string, string[]>;
};

export async function getDonneesManques(profession: string): Promise<DonneesManques> {
  const [photos, visuels, composeur, imports, poids] = await Promise.all([
    sur(getDonneesKits(), null), sur(getDonneesVisuels(), null), sur(manquesComposeur(profession), []), sur(importsManques(), []), sur(getPoidsAtelier(), null),
  ]);
  const profils = profilsDePratique(profession).filter((p) => p.principal);
  const kits = profils.map((profil) => ({ profil, kit: kitDuProfil(profil, { photos, visuels }) }));
  const r = calculerManques({ profession, kits, composeur, imports });
  const references: Record<string, string[]> = {};
  for (const { kit } of kits) {
    for (const f of FAMILLES_KIT) {
      const l = [...kit.activites.flatMap((a) => a.familles[f]), ...kit.generique[f]].filter((e) => !e.aValider && (e.note ?? 0) >= 4).sort((a, b) => (b.note ?? 0) - (a.note ?? 0));
      const k = `${kit.sujet}|${f}`;
      references[k] = [...new Set([...(references[k] ?? []), ...l.map((e) => (f === 'photo' ? e.url ?? '' : e.cle)).filter(Boolean)])].slice(0, 6);
    }
  }
  return { ...r, notes: poids?.notesElements ?? null, composeurLu: composeur.length, references };
}

