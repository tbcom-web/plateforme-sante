'use server';

import { revalidatePath } from 'next/cache';
import { formaterTelephone, validerChoixLogo, GAMMES, REGISTRES_MODELE, SECTIONS_ACCUEIL, SUJETS_FICHES_CONSEILS, universCatalogue, normaliserDraft, nettoyerEquipements, nettoyerEquipementsAutres, SPECIALITES, validerPersonnalisation, type SiteDraft } from '@plateforme/core';
import { nettoyerPortrait } from '@plateforme/core/portrait';
import { createClient } from '@/lib/supabase/server';
import { getModelesDisponibles } from '@/lib/modeles';
import { getMarquesImportees } from '@/lib/marques';
import { getRole } from '@/lib/admin';
import { manques } from '@/lib/sites';
import { declencherPublication } from '@/lib/publication';
import { jeuPhotosAEnregistrer } from '@/lib/jeux-photos';
import { textesAConserver } from '@/lib/personnalisation';

/** version : date de dernière modification du brouillon après l'enregistrement (verrou optimiste) ; conflit : modifié ailleurs. */
export type EtatEnregistrement = { ok: boolean; message: string; id?: string; version?: string; conflit?: boolean };

const MESSAGE_CONFLIT = 'Modifié ailleurs entre-temps : rechargez la page. Votre saisie est gardée dans ce navigateur.';

