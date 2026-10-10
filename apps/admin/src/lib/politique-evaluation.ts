import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import {
  apprendreRegles, attributsDeCle, baseDeCle, clesUnitairesInventaire, elementsComposition, ETAT_POLITIQUE_VIDE, etatPolitique, expositionsDepuisJournaux,
  fusionnerExpositions, implicitesNegatifs, indicateursPolitique, lireExposition, memoireExpositions, motsFrequents, notesElements, penalitesRegles,
  renfortsImplicites, signauxDepuisRetours, sujetsDuScenario, POLITIQUE_EVALUATION, type EtatPolitique, type Exposition, type ImpliciteNegatif,
  type IndicateursPolitique, type MemoireExpositions, type RegleApprise,
} from '@plateforme/core';
import { createClient, getUser } from '@/lib/supabase/server';
import { getRole } from '@/lib/admin';
import { getNotesAssets } from '@/lib/assets-notes';
import { getNotesAtelier } from '@/lib/atelier';
import { getNotationsAdmin } from '@/lib/notation-recettes';
import { getDuelsAlleges } from '@/lib/duels';
import { avecDelai, DELAIS } from '@/lib/delai';
import { getChoixGrille } from '@/lib/degustation';
import { getNotesKits } from '@/lib/kits-images';
import { getReevaluations } from '@/lib/tranches';
import { getPredictions } from '@/lib/predictions';
import { getPropositionsTags } from '@/lib/propositions-tags';
import { getHashtagsAssets } from '@/lib/hashtags';
import { getEtatsNouveautes } from '@/lib/arrivages';
import { getSourcesApprentissage, instantane } from '@/lib/apprentissage-instantane';

// POLITIQUE D'ÉVALUATION UNIQUE côté serveur (packages/core/src/politique-evaluation.ts, regles-apprises.ts ; migration 0054 ;
// docs/politique-evaluation.md) :
// - getExpositionsTable : journal `expositions` (écrans ignorés, décisions des Arrivages et leurs raisons) ; [] sans la migration ;
// - getPolitique : mémoire commune = journaux existants (notes, duels, grilles de la Dégustation et de la présélection, tournoi,
//   recettes, kits) + table ; implicites négatifs ; règles apprises (étiquettes, commentaires, raisons, tickets) ; pénalités. Calculé
//   pour l'admin seulement (les journaux complets ne sont lisibles que par lui) ; ailleurs : vide, rien n'est imposé ;
// - getEtatPolitique : état compact envoyé aux pages de notation (délai de retour, implicites, règles, fort potentiel) ;
// - getRenfortsPolitique : rétrogradation dans le générateur (getPoidsAtelier) ; getIndicateursPolitique : tableau de bord.

export const MIGRATION_EXPOSITIONS = 'Migration 0054 à exécuter (supabase/migrations/0054_expositions.sql) : la mémoire des écrans passés reste dans ce navigateur.';
export const COOKIE_REGLES = 'regles-desactivees';

export const getExpositionsTable = cache(async (): Promise<{ expositions: Exposition[]; migrationManquante: boolean }> => {
  try {
    const supabase = await createClient();
    const depuis = new Date(Date.now() - POLITIQUE_EVALUATION.purgeJours * 86400000).toISOString();
    const { data, error } = await supabase.from('expositions').select('cle, surface, ecran, resultat, note, etiquettes, texte, created_at')
      .gte('created_at', depuis).order('created_at', { ascending: false }).limit(20000);
    if (error) return { expositions: [], migrationManquante: true };
    return { expositions: ((data ?? []) as Record<string, unknown>[]).map(lireExposition).filter((e): e is Exposition => e !== null), migrationManquante: false };
  } catch {
    return { expositions: [], migrationManquante: true };
  }
});

/** Règles désactivées : table regles_apprises_reglages (dernière ligne par règle), sinon cookie */
export const getReglesDesactivees = cache(async (): Promise<{ desactivees: string[]; migrationManquante: boolean }> => {
  let cookie: string[] = [];
  try { cookie = ((await cookies()).get(COOKIE_REGLES)?.value ?? '').split(',').filter((x) => /^[a-z0-9-]{2,40}$/.test(x)); } catch { cookie = []; }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('regles_apprises_reglages').select('regle, active, created_at').order('created_at', { ascending: false }).limit(2000);
    if (error) return { desactivees: cookie, migrationManquante: true };
    const vues = new Set<string>(), off: string[] = [];
    for (const l of (data ?? []) as { regle: string; active: boolean }[]) { if (vues.has(l.regle)) continue; vues.add(l.regle); if (!l.active) off.push(l.regle); }
    return { desactivees: off, migrationManquante: false };
  } catch {
    return { desactivees: cookie, migrationManquante: true };
  }
});

