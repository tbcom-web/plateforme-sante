-- Modèles de sites importables par l'admin (fiche JSON validée par validerManifeste côté appli),
-- et options payantes activables site par site (ex. édition des pages par le praticien).

create table if not exists public.modeles (
  id text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  nom text not null,
  manifeste jsonb not null,
  version int not null default 1,
  actif boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.modeles enable row level security;

drop policy if exists "modeles : lecture" on public.modeles;
drop policy if exists "modeles : écriture admin" on public.modeles;
create policy "modeles : lecture" on public.modeles
  for select to authenticated using (actif or public.is_admin());
create policy "modeles : écriture admin" on public.modeles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.modeles to authenticated;
grant select, insert, update, delete on public.modeles to service_role;

-- Options payantes : {"edition": true, …}. Seul un admin peut les changer (voir déclencheur).
alter table public.sites add column if not exists options jsonb not null default '{}'::jsonb;

create or replace function public.protect_site_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() then
    new.owner := old.owner;
    new.statut := old.statut;
    new.domaine := old.domaine;
    new.published_at := old.published_at;
    new.options := old.options;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- À la création, un praticien ne peut pas s'attribuer d'options.
create or replace function public.protect_site_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() then
    new.options := '{}'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists sites_protect_insert on public.sites;
create trigger sites_protect_insert
  before insert on public.sites
  for each row execute function public.protect_site_insert();
