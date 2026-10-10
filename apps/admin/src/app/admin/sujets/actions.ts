'use server';

import { revalidatePath } from 'next/cache';
import { baseDeCle, clePhoto, estAssetDuCode, inventaireAssets, LIBELLES_NATURES } from '@plateforme/core';
import { typeIngredient } from '@plateforme/core/arrivages';
import {
  estGesteSujet, noteDuGeste, remarquesDuGeste, statutNouveauteDuGeste, sujetsValidation, type GesteSujet,
} from '@plateforme/core/sujets-validation';
import { exigerAdmin } from '@/lib/admin';
import { contenuActuel } from '@/lib/packs-contenus';
import { getProfession } from '@/lib/profession';
import { assetDeCle } from '@/lib/sujets-validation';
import { createClient, getUser } from '@/lib/supabase/server';
import { accepterArrivage, annulerArrivage, refuserArrivage, retravaillerContenu, type Annulation } from '../arrivages/actions';
import { accepterPhotoDeSerie, annulerSerie, cloreSerie } from '../arrivages/actions-series';
import { ajouterNoteAsset } from '../retours/actions';
import { visuelDe } from '../arrivages/visuels';
import type { VisuelArrivage } from '../arrivages/Arrivages';

// Gestes du point d'entrée « À valider » (packages/core/src/sujets-validation.ts, docs/a-valider.md). AUCUNE TABLE NOUVELLE : chaque
// geste passe par les mécanismes existants —
//   notes        → assets_notes (ajouterNoteAsset : OK 4, J'adore 5, Pas OK 2, second Pas OK 1 ; commentaire → positif / négatif)
//   nouveautés   → illustrations_revues (« accepte » + rattachement au sujet : assets_sujets / assets_hashtags ; « a_retravailler » ;
//                  « retire » au second Pas OK) via les actions des Arrivages
//   photos       → import WebP / « retiree » (actions des Arrivages) ; séries → actions des séries ; textes → actions des contenus
//   validation   → illustrations_revues « valide » : SEULEMENT par le bouton explicite « Valider pour les sites » (validerPourLesSites)

export type RefCarte = {
  id: string;
  kind: 'nouveaute' | 'photo' | 'serie' | 'contenu' | 'element';
  cle: string;
  precedent?: string | null;
  empreinte?: string;
  photoId?: string;
  photosSerie?: string[];
};

export type AnnulationSujet = Annulation | { kind: 'serie'; id: string; photos: string[] } | { kind: 'note' };
export type ResultatGeste = { ok: boolean; message: string; note?: number | null; annulation?: AnnulationSujet; migrationManquante?: boolean };

const VISUELS = new Set(['illustration', 'icone', 'animation', 'photo']);

/** Dernière note et statut de revue de l'élément (« second Pas OK » → 1) */
async function contexteDe(cle: string): Promise<{ derniereNote: number | null; statut: string | null }> {
  const supabase = await createClient();
  const [n, s] = await Promise.all([
    supabase.from('assets_notes').select('note').eq('cle_asset', cle).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('illustrations_statuts').select('statut').eq('cle', cle).maybeSingle(),
  ]);
  return { derniereNote: typeof n.data?.note === 'number' ? n.data.note : null, statut: typeof s.data?.statut === 'string' ? s.data.statut : null };
}

async function revue(cle: string, statut: string, commentaire: string | null) {
  const supabase = await createClient();
  return supabase.from('illustrations_revues').insert({ cle, statut, commentaire, auteur: (await getUser())?.id ?? null });
}

/**
 * Applique un geste sur une carte. `sujet` : identifiant du sujet ouvert (rattachement d'une nouveauté acceptée à son thème et à son
 * activité). « Plus tard » n'écrit rien ici (l'écran passé est journalisé par la politique d'évaluation dans le navigateur).
 */
