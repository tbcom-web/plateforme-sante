import Link from 'next/link';
import { estPhotoImportee, jeuPhotosDepuisLigne, LIBELLES_SOURCES, libelleSujet, normaliserDraft, SPECIALITES, SUJETS_VISUELS } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { COLONNES_JEU } from '@/lib/jeux-photos';
import { getHashtagsAssets } from '@/lib/hashtags';
import { getPhotosLibres } from '@/lib/photos-libres';
import { getRecapSources } from '@/lib/sources-photos';
import { getCatalogue } from '@/lib/sites';
import EditeurJeu from './EditeurJeu';
import PhotosLibresListe from './PhotosLibresListe';
import SourcesLicences from './SourcesLicences';

export const metadata = { title: 'Super admin · Jeux de photos' };

/**
 * Brouillon partiel de chaque site (version, thème, profil, cabinet, praticiens) : même résultat de normaliserDraft pour le jeu de
 * photos et le nom du site ; un brouillon d'un ancien format (version ≠ 2, converti par normaliserDraft) est relu en entier.
 */
async function lireSitesPourJeux(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ data: { id: string; config: unknown }[] | null }> {
  const { data, error } = await supabase.from('sites').select('id, version:config->version, theme:config->theme, profil:config->profil, cabinet:config->cabinet, praticiens:config->praticiens');
  if (error || !data) return supabase.from('sites').select('id, config') as unknown as Promise<{ data: { id: string; config: unknown }[] | null }>;
  const lignes = data as unknown as { id: string; version: unknown; theme: unknown; profil: unknown; cabinet: unknown; praticiens: unknown }[];
  const anciens = lignes.filter((l) => l.version !== 2).map((l) => l.id);
  const complets = new Map<string, unknown>();
  for (let i = 0; i < anciens.length; i += 100) {
    const { data: c } = await supabase.from('sites').select('id, config').in('id', anciens.slice(i, i + 100));
    for (const l of (c ?? []) as { id: string; config: unknown }[]) complets.set(l.id, l.config);
  }
  return { data: lignes.map((l) => ({ id: l.id, config: l.version === 2 ? { version: 2, theme: l.theme ?? undefined, profil: l.profil ?? undefined, cabinet: l.cabinet ?? undefined, praticiens: l.praticiens ?? undefined } : complets.get(l.id) ?? null })) };
}

