-- Capture précoce des prospects de l'essai gratuit, entonnoir et leads de test. Rejouable sans risque (après 0023).
-- Voir docs/onboarding-lead.md et docs/tester-parcours-lead.md.
--   1. Table « prospects » : coordonnées laissées à l'étape 1 de /essai (prénom, nom, e-mail, téléphone facultatif,
--      ville, accord pour être recontacté, conseils facultatifs, provenance/UTM), AVANT toute création de compte.
--      Un prospect par e-mail (dédoublonnage : la visite suivante met à jour l'étape et la date). Rattaché à l'essai
--      quand le compte du même e-mail démarre son essai. RLS : admin uniquement ; le visiteur anonyme n'écrit QUE par
--      la fonction capturer_prospect (appelée par la route serveur /api/essai/prospect, clé publique, jamais de clé
--      service_role). Colonne « test » : e-mail @webpodologue.fr ou contenant « +test ».
--   2. Limitation de débit (journal purgé au bout d'un jour, IP hachée côté serveur) et jeton facultatif : si un jeton
--      « prospects » est enregistré dans jetons_webhooks, la fonction n'accepte que les appels de la route serveur.
--   3. Compteur de visites de /essai (par jour, sans cookie ni identifiant) pour l'entonnoir de /admin/leads.
--   4. essais.telephone (repris du prospect) et rattachement prospect → essai.
--   5. supprimer_lead_test : supprime prospect, essai et site d'un lead de TEST (admin ; jamais un compte admin).

-- ---------------------------------------------------------------------------
-- 1. Prospects
-- ---------------------------------------------------------------------------
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and char_length(email) between 6 and 200),
  prenom text not null default '' check (char_length(prenom) <= 80),
  nom text not null default '' check (char_length(nom) <= 80),
  telephone text not null default '' check (char_length(telephone) <= 20),
  ville text not null default '' check (char_length(ville) <= 80),
  profession text not null default 'pedicure-podologue',
  source text not null default '',
  utm jsonb not null default '{}'::jsonb,
  etape text not null default 'capture' check (etape in ('capture', 'inscription', 'compte')),
  recontact_accepte_le timestamptz not null,
  conseils_opt_in boolean not null default false,
  conseils_opt_in_le timestamptz,
  visites int not null default 1,
  derniere_visite timestamptz not null default now(),
  owner uuid references public.profiles (id) on delete set null,
  compte_cree_le timestamptz,
  relances_faites jsonb not null default '{}'::jsonb,
  test boolean generated always as (email like '%@webpodologue.fr' or strpos(email, '+test') > 0) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists prospects_email_idx on public.prospects (email);
create index if not exists prospects_cree_idx on public.prospects (created_at desc);
create index if not exists prospects_owner_idx on public.prospects (owner);

drop trigger if exists prospects_maj_date on public.prospects;
create trigger prospects_maj_date before update on public.prospects
  for each row execute function public.essais_maj_date();

alter table public.prospects enable row level security;
drop policy if exists "prospects : admin" on public.prospects;
create policy "prospects : admin" on public.prospects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.prospects from anon;
grant select, insert, update, delete on public.prospects to authenticated;
grant select, insert, update, delete on public.prospects to service_role;

-- ---------------------------------------------------------------------------
-- 2. Limitation de débit : journal des captures (aucune lecture par l'API, purgé au bout d'un jour)
-- ---------------------------------------------------------------------------
create table if not exists public.prospects_journal (
  id bigint generated always as identity primary key,
  ip_hash text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists prospects_journal_date_idx on public.prospects_journal (created_at);
alter table public.prospects_journal enable row level security;
revoke all on public.prospects_journal from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Compteur de visites de la page d'essai (agrégé par jour, aucun identifiant)
-- ---------------------------------------------------------------------------
create table if not exists public.essais_compteurs (
  jour date not null,
  etape text not null check (etape in ('visite')),
  nombre int not null default 0,
  primary key (jour, etape)
);
alter table public.essais_compteurs enable row level security;
drop policy if exists "essais_compteurs : admin" on public.essais_compteurs;
create policy "essais_compteurs : admin" on public.essais_compteurs
  for select to authenticated using (public.is_admin());
revoke all on public.essais_compteurs from anon;
grant select on public.essais_compteurs to authenticated;

-- ---------------------------------------------------------------------------
-- Fonctions
-- ---------------------------------------------------------------------------

-- Étape 1 (« Créer mon site gratuit ») et étape 2 (création du compte commencée). Appelée par la route serveur
-- /api/essai/prospect (Turnstile vérifié côté serveur si configuré). Ne renvoie rien : on ne révèle pas si une adresse
-- est déjà connue. Contrôles : formats, longueurs, accord de recontact, débit (global, par IP hachée, par e-mail).
create or replace function public.capturer_prospect(
  p_email text,
  p_prenom text,
  p_nom text,
  p_telephone text,
  p_ville text,
  p_source text,
  p_utm jsonb,
  p_recontact boolean,
  p_conseils boolean,
  p_ip_hash text,
  p_etape text default 'capture',
  p_jeton text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_prenom text := btrim(regexp_replace(coalesce(p_prenom, ''), '\s+', ' ', 'g'));
  v_nom text := btrim(regexp_replace(coalesce(p_nom, ''), '\s+', ' ', 'g'));
  v_ville text := btrim(regexp_replace(coalesce(p_ville, ''), '\s+', ' ', 'g'));
  v_tel text := regexp_replace(coalesce(p_telephone, ''), '[\s.()/-]', '', 'g');
  v_ip text := left(coalesce(p_ip_hash, ''), 64);
  v_etape text := coalesce(nullif(p_etape, ''), 'capture');
  v_hash text;
  v_utm jsonb := '{}'::jsonb;
begin
  -- Jeton facultatif : actif dès qu'un jeton « prospects » est enregistré (appel direct par l'API refusé).
  select jeton_hash into v_hash from public.jetons_webhooks where nom = 'prospects';
  if v_hash is not null and v_hash <> encode(sha256(convert_to(coalesce(p_jeton, ''), 'UTF8')), 'hex') then
    raise exception 'Appel non autorisé.' using errcode = '42501';
  end if;

  if v_etape not in ('capture', 'inscription') then
    raise exception 'Étape invalide.' using errcode = '22023';
  end if;
  if char_length(v_email) not between 6 and 200 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Adresse e-mail invalide.' using errcode = '22023';
  end if;

  -- Limitation de débit : 30 captures par minute au total, 5 par IP et 5 par e-mail sur 10 minutes.
  delete from public.prospects_journal where created_at < now() - interval '1 day';
  if (select count(*) from public.prospects_journal where created_at > now() - interval '1 minute') >= 30
    or (v_ip <> '' and (select count(*) from public.prospects_journal where ip_hash = v_ip and created_at > now() - interval '10 minutes') >= 5)
    or (select count(*) from public.prospects_journal where email = v_email and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Trop de demandes : réessayez dans quelques minutes.' using errcode = '54000';
  end if;
  insert into public.prospects_journal (ip_hash, email) values (v_ip, v_email);

  -- Étape 2 : met seulement à jour un prospect existant (aucune création sans l'accord de recontact de l'étape 1).
  if v_etape = 'inscription' then
    update public.prospects set
      etape = case when etape = 'capture' then 'inscription' else etape end,
      visites = visites + 1,
      derniere_visite = now()
    where email = v_email;
    return;
  end if;

  if not coalesce(p_recontact, false) then
    raise exception 'Accord de recontact requis.' using errcode = '22023';
  end if;
  if char_length(v_prenom) not between 1 and 80 or char_length(v_nom) not between 1 and 80 or char_length(v_ville) not between 1 and 80 then
    raise exception 'Prénom, nom et ville requis (80 caractères au plus).' using errcode = '22023';
  end if;
  if v_tel <> '' and v_tel !~ '^(\+[1-9][0-9]{7,14}|0[1-9][0-9]{8})$' then
    raise exception 'Téléphone invalide.' using errcode = '22023';
  end if;
  -- Téléphone français mis en forme « 06 12 34 56 78 » (la route serveur l'envoie déjà normalisé).
  if v_tel ~ '^0[1-9][0-9]{8}$' then
    v_tel := regexp_replace(v_tel, '(..)(..)(..)(..)(..)', '\1 \2 \3 \4 \5');
  end if;
  if jsonb_typeof(p_utm) = 'object' then
    select coalesce(jsonb_object_agg(key, left(value, 100)), '{}'::jsonb) into v_utm
    from jsonb_each_text(p_utm)
    where key in ('utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term') and value <> '';
  end if;

  insert into public.prospects as p (email, prenom, nom, telephone, ville, source, utm, recontact_accepte_le, conseils_opt_in, conseils_opt_in_le)
  values (
    v_email, v_prenom, v_nom, v_tel, v_ville, left(coalesce(nullif(p_source, ''), 'page-essai'), 80), v_utm, now(),
    coalesce(p_conseils, false), case when coalesce(p_conseils, false) then now() end
  )
  on conflict (email) do update set
    -- Coordonnées mises à jour tant qu'aucun compte n'est rattaché ; provenance d'origine conservée.
    prenom = case when p.owner is null then excluded.prenom else p.prenom end,
    nom = case when p.owner is null then excluded.nom else p.nom end,
    ville = case when p.owner is null then excluded.ville else p.ville end,
    telephone = case when p.owner is null and excluded.telephone <> '' then excluded.telephone else p.telephone end,
    utm = case when p.utm = '{}'::jsonb then excluded.utm else p.utm end,
    recontact_accepte_le = excluded.recontact_accepte_le,
    conseils_opt_in = excluded.conseils_opt_in,
    conseils_opt_in_le = case when excluded.conseils_opt_in then coalesce(p.conseils_opt_in_le, now()) else null end,
    visites = p.visites + 1,
    derniere_visite = now();
end;
$$;

-- Visite de /essai (route serveur /api/essai/mesure) : +1 sur le compteur du jour (Paris). Aucun identifiant.
create or replace function public.compter_visite_essai()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.essais_compteurs as c (jour, etape, nombre)
  values ((now() at time zone 'Europe/Paris')::date, 'visite', 1)
  on conflict (jour, etape) do update set nombre = c.nombre + 1 where c.nombre < 1000000;
$$;

-- ---------------------------------------------------------------------------
-- 4. Téléphone de l'essai et rattachement prospect → essai (même e-mail que le compte)
-- ---------------------------------------------------------------------------
alter table public.essais add column if not exists telephone text not null default '';

create or replace function public.lier_prospect_essai()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_tel text;
begin
  select lower(email) into v_email from public.profiles where id = new.owner;
  if v_email is null then
    return new;
  end if;
  update public.prospects set
    owner = new.owner,
    compte_cree_le = coalesce(compte_cree_le, now()),
    etape = 'compte'
  where email = v_email and (owner is null or owner = new.owner)
  returning telephone into v_tel;
  if coalesce(new.telephone, '') = '' and coalesce(v_tel, '') <> '' then
    new.telephone := v_tel;
  end if;
  return new;
end;
$$;

drop trigger if exists essais_lier_prospect on public.essais;
create trigger essais_lier_prospect before insert on public.essais
  for each row execute function public.lier_prospect_essai();

-- Rattrapage : prospects dont l'essai existe déjà (rejouable).
update public.prospects p set owner = e.owner, compte_cree_le = coalesce(p.compte_cree_le, e.essai_debut), etape = 'compte'
from public.essais e join public.profiles pr on pr.id = e.owner
where p.owner is null and p.email = lower(pr.email);

-- ---------------------------------------------------------------------------
-- 5. Suppression d'un lead de TEST (admin) : prospect, essai (notes comprises) et site de l'essai.
--    Refusée pour un e-mail qui n'est pas de test et pour un compte admin. Le compte de connexion (auth.users) n'est pas
--    supprimé ici : Supabase → Authentication → Users (voir docs/tester-parcours-lead.md).
-- ---------------------------------------------------------------------------
create or replace function public.supprimer_lead_test(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_owner uuid;
  v_role text;
  v_site uuid;
  v_prospects int := 0;
  v_essais int := 0;
  v_sites int := 0;
begin
  if not public.is_admin() then
    raise exception 'Réservé à l’administration.' using errcode = '42501';
  end if;
  if not (v_email like '%@webpodologue.fr' or strpos(v_email, '+test') > 0) then
    raise exception 'Seuls les leads de test (@webpodologue.fr ou « +test ») peuvent être supprimés ici.' using errcode = 'P0001';
  end if;
  select id, role into v_owner, v_role from public.profiles where lower(email) = v_email;
  if v_role = 'admin' then
    raise exception 'Compte administrateur : suppression refusée.' using errcode = 'P0001';
  end if;
  delete from public.prospects where email = v_email;
  get diagnostics v_prospects = row_count;
  if v_owner is not null then
    select site_id into v_site from public.essais where owner = v_owner;
    delete from public.essais where owner = v_owner;
    get diagnostics v_essais = row_count;
    delete from public.sites where owner = v_owner and (id = v_site or essai);
    get diagnostics v_sites = row_count;
  end if;
  return jsonb_build_object('prospects', v_prospects, 'essais', v_essais, 'sites', v_sites, 'compte', v_owner is not null);
end;
$$;

revoke all on function public.capturer_prospect(text, text, text, text, text, text, jsonb, boolean, boolean, text, text, text) from public;
revoke all on function public.compter_visite_essai() from public;
revoke all on function public.lier_prospect_essai() from public, anon, authenticated;
revoke all on function public.supprimer_lead_test(text) from public, anon;

grant execute on function public.capturer_prospect(text, text, text, text, text, text, jsonb, boolean, boolean, text, text, text) to anon, authenticated;
grant execute on function public.compter_visite_essai() to anon, authenticated;
grant execute on function public.supprimer_lead_test(text) to authenticated;
