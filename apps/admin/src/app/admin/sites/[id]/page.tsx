import Link from 'next/link';
import { notFound } from 'next/navigation';
import { elementsDuSite, jeuPhotosAutorise, jeuPhotosDepuisLigne, normaliserDraft, notesElements, qualiteCles, specialite as specialiteDe } from '@plateforme/core';
import { getLignesAssetsApprentissage } from '@/lib/notation-recettes';
import { createClient } from '@/lib/supabase/server';
import { COLONNES_JEU, UUID } from '@/lib/jeux-photos';
import { getCatalogue } from '@/lib/sites';
import EditeurJeu, { PlancheContact } from '../../photos/EditeurJeu';
import type { Licence } from '../../photos/actions';
import PhotosSite from './PhotosSite';
import { STATUTS, type Statut } from '@/lib/libelles';

export const metadata = { title: 'Super admin · Photos du site' };

// Fiche photos d'un site : jeu affecté (tiré au hasard ou choisi par l'admin), option « photos premium »
// (contrat signé, validée par la commerciale) et jeux exclusifs du site avec leurs licences Adobe Stock.
export default async function PhotosDuSite({ params }: PageProps<'/admin/sites/[id]'>) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: site } = await supabase.from('sites').select('id, statut, options, config').eq('id', id).maybeSingle();
  if (!site) notFound();

  const d = normaliserDraft(site.config);
  const premium = Boolean((site.options as { photosPremium?: boolean } | null)?.photosPremium);
  const [{ data: lignes, error }, { data: lignesLicences }, catalogue] = await Promise.all([
    supabase.from('jeux_photos').select(COLONNES_JEU).or(`site_id.is.null,site_id.eq.${id}`).order('created_at'),
    supabase.from('licences_photos').select('photo_url, reference_licence, date_achat, transferee_au_client, notes').eq('site_id', id),
    getCatalogue(),
  ]);
  const jeux = (lignes ?? []).map(jeuPhotosDepuisLigne);
  const soins = catalogue.map((s) => ({ slug: s.slug, titre: s.titre_court }));
  const disponibles = jeux.filter((j) => jeuPhotosAutorise(j, id, d.theme.specialite));
  const exclusifs = jeux.filter((j) => j.siteId === id);
  const affecte = jeux.find((j) => j.id === d.theme.jeuPhotos) ?? null;
  const licences: Record<string, Licence> = Object.fromEntries(
    (lignesLicences ?? []).map((l) => [l.photo_url, { reference: l.reference_licence, dateAchat: l.date_achat ?? '', transferee: l.transferee_au_client, notes: l.notes }]),
  );
  // Objectif « 100 % 4-5 ★ » (qualite.ts) : part des éléments du site notés 4-5 ★ par Paul
  const qualite = qualiteCles(elementsDuSite(d.theme), notesElements(await getLignesAssetsApprentissage()));
  const nom = d.cabinet.nom || [d.praticiens[0]?.prenom, d.praticiens[0]?.nom].filter(Boolean).join(' ') || 'Site sans nom';

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin" className="text-sm text-teal-800">← Sites</Link>
        <h1 className="mt-2 text-2xl font-bold">Photos du site : {nom}</h1>
        <p className="text-sm text-neutral-600">Spécialité principale : {specialiteDe(d.theme.specialite).label} · statut : {STATUTS[site.statut as Statut]?.label ?? site.statut}</p>
        {qualite.total > 0 && <p className="mt-1 w-fit rounded-lg bg-neutral-50 px-2 py-1 text-xs text-neutral-700 ring-1 ring-black/10" title={qualite.details.map((x) => `${x.note ?? 'jamais noté'} — ${x.cle}`).join('\n')}>Qualité des éléments du site : {qualite.texte}</p>}
      </div>
      {error && <p className="text-sm text-red-700">Lecture impossible : la base de données n’est pas à jour (mise à jour 0016, jeux de photos, à installer).</p>}

      <section className="grid gap-3 rounded-xl border border-black/5 bg-white p-4">
        <h2 className="font-semibold">Jeu affecté</h2>
        <p className="text-sm">
          {affecte ? <><strong>{affecte.nom}</strong>{affecte.siteId ? ' (exclusif)' : ' (partagé)'}{!affecte.actif && ' — inactif : le site affiche les photos intégrées'}</> : 'Aucun : photos intégrées de la spécialité.'}
        </p>
        {affecte && <PlancheContact photos={affecte.photos} soins={soins} />}
        <PhotosSite
          siteId={id}
          premium={premium}
          jeuActuel={d.theme.jeuPhotos}
          disponibles={disponibles.map((j) => ({ id: j.id, nom: j.siteId ? `${j.nom} (exclusif)` : j.nom }))}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Jeux exclusifs (photos premium)</h2>
        {premium ? (
          <>
            <p className="max-w-3xl text-sm text-neutral-600">
              Photos achetées pour ce client (Adobe Stock : une licence par photo, achetée pour son compte et transférée par écrit) ou fournies par le
              praticien. Ces photos ne sont jamais réutilisées pour un autre site. Après enregistrement, affectez le jeu au site ci-dessus puis publiez.
            </p>
            {exclusifs.map((j) => (
              <EditeurJeu key={j.id} jeu={j} specialite={j.specialite} siteId={id} soins={soins} licences={licences} nbSites={d.theme.jeuPhotos === j.id ? 1 : 0} />
            ))}
            <EditeurJeu jeu={null} specialite={d.theme.specialite} siteId={id} soins={soins} licences={licences} />
          </>
        ) : (
          <p className="text-sm text-neutral-500">Cochez « Photos premium (contrat signé) » pour créer un jeu exclusif à ce site.</p>
        )}
      </section>
    </div>
  );
}
