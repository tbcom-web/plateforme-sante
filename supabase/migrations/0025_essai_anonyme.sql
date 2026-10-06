-- Essai gratuit sans formulaire préalable : session ANONYME Supabase, rendu après les coordonnées, accès à la fin.
-- Rejouable sans risque. À exécuter APRÈS 0023_essais_leads.sql et 0024_prospects_entonnoir.sql.
-- Voir docs/onboarding-lead.md et docs/tester-parcours-lead.md.
--
-- Nouveau parcours :
--   1. /essai → « Créer mon site gratuit » → session anonyme (supabase.auth.signInAnonymously, clé publique, captcha
--      Turnstile si configuré) → demarrer_essai() crée un essai SANS CGU (aucune donnée personnelle, aucun accord) → /creer.
--   2. « Voir le rendu de mon site » : porte de capture (e-mail, téléphone du cabinet, accord de recontact obligatoire,
--      conseils facultatifs) → capturer_prospect_essai() : le prospect est créé et lié au compte anonyme ; le rendu
--      est affiché DANS LE NAVIGATEUR (aucun workflow, aucun coût).
--   3. « Créez votre accès » (mot de passe + CGU) : conversion du compte anonyme (auth.updateUser email + mot de passe)
--      puis creer_acces_essai() : CGU (version + date) enregistrées, essai de 3 mois démarré à cette date.
--   4. Aperçu privé complet (workflow) et demande de mise en ligne : comme avant, réservés aux comptes avec accès.
-- Garde : un compte anonyme (ou un essai sans CGU) ne peut JAMAIS générer d'aperçu privé, demander la mise en ligne,
-- être validé ni publié (demander_apercu_essai, demander_mise_en_ligne_essai, valider_essai, demander_publication).
--
-- Contenu :
--   1. Comptes anonymes : profil créé sans e-mail (profiles.email NOT NULL), e-mail du profil synchronisé à la
--      conversion, est_anonyme().
--   2. essais : CGU facultatives tant que l'accès n'est pas créé ; email_contact, rendu_demande_le, acces_cree_le.
--   3. prospects : étape « rendu » (coordonnées laissées à la porte du rendu).
--   4. Fonctions de l'essai adaptées (demarrer_essai, mon_essai, lier_prospect_essai, protect_site_insert,
--      demander_publication, demander_apercu_essai, demander_mise_en_ligne_essai, valider_essai) et nouvelles
--      (capturer_prospect_essai, creer_acces_essai, proprietaire_sans_acces).
--   5. supprimer_lead_test étendue aux brouillons anonymes ; nettoyer_anonymes(jours) (manuelle, admin).

-- ---------------------------------------------------------------------------
-- 1. Comptes anonymes
-- ---------------------------------------------------------------------------

-- Profil créé à chaque nouveau compte : un compte anonyme n'a pas d'e-mail (chaîne vide, profiles.email est NOT NULL).
-- Sans cette correction, signInAnonymously échoue (« Database error saving new user »).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

-- Conversion d'un compte anonyme (e-mail ajouté puis confirmé) ou changement d'e-mail : le profil suit.
create or replace function public.synchroniser_email_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '')
    where id = new.id and email is distinct from coalesce(new.email, '');
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row execute function public.synchroniser_email_profil();

-- Rattrapage (rejouable) : profils dont l'e-mail a changé avant ce déclencheur.
update public.profiles p set email = u.email
from auth.users u
where u.id = p.id and u.email is not null and u.email <> '' and p.email is distinct from u.email;

-- Vrai si le compte est anonyme (session « invité » sans e-mail ni mot de passe).
create or replace function public.est_anonyme(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.is_anonymous from auth.users u where u.id = p_uid), false);
$$;

-- ---------------------------------------------------------------------------
-- 2. Essais : accès créé plus tard
-- ---------------------------------------------------------------------------
alter table public.essais alter column cgu_version drop not null;
alter table public.essais alter column cgu_acceptees_le drop not null;
alter table public.essais add column if not exists email_contact text not null default '';
alter table public.essais add column if not exists rendu_demande_le timestamptz;
alter table public.essais add column if not exists acces_cree_le timestamptz;
alter table public.essais add column if not exists telephone text not null default '';

