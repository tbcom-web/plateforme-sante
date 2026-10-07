-- 0031 : photos libres gardées SANS import, et sources des photos envoyées à la main (photos_sources, en fin de fichier) (demande de Paul, 2026-10-07 : « on ne télécharge pas l'image complète :
-- on utilise juste le lien, et une fois validée on peut importer »). Rejouable.
--
-- « Garder » (Photos à découvrir) enregistre seulement la candidate : traçabilité (source, identifiant, auteur, page, licence
-- et version datée, mots-clés, requête, sujet), dimensions d'origine et aperçu servi par la source (apercu_url), statut
-- « à valider », sans fichier. « Valider et importer » (/admin/photos) télécharge la photo côté serveur, la convertit en
-- WebP sans EXIF, l'héberge dans photos/banque/libres/<sujet>/ et renseigne chemin, url, largeurs, telecharge_le et
-- importe_le, statut « validée ». Une photo « validée » a TOUJOURS ses fichiers hébergés (contrainte ci-dessous) : les jeux,
-- le générateur et les sites n'utilisent que des photos importées.

alter table public.photos_libres add column if not exists apercu_url text;
alter table public.photos_libres add column if not exists importe_le timestamptz;

alter table public.photos_libres alter column chemin drop not null;
alter table public.photos_libres alter column url drop not null;
alter table public.photos_libres alter column largeurs drop not null;
alter table public.photos_libres alter column telecharge_le drop not null;

-- Largeurs : vide tant que la photo n'est pas importée (la contrainte de 0028 exigeait 1 à 6 largeurs)
alter table public.photos_libres drop constraint if exists photos_libres_largeurs_check;
alter table public.photos_libres drop constraint if exists photos_libres_largeurs_nombre;
alter table public.photos_libres add constraint photos_libres_largeurs_nombre
  check (largeurs is null or cardinality(largeurs) <= 6);

-- Aperçu : https, hôtes d'images de la source seulement
alter table public.photos_libres drop constraint if exists photos_libres_apercu_url_check;
alter table public.photos_libres add constraint photos_libres_apercu_url_check check (
  apercu_url is null or (
    char_length(apercu_url) <= 500
    and (
      (source = 'pexels' and apercu_url ~ '^https://images\.pexels\.com/')
      or (source = 'pixabay' and apercu_url ~ '^https://(cdn\.)?pixabay\.com/')
    )
  )
);

-- Importée = fichiers hébergés complets ; validée ⇒ importée ; non importée ⇒ aperçu de la source obligatoire
alter table public.photos_libres drop constraint if exists photos_libres_import_coherent;
alter table public.photos_libres add constraint photos_libres_import_coherent check (
  (
    chemin is not null and url is not null and largeurs is not null and cardinality(largeurs) between 1 and 6
    and telecharge_le is not null
  )
  or (
    statut <> 'validee' and chemin is null and url is null and coalesce(cardinality(largeurs), 0) = 0
    and apercu_url is not null
  )
);

-- Photos importées avant 0031 : date d'import = date de téléchargement
update public.photos_libres set importe_le = telecharge_le where importe_le is null and chemin is not null and telecharge_le is not null;

-- ---------------------------------------------------------------------------------------------------------------
-- Sources des photos envoyées à la main par l'admin (demande de Paul, 2026-10-07 : « assure-toi que les images enregistrées
-- enregistrent la source et éventuellement la licence associée »). Dossiers banque/jeux/<spécialité>/ et banque/sites/<site>/
-- (jeux « banque ») : provenance OBLIGATOIRE à l'envoi. Adobe Stock (référence de licence), photo personnelle / réalisée
-- pour le cabinet (auteur), autre banque (nom, page, licence). Une photo sans ligne apparaît « Source à renseigner » dans
-- /admin/photos → Sources et licences, avec un bouton pour compléter. Aucune suppression (preuve conservée).
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.photos_sources (
  chemin text primary key check (chemin ~ '^banque/[^[:space:]]{1,300}$' and chemin !~ '^banque/libres/' and position('..' in chemin) = 0),
  provenance text not null check (provenance in ('adobe-stock', 'personnelle', 'autre-banque')),
  reference_licence text check (reference_licence is null or char_length(reference_licence) between 1 and 80),
  auteur_nom text check (auteur_nom is null or char_length(auteur_nom) between 1 and 120),
  banque_nom text check (banque_nom is null or char_length(banque_nom) between 1 and 80),
  url_source text check (url_source is null or (char_length(url_source) <= 400 and url_source ~ '^https://')),
  licence text check (licence is null or char_length(licence) between 1 and 120),
  licence_url text check (licence_url is null or (char_length(licence_url) <= 400 and licence_url ~ '^https://')),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photos_sources_champs check (
    (provenance = 'adobe-stock' and reference_licence is not null)
    or (provenance = 'personnelle' and auteur_nom is not null)
    or (provenance = 'autre-banque' and banque_nom is not null and url_source is not null and licence is not null)
  )
);

alter table public.photos_sources enable row level security;
drop policy if exists "photos sources : lecture admin" on public.photos_sources;
drop policy if exists "photos sources : ajout admin" on public.photos_sources;
drop policy if exists "photos sources : modification admin" on public.photos_sources;
create policy "photos sources : lecture admin" on public.photos_sources
  for select to authenticated using (public.is_admin());
create policy "photos sources : ajout admin" on public.photos_sources
  for insert to authenticated with check (public.is_admin());
create policy "photos sources : modification admin" on public.photos_sources
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.photos_sources from anon, authenticated;
grant select, insert, update on public.photos_sources to authenticated;
grant select, insert, update, delete on public.photos_sources to service_role;
