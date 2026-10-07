-- Notes des assets (espace « Donner mon avis » /admin/retours et « Bibliothèque & retours » /admin/illustrations) :
-- pictos, dessins, traits continus, matériel, animations, héros de thème, bibliothèque, photos, modèles de structure, gammes.
-- Les assets vivent dans le code (packages/core/src/assets.ts, inventaireAssets) ; la base ne garde que les notes, sous la
-- MÊME clé stable que les revues 0021 (`picto:orthonyxie`, `photo:sport-course`, `gamme:cobalt`, `modele:clair-pratique`…).
-- - assets_notes : journal en AJOUT SEUL (jamais modifié ni supprimé par l'application) : note de 1 à 5, étiquettes
--   « ce qui va bien » / « ce qui ne va pas », commentaire facultatif, empreinte du rendu noté, auteur.
-- - assets_notes_apprentissage() : lecture pour l'apprentissage (packages/core/src/assets-poids.ts), ouverte à tous les comptes
--   connectés (y compris les sessions anonymes du parcours d'essai) : clé, type, note, étiquettes, plus le statut courant des
--   revues 0021 (lignes à note nulle) — ni commentaire, ni auteur, ni date.
-- Les statuts (Validé, À retravailler, Retiré…) restent dans illustrations_revues / illustrations_statuts (0021), inchangés.
-- Rejouable : if not exists, create or replace, drop … if exists. À exécuter après 0026_atelier_notes.sql.

create table if not exists public.assets_notes (
  id uuid primary key default gen_random_uuid(),
  cle_asset text not null check (cle_asset ~ '^[a-z]+:[^[:space:]]{1,200}$'),
  type text not null check (type in ('picto', 'dessin', 'ligne', 'materiel', 'animation', 'heros', 'biblio', 'photo', 'modele', 'gamme')),
  note smallint not null check (note between 1 and 5),
  etiquettes text[] not null default '{}'
    check (cardinality(etiquettes) <= 12 and array_to_string(etiquettes, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$'),
  commentaire text check (commentaire is null or char_length(commentaire) <= 2000),
  -- Empreinte du rendu noté (8 caractères hexadécimaux) : un asset modifié depuis sa note repasse en tête de la notation
  empreinte text check (empreinte is null or empreinte ~ '^[0-9a-f]{8}$'),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Le type est le préfixe de la clé
  constraint assets_notes_type_cle check (split_part(cle_asset, ':', 1) = type)
);

create index if not exists assets_notes_cle_idx on public.assets_notes (cle_asset, created_at desc);
create index if not exists assets_notes_date_idx on public.assets_notes (created_at desc);

alter table public.assets_notes enable row level security;

drop policy if exists "assets notes : lecture admin" on public.assets_notes;
drop policy if exists "assets notes : ajout admin" on public.assets_notes;

create policy "assets notes : lecture admin" on public.assets_notes
  for select to authenticated using (public.is_admin());
-- Ajout seul, au nom de l'admin connecté ; aucune politique update / delete : le journal ne se réécrit pas
create policy "assets notes : ajout admin" on public.assets_notes
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());

-- Droits : les privilèges par défaut du schéma public sont retirés, puis seuls ceux utiles sont rendus
revoke all on public.assets_notes from anon, authenticated;
grant select, insert on public.assets_notes to authenticated;
grant select, insert, update, delete on public.assets_notes to service_role;

-- Lecture pour l'apprentissage (parcours /creer, praticiens et sessions anonymes de l'essai ; construction des sites) :
-- notes (statut nul) puis statuts courants des revues 0021 (note nulle). Commentaires, auteurs et dates ne sortent jamais.
create or replace function public.assets_notes_apprentissage(p_limite integer default 20000)
returns table (cle_asset text, type text, note smallint, etiquettes text[], statut text)
language sql
stable
security definer
set search_path = ''
as $$
  (
    select n.cle_asset, n.type, n.note, n.etiquettes, null::text
    from public.assets_notes n
    order by n.created_at desc
    limit least(greatest(coalesce(p_limite, 20000), 1), 50000)
  )
  union all
  (
    select s.cle, split_part(s.cle, ':', 1), null::smallint, '{}'::text[], s.statut
    from public.illustrations_statuts s
    where s.statut in ('a_retravailler', 'retire')
  );
$$;

revoke all on function public.assets_notes_apprentissage(integer) from public, anon;
grant execute on function public.assets_notes_apprentissage(integer) to authenticated, service_role;
