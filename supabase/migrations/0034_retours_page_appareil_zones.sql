-- Retours par PAGE et par APPAREIL, zones signalées, défauts d'adaptation mobile (demandes de Paul du 2026-10-07).
-- Code : packages/core/src/rendu-mobile.ts (appareils, défauts mobiles, poids), zones.ts (zones), recettes.ts (notes par page).
-- - assets_notes, atelier_notes, recettes_notes : colonne `appareil` (rendu regardé pour la note de CHOIX : ordinateur, mobile
--   ou les-deux ; défaut « les-deux » = toutes les notes antérieures, rétrocompatible) et colonne `zones` (zones signalées :
--   coordonnées normalisées 0-1, étiquette, commentaire court, appareil ; contexte : empreinte, page, largeur de rendu) ;
-- - recettes_notes : colonne `page` (type de page noté dans le studio ; nulle = la recette entière) ;
-- - defauts_mobile : retours « Rendu mobile » (adaptation téléphone, distincte du choix) : verdict ok / a_revoir, étiquettes
--   mobiles, remarque, note mobile facultative, zones, empreinte mobile, statut à corriger / corrigé / sans objet. Journal en
--   ajout, statut modifiable par l'admin (aucune suppression par l'application) ;
-- - fonctions de lecture et d'apprentissage : appareil (et page) exposés, jamais l'auteur, les remarques ni les dates ;
--   defauts_mobile_ouverts() pour le parcours des praticiens (une variante à revoir sur mobile passe après les autres).
-- Rejouable : if not exists, create or replace, drop … if exists. À exécuter après 0033_references_illustrations.sql.

-- ---------------------------------------------------------------------------------------------------------------
-- Appareil et zones sur les journaux de notes
-- ---------------------------------------------------------------------------------------------------------------

alter table public.assets_notes add column if not exists appareil text not null default 'les-deux';
alter table public.assets_notes add column if not exists zones jsonb;
alter table public.assets_notes drop constraint if exists assets_notes_appareil_check;
alter table public.assets_notes add constraint assets_notes_appareil_check check (appareil in ('ordinateur', 'mobile', 'les-deux'));
alter table public.assets_notes drop constraint if exists assets_notes_zones_check;
alter table public.assets_notes add constraint assets_notes_zones_check
  check (zones is null or (jsonb_typeof(zones) = 'object' and jsonb_typeof(zones -> 'zones') = 'array' and jsonb_array_length(zones -> 'zones') <= 12 and pg_column_size(zones) <= 8000));

alter table public.atelier_notes add column if not exists appareil text not null default 'les-deux';
alter table public.atelier_notes add column if not exists zones jsonb;
alter table public.atelier_notes drop constraint if exists atelier_notes_appareil_check;
alter table public.atelier_notes add constraint atelier_notes_appareil_check check (appareil in ('ordinateur', 'mobile', 'les-deux'));
alter table public.atelier_notes drop constraint if exists atelier_notes_zones_check;
alter table public.atelier_notes add constraint atelier_notes_zones_check
  check (zones is null or (jsonb_typeof(zones) = 'object' and jsonb_typeof(zones -> 'zones') = 'array' and jsonb_array_length(zones -> 'zones') <= 12 and pg_column_size(zones) <= 8000));

alter table public.recettes_notes add column if not exists appareil text not null default 'les-deux';
alter table public.recettes_notes add column if not exists zones jsonb;
alter table public.recettes_notes add column if not exists page text;
alter table public.recettes_notes drop constraint if exists recettes_notes_appareil_check;
alter table public.recettes_notes add constraint recettes_notes_appareil_check check (appareil in ('ordinateur', 'mobile', 'les-deux'));
alter table public.recettes_notes drop constraint if exists recettes_notes_zones_check;
alter table public.recettes_notes add constraint recettes_notes_zones_check
  check (zones is null or (jsonb_typeof(zones) = 'object' and jsonb_typeof(zones -> 'zones') = 'array' and jsonb_array_length(zones -> 'zones') <= 12 and pg_column_size(zones) <= 8000));
