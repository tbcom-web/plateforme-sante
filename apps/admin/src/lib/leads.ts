import 'server-only';
import { idProfession } from '@plateforme/core/professions';
import { estLeadTest, etatEssai, jourParis, joursRestants, progressionParcours, prochaineRelance, relancesAFaire, relancesEssai, type EssaiPourRelances, type EtatEssaiId, type Relance } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { lienApercu } from '@/lib/essai';

// Essais gratuits pour le back-office commercial (/admin/leads) : lecture par la RLS (admin uniquement).

export type Lead = {
  owner: string;
  /** E-mail du compte, sinon celui laissé à la porte du rendu (session anonyme, 0025) ; '' si aucun */
  email: string;
  /** Téléphone laissé à l'étape 1 (migration 0024 ; vide sinon) */
  telephone: string;
  /** Lead de test (@webpodologue.fr ou « +test ») : exclu des statistiques, supprimable */
  test: boolean;
  /** Profession (registre professions.ts ; « pedicure-podologue » des essais ramené à « podologue ») */
  profession: string;
  prenom: string;
  nom: string;
  ville: string;
  source: string;
  utm: Record<string, string>;
  cguVersion: string | null;
  cguAccepteesLe: string | null;
  /** Création de l'essai (site commencé, session anonyme comprise) */
  creeLe: string;
  /** Coordonnées laissées à la porte du rendu (0025) */
  renduDemandeLe: string | null;
  /** Accès créé (compte permanent, CGU acceptées) ; null : session anonyme */
  accesCreeLe: string | null;
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
  /** Accès créé (sinon : session anonyme, aucun aperçu ni publication possible) */
  acces: boolean;
  etat: { id: EtatEssaiId; libelle: string };
  progression: number;
  joursRestants: number;
  lienApercu: string | null;
  relances: Relance[];
  aFaire: Relance[];
  prochaine: Relance | null;
};

const COLONNES_0023 = `owner, profession, prenom, nom, ville, source, utm, cgu_version, cgu_acceptees_le, conseils_opt_in, essai_debut, essai_fin, parcours_etape,
  apercu_genere_le, mise_en_ligne_demandee_le, valide_le, suspendu_le, paiement_statut, statut_commercial, prochaine_relance, relances_faites,
  profil:profiles!essais_owner_fkey(email), site:sites!essais_site_id_fkey(id, slug, statut, publication_etat, config)`;
// Avec la mise à jour 0024 : téléphone repris du prospect ; 0025 : session anonyme (contact, rendu, accès).
const COLONNES_0024 = `${COLONNES_0023}, telephone`;
const COLONNES = `${COLONNES_0024}, created_at, email_contact, rendu_demande_le, acces_cree_le`;

type Ligne = {
  owner: string; profession?: string | null; prenom: string; nom: string; ville: string; source: string; utm: Record<string, string> | null; cgu_version: string | null; cgu_acceptees_le: string | null;
  created_at?: string; email_contact?: string | null; rendu_demande_le?: string | null; acces_cree_le?: string | null;
  conseils_opt_in: boolean; essai_debut: string; essai_fin: string; parcours_etape: number; apercu_genere_le: string | null; mise_en_ligne_demandee_le: string | null;
  valide_le: string | null; suspendu_le: string | null; paiement_statut: string | null; statut_commercial: string; prochaine_relance: string | null;
  relances_faites: Record<string, string> | null; profil: { email: string } | null; telephone?: string | null;
  site: { id: string; slug: string | null; statut: string; publication_etat: string | null; config: { cabinet?: { nom?: string } } | null } | null;
};

