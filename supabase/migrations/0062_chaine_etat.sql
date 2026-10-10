set lock_timeout = '10s';
-- 0062 : CHAÎNE DES MODÈLES EN UNE REQUÊTE (2026-10-10, perf de /chaine, /chaine/preselection, /chaine/tournoi : 38 à 46 requêtes
-- par page au volume ×10 du banc, npm run perf:admin -- --volume=10 ; les tables de la chaîne lues par paquets de 1 000 depuis le
-- correctif du tournoi, jusqu'à 6 allers-retours successifs pour les grilles).
--
-- 1. Compteurs (apprentissage_sources, 0059) des AUTRES tables de la chaîne : fiches, versions, duels, avis, « J'aime » (grilles et
--    tickets en ont déjà un). Le code garde la chaîne lue sur l'instance tant que ces 7 compteurs n'ont pas bougé (mémoire par
--    signature, lib/chaine-modeles.ts) : un vote, une grille, un passage d'étape, une nouvelle version, faits par n'importe qui
--    (autre instance, CI du testeur), changent la signature → relecture.
-- 2. chaine_etat(profession, versions) : fiches, versions (« utiles » : courante et précédente, résultat du testeur sur la courante ;
--    ou « toutes »), tickets, duels, avis, grilles (répondues, et réservations de moins de 15 min) et « J'aime » comptés, en UN objet
--    JSON (mêmes colonnes et mêmes tris que les lectures table par table du code). security definer + contrôle explicite
--    (select public.est_contributeur()) : exactement ce que les règles de lecture de 0050 / 0052 ouvrent à l'équipe.
-- Rejouable. Le code fonctionne AVANT cette migration (lectures table par table, sans mémoire) ; après, il l'utilise seul.

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Compteurs des tables de la chaîne (fonctions de déclencheur de 0059)
-- ---------------------------------------------------------------------------------------------------------------
do $$
declare
  t text;
begin
  -- 0059 pas exécutée : rien à brancher (le code lit alors la chaîne sans mémoire)
  if to_regclass('public.apprentissage_sources') is null or to_regprocedure('public.apprentissage_source_changee()') is null then
    raise notice '0062 : migration 0059 absente, compteurs de la chaîne non créés';
    return;
  end if;
  foreach t in array array['modeles_fiches', 'modeles_versions', 'modeles_tickets', 'modeles_votes', 'modeles_revues', 'modeles_grilles', 'modeles_jaime'] loop
    if to_regclass('public.' || t) is null then continue; end if;
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
-- 2. État de la chaîne en une requête
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.chaine_etat(p_profession text default null, p_versions text default 'utiles')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_resultat jsonb;
begin
  -- Mêmes droits que les règles de lecture des tables de la chaîne (0050, 0052) : équipe (contributeurs, validateur, admin)
  if not coalesce((select public.est_contributeur()), false) then
    raise exception 'Chaîne des modèles réservée à l''équipe' using errcode = '42501';
  end if;
  if p_versions is null or p_versions not in ('utiles', 'toutes') then
    raise exception 'p_versions : utiles ou toutes' using errcode = '22023';
  end if;

  select coalesce(array_agg(f.id), '{}'::uuid[]) into v_ids
  from public.modeles_fiches f
  where p_profession is null or f.profession = p_profession;

  select jsonb_build_object(
    'fiches', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', f.id, 'nom', f.nom, 'profession', f.profession, 'profil', f.profil, 'statut', f.statut, 'version_courante', f.version_courante,
        'version_publiee', f.version_publiee, 'version_retouche', f.version_retouche, 'justification_test', f.justification_test,
        'justification_version', f.justification_version, 'tags', f.tags, 'tags_valides', f.tags_valides, 'recette', f.recette,
        'origine', f.origine, 'cle', f.cle, 'rang', f.rang, 'scenario', f.scenario, 'created_at', f.created_at
      ) order by f.created_at, f.id), '[]'::jsonb)
      from public.modeles_fiches f where f.id = any (v_ids)
    ),
    'versions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'modele', v.modele, 'version', v.version, 'composition', v.composition, 'cle', v.cle, 'journal', v.journal, 'auteur', v.auteur,
        -- « utiles » : résultat du testeur sur la version courante seulement (comme la vue modeles_versions_utiles de 0059)
        'test', case when p_versions = 'toutes' or v.version = f.version_courante then v.test end, 'created_at', v.created_at
      ) order by v.version, v.modele), '[]'::jsonb)
      from public.modeles_versions v
      join public.modeles_fiches f on f.id = v.modele
      where f.id = any (v_ids)
        and (p_versions = 'toutes' or v.version = f.version_courante or v.version = f.version_courante - 1)
    ),
    'tickets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'numero', t.numero, 'modele', t.modele, 'page', t.page, 'appareil', t.appareil, 'zone', t.zone, 'element', t.element,
        'etiquette', t.etiquette, 'commentaire', t.commentaire, 'origine', t.origine, 'gravite', t.gravite, 'auteur', t.auteur, 'statut', t.statut,
        'version_ouverture', t.version_ouverture, 'version_correction', t.version_correction, 'controle', t.controle, 'created_at', t.created_at
      ) order by t.numero, t.id), '[]'::jsonb)
      from public.modeles_tickets t where t.modele = any (v_ids)
    ),
    'votes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'profil', d.profil, 'a', d.a, 'b', d.b, 'resultat', d.resultat, 'votant', d.votant, 'poids', d.poids, 'created_at', d.created_at
      ) order by d.created_at, d.id), '[]'::jsonb)
      from public.modeles_votes d where d.a = any (v_ids) and d.b = any (v_ids)
    ),
    'revues', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'modele', r.modele, 'version', r.version, 'page', r.page, 'appareil', r.appareil, 'auteur', r.auteur, 'verdict', r.verdict, 'created_at', r.created_at
      ) order by r.created_at, r.id), '[]'::jsonb)
      from public.modeles_revues r where r.modele = any (v_ids)
    ),
    -- Grilles dont toutes les propositions sont des fiches lues : répondues, ou servies il y a moins de 15 min (réservations)
    'grilles', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', g.id, 'profil', g.profil, 'propositions', g.propositions, 'votant', g.votant, 'servie_le', g.servie_le,
        'meilleures', g.meilleures, 'pire', g.pire, 'poids', g.poids, 'repondue_le', g.repondue_le
      ) order by g.servie_le, g.id), '[]'::jsonb)
      from public.modeles_grilles g
      where g.propositions <@ v_ids and (g.repondue_le is not null or g.servie_le >= now() - interval '15 minutes')
    ),
    'jaime', (
      select coalesce(jsonb_agg(jsonb_build_object('modele', j.modele, 'n', j.n) order by j.modele), '[]'::jsonb)
      from (select modele, count(*)::integer as n from public.modeles_jaime where modele = any (v_ids) group by modele) j
    )
  ) into v_resultat;
  return v_resultat;
end;
$$;
revoke all on function public.chaine_etat(text, text) from public, anon;
grant execute on function public.chaine_etat(text, text) to authenticated, service_role;

notify pgrst, 'reload schema';
