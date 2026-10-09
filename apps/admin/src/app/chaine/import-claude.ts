'use server';

import { revalidatePath } from 'next/cache';
import { cleComposition, designDe, profilsCompatibles, tagsAutomatiques } from '@plateforme/core';
import { exigerContributeur, MIGRATION_CHAINE } from '@/lib/chaine-modeles';
import { getPropositionsClaude } from '@/lib/directeur';
import { createClient } from '@/lib/supabase/server';
import { profilsChaine } from './donnees';
import { compositionDe } from './validation';

// « Importer les propositions de Claude comme candidats » (demande de Paul du 2026-10-09 : modèles canons proposés par Claude) :
// les propositions de retours/recettes-proposees.json dont l'id commence par « canon- » sont des DESIGNS (images retirées, rendus avec
// le kit de chaque profil) ; chacune devient une fiche candidate SANS profil, origine « claude », version 1 = design. Rien n'est
// validé ni publié : elles passent le tournoi comme les autres. Une proposition déjà candidate (même clé de composition) est ignorée.

export type RetourImport = { ok: boolean; message: string };

export async function importerPropositionsClaude(): Promise<RetourImport> {
  const moi = await exigerContributeur();
  const { profession, profils } = await profilsChaine();
  const lot = await getPropositionsClaude();
  const designs = lot.propositions.filter((p) => p.id.startsWith('canon-') && p.composition && typeof p.composition === 'object');
  if (!designs.length) return { ok: true, message: 'Aucune proposition de design de Claude à importer.' };
  const supabase = await createClient();
  let n = 0;
  for (const p of designs) {
    const design = designDe(p.composition as Record<string, unknown>);
    const cle = cleComposition(design);
    const demo = profils.find((x) => x.sujets[0] === p.scenario.principaux[0]) ?? profils[0];
    const x = demo ? compositionDe({ scenario: demo.scenario }, design) : null;
    const cibles = x ? profilsCompatibles(x, profils).map((q) => q.id) : profils.map((q) => q.id);
    const { data, error } = await supabase.from('modeles_fiches').insert({
      nom: p.nom.slice(0, 120), profession: profession.id, profil: null, cle, origine: 'claude',
      scenario: demo ? { principaux: demo.scenario.principaux, secondaires: demo.scenario.secondaires, couleurs: demo.scenario.couleurs } : {},
      tags: tagsAutomatiques(design, { profession: profession.id, profilsCibles: cibles }),
    }).select('id').maybeSingle();
    if (error?.code === '42P01' || error?.code === 'PGRST205') return { ok: false, message: MIGRATION_CHAINE };
    if (error || !data) continue; // déjà candidat (23505) ou refus : suivant
    await supabase.from('modeles_versions').insert({ modele: data.id, version: 1, composition: design, cle, journal: [{ type: 'creation', texte: `proposition de Claude « ${p.nom} » (${p.id}, ${lot.le ?? 'sans date'})` }], auteur: moi.id });
    n++;
  }
  for (const c of ['/chaine', '/chaine/preselection', '/chaine/tournoi']) revalidatePath(c);
  return { ok: true, message: n ? `${n} design${n > 1 ? 's' : ''} de Claude ajouté${n > 1 ? 's' : ''} aux candidats.` : 'Propositions de Claude déjà candidates.' };
}