export default async function JeuxPhotos() {
  const supabase = await createClient();
  const [{ data, error }, { data: sites }, catalogue, libres, hashtags, recap] = await Promise.all([
    supabase.from('jeux_photos').select(COLONNES_JEU).order('created_at'),
    // Seulement les parties du brouillon utiles ici (jeu de photos, nom du cabinet, praticiens) : jamais tout config (2026-10-10)
    lireSitesPourJeux(supabase),
    getCatalogue(),
    getPhotosLibres(),
    getHashtagsAssets(),
    getRecapSources(),
  ]);
  // Photos libres de droits validées, proposées dans le choix des jeux partagés (les sujets de la spécialité d'abord)
  // Seules les photos IMPORTÉES (fichiers hébergés chez nous) entrent dans un jeu. Éléments construits UNE fois et partagés par tous
  // les éditeurs (2026-10-10) : la page les envoie une seule fois au navigateur (objets identiques référencés) au lieu d'une copie par
  // éditeur ; listes par spécialité mémorisées (même ordre qu'avant : sujets de la spécialité d'abord)
  const validees = libres.photos.filter(estPhotoImportee).map((p) => ({ sujet: p.sujet, item: { url: p.url!, legende: `${libelleSujet(p.sujet)} · ${p.auteur} (${p.source === 'ia' ? 'Image générée' : p.source === 'pexels' ? 'Pexels' : 'Pixabay'})` } }));
  const parSpecialite = new Map<string, { url: string; legende: string }[]>();
  const libresDe = (spec: string) => {
    let l = parSpecialite.get(spec);
    if (!l) {
      const duSujet = (p: (typeof validees)[number]) => SUJETS_VISUELS.find((x) => x.id === p.sujet)?.specialite === spec;
      l = [...validees.filter(duSujet), ...validees.filter((p) => !duSujet(p))].map((p) => p.item);
      parSpecialite.set(spec, l);
    }
    return l;
  };
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
              <EditeurJeu key={j.id} jeu={j} specialite={spec.value} siteId={null} soins={soins} nbSites={utilisation.get(j.id) ?? 0} libres={libresDe(spec.value)} />
            ))}
            <EditeurJeu jeu={null} specialite={spec.value} siteId={null} soins={soins} libres={libresDe(spec.value)} />
          </section>
        );
      })}

      <section aria-labelledby="photos-libres" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="photos-libres" className="text-lg font-semibold">Photos libres de droits (Pexels, Pixabay) et images générées</h2>
          <a href="/admin/photos/licences.csv" className="flex min-h-11 items-center rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold hover:bg-neutral-50">Exporter les licences (CSV)</a>
        </div>
        <p className="max-w-3xl text-sm text-neutral-600">
          Gardées depuis « Donner mon avis » → Photos à découvrir : rien n’est téléchargé, seul le lien est enregistré (aperçu servi par Pexels
          ou Pixabay, pour l’évaluation). « Valider et importer » télécharge alors la photo et l’héberge chez nous (WebP, sans métadonnées) : seule
          une photo importée est proposée dans le choix des jeux ci-dessus et utilisée par les sites. Chaque ligne garde sa preuve de licence.
          Les sources et licences de toutes les autres images sont plus bas (« Sources et licences »).
        </p>
        <p className="max-w-3xl text-sm text-neutral-600">
          Images générées par IA (étiquette « Image générée ») : prompts et import depuis{' '}
          <Link href="/admin/cuisine/images-a-generer" className="font-semibold text-teal-900 underline underline-offset-4">Images à générer</Link>.
          Importées « à valider », avec l’outil, le prompt et les conditions de l’outil ; jamais dans la galerie du cabinet.
        </p>
        <p className="max-w-3xl text-sm text-neutral-600">
          Photos de banques payantes (Adobe Stock, iStock, Getty…) pour les démos, avec l’option Photos premium :{' '}
          <Link href="/admin/photos-sous-licence" className="font-semibold text-teal-900 underline underline-offset-4">Photos sous licence</Link>
          {' '}(aperçu jamais publié ; photo achetée publiée seulement sur les sites qui ont leur licence).
        </p>
        {libres.migrationManquante ? (
          <p className="text-sm text-amber-900">Migration 0028 à exécuter (<code>supabase/migrations/0028_inspirations_photos_libres.sql</code>).</p>
        ) : libres.photos.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucune photo gardée pour l’instant.</p>
        ) : (
          <PhotosLibresListe photos={libres.photos} hashtags={hashtags.hashtags} migrationHashtags={hashtags.migrationManquante} migration0031={libres.migration0031} />
        )}
      </section>

      <section aria-labelledby="sources-licences" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="sources-licences" className="text-lg font-semibold">Sources et licences</h2>
          <a href="/admin/photos/licences.csv" className="flex min-h-11 items-center rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold hover:bg-neutral-50">Export CSV complet</a>
        </div>
        <p className="max-w-3xl text-sm text-neutral-600">
          Toutes les images : banque intégrée (Unsplash, photographe et page d’origine), photos libres (Pexels, Pixabay), photos envoyées
          dans la banque (provenance obligatoire à l’envoi), Adobe Stock (licence au nom du client) et photos fournies par les praticiens.
          Une photo envoyée sans provenance apparaît « Source à renseigner » : complétez-la ici.
        </p>
        <SourcesLicences lignes={recap.lignes} migration0031={recap.migration0031} />
      </section>

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
