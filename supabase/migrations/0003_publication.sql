-- Publication : le robot de publication (clé secrète = rôle service_role) peut mettre à jour
-- le statut, le slug, le domaine et la date de publication d'un site.

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
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Demande de publication horodatée par le back-office (affichage « publication en cours »).
alter table public.sites add column if not exists publication_demandee_at timestamptz;
