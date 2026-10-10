set lock_timeout = '10s';
-- 0064 : CHAÎNE DES MODÈLES EN 3 ÉTAPES (décision de Paul du 2026-10-11 : « c'est un peu trop complexe… on pourrait n'avoir qu'une
-- seule relecture finale avant publication et ajout au catalogue » ; le test se lance automatiquement). Code :
-- packages/core/src/chaine-modeles.ts (automate, testsALancer), apps/admin/src/lib/tests-auto.ts, docs/chaine-modeles.md.
--
-- 1. modeles_tests_lances : journal des lancements AUTOMATIQUES du testeur (workflow tester-modele, qui ne publie rien) par
--    modèle × version × essai. La clé unique (modele, version, essai) sert de verrou : deux pages ouvertes en même temps ne lancent
--    jamais deux fois le même test. `echec` : le workflow n'a pas pu démarrer (relance permise). Lecture, ajout et note d'échec :
--    équipe de la chaîne (est_contributeur, 0050) ; aucune suppression.
-- 2. avancer_modele : nouvelles transitions automatiques — check-agent → retouche (corrections techniques avant la relecture
--    finale), check-agent → écarté (rouge sans correction possible), recheck-agent → avis-humain (corrections techniques vérifiées :
--    relecture finale), recheck-agent → écarté (toujours rouge après correction). Le reste est inchangé (conditions revérifiées).
-- Rejouable. Le code fonctionne AVANT cette migration : lancements gardés en mémoire de l'instance et passages en cours lus sur
-- GitHub ; les nouvelles transitions sont alors refusées par la base et reprises au chargement suivant (message « passages repris »).

create table if not exists public.modeles_tests_lances (
  id uuid primary key default gen_random_uuid(),
  modele uuid not null references public.modeles_fiches (id) on delete cascade,
  version integer not null check (version between 1 and 9999),
  essai smallint not null check (essai between 1 and 9),
  mode text not null default 'check' check (mode in ('check', 'recheck')),
  lance_par uuid default auth.uid() references public.profiles (id) on delete set null,
  echec text check (echec is null or char_length(echec) <= 300),
  created_at timestamptz not null default now(),
  unique (modele, version, essai)
);
create index if not exists modeles_tests_lances_recents_idx on public.modeles_tests_lances (created_at desc);

alter table public.modeles_tests_lances enable row level security;
drop policy if exists "tests lances : equipe lecture" on public.modeles_tests_lances;
create policy "tests lances : equipe lecture" on public.modeles_tests_lances
  for select to authenticated using ((select public.est_contributeur()));
drop policy if exists "tests lances : equipe ajout" on public.modeles_tests_lances;
create policy "tests lances : equipe ajout" on public.modeles_tests_lances
  for insert to authenticated with check ((select public.est_contributeur()) and lance_par is not distinct from (select auth.uid()));
drop policy if exists "tests lances : equipe echec" on public.modeles_tests_lances;
create policy "tests lances : equipe echec" on public.modeles_tests_lances
  for update to authenticated using ((select public.est_contributeur())) with check ((select public.est_contributeur()));
revoke all on public.modeles_tests_lances from anon;
revoke update on public.modeles_tests_lances from authenticated;
grant select, insert on public.modeles_tests_lances to authenticated;
grant update (echec) on public.modeles_tests_lances to authenticated;
grant select, insert, update, delete on public.modeles_tests_lances to service_role;

