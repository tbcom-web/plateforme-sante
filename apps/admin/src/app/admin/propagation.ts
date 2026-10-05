'use server';

import { exigerAdmin } from '@/lib/admin';
import { declencherPublications, sitesConcernes, type Cible } from '@/lib/publication';

const cibleValide = (c: Cible): Cible => ({
  specialite: typeof c.specialite === 'string' && /^[a-z0-9-]{2,40}$/.test(c.specialite) ? c.specialite : undefined,
  modele: typeof c.modele === 'string' && /^[a-z0-9-]{2,40}$/.test(c.modele) ? c.modele : undefined,
  marque: typeof c.marque === 'string' && /^[a-z0-9-]{3,40}$/.test(c.marque) ? c.marque : undefined,
  jeuPhotos: typeof c.jeuPhotos === 'string' && /^[0-9a-f-]{36}$/.test(c.jeuPhotos) ? c.jeuPhotos : undefined,
  soin: typeof c.soin === 'string' && /^[a-z0-9-]{1,80}$/.test(c.soin) ? c.soin : undefined,
  tous: c.tous === true,
});

/** Nombre et noms des sites en ligne concernés par une ressource partagée. */
export async function compterConcernes(cible: Cible) {
  await exigerAdmin();
  const sites = await sitesConcernes(cibleValide(cible));
  return { nombre: sites.length, noms: sites.slice(0, 8).map((s) => s.nom) };
}

/** Republie la version publiée de tous les sites concernés (propagation d'un changement d'image, de modèle, de charte…). */
export async function propager(cible: Cible) {
  await exigerAdmin();
  const c = cibleValide(cible);
  if (!c.specialite && !c.modele && !c.marque && !c.jeuPhotos && !c.soin && !c.tous) return { ok: false, message: 'Cible invalide.' };
  const sites = await sitesConcernes(c);
  return declencherPublications(sites.map((s) => s.id));
}
