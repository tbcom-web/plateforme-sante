'use server';

import { validerPorteRendu, type ReglagesSite, type SiteDraft } from '@plateforme/core';
import { getRole } from '@/lib/admin';
import { appliquerUniversAuSite } from '@/lib/univers';
import { enregistrerEtPublier, enregistrerSite, type EtatEnregistrement } from '../mon-site/actions';
import { declencherApercuEssai } from '@/lib/publication';
import { createClient } from '@/lib/supabase/server';

// Actions du parcours guidé (/creer) : mêmes chemins que le formulaire complet (enregistrement avec verrou optimiste,
// publication par demander_publication puis le workflow), plus l'application d'un modèle du parcours.

export type EtatParcours = EtatEnregistrement & { draft?: SiteDraft; soinsACocher?: string[] };

/** Sauvegarde automatique du brouillon (jamais la version en ligne) */
export async function sauvegarderParcours(id: string | null, draft: SiteDraft, version?: string | null): Promise<EtatParcours> {
  const r = await enregistrerSite(id, draft, version);
  return r.ok ? { ...r, message: 'Brouillon enregistré.' } : r;
}

/**
 * « Choisir ce site » : enregistre la saisie (crée le site au premier choix), puis applique la structure choisie au brouillon
 * (appliquerUniversAuSite : identité conservée, verrou optimiste) et les réglages de la proposition (gamme, style
 * d'illustration, animation). Renvoie le brouillon obtenu.
 */
export async function choisirModele(id: string | null, draft: SiteDraft, version: string | null, universId: string, reglages?: Partial<ReglagesSite> & { proposition?: string | null; recette?: string | null }): Promise<EtatParcours> {
  const r = await enregistrerSite(id, draft, version);
  if (!r.ok || !r.id) return r;
  const admin = (await getRole()) === 'admin';
  const a = await appliquerUniversAuSite(r.id, universId, { admin, version: r.version, parcours: true, ...(reglages ? { reglages } : {}) });
  if (!a.ok || !a.draft) return { ok: false, message: a.message, id: r.id, version: r.version };
  return { ok: true, message: 'Site appliqué. Votre brouillon est enregistré.', id: r.id, version: a.version, draft: a.draft, soinsACocher: a.resultat?.soinsACocher };
}

/** « Publier mon site » : enregistre puis publie par le chemin existant (manques vérifiés pour le praticien) */
export async function publierParcours(id: string | null, draft: SiteDraft, version?: string | null): Promise<EtatParcours> {
  return enregistrerEtPublier(id, draft, version);
}

/**
 * Version d'essai, « Voir mon site » : enregistre puis génère l'APERÇU privé (jamais la production ; la garde est aussi
 * côté serveur dans declencherPublication, en SQL et dans le workflow).
 */
export async function publierApercuParcours(id: string | null, draft: SiteDraft, version?: string | null): Promise<EtatParcours> {
  const r = await enregistrerSite(id, draft, version);
  if (!r.ok || !r.id) return r;
  const p = await declencherApercuEssai(r.id);
  return { ...r, ok: p.ok, message: p.ok ? 'Enregistré. Votre version d’essai est en préparation.' : `Enregistré, mais : ${p.message}` };
}

/** Étape atteinte dans le parcours (progression visible par la conseillère) ; silencieux si l'essai n'existe pas. */
export async function noterProgressionEssai(etape: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('noter_progression_essai', { p_etape: Math.max(0, Math.min(7, Math.round(etape))) });
  if (error && error.code !== 'PGRST202') console.error('noter_progression_essai', error);
}

export type EtatPorte = { ok: boolean; message: string; erreurs?: Partial<Record<'email' | 'telephone' | 'recontact', string>> };

/**
 * Porte du rendu (« Voir le rendu de mon site ») : e-mail, téléphone du cabinet, accord de recontact obligatoire,
 * conseils facultatifs. Enregistre le prospect lié au compte (anonyme) par capturer_prospect_essai (0025) : nom et ville
 * repris du brouillon côté SQL. Le rendu est ensuite calculé dans le navigateur (aucun workflow).
 */
export async function capturerRendu(saisie: { email: string; telephone: string; recontact: boolean; conseils: boolean }): Promise<EtatPorte> {
  const v = validerPorteRendu(saisie);
  if (!v.ok) return { ok: false, message: Object.values(v.erreurs)[0] ?? 'Saisie incomplète.', erreurs: v.erreurs };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: 'Session expirée : rechargez la page.' };
  // Essai démarré si besoin (idempotent), puis capture.
  await supabase.rpc('demarrer_essai');
  const { error } = await supabase.rpc('capturer_prospect_essai', {
    p_email: v.valeurs.email, p_telephone: v.valeurs.telephone, p_recontact: true, p_conseils: v.valeurs.conseils,
  });
  if (error) {
    if (error.code === '54000') return { ok: false, message: 'Trop de demandes : réessayez dans quelques minutes.' };
    if (error.code === '22023') return { ok: false, message: 'Vérifiez l’adresse e-mail et le téléphone.' };
    // Base sans la mise à jour 0025 : le rendu reste visible (rien n'est publié), la capture n'est pas enregistrée.
    console.error('capturer_prospect_essai', error.code, error.message);
    return { ok: true, message: 'Rendu affiché.' };
  }
  return { ok: true, message: 'Rendu affiché.' };
}

/**
 * Après la conversion du compte anonyme (auth.updateUser e-mail + mot de passe, CGU dans les métadonnées) : CGU
 * enregistrées (version + date), essai de 3 mois démarré, prospect rattaché (creer_acces_essai, 0025).
 */
export async function finaliserAcces(): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.is_anonymous) return { ok: false, message: 'Confirmez d’abord votre adresse e-mail (lien reçu par e-mail).' };
  const { error } = await supabase.rpc('creer_acces_essai');
  if (error) {
    if (error.code === 'PGRST202') {
      // Base sans 0025 : l'essai existant (inscription classique) garde ses CGU.
      return { ok: true, message: 'Accès créé.' };
    }
    console.error('creer_acces_essai', error.code, error.message);
    return { ok: false, message: /conditions/.test(error.message) ? 'Acceptez les conditions de l’essai pour continuer.' : 'Votre accès n’a pas pu être finalisé. Réessayez dans un instant.' };
  }
  return { ok: true, message: 'Accès créé.' };
}
