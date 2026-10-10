import 'server-only';
import { cache } from 'react';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { createClient, nombreEchecsSupabase } from '@/lib/supabase/server';
import { getRoles } from '@/lib/admin';

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

/** `valeur` : résultat déjà relu (JSON.parse + désérialisation faits une fois par instantané et par instance, 2026-10-10, perf de la
 * chaîne : ~25 ms par page) ; partagé entre requêtes comme l'était la mémoire d'avant (memoRecent) : à lire, jamais à modifier */
type Memoire = { signature: string; texte: string; le: number; valeur?: { v: unknown } };
const memoire = new Map<string, Memoire>();
const enCours = new Map<string, Promise<unknown>>();

/** Définition d'un instantané : clé (sans la portée), calcul complet, tables sources, forme JSON */
export type DefinitionInstantane<T, J = T> = {
  cle: string; calculer: () => Promise<T>;
  /** Tables dont dépend le résultat (par défaut : SOURCES_APPRENTISSAGE) */
  tables?: readonly string[];
  serialiser?: (v: T) => J; deserialiser?: (j: J) => T;
};

const signatureDe = (tables: readonly string[] | undefined, s: Sources) => `${FORMAT}|${DEPLOIEMENT}|${(tables ?? SOURCES_APPRENTISSAGE).map((t) => `${t}:${s.get(t) ?? '-'}`).join(',')}`;

/**
 * Calcul complet puis enregistrement (mémoire de l'instance et base) ; un seul calcul à la fois par instance et par clé. Utilisé
 * par les pages (premier calcul, instantané de plus de 24 h, exigerFrais) et par la route de recalcul (api/apprentissage/recalcul).
 */
export function calculerEtGarder<T, J = T>(o: DefinitionInstantane<T, J>, portee: 'admin' | 'equipe', signatureConnue?: string): Promise<T> {
  const cle = `${o.cle}|${portee}`;
  const deja = enCours.get(cle) as Promise<T> | undefined;
  if (deja) return deja;
  const enJson = o.serialiser ?? ((v: T) => v as unknown as J);
  const debut = performance.now();
  const echecsAvant = nombreEchecsSupabase();
  // Signature relue JUSTE AVANT le calcul (pas celle du début de la requête) : une écriture faite entre-temps par la même page
  // (automate de la chaîne) ne laisse pas un instantané calculé après elle sous une signature d'avant (recalcul inutile ensuite)
  let signatureCalcul = signatureConnue ?? null;
  const p = lireSources().then((f) => { if (f) signatureCalcul = signatureDe(o.tables, f); }).then(() => o.calculer()).then(async (v) => {
    const texte = JSON.stringify(enJson(v));
    // Mesure continue : calcul d'apprentissage de plus d'une seconde écrit dans le journal du serveur (durée, taille ; aucune donnée)
    const ms = performance.now() - debut;
    if (ms >= 1000) console.warn(`[apprentissage] calcul ${cle} ${Math.round(ms)} ms, ${Math.round(texte.length / 1024)} Ko`);
    // Une lecture a échoué pendant le calcul (repli vide possible) : résultat servi à cette requête seulement, rien n'est gardé
    if (nombreEchecsSupabase() !== echecsAvant) { console.warn(`[apprentissage] ${cle} : lecture en échec pendant le calcul, résultat non gardé`); return v; }
    if (!signatureCalcul) return v;
    memoire.set(cle, { signature: signatureCalcul, texte, le: Date.now() });
    if (memoire.size > 40) memoire.delete(memoire.keys().next().value!);
    try {
      const supabase = await createClient();
      await supabase.from('apprentissage_instantane').upsert({ cle, portee, signature: signatureCalcul, valeur: texte, octets: texte.length, calcule_le: new Date().toISOString() }, { onConflict: 'cle' });
    } catch { /* écriture refusée : le résultat reste valable pour cette requête */ }
    return v;
  }).finally(() => enCours.delete(cle));
  enCours.set(cle, p);
  return p;
}

// RECALCUL HORS DES PAGES (perf vague 2, 2026-10-10) : au volume ×10, recalculer les poids appris et la politique après un vote
// prenait ~18 s de processeur APRÈS la réponse (after), sur l'instance qui sert les pages : les pages suivantes ralentissaient (jusqu'à
// 15-30 s mesurés sur le banc) et chaque instance qui voyait l'instantané périmé refaisait le même calcul. Maintenant la page sert
// toujours l'instantané précédent et demande le recalcul à une route dédiée (api/apprentissage/recalcul : fonction Vercel à part,
// maxDuration propre) qui prend un VERROU en base (0060 : un seul recalcul à la fois par clé, toutes instances confondues, libéré à la
// fin ou au bout de 150 s) puis calcule après sa réponse. Une instance ne redemande pas le même recalcul (mêmes sources) avant 60 s.
// Sans la route (hors requête, appel refusé) : calcul d'avant sur l'instance (after). Sans la migration 0060 : la route calcule sans
// verrou partagé (un seul calcul par instance, comme avant).
const DELAI_REDEMANDE_MS = 60_000;
const demandes = new Map<string, number>();
let routeRefuseeLe = 0;
type Demande = { url: string; cookie: string };
async function preparerDemande(): Promise<Demande | null> {
  if (Date.now() - routeRefuseeLe < 10 * 60_000) return null;
  try {
    const h = await headers();
    const hote = h.get('x-forwarded-host') ?? h.get('host');
    if (!hote) return null;
    const proto = h.get('x-forwarded-proto') ?? (hote.startsWith('localhost') || hote.startsWith('127.0.0.1') ? 'http' : 'https');
    // Banc de mesure (scripts/perf-admin) : route servie par une seconde instance, comme une fonction Vercel à part
    const url = process.env.APPRENTISSAGE_RECALCUL_URL ?? `${proto}://${hote}/api/apprentissage/recalcul`;
    return { url, cookie: h.get('cookie') ?? '' };
  } catch {
    return null;
  }
}
function demanderRecalcul(d: Demande, cle: string, portee: string, signature: string) {
  // Même instantané ET mêmes sources : pas de nouvelle demande avant 60 s (un vote de plus : nouvelle demande)
  const k = `${cle}|${portee}|${signature}`;
  const deja = demandes.get(k);
  if (deja && Date.now() - deja < DELAI_REDEMANDE_MS) return;
  demandes.set(k, Date.now());
  if (demandes.size > 100) demandes.delete(demandes.keys().next().value!);
  const envoyer = async () => {
    try {
      const r = await fetch(d.url, {
        method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10_000),
        // En-tête propre : jamais envoyé par un formulaire d'un autre site (la route le vérifie)
        headers: { cookie: d.cookie, 'content-type': 'application/json', 'x-apprentissage': '1' },
        body: JSON.stringify({ cle, portee, signature }),
      });
      if (r.status >= 400 && r.status !== 409) { routeRefuseeLe = Date.now(); demandes.delete(k); console.warn(`[apprentissage] route de recalcul refusée (${r.status}) : calcul sur l'instance pendant 10 min`); }
    } catch {
      demandes.delete(k);
    }
  };
  try { after(envoyer); } catch { void envoyer(); }
}

