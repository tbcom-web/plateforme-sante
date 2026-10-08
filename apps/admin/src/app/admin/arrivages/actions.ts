'use server';

import { revalidatePath } from 'next/cache';
import {
  cleCandidatePhoto, clePhoto, clesUnitairesInventaire, estSourcePhotoLibre, estSujetDeVisuel, hashtagsValides, type SourcePhotoLibre,
} from '@plateforme/core';
import { statutAnnulation } from '@plateforme/core/arrivages';
import { estCleContenu, STATUT_GESTE_CONTENU } from '@plateforme/core';
import { contenuActuel } from '@/lib/packs-contenus';
import { exigerAdmin } from '@/lib/admin';
import { createClient, getUser } from '@/lib/supabase/server';
import { changerStatutPhotoLibre, importerPhotoLibre } from '../photos/actions';
import { deciderPhoto } from '../retours/actions-photos';
import { ajouterNoteAsset } from '../retours/actions';

// Arrivages (/admin/arrivages, packages/core/src/arrivages.ts) : ACCEPTER, REFUSER, ANNULER la dernière décision. Aucune table
// nouvelle : photos → mécanismes de « Photos à découvrir » et de « Jeux de photos » (Garder, import WebP, statuts) ; nouveautés du
// code → journal des revues (illustrations_revues, statut « accepte » de la migration 0044, « retire ») ; thèmes et hashtags →
// assets_sujets / assets_hashtags (ajouts et retraits par rapport aux valeurs proposées) ; note rapide → assets_notes.

const MIGRATION_ACCEPTE = 'Migration 0044 à exécuter (supabase/migrations/0044_statut_accepte.sql) : « Accepter » sans note ne peut pas encore être enregistré. Donnez une note rapide, ou exécutez la migration.';

export type Choix = {
  /** Thèmes cochés et proposés au départ (les différences sont enregistrées) */
  sujets: string[]; sujetsProposes: string[];
  hashtags: string[]; hashtagsProposes: string[];
  /** Note rapide facultative (1 à 5) */
  note?: number | null;
};

export type Arrivage =
  | { kind: 'nouveaute'; cle: string; precedent: string | null }
  | { kind: 'photo'; id: string }
  | { kind: 'candidate'; source: string; idSource: string; requete: string }
  /** Texte d'un pack de contenus (contenus-revue.ts) : empreinte du texte affiché */
  | { kind: 'contenu'; cle: string; empreinte: string; precedent: string | null };

/** Ce qu'il faut pour annuler la décision (renvoyé au navigateur, rejoué par annulerArrivage) */
export type Annulation =
  | { kind: 'nouveaute'; cle: string; precedent: string | null }
  | { kind: 'photo'; id: string }
  | { kind: 'rejet-candidate' }
  | { kind: 'contenu'; cle: string; empreinte: string }
  | { kind: 'lot'; elements: { cle: string; precedent: string | null }[] };

