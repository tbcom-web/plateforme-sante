-- Banque visuelle : l'admin remplace les photos et l'animation par défaut de chaque spécialité.
-- Une ligne par spécialité (id = valeur de la spécialité) ; les champs vides gardent le pack intégré.
-- Les photos sont rangées dans le stockage « photos », dossier banque/<specialite>/.

create table if not exists public.packs_visuels (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  photos jsonb not null default '{}'::jsonb,
  -- null : animation du pack intégré ; 'aucune' : pas d'animation
  animation text check (animation in ('aucune', 'podoscope', 'coureur', 'trajectoire', 'premiers-pas', 'semelle')),
  updated_at timestamptz not null default now()
);

alter table public.packs_visuels enable row level security;

drop policy if exists "packs : lecture" on public.packs_visuels;
drop policy if exists "packs : écriture admin" on public.packs_visuels;
create policy "packs : lecture" on public.packs_visuels
  for select to authenticated using (true);
create policy "packs : écriture admin" on public.packs_visuels
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.packs_visuels to authenticated;
grant select, insert, update, delete on public.packs_visuels to service_role;

-- Stockage : dossier « banque » réservé aux admins, en plus des dossiers de site.
create or replace function public.peut_gerer_photos(chemin text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (split_part(chemin, '/', 1) = 'banque' and public.is_admin())
    or exists (
      select 1 from public.sites s
      where s.id::text = split_part(chemin, '/', 1)
        and (s.owner = auth.uid() or public.is_admin())
    );
$$;
