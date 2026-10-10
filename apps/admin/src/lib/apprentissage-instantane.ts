import 'server-only';
import { cache } from 'react';
import { after } from 'next/server';
import { createClient, nombreEchecsSupabase } from '@/lib/supabase/server';
import { getRole } from '@/lib/admin';

// APPRENTISSAGE CALCULÉ UNE FOIS (migration 0059, demande de Paul du 2026-10-10 « optimiser les requêtes, la base ») : les poids
// appris, le résumé de la politique d'évaluation et les éléments tranchés relisaient des tables entières (duels, notes, grilles,
// expositions…) à chaque instance serveur froide (/admin : 114 Mo lus au volume ×10). Ils sont maintenant gardés en base
// (apprentissage_instantane, texte JSON exact) avec la SIGNATURE de leurs sources (apprentissage_sources : un compteur par table,
// augmenté par la base à chaque ajout, modification ou suppression) et la version déployée du code.
// - Signature identique (et instantané de moins d'une heure) : relu tel quel, en 2 petites requêtes, sans aucun calcul.
// - Sources changées (un vote, une note…) ou instantané de plus d'une heure : l'instantané est servi aussitôt et recalculé APRÈS la
//   réponse (after, quelques secondes ; la mémoire d'avant servait jusqu'à 10 min d'ancienneté) ; la page suivante a le résultat à
//   jour. Seulement sans instantané (premier calcul) ou au-delà de 24 h : calculé tout de suite, puis enregistré.
// - Table absente (0059 pas encore exécutée), droit refusé ou lecture en échec : calcul d'avant, à l'identique (repli).
// Une copie reste en mémoire sur l'instance (même signature : pas de relecture). APPRENTISSAGE_VERIFIER=1 (banc de mesure) : chaque
// instantané relu est comparé au calcul complet (égalité exacte du texte JSON), résultat dans le journal du serveur.

/** Tables lues par l'apprentissage (déclencheurs de 0059) : un changement dans l'une d'elles rend les instantanés périmés */
export const SOURCES_APPRENTISSAGE = [
  'atelier_notes', 'assets_notes', 'illustrations_statuts', 'assets_sujets', 'assets_hashtags', 'assets_professions', 'recettes',
  'recettes_notes', 'recettes_notation', 'duels', 'degustation_choix', 'kits_images_notes', 'expositions', 'regles_apprises_reglages',
  'elements_reevalues', 'modeles_grilles', 'modeles_tickets',
] as const;
/** Contexte d'images de l'admin (kits, vivier curé, exclusions, ContexteImages) : photos, jeux, notes, revues, catalogue des soins */
export const SOURCES_CONTEXTE_IMAGES = [
  'photos_libres', 'jeux_photos', 'assets_notes', 'illustrations_statuts', 'illustrations_revues', 'assets_hashtags', 'assets_sujets', 'soins_catalogue',
  'kits_images_notes',
] as const;

/** Version du format des instantanés : à augmenter si la forme d'un résultat change sans changement de déploiement */
const FORMAT = 1;
/** Code déployé : un nouveau déploiement (nouveau calcul, nouveaux fichiers du dépôt lus par le juge) périme les instantanés */
const DEPLOIEMENT = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_DEPLOYMENT_ID ?? 'local';
const FRAIS_MS = 60 * 60_000, PERIME_SERVI_MS = 24 * 60 * 60_000;

type Sources = Map<string, string>;
/** Compteurs des sources (une requête par page), ou null sans la migration 0059 / sans droit de lecture */
async function lireSources(): Promise<Sources | null> {
  try {
    const supabase = await createClient();
    // Signal propre : jamais la réponse mémorisée d'une lecture identique plus tôt dans la même requête (les écritures de la page,
    // automate de la chaîne, doivent se voir dans la signature relue juste avant un calcul)
    const { data, error } = await supabase.from('apprentissage_sources').select('nom, n').abortSignal(new AbortController().signal);
    if (error || !Array.isArray(data) || !data.length) return null;
    return new Map((data as { nom: string; n: number }[]).map((l) => [l.nom, String(l.n)]));
  } catch {
    return null;
  }
}
export const getSourcesApprentissage = cache(lireSources);

