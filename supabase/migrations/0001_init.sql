-- Schéma initial de la plateforme : profils, base métier, sites.
-- Aucune donnée de patient n'est stockée ici.

-- ---------------------------------------------------------------------------
-- Profils (1 par compte Supabase Auth)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'praticien' check (role in ('praticien', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Vrai si l'utilisateur connecté est super admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profil : lecture de son profil" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

-- Le rôle ne se modifie que par un admin.
create policy "profil : modification par un admin" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Création automatique du profil à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Base métier (écrite par TBCOM, lue par les praticiens)
-- ---------------------------------------------------------------------------
create table public.professions (
  slug text primary key,
  libelle text not null,
  specialite_schema text not null,
  ordre text not null
);

create table public.soins_catalogue (
  id uuid primary key default gen_random_uuid(),
  profession_slug text not null references public.professions (slug) on delete cascade,
  slug text not null,
  titre_court text not null,
  titre text not null,
  resume text not null,
  corps text not null,
  faq jsonb not null default '[]'::jsonb,
  position int not null default 0,
  unique (profession_slug, slug)
);

alter table public.professions enable row level security;
alter table public.soins_catalogue enable row level security;

create policy "professions : lecture" on public.professions
  for select to authenticated using (true);
create policy "professions : écriture admin" on public.professions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "catalogue : lecture" on public.soins_catalogue
  for select to authenticated using (true);
create policy "catalogue : écriture admin" on public.soins_catalogue
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Sites des praticiens
-- ---------------------------------------------------------------------------
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  slug text unique,
  profession_slug text not null references public.professions (slug),
  statut text not null default 'brouillon' check (statut in ('brouillon', 'en_ligne', 'suspendu')),
  domaine text,
  niveau_conformite text not null default 'standard' check (niveau_conformite in ('strict', 'standard', 'libre')),
  -- Brouillon édité dans le back-office (voir SiteDraft dans packages/core).
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index sites_owner_idx on public.sites (owner);

alter table public.sites enable row level security;

create policy "sites : lecture de ses sites" on public.sites
  for select to authenticated using (owner = auth.uid() or public.is_admin());
create policy "sites : création pour soi" on public.sites
  for insert to authenticated with check (owner = auth.uid() or public.is_admin());
create policy "sites : modification de ses sites" on public.sites
  for update to authenticated using (owner = auth.uid() or public.is_admin())
  with check (owner = auth.uid() or public.is_admin());
create policy "sites : suppression admin" on public.sites
  for delete to authenticated using (public.is_admin());

-- Un praticien ne peut pas changer lui-même le statut, le domaine ou le propriétaire.
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
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger sites_protect_columns
  before update on public.sites
  for each row execute function public.protect_site_columns();

-- ---------------------------------------------------------------------------
-- Droits d'accès explicites à l'API (les tables ne sont pas exposées par défaut).
-- Les visiteurs non connectés (anon) n'ont accès à rien ; RLS filtre ensuite ligne par ligne.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (role) on public.profiles to authenticated;
grant select on public.professions, public.soins_catalogue to authenticated;
grant insert, update, delete on public.professions, public.soins_catalogue to authenticated;
grant select, insert, update, delete on public.sites to authenticated;
grant execute on function public.is_admin() to authenticated;
