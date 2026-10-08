import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  kitDuProfil, profilsCiblesParDefaut, profilsDePratique, scenarioDeRecette, universDuParcours, verifierPublicationRecette, visuelsDeLActivite,
} from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getDonneesKits, getDonneesVisuels } from '@/lib/kits-images';
import { getMarquesImportees } from '@/lib/marques';
import { getModelesDisponibles } from '@/lib/modeles';
import { getRecettes } from '@/lib/recettes';
import { getCatalogue } from '@/lib/sites';
import { themesActives } from '@/lib/themes';
import { getUnivers } from '@/lib/univers';
import { getContexteVerification, getPublications, MIGRATION_PUBLICATIONS, professionAdmin } from '@/lib/profils';
import Publier from './Publier';

export const metadata = { title: 'Super admin · Publier une recette' };

// « Publier pour les praticiens » (publication-recettes.ts, migration 0043) : profils cibles (pré-cochés d'après le scénario de la
// recette), aperçu « ce que verra un praticien <profil> » avec SON kit (visuels validés seulement), Publier / Dépublier, ordre
// manuel facultatif. Une recette qui contient un élément « à valider » n'est jamais publiée : liste des éléments, chacun avec son lien.
export default async function PagePublier({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const [profession, { recettes }, { publications, migrationManquante }, ctx, dk, dv, catalogue, modeles, marquesImportees, { univers }] = await Promise.all([
    professionAdmin(), getRecettes(), getPublications(), getContexteVerification(), getDonneesKits(), getDonneesVisuels(), getCatalogue(), getModelesDisponibles(), getMarquesImportees(), getUnivers(),
  ]);
  const recette = recettes.find((r) => r.id === un(sp.recette));
  if (!recette) notFound();
  const profils = profilsDePratique(profession.id);
  const publication = publications.find((p) => p.recette === recette.id) ?? null;
  const parDefaut = publication?.publiee ? publication.profils : profilsCiblesParDefaut(scenarioDeRecette(recette), profession.id);
  const verification = verifierPublicationRecette(recette, ctx);
  // Kit de chaque profil, vu par un PRATICIEN (éléments validés seulement), activité n° 1
  const kits = Object.fromEntries(profils.map((p) => {
    const k = kitDuProfil(p, { visuels: dv, photos: dk }, { praticien: true });
    const v = visuelsDeLActivite(k);
    return [p.id, { ...v, compte: { photos: (k.activites[0]?.familles.photo ?? k.generique.photo).length, illustrations: (k.activites[0]?.familles.illustration ?? k.generique.illustration).length, icones: (k.activites[0]?.familles.icone ?? k.generique.icone).length, animations: (k.activites[0]?.familles.animation ?? k.generique.animation).length } }];
  }));
  const profilApercu = profils.find((p) => p.id === un(sp.profil) && parDefaut.includes(p.id))?.id ?? parDefaut[0] ?? profils[0].id;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div>
        <p className="text-sm"><Link href={`/admin/profils?profil=${profilApercu}`} className="font-semibold text-teal-900 underline">← Profils de pratique</Link></p>
        <h1 className="mt-1 text-2xl font-bold">Publier pour les praticiens</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">« {recette.nom} » · {recette.note ? `${recette.note} ★` : 'non notée'}. Les praticiens des profils cochés la verront en tête de l’étape « Votre site », avec le kit de leur profil.</p>
      </div>
      {migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_PUBLICATIONS}</p>}
      <Publier
        recette={recette}
        profils={profils}
        parDefaut={parDefaut}
        profilApercu={profilApercu}
        publication={publication}
        verification={verification}
        kits={kits}
        catalogue={catalogue}
        modeles={modeles}
        marquesImportees={marquesImportees}
        proposes={universDuParcours(univers)}
        themesActives={themesActives()}
        migrationManquante={migrationManquante}
      />
    </div>
  );
}
