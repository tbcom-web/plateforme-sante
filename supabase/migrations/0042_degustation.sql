-- 🍽 Dégustation (/admin/degustation, décision de Paul du 2026-10-08) : grilles « Choisis tes 2 préférées parmi 6 ».
-- - degustation_choix : journal en AJOUT SEUL (aucune mise à jour ni suppression par les comptes connectés), lu et écrit par
--   l'admin : format, dimension qui varie, scénario, propositions (clés, ingrédients d'apprentissage, composition), préférées dans
--   l'ordre touché, « celle qui ne va pas », pari caché du juge, appareil, session, durée, profession ;
-- - degustation_apprentissage() : lecture pour l'apprentissage (packages/core/src/degustation.ts, duelsDepuisChoix → duels
--   équivalents versés dans renfortsDuels → getPoidsAtelier), ouverte à tous les comptes connectés : ni auteur, ni session, ni
--   texte libre (il n'y en a pas), compositions retirées des ingrédients.
-- Rejouable : create … if not exists, create or replace, drop … if exists. À exécuter après 0041.
-- Sans cette migration, la Dégustation fonctionne (choix gardés dans le navigateur, « Migration à exécuter »).

create table if not exists public.degustation_choix (
  id uuid primary key default gen_random_uuid(),
  format text not null check (format in ('compositions', 'palettes-polices', 'premiers-ecrans', 'kits', 'icones', 'pages')),
  -- Type de duel équivalent (même moteur que la table duels, 0037)
  type text not null check (type in ('theme', 'typo', 'traitement', 'element', 'photo', 'illustration')),
  -- Seule dimension qui varie d'une proposition à l'autre (couleurs, polices, composant:accueil, page:soins, photo, variante:style…)
  dimension text not null check (dimension ~ '^[a-z0-9:_-]{1,60}$'),
  scenario jsonb not null default '{}'::jsonb check (jsonb_typeof(scenario) = 'object' and pg_column_size(scenario) <= 4000),
  -- 2 à 6 propositions : { cle, ingredients } (ingrédients au même format que duels.a_ingredients)
  propositions jsonb not null check (
    jsonb_typeof(propositions) = 'array' and jsonb_array_length(propositions) between 2 and 6 and pg_column_size(propositions) <= 120000
  ),
  -- Préférées dans l'ordre où Paul les a touchées (n° 1 puis n° 2)
  meilleures smallint[] not null check (cardinality(meilleures) between 1 and 2 and 0 <= all (meilleures) and 5 >= all (meilleures)),
  pire smallint check (pire is null or (pire between 0 and 5 and not (pire = any (meilleures)))),
  -- Pari caché du juge (indice de la proposition), mesure « Bats Claude »
  pari smallint check (pari is null or pari between 0 and 5),
  appareil text check (appareil is null or appareil in ('ordinateur', 'mobile', 'les-deux')),
  session text check (session is null or session ~ '^[a-z0-9-]{4,40}$'),
  duree_ms integer check (duree_ms is null or duree_ms between 0 and 3600000),
  -- Profession dégustée (registre packages/core/src/professions.ts) ; null = profession par défaut
  profession text check (profession is null or profession ~ '^[a-z0-9-]{2,40}$'),
  -- Profil dégusté (profil de pratique « sport-basket », sinon scénario type) : missions et jauges par profil
  profil text check (profil is null or profil ~ '^[a-z0-9~.+_-]{2,80}$'),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists degustation_choix_date_idx on public.degustation_choix (created_at desc);
create index if not exists degustation_choix_profession_idx on public.degustation_choix (profession, created_at desc);

alter table public.degustation_choix enable row level security;
drop policy if exists "degustation_choix : admin lecture" on public.degustation_choix;
create policy "degustation_choix : admin lecture" on public.degustation_choix
  for select to authenticated using (public.is_admin());
drop policy if exists "degustation_choix : admin ajout" on public.degustation_choix;
create policy "degustation_choix : admin ajout" on public.degustation_choix
  for insert to authenticated with check (public.is_admin());

-- Journal en ajout seul : ni update ni delete pour les comptes connectés
revoke all on public.degustation_choix from anon, authenticated;
grant select, insert on public.degustation_choix to authenticated;
grant select, insert, update, delete on public.degustation_choix to service_role;

-- Lecture pour l'apprentissage (sans auteur ni session), compositions retirées, plus récents d'abord
create or replace function public.degustation_apprentissage(p_limite integer default 20000)
returns table (
  format text, type text, dimension text, scenario jsonb, propositions jsonb, meilleures smallint[], pire smallint, pari smallint,
  appareil text, profession text, profil text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.format, c.type, c.dimension, c.scenario,
    (select coalesce(jsonb_agg(jsonb_build_object('cle', p.v -> 'cle', 'ingredients', coalesce(p.v -> 'ingredients', '{}'::jsonb) - 'composition') order by p.i), '[]'::jsonb)
       from jsonb_array_elements(c.propositions) with ordinality as p(v, i)),
    c.meilleures, c.pire, c.pari, c.appareil, c.profession, c.profil, c.created_at
  from public.degustation_choix c
  order by c.created_at desc
  limit least(greatest(coalesce(p_limite, 20000), 1), 50000);
$$;

revoke all on function public.degustation_apprentissage(integer) from public, anon;
grant execute on function public.degustation_apprentissage(integer) to authenticated, service_role;
