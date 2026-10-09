set lock_timeout = '10s';
-- 0056 : PROSPECTION, SIGNAL « SITUATION MODIFIÉE AU RPPS » (demande de Paul du 2026-10-10 : « une histoire de traçage d'historique
-- du cabinet au niveau RPPS qui donne la date de changement »). L'extraction publique (0055) n'a aucune date ; l'API FHIR de l'ANS
-- donne la date de dernière modification (meta.lastUpdated) de chaque situation d'exercice (PractitionerRole) et de chaque fiche
-- praticien. scripts/synchro-rpps.mjs (clé ANNUAIRE_SANTE_API_KEY ou ESANTE_API_KEY), packages/core/src/prospection.ts,
-- docs/prospection-rpps.md. Rejouable, après 0055. NON exécutée par les agents : à lancer par Paul dans l'éditeur SQL de Supabase.
--
-- prospection_ans : une ligne par praticien (RPPS) : date de la modification la plus récente de ses situations d'exercice, de sa
-- fiche, et nombre de situations. Les dates de mise à jour EN MASSE (même jour pour une grande part des praticiens : reprise de
-- données par l'ANS) sont écartées par le script.

create table if not exists public.prospection_ans (
  rpps text primary key check (rpps ~ '^[0-9]{11}$'),
  situation_maj_le date,
  praticien_maj_le date,
  situations integer,
  vu_le date
);

create or replace view public.prospection_liste with (security_invoker = true) as
  select p.*, s.statut, s.note, s.relance_le, s.maj_le as suivi_maj_le, a.situation_maj_le
  from public.prospection_praticiens p
  left join public.prospection_suivi s on s.rpps = p.rpps
  left join public.prospection_ans a on a.rpps = p.rpps;

alter table public.prospection_ans enable row level security;
drop policy if exists "prospection_ans : lecture admin" on public.prospection_ans;
create policy "prospection_ans : lecture admin" on public.prospection_ans for select to authenticated using (public.is_admin());
revoke all on public.prospection_ans from anon, authenticated;
grant select on public.prospection_ans to authenticated;
grant select, insert, update, delete on public.prospection_ans to service_role;
grant select on public.prospection_liste to authenticated, service_role;
