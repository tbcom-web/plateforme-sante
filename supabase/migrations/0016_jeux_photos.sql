-- Jeux de photos : ensembles de photos (accueil, panorama, galerie, photos par soin) préparés par le super admin
-- pour une spécialité. À la création d'un site (et à chaque changement de spécialité principale), un jeu partagé
-- actif de la spécialité est tiré au hasard (choisirJeuPhotos, packages/core/src/jeux-photos.ts) et noté dans
-- le brouillon : config.theme.jeuPhotos (id, ou '' = photos intégrées du jeu visuel).
--
-- Jeux exclusifs (option « photos premium », options.photosPremium posé par l'admin après validation
-- commerciale) : site_id renseigné. Une photo Adobe Stock n'est licenciée que pour UN client : un jeu de source
-- « adobe » est toujours exclusif à un site (contrainte), et chaque licence est tracée dans licences_photos.
-- Les photos d'un praticien ne sont jamais partagées non plus : seule la source « banque » peut être partagée.
-- Migration idempotente.

create table if not exists public.jeux_photos (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(nom) between 2 and 80),
  specialite text not null check (specialite ~ '^[a-z0-9-]{2,40}$'),
  -- { accueil, panorama, galerie: [], soins: { slug: url }, cadrages?: { url: 'x% y%' } }
  photos jsonb not null default '{}'::jsonb check (jsonb_typeof(photos) = 'object'),
  source text not null default 'banque' check (source in ('banque', 'adobe', 'praticien')),
  -- NULL : jeu partagé entre les sites de la spécialité ; renseigné : jeu exclusif de ce site
  site_id uuid references public.sites(id) on delete cascade,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Adobe Stock (et photos du praticien) : jamais dans un jeu partagé.
alter table public.jeux_photos drop constraint if exists jeux_photos_exclusif;
alter table public.jeux_photos add constraint jeux_photos_exclusif check (source = 'banque' or site_id is not null);

create index if not exists jeux_photos_partages on public.jeux_photos (specialite) where site_id is null and actif;
create index if not exists jeux_photos_site on public.jeux_photos (site_id) where site_id is not null;

alter table public.jeux_photos enable row level security;

drop policy if exists "jeux photos : lecture" on public.jeux_photos;
drop policy if exists "jeux photos : écriture admin" on public.jeux_photos;
-- Lecture : l'admin voit tout ; un praticien voit les jeux partagés actifs (tirage à l'enregistrement de son
-- site) et les jeux exclusifs de ses propres sites (aperçu). Jamais le jeu exclusif d'un autre site.
create policy "jeux photos : lecture" on public.jeux_photos
  for select to authenticated using (
    public.is_admin()
    or (site_id is null and actif)
    or exists (select 1 from public.sites s where s.id = site_id and s.owner = auth.uid())
  );
create policy "jeux photos : écriture admin" on public.jeux_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.jeux_photos to authenticated;
grant select, insert, update, delete on public.jeux_photos to service_role;

-- Traçabilité des licences Adobe Stock : une ligne par photo et par client (site). Admin uniquement.
create table if not exists public.licences_photos (
  id uuid primary key default gen_random_uuid(),
  -- Restrict : on ne perd pas la preuve de licence en supprimant un site
  site_id uuid not null references public.sites(id) on delete restrict,
  jeu_id uuid references public.jeux_photos(id) on delete set null,
  photo_url text not null check (char_length(photo_url) between 10 and 400),
  fournisseur text not null default 'adobe' check (fournisseur in ('adobe')),
  -- Identifiant de licence Adobe Stock (historique des licences du compte)
  reference_licence text not null check (char_length(reference_licence) between 3 and 120),
  date_achat date,
  transferee_au_client boolean not null default false,
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, photo_url)
);

alter table public.licences_photos enable row level security;

drop policy if exists "licences photos : admin" on public.licences_photos;
create policy "licences photos : admin" on public.licences_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.licences_photos to authenticated;
grant select, insert, update, delete on public.licences_photos to service_role;

-- Un jeu peut-il être affecté à ce site ? '' (photos intégrées), un jeu partagé actif de la spécialité,
-- ou un jeu exclusif actif de ce site. Security definer : ne dépend pas de ce que le praticien peut lire.
create or replace function public.jeu_photos_autorise(jeu text, site uuid, spec text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jeu, '') = '' or exists (
    select 1 from public.jeux_photos j
    where j.id::text = jeu
      and j.actif
      and ((j.site_id is null and j.specialite = spec) or j.site_id = site)
  );
$$;

-- Protection des colonnes (reprend 0014) : options (dont photosPremium) reste réservé à l'admin ;
-- en plus, un praticien ne peut affecter à son site qu'un jeu de photos autorisé (jamais le jeu exclusif
-- d'un autre site) : sinon la valeur précédente est conservée.
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
    if nouveau <> ancien
      and not public.jeu_photos_autorise(nouveau, new.id, coalesce(new.config #>> '{theme,specialite}', ''))
      and new.config ? 'theme' then
      new.config := jsonb_set(new.config, '{theme,jeuPhotos}', to_jsonb(ancien));
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- À la création, un praticien ne peut s'attribuer ni options, ni slug, ni statut, ni jeu de photos non autorisé.
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
    if new.config ? 'theme'
      and not public.jeu_photos_autorise(coalesce(new.config #>> '{theme,jeuPhotos}', ''), new.id, coalesce(new.config #>> '{theme,specialite}', '')) then
      new.config := jsonb_set(new.config, '{theme,jeuPhotos}', '""'::jsonb);
    end if;
  end if;
  return new;
end;
$$;
