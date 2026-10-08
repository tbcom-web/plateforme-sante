import 'server-only';
import { universDuParcours } from '@plateforme/core';
import { predictionsParCle } from '@plateforme/core/juge';
import { professionDegustation, profilsDegustation } from '@/lib/degustation';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getPoidsAtelier } from '@/lib/atelier';
import { getPredictions } from '@/lib/predictions';
import { getPhotosBanque } from '@/lib/recettes';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getTranches, tranchesEnListes } from '@/lib/tranches';
import { getUnivers } from '@/lib/univers';

// Données de rendu et de génération partagées par les pages de la chaîne (mêmes sources que la Dégustation). Lues avec la session
// de la personne : un contributeur lit ce que les règles de lecture ouvrent aux comptes connectés (repli : rendus du modèle).
const sur = async <T,>(p: Promise<T>, repli: T): Promise<T> => { try { return await p; } catch { return repli; } };

export async function donneesRendu() {
  const [modeles, catalogue, marquesImportees, univers] = await Promise.all([
    sur(getModelesDisponibles(), []), sur(getCatalogue(), []), sur(getMarquesImportees(), []), sur(getUnivers(), { univers: [] } as unknown as Awaited<ReturnType<typeof getUnivers>>),
  ]);
  return { proposes: universDuParcours(univers.univers), modeles: modeles.map((m) => ({ id: m.id, manifeste: m.manifeste })), catalogue, marquesImportees, themesActives: themesActives() };
}

export async function donneesGeneration() {
  const [poids, photos, tranches, predictions] = await Promise.all([sur(getPoidsAtelier(), null), sur(getPhotosBanque(), []), sur(getTranches(), null), sur(getPredictions(), [])]);
  return { poids, photos, tranches: tranches ? tranchesEnListes(tranches.tranches) : { refuses: [], favoris: [], notes: [] }, predictions: predictionsParCle(predictions) };
}

export async function profilsChaine() {
  const profession = await professionDegustation();
  const profils = await profilsDegustation(profession);
  return { profession, profils };
}
