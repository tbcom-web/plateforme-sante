'use server';

import { revalidatePath } from 'next/cache';
import { formaterTelephone, normaliserDraft, type SiteDraft } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

export type EtatEnregistrement = { ok: boolean; message: string; id?: string };

const t = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);
const liste = (v: unknown, max = 20, taille = 80) => (Array.isArray(v) ? v : []).map((x) => t(x, taille)).filter(Boolean).slice(0, max);
const chiffres = (v: unknown, max: number) => t(v, max + 4).replace(/\D/g, '').slice(0, max);
const url = (v: unknown) => { const s = t(v, 400); return /^https:\/\//.test(s) || s === '' ? s : ''; };
// Seules les photos stockées dans le dossier « photos » du projet Supabase sont acceptées.
const PREFIXE_PHOTOS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/`;
const photo = (v: unknown) => { const s = t(v, 400); return s.startsWith(PREFIXE_PHOTOS) ? s : ''; };
const parmi = <T extends string>(v: unknown, valeurs: readonly T[], defaut: T): T => (valeurs.includes(v as T) ? (v as T) : defaut);

// Normalise puis borne chaque champ (aucune donnée inattendue n'est enregistrée).
function nettoyer(brut: unknown): SiteDraft {
  const d = normaliserDraft(brut);
  return {
    version: 2,
    pays: parmi(d.pays, ['FR', 'BE', 'CH'] as const, 'FR'),
    profil: parmi(d.profil, ['proximite', 'groupe', 'sport', 'prevention', 'technique'] as const, 'proximite'),
    voix: parmi(d.voix, ['je', 'nous', 'tiers'] as const, 'tiers'),
    cabinet: {
      nom: t(d.cabinet.nom, 120),
      ville: t(d.cabinet.ville, 80),
      quartier: t(d.cabinet.quartier, 120),
      telephone: formaterTelephone(t(d.cabinet.telephone, 25)),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.cabinet.email) ? t(d.cabinet.email, 120) : '',
      communes: liste(d.cabinet.communes, 15),
    },
    lieux: d.lieux.slice(0, 5).map((l) => ({
      id: t(l.id, 20),
      type: parmi(l.type, ['cabinet', 'maison_sante', 'pole_sante', 'centre_medical'] as const, 'cabinet'),
      nom: t(l.nom, 120),
      adresse: t(l.adresse, 160),
      complement: t(l.complement, 120),
      codePostal: t(l.codePostal, 10),
      ville: t(l.ville, 80),
      horaires: l.horaires.slice(0, 7).map((h) => ({ jour: t(h.jour, 10), heures: t(h.heures, 80) })),
    })),
    praticiens: d.praticiens.slice(0, 10).map((p) => ({
      id: t(p.id, 20),
      prenom: t(p.prenom, 60),
      nom: t(p.nom, 60),
      statut: parmi(p.statut, ['titulaire', 'collaborateur', 'remplacant'] as const, 'titulaire'),
      numeroOrdre: chiffres(p.numeroOrdre, 11),
      rpps: chiffres(p.rpps, 11),
      inami: t(p.inami, 16),
      membreSsp: Boolean(p.membreSsp),
      rcc: t(p.rcc, 20),
      diplome: t(p.diplome, 160),
      ecole: t(p.ecole, 120),
      formations: liste(p.formations, 12, 160),
      orientations: liste(p.orientations, 12),
      sports: liste(p.sports, 15, 40),
      rdvUrl: url(p.rdvUrl),
      presence: t(p.presence, 120),
      bio: t(p.bio, 1500),
      photo: photo(p.photo),
    })),
    acces: {
      pmr: Boolean(d.acces.pmr),
      parking: t(d.acces.parking, 160),
      transports: t(d.acces.transports, 200),
      autres: liste(d.acces.autres, 6, 160),
    },
    rdv: { mode: parmi(d.rdv.mode, ['en_ligne', 'telephone', 'les_deux'] as const, 'les_deux'), outil: t(d.rdv.outil, 40) || 'Doctolib', url: url(d.rdv.url) },
    paiements: liste(d.paiements, 8, 40),
    domicile: { actif: Boolean(d.domicile.actif), creneaux: t(d.domicile.creneaux, 160), secteurs: liste(d.domicile.secteurs, 15) },
    message: { texte: t(d.message.texte, 240), jusquAu: /^\d{4}-\d{2}-\d{2}$/.test(d.message.jusquAu) ? d.message.jusquAu : '' },
    conventionnement: t(d.conventionnement, 160),
    theme: {
      couleur: /^#[0-9a-f]{6}$/i.test(d.theme.couleur) ? d.theme.couleur : '#1f6a64',
      modele: parmi(d.theme.modele, ['proximite', 'premium'] as const, 'proximite'),
    },
    photos: { accueil: photo(d.photos.accueil), cabinet: d.photos.cabinet.map(photo).filter(Boolean).slice(0, 6) },
    soins: d.soins.filter((s) => /^[a-z0-9-]{1,80}$/.test(s)).slice(0, 30),
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
