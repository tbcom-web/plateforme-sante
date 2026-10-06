import 'server-only';
import {
  ajouterJours, ecartJours, entonnoirEssai, jourParis, libelleEtapeProspect, lienRepriseProspect, relanceProspectAFaire, relancesProspect,
  type EtapeEntonnoir, type RelanceProspect,
} from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import type { Lead } from '@/lib/leads';

// Prospects de l'essai (coordonnées laissées à l'étape 1, migration 0024) et entonnoir de /admin/leads.
// Lecture par la RLS (admin uniquement). null si la base n'a pas encore la mise à jour 0024.

export type Prospect = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  ville: string;
  source: string;
  utm: Record<string, string>;
  etape: string;
  etapeLibelle: string;
  conseils: boolean;
  visites: number;
  creeLe: string;
  derniereVisite: string;
  owner: string | null;
  compteCreeLe: string | null;
  relancesFaites: Record<string, string>;
  test: boolean;
  // Calculés
  joursSansCompte: number;
  relances: RelanceProspect[];
  aFaire: RelanceProspect | null;
  lienReprise: string;
};

type Ligne = {
  id: string; email: string; prenom: string; nom: string; telephone: string; ville: string; source: string; utm: Record<string, string> | null; etape: string;
  conseils_opt_in: boolean; visites: number; created_at: string; derniere_visite: string; owner: string | null; compte_cree_le: string | null;
  relances_faites: Record<string, string> | null; test: boolean;
};

const COLONNES = 'id, email, prenom, nom, telephone, ville, source, utm, etape, conseils_opt_in, visites, created_at, derniere_visite, owner, compte_cree_le, relances_faites, test';

/** Origine des liens de reprise envoyés aux prospects (domaine de l'essai). */
export function origineEssai(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_URL_ESSAI || 'https://admin.webpodologue.fr/essai').origin;
  } catch {
    return 'https://admin.webpodologue.fr';
  }
}

function versProspect(l: Ligne, aujourdhui: string, origine: string): Prospect {
  const r = { creeLe: l.created_at, compteCreeLe: l.compte_cree_le, faites: l.relances_faites };
  return {
    id: l.id, email: l.email, prenom: l.prenom, nom: l.nom, telephone: l.telephone, ville: l.ville, source: l.source, utm: l.utm ?? {}, etape: l.etape,
    etapeLibelle: libelleEtapeProspect(l.etape), conseils: l.conseils_opt_in, visites: l.visites, creeLe: l.created_at, derniereVisite: l.derniere_visite,
    owner: l.owner, compteCreeLe: l.compte_cree_le, relancesFaites: l.relances_faites ?? {}, test: l.test,
    joursSansCompte: Math.max(0, ecartJours(jourParis(l.created_at), aujourdhui)),
    relances: relancesProspect(r, aujourdhui),
    aFaire: relanceProspectAFaire(r, aujourdhui),
    lienReprise: lienRepriseProspect(origine, l.email),
  };
}

/** Prospects (du plus récent au plus ancien), ou null si la base n'a pas la mise à jour 0024. */
export async function lireProspects(): Promise<Prospect[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('prospects').select(COLONNES).order('created_at', { ascending: false }).limit(1000);
  if (error) {
    if (error.code !== '42P01' && error.code !== 'PGRST205') console.error('prospects', error);
    return null;
  }
  const aujourdhui = jourParis(Date.now());
  const origine = origineEssai();
  return ((data ?? []) as unknown as Ligne[]).map((l) => versProspect(l, aujourdhui, origine));
}

/** Visites de /essai par jour depuis `depuis` (AAAA-MM-JJ), ou [] sans la mise à jour 0024. */
async function lireVisites(depuis: string): Promise<{ jour: string; nombre: number }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('essais_compteurs').select('jour, nombre').eq('etape', 'visite').gte('jour', depuis);
  if (error) return [];
  return (data ?? []) as { jour: string; nombre: number }[];
}

export type Entonnoirs = { j7: EtapeEntonnoir[]; j30: EtapeEntonnoir[]; mesureActive: boolean };

/** Entonnoir sur 7 et 30 jours (leads de test exclus). */
export async function lireEntonnoirs(leads: Lead[], prospects: Prospect[] | null): Promise<Entonnoirs> {
  const aujourdhui = jourParis(Date.now());
  const depuis7 = ajouterJours(aujourdhui, -6);
  const depuis30 = ajouterJours(aujourdhui, -29);
  const visites = prospects ? await lireVisites(depuis30) : [];
  const donnees = {
    visites,
    prospects: (prospects ?? []).map((p) => ({ creeLe: p.creeLe, email: p.email })),
    essais: leads.map((l) => ({ debut: l.debut, email: l.email, etape: l.etape, apercuGenereLe: l.apercuGenereLe, miseEnLigneDemandeeLe: l.miseEnLigneDemandeeLe, valideLe: l.valideLe })),
  };
  return { j7: entonnoirEssai(donnees, depuis7), j30: entonnoirEssai(donnees, depuis30), mesureActive: prospects !== null };
}
