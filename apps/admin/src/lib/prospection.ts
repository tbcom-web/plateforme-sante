import 'server-only';
import { moisAvant, PERIODES_INSTALLATION, type FiltresProspection } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// Lecture de la prospection RPPS (migration 0055, docs/prospection-rpps.md) avec la session de la personne : RLS admin seulement.
// null quand la migration n'est pas passée.

export type LigneProspection = {
  cle: string; rpps: string; civilite: string | null; nom: string | null; prenom: string | null; profession: string | null; mode_exercice: string | null;
  raison_sociale: string | null; enseigne: string | null; adresse: string | null; code_postal: string | null; commune: string | null; departement: string | null;
  telephone: string | null; email: string | null; siret: string | null; apparu_le: string | null; disparu_le: string | null;
  siret_cree_le: string | null; siret_source: string | null; siret_ferme: boolean | null; entreprise_nom: string | null;
  statut: string | null; note: string | null; relance_le: string | null;
};
export type Synchro = { le: string; lignes: number | null; nouveaux: number | null; disparus: number | null; verifies: number | null };

const COLONNES = 'cle,rpps,civilite,nom,prenom,profession,mode_exercice,raison_sociale,enseigne,adresse,code_postal,commune,departement,telephone,email,siret,'
  + 'apparu_le,disparu_le,siret_cree_le,siret_source,siret_ferme,entreprise_nom,statut,note,relance_le';
export const PAR_PAGE = 50;

export async function lireProspection(f: FiltresProspection, { tout = false } = {}): Promise<{ lignes: LigneProspection[]; total: number } | null> {
  const supabase = await createClient();
  const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  let req = supabase.from('prospection_liste').select(COLONNES, { count: 'exact' });
  if (f.departement) req = req.eq('departement', f.departement);
  if (f.liberal) req = req.ilike('mode_exercice', 'lib%');
  if (f.actifs) req = req.is('disparu_le', null).not('siret_ferme', 'is', true);
  // Conditions « l'une ou l'autre », réunies en un seul filtre or=(and(or(…),or(…)))
  const ou: string[] = [];
  const mois = PERIODES_INSTALLATION.find((p) => p.id === f.periode)?.mois ?? null;
  if (mois) {
    const limite = moisAvant(aujourdhui, mois);
    ou.push(`siret_cree_le.gte.${limite},apparu_le.gte.${limite}`);
  }
  if (f.statut === 'relance') req = req.lte('relance_le', aujourdhui).not('statut', 'in', '(gagne,perdu,hors_cible)');
  else if (f.statut === 'a_contacter') ou.push('statut.is.null,statut.eq.a_contacter');
  else if (f.statut) req = req.eq('statut', f.statut);
  if (f.q) {
    const motif = `"*${f.q.replace(/["*,()]/g, ' ')}*"`;
    ou.push(['nom', 'prenom', 'commune', 'code_postal', 'raison_sociale'].map((c) => `${c}.ilike.${motif}`).join(','));
  }
  if (ou.length === 1) req = req.or(ou[0]);
  else if (ou.length > 1) req = req.or(`and(${ou.map((o) => `or(${o})`).join(',')})`);
  req = req.order('siret_cree_le', { ascending: false, nullsFirst: false }).order('apparu_le', { ascending: false, nullsFirst: false }).order('nom');
  const debut = tout ? 0 : (f.page - 1) * PAR_PAGE;
  const { data, count, error } = await req.range(debut, debut + (tout ? 4999 : PAR_PAGE - 1));
  if (error) return null;
  return { lignes: (data ?? []) as unknown as LigneProspection[], total: count ?? 0 };
}

export async function derniereSynchro(): Promise<Synchro | null> {
  const { data } = await (await createClient()).from('prospection_synchros').select('le,lignes,nouveaux,disparus,verifies').order('le', { ascending: false }).limit(1).maybeSingle();
  return (data as Synchro | null) ?? null;
}
