import 'server-only';
import { cache } from 'react';
import { contenusDuPack, etatContenu, messagesDuContenu, progressionPack, type ContenuRevue, type PackContenus, type ProgressionPack, type RevueContenu } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
// Packs de contenus des professions (packages/contenus/professions/<id>/index.ts) : importés depuis le dépôt (transpilePackages
// active la compilation des dossiers externes). Ajouter un pack : une ligne dans PACKS.
import { controlerPackPsychomot, PACK_PSYCHOMOTRICIEN } from '../../../../packages/contenus/professions/psychomotricien';
// Pack complémentaire podologue (articles pré-écrits, fiches conseils patients) : statut « complement », ne ferme jamais la profession
import { controlerPackPodologue, PACK_PODOLOGUE } from '../../../../packages/contenus/professions/podologue';

// Contenus dans les Arrivages (contenus-revue.ts, docs/espaces-admin.md) : cartes de revue des textes des packs, contrôle des
// packs (mêmes erreurs et avertissements que `npm run controle:packs`), revues enregistrées dans illustrations_revues (0021) sous
// `contenu:<profession>:<nature>:<id>` avec l'empreinte du texte. Aucune migration.

type EntreePack = { pack: PackContenus; controler: (p: { statut: string }) => { erreurs: string[]; avertissements: string[] } };

const PACKS: readonly EntreePack[] = [
  { pack: PACK_PSYCHOMOTRICIEN as unknown as PackContenus, controler: controlerPackPsychomot },
  { pack: PACK_PODOLOGUE as unknown as PackContenus, controler: controlerPackPodologue },
];

export type SourceAffichee = { id: string; organisme: string; titre: string; url: string; verifie: boolean };
export type ContenuArrivage = ContenuRevue & { erreurs: string[]; avertissements: string[]; sourcesDetail: SourceAffichee[]; precedent: string | null };
export type PackRevue = { profession: string; statutPack: string; contenus: ContenuArrivage[]; progression: ProgressionPack; erreursControle: number; revues: Record<string, RevueContenu> };

/** Dernière revue de chaque contenu (statut courant + commentaire du journal), sans migration */
const getRevuesContenus = cache(async (): Promise<Record<string, RevueContenu>> => {
  try {
    const supabase = await createClient();
    const [s, r] = await Promise.all([
      supabase.from('illustrations_statuts').select('cle, statut, empreinte').like('cle', 'contenu:%'),
      supabase.from('illustrations_revues').select('cle, commentaire, created_at').like('cle', 'contenu:%').order('created_at', { ascending: false }).limit(5000),
    ]);
    const commentaires = new Map<string, string | null>();
    for (const l of (r.data ?? []) as { cle: string; commentaire: string | null }[]) if (!commentaires.has(l.cle)) commentaires.set(l.cle, l.commentaire);
    return Object.fromEntries(((s.data ?? []) as { cle: string; statut: string; empreinte: string | null }[]).map((l) => [l.cle, { statut: l.statut, empreinte: l.empreinte, commentaire: commentaires.get(l.cle) ?? null }]));
  } catch {
    return {};
  }
});

/** Packs de contenus, avec contrôle, revues et progression ; `profession` : seulement celui de cette profession */
export const getPacksRevue = cache(async (profession?: string | null): Promise<PackRevue[]> => {
  const revues = await getRevuesContenus();
  return PACKS.filter((e) => !profession || e.pack.profession === profession).map(({ pack, controler }) => {
    const { erreurs, avertissements } = controler(pack);
    const sources = new Map((pack.sources ?? []).map((s) => [s.id, s]));
    const contenus = contenusDuPack(pack).map((c) => ({
      ...c,
      erreurs: messagesDuContenu(c, erreurs), avertissements: messagesDuContenu(c, avertissements),
      sourcesDetail: c.sources.map((id) => sources.get(id)).filter((s): s is SourceAffichee => Boolean(s)).map((s) => ({ id: s.id, organisme: s.organisme, titre: s.titre, url: s.url, verifie: s.verifie })),
      precedent: revues[c.cle]?.statut ?? null,
    }));
    return { profession: pack.profession, statutPack: pack.statut, contenus, revues, erreursControle: erreurs.length, progression: progressionPack(contenus, revues, { erreursControle: erreurs.length, statutPack: pack.statut }) };
  });
});

/** Contenus en attente d'une décision (sans revue, « à revoir », ou texte modifié depuis la revue) */
export const contenusEnAttente = (p: PackRevue) => p.contenus.filter((c) => etatContenu(c, p.revues[c.cle]) === 'en_attente');

/** Contenu connu d'un pack (contrôle des actions serveur) : clé et empreinte actuelle */
export async function contenuActuel(cle: string): Promise<ContenuArrivage | null> {
  for (const p of await getPacksRevue()) { const c = p.contenus.find((x) => x.cle === cle); if (c) return c; }
  return null;
}

/**
 * Règle de publication (demande de Paul du 2026-10-09) : une profession qui a un pack de contenus n'est disponible pour le parcours
 * client que lorsque tous ses contenus obligatoires sont acceptés (progressionPack.publiable) ; sans pack : inchangé (true).
 * À lire par le parcours (/essai) avant d'ouvrir une profession.
 */
export async function packPubliable(profession: string): Promise<boolean> {
  // Un pack « complement » (contenus ajoutés à une profession ouverte) ne décide jamais de l'ouverture
  const p = (await getPacksRevue(profession)).find((x) => x.statutPack !== 'complement');
  return p ? p.progression.publiable : true;
}

/**
 * Catalogue de DÉMONSTRATION d'une profession qui a un pack de contenus (fiches au format soins_catalogue) : aperçus du parcours
 * client en mode test (profession en préparation, jamais publique) tant que la table soins_catalogue n'a pas ses fiches. Sans pack :
 * null. Aucune lecture en base.
 */
export function catalogueDuPack(profession: string): { slug: string; titre_court: string; titre: string; resume: string; corps: string }[] | null {
  const e = PACKS.find((x) => x.pack.profession === profession);
  if (!e?.pack.fiches?.length) return null;
  return e.pack.fiches.map((f) => ({ slug: f.slug, titre_court: f.titreCourt, titre: f.titre, resume: f.resume, corps: f.corps }));
}

/** Articles pré-écrits des packs (nature « article ») et leur état de revue : à importer en brouillon dans le flux une fois acceptés */
export type ArticlePack = { cle: string; profession: string; slug: string; titre: string; resume: string; theme: string; corps: string; etat: ReturnType<typeof etatContenu> };
export async function articlesDesPacks(): Promise<ArticlePack[]> {
  const out: ArticlePack[] = [];
  for (const p of await getPacksRevue()) {
    const entree = PACKS.find((e) => e.pack.profession === p.profession);
    for (const a of entree?.pack.articles ?? []) {
      const c = p.contenus.find((x) => x.nature === 'article' && x.id === a.slug);
      if (c) out.push({ cle: c.cle, profession: p.profession, slug: a.slug, titre: a.titre, resume: a.resume, theme: a.theme, corps: a.corps, etat: etatContenu(c, p.revues[c.cle]) });
    }
  }
  return out;
}
