import 'server-only';
import { compterJours, resumerNotesAssets, type PhotoDeJeu, type Reevaluation, type ResumeNotesAssets } from '@plateforme/core';
import type { NotePourJuge } from '@plateforme/core/juge';
import { getNotesAssetsLegeres } from '@/lib/assets-notes';
import { getNotesAtelierLegeres } from '@/lib/atelier';
import { signatureSources } from '@/lib/apprentissage-instantane';
import { dernieresPourJuge } from '@/lib/predictions';

// Notes de la page « Donner mon avis » (/admin/retours, perf vague 2, 2026-10-10) : résumé par clé envoyé au navigateur
// (retours-resume.ts), notes comparables au juge, compteurs des thèmes complets. Gardés sur l'instance tant que les tables
// assets_notes et atelier_notes n'ont pas changé (compteurs de 0059, augmentés par la base à chaque ajout, modification ou
// suppression) et que les réévaluations et les photos des jeux sont les mêmes : les 20 000 notes (1,6 Mo) ne sont plus relues ni
// résumées à chaque ouverture. Signature lue AVANT les notes : une note ajoutée entre les deux ne peut pas être gardée sous une
// signature plus récente qu'elle. Sans la migration 0059 (signature illisible) ou lecture en échec : rien n'est gardé.

export type NotesRetours = {
  resume: ResumeNotesAssets;
  /** Notes comparables au juge (dernieresNotesJuge) */
  dernieresJuge: NotePourJuge[];
  atelier: { n: number; jours: Record<string, number>; dejaNotees: Record<string, number> };
  migrationAssets: boolean;
  migrationAtelier: boolean;
};

let memo: { signature: string; contexte: string; valeur: NotesRetours } | null = null;

export async function getNotesRetours(lectureReev: Promise<{ reevaluations: Reevaluation[] }>, lecturePhotos: Promise<PhotoDeJeu[]>): Promise<NotesRetours> {
  const signature = await signatureSources(['assets_notes', 'atelier_notes']).catch(() => null);
  const garde = signature && memo?.signature === signature ? memo : null;
  // Notes lues tout de suite si la mémoire ne correspond pas (en même temps que les réévaluations et les photos)
  const lectures = garde ? null : Promise.all([getNotesAssetsLegeres(), getNotesAtelierLegeres()]);
  const [{ reevaluations }, photosJeux] = await Promise.all([lectureReev, lecturePhotos]);
  const contexte = JSON.stringify([reevaluations, photosJeux]);
  if (garde && garde.contexte === contexte) return garde.valeur;
  const [assets, atelier] = await (lectures ?? Promise.all([getNotesAssetsLegeres(), getNotesAtelierLegeres()]));
  const dejaNotees: Record<string, number> = {};
  for (const x of atelier.notes) dejaNotees[x.cle] = (dejaNotees[x.cle] ?? 0) + 1;
  const valeur: NotesRetours = {
    resume: resumerNotesAssets(assets.notes, reevaluations),
    dernieresJuge: dernieresPourJuge(assets.notes.map((n) => ({ cle: n.cle, note: n.note, empreinte: n.empreinte, le: n.le, etiquettes: n.etiquettes })), photosJeux),
    atelier: { n: atelier.notes.length, jours: compterJours(atelier.notes.map((n) => n.le)), dejaNotees },
    migrationAssets: assets.migrationManquante,
    migrationAtelier: atelier.migrationManquante,
  };
  if (signature && !assets.migrationManquante && !atelier.migrationManquante) memo = { signature, contexte, valeur };
  return valeur;
}
