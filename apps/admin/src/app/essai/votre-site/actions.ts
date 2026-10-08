'use server';

import { headers } from 'next/headers';
import { professionParcours } from '@plateforme/core/onboarding-professions';
import { normaliserChoixClient } from '@plateforme/core/onboarding';
import { rppsSaisi } from '@plateforme/core/annuaire-sante';
import { validerPorteRendu, type ReglagesSite, type SiteDraft } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { getMonSite } from '@/lib/sites';
import { estModeTest } from '@/lib/mode-test';
import { limiteDebit, parIdentifiant, parNom, parRpps, type ResultatAnnuaire } from '@/lib/annuaire-sante';
import { clientAnonyme, hacherIp } from '@/lib/capture';
import { capturerRendu, choisirModele, type EtatParcours, type EtatPorte } from '@/app/creer/actions';
import { professionOuverte } from '@/lib/professions-parcours';

// Actions du parcours client (/essai/votre-site). En MODE TEST (super admin, lib/mode-test.ts) : aucune écriture, aucun
// prospect, aucun appel réel à l'annuaire (fiches de démonstration).

async function visiteur(): Promise<{ cle: string; ip: string | null }> {
  const h = await headers();
  const ip = (h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || '').trim().slice(0, 64) || null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { cle: data.user?.id ?? `ip:${ip ?? 'inconnue'}`, ip };
}

/**
 * Recherche dans l'Annuaire Santé (préremplissage facultatif) : par RPPS, par nom (+ ville), ou fiche d'un résultat.
 * Réservée à une session ouverte (anonyme comprise) ; limite de débit par visiteur ; jamais d'erreur bloquante.
 */
export async function chercherAnnuaire(demande: { rpps?: string; nom?: string; ville?: string; id?: string; profession?: string }): Promise<ResultatAnnuaire> {
  const test = await estModeTest();
  const v = await visiteur();
  if (v.cle.startsWith('ip:') && !test) return { etat: 'erreur' };
  if (!limiteDebit(v.cle)) return { etat: 'limite' };
  if (demande.id) return parIdentifiant(String(demande.id).slice(0, 64), test);
  if (demande.rpps && rppsSaisi(demande.rpps)) return parRpps(demande.rpps, test);
  const code = professionParcours(demande.profession)?.codesRpps[0] ?? null;
  return parNom(String(demande.nom ?? '').slice(0, 80), String(demande.ville ?? '').slice(0, 80), code, test);
}

export type EtatCreation = EtatParcours & { test?: boolean };

/**
 * « Voir mon site » : enregistre le brouillon (identité CONFIRMÉE seulement, préférences du client) et applique la
 * proposition retenue (même chemin que /creer : choisirModele). Le site reste un brouillon d'essai, jamais publié.
 * Mode test : rien n'est écrit.
 */
export async function enregistrerSiteClient(
  draft: SiteDraft,
  universId: string,
  reglages: Partial<ReglagesSite> & { proposition?: string | null; recette?: string | null },
  siteId: string | null,
  version: string | null,
): Promise<EtatCreation> {
  if (await estModeTest()) return { ok: true, test: true, message: 'Mode test : rien n’est enregistré.' };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, message: 'Session expirée : rechargez la page.' };
  // Un seul site par compte d'essai : reprise du site existant s'il y en a un
  const existant = siteId ? null : await getMonSite();
  const id = siteId ?? existant?.id ?? null;
  const v = siteId ? version : existant?.updatedAt ?? null;
  const choix = normaliserChoixClient(draft.choixClient);
  // Profession fermée au public (en préparation, pack non publiable) : aucun site d'essai (seul le mode test la montre)
  if (!(await professionOuverte(choix?.profession || 'podologue'))) return { ok: false, message: 'Cette profession n’est pas encore ouverte.' };
  const d: SiteDraft = { ...draft, ...(choix ? { choixClient: choix } : {}) };
  return choisirModele(id, d, v, universId, reglages);
}

/**
 * Liste d'attente d'une profession pas encore disponible : prospect « sans compte » (capturer_prospect, 0024 ; source
 * « liste-attente:<profession> »), accord de recontact obligatoire. Aucun e-mail n'est envoyé. Mode test : rien n'est écrit.
 */
export async function inscrireListeAttente(s: { profession: string; email: string; prenom: string; nom: string; ville: string; recontact: boolean }): Promise<{ ok: boolean; message: string }> {
  const p = professionParcours(s.profession);
  if (!p || (await professionOuverte(p.id))) return { ok: false, message: 'Profession inconnue.' };
  if (!s.recontact) return { ok: false, message: 'Cochez l’accord pour être recontacté(e).' };
  const email = String(s.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { ok: false, message: 'Adresse e-mail invalide.' };
  const ligne = (x: string) => String(x ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!ligne(s.prenom) || !ligne(s.nom) || !ligne(s.ville)) return { ok: false, message: 'Prénom, nom et ville sont nécessaires pour vous recontacter.' };
  if (await estModeTest()) return { ok: true, message: 'Mode test : inscription simulée, rien n’est enregistré.' };
  const v = await visiteur();
  const { error } = await clientAnonyme().rpc('capturer_prospect', {
    p_email: email, p_prenom: ligne(s.prenom), p_nom: ligne(s.nom), p_telephone: '', p_ville: ligne(s.ville),
    p_source: `liste-attente:${p.id}`.slice(0, 80), p_utm: {}, p_recontact: true, p_conseils: false,
    p_ip_hash: hacherIp(v.ip), p_etape: 'capture', p_jeton: process.env.PROSPECTS_JETON ?? null,
  });
  if (error) {
    if (error.code === '54000') return { ok: false, message: 'Trop de demandes : réessayez dans quelques minutes.' };
    console.error('liste d’attente', error.code, error.message);
    return { ok: false, message: 'Inscription impossible pour le moment. Réessayez plus tard.' };
  }
  return { ok: true, message: 'C’est noté : nous vous recontacterons à l’ouverture pour votre profession.' };
}

/**
 * Porte du rendu (e-mail, téléphone, accord de recontact) : même capture que /creer (capturer_prospect_essai, lead lié au
 * compte anonyme). Mode test : contrôles seulement, AUCUN lead, aucun e-mail.
 */
export async function capturerRenduClient(saisie: { email: string; telephone: string; recontact: boolean; conseils: boolean }): Promise<EtatPorte> {
  if (await estModeTest()) {
    const v = validerPorteRendu(saisie);
    return v.ok ? { ok: true, message: 'Mode test : rien n’est enregistré.' } : { ok: false, message: Object.values(v.erreurs)[0] ?? 'Saisie incomplète.', erreurs: v.erreurs };
  }
  return capturerRendu(saisie);
}
