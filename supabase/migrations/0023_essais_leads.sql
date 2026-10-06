-- Essai gratuit de 3 mois (« onboarding lead »), rejouable sans risque. Voir docs/onboarding-lead.md.
--   1. Table « essais » (un essai par compte) : dates d'essai, source et UTM, consentement aux CGU (version + date),
--      accord facultatif pour les conseils par e-mail, progression du parcours, demande de mise en ligne, validation
--      manuelle par la commerciale (valide_par / valide_le), suspension, paiement Stripe, suivi commercial (statut,
--      prochaine relance, relances faites). Notes commerciales dans « essais_notes ». RLS : admin uniquement ; le
--      praticien ne lit que les champs utiles de SON essai par la fonction mon_essai(), jamais le suivi commercial.
--   2. sites.essai : site créé par un compte en essai (posé à la création, non modifiable par le praticien).
--   3. Garde « essai = aperçu seulement » : demander_publication refuse la production d'un site d'essai non validé,
--      même pour un admin (la commerciale passe par « Valider et mettre en ligne », qui valide d'abord).
--   4. Aperçu d'essai suivi comme une publication (demander_apercu_essai), paiement confirmé par le webhook Stripe
--      (confirmer_paiement_essai, protégé par un jeton dont seul le hachage est en base : aucune clé service_role
--      côté Vercel).

-- ---------------------------------------------------------------------------
-- 1. Essais
-- ---------------------------------------------------------------------------
create table if not exists public.essais (
  owner uuid primary key references public.profiles (id) on delete cascade,
  site_id uuid unique references public.sites (id) on delete set null,
  prenom text not null default '',
  nom text not null default '',
  ville text not null default '',
  profession text not null default 'pedicure-podologue',
  source text not null default '',
  utm jsonb not null default '{}'::jsonb,
  cgu_version text not null,
  cgu_acceptees_le timestamptz not null,
  conseils_opt_in boolean not null default false,
  conseils_opt_in_le timestamptz,
  essai_debut timestamptz not null default now(),
  essai_fin timestamptz not null default (now() + interval '3 months'),
  parcours_etape int not null default 0 check (parcours_etape between 0 and 7),
  apercu_genere_le timestamptz,
  mise_en_ligne_demandee_le timestamptz,
  valide_par uuid references public.profiles (id) on delete set null,
  valide_le timestamptz,
  suspendu_le timestamptz,
  paiement_statut text,
  paye_le timestamptz,
  stripe_client text,
  stripe_abonnement text,
  stripe_evenement text,
  statut_commercial text not null default 'nouveau',
  prochaine_relance date,
  relances_faites jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.essais drop constraint if exists essais_statut_commercial_check;
alter table public.essais add constraint essais_statut_commercial_check
  check (statut_commercial in ('nouveau', 'contacte', 'rendez_vous', 'gagne', 'perdu'));
alter table public.essais drop constraint if exists essais_paiement_statut_check;
alter table public.essais add constraint essais_paiement_statut_check
  check (paiement_statut is null or paiement_statut in ('paye', 'impaye', 'annule'));

create index if not exists essais_debut_idx on public.essais (essai_debut desc);
create index if not exists essais_fin_idx on public.essais (essai_fin);
create index if not exists essais_statut_idx on public.essais (statut_commercial);

create or replace function public.essais_maj_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists essais_maj_date on public.essais;
create trigger essais_maj_date before update on public.essais
  for each row execute function public.essais_maj_date();

alter table public.essais enable row level security;
drop policy if exists "essais : admin" on public.essais;
create policy "essais : admin" on public.essais
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.essais from anon;
grant select, insert, update, delete on public.essais to authenticated;
grant select, insert, update, delete on public.essais to service_role;

create table if not exists public.essais_notes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.essais (owner) on delete cascade,
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  texte text not null check (length(texte) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists essais_notes_owner_idx on public.essais_notes (owner, created_at desc);

alter table public.essais_notes enable row level security;
drop policy if exists "essais_notes : admin" on public.essais_notes;
create policy "essais_notes : admin" on public.essais_notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.essais_notes from anon;
grant select, insert, update, delete on public.essais_notes to authenticated;
grant select, insert, update, delete on public.essais_notes to service_role;

-- Jetons des webhooks (paiement) : seul le SHA-256 du jeton est stocké. Aucune lecture par l'API (ni anon, ni
-- authenticated) : seules les fonctions security definer ci-dessous le comparent.
create table if not exists public.jetons_webhooks (
  nom text primary key,
  jeton_hash text not null check (jeton_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.jetons_webhooks enable row level security;
revoke all on public.jetons_webhooks from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fonctions utilitaires (security definer : lisent « essais » malgré la RLS admin)
-- ---------------------------------------------------------------------------

-- Vrai si le compte a un essai pas encore validé par la commerciale.
create or replace function public.compte_en_essai(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.essais where owner = p_owner and valide_le is null);
$$;

-- Vrai si le site appartient à un compte en essai non validé : production refusée, aperçu seulement.
create or replace function public.essai_bloque_production(p_site uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sites s join public.essais e on e.owner = s.owner
    where s.id = p_site and e.valide_le is null
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. sites.essai et protections (reprend TOUT le contenu de 0017, garde du jeu de photos de 0016 comprise)
-- ---------------------------------------------------------------------------
alter table public.sites add column if not exists essai boolean not null default false;

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
    -- Essai (0023) : le praticien ne peut pas sortir lui-même son site de l'essai.
    new.essai := old.essai;
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
    -- Essai (0023) : site d'un compte en essai, un seul par compte.
    new.essai := public.compte_en_essai(new.owner);
    if new.essai and exists (select 1 from public.sites where owner = new.owner) then
      raise exception 'Un seul site par compte d’essai.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- Les triggers sites_protect_insert / sites_protect_columns (0017) appellent ces fonctions : rien à recréer.

-- Rattache le site créé à l'essai du compte (premier site seulement).
create or replace function public.lier_site_essai()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.essais set site_id = new.id where owner = new.owner and site_id is null;
  return new;
end;
$$;

drop trigger if exists sites_lier_essai on public.sites;
create trigger sites_lier_essai after insert on public.sites
  for each row execute function public.lier_site_essai();

-- ---------------------------------------------------------------------------
-- 3. Demande de publication (0017) + garde « essai = aperçu seulement »
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
  -- Essai non validé : jamais de production, quel que soit le demandeur (validation d'abord : valider_essai).
  if public.essai_bloque_production(p_site) then
    raise exception 'Version d’essai : mise en ligne publique après validation par la conseillère.' using errcode = 'P0001';
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

-- ---------------------------------------------------------------------------
-- 4. Fonctions de l'essai
-- ---------------------------------------------------------------------------

-- Démarre l'essai du compte connecté à partir des informations saisies à l'inscription (métadonnées du compte :
-- prenom, nom, ville, source, utm, cgu_version, conseils). Idempotent : un seul essai par compte.
create or replace function public.demarrer_essai()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_meta jsonb;
  v_cree timestamptz;
  v_fin timestamptz;
  v_conseils boolean;
  v_utm jsonb;
begin
  if v_uid is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  select essai_fin into v_fin from public.essais where owner = v_uid;
  if found then
    return v_fin;
  end if;
  select coalesce(raw_user_meta_data, '{}'::jsonb), created_at into v_meta, v_cree from auth.users where id = v_uid;
  if coalesce(v_meta ->> 'cgu_version', '') = '' then
    raise exception 'Acceptation des conditions de l’essai requise.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.sites where owner = v_uid) then
    raise exception 'Ce compte a déjà un site : contactez-nous.' using errcode = 'P0001';
  end if;
  v_conseils := coalesce((v_meta ->> 'conseils')::boolean, false);
  v_utm := case when jsonb_typeof(v_meta -> 'utm') = 'object' then v_meta -> 'utm' else '{}'::jsonb end;
  insert into public.essais (owner, prenom, nom, ville, source, utm, cgu_version, cgu_acceptees_le, conseils_opt_in, conseils_opt_in_le)
  values (
    v_uid,
    left(coalesce(v_meta ->> 'prenom', ''), 80),
    left(coalesce(v_meta ->> 'nom', ''), 80),
    left(coalesce(v_meta ->> 'ville', ''), 80),
    left(coalesce(v_meta ->> 'source', ''), 80),
    v_utm,
    left(v_meta ->> 'cgu_version', 40),
    coalesce(v_cree, now()),
    v_conseils,
    case when v_conseils then coalesce(v_cree, now()) end
  )
  on conflict (owner) do nothing
  returning essai_fin into v_fin;
  if v_fin is null then
    select essai_fin into v_fin from public.essais where owner = v_uid;
  end if;
  return v_fin;
end;
$$;

-- Essai du compte connecté : champs utiles au praticien uniquement (jamais le suivi commercial ni les notes).
create or replace function public.mon_essai()
returns table (
  essai_debut timestamptz, essai_fin timestamptz, site_id uuid, prenom text, nom text, ville text,
  parcours_etape int, apercu_genere_le timestamptz, mise_en_ligne_demandee_le timestamptz, valide_le timestamptz,
  suspendu_le timestamptz, paiement_statut text
)
language sql
stable
security definer
set search_path = ''
as $$
  select essai_debut, essai_fin, site_id, prenom, nom, ville, parcours_etape, apercu_genere_le,
    mise_en_ligne_demandee_le, valide_le, suspendu_le, paiement_statut
  from public.essais where owner = auth.uid();
$$;

-- Étape la plus avancée atteinte dans le parcours guidé (progression affichée à la commerciale).
create or replace function public.noter_progression_essai(p_etape int)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.essais set parcours_etape = greatest(parcours_etape, least(greatest(coalesce(p_etape, 0), 0), 7))
  where owner = auth.uid() and parcours_etape < least(greatest(coalesce(p_etape, 0), 0), 7);
$$;

-- « Demander la mise en ligne » : la demande apparaît dans /admin/leads (à faire de la commerciale).
create or replace function public.demander_mise_en_ligne_essai()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_maintenant timestamptz := now();
begin
  update public.essais set mise_en_ligne_demandee_le = v_maintenant
    where owner = auth.uid() and site_id is not null and valide_le is null and suspendu_le is null;
  if not found then
    raise exception 'Demande impossible : créez d’abord votre site.' using errcode = 'P0001';
  end if;
  return v_maintenant;
end;
$$;

-- Aperçu d'essai suivi comme une publication (mêmes colonnes de suivi, la version publiée n'est pas touchée) :
-- propriétaire ou admin, essai en cours (ou payé / validé), ni suspendu ni terminé.
create or replace function public.demander_apercu_essai(p_site uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_statut text;
  e public.essais%rowtype;
  v_maintenant timestamptz := now();
begin
  select owner, statut into v_owner, v_statut from public.sites where id = p_site for update;
  if not found or (v_owner is distinct from auth.uid() and not public.is_admin()) then
    raise exception 'Site introuvable.' using errcode = '42501';
  end if;
  select * into e from public.essais where owner = v_owner;
  if not found then
    raise exception 'Ce site n’est pas une version d’essai.' using errcode = 'P0001';
  end if;
  if v_statut = 'suspendu' or e.suspendu_le is not null then
    raise exception 'Version d’essai suspendue.' using errcode = 'P0001';
  end if;
  if e.essai_fin < v_maintenant and e.valide_le is null and e.paiement_statut is distinct from 'paye' then
    raise exception 'Essai terminé.' using errcode = 'P0001';
  end if;
  update public.sites set
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

-- Validation manuelle avant toute mise en ligne publique (admin / commerciale) : vérification de l'inscription à
-- l'Ordre et des informations du cabinet faite par la commerciale.
create or replace function public.valider_essai(p_owner uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_maintenant timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'Réservé à l’administration.' using errcode = '42501';
  end if;
  update public.essais set valide_par = auth.uid(), valide_le = v_maintenant, suspendu_le = null
    where owner = p_owner;
  if not found then
    raise exception 'Essai introuvable.' using errcode = 'P0001';
  end if;
  update public.sites set essai = false where owner = p_owner and essai;
  return v_maintenant;
end;
$$;

-- Paiement confirmé par le webhook Stripe (route /api/stripe/webhook, signature Stripe vérifiée côté serveur) :
-- appelée sans session, protégée par un jeton partagé (variable PAIEMENT_WEBHOOK_JETON côté Vercel, SHA-256 dans
-- jetons_webhooks). Idempotente (même événement ignoré).
create or replace function public.confirmer_paiement_essai(
  p_jeton text, p_owner uuid, p_statut text, p_client text, p_abonnement text, p_evenement text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  select jeton_hash into v_hash from public.jetons_webhooks where nom = 'stripe';
  if v_hash is null or v_hash <> encode(sha256(convert_to(coalesce(p_jeton, ''), 'UTF8')), 'hex') then
    raise exception 'Jeton invalide.' using errcode = '42501';
  end if;
  if p_statut not in ('paye', 'impaye', 'annule') then
    raise exception 'Statut de paiement invalide.' using errcode = 'P0001';
  end if;
  update public.essais set
    paiement_statut = p_statut,
    paye_le = case when p_statut = 'paye' then coalesce(paye_le, now()) else paye_le end,
    stripe_client = coalesce(nullif(left(p_client, 100), ''), stripe_client),
    stripe_abonnement = coalesce(nullif(left(p_abonnement, 100), ''), stripe_abonnement),
    stripe_evenement = left(p_evenement, 100)
  where owner = p_owner and stripe_evenement is distinct from left(p_evenement, 100);
  return found;
end;
$$;

revoke all on function public.compte_en_essai(uuid) from public, anon;
revoke all on function public.essai_bloque_production(uuid) from public, anon;
revoke all on function public.demander_publication(uuid) from public, anon;
revoke all on function public.demarrer_essai() from public, anon;
revoke all on function public.mon_essai() from public, anon;
revoke all on function public.noter_progression_essai(int) from public, anon;
revoke all on function public.demander_mise_en_ligne_essai() from public, anon;
revoke all on function public.demander_apercu_essai(uuid) from public, anon;
revoke all on function public.valider_essai(uuid) from public, anon;
revoke all on function public.confirmer_paiement_essai(text, uuid, text, text, text, text) from public;
revoke all on function public.lier_site_essai() from public, anon, authenticated;

grant execute on function public.compte_en_essai(uuid) to authenticated;
grant execute on function public.essai_bloque_production(uuid) to authenticated;
grant execute on function public.demander_publication(uuid) to authenticated;
grant execute on function public.demarrer_essai() to authenticated;
grant execute on function public.mon_essai() to authenticated;
grant execute on function public.noter_progression_essai(int) to authenticated;
grant execute on function public.demander_mise_en_ligne_essai() to authenticated;
grant execute on function public.demander_apercu_essai(uuid) to authenticated;
grant execute on function public.valider_essai(uuid) to authenticated;
grant execute on function public.confirmer_paiement_essai(text, uuid, text, text, text, text) to anon, authenticated;
