-- Personnalisations du praticien (« Personnaliser mon site », demande de Paul du 2026-10-08 ; packages/core/src/personnalisations-site.ts).
-- Les réglages en vigueur vivent dans le brouillon du site (sites.config -> 'personnalisations' : jsonb versionné, révision et
-- historique borné), figés avec le reste à la publication (config -> config_publiee) : AUCUNE colonne de sites n'est ajoutée.
-- Cette table est le JOURNAL complet des versions enregistrées (au-delà des 30 gardées dans le brouillon) : historique, retour
-- arrière et vue « Personnalisations » de l'admin / commercial. Sans elle, l'application fonctionne (journal ignoré).
-- RLS : le praticien propriétaire du site et l'admin. Une version n'est jamais modifiée ; seul l'admin en supprime.
-- Rejouable : create ... if not exists, politiques supprimées puis recréées. Aucune donnée existante modifiée.

create table if not exists public.personnalisations_versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  revision integer not null check (revision > 0),
  reglages jsonb not null default '{}'::jsonb check (jsonb_typeof(reglages) = 'object'),
  par text not null default 'praticien' check (par in ('praticien', 'admin')),
  -- Action : enregistrement du brouillon, publication demandée, restauration d'une version, annulation par l'admin
  action text not null default 'enregistrement' check (action in ('enregistrement', 'publication', 'restauration', 'annulation')),
  note text check (note is null or char_length(note) <= 200),
  -- Alertes de charte au moment de l'enregistrement (contraste, débordement…) : vue admin / commercial
  casse_charte boolean not null default false,
  auteur uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (site_id, revision, action)
);

create index if not exists personnalisations_versions_site_idx on public.personnalisations_versions (site_id, revision desc);
create index if not exists personnalisations_versions_charte_idx on public.personnalisations_versions (created_at desc) where casse_charte;

alter table public.personnalisations_versions enable row level security;

drop policy if exists "personnalisations_versions : lecture propriétaire ou admin" on public.personnalisations_versions;
create policy "personnalisations_versions : lecture propriétaire ou admin" on public.personnalisations_versions
  for select to authenticated using (
    public.is_admin() or exists (select 1 from public.sites s where s.id = site_id and s.owner = auth.uid())
  );

drop policy if exists "personnalisations_versions : ajout propriétaire ou admin" on public.personnalisations_versions;
create policy "personnalisations_versions : ajout propriétaire ou admin" on public.personnalisations_versions
  for insert to authenticated with check (
    (auteur is null or auteur = auth.uid())
    and (
      public.is_admin()
      or (par = 'praticien' and exists (select 1 from public.sites s where s.id = site_id and s.owner = auth.uid()))
    )
  );

drop policy if exists "personnalisations_versions : suppression admin" on public.personnalisations_versions;
create policy "personnalisations_versions : suppression admin" on public.personnalisations_versions
  for delete to authenticated using (public.is_admin());

-- Aucune politique de modification : une version enregistrée ne change jamais.
revoke all on public.personnalisations_versions from anon;
grant select, insert, delete on public.personnalisations_versions to authenticated;

comment on table public.personnalisations_versions is 'Journal des versions des personnalisations du praticien (réglages en vigueur : sites.config -> personnalisations).';
