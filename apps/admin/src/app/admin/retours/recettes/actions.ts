'use server';

import { revalidatePath } from 'next/cache';
import {
  appareilDe, ETIQUETTE_GARDEE, estEtiquettePourContre, modeleIntegre, nomRecette, normaliserComposition, normaliserScenario, cleRecetteNotee,
  serialiserComposition, serialiserRecetteAvecScenario, sujetsActifs, sujetsDuScenario, SOURCES_NOTATION, type SourceNotation,
} from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getModelesDisponibles } from '@/lib/modeles';
import { MIGRATION_NOTATION } from '@/lib/notation-recettes';
import { createClient, getUser } from '@/lib/supabase/server';

// Tuile « Recettes complètes » (/admin/retours/recettes, migration 0038). Toute composition reçue est RELUE et remise dans les
// garde-fous du scénario (normaliserComposition). « Garder cette recette » : action de Paul seulement (super admin) ; crée la recette
// (table recettes, étiquette « gardee », note donnée ou 5★) visible dans « Mes recettes » du Studio et proposée aux praticiens du
// même scénario selon les règles existantes (recettesPourScenario : active, note ≥ 4).

export type SaisieNotation = {
  source: SourceNotation;
  sourceId?: string | null;
  nom?: string | null;
  scenario: unknown;
  composition: unknown;
  note: number | null;
  garder: boolean;
  pour: string[];
  contre: string[];
  pourTexte?: string;
  contreTexte?: string;
  appareil?: string;
  predit?: number | null;
  exploration?: boolean;
};
export type ResultatNotation = { ok: boolean; message: string; cle?: string; recette?: string; migrationManquante?: boolean };

const texte = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max) || null;

export async function noterRecetteComplete(s: SaisieNotation): Promise<ResultatNotation> {
  await exigerAdmin();
  const scenario = normaliserScenario(s?.scenario);
  const sujets = sujetsDuScenario(scenario);
  if (sujets.length && !sujetsActifs(sujets).length) return { ok: false, message: 'Sujets inconnus ou différés.' };
  const modeles = await getModelesDisponibles();
  const modele = (id: string) => modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);
  const composition = normaliserComposition(s.composition, { sujets, principaux: scenario.principaux.length, couleursPreferees: scenario.couleurs, modele });
  if (!composition) return { ok: false, message: 'Composition illisible.' };
  const note = Number.isInteger(s.note) && (s.note as number) >= 1 && (s.note as number) <= 5 ? (s.note as number) : null;
  const pour = [...new Set((s.pour ?? []).filter(estEtiquettePourContre))].slice(0, 12);
  const contre = [...new Set((s.contre ?? []).filter(estEtiquettePourContre))].slice(0, 12);
  const garder = s.garder === true;
  const pourTexte = texte(s.pourTexte, 500), contreTexte = texte(s.contreTexte, 500);
  if (!note && !garder && !pour.length && !contre.length) return { ok: false, message: 'Rien à enregistrer : donnez des étoiles, un pour / contre ou gardez la recette.' };
  const source: SourceNotation = SOURCES_NOTATION.includes(s.source) ? s.source : 'generateur';
  const sourceId = typeof s.sourceId === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(s.sourceId) ? s.sourceId : null;
  const cle = cleRecetteNotee(composition);
  const user = await getUser();
  const supabase = await createClient();

  // « Garder » : la recette rejoint « Mes recettes » (étiquette gardee), avec sa note (5★ sans étoiles) et ses remarques
  let recette: string | null = null;
  if (garder) {
    const noteRecette = note ?? 5;
    const ligne = {
      nom: texte(s.nom, 120) ?? nomRecette(composition, sujets), sujets: sujets.slice(0, 6), couleurs_preferees: scenario.couleurs,
      composition: serialiserRecetteAvecScenario(composition, scenario), note: noteRecette, etiquettes: [ETIQUETTE_GARDEE], positif: pourTexte, negatif: contreTexte,
      auteur: user?.id ?? null,
    };
    const { data, error } = await supabase.from('recettes').insert(ligne).select('id').maybeSingle();
    if (error || !data) return { ok: false, message: 'Migration 0032 à exécuter (supabase/migrations/0032_recettes.sql) : recette non gardée.', migrationManquante: true };
    recette = data.id as string;
    const journal = { recette, note: noteRecette, etiquettes: [ETIQUETTE_GARDEE], positif: pourTexte, negatif: contreTexte, composition: ligne.composition, auteur: user?.id ?? null };
    const { error: e2 } = await supabase.from('recettes_notes').insert({ ...journal, appareil: appareilDe(s.appareil) });
    if (e2) await supabase.from('recettes_notes').insert(journal);
  }

  const { error } = await supabase.from('recettes_notation').insert({
    cle, source, source_id: sourceId, scenario, composition: JSON.parse(serialiserComposition(composition)), note, garder, etiquettes_pour: pour, etiquettes_contre: contre,
    pour: pourTexte, contre: contreTexte, appareil: appareilDe(s.appareil), recette,
    predit: typeof s.predit === 'number' && Number.isFinite(s.predit) ? Math.max(0, Math.min(5, Math.round(s.predit * 100) / 100)) : null,
    exploration: s.exploration === true, auteur: user?.id ?? null,
  });
  // Proposition de Claude : l'avis rejoint aussi le journal du directeur (0035), sans bloquer
  if (source === 'claude' && sourceId && (garder || (note !== null && note <= 2))) {
    await supabase.from('directeur_avis').insert({ nature: 'proposition', cle: sourceId, decision: garder ? 'enregistree' : 'pas-convaincu', remarque: contreTexte }).then(() => undefined, () => undefined);
  }
  revalidatePath('/admin/retours/recettes');
  if (garder) revalidatePath('/admin/atelier/studio');
  if (error) {
    return garder
      ? { ok: true, message: `Recette gardée (« Mes recettes »). ${MIGRATION_NOTATION}`, cle, recette: recette ?? undefined, migrationManquante: true }
      : { ok: false, message: MIGRATION_NOTATION, cle, migrationManquante: true };
  }
  return { ok: true, message: garder ? 'Recette gardée : elle est dans « Mes recettes » du Studio.' : `Note enregistrée${note ? ` (${note}★)` : ''}.`, cle, recette: recette ?? undefined };
}