export const pourRelances = (l: Pick<Lead, 'debut' | 'fin' | 'etape' | 'apercuGenereLe' | 'statutCommercial' | 'relancesFaites' | 'prochaineRelanceManuelle' | 'valideLe' | 'paiementStatut' | 'suspenduLe' | 'accesCreeLe' | 'renduDemandeLe'>): EssaiPourRelances => ({
  debut: l.debut, fin: l.fin, etape: l.etape, apercuGenere: Boolean(l.apercuGenereLe), statutCommercial: l.statutCommercial, faites: l.relancesFaites,
  prochaineRelance: l.prochaineRelanceManuelle, valideLe: l.valideLe, paye: l.paiementStatut === 'paye', suspenduLe: l.suspenduLe,
  acces: Boolean(l.accesCreeLe), renduLe: l.renduDemandeLe,
});

function versLead(l: Ligne, aujourdhui: string): Lead {
  const base = {
    owner: l.owner, email: l.profil?.email || l.email_contact || '', telephone: l.telephone ?? '', test: estLeadTest(l.profil?.email || l.email_contact), profession: idProfession(l.profession), prenom: l.prenom, nom: l.nom, ville: l.ville, source: l.source, utm: l.utm ?? {}, cguVersion: l.cgu_version,
    cguAccepteesLe: l.cgu_acceptees_le, creeLe: l.created_at ?? l.essai_debut, renduDemandeLe: l.rendu_demande_le ?? null,
    // Base sans 0025 : tout essai a ses CGU (inscription avec mot de passe), donc un accès.
    accesCreeLe: l.acces_cree_le !== undefined ? l.acces_cree_le : l.cgu_version ? l.cgu_acceptees_le : null, conseils: l.conseils_opt_in, debut: l.essai_debut, fin: l.essai_fin, etape: l.parcours_etape,
    apercuGenereLe: l.apercu_genere_le, miseEnLigneDemandeeLe: l.mise_en_ligne_demandee_le, valideLe: l.valide_le, suspenduLe: l.suspendu_le,
    paiementStatut: l.paiement_statut, statutCommercial: l.statut_commercial, prochaineRelanceManuelle: l.prochaine_relance, relancesFaites: l.relances_faites ?? {},
    site: l.site ? { id: l.site.id, slug: l.site.slug, statut: l.site.statut, publicationEtat: l.site.publication_etat, nomCabinet: l.site.config?.cabinet?.nom ?? '' } : null,
  };
  const r = pourRelances(base);
  return {
    ...base,
    acces: Boolean(base.accesCreeLe),
    etat: etatEssai({ acces: Boolean(base.accesCreeLe), renduLe: base.renduDemandeLe, etape: base.etape, apercuGenereLe: base.apercuGenereLe, miseEnLigneDemandeeLe: base.miseEnLigneDemandeeLe, valideLe: base.valideLe }),
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
  const requete = (colonnes: string) => supabase.from('essais').select(colonnes).order('essai_debut', { ascending: false }).limit(1000);
  let { data, error } = await requete(COLONNES);
  // Base sans la mise à jour 0025, puis 0024 (colonnes absentes) : lecture sans ces colonnes.
  if (error?.code === '42703') ({ data, error } = await requete(COLONNES_0024));
  if (error?.code === '42703') ({ data, error } = await requete(COLONNES_0023));
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
  const lire = (colonnes: string) => supabase.from('essais').select(colonnes).eq('owner', owner).maybeSingle();
  let { data, error } = await lire(COLONNES);
  if (error?.code === '42703') ({ data, error } = await lire(COLONNES_0024));
  if (error?.code === '42703') ({ data, error } = await lire(COLONNES_0023));
  return data ? versLead(data as unknown as Ligne, jourParis(Date.now())) : null;
}

export async function lireNotes(owner: string): Promise<{ id: string; texte: string; created_at: string; auteur: { email: string } | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('essais_notes').select('id, texte, created_at, auteur:profiles!essais_notes_auteur_fkey(email)').eq('owner', owner).order('created_at', { ascending: false });
  return (data ?? []) as unknown as { id: string; texte: string; created_at: string; auteur: { email: string } | null }[];
}