/**
 * Résultat de `calculer()` gardé en base pour (`cle`, `portee`). `serialiser` / `deserialiser` : forme JSON (Set, Map → listes) ;
 * le résultat relu doit être identique au résultat calculé (vérifié sur le banc avec APPRENTISSAGE_VERIFIER=1).
 * `portee` null (compte hors équipe) ou instantanés indisponibles (0059 absente, lecture refusée) : `repli` (calcul d'avant, avec sa
 * mémoire de l'instance), sinon `calculer`. `calculer` doit TOUJOURS recalculer (jamais une mémoire : elle serait gardée en base).
 */
export async function instantane<T, J = T>(o: DefinitionInstantane<T, J> & {
  portee: 'admin' | 'equipe' | null; repli?: () => Promise<T>;
  /** Jamais un instantané périmé (calcul d'un autre instantané qui en dépend : il serait gardé avec une donnée d'avant) */
  exigerFrais?: boolean;
}): Promise<T> {
  const enJson = o.serialiser ?? ((v: T) => v as unknown as J);
  const depuisJson = o.deserialiser ?? ((j: J) => j as unknown as T);
  const repli = o.repli ?? o.calculer;
  if (!o.portee) return repli();
  const portee = o.portee;
  const sources = await getSourcesApprentissage();
  if (!sources) return repli();
  const cle = `${o.cle}|${portee}`;
  const signature = signatureDe(o.tables, sources);
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
  if (m && m.signature === signature && Date.now() - m.le < FRAIS_MS) {
    verifier(m.texte, 'mémoire');
    m.valeur ??= { v: lire(m.texte) };
    return m.valeur.v as T;
  }
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
    const valeur = { v: lire(ligne.valeur) };
    memoire.set(cle, { signature, texte: ligne.valeur, le: Date.parse(ligne.calcule_le), valeur });
    verifier(ligne.valeur, 'base');
    return valeur.v as T;
  }
  // Journal : pourquoi l'instantané est recalculé (tables changées, nouveau déploiement, âge)
  if (ligne) {
    const avant = new Map(ligne.signature.split('|').slice(2).join('|').split(',').map((x) => x.split(':') as [string, string]));
    const changees = (o.tables ?? SOURCES_APPRENTISSAGE).filter((t) => avant.get(t) !== (sources.get(t) ?? '-'));
    console.info(`[apprentissage] ${cle} à recalculer : ${ligne.signature.split('|').slice(0, 2).join('|') !== `${FORMAT}|${DEPLOIEMENT}` ? 'nouveau déploiement' : changees.length ? `${changees.join(', ')} changé(s)` : `plus d'une heure`}`);
  }
  if (ligne && age < PERIME_SERVI_MS && !o.exigerFrais) {
    // Sources changées ou instantané de plus d'une heure (fenêtres de dates de la politique) : servi aussitôt ; recalcul demandé à
    // la route dédiée (hors des pages), sinon calculé ici après la réponse (un seul calcul à la fois par instance)
    const d = enCours.has(cle) ? null : await preparerDemande();
    if (d) demanderRecalcul(d, o.cle, portee, signature);
    else {
      const p = calculerEtGarder(o, portee, signature).catch(() => null);
      try { after(() => p); } catch { /* hors requête */ }
    }
    return lire(ligne.valeur);
  }
  // 3. Premier calcul (ou instantané de plus de 24 h, ou exigerFrais) : tout de suite, enregistré pour les requêtes suivantes
  return calculerEtGarder(o, portee, signature);
}

/** Portée des instantanés pour le compte connecté : admin, équipe de la chaîne, sinon aucune (calcul direct) */
export const porteeInstantane = cache(async (): Promise<'admin' | 'equipe' | null> => {
  try {
    // Session et profil lus une fois par requête (getRoles)
    const roles = await getRoles();
    if (!roles) return null;
    if (roles.role === 'admin') return 'admin';
    const r = roles.roleEquipe;
    return r === 'contributeur' || r === 'validateur' ? 'equipe' : null;
  } catch {
    return null;
  }
});
