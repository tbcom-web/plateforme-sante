set lock_timeout = '10s';
-- 0057 : PHOTOS SOUS LICENCE (banques payantes) et option « Photos premium » (demande de Paul du 2026-10-09 : « importer des images
-- "avec licence" qui font beau sur les modèles de démo, nécessitant ensuite un abonnement payant pour les photos »).
-- packages/core/src/photos-sous-licence.ts, apps/admin/src/app/admin/photos-sous-licence, docs/photos-sous-licence.md. Rejouable.
-- NON exécutée par les agents : à lancer par Paul dans l'éditeur SQL de Supabase.
--
-- 1. photos_sous_licence : une ligne par fichier importé par Paul (aucun téléchargement automatique depuis une banque), avec la
--    traçabilité obligatoire : banque, identifiant et page de l'image, type (aperçu/comp, standard, étendue), statut (APERÇU SEULEMENT /
--    ACHETÉE), titulaire, date d'achat, référence de facture ou de licence, sites par licence, crédit, restrictions, usage sensible.
--    Fichiers : stockage « photos », dossier banque/licence/apercu/ ou banque/licence/achetee/ (dossier banque/ réservé à l'admin,
--    0011 / 0030 : aucune politique de stockage à ajouter).
-- 2. photos_sous_licence_sites : rattachement d'une photo à un site : option demandée par le praticien (aucun paiement, aucun e-mail),
--    licence achetée par TBCOM pour ce site (référence obligatoire), ou retirée. Preuve conservée (suppression du site restreinte).
-- 3. demander_option_photos_premium(site, adresses) : le PROPRIÉTAIRE du site (ou l'admin) enregistre sa demande d'option.
-- 4. photos_premium_du_site(site) : le propriétaire lit seulement l'état de SES photos premium (jamais les références, titulaires ou
--    autres sites).
-- Accès : admin seulement pour les tables (is_admin(), 0001) ; le praticien passe par les deux fonctions.

