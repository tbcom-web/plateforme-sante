import 'server-only';
import { jourParis, joursRestants, progressionParcours, prochaineRelance, relancesAFaire, relancesEssai, type EssaiPourRelances, type Relance } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { lienApercu } from '@/lib/essai';

// Essais gratuits pour le back-office commercial (/admin/leads) : lecture par la RLS (admin uniquement).

export type Lead = {
  owner: string;
  email: string;
  prenom: string;
  nom: string;
  ville: string;
  source: string;
  utm: Record<string, string>;
  cguVersion: string;
  cguAccepteesLe: string;
  conseils: boolean;
  debut: string;
  fin: string;
  etape: number;
  apercuGenereLe: string | null;
  miseEnLigneDemandeeLe: string | null;
  valideLe: string | null;
  suspenduLe: string | null;
  paiementStatut: string | null;
  statutCommercial: string;
  prochaineRelanceManuelle: string | null;
  relancesFaites: Record<string, string>;
  site: { id: string; slug: string | null; statut: string; publicationEtat: string | null; nomCabinet: string } | null;
  // Calculés
  progression: number;
  joursRestants: number;
  lienApercu: string | null;
  relances: Relance[];
  aFaire: Relance[];
  prochaine: Relance | null;
};

const COLONNES = `owner, prenom, nom, ville, source, utm, cgu_version, cgu_acceptees_le, conseils_opt_in, essai_debut, essai_fin, parcours_etape,
  apercu_genere_le, mise_en_ligne_demandee_le, valide_le, suspendu_le, paiement_statut, statut_commercial, prochaine_relance, relances_faites,
  profil:profiles!essais_owner_fkey(email), site:sites!essais_site_id_fkey(id, slug, statut, publication_etat, config)`;

type Ligne = {
  owner: string; prenom: string; nom: string; ville: string; source: string; utm: Record<string, string> | null; cgu_version: string; cgu_acceptees_le: string;
  conseils_opt_in: boolean; essai_debut: string; essai_fin: string; parcours_etape: number; apercu_genere_le: string | null; mise_en_ligne_demandee_le: string | null;
  valide_le: string | null; suspendu_le: string | null; paiement_statut: string | null; statut_commercial: string; prochaine_relance: string | null;
  relances_faites: Record<string, string> | null; profil: { email: string } | null;
  site: { id: string; slug: string | null; statut: string; publication_etat: string | null; config: { cabinet?: { nom?: string } } | null } | null;
};

export const pourRelances = (l: Pick<Lead, 'debut' | 'fin' | 'etape' | 'apercuGenereLe' | 'statutCommercial' | 'relancesFaites' | 'prochaineRelanceManuelle' | 'valideLe' | 'paiementStatut' | 'suspenduLe'>): EssaiPourRelances => ({
  debut: l.debut, fin: l.fin, etape: l.etape, apercuGenere: Boolean(l.apercuGenereLe), statutCommercial: l.statutCommercial, faites: l.relancesFaites,
  prochaineRelance: l.prochaineRelanceManuelle, valideLe: l.valideLe, paye: l.paiementStatut === 'paye', suspenduLe: l.suspenduLe,
});

function versLead(l: Ligne, aujourdhui: string): Lead {
  const base = {
    owner: l.owner, email: l.profil?.email ?? '', prenom: l.prenom, nom: l.nom, ville: l.ville, source: l.source, utm: l.utm ?? {}, cguVersion: l.cgu_version,
    cguAccepteesLe: l.cgu_acceptees_le, conseils: l.conseils_opt_in, debut: l.essai_debut, fin: l.essai_fin, etape: l.parcours_etape,
    apercuGenereLe: l.apercu_genere_le, miseEnLigneDemandeeLe: l.mise_en_ligne_demandee_le, valideLe: l.valide_le, suspenduLe: l.suspendu_le,
    paiementStatut: l.paiement_statut, statutCommercial: l.statut_commercial, prochaineRelanceManuelle: l.prochaine_relance, relancesFaites: l.relances_faites ?? {},
    site: l.site ? { id: l.site.id, slug: l.site.slug, statut: l.site.statut, publicationEtat: l.site.publication_etat, nomCabinet: l.site.config?.cabinet?.nom ?? '' } : null,
  };
  const r = pourRelances(base);
  return {
    ...base,
    progression: progressionParcours({ etape: base.etape, apercuGenere: Boolean(base.apercuGenereLe) }),
    joursRestants: joursRestants(base.fin, Date.now()),
    lienApercu: base.apercuGenereLe ? lienApercu(base.site?.slug) : null,
    relances: relancesEssai(r, aujourdhui),
    aFaire: relancesAFaire(r, aujourdhui),
    prochaine: prochaineRelance(r, aujourdhui),
  };
}

/** Tous les essais (du plus récent au plus ancien), ou null si la base n'a pas la mise à jour 0023. */
export async function lireLeads(): Promise<Lead[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('essais').select(COLONNES).order('essai_debut', { ascending: false }).limit(1000);
  if (error) {
    console.error('essais', error);
    return null;
  }
  const aujourdhui = jourParis(Date.now());
  return ((data ?? []) as unknown as Ligne[]).map((l) => versLead(l, aujourdhui));
}

export async function lireLead(owner: string): Promise<Lead | null> {
  if (!/^[0-9a-f-]{36}$/.test(owner)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('essais').select(COLONNES).eq('owner', owner).maybeSingle();
  return data ? versLead(data as unknown as Ligne, jourParis(Date.now())) : null;
}

export async function lireNotes(owner: string): Promise<{ id: string; texte: string; created_at: string; auteur: { email: string } | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('essais_notes').select('id, texte, created_at, auteur:profiles!essais_notes_auteur_fkey(email)').eq('owner', owner).order('created_at', { ascending: false });
  return (data ?? []) as unknown as { id: string; texte: string; created_at: string; auteur: { email: string } | null }[];
}
