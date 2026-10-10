'use server';

import { revalidatePath } from 'next/cache';
import { candidatesDuContexte, estEmplacementImage } from '@plateforme/core/chaine-images';
import { exigerContributeur, exigerValidateur, lireChaine, LECTURE_CHAINE, oublierAutomate } from '@/lib/chaine-modeles';
import { createClient } from '@/lib/supabase/server';
import { candidatesImagesDemo, MIGRATION_IMAGES } from './donnees-images';
import { donneesGeneration, profilsChaine, profilsDemo } from './donnees';
import { publierModele, verifierTags, type Retour } from './actions';

// Gestes du parcours guidé de relecture (/chaine/revision/[id]) : choix d'une image en situation (préférence de rendu, jamais une
// version : chaine-images.ts), envoi des corrections à Claude, publication depuis l'écran final (Paul).

const UUID = /^[0-9a-f-]{36}$/;

/** Image choisie dans l'aperçu pour un design × profil de démonstration × emplacement (seulement une candidate de l'emplacement) */
export async function choisirImage(modele: string, profil: string, emplacement: string, image: string): Promise<Retour & { enregistre: boolean }> {
  await exigerContributeur();
  if (!UUID.test(modele) || !/^[a-z0-9~.+_-]{2,80}$/.test(profil) || !estEmplacementImage(emplacement) || typeof image !== 'string' || !image || image.length > 600) return { ok: false, enregistre: false, message: 'Choix invalide.' };
  const { profils } = await profilsChaine();
  const p = profils.find((x) => x.id === profil);
  if (!p) return { ok: false, enregistre: false, message: 'Profil inconnu.' };
  if (emplacement === 'heros') {
    if (!p.scenario.principaux.includes(image)) return { ok: false, enregistre: false, message: 'Illustration hors du profil.' };
  } else {
    let c = (await candidatesImagesDemo([]))[profil] ?? [];
    // Kit sans photo : repli sur les photos où le rendu puise déjà (comme l'aperçu)
    if (!c.length) {
      const [{ photos }, demo] = await Promise.all([donneesGeneration(), profilsDemo()]);
      const pd = demo.profils.find((x) => x.id === profil);
      c = pd ? candidatesDuContexte(photos, pd) : [];
    }
    if (!c.some((x) => x.image === image)) return { ok: false, enregistre: false, message: 'Photo hors du kit du profil.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('modeles_images_choix').insert({ modele, profil, emplacement, image });
  if (error) return { ok: false, enregistre: false, message: error.code === '42P01' || error.code === 'PGRST205' ? MIGRATION_IMAGES : 'Enregistrement impossible pour le moment.' };
  return { ok: true, enregistre: true, message: 'Image choisie pour ce profil (le design ne change pas).' };
}

/** Fin de la relecture avec des remarques : la chaîne passe le modèle en retouche (automate) et la demande à Claude est affichée */
export async function envoyerCorrections(modele: string): Promise<Retour> {
  await exigerContributeur();
  if (!UUID.test(modele)) return { ok: false, message: 'Modèle inconnu.' };
  oublierAutomate();
  for (const c of ['/chaine', `/chaine/revision/${modele}`, `/chaine/modele/${modele}`]) revalidatePath(c);
  return { ok: true, message: 'Corrections envoyées : le modèle part en retouche.' };
}

/** Écran final : profils cochés → tags vérifiés, puis « Publier pour les praticiens » (verrous recalculés par publierModele) */
export async function publierDepuisParcours(modele: string, profils: string[]): Promise<Retour> {
  await exigerValidateur();
  if (!UUID.test(modele)) return { ok: false, message: 'Modèle inconnu.' };
  const chaine = await lireChaine(null);
  if (chaine.erreurLecture) return { ok: false, message: LECTURE_CHAINE };
  const f = chaine.fiches.find((x) => x.id === modele);
  if (!f) return { ok: false, message: 'Modèle introuvable.' };
  const liste = (Array.isArray(profils) ? profils : []).filter((x) => typeof x === 'string').slice(0, 12);
  if (!liste.length) return { ok: false, message: 'Cochez au moins un profil.' };
  const t = await verifierTags(modele, { profession: f.tags.profession || f.profession, profils: liste, couleurs: f.tags.couleurs });
  if (!t.ok) return t;
  return publierModele(modele);
}