export type Resultat = { ok: boolean; message: string; annulation?: Annulation; migrationManquante?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let connues: Set<string> | null = null;
const estNouveauteConnue = (cle: unknown): cle is string => typeof cle === 'string' && (connues ??= new Set(clesUnitairesInventaire())).has(cle);

const valides = (sujets: unknown) => (Array.isArray(sujets) ? sujets : []).filter((s, i, l): s is string => estSujetDeVisuel(s) && l.indexOf(s) === i).slice(0, 12);

/** Thèmes et hashtags : seulement les différences avec les valeurs proposées (journaux en ajout seul) */
async function enregistrerClassement(cle: string, c: Choix): Promise<string> {
  const supabase = await createClient();
  const auteur = (await getUser())?.id ?? null;
  const sujets = valides(c.sujets), proposes = valides(c.sujetsProposes);
  const lignesSujets = [
    ...sujets.filter((s) => !proposes.includes(s)).map((s) => ({ cle_asset: cle, sujet: s, action: 'ajout', auteur })),
    ...proposes.filter((s) => !sujets.includes(s)).map((s) => ({ cle_asset: cle, sujet: s, action: 'retrait', auteur })),
  ];
  const tags = hashtagsValides(c.hashtags), tagsProposes = hashtagsValides(c.hashtagsProposes);
  const lignesTags = [
    ...tags.filter((h) => !tagsProposes.includes(h)).map((h) => ({ cle_asset: cle, hashtag: h, action: 'ajout', auteur })),
    ...tagsProposes.filter((h) => !tags.includes(h)).map((h) => ({ cle_asset: cle, hashtag: h, action: 'retrait', auteur })),
  ];
  let manque = '';
  if (lignesSujets.length && (await supabase.from('assets_sujets').insert(lignesSujets)).error) manque += ' Thèmes non enregistrés (migration 0028).';
  if (lignesTags.length && (await supabase.from('assets_hashtags').insert(lignesTags)).error) manque += ' Hashtags non enregistrés (migration 0029).';
  return manque;
}

/** Revue d'une nouveauté du code (journal 0021 ; le statut courant suit par déclencheur) */
async function revue(cle: string, statut: string, commentaire: string | null, empreinte: string | null = null) {
  const supabase = await createClient();
  const auteur = (await getUser())?.id ?? null;
  return supabase.from('illustrations_revues').insert({ cle, statut, commentaire, auteur, ...(empreinte ? { empreinte } : {}) });
}

/** Contenu d'un pack : la décision porte sur le texte affiché, qui doit être encore le texte actuel */
async function contenuVerifie(a: { cle: string; empreinte: string }): Promise<string | null> {
  if (!estCleContenu(a.cle) || !/^[0-9a-f]{8}$/.test(String(a.empreinte))) return 'Contenu inconnu.';
  const c = await contenuActuel(a.cle);
  if (!c) return 'Contenu inconnu.';
  if (c.empreinte !== a.empreinte) return 'Ce texte a changé depuis l’affichage : rechargez la page.';
  return null;
}

const noteValide = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;

function revalider() {
  revalidatePath('/admin', 'layout');
}

export async function accepterArrivage(a: Arrivage, c: Choix): Promise<Resultat> {
  await exigerAdmin();
  if (a?.kind === 'nouveaute') {
    if (!estNouveauteConnue(a.cle)) return { ok: false, message: 'Élément inconnu.' };
    const manque = await enregistrerClassement(a.cle, c);
    let noteOk = false;
    if (noteValide(c.note)) noteOk = (await ajouterNoteAsset(a.cle, c.note, [], '', null)).ok;
    const { error } = await revue(a.cle, 'accepte', 'Accepté (Arrivages)');
    if (error && !noteOk) return { ok: false, message: MIGRATION_ACCEPTE, migrationManquante: true };
    revalider();
    return { ok: true, message: `Accepté : au frigo${noteOk ? `, ${c.note} ★` : ''}.${manque}`, annulation: { kind: 'nouveaute', cle: a.cle, precedent: a.precedent } };
  }
  if (a?.kind === 'contenu') {
    const e = await contenuVerifie(a);
    if (e) return { ok: false, message: e };
    const { error } = await revue(a.cle, STATUT_GESTE_CONTENU.accepter, 'Accepté : bon pour publication (Arrivages)', a.empreinte);
    if (error) return { ok: false, message: 'Enregistrement impossible (migration 0021 ?).' };
    revalider();
    return { ok: true, message: 'Accepté : bon pour publication.', annulation: { kind: 'contenu', cle: a.cle, empreinte: a.empreinte } };
  }
  if (a?.kind === 'photo') {
    if (!UUID.test(a.id)) return { ok: false, message: 'Photo inconnue.' };
    const supabase = await createClient();
    const { data: p } = await supabase.from('photos_libres').select('source, id_source, url').eq('id', a.id).maybeSingle();
    if (!p) return { ok: false, message: 'Photo introuvable.' };
    // Thèmes et hashtags sous la clé de la photo hébergée, sinon sous celle de la candidate (recopiés à l'import)
    const cle = (p.url && clePhoto(p.url)) || (estSourcePhotoLibre(p.source) ? cleCandidatePhoto(p.source, p.id_source) : null);
    const manque = cle ? await enregistrerClassement(cle, c) : '';
    // Déjà hébergée (image générée importée, photo importée remise en attente) : validée telle quelle ; sinon import WebP
    const r = p.url ? await changerStatutPhotoLibre(a.id, 'validee') : await importerPhotoLibre(a.id);
    if (!r?.ok) return { ok: false, message: r?.message ?? 'Échec.' };
    let note = '';
    if (noteValide(c.note)) {
      const { data: q } = await supabase.from('photos_libres').select('url').eq('id', a.id).maybeSingle();
      const cleFinale = q?.url ? clePhoto(q.url) : null;
      note = cleFinale && (await ajouterNoteAsset(cleFinale, c.note, [], '', null)).ok ? ` ${c.note} ★.` : ' Note non enregistrée.';
    }
    revalider();
    return { ok: true, message: `Acceptée : au frigo, hébergée chez nous.${note}${manque}`, annulation: { kind: 'photo', id: a.id } };
  }
  if (a?.kind === 'candidate') {
    if (!estSourcePhotoLibre(a.source)) return { ok: false, message: 'Source inconnue.' };
    const sujets = valides(c.sujets);
    const g = await deciderPhoto({ source: a.source, idSource: a.idSource, decision: 'garder', etiquettes: [], sujets, hashtags: hashtagsValides(c.hashtags), requete: a.requete });
    if (!g.ok) return { ok: false, message: g.message };
    const supabase = await createClient();
    const { data: p } = await supabase.from('photos_libres').select('id').eq('source', a.source as SourcePhotoLibre).eq('id_source', a.idSource).maybeSingle();
    if (!p?.id) return { ok: false, message: 'Gardée, mais introuvable pour l’import : terminez dans Jeux de photos.' };
    const r = await importerPhotoLibre(p.id);
    if (!r?.ok) return { ok: false, message: `Gardée, import impossible : ${r?.message ?? ''}`, annulation: { kind: 'photo', id: p.id } };
    let note = '';
    if (noteValide(c.note)) {
      const { data: q } = await supabase.from('photos_libres').select('url').eq('id', p.id).maybeSingle();
      const cleFinale = q?.url ? clePhoto(q.url) : null;
      note = cleFinale && (await ajouterNoteAsset(cleFinale, c.note, [], '', null)).ok ? ` ${c.note} ★.` : ' Note non enregistrée.';
    }
    revalider();
    return { ok: true, message: `Acceptée : importée (WebP, sans métadonnées), au frigo.${note}`, annulation: { kind: 'photo', id: p.id } };
  }
  return { ok: false, message: 'Arrivage inconnu.' };
}

export async function refuserArrivage(a: Arrivage): Promise<Resultat> {
  await exigerAdmin();
  if (a?.kind === 'contenu') {
    const e = await contenuVerifie(a);
    if (e) return { ok: false, message: e };
    const { error } = await revue(a.cle, STATUT_GESTE_CONTENU.refuser, 'Refusé (Arrivages)', a.empreinte);
    if (error) return { ok: false, message: 'Enregistrement impossible (migration 0021 ?).' };
    revalider();
    return { ok: true, message: 'Refusé : jamais publié.', annulation: { kind: 'contenu', cle: a.cle, empreinte: a.empreinte } };
  }
  if (a?.kind === 'nouveaute') {
    if (!estNouveauteConnue(a.cle)) return { ok: false, message: 'Élément inconnu.' };
    const { error } = await revue(a.cle, 'retire', 'Refusé (Arrivages)');
    if (error) return { ok: false, message: 'Enregistrement impossible (migration 0021 ?).' };
    revalider();
    return { ok: true, message: 'Refusé : jamais utilisé par le générateur.', annulation: { kind: 'nouveaute', cle: a.cle, precedent: a.precedent } };
  }
  if (a?.kind === 'photo') {
    const r = await changerStatutPhotoLibre(a.id, 'retiree');
    if (!r?.ok) return { ok: false, message: r?.message ?? 'Échec.' };
    revalider();
    return { ok: true, message: 'Refusée (traçabilité de la licence conservée).', annulation: { kind: 'photo', id: a.id } };
  }
  if (a?.kind === 'candidate') {
    const r = await deciderPhoto({ source: a.source, idSource: a.idSource, decision: 'rejeter', etiquettes: [], sujets: [], requete: a.requete });
    if (!r?.ok) return { ok: false, message: r?.message ?? 'Échec.' };
    return { ok: true, message: 'Refusée : elle ne sera plus proposée.', annulation: { kind: 'rejet-candidate' } };
  }
  return { ok: false, message: 'Arrivage inconnu.' };
}

/** Annule la dernière décision : nouveauté → statut précédent (sinon « À revoir », de nouveau en attente) ; photo → « à valider » */
export async function annulerArrivage(x: Annulation): Promise<Resultat> {
  await exigerAdmin();
  if (x?.kind === 'nouveaute') {
    if (!estNouveauteConnue(x.cle)) return { ok: false, message: 'Élément inconnu.' };
    const { error } = await revue(x.cle, statutAnnulation(x.precedent), 'Décision annulée (Arrivages)');
    if (error) return { ok: false, message: 'Annulation impossible.' };
    revalider();
    return { ok: true, message: 'Décision annulée : de nouveau dans les arrivages (une note rapide déjà donnée reste enregistrée).' };
  }
  if (x?.kind === 'photo') {
    const r = await changerStatutPhotoLibre(x.id, 'a_valider');
    if (!r?.ok) return { ok: false, message: r?.message ?? 'Échec.' };
    revalider();
    return { ok: true, message: 'Décision annulée : la photo attend de nouveau (elle reste hébergée si elle a été importée).' };
  }
  if (x?.kind === 'contenu') {
    if (!estCleContenu(x.cle) || !/^[0-9a-f]{8}$/.test(String(x.empreinte))) return { ok: false, message: 'Contenu inconnu.' };
    const { error } = await revue(x.cle, 'a_revoir', 'Décision annulée (Arrivages)', x.empreinte);
    if (error) return { ok: false, message: 'Annulation impossible.' };
    revalider();
    return { ok: true, message: 'Décision annulée : de nouveau dans les arrivages.' };
  }
  if (x?.kind === 'lot') {
    const l = (Array.isArray(x.elements) ? x.elements : []).filter((e) => estNouveauteConnue(e?.cle)).slice(0, 500);
    if (!l.length) return { ok: false, message: 'Rien à annuler.' };
    const supabase = await createClient();
    const auteur = (await getUser())?.id ?? null;
    const { error } = await supabase.from('illustrations_revues').insert(l.map((e) => ({ cle: e.cle, statut: statutAnnulation(e.precedent), commentaire: 'Décision du lot annulée (Arrivages)', auteur })));
    if (error) return { ok: false, message: 'Annulation impossible.' };
    revalider();
    return { ok: true, message: `Décision du lot annulée : ${l.length} élément${l.length > 1 ? 's' : ''} de nouveau dans les arrivages.` };
  }
  if (x?.kind === 'rejet-candidate') return { ok: true, message: 'Remise dans la file de cette séance (le refus reste noté chez la source : « Accepter » le remplace).' };
  return { ok: false, message: 'Rien à annuler.' };
}

/** « À retravailler » d'un contenu : commentaire obligatoire, exporté vers retours/ (SYNTHESE.md, contenus à retravailler) */
export async function retravaillerContenu(a: { cle: string; empreinte: string; precedent: string | null }, commentaire: string): Promise<Resultat> {
  await exigerAdmin();
  const e = await contenuVerifie(a);
  if (e) return { ok: false, message: e };
  const texte = String(commentaire ?? '').trim().slice(0, 4000);
  if (texte.length < 3) return { ok: false, message: 'Dites ce qu’il faut retravailler (le commentaire part à Claude).' };
  const { error } = await revue(a.cle, STATUT_GESTE_CONTENU.retravailler, texte, a.empreinte);
  if (error) return { ok: false, message: 'Enregistrement impossible (migration 0021 ?).' };
  revalider();
  return { ok: true, message: 'À retravailler : commentaire envoyé à Claude avec le prochain export.', annulation: { kind: 'contenu', cle: a.cle, empreinte: a.empreinte } };
}

/** « Tout accepter » / « Tout refuser » d'un lot de nouveautés (confirmé dans le navigateur) ; 500 éléments au plus */
export async function deciderLot(elements: { cle: string; precedent: string | null }[], geste: 'accepter' | 'refuser'): Promise<Resultat> {
  await exigerAdmin();
  if (geste !== 'accepter' && geste !== 'refuser') return { ok: false, message: 'Geste inconnu.' };
  const l = (Array.isArray(elements) ? elements : []).filter((e) => estNouveauteConnue(e?.cle)).slice(0, 500).map((e) => ({ cle: e.cle, precedent: typeof e.precedent === 'string' ? e.precedent : null }));
  if (!l.length) return { ok: false, message: 'Lot vide.' };
  const supabase = await createClient();
  const auteur = (await getUser())?.id ?? null;
  const statut = geste === 'accepter' ? 'accepte' : 'retire';
  const { error } = await supabase.from('illustrations_revues').insert(l.map((e) => ({ cle: e.cle, statut, commentaire: `${geste === 'accepter' ? 'Accepté' : 'Refusé'} avec son lot (Arrivages)`, auteur })));
  if (error) return { ok: false, message: geste === 'accepter' ? MIGRATION_ACCEPTE : 'Enregistrement impossible (migration 0021 ?).', migrationManquante: geste === 'accepter' };
  revalider();
  return { ok: true, message: `${l.length} élément${l.length > 1 ? 's' : ''} ${geste === 'accepter' ? 'accepté' : 'refusé'}${l.length > 1 ? 's' : ''}.`, annulation: { kind: 'lot', elements: l } };
}
