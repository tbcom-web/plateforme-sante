-- CHAÎNE DE PRODUCTION DES MODÈLES (décision de Paul du 2026-10-09 : « limiter au max l'humain, juste pour donner son goût / avis
-- sur les modèles créés ») ; packages/core/src/chaine-modeles.ts (+ chaine-modeles-format.ts), pages /chaine, docs/chaine-modeles.md.
-- - profiles.role_equipe : « contributeur » (équipe TBCOM : présélection, tournoi, avis, commentaires ; jamais valider ni publier) ou
--   « validateur » (Paul) ; le super admin (role = 'admin') est validateur d'office. Paul crée lui-même les comptes et attribue le
--   rôle dans /chaine/equipe (seul un admin modifie un profil, politique de 0001) ;
-- - est_contributeur() / est_validateur() : contributeur = rôle d'équipe quelconque ou admin ; validateur = 'validateur' ou admin ;
-- - modeles_fiches : fiche d'un modèle (la table `modeles` de 0010 reste celle des manifestes JSON) : profession, profil, statut de la
--   chaîne, version courante, version PUBLIÉE (reste en ligne pendant une retouche), tags, rang au tournoi, recette liée (publication
--   par profil, recettes_publications de 0043). SÉCURITÉ : un contributeur ne modifie JAMAIS directement le statut, le rang ni la
--   version de retouche (déclencheur) : les passages d'étape passent par avancer_modele(id, vers) (security definer : transition
--   autorisée, rôle, conditions vérifiées en base) ; version courante = dernière version existante seulement ; publication, version
--   publiée, tags vérifiés, recette liée, repêchage : validateur ou service ;
-- - modeles_versions : composition de chaque version (jamais modifiée), journal des corrections (« corrigé : ticket #12 — … »),
--   résultat du testeur automatique (colonne `test`, format ResultatTestModele ; seule colonne modifiable). SÉCURITÉ : le résultat
--   de test n'est écrit QUE par le validateur ou le service (CI du testeur) — un contributeur ne peut ni le modifier ni créer une
--   version avec un test déjà rempli (sinon il lèverait seul le verrou « testeur au vert ») ;
-- - modeles_tickets : page, appareil, zone, élément, étiquette, commentaire, auteur, origine humain / testeur, statut, version
--   d'ouverture et de correction ; numéro lisible unique par modèle. SÉCURITÉ : un ticket d'origine « testeur » n'est créé, fermé
--   (ferme / sans-objet) ni modifié dans son contenu que par le validateur ou le service (re-check) ; un contributeur peut seulement
--   le marquer « corrige » (retouche appliquée) ou le rouvrir ;
-- - modeles_votes : duels du tournoi, multi-votants ; poids posé par le serveur (validateur ×2) ;
-- - modeles_revues : avis « Rien à signaler » par page × appareil, et revalidation d'une version en 1 clic (page nulle) ;
-- - degustation_choix : les contributeurs peuvent y AJOUTER leurs choix de présélection (même moteur de points que la Dégustation).
-- Aucune suppression par l'application (pas de politique delete). Rejouable : if not exists, create or replace, drop … if exists.
-- À exécuter après 0049_mots_cles_professions.sql. Sans cette migration, /chaine affiche « Migration 0050 à exécuter ».

-- ---------------------------------------------------------------------------------------------------------------
-- Rôles d'équipe
-- ---------------------------------------------------------------------------------------------------------------

alter table public.profiles add column if not exists role_equipe text;
alter table public.profiles drop constraint if exists profiles_role_equipe_check;
alter table public.profiles add constraint profiles_role_equipe_check check (role_equipe is null or role_equipe in ('contributeur', 'validateur'));
grant update (role_equipe) on public.profiles to authenticated;

create or replace function public.est_contributeur()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and (role = 'admin' or role_equipe in ('contributeur', 'validateur'))
  );
$$;

create or replace function public.est_validateur()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and (role = 'admin' or role_equipe = 'validateur')
  );
$$;

-- Écriture privilégiée : rôle de base service_role / postgres (CI, clé secrète, console SQL, fonctions security definer comme
-- avancer_modele) ou validateur connecté. current_user vaut le rôle d'appel (authenticated / anon pour l'API) dans les fonctions
-- SANS security definer (déclencheurs ci-dessous).
create or replace function public.ecriture_privilegiee()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user not in ('authenticated', 'anon') or public.est_validateur();
$$;
revoke all on function public.ecriture_privilegiee() from public, anon;
grant execute on function public.ecriture_privilegiee() to authenticated, service_role;

