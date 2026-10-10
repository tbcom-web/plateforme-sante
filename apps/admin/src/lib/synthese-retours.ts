import 'server-only';
import {
  inventaireAssets, markdownAnimationsEnAttente, markdownAssets, markdownAtelier, markdownHashtags, markdownSujets, sujetsSansVisuel, syntheseAssets,
  syntheseAtelier, titresAssets, titresBases,
} from '@plateforme/core';
import { getNotesAtelier } from '@/lib/atelier';
import { getNotesAssets, getPhotosDesJeux, getSurchargesSujets } from '@/lib/assets-notes';
import { getRevuesIllustrations } from '@/lib/illustrations';
import { getHashtagsAssets } from '@/lib/hashtags';

// Synthèse Markdown « Copier mes retours » (/admin/retours) préparée À LA DEMANDE (perf vague 2, 2026-10-10) : avant, chaque
// ouverture de la page lisait toutes les notes avec leurs commentaires (4,7 Mo au volume ×10), calculait la synthèse et l'envoyait
// au navigateur (≈ 2 Mo) même si personne ne copiait. Même texte qu'avant (mêmes lectures, mêmes fonctions du core).
export async function markdownRetours(): Promise<string> {
  const [assets, atelier, revues, photosJeux, surchargesSujets, hashtags] = await Promise.all([
    getNotesAssets(), getNotesAtelier(), getRevuesIllustrations(), getPhotosDesJeux(), getSurchargesSujets(), getHashtagsAssets(),
  ]);
  const titres = { ...titresBases(titresAssets()), ...titresAssets() };
  const statuts = revues.statuts.map((s) => {
    const r = revues.revues.find((x) => x.cle === s.cle && x.commentaire);
    return { cle: s.cle, statut: s.statut, commentaire: r?.commentaire ?? null, le: s.majLe };
  });
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  const markdown = [
    markdownAssets(syntheseAssets(assets.notes, { statuts, titres }), { date, titre: '# Retours sur les assets' }),
    '',
    markdownAtelier(syntheseAtelier(atelier.notes), { date }),
    '',
    markdownSujets(surchargesSujets, { titres, sansVisuel: sujetsSansVisuel(inventaireAssets({ photosJeux }), surchargesSujets) }),
    '',
    markdownAnimationsEnAttente(Object.fromEntries(revues.statuts.map((s) => [s.cle, s.statut]))),
  ].join('\n');
  return `${markdown}\n\n${markdownHashtags(hashtags.hashtags, { titres })}`;
}
