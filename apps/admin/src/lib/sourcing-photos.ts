import 'server-only';
import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  analyserCandidate, caracteristiquesPixels, cleCandidatePhoto, clePhoto, composerKit, composerSeriesPhotos, couvertureRequetes, emplacementsAFaire, filtrerCandidatesSourcing,
  lireRevuesSeries, notesPhotos, planRequetes, professionsDeLIngredient, QUOTAS_SOURCING, serieDepuisLigne, serieEnAttente, SOURCES_PHOTOS_LIBRES, SUJETS_KITS, urlApercuAnalyse,
  urlImageAutorisee, STATUTS_BOUCLE,
  type CandidateAnalysee, type CandidateSourcing, type CaracteristiquesPhoto, type CibleSourcing, type EntreesCibles, type JournalSourcing, type LigneSerie, type RevueSerieClaude,
  type SerieEnregistree, type SourcePhotoLibre,
} from '@plateforme/core';
import { contraintesSourcing, motsDuTexte, respecteContraintes } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { ErreurSource, rechercher, sourcesConfigurees } from '@/lib/photos-libres';
import { getHashtagsAssets } from '@/lib/hashtags';
import { getRattachementsProfessions } from '@/lib/professions-ingredients';
import { getLignesAssetsApprentissage } from '@/lib/notation-recettes';
import { getDonneesKits } from '@/lib/kits-images';

// SOURCING AUTOMATIQUE DE PHOTOS (packages/core/src/sourcing-photos.ts, docs/sourcing-photos.md) côté serveur :
// - recherches Pexels / Pixabay par les fonctions existantes (clés Vercel, fenêtre glissante, cache 24 h : lib/photos-libres.ts) ;
// - APERÇU BASSE DÉFINITION (≈ 340 px) lu EN MÉMOIRE pour les caractéristiques visuelles (sharp → 96 px), jamais écrit nulle part ;
// - séries composées par le core, enregistrées dans photos_series (0053) : RIEN n'est importé avant l'acceptation de Paul.
// L'endpoint protégé (app/api/sourcing-photos) appelle executerSourcing sans base : le workflow lui fournit le contexte.

export const MIGRATION_SERIES = 'Migration 0053 à exécuter (supabase/migrations/0053_photos_series.sql) : les séries de l’agent ne peuvent pas encore être enregistrées.';

const TAILLE_APERCU_MAX = 1_500_000;

async function chargerSharp() {
  const m = (await import('sharp')) as unknown as { default?: typeof import('sharp') } & typeof import('sharp');
  return typeof m.default === 'function' ? m.default : m;
}

/**
 * Caractéristiques visuelles d'une candidate : aperçu basse définition de la source (hôtes de la source seulement, redirections
 * vérifiées, 1,5 Mo au plus), réduit à 96 px en mémoire. null si l'aperçu est illisible.
 */
export async function analyserApercu(c: Pick<CandidateSourcing, 'source' | 'apercu'>): Promise<CaracteristiquesPhoto | null> {
  let url = urlApercuAnalyse(c);
  if (!url) return null;
  try {
    let r: Response | null = null;
    for (let i = 0; i < 3; i++) {
      if (!urlImageAutorisee(c.source, url)) return null;
      r = await fetch(url, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      const suite: string | null = r.status >= 300 && r.status < 400 ? r.headers.get('location') : null;
      if (!suite) break;
      url = new URL(suite, url).toString();
      r = null;
    }
    if (!r || !r.ok || !String(r.headers.get('content-type') ?? '').startsWith('image/')) return null;
    if (Number(r.headers.get('content-length') ?? 0) > TAILLE_APERCU_MAX) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > TAILLE_APERCU_MAX) return null;
    const sharp = await chargerSharp();
    const { data, info } = await sharp(buf, { failOn: 'error', limitInputPixels: 4_000_000 }).rotate().resize(96, 96, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return caracteristiquesPixels(data, info.width, info.height);
  } catch {
    return null;
  }
}

/** Exécute des tâches avec `n` en parallèle au plus */
async function parPaquets<T, R>(l: readonly T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const res: R[] = new Array(l.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, l.length) }, async () => { while (i < l.length) { const k = i++; res[k] = await f(l[k]); } }));
  return res;
}

