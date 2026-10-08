import 'server-only';
import { cache } from 'react';
import { notesPhotos, renfortsKits, ajouterPairesApprises, pairesDesNotes, pairesDuels, pairesElementsDesNotes, pairesElementsDuels, renfortsDuelsMobiles, apprisHarmonie, appliquerRenforts, estEtiquetteAtelier, fusionnerRenforts, poidsAtelier, renfortsDuels, renfortsNotations, renfortsPoids, sourcesCombinaisons, sourcesNotesPages, sourcesRecettes, statsNotation, type IngredientsAtelier, type NoteAtelierLue, type PoidsAtelier } from '@plateforme/core';
import { getNotesKits } from '@/lib/kits-images';
import { getLignesAssetsApprentissage, getNotationsApprentissage } from '@/lib/notation-recettes';
import { getDuelsApprentissage } from '@/lib/duels';
import { getNotesPagesLecture, getRecettesLecture } from '@/lib/recettes';
import { createClient } from '@/lib/supabase/server';
import { getPoidsAssets } from '@/lib/assets-notes';

// Notes de l'atelier des propositions (migration 0026).
// - getNotesAtelier : journal complet, lu par le super admin (/admin/atelier) ;
// - getPoidsAtelier : poids appris, calculés côté serveur à partir de atelier_notes_apprentissage() (ingrédients, note,
//   étiquettes : ni commentaire ni auteur), pour tout compte connecté, y compris les sessions anonymes de l'essai.

export type NoteAtelierAdmin = NoteAtelierLue & { id: string; cle: string };

type Ligne = { id: string; cle_combinaison: string; ingredients: Partial<IngredientsAtelier> | null; note: number; etiquettes: string[] | null; commentaire: string | null; positif?: string | null; negatif?: string | null; created_at: string };

