-- Fiabilisation de la production (rejouable sans risque).
--   1. Version publiée séparée du brouillon : config_publiee est figée au moment de « Publier » ;
--      la construction du site et la republication groupée (propagation) partent de cette version, jamais du brouillon.
--   2. Suivi de publication : état (en cours, réussie, échouée), lien vers l'exécution GitHub, horodatages, erreur.
--   3. Rattachement d'un site créé par l'admin au compte du praticien : code à usage unique (haché), e-mail attendu,
--      expiration ; le transfert passe par une fonction qui vérifie tout (aucune clé service_role côté admin).
--   4. updated_at ne bouge plus que lorsque le brouillon (config) change : sert de verrou optimiste à l'enregistrement.

-- ---------------------------------------------------------------------------
-- 1 et 2. Colonnes des sites
-- ---------------------------------------------------------------------------
alter table public.sites add column if not exists config_publiee jsonb;
alter table public.sites add column if not exists publiee_le timestamptz;
alter table public.sites add column if not exists publication_etat text;
alter table public.sites add column if not exists publication_run_url text;
alter table public.sites add column if not exists publication_debut timestamptz;
alter table public.sites add column if not exists publication_fin timestamptz;
alter table public.sites add column if not exists publication_erreur text;
alter table public.sites add column if not exists publication_demandee_at timestamptz;

alter table public.sites drop constraint if exists sites_publication_etat_check;
alter table public.sites add constraint sites_publication_etat_check
  check (publication_etat is null or publication_etat in ('en_cours', 'ok', 'echec'));

