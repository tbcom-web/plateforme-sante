-- Rattrapage des articles pour un site nouveau (rejouable sans risque).
-- Jusqu'ici, un article n'était proposé qu'aux sites existant au moment de sa diffusion (/admin/flux) : un site créé
-- ensuite n'avait aucun article et la rubrique « Actualités » n'apparaissait jamais.
-- rattraper_articles(site) ajoute les derniers articles diffusés de sa profession et de ses thèmes qu'il n'a pas encore :
-- publiés d'office si le site est en mode « auto », proposés (à valider) en mode « manuel ».
-- Appelée par l'admin juste avant chaque publication ; ne touche jamais une décision déjà prise (publié / ignoré).

create or replace function public.rattraper_articles(p_site uuid, p_max int default 6)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_profession text;
  v_config jsonb;
  v_auto boolean;
  v_themes text[];
  v_nb int;
begin
  select owner, profession_slug, config into v_owner, v_profession, v_config
    from public.sites where id = p_site;
  if not found or (v_owner is distinct from auth.uid() and not public.is_admin()) then
    raise exception 'Site introuvable.' using errcode = '42501';
  end if;
  v_auto := coalesce(v_config #>> '{flux,mode}', 'manuel') = 'auto';
  v_themes := coalesce(array(select jsonb_array_elements_text(v_config #> '{flux,themes}')), '{}');

  insert into public.site_articles (site_id, article_id, statut, decide_le)
  select p_site, a.id, case when v_auto then 'publie' else 'propose' end, case when v_auto then now() end
  from public.articles_flux a
  where a.statut = 'diffuse'
    and a.profession_slug = v_profession
    and a.date_publication <= current_date
    and (cardinality(v_themes) = 0 or a.theme = any (v_themes))
    and not exists (select 1 from public.site_articles sa where sa.site_id = p_site and sa.article_id = a.id)
  order by a.date_publication desc
  limit greatest(0, least(p_max, 20))
  on conflict (site_id, article_id) do nothing;

  get diagnostics v_nb = row_count;
  return v_nb;
end;
$$;

revoke all on function public.rattraper_articles(uuid, int) from public, anon;
grant execute on function public.rattraper_articles(uuid, int) to authenticated;