/** Grilles répondues du tournoi et tickets humains de la chaîne (lecture légère, équipe) */
const getChaineLegere = cache(async () => {
  try {
    const supabase = await createClient();
    const [g, t] = await Promise.all([
      supabase.from('modeles_grilles').select('propositions, meilleures, pire, repondue_le').not('repondue_le', 'is', null).order('repondue_le', { ascending: false }).limit(5000),
      supabase.from('modeles_tickets').select('modele, element, etiquette, commentaire, origine, created_at').eq('origine', 'humain').order('created_at', { ascending: false }).limit(2000),
    ]);
    const grilles = ((g.data ?? []) as Record<string, unknown>[]).filter((l) => Array.isArray(l.propositions) && Array.isArray(l.meilleures))
      .map((l) => ({ propositions: (l.propositions as unknown[]).map(String), meilleures: (l.meilleures as unknown[]).map(Number), pire: l.pire == null ? null : Number(l.pire), le: String(l.repondue_le) }));
    const tickets = ((t.data ?? []) as Record<string, unknown>[]).map((l) => ({ modele: String(l.modele), element: typeof l.element === 'string' ? l.element : null, etiquette: String(l.etiquette ?? ''), texte: typeof l.commentaire === 'string' ? l.commentaire : null, le: String(l.created_at ?? '') }));
    return { grilles, tickets };
  } catch {
    return { grilles: [], tickets: [] };
  }
});

/** Élément cliqué d'un ticket → clé d'élément (`police:x` → `typo:police:x`, clés d'assets telles quelles) */
const cleDeTicket = (e: string | null) => (!e ? null : e.startsWith('police:') ? `typo:${e}` : /^[a-z]+:[^\s]+$/.test(e) && !e.startsWith('[') ? e : null);

export type Politique = {
  expositions: Exposition[];
  memoire: MemoireExpositions;
  implicites: ImpliciteNegatif[];
  regles: RegleApprise[];
  penalites: Record<string, number>;
  ecartes: string[];
  mots: { mot: string; n: number; couvert: boolean }[];
  attributs: (cle: string) => ReturnType<typeof attributsDeCle>;
  /** Moyenne des notes et date de la première note par clé (indicateurs) */
  notes: Record<string, { m: number; n: number }>;
  premieres: Record<string, string>;
  migrationManquante: boolean;
  migrationRegles: boolean;
  desactivees: string[];
};

let inventaire: string[] | null = null;