export async function deciderCarte(carte: RefCarte, geste: GesteSujet, o: { commentaire?: string; etiquettes?: string[]; jamais?: boolean; sujet?: string } = {}): Promise<ResultatGeste> {
  await exigerAdmin();
  if (!estGesteSujet(geste) || !carte || typeof carte.cle !== 'string') return { ok: false, message: 'Geste inconnu.' };
  if (geste === 'plus-tard') return { ok: true, message: 'Plus tard : elle reviendra dans quelques jours.', note: null };
  const profession = await getProfession();
  const sujet = sujetsValidation(profession.id).find((s) => s.id === o.sujet) ?? null;
  const { positif, negatif } = remarquesDuGeste(geste, o.commentaire);
  const etq = (Array.isArray(o.etiquettes) ? o.etiquettes : []).filter((e) => typeof e === 'string').slice(0, 12);
  const aime = geste !== 'pas-ok';

  if (carte.kind === 'contenu') {
    const a = { kind: 'contenu' as const, cle: carte.cle, empreinte: String(carte.empreinte ?? ''), precedent: carte.precedent ?? null };
    if (aime) return accepterArrivage(a, { sujets: [], sujetsProposes: [], hashtags: [], hashtagsProposes: [], note: null });
    if (negatif) return retravaillerContenu(a, negatif);
    return { ok: false, message: 'Dis en quelques mots ce qui ne va pas : le commentaire part à Claude pour retravailler le texte.' };
  }

  if (carte.kind === 'serie') {
    const id = carte.cle.replace(/^serie:/, '');
    if (!aime) {
      const r = await cloreSerie(id, 'refusee');
      return { ...r, annulation: r.ok ? { kind: 'serie', id, photos: [] } : undefined };
    }
    const acceptees: string[] = [];
    const ids: string[] = [];
    for (const c of (carte.photosSerie ?? []).slice(0, 24)) {
      const r = await accepterPhotoDeSerie(id, c);
      if (r.ok) { acceptees.push(c); if (r.id) ids.push(r.id); }
    }
    if (!acceptees.length) return { ok: false, message: 'Aucune photo de la série n’a pu être importée : réessayez, ou ouvrez la vue détaillée.' };
    const r = await cloreSerie(id, 'acceptee', acceptees);
    return { ok: r.ok, message: r.ok ? `Série acceptée : ${acceptees.length} photo${acceptees.length > 1 ? 's' : ''} au frigo.` : r.message, annulation: { kind: 'serie', id, photos: ids } };
  }

  const ctx = carte.kind === 'photo' ? { derniereNote: null, statut: null } : await contexteDe(carte.cle);
  const note = noteDuGeste(geste, { ...ctx, jamais: o.jamais });
  if (note === null) return { ok: true, message: '', note: null };
  const visuel = VISUELS.has(typeIngredient(carte.cle));
  const choix = { sujets: visuel && sujet?.theme ? [sujet.theme] : [], sujetsProposes: [], hashtags: visuel ? sujet?.hashtags ?? [] : [], hashtagsProposes: [], note: null };

  if (carte.kind === 'photo') {
    const id = String(carte.photoId ?? '');
    if (!aime) {
      const r = await refuserArrivage({ kind: 'photo', id });
      return { ...r, note: null };
    }
    const r = await accepterArrivage({ kind: 'photo', id }, choix);
    // Photo supprimée à la source (marquée « retirée » par l'import) : la carte est réglée, on passe à la suivante
    if (!r.ok && /introuvable/i.test(r.message)) return { ok: true, message: 'Photo retirée par son auteur à la source : écartée, carte suivante.', note: null };
    if (!r.ok) return r;
    // Note (et commentaire) sous la clé de la photo hébergée
    const supabase = await createClient();
    const { data } = await supabase.from('photos_libres').select('url').eq('id', id).maybeSingle();
    const cle = data?.url ? clePhoto(data.url) : null;
    const n = cle ? await ajouterNoteAsset(cle, note, etq, '', null, { positif: positif ?? undefined, negatif: negatif ?? undefined }) : null;
    return { ok: true, message: `${r.message}${n?.ok ? '' : ' (note non enregistrée)'}`, note, annulation: r.annulation };
  }

  // Nouveauté du code ou élément du kit : la note d'abord (journal de l'apprentissage)
  const n = await ajouterNoteAsset(carte.cle, note, etq, '', null, { positif: positif ?? undefined, negatif: negatif ?? undefined });
  if (!n.ok) return { ok: false, message: n.message, migrationManquante: n.migrationManquante };
  if (carte.kind === 'nouveaute') {
    const statut = statutNouveauteDuGeste(geste, note);
    const a = { kind: 'nouveaute' as const, cle: carte.cle, precedent: carte.precedent ?? null };
    if (statut === 'accepte') {
      const r = await accepterArrivage(a, choix);
      return { ...r, message: r.ok ? (geste === 'adore' ? 'J’adore : au frigo, rattachée au sujet.' : 'OK : au frigo, rattachée au sujet.') : r.message, note };
    }
    if (statut) {
      const { error } = await revue(carte.cle, statut, negatif ?? (statut === 'retire' ? 'Pas OK, deuxième fois : ne plus montrer (À valider)' : 'Pas OK (À valider)'));
      if (error) return { ok: false, message: 'Enregistrement impossible (migration 0021 ?).' };
      revalidatePath('/admin', 'layout');
      return { ok: true, message: statut === 'retire' ? 'Pas OK, deuxième fois : retirée, elle ne reviendra plus.' : 'Pas OK : à retravailler par Claude.', note, annulation: a };
    }
  }
  revalidatePath('/admin', 'layout');
  return { ok: true, message: note === 1 ? 'Pas OK, deuxième fois : elle ne sera plus montrée.' : '', note, annulation: { kind: 'note' } };
}

