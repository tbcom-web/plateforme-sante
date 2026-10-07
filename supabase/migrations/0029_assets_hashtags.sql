-- 0029 : hashtags des visuels (demande de Paul, 2026-10-07 : « taguer aussi des thèmes ou ajouter des hashtags
-- manuellement pour aider à la classification »). Rejouable.
--
-- Complément LIBRE des sujets (assets_sujets, 0028) : #trail, #sneakers… sur n'importe quel asset de l'inventaire (même clé :
-- photo:…, dessin:…, heros:…). Saisis dans « Photos à découvrir » (au moment de Garder), dans la bibliothèque
-- (/admin/illustrations, /admin/photos) et dans les cartes de « Donner mon avis ». Forme : minuscules, sans accents ni
-- espaces, tirets autorisés, 2 à 30 caractères (normalisation dans packages/core/src/hashtags.ts).
-- Journal en AJOUT SEUL : état courant = dernière action par (clé, hashtag). Lecture de l'état courant sans auteur :
-- assets_hashtags_effectifs() (générateur, sites, export).

create table if not exists public.assets_hashtags (
  id uuid primary key default gen_random_uuid(),
  cle_asset text not null check (cle_asset ~ '^[a-z]+:[^[:space:]]{1,200}$'),
  hashtag text not null check (hashtag ~ '^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$'),
  action text not null check (action in ('ajout', 'retrait')),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists assets_hashtags_cle_idx on public.assets_hashtags (cle_asset, hashtag, created_at desc);
create index if not exists assets_hashtags_hashtag_idx on public.assets_hashtags (hashtag);

alter table public.assets_hashtags enable row level security;
drop policy if exists "assets hashtags : lecture admin" on public.assets_hashtags;
drop policy if exists "assets hashtags : ajout admin" on public.assets_hashtags;
create policy "assets hashtags : lecture admin" on public.assets_hashtags
  for select to authenticated using (public.is_admin());
-- Ajout seul, au nom de l'admin connecté ; aucune modification ni suppression
create policy "assets hashtags : ajout admin" on public.assets_hashtags
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());

revoke all on public.assets_hashtags from anon, authenticated;
grant select, insert on public.assets_hashtags to authenticated;
grant select, insert, update, delete on public.assets_hashtags to service_role;

-- État courant (dernière action par clé et hashtag), sans auteur
create or replace function public.assets_hashtags_effectifs()
returns table (cle_asset text, hashtag text, action text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (h.cle_asset, h.hashtag) h.cle_asset, h.hashtag, h.action
  from public.assets_hashtags h
  order by h.cle_asset, h.hashtag, h.created_at desc, h.id desc;
$$;

revoke all on function public.assets_hashtags_effectifs() from public, anon;
grant execute on function public.assets_hashtags_effectifs() to authenticated, service_role;