async function getPolitiqueSansMemo(): Promise<Politique | null> {
  if ((await getRole()) !== 'admin') return null;
  const [table, assets, atelier, recettes, duels, grilles, kits, chaine, { reevaluations }, desac, tags, hashtags] = await Promise.all([
    getExpositionsTable(), getNotesAssets().catch(() => ({ notes: [] })), getNotesAtelier().catch(() => ({ notes: [] })), getNotationsAdmin().catch(() => ({ notations: [] })),
    getDuelsAlleges().catch(() => ({ duels: [] })), getChoixGrille().catch(() => ({ choix: [] })), getNotesKits().catch(() => []), getChaineLegere(), getReevaluations(),
    getReglesDesactivees(), getPropositionsTags().catch(() => null), getHashtagsAssets().catch(() => ({ hashtags: {} })),
  ]);
  const elementsRecette = (n: (typeof recettes.notations)[number]) => { try { return elementsComposition(n.composition, sujetsDuScenario(n.scenario)); } catch { return []; } };
  const derivees = expositionsDepuisJournaux({
    notesAssets: assets.notes.map((n) => ({ cle: n.cle, note: n.note, le: n.le, etiquettes: n.etiquettes, texte: [n.negatif, n.commentaire].filter(Boolean).join(' · ') || null })),
    notesAtelier: atelier.notes.map((n) => ({ cle: n.cle, note: n.note, le: n.le ?? null, etiquettes: n.etiquettes ?? null, texte: n.negatif ?? null })),
    recettes: recettes.notations.map((n) => ({ cle: n.cle ?? null, note: n.note, garder: n.garder, le: n.le ?? null, contre: n.contre, texte: n.contreTexte })),
    duels: duels.duels.map((d) => ({ aCle: d.aCle, bCle: d.bCle, aIngredients: d.aIngredients, bIngredients: d.bIngredients, resultat: d.resultat, le: d.le ?? null, etiquettes: d.etiquettes ?? null, remarque: d.remarque })),
    grilles: grilles.choix.map((c) => ({ format: c.format, dimension: c.dimension, session: c.session, propositions: c.propositions, meilleures: c.meilleures, pire: c.pire, le: c.le ?? null })),
    tournoi: chaine.grilles,
    kits: kits.map((k) => ({ sujet: k.sujet, note: k.note, garder: k.garder, photos: k.photos.map((p) => ({ url: p.url, cle: p.url.startsWith('/photos/') ? `photo:${p.url.slice(8).replace(/\.[a-z]+$/, '')}` : null })), le: k.le })),
  });
  const expositions = fusionnerExpositions(derivees, table.expositions);
  const memoire = memoireExpositions(expositions, reevaluations);
  const implicites = implicitesNegatifs(memoire);
  // Attributs : profil d'harmonie, saturation des gammes, alertes de Claude, hashtags
  const alertes: Record<string, string[]> = {};
  for (const p of tags?.propositions ?? []) if (p.alertes?.length) alertes[p.cle] = [...p.alertes];
  const h = (hashtags as { hashtags: Record<string, string[]> }).hashtags ?? {};
  const cache = new Map<string, ReturnType<typeof attributsDeCle>>();
  const attributs = (k: string) => { let a = cache.get(k); if (!a) { a = attributsDeCle(k, { alertes, hashtags: h }); cache.set(k, a); } return a; };
  // Signaux : notes (étiquettes, remarques), recettes (contre), duels (étiquettes, remarques ; « les deux sont mauvais »), expositions
  // (raisons de refus des Arrivages, « celle qui ne va pas »), tickets d'avis de la chaîne
  const signaux = signauxDepuisRetours({
    notes: [...assets.notes.map((n) => ({ cle: n.cle, note: n.note, etiquettes: n.etiquettes, texte: [n.negatif, n.commentaire].filter(Boolean).join(' · ') || null, le: n.le })),
      ...atelier.notes.flatMap((n) => [n.ingredients.gamme ? `gamme:${n.ingredients.gamme}` : null].filter((k): k is string => Boolean(k)).map((cle) => ({ cle, note: n.note, etiquettes: n.etiquettes ?? null, texte: n.negatif ?? null, le: n.le ?? null })))],
    recettes: recettes.notations.map((n) => ({ cles: elementsRecette(n), note: n.note, contre: n.contre ?? null, texte: n.contreTexte, le: n.le ?? null })),
    duels: duels.duels.map((d) => {
      const a = [d.aIngredients.element ?? d.aCle], b = [d.bIngredients.element ?? d.bCle];
      return { gagnant: d.resultat === 'b' ? b : a, perdant: d.resultat === 'b' ? a : b, mauvais: d.resultat === 'mauvais', etiquettes: d.etiquettes ?? null, texte: d.remarque, le: d.le ?? null };
    }).filter((d) => d.mauvais || d.etiquettes?.length || d.texte),
    expositions: expositions.filter((e) => e.surface !== 'tuiles' && e.surface !== 'duels' && e.surface !== 'recettes'),
    tickets: chaine.tickets.map((t) => ({ cles: [cleDeTicket(t.element), `modele-chaine:${t.modele}`].filter((k): k is string => Boolean(k)), etiquette: t.etiquette.replace(/^technique:/, ''), texte: t.texte, le: t.le })),
  });
  const regles = apprendreRegles(signaux, attributs, { desactivees: desac.desactivees });
  inventaire ??= clesUnitairesInventaire();
  const { penalites, ecartes } = penalitesRegles(new Set([...inventaire, ...Object.keys(alertes)]), regles, attributs);
  const notes = notesElements(assets.notes.map((n) => ({ cle: n.cle, note: n.note })));
  const premieres: Record<string, string> = {};
  for (const n of assets.notes) if (!premieres[n.cle] || n.le < premieres[n.cle]) premieres[n.cle] = n.le;
  for (const n of recettes.notations) if (n.cle && n.le && (!premieres[n.cle] || n.le < premieres[n.cle])) premieres[n.cle] = n.le;
  return { expositions, memoire, implicites, regles, penalites, ecartes, mots: motsFrequents(signaux), attributs, notes, premieres, migrationManquante: table.migrationManquante, migrationRegles: desac.migrationManquante, desactivees: desac.desactivees };
}
// Mémoire ENTRE requêtes (2026-10-09, « l'admin est super lent ») : la politique relit tous les journaux (notes, duels, grilles,
// expositions…) ; calculée au plus une fois par minute et par compte sur une instance serveur. Fraîche (< MEMO_FRAIS_MS) : servie
// telle quelle ; plus ancienne (< MEMO_MAX_MS) : servie aussitôt et recalculée en arrière-plan pour la requête suivante ; sinon
// recalculée. Les écrans de la session restent connus du navigateur (useExpositions) : rien de vu n'est reproposé entre-temps.
// oublierPolitique() : à appeler après un changement qui doit se voir tout de suite (règle désactivée).
const MEMO_FRAIS_MS = 60_000, MEMO_MAX_MS = 10 * 60_000;
type MemoPolitique = { le: number; valeur: Politique | null; enCours: Promise<Politique | null> | null };
const memoPolitique = new Map<string, MemoPolitique>();
export function oublierPolitique() { memoPolitique.clear(); }
async function getPolitiqueMemorisee(): Promise<Politique | null> {
  const user = await getUser().catch(() => null);
  if (!user) return null;
  const m = memoPolitique.get(user.id);
  const age = m && m.le ? Date.now() - m.le : Infinity;
  const lancer = () => {
    const p = getPolitiqueSansMemo().then((valeur) => { memoPolitique.set(user.id, { le: Date.now(), valeur, enCours: null }); return valeur; },
      (err) => { const x = memoPolitique.get(user.id); if (x) x.enCours = null; throw err; });
    memoPolitique.set(user.id, { le: m?.le ?? 0, valeur: m?.valeur ?? null, enCours: p });
    return p;
  };
  if (m && age < MEMO_FRAIS_MS) return m.valeur;
  if (m && age < MEMO_MAX_MS) { if (!m.enCours) lancer().catch(() => null); return m.valeur; }
  return m?.enCours ?? lancer();
}
export const getPolitique = cache(getPolitiqueMemorisee);