/** Annule la dernière décision déjà enregistrée (statut d'arrivage, série) ; une note reste au journal : la redécision la remplace */
export async function annulerDecisionSujet(a: AnnulationSujet): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  if (!a || typeof a !== 'object') return { ok: false, message: 'Rien à annuler.' };
  if (a.kind === 'note') return { ok: true, message: 'Décision annulée : la carte revient (ta prochaine décision remplace la note).' };
  if (a.kind === 'serie') return annulerSerie(a.id, a.photos);
  return annulerArrivage(a);
}

/**
 * « Valider pour les sites » (geste EXPLICITE de Paul en fin de sujet) : statut « Validé » (illustrations_revues) pour les éléments
 * du code qu'il a trouvés OK ; jamais appelé automatiquement. 200 au plus.
 */
export async function validerPourLesSites(cles: string[]): Promise<{ ok: boolean; message: string; n?: number }> {
  await exigerAdmin();
  const connues = new Set(inventaireAssets().map((a) => baseDeCle(a.cle)).filter((k): k is string => Boolean(k)));
  const l = [...new Set((Array.isArray(cles) ? cles : []).filter((k) => typeof k === 'string' && (estAssetDuCode(k) || connues.has(k))))].slice(0, 200);
  if (!l.length) return { ok: false, message: 'Rien à valider.' };
  const supabase = await createClient();
  const auteur = (await getUser())?.id ?? null;
  const { error } = await supabase.from('illustrations_revues').insert(l.map((cle) => ({ cle, statut: 'valide', commentaire: 'Validé pour les sites (À valider, geste de Paul)', auteur })));
  if (error) return { ok: false, message: 'Enregistrement impossible (migration 0021 ?).' };
  revalidatePath('/admin', 'layout');
  return { ok: true, message: `${l.length} élément${l.length > 1 ? 's' : ''} validé${l.length > 1 ? 's' : ''} pour les sites.`, n: l.length };
}

/** Aperçus de cartes chargés à l'avance (24 au plus) : SVG, image, élément du studio, texte d'un pack */
export async function visuelsCartes(cles: string[]): Promise<Record<string, VisuelArrivage>> {
  await exigerAdmin();
  const l = (Array.isArray(cles) ? cles : []).filter((k) => typeof k === 'string').slice(0, 24);
  return Object.fromEntries(await Promise.all(l.map(async (k) => [k, await visuelCarte(k)] as const)));
}

const CHAMPS: Record<string, string> = { ville: 'Lyon', cabinet: 'Cabinet Rousseau', praticien: 'Camille Rousseau' };

/** Aperçu d'une clé (élément du code, ou texte d'un pack) */
export async function visuelCarte(cle: string): Promise<VisuelArrivage> {
  await exigerAdmin();
  if (cle.startsWith('contenu:')) {
    const c = await contenuActuel(cle);
    if (!c) return { kind: 'aucun' };
    return { kind: 'contenu', contenu: { titre: c.titre.replace(/\{([a-z_]+)\}/g, (m, k: string) => CHAMPS[k] ?? m), chapo: c.chapo ?? null, nature: LIBELLES_NATURES[c.nature] ?? c.nature, blocs: c.blocs, sources: c.sourcesDetail, erreurs: c.erreurs, avertissements: c.avertissements, modifie: Boolean(c.precedent && c.precedent !== 'a_revoir') } };
  }
  return visuelDe(assetDeCle(cle));
}
