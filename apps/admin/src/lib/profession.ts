import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { COOKIE_PROFESSION, professionDe, type Profession } from '@plateforme/core/professions';

// Profession choisie dans le sélecteur de l'en-tête du super admin (cookie « admin-profession », un an) : filtre Arrivages,
// Frigo, Dégustation, Cuisine et Clients. Inconnue ou absente : profession par défaut (professions.ts). À lire par toute page de
// l'admin qui dépend du métier : `const profession = await getProfession()`.
export const getProfession = cache(async (): Promise<Profession> => {
  try {
    return professionDe((await cookies()).get(COOKIE_PROFESSION)?.value);
  } catch {
    return professionDe(null);
  }
});