const t = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);
const liste = (v: unknown, max = 20, taille = 80) => (Array.isArray(v) ? v : []).map((x) => t(x, taille)).filter(Boolean).slice(0, max);
const chiffres = (v: unknown, max: number) => t(v, max + 4).replace(/\D/g, '').slice(0, max);
const url = (v: unknown) => { const s = t(v, 400); return /^https:\/\//.test(s) || s === '' ? s : ''; };
// Seules les photos stockées dans le dossier « photos » du projet Supabase sont acceptées.
const PREFIXE_PHOTOS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/`;
const photo = (v: unknown) => { const s = t(v, 400); return s.startsWith(PREFIXE_PHOTOS) ? s : ''; };
// Portrait du studio (praticiens[].portrait) : gardé seulement si ses fichiers sont dans le stockage et s'il correspond à la photo.
const avecPortrait = (v: unknown, photoPraticien: string) => {
  const portrait = nettoyerPortrait(v, photoPraticien, (u) => u !== '' && photo(u) === u);
  return portrait ? { portrait } : {};
};
const parmi = <T extends string>(v: unknown, valeurs: readonly T[], defaut: T): T => (valeurs.includes(v as T) ? (v as T) : defaut);

// Normalise puis borne chaque champ (aucune donnée inattendue n'est enregistrée).
function nettoyer(brut: unknown, modeles: string[], edition: boolean, marquesImportees: string[] = []): SiteDraft {
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
      ...avecPortrait(p.portrait, photo(p.photo)),
    })),
    acces: {
      pmr: Boolean(d.acces.pmr),
      parking: t(d.acces.parking, 160),
      transports: t(d.acces.transports, 200),
      autres: liste(d.acces.autres, 6, 160),
    },
    rdv: { mode: parmi(d.rdv.mode, ['en_ligne', 'telephone', 'les_deux'] as const, 'les_deux'), outil: t(d.rdv.outil, 40) || 'Doctolib', url: url(d.rdv.url) },
    paiements: liste(d.paiements, 8, 40),
    // Matériel et hygiène : identifiants du catalogue seulement, texte libre borné (300 caractères).
    equipements: nettoyerEquipements(d.equipements),
    equipementsAutres: nettoyerEquipementsAutres(d.equipementsAutres),
    domicile: { actif: Boolean(d.domicile.actif), creneaux: t(d.domicile.creneaux, 160), secteurs: liste(d.domicile.secteurs, 15) },
    message: { texte: t(d.message.texte, 240), jusquAu: /^\d{4}-\d{2}-\d{2}$/.test(d.message.jusquAu) ? d.message.jusquAu : '' },
    conventionnement: t(d.conventionnement, 160),
    theme: {
      couleur: /^#[0-9a-f]{6}$/i.test(d.theme.couleur) ? d.theme.couleur : '#1f6a64',
      modele: parmi(d.theme.modele, modeles, 'proximite'),
      specialite: parmi(d.theme.specialite, SPECIALITES.map((s) => s.value), 'generale'),
      specialiteSecondaire: d.theme.specialiteSecondaire !== d.theme.specialite ? parmi(d.theme.specialiteSecondaire, ['', ...SPECIALITES.map((s) => s.value)], '') : '',
      gamme: parmi(d.theme.gamme, ['', ...GAMMES.map((g) => g.id)], ''),
      // Marque dessinée (validée) ou marque importée active.
      logo: marquesImportees.includes(d.theme.logo?.marque) ? { marque: d.theme.logo.marque, disposition: validerChoixLogo(d.theme.logo).disposition } : validerChoixLogo(d.theme.logo),
      modeVisuel: parmi(d.theme.modeVisuel, ['mixte', 'photos', 'illustrations'] as const, 'mixte'),
      logoPerso: { url: photo(d.theme.logoPerso?.url), complet: d.theme.logoPerso?.complet !== false },
      animation: Boolean(d.theme.animation),
      // Fixé par enregistrerSite (tirage au hasard) : jamais la valeur envoyée par le formulaire.
      jeuPhotos: '',
      // Préréglage d'un univers du catalogue (catalogue-univers.ts) : conservé tel quel, borné ; la compatibilité de
      // l'ordre des sections avec le modèle est revérifiée à la construction (modeleDuSite).
      ...(universCatalogue(d.theme.univers) ? { univers: d.theme.univers } : {}),
      ...(Array.isArray(d.theme.soinsEnAvant) ? { soinsEnAvant: d.theme.soinsEnAvant.filter((s) => /^[a-z0-9-]{1,80}$/.test(s)).slice(0, 12) } : {}),
      ...(Array.isArray(d.theme.sections) ? { sections: d.theme.sections.filter((s) => (SECTIONS_ACCUEIL as readonly string[]).includes(s)).slice(0, SECTIONS_ACCUEIL.length) } : {}),
      ...(REGISTRES_MODELE.includes(d.theme.registre as never) ? { registre: d.theme.registre } : {}),
    },
    flux: { mode: parmi(d.flux.mode, ['manuel', 'auto'] as const, 'manuel'), themes: liste(d.flux.themes, 10, 40) },
    photos: { accueil: photo(d.photos.accueil), panorama: photo(d.photos.panorama), cabinet: d.photos.cabinet.map(photo).filter(Boolean).slice(0, 6) },
    ...(Array.isArray(d.fichesConseils) ? { fichesConseils: d.fichesConseils.filter((f) => SUJETS_FICHES_CONSEILS.some((x) => x.id === f)).slice(0, 12) } : {}),
    soins: d.soins.filter((s) => /^[a-z0-9-]{1,80}$/.test(s)).slice(0, 30),
    // Textes de l'éditeur visuel : zones connues, longueurs bornées, lexique, option « édition » pour les zones guidées.
    perso: { textes: validerPersonnalisation(d.perso.textes, edition).textes },
  };
}

/**
 * Enregistre le brouillon (jamais la version en ligne : voir « Publier »).
 * version : updated_at lu à l'ouverture ; si le brouillon a changé depuis (autre onglet, admin…), rien n'est écrasé.
 */
export async function enregistrerSite(id: string | null, draft: SiteDraft, version?: string | null): Promise<EtatEnregistrement> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: 'Session expirée, reconnectez-vous.' };

  const { data: existant } = id ? await supabase.from('sites').select('options, config, updated_at').eq('id', id).maybeSingle() : { data: null };
  if (id && !existant) return { ok: false, message: 'Site introuvable.' };
  if (existant && version && existant.updated_at !== version) return { ok: false, conflit: true, message: MESSAGE_CONFLIT, id: id ?? undefined };
  const edition = Boolean((existant?.options as { edition?: boolean } | null)?.edition);
  const config = nettoyer(draft, (await getModelesDisponibles()).map((m) => m.id), edition, (await getMarquesImportees()).map((m) => m.id));
  // Option « édition » retirée : les textes guidés déjà enregistrés sont gardés (seulement plus publiés).
  config.perso.textes = textesAConserver(existant ? normaliserDraft(existant.config).perso.textes : {}, config.perso.textes, edition);
  // Jeu de photos : tiré au hasard à la création et quand la spécialité principale change (lib/jeux-photos.ts).
  const ancien = existant ? normaliserDraft(existant.config).theme : null;
  config.theme.jeuPhotos = await jeuPhotosAEnregistrer(supabase, id, ancien, config.theme.specialite);

  let data: { id: string; updated_at: string } | null = null;
  let error: unknown = null;
  if (id) {
    // Mise à jour conditionnelle : refusée si updated_at a changé entre la lecture et l'écriture.
    let requete = supabase.from('sites').update({ config }).eq('id', id);
    if (version) requete = requete.eq('updated_at', version);
    ({ data, error } = await requete.select('id, updated_at').maybeSingle());
    if (!error && !data) return { ok: false, conflit: true, message: MESSAGE_CONFLIT, id };
  } else {
    ({ data, error } = await supabase.from('sites').insert({ profession_slug: 'podologue', config }).select('id, updated_at').single());
  }
  if (error || !data) return { ok: false, message: 'Enregistrement impossible. Réessayez.' };

  revalidatePath('/tableau-de-bord');
  return { ok: true, message: 'Enregistré, pas encore en ligne : « Enregistrer et publier » met le site à jour.', id: data.id, version: data.updated_at };
}

/** Enregistre puis republie le site : le site est statique, une modification n'est visible qu'après publication. */
export async function enregistrerEtPublier(id: string | null, draft: SiteDraft, version?: string | null): Promise<EtatEnregistrement> {
  const r = await enregistrerSite(id, draft, version);
  if (!r.ok || !r.id) return r;
  // Le praticien ne publie qu'un site complet ; le super admin peut toujours lancer la publication.
  const aFaire = manques(normaliserDraft(draft));
  if (aFaire.length > 0 && (await getRole()) !== 'admin') {
    return { ...r, ok: false, message: `Enregistré, pas encore en ligne. Il manque : ${aFaire.join(', ')}.` };
  }
  const p = await declencherPublication(r.id);
  return { ...r, ok: p.ok, message: p.ok ? 'Enregistré. Publication lancée : en ligne d’ici 2 à 3 minutes.' : `Enregistré, pas encore en ligne : ${p.message}` };
}
