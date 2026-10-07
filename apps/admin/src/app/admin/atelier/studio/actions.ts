'use server';

import { revalidatePath } from 'next/cache';
import {
  appareilDe, clesStructure, estCleStudio, estEtiquetteStudio, estPageStructure, ETIQUETTES_RECETTE, modeleIntegre, nomRecette, normaliserComposition, normaliserZones,
  photosAImporter, serialiserComposition, serialiserZones, sujetsActifs, typeDeCle, type AppareilRetour, type PageStructure, type ZonesNote,
  normaliserScenario, serialiserRecetteAvecScenario, type ScenarioRecette, estStatutIllustration, etatsAnimations, type StatutIllustration,
} from '@plateforme/core';
import { getNotesPagesRecette } from '@/lib/recettes';
import { importerPhotoLibre } from '../../photos/actions';
import { exigerAdmin } from '@/lib/admin';
import { getModelesDisponibles } from '@/lib/modeles';
import { createClient, getUser } from '@/lib/supabase/server';

// Actions du studio de recettes (migration 0032). Toute composition reçue est RELUE et remise dans les garde-fous
// (normaliserComposition : structure permise, style compatible, gamme non exclue, couleur libre AA, posture jamais…).

const MIGRATION = 'Migration 0032 à exécuter (supabase/migrations/0032_recettes.sql).';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const texte = (v: unknown, max = 2000) => String(v ?? '').trim().slice(0, max) || null;

export type SaisieRecette = {
  id?: string | null;
  origine?: string | null;
  nom: string;
  sujets: string[];
  secondaires?: string[];
  couleurs: string[];
  composition: unknown;
  note: number | null;
  etiquettes: string[];
  positif?: string;
  negatif?: string;
  /** Appareil regardé pour la note de la recette (0034) */
  appareil?: AppareilRetour;
  /** Scénario complet du client simulé (principaux ordonnés, secondaires, couleurs, soins), gardé dans la composition jsonb */
  scenario?: ScenarioRecette | null;
};
export type ResultatRecette = { ok: boolean; message: string; id?: string; migrationManquante?: boolean };

/** Enregistre (crée ou modifie) une recette ; une note donnée est aussi ajoutée au journal recettes_notes */
export async function enregistrerRecette(s: SaisieRecette): Promise<ResultatRecette> {
  await exigerAdmin();
  // Scénario du simulateur (principaux puis secondaires dans `sujets`) ; sans lui (propositions, anciens appels) : sujets reçus
  const scenario = s.scenario ? normaliserScenario(s.scenario) : null;
  const brutsSujets = scenario ? [...scenario.principaux, ...scenario.secondaires] : [...(s.sujets ?? []), ...(s.secondaires ?? [])];
  const sujets = [...new Set(brutsSujets.filter((x) => typeof x === 'string' && /^[a-z-]{2,30}$/.test(x)))].slice(0, 6);
  const couleurs = scenario ? scenario.couleurs : [...new Set((s.couleurs ?? []).filter((x) => typeof x === 'string' && /^[a-z-]{2,20}$/.test(x)))].slice(0, 3);
  const modeles = await getModelesDisponibles();
  const modele = (id: string) => modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);
  const principaux = scenario ? scenario.principaux.length : Math.min(3, (s.sujets ?? []).length || sujets.length);
  const composition = normaliserComposition(s.composition, { sujets, principaux, couleursPreferees: couleurs, modele });
  if (!composition) return { ok: false, message: 'Composition illisible.' };
  if (!sujetsActifs(sujets).length && sujets.length) return { ok: false, message: 'Sujets inconnus ou différés.' };
  const note = Number.isInteger(s.note) && (s.note as number) >= 1 && (s.note as number) <= 5 ? (s.note as number) : null;
  const etiquettes = [...new Set((s.etiquettes ?? []).filter((e) => (ETIQUETTES_RECETTE as readonly string[]).includes(e)))];
  const ligne = {
    nom: texte(s.nom, 120) ?? nomRecette(composition, sujets), sujets, couleurs_preferees: couleurs, composition: serialiserRecetteAvecScenario(composition, scenario),
    note, etiquettes, positif: texte(s.positif), negatif: texte(s.negatif),
  };
  const user = await getUser();
  const supabase = await createClient();
  let id = s.id && UUID.test(s.id) ? s.id : null;
  if (id) {
    const { error } = await supabase.from('recettes').update(ligne).eq('id', id);
    if (error) return { ok: false, message: MIGRATION, migrationManquante: true };
  } else {
    const { data, error } = await supabase.from('recettes').insert({ ...ligne, origine: s.origine && UUID.test(s.origine) ? s.origine : null, auteur: user?.id ?? null }).select('id').maybeSingle();
    if (error || !data) return { ok: false, message: MIGRATION, migrationManquante: true };
    id = data.id as string;
  }
  if (note) {
    const journal = { recette: id, note, etiquettes, positif: ligne.positif, negatif: ligne.negatif, composition: ligne.composition, auteur: user?.id ?? null };
    // Appareil regardé (0034) ; sans la migration, note enregistrée sans lui
    const { error } = await supabase.from('recettes_notes').insert({ ...journal, appareil: appareilDe(s.appareil) });
    if (error) await supabase.from('recettes_notes').insert(journal);
  }
  revalidatePath('/admin/atelier/studio');
  // Photo gardée non importée (aperçu Pexels / Pixabay) : la recette est enregistrée, mais l'import est requis avant tout usage sur un site
  const aImporter = photosAImporter(composition.photos).length;
  return { ok: true, message: `Recette « ${ligne.nom} » enregistrée${note ? ` (${note}★)` : ''}.${aImporter ? ` Attention : ${aImporter} photo${aImporter > 1 ? 's' : ''} non importée${aImporter > 1 ? 's' : ''}, à valider et importer avant tout usage sur un site (ignorée${aImporter > 1 ? 's' : ''} d’ici là).` : ''}`, id };
}

