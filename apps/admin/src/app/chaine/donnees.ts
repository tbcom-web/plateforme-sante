import 'server-only';
import { kitDuProfil, profilParId, universDuParcours, visuelsDeLActivite } from '@plateforme/core';
import { getDonneesKits } from '@/lib/kits-images';
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

/**
 * Profils de démonstration de la chaîne (MODÈLE = DESIGN, chaine-design.ts) avec les photos AUTORISÉES de chacun : kit du profil
 * (profils.ts, kitDuProfil → visuelsDeLActivite : photos de l'activité, sinon photos du thème sans autre activité identifiable).
 * `photos` null : profil sans pratique (scénario type) → photos de ses sujets.
 */
export async function profilsDemo() {
  const { profession, profils } = await profilsChaine();
  const dk = await sur(getDonneesKits(), null);
  return {
    profession,
    profils: profils.map((p) => {
      const pp = profilParId(p.id, profession.id);
      let photos: string[] | null = null;
      if (pp && dk) { try { photos = visuelsDeLActivite(kitDuProfil(pp, { photos: dk }), pp.activites[0] ?? null).photos; } catch { photos = null; } }
      return { ...p, photos };
    }),
  };
}
export type ProfilDemoChaine = Awaited<ReturnType<typeof profilsDemo>>['profils'][number];
