'use server';

import { revalidatePath } from 'next/cache';
import type { ModeTest } from '@plateforme/core';
import { declencherTestModele } from '@/lib/tests-modeles';

// Lancement du testeur de modèles depuis la fiche (bouton « Lancer le test ») : workflow GitHub tester-modele, rien n'est publié.
export async function lancerTestModele(modele: string, version: number, mode: ModeTest): Promise<{ ok: boolean; message: string }> {
  const r = await declencherTestModele(modele, version, mode);
  if (r.ok) revalidatePath(`/chaine/modele/${modele}`);
  return r;
}
