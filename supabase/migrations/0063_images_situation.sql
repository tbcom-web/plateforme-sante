set lock_timeout = '10s';
-- 0063 : IMAGES EN SITUATION ET STRUCTURE FIGÉE (décision de Paul du 2026-10-10 : « pour la finalisation des modèles […] je ne
-- laisserais plus toucher à la structure mais juste choisir les photos en passant sur l'image du site […] Idem pour l'illustration
-- du haut »). Code : packages/core/src/chaine-images.ts.
--
-- 1. modeles_images_choix : journal (ajout seul) des images choisies dans l'aperçu, par design × profil de démonstration ×
--    emplacement (« heros » = illustration du haut, « photo:<i> » = photo n° i, 0 = premier écran). PRÉFÉRENCE DE RENDU, jamais une
--    version : le design reste réutilisable par tous les profils, le test et la relecture restent valables. Le plus récent de chaque
--    emplacement fait foi. Lecture et ajout : équipe de la chaîne (est_contributeur, 0050) ; aucune modification ni suppression.
-- 2. modeles_versions_structure_figee : à partir de « finaliste », une nouvelle version écrite par un compte de l'équipe ne peut
--    différer de la précédente que par ses images (photos, visuels.herosSujet). La retouche de Claude (tickets) passe par le
--    validateur ou le service (ecriture_privilegiee, 0050) : seule à pouvoir changer la structure.
-- Rejouable. Le code fonctionne AVANT cette migration (choix gardés le temps de la page, message « Migration 0063 à exécuter »).

create table if not exists public.modeles_images_choix (
  id uuid primary key default gen_random_uuid(),
  modele uuid not null references public.modeles_fiches (id) on delete cascade,
  profil text not null check (profil ~ '^[a-z0-9~.+_-]{2,80}$'),
  emplacement text not null check (emplacement ~ '^(heros|photo:[0-9])$'),
  image text not null check (char_length(image) between 1 and 600),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists modeles_images_choix_modele_idx on public.modeles_images_choix (modele, profil, created_at desc);

alter table public.modeles_images_choix enable row level security;
drop policy if exists "images choix : equipe lecture" on public.modeles_images_choix;
create policy "images choix : equipe lecture" on public.modeles_images_choix
  for select to authenticated using ((select public.est_contributeur()));
drop policy if exists "images choix : equipe ajout" on public.modeles_images_choix;
create policy "images choix : equipe ajout" on public.modeles_images_choix
  for insert to authenticated with check ((select public.est_contributeur()) and auteur is not distinct from (select auth.uid()));
revoke all on public.modeles_images_choix from anon;
grant select, insert on public.modeles_images_choix to authenticated;
grant select, insert, update, delete on public.modeles_images_choix to service_role;

create or replace function public.modeles_versions_structure_figee()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  st text;
  prec jsonb;
begin
  if public.ecriture_privilegiee() then
    return new;
  end if;
  select f.statut into st from public.modeles_fiches f where f.id = new.modele;
  if st is null or st not in ('finaliste', 'check-agent', 'avis-humain', 'retouche', 'recheck-agent', 'revalidation', 'pret-validation', 'publie') then
    return new;
  end if;
  select v.composition into prec from public.modeles_versions v where v.modele = new.modele and v.version < new.version order by v.version desc limit 1;
  if prec is null then
    return new;
  end if;
  if ((new.composition - 'photos') #- '{visuels,herosSujet}') is distinct from ((prec - 'photos') #- '{visuels,herosSujet}') then
    raise exception 'Structure figée depuis la sélection des finalistes : seules les images se choisissent ; la structure change par la retouche (tickets).';
  end if;
  return new;
end;
$$;
drop trigger if exists modeles_versions_structure_figee on public.modeles_versions;
create trigger modeles_versions_structure_figee before insert on public.modeles_versions
  for each row execute function public.modeles_versions_structure_figee();

notify pgrst, 'reload schema';
