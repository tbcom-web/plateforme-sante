-- Inspirations et flux de photos libres de droits (/admin/retours : tuiles « Inspirations » et « Photos à découvrir »).
-- 1. Bucket Storage PRIVÉ « inspirations » : images de référence (lecture admin seulement, URL signées). Référence
--    d'inspiration uniquement : jamais copiée ni réutilisée sur les sites.
-- 2. inspirations : métadonnées (étiquettes « ce qui plaît », ce qu'on veut en tirer, sujet, type d'élément, lien facultatif,
--    palette dominante extraite dans le navigateur). Admin seulement.
-- 3. photos_libres_mots_cles : mots-clés de recherche par sujet (valeurs par défaut dans packages/core/src/photos-libres.ts).
-- 4. photos_libres_avis : décisions GARDER / REJETER sur les candidates Pexels / Pixabay (évite de remontrer une photo vue).
-- 5. photos_libres : TRAÇABILITÉ obligatoire de chaque photo gardée (source, identifiant, auteur, page, licence + version,
--    date de téléchargement, mots-clés, sujet, fichiers WebP hébergés dans le bucket « photos », dossier banque/libres/).
--    Aucune politique de suppression : la preuve de licence ne se perd pas (statut « retiree » à la place).
-- Les fichiers WebP vont dans le bucket public « photos » existant (dossier banque/, réservé à l'admin : 0011).
-- 6. assets_notes / atelier_notes : remarques libres « ce qui va bien » / « ce qui ne va pas », instantané du rendu noté.
-- 7. assets_sujets : sujets des visuels ajoutés / retirés par Paul (journal en ajout seul) + assets_sujets_effectifs().
-- Rejouable : if not exists, on conflict, create or replace, drop … if exists. À exécuter après 0027_assets_notes.sql.

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Bucket privé « inspirations »
-- ---------------------------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspirations', 'inspirations', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

drop policy if exists "inspirations : lecture admin" on storage.objects;
drop policy if exists "inspirations : ajout admin" on storage.objects;
drop policy if exists "inspirations : modification admin" on storage.objects;
drop policy if exists "inspirations : suppression admin" on storage.objects;

create policy "inspirations : lecture admin" on storage.objects
  for select to authenticated using (bucket_id = 'inspirations' and public.is_admin());
create policy "inspirations : ajout admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'inspirations' and public.is_admin());
create policy "inspirations : modification admin" on storage.objects
  for update to authenticated using (bucket_id = 'inspirations' and public.is_admin()) with check (bucket_id = 'inspirations' and public.is_admin());
create policy "inspirations : suppression admin" on storage.objects
  for delete to authenticated using (bucket_id = 'inspirations' and public.is_admin());

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Inspirations
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.inspirations (
  id uuid primary key default gen_random_uuid(),
  -- Chemin dans le bucket privé « inspirations » (<uuid>.webp) ; jamais d'URL publique
  chemin text not null unique check (chemin ~ '^[0-9a-f-]{36}\.(webp|jpg|png)$'),
  lien text check (lien is null or (char_length(lien) <= 500 and lien ~ '^https?://')),
  etiquettes text[] not null default '{}'
    check (cardinality(etiquettes) <= 12 and array_to_string(etiquettes, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$'),
  objectif text not null default '' check (char_length(objectif) <= 500),
  sujet text check (sujet is null or sujet ~ '^[a-z0-9-]{2,30}$'),
  type_element text check (type_element is null or type_element ~ '^[a-z0-9-]{2,30}$'),
  -- Palette dominante : [{ "hex": "#rrggbb", "part": 0.42 }, …] (6 au plus)
  palette jsonb not null default '[]'::jsonb check (jsonb_typeof(palette) = 'array' and jsonb_array_length(palette) <= 6),
  largeur integer check (largeur is null or largeur between 1 and 10000),
  hauteur integer check (hauteur is null or hauteur between 1 and 10000),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inspirations_date_idx on public.inspirations (created_at desc);

alter table public.inspirations enable row level security;
drop policy if exists "inspirations : admin" on public.inspirations;
create policy "inspirations : admin" on public.inspirations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.inspirations from anon, authenticated;
grant select, insert, update, delete on public.inspirations to authenticated;
grant select, insert, update, delete on public.inspirations to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 3. Mots-clés de recherche par sujet
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.photos_libres_mots_cles (
  sujet text primary key check (sujet ~ '^[a-z0-9-]{2,30}$'),
  mots_cles text[] not null default '{}' check (cardinality(mots_cles) <= 12),
  updated_at timestamptz not null default now()
);

alter table public.photos_libres_mots_cles enable row level security;
drop policy if exists "photos libres mots-clés : admin" on public.photos_libres_mots_cles;
create policy "photos libres mots-clés : admin" on public.photos_libres_mots_cles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.photos_libres_mots_cles from anon, authenticated;
grant select, insert, update, delete on public.photos_libres_mots_cles to authenticated;
grant select, insert, update, delete on public.photos_libres_mots_cles to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 4. Décisions sur les candidates (garder / rejeter)
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.photos_libres_avis (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('pexels', 'pixabay')),
  id_source text not null check (id_source ~ '^[0-9]{1,20}$'),
  decision text not null check (decision in ('garder', 'rejeter')),
  etiquettes text[] not null default '{}'
    check (cardinality(etiquettes) <= 8 and array_to_string(etiquettes, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$'),
  sujet text check (sujet is null or sujet ~ '^[a-z0-9-]{2,30}$'),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source, id_source)
);

alter table public.photos_libres_avis enable row level security;
drop policy if exists "photos libres avis : admin" on public.photos_libres_avis;
create policy "photos libres avis : admin" on public.photos_libres_avis
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.photos_libres_avis from anon, authenticated;
grant select, insert, update on public.photos_libres_avis to authenticated;
grant select, insert, update, delete on public.photos_libres_avis to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 5. Traçabilité des photos gardées
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.photos_libres (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('pexels', 'pixabay')),
  id_source text not null check (id_source ~ '^[0-9]{1,20}$'),
  auteur_nom text not null check (char_length(auteur_nom) between 1 and 120),
  auteur_url text check (auteur_url is null or (char_length(auteur_url) <= 300 and auteur_url ~ '^https://')),
  page_url text not null check (char_length(page_url) <= 300 and page_url ~ '^https://'),
  licence text not null check (char_length(licence) between 3 and 80),
  licence_version text not null check (char_length(licence_version) between 3 and 80),
  licence_url text not null check (licence_url ~ '^https://'),
  telecharge_le timestamptz not null,
  mots_cles text[] not null default '{}' check (cardinality(mots_cles) <= 12),
  requete text not null default '' check (char_length(requete) <= 40),
  sujet text not null check (sujet ~ '^[a-z0-9-]{2,30}$'),
  -- Fichier principal (plus grande largeur) dans le bucket « photos », et largeurs produites (…-640.webp, …-1280.webp, …)
  chemin text not null check (chemin ~ '^banque/libres/[a-z0-9-]+/(pexels|pixabay)-[0-9]+-[0-9]+\.webp$'),
  url text not null check (char_length(url) <= 400 and url ~ '^https?://'),
  largeurs integer[] not null check (cardinality(largeurs) between 1 and 6),
  largeur_originale integer not null check (largeur_originale > 0),
  hauteur_originale integer not null check (hauteur_originale > 0),
  etiquettes text[] not null default '{}' check (cardinality(etiquettes) <= 8),
  -- À valider (candidate visible dans la bibliothèque et notable), validée (proposée dans les jeux de photos), retirée
  statut text not null default 'a_valider' check (statut in ('a_valider', 'validee', 'retiree')),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, id_source)
);

create index if not exists photos_libres_sujet_idx on public.photos_libres (sujet, statut);

alter table public.photos_libres enable row level security;
drop policy if exists "photos libres : lecture admin" on public.photos_libres;
drop policy if exists "photos libres : ajout admin" on public.photos_libres;
drop policy if exists "photos libres : modification admin" on public.photos_libres;
create policy "photos libres : lecture admin" on public.photos_libres
  for select to authenticated using (public.is_admin());
create policy "photos libres : ajout admin" on public.photos_libres
  for insert to authenticated with check (public.is_admin());
-- Mise à jour : statut (et nouveau téléchargement d'une même photo) ; aucune suppression (preuve de licence conservée)
create policy "photos libres : modification admin" on public.photos_libres
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.photos_libres from anon, authenticated;
grant select, insert, update on public.photos_libres to authenticated;
grant select, insert, update, delete on public.photos_libres to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 6. Remarques libres distinctes et instantané du rendu noté (/admin/retours)
-- ---------------------------------------------------------------------------------------------------------------
-- « Ce qui va bien (libre) » / « Ce qui ne va pas (libre) » : deux champs distincts ; « commentaire » reste pour les notes
-- plus anciennes. apercu : instantané du rendu noté (SVG minifié ≤ 60 Ko ; adresse de la photo ou de la structure ;
-- couleurs de la gamme en JSON) pour l'avant / après quand l'élément est modifié depuis la note.

alter table public.assets_notes add column if not exists positif text;
alter table public.assets_notes add column if not exists negatif text;
alter table public.assets_notes add column if not exists apercu text;
alter table public.assets_notes drop constraint if exists assets_notes_positif_longueur;
alter table public.assets_notes add constraint assets_notes_positif_longueur check (positif is null or char_length(positif) <= 2000);
alter table public.assets_notes drop constraint if exists assets_notes_negatif_longueur;
alter table public.assets_notes add constraint assets_notes_negatif_longueur check (negatif is null or char_length(negatif) <= 2000);
alter table public.assets_notes drop constraint if exists assets_notes_apercu_longueur;
alter table public.assets_notes add constraint assets_notes_apercu_longueur check (apercu is null or char_length(apercu) <= 61440);

alter table public.atelier_notes add column if not exists positif text;
alter table public.atelier_notes add column if not exists negatif text;
alter table public.atelier_notes drop constraint if exists atelier_notes_positif_longueur;
alter table public.atelier_notes add constraint atelier_notes_positif_longueur check (positif is null or char_length(positif) <= 2000);
alter table public.atelier_notes drop constraint if exists atelier_notes_negatif_longueur;
alter table public.atelier_notes add constraint atelier_notes_negatif_longueur check (negatif is null or char_length(negatif) <= 2000);

-- ---------------------------------------------------------------------------------------------------------------
-- 7. Sujets des visuels ajoutés / retirés par Paul
-- ---------------------------------------------------------------------------------------------------------------
-- Défauts dans le code (packages/core/src/sujets-visuels.ts) ; ici le journal des surcharges, en AJOUT SEUL : état courant =
-- dernière action par (clé, sujet). Sujets effectifs = défauts ± surcharges, utilisés par le générateur et les sites.

create table if not exists public.assets_sujets (
  id uuid primary key default gen_random_uuid(),
  cle_asset text not null check (cle_asset ~ '^[a-z]+:[^[:space:]]{1,200}$'),
  sujet text not null check (sujet ~ '^[a-z0-9-]{2,30}$'),
  action text not null check (action in ('ajout', 'retrait')),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists assets_sujets_cle_idx on public.assets_sujets (cle_asset, sujet, created_at desc);

alter table public.assets_sujets enable row level security;
drop policy if exists "assets sujets : lecture admin" on public.assets_sujets;
drop policy if exists "assets sujets : ajout admin" on public.assets_sujets;
create policy "assets sujets : lecture admin" on public.assets_sujets
  for select to authenticated using (public.is_admin());
-- Ajout seul, au nom de l'admin connecté ; aucune modification ni suppression
create policy "assets sujets : ajout admin" on public.assets_sujets
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());

revoke all on public.assets_sujets from anon, authenticated;
grant select, insert on public.assets_sujets to authenticated;
grant select, insert, update, delete on public.assets_sujets to service_role;

-- État courant (dernière action par clé et sujet), sans auteur : générateur, parcours /creer (sessions anonymes comprises),
-- construction des sites.
create or replace function public.assets_sujets_effectifs()
returns table (cle_asset text, sujet text, action text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (s.cle_asset, s.sujet) s.cle_asset, s.sujet, s.action
  from public.assets_sujets s
  order by s.cle_asset, s.sujet, s.created_at desc, s.id desc;
$$;

revoke all on function public.assets_sujets_effectifs() from public, anon;
grant execute on function public.assets_sujets_effectifs() to authenticated, service_role;
