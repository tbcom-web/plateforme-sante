// Rendus HORS LIGNE (démo, testeur de modèles, rendre-recettes : aucune base) : exclusions strictes et photos 4-5 ★ lues dans les
// exports du dépôt (retours/assets-notes.json, retours/illustrations-statuts.json, retours/photos-validees.json : export nocturne,
// scripts/exporter-retours.mjs), manque M15 du 2026-10-09. Fonctions pures : packages/core/src/photos-validees.ts.
// Variables : RETOURS_HORS_LIGNE=non (désactive : comportement d'avant), PHOTOS_VALIDEES=<chemin> (autre manifeste).
// Jamais lu pour un site praticien (sites/supabase.ts pose le registre depuis la base).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { contexteImagesHorsLigne, lireManifestePhotos, type PhotoValidee } from '@plateforme/core';

/** Dossier retours/ du dépôt (remonte depuis le dossier courant) ; null s'il est introuvable */
export function dossierRetours(depart = process.cwd()): string | null {
  let d = resolve(depart);
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(d, 'retours', 'assets-notes.json'))) return join(d, 'retours');
    const p = dirname(d);
    if (p === d) break;
    d = p;
  }
  return null;
}

const lire = (f: string): unknown => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };

/** Manifeste des photos validées 4-5 ★ (vide s'il n'a pas encore été exporté) */
export function manifesteHorsLigne(retours = dossierRetours()): PhotoValidee[] {
  const f = process.env.PHOTOS_VALIDEES || (retours ? join(retours, 'photos-validees.json') : '');
  return f && existsSync(f) ? lireManifestePhotos(lire(f)) : [];
}

/** Contexte d'images d'un rendu hors ligne (null : désactivé ou exports absents) */
export function contexteRetoursHorsLigne(): ReturnType<typeof contexteImagesHorsLigne> | null {
  if (process.env.RETOURS_HORS_LIGNE === 'non') return null;
  const retours = dossierRetours();
  if (!retours) return null;
  const tableau = (x: unknown) => (Array.isArray(x) ? x : []);
  return contexteImagesHorsLigne(tableau(lire(join(retours, 'assets-notes.json'))), tableau(lire(join(retours, 'illustrations-statuts.json'))), manifesteHorsLigne(retours));
}
