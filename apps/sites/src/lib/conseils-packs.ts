// Fiches conseils des packs de contenus, par profession (packages/contenus/professions/<profession>/conseils.ts). Ajouter une
// profession : une ligne. Module sans dépendance au site (utilisé aussi par le chargement Supabase).
import type { ConseilPatient } from '@plateforme/core';
import { PACK_PODOLOGUE } from '../../../../packages/contenus/professions/podologue';

export const PACKS_CONSEILS = [PACK_PODOLOGUE] as const;

export const packConseils = (profession: string) => PACKS_CONSEILS.find((p) => p.profession === profession) ?? null;

export const conseilsDeProfession = (profession: string): ConseilPatient[] => [...(packConseils(profession)?.conseils ?? [])];
