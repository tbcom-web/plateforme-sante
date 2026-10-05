import Link from 'next/link';
import { jeuPhotosDepuisLigne, LIBELLES_SOURCES, normaliserDraft, SPECIALITES } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { COLONNES_JEU } from '@/lib/jeux-photos';
import { getCatalogue } from '@/lib/sites';
import EditeurJeu from './EditeurJeu';

export const metadata = { title: 'Super admin · Jeux de photos' };

export default async function JeuxPhotos() {
  const supabase = await createClient();
  const [{ data, error }, { data: sites }, catalogue] = await Promise.all([
    supabase.from('jeux_photos').select(COLONNES_JEU).order('created_at'),
    supabase.from('sites').select('id, config'),
    getCatalogue(),
  ]);
  const jeux = (data ?? []).map(jeuPhotosDepuisLigne);
  const soins = catalogue.map((s) => ({ slug: s.slug, titre: s.titre_court }));

  // Nombre de sites (tous statuts) auxquels chaque jeu est affecté, et nom des sites des jeux exclusifs.
  const utilisation = new Map<string, number>();
  const nomsSites = new Map<string, string>();
  for (const s of sites ?? []) {
    const d = normaliserDraft(s.config);
    if (d.theme.jeuPhotos) utilisation.set(d.theme.jeuPhotos, (utilisation.get(d.theme.jeuPhotos) ?? 0) + 1);
    nomsSites.set(s.id, d.cabinet.nom || [d.praticiens[0]?.prenom, d.praticiens[0]?.nom].filter(Boolean).join(' ') || s.id);
  }
  const exclusifs = jeux.filter((j) => j.siteId);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold">Jeux de photos</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Un jeu réunit les photos d’un site : accueil, panorama, galerie et, si besoin, une photo par soin. À la création d’un site et à chaque
          changement de spécialité principale, un jeu actif de la spécialité est tiré au hasard ; le praticien ne le choisit pas. Sans jeu actif,
          le site garde les photos intégrées. Les illustrations et animations ne changent pas. Choisissez des photos sans visage.
        </p>
      </div>
      {error && <p className="text-sm text-red-700">Lecture impossible : la base de données n’est pas à jour (mise à jour 0016, jeux de photos, à installer).</p>}

      {SPECIALITES.map((spec) => {
        const partages = jeux.filter((j) => !j.siteId && j.specialite === spec.value);
        const actifs = partages.filter((j) => j.actif).length;
        return (
          <section key={spec.value} className="grid gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-lg font-semibold">{spec.label}</h2>
              <span className="text-sm text-neutral-600">{actifs} jeu(x) actif(s) dans le tirage</span>
            </div>
            {partages.map((j) => (
              <EditeurJeu key={j.id} jeu={j} specialite={spec.value} siteId={null} soins={soins} nbSites={utilisation.get(j.id) ?? 0} />
            ))}
            <EditeurJeu jeu={null} specialite={spec.value} siteId={null} soins={soins} />
          </section>
        );
      })}

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">Jeux exclusifs (photos premium)</h2>
        <p className="max-w-3xl text-sm text-neutral-600">
          Réservés à un seul site, créés depuis la fiche photos du site après signature du contrat. Jamais tirés au sort.
        </p>
        {exclusifs.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucun jeu exclusif.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded-xl border border-black/5 bg-white text-sm">
            {exclusifs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <span className="font-medium">{j.nom}</span>
                <span className="text-neutral-500">{LIBELLES_SOURCES[j.source]}</span>
                {!j.actif && <span className="text-xs text-neutral-500">(inactif)</span>}
                <Link href={`/admin/sites/${j.siteId}`} className="ml-auto text-teal-800 underline-offset-4 hover:underline">
                  {nomsSites.get(j.siteId!) ?? 'Site'} →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