/** Journal des notes (plus récentes d'abord) ; `migrationManquante` : table absente (migration 0026 pas encore exécutée) */
async function getNotesAtelierSansMemo(): Promise<{ notes: NoteAtelierAdmin[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const lire = (colonnes: string) => supabase.from('atelier_notes').select(colonnes).order('created_at', { ascending: false }).limit(5000);
  // Remarques « ce qui va bien / ce qui ne va pas » (0028) ; sans la migration 0028, lecture sans ces colonnes
  let { data, error } = await lire('id, cle_combinaison, ingredients, note, etiquettes, commentaire, positif, negatif, created_at');
  if (error) ({ data, error } = await lire('id, cle_combinaison, ingredients, note, etiquettes, commentaire, created_at'));
  if (error) return { notes: [], migrationManquante: true };
  const notes = ((data ?? []) as unknown as Ligne[])
    .filter((l) => l.ingredients && typeof l.ingredients === 'object')
    .map((l) => ({
      id: l.id, cle: l.cle_combinaison, ingredients: l.ingredients!, note: l.note,
      etiquettes: (l.etiquettes ?? []).filter(estEtiquetteAtelier), commentaire: l.commentaire, positif: l.positif ?? null, negatif: l.negatif ?? null, le: l.created_at,
    }));
  return { notes, migrationManquante: false };
}
export const getNotesAtelier = cache(getNotesAtelierSansMemo);

/**
 * Poids appris pour le générateur de propositions (notes de l'atelier + notes et statuts des assets, 0027) ; null sans
 * aucune note ni statut, ou si les migrations manquent (aucune erreur).
 */
async function getPoidsAtelierSansMemo(): Promise<PoidsAtelier | null> {
  const [atelier, assets, recettes, pages, duels, notations] = await Promise.all([poidsDesCombinaisons(), getPoidsAssets(), getRecettesLecture(1), getNotesPagesLecture(), getDuelsApprentissage(), getNotationsApprentissage()]);
  // Notes brutes des photos (« Favoris d'abord », favoris.ts : photos ≥ 4 ★ puis ≥ 3,5 ★ d'abord, ≤ 2 ★ jamais)
  const photos = notesPhotos(await getLignesAssetsApprentissage());
  const base = !atelier?.poids && !assets ? null : { ...(atelier?.poids ?? { n: 0, moyenne: 0, effets: {} }), ...(assets ? { assets } : {}) };
  // Recettes gardées depuis la tuile « Recettes complètes » : apprises par leur notation (0038), pas une seconde fois comme recette
  const gardees = new Set(notations.map((n) => n.recette).filter(Boolean));
  // Renforts (recettes.ts) : une recette ou une combinaison notée renforce (ou affaiblit) un peu chacun de ses ingrédients
  // Notes par page (0034) : chacune ne renforce que les clés de sa page (structure, éléments, variantes), au poids de l'appareil
  const sources = [...sourcesRecettes(recettes.filter((r) => !gardees.has(r.id))), ...sourcesCombinaisons(atelier?.lignes ?? []), ...sourcesNotesPages(pages)];
  // Duels « A ou B ? » (0037, duels.ts) : ±0,5 ★ au plus par clé, cumulés aux renforts des notes dans la limite de ±1 ★
  // Recettes complètes notées (0038, notation-recettes.ts) : ±0,75 ★ au plus par clé, même cumul plafonné à ±1 ★
  const renforts = fusionnerRenforts(fusionnerRenforts(sources.length ? renfortsPoids(sources, base?.moyenne || 3) : { atelier: {}, assets: {} }, renfortsDuels(duels)), fusionnerRenforts(renfortsNotations(notations), renfortsKits(await getNotesKits())));
  // (+ kits d'images notés, 0039 : chaque photo du kit, ±0,5 ★ ; même plafond cumulé ±1 ★)
  const poids = Object.keys(renforts.atelier).length || Object.keys(renforts.assets).length ? appliquerRenforts(base, renforts) : base;
  // Ingrédients, PAIRES et familles appris des recettes complètes : lus par les tirages harmonieux (harmonie.ts) et propositions.ts
  // + combinaisons police × palette (duels « Police × palette » et tuile du même nom, duels-compositions.ts) : paires
  // `gamme:<g>&police:<p>` ajoutées aux paires apprises (plafond ±0,75 ★), lues par les tirages harmonieux
  const harmonie = ajouterPairesApprises(notations.length ? apprisHarmonie(statsNotation(notations)) : null, pairesDuels(duels), pairesDesNotes(assets?.effets ?? {}),
    // + combinaisons d'éléments (duels « Combinaisons d'éléments » et tuile « Combinaisons », combinaisons-elements.ts)
    pairesElementsDuels(duels), pairesElementsDesNotes(assets?.effets ?? {}));
  // Effets propres au mobile (duels joués sur téléphone) : lus par effetAtelier selon la portée de la clé (duels-appareils.ts)
  const mobile = renfortsDuelsMobiles(duels);
  const avecMobile = Object.keys(mobile).length ? { ...(poids ?? { n: 1, moyenne: 3, effets: {} }), mobile } : poids;
  const fin = harmonie ? { ...(avecMobile ?? { n: 0, moyenne: 3, effets: {} }), harmonie } : avecMobile;
  return fin && Object.keys(photos).length ? { ...fin, notesPhotos: photos } : fin;
}
export const getPoidsAtelier = cache(getPoidsAtelierSansMemo);

type LigneApprentissage = { ingredients: Partial<IngredientsAtelier>; note: number; etiquettes: string[] | null; appareil?: string | null };

async function poidsDesCombinaisons(): Promise<{ poids: PoidsAtelier | null; lignes: LigneApprentissage[] } | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('atelier_notes_apprentissage', { p_limite: 5000 });
    if (error || !Array.isArray(data) || !data.length) return null;
    const lignes = (data as LigneApprentissage[]).map((l) => ({ ingredients: l.ingredients ?? {}, note: l.note, etiquettes: l.etiquettes, appareil: l.appareil ?? null }));
    const poids = poidsAtelier(lignes);
    return { poids: poids.n ? poids : null, lignes };
  } catch {
    return null;
  }
}
