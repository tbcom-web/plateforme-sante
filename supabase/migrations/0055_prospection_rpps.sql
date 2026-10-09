set lock_timeout = '10s';
-- 0055 : PROSPECTION À PARTIR DU RPPS (demande de Paul du 2026-10-09 : « un outil de prospection pour ma commerciale à partir du
-- fichier RPPS », priorité : repérer les praticiens RÉCEMMENT INSTALLÉS ; pédicures-podologues d'abord).
-- scripts/synchro-rpps.mjs (alimentation quotidienne par .github/workflows/synchro-rpps.yml), packages/core/src/prospection.ts,
-- apps/admin/src/app/admin/prospection ; docs/prospection-rpps.md. Rejouable. NON exécutée par les agents : à lancer par Paul dans
-- l'éditeur SQL de Supabase.
--
-- 1. prospection_praticiens : une ligne par SITUATION D'EXERCICE (un praticien peut exercer dans plusieurs cabinets), issue de
--    l'extraction publique PS_LibreAcces_Personne_activite (Licence Ouverte v2.0, ANS). Écrite par le script seulement (clé secrète).
--    Signaux d'installation : apparu_le (première apparition dans l'extraction, null pour l'import initial), siret_cree_le (date de
--    création de l'établissement à l'INSEE, via l'API Recherche d'entreprises).
-- 2. prospection_suivi : le travail de la commerciale, une ligne par praticien (RPPS) : statut, note, date de relance.
-- 3. prospection_synchros : journal des passages du script (affiché en tête de page).
-- 4. prospection_liste : vue (droits de la personne connectée) qui joint les deux premières, pour filtrer par statut.
-- Accès : admin seulement (is_admin(), 0001), comme /admin/leads.

create table if not exists public.prospection_praticiens (
  cle text primary key,
  rpps text not null check (rpps ~ '^[0-9]{11}$'),
  civilite text,
  nom text,
  prenom text,
  profession_code text,
  profession text,
  mode_exercice text,
  siret text,
  siren text,
  raison_sociale text,
  enseigne text,
  adresse text,
  code_postal text,
  commune text,
  code_commune text,
  departement text,
  telephone text,
  email text,
  apparu_le date,
  vu_le date,
  disparu_le date,
  siret_cree_le date,
  siret_source text check (siret_source is null or siret_source in ('siret', 'nom')),
  siret_ferme boolean,
  entreprise_nom text,
  latitude double precision,
  longitude double precision,
  verifie_le timestamptz
);
create index if not exists prospection_praticiens_rpps on public.prospection_praticiens (rpps);
create index if not exists prospection_praticiens_dep on public.prospection_praticiens (departement, profession_code);
create index if not exists prospection_praticiens_siret_cree on public.prospection_praticiens (siret_cree_le desc nulls last);
create index if not exists prospection_praticiens_apparu on public.prospection_praticiens (apparu_le desc nulls last);

create table if not exists public.prospection_suivi (
  rpps text primary key check (rpps ~ '^[0-9]{11}$'),
  statut text not null default 'a_contacter' check (statut in ('a_contacter', 'contacte', 'rappeler', 'rendez_vous', 'gagne', 'perdu', 'hors_cible')),
  note text not null default '' check (char_length(note) <= 2000),
  relance_le date,
  maj_par uuid references auth.users (id) on delete set null,
  maj_le timestamptz not null default now()
);

create table if not exists public.prospection_synchros (
  id uuid primary key default gen_random_uuid(),
  le timestamptz not null default now(),
  fichier text,
  lignes integer,
  nouveaux integer,
  disparus integer,
  verifies integer,
  message text
);

-- Auteur et date du suivi posés par la base (jamais par le navigateur)
create or replace function public.prospection_suivi_auteur()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.maj_par := auth.uid();
  new.maj_le := now();
  return new;
end;
$$;
drop trigger if exists prospection_suivi_auteur on public.prospection_suivi;
create trigger prospection_suivi_auteur before insert or update on public.prospection_suivi
  for each row execute function public.prospection_suivi_auteur();

create or replace view public.prospection_liste with (security_invoker = true) as
  select p.*, s.statut, s.note, s.relance_le, s.maj_le as suivi_maj_le
  from public.prospection_praticiens p
  left join public.prospection_suivi s on s.rpps = p.rpps;

alter table public.prospection_praticiens enable row level security;
alter table public.prospection_suivi enable row level security;
alter table public.prospection_synchros enable row level security;

drop policy if exists "prospection_praticiens : lecture admin" on public.prospection_praticiens;
create policy "prospection_praticiens : lecture admin" on public.prospection_praticiens for select to authenticated using (public.is_admin());

drop policy if exists "prospection_suivi : lecture admin" on public.prospection_suivi;
drop policy if exists "prospection_suivi : ajout admin" on public.prospection_suivi;
drop policy if exists "prospection_suivi : modification admin" on public.prospection_suivi;
create policy "prospection_suivi : lecture admin" on public.prospection_suivi for select to authenticated using (public.is_admin());
create policy "prospection_suivi : ajout admin" on public.prospection_suivi for insert to authenticated with check (public.is_admin());
create policy "prospection_suivi : modification admin" on public.prospection_suivi for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "prospection_synchros : lecture admin" on public.prospection_synchros;
create policy "prospection_synchros : lecture admin" on public.prospection_synchros for select to authenticated using (public.is_admin());

revoke all on public.prospection_praticiens, public.prospection_suivi, public.prospection_synchros, public.prospection_liste from anon, authenticated;
grant select on public.prospection_praticiens, public.prospection_synchros, public.prospection_liste to authenticated;
grant select, insert, update on public.prospection_suivi to authenticated;
grant select, insert, update, delete on public.prospection_praticiens, public.prospection_suivi, public.prospection_synchros to service_role;
grant select on public.prospection_liste to service_role;
