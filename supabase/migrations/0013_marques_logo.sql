-- Marques de logo importées par l'admin (SVG nettoyé par importerMarqueSvg, packages/core/src/marques-importees.ts).
-- Elles s'ajoutent aux marques dessinées par le code ; importées inactives, activées après vérification.
create table if not exists public.marques_logo (
  id text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  metier text not null default 'podologie',
  nom text not null,
  sens text not null default '',
  view_box text not null,
  contenu text not null,
  actif boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marques_logo enable row level security;

drop policy if exists "marques : lecture" on public.marques_logo;
drop policy if exists "marques : écriture admin" on public.marques_logo;
create policy "marques : lecture" on public.marques_logo
  for select to authenticated using (actif or public.is_admin());
create policy "marques : écriture admin" on public.marques_logo
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.marques_logo to authenticated;
grant select, insert, update, delete on public.marques_logo to service_role;
