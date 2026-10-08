-- PUBLICATION DES RECETTES POUR LES PRATICIENS (décision de Paul du 2026-10-08 : « rends le flow de publication d'une recette simple ;
-- les recettes doivent être facilement visibles par les praticiens et apparaître en fonction de leur spécialité ») ;
-- packages/core/src/publication-recettes.ts, profils.ts, pratiques.ts ; page /admin/profils.
-- - recettes_publications : une ligne par recette publiée (ou dépubliée) : profession (professions.ts, slug de la table professions),
--   profils cibles (profils de référence de la profession : sport-basket, diabete…), ordre manuel facultatif, publiée ou non.
--   Dépublier = publiee à false (jamais de suppression par l'application). Écriture : admin seulement ; la vérification « aucun
--   élément à valider » est faite par l'admin avant chaque publication (verifierPublicationRecette) ;
-- - recettes_publiees(p_profession) : lecture pour le parcours /creer, ouverte aux comptes connectés (praticiens et sessions anonymes
--   de l'essai) : recettes ACTIVES publiées seulement, avec leur composition, ni auteur, ni remarques.
-- Rejouable : create … if not exists, create or replace, drop … if exists. À exécuter après 0042_degustation.sql.
-- Sans cette migration : /admin/profils affiche « Migration 0043 à exécuter », /creer propose les recettes comme avant.

create table if not exists public.recettes_publications (
  recette uuid primary key references public.recettes (id) on delete cascade,
  profession text not null default 'podologue' check (profession ~ '^[a-z0-9-]{2,40}$'),
  profils text[] not null
    check (cardinality(profils) between 1 and 12 and array_to_string(profils, ',') ~ '^[a-z0-9-]{2,40}(,[a-z0-9-]{2,40})*$'),
  ordre smallint check (ordre is null or ordre between 1 and 999),
  publiee boolean not null default true,
  publiee_le timestamptz,
  depubliee_le timestamptz,
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recettes_publications_profession_idx on public.recettes_publications (profession, publiee);
create index if not exists recettes_publications_profils_idx on public.recettes_publications using gin (profils);

create or replace function public.recettes_publications_maj()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.publiee and (tg_op = 'INSERT' or not old.publiee) then new.publiee_le := now(); end if;
  if not new.publiee and tg_op = 'UPDATE' and old.publiee then new.depubliee_le := now(); end if;
  return new;
end;
$$;

drop trigger if exists recettes_publications_maj on public.recettes_publications;
create trigger recettes_publications_maj before insert or update on public.recettes_publications
  for each row execute function public.recettes_publications_maj();

alter table public.recettes_publications enable row level security;

drop policy if exists "recettes publications : lecture" on public.recettes_publications;
drop policy if exists "recettes publications : ajout admin" on public.recettes_publications;
drop policy if exists "recettes publications : modification admin" on public.recettes_publications;

-- Lecture : l'admin voit tout ; un compte connecté (praticien, session anonyme de l'essai) voit les publications actives
create policy "recettes publications : lecture" on public.recettes_publications
  for select to authenticated using (publiee or public.is_admin());
create policy "recettes publications : ajout admin" on public.recettes_publications
  for insert to authenticated with check (public.is_admin());
-- Publier / dépublier / ordre / profils ; aucune politique delete : on dépublie
create policy "recettes publications : modification admin" on public.recettes_publications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.recettes_publications from anon, authenticated;
grant select, insert, update on public.recettes_publications to authenticated;
grant select, insert, update, delete on public.recettes_publications to service_role;

-- Lecture du parcours /creer : recettes actives publiées pour une profession (toutes si p_profession est null), sans auteur ni
-- remarques ni dates de la recette ; ordre manuel puis note.
create or replace function public.recettes_publiees(p_profession text default null)
returns table (
  id uuid, nom text, sujets text[], couleurs_preferees text[], composition jsonb, note smallint, etiquettes text[], statut text,
  profession text, profils text[], ordre smallint, publiee_le timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.nom, r.sujets, r.couleurs_preferees, r.composition, r.note, r.etiquettes, r.statut,
         p.profession, p.profils, p.ordre, p.publiee_le
  from public.recettes_publications p
  join public.recettes r on r.id = p.recette
  where p.publiee and r.statut = 'active' and (p_profession is null or p.profession = p_profession)
  order by p.ordre asc nulls last, r.note desc nulls last, r.updated_at desc
  limit 500;
$$;

revoke all on function public.recettes_publiees(text) from public, anon;
grant execute on function public.recettes_publiees(text) to authenticated, service_role;
