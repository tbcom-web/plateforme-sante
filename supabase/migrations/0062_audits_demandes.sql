set lock_timeout = '10s';

-- DEMANDES D'AUDIT GRATUIT (page publique /audit-gratuit, demande de Paul du 2026-10-11). Le visiteur teste son site
-- (score « lisible par ChatGPT », sans rien enregistrer), puis laisse ses coordonnées pour recevoir l'audit complet et son
-- site préparé : la demande arrive dans /admin/audits (statut « demande »), la commerciale lance la préparation et l'audit.
-- Écriture par la fonction demander_audit_gratuit (clé publique, rôle anon) : jamais d'accès direct à la table.

alter table public.audits add column if not exists origine text not null default 'admin' check (origine in ('admin', 'page'));
alter table public.audits add column if not exists contact jsonb;
alter table public.audits add column if not exists express jsonb;
alter table public.audits add column if not exists ip_hash text;
alter table public.audits add column if not exists recontact_accepte_le timestamptz;

alter table public.audits drop constraint if exists audits_statut_check;
alter table public.audits add constraint audits_statut_check check (statut in ('demande', 'en_attente', 'en_cours', 'pret', 'echec'));

create index if not exists audits_page_recentes on public.audits (cree_le desc) where origine = 'page';

/**
 * Enregistre une demande d'audit gratuit. Limites : 3 demandes par visiteur (IP hachée) et 3 par e-mail sur 24 h,
 * 60 demandes par heure en tout (errcode 54000) ; accord de recontact obligatoire (errcode 22023).
 */
create or replace function public.demander_audit_gratuit(
  p_domaine text, p_prenom text, p_nom text, p_email text, p_telephone text, p_recontact boolean, p_ip_hash text, p_express jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_domaine text := lower(trim(coalesce(p_domaine, '')));
begin
  if not coalesce(p_recontact, false) then
    raise exception 'Accord de recontact requis.' using errcode = '22023';
  end if;
  if v_domaine !~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$' or length(v_domaine) > 120 then
    raise exception 'Adresse de site invalide.' using errcode = '22023';
  end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(v_email) > 200 then
    raise exception 'Adresse e-mail invalide.' using errcode = '22023';
  end if;
  if (select count(*) from public.audits where origine = 'page' and cree_le > now() - interval '1 hour') >= 60
    or (coalesce(p_ip_hash, '') <> '' and (select count(*) from public.audits where origine = 'page' and ip_hash = p_ip_hash and cree_le > now() - interval '1 day') >= 3)
    or (select count(*) from public.audits where origine = 'page' and contact->>'email' = v_email and cree_le > now() - interval '1 day') >= 3 then
    raise exception 'Trop de demandes.' using errcode = '54000';
  end if;

  insert into public.audits (domaine, statut, origine, contact, express, ip_hash, recontact_accepte_le, demande_par)
  values (
    v_domaine, 'demande', 'page',
    jsonb_build_object(
      'prenom', left(trim(coalesce(p_prenom, '')), 80), 'nom', left(trim(coalesce(p_nom, '')), 80),
      'email', v_email, 'telephone', left(trim(coalesce(p_telephone, '')), 30)
    ),
    case when jsonb_typeof(p_express) = 'object' and length(p_express::text) < 8000 then p_express else null end,
    nullif(left(coalesce(p_ip_hash, ''), 64), ''), now(), null
  );
end;
$$;

revoke all on function public.demander_audit_gratuit(text, text, text, text, text, boolean, text, jsonb) from public;
grant execute on function public.demander_audit_gratuit(text, text, text, text, text, boolean, text, jsonb) to anon, authenticated;
