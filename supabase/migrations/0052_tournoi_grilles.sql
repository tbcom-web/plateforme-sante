-- TOURNOI EN GRILLES de la chaîne des modèles (retour de Paul du 2026-10-09 : « 160 batailles pour arriver à un seul modèle, c'est
-- énorme ») ; packages/core/src/tournoi-grilles.ts, page /chaine/tournoi, docs/chaine-modeles.md. 0050 n'est pas modifiée.
-- - modeles_grilles : une grille « tes 2 préférées parmi 6 » servie à UN votant (réservation : tant qu'elle n'est pas répondue et
--   qu'elle a moins de 15 minutes, ses candidats ne sont pas servis à un autre votant), puis sa réponse (meilleures dans l'ordre
--   touché, « celle qui ne va pas » facultative). Une grille ne se répond qu'une fois, par son votant ; poids posé par la base
--   (validateur ×2) ; ni modification après réponse, ni suppression ;
-- - modeles_jaime : « J'aime » de la présélection, un par votant et par modèle (signal a priori du tournoi, plafonné dans le code) ;
-- - MODÈLE = DESIGN (décision de Paul du 2026-10-09, chaine-design.ts) : le profil d'une fiche devient FACULTATIF (null = design de la
--   profession, présélection et tournoi par profession, images du kit de chaque profil au rendu, profils compatibles calculés et
--   rangés dans les tags) ; les fiches existantes gardent leur profil. Même chose pour les duels (modeles_votes) et les grilles ;
--   profil_demo : profil de démonstration avec lequel les 6 candidats d'une grille ont été rendus (contenu égal).
-- Rejouable : if not exists, create or replace, drop … if exists. À exécuter après 0050_chaine_modeles.sql (et 0051).

alter table public.modeles_fiches alter column profil drop not null;
alter table public.modeles_votes alter column profil drop not null;
-- Designs (profil nul) : un seul exemplaire par profession et par clé de composition
create unique index if not exists modeles_fiches_design_idx on public.modeles_fiches (profession, cle) where profil is null;

create table if not exists public.modeles_grilles (
  id uuid primary key default gen_random_uuid(),
  profession text not null default 'podologue' check (profession ~ '^[a-z0-9-]{2,40}$'),
  profil text check (profil is null or profil ~ '^[a-z0-9~.+_-]{2,80}$'),
  profil_demo text check (profil_demo is null or profil_demo ~ '^[a-z0-9~.+_-]{2,80}$'),
  propositions uuid[] not null check (cardinality(propositions) between 3 and 6),
  votant uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  servie_le timestamptz not null default now(),
  meilleures smallint[] check (meilleures is null or (cardinality(meilleures) between 1 and 2 and 0 <= all (meilleures) and 5 >= all (meilleures))),
  pire smallint check (pire is null or pire between 0 and 5),
  appareil text check (appareil is null or appareil in ('ordinateur', 'mobile')),
  poids smallint not null default 1 check (poids between 1 and 2),
  repondue_le timestamptz
);
alter table public.modeles_grilles add column if not exists profil_demo text;
create index if not exists modeles_grilles_profil_idx on public.modeles_grilles (profession, profil, servie_le);
create index if not exists modeles_grilles_en_cours_idx on public.modeles_grilles (profession, profil) where repondue_le is null;

create or replace function public.modeles_grilles_proteger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.votant := coalesce(auth.uid(), new.votant);
    new.servie_le := now();
    new.meilleures := null; new.pire := null; new.repondue_le := null; new.poids := 1;
    return new;
  end if;
  if old.repondue_le is not null then raise exception 'Grille déjà répondue'; end if;
  if auth.uid() is distinct from old.votant then raise exception 'Une grille est répondue par son votant'; end if;
  new.id := old.id; new.profession := old.profession; new.profil := old.profil; new.propositions := old.propositions; new.profil_demo := old.profil_demo;
  new.votant := old.votant; new.servie_le := old.servie_le;
  if new.meilleures is null or exists (select 1 from unnest(new.meilleures) m where m >= cardinality(old.propositions))
    or cardinality(new.meilleures) <> (select count(distinct m) from unnest(new.meilleures) m) then
    raise exception 'Réponse invalide';
  end if;
  if new.pire is not null and (new.pire >= cardinality(old.propositions) or new.pire = any (new.meilleures)) then
    raise exception '« Celle qui ne va pas » invalide';
  end if;
  new.poids := case when public.est_validateur() then 2 else 1 end;
  new.repondue_le := now();
  return new;
end;
$$;
drop trigger if exists modeles_grilles_proteger on public.modeles_grilles;
create trigger modeles_grilles_proteger before insert or update on public.modeles_grilles
  for each row execute function public.modeles_grilles_proteger();

alter table public.modeles_grilles enable row level security;
drop policy if exists "modeles_grilles : lecture équipe" on public.modeles_grilles;
drop policy if exists "modeles_grilles : servie au votant" on public.modeles_grilles;
drop policy if exists "modeles_grilles : réponse du votant" on public.modeles_grilles;
create policy "modeles_grilles : lecture équipe" on public.modeles_grilles for select to authenticated using (public.est_contributeur());
create policy "modeles_grilles : servie au votant" on public.modeles_grilles for insert to authenticated
  with check (public.est_contributeur() and votant = auth.uid() and meilleures is null and repondue_le is null);
create policy "modeles_grilles : réponse du votant" on public.modeles_grilles for update to authenticated
  using (public.est_contributeur() and votant = auth.uid() and repondue_le is null) with check (public.est_contributeur() and votant = auth.uid());
revoke all on public.modeles_grilles from anon, authenticated;
grant select, insert on public.modeles_grilles to authenticated;
grant update (meilleures, pire, appareil) on public.modeles_grilles to authenticated;
grant select, insert, update, delete on public.modeles_grilles to service_role;

create table if not exists public.modeles_jaime (
  modele uuid not null references public.modeles_fiches (id) on delete cascade,
  votant uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (modele, votant)
);
alter table public.modeles_jaime enable row level security;
drop policy if exists "modeles_jaime : lecture équipe" on public.modeles_jaime;
drop policy if exists "modeles_jaime : ajout équipe" on public.modeles_jaime;
create policy "modeles_jaime : lecture équipe" on public.modeles_jaime for select to authenticated using (public.est_contributeur());
create policy "modeles_jaime : ajout équipe" on public.modeles_jaime for insert to authenticated with check (public.est_contributeur() and votant = auth.uid());
revoke all on public.modeles_jaime from anon, authenticated;
grant select, insert on public.modeles_jaime to authenticated;
grant select, insert, update, delete on public.modeles_jaime to service_role;
