-- Univers du catalogue (packages/core/src/catalogue-univers.ts) : les préréglages vivent dans le code ; la base ne garde
-- que leur statut, posé par le super admin (« Valider pour le catalogue »), avec l'auteur et la date de validation.
-- Un univers « differe » (sujet à faible niveau de preuve) ne peut pas être validé : le code le refuse, et ce statut
-- n'est pas accepté ici.
create table if not exists public.univers_statuts (
  id text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  statut text not null default 'brouillon' check (statut in ('brouillon', 'valide', 'retire')),
  valide_par text,
  valide_le timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.univers_statuts enable row level security;

drop policy if exists "univers : lecture" on public.univers_statuts;
drop policy if exists "univers : écriture admin" on public.univers_statuts;
-- Lecture par tout utilisateur connecté : le parcours praticien (phase B) ne montre que les univers validés.
create policy "univers : lecture" on public.univers_statuts
  for select to authenticated using (true);
create policy "univers : écriture admin" on public.univers_statuts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.univers_statuts to authenticated;
grant select, insert, update, delete on public.univers_statuts to service_role;
