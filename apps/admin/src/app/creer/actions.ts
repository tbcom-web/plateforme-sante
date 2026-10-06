'use server';

import type { SiteDraft } from '@plateforme/core';
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
 * « Celui-là » : enregistre la saisie (crée le site au premier choix), puis applique le modèle choisi au brouillon
 * (appliquerUniversAuSite : identité conservée, verrou optimiste). Renvoie le brouillon obtenu.
 */
export async function choisirModele(id: string | null, draft: SiteDraft, version: string | null, universId: string): Promise<EtatParcours> {
  const r = await enregistrerSite(id, draft, version);
  if (!r.ok || !r.id) return r;
  const admin = (await getRole()) === 'admin';
  const a = await appliquerUniversAuSite(r.id, universId, { admin, version: r.version, parcours: true });
  if (!a.ok || !a.draft) return { ok: false, message: a.message, id: r.id, version: r.version };
  return { ok: true, message: 'Modèle appliqué. Votre brouillon est enregistré.', id: r.id, version: a.version, draft: a.draft, soinsACocher: a.resultat?.soinsACocher };
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