/** Signature de tables sources (compteurs de 0059) ou null si illisible : remplace count(*) + max(created_at) (memo-journal.ts) */
export async function signatureSources(tables: readonly string[]): Promise<string | null> {
  const s = await getSourcesApprentissage();
  if (!s || tables.some((t) => !s.has(t))) return null;
  return tables.map((t) => `${t}:${s.get(t)}`).join(',');
}

type Memoire = { signature: string; texte: string; le: number };
const memoire = new Map<string, Memoire>();
const enCours = new Map<string, Promise<unknown>>();

/**
 * Résultat de `calculer()` gardé en base pour (`cle`, `portee`). `serialiser` / `deserialiser` : forme JSON (Set, Map → listes) ;
 * le résultat relu doit être identique au résultat calculé (vérifié sur le banc avec APPRENTISSAGE_VERIFIER=1).
 * `portee` null (compte hors équipe) ou instantanés indisponibles (0059 absente, lecture refusée) : `repli` (calcul d'avant, avec sa
 * mémoire de l'instance), sinon `calculer`. `calculer` doit TOUJOURS recalculer (jamais une mémoire : elle serait gardée en base).
 */
export async function instantane<T, J = T>(o: {
  cle: string; portee: 'admin' | 'equipe' | null; calculer: () => Promise<T>; repli?: () => Promise<T>;
  /** Tables dont dépend le résultat (par défaut : SOURCES_APPRENTISSAGE) */
  tables?: readonly string[];
  /** Jamais un instantané périmé (calcul d'un autre instantané qui en dépend : il serait gardé avec une donnée d'avant) */
  exigerFrais?: boolean;
  serialiser?: (v: T) => J; deserialiser?: (j: J) => T;
}): Promise<T> {
  const enJson = o.serialiser ?? ((v: T) => v as unknown as J);
  const depuisJson = o.deserialiser ?? ((j: J) => j as unknown as T);
  const repli = o.repli ?? o.calculer;
  if (!o.portee) return repli();
  const sources = await getSourcesApprentissage();
  if (!sources) return repli();
  const cle = `${o.cle}|${o.portee}`;
  const signatureDe = (s: Sources) => `${FORMAT}|${DEPLOIEMENT}|${(o.tables ?? SOURCES_APPRENTISSAGE).map((t) => `${t}:${s.get(t) ?? '-'}`).join(',')}`;
  const signature = signatureDe(sources);
  const lire = (texte: string) => depuisJson(JSON.parse(texte) as J);
  const verifier = (texte: string, origine: string) => {
    if (process.env.APPRENTISSAGE_VERIFIER !== '1') return;
    void o.calculer().then((v) => {
      const frais = JSON.stringify(enJson(v));
      console.log(`[instantané] ${cle} (${origine}) : ${frais === texte ? 'égalité exacte' : `DIFFÉRENCE (${frais.length} / ${texte.length} caractères)`}`);
    }, () => null);
  };
  // 1. Mémoire de l'instance (même signature)
  const m = memoire.get(cle);
  if (m && m.signature === signature && Date.now() - m.le < FRAIS_MS) { verifier(m.texte, 'mémoire'); return lire(m.texte); }
  // 2. Instantané en base
  let ligne = null as { signature: string; valeur: string; calcule_le: string } | null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('apprentissage_instantane').select('signature, valeur, calcule_le').eq('cle', cle).maybeSingle();
    if (error) return repli();
    ligne = data as typeof ligne;
  } catch {
    return repli();
  }
  const age = ligne ? Date.now() - Date.parse(ligne.calcule_le) : Infinity;
  if (ligne && ligne.signature === signature && age < FRAIS_MS) {
    memoire.set(cle, { signature, texte: ligne.valeur, le: Date.parse(ligne.calcule_le) });
    verifier(ligne.valeur, 'base');
    return lire(ligne.valeur);
  }
  // Journal : pourquoi l'instantané est recalculé (tables changées, nouveau déploiement, âge)
  if (ligne) {
    const avant = new Map(ligne.signature.split('|').slice(2).join('|').split(',').map((x) => x.split(':') as [string, string]));
    const changees = (o.tables ?? SOURCES_APPRENTISSAGE).filter((t) => avant.get(t) !== (sources.get(t) ?? '-'));
    console.info(`[apprentissage] ${cle} à recalculer : ${ligne.signature.split('|').slice(0, 2).join('|') !== `${FORMAT}|${DEPLOIEMENT}` ? 'nouveau déploiement' : changees.length ? `${changees.join(', ')} changé(s)` : `plus d'une heure`}`);
  }
  // 3. Recalcul (un seul à la fois par instance), enregistré pour les requêtes et instances suivantes
  const recalculer = (): Promise<T> => {
    const deja = enCours.get(cle) as Promise<T> | undefined;
    if (deja) return deja;
    const debut = performance.now();
    const echecsAvant = nombreEchecsSupabase();
    // Signature relue JUSTE AVANT le calcul (pas celle du début de la requête) : une écriture faite entre-temps par la même page
    // (automate de la chaîne) ne laisse pas un instantané calculé après elle sous une signature d'avant (recalcul inutile ensuite)
    let signatureCalcul = signature;
    const p = lireSources().then((f) => { if (f) signatureCalcul = signatureDe(f); }).then(() => o.calculer()).then(async (v) => {
      const texte = JSON.stringify(enJson(v));
      // Mesure continue : calcul d'apprentissage de plus d'une seconde écrit dans le journal du serveur (durée, taille ; aucune donnée)
      const ms = performance.now() - debut;
      if (ms >= 1000) console.warn(`[apprentissage] calcul ${cle} ${Math.round(ms)} ms, ${Math.round(texte.length / 1024)} Ko`);
      // Une lecture a échoué pendant le calcul (repli vide possible) : résultat servi à cette requête seulement, rien n'est gardé
      if (nombreEchecsSupabase() !== echecsAvant) { console.warn(`[apprentissage] ${cle} : lecture en échec pendant le calcul, résultat non gardé`); return v; }
      memoire.set(cle, { signature: signatureCalcul, texte, le: Date.now() });
      if (memoire.size > 40) memoire.delete(memoire.keys().next().value!);
      try {
        const supabase = await createClient();
        await supabase.from('apprentissage_instantane').upsert({ cle, portee: o.portee, signature: signatureCalcul, valeur: texte, octets: texte.length, calcule_le: new Date().toISOString() }, { onConflict: 'cle' });
      } catch { /* écriture refusée : le résultat reste valable pour cette requête */ }
      return v;
    }).finally(() => enCours.delete(cle));
    enCours.set(cle, p);
    return p;
  };
  if (ligne && age < PERIME_SERVI_MS && !o.exigerFrais) {
    // Sources changées ou instantané de plus d'une heure (fenêtres de dates de la politique) : servi aussitôt, recalculé après la
    // réponse (un seul calcul à la fois par instance)
    const p = recalculer().catch(() => null);
    try { after(() => p); } catch { /* hors requête */ }
    return lire(ligne.valeur);
  }
  return recalculer();
}

/** Portée des instantanés pour le compte connecté : admin, équipe de la chaîne, sinon aucune (calcul direct) */
export const porteeInstantane = cache(async (): Promise<'admin' | 'equipe' | null> => {
  try {
    const role = await getRole();
    if (role === 'admin') return 'admin';
    if (role === null) return null;
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase.from('profiles').select('role_equipe').eq('id', auth.user.id).maybeSingle();
    const r = (data as { role_equipe?: string } | null)?.role_equipe;
    return r === 'contributeur' || r === 'validateur' ? 'equipe' : null;
  } catch {
    return null;
  }
});
