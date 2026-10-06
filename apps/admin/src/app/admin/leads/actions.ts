'use server';

import { revalidatePath } from 'next/cache';
import { estLeadTest, prolongerEssai, STATUTS_COMMERCIAUX, jourParis } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { declencherApercu, declencherPublication } from '@/lib/publication';
import { createClient } from '@/lib/supabase/server';

// Actions du back-office commercial (/admin/leads), réservées à l'admin (exigerAdmin + RLS « essais : admin »).

export type EtatLead = { ok: boolean; message: string } | null;
const UUID = /^[0-9a-f-]{36}$/;
const CODES = ['j1_parcours', 'j7', 'j60', 'fin_moins_15', 'fin_moins_1', 'fin_essai'];

const rafraichir = (owner: string) => {
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${owner}`);
};

/** Statut commercial et prochaine relance programmée. */
export async function majSuivi(owner: string, _: EtatLead, f: FormData): Promise<EtatLead> {
  await exigerAdmin();
  if (!UUID.test(owner)) return { ok: false, message: 'Essai invalide.' };
  const statut = String(f.get('statut') ?? '');
  const relance = String(f.get('relance') ?? '');
  if (!STATUTS_COMMERCIAUX.some((s) => s.id === statut)) return { ok: false, message: 'Statut invalide.' };
  if (relance && !/^\d{4}-\d{2}-\d{2}$/.test(relance)) return { ok: false, message: 'Date invalide.' };
  const { error } = await (await createClient()).from('essais').update({ statut_commercial: statut, prochaine_relance: relance || null }).eq('owner', owner);
  rafraichir(owner);
  return error ? { ok: false, message: 'Enregistrement impossible.' } : { ok: true, message: 'Suivi enregistré.' };
}

export async function ajouterNote(owner: string, _: EtatLead, f: FormData): Promise<EtatLead> {
  await exigerAdmin();
  const texte = String(f.get('texte') ?? '').trim().slice(0, 4000);
  if (!UUID.test(owner) || !texte) return { ok: false, message: 'Note vide.' };
  const { error } = await (await createClient()).from('essais_notes').insert({ owner, texte });
  rafraichir(owner);
  return error ? { ok: false, message: 'Note non enregistrée.' } : { ok: true, message: 'Note ajoutée.' };
}

/** Relance faite (par téléphone ou depuis la messagerie de la commerciale : aucun envoi automatique). */
export async function marquerRelance(owner: string, code: string): Promise<EtatLead> {
  await exigerAdmin();
  if (!UUID.test(owner)) return { ok: false, message: 'Essai invalide.' };
  const supabase = await createClient();
  const aujourdhui = jourParis(Date.now());
  if (code === 'manuelle') {
    const { error } = await supabase.from('essais').update({ prochaine_relance: null }).eq('owner', owner);
    rafraichir(owner);
    return error ? { ok: false, message: 'Enregistrement impossible.' } : { ok: true, message: 'Relance faite.' };
  }
  if (!CODES.includes(code)) return { ok: false, message: 'Relance inconnue.' };
  const { data } = await supabase.from('essais').select('relances_faites, statut_commercial').eq('owner', owner).maybeSingle();
  const faites = { ...((data?.relances_faites as Record<string, string> | null) ?? {}), [code]: aujourdhui };
  const statut = data?.statut_commercial === 'nouveau' ? 'contacte' : data?.statut_commercial;
  const { error } = await supabase.from('essais').update({ relances_faites: faites, statut_commercial: statut }).eq('owner', owner);
  rafraichir(owner);
  return error ? { ok: false, message: 'Enregistrement impossible.' } : { ok: true, message: 'Relance notée comme faite.' };
}

export async function prolonger(owner: string, jours: number): Promise<EtatLead> {
  await exigerAdmin();
  if (!UUID.test(owner) || ![15, 30, 60].includes(jours)) return { ok: false, message: 'Prolongation invalide.' };
  const supabase = await createClient();
  const { data } = await supabase.from('essais').select('essai_fin').eq('owner', owner).maybeSingle();
  if (!data) return { ok: false, message: 'Essai introuvable.' };
  const fin = prolongerEssai(data.essai_fin as string, jours, Date.now()).toISOString();
  const { error } = await supabase.from('essais').update({ essai_fin: fin }).eq('owner', owner);
  rafraichir(owner);
  return error ? { ok: false, message: 'Prolongation impossible.' } : { ok: true, message: `Essai prolongé de ${jours} jours.` };
}

/**
 * Suspend la version d'essai (ou lève la suspension) : statut du site et de l'essai, puis régénération de l'aperçu
 * (page « version d'essai suspendue » à la place du site, ou site rétabli).
 */
export async function suspendre(owner: string, suspendu: boolean): Promise<EtatLead> {
  await exigerAdmin();
  if (!UUID.test(owner)) return { ok: false, message: 'Essai invalide.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('essais').update({ suspendu_le: suspendu ? new Date().toISOString() : null }).eq('owner', owner).select('site_id').maybeSingle();
  if (error || !data) return { ok: false, message: 'Mise à jour impossible.' };
  const siteId = data.site_id as string | null;
  let complement = '';
  if (siteId) {
    await supabase.from('sites').update({ statut: suspendu ? 'suspendu' : 'brouillon' }).eq('id', siteId);
    const r = await declencherApercu(siteId);
    complement = r.ok ? ' L’aperçu est en cours de mise à jour.' : ` Aperçu non régénéré : ${r.message}`;
  }
  rafraichir(owner);
  return { ok: true, message: `${suspendu ? 'Version d’essai suspendue.' : 'Suspension levée.'}${complement}` };
}

/**
 * « Valider et mettre en ligne » : la commerciale a vérifié les informations (inscription à l'Ordre, cabinet). L'essai
 * est validé (valider_essai : valide_par = admin connecté) puis le site est publié en production par le flux existant.
 */
export async function validerEtMettreEnLigne(owner: string): Promise<EtatLead> {
  await exigerAdmin();
  if (!UUID.test(owner)) return { ok: false, message: 'Essai invalide.' };
  const supabase = await createClient();
  const { data } = await supabase.from('essais').select('site_id').eq('owner', owner).maybeSingle();
  const siteId = data?.site_id as string | null | undefined;
  if (!siteId) return { ok: false, message: 'Aucun site créé pour cet essai.' };
  const { error } = await supabase.rpc('valider_essai', { p_owner: owner });
  if (error) {
    console.error('valider_essai', error);
    return { ok: false, message: 'Validation impossible.' };
  }
  await supabase.from('sites').update({ statut: 'brouillon' }).eq('id', siteId).eq('statut', 'suspendu');
  const r = await declencherPublication(siteId);
  rafraichir(owner);
  revalidatePath('/admin');
  return r.ok ? { ok: true, message: 'Essai validé, mise en ligne lancée.' } : { ok: false, message: `Essai validé, mais la publication n’a pas démarré : ${r.message}` };
}

const CODES_PROSPECT = ['p1', 'p3'];

/** Relance d'un prospect sans compte faite (par téléphone ou depuis la messagerie de la commerciale). */
export async function marquerRelanceProspect(id: string, code: string): Promise<EtatLead> {
  await exigerAdmin();
  if (!UUID.test(id) || !CODES_PROSPECT.includes(code)) return { ok: false, message: 'Relance inconnue.' };
  const supabase = await createClient();
  const { data } = await supabase.from('prospects').select('relances_faites').eq('id', id).maybeSingle();
  if (!data) return { ok: false, message: 'Prospect introuvable.' };
  const faites = { ...((data.relances_faites as Record<string, string> | null) ?? {}), [code]: jourParis(Date.now()) };
  const { error } = await supabase.from('prospects').update({ relances_faites: faites }).eq('id', id);
  revalidatePath('/admin/leads');
  return error ? { ok: false, message: 'Enregistrement impossible.' } : { ok: true, message: 'Relance notée comme faite.' };
}

/**
 * Supprime un lead de TEST (e-mail @webpodologue.fr ou « +test ») : prospect, essai, notes et site de l'essai, par la
 * fonction SQL supprimer_lead_test (refus pour un vrai lead ou un compte admin). Le compte de connexion reste : à
 * supprimer dans Supabase → Authentication → Users (aucune clé service_role ici).
 */
export async function supprimerLeadTest(email: string): Promise<EtatLead> {
  await exigerAdmin();
  if (!estLeadTest(email)) return { ok: false, message: 'Seuls les leads de test peuvent être supprimés ici.' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('supprimer_lead_test', { p_email: email });
  if (error) {
    console.error('supprimer_lead_test', error.code, error.message);
    if (error.code === 'PGRST202') return { ok: false, message: 'La base n’a pas encore la mise à jour 0024.' };
    if (error.code === '23503') return { ok: false, message: 'Suppression impossible : le site est lié à d’autres données (licences de photos).' };
    return { ok: false, message: error.message.slice(0, 200) || 'Suppression impossible.' };
  }
  revalidatePath('/admin/leads');
  revalidatePath('/admin');
  const r = (data ?? {}) as { prospects?: number; essais?: number; sites?: number; compte?: boolean };
  const compte = r.compte ? ' Le compte de connexion existe encore : supprimez-le dans Supabase → Authentication → Users.' : '';
  return { ok: true, message: `Lead de test supprimé (prospect : ${r.prospects ?? 0}, essai : ${r.essais ?? 0}, site : ${r.sites ?? 0}).${compte}` };
}
