-- Rétablit la protection complète des colonnes sensibles des sites (régression de 0010).
-- 0010 avait réécrit protect_site_columns en oubliant :
--   - slug et test (un praticien pouvait changer son slug, qui sert de nom de projet Cloudflare) ;
--   - l'exemption du robot de publication (clé secrète = service_role), dont les mises à jour de statut,
--     domaine et published_at étaient annulées en silence.

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
    new.options := old.options;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- À la création, un praticien ne peut s'attribuer ni options, ni slug, ni statut.
create or replace function public.protect_site_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() and current_user not in ('service_role', 'postgres') then
    new.options := '{}'::jsonb;
    new.slug := null;
    new.statut := 'brouillon';
    new.test := false;
  end if;
  return new;
end;
$$;