/**
 * Politique BORNÉE (2026-10-09, « l'admin ne charge pas ») : lue par les pages, le générateur (getRenfortsPolitique), les tranches
 * et le tableau de bord ; passé DELAIS.politique, null (rien d'imposé, comme sans la migration) au lieu de bloquer l'affichage.
 */
export const getPolitiqueBornee = cache((): Promise<Politique | null> => avecDelai(getPolitique(), DELAIS.politique, null));

/**
 * RÉSUMÉ de la politique (2026-10-10, « optimiser les requêtes, la base ») : tout ce que lisent les pages, le générateur et les
 * tranches (120 derniers écrans, implicites, pénalités, écartements, notes moyennes, indicateurs du tableau de bord), sans les
 * journaux complets. Gardé en base (apprentissage-instantane.ts, 0059) tant que les journaux n'ont pas changé ; sans la migration,
 * calculé comme avant depuis getPolitique (mémoire de l'instance).
 */
export type ResumePolitique = {
  ecrans: MemoireExpositions['ecrans'];
  implicites: ImpliciteNegatif[];
  penalites: Record<string, number>;
  ecartes: string[];
  notes: Record<string, { m: number; n: number }>;
  indicateurs: (IndicateursPolitique & { migrationManquante: boolean }) | null;
};

async function resumer(p: Politique | null, predictions: Promise<{ cle: string; note: number }[]>): Promise<ResumePolitique | null> {
  if (!p) return null;
  const preds = await predictions;
  const predite = new Map<string, number>();
  for (const x of preds) predite.set(x.cle, x.note);
  const ind = indicateursPolitique(p.memoire, {
    qualite: (k) => p.notes[k]?.m ?? (baseDeCle(k) ? p.notes[baseDeCle(k)!]?.m : undefined) ?? predite.get(k) ?? null,
    premiereNote: (k) => p.premieres[k] ?? null, regles: p.regles.filter((r) => r.active).length, maintenant: new Date().toISOString(),
  });
  return { ecrans: p.memoire.ecrans.slice(-120), implicites: p.implicites, penalites: p.penalites, ecartes: p.ecartes, notes: p.notes, indicateurs: { ...ind, migrationManquante: p.migrationManquante } };
}

