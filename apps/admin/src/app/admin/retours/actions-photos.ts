'use server';

import { revalidatePath } from 'next/cache';
import {
  choisirRequete, cleCandidatePhoto, construireCandidate, requetesDuSujet, estSourcePhotoLibre, estSujetVisuel, etiquettesDecouverteValides, filtrerCandidats, frequencesHashtags, hashtagsValides,
  motsClesDuSujet, normaliserMotsCles, requetesEmplacement, refusDecision, SOURCES_PHOTOS_LIBRES, SUJETS_VISUELS, type CandidatPhoto, type DecisionPhoto, type SourcePhotoLibre,
} from '@plateforme/core';
import {
  cleMotsCles, lignesProfessionsDecision, motsClesDuTheme, professionDuChercheur, professionsDeLIngredient, requetesDuTheme, sujetsEtHashtagsDesThemes, themeRecherche,
  themesRecherche, couvertureRequetes, type Rattachements,
} from '@plateforme/core';
import { PROFESSION_PAR_DEFAUT, professionsAdmin } from '@plateforme/core/professions';
import { exigerAdmin } from '@/lib/admin';
import { getProfession } from '@/lib/profession';
import { getRattachementsProfessions, MIGRATION_PROFESSIONS } from '@/lib/professions-ingredients';
import {
  detailPhoto, ErreurSource, getMotsClesEnBase, MIGRATION_0031, rechercher, sourcesConfigurees,
} from '@/lib/photos-libres';
import { getHashtagsAssets, MIGRATION_HASHTAGS } from '@/lib/hashtags';
import { createClient, getUser } from '@/lib/supabase/server';

// « Photos à découvrir » (/admin/retours) : candidates Pexels / Pixabay, une à la fois ; GARDER = traçabilité et aperçu de la
// source SEULEMENT (aucun téléchargement, migration 0031) ; l'import (WebP sans EXIF, banque/libres/<sujet>/) se fait à la
// validation dans /admin/photos (importerPhotoLibre).
// Thèmes (plusieurs) : une entrée assets_sujets « ajout » par thème (0028) ; hashtags libres : assets_hashtags (0029).

const MIGRATION = 'Migration 0028 à exécuter (supabase/migrations/0028_inspirations_photos_libres.sql).';

/** Candidate envoyée au navigateur : vignette de la source (évaluation seulement), auteur, page ; jamais de clé */
export type CandidatAffiche = Omit<CandidatPhoto, 'telechargement'> & { requete: string };

export type ResultatCandidats = { ok: boolean; message: string; candidats: CandidatAffiche[]; cleManquante?: boolean };

const auHasard = <T,>(l: readonly T[]): T => l[Math.floor(Math.random() * l.length)];

/**
 * Photos déjà vues (gardées ou rejetées) : jamais remontrées. Couverture du sujet par requête (photos gardées ou importées,
 * hors retirées) : la requête suivante privilégie les thèmes encore peu couverts (choisirRequete).
 */
async function dejaVues(sujet: string, profession: string = PROFESSION_PAR_DEFAUT, rattachements: Rattachements = {}): Promise<{ vues: Set<string>; gardees: Record<string, number> }> {
  const supabase = await createClient();
  const [{ data: a }, { data: p }] = await Promise.all([
    supabase.from('photos_libres_avis').select('source, id_source').limit(20000),
    supabase.from('photos_libres').select('source, id_source, sujet, requete, statut').limit(20000),
  ]);
  const vues = new Set([...(a ?? []), ...(p ?? [])].map((l: { source: string; id_source: string }) => `${l.source}:${l.id_source}`));
  const lignes = (p ?? []) as { source: SourcePhotoLibre; id_source: string; sujet: string; requete: string | null; statut: string }[];
  if (profession === PROFESSION_PAR_DEFAUT) {
    // Profession par défaut : comme avant (photos du sujet), sans les photos gardées pour une autre profession seulement
    const gardees: Record<string, number> = {};
    for (const l of lignes) {
      if (l.sujet !== sujet || !l.requete || l.statut === 'retiree') continue;
      if (!professionsDeLIngredient(cleCandidatePhoto(l.source, l.id_source), rattachements).some((x) => x === profession || x === 'commun')) continue;
      gardees[l.requete] = (gardees[l.requete] ?? 0) + 1;
    }
    return { vues, gardees };
  }
  // Autre profession : couverture de CETTE profession (recherche-photos-professions.ts, couvertureRequetes)
  return { vues, gardees: couvertureRequetes(lignes.map((l) => ({ requete: l.requete, statut: l.statut, professions: professionsDeLIngredient(cleCandidatePhoto(l.source, l.id_source), rattachements) })), profession) };
}

