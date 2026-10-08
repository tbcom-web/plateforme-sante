import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { choixDepuisLigne, choixPourApprentissage, duelsDesChoix, profilsDePratique, SCENARIOS_TYPES, SUJETS_VISUELS, type ChoixGrille, type Duel, type ScenarioRecette } from '@plateforme/core';
import { COOKIE_PROFESSION, PROFESSION_PAR_DEFAUT, professionDe } from '@plateforme/core/professions';
import { createClient } from '@/lib/supabase/server';

// 🍽 Dégustation (migration 0042, packages/core/src/degustation.ts) côté serveur :
// - getChoixGrille : journal complet, lu par le super admin (/admin/degustation) ; [] et migrationManquante sans la migration ;
// - getDuelsDegustation : degustation_apprentissage() (ni auteur ni session) → duels équivalents (duelsDepuisChoix), filtrés pour
//   la profession choisie (les siens + les dimensions transversales des autres professions), versés dans getDuelsApprentissage ;
// - professionDegustation / profilsDegustation : registre des professions (professions.ts, cookie du sélecteur de l'en-tête) et
//   profils de pratique de la profession (profils.ts) ; sans profil de pratique, scénarios types par sujet.

export const MIGRATION_DEGUSTATION = 'Migration 0042 à exécuter (supabase/migrations/0042_degustation.sql) : vos choix restent dans ce navigateur.';

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

export const getChoixGrille = cache(async (): Promise<{ choix: ChoixGrille[]; migrationManquante: boolean }> => {
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
