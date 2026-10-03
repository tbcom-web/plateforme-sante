-- Site de test : jamais indexé par les moteurs (noindex + robots.txt bloquant).
alter table public.sites add column if not exists test boolean not null default false;

-- Seul un admin (ou le robot) peut changer ce drapeau.
create or replace function public.protect_site_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() and current_user not in ('service_role', 'postgres') then
    new.owner := old.owner;
    new.slug := old.slug;
    new.statut := old.statut;
    new.domaine := old.domaine;
    new.published_at := old.published_at;
    new.test := old.test;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
