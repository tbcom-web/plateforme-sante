'use server';

import { revalidatePath } from 'next/cache';
import {
  cheminPhotoLibre, clePhoto, construireTracabilite, estSourcePhotoLibre, estSujetVisuel, etiquettesDecouverteValides, filtrerCandidats, frequencesHashtags, hashtagsValides,
  largeursAProduire, LICENCES_SOURCES, motsClesDuSujet, normaliserMotsCles, refusDecision, SOURCES_PHOTOS_LIBRES, SUJETS_VISUELS, type CandidatPhoto, type DecisionPhoto,
  type SourcePhotoLibre,
} from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import {
  convertirWebp, detailPhoto, ErreurSource, getMotsClesEnBase, largeurImage, rechercher, sourcesConfigurees, telechargerImage,
} from '@/lib/photos-libres';
import { getHashtagsAssets, MIGRATION_HASHTAGS } from '@/lib/hashtags';
import { createClient, getUser } from '@/lib/supabase/server';

// « Photos à découvrir » (/admin/retours) : candidates Pexels / Pixabay, une à la fois ; GARDER = téléchargement, WebP en
// plusieurs largeurs sans EXIF, hébergement dans le bucket « photos » (banque/libres/<sujet>/) et traçabilité (0028).
// Thèmes (plusieurs) : une entrée assets_sujets « ajout » par thème (0028) ; hashtags libres : assets_hashtags (0029).

const MIGRATION = 'Migration 0028 à exécuter (supabase/migrations/0028_inspirations_photos_libres.sql).';

/** Candidate envoyée au navigateur : vignette de la source (évaluation seulement), auteur, page ; jamais de clé */
export type CandidatAffiche = Omit<CandidatPhoto, 'telechargement'> & { requete: string };

export type ResultatCandidats = { ok: boolean; message: string; candidats: CandidatAffiche[]; cleManquante?: boolean };

const auHasard = <T,>(l: readonly T[]): T => l[Math.floor(Math.random() * l.length)];

/** Photos déjà vues (gardées ou rejetées) : jamais remontrées */
async function dejaVues(): Promise<Set<string>> {
  const supabase = await createClient();
  const [{ data: a }, { data: p }] = await Promise.all([
    supabase.from('photos_libres_avis').select('source, id_source').limit(20000),
    supabase.from('photos_libres').select('source, id_source').limit(20000),
  ]);
  return new Set([...(a ?? []), ...(p ?? [])].map((l: { source: string; id_source: string }) => `${l.source}:${l.id_source}`));
}

/** Prochaines candidates pour un sujet (mot-clé et source tirés au hasard, filtrées : taille, doublons, déjà vues) */
export async function candidatsPhotos(sujet: string, vuesNavigateur: string[] = []): Promise<ResultatCandidats> {
  await exigerAdmin();
  if (!estSujetVisuel(sujet)) return { ok: false, message: 'Sujet inconnu.', candidats: [] };
  const conf = sourcesConfigurees();
  const sources = SOURCES_PHOTOS_LIBRES.filter((s) => conf[s]);
  if (!sources.length) return { ok: false, cleManquante: true, message: 'Clé API à configurer (PEXELS_API_KEY ou PIXABAY_API_KEY dans Vercel).', candidats: [] };
  const [{ motsCles }, vues] = await Promise.all([getMotsClesEnBase(), dejaVues()]);
  for (const v of (Array.isArray(vuesNavigateur) ? vuesNavigateur : []).slice(0, 2000)) if (typeof v === 'string') vues.add(v);
  const mots = motsClesDuSujet(sujet, motsCles);
  let derniereErreur = '';
  for (let essai = 0; essai < 4; essai++) {
    const source: SourcePhotoLibre = auHasard(sources);
    const requete = auHasard(mots);
    const page = 1 + Math.floor(Math.random() * (essai < 2 ? 2 : 5));
    try {
      const l = filtrerCandidats(await rechercher(source, requete, page), vues).slice(0, 12);
      if (l.length) {
        return { ok: true, message: '', candidats: l.map(({ telechargement: _t, ...c }) => ({ ...c, requete })) };
      }
    } catch (e) {
      derniereErreur = e instanceof ErreurSource ? e.message : 'Recherche impossible.';
    }
  }
  return { ok: false, message: derniereErreur || 'Aucune nouvelle photo pour ce sujet : ajoutez des mots-clés ou réessayez plus tard.', candidats: [] };
}

