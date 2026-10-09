set lock_timeout = '10s';
-- 0054 : POLITIQUE D'ÉVALUATION UNIQUE (demande de Paul du 2026-10-09 : « éviter les RÉPÉTITIONS d'éléments : quand quelque chose
-- est mauvais, qu'il réapparaisse le moins possible ; que les meilleurs éléments et ceux jamais notés apparaissent en premier »).
-- packages/core/src/politique-evaluation.ts, regles-apprises.ts ; docs/politique-evaluation.md. Rejouable. NON exécutée par les
-- agents : à lancer par Paul dans l'éditeur SQL de Supabase (après 0050, qui définit public.est_contributeur()).
--
-- 1. expositions : journal EN AJOUT SEUL de ce que les surfaces de notation ont MONTRÉ à Paul sans que ce soit déjà journalisé
--    ailleurs (écran passé sans réponse : « ignoré » ; décisions des Arrivages avec leurs raisons ; « Pas pour ici » des kits).
--    Les décisions déjà journalisées (notes, duels, grilles, tournoi, recettes, kits notés) sont relues dans leurs tables : la
--    mémoire commune = ces journaux + cette table (expositionsDepuisJournaux, fusionnerExpositions). Sans la table : mémoire du
--    navigateur (localStorage), même format.
--    Lecture et ajout : équipe (contributeurs, validateur) et admin ; ni modification ni suppression par l'API.
--    PURGE : les lignes de plus de 180 jours ne servent plus (délai de retour : jours ; indicateurs : 30 jours ; signal implicite :
--    expositions récentes) ; public.purger_expositions() les supprime (à lancer à la main, ou par une tâche planifiée si Paul le
--    décide : aucune n'est créée ici).
-- 2. regles_apprises_reglages : journal en ajout seul des « Désactiver » / « Réactiver » de la page « Ce que j'ai compris de tes
--    retours » (dernière ligne par règle = état courant). Sans la table : cookie du navigateur.
-- 3. expositions_apprentissage() : clé, surface, résultat, note, étiquettes, date (ni écran, ni auteur, ni commentaire) pour tout
--    compte connecté (générateur : éléments rétrogradés), comme les autres fonctions *_apprentissage.

create table if not exists public.expositions (
  id uuid primary key default gen_random_uuid(),
  cle text not null check (cle ~ '^[a-z][a-z0-9-]*:[^\s]{1,200}$'),
  surface text not null check (surface in ('tuiles', 'nouveautes', 'arrivages', 'tri', 'duels', 'recettes', 'degustation', 'preselection', 'tournoi', 'kits', 'atelier')),
  ecran text not null check (ecran ~ '^[a-z0-9][a-z0-9:._|@-]{0,159}$'),
  resultat text not null check (resultat in ('choisi', 'pas-choisi', 'pire', 'note', 'ignore', 'accepte', 'refuse')),
  note smallint check (note is null or note between 1 and 5),
  etiquettes text[] not null default '{}' check (cardinality(etiquettes) <= 12),
  texte text check (texte is null or char_length(texte) <= 500),
  auteur uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists expositions_date_idx on public.expositions (created_at desc);
create index if not exists expositions_cle_idx on public.expositions (cle, created_at desc);

-- Auteur et date posés par la base
create or replace function public.expositions_poser()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.auteur := coalesce(auth.uid(), new.auteur);
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists expositions_poser on public.expositions;
create trigger expositions_poser before insert on public.expositions for each row execute function public.expositions_poser();

alter table public.expositions enable row level security;
drop policy if exists "expositions : lecture équipe" on public.expositions;
drop policy if exists "expositions : ajout équipe" on public.expositions;
create policy "expositions : lecture équipe" on public.expositions for select to authenticated using (public.est_contributeur());
create policy "expositions : ajout équipe" on public.expositions for insert to authenticated with check (public.est_contributeur() and auteur = auth.uid());
revoke all on public.expositions from anon, authenticated;
grant select, insert on public.expositions to authenticated;
grant select, insert, update, delete on public.expositions to service_role;

-- Lignes d'apprentissage (sans écran, auteur ni commentaire) pour tout compte connecté
create or replace function public.expositions_apprentissage(p_limite integer default 20000)
returns table (cle text, surface text, resultat text, note smallint, etiquettes text[], created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.cle, e.surface, e.resultat, e.note, e.etiquettes, e.created_at
  from public.expositions e
  where e.created_at > now() - interval '180 days'
  order by e.created_at desc
  limit least(greatest(coalesce(p_limite, 20000), 1), 50000);
$$;
revoke all on function public.expositions_apprentissage(integer) from public, anon;
grant execute on function public.expositions_apprentissage(integer) to authenticated, service_role;

-- Purge documentée (> 180 jours) : admin seulement
create or replace function public.purger_expositions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  if not (public.is_admin() or current_user in ('postgres', 'service_role')) then
    raise exception 'purger_expositions : admin seulement';
  end if;
  delete from public.expositions where created_at < now() - interval '180 days';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.purger_expositions() from public, anon;
grant execute on function public.purger_expositions() to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- Règles apprises : « Désactiver » / « Réactiver » (journal en ajout seul, dernière ligne = état)
-- ---------------------------------------------------------------------------------------------------------------

create table if not exists public.regles_apprises_reglages (
  id uuid primary key default gen_random_uuid(),
  regle text not null check (regle ~ '^[a-z0-9-]{2,40}$'),
  active boolean not null,
  auteur uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists regles_apprises_reglages_idx on public.regles_apprises_reglages (regle, created_at desc);

drop trigger if exists regles_apprises_reglages_poser on public.regles_apprises_reglages;
create trigger regles_apprises_reglages_poser before insert on public.regles_apprises_reglages for each row execute function public.expositions_poser();

alter table public.regles_apprises_reglages enable row level security;
drop policy if exists "regles apprises : lecture équipe" on public.regles_apprises_reglages;
drop policy if exists "regles apprises : ajout admin" on public.regles_apprises_reglages;
create policy "regles apprises : lecture équipe" on public.regles_apprises_reglages for select to authenticated using (public.est_contributeur());
create policy "regles apprises : ajout admin" on public.regles_apprises_reglages for insert to authenticated with check (public.is_admin() and auteur = auth.uid());
revoke all on public.regles_apprises_reglages from anon, authenticated;
grant select, insert on public.regles_apprises_reglages to authenticated;
grant select, insert, update, delete on public.regles_apprises_reglages to service_role;
