set lock_timeout = '10s';
-- 0058 : PROSPECTION, CABINETS ET ACTUALITÉS (demande de Paul du 2026-10-10 : « distinguer le praticien du cabinet, identifier les
-- titulaires qui ont plus de points ; tracker les news sur l'arrivée de nouveaux collaborateurs dans une structure ou leur
-- départ »). packages/core/src/prospection-evenements.ts (événements, testé), prospection-score.ts (le titulaire hérite de la vie
-- de son cabinet), scripts/synchro-rpps.mjs, /admin/prospection/cabinets, /cabinet/[cle], /actualites ; docs/prospection-rpps.md.
-- Rejouable, après 0057. NON exécutée par les agents : à lancer par Paul dans l'éditeur SQL de Supabase.
--
-- 1. prospection_evenements : journal EN AJOUT SEUL des mouvements constatés d'une nuit à l'autre (nouveau cabinet, arrivée,
--    départ, cabinet vidé, changement de rôle, déménagement), dénormalisé (nom, commune, cabinet) pour le fil d'actualités.
--    Écrit par le script seulement. Les mouvements antérieurs au 2026-10-09 (import initial) ne sont pas connus.
-- 2. prospection_cabinets : vue d'une ligne par structure RPPS : membres présents par rôle, partis, meilleur score, dernier mouvement.

create table if not exists public.prospection_evenements (
  id uuid primary key default gen_random_uuid(),
  le date not null,
  type text not null check (type in ('nouveau_cabinet', 'arrivee', 'depart', 'fermeture', 'role', 'demenagement')),
  cle text not null,
  rpps text not null check (rpps ~ '^[0-9]{11}$'),
  structure_cle text,
  departement text,
  commune text,
  praticien text,
  cabinet text,
  details jsonb not null default '{}'::jsonb
);
create index if not exists prospection_evenements_le on public.prospection_evenements (le desc);
create index if not exists prospection_evenements_structure on public.prospection_evenements (structure_cle);
create index if not exists prospection_evenements_rpps on public.prospection_evenements (rpps);
create unique index if not exists prospection_evenements_unique on public.prospection_evenements (le, type, cle);

alter table public.prospection_evenements enable row level security;
drop policy if exists "prospection_evenements : lecture admin" on public.prospection_evenements;
create policy "prospection_evenements : lecture admin" on public.prospection_evenements for select to authenticated using (public.is_admin());
revoke all on public.prospection_evenements from anon, authenticated;
grant select on public.prospection_evenements to authenticated;
grant select, insert, update, delete on public.prospection_evenements to service_role;

create or replace view public.prospection_cabinets with (security_invoker = true) as
  select
    p.structure_cle,
    max(coalesce(nullif(p.enseigne, ''), nullif(p.raison_sociale, ''), p.entreprise_nom)) as nom,
    max(p.adresse) as adresse,
    max(p.code_postal) as code_postal,
    max(p.commune) as commune,
    max(p.departement) as departement,
    max(p.secteur) as secteur,
    bool_or(p.mode_exercice ilike 'lib%') as liberal,
    count(*) filter (where p.disparu_le is null) as presents,
    count(*) filter (where p.disparu_le is null and p.role ilike 'titulaire%') as titulaires,
    count(*) filter (where p.disparu_le is null and p.role ilike 'associ%') as associes,
    count(*) filter (where p.disparu_le is null and p.role ilike 'collaborat%') as collaborateurs,
    count(*) filter (where p.disparu_le is not null) as partis,
    string_agg(distinct initcap(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), ', ') filter (where p.disparu_le is null and (p.role ilike 'titulaire%' or p.role ilike 'associ%')) as decideurs,
    max(p.score_prospect) filter (where p.disparu_le is null and (p.role ilike 'titulaire%' or p.role ilike 'associ%')) as score,
    max(greatest(p.apparu_le, p.disparu_le)) as dernier_mouvement,
    max(p.telephone) as telephone
  from public.prospection_praticiens p
  where p.structure_cle is not null
  group by p.structure_cle;
revoke all on public.prospection_cabinets from anon, authenticated;
grant select on public.prospection_cabinets to authenticated, service_role;
