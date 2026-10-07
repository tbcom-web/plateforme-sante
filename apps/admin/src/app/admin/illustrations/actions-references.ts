'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { estCleAsset } from '@plateforme/core';
import { validerDecisionClassement, type DecisionClassement } from '@plateforme/core/classement-visuels';
import {
  cleReference, estSourceReference, INFOS_SOURCES_REFERENCES, QUOTA_GOOGLE_JOUR, validerChoixReference, type ReferenceImage, type SourceReference,
} from '@plateforme/core/references-illustrations';
import { exigerAdmin } from '@/lib/admin';
import { BUCKET_INSPIRATIONS } from '@/lib/inspirations';
import { ErreurReference, pageDeReferences, quotaGoogle, sourcesReferencesConfigurees, telechargerVignette, vignetteDeReference } from '@/lib/references-illustrations';
import { createClient, getUser } from '@/lib/supabase/server';

// Références d'illustration (migration 0033) : recherche dans les moteurs d'images libres, enregistrement des images
// cochées comme INSPIRATIONS liées à l'élément (vignette ≤ 400 px WebP dans le bucket PRIVÉ « inspirations »), images
// écartées (« Pas pertinent »), journal des suggestions de classement. Admin seulement.

const MIGRATION_REFERENCES = 'Migration 0033 à exécuter (supabase/migrations/0033_references_illustrations.sql).';

export type EtatSources = { configurees: Record<SourceReference, boolean>; quotaGoogle: { restant: number; jour: number } };

export async function etatSourcesReferences(): Promise<EtatSources> {
  await exigerAdmin();
  return { configurees: sourcesReferencesConfigurees(), quotaGoogle: { restant: quotaGoogle(), jour: QUOTA_GOOGLE_JOUR } };
}

export type ResultatPage = { ok: boolean; message: string; references: ReferenceImage[]; brut: number; quotaGoogle?: number };

/** Une page d'une source (la relance par lots est composée dans le navigateur avec les fonctions pures du core) */
export async function chercherPageReferences(source: string, requete: string, page: number): Promise<ResultatPage> {
  await exigerAdmin();
  const q = String(requete ?? '').replace(/\s+/g, ' ').trim().slice(0, 100);
  if (!estSourceReference(source) || !q || !Number.isInteger(page) || page < 1) return { ok: false, message: 'Recherche invalide.', references: [], brut: 0 };
  try {
    const r = await pageDeReferences(source, q, page);
    return { ok: true, message: '', references: r.references, brut: r.brut, ...(source === 'google' ? { quotaGoogle: quotaGoogle() } : {}) };
  } catch (e) {
    return { ok: false, message: e instanceof ErreurReference ? e.message : `${INFOS_SOURCES_REFERENCES[source].libelle} : erreur.`, references: [], brut: 0 };
  }
}

export type ReferenceEnregistree = {
  id: string; image: string | null; source: SourceReference; idSource: string; pageUrl: string; titre: string; auteur: string | null; licence: string | null;
  etiquettes: string[]; texte: string; sujets: string[]; hashtags: string[]; le: string;
};

type Ligne = {
  id: string; chemin: string; origine: string; origine_id: string; page_origine: string; auteur_origine: string | null; licence_origine: string | null; objectif: string | null;
  etiquettes: string[] | null; sujets: string[] | null; hashtags: string[] | null; requete: string | null; created_at: string;
};

