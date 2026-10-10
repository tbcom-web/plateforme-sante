import 'server-only';
import { activitePratique, kitDuProfil, modeleIntegre, pratiqueDe, profilDepuisReponses, profilsDePratique, visuelsDeLActivite, type PhotoBanque } from '@plateforme/core';
import { cleProfilComposeur, composer, nomProfilComposeur, profilComposeurDepuisCle, sujetsDuProfilComposeur, type ImagesSujet, type ProfilComposeur, type ResultatComposeur } from '@plateforme/core/composeur';
import { getPoidsAtelier } from '@/lib/atelier';
import { getPredictions } from '@/lib/predictions';
import { getPhotosBanque } from '@/lib/recettes';
import { getTranches } from '@/lib/tranches';
import { getDonneesKits, getDonneesVisuels } from '@/lib/kits-images';
import { getContexteVerification } from '@/lib/profils';
import { getModelesDisponibles } from '@/lib/modeles';
import { professionDegustation } from '@/lib/degustation';
import { instantane, porteeInstantane, SOURCES_APPRENTISSAGE, SOURCES_CONTEXTE_IMAGES } from '@/lib/apprentissage-instantane';

// COMPOSEUR côté serveur (core/composeur.ts, demande de Paul du 2026-10-11) : pour un profil de cabinet (profil de pratique ou
// composition libre « principal + secondaires »), les ~8 plus belles compositions à partir de tout ce qui est appris (poids, notes des
// éléments, tranches, notes prédites par le juge, ingrédients validés) et des IMAGES VALIDÉES de chaque thème du profil (kits).
// Calcul gardé en base (apprentissage-instantane.ts) par profession et profil, tant que notes, duels, photos et revues n'ont pas
// changé (signature des sources) : la page relit l'instantané en 2 petites requêtes ; recalcul après un vote, servi d'abord périmé.

const sur = async <T,>(p: Promise<T>, repli: T): Promise<T> => { try { return await p; } catch { return repli; } };

/** Profil du composeur depuis l'adresse : identifiant d'un profil de pratique (« sport-course ») ou clé libre (« sport+diabete~course ») */
export function profilDepuisParametre(param: string | null | undefined, profession: string): ProfilComposeur | null {
  const v = String(param ?? '').trim();
  if (!v) return null;
  const ref = profilsDePratique(profession).find((p) => p.id === v);
  if (ref?.principal) return { id: ref.id, nom: ref.court, principaux: [ref.principal], secondaires: ref.secondaires, activites: ref.activites };
  const p = profilComposeurDepuisCle(v);
  if (!sujetsDuProfilComposeur(p).length) return null;
  // Activités : seulement celles que la profession propose pour ces thèmes
  const pr = pratiqueDe(profession);
  const sujets = sujetsDuProfilComposeur(p);
  const activites = (p.activites ?? []).filter((a) => activitePratique(pr, a)?.themes.some((t) => sujets.includes(t))).slice(0, 3);
  return { ...p, activites, nom: nomProfilComposeur({ ...p, activites }) + (activites.length ? ` · ${activites.map((a) => activitePratique(pr, a)?.court ?? a).join(', ')}` : '') };
}

/** Images VALIDÉES de chaque thème du profil (kit praticien) : activité du profil qui s'y prête, sinon visuels du thème */
async function imagesDuProfil(p: ProfilComposeur, profession: string): Promise<{ images: ImagesSujet[]; photos: string[] }> {
  const [photos, visuels] = await Promise.all([getDonneesKits(), getDonneesVisuels()]);
  const pr = pratiqueDe(profession);
  const images: ImagesSujet[] = [];
  for (const s of sujetsDuProfilComposeur(p)) {
    const activite = (p.activites ?? []).find((a) => activitePratique(pr, a)?.themes.includes(s)) ?? null;
    const pp = profilDepuisReponses({ profession, principaux: [s], activites: activite ? [activite] : [] });
    const kit = kitDuProfil(pp, { photos, visuels }, { praticien: true });
    const v = visuelsDeLActivite(kit, activite);
    const anims = (activite ? kit.activites.find((a) => a.activite === activite)?.familles.animation : null) ?? kit.generique.animation;
    images.push({ sujet: s, activite, illustration: v.illustration, photos: v.photos, icone: v.icone, animation: anims?.find((a) => !a.aValider)?.cle ?? null, repli: Boolean(activite) && v.repli });
  }
  return { images, photos: [...new Set(images.flatMap((i) => i.photos))] };
}

async function calculer(p: ProfilComposeur, profession: string): Promise<ResultatComposeur> {
  const [poids, banque, tranches, preds, verif, modeles, kit] = await Promise.all([
    sur(getPoidsAtelier(), null), sur(getPhotosBanque(), [] as PhotoBanque[]), sur(getTranches(), null), sur(getPredictions(), []),
    sur(getContexteVerification(), null), sur(getModelesDisponibles(), []), sur(imagesDuProfil(p, profession), { images: [] as ImagesSujet[], photos: [] as string[] }),
  ]);
  // Photos du KIT du profil seulement (jamais une autre activité) ; kit vide : photos des thèmes du profil
  const autorisees = new Set(kit.photos);
  const sujets = sujetsDuProfilComposeur(p);
  const photos = banque.filter((x) => (autorisees.size ? autorisees.has(x.url) : x.sujets.some((s) => sujets.includes(s))));
  const predictions: Record<string, number> = {};
  for (const x of [...preds].sort((a, b) => a.le.localeCompare(b.le))) predictions[x.cle] = x.note;
  const modele = (id: string) => modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);
  return composer({
    profil: p, contexte: { poids, photos, modele, modeTirage: 'favoris', praticien: true, valides: verif?.valides ?? null },
    notes: poids?.notesElements ?? null, tranches: tranches?.tranches ?? null, predictions, valides: verif?.valides ?? null, images: kit.images, n: 8, candidats: 240,
  });
}

/** Instantané d'un profil (pages et route de recalcul, apprentissage-calculs.ts) : clé `composeur|<profession>|<profil>` */
export async function definitionComposeur(cle?: string) {
  const [prof, portee] = await Promise.all([professionDegustation(), porteeInstantane()]);
  const param = cle ? cle.split('|')[2] ?? '' : '';
  const p = profilDepuisParametre(param, prof.id);
  if (!p) return null;
  return { cle: `composeur|${prof.id}|${param}`, portee, tables: [...new Set([...SOURCES_APPRENTISSAGE, ...SOURCES_CONTEXTE_IMAGES])], calculer: () => calculer(p, prof.id) };
}

/** Propositions du composeur pour un profil (paramètre d'adresse) ; null si le profil est inconnu */
export async function propositionsComposeur(param: string): Promise<(ResultatComposeur & { param: string }) | null> {
  const prof = await professionDegustation();
  const p = profilDepuisParametre(param, prof.id);
  if (!p) return null;
  // Clé canonique : identifiant du profil de pratique, sinon clé libre normalisée
  const canon = p.id ?? cleProfilComposeur(p);
  const def = await definitionComposeur(`composeur|${prof.id}|${canon}`);
  if (!def) return null;
  const r = await instantane({ ...def, repli: def.calculer });
  return { ...r, profil: { ...r.profil, nom: p.nom ?? r.profil.nom }, param: canon };
}
