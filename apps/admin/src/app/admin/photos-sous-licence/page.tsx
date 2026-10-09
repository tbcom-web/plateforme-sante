import Link from 'next/link';
import { alertesLicences } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getPhotosSousLicence, nomsDesSites } from '@/lib/photos-sous-licence';
import ImportPhotoLicence from './ImportPhotoLicence';
import ListePhotosLicence from './ListePhotosLicence';

export const metadata = { title: 'Super admin · Photos sous licence' };

// PHOTOS SOUS LICENCE (banques payantes) et option « Photos premium » (demande de Paul du 2026-10-09 ; règles : docs/photos-sous-licence.md,
// packages/core/src/photos-sous-licence.ts) : import par Paul (fichier ou lot, traçabilité obligatoire), liste avec statut et sites
// rattachés, alertes, « Marquer comme achetée pour le site X », export CSV de conformité.
export default async function PagePhotosSousLicence() {
  await exigerAdmin();
  const [{ photos, migrationManquante }, noms] = await Promise.all([getPhotosSousLicence(), nomsDesSites()]);
  const jour = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const alertes = alertesLicences(photos, jour, noms);
  // Sites qui attendent une licence d'abord, puis les autres par nom
  const enAttente = new Set(photos.flatMap((p) => p.rattachements.filter((r) => r.statut === 'demandee').map((r) => r.siteId)));
  const sites = Object.entries(noms).map(([id, nom]) => ({ id, nom: enAttente.has(id) ? `${nom} (option demandée)` : nom }))
    .sort((a, b) => Number(enAttente.has(b.id)) - Number(enAttente.has(a.id)) || a.nom.localeCompare(b.nom, 'fr'));
  const nb = { apercu: photos.filter((p) => p.statutLicence === 'apercu').length, achetee: photos.filter((p) => p.statutLicence === 'achetee').length };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div>
        <p className="flex flex-wrap gap-x-4 text-sm">
          <Link href="/admin/frigo/photos" className="font-semibold text-teal-900 underline">← Jeux de photos</Link>
          <Link href="/admin/cuisine/images-a-generer" className="font-semibold text-teal-900 underline">Images à générer</Link>
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold">Photos sous licence</h1>
          <a href="/admin/photos-sous-licence/licences.csv" className="flex min-h-11 items-center rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold hover:bg-neutral-50">Export CSV de conformité</a>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Photos de banques payantes (Adobe Stock, iStock, Getty, Shutterstock, Unsplash+) pour embellir les démos. Un aperçu (comp) sert
          seulement aux démos et n’est jamais publié. Une photo achetée n’est publiée que sur les sites qui ont leur licence (une licence par
          client) : le praticien voit « Cette photo nécessite l’option Photos premium » et peut demander l’option ou remplacer la photo.
          Règles et points à confirmer : <code>docs/photos-sous-licence.md</code>.
        </p>
        <p className="mt-1 text-sm text-neutral-700">{photos.length} photo(s) : {nb.apercu} aperçu(s), {nb.achetee} achetée(s).</p>
      </div>

      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration à exécuter (<code>supabase/migrations/0057_photos_sous_licence.sql</code>) : l’import, la liste et l’option Photos premium l’attendent.
          Tant qu’elle manque, un site qui contient une photo sous licence ne peut pas être publié.
        </p>
      )}

      {alertes.length > 0 && (
        <section aria-labelledby="alertes-licences" className="grid gap-2 rounded-xl bg-red-50/60 p-3 ring-1 ring-red-200">
          <h2 id="alertes-licences" className="text-base font-semibold text-red-950">Alertes</h2>
          <ul className="grid gap-1 text-sm">
            {alertes.map((a, i) => <li key={i} className={a.niveau === 'bloquant' ? 'font-medium text-red-900' : 'text-amber-950'}>{a.message}</li>)}
          </ul>
        </section>
      )}

      <section aria-labelledby="liste-licences" className="grid gap-3">
        <h2 id="liste-licences" className="text-lg font-semibold">Photos et sites rattachés</h2>
        <ListePhotosLicence photos={photos} sites={sites} jour={jour} />
      </section>

      <ImportPhotoLicence migrationManquante={migrationManquante} />
    </div>
  );
}
