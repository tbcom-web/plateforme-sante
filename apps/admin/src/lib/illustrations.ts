import 'server-only';
import { estStatutIllustration, type StatutIllustration } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// Revues des illustrations (migration 0021) : statut courant par clé et journal des retours, lus par le super admin.

export type StatutEnregistre = { cle: string; statut: StatutIllustration; empreinte: string | null; majLe: string };
export type Revue = { id: string; cle: string; statut: StatutIllustration; commentaire: string | null; empreinte: string | null; le: string; auteur: string | null };

type LigneRevue = { id: string; cle: string; statut: string; commentaire: string | null; empreinte: string | null; created_at: string; profiles?: { email: string } | { email: string }[] | null };

/** Statuts et journal ; `migrationManquante` : tables absentes (migration 0021 pas encore exécutée) */
export async function getRevuesIllustrations(): Promise<{ statuts: StatutEnregistre[]; revues: Revue[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const [s, r] = await Promise.all([
    supabase.from('illustrations_statuts').select('cle, statut, empreinte, maj_le'),
    supabase.from('illustrations_revues').select('id, cle, statut, commentaire, empreinte, created_at, profiles(email)').order('created_at', { ascending: false }).limit(5000),
  ]);
  if (s.error) return { statuts: [], revues: [], migrationManquante: true };
  const statuts = ((s.data ?? []) as { cle: string; statut: string; empreinte: string | null; maj_le: string }[])
    .filter((l) => estStatutIllustration(l.statut))
    .map((l) => ({ cle: l.cle, statut: l.statut as StatutIllustration, empreinte: l.empreinte, majLe: l.maj_le }));
  const email = (p: LigneRevue['profiles']) => (Array.isArray(p) ? p[0]?.email : p?.email) ?? null;
  const revues = ((r.data ?? []) as LigneRevue[])
    .filter((l) => estStatutIllustration(l.statut))
    .map((l) => ({ id: l.id, cle: l.cle, statut: l.statut as StatutIllustration, commentaire: l.commentaire, empreinte: l.empreinte, le: l.created_at, auteur: email(l.profiles) }));
  return { statuts, revues, migrationManquante: false };
}
