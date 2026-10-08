import Link from 'next/link';
import { composerKit, compteurKit, emplacementsAFaire, libelleSujetKit, suggestionsBanque, SUJETS_KITS, universDuParcours } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getDonneesKits, getEnAttenteKits, getNotesKits, getRefusKits, getRequetesPhotos } from '@/lib/kits-images';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import { createClient } from '@/lib/supabase/server';
import Kits from './Kits';

export const metadata = { title: 'Super admin · Kits d’images' };

// Kits d'images par sujet (demande de Paul du 2026-10-08, packages/core/src/kits-images.ts) : composés en direct depuis Supabase
// (photos notées, sujets, hashtags, poids appris ; jamais une photo ≤ 2 ★, retirée ou à retravailler). Planche, aperçus ordinateur
// et téléphone d'un site d'exemple, trous, « Noter ce kit » / « Garder ce kit », « Autre kit ».
export default async function PageKits({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const sujet = (SUJETS_KITS as readonly string[]).includes(un(sp.sujet)) ? un(sp.sujet) : 'enfant';
  const rang = Math.max(0, Math.min(99, Number.parseInt(un(sp.rang), 10) || 0));
  const [d, notes, modeles, catalogue, marquesImportees, { univers }] = await Promise.all([getDonneesKits(), getNotesKits(), getModelesDisponibles(), getCatalogue(), getMarquesImportees(), getUnivers()]);
  // Table présente ? (sinon : notes gardées dans le navigateur)
  const supabase = await createClient();
  const { error } = await supabase.from('kits_images_notes').select('id').limit(1);
  const resume = SUJETS_KITS.map((s) => { const k = composerKit(s, d, 0); return { sujet: s, libelle: libelleSujetKit(s), note: k.noteMoyenne, trous: k.trous.length, photos: k.photos.length, garde: k.garde }; });
  const kit = composerKit(sujet, d, rang);
  // Compléter ce kit (suggestions-kits.ts) : emplacements vides ou faibles, suggestions de la banque, photos en attente d'import
  const [refus, requetes, enAttente] = await Promise.all([getRefusKits(), getRequetesPhotos(), getEnAttenteKits()]);
  const soins = d.soins?.[sujet] ?? [];
  const aFaire = emplacementsAFaire(kit, soins).map((e) => ({ ...e, banque: suggestionsBanque(kit, e.emplacement, { ...d, requetes }, refus, 6) }));
  const compteur = compteurKit(kit, soins);
  const notesSujet = notes.filter((n) => n.sujet === sujet);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <p className="text-sm"><Link href="/admin/retours" className="font-semibold text-teal-900 underline">← Donner mon avis</Link></p>
        <h1 className="mt-1 text-2xl font-bold">Kits d’images</h1>
        <p className="mt-1 hidden max-w-3xl text-sm text-neutral-600 md:block">
          Pour chaque sujet, le système compose un kit à partir de vos notes et de vos étiquettes : photo du premier écran, page sujet,
          une photo par soin (étiquetée #nom-du-soin), galerie du cabinet. Jamais une photo notée 2 ★ ou moins, retirée ou à retravailler.
          Le kit sert partout où une recette est en style « Photos » (Studio, atelier, recettes à noter, parcours, sites).
        </p>
      </div>
      {error && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration à exécuter (<code>supabase/migrations/0039_kits_images.sql</code>) : les kits sont composés, mais vos notes restent dans ce navigateur.
        </p>
      )}
      <Kits
        sujet={sujet}
        rang={rang}
        kit={kit}
        aFaire={aFaire}
        compteur={compteur.texte}
        enAttente={enAttente.filter((x) => x.sujet === sujet)}
        resume={resume}
        notes={notesSujet.map((n) => ({ note: n.note, garder: n.garder, le: n.le }))}
        migrationManquante={Boolean(error)}
        proposes={universDuParcours(univers)}
        modeles={modeles}
        catalogue={catalogue}
        marquesImportees={marquesImportees}
        themesActives={themesActives()}
      />
    </div>
  );
}
