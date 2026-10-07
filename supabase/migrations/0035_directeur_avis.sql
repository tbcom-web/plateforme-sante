-- Avis de Paul sur le travail du directeur artistique (.claude/agents/directeur-artistique.md), depuis le Studio de recettes
-- (/admin/atelier/studio) : « Pas convaincu » (+ remarque) ou « Enregistrée comme recette » sur une proposition de Claude
-- (retours/recettes-proposees.json), « À faire » / « Pas utile » sur un manque signalé (retours/MANQUES.md).
-- Journal léger, sans auteur ni donnée personnelle (l'export public scripts/exporter-retours.mjs en tire
-- retours/directeur-avis.json). À exécuter après 0034. Rejouable : create … if not exists, drop policy if exists.
-- Sans cette migration, le Studio garde les avis dans le navigateur (export manuel en JSON).

create table if not exists public.directeur_avis (
  id uuid primary key default gen_random_uuid(),
  nature text not null check (nature in ('proposition', 'manque')),
  -- Identifiant de la proposition (ex. « sport-1 ») ou du manque (ex. « M3 »)
  cle text not null check (cle ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'),
  decision text not null check (decision in ('pas-convaincu', 'enregistree', 'a-faire', 'pas-utile')),
  remarque text check (remarque is null or char_length(remarque) <= 1000),
  -- Version du profil de goût (docs/gout-paul.md) de la passe jugée
  profil text check (profil is null or profil ~ '^[0-9A-Za-z.-]{1,40}$'),
  created_at timestamptz not null default now(),
  check ((nature = 'proposition' and decision in ('pas-convaincu', 'enregistree')) or (nature = 'manque' and decision in ('a-faire', 'pas-utile')))
);

create index if not exists directeur_avis_cle_idx on public.directeur_avis (nature, cle, created_at desc);

alter table public.directeur_avis enable row level security;
drop policy if exists "avis du directeur : admin" on public.directeur_avis;
create policy "avis du directeur : admin" on public.directeur_avis
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.directeur_avis from anon, authenticated;
grant select, insert on public.directeur_avis to authenticated;
grant select, insert, update, delete on public.directeur_avis to service_role;
