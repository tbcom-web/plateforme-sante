-- 0046 : professions des ingrédients (décision de Paul du 2026-10-08, docs/architecture-professions.md). Rejouable. NON exécutée
-- par les agents : à lancer par Paul dans l'éditeur SQL de Supabase.
--
-- Une seule bibliothèque d'ingrédients ; chaque ingrédient (même clé que l'inventaire : photo:…, dessin:…, picto:…, gamme:…)
-- porte une ou plusieurs professions, ou « commun ». Journal en AJOUT SEUL (comme assets_hashtags, 0029) : état courant = dernière
-- action par (clé, profession), lu par assets_professions_effectifs().
--   - ajout   : « Aussi pour Psychomotricien » (un élément ou un lot), suggestion validée ;
--   - retrait : l'ingrédient ne sert plus à cette profession (jamais la dernière : contrôlé par l'admin) ;
--   - refus   : suggestion de partage refusée (ne change pas l'appartenance, n'est plus reproposée).
-- DÉFAUT (sans ligne, calculé par packages/core/src/professions-ingredients.ts, aucune donnée à recopier) : tous les ingrédients
-- existants → « podologue » (pédicure-podologue, slug de la table professions), sauf ceux communs par nature (palettes, polices,
-- mises en page, éléments) → « commun ». Les hashtags #profession-<id> déjà validés (propositions de Claude) valent ajout.
--
-- Sites : déjà rattachés (sites.profession_slug, 0001). Leads : essais.profession et prospects.profession (0023, 0024 ;
-- « pedicure-podologue » ramené à « podologue » par l'admin) ; index ajoutés pour la vue Clients filtrée par profession.
-- Profession psychomotricien : ligne de la table professions (en préparation : aucun site publiable, aucun catalogue de soins).

create table if not exists public.assets_professions (
  id uuid primary key default gen_random_uuid(),
  cle_asset text not null check (cle_asset ~ '^[a-z]+:[^[:space:]]{1,200}$'),
  -- Identifiant du registre (packages/core/src/professions.ts) ou « commun »
  profession text not null check (profession ~ '^[a-z0-9-]{2,40}$'),
  action text not null check (action in ('ajout', 'retrait', 'refus')),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists assets_professions_cle_idx on public.assets_professions (cle_asset, profession, created_at desc);
create index if not exists assets_professions_profession_idx on public.assets_professions (profession);

alter table public.assets_professions enable row level security;
drop policy if exists "assets professions : lecture admin" on public.assets_professions;
drop policy if exists "assets professions : ajout admin" on public.assets_professions;
create policy "assets professions : lecture admin" on public.assets_professions
  for select to authenticated using (public.is_admin());
-- Ajout seul, au nom de l'admin connecté ; aucune modification ni suppression
create policy "assets professions : ajout admin" on public.assets_professions
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());

revoke all on public.assets_professions from anon, authenticated;
grant select, insert on public.assets_professions to authenticated;
grant select, insert, update, delete on public.assets_professions to service_role;

-- État courant : dernière action « ajout » / « retrait » par (clé, profession), plus les refus de suggestion, sans auteur.
-- Lu par l'admin (Frigo), le générateur (kits, tirages) et les praticiens (/creer : ingrédients de leur profession).
create or replace function public.assets_professions_effectifs()
returns table (cle_asset text, profession text, action text)
language sql
stable
security definer
set search_path = ''
as $$
  (select distinct on (p.cle_asset, p.profession) p.cle_asset, p.profession, p.action
   from public.assets_professions p
   where p.action in ('ajout', 'retrait')
   order by p.cle_asset, p.profession, p.created_at desc, p.id desc)
  union all
  (select distinct p.cle_asset, p.profession, p.action
   from public.assets_professions p
   where p.action = 'refus');
$$;

revoke all on function public.assets_professions_effectifs() from public, anon;
grant execute on function public.assets_professions_effectifs() to authenticated, service_role;

-- Profession en préparation (registre : statut « preparation ») : ligne de la table professions, pour rattacher un site de
-- démonstration et des leads. Rejouable ; colonnes de 0001 (slug, libelle, specialite_schema, ordre = instance professionnelle :
-- vide, à rédiger par le pack Psychomotricien).
insert into public.professions (slug, libelle, specialite_schema, ordre)
values ('psychomotricien', 'Psychomotricien', '', '')
on conflict (slug) do nothing;

-- Vue Clients filtrée par profession (bascule rapide du commercial)
create index if not exists essais_profession_idx on public.essais (profession);
create index if not exists prospects_profession_idx on public.prospects (profession);
create index if not exists sites_profession_idx on public.sites (profession_slug);
