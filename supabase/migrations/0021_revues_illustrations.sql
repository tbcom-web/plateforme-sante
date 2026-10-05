-- Revue des illustrations par le super admin (/admin/illustrations).
-- Les illustrations vivent dans le code (packages/core/src/illustrations.ts, inventaireIllustrations) ; la base ne garde que
-- les retours, sous une clé stable (`dessin:orthonyxie:releve`, `picto:orthonyxie`, `biblio:POD-AT-0001`…) :
-- - illustrations_revues : journal en ajout seul (statut au moment du retour, commentaire, auteur, empreinte du rendu revu) ;
--   jamais modifié ni supprimé par l'application ;
-- - illustrations_statuts : statut courant par clé, tenu à jour par un déclencheur à chaque ajout au journal.
-- Rejouable : if not exists, drop … if exists.

create table if not exists public.illustrations_revues (
  id uuid primary key default gen_random_uuid(),
  cle text not null check (cle ~ '^[a-z]+:[^[:space:]]{1,200}$'),
  statut text not null check (statut in ('a_revoir', 'valide', 'a_retravailler', 'retire')),
  commentaire text check (commentaire is null or char_length(commentaire) <= 4000),
  -- Empreinte du SVG revu (8 caractères hexadécimaux) : l'admin signale une illustration modifiée depuis sa revue
  empreinte text check (empreinte is null or empreinte ~ '^[0-9a-f]{8}$'),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists illustrations_revues_cle_idx on public.illustrations_revues (cle, created_at desc);

create table if not exists public.illustrations_statuts (
  cle text primary key,
  statut text not null check (statut in ('a_revoir', 'valide', 'a_retravailler', 'retire')),
  empreinte text,
  maj_le timestamptz not null default now(),
  maj_par uuid references public.profiles (id) on delete set null
);

-- Statut courant : recopié du dernier retour (déclencheur en security definer : aucune écriture directe n'est ouverte)
create or replace function public.illustrations_maj_statut()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.illustrations_statuts (cle, statut, empreinte, maj_le, maj_par)
  values (new.cle, new.statut, new.empreinte, new.created_at, new.auteur)
  on conflict (cle) do update set
    statut = excluded.statut,
    empreinte = coalesce(excluded.empreinte, public.illustrations_statuts.empreinte),
    maj_le = excluded.maj_le,
    maj_par = excluded.maj_par;
  return new;
end;
$$;

drop trigger if exists illustrations_revues_statut on public.illustrations_revues;
create trigger illustrations_revues_statut
  after insert on public.illustrations_revues
  for each row execute function public.illustrations_maj_statut();

alter table public.illustrations_revues enable row level security;
alter table public.illustrations_statuts enable row level security;

drop policy if exists "revues illustrations : lecture admin" on public.illustrations_revues;
drop policy if exists "revues illustrations : ajout admin" on public.illustrations_revues;
drop policy if exists "statuts illustrations : lecture admin" on public.illustrations_statuts;

create policy "revues illustrations : lecture admin" on public.illustrations_revues
  for select to authenticated using (public.is_admin());
-- Ajout seul, au nom de l'admin connecté ; aucune politique update / delete : le journal ne se réécrit pas
create policy "revues illustrations : ajout admin" on public.illustrations_revues
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());
create policy "statuts illustrations : lecture admin" on public.illustrations_statuts
  for select to authenticated using (public.is_admin());

-- Droits : les privilèges par défaut du schéma public sont retirés, puis seuls ceux utiles sont rendus
revoke all on public.illustrations_revues from anon, authenticated;
revoke all on public.illustrations_statuts from anon, authenticated;
grant select, insert on public.illustrations_revues to authenticated;
grant select on public.illustrations_statuts to authenticated;
grant select, insert, update, delete on public.illustrations_revues to service_role;
grant select, insert, update, delete on public.illustrations_statuts to service_role;
revoke all on function public.illustrations_maj_statut() from public, anon, authenticated;