/** Références enregistrées pour un élément (URL signées 1 h) et images écartées (jamais remontrées) */
export async function referencesDeLElement(cle: string): Promise<{ references: ReferenceEnregistree[]; ecartees: string[]; migrationManquante: boolean }> {
  await exigerAdmin();
  if (!estCleAsset(cle)) return { references: [], ecartees: [], migrationManquante: false };
  const supabase = await createClient();
  const [{ data, error }, ec] = await Promise.all([
    supabase.from('inspirations').select('id, chemin, origine, origine_id, page_origine, auteur_origine, licence_origine, objectif, etiquettes, sujets, hashtags, requete, created_at')
      .eq('cle_asset', cle).order('created_at', { ascending: false }).limit(100),
    supabase.from('references_ecartees').select('origine, origine_id').eq('cle_asset', cle).limit(2000),
  ]);
  if (error) return { references: [], ecartees: [], migrationManquante: true };
  const lignes = ((data ?? []) as Ligne[]).filter((l) => estSourceReference(l.origine));
  const signees = new Map<string, string>();
  if (lignes.length) {
    const { data: s } = await supabase.storage.from(BUCKET_INSPIRATIONS).createSignedUrls(lignes.map((l) => l.chemin), 3600);
    for (const x of s ?? []) if (x.path && x.signedUrl && !x.error) signees.set(x.path, x.signedUrl);
  }
  return {
    migrationManquante: Boolean(ec.error),
    ecartees: ((ec.data ?? []) as { origine: string; origine_id: string }[]).map((x) => `${x.origine}:${x.origine_id}`),
    references: lignes.map((l) => ({
      id: l.id, image: signees.get(l.chemin) ?? null, source: l.origine as SourceReference, idSource: l.origine_id, pageUrl: l.page_origine, titre: l.requete ?? '',
      auteur: l.auteur_origine, licence: l.licence_origine, etiquettes: l.etiquettes ?? [], texte: l.objectif ?? '', sujets: l.sujets ?? [], hashtags: l.hashtags ?? [], le: l.created_at,
    })),
  };
}

export type ResultatEnregistrement = { ok: boolean; message: string; enregistrees: string[]; erreurs: { cle: string; message: string }[]; migrationManquante?: boolean };

const TYPES_ELEMENT: Record<string, string> = { picto: 'icone', heros: 'illustration', dessin: 'illustration', biblio: 'illustration', ligne: 'illustration', materiel: 'illustration', animation: 'animation' };

/**
 * Enregistre les images cochées : pour chacune, vignette téléchargée côté serveur (hôtes de la source seulement), réduite
 * (≤ 400 px, WebP, sans métadonnées), envoyée dans le bucket PRIVÉ « inspirations », puis ligne inspirations liée à l'élément
 * (URL d'origine, page source, auteur / licence connus, étiquettes « ce qui m'inspire », texte, sujets / hashtags acceptés).
 */
export async function enregistrerReferences(cle: string, choix: unknown[]): Promise<ResultatEnregistrement> {
  await exigerAdmin();
  if (!estCleAsset(cle) || !Array.isArray(choix) || !choix.length || choix.length > 10) return { ok: false, message: 'Choix invalide (1 à 10 images).', enregistrees: [], erreurs: [] };
  const user = await getUser();
  const supabase = await createClient();
  const enregistrees: string[] = [];
  const erreurs: { cle: string; message: string }[] = [];
  for (const brut of choix) {
    const { choix: c, erreurs: e } = validerChoixReference(brut);
    if (!c) { erreurs.push({ cle: '?', message: e.join(' ') }); continue; }
    const k = cleReference(c.reference);
    const r = c.reference;
    try {
      const v = await vignetteDeReference(await telechargerVignette(r.source, r.vignette));
      const chemin = `${randomUUID()}.webp`;
      const { error: eStockage } = await supabase.storage.from(BUCKET_INSPIRATIONS).upload(chemin, v.webp, { contentType: 'image/webp', upsert: false });
      if (eStockage) { erreurs.push({ cle: k, message: 'Stockage privé « inspirations » indisponible (migration 0028).' }); continue; }
      const { error } = await supabase.from('inspirations').insert({
        chemin, lien: r.pageUrl, etiquettes: c.etiquettes, objectif: c.texte, sujet: c.sujets[0] ?? null, type_element: TYPES_ELEMENT[cle.split(':')[0]] ?? 'illustration',
        palette: v.palette, largeur: v.largeur, hauteur: v.hauteur, auteur: user?.id ?? null,
        cle_asset: cle, origine: r.source, origine_id: r.idSource, image_origine: r.imageUrl, page_origine: r.pageUrl, auteur_origine: r.auteur || null,
        licence_origine: r.licence || null, licence_url_origine: r.licenceUrl, requete: r.requete ?? null, sujets: c.sujets, hashtags: c.hashtags,
      });
      if (error) {
        await supabase.storage.from(BUCKET_INSPIRATIONS).remove([chemin]).catch(() => null);
        if (/duplicate|unique/i.test(error.message ?? '')) { erreurs.push({ cle: k, message: 'Déjà enregistrée pour cet élément.' }); continue; }
        return { ok: false, message: MIGRATION_REFERENCES, enregistrees, erreurs, migrationManquante: true };
      }
      enregistrees.push(k);
    } catch (x) {
      erreurs.push({ cle: k, message: x instanceof ErreurReference ? x.message : 'Image illisible.' });
    }
  }
  revalidatePath('/admin/illustrations');
  revalidatePath('/admin/retours');
  const n = enregistrees.length;
  return { ok: n > 0, message: n ? `${n} référence${n > 1 ? 's' : ''} enregistrée${n > 1 ? 's' : ''} comme inspiration${n > 1 ? 's' : ''}.` : 'Aucune référence enregistrée.', enregistrees, erreurs };
}

