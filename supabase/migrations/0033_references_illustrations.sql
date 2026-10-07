-- Références d'illustration (/admin/illustrations, vue agrandie : « Chercher des références ») et journal des suggestions de
-- classement. À exécuter après 0032_recettes.sql. Rejouable : add column if not exists, create … if not exists,
-- drop policy if exists.
-- 1. inspirations : colonnes de LIEN vers un élément de la bibliothèque (cle_asset) et d'ORIGINE de l'image de référence
--    (source, identifiant à la source, image et page d'origine, auteur et licence connus, requête, sujets / hashtags acceptés).
--    La vignette réduite (≤ 400 px, WebP) va dans le bucket PRIVÉ « inspirations » (0028), colonne chemin existante.
--    Référence d'inspiration uniquement : jamais copiée ni décalquée ; on crée notre propre illustration.
-- 2. references_ecartees : images marquées « Pas pertinent » pour un élément (jamais remontrées pour cet élément).
-- 3. classement_suggestions : suggestions de sujets / hashtags acceptées ou refusées (améliorer le dictionnaire métier) ;
--    aucun auteur, aucune donnée personnelle (l'export public en tire une synthèse).

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Inspirations liées à un élément
-- ---------------------------------------------------------------------------------------------------------------

alter table public.inspirations add column if not exists cle_asset text;
alter table public.inspirations add column if not exists origine text;
alter table public.inspirations add column if not exists origine_id text;
alter table public.inspirations add column if not exists image_origine text;
alter table public.inspirations add column if not exists page_origine text;
alter table public.inspirations add column if not exists auteur_origine text;
alter table public.inspirations add column if not exists licence_origine text;
alter table public.inspirations add column if not exists licence_url_origine text;
alter table public.inspirations add column if not exists requete text;
alter table public.inspirations add column if not exists sujets text[] not null default '{}';
alter table public.inspirations add column if not exists hashtags text[] not null default '{}';

alter table public.inspirations drop constraint if exists inspirations_reference_cle;
alter table public.inspirations add constraint inspirations_reference_cle
  check (cle_asset is null or cle_asset ~ '^[a-z]+:[^[:space:]]{1,200}$');
alter table public.inspirations drop constraint if exists inspirations_reference_origine;
alter table public.inspirations add constraint inspirations_reference_origine check (
  (origine is null and origine_id is null)
  or (
    origine in ('wikimedia', 'openverse', 'pexels', 'pixabay', 'google')
    and origine_id ~ '^[A-Za-z0-9._~-]{1,120}$'
    and page_origine ~ '^https://' and char_length(page_origine) <= 600
  )
);
alter table public.inspirations drop constraint if exists inspirations_reference_textes;
alter table public.inspirations add constraint inspirations_reference_textes check (
  (image_origine is null or (image_origine ~ '^https://' and char_length(image_origine) <= 600))
  and (licence_url_origine is null or (licence_url_origine ~ '^https://' and char_length(licence_url_origine) <= 300))
  and (auteur_origine is null or char_length(auteur_origine) <= 120)
  and (licence_origine is null or char_length(licence_origine) <= 80)
  and (requete is null or char_length(requete) <= 100)
);
alter table public.inspirations drop constraint if exists inspirations_reference_classement;
alter table public.inspirations add constraint inspirations_reference_classement check (
  cardinality(sujets) <= 8 and array_to_string(sujets, ',') ~ '^([a-z0-9-]{2,30}(,[a-z0-9-]{2,30})*)?$' and not ('posture' = any (sujets))
  and cardinality(hashtags) <= 15 and array_to_string(hashtags, ',') ~ '^([a-z0-9][a-z0-9-]{0,28}[a-z0-9](,[a-z0-9][a-z0-9-]{0,28}[a-z0-9])*)?$'
);

-- Une même image n'est liée qu'une fois à un élément
create unique index if not exists inspirations_reference_unique on public.inspirations (cle_asset, origine, origine_id) where cle_asset is not null and origine is not null;
create index if not exists inspirations_cle_asset_idx on public.inspirations (cle_asset, created_at desc) where cle_asset is not null;

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Images écartées (« Pas pertinent ») par élément
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.references_ecartees (
  id uuid primary key default gen_random_uuid(),
  cle_asset text not null check (cle_asset ~ '^[a-z]+:[^[:space:]]{1,200}$'),
  origine text not null check (origine in ('wikimedia', 'openverse', 'pexels', 'pixabay', 'google')),
  origine_id text not null check (origine_id ~ '^[A-Za-z0-9._~-]{1,120}$'),
  requete text check (requete is null or char_length(requete) <= 100),
  created_at timestamptz not null default now(),
  unique (cle_asset, origine, origine_id)
);

alter table public.references_ecartees enable row level security;
drop policy if exists "références écartées : admin" on public.references_ecartees;
create policy "références écartées : admin" on public.references_ecartees
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.references_ecartees from anon, authenticated;
grant select, insert, delete on public.references_ecartees to authenticated;
grant select, insert, update, delete on public.references_ecartees to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 3. Journal des suggestions de classement (acceptées / refusées)
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.classement_suggestions (
  id uuid primary key default gen_random_uuid(),
  contexte text not null check (contexte in ('bibliotheque', 'reference', 'photos')),
  nature text not null check (nature in ('sujet', 'hashtag', 'requete')),
  valeur text not null check (valeur ~ '^[a-z0-9][a-z0-9 -]{0,59}$'),
  decision text not null check (decision in ('acceptee', 'refusee')),
  raison text check (raison is null or char_length(raison) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists classement_suggestions_valeur_idx on public.classement_suggestions (nature, valeur, decision);

alter table public.classement_suggestions enable row level security;
drop policy if exists "suggestions de classement : admin" on public.classement_suggestions;
create policy "suggestions de classement : admin" on public.classement_suggestions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.classement_suggestions from anon, authenticated;
grant select, insert on public.classement_suggestions to authenticated;
grant select, insert, update, delete on public.classement_suggestions to service_role;
