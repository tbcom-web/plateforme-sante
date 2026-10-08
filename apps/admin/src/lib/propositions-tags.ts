import 'server-only';
import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { lirePropositionsTags, type LotPropositionsTags } from '@plateforme/core/propositions-claude-tags';

// Propositions de tags de Claude (retours/propositions-claude-tags.json, packages/core/src/propositions-claude-tags.ts) : lues
// dans le dépôt par l'API GitHub (même jeton que predictions.json), sinon dans le dossier local (développement). Lecture seule.

async function lireFichier(): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (token && repo) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/retours/propositions-claude-tags.json?ref=main`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' },
        next: { revalidate: 600 },
      });
      if (r.ok) return await r.text();
    } catch { /* repli local */ }
  }
  for (const racine of [process.cwd(), join(process.cwd(), '..', '..')]) {
    try { return await readFile(join(racine, 'retours', 'propositions-claude-tags.json'), 'utf8'); } catch { /* suivant */ }
  }
  return null;
}

async function getPropositionsTagsSansMemo(): Promise<LotPropositionsTags> {
  const t = await lireFichier();
  try { return lirePropositionsTags(t ? JSON.parse(t) : null); } catch { return lirePropositionsTags(null); }
}
export const getPropositionsTags = cache(getPropositionsTagsSansMemo);
