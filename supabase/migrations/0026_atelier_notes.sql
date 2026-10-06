-- Atelier des propositions (/admin/atelier) : notes du super admin sur les combinaisons du générateur de propositions
-- (packages/core/src/propositions.ts), pour l'améliorer au fil des notes (packages/core/src/atelier-poids.ts).
-- - atelier_notes : journal en AJOUT SEUL (jamais modifié ni supprimé par l'application) : ingrédients de la combinaison
--   (structure, gamme, style / registre / style visuel, animation, héros, sujet n° 1, sujets, couleurs préférées,
--   identifiant de la proposition), note de 1 à 5, étiquettes rapides, commentaire facultatif, auteur.
-- - atelier_notes_apprentissage() : lecture pour l'apprentissage, ouverte à tous les comptes connectés (y compris les
--   sessions anonymes du parcours d'essai) : ingrédients, note et étiquettes seulement — ni commentaire, ni auteur, ni date.
-- Rejouable : if not exists, create or replace, drop … if exists. À exécuter après 0025_essai_anonyme.sql.

create table if not exists public.atelier_notes (
  id uuid primary key default gen_random_uuid(),
  -- Hachage stable des ingrédients (cleCombinaison, 16 caractères hexadécimaux)
  cle_combinaison text not null check (cle_combinaison ~ '^[0-9a-f]{16}$'),
  ingredients jsonb not null check (jsonb_typeof(ingredients) = 'object' and pg_column_size(ingredients) <= 4000),
  note smallint not null check (note between 1 and 5),
  etiquettes text[] not null default '{}'
    check (cardinality(etiquettes) <= 12 and array_to_string(etiquettes, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$'),
  commentaire text check (commentaire is null or char_length(commentaire) <= 2000),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists atelier_notes_cle_idx on public.atelier_notes (cle_combinaison, created_at desc);
create index if not exists atelier_notes_date_idx on public.atelier_notes (created_at desc);

alter table public.atelier_notes enable row level security;

drop policy if exists "atelier notes : lecture admin" on public.atelier_notes;
drop policy if exists "atelier notes : ajout admin" on public.atelier_notes;

create policy "atelier notes : lecture admin" on public.atelier_notes
  for select to authenticated using (public.is_admin());
-- Ajout seul, au nom de l'admin connecté ; aucune politique update / delete : le journal ne se réécrit pas
create policy "atelier notes : ajout admin" on public.atelier_notes
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());

-- Droits : les privilèges par défaut du schéma public sont retirés, puis seuls ceux utiles sont rendus
revoke all on public.atelier_notes from anon, authenticated;
grant select, insert on public.atelier_notes to authenticated;
grant select, insert, update, delete on public.atelier_notes to service_role;

-- Lecture pour l'apprentissage (parcours /creer, praticiens et sessions anonymes de l'essai) : les poids sont calculés
-- côté serveur (poidsAtelier) à partir de ces lignes ; commentaires, auteurs et dates ne sortent jamais.
create or replace function public.atelier_notes_apprentissage(p_limite integer default 5000)
returns table (ingredients jsonb, note smallint, etiquettes text[])
language sql
stable
security definer
set search_path = ''
as $$
  select n.ingredients, n.note, n.etiquettes
  from public.atelier_notes n
  order by n.created_at desc
  limit least(greatest(coalesce(p_limite, 5000), 1), 20000);
$$;

revoke all on function public.atelier_notes_apprentissage(integer) from public, anon;
grant execute on function public.atelier_notes_apprentissage(integer) to authenticated, service_role;
