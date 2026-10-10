set lock_timeout = '60s';
-- 0059 : PROSPECTION, DATE DU SIREN (demande de Paul du 2026-10-10 : « je disais SIRET mais c'est peut-être SIREN »).
-- siret_cree_le (0055) = ouverture du cabinet à CETTE adresse (établissement) ; siren_cree_le = création de l'ENTREPRISE, pour un
-- libéral le début de son activité libérale (inchangé en cas de déménagement). Les deux ensemble distinguent une première
-- installation (SIREN et SIRET récents) d'un déménagement (SIREN ancien, SIRET récent). Source : base Sirene de l'INSEE via l'API
-- Recherche d'entreprises (scripts/synchro-rpps.mjs). packages/core/src/prospection-score.ts ; docs/prospection-rpps.md.
-- DÉMÉNAGEMENTS (« la clé c'est d'avoir en tête des déménagements potentiels ») : ancien_cabinet = dernier établissement FERMÉ de
-- la même entreprise (adresse, ouverture, fermeture), etablissements_ouverts = établissements ouverts de l'entreprise (2 ou plus :
-- nouveau cabinet en cours d'ouverture ou second lieu).
-- Rejouable, après 0057. NON exécutée par les agents : à lancer par Paul dans l'éditeur SQL de Supabase.

alter table public.prospection_praticiens
  add column if not exists siren_cree_le date,
  add column if not exists ancien_cabinet jsonb,
  add column if not exists etablissements_ouverts integer;

-- La vue fige la liste des colonnes de p.* : on la recrée (même définition qu'en 0057)
drop view if exists public.prospection_liste;
create view public.prospection_liste with (security_invoker = true) as
  select p.*, s.statut, s.note, s.relance_le, s.maj_le as suivi_maj_le, a.situation_maj_le
  from public.prospection_praticiens p
  left join public.prospection_suivi s on s.rpps = p.rpps
  left join public.prospection_ans a on a.rpps = p.rpps;
revoke all on public.prospection_liste from anon, authenticated;
grant select on public.prospection_liste to authenticated, service_role;