create or replace function public.avancer_modele(p_id uuid, p_vers text, p_rang smallint default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.modeles_fiches%rowtype;
  t jsonb;
  ouverts integer;
  boucle integer;
begin
  if not public.est_contributeur() then raise exception 'Réservé à l''équipe de la chaîne'; end if;
  select * into f from public.modeles_fiches where id = p_id for update;
  if not found then raise exception 'Modèle introuvable'; end if;
  if f.statut = p_vers then return f.statut; end if;
  -- Transitions automatiques (chaine-modeles.ts, TRANSITIONS) ; publier et repêcher : validateur, hors de cette fonction
  if (f.statut, p_vers) not in (
    ('candidat', 'finaliste'), ('candidat', 'ecarte'), ('finaliste', 'check-agent'), ('check-agent', 'avis-humain'),
    ('check-agent', 'retouche'), ('check-agent', 'ecarte'),
    ('avis-humain', 'retouche'), ('avis-humain', 'pret-validation'), ('avis-humain', 'recheck-agent'), ('retouche', 'recheck-agent'),
    ('recheck-agent', 'revalidation'), ('recheck-agent', 'retouche'), ('recheck-agent', 'pret-validation'),
    ('recheck-agent', 'avis-humain'), ('recheck-agent', 'ecarte'),
    ('revalidation', 'retouche'), ('revalidation', 'pret-validation'), ('revalidation', 'recheck-agent'),
    ('pret-validation', 'retouche'), ('pret-validation', 'recheck-agent'), ('publie', 'retouche'), ('publie', 'recheck-agent')
  ) then
    raise exception 'Transition non autorisée : % → %', f.statut, p_vers;
  end if;
  select v.test into t from public.modeles_versions v where v.modele = f.id and v.version = f.version_courante;
  select count(*) into ouverts from public.modeles_tickets k where k.modele = f.id and k.statut = 'ouvert';
  if p_vers in ('avis-humain', 'revalidation', 'pret-validation') and (t is null or (t ->> 'version')::integer is distinct from f.version_courante) then
    raise exception 'Le testeur n''a pas encore passé la version courante';
  end if;
  -- Relecture finale : jamais une version au rouge
  if p_vers = 'avis-humain' and coalesce(t ->> 'verdict', '') = 'rouge' then
    raise exception 'Relecture finale : la vérification de la version courante est au rouge';
  end if;
  -- Écart automatique depuis la vérification : seulement sur un test ROUGE de la version courante
  if f.statut in ('check-agent', 'recheck-agent') and p_vers = 'ecarte' and (t is null or (t ->> 'version')::integer is distinct from f.version_courante or coalesce(t ->> 'verdict', '') <> 'rouge') then
    raise exception 'Écart : seulement après une vérification au rouge de la version courante';
  end if;
  -- Orange admis jusqu'à la validation (Paul justifie par écrit) ; rouge jamais
  if p_vers = 'pret-validation' and (coalesce(t ->> 'verdict', '') not in ('vert', 'orange') or ouverts > 0) then
    raise exception 'Prêt pour validation : test vert ou orange et aucun ticket ouvert';
  end if;
  if p_vers = 'retouche' and ouverts = 0 then raise exception 'Retouche : aucun ticket ouvert'; end if;
  -- Avis complet (16 cellules page × appareil de la version courante : « rien » ou ticket humain) avant de sortir de l'avis
  if f.statut = 'avis-humain' and p_vers in ('retouche', 'pret-validation') and (
    select count(*) from (
      select r.page, r.appareil from public.modeles_revues r where r.modele = f.id and r.version = f.version_courante and r.page is not null and r.verdict in ('rien', 'tickets')
      union
      select k.page, k.appareil from public.modeles_tickets k where k.modele = f.id and k.origine = 'humain' and k.version_ouverture = f.version_courante
    ) c
  ) < 16 then
    raise exception 'Avis incomplet : chaque page × appareil doit avoir un avis';
  end if;
  -- Revalidation faite (1 clic sur la version courante) avant « prêt pour validation »
  if f.statut = 'revalidation' and p_vers = 'pret-validation' and not exists (
    select 1 from public.modeles_revues r where r.modele = f.id and r.version = f.version_courante and r.page is null and r.verdict = 'revalide'
  ) then
    raise exception 'Revalidation de la version courante manquante';
  end if;
  if f.statut = 'retouche' and p_vers = 'recheck-agent' and f.version_courante <= coalesce(f.version_retouche, f.version_courante) then
    raise exception 'Re-check : aucune nouvelle version depuis la demande de retouche';
  end if;
  if p_vers = 'check-agent' then
    select count(*) into boucle from public.modeles_fiches b
      where b.statut in ('check-agent', 'avis-humain', 'retouche', 'recheck-agent', 'revalidation');
    if boucle >= 10 then raise exception 'Boucle de révision pleine (10 modèles)'; end if;
  end if;
  update public.modeles_fiches set
    statut = p_vers,
    rang = case when p_vers in ('finaliste', 'ecarte') then coalesce(p_rang, rang) else rang end,
    version_retouche = case when p_vers = 'retouche' then version_courante else version_retouche end
  where id = f.id;
  return p_vers;
end;
$$;
revoke all on function public.avancer_modele(uuid, text, smallint) from public, anon;
grant execute on function public.avancer_modele(uuid, text, smallint) to authenticated, service_role;

notify pgrst, 'reload schema';
