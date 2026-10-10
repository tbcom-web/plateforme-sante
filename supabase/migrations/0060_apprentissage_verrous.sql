set lock_timeout = '10s';
-- 0060 : UN SEUL RECALCUL D'APPRENTISSAGE À LA FOIS (perf vague 2, 2026-10-10). Quand un vote ou une note périme un instantané
-- d'apprentissage (0059), la page sert l'instantané précédent et demande le recalcul à une route dédiée (api/apprentissage/recalcul,
-- fonction Vercel à part). Ce verrou garantit qu'un seul recalcul tourne à la fois par instantané (clé et portée), quelle que soit
-- l'instance qui le demande ; il expire tout seul (150 s demandées, 15 min au plus) si la fonction s'arrête avant de le rendre.
-- Lecture et écriture uniquement par les deux fonctions ci-dessous (security definer), pour l'admin (portée « admin ») ou l'équipe
-- de la chaîne (portée « equipe »), comme apprentissage_instantane.
-- Rejouable (if not exists, create or replace). Le code fonctionne AVANT cette migration : la route calcule alors sans verrou partagé
-- (un calcul à la fois par instance, comme avant).

create table if not exists public.apprentissage_verrous (
  cle text primary key check (cle ~ '^[a-z0-9|:._-]{2,120}$'),
  portee text not null check (portee in ('admin', 'equipe')),
  jusqua timestamptz not null,
  pris_le timestamptz not null default now()
);
alter table public.apprentissage_verrous enable row level security;
-- Aucune politique : ni lecture ni écriture directe pour les comptes connectés (fonctions seulement)
revoke all on public.apprentissage_verrous from anon, authenticated;
grant select, insert, update, delete on public.apprentissage_verrous to service_role;

-- Prend le verrou s'il est libre ou expiré : true si pris, false s'il est tenu par un autre recalcul
create or replace function public.prendre_verrou_apprentissage(p_cle text, p_portee text, p_secondes integer default 150)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  pris boolean;
begin
  if not ((p_portee = 'admin' and (select public.is_admin())) or (p_portee = 'equipe' and (select public.est_contributeur()))) then
    return false;
  end if;
  insert into public.apprentissage_verrous as v (cle, portee, jusqua, pris_le)
  values (p_cle, p_portee, now() + make_interval(secs => least(greatest(coalesce(p_secondes, 150), 10), 900)), now())
  on conflict (cle) do update set portee = excluded.portee, jusqua = excluded.jusqua, pris_le = now()
    where v.jusqua < now()
  returning true into pris;
  return coalesce(pris, false);
end;
$$;

-- Rend le verrou (fin du recalcul)
create or replace function public.rendre_verrou_apprentissage(p_cle text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.apprentissage_verrous v
  where v.cle = p_cle
    and ((v.portee = 'admin' and (select public.is_admin())) or (v.portee = 'equipe' and (select public.est_contributeur())));
end;
$$;

revoke all on function public.prendre_verrou_apprentissage(text, text, integer) from public, anon;
revoke all on function public.rendre_verrou_apprentissage(text) from public, anon;
grant execute on function public.prendre_verrou_apprentissage(text, text, integer) to authenticated, service_role;
grant execute on function public.rendre_verrou_apprentissage(text) to authenticated, service_role;

notify pgrst, 'reload schema';
