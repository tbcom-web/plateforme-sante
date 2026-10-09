-- 0053 : SÉRIES DE PHOTOS proposées par l'agent de sourcing (demande de Paul du 2026-10-09 : « qu'un agent puisse me sourcer des
-- belles photos depuis Pexels / Pixabay pour illustrer mes modèles sans que j'aie à le faire moi-même… et qu'il y ait une vraie
-- cohérence visuelle »). packages/core/src/sourcing-photos.ts, docs/sourcing-photos.md. Rejouable. NON exécutée par les agents :
-- à lancer par Paul dans l'éditeur SQL de Supabase (après 0028 et 0031).
--
-- Une ligne = une SÉRIE proposée (6 à 12 photos cohérentes, 2-3 alternatives d'un même lancement partagent le même `groupe`).
-- RIEN n'est téléchargé ni importé avant l'acceptation de Paul : `photos` ne garde que l'identifiant, la page et l'APERÇU servi
-- par la source (hôtes images.pexels.com, pixabay.com, cdn.pixabay.com : même règle que photos_libres.apercu_url, 0031), les
-- scores et les caractéristiques visuelles calculées en mémoire. Une série non décidée expire (14 jours) : ses aperçus ne sont plus
-- montrés. « Accepter » passe par le mécanisme existant (Garder + import WebP, traçabilité et licence de photos_libres).
-- Lecture et écriture : admin seulement (public.is_admin()). Le passage automatique (workflow sourcer-photos, désactivé par
-- défaut) écrit avec la clé secrète du dépôt (service_role), qui contourne la RLS.

create table if not exists public.photos_series (
  id uuid primary key default gen_random_uuid(),
  -- Lancement : les alternatives d'une même cible partagent le groupe ; rang 0 = meilleure série
  groupe text not null check (groupe ~ '^[a-z0-9-]{4,64}$'),
  rang smallint not null default 0 check (rang between 0 and 9),
  profession text not null check (profession ~ '^[a-z0-9-]{2,40}$'),
  -- Identifiant de la cible (« profil:podologue:sport-basket ») et son détail (emplacements, hashtags, requêtes, gamme…)
  cible text not null check (char_length(cible) between 3 and 120),
  cible_details jsonb not null default '{}'::jsonb,
  titre text not null check (char_length(titre) between 3 and 240),
  signature jsonb not null default '{}'::jsonb,
  coherence smallint not null check (coherence between 0 and 100),
  dispersion real not null default 0,
  score smallint not null check (score between 0 and 100),
  gamme text not null default 'canard' check (gamme ~ '^[a-z0-9-]{2,40}$'),
  traitement text not null default 'modele' check (traitement ~ '^[a-z0-9-]{2,40}$'),
  palette jsonb not null default '[]'::jsonb,
  photos jsonb not null check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) between 1 and 12),
  empreinte text not null check (empreinte ~ '^[0-9a-f]{8}$'),
  statut text not null default 'proposee' check (statut in ('proposee', 'acceptee', 'refusee', 'remplacee', 'expiree')),
  -- Photos acceptées (clés « source:id ») et date de la décision
  acceptees text[] not null default '{}',
  decide_le timestamptz,
  -- Requêtes lancées, candidates analysées, écarts par raison (aucune clé, aucune adresse d'API)
  journal jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expire_le timestamptz not null default (now() + interval '14 days')
);

create index if not exists photos_series_attente_idx on public.photos_series (profession, statut, created_at desc);
create index if not exists photos_series_groupe_idx on public.photos_series (groupe, rang);

alter table public.photos_series enable row level security;
drop policy if exists "photos series : admin" on public.photos_series;
create policy "photos series : admin" on public.photos_series
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.photos_series from anon, authenticated;
grant select, insert, update, delete on public.photos_series to authenticated;
grant select, insert, update, delete on public.photos_series to service_role;