-- Essais créés avant 0025 (inscription avec mot de passe) : accès créé à l'acceptation des CGU.
update public.essais set acces_cree_le = cgu_acceptees_le
  where acces_cree_le is null and cgu_version is not null and cgu_acceptees_le is not null;

create index if not exists essais_cree_idx on public.essais (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Prospects : étape « rendu »
-- ---------------------------------------------------------------------------
alter table public.prospects drop constraint if exists prospects_etape_check;
alter table public.prospects add constraint prospects_etape_check
  check (etape in ('capture', 'inscription', 'rendu', 'compte'));

-- ---------------------------------------------------------------------------
-- 4. Fonctions de l'essai
-- ---------------------------------------------------------------------------

-- Démarre l'essai du compte connecté. Idempotent (un essai par compte).
--   - Compte anonyme : essai SANS CGU ni donnée personnelle (le rendu et l'accès viennent plus tard).
--   - Compte avec e-mail (inscription classique /essai/inscription) : CGU obligatoires dans les métadonnées, accès créé.
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
  v_email text;
  v_anonyme boolean;
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
  select coalesce(raw_user_meta_data, '{}'::jsonb), created_at, lower(coalesce(email, '')), coalesce(is_anonymous, false)
    into v_meta, v_cree, v_email, v_anonyme
    from auth.users where id = v_uid;
  if not v_anonyme and coalesce(v_meta ->> 'cgu_version', '') = '' then
    raise exception 'Acceptation des conditions de l’essai requise.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.sites where owner = v_uid) then
    raise exception 'Ce compte a déjà un site : contactez-nous.' using errcode = 'P0001';
  end if;
  v_conseils := not v_anonyme and coalesce((v_meta ->> 'conseils')::boolean, false);
  v_utm := '{}'::jsonb;
  if jsonb_typeof(v_meta -> 'utm') = 'object' then
    select coalesce(jsonb_object_agg(key, left(value, 100)), '{}'::jsonb) into v_utm
    from jsonb_each_text(v_meta -> 'utm')
    where key in ('utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term') and value <> '';
  end if;
  insert into public.essais (
    owner, prenom, nom, ville, source, utm, cgu_version, cgu_acceptees_le, acces_cree_le, conseils_opt_in, conseils_opt_in_le, email_contact
  )
  values (
    v_uid,
    case when v_anonyme then '' else left(coalesce(v_meta ->> 'prenom', ''), 80) end,
    case when v_anonyme then '' else left(coalesce(v_meta ->> 'nom', ''), 80) end,
    case when v_anonyme then '' else left(coalesce(v_meta ->> 'ville', ''), 80) end,
    left(coalesce(nullif(v_meta ->> 'source', ''), case when v_anonyme then 'page-essai' else '' end), 80),
    v_utm,
    case when v_anonyme then null else left(v_meta ->> 'cgu_version', 40) end,
    case when v_anonyme then null else coalesce(v_cree, now()) end,
    case when v_anonyme then null else coalesce(v_cree, now()) end,
    v_conseils,
    case when v_conseils then coalesce(v_cree, now()) end,
    case when v_anonyme then '' else left(v_email, 200) end
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
-- Type de retour élargi : la fonction est supprimée puis recréée.
drop function if exists public.mon_essai();
create function public.mon_essai()
returns table (
  essai_debut timestamptz, essai_fin timestamptz, site_id uuid, prenom text, nom text, ville text,
  parcours_etape int, apercu_genere_le timestamptz, mise_en_ligne_demandee_le timestamptz, valide_le timestamptz,
  suspendu_le timestamptz, paiement_statut text, email_contact text, telephone text, rendu_demande_le timestamptz,
  acces_cree_le timestamptz, cgu_version text
)
language sql
stable
security definer
set search_path = ''
as $$
  select essai_debut, essai_fin, site_id, prenom, nom, ville, parcours_etape, apercu_genere_le,
    mise_en_ligne_demandee_le, valide_le, suspendu_le, paiement_statut, email_contact, telephone, rendu_demande_le,
    acces_cree_le, cgu_version
  from public.essais where owner = auth.uid();
$$;

-- Rattachement prospect → essai à la création de l'essai (e-mail du compte ; rien pour un compte anonyme).
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
  select nullif(lower(email), '') into v_email from public.profiles where id = new.owner;
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

-- Insertion d'un site par un praticien (reprend 0023, garde du jeu de photos de 0016 comprise) : le site d'un compte
-- anonyme est TOUJOURS un site d'essai (jamais de production sans accès, validation et CGU).
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
    -- Essai (0023) et compte anonyme (0025) : site d'essai, un seul par compte.
    new.essai := public.compte_en_essai(new.owner) or public.est_anonyme(new.owner);
    if new.essai and exists (select 1 from public.sites where owner = new.owner) then
      raise exception 'Un seul site par compte d’essai.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- Demande de publication (0017 + garde 0023) : jamais pour un compte anonyme, jamais pour un essai non validé.
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
  -- Compte anonyme (0025) : aucun accès, aucune CGU : jamais de publication, quel que soit le demandeur.
  if public.est_anonyme(v_owner) then
    raise exception 'Site sans accès créé : publication impossible.' using errcode = 'P0001';
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

-- Aperçu d'essai suivi comme une publication (0023) : exige un compte avec ACCÈS (non anonyme, CGU acceptées),
-- même pour un admin. Le rendu avant l'accès est fait dans le navigateur, sans workflow.
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
  if public.est_anonyme(v_owner) or e.cgu_version is null then
    raise exception 'Accès requis : créez votre accès pour obtenir le lien privé de votre site.' using errcode = 'P0001';
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

-- « Demander la mise en ligne » : compte avec accès seulement.
create or replace function public.demander_mise_en_ligne_essai()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_maintenant timestamptz := now();
begin
  if public.est_anonyme(auth.uid()) or not exists (select 1 from public.essais where owner = auth.uid() and cgu_version is not null) then
    raise exception 'Accès requis : créez votre accès pour demander la mise en ligne.' using errcode = 'P0001';
  end if;
  update public.essais set mise_en_ligne_demandee_le = v_maintenant
    where owner = auth.uid() and site_id is not null and valide_le is null and suspendu_le is null;
  if not found then
    raise exception 'Demande impossible : créez d’abord votre site.' using errcode = 'P0001';
  end if;
  return v_maintenant;
end;
$$;

-- Validation manuelle avant toute mise en ligne publique (admin) : jamais pour un compte anonyme ou sans CGU.
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
  if public.est_anonyme(p_owner) or exists (select 1 from public.essais where owner = p_owner and cgu_version is null) then
    raise exception 'Le praticien n’a pas encore créé son accès (CGU non acceptées) : validation impossible.' using errcode = 'P0001';
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

-- Vrai si le site appartient à un compte sans accès (anonyme, ou essai sans CGU) : aucun aperçu par workflow ni
-- publication (contrôle serveur de l'admin, apps/admin/src/lib/publication.ts). Propriétaire ou admin seulement.
create or replace function public.proprietaire_sans_acces(p_site uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sites s left join public.essais e on e.owner = s.owner
    where s.id = p_site
      and (s.owner = auth.uid() or public.is_admin())
      and (public.est_anonyme(s.owner) or (e.owner is not null and e.cgu_version is null))
  );
$$;

-- Porte du rendu (« Voir le rendu de mon site ») : e-mail, téléphone du cabinet, accord de recontact OBLIGATOIRE,
-- conseils facultatifs. Crée ou met à jour le prospect (prénom, nom, ville repris du brouillon) et le lie au compte
-- connecté (anonyme en général). Ne révèle pas si l'adresse est déjà connue. Débit : 5 par compte sur 10 minutes,
-- 30 par minute au total (journal de 0024).
create or replace function public.capturer_prospect_essai(p_email text, p_telephone text, p_recontact boolean, p_conseils boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_tel text := regexp_replace(coalesce(p_telephone, ''), '[\s.()/-]', '', 'g');
  v_cle text;
  v_config jsonb;
  v_prenom text;
  v_nom text;
  v_ville text;
  v_conseils boolean := coalesce(p_conseils, false);
  e public.essais%rowtype;
begin
  if v_uid is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if not coalesce(p_recontact, false) then
    raise exception 'Accord de recontact requis.' using errcode = '22023';
  end if;
  if char_length(v_email) not between 6 and 200 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Adresse e-mail invalide.' using errcode = '22023';
  end if;
  if v_tel ~ '^(\+33|0033)[1-9][0-9]{8}$' then
    v_tel := '0' || right(v_tel, 9);
  end if;
  if v_tel <> '' and v_tel !~ '^(\+[1-9][0-9]{7,14}|0[1-9][0-9]{8})$' then
    raise exception 'Téléphone invalide.' using errcode = '22023';
  end if;
  if v_tel ~ '^0[1-9][0-9]{8}$' then
    v_tel := regexp_replace(v_tel, '(..)(..)(..)(..)(..)', '\1 \2 \3 \4 \5');
  end if;
  select * into e from public.essais where owner = v_uid;
  if not found then
    raise exception 'Essai introuvable.' using errcode = 'P0001';
  end if;

  -- Limitation de débit (journal de 0024 ; clé de compte hachée à la place de l'IP).
  v_cle := 'compte:' || left(md5(v_uid::text), 24);
  delete from public.prospects_journal where created_at < now() - interval '1 day';
  if (select count(*) from public.prospects_journal where created_at > now() - interval '1 minute') >= 30
    or (select count(*) from public.prospects_journal where ip_hash = v_cle and created_at > now() - interval '10 minutes') >= 5
    or (select count(*) from public.prospects_journal where email = v_email and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Trop de demandes : réessayez dans quelques minutes.' using errcode = '54000';
  end if;
  insert into public.prospects_journal (ip_hash, email) values (v_cle, v_email);

  -- Identité saisie dans le parcours (brouillon du site de l'essai).
  select s.config into v_config from public.sites s
    where s.owner = v_uid order by (s.id = e.site_id) desc nulls last, s.updated_at desc limit 1;
  v_prenom := left(btrim(coalesce(v_config #>> '{praticiens,0,prenom}', '')), 80);
  v_nom := left(btrim(coalesce(v_config #>> '{praticiens,0,nom}', '')), 80);
  v_ville := left(btrim(coalesce(nullif(v_config #>> '{lieux,0,ville}', ''), v_config #>> '{cabinet,ville}', '')), 80);

  insert into public.prospects as p (
    email, prenom, nom, telephone, ville, source, utm, etape, recontact_accepte_le, conseils_opt_in, conseils_opt_in_le, owner
  )
  values (
    v_email, v_prenom, v_nom, v_tel, v_ville, left(coalesce(nullif(e.source, ''), 'page-essai'), 80), coalesce(e.utm, '{}'::jsonb),
    'rendu', now(), v_conseils, case when v_conseils then now() end, v_uid
  )
  on conflict (email) do update set
    -- Le prospect suit le dernier compte anonyme qui l'utilise ; jamais retiré à un compte avec accès.
    owner = case when p.owner is null or p.owner = v_uid or public.est_anonyme(p.owner) then v_uid else p.owner end,
    prenom = case when p.compte_cree_le is null and excluded.prenom <> '' then excluded.prenom else p.prenom end,
    nom = case when p.compte_cree_le is null and excluded.nom <> '' then excluded.nom else p.nom end,
    ville = case when p.compte_cree_le is null and excluded.ville <> '' then excluded.ville else p.ville end,
    telephone = case when excluded.telephone <> '' then excluded.telephone else p.telephone end,
    utm = case when p.utm = '{}'::jsonb then excluded.utm else p.utm end,
    etape = case when p.etape = 'compte' then 'compte' else 'rendu' end,
    recontact_accepte_le = excluded.recontact_accepte_le,
    conseils_opt_in = excluded.conseils_opt_in,
    conseils_opt_in_le = case when excluded.conseils_opt_in then coalesce(p.conseils_opt_in_le, now()) else null end,
    visites = p.visites + 1,
    derniere_visite = now();

  update public.essais set
    email_contact = v_email,
    telephone = case when v_tel <> '' then v_tel else telephone end,
    prenom = case when v_prenom <> '' then v_prenom else prenom end,
    nom = case when v_nom <> '' then v_nom else nom end,
    ville = case when v_ville <> '' then v_ville else ville end,
    rendu_demande_le = coalesce(rendu_demande_le, now()),
    conseils_opt_in = v_conseils,
    conseils_opt_in_le = case when v_conseils then coalesce(conseils_opt_in_le, now()) else null end
  where owner = v_uid;
end;
$$;

-- « Créez votre accès » : appelée APRÈS la conversion du compte anonyme (e-mail lié et confirmé si la confirmation est
-- activée, mot de passe, CGU cochées : métadonnée cgu_version). Enregistre les CGU (version + date), démarre l'essai de
-- 3 mois à cette date (première fois seulement) et rattache le prospect. Idempotente. Renvoie la fin de l'essai.
create or replace function public.creer_acces_essai()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_anonyme boolean;
  v_meta jsonb;
  v_fin timestamptz;
  e public.essais%rowtype;
begin
  if v_uid is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  select lower(coalesce(email, '')), coalesce(is_anonymous, false), coalesce(raw_user_meta_data, '{}'::jsonb)
    into v_email, v_anonyme, v_meta
    from auth.users where id = v_uid;
  if v_anonyme or coalesce(v_email, '') = '' then
    raise exception 'Accès pas encore créé : confirmez d’abord votre adresse e-mail.' using errcode = 'P0001';
  end if;
  if coalesce(v_meta ->> 'cgu_version', '') = '' then
    raise exception 'Acceptation des conditions de l’essai requise.' using errcode = 'P0001';
  end if;
  select * into e from public.essais where owner = v_uid;
  if not found then
    perform public.demarrer_essai();
    select * into e from public.essais where owner = v_uid;
  end if;
  if e.cgu_version is null or e.acces_cree_le is null then
    update public.essais set
      cgu_version = left(v_meta ->> 'cgu_version', 40),
      cgu_acceptees_le = now(),
      acces_cree_le = now(),
      essai_debut = now(),
      essai_fin = now() + interval '3 months',
      email_contact = left(v_email, 200)
    where owner = v_uid
    returning essai_fin into v_fin;
  else
    v_fin := e.essai_fin;
  end if;
  -- Prospect du même e-mail (ou déjà lié à ce compte) : accès créé.
  update public.prospects set owner = v_uid, compte_cree_le = coalesce(compte_cree_le, now()), etape = 'compte'
    where (email = v_email and (owner is null or owner = v_uid or public.est_anonyme(owner))) or owner = v_uid;
  return v_fin;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Leads de test et nettoyage des brouillons anonymes
-- ---------------------------------------------------------------------------

-- Supprime un lead de TEST (admin) : prospect, essai (notes comprises) et site, y compris le brouillon d'un compte
-- ANONYME lié (prospect ou e-mail de contact de l'essai). Refusée pour un e-mail qui n'est pas de test et pour un compte
-- admin. Les comptes de connexion (auth.users, anonymes compris) ne sont pas supprimés ici : Supabase →
-- Authentication → Users (voir docs/tester-parcours-lead.md).
create or replace function public.supprimer_lead_test(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_owner uuid;
  v_owners uuid[];
  v_role text;
  v_prospects int := 0;
  v_essais int := 0;
  v_sites int := 0;
  v_n int;
  v_anonymes int := 0;
  o uuid;
begin
  if not public.is_admin() then
    raise exception 'Réservé à l’administration.' using errcode = '42501';
  end if;
  if not (v_email like '%@webpodologue.fr' or strpos(v_email, '+test') > 0) then
    raise exception 'Seuls les leads de test (@webpodologue.fr ou « +test ») peuvent être supprimés ici.' using errcode = 'P0001';
  end if;
  select id, role into v_owner, v_role from public.profiles where v_email <> '' and lower(email) = v_email;
  if v_role = 'admin' then
    raise exception 'Compte administrateur : suppression refusée.' using errcode = 'P0001';
  end if;
  -- Comptes concernés : celui de l'e-mail, et les comptes ANONYMES liés par le prospect ou l'e-mail de contact.
  select array_agg(distinct x) into v_owners from (
    select v_owner as x where v_owner is not null
    union select owner from public.prospects where email = v_email and owner is not null and public.est_anonyme(owner)
    union select owner from public.essais where email_contact = v_email and public.est_anonyme(owner)
  ) t;
  delete from public.prospects where email = v_email;
  get diagnostics v_prospects = row_count;
  foreach o in array coalesce(v_owners, '{}'::uuid[]) loop
    if exists (select 1 from public.profiles where id = o and role = 'admin') then
      continue;
    end if;
    if public.est_anonyme(o) then
      v_anonymes := v_anonymes + 1;
    end if;
    delete from public.sites where owner = o and (essai or id in (select site_id from public.essais where owner = o));
    get diagnostics v_n = row_count;
    v_sites := v_sites + v_n;
    delete from public.essais where owner = o;
    get diagnostics v_n = row_count;
    v_essais := v_essais + v_n;
  end loop;
  return jsonb_build_object('prospects', v_prospects, 'essais', v_essais, 'sites', v_sites, 'compte', v_owner is not null, 'anonymes', v_anonymes);
end;
$$;

-- Nettoyage MANUEL (admin, jamais automatique) des brouillons anonymes abandonnés : sites et essais des comptes
-- anonymes sans activité depuis p_jours jours (90 par défaut, 30 au minimum). Par défaut, seulement les brouillons
-- jamais capturés (aucune coordonnée laissée) ; p_avec_coordonnees = true inclut ceux qui ont laissé leurs coordonnées
-- (le prospect, lui, est conservé). Les comptes anonymes eux-mêmes se suppriment dans l'éditeur SQL (voir la doc).
create or replace function public.nettoyer_anonymes(p_jours int default 90, p_avec_coordonnees boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jours int := greatest(coalesce(p_jours, 90), 30);
  v_limite timestamptz := now() - make_interval(days => greatest(coalesce(p_jours, 90), 30));
  v_owners uuid[];
  v_sites int := 0;
  v_essais int := 0;
begin
  if not public.is_admin() then
    raise exception 'Réservé à l’administration.' using errcode = '42501';
  end if;
  select coalesce(array_agg(e.owner), '{}'::uuid[]) into v_owners
  from public.essais e
  where public.est_anonyme(e.owner)
    and (p_avec_coordonnees or e.rendu_demande_le is null)
    and greatest(e.updated_at, e.created_at) < v_limite
    and not exists (select 1 from public.sites s where s.owner = e.owner and s.updated_at >= v_limite);
  delete from public.sites where owner = any (v_owners) and essai;
  get diagnostics v_sites = row_count;
  delete from public.essais where owner = any (v_owners);
  get diagnostics v_essais = row_count;
  return jsonb_build_object('jours', v_jours, 'essais', v_essais, 'sites', v_sites);
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
revoke all on function public.synchroniser_email_profil() from public, anon, authenticated;
revoke all on function public.est_anonyme(uuid) from public, anon;
revoke all on function public.demarrer_essai() from public, anon;
revoke all on function public.mon_essai() from public, anon;
revoke all on function public.demander_publication(uuid) from public, anon;
revoke all on function public.demander_apercu_essai(uuid) from public, anon;
revoke all on function public.demander_mise_en_ligne_essai() from public, anon;
revoke all on function public.valider_essai(uuid) from public, anon;
revoke all on function public.proprietaire_sans_acces(uuid) from public, anon;
revoke all on function public.capturer_prospect_essai(text, text, boolean, boolean) from public, anon;
revoke all on function public.creer_acces_essai() from public, anon;
revoke all on function public.supprimer_lead_test(text) from public, anon;
revoke all on function public.nettoyer_anonymes(int, boolean) from public, anon;
revoke all on function public.lier_prospect_essai() from public, anon, authenticated;

-- est_anonyme : appelée par protect_site_insert (exécutée avec les droits du praticien).
grant execute on function public.est_anonyme(uuid) to authenticated;
grant execute on function public.demarrer_essai() to authenticated;
grant execute on function public.mon_essai() to authenticated;
grant execute on function public.demander_publication(uuid) to authenticated;
grant execute on function public.demander_apercu_essai(uuid) to authenticated;
grant execute on function public.demander_mise_en_ligne_essai() to authenticated;
grant execute on function public.valider_essai(uuid) to authenticated;
grant execute on function public.proprietaire_sans_acces(uuid) to authenticated;
grant execute on function public.capturer_prospect_essai(text, text, boolean, boolean) to authenticated;
grant execute on function public.creer_acces_essai() to authenticated;
grant execute on function public.supprimer_lead_test(text) to authenticated;
grant execute on function public.nettoyer_anonymes(int, boolean) to authenticated;
