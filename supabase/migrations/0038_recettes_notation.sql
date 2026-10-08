-- Notation des RECETTES COMPLÈTES (/admin/retours/recettes, demande de Paul du 2026-10-08 ; packages/core/src/notation-recettes.ts) :
-- une recette entière (générée par le système, proposée par Claude ou enregistrée) notée d'un bloc : étoiles, « Pour » / « Contre »
-- (texte court + étiquettes qui peuvent viser une dimension : couleurs, polices, premier écran…), « Garder cette recette ».
-- - recettes_notation : journal en AJOUT SEUL (ni mise à jour ni suppression par les comptes connectés), lu et écrit par l'admin ;
--   « Garder » crée en plus une recette (table recettes, étiquette « gardee ») dont l'identifiant est noté ici ;
-- - recettes_notation_apprentissage() : lecture pour l'apprentissage automatique (getPoidsAtelier : ingrédients, paires, familles,
--   clés du générateur), ouverte à tous les comptes connectés (parcours des praticiens, sessions anonymes de l'essai) : scénario,
--   composition, note, garder, étiquettes, appareil, recette, date — ni auteur ni texte libre.
-- Rejouable : create … if not exists, create or replace, drop … if exists. À exécuter après 0037_duels.sql.
-- Sans cette migration, la tuile fonctionne (notes gardées dans le navigateur, « Migration à exécuter »).

create table if not exists public.recettes_notation (
  id uuid primary key default gen_random_uuid(),
  -- Clé stable de la composition notée (même forme que les duels)
  cle text not null check (cle ~ '^compo:[0-9a-f]{16}$'),
  source text not null default 'generateur' check (source in ('generateur', 'claude', 'recette')),
  -- Identifiant de la proposition de Claude ou de la recette d'origine
  source_id text check (source_id is null or source_id ~ '^[A-Za-z0-9._-]{1,80}$'),
  scenario jsonb not null default '{}'::jsonb check (jsonb_typeof(scenario) = 'object' and pg_column_size(scenario) <= 4000),
  composition jsonb not null check (jsonb_typeof(composition) = 'object' and pg_column_size(composition) <= 8000),
  note smallint check (note is null or note between 1 and 5),
  garder boolean not null default false,
  etiquettes_pour text[] not null default '{}'
    check (cardinality(etiquettes_pour) <= 12 and array_to_string(etiquettes_pour, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$'),
  etiquettes_contre text[] not null default '{}'
    check (cardinality(etiquettes_contre) <= 12 and array_to_string(etiquettes_contre, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$'),
  pour text check (pour is null or char_length(pour) <= 500),
  contre text check (contre is null or char_length(contre) <= 500),
  appareil text check (appareil is null or appareil in ('ordinateur', 'mobile', 'les-deux')),
  -- Recette créée par « Garder » (lien conservé si la recette est archivée)
  recette uuid references public.recettes (id) on delete set null,
  -- Score prédit par le système au moment de la note et part d'exploration (mesure de l'apprentissage)
  predit numeric(4, 2) check (predit is null or predit between 0 and 5),
  exploration boolean not null default false,
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint recettes_notation_signal check (note is not null or garder or cardinality(etiquettes_pour) + cardinality(etiquettes_contre) > 0)
);

create index if not exists recettes_notation_cle_idx on public.recettes_notation (cle);
create index if not exists recettes_notation_date_idx on public.recettes_notation (created_at desc);

alter table public.recettes_notation enable row level security;
drop policy if exists "recettes notation : admin lecture" on public.recettes_notation;
create policy "recettes notation : admin lecture" on public.recettes_notation
  for select to authenticated using (public.is_admin());
drop policy if exists "recettes notation : admin ajout" on public.recettes_notation;
create policy "recettes notation : admin ajout" on public.recettes_notation
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());

-- Journal en ajout seul : ni update ni delete pour les comptes connectés
revoke all on public.recettes_notation from anon, authenticated;
grant select, insert on public.recettes_notation to authenticated;
grant select, insert, update, delete on public.recettes_notation to service_role;

-- Lecture pour l'apprentissage (sans auteur ni texte libre), plus récentes d'abord
create or replace function public.recettes_notation_apprentissage(p_limite integer default 5000)
returns table (
  cle text, source text, scenario jsonb, composition jsonb, note smallint, garder boolean, etiquettes_pour text[], etiquettes_contre text[],
  appareil text, recette uuid, exploration boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.cle, n.source, n.scenario, n.composition, n.note, n.garder, n.etiquettes_pour, n.etiquettes_contre, n.appareil, n.recette, n.exploration, n.created_at
  from public.recettes_notation n
  order by n.created_at desc
  limit least(greatest(coalesce(p_limite, 5000), 1), 20000);
$$;

revoke all on function public.recettes_notation_apprentissage(integer) from public, anon;
grant execute on function public.recettes_notation_apprentissage(integer) to authenticated, service_role;
