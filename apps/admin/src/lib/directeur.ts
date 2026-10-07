import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@/lib/supabase/server';
import { lireManques, lirePropositionsClaude, type AvisDirecteur, type LotPropositions, type ManqueSignale } from './directeur-format';

// Travail du directeur artistique (.claude/agents/directeur-artistique.md) lu par le Studio : retours/recettes-proposees.json et
// retours/MANQUES.md du dépôt, par l'API GitHub (même jeton que predictions.json), sinon dans le dossier local (développement) ;
// avis de Paul dans la table directeur_avis (migration 0035), sinon rien (le Studio garde alors les avis dans le navigateur).

async function lireRetour(fichier: string): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (token && repo) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/retours/${fichier}?ref=main`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' },
        next: { revalidate: 600 },
      });
      if (r.ok) return await r.text();
    } catch { /* repli local */ }
  }
  for (const racine of [process.cwd(), join(process.cwd(), '..', '..')]) {
    try { return await readFile(join(racine, 'retours', fichier), 'utf8'); } catch { /* suivant */ }
  }
  return null;
}

export async function getPropositionsClaude(): Promise<LotPropositions> {
  const t = await lireRetour('recettes-proposees.json');
  try { return lirePropositionsClaude(t ? JSON.parse(t) : null); } catch { return { profil: null, le: null, propositions: [] }; }
}

export async function getManques(): Promise<ManqueSignale[]> {
  const t = await lireRetour('MANQUES.md');
  return t ? lireManques(t) : [];
}

/** Avis déjà donnés (plus récents d'abord) ; `migrationManquante` : table absente (0035 pas encore exécutée) */
export async function getAvisDirecteur(): Promise<{ avis: AvisDirecteur[]; migrationManquante: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('directeur_avis').select('nature, cle, decision, remarque, created_at').order('created_at', { ascending: false }).limit(500);
    if (error) return { avis: [], migrationManquante: true };
    return { avis: (data ?? []).map((l) => ({ nature: l.nature, cle: l.cle, decision: l.decision, remarque: l.remarque ?? null, le: l.created_at ?? null })) as AvisDirecteur[], migrationManquante: false };
  } catch {
    return { avis: [], migrationManquante: true };
  }
}
