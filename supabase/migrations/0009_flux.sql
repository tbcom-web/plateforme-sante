-- Flux de contenus : articles rédigés par le super admin, proposés aux sites, publiés par les praticiens.

create table if not exists public.articles_flux (
  id uuid primary key default gen_random_uuid(),
  profession_slug text not null references public.professions (slug) default 'podologue',
  slug text not null unique,
  titre text not null,
  resume text not null,
  corps text not null,
  theme text not null,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'diffuse')),
  date_publication date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_articles (
  site_id uuid not null references public.sites (id) on delete cascade,
  article_id uuid not null references public.articles_flux (id) on delete cascade,
  statut text not null default 'propose' check (statut in ('propose', 'publie', 'ignore')),
  propose_le timestamptz not null default now(),
  decide_le timestamptz,
  primary key (site_id, article_id)
);

create index if not exists site_articles_article_idx on public.site_articles (article_id);

alter table public.articles_flux enable row level security;
alter table public.site_articles enable row level security;

-- Articles : lisibles par tous les comptes une fois diffusés ; rédigés par les admins.
drop policy if exists "flux : lecture" on public.articles_flux;
drop policy if exists "flux : écriture admin" on public.articles_flux;
create policy "flux : lecture" on public.articles_flux
  for select to authenticated using (statut = 'diffuse' or public.is_admin());
create policy "flux : écriture admin" on public.articles_flux
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Propositions : visibles et modifiables par le propriétaire du site ; créées par les admins.
drop policy if exists "propositions : lecture" on public.site_articles;
drop policy if exists "propositions : décision" on public.site_articles;
drop policy if exists "propositions : création admin" on public.site_articles;
drop policy if exists "propositions : suppression admin" on public.site_articles;
create policy "propositions : lecture" on public.site_articles
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.sites s where s.id = site_id and s.owner = auth.uid()));
create policy "propositions : décision" on public.site_articles
  for update to authenticated
  using (public.is_admin() or exists (select 1 from public.sites s where s.id = site_id and s.owner = auth.uid()))
  with check (statut in ('propose', 'publie', 'ignore'));
create policy "propositions : création admin" on public.site_articles
  for insert to authenticated with check (public.is_admin());
create policy "propositions : suppression admin" on public.site_articles
  for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.articles_flux, public.site_articles to authenticated;
grant select, insert, update, delete on public.articles_flux, public.site_articles to service_role;
