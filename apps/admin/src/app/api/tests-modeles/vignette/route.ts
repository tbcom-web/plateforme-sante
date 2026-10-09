import type { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getEquipier } from '@/lib/chaine-modeles';

// Vignettes des tickets du testeur de modèles (retours/tests-modeles/<modele>-v<n>/t-XXXX.jpg) pour le rapport de la fiche :
// lues dans le dépôt par l'API GitHub (jeton côté serveur, jamais exposé), sinon dans la copie locale. Équipe de la chaîne seulement.
const CHEMIN = /^tests-modeles\/[\w.-]+\/[\w.-]+\.(jpe?g|png|webp)$/;
const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function GET(req: NextRequest) {
  const prive = { 'Cache-Control': 'private, no-store' };
  if (!(await getEquipier())) return new Response('Connexion requise.', { status: 401, headers: prive });
  const chemin = req.nextUrl.searchParams.get('chemin') ?? '';
  if (!CHEMIN.test(chemin) || chemin.includes('..')) return new Response('Chemin invalide.', { status: 400, headers: prive });
  const type = TYPES[chemin.split('.').pop()!.toLowerCase()];
  const entetes = { 'Content-Type': type, 'Cache-Control': 'private, max-age=3600' };
  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPO;
  if (token && repo) {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/retours/${chemin}?ref=main`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' },
    }).catch(() => null);
    if (r?.ok) return new Response(await r.arrayBuffer(), { headers: entetes });
  }
  for (const racine of [process.cwd(), join(process.cwd(), '..', '..')]) {
    const contenu = await readFile(join(racine, 'retours', chemin)).catch(() => null);
    if (contenu) return new Response(new Uint8Array(contenu), { headers: entetes });
  }
  return new Response('Introuvable.', { status: 404, headers: prive });
}