/**
 * « Valider et importer » depuis le studio : l'action de /admin/photos (importerPhotoLibre : relue à la source, WebP hébergé,
 * traçabilité, thèmes et hashtags reportés), puis l'URL hébergée, que le studio substitue à l'aperçu dans la recette.
 */
export async function importerPhotoStudio(id: string): Promise<ResultatRecette & { url?: string }> {
  await exigerAdmin();
  if (!UUID.test(id)) return { ok: false, message: 'Photo inconnue.' };
  const r = await importerPhotoLibre(id);
  if (!r?.ok) return { ok: false, message: r?.message ?? 'Import impossible.' };
  const supabase = await createClient();
  const { data } = await supabase.from('photos_libres').select('url, statut').eq('id', id).maybeSingle();
  revalidatePath('/admin/atelier/studio');
  return data?.url && data.statut === 'validee' ? { ok: true, message: r.message, url: data.url as string } : { ok: false, message: 'Import non confirmé : voir /admin/photos.' };
}

/** Archive (ou réactive) une recette : jamais supprimée */
export async function changerStatutRecette(id: string, statut: 'active' | 'archivee'): Promise<ResultatRecette> {
  await exigerAdmin();
  if (!UUID.test(id) || !['active', 'archivee'].includes(statut)) return { ok: false, message: 'Recette inconnue.' };
  const supabase = await createClient();
  const { error } = await supabase.from('recettes').update({ statut }).eq('id', id);
  if (error) return { ok: false, message: MIGRATION, migrationManquante: true };
  revalidatePath('/admin/atelier/studio');
  return { ok: true, message: statut === 'archivee' ? 'Recette archivée.' : 'Recette réactivée.', id };
}

export type SaisieNotePage = {
  /** Recette enregistrée (sinon la note va sur la structure de la page, assets_notes) */
  recette: string | null;
  page: PageStructure;
  sujets: string[];
  couleurs: string[];
  composition: unknown;
  note: number;
  etiquettes: string[];
  positif?: string;
  negatif?: string;
  appareil?: AppareilRetour;
  zones?: ZonesNote | null;
};

/**
 * Note PAR PAGE (demande de Paul du 2026-10-07 : « la note PAR PAGE associée au thème ») : journal recettes_notes avec `page`
 * (migration 0034) quand la recette est enregistrée ; sinon, la structure de la page est notée comme élément (assets_notes,
 * clé `structure:<page>:…`). Dans les deux cas, la note ne renforce que les clés de cette page (recettes.ts, clesPage).
 */
