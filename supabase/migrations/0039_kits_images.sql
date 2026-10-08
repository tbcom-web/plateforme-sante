-- Kits d'images par sujet (/admin/retours/kits, demande de Paul du 2026-10-08 ; packages/core/src/kits-images.ts) : le kit est
-- composé EN DIRECT (photos notées, sujets, hashtags, poids appris) ; Paul le note (« Noter ce kit ») et peut le GARDER (il passe
-- alors en premier pour ce sujet tant que ses photos restent valides).
-- - kits_images_notes : journal en AJOUT SEUL, lu et écrit par l'admin ;
-- - kits_images_apprentissage() : lecture pour l'apprentissage (renfortsKits : chaque photo du kit) et les kits gardés, ouverte aux
--   comptes connectés (parcours des praticiens, sessions anonymes de l'essai) : sujet, rang, note, garder, photos, appareil, date —
--   ni auteur ni remarque.
-- Rejouable : create … if not exists, create or replace, drop … if exists. À exécuter après 0038_recettes_notation.sql.
-- Sans cette migration, la vue des kits fonctionne (notes gardées dans le navigateur, « Migration à exécuter »).

create table if not exists public.kits_images_notes (
  id uuid primary key default gen_random_uuid(),
  sujet text not null check (sujet ~ '^[a-z-]{2,30}$'),
  rang smallint not null default 0 check (rang between 0 and 99),
  -- Clé du kit noté (kit:<sujet>:<8 hex>)
  cle text not null check (cle ~ '^kit:[a-z-]{2,30}:[0-9a-f]{8}$'),
  -- Photos du kit : [{ emplacement, url }] (accueil, page-sujet, cabinet, soin:<slug>)
  photos jsonb not null check (jsonb_typeof(photos) = 'array' and pg_column_size(photos) <= 12000),
  note smallint check (note is null or note between 1 and 5),
  garder boolean not null default false,
  remarque text check (remarque is null or char_length(remarque) <= 1000),
  appareil text check (appareil is null or appareil in ('ordinateur', 'mobile', 'les-deux')),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint kits_images_notes_signal check (note is not null or garder)
);

create index if not exists kits_images_notes_sujet_idx on public.kits_images_notes (sujet, created_at desc);

alter table public.kits_images_notes enable row level security;
drop policy if exists "kits images : admin lecture" on public.kits_images_notes;
create policy "kits images : admin lecture" on public.kits_images_notes
  for select to authenticated using (public.is_admin());
drop policy if exists "kits images : admin ajout" on public.kits_images_notes;
create policy "kits images : admin ajout" on public.kits_images_notes
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());

revoke all on public.kits_images_notes from anon, authenticated;
grant select, insert on public.kits_images_notes to authenticated;
grant select, insert, update, delete on public.kits_images_notes to service_role;

create or replace function public.kits_images_apprentissage(p_limite integer default 2000)
returns table (sujet text, rang smallint, note smallint, garder boolean, photos jsonb, appareil text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select k.sujet, k.rang, k.note, k.garder, k.photos, k.appareil, k.created_at
  from public.kits_images_notes k
  order by k.created_at desc
  limit least(greatest(coalesce(p_limite, 2000), 1), 10000);
$$;

revoke all on function public.kits_images_apprentissage(integer) from public, anon;
grant execute on function public.kits_images_apprentissage(integer) to authenticated, service_role;
