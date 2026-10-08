import Link from 'next/link';
import { inventaireAssets, sujetsDuVisuel, sujetsEffectifs } from '@plateforme/core';
import { prioriteTags } from '@plateforme/core/propositions-claude-tags';
import { exigerAdmin } from '@/lib/admin';
import { getNotesAssets, getPhotosDesJeux, getSurchargesSujets } from '@/lib/assets-notes';
import { getHashtagsAssets } from '@/lib/hashtags';
import { getPropositionsTags } from '@/lib/propositions-tags';
import PropositionsTags, { type ElementPropose } from './PropositionsTags';

export const metadata = { title: 'Super admin · Propositions de Claude' };

// Propositions de tags de Claude (demande de Paul, 2026-10-08 : « Peux-tu les taguer à ma place, et éventuellement noter les
// meilleurs éléments ? ») : retours/propositions-claude-tags.json, chaque visuel regardé par Claude. Sujets, activités, professions
// et hashtags PRÉ-COCHÉS (style « proposé par Claude ») ; rien n'est enregistré sans le clic de Paul (actions.ts). La note
// prédite s'affiche « Claude prédit 4 ★ » et sert seulement à l'ordre de la file : jamais une note de Paul.
export default async function PagePropositionsClaude() {
  await exigerAdmin();
  const [lot, photosJeux, surcharges, hashtags, notes] = await Promise.all([getPropositionsTags(), getPhotosDesJeux(), getSurchargesSujets(), getHashtagsAssets(), getNotesAssets()]);
  const inventaire = new Map(inventaireAssets({ photosJeux }).map((a) => [a.cle, a]));
  const notees = new Set(notes.notes.map((n) => n.cle));
  const elements: ElementPropose[] = lot.propositions.map((p) => {
    const a = inventaire.get(p.cle);
    const sujets = a ? sujetsDuVisuel({ cle: a.cle, type: a.type, soins: a.soins }, surcharges).sujets : sujetsEffectifs([], surcharges[p.cle]).sujets;
    const tags = hashtags.hashtags[p.cle] ?? [];
    return { p, sujetsActuels: sujets, hashtagsActuels: tags, priorite: prioriteTags(p.cle, { sujets: { [p.cle]: sujets }, hashtags: { [p.cle]: tags } }), dejaNote: notees.has(p.cle) };
  });
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <p className="text-sm"><Link href="/admin/frigo/tri" className="font-semibold text-teal-900 underline">← Trier par sujet</Link></p>
        <h1 className="mt-1 text-2xl font-bold">Propositions de Claude</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Claude a regardé chaque visuel et propose ses sujets, activités, professions et hashtags (pré-cochés, en pointillé violet).
          Décochez ou corrigez, puis validez : seuls les tags cochés sont enregistrés, à votre nom. « Claude prédit 4 ★ » n’est pas
          votre note : elle sert seulement à vous montrer d’abord les plus prometteurs.
        </p>
        <p className="mt-1 text-xs text-neutral-500">Profil de goût {lot.profil ?? '—'} · propositions du {lot.le ?? '—'} · {lot.propositions.length} visuels</p>
      </div>
      {hashtags.migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Migration 0029 à exécuter : les hashtags ne peuvent pas être enregistrés.</p>}
      <PropositionsTags elements={elements} photosJeux={photosJeux} urlStockage={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} />
    </div>
  );
}
