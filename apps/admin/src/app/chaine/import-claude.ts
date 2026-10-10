'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { exigerContributeur, faireTournerChaine, oublierAutomate } from '@/lib/chaine-modeles';
import { importerDesignsClaude } from '@/lib/chaine-guidage';

// « Importer les propositions de Claude comme candidats » (demande de Paul du 2026-10-09 : modèles canons proposés par Claude) :
// les propositions de retours/recettes-proposees.json dont l'id commence par « canon- » sont des DESIGNS (images retirées, rendus avec
// le kit de chaque profil) ; chacune devient une fiche candidate SANS profil, origine « claude », version 1 = design. Rien n'est
// validé ni publié : gardées, elles passent la vérification automatique puis la relecture finale comme les autres (chaîne en 3 étapes,
// 2026-10-11). Une proposition déjà dans la chaîne (même clé) est ignorée. Plus d'import automatique : c'est un choix de goût.

export type RetourImport = { ok: boolean; message: string };

export async function importerPropositionsClaude(): Promise<RetourImport> {
  const moi = await exigerContributeur();
  // Relecture sans le cache de 10 min (import juste après un envoi de Claude)
  const r = await importerDesignsClaude(moi, { frais: true });
  oublierAutomate();
  for (const c of ['/chaine', '/chaine/preselection', '/chaine/tournoi']) revalidatePath(c);
  // Gardées : elles entrent en vérification (et le testeur se lance) sans attendre le prochain chargement
  after(() => faireTournerChaine(null, { versions: 'utiles' }).then(() => undefined, () => undefined));
  return { ok: r.ok, message: r.message };
}