/** Alterne les requêtes (une candidate de chaque à tour de rôle) : les aperçus analysés restent variés */
function alterner<T extends { requete: string }>(l: readonly T[], max: number): T[] {
  const parRequete = new Map<string, T[]>();
  for (const c of l) parRequete.set(c.requete, [...(parRequete.get(c.requete) ?? []), c]);
  const files = [...parRequete.values()];
  const res: T[] = [];
  for (let k = 0; res.length < max && files.some((f) => f.length); k++) { const f = files[k % files.length]; const x = f.shift(); if (x) res.push(x); }
  return res;
}

export type ContexteExecution = {
  dejaVues: ReadonlySet<string>;
  couverture?: Readonly<Record<string, number>>;
  graine?: number;
  /** Sources permises (par défaut : celles dont la clé est configurée) */
  sources?: readonly SourcePhotoLibre[];
  /** Règles apprises des retours de Paul (regles-apprises.ts, contraintesSourcing) : saturation, luminosité, mots interdits en plus */
  contraintes?: ReturnType<typeof contraintesSourcing> | null;
};

/**
 * Sourcing d'UNE cible : plan des requêtes, recherches (cache 24 h, limites de débit), filtres, aperçus analysés en mémoire,
 * séries composées. Aucune écriture : renvoie les séries et le journal.
 */
export async function executerSourcing(cible: CibleSourcing, ctx: ContexteExecution): Promise<{ series: ReturnType<typeof composerSeriesPhotos>['series']; journal: JournalSourcing; motif: string | null }> {
  const conf = sourcesConfigurees();
  const sources = (ctx.sources ?? SOURCES_PHOTOS_LIBRES).filter((s) => conf[s]);
  const journal: JournalSourcing = { requetes: [], candidates: 0, analysees: 0, ecartees: {}, erreurs: [] };
  if (!sources.length) return { series: [], journal, motif: 'Clé API à configurer (PEXELS_API_KEY ou PIXABAY_API_KEY dans Vercel).' };
  const plan = planRequetes(cible, { sources, couverture: ctx.couverture, graine: ctx.graine ?? Date.now() % 100000 });
  journal.requetes = plan;
  const brutes: CandidateSourcing[] = [];
  for (const q of plan) {
    try {
      for (const c of await rechercher(q.source, q.requete, q.page)) brutes.push({ ...c, requete: q.requete });
    } catch (e) {
      const m = e instanceof ErreurSource ? e.message : 'Recherche impossible.';
      if (!journal.erreurs.includes(m)) journal.erreurs.push(m);
      // Limite atteinte ou clé refusée : inutile d'insister sur cette source
      if (/Limite|Clé/.test(m)) break;
    }
  }
  journal.candidates = brutes.length;
  const { gardees, ecartees } = filtrerCandidatesSourcing(brutes, { profession: cible.profession, emplacements: cible.emplacements, dejaVues: ctx.dejaVues });
  for (const e of ecartees) journal.ecartees[e.raison] = (journal.ecartees[e.raison] ?? 0) + 1;
  const aAnalyser = alterner(gardees, QUOTAS_SOURCING.apercusParCible);
  const cars = await parPaquets(aAnalyser, 8, (c) => analyserApercu(c));
  const analysees: CandidateAnalysee[] = [];
  aAnalyser.forEach((c, i) => {
    const car = cars[i];
    if (!car) { journal.ecartees.apercu = (journal.ecartees.apercu ?? 0) + 1; return; }
    // Règles apprises (« couleur criarde », « fade », « photo de visage »…) : la candidate qui les enfreint est écartée (comptée « apercu »)
    if (ctx.contraintes && respecteContraintes(car, motsDuTexte(`${c.description} ${c.tags.join(' ')}`), ctx.contraintes)) { journal.ecartees.apercu = (journal.ecartees.apercu ?? 0) + 1; return; }
    analysees.push(analyserCandidate(c, car, cible));
  });
  journal.analysees = analysees.length;
  const { series, motif } = composerSeriesPhotos(analysees, cible);
  return { series, journal, motif: motif ?? (journal.erreurs.length && !series.length ? journal.erreurs.join(' ') : null) };
}

