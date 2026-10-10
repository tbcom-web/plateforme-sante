'use server';

import { exigerAdmin } from '@/lib/admin';
import { markdownRetours } from '@/lib/synthese-retours';

/** « Copier mes retours » : synthèse Markdown préparée à la demande (lib/synthese-retours.ts) */
export async function preparerSyntheseRetours(): Promise<{ ok: boolean; markdown: string }> {
  await exigerAdmin();
  try {
    return { ok: true, markdown: await markdownRetours() };
  } catch {
    return { ok: false, markdown: '' };
  }
}
