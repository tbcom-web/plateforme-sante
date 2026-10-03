'use server';

import { revalidatePath } from 'next/cache';
import { exigerAdmin } from '@/lib/admin';
import { declencherPublication } from '@/lib/publication';
import { createClient } from '@/lib/supabase/server';
import { iconeExiste } from '@plateforme/core/icones';

export type Resultat = { ok: boolean; message: string } | null;

const UUID = /^[0-9a-f-]{36}$/;

export async function publierCommeAdmin(siteId: string): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(siteId)) return { ok: false, message: 'Site invalide.' };
  const r = await declencherPublication(siteId);
  revalidatePath('/admin');
  return r;
}

export async function basculerTest(siteId: string, test: boolean): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(siteId)) return { ok: false, message: 'Site invalide.' };
  const supabase = await createClient();
  const { error } = await supabase.from('sites').update({ test }).eq('id', siteId);
  revalidatePath('/admin');
  return error
    ? { ok: false, message: 'Modification impossible.' }
    : { ok: true, message: test ? 'Marqué comme test : republiez pour appliquer.' : 'Site réel : republiez pour appliquer.' };
}

export async function changerStatut(siteId: string, statut: 'brouillon' | 'en_ligne' | 'suspendu'): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(siteId) || !['brouillon', 'en_ligne', 'suspendu'].includes(statut)) {
    return { ok: false, message: 'Valeur invalide.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('sites').update({ statut }).eq('id', siteId);
  revalidatePath('/admin');
  return error ? { ok: false, message: 'Modification impossible.' } : { ok: true, message: 'Statut mis à jour.' };
}

export type ChampsSoin = {
  titre_court: string;
  titre: string;
  resume: string;
  corps: string;
  faq: { q: string; r: string }[];
  /** "prefixe:nom" d'un jeu intégré, ou vide pour l'icône par défaut */
  icone: string;
};

export async function enregistrerSoin(id: string, champs: ChampsSoin): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(id)) return { ok: false, message: 'Soin invalide.' };
  const t = (v: string, max: number) => String(v ?? '').trim().slice(0, max);
  const valeurs = {
    titre_court: t(champs.titre_court, 80),
    titre: t(champs.titre, 160),
    resume: t(champs.resume, 400),
    corps: t(champs.corps, 20000),
    faq: (champs.faq ?? [])
      .map((f) => ({ q: t(f.q, 300), r: t(f.r, 1500) }))
      .filter((f) => f.q && f.r)
      .slice(0, 12),
    icone: t(champs.icone, 80) || null,
  };
  if (valeurs.icone && !iconeExiste(valeurs.icone)) {
    return { ok: false, message: 'Icône inconnue dans les jeux intégrés.' };
  }
  if (!valeurs.titre_court || !valeurs.titre || !valeurs.resume || !valeurs.corps) {
    return { ok: false, message: 'Titre court, titre, résumé et texte sont obligatoires.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('soins_catalogue').update(valeurs).eq('id', id);
  revalidatePath('/admin/catalogue');
  return error
    ? { ok: false, message: 'Enregistrement impossible.' }
    : { ok: true, message: 'Enregistré. Les sites concernés prendront ce texte à leur prochaine publication.' };
}
