import 'server-only';
import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// « Ce que vos avis ont changé » : corrections faites par Claude d'après les retours, tenues dans retours/CHANGEMENTS.md du
// dépôt. Lu par l'API GitHub (même jeton que la publication, dépôt public ou privé), sinon dans le dossier local (développement).

export type ChangementClaude = { date: string; texte: string };

/** Entrées « - AAAA-MM-JJ : texte » du fichier (les plus récentes d'abord, 30 au plus) */
export function lireChangements(md: string): ChangementClaude[] {
  return md.split('\n')
    .map((l) => /^\s*[-*]\s*(\d{4}-\d{2}-\d{2})\s*[:—–-]\s*(.+)$/.exec(l))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({ date: m[1], texte: m[2].trim() }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
}

async function getChangementsClaudeSansMemo(): Promise<ChangementClaude[]> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (token && repo) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/retours/CHANGEMENTS.md?ref=main`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' },
        next: { revalidate: 600 }, signal: AbortSignal.timeout(5000),
      });
      if (r.ok) return lireChangements(await r.text());
    } catch { /* repli local */ }
  }
  for (const racine of [process.cwd(), join(process.cwd(), '..', '..')]) {
    try { return lireChangements(await readFile(join(racine, 'retours', 'CHANGEMENTS.md'), 'utf8')); } catch { /* suivant */ }
  }
  return [];
}
export const getChangementsClaude = cache(getChangementsClaudeSansMemo);