create table if not exists public.photos_sous_licence (
  id uuid primary key default gen_random_uuid(),
  id_fichier text not null unique check (id_fichier ~ '^[0-9a-f]{16}$'),
  banque text not null check (banque in ('adobe-stock', 'istock', 'getty', 'shutterstock', 'unsplash-plus', 'autre')),
  banque_nom text check (banque_nom is null or char_length(banque_nom) between 2 and 60),
  id_image text not null check (char_length(id_image) between 2 and 80),
  page_url text not null check (page_url ~ '^https://' and char_length(page_url) <= 400),
  contributeur text check (contributeur is null or char_length(contributeur) <= 120),
  titre text check (titre is null or char_length(titre) <= 160),
  sujet text not null check (sujet ~ '^[a-z-]{2,30}$'),
  type_licence text not null check (type_licence in ('apercu', 'standard', 'etendue')),
  statut_licence text not null check (statut_licence in ('apercu', 'achetee')),
  telecharge_le date not null,
  titulaire text check (titulaire is null or char_length(titulaire) between 2 and 120),
  date_achat date,
  reference_licence text check (reference_licence is null or char_length(reference_licence) between 3 and 120),
  expire_le date,
  sites_par_licence integer not null default 1 check (sites_par_licence between 1 and 100),
  credit_requis boolean not null default false,
  credit_texte text check (credit_texte is null or char_length(credit_texte) <= 160),
  restrictions text check (restrictions is null or char_length(restrictions) <= 1000),
  personne_reconnaissable boolean not null default false,
  aucune_pathologie boolean not null default false,
  licence_url text check (licence_url is null or licence_url ~ '^https://'),
  chemin text not null check (chemin ~ '^banque/licence/(apercu|achetee)/lic-[0-9a-f]{16}-[0-9]{2,5}\.webp$'),
  url text not null check (url ~ '^https?://'),
  largeurs integer[] not null default '{}',
  largeur_originale integer not null check (largeur_originale > 0),
  hauteur_originale integer not null check (hauteur_originale > 0),
  lot text check (lot is null or lot ~ '^[0-9a-f]{12}$'),
  statut text not null default 'a_valider' check (statut in ('a_valider', 'validee', 'retiree')),
  auteur uuid references auth.users(id) on delete set null,
  importe_le timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cohérences : un aperçu n'est jamais « acheté » ; une licence achetée a son titulaire, sa date et sa référence ; le fichier est
-- rangé dans le dossier de son statut ; un crédit exigé a son texte ; une personne reconnaissable exige « aucune pathologie ».
alter table public.photos_sous_licence drop constraint if exists photos_sous_licence_coherence;
alter table public.photos_sous_licence add constraint photos_sous_licence_coherence check (
  (type_licence = 'apercu') = (statut_licence = 'apercu')
  and (statut_licence = 'apercu' or (titulaire is not null and date_achat is not null and reference_licence is not null))
  and chemin like ('banque/licence/' || statut_licence || '/%')
  and (not credit_requis or credit_texte is not null)
  and (not personne_reconnaissable or aucune_pathologie)
  and (banque <> 'autre' or banque_nom is not null)
  and (expire_le is null or date_achat is null or expire_le >= date_achat)
);

create index if not exists photos_sous_licence_statut on public.photos_sous_licence (statut, sujet);

create table if not exists public.photos_sous_licence_sites (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos_sous_licence(id) on delete restrict,
  -- Restrict : la preuve de licence n'est jamais perdue en supprimant un site
  site_id uuid not null references public.sites(id) on delete restrict,
  statut text not null default 'demandee' check (statut in ('demandee', 'achetee', 'retiree')),
  reference_licence text check (reference_licence is null or char_length(reference_licence) between 3 and 120),
  titulaire text check (titulaire is null or char_length(titulaire) between 2 and 120),
  date_achat date,
  expire_le date,
  note text not null default '' check (char_length(note) <= 1000),
  demande_le timestamptz,
  demande_par uuid references auth.users(id) on delete set null,
  achete_par uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (photo_id, site_id)
);

alter table public.photos_sous_licence_sites drop constraint if exists photos_sous_licence_sites_achat;
alter table public.photos_sous_licence_sites add constraint photos_sous_licence_sites_achat check (
  statut <> 'achetee' or (reference_licence is not null and titulaire is not null and date_achat is not null)
);
alter table public.photos_sous_licence_sites drop constraint if exists photos_sous_licence_sites_fin;
alter table public.photos_sous_licence_sites add constraint photos_sous_licence_sites_fin check (expire_le is null or date_achat is null or expire_le >= date_achat);

create index if not exists photos_sous_licence_sites_site on public.photos_sous_licence_sites (site_id);
create index if not exists photos_sous_licence_sites_attente on public.photos_sous_licence_sites (statut) where statut = 'demandee';

alter table public.photos_sous_licence enable row level security;
alter table public.photos_sous_licence_sites enable row level security;

drop policy if exists "photos sous licence : admin" on public.photos_sous_licence;
create policy "photos sous licence : admin" on public.photos_sous_licence
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "photos sous licence sites : admin" on public.photos_sous_licence_sites;
create policy "photos sous licence sites : admin" on public.photos_sous_licence_sites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.photos_sous_licence to authenticated;
grant select, insert, update, delete on public.photos_sous_licence_sites to authenticated;
grant select, insert, update, delete on public.photos_sous_licence to service_role;
grant select, insert, update, delete on public.photos_sous_licence_sites to service_role;

-- Demande d'option « Photos premium » par le propriétaire du site (ou l'admin) : une ligne « demandée » par photo reconnue (20 au
-- plus) ; une licence déjà achetée n'est jamais rétrogradée ; une demande retirée redevient demandée. Aucun paiement, aucun e-mail.
create or replace function public.demander_option_photos_premium(p_site uuid, p_urls text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  v_id text;
  v_photo uuid;
  u text;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  if not (public.is_admin() or exists (select 1 from public.sites s where s.id = p_site and s.owner = auth.uid())) then
    raise exception 'site inaccessible';
  end if;
  foreach u in array coalesce(p_urls, '{}'::text[]) loop
    exit when n >= 20;
    v_id := substring(u from 'banque/licence/(?:apercu|achetee)/lic-([0-9a-f]{16})-[0-9]{2,5}\.webp');
    continue when v_id is null;
    select p.id into v_photo from public.photos_sous_licence p where p.id_fichier = v_id and p.statut <> 'retiree';
    continue when v_photo is null;
    insert into public.photos_sous_licence_sites (photo_id, site_id, statut, demande_le, demande_par)
    values (v_photo, p_site, 'demandee', now(), auth.uid())
    on conflict (photo_id, site_id) do update
      set statut = 'demandee', demande_le = now(), demande_par = auth.uid(), updated_at = now()
      where public.photos_sous_licence_sites.statut = 'retiree';
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.demander_option_photos_premium(uuid, text[]) from public, anon;
grant execute on function public.demander_option_photos_premium(uuid, text[]) to authenticated;

-- État des photos premium d'UN site, pour son propriétaire (ou l'admin) : seulement ce qu'il faut pour le message du parcours et de
-- /mon-site (fichier, statut de la licence, rattachement, fin de licence, sites par licence) ; ni référence, ni titulaire, ni autres sites.
create or replace function public.photos_premium_du_site(p_site uuid)
returns table (id_fichier text, statut_licence text, statut_photo text, rattachement text, expire_le date, sites_par_licence integer, rang integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id_fichier, p.statut_licence, p.statut, r.statut, r.expire_le, p.sites_par_licence,
    -- Rang du site parmi les sites achetés sous la même référence (limite des sites par licence)
    (select count(*)::integer from public.photos_sous_licence_sites r2
      where r2.photo_id = r.photo_id and r2.statut = 'achetee' and coalesce(r2.reference_licence, '') = coalesce(r.reference_licence, '')
        and (coalesce(r2.date_achat, '1900-01-01'), r2.site_id::text) < (coalesce(r.date_achat, '1900-01-01'), r.site_id::text))
  from public.photos_sous_licence_sites r
  join public.photos_sous_licence p on p.id = r.photo_id
  where r.site_id = p_site
    and (public.is_admin() or exists (select 1 from public.sites s where s.id = p_site and s.owner = auth.uid()));
$$;

revoke all on function public.photos_premium_du_site(uuid) from public, anon;
grant execute on function public.photos_premium_du_site(uuid) to authenticated;

notify pgrst, 'reload schema';
