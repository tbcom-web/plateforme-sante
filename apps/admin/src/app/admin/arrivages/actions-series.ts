'use server';

import { revalidatePath } from 'next/cache';
import { cibleKit, cibleProfil, ciblesPrioritaires, SUJETS_KITS, hashtagsAcceptation, hashtagsValides, ligneDeSerie, QUOTAS_SOURCING, type CibleSourcing, type LigneSerie } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getProfession } from '@/lib/profession';
import { createClient } from '@/lib/supabase/server';
import { sourcesConfigurees } from '@/lib/photos-libres';
import { contraintesSourcing } from '@plateforme/core';
import { getPolitique } from '@/lib/politique-evaluation';
import { contexteSourcing, enregistrerSeries, executerSourcing, getRevuesClaude, getSerie, MIGRATION_SERIES, nouveauGroupe } from '@/lib/sourcing-photos';
import { changerStatutPhotoLibre, importerPhotoLibre } from '../photos/actions';
import { deciderPhoto } from '../retours/actions-photos';
import { serieAffichee, type SerieAffichee } from './series';

// Séries de l'agent dans les Arrivages (packages/core/src/sourcing-photos.ts, migration 0053, docs/sourcing-photos.md) :
// « Sourcer automatiquement » (un profil, ou les trous prioritaires), « Accepter la série / la sélection » (une photo à la fois depuis
// le navigateur : Garder + import WebP, traçabilité et licence existantes, thèmes, hashtags et profession pré-remplis → vivier curé et
// kit du profil), « Refuser », « Autre série ». RIEN n'est importé avant l'acceptation.

export type ResultatSourcing = { ok: boolean; message: string; series: SerieAffichee[] };

/** Lance le sourcing : un profil de la profession de l'en-tête, un kit d'images (sujet), sinon les trous prioritaires (3 cibles au plus) */
export async function sourcerSeries(o: { profil?: string | null; kit?: string | null } = {}): Promise<ResultatSourcing> {
  await exigerAdmin();
  return lancer({ profil: typeof o?.profil === 'string' ? o.profil : null, kit: typeof o?.kit === 'string' && (SUJETS_KITS as readonly string[]).includes(o.kit) ? o.kit : null });
}

/** Lancement (non exporté : une cible complète ne vient jamais du navigateur, seulement de la base) */
async function lancer(o: { profil?: string | null; kit?: string | null; cible?: CibleSourcing | null }): Promise<ResultatSourcing> {
  const profession = (await getProfession()).id;
  if (!Object.values(sourcesConfigurees()).some(Boolean)) return { ok: false, message: 'Clé API à configurer (PEXELS_API_KEY ou PIXABAY_API_KEY dans Vercel).', series: [] };
  const ctx = await contexteSourcing(profession);
  if (ctx.migrationManquante) return { ok: false, message: MIGRATION_SERIES, series: [] };
  let cibles: CibleSourcing[];
  if (o.cible) cibles = [o.cible];
  else if (o.kit) cibles = [cibleKit(profession, o.kit, (ctx.entrees.kits ?? []).filter((k) => k.sujet === o.kit).map((k) => k.emplacement))];
  else if (o.profil) {
    const c = cibleProfil(profession, String(o.profil), { finalistes: ctx.entrees.finalistes });
    if (!c) return { ok: false, message: 'Profil inconnu pour cette profession.', series: [] };
    cibles = [c];
  } else cibles = ciblesPrioritaires(ctx.entrees).slice(0, QUOTAS_SOURCING.ciblesParLancement);
  if (!cibles.length) return { ok: true, message: 'Aucun trou prioritaire : tout est couvert ou une série attend déjà votre décision.', series: [] };
  const lignes: LigneSerie[] = [];
  const motifs: string[] = [];
  // Règles apprises des retours (politique d'évaluation) appliquées au sourcing : saturation, luminosité, visages…
  const politique = await getPolitique().catch(() => null);
  const contraintes = politique ? contraintesSourcing(politique.regles) : null;
  for (const c of cibles) {
    const { series, journal, motif } = await executerSourcing(c, { dejaVues: ctx.dejaVues, couverture: ctx.couverture, contraintes });
    const groupe = nouveauGroupe();
    for (const s of series) { lignes.push(ligneDeSerie(s, groupe, journal)); for (const p of s.photos) ctx.dejaVues.add(p.cle); }
    if (!series.length) motifs.push(`${c.libelle} : ${motif ?? 'aucune série'}`);
  }
  const r = await enregistrerSeries(lignes);
  if (!r.ok) return { ok: false, message: r.message ?? 'Échec.', series: [] };
  revalidatePath('/admin', 'layout');
  const revues = await getRevuesClaude();
  const n = r.series.length;
  return {
    ok: n > 0, series: r.series.map((s) => serieAffichee(s, revues[s.id])),
    message: `${n} série${n > 1 ? 's' : ''} proposée${n > 1 ? 's' : ''} (${cibles.map((c) => c.libelle).join(', ')}).${motifs.length ? ` ${motifs.join(' ; ')}` : ''} Rien n’est importé avant votre acceptation.`,
  };
}