/** Identifiant d'un lancement (groupe des alternatives) */
export const nouveauGroupe = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------------------------------------------
// Lectures (admin connecté)
// ---------------------------------------------------------------------------------------------------------------

const COLONNES_SERIES = 'id, groupe, rang, profession, cible, cible_details, titre, signature, coherence, dispersion, score, gamme, traitement, palette, photos, empreinte, statut, journal, created_at, expire_le';

/** Séries en attente de la profession (proposées, non expirées), plus récentes d'abord */
async function getSeriesEnAttenteSansMemo(profession: string): Promise<{ series: SerieEnregistree[]; migrationManquante: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('photos_series').select(COLONNES_SERIES).eq('profession', profession).eq('statut', 'proposee').order('created_at', { ascending: false }).limit(60);
    if (error) return { series: [], migrationManquante: true };
    const maintenant = new Date();
    return { series: ((data ?? []) as Record<string, unknown>[]).map(serieDepuisLigne).filter((s): s is SerieEnregistree => Boolean(s && serieEnAttente(s, maintenant))), migrationManquante: false };
  } catch {
    return { series: [], migrationManquante: true };
  }
}
export const getSeriesEnAttente = cache(getSeriesEnAttenteSansMemo);

/** Une série par son identifiant (relue avant chaque décision : le navigateur ne fait pas foi) */
export async function getSerie(id: string): Promise<SerieEnregistree | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('photos_series').select(COLONNES_SERIES).eq('id', id).maybeSingle();
  return data ? serieDepuisLigne(data as Record<string, unknown>) : null;
}

