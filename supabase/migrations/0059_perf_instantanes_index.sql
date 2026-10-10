set lock_timeout = '10s';
-- 0059 : PERFORMANCES DE LA BASE (Paul, 2026-10-10 : « il va falloir qu'on optimise les requêtes, la base etc sinon les perfs vont
-- devenir vraiment mauvaises »). Mesuré sur le banc ×10 (npm run perf:admin -- --volume=10, scripts/perf-admin) : l'apprentissage relisait des
-- tables entières à chaque instance froide (/admin : 114 Mo lus), la chaîne lisait toutes les versions avec leur résultat de test.
--
-- 1. apprentissage_sources : un compteur par table source de l'apprentissage, augmenté par un déclencheur PAR INSTRUCTION à chaque
--    ajout, modification ou suppression QUI TOUCHE AU MOINS UNE LIGNE (tables de transition : une mise à jour sans effet, comme
--    celles de l'automate de la chaîne, ne périme rien). Signature lue en UNE petite requête (≈ 20 lignes).
-- 2. apprentissage_instantane : résultat de l'apprentissage calculé une fois (poids appris, résumé de la politique d'évaluation,
--    éléments tranchés), par profession et portée (admin / équipe), avec la signature des sources ; relu tel quel tant que les
--    sources n'ont pas changé (texte JSON exact : même résultat, ordre des clés compris). Lecture et écriture : admin pour la
--    portée « admin », équipe (contributeurs, validateur) pour la portée « equipe ».
-- 3. modeles_versions_utiles : versions courante et précédente de chaque fiche (avec la profession), résultat du testeur sur la
--    version courante seulement ; modeles_jaime_compteurs : « J'aime » par modèle. Vues security_invoker : règles des tables.
-- 4. assets_cles_notees : clés d'assets ayant au moins une note (tableau de bord « Dégustation du jour ») ; degustation_choix_legers :
--    choix de la Dégustation sans les ingrédients des propositions. Vues security_invoker.
-- 5. Index manquants, déduits des filtres et tris réels des pages (voir chaque ligne).
-- Rejouable : if not exists, create or replace, drop … if exists. Le code fonctionne AVANT cette migration (repli : calcul
-- d'avant, lectures d'avant) ; après, il l'utilise seul, sans redéploiement.

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Sources de l'apprentissage
-- ---------------------------------------------------------------------------------------------------------------
create table if not exists public.apprentissage_sources (
  nom text primary key check (nom ~ '^[a-z_]{2,60}$'),
  n bigint not null default 0,
  maj_le timestamptz not null default now()
);
alter table public.apprentissage_sources enable row level security;
drop policy if exists "apprentissage_sources : lecture équipe" on public.apprentissage_sources;
create policy "apprentissage_sources : lecture équipe" on public.apprentissage_sources for select to authenticated using ((select public.est_contributeur()));
revoke all on public.apprentissage_sources from anon, authenticated;
grant select on public.apprentissage_sources to authenticated;
grant select, insert, update, delete on public.apprentissage_sources to service_role;

-- Lignes touchées par l'instruction : table de transition « lignes » (NEW TABLE pour un ajout ou une modification, OLD TABLE pour
-- une suppression) ; aucune ligne → rien n'est compté
create or replace function public.apprentissage_source_changee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from lignes) then
    insert into public.apprentissage_sources as s (nom, n, maj_le) values (tg_table_name, 1, now())
    on conflict (nom) do update set n = s.n + 1, maj_le = now();
  end if;
  return null;
end;
$$;
-- Vidage complet (truncate, sans table de transition)
create or replace function public.apprentissage_source_videe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.apprentissage_sources as s (nom, n, maj_le) values (tg_table_name, 1, now())
  on conflict (nom) do update set n = s.n + 1, maj_le = now();
  return null;
