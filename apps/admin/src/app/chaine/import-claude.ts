'use server';

import { revalidatePath } from 'next/cache';
import { exigerContributeur, oublierAutomate } from '@/lib/chaine-modeles';
import { importerDesignsClaude } from '@/lib/chaine-guidage';

// « Importer les propositions de Claude comme candidats » (demande de Paul du 2026-10-09 : modèles canons proposés par Claude) :
// les propositions de retours/recettes-proposees.json dont l'id commence par « canon- » sont des DESIGNS (images retirées, rendus avec
// le kit de chaque profil) ; chacune devient une fiche candidate SANS profil, origine « claude », version 1 = design. Rien n'est
// validé ni publié : elles passent le tournoi comme les autres. Une proposition déjà dans la chaîne (même clé) est ignorée.
// Depuis la chaîne guidée (2026-10-10), le même import se fait seul quand il manque des candidats (lib/chaine-guidage.ts).

export type RetourImport = { ok: boolean; message: string };

export async function importerPropositionsClaude(): Promise<RetourImport> {
  const moi = await exigerContributeur();
  // Relecture sans le cache de 10 min (import juste après un envoi de Claude)
  const r = await importerDesignsClaude(moi, { frais: true });
  oublierAutomate();
  for (const c of ['/chaine', '/chaine/preselection', '/chaine/tournoi']) revalidatePath(c);
  return { ok: r.ok, message: r.message };
}