/** Contexte du chercheur : profession de l'en-tête, professions de l'admin, thèmes de recherche par profession, mots-clés en base */
export async function contexteChercheur(): Promise<{ globale: string; professions: { id: string; court: string; libelle: string }[]; themes: Record<string, { id: string; libelle: string }[]>; enBase: Record<string, string[]> }> {
  await exigerAdmin();
  const [globale, { motsCles }] = await Promise.all([getProfession(), getMotsClesEnBase()]);
  const professions = professionsAdmin().map((p) => ({ id: p.id, court: p.court, libelle: p.libelle }));
  return { globale: globale.id, professions, themes: Object.fromEntries(professions.map((p) => [p.id, themesRecherche(p.id).map((t) => ({ id: t.id, libelle: t.libelle }))])), enBase: motsCles };
}

/** Prochaines candidates pour un sujet (mot-clé et source tirés au hasard, filtrées : taille, doublons, déjà vues) */
export async function candidatsPhotos(sujet: string, vuesNavigateur: string[] = [], emplacement: string | null = null, verrou: string | null = null): Promise<ResultatCandidats> {
  await exigerAdmin();
  // Profession du chercheur : verrouillée (cadenas), sinon celle de l'en-tête ; thèmes de recherche de cette profession
  const profession = professionDuChercheur({ globale: (await getProfession()).id, verrou });
  if (profession !== PROFESSION_PAR_DEFAUT) return candidatsPhotosProfession(profession, sujet, vuesNavigateur);
  if (!estSujetVisuel(sujet)) return { ok: false, message: 'Sujet inconnu.', candidats: [] };
  const conf = sourcesConfigurees();
  const sources = SOURCES_PHOTOS_LIBRES.filter((s) => conf[s]);
  if (!sources.length) return { ok: false, cleManquante: true, message: 'Clé API à configurer (PEXELS_API_KEY ou PIXABAY_API_KEY dans Vercel).', candidats: [] };
  const { rattachements } = await getRattachementsProfessions();
  const [{ motsCles }, { vues, gardees }] = await Promise.all([getMotsClesEnBase(), dejaVues(sujet, PROFESSION_PAR_DEFAUT, rattachements)]);
  for (const v of (Array.isArray(vuesNavigateur) ? vuesNavigateur : []).slice(0, 2000)) if (typeof v === 'string') vues.add(v);
  // Mots-clés du sujet + exploration (randonnée, basket…), tirés en privilégiant ceux qui ont encore peu de photos
  // Depuis un kit (« Trouver des photos ») : requêtes ciblées de l'emplacement (suggestions-kits.ts), pondérées par couverture
  const mots = emplacement && /^(accueil|page-sujet|cabinet|soin:[a-z0-9-]{1,40})$/.test(emplacement) ? requetesEmplacement(sujet, emplacement) : requetesDuSujet(sujet, motsCles);
  let derniereErreur = '';
  for (let essai = 0; essai < 4; essai++) {
    const source: SourcePhotoLibre = auHasard(sources);
    const requete = choisirRequete(mots, gardees);
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

/** Autre profession que celle par défaut : thème du pack, requêtes (base « profession/thème », sinon pack + exploration) */
async function candidatsPhotosProfession(profession: string, theme: string, vuesNavigateur: string[]): Promise<ResultatCandidats> {
  if (!themeRecherche(profession, theme)) return { ok: false, message: 'Thème inconnu pour cette profession.', candidats: [] };
  const conf = sourcesConfigurees();
  const sources = SOURCES_PHOTOS_LIBRES.filter((s) => conf[s]);
  if (!sources.length) return { ok: false, cleManquante: true, message: 'Clé API à configurer (PEXELS_API_KEY ou PIXABAY_API_KEY dans Vercel).', candidats: [] };
  const { rattachements } = await getRattachementsProfessions();
  const [{ motsCles }, { vues, gardees }] = await Promise.all([getMotsClesEnBase(), dejaVues(theme, profession, rattachements)]);
  for (const v of (Array.isArray(vuesNavigateur) ? vuesNavigateur : []).slice(0, 2000)) if (typeof v === 'string') vues.add(v);
  const mots = requetesDuTheme(profession, theme, motsCles);
  let derniereErreur = '';
  for (let essai = 0; essai < 4; essai++) {
    const source: SourcePhotoLibre = auHasard(sources);
    const requete = choisirRequete(mots, gardees);
    const page = 1 + Math.floor(Math.random() * (essai < 2 ? 2 : 5));
    try {
      const l = filtrerCandidats(await rechercher(source, requete, page), vues).slice(0, 12);
      if (l.length) return { ok: true, message: '', candidats: l.map(({ telechargement: _t, ...c }) => ({ ...c, requete })) };
    } catch (e) {
      derniereErreur = e instanceof ErreurSource ? e.message : 'Recherche impossible.';
    }
  }
  return { ok: false, message: derniereErreur || 'Aucune nouvelle photo pour ce thème : ajoutez des mots-clés ou réessayez plus tard.', candidats: [] };
}

export type ResultatDecision = { ok: boolean; message: string; url?: string };

/**
 * GARDER ou REJETER une candidate. Garder : la photo est relue à la source (les informations du navigateur ne font pas
 * foi) et tracée avec l'aperçu fourni par la source (photos_libres, statut « à valider », aucun fichier téléchargé ;
 * import à la validation). Refusé si une étiquette bloquante de la charte est cochée.
 */
export async function deciderPhoto(entree: {
  source: string; idSource: string; decision: DecisionPhoto; etiquettes: string[];
  /** Thèmes cochés (au moins un pour Garder) ; le premier devient photos_libres.sujet (compatibilité) */
  sujets: string[];
  /** Hashtags libres (normalisés ici, 15 au plus) */
  hashtags?: string[];
  requete: string;
  /** Profession du chercheur (verrou) : ses thèmes ; absente = profession de l'en-tête */
  profession?: string | null;
  /** Professions cochées (profession verrouillée pré-cochée, « Aussi pour… ») : rattachement assets_professions (0046) */
  professions?: string[];
}): Promise<ResultatDecision> {
  await exigerAdmin();
  const { source, idSource, decision } = entree ?? ({} as never);
  if (!estSourcePhotoLibre(source) || !/^[0-9]{1,20}$/.test(String(idSource))) return { ok: false, message: 'Photo inconnue.' };
  if (decision !== 'garder' && decision !== 'rejeter') return { ok: false, message: 'Décision inconnue.' };
  // Profession du chercheur : ses thèmes (une autre profession range la photo sous le sujet visuel du thème + ses hashtags)
  const profession = professionDuChercheur({ globale: (await getProfession()).id, verrou: entree?.profession ?? null });
  const themesProfession = profession === PROFESSION_PAR_DEFAUT ? null : sujetsEtHashtagsDesThemes(profession, Array.isArray(entree?.sujets) ? entree.sujets : []);
  // Thèmes valides, dans l'ordre de saisie, sans doublon
  const sujets = (themesProfession ? themesProfession.sujets : Array.isArray(entree?.sujets) ? entree.sujets : []).filter((x, i, l) => estSujetVisuel(x) && l.indexOf(x) === i);
  const sujet = sujets[0] ?? (decision === 'rejeter' ? SUJETS_VISUELS[0].id : '');
  if (!estSujetVisuel(sujet)) return { ok: false, message: 'Cochez au moins un thème.' };
  const hashtags = hashtagsValides([...(themesProfession?.hashtags ?? []), ...(Array.isArray(entree?.hashtags) ? entree.hashtags : [])]);
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

  // GARDER = aucune image téléchargée : traçabilité + aperçu fourni par la source (relus à la source, le navigateur ne
  // fait pas foi), statut « à valider ». L'import (fichiers WebP hébergés) se fait à la validation, dans /admin/photos.
  let candidat: CandidatPhoto | null;
  try {
    candidat = await detailPhoto(source, idSource);
  } catch (e) {
    return { ok: false, message: e instanceof ErreurSource ? e.message : 'Source injoignable. Réessayez.' };
  }
  if (!candidat) return { ok: false, message: 'Photo introuvable à la source (retirée ?).' };
  const { motsCles } = await getMotsClesEnBase();
  const { ligne, erreurs } = construireCandidate({ candidat, sujet, motsCles: themesProfession ? motsClesDuTheme(profession, (entree.sujets ?? [])[0] ?? 'general', motsCles) : motsClesDuSujet(sujet, motsCles), requete: String(entree.requete ?? ''), gardeLe: new Date(), etiquettes });
  if (!ligne) return { ok: false, message: `Traçabilité incomplète : ${erreurs.join(' ')}` };
  const { error } = await supabase.from('photos_libres').upsert({ ...ligne, auteur: user?.id ?? null, updated_at: new Date().toISOString() }, { onConflict: 'source,id_source' });
  if (error) {
    console.error('Photos libres : candidate non enregistrée', error);
    // Colonnes apercu_url / importe_le absentes ou chemin encore obligatoire : migration 0031 pas exécutée
    return { ok: false, message: /apercu_url|importe_le|null value|not-null|schema cache/i.test(error.message) ? `Candidate non enregistrée. ${MIGRATION_0031}` : `Candidate non enregistrée : ${error.message}` };
  }
  await supabase.from('photos_libres_avis').upsert(avis, { onConflict: 'source,id_source' });
  // Thèmes et hashtags sous la clé de la candidate ; recopiés sur la photo importée lors de « Valider et importer »
  const cle = cleCandidatePhoto(source, idSource);
  const auteur = user?.id ?? null;
  let complement = '';
  const { error: eSujets } = await supabase.from('assets_sujets').insert(sujets.map((s) => ({ cle_asset: cle, sujet: s, action: 'ajout', auteur })));
  if (eSujets) complement += ' Thèmes supplémentaires non enregistrés (migration 0028).';
  if (hashtags.length) {
    const { error: eTags } = await supabase.from('assets_hashtags').insert(hashtags.map((h) => ({ cle_asset: cle, hashtag: h, action: 'ajout', auteur })));
    complement += eTags ? ` ${MIGRATION_HASHTAGS}` : ` ${hashtags.length} hashtag${hashtags.length > 1 ? 's' : ''} enregistré${hashtags.length > 1 ? 's' : ''}.`;
  }
  // Professions cochées (par défaut : la profession du chercheur) → assets_professions, reportées sur la photo à l'import
  const professions = Array.isArray(entree?.professions) && entree.professions.length ? entree.professions : [profession];
  const lignesProf = lignesProfessionsDecision(cle, professions);
  if (lignesProf.length) {
    const { error: eProf } = await supabase.from('assets_professions').insert(lignesProf.map((l) => ({ ...l, auteur })));
    complement += eProf ? ` ${MIGRATION_PROFESSIONS}` : '';
  }
  revalidatePath('/admin/photos');
  return { ok: true, message: `Gardée (lien seulement, rien n’est téléchargé) : à valider et importer dans Jeux de photos.${complement}` };
}

/** Mots-clés d'un sujet (une ligne ou une virgule par mot-clé) ; liste vide = valeurs par défaut */
export async function enregistrerMotsCles(sujet: string, texte: string, verrou: string | null = null): Promise<{ ok: boolean; message: string; motsCles?: string[] }> {
  await exigerAdmin();
  const profession = professionDuChercheur({ globale: (await getProfession()).id, verrou });
  if (profession !== PROFESSION_PAR_DEFAUT) {
    // Autre profession : mots-clés par (profession, thème), migration 0049
    if (!themeRecherche(profession, sujet)) return { ok: false, message: 'Thème inconnu pour cette profession.' };
    const mots = normaliserMotsCles(String(texte ?? ''));
    const supabase = await createClient();
    const { error } = await supabase.from('photos_libres_mots_cles_professions').upsert({ profession, theme: sujet, mots_cles: mots, updated_at: new Date().toISOString() }, { onConflict: 'profession,theme' });
    if (error) return { ok: false, message: 'Enregistrement impossible : migration 0049 à exécuter (supabase/migrations/0049_mots_cles_professions.sql).' };
    return { ok: true, message: mots.length ? `${mots.length} mot${mots.length > 1 ? 's' : ''}-clé${mots.length > 1 ? 's' : ''} enregistré${mots.length > 1 ? 's' : ''}.` : 'Mots-clés par défaut rétablis.', motsCles: motsClesDuTheme(profession, sujet, { [cleMotsCles(profession, sujet)]: mots }) };
  }
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