export async function noterPageRecette(s: SaisieNotePage): Promise<ResultatRecette> {
  await exigerAdmin();
  if (!estPageStructure(s?.page)) return { ok: false, message: 'Page inconnue.' };
  if (!Number.isInteger(s.note) || s.note < 1 || s.note > 5) return { ok: false, message: 'Note de 1 à 5.' };
  const sujets = [...new Set((s.sujets ?? []).filter((x) => typeof x === 'string' && /^[a-z-]{2,30}$/.test(x)))].slice(0, 6);
  const couleurs = [...new Set((s.couleurs ?? []).filter((x) => typeof x === 'string' && /^[a-z-]{2,20}$/.test(x)))].slice(0, 3);
  const modeles = await getModelesDisponibles();
  const modele = (id: string) => modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);
  const composition = normaliserComposition(s.composition, { sujets, principaux: Math.min(3, sujets.length), couleursPreferees: couleurs, modele });
  if (!composition) return { ok: false, message: 'Composition illisible.' };
  const etiquettes = [...new Set((s.etiquettes ?? []).filter(estEtiquetteStudio))].slice(0, 12);
  const zones = serialiserZones(normaliserZones(s.zones));
  const appareil = appareilDe(s.appareil);
  const user = await getUser();
  const supabase = await createClient();
  const positif = texte(s.positif), negatif = texte(s.negatif);
  if (s.recette && UUID.test(s.recette)) {
    const { error } = await supabase.from('recettes_notes').insert({
      recette: s.recette, page: s.page, appareil, zones: zones ? JSON.parse(zones) : null, note: s.note, etiquettes, positif, negatif,
      composition: JSON.parse(serialiserComposition(composition)), auteur: user?.id ?? null,
    });
    if (error) return { ok: false, message: 'Migration 0034 à exécuter (supabase/migrations/0034_retours_page_appareil_zones.sql) : note de la page non enregistrée.', migrationManquante: true };
    revalidatePath('/admin/atelier/studio');
    return { ok: true, message: `Page notée ${s.note}★ (recette).` };
  }
  // Recette pas encore enregistrée : la structure de la page est notée comme élément
  const cle = clesStructure(composition).find((k) => k.startsWith(`structure:${s.page}:`));
  if (!cle || !estCleStudio(cle)) return { ok: false, message: 'Enregistrez d’abord la recette : cette page n’a pas de structure variable sur ce modèle.' };
  const base = { cle_asset: cle, type: typeDeCle(cle), note: s.note, etiquettes, auteur: user?.id ?? null, positif, negatif };
  let { error } = await supabase.from('assets_notes').insert({ ...base, appareil, zones: zones ? JSON.parse(zones) : null });
  if (error) ({ error } = await supabase.from('assets_notes').insert(base));
  if (error) return { ok: false, message: MIGRATION, migrationManquante: true };
  return { ok: true, message: `Structure de la page notée ${s.note}★ (enregistrez la recette pour noter ses pages dans la recette).` };
}

/**
 * Animations dont les ingrédients ne sont pas encore tous validés (statuts de la bibliothèque, illustrations_statuts) : elles jouent
 * dans le Studio avec un badge « en attente de validation ». Sans la migration 0021 : statuts par défaut des assets.
 */
export async function lireAnimationsEnAttente(): Promise<string[]> {
  await exigerAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from('illustrations_statuts').select('cle, statut');
  const statuts = Object.fromEntries(((data ?? []) as { cle: string; statut: string }[]).filter((l) => estStatutIllustration(l.statut)).map((l) => [l.cle, l.statut as StatutIllustration]));
  return etatsAnimations(statuts).filter((e) => e.enAttente).map((e) => e.animation);
}

/** Notes déjà données aux pages d'une recette (onglets du studio) */
export async function lireNotesPages(recette: string): Promise<{ page: string; note: number; appareil: string; le: string }[]> {
  await exigerAdmin();
  return getNotesPagesRecette(recette).catch(() => []);
}

/**
 * Note d'une structure de page, d'un élément ou d'un jeu d'effets (assets_notes, types structure / composant / effets,
 * migration 0032) : clé connue du studio, note de 1 à 5, étiquettes du studio, remarques facultatives.
 */
export async function noterElementStudio(cle: string, note: number, etiquettes: string[], remarques: { positif?: string; negatif?: string } = {}): Promise<ResultatRecette> {
  await exigerAdmin();
  if (!estCleStudio(cle)) return { ok: false, message: 'Élément inconnu.' };
  if (!Number.isInteger(note) || note < 1 || note > 5) return { ok: false, message: 'Note de 1 à 5.' };
  const user = await getUser();
  const supabase = await createClient();
  const base = { cle_asset: cle, type: typeDeCle(cle), note, etiquettes: [...new Set((etiquettes ?? []).filter(estEtiquetteStudio))].slice(0, 12), auteur: user?.id ?? null };
  let { error } = await supabase.from('assets_notes').insert({ ...base, positif: texte(remarques.positif), negatif: texte(remarques.negatif) });
  if (error && (remarques.positif || remarques.negatif)) ({ error } = await supabase.from('assets_notes').insert({ ...base, commentaire: [texte(remarques.positif), texte(remarques.negatif)].filter(Boolean).join(' / ') || null }));
  if (error) return { ok: false, message: MIGRATION, migrationManquante: true };
  return { ok: true, message: `${note}★ enregistrée.` };
}
