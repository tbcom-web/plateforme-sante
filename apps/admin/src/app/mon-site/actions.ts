'use server';

import { revalidatePath } from 'next/cache';
import { formaterTelephone, type SiteDraft } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

export type EtatEnregistrement = { ok: boolean; message: string; id?: string };

const texte = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

// Ne garde que les champs attendus, avec des longueurs bornées.
function nettoyer(d: SiteDraft): SiteDraft {
  return {
    praticien: {
      prenom: texte(d.praticien?.prenom, 60),
      nom: texte(d.praticien?.nom, 60),
      titre: texte(d.praticien?.titre, 120),
      rpps: texte(d.praticien?.rpps, 11).replace(/\D/g, ''),
    },
    cabinet: {
      nom: texte(d.cabinet?.nom, 120),
      adresse: texte(d.cabinet?.adresse, 160),
      codePostal: texte(d.cabinet?.codePostal, 5).replace(/\D/g, ''),
      ville: texte(d.cabinet?.ville, 80),
      quartier: texte(d.cabinet?.quartier, 120),
      telephone: formaterTelephone(texte(d.cabinet?.telephone, 20)),
      pmr: Boolean(d.cabinet?.pmr),
      horaires: (d.cabinet?.horaires ?? []).slice(0, 7).map((h) => ({ jour: texte(h.jour, 10), heures: texte(h.heures, 60) })),
    },
    rdv: { url: texte(d.rdv?.url, 300), plateforme: texte(d.rdv?.plateforme, 40) || 'Doctolib' },
    theme: {
      couleur: /^#[0-9a-f]{6}$/i.test(d.theme?.couleur) ? d.theme.couleur : '#2f7d6d',
      mise_en_page: ['sobre', 'chaleureux', 'premium'].includes(d.theme?.mise_en_page) ? d.theme.mise_en_page : 'chaleureux',
      style_images: ['organique', 'lignes', 'minimal'].includes(d.theme?.style_images) ? d.theme.style_images : 'organique',
    },
    soins: (d.soins ?? []).filter((s) => /^[a-z0-9-]{1,80}$/.test(s)).slice(0, 30),
  };
}

export async function enregistrerSite(id: string | null, draft: SiteDraft): Promise<EtatEnregistrement> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: 'Session expirée, reconnectez-vous.' };

  const config = nettoyer(draft);

  const requete = id
    ? supabase.from('sites').update({ config }).eq('id', id).select('id').single()
    : supabase.from('sites').insert({ profession_slug: 'podologue', config }).select('id').single();

  const { data, error } = await requete;
  if (error || !data) return { ok: false, message: 'Enregistrement impossible. Réessayez.' };

  revalidatePath('/tableau-de-bord');
  return { ok: true, message: 'Enregistré', id: data.id };
}
