-- Mode duel « A ou B ? » (/admin/retours/duel, demande de Paul du 2026-10-07) : Paul choisit entre deux compositions, deux
-- photos, deux illustrations… pour le MÊME scénario ou le même sujet (la plupart des duels ne diffèrent que par UNE dimension).
-- - duels : journal en AJOUT SEUL (aucune mise à jour ni suppression par les comptes connectés), lu et écrit par l'admin ;
-- - duels_apprentissage() : lecture pour l'apprentissage (packages/core/src/duels.ts, renfortsDuels → getPoidsAtelier), ouverte
--   à tous les comptes connectés (parcours des praticiens, sessions anonymes de l'essai) : type, scénario, clés, ingrédients,
--   dimension, résultat, étiquettes, appareil, prédiction, date — ni auteur ni remarque.
-- Rejouable : create … if not exists, create or replace, drop … if exists. À exécuter après 0036.
-- Sans cette migration, la page duel fonctionne (duels gardés dans le navigateur, « Migration à exécuter »).

create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('theme', 'typo', 'traitement', 'element', 'photo', 'illustration')),
  -- Scénario client : sujets (principaux puis secondaires), couleurs, page, emplacement
  scenario jsonb not null default '{}'::jsonb check (jsonb_typeof(scenario) = 'object' and pg_column_size(scenario) <= 4000),
  -- Clé de ce que montre chaque côté : clé d'asset (photo:…, heros:…) ou composition (compo:<16 hex>)
  a_cle text not null check (a_cle ~ '^[a-z]+:[^[:space:]]{1,200}$'),
  b_cle text not null check (b_cle ~ '^[a-z]+:[^[:space:]]{1,200}$'),
  -- Clés d'apprentissage (atelier, assets), élément classé, clés du juge, composition complète
  a_ingredients jsonb not null default '{}'::jsonb check (jsonb_typeof(a_ingredients) = 'object' and pg_column_size(a_ingredients) <= 20000),
  b_ingredients jsonb not null default '{}'::jsonb check (jsonb_typeof(b_ingredients) = 'object' and pg_column_size(b_ingredients) <= 20000),
  -- Seule dimension qui diffère (polices, couleurs, composant:horaires, photo, style, version…) ; null = duel libre
  dimension_differente text check (dimension_differente is null or dimension_differente ~ '^[a-z0-9:_-]{1,60}$'),
  resultat text not null check (resultat in ('a', 'b', 'egalite', 'mauvais')),
  etiquettes text[] not null default '{}'
    check (cardinality(etiquettes) <= 12 and array_to_string(etiquettes, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$'),
  remarque text check (remarque is null or char_length(remarque) <= 1000),
  appareil text check (appareil is null or appareil in ('ordinateur', 'mobile', 'les-deux')),
  -- Gagnant prédit par le juge (retours/predictions.json) au moment du duel : mesure de l'accord
  prediction text check (prediction is null or prediction in ('a', 'b', 'egalite')),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint duels_cotes_distincts check (a_cle <> b_cle)
);

create index if not exists duels_type_idx on public.duels (type, created_at desc);
create index if not exists duels_paire_idx on public.duels (a_cle, b_cle);

alter table public.duels enable row level security;
drop policy if exists "duels : admin lecture" on public.duels;
create policy "duels : admin lecture" on public.duels
  for select to authenticated using (public.is_admin());
drop policy if exists "duels : admin ajout" on public.duels;
create policy "duels : admin ajout" on public.duels
  for insert to authenticated with check (public.is_admin());

-- Journal en ajout seul : ni update ni delete pour les comptes connectés
revoke all on public.duels from anon, authenticated;
grant select, insert on public.duels to authenticated;
grant select, insert, update, delete on public.duels to service_role;

-- Lecture pour l'apprentissage (sans auteur ni remarque), plus récents d'abord
create or replace function public.duels_apprentissage(p_limite integer default 20000)
returns table (
  type text, scenario jsonb, a_cle text, b_cle text, a_ingredients jsonb, b_ingredients jsonb, dimension_differente text,
  resultat text, etiquettes text[], appareil text, prediction text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.type, d.scenario, d.a_cle, d.b_cle, d.a_ingredients - 'composition', d.b_ingredients - 'composition', d.dimension_differente,
    d.resultat, d.etiquettes, d.appareil, d.prediction, d.created_at
  from public.duels d
  order by d.created_at desc
  limit least(greatest(coalesce(p_limite, 20000), 1), 50000);
$$;

revoke all on function public.duels_apprentissage(integer) from public, anon;
grant execute on function public.duels_apprentissage(integer) to authenticated, service_role;