/** Résumé de la politique (admin seulement ; null ailleurs) : instantané en base, sinon calcul d'avant */
export const getResumePolitique = cache(async (): Promise<ResumePolitique | null> => {
  if ((await getRole()) !== 'admin') return null;
  return instantane<ResumePolitique | null>({
    ...DEFINITION_POLITIQUE,
    repli: async () => resumer(await getPolitiqueBornee(), avecDelai(getPredictions(), DELAIS.compteurs, [])),
  });
});
/** Instantané du résumé de la politique (pages et route de recalcul, apprentissage-calculs.ts) : admin seulement */
const DEFINITION_POLITIQUE = { cle: 'politique', portee: 'admin' as const, calculer: async () => resumer(await getPolitiqueSansMemo(), getPredictions()) };
export const definitionPolitique = async () => ((await getRole()) === 'admin' ? DEFINITION_POLITIQUE : null);
/** Résumé À JOUR (jamais un instantané périmé) : pour les calculs gardés eux-mêmes en base (poids appris, éléments tranchés) */
export const getResumePolitiqueFrais = cache(async (): Promise<ResumePolitique | null> => {
  if ((await getRole()) !== 'admin') return null;
  return instantane<ResumePolitique | null>({
    ...DEFINITION_POLITIQUE, exigerFrais: true,
    repli: async () => resumer(await getPolitiqueBornee(), avecDelai(getPredictions(), DELAIS.compteurs, [])),
  });
});
/** Résumé borné (pages) : passé DELAIS.politique, null (rien d'imposé) au lieu de bloquer l'affichage */
export const getResumeBorne = cache((): Promise<ResumePolitique | null> => avecDelai(getResumePolitique(), DELAIS.politique, null));

/**
 * État compact pour les pages de notation : 120 derniers écrans, implicites, pénalités et écartements des règles, jamais-notés à
 * FORT POTENTIEL (note prédite ≥ 4 par le juge ou par Claude, illustration de base notée ≥ 4 ★, nouveauté acceptée).
 */
export const getEtatPolitique = cache(async (): Promise<EtatPolitique> => {
  const p = await getResumeBorne();
  if (!p) return { ...ETAT_POLITIQUE_VIDE, maintenant: new Date().toISOString() };
  const [preds, tags, nouv] = await Promise.all([avecDelai(getPredictions(), DELAIS.compteurs, []), avecDelai(getPropositionsTags(), DELAIS.compteurs, null), avecDelai(getEtatsNouveautes(), DELAIS.compteurs, { recentes: [], statuts: {} as Record<string, string>, dernieresNotes: {} })]);
  const notee = (k: string) => Boolean(p.notes[k]);
  const fort = new Set<string>();
  for (const x of preds) if (x.note >= POLITIQUE_EVALUATION.seuilPotentiel && !notee(x.cle)) fort.add(x.cle);
  for (const x of tags?.propositions ?? []) if ((x.notePredite ?? 0) >= POLITIQUE_EVALUATION.seuilPotentiel && !notee(x.cle)) fort.add(x.cle);
  inventaire ??= clesUnitairesInventaire();
  for (const k of inventaire) { const b = baseDeCle(k); if (b && !notee(k) && (p.notes[b]?.m ?? 0) >= 4) fort.add(k); }
  for (const r of nouv.recentes) if (nouv.statuts[r.cle] === 'accepte' && !notee(r.cle)) fort.add(r.cle);
  // etatPolitique ne lit que les écrans de la mémoire (120 derniers, gardés dans le résumé)
  return etatPolitique({ ecrans: p.ecrans, parCle: new Map(), parGroupe: new Map() }, { implicites: p.implicites, penalites: p.penalites, ecartes: p.ecartes, fortPotentiel: [...fort].slice(0, 3000), maintenant: new Date().toISOString() });
});

/** Rétrogradation dans le générateur : implicites (−0,75 ★) et pénalités des règles apprises, plafonnées par fusionnerRenforts */
export const getRenfortsPolitique = cache(async (): Promise<{ atelier: Record<string, number>; assets: Record<string, number> }> => {
  // Instantanés disponibles (0059) : résumé attendu sans délai (il entre dans les poids gardés en base, jamais un repli vide)
  const p = (await getSourcesApprentissage()) ? await getResumePolitiqueFrais() : await getResumeBorne();
  if (!p) return { atelier: {}, assets: {} };
  const assets: Record<string, number> = { ...renfortsImplicites(p.implicites.filter((x) => !x.cle.startsWith('compo:'))) };
  for (const [k, v] of Object.entries(p.penalites)) assets[k] = Math.max(-1, (assets[k] ?? 0) + v);
  return { atelier: {}, assets };
});

/** Indicateurs du tableau de bord (taux de répétition, qualité présentée, jamais-notés, règles, tendance 30 jours) */
export const getIndicateursPolitique = cache(async (): Promise<(IndicateursPolitique & { migrationManquante: boolean }) | null> => {
  const p = await getResumeBorne();
  return p?.indicateurs ?? null;
});
