import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { choixDepuisLigne, choixPourApprentissage, duelsDesChoix, profilsDePratique, SCENARIOS_TYPES, SUJETS_VISUELS, type ChoixGrille, type Duel, type ScenarioRecette } from '@plateforme/core';
import { COOKIE_PROFESSION, PROFESSION_PAR_DEFAUT, professionDe } from '@plateforme/core/professions';
import { createClient, getUser } from '@/lib/supabase/server';
import { memoParSignature } from '@/lib/memo-journal';

// 🍽 Dégustation (migration 0042, packages/core/src/degustation.ts) côté serveur :
// - getChoixGrille : journal complet, lu par le super admin (/admin/degustation) ; [] et migrationManquante sans la migration ;
// - getDuelsDegustation : degustation_apprentissage() (ni auteur ni session) → duels équivalents (duelsDepuisChoix), filtrés pour
//   la profession choisie (les siens + les dimensions transversales des autres professions), versés dans getDuelsApprentissage ;
// - professionDegustation / profilsDegustation : registre des professions (professions.ts, cookie du sélecteur de l'en-tête) et
//   profils de pratique de la profession (profils.ts) ; sans profil de pratique, scénarios types par sujet.

export const MIGRATION_DEGUSTATION = 'Migration 0042 à exécuter (supabase/migrations/0042_degustation.sql) : vos choix restent dans ce navigateur.';

/** Vraie absence de la table (et non un délai dépassé, un droit refusé…) : seule cause du message « Migration 0042 » */
export function tableAbsente(e: { code?: string; message?: string } | null | undefined): boolean {
  if (!e) return false;
  return e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message ?? '');
}

export type ProfessionDegustation = { id: string; libelle: string; parDefaut: string; specialites: readonly string[] | null };

/** Profession choisie dans l'en-tête de l'admin (cookie du registre), sinon celle par défaut ; rien de codé en dur ici */
export const professionDegustation = cache(async (): Promise<ProfessionDegustation> => {
  let id: string | null = null;
  try { id = (await cookies()).get(COOKIE_PROFESSION)?.value ?? null; } catch { id = null; }
  const p = professionDe(id);
  return { id: p.id, libelle: p.court || p.libelle, parDefaut: PROFESSION_PAR_DEFAUT, specialites: p.specialites };
});

export type ProfilDegustation = { id: string; nom: string; sujets: string[]; scenario: ScenarioRecette };

/**
 * Profils dégustés : profils de pratique de la profession (API de /admin/profils) s'ils existent, sinon scénarios types par sujet
 * (notation-recettes.ts) dont le sujet n° 1 relève de la profession.
 */
export async function profilsDegustation(p: ProfessionDegustation): Promise<ProfilDegustation[]> {
  let pratique: ReturnType<typeof profilsDePratique> = [];
  try { pratique = profilsDePratique(p.id); } catch { pratique = []; }
  if (pratique.length) {
    return pratique.filter((x) => x.principal).map((x) => {
      const sujets = [x.principal!, ...x.secondaires.filter((s) => s !== x.principal)].slice(0, 3);
      return { id: x.id, nom: x.court, sujets, scenario: { principaux: sujets.slice(0, 2), secondaires: sujets.slice(2), couleurs: [], soins: [] } };
    });
  }
  const specialite = (s: string) => SUJETS_VISUELS.find((v) => v.id === s)?.specialite;
  return SCENARIOS_TYPES.filter((t) => !p.specialites || t.scenario.principaux.some((s) => { const sp = specialite(s); return !sp || p.specialites!.includes(sp); }))
    .map((t) => ({ id: t.id, nom: t.libelle, sujets: [...t.scenario.principaux, ...t.scenario.secondaires], scenario: t.scenario }));
}

export const getChoixGrille = cache(async (): Promise<{ choix: ChoixGrille[]; migrationManquante: boolean; erreur?: string }> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('degustation_choix')
      .select('format, type, dimension, scenario, propositions, meilleures, pire, pari, appareil, session, duree_ms, profession, profil, created_at')
      .order('created_at', { ascending: false }).limit(5000);
    if (error) return { choix: [], migrationManquante: true };
    return { choix: ((data ?? []) as Record<string, unknown>[]).map(choixDepuisLigne).filter((c): c is ChoixGrille => c !== null), migrationManquante: false };
  } catch {
    return { choix: [], migrationManquante: true };
  }
});

const COLONNES_CHOIX = 'format, type, dimension, scenario, propositions, meilleures, pire, pari, appareil, session, duree_ms, profession, profil, created_at';

/**
 * Choix SANS les ingrédients des propositions (2026-10-10, « optimiser les requêtes ») : page de la Dégustation (compteurs, missions,
 * « Bats Claude », jours actifs, familles préférées), qui n'en lit que les clés et l'élément classé (famille:… des « directions »).
 * Vue degustation_choix_legers (0059) ; sans elle, journal complet. Mêmes choix, mêmes validations (les ingrédients n'entrent pas
 * dans la validation) ; ingrédients réduits à l'élément.
 */
async function lireChoixLegers(): Promise<{ choix: ChoixGrille[]; migrationManquante: boolean; erreur?: string; repli?: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('degustation_choix_legers').select(COLONNES_CHOIX).order('created_at', { ascending: false }).limit(5000);
    if (error) return { ...(await getChoixGrille()), repli: true };
    return { choix: ((data ?? []) as unknown as Record<string, unknown>[]).map(choixDepuisLigne).filter((c): c is ChoixGrille => c !== null), migrationManquante: false };
  } catch {
    return { ...(await getChoixGrille()), repli: true };
  }
}
// Gardés sur l'instance tant que degustation_choix n'a pas changé (memoParSignature : compteurs de 0059 ; perf vague 2, 2026-10-10) :
// 4 Mo relus à chaque ouverture de la Dégustation au volume ×10. Repli (vue absente, lecture en échec) : jamais gardé.
export const getChoixGrilleLeger = cache(async (): Promise<{ choix: ChoixGrille[]; migrationManquante: boolean; erreur?: string }> => {
  const utilisateur = (await getUser().catch(() => null))?.id;
  const r = await memoParSignature('degustation-choix-legers', utilisateur, ['degustation_choix'], async () => { const x = await lireChoixLegers(); if (x.repli) throw x; return x; })
    .catch((x: unknown) => (x && typeof x === 'object' && 'repli' in x ? x as Awaited<ReturnType<typeof lireChoixLegers>> : lireChoixLegers()));
  return { choix: r.choix, migrationManquante: r.migrationManquante, ...(r.erreur !== undefined ? { erreur: r.erreur } : {}) };
});

/** Duels équivalents des grilles, pour le moteur des poids (même plafond, mêmes clés que les duels A/B) ; [] sans la migration */
export const getDuelsDegustation = cache(async (): Promise<Duel[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('degustation_apprentissage', { p_limite: 20000 });
    if (error || !Array.isArray(data)) return [];
    const choix = (data as Record<string, unknown>[]).map(choixDepuisLigne).filter((c): c is ChoixGrille => c !== null);
    const p = await professionDegustation();
    return duelsDesChoix(choixPourApprentissage(choix, p.id || null, p.parDefaut));
  } catch {
    return [];
  }
});
