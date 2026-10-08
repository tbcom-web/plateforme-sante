import Link from 'next/link';
import { debutHashtag, estFamilleTri, estSujetDeVisuel, inventaireAssets, statutsAvecHeritage } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getPhotosDesJeux, getSurchargesSujets } from '@/lib/assets-notes';
import { getHashtagsAssets } from '@/lib/hashtags';
import { getRevuesIllustrations } from '@/lib/illustrations';
import Tri from './Tri';
import { photosARattacher } from '@plateforme/core';
import { getDonneesKits } from '@/lib/kits-images';
import RattacherNotees from '@/components/RattacherNotees';

export const metadata = { title: 'Super admin · Trier par sujet' };

// Tri par sujet (demande de Paul, 2026-10-07 : « améliorer le tagging des ressources par sujet ») : un visuel à la fois, en
// commençant par les non étiquetés ou mal couverts ; gros boutons des sujets (1-8), suggestions pré-cochées en pointillé,
// « Suivant » (Entrée) ; sélection multiple dans une grille ; tableau de couverture par sujet avec ses manques.
// Tables existantes : assets_sujets (0028), assets_hashtags (0029), classement_suggestions (0033). ?hashtag= : filtre par hashtag.
export default async function PageTri({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  const [photosJeux, surcharges, hashtags, revues, donneesKits] = await Promise.all([getPhotosDesJeux(), getSurchargesSujets(), getHashtagsAssets(), getRevuesIllustrations(), getDonneesKits()]);
  const sujet = typeof sp.sujet === 'string' && estSujetDeVisuel(sp.sujet) ? sp.sujet : '';
  const famille = typeof sp.famille === 'string' && estFamilleTri(sp.famille) ? sp.famille : 'tout';
  const vue = sp.vue === 'grille' || sp.vue === 'couverture' ? sp.vue : 'un';
  const hashtag = typeof sp.hashtag === 'string' ? debutHashtag(sp.hashtag).slice(0, 30) : '';
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <p className="text-sm"><Link href="/admin/retours" className="font-semibold text-teal-900 underline">← Donner mon avis</Link></p>
        <h1 className="mt-1 text-2xl font-bold">Trier par sujet</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Un visuel à la fois, les non étiquetés et ceux qui peuvent compléter un sujet mal couvert d’abord. Cochez ses sujets
          (touches 1 à 8 ; en pointillé : suggérés, déjà cochés), ajoutez si besoin des hashtags libres (#laser… : touche #),
          puis Entrée. Le générateur et les sites utilisent ces sujets.
        </p>
      </div>
      {/* Photos notées ≥ 4 ★ sans sujet curé (kits-images.ts) : rattachement en un clic, sujet implicite pré-coché */}
      <RattacherNotees photos={photosARattacher(donneesKits)} />
      <Tri
        photosJeux={photosJeux}
        surcharges={surcharges}
        hashtags={hashtags.hashtags}
        migrationHashtags={hashtags.migrationManquante}
        statuts={statutsAvecHeritage(Object.fromEntries(revues.statuts.map((s) => [s.cle, s.statut])), inventaireAssets({ photosJeux }).map((a) => a.cle))}
        sujetInitial={sujet}
        hashtagInitial={hashtag}
        familleInitiale={famille}
        vueInitiale={vue}
      />
    </div>
  );
}