/**
 * Accepte UNE photo d'une série (appelé photo par photo par le navigateur, avec la progression) : relue dans la série enregistrée,
 * Garder (traçabilité, aperçu de la source, thèmes, hashtags, profession) puis import WebP.
 */
export async function accepterPhotoDeSerie(serieId: string, cle: string, hashtagsEnPlus: string[] = []): Promise<{ ok: boolean; message: string; id?: string }> {
  await exigerAdmin();
  const s = await getSerie(serieId);
  if (!s) return { ok: false, message: 'Série introuvable.' };
  if (s.statut !== 'proposee') return { ok: false, message: 'Cette série a déjà été décidée.' };
  const p = s.photos.find((x) => x.cle === cle);
  if (!p) return { ok: false, message: 'Photo hors de la série.' };
  const g = await deciderPhoto({
    source: p.source, idSource: p.idSource, decision: 'garder', etiquettes: [], sujets: s.cibleDetails.themesDecision, requete: p.requete,
    hashtags: hashtagsValides([...hashtagsAcceptation(s, p), ...hashtagsEnPlus]), profession: s.profession, professions: [s.profession],
  });
  if (!g.ok) return { ok: false, message: g.message };
  const supabase = await createClient();
  const { data } = await supabase.from('photos_libres').select('id, url').eq('source', p.source).eq('id_source', p.idSource).maybeSingle();
  if (!data?.id) return { ok: false, message: 'Gardée, mais introuvable pour l’import : terminez dans Jeux de photos.' };
  if (data.url) return { ok: true, message: 'Déjà importée.', id: data.id };
  const r = await importerPhotoLibre(data.id);
  return r?.ok ? { ok: true, message: 'Importée (WebP, sans métadonnées).', id: data.id } : { ok: false, message: `Gardée, import impossible : ${r?.message ?? ''}`, id: data.id };
}

/** Clôt une série : acceptée (clés importées), refusée (ses photos ne seront plus proposées) ou remplacée (« Autre série ») */
export async function cloreSerie(serieId: string, statut: 'acceptee' | 'refusee' | 'remplacee', acceptees: string[] = []): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  if (!['acceptee', 'refusee', 'remplacee'].includes(statut)) return { ok: false, message: 'Décision inconnue.' };
  const s = await getSerie(serieId);
  if (!s) return { ok: false, message: 'Série introuvable.' };
  const cles = (Array.isArray(acceptees) ? acceptees : []).filter((c) => s.photos.some((p) => p.cle === c));
  const supabase = await createClient();
  const { error } = await supabase.from('photos_series').update({ statut, acceptees: cles, decide_le: new Date().toISOString() }).eq('id', s.id);
  if (error) return { ok: false, message: MIGRATION_SERIES };
  revalidatePath('/admin', 'layout');
  return { ok: true, message: statut === 'acceptee' ? `Série acceptée : ${cles.length} photo${cles.length > 1 ? 's' : ''} au frigo, rattachée${cles.length > 1 ? 's' : ''} au vivier et au kit.` : statut === 'refusee' ? 'Série refusée : ses photos ne seront plus proposées.' : 'Série remplacée.' };
}

/** « Autre série » : la suivante du même lancement si elle attend encore, sinon un nouveau sourcing de la même cible */
export async function autreSerie(serieId: string): Promise<ResultatSourcing> {
  await exigerAdmin();
  const s = await getSerie(serieId);
  if (!s) return { ok: false, message: 'Série introuvable.', series: [] };
  const c = await cloreSerie(serieId, 'remplacee');
  if (!c.ok) return { ok: false, message: c.message, series: [] };
  const supabase = await createClient();
  const { data } = await supabase.from('photos_series').select('id').eq('groupe', s.groupe).eq('statut', 'proposee').gt('rang', s.rang).order('rang', { ascending: true }).limit(1);
  if (data?.[0]?.id) {
    const x = await getSerie(data[0].id);
    const revues = await getRevuesClaude();
    if (x) return { ok: true, message: 'Série alternative du même lancement.', series: [serieAffichee(x, revues[x.id])] };
  }
  return lancer({ cible: s.cibleDetails });
}

/** Annule la décision d'une série : de nouveau proposée ; photos importées remises « à valider » (fichiers conservés) */
export async function annulerSerie(serieId: string, idsPhotos: string[] = []): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  const s = await getSerie(serieId);
  if (!s) return { ok: false, message: 'Série introuvable.' };
  const supabase = await createClient();
  const { error } = await supabase.from('photos_series').update({ statut: 'proposee', acceptees: [], decide_le: null }).eq('id', s.id);
  if (error) return { ok: false, message: MIGRATION_SERIES };
  for (const id of (Array.isArray(idsPhotos) ? idsPhotos : []).slice(0, 12)) await changerStatutPhotoLibre(id, 'a_valider');
  revalidatePath('/admin', 'layout');
  return { ok: true, message: idsPhotos.length ? 'Décision annulée : la série attend de nouveau (photos importées remises « à valider »).' : 'Décision annulée : la série attend de nouveau.' };
}