revoke all on function public.est_contributeur() from public, anon;
revoke all on function public.est_validateur() from public, anon;
grant execute on function public.est_contributeur() to authenticated, service_role;
grant execute on function public.est_validateur() to authenticated, service_role;

-- Équipe visible des contributeurs (tableau « Ce qui attend un humain ») : identifiant, e-mail et rôle d'équipe seulement
create or replace function public.equipe_chaine()
returns table (id uuid, email text, role_equipe text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.email, case when p.role = 'admin' then 'validateur' else p.role_equipe end
  from public.profiles p
  where public.est_contributeur() and (p.role = 'admin' or p.role_equipe is not null)
  order by p.email;
$$;
revoke all on function public.equipe_chaine() from public, anon;
grant execute on function public.equipe_chaine() to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- Fiches
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.modeles_fiches (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(btrim(nom)) between 1 and 120),
  profession text not null default 'podologue' check (profession ~ '^[a-z0-9-]{2,40}$'),
  profil text not null check (profil ~ '^[a-z0-9~.+_-]{2,80}$'),
  statut text not null default 'candidat' check (statut in (
    'candidat', 'finaliste', 'check-agent', 'avis-humain', 'retouche', 'recheck-agent', 'revalidation', 'pret-validation', 'publie', 'ecarte'
  )),
  version_courante integer not null default 1 check (version_courante >= 1),
  version_publiee integer check (version_publiee is null or version_publiee >= 1),
  version_retouche integer check (version_retouche is null or version_retouche >= 1),
  -- Test orange accepté par Paul : justification écrite (≥ 15 caractères, regleValidationModele) et version justifiée
  justification_test text check (justification_test is null or char_length(btrim(justification_test)) between 15 and 1000),
  justification_version integer check (justification_version is null or justification_version >= 1),
  tags jsonb not null default '{}'::jsonb check (jsonb_typeof(tags) = 'object' and pg_column_size(tags) <= 4000),
  tags_valides boolean not null default false,
  recette uuid references public.recettes (id) on delete set null,
  origine text not null default 'preselection' check (origine in ('preselection', 'recette', 'claude')),
  -- Clé de composition de la version 1 (doublons par profil)
  cle text not null check (cle ~ '^[a-z]+:[^[:space:]]{1,200}$'),
  rang smallint check (rang is null or rang between 1 and 999),
  scenario jsonb not null default '{}'::jsonb check (jsonb_typeof(scenario) = 'object' and pg_column_size(scenario) <= 4000),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Table créée avant l'ajout des colonnes de justification : rejouable
alter table public.modeles_fiches add column if not exists justification_test text;
alter table public.modeles_fiches add column if not exists justification_version integer;
alter table public.modeles_fiches drop constraint if exists modeles_fiches_justification_test_check;
alter table public.modeles_fiches add constraint modeles_fiches_justification_test_check
  check (justification_test is null or char_length(btrim(justification_test)) between 15 and 1000);
create unique index if not exists modeles_fiches_cle_idx on public.modeles_fiches (profession, profil, cle);
create index if not exists modeles_fiches_statut_idx on public.modeles_fiches (statut, profession, profil);

-- Statut, rang, version de retouche : jamais modifiés directement par un contributeur (avancer_modele) ; version courante = dernière
-- version existante ; publication, version publiée, tags, recette, repêchage : validateur ou service
create or replace function public.modeles_fiches_proteger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not public.ecriture_privilegiee() then
      new.statut := 'candidat'; new.version_publiee := null; new.tags_valides := false; new.version_courante := 1;
      new.rang := null; new.version_retouche := null; new.recette := null; new.justification_test := null; new.justification_version := null;
    end if;
  else
    new.updated_at := now();
    if not public.ecriture_privilegiee() then
      if new.statut is distinct from old.statut then
        raise exception 'Le statut d''un modèle change par avancer_modele (transition vérifiée) ou par le validateur';
      end if;
      if new.rang is distinct from old.rang or new.version_retouche is distinct from old.version_retouche then
        raise exception 'Rang et version de retouche sont posés par avancer_modele';
      end if;
      if new.version_courante is distinct from old.version_courante
        and new.version_courante is distinct from (select max(v.version) from public.modeles_versions v where v.modele = new.id) then
        raise exception 'La version courante est la dernière version enregistrée';
      end if;
      if new.justification_test is distinct from old.justification_test or new.justification_version is distinct from old.justification_version then
        raise exception 'La justification d''un test orange est écrite par le validateur';
      end if;
      new.version_publiee := old.version_publiee;
      new.tags_valides := old.tags_valides;
      new.recette := old.recette;
      if new.tags is distinct from old.tags then new.tags := old.tags; end if;
    end if;
    new.auteur := old.auteur; new.created_at := old.created_at; new.origine := old.origine; new.cle := old.cle;
  end if;
  return new;
end;
$$;
drop trigger if exists modeles_fiches_proteger on public.modeles_fiches;
create trigger modeles_fiches_proteger before insert or update on public.modeles_fiches
  for each row execute function public.modeles_fiches_proteger();

alter table public.modeles_fiches enable row level security;
drop policy if exists "modeles_fiches : lecture équipe" on public.modeles_fiches;
drop policy if exists "modeles_fiches : ajout équipe" on public.modeles_fiches;
drop policy if exists "modeles_fiches : modification équipe" on public.modeles_fiches;
create policy "modeles_fiches : lecture équipe" on public.modeles_fiches for select to authenticated using (public.est_contributeur());
create policy "modeles_fiches : ajout équipe" on public.modeles_fiches for insert to authenticated with check (public.est_contributeur());
create policy "modeles_fiches : modification équipe" on public.modeles_fiches for update to authenticated using (public.est_contributeur()) with check (public.est_contributeur());
revoke all on public.modeles_fiches from anon, authenticated;
grant select, insert, update on public.modeles_fiches to authenticated;
grant select, insert, update, delete on public.modeles_fiches to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- Versions
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.modeles_versions (
  modele uuid not null references public.modeles_fiches (id) on delete cascade,
  version integer not null check (version >= 1),
  composition jsonb not null check (jsonb_typeof(composition) = 'object' and pg_column_size(composition) <= 8000),
  cle text not null check (cle ~ '^[a-z]+:[^[:space:]]{1,200}$'),
  -- [{ type: creation | correction | technique | relance | publication, texte, ticket }]
  journal jsonb not null default '[]'::jsonb check (jsonb_typeof(journal) = 'array' and pg_column_size(journal) <= 20000),
  -- Résultat du testeur (ResultatTestModele) ; null = pas encore passé
  test jsonb check (test is null or (jsonb_typeof(test) = 'object' and pg_column_size(test) <= 60000)),
  -- « claude », « testeur » ou identifiant du compte (relance)
  auteur text not null default 'equipe' check (char_length(auteur) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (modele, version)
);

alter table public.modeles_versions enable row level security;
drop policy if exists "modeles_versions : lecture équipe" on public.modeles_versions;
drop policy if exists "modeles_versions : ajout équipe" on public.modeles_versions;
drop policy if exists "modeles_versions : résultat du testeur" on public.modeles_versions;
create policy "modeles_versions : lecture équipe" on public.modeles_versions for select to authenticated using (public.est_contributeur());
-- Nouvelle version (retouche, relance) : sans résultat de test, sauf validateur
create policy "modeles_versions : ajout équipe" on public.modeles_versions for insert to authenticated
  with check (public.est_contributeur() and (test is null or public.est_validateur()));
-- Résultat du testeur : validateur seulement par l'API (le service_role contourne la RLS : CI du testeur)
create policy "modeles_versions : résultat du testeur" on public.modeles_versions for update to authenticated
  using (public.est_validateur()) with check (public.est_validateur());
revoke all on public.modeles_versions from anon, authenticated;
grant select, insert on public.modeles_versions to authenticated;
-- Une version ne change plus : seule la colonne du résultat de test se met à jour (validateur : politique ci-dessus)
grant update (test) on public.modeles_versions to authenticated;

-- Garde en profondeur (toutes origines, y compris une future politique trop large) : test écrit par le validateur ou le service seulement
create or replace function public.modeles_versions_proteger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.test is not null and not public.ecriture_privilegiee() then
      raise exception 'Le résultat du testeur est écrit par le testeur (service) ou le validateur';
    end if;
  elsif new.test is distinct from old.test and not public.ecriture_privilegiee() then
    raise exception 'Le résultat du testeur est écrit par le testeur (service) ou le validateur';
  end if;
  return new;
end;
$$;
drop trigger if exists modeles_versions_proteger on public.modeles_versions;
create trigger modeles_versions_proteger before insert or update on public.modeles_versions
  for each row execute function public.modeles_versions_proteger();
grant select, insert, update, delete on public.modeles_versions to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- Tickets
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.modeles_tickets (
  id uuid primary key default gen_random_uuid(),
  modele uuid not null references public.modeles_fiches (id) on delete cascade,
  numero integer not null check (numero >= 1),
  page text not null check (page in ('accueil', 'theme', 'fiche', 'cabinet', 'acces', 'article', 'questions', 'soins')),
  appareil text not null check (appareil in ('ordinateur', 'mobile')),
  -- { forme, x, y, l, h } normalisés 0-1
  zone jsonb check (zone is null or (jsonb_typeof(zone) = 'object' and pg_column_size(zone) <= 400)),
  element text check (element is null or char_length(element) <= 200),
  etiquette text not null check (etiquette ~ '^(technique:)?[a-z0-9-]{2,40}$'),
  commentaire text not null default '' check (char_length(commentaire) <= 500),
  origine text not null default 'humain' check (origine in ('humain', 'testeur')),
  gravite text check (gravite is null or gravite in ('bloquant', 'majeur', 'mineur')),
  controle text check (controle is null or controle ~ '^[a-z0-9:-]{2,60}$'),
  statut text not null default 'ouvert' check (statut in ('ouvert', 'corrige', 'ferme', 'sans-objet')),
  version_ouverture integer not null check (version_ouverture >= 1),
  version_correction integer check (version_correction is null or version_correction >= 1),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (modele, numero)
);
create index if not exists modeles_tickets_ouverts_idx on public.modeles_tickets (modele, statut);

create or replace function public.modeles_tickets_proteger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.modele := old.modele; new.numero := old.numero; new.origine := old.origine; new.auteur := old.auteur;
    new.page := old.page; new.appareil := old.appareil; new.version_ouverture := old.version_ouverture; new.created_at := old.created_at;
    new.updated_at := now();
    -- Ticket technique : seul le re-check (service) ou le validateur le ferme ou en change le contenu ;
    -- un contributeur peut seulement le marquer corrigé (retouche appliquée) ou le rouvrir
    if old.origine = 'testeur' and not public.ecriture_privilegiee() then
      if new.statut in ('ferme', 'sans-objet') and new.statut is distinct from old.statut then
        raise exception 'Un ticket technique est fermé par le re-check du testeur ou le validateur';
      end if;
      new.etiquette := old.etiquette; new.commentaire := old.commentaire; new.zone := old.zone; new.element := old.element;
      new.gravite := old.gravite; new.controle := old.controle;
    end if;
  elsif new.origine = 'testeur' then
    if not public.ecriture_privilegiee() then
      raise exception 'Un ticket technique est créé par le testeur (service) ou le validateur';
    end if;
    new.auteur := null;
  else
    new.auteur := auth.uid();
  end if;
  return new;
end;
$$;
drop trigger if exists modeles_tickets_proteger on public.modeles_tickets;
create trigger modeles_tickets_proteger before insert or update on public.modeles_tickets
  for each row execute function public.modeles_tickets_proteger();

alter table public.modeles_tickets enable row level security;
drop policy if exists "modeles_tickets : lecture équipe" on public.modeles_tickets;
drop policy if exists "modeles_tickets : ajout équipe" on public.modeles_tickets;
drop policy if exists "modeles_tickets : statut équipe" on public.modeles_tickets;
create policy "modeles_tickets : lecture équipe" on public.modeles_tickets for select to authenticated using (public.est_contributeur());
create policy "modeles_tickets : ajout équipe" on public.modeles_tickets for insert to authenticated with check (public.est_contributeur());
create policy "modeles_tickets : statut équipe" on public.modeles_tickets for update to authenticated using (public.est_contributeur()) with check (public.est_contributeur());
revoke all on public.modeles_tickets from anon, authenticated;
grant select, insert, update on public.modeles_tickets to authenticated;
grant select, insert, update, delete on public.modeles_tickets to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- Votes du tournoi (journal en ajout seul)
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.modeles_votes (
  id uuid primary key default gen_random_uuid(),
  profession text not null default 'podologue' check (profession ~ '^[a-z0-9-]{2,40}$'),
  profil text not null check (profil ~ '^[a-z0-9~.+_-]{2,80}$'),
  a uuid not null references public.modeles_fiches (id) on delete cascade,
  b uuid not null references public.modeles_fiches (id) on delete cascade,
  resultat text not null check (resultat in ('a', 'b', 'egalite')),
  appareil text check (appareil is null or appareil in ('ordinateur', 'mobile')),
  -- Poids posé par le serveur : 2 pour le validateur (Paul), 1 sinon (docs/chaine-modeles.md)
  poids smallint not null default 1 check (poids between 1 and 2),
  votant uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (a <> b)
);
create index if not exists modeles_votes_profil_idx on public.modeles_votes (profession, profil, created_at);

create or replace function public.modeles_votes_poids()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.votant := coalesce(auth.uid(), new.votant);
  new.poids := case when public.est_validateur() then 2 else 1 end;
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists modeles_votes_poids on public.modeles_votes;
create trigger modeles_votes_poids before insert on public.modeles_votes for each row execute function public.modeles_votes_poids();

alter table public.modeles_votes enable row level security;
drop policy if exists "modeles_votes : lecture équipe" on public.modeles_votes;
drop policy if exists "modeles_votes : ajout équipe" on public.modeles_votes;
create policy "modeles_votes : lecture équipe" on public.modeles_votes for select to authenticated using (public.est_contributeur());
create policy "modeles_votes : ajout équipe" on public.modeles_votes for insert to authenticated with check (public.est_contributeur() and votant = auth.uid());
revoke all on public.modeles_votes from anon, authenticated;
grant select, insert on public.modeles_votes to authenticated;
grant select, insert, update, delete on public.modeles_votes to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- Avis par page × appareil et revalidations (journal en ajout seul)
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.modeles_revues (
  id uuid primary key default gen_random_uuid(),
  modele uuid not null references public.modeles_fiches (id) on delete cascade,
  version integer not null check (version >= 1),
  -- null = revalidation de toute la version (1 clic)
  page text check (page is null or page in ('accueil', 'theme', 'fiche', 'cabinet', 'acces', 'article', 'questions', 'soins')),
  appareil text check (appareil is null or appareil in ('ordinateur', 'mobile')),
  verdict text not null check (verdict in ('rien', 'tickets', 'revalide')),
  auteur uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists modeles_revues_modele_idx on public.modeles_revues (modele, version);

alter table public.modeles_revues enable row level security;
drop policy if exists "modeles_revues : lecture équipe" on public.modeles_revues;
drop policy if exists "modeles_revues : ajout équipe" on public.modeles_revues;
create policy "modeles_revues : lecture équipe" on public.modeles_revues for select to authenticated using (public.est_contributeur());
create policy "modeles_revues : ajout équipe" on public.modeles_revues for insert to authenticated with check (public.est_contributeur() and auteur = auth.uid());
revoke all on public.modeles_revues from anon, authenticated;
grant select, insert on public.modeles_revues to authenticated;
grant select, insert, update, delete on public.modeles_revues to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- Passages d'étape (seule voie pour un contributeur) : transition autorisée, rôle, conditions vérifiées en base
-- ---------------------------------------------------------------------------------------------------------------

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
    ('avis-humain', 'retouche'), ('avis-humain', 'pret-validation'), ('avis-humain', 'recheck-agent'), ('retouche', 'recheck-agent'),
    ('recheck-agent', 'revalidation'), ('recheck-agent', 'retouche'), ('recheck-agent', 'pret-validation'),
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

-- ---------------------------------------------------------------------------------------------------------------
-- Présélection : les contributeurs versent leurs choix dans le journal de la Dégustation (0042)
-- ---------------------------------------------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.degustation_choix') is not null then
    execute 'drop policy if exists "degustation_choix : équipe ajout" on public.degustation_choix';
    execute 'create policy "degustation_choix : équipe ajout" on public.degustation_choix for insert to authenticated with check (public.est_contributeur() and auteur = auth.uid())';
  end if;
end;
$$;
