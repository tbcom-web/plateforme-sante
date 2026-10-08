-- Éléments TRANCHÉS (règle de Paul du 2026-10-08, packages/core/src/tranches.ts) : un élément ou une combinaison noté 1 ★ n'apparaît
-- plus nulle part, un élément ou une combinaison noté 5 ★ n'est plus proposé à l'évaluation. La page « Éléments tranchés »
-- (/admin/retours/tranches) permet de « Réévaluer » : les notes antérieures à la réévaluation sont alors ignorées par la règle et
-- l'élément revient dans la file jusqu'à sa prochaine note.
-- - elements_reevalues : journal en AJOUT SEUL (clé d'asset, de combinaison `compo:…`, de proposition de l'atelier…), admin seulement ;
-- Rejouable : create … if not exists, drop … if exists. À exécuter après 0040_images_generees.sql.
-- Sans cette migration : la règle s'applique, « Réévaluer » répond « Migration à exécuter ».

create table if not exists public.elements_reevalues (
  id uuid primary key default gen_random_uuid(),
  cle text not null check (char_length(cle) between 3 and 220 and cle !~ '[[:space:]]'),
  auteur uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists elements_reevalues_cle_idx on public.elements_reevalues (cle, created_at desc);

alter table public.elements_reevalues enable row level security;
drop policy if exists "elements reevalues : admin lecture" on public.elements_reevalues;
create policy "elements reevalues : admin lecture" on public.elements_reevalues
  for select to authenticated using (public.is_admin());
drop policy if exists "elements reevalues : admin ajout" on public.elements_reevalues;
create policy "elements reevalues : admin ajout" on public.elements_reevalues
  for insert to authenticated with check (public.is_admin() and auteur is not distinct from auth.uid());

revoke all on public.elements_reevalues from anon, authenticated;
grant select, insert on public.elements_reevalues to authenticated;
grant select, insert, update, delete on public.elements_reevalues to service_role;
