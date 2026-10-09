import 'server-only';
import { cheminResultatTest, lireResultatTesteur, MODES_TEST, type ModeTest, type ResultatTesteur } from '@plateforme/core';
import { exigerContributeur, lireFichierRetours } from '@/lib/chaine-modeles';
import { lancerWorkflow } from '@/lib/publication';

// TESTEUR DE MODÈLES côté serveur (docs/testeur-modeles.md) :
// - declencherTestModele : lance le workflow GitHub « tester-modele » (workflow_dispatch, comme declencherPublication) ;
//   rien n'est publié, le résultat revient dans le dépôt (retours/tests-modeles/…) et la chaîne le lit (faireTournerChaine) ;
// - lireResultatTestModele : résultat détaillé d'une version (contrôles, tickets, vignettes) pour le rapport de la fiche ;
// - vignettes : servies par /api/tests-modeles/vignette (jeton GitHub côté serveur, jamais exposé).

type Resultat = { ok: boolean; message: string };
const ID_MODELE = /^[A-Za-z0-9_-]{1,80}$/;

/** Lance le testeur sur une version de modèle (équipe de la chaîne seulement) */
export async function declencherTestModele(modele: string, version: number, mode: ModeTest = 'check', jeux: readonly string[] = []): Promise<Resultat> {
  await exigerContributeur();
  if (!ID_MODELE.test(modele)) return { ok: false, message: 'Modèle invalide.' };
  if (!Number.isInteger(version) || version < 1 || version > 9999) return { ok: false, message: 'Version invalide.' };
  if (!(MODES_TEST as readonly string[]).includes(mode)) return { ok: false, message: 'Mode invalide.' };
  const ids = jeux.filter((j) => /^[a-z0-9~.+_-]{1,80}$/.test(j)).slice(0, 12);
  const erreur = await lancerWorkflow('tester-modele.yml', { modele, version: String(version), mode, ...(ids.length ? { jeux: ids.join(',') } : {}) });
  if (erreur) return { ok: false, message: erreur.message.replace('La publication', 'Le test') };
  return { ok: true, message: `Test lancé (v${version}, ${mode === 'check' ? 'check initial' : 're-check'}) : résultat dans une dizaine de minutes.` };
}

/** Résultat détaillé du testeur pour une version (null : pas encore testé) */
export async function lireResultatTestModele(modele: string, version: number): Promise<ResultatTesteur | null> {
  if (!ID_MODELE.test(modele) || !Number.isInteger(version) || version < 1) return null;
  const nom = cheminResultatTest(modele, version).replace(/^retours\//, '');
  return lireResultatTesteur(await lireFichierRetours(nom));
}

/** URL d'une vignette (chemin relatif à retours/, contrôlé) servie par la route de l'admin */
export const urlVignette = (chemin: string | null | undefined) =>
  chemin && /^tests-modeles\/[\w.-]+\/[\w.-]+\.(jpe?g|png|webp)$/.test(chemin) ? `/api/tests-modeles/vignette?chemin=${encodeURIComponent(chemin)}` : null;