export type ResultatDecision = { ok: boolean; message: string; url?: string };

/**
 * GARDER ou REJETER une candidate. Garder : la photo est relue à la source (les informations du navigateur ne font pas
 * foi), téléchargée, convertie en WebP (640, 1280, 1920 px au plus, sans EXIF), hébergée chez nous, puis tracée
 * (photos_libres, statut « à valider »). Refusé si une étiquette bloquante de la charte est cochée.
 */
export async function deciderPhoto(entree: {
  source: string; idSource: string; decision: DecisionPhoto; etiquettes: string[];
  /** Thèmes cochés (au moins un pour Garder) ; le premier devient photos_libres.sujet (compatibilité) */
  sujets: string[];
  /** Hashtags libres (normalisés ici, 15 au plus) */
  hashtags?: string[];
  requete: string;
}): Promise<ResultatDecision> {
  await exigerAdmin();
  const { source, idSource, decision } = entree ?? ({} as never);
  if (!estSourcePhotoLibre(source) || !/^[0-9]{1,20}$/.test(String(idSource))) return { ok: false, message: 'Photo inconnue.' };
  if (decision !== 'garder' && decision !== 'rejeter') return { ok: false, message: 'Décision inconnue.' };
  // Thèmes valides, dans l'ordre de saisie, sans doublon
  const sujets = (Array.isArray(entree?.sujets) ? entree.sujets : []).filter((x, i, l) => estSujetVisuel(x) && l.indexOf(x) === i);
  const sujet = sujets[0] ?? (decision === 'rejeter' ? SUJETS_VISUELS[0].id : '');
  if (!estSujetVisuel(sujet)) return { ok: false, message: 'Cochez au moins un thème.' };
  const hashtags = hashtagsValides(entree?.hashtags);
  const etiquettes = etiquettesDecouverteValides(entree.etiquettes);
  const refus = refusDecision(decision, etiquettes);
  if (refus) return { ok: false, message: refus };
  const user = await getUser();
  const supabase = await createClient();
  const avis = { source, id_source: idSource, decision, etiquettes, sujet, auteur: user?.id ?? null, created_at: new Date().toISOString() };

  if (decision === 'rejeter') {
    const { error } = await supabase.from('photos_libres_avis').upsert(avis, { onConflict: 'source,id_source' });
    return error ? { ok: false, message: `Rejet non enregistré. ${MIGRATION}` } : { ok: true, message: 'Rejetée : elle ne sera plus proposée.' };
  }

  try {
    const candidat = await detailPhoto(source, idSource);
    if (!candidat) return { ok: false, message: 'Photo introuvable à la source (retirée ?).' };
    const original = await telechargerImage(candidat);
    let largeurs: number[];
    let fichiers: { largeur: number; donnees: Buffer }[];
    try {
      largeurs = largeursAProduire(await largeurImage(original));
      fichiers = await convertirWebp(original, largeurs);
    } catch (e) {
      console.error('Photos libres : conversion WebP impossible', e);
      return { ok: false, message: 'Conversion WebP impossible sur le serveur (sharp). Réessayez ; si cela persiste, prévenez Claude.' };
    }
    const stockage = supabase.storage.from('photos');
    for (const f of fichiers) {
      // Sans « upsert » : le remplacement exigerait en plus un droit de lecture sur storage.objects. Un fichier déjà présent
      // (photo gardée une seconde fois) est accepté tel quel.
      const { error } = await stockage.upload(cheminPhotoLibre(sujet, source, idSource, f.largeur), f.donnees, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
      if (error && !/exist|duplicate/i.test(error.message)) {
        console.error('Photos libres : envoi dans le stockage', error);
        return { ok: false, message: `Envoi dans le stockage impossible : ${error.message}. Vérifiez que la migration 0030 (droits du dossier banque/) est exécutée.` };
      }
    }
    const grande = Math.max(...largeurs);
    const url = stockage.getPublicUrl(cheminPhotoLibre(sujet, source, idSource, grande)).data.publicUrl;
    const { motsCles } = await getMotsClesEnBase();
    const { ligne, erreurs } = construireTracabilite({
      candidat, sujet, motsCles: motsClesDuSujet(sujet, motsCles), requete: String(entree.requete ?? ''), telechargeLe: new Date(), largeurs, urlPrincipale: url, etiquettes,
    });
    if (!ligne) return { ok: false, message: `Traçabilité incomplète : ${erreurs.join(' ')}` };
    const { error } = await supabase.from('photos_libres').upsert({ ...ligne, auteur: user?.id ?? null, updated_at: new Date().toISOString() }, { onConflict: 'source,id_source' });
    if (error) return { ok: false, message: `Photo hébergée mais traçabilité non enregistrée. ${MIGRATION}` };
    await supabase.from('photos_libres_avis').upsert(avis, { onConflict: 'source,id_source' });
    // Thèmes et hashtags, sous la même clé que l'inventaire et la bibliothèque (photo:banque/libres/…)
    const cle = clePhoto(url);
    let complement = '';
    if (cle) {
      const auteur = user?.id ?? null;
      const { error: eSujets } = await supabase.from('assets_sujets').insert(sujets.map((s) => ({ cle_asset: cle, sujet: s, action: 'ajout', auteur })));
      if (eSujets) complement += ' Thèmes supplémentaires non enregistrés (migration 0028).';
      if (hashtags.length) {
        const { error: eTags } = await supabase.from('assets_hashtags').insert(hashtags.map((h) => ({ cle_asset: cle, hashtag: h, action: 'ajout', auteur })));
        complement += eTags ? ` ${MIGRATION_HASHTAGS}` : ` ${hashtags.length} hashtag${hashtags.length > 1 ? 's' : ''} enregistré${hashtags.length > 1 ? 's' : ''}.`;
      }
    }
    revalidatePath('/admin/photos');
    revalidatePath('/admin/illustrations');
    return { ok: true, message: `Gardée : hébergée chez nous (${largeurs.join(', ')} px), ${LICENCES_SOURCES[source].nom} tracée, à valider dans Jeux de photos.${complement}`, url };
  } catch (e) {
    return { ok: false, message: e instanceof ErreurSource ? e.message : 'Téléchargement impossible. Réessayez.' };
  }
}

/** Mots-clés d'un sujet (une ligne ou une virgule par mot-clé) ; liste vide = valeurs par défaut */
export async function enregistrerMotsCles(sujet: string, texte: string): Promise<{ ok: boolean; message: string; motsCles?: string[] }> {
  await exigerAdmin();
  if (!estSujetVisuel(sujet)) return { ok: false, message: 'Sujet inconnu.' };
  const mots = normaliserMotsCles(String(texte ?? ''));
  const supabase = await createClient();
  const { error } = await supabase.from('photos_libres_mots_cles').upsert({ sujet, mots_cles: mots, updated_at: new Date().toISOString() }, { onConflict: 'sujet' });
  if (error) return { ok: false, message: `Enregistrement impossible. ${MIGRATION}` };
  return { ok: true, message: mots.length ? `${mots.length} mot${mots.length > 1 ? 's' : ''}-clé${mots.length > 1 ? 's' : ''} enregistré${mots.length > 1 ? 's' : ''}.` : 'Mots-clés par défaut rétablis.', motsCles: motsClesDuSujet(sujet, { [sujet]: mots }) };
}

/** Hashtags déjà utilisés (fréquence par hashtag) pour l'autocomplétion ; migrationManquante sans la migration 0029 */
export async function hashtagsConnus(): Promise<{ frequences: Record<string, number>; migrationManquante: boolean }> {
  await exigerAdmin();
  const { hashtags, migrationManquante } = await getHashtagsAssets();
  return { frequences: frequencesHashtags(hashtags), migrationManquante };
}
