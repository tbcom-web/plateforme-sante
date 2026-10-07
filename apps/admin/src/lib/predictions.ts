import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inventaireAssets, type PhotoDeJeu } from '@plateforme/core';
import { empreinteImage, ligneJuge, lirePredictions, pairesJuge, predictionsParCle, type NotePourJuge, type PredictionJuge } from '@plateforme/core/juge';

// Prédictions du juge du goût de Paul (retours/predictions.json du dépôt, .claude/agents/juge-gout-paul.md) : lues par l'API
// GitHub (même jeton que la publication et que CHANGEMENTS.md), sinon dans le dossier local (développement). Affichées après la
// note de Paul seulement (Claude ne doit pas l'influencer) ; la justesse se calcule ici, côté serveur, contre les notes en base.

export async function getPredictions(): Promise<PredictionJuge[]> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (token && repo) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/retours/predictions.json?ref=main`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' },
        next: { revalidate: 600 },
      });
      if (r.ok) return lirePredictions(await r.json());
    } catch { /* repli local */ }
  }
  for (const racine of [process.cwd(), join(process.cwd(), '..', '..')]) {
    try { return lirePredictions(JSON.parse(await readFile(join(racine, 'retours', 'predictions.json'), 'utf8'))); } catch { /* suivant */ }
  }
  return [];
}

/** Prédictions par clé (pour le client) et ligne « Juge : x/n justes à ±1 » calculée contre les notes en base */
export async function getJuge(notes: readonly NotePourJuge[], photosJeux: readonly PhotoDeJeu[] = []) {
  const predictions = await getPredictions();
  if (!predictions.length) return { predictions: {} as Record<string, PredictionJuge[]>, ligne: null as string | null };
  const images = new Map(inventaireAssets({ photosJeux }).flatMap((a) => (a.rendu.kind === 'image' ? [[a.cle, empreinteImage(a.rendu.src)] as const] : [])));
  const paires = pairesJuge(predictions, notes, (cle) => images.get(cle) ?? null);
  return { predictions: predictionsParCle(predictions), ligne: ligneJuge(paires) };
}
