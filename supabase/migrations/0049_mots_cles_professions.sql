-- 0049 : mots-clés de recherche de photos par (profession, thème) (ajout de Paul du 2026-10-09 : « Quand on crée une profession,
-- on crée des thèmes clés qui permettent ensuite de sourcer des photos (Pexels, etc.) »). Rejouable. NON exécutée par les agents :
-- à lancer par Paul dans l'éditeur SQL de Supabase, après 0046 (assets_professions).
--
-- Valeurs par défaut dans le code (packages/core/src/recherche-photos-professions.ts, THEMES_RECHERCHE). La profession par défaut
-- (podologue) garde sa table d'origine photos_libres_mots_cles (clé = sujet, 0028) : rien n'est recopié ni modifié. Les autres
-- professions enregistrent ici leurs mots-clés éditables (12 au plus, comme 0028). La profession de chaque photo gardée est
-- enregistrée dans assets_professions (0046) sous la clé de la candidate, puis reportée sur la photo importée.

create table if not exists public.photos_libres_mots_cles_professions (
  profession text not null check (profession ~ '^[a-z0-9-]{2,40}$'),
  theme text not null check (theme ~ '^[a-z0-9-]{2,40}$'),
  mots_cles text[] not null default '{}' check (cardinality(mots_cles) <= 12),
  updated_at timestamptz not null default now(),
  primary key (profession, theme)
);

alter table public.photos_libres_mots_cles_professions enable row level security;
drop policy if exists "photos libres mots-clés professions : admin" on public.photos_libres_mots_cles_professions;
create policy "photos libres mots-clés professions : admin" on public.photos_libres_mots_cles_professions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.photos_libres_mots_cles_professions from anon, authenticated;
grant select, insert, update, delete on public.photos_libres_mots_cles_professions to authenticated;
grant select, insert, update, delete on public.photos_libres_mots_cles_professions to service_role;
