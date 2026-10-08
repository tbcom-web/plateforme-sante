'use server';

import { validerChoixGrille } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { MIGRATION_DEGUSTATION } from '@/lib/degustation';
import { createClient, getUser } from '@/lib/supabase/server';

/**
 * Enregistre un choix de grille (journal en ajout seul, migration 0042). Sans la migration : migrationManquante (la page garde le
 * choix dans le navigateur). Les duels de départage et les notes rapides passent par les actions existantes (duels, assets_notes).
 */
export async function enregistrerChoixGrille(brut: Record<string, unknown>): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  const v = validerChoixGrille(brut ?? {});
  if (!v.ok) return { ok: false, message: v.message };
  const c = v.choix;
  if (JSON.stringify(c.propositions).length > 110000) return { ok: false, message: 'Grille trop volumineuse.' };
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('degustation_choix').insert({
    format: c.format, type: c.type, dimension: c.dimension, scenario: c.scenario, propositions: c.propositions, meilleures: c.meilleures, pire: c.pire,
    pari: c.pari, appareil: c.appareil, session: c.session, duree_ms: c.dureeMs, profession: c.profession, profil: c.profil, auteur: user?.id ?? null,
  });
  if (error) return { ok: false, message: MIGRATION_DEGUSTATION, migrationManquante: true };
  // Pas de revalidatePath : la session continue sans recharger la page (état tenu par le navigateur)
  return { ok: true, message: 'Choix enregistré.' };
}
