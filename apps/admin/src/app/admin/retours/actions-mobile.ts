'use server';

import { revalidatePath } from 'next/cache';
import {
  estCleAsset, estEtiquetteMobile, estPageStructure, normaliserZones, serialiserZones, STATUTS_DEFAUT_MOBILE,
  type StatutDefautMobile, type ZonesNote,
} from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { createClient, getUser } from '@/lib/supabase/server';

// Retours « Rendu mobile » (adaptation téléphone, migration 0034, table defauts_mobile) : distincts de la note du CHOIX.
// « Mobile à revoir » ouvre un défaut rattaché à l'élément (variante, composant, structure de page, illustration), jamais à la
// recette entière ; « Mobile OK » clôt les défauts ouverts de l'élément (corrigé). Aucune suppression.

const MIGRATION = 'Migration 0034 à exécuter (supabase/migrations/0034_retours_page_appareil_zones.sql) : retour mobile non enregistré.';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type SaisieRenduMobile = {
  cle: string;
  verdict: 'ok' | 'a_revoir';
  etiquettes?: string[];
  remarque?: string;
  note?: number | null;
  zones?: ZonesNote | null;
  /** Empreinte mobile (empreinteMobile, rendu-mobile.ts) */
  empreinte?: string | null;
  page?: string | null;
  recette?: string | null;
  largeur?: number | null;
};
export type ResultatMobile = { ok: boolean; message: string; migrationManquante?: boolean };

export async function signalerRenduMobile(s: SaisieRenduMobile): Promise<ResultatMobile> {
  await exigerAdmin();
  if (!estCleAsset(s?.cle)) return { ok: false, message: 'Élément inconnu.' };
  if (s.verdict !== 'ok' && s.verdict !== 'a_revoir') return { ok: false, message: 'Verdict inconnu.' };
  const note = Number.isInteger(s.note) && (s.note as number) >= 1 && (s.note as number) <= 5 ? (s.note as number) : null;
  const zones = s.verdict === 'a_revoir' ? serialiserZones(normaliserZones(s.zones)) : null;
  const ligne = {
    cle: s.cle,
    page: estPageStructure(s.page) ? s.page : null,
    recette: s.recette && UUID.test(s.recette) ? s.recette : null,
    verdict: s.verdict,
    note,
    etiquettes: [...new Set((s.etiquettes ?? []).filter(estEtiquetteMobile))].slice(0, 12),
    remarque: String(s.remarque ?? '').trim().slice(0, 2000) || null,
    zones: zones ? JSON.parse(zones) : null,
    empreinte: s.empreinte && /^[0-9a-f]{8}$/.test(s.empreinte) ? s.empreinte : null,
    largeur: Number.isInteger(s.largeur) && (s.largeur as number) >= 200 && (s.largeur as number) <= 4000 ? s.largeur : null,
    statut: s.verdict === 'ok' ? 'sans_objet' : 'a_corriger',
  };
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('defauts_mobile').insert({ ...ligne, auteur: user?.id ?? null });
  if (error) return { ok: false, message: MIGRATION, migrationManquante: true };
  // « Mobile OK » : les défauts encore ouverts de l'élément sont corrigés
  if (s.verdict === 'ok') await supabase.from('defauts_mobile').update({ statut: 'corrige' }).eq('cle', s.cle).eq('statut', 'a_corriger');
  revalidatePath('/admin/retours');
  return { ok: true, message: s.verdict === 'ok' ? 'Mobile OK enregistré.' : `Rendu mobile à revoir : signalé${ligne.zones ? ` (${ligne.zones.zones.length} zone${ligne.zones.zones.length > 1 ? 's' : ''})` : ''}.` };
}

/** Statut d'un défaut (à corriger, corrigé, sans objet) : liste « Rendu mobile à revoir » */
export async function changerStatutRenduMobile(id: string, statut: StatutDefautMobile): Promise<ResultatMobile> {
  await exigerAdmin();
  if (!UUID.test(id) || !(STATUTS_DEFAUT_MOBILE as readonly string[]).includes(statut)) return { ok: false, message: 'Valeur invalide.' };
  const supabase = await createClient();
  const { error } = await supabase.from('defauts_mobile').update({ statut }).eq('id', id);
  if (error) return { ok: false, message: MIGRATION, migrationManquante: true };
  revalidatePath('/admin/retours');
  return { ok: true, message: 'Statut mis à jour.' };
}