-- Vrai si le brouillon diffère de la version publiée (ou si le site n'a jamais été publié).
alter table public.sites add column if not exists modifs_non_publiees boolean
  generated always as (config_publiee is distinct from config) stored;

create index if not exists sites_statut_idx on public.sites (statut);
create index if not exists sites_publication_etat_idx on public.sites (publication_etat);

-- ---------------------------------------------------------------------------
-- Protection des colonnes : un praticien ne modifie que son brouillon (config).
-- La version publiée, l'état de publication et le propriétaire sont écrits par l'admin, le robot de publication
-- (service_role) ou les fonctions ci-dessous (security definer, exécutées en tant que postgres).
-- ---------------------------------------------------------------------------
create or replace function public.protect_site_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ancien text := coalesce(old.config #>> '{theme,jeuPhotos}', '');
  nouveau text := coalesce(new.config #>> '{theme,jeuPhotos}', '');
begin
  if not public.is_admin() and current_user not in ('service_role', 'postgres') then
    new.owner := old.owner;
    new.slug := old.slug;
    new.statut := old.statut;
    new.domaine := old.domaine;
    new.published_at := old.published_at;
    new.test := old.test;
    new.options := old.options;
    new.config_publiee := old.config_publiee;
    new.publiee_le := old.publiee_le;
    new.publication_etat := old.publication_etat;
    new.publication_run_url := old.publication_run_url;
    new.publication_debut := old.publication_debut;
    new.publication_fin := old.publication_fin;
    new.publication_erreur := old.publication_erreur;
    new.publication_demandee_at := old.publication_demandee_at;
    -- Jeu de photos (repris de 0016) : un praticien ne peut affecter que des photos intégrées, un jeu partagé actif de sa
    -- spécialité ou le jeu exclusif de son site ; sinon la valeur précédente est conservée.
    if nouveau <> ancien
      and not public.jeu_photos_autorise(nouveau, new.id, coalesce(new.config #>> '{theme,specialite}', ''))
      and new.config ? 'theme' then
      new.config := jsonb_set(new.config, '{theme,jeuPhotos}', to_jsonb(ancien));
    end if;
  end if;
  -- Date de dernière modification du brouillon seulement (verrou optimiste de l'enregistrement) :
  -- l'état de publication, le statut ou les options ne la changent pas.
  if new.config is distinct from old.config then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

create or replace function public.protect_site_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() and current_user not in ('service_role', 'postgres') then
    new.options := '{}'::jsonb;
    new.slug := null;
    new.statut := 'brouillon';
    new.test := false;
    new.config_publiee := null;
    new.publiee_le := null;
    new.publication_etat := null;
    new.publication_run_url := null;
    new.publication_debut := null;
    new.publication_fin := null;
    new.publication_erreur := null;
    new.publication_demandee_at := null;
    if new.config ? 'theme'
      and not public.jeu_photos_autorise(coalesce(new.config #>> '{theme,jeuPhotos}', ''), new.id, coalesce(new.config #>> '{theme,specialite}', '')) then
      new.config := jsonb_set(new.config, '{theme,jeuPhotos}', '""'::jsonb);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sites_protect_insert on public.sites;
create trigger sites_protect_insert
  before insert on public.sites
  for each row execute function public.protect_site_insert();

drop trigger if exists sites_protect_columns on public.sites;
create trigger sites_protect_columns
  before update on public.sites
  for each row execute function public.protect_site_columns();

-- Sites déjà publiés : la version en ligne est réputée être le brouillon actuel (comportement d'avant 0017).
update public.sites
  set config_publiee = config, publiee_le = coalesce(published_at, now())
  where config_publiee is null and published_at is not null;
update public.sites
  set publication_etat = 'ok', publication_fin = published_at
  where publication_etat is null and published_at is not null
    and (publication_demandee_at is null or publication_demandee_at <= published_at);

-- ---------------------------------------------------------------------------
-- Demande de publication : fige le brouillon en version publiée et passe la publication « en cours ».
-- Appelée par le back-office (praticien propriétaire ou admin) juste avant de lancer le workflow GitHub.
-- ---------------------------------------------------------------------------
create or replace function public.demander_publication(p_site uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_statut text;
  v_maintenant timestamptz := now();
begin
  select owner, statut into v_owner, v_statut from public.sites where id = p_site for update;
  if not found or (v_owner is distinct from auth.uid() and not public.is_admin()) then
    raise exception 'Site introuvable.' using errcode = '42501';
  end if;
  if v_statut = 'suspendu' then
    raise exception 'Site suspendu : publication impossible.' using errcode = 'P0001';
  end if;
  update public.sites set
    config_publiee = config,
    publiee_le = v_maintenant,
    publication_demandee_at = v_maintenant,
    publication_etat = 'en_cours',
    publication_run_url = null,
    publication_debut = v_maintenant,
    publication_fin = null,
    publication_erreur = null
  where id = p_site;
  return v_maintenant;
end;
$$;

-- Le workflow n'a pas pu être lancé (GitHub indisponible…) : la publication passe en échec.
create or replace function public.signaler_echec_publication(p_site uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select owner into v_owner from public.sites where id = p_site;
  if not found or (v_owner is distinct from auth.uid() and not public.is_admin()) then
    raise exception 'Site introuvable.' using errcode = '42501';
  end if;
  update public.sites set
    publication_etat = 'echec',
    publication_fin = now(),
    publication_erreur = left(coalesce(p_message, ''), 500)
  where id = p_site and publication_etat = 'en_cours';
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Rattachement d'un site à un compte praticien
-- ---------------------------------------------------------------------------
create table if not exists public.rattachements (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  -- SHA-256 (hexadécimal) du code transmis au praticien ; le code lui-même n'est jamais stocké.
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  expire_le timestamptz not null default now() + interval '14 days',
  cree_par uuid default auth.uid() references public.profiles (id) on delete set null,
  utilise_le timestamptz,
  utilise_par uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists rattachements_site_idx on public.rattachements (site_id);

alter table public.rattachements enable row level security;

drop policy if exists "rattachements : admin" on public.rattachements;
create policy "rattachements : admin" on public.rattachements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.rattachements to authenticated;
grant select, insert, update, delete on public.rattachements to service_role;

-- Transfère le site au compte connecté si le code est valide, non utilisé, non expiré et destiné à son e-mail.
create or replace function public.rattacher_site(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  r public.rattachements%rowtype;
begin
  if v_uid is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  select * into r from public.rattachements
    where code_hash = encode(sha256(convert_to(coalesce(p_code, ''), 'UTF8')), 'hex')
    for update;
  if not found or r.utilise_le is not null or r.expire_le < now() then
    raise exception 'Lien de rattachement invalide, déjà utilisé ou expiré.' using errcode = 'P0001';
  end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is distinct from lower(r.email) then
    raise exception 'Ce lien est destiné à une autre adresse e-mail : connectez-vous avec l’adresse indiquée dans l’invitation.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.sites where owner = v_uid and id <> r.site_id) then
    raise exception 'Ce compte a déjà un site : contactez-nous pour le regrouper.' using errcode = 'P0001';
  end if;
  update public.sites set owner = v_uid where id = r.site_id;
  update public.rattachements set utilise_le = now(), utilise_par = v_uid where id = r.id;
  -- Les autres codes encore valides pour ce site deviennent caducs.
  delete from public.rattachements where site_id = r.site_id and utilise_le is null;
  return r.site_id;
end;
$$;

revoke all on function public.demander_publication(uuid) from public, anon;
revoke all on function public.signaler_echec_publication(uuid, text) from public, anon;
revoke all on function public.rattacher_site(text) from public, anon;
grant execute on function public.demander_publication(uuid) to authenticated;
grant execute on function public.signaler_echec_publication(uuid, text) to authenticated;
grant execute on function public.rattacher_site(text) to authenticated;
