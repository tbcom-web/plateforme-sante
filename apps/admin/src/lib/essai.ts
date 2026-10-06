import 'server-only';
import { createClient } from '@/lib/supabase/server';

// Essai gratuit du compte connecté (fonction mon_essai, migration 0023) : champs utiles au praticien uniquement.
// null si le compte n'est pas en essai, ou si la base n'a pas encore reçu la mise à jour 0023.

export type MonEssai = {
  debut: string;
  fin: string;
  siteId: string | null;
  prenom: string;
  nom: string;
  ville: string;
  etape: number;
  apercuGenereLe: string | null;
  miseEnLigneDemandeeLe: string | null;
  valideLe: string | null;
  suspenduLe: string | null;
  paiementStatut: string | null;
};

type Ligne = {
  essai_debut: string; essai_fin: string; site_id: string | null; prenom: string; nom: string; ville: string; parcours_etape: number;
  apercu_genere_le: string | null; mise_en_ligne_demandee_le: string | null; valide_le: string | null; suspendu_le: string | null; paiement_statut: string | null;
};

export async function getMonEssai(): Promise<MonEssai | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('mon_essai');
  if (error) {
    if (error.code !== 'PGRST202') console.error('mon_essai', error);
    return null;
  }
  const l = (Array.isArray(data) ? data[0] : data) as Ligne | undefined;
  if (!l) return null;
  return {
    debut: l.essai_debut, fin: l.essai_fin, siteId: l.site_id, prenom: l.prenom, nom: l.nom, ville: l.ville, etape: l.parcours_etape,
    apercuGenereLe: l.apercu_genere_le, miseEnLigneDemandeeLe: l.mise_en_ligne_demandee_le, valideLe: l.valide_le,
    suspenduLe: l.suspendu_le, paiementStatut: l.paiement_statut,
  };
}

/** Le site est-il une version d'essai non validée (production refusée) ? false si la base n'a pas la mise à jour 0023. */
export async function essaiBloqueProduction(siteId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('essai_bloque_production', { p_site: siteId });
  if (error) {
    if (error.code !== 'PGRST202') console.error('essai_bloque_production', error);
    return false;
  }
  return data === true;
}

/** Lien privé de la version d'essai (branche Cloudflare « apercu », jamais indexée). */
export const lienApercu = (slug: string | null | undefined) => (slug && /^[a-z0-9-]{1,63}$/.test(slug) ? `https://apercu.${slug}.pages.dev` : null);

export const dateLongue = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date(iso)) : '—';

/** Jour AAAA-MM-JJ en JJ/MM/AAAA (dates de relance). */
export const jourCourt = (jour: string) => jour.split('-').reverse().join('/');