end;
$$;
revoke all on function public.apprentissage_source_changee() from public, anon, authenticated;
revoke all on function public.apprentissage_source_videe() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'atelier_notes', 'assets_notes', 'illustrations_statuts', 'assets_sujets', 'assets_hashtags', 'assets_professions', 'recettes',
    'recettes_notes', 'recettes_notation', 'duels', 'degustation_choix', 'kits_images_notes', 'expositions', 'regles_apprises_reglages',
    'elements_reevalues', 'modeles_grilles', 'modeles_tickets',
    -- Contexte d'images de l'admin (kits, vivier, exclusions) : photos, jeux, revues, catalogue des soins
    'photos_libres', 'jeux_photos', 'illustrations_revues', 'soins_catalogue'
  ] loop
    -- Table absente (migration pas encore exécutée) : ignorée ; rejouer 0059 après coup l'ajoute
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists apprentissage_source on public.%I', t);
    execute format('drop trigger if exists apprentissage_source_ajout on public.%I', t);
    execute format('drop trigger if exists apprentissage_source_maj on public.%I', t);
    execute format('drop trigger if exists apprentissage_source_suppr on public.%I', t);
    execute format('drop trigger if exists apprentissage_source_vidage on public.%I', t);
    execute format('create trigger apprentissage_source_ajout after insert on public.%I referencing new table as lignes for each statement execute function public.apprentissage_source_changee()', t);
    execute format('create trigger apprentissage_source_maj after update on public.%I referencing new table as lignes for each statement execute function public.apprentissage_source_changee()', t);
    execute format('create trigger apprentissage_source_suppr after delete on public.%I referencing old table as lignes for each statement execute function public.apprentissage_source_changee()', t);
    execute format('create trigger apprentissage_source_vidage after truncate on public.%I for each statement execute function public.apprentissage_source_videe()', t);
    insert into public.apprentissage_sources (nom) values (t) on conflict (nom) do nothing;
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Instantanés de l'apprentissage
-- ---------------------------------------------------------------------------------------------------------------
create table if not exists public.apprentissage_instantane (
  cle text primary key check (cle ~ '^[a-z0-9|:._-]{2,120}$'),
  portee text not null check (portee in ('admin', 'equipe')),
  signature text not null check (char_length(signature) <= 4000),
  -- Texte JSON exact (et non jsonb : l'ordre des clés est gardé, le résultat relu est identique au résultat calculé)
  valeur text not null check (char_length(valeur) <= 20000000),
  octets integer not null default 0,
  calcule_le timestamptz not null default now()
);
alter table public.apprentissage_instantane enable row level security;
drop policy if exists "apprentissage_instantane : lecture" on public.apprentissage_instantane;
drop policy if exists "apprentissage_instantane : ajout" on public.apprentissage_instantane;
drop policy if exists "apprentissage_instantane : mise à jour" on public.apprentissage_instantane;
create policy "apprentissage_instantane : lecture" on public.apprentissage_instantane for select to authenticated
  using ((portee = 'admin' and (select public.is_admin())) or (portee = 'equipe' and (select public.est_contributeur())));
create policy "apprentissage_instantane : ajout" on public.apprentissage_instantane for insert to authenticated
  with check ((portee = 'admin' and (select public.is_admin())) or (portee = 'equipe' and (select public.est_contributeur())));
create policy "apprentissage_instantane : mise à jour" on public.apprentissage_instantane for update to authenticated
  using ((portee = 'admin' and (select public.is_admin())) or (portee = 'equipe' and (select public.est_contributeur())))
  with check ((portee = 'admin' and (select public.is_admin())) or (portee = 'equipe' and (select public.est_contributeur())));
revoke all on public.apprentissage_instantane from anon, authenticated;
grant select, insert, update on public.apprentissage_instantane to authenticated;
grant select, insert, update, delete on public.apprentissage_instantane to service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 3. Chaîne des modèles : versions utiles et « J'aime » comptés par la base
-- ---------------------------------------------------------------------------------------------------------------
create or replace view public.modeles_versions_utiles with (security_invoker = true) as
  select v.modele, v.version, v.composition, v.cle, v.journal, v.auteur, v.created_at, f.profession,
    case when v.version = f.version_courante then v.test end as test
  from public.modeles_versions v
  join public.modeles_fiches f on f.id = v.modele
  where v.version = f.version_courante or v.version = f.version_courante - 1;
revoke all on public.modeles_versions_utiles from anon, authenticated;
grant select on public.modeles_versions_utiles to authenticated, service_role;

create or replace view public.modeles_jaime_compteurs with (security_invoker = true) as
  select j.modele, count(*)::integer as n from public.modeles_jaime j group by j.modele;
revoke all on public.modeles_jaime_compteurs from anon, authenticated;
grant select on public.modeles_jaime_compteurs to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 4. Clés d'assets notées (tableau de bord)
-- ---------------------------------------------------------------------------------------------------------------
create or replace view public.assets_cles_notees with (security_invoker = true) as
  select distinct n.cle_asset from public.assets_notes n where n.note is not null;
revoke all on public.assets_cles_notees from anon, authenticated;
grant select on public.assets_cles_notees to authenticated, service_role;

-- Dégustation : choix SANS les ingrédients des propositions (clé et élément classé seulement, dans l'ordre) : tout ce que lit la page
-- (compteurs, missions, « Bats Claude », familles préférées des grilles « directions », qui ne lisent que l'élément `famille:…`)
do $$
begin
  if to_regclass('public.degustation_choix') is not null then
    execute $v$
      create or replace view public.degustation_choix_legers with (security_invoker = true) as
        select c.format, c.type, c.dimension, c.scenario,
          (select coalesce(jsonb_agg(jsonb_build_object('cle', p.e -> 'cle', 'ingredients', jsonb_build_object('element', p.e -> 'ingredients' -> 'element')) order by p.i), '[]'::jsonb)
             from jsonb_array_elements(c.propositions) with ordinality as p(e, i)) as propositions,
          c.meilleures, c.pire, c.pari, c.appareil, c.session, c.duree_ms, c.profession, c.profil, c.created_at
        from public.degustation_choix c
    $v$;
    revoke all on public.degustation_choix_legers from anon, authenticated;
    grant select on public.degustation_choix_legers to authenticated, service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- 5. Index (filtres et tris réels ; chacun ignoré si sa table manque)
-- ---------------------------------------------------------------------------------------------------------------
do $$
declare
  i text[];
begin
  foreach i slice 1 in array array[
    -- duels_apprentissage() et le journal des duels : order by created_at desc limit 20000 (sans filtre de profession)
    array['duels', 'create index if not exists duels_date_idx on public.duels (created_at desc)'],
    -- Journal allégé : duels de combinaisons d'éléments (dimension_differente like 'paire:%'), les plus récents d'abord
    array['duels', 'create index if not exists duels_paires_idx on public.duels (created_at desc) where dimension_differente like ''paire:%'''],
    -- lireChaine : fiches d'une profession par date de création
    array['modeles_fiches', 'create index if not exists modeles_fiches_profession_idx on public.modeles_fiches (profession, created_at)'],
    -- lireChaine : grilles et votes d'une profession (tous profils) par date
    array['modeles_grilles', 'create index if not exists modeles_grilles_profession_idx on public.modeles_grilles (profession, servie_le)'],
    -- Politique d'évaluation : grilles répondues, les plus récentes d'abord
    array['modeles_grilles', 'create index if not exists modeles_grilles_repondues_idx on public.modeles_grilles (repondue_le desc) where repondue_le is not null'],
    array['modeles_votes', 'create index if not exists modeles_votes_profession_idx on public.modeles_votes (profession, created_at)'],
    -- Politique d'évaluation : tickets humains les plus récents
    array['modeles_tickets', 'create index if not exists modeles_tickets_humains_idx on public.modeles_tickets (created_at desc) where origine = ''humain'''],
    -- Photos libres (Frigo, banque de photos) : order by created_at desc limit 2000
    array['photos_libres', 'create index if not exists photos_libres_date_idx on public.photos_libres (created_at desc)'],
    -- Kits notés, recettes notées par page, réévaluations, réglages des règles : les plus récents d'abord
    array['kits_images_notes', 'create index if not exists kits_images_notes_date_idx on public.kits_images_notes (created_at desc)'],
    array['elements_reevalues', 'create index if not exists elements_reevalues_date_idx on public.elements_reevalues (created_at desc)'],
    array['regles_apprises_reglages', 'create index if not exists regles_apprises_reglages_date_idx on public.regles_apprises_reglages (created_at desc)'],
    array['recettes_notes', 'create index if not exists recettes_notes_date_idx on public.recettes_notes (created_at desc)'],
    -- Tableau de bord : clés notées (assets_cles_notees)
    array['assets_notes', 'create index if not exists assets_notes_notees_idx on public.assets_notes (cle_asset) where note is not null'],
    -- Sites à publier (compteurs du tableau de bord)
    array['sites', 'create index if not exists sites_a_publier_idx on public.sites (statut, test, modifs_non_publiees)']
  ] loop
    if to_regclass('public.' || i[1]) is not null then execute i[2]; end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
