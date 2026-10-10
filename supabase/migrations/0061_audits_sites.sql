set lock_timeout = '10s';

-- AUDITS DE SITES DE PROSPECTS (demande de Paul du 2026-10-10 : « outil d'audit de site de praticien facile à générer pour
-- ma commerciale […] en contre-proposition on envoie un site hyper clean avec les notes associées »).
-- La commerciale saisit un domaine dans /admin/audits : le back-office prépare un site non publié (univers déduit des
-- mots-clés du site existant), puis le workflow auditer-site déploie son aperçu, audite les deux sites et dépose le rapport
-- (web + PDF) dans le stockage « audits », sous un jeton aléatoire : <jeton>/rapport.html, <jeton>/rapport.pdf.
-- Le lien remis au praticien est admin.webpodologue.fr/audit/<jeton> (lien à capacité, comme les liens de rattachement).

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  jeton text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  domaine text not null,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'en_cours', 'pret', 'echec')),
  site_id uuid references public.sites (id) on delete set null,
  univers text,
  -- ce que le back-office a reconnu sur le site du prospect (nom, ville, RPPS, sujets) : affiché pour contrôle
  identite jsonb not null default '{}'::jsonb,
  commercial_nom text,
  commercial_tel text,
  note_actuelle smallint,
  note_proposee smallint,
  marquants jsonb,
  run_url text,
  erreur text,
  demande_par uuid default auth.uid(),
  cree_le timestamptz not null default now(),
  fini_le timestamptz
);

create index if not exists audits_cree_le on public.audits (cree_le desc);

alter table public.audits enable row level security;

-- Droits explicites (le projet n'accorde rien par défaut aux nouvelles tables) : admins via la RLS, workflow via la clé secrète
grant select, insert, update, delete on public.audits to authenticated;
grant select, insert, update, delete on public.audits to service_role;

drop policy if exists "audits : admin" on public.audits;
create policy "audits : admin" on public.audits
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Rapports : lecture publique par adresse exacte (dossier = jeton de 64 caractères hexadécimaux, introuvable sans le lien ;
-- un stockage public ne permet pas de lister les fichiers). Écriture : le workflow, avec la clé secrète.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audits', 'audits', true, 15728640, array['text/html', 'application/pdf', 'application/json'])
on conflict (id) do update set public = true, file_size_limit = 15728640, allowed_mime_types = array['text/html', 'application/pdf', 'application/json'];