-- Types de page du studio (recettes.ts, PAGES_STRUCTURE) ; null = recette entière
alter table public.recettes_notes drop constraint if exists recettes_notes_page_check;
alter table public.recettes_notes add constraint recettes_notes_page_check
  check (page is null or page in ('accueil', 'theme', 'fiche', 'article', 'actualites', 'cabinet', 'acces', 'questions', 'soins'));

create index if not exists recettes_notes_page_idx on public.recettes_notes (page, created_at desc) where page is not null;

-- ---------------------------------------------------------------------------------------------------------------
-- Défauts d'adaptation mobile
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.defauts_mobile (
  id uuid primary key default gen_random_uuid(),
  -- Élément concerné : variante, composant, structure de page, illustration… (même clé que assets_notes)
  cle text not null check (cle ~ '^[a-z]+:[^[:space:]]{1,200}$'),
  page text check (page is null or page in ('accueil', 'theme', 'fiche', 'article', 'actualites', 'cabinet', 'acces', 'questions', 'soins')),
  -- Recette du studio où le défaut a été vu (facultatif ; le défaut reste rattaché à l'élément, pas à la recette)
  recette uuid references public.recettes (id) on delete set null,
  verdict text not null check (verdict in ('ok', 'a_revoir')),
  note smallint check (note is null or note between 1 and 5),
  etiquettes text[] not null default '{}'
    check (cardinality(etiquettes) <= 12 and array_to_string(etiquettes, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$'),
  remarque text check (remarque is null or char_length(remarque) <= 2000),
  zones jsonb check (zones is null or (jsonb_typeof(zones) = 'object' and jsonb_typeof(zones -> 'zones') = 'array' and jsonb_array_length(zones -> 'zones') <= 12 and pg_column_size(zones) <= 8000)),
  -- Empreinte mobile au moment du retour (rendu-mobile.ts, empreinteMobile) : une feuille corrigée la change
  empreinte text check (empreinte is null or empreinte ~ '^[0-9a-f]{8}$'),
  largeur smallint check (largeur is null or largeur between 200 and 4000),
  statut text not null default 'a_corriger' check (statut in ('a_corriger', 'corrige', 'sans_objet')),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists defauts_mobile_cle_idx on public.defauts_mobile (cle, created_at desc);
create index if not exists defauts_mobile_ouverts_idx on public.defauts_mobile (statut, created_at desc) where statut = 'a_corriger';

create or replace function public.defauts_mobile_maj_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists defauts_mobile_maj_date on public.defauts_mobile;
create trigger defauts_mobile_maj_date before update on public.defauts_mobile
  for each row execute function public.defauts_mobile_maj_date();

alter table public.defauts_mobile enable row level security;

drop policy if exists "defauts mobile : lecture admin" on public.defauts_mobile;
drop policy if exists "defauts mobile : ajout admin" on public.defauts_mobile;
drop policy if exists "defauts mobile : statut admin" on public.defauts_mobile;

create policy "defauts mobile : lecture admin" on public.defauts_mobile
  for select to authenticated using (public.is_admin());
create policy "defauts mobile : ajout admin" on public.defauts_mobile
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());
-- Statut seulement (à corriger → corrigé…) ; aucune politique delete
create policy "defauts mobile : statut admin" on public.defauts_mobile
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.defauts_mobile from anon, authenticated;
grant select, insert on public.defauts_mobile to authenticated;
grant update (statut) on public.defauts_mobile to authenticated;
grant select, insert, update, delete on public.defauts_mobile to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- Lecture et apprentissage (sans auteur, remarques ni dates)
-- ---------------------------------------------------------------------------------------------------------------

-- Le type de retour change (colonne appareil) : la fonction est recréée
drop function if exists public.assets_notes_apprentissage(integer);
create function public.assets_notes_apprentissage(p_limite integer default 20000)
returns table (cle_asset text, type text, note smallint, etiquettes text[], statut text, appareil text)
language sql
stable
security definer
set search_path = ''
as $$
  (
    select n.cle_asset, n.type, n.note, n.etiquettes, null::text, n.appareil
    from public.assets_notes n
    order by n.created_at desc
    limit least(greatest(coalesce(p_limite, 20000), 1), 50000)
  )
  union all
  (
    select s.cle, split_part(s.cle, ':', 1), null::smallint, '{}'::text[], s.statut, 'les-deux'::text
    from public.illustrations_statuts s
    where s.statut in ('a_retravailler', 'retire')
  );
$$;

revoke all on function public.assets_notes_apprentissage(integer) from public, anon;
grant execute on function public.assets_notes_apprentissage(integer) to authenticated, service_role;

drop function if exists public.atelier_notes_apprentissage(integer);
create function public.atelier_notes_apprentissage(p_limite integer default 5000)
returns table (ingredients jsonb, note smallint, etiquettes text[], appareil text)
language sql
stable
security definer
set search_path = ''
as $$
  select n.ingredients, n.note, n.etiquettes, n.appareil
  from public.atelier_notes n
  order by n.created_at desc
  limit least(greatest(coalesce(p_limite, 5000), 1), 20000);
$$;

revoke all on function public.atelier_notes_apprentissage(integer) from public, anon;
grant execute on function public.atelier_notes_apprentissage(integer) to authenticated, service_role;

-- Notes PAR PAGE des recettes actives (renforts limités à la page : recettes.ts, sourcesNotesPages), avec la composition notée
-- (sinon celle de la recette) et ses sujets ; les notes de recette entière restent lues sur la recette (recettes_lecture).
create or replace function public.recettes_notes_apprentissage(p_limite integer default 5000)
returns table (recette uuid, page text, appareil text, note smallint, etiquettes text[], composition jsonb, sujets text[])
language sql
stable
security definer
set search_path = ''
as $$
  select n.recette, n.page, n.appareil, n.note, n.etiquettes, coalesce(n.composition, r.composition), r.sujets
  from public.recettes_notes n
  join public.recettes r on r.id = n.recette
  where r.statut = 'active' and n.page is not null
  order by n.created_at desc
  limit least(greatest(coalesce(p_limite, 5000), 1), 20000);
$$;

revoke all on function public.recettes_notes_apprentissage(integer) from public, anon;
grant execute on function public.recettes_notes_apprentissage(integer) to authenticated, service_role;

-- Défauts d'adaptation mobile ouverts (parcours des praticiens) : clé, page, nombre et étiquettes ; ni remarque, ni zones, ni
-- auteur. Une clé est ouverte si son dernier retour est « à revoir » au statut « à corriger ».
create or replace function public.defauts_mobile_ouverts()
returns table (cle text, page text, nombre integer, etiquettes text[], empreinte text)
language sql
stable
security definer
set search_path = ''
as $$
  with derniers as (
    select distinct on (d.cle) d.cle, d.verdict, d.created_at
    from public.defauts_mobile d
    order by d.cle, d.created_at desc
  )
  select d.cle, max(d.page), count(distinct d.id)::integer,
         coalesce(array_agg(distinct e) filter (where e is not null), '{}'::text[]),
         (array_agg(d.empreinte order by d.created_at desc))[1]
  from public.defauts_mobile d
  join derniers x on x.cle = d.cle and x.verdict = 'a_revoir'
  left join lateral unnest(d.etiquettes) as e on true
  where d.statut = 'a_corriger' and d.verdict = 'a_revoir'
  group by d.cle;
$$;

revoke all on function public.defauts_mobile_ouverts() from public, anon;
grant execute on function public.defauts_mobile_ouverts() to authenticated, service_role;
