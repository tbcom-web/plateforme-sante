set lock_timeout = '10s';
-- 0057 : PROSPECTION, SCORES ET LIENS ENTRE PRATICIENS (demande de Paul du 2026-10-10 : « m'assurer avec un certain score qu'un
-- nouveau praticien s'est installé à une nouvelle adresse, comprendre les liens entre les praticiens en utilisant l'historique des
-- praticiens ayant travaillé dans une structure, scorer les praticiens selon leur date d'installation, leurs spécialités, diplômes »).
-- packages/core/src/prospection-score.ts (calcul, testé), scripts/synchro-rpps.mjs (calcul chaque nuit),
-- apps/admin/src/app/admin/prospection (liste triée par score, fiche praticien avec ses liens) ; docs/prospection-rpps.md.
-- Rejouable, après 0055 (0056 facultative : la table prospection_ans est créée ici si besoin). NON exécutée par les agents.
--
-- HISTORIQUE : prospection_praticiens garde chaque situation d'exercice avec apparu_le / disparu_le (lignes jamais supprimées) :
-- l'historique de chaque structure se construit nuit après nuit depuis l'import initial du 2026-10-09.
-- Nouvelles colonnes :
--  - role (titulaire, collaborateur, associé…), secteur (cabinet individuel, de groupe…) : extraction RPPS ;
--  - structure_cle (identifiant technique de la structure au RPPS, sinon SIRET, sinon adresse) et adresse_cle (adresse normalisée) :
--    les deux clés de lien entre praticiens ;
--  - autres_professions : nombre de situations d'autres professions de santé à la même adresse (maison de santé, cabinet mixte) ;
--  - diplomes (DU, DIU, autorisations, diplômes européens ; jamais le DE de la profession), specialites (repérées dans les diplômes) ;
--  - score_installation, score_prospect (0-100), raisons (détail des points), score_le.

alter table public.prospection_praticiens
  add column if not exists role text,
  add column if not exists secteur text,
  add column if not exists structure_cle text,
  add column if not exists adresse_cle text,
  add column if not exists autres_professions jsonb,
  add column if not exists diplomes jsonb,
  add column if not exists specialites text[],
  add column if not exists score_installation integer,
  add column if not exists score_prospect integer,
  add column if not exists raisons jsonb,
  add column if not exists score_le date;
create index if not exists prospection_praticiens_structure on public.prospection_praticiens (structure_cle);
create index if not exists prospection_praticiens_adresse on public.prospection_praticiens (adresse_cle);
create index if not exists prospection_praticiens_score on public.prospection_praticiens (score_prospect desc nulls last);
create index if not exists prospection_praticiens_specialites on public.prospection_praticiens using gin (specialites);

create table if not exists public.prospection_ans (
  rpps text primary key check (rpps ~ '^[0-9]{11}$'),
  situation_maj_le date,
  praticien_maj_le date,
  situations integer,
  vu_le date
);
alter table public.prospection_ans enable row level security;
drop policy if exists "prospection_ans : lecture admin" on public.prospection_ans;
create policy "prospection_ans : lecture admin" on public.prospection_ans for select to authenticated using (public.is_admin());
revoke all on public.prospection_ans from anon, authenticated;
grant select on public.prospection_ans to authenticated;
grant select, insert, update, delete on public.prospection_ans to service_role;

-- La vue fige la liste des colonnes de p.* à sa création : on la recrée pour y ajouter les nouvelles
drop view if exists public.prospection_liste;
create view public.prospection_liste with (security_invoker = true) as
  select p.*, s.statut, s.note, s.relance_le, s.maj_le as suivi_maj_le, a.situation_maj_le
  from public.prospection_praticiens p
  left join public.prospection_suivi s on s.rpps = p.rpps
  left join public.prospection_ans a on a.rpps = p.rpps;
revoke all on public.prospection_liste from anon, authenticated;
grant select on public.prospection_liste to authenticated, service_role;
