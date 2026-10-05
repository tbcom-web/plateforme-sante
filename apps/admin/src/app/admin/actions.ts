'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { draftVide, PROFILS } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { declencherPublication, declencherPublications } from '@/lib/publication';
import { createClient } from '@/lib/supabase/server';
import { genererCode, hacherCode, VALIDITE_JOURS } from '@/lib/rattachement';
import { enregistrerSite } from '@/app/mon-site/actions';
import { iconeExiste } from '@plateforme/core/icones';

export type Resultat = { ok: boolean; message: string } | null;

const UUID = /^[0-9a-f-]{36}$/;

/** Publie le brouillon actuel du site (il devient la version en ligne). */
export async function publierCommeAdmin(siteId: string): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(siteId)) return { ok: false, message: 'Site invalide.' };
  const r = await declencherPublication(siteId);
  revalidatePath('/admin');
  return r;
}

/** Relance la publication de la version déjà publiée (après un échec), sans publier le brouillon. */
export async function reessayerPublication(siteId: string): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(siteId)) return { ok: false, message: 'Site invalide.' };
  const r = await declencherPublications([siteId]);
  revalidatePath('/admin');
  return r.ok ? { ok: true, message: 'Publication relancée (version déjà validée).' } : r;
}

const emailValide = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;

/** Crée un code de rattachement à usage unique pour le site et renvoie le lien à transmettre au praticien. */
async function creerRattachement(siteId: string, email: string): Promise<{ lien: string } | { erreur: string }> {
  const supabase = await createClient();
  const code = genererCode();
  // Un seul lien valide à la fois par site : les précédents non utilisés sont annulés.
  await supabase.from('rattachements').delete().eq('site_id', siteId).is('utilise_le', null);
  const { error } = await supabase.from('rattachements').insert({
    site_id: siteId,
    code_hash: hacherCode(code),
    email,
    expire_le: new Date(Date.now() + VALIDITE_JOURS * 86_400_000).toISOString(),
  });
  if (error) return { erreur: 'Lien de rattachement impossible à créer.' };
  const h = await headers();
  const origine = h.get('origin') ?? `https://${h.get('host') ?? ''}`;
  return { lien: `${origine}/rattacher?code=${code}` };
}

export type ResultatRattachement = { ok: boolean; message: string; lien?: string; id?: string } | null;

/**
 * Crée le site d'un client (propriétaire provisoire : l'admin) et un lien de rattachement à usage unique,
 * valable 14 jours, réservé à l'e-mail du praticien. Le praticien se connecte avec cet e-mail puis ouvre le lien.
 */
export async function creerSiteClient(_: ResultatRattachement, formData: FormData): Promise<ResultatRattachement> {
  await exigerAdmin();
  const nom = String(formData.get('nom') ?? '').trim().slice(0, 120);
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const profil = String(formData.get('profil') ?? '');
  if (!nom) return { ok: false, message: 'Indiquez le nom du cabinet.' };
  if (!emailValide(email)) return { ok: false, message: 'Adresse e-mail du praticien invalide.' };
  const p = PROFILS.find((x) => x.value === profil);
  if (!p) return { ok: false, message: 'Profil de cabinet invalide.' };

  const d = draftVide();
  const r = await enregistrerSite(null, { ...d, profil: p.value, voix: p.voix, cabinet: { ...d.cabinet, nom }, theme: { ...d.theme, modele: p.modele } });
  if (!r.ok || !r.id) return { ok: false, message: r.message };
  const lien = await creerRattachement(r.id, email);
  revalidatePath('/admin');
  if ('erreur' in lien) return { ok: false, message: `Site créé, mais ${lien.erreur}`, id: r.id };
  return { ok: true, message: `Site créé. Transmettez ce lien à ${email} (valable ${VALIDITE_JOURS} jours, une seule fois) :`, lien: lien.lien, id: r.id };
}

/** Prépare le transfert du site à un autre compte (même mécanisme : lien à usage unique pour cet e-mail). */
export async function changerProprietaire(siteId: string, email: string): Promise<ResultatRattachement> {
  await exigerAdmin();
  if (!UUID.test(siteId)) return { ok: false, message: 'Site invalide.' };
  const e = String(email ?? '').trim().toLowerCase();
  if (!emailValide(e)) return { ok: false, message: 'Adresse e-mail invalide.' };
  const lien = await creerRattachement(siteId, e);
  revalidatePath('/admin');
  if ('erreur' in lien) return { ok: false, message: lien.erreur };
  return { ok: true, message: `Lien de transfert pour ${e} (valable ${VALIDITE_JOURS} jours, une seule fois). Le site change de propriétaire quand il l’ouvre :`, lien: lien.lien };
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

/** Active ou retire l'option payante « édition » (textes guidés de l'éditeur visuel, ajout de pages). */
export async function basculerEdition(siteId: string, edition: boolean): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(siteId)) return { ok: false, message: 'Site invalide.' };
  const supabase = await createClient();
  const { data } = await supabase.from('sites').select('options').eq('id', siteId).maybeSingle();
  const options = { ...((data?.options as Record<string, unknown> | null) ?? {}), edition };
  const { error } = await supabase.from('sites').update({ options }).eq('id', siteId);
  revalidatePath('/admin');
  return error
    ? { ok: false, message: 'Modification impossible pour le moment.' }
    : {
        ok: true,
        message: edition
          ? 'Option « édition » activée : republiez pour remettre en ligne les textes personnalisés.'
          : 'Option « édition » retirée : les textes personnalisés restent enregistrés mais ne seront plus publiés (republiez pour appliquer).',
      };
}

export async function changerStatut(siteId: string, statut: 'brouillon' | 'en_ligne' | 'suspendu'): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(siteId) || !['brouillon', 'en_ligne', 'suspendu'].includes(statut)) {
    return { ok: false, message: 'Valeur invalide.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('sites').update({ statut }).eq('id', siteId);
  revalidatePath('/admin');
  return error
    ? { ok: false, message: 'Modification impossible.' }
    : { ok: true, message: statut === 'suspendu' ? 'Site suspendu : il ne sera plus republié.' : 'Statut mis à jour.' };
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
