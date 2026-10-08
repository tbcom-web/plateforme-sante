-- Duels « A ou B ? » PAR PROFESSION (demande de Paul du 2026-10-09 : « duels et grilles par profession ») : chaque duel garde la
-- profession choisie dans l'en-tête de l'admin (registre packages/core/src/professions.ts, cookie admin-profession), comme les
-- grilles de la Dégustation (0042, degustation_choix.profession). L'apprentissage filtre comme la Dégustation
-- (packages/core/src/degustation.ts, duelsPourApprentissage) : goût de la profession + goût transversal (couleurs, polices,
-- typographie, détails, menus, effets, surfaces, pages, composants) et éléments communs (photos, illustrations partagées).
-- - duels.profession : nullable ; null = profession par défaut (tous les duels d'avant : podologie) ;
-- - duels_apprentissage() renvoie aussi la profession (toujours ni auteur ni remarque).
-- Rejouable : add column if not exists, contrainte posée une fois, drop/create de la fonction (type de retour changé).
-- À exécuter après 0037 (duels). Sans cette migration : l'admin lit et écrit les duels sans la colonne (comportement d'avant).

alter table public.duels add column if not exists profession text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'duels_profession_format' and conrelid = 'public.duels'::regclass) then
    alter table public.duels add constraint duels_profession_format check (profession is null or profession ~ '^[a-z0-9-]{2,40}$');
  end if;
end $$;

create index if not exists duels_profession_idx on public.duels (profession, created_at desc);

-- Lecture pour l'apprentissage (sans auteur ni remarque), plus récents d'abord, avec la profession
drop function if exists public.duels_apprentissage(integer);
create function public.duels_apprentissage(p_limite integer default 20000)
returns table (
  type text, scenario jsonb, a_cle text, b_cle text, a_ingredients jsonb, b_ingredients jsonb, dimension_differente text,
  resultat text, etiquettes text[], appareil text, prediction text, profession text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.type, d.scenario, d.a_cle, d.b_cle, d.a_ingredients - 'composition', d.b_ingredients - 'composition', d.dimension_differente,
    d.resultat, d.etiquettes, d.appareil, d.prediction, d.profession, d.created_at
  from public.duels d
  order by d.created_at desc
  limit least(greatest(coalesce(p_limite, 20000), 1), 50000);
$$;

revoke all on function public.duels_apprentissage(integer) from public, anon;
grant execute on function public.duels_apprentissage(integer) to authenticated, service_role;