/** Revue de Claude (retours/series-photos-claude.json) : API GitHub (jeton serveur), sinon copie locale ; {} si absente */
async function getRevuesClaudeSansMemo(): Promise<Record<string, RevueSerieClaude>> {
  const nom = 'series-photos-claude.json';
  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPO;
  if (token && repo) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/retours/${nom}?ref=main`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' }, next: { revalidate: 600 }, signal: AbortSignal.timeout(5000),
      });
      if (r.ok) return lireRevuesSeries(JSON.parse(await r.text()));
    } catch { /* repli local */ }
  }
  for (const racine of [process.cwd(), join(process.cwd(), '..', '..')]) {
    try { return lireRevuesSeries(JSON.parse(await readFile(join(racine, 'retours', nom), 'utf8'))); } catch { /* suivant */ }
  }
  return {};
}
export const getRevuesClaude = cache(getRevuesClaudeSansMemo);

/**
 * Contexte du sourcing pour la profession : déjà vues (gardées, rejetées, déjà proposées dans une série), couverture des requêtes,
 * trous (photos par hashtag et note, kits du podologue, finalistes de la chaîne) et cibles qui attendent déjà une décision.
 */
export async function contexteSourcing(profession: string): Promise<{ dejaVues: Set<string>; couverture: Record<string, number>; entrees: EntreesCibles; migrationManquante: boolean }> {
  const supabase = await createClient();
  const [{ data: avis }, { data: libres }, series, { hashtags }, { rattachements }, lignes] = await Promise.all([
    supabase.from('photos_libres_avis').select('source, id_source').limit(20000),
    supabase.from('photos_libres').select('source, id_source, sujet, requete, statut, url').limit(20000),
    supabase.from('photos_series').select('cible, statut, photos, expire_le').order('created_at', { ascending: false }).limit(500),
    getHashtagsAssets().catch(() => ({ hashtags: {} as Record<string, string[]> })),
    getRattachementsProfessions().catch(() => ({ rattachements: {} })),
    getLignesAssetsApprentissage(),
  ]);
  const dejaVues = new Set([...(avis ?? []), ...(libres ?? [])].map((l: { source: string; id_source: string }) => `${l.source}:${l.id_source}`));
  const lignesSeries = (series.data ?? []) as { cible: string; statut: string; photos: { source?: string; idSource?: string }[]; expire_le: string | null }[];
  for (const s of lignesSeries) for (const p of Array.isArray(s.photos) ? s.photos : []) if (p?.source && p.idSource) dejaVues.add(`${p.source}:${p.idSource}`);
  const enAttente = lignesSeries.filter((s) => s.statut === 'proposee' && (!s.expire_le || new Date(s.expire_le) > new Date())).map((s) => s.cible);
  const notes = notesPhotos(lignes);
  const photos = ((libres ?? []) as { source: string; id_source: string; sujet: string; requete: string | null; statut: string; url: string | null }[]).map((l) => {
    const cleC = cleCandidatePhoto(l.source as SourcePhotoLibre, l.id_source);
    const cleI = l.url ? clePhoto(l.url) : null;
    const tags = [...new Set([...(hashtags[cleC] ?? []), ...(cleI ? hashtags[cleI] ?? [] : [])])];
    return { requete: l.requete, statut: l.statut, professions: professionsDeLIngredient(cleI ?? cleC, rattachements), hashtags: tags, sujets: [l.sujet], note: cleI ? notes[cleI]?.m ?? null : null };
  });
  // Kits du podologue : emplacements vides, faibles ou complétés (mêmes règles que /admin/retours/kits)
  const kits: { sujet: string; emplacement: string; raison: 'vide' | 'faible' | 'complement' }[] = [];
  try {
    const d = await getDonneesKits();
    for (const s of SUJETS_KITS) {
      if (s === 'general') continue;
      const soins = d.soins?.[s] ?? [];
      for (const e of emplacementsAFaire(composerKit(s, d, 0, soins), soins)) kits.push({ sujet: s, emplacement: e.emplacement, raison: e.raison });
    }
  } catch { /* kits indisponibles : les autres trous suffisent */ }
  const finalistes = await finalistesChaine(profession);
  return {
    dejaVues, couverture: couvertureRequetes(photos, profession), migrationManquante: Boolean(series.error),
    entrees: { profession, photos, kits: profession === 'podologue' ? kits : [], finalistes, enAttente },
  };
}

/** Profils des modèles finalistes de la chaîne (0050) et gamme / traitement de leur version courante ; [] sans 0050 */
async function finalistesChaine(profession: string): Promise<{ profil: string; gamme: string | null; traitement: string | null }[]> {
  try {
    const supabase = await createClient();
    const statuts = ['finaliste', ...STATUTS_BOUCLE, 'pret-validation'];
    const { data: fiches, error } = await supabase.from('modeles_fiches').select('id, profil, statut, version_courante').eq('profession', profession).in('statut', statuts).limit(200);
    if (error || !fiches?.length) return [];
    const { data: versions } = await supabase.from('modeles_versions').select('modele, version, composition').in('modele', fiches.map((f) => f.id)).limit(2000);
    return (fiches as { id: string; profil: string; version_courante: number }[]).map((f) => {
      const c = ((versions ?? []) as { modele: string; version: number; composition: Record<string, unknown> | null }[]).find((v) => v.modele === f.id && v.version === f.version_courante)?.composition ?? {};
      const t = (c.traitement as { id?: unknown } | undefined)?.id;
      return { profil: f.profil, gamme: typeof c.gamme === 'string' && c.gamme ? c.gamme : null, traitement: typeof t === 'string' ? t : null };
    });
  } catch {
    return [];
  }
}

/** Enregistre les séries d'un lancement (session de l'admin) ; renvoie les séries relues avec leur identifiant */
export async function enregistrerSeries(lignes: readonly LigneSerie[]): Promise<{ ok: boolean; series: SerieEnregistree[]; message?: string }> {
  if (!lignes.length) return { ok: true, series: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.from('photos_series').insert(lignes.map((l) => ({ ...l }))).select(COLONNES_SERIES);
  if (error) return { ok: false, series: [], message: /photos_series|schema cache|does not exist/i.test(error.message) ? MIGRATION_SERIES : `Séries non enregistrées : ${error.message}` };
  return { ok: true, series: ((data ?? []) as Record<string, unknown>[]).map(serieDepuisLigne).filter((s): s is SerieEnregistree => s !== null) };
}
