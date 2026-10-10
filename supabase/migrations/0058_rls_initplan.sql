set lock_timeout = '10s';
-- 0058 : RÈGLES D'ACCÈS ÉVALUÉES UNE FOIS PAR REQUÊTE (et non une fois par ligne) — « la page de chaîne met beaucoup de temps à
-- charger » (Paul, 2026-10-10). is_admin(), est_contributeur(), est_validateur() (security definer : une sous-requête sur profiles)
-- et auth.uid() étaient appelées pour CHAQUE ligne lue : des dizaines de milliers d'appels sur modeles_versions, modeles_grilles,
-- duels… Enveloppées dans (select …), Postgres les calcule une seule fois (recommandation Supabase « auth_rls_initplan »).
-- Même sens, mêmes droits : seule l'expression est réécrite. Rejouable (une expression déjà enveloppée n'est pas retouchée).
do $$
declare
  p record;
  q text;
  c text;
  n integer := 0;
  motif constant text := '(?<!SELECT )(public\.)?(is_admin|est_contributeur|est_validateur)\(\)';
  motif_uid constant text := '(?<!SELECT )auth\.uid\(\)';
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    q := p.qual; c := p.with_check;
    if q is not null then
      q := regexp_replace(q, motif, '(select public.\2())', 'g');
      q := regexp_replace(q, motif_uid, '(select auth.uid())', 'g');
    end if;
    if c is not null then
      c := regexp_replace(c, motif, '(select public.\2())', 'g');
      c := regexp_replace(c, motif_uid, '(select auth.uid())', 'g');
    end if;
    if q is distinct from p.qual or c is distinct from p.with_check then
      execute format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename)
        || case when q is distinct from p.qual then format(' using (%s)', q) else '' end
        || case when c is distinct from p.with_check then format(' with check (%s)', c) else '' end;
      n := n + 1;
    end if;
  end loop;
  raise notice 'Règles réécrites : %', n;
end $$;

notify pgrst, 'reload schema';
