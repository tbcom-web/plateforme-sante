-- Studio de recettes (/admin/atelier/studio, super admin ; packages/core/src/recettes.ts) : compositions complètes de site
-- (structure, gamme ou couleur libre, paire de polices, visuels, photos, ordre et variantes des sections, jeu d'effets) en
-- identifiants seulement, nommées, notées et étiquetées par Paul.
-- - recettes : une ligne par recette ; modifiable par l'admin (nom, note, étiquettes, remarques, composition), archivée plutôt
--   que supprimée (aucune suppression par l'application) ;
-- - recettes_notes : journal des notes en AJOUT SEUL (chaque note donnée, avec ses étiquettes et remarques) ;
-- - recettes_lecture(p_note_min) : lecture pour le parcours /creer (« Votre site » : recettes du sujet d'abord) et pour
--   l'apprentissage (renforts des ingrédients), ouverte aux comptes connectés (sessions anonymes de l'essai comprises) :
--   recettes actives seulement, ni auteur, ni remarques, ni dates ;
-- - assets_notes : nouveaux types notables `structure` (structure d'un type de page), `effets` (jeu d'effets), `composant`
--   (présentation d'un élément : horaires, plan d'accès, galerie, questions…).
-- Rejouable : if not exists, create or replace, drop … if exists. À exécuter après 0031_photos_libres_import_differe.sql.

create table if not exists public.recettes (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(btrim(nom)) between 1 and 120),
  sujets text[] not null default '{}'
    check (cardinality(sujets) <= 6 and array_to_string(sujets, ',') ~ '^([a-z-]{2,30}(,[a-z-]{2,30})*)?$'),
  couleurs_preferees text[] not null default '{}'
    check (cardinality(couleurs_preferees) <= 3 and array_to_string(couleurs_preferees, ',') ~ '^([a-z-]{2,20}(,[a-z-]{2,20})*)?$'),
  composition jsonb not null check (jsonb_typeof(composition) = 'object' and pg_column_size(composition) <= 8000),
  note smallint check (note is null or note between 1 and 5),
  etiquettes text[] not null default '{}'
    check (cardinality(etiquettes) <= 12 and array_to_string(etiquettes, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$'),
  positif text check (positif is null or char_length(positif) <= 2000),
  negatif text check (negatif is null or char_length(negatif) <= 2000),
  statut text not null default 'active' check (statut in ('active', 'archivee')),
  -- Recette d'origine (« Dupliquer »)
  origine uuid references public.recettes (id) on delete set null,
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recettes_statut_note_idx on public.recettes (statut, note desc nulls last, updated_at desc);
create index if not exists recettes_sujets_idx on public.recettes using gin (sujets);

create or replace function public.recettes_maj_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists recettes_maj_date on public.recettes;
create trigger recettes_maj_date before update on public.recettes
  for each row execute function public.recettes_maj_date();

create table if not exists public.recettes_notes (
  id uuid primary key default gen_random_uuid(),
  recette uuid not null references public.recettes (id) on delete cascade,
  note smallint not null check (note between 1 and 5),
  etiquettes text[] not null default '{}'
    check (cardinality(etiquettes) <= 12 and array_to_string(etiquettes, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$'),
  positif text check (positif is null or char_length(positif) <= 2000),
  negatif text check (negatif is null or char_length(negatif) <= 2000),
  -- Composition au moment de la note (une recette modifiée ensuite garde l'historique de ce qui a été noté)
  composition jsonb check (composition is null or (jsonb_typeof(composition) = 'object' and pg_column_size(composition) <= 8000)),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists recettes_notes_recette_idx on public.recettes_notes (recette, created_at desc);

alter table public.recettes enable row level security;
alter table public.recettes_notes enable row level security;

drop policy if exists "recettes : lecture admin" on public.recettes;
drop policy if exists "recettes : ajout admin" on public.recettes;
drop policy if exists "recettes : modification admin" on public.recettes;
drop policy if exists "recettes notes : lecture admin" on public.recettes_notes;
drop policy if exists "recettes notes : ajout admin" on public.recettes_notes;

create policy "recettes : lecture admin" on public.recettes
  for select to authenticated using (public.is_admin());
create policy "recettes : ajout admin" on public.recettes
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());
-- Modification (nom, note, étiquettes, remarques, composition, archivage) ; aucune politique delete : on archive
create policy "recettes : modification admin" on public.recettes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "recettes notes : lecture admin" on public.recettes_notes
  for select to authenticated using (public.is_admin());
-- Journal en ajout seul, au nom de l'admin connecté ; ni update ni delete
create policy "recettes notes : ajout admin" on public.recettes_notes
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());

revoke all on public.recettes from anon, authenticated;
revoke all on public.recettes_notes from anon, authenticated;
grant select, insert, update on public.recettes to authenticated;
grant select, insert on public.recettes_notes to authenticated;
grant select, insert, update, delete on public.recettes to service_role;
grant select, insert, update, delete on public.recettes_notes to service_role;

-- Lecture du parcours et de l'apprentissage : recettes actives notées au moins p_note_min, sans auteur, remarques ni dates.
create or replace function public.recettes_lecture(p_note_min integer default 4)
returns table (id uuid, nom text, sujets text[], couleurs_preferees text[], composition jsonb, note smallint, etiquettes text[], statut text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.nom, r.sujets, r.couleurs_preferees, r.composition, r.note, r.etiquettes, r.statut
  from public.recettes r
  where r.statut = 'active' and r.note is not null and r.note >= least(greatest(coalesce(p_note_min, 4), 1), 5)
  order by r.note desc, r.updated_at desc
  limit 500;
$$;

revoke all on function public.recettes_lecture(integer) from public, anon;
grant execute on function public.recettes_lecture(integer) to authenticated, service_role;

-- Notes des assets : types du studio de recettes (le type reste le préfixe de la clé : assets_notes_type_cle)
alter table public.assets_notes drop constraint if exists assets_notes_type_check;
alter table public.assets_notes add constraint assets_notes_type_check
  check (type in ('picto', 'dessin', 'ligne', 'materiel', 'animation', 'heros', 'biblio', 'photo', 'modele', 'gamme', 'structure', 'effets', 'composant'));
