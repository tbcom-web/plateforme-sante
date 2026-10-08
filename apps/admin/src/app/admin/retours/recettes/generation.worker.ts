// Worker de /admin/retours/recettes : génère les recettes complètes à noter hors du fil principal (perf, 2026-10-08).
// Même fonction que la page (executerDemandeGeneration, core : generation-recettes.ts), même graine, mêmes recettes.
import { executerDemandeGeneration, type DemandeGeneration } from '@plateforme/core';

self.onmessage = (e: MessageEvent<{ id: number; demande: DemandeGeneration }>) => {
  const { id, demande } = e.data;
  try {
    self.postMessage({ id, ok: true, candidates: executerDemandeGeneration(demande) });
  } catch (err) {
    self.postMessage({ id, ok: false, message: String(err) });
  }
};