/** Retire une référence enregistrée (ligne + vignette du bucket privé) */
export async function retirerReference(id: string): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  if (!/^[0-9a-f-]{36}$/.test(String(id))) return { ok: false, message: 'Référence invalide.' };
  const supabase = await createClient();
  const { data } = await supabase.from('inspirations').select('chemin, cle_asset').eq('id', id).maybeSingle();
  if (!data?.cle_asset) return { ok: false, message: 'Référence introuvable.' };
  const { error } = await supabase.from('inspirations').delete().eq('id', id);
  if (error) return { ok: false, message: 'Suppression impossible.' };
  await supabase.storage.from(BUCKET_INSPIRATIONS).remove([data.chemin]).catch(() => null);
  revalidatePath('/admin/illustrations');
  return { ok: true, message: 'Référence retirée.' };
}

/** « Pas pertinent » : l'image n'est plus jamais proposée pour cet élément ; la requête est notée comme refusée */
export async function ecarterReference(cle: string, source: string, idSource: string, requete: string | null): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  if (!estCleAsset(cle) || !estSourceReference(source) || !/^[A-Za-z0-9._~-]{1,120}$/.test(String(idSource))) return { ok: false, message: 'Image invalide.' };
  const q = requete ? String(requete).replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 60) : null;
  const supabase = await createClient();
  const { error } = await supabase.from('references_ecartees').upsert({ cle_asset: cle, origine: source, origine_id: idSource, requete: q }, { onConflict: 'cle_asset,origine,origine_id', ignoreDuplicates: true });
  if (error) return { ok: false, message: MIGRATION_REFERENCES, migrationManquante: true };
  const d = q ? validerDecisionClassement({ contexte: 'reference', nature: 'requete', valeur: q, decision: 'refusee', raison: `${source} ${idSource}` }) : null;
  if (d) await supabase.from('classement_suggestions').insert(d);
  return { ok: true, message: 'Image écartée pour cet élément.' };
}

/** Journal des suggestions de classement acceptées / refusées (sans auteur ; sans la migration : ignoré sans erreur) */
export async function journaliserSuggestions(decisions: Partial<DecisionClassement>[]): Promise<{ ok: boolean }> {
  await exigerAdmin();
  const lignes = (Array.isArray(decisions) ? decisions : []).slice(0, 30).map((d) => validerDecisionClassement(d ?? {})).filter((d): d is DecisionClassement => d !== null);
  if (!lignes.length) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from('classement_suggestions').insert(lignes);
  return { ok: !error };
}
