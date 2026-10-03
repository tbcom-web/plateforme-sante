-- Fichier unique à exécuter dans Supabase > SQL Editor (généré à partir de migrations/).

-- Schéma initial de la plateforme : profils, base métier, sites.
-- Aucune donnée de patient n'est stockée ici.

-- ---------------------------------------------------------------------------
-- Profils (1 par compte Supabase Auth)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'praticien' check (role in ('praticien', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Vrai si l'utilisateur connecté est super admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profil : lecture de son profil" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

-- Le rôle ne se modifie que par un admin.
create policy "profil : modification par un admin" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Création automatique du profil à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Base métier (écrite par TBCOM, lue par les praticiens)
-- ---------------------------------------------------------------------------
create table public.professions (
  slug text primary key,
  libelle text not null,
  specialite_schema text not null,
  ordre text not null
);

create table public.soins_catalogue (
  id uuid primary key default gen_random_uuid(),
  profession_slug text not null references public.professions (slug) on delete cascade,
  slug text not null,
  titre_court text not null,
  titre text not null,
  resume text not null,
  corps text not null,
  faq jsonb not null default '[]'::jsonb,
  position int not null default 0,
  unique (profession_slug, slug)
);

alter table public.professions enable row level security;
alter table public.soins_catalogue enable row level security;

create policy "professions : lecture" on public.professions
  for select to authenticated using (true);
create policy "professions : écriture admin" on public.professions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "catalogue : lecture" on public.soins_catalogue
  for select to authenticated using (true);
create policy "catalogue : écriture admin" on public.soins_catalogue
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Sites des praticiens
-- ---------------------------------------------------------------------------
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  slug text unique,
  profession_slug text not null references public.professions (slug),
  statut text not null default 'brouillon' check (statut in ('brouillon', 'en_ligne', 'suspendu')),
  domaine text,
  niveau_conformite text not null default 'standard' check (niveau_conformite in ('strict', 'standard', 'libre')),
  -- Brouillon édité dans le back-office (voir SiteDraft dans packages/core).
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index sites_owner_idx on public.sites (owner);

alter table public.sites enable row level security;

create policy "sites : lecture de ses sites" on public.sites
  for select to authenticated using (owner = auth.uid() or public.is_admin());
create policy "sites : création pour soi" on public.sites
  for insert to authenticated with check (owner = auth.uid() or public.is_admin());
create policy "sites : modification de ses sites" on public.sites
  for update to authenticated using (owner = auth.uid() or public.is_admin())
  with check (owner = auth.uid() or public.is_admin());
create policy "sites : suppression admin" on public.sites
  for delete to authenticated using (public.is_admin());

-- Un praticien ne peut pas changer lui-même le statut, le domaine ou le propriétaire.
create or replace function public.protect_site_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() then
    new.owner := old.owner;
    new.statut := old.statut;
    new.domaine := old.domaine;
    new.published_at := old.published_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger sites_protect_columns
  before update on public.sites
  for each row execute function public.protect_site_columns();

-- ---------------------------------------------------------------------------
-- Droits d'accès explicites à l'API (les tables ne sont pas exposées par défaut).
-- Les visiteurs non connectés (anon) n'ont accès à rien ; RLS filtre ensuite ligne par ligne.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (role) on public.profiles to authenticated;
grant select on public.professions, public.soins_catalogue to authenticated;
grant insert, update, delete on public.professions, public.soins_catalogue to authenticated;
grant select, insert, update, delete on public.sites to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Base métier podologue (générée depuis le site de démo).

insert into public.professions (slug, libelle, specialite_schema, ordre) values
  ('podologue', 'Pédicure-podologue', 'Podiatric', 'Ordre des pédicures-podologues')
on conflict (slug) do nothing;

insert into public.soins_catalogue (profession_slug, slug, titre_court, titre, resume, corps, faq, position) values
  ('podologue', $q$bilan-podologique$q$, $q$Bilan podologique$q$, $q$Bilan podologique à {ville}$q$, $q$Un examen complet de vos pieds, de votre posture et de votre marche pour comprendre l’origine d’une douleur ou d’une gêne.$q$, $q$## À quoi sert un bilan podologique ?

Le bilan podologique permet d’analyser la forme de vos pieds, leurs appuis et la façon dont vous marchez. Il aide à comprendre l’origine de douleurs aux pieds, mais aussi parfois aux genoux, aux hanches ou au dos.

## Comment se déroule la séance ?

1. **Échange** sur vos douleurs, vos activités et vos antécédents.
2. **Examen clinique** des pieds, debout et allongé.
3. **Analyse des appuis** sur podoscope et observation de la marche.
4. **Explications et conseils**. Si besoin, je vous propose des semelles orthopédiques.

Prévoyez environ 45 minutes. Pensez à apporter vos chaussures habituelles et, si vous en avez, vos anciennes semelles et vos examens récents.

## Pour qui ?

Le bilan s’adresse à toute personne qui ressent une gêne en marchant ou en courant, aux enfants dont la marche interroge les parents, et aux sportifs qui reprennent une activité.$q$, $q$[{"q":"Faut-il une ordonnance pour un bilan podologique ?","r":"Non, vous pouvez prendre rendez-vous directement. Une ordonnance de votre médecin peut toutefois être utile pour le remboursement éventuel de semelles orthopédiques."},{"q":"Combien de temps dure un bilan podologique ?","r":"Comptez environ 45 minutes, échange, examen et conseils compris."},{"q":"Que faut-il apporter ?","r":"Vos chaussures portées au quotidien, vos anciennes semelles si vous en avez, et vos examens récents (radiographies, comptes rendus)."}]$q$::jsonb, 0),
  ('podologue', $q$semelles-orthopediques$q$, $q$Semelles orthopédiques$q$, $q$Semelles orthopédiques sur mesure à {ville}$q$, $q$Des orthèses plantaires conçues pour vos pieds et vos chaussures, après un bilan complet.$q$, $q$## Des semelles faites pour vous

Les semelles orthopédiques, ou orthèses plantaires, sont fabriquées sur mesure après un bilan podologique. Elles visent à mieux répartir les appuis et à limiter certaines contraintes lors de la marche ou du sport.

## Les étapes

1. **Bilan podologique** pour comprendre vos appuis.
2. **Prise d’empreinte** de vos pieds.
3. **Fabrication** des semelles, adaptées à vos chaussures (ville, travail, sport).
4. **Essayage et contrôle** quelques semaines après, pour ajuster si nécessaire.

## Remboursement

Sur prescription médicale, les semelles orthopédiques sont prises en charge en partie par l’Assurance Maladie, sur la base de son tarif de remboursement. Votre complémentaire santé peut compléter selon votre contrat. Un devis vous est remis avant fabrication.$q$, $q$[{"q":"Combien de temps faut-il pour s’habituer à des semelles ?","r":"En général quelques jours à deux semaines. Je vous conseille de les porter progressivement, et je vous revois pour un contrôle."},{"q":"Les semelles vont-elles dans toutes mes chaussures ?","r":"Elles sont conçues pour un type de chaussure précis. Nous en parlons lors du bilan pour choisir le modèle le plus adapté à votre quotidien."},{"q":"Tous les combien faut-il les renouveler ?","r":"Cela dépend de l’usure et de l’évolution de vos pieds. Chez l’adulte, un contrôle annuel est recommandé ; chez l’enfant, plus souvent en raison de la croissance."}]$q$::jsonb, 1),
  ('podologue', $q$soins-de-pedicurie$q$, $q$Soins de pédicurie$q$, $q$Soins de pédicurie à {ville}$q$, $q$Cors, durillons, ongles épais ou incarnés : des soins réalisés avec du matériel stérilisé, dans le respect de votre confort.$q$, $q$## Les soins proposés

- Coupe et soin des ongles, y compris épais ou difficiles à couper
- Ongles incarnés
- Cors, durillons et callosités
- Crevasses et peau sèche du talon
- Conseils d’hygiène et de chaussage

## Hygiène et sécurité

Les instruments sont stérilisés après chaque patient, selon les recommandations d’hygiène en vigueur. Le matériel à usage unique est utilisé dès que possible.

## Quand consulter ?

Dès qu’une douleur, une rougeur ou une gêne apparaît, sans attendre qu’elle s’aggrave. Les personnes âgées, diabétiques ou sous traitement anticoagulant ont intérêt à confier leurs soins de pieds à un professionnel.$q$, $q$[{"q":"Un soin de pédicurie est-il douloureux ?","r":"Le soin est réalisé avec précaution et adapté à votre sensibilité. N’hésitez pas à signaler toute gêne pendant la séance."},{"q":"Le soin de pédicurie est-il remboursé ?","r":"Le soin de pédicurie courant n’est pas remboursé par l’Assurance Maladie, sauf pour les patients diabétiques dans le cadre du forfait de prévention. Certaines complémentaires santé le prennent en charge."},{"q":"À quelle fréquence venir ?","r":"Selon vos besoins, en général toutes les 6 à 8 semaines. Nous ajustons ensemble le rythme lors de la première séance."}]$q$::jsonb, 2),
  ('podologue', $q$pied-diabetique$q$, $q$Pied diabétique$q$, $q$Suivi du pied diabétique à {ville}$q$, $q$Prévention et soins adaptés aux personnes diabétiques, en lien avec votre médecin traitant.$q$, $q$## Pourquoi un suivi spécifique ?

Le diabète peut diminuer la sensibilité des pieds et ralentir la cicatrisation. Une petite blessure peut alors passer inaperçue. Le podologue participe au dépistage et à la prévention, en lien avec votre médecin.

## Ce que comprend le suivi

- Examen de la sensibilité et de l’état de la peau et des ongles
- Soins de pédicurie adaptés
- Conseils de chaussage et d’hygiène au quotidien
- Si besoin, semelles ou orthèses de protection

## Prise en charge

Selon votre grade de risque, déterminé par votre médecin, l’Assurance Maladie prend en charge un bilan et un nombre défini de séances de prévention par an, sur prescription médicale.$q$, $q$[{"q":"Comment connaître mon grade de risque ?","r":"Il est déterminé par votre médecin, souvent après un examen de la sensibilité de vos pieds. Il figure sur la prescription de soins podologiques."},{"q":"Quels gestes adopter à la maison ?","r":"Regarder vos pieds chaque jour, les laver et bien les sécher entre les orteils, hydrater la peau sans en mettre entre les orteils, et ne jamais marcher pieds nus."},{"q":"Que faire en cas de plaie ?","r":"Ne la négligez pas : contactez rapidement votre médecin ou votre podologue, même si elle n’est pas douloureuse."}]$q$::jsonb, 3),
  ('podologue', $q$podologie-du-sport$q$, $q$Podologie du sport$q$, $q$Podologie du sport à {ville}$q$, $q$Analyse de la foulée et conseils pour pratiquer votre sport dans de bonnes conditions, du loisir à la compétition.$q$, $q$## Pour les sportifs de tous niveaux

Course à pied, trail, football, tennis, danse : chaque sport sollicite les pieds différemment. Le bilan du sportif s’intéresse à votre pratique, à vos chaussures et à votre foulée.

## Le bilan du sportif

1. **Échange** sur votre pratique, vos objectifs et vos éventuelles douleurs.
2. **Examen** des pieds et de la posture.
3. **Analyse de la course** ou du geste sportif.
4. **Conseils** de chaussage, de reprise progressive et, si besoin, semelles adaptées à votre sport.

## Prévenir plutôt que guérir

Un bilan avant une reprise ou une préparation de course permet d’anticiper. Pensez à venir avec vos chaussures de sport et une tenue adaptée.$q$, $q$[{"q":"Faut-il des semelles spécifiques pour courir ?","r":"Pas systématiquement. Le bilan permet de déterminer si des semelles sont utiles pour votre pratique ou si des conseils de chaussage suffisent."},{"q":"Quand faire un bilan avant un marathon ?","r":"Idéalement 2 à 3 mois avant la course, pour laisser le temps de s’adapter à d’éventuelles semelles ou à de nouvelles chaussures."},{"q":"Que faut-il apporter ?","r":"Vos chaussures de sport habituelles, une tenue permettant de courir et, si vous en avez, vos anciennes semelles."}]$q$::jsonb, 4),
  ('podologue', $q$podologie-enfant$q$, $q$Podologie de l’enfant$q$, $q$Podologie de l’enfant à {ville}$q$, $q$Un examen adapté aux enfants et aux adolescents pour accompagner la croissance et rassurer les parents.$q$, $q$## Quand consulter pour son enfant ?

- Il marche sur la pointe des pieds ou les pieds tournés vers l’intérieur
- Ses chaussures s’usent de façon inhabituelle
- Il se plaint de douleurs aux pieds, aux genoux ou après le sport
- Il tombe souvent ou se fatigue vite à la marche

## Une séance adaptée

L’examen se fait dans le jeu et la bonne humeur, en présence d’un parent. J’observe la marche, les appuis et la posture, puis je vous explique ce que j’ai observé et ce qui est normal pour son âge.

## Et ensuite ?

Bien souvent, des conseils de chaussage et un suivi suffisent. Si des semelles sont utiles, elles sont adaptées et contrôlées régulièrement pendant la croissance.$q$, $q$[{"q":"À partir de quel âge peut-on consulter ?","r":"Dès que l’enfant marche, si quelque chose vous interroge. Un premier bilan vers 3 à 4 ans permet aussi de faire le point."},{"q":"Les pieds plats de l’enfant sont-ils inquiétants ?","r":"Chez le jeune enfant, un pied qui paraît plat est souvent normal et évolue avec la croissance. Le bilan permet de faire la différence."},{"q":"Comment choisir les chaussures de mon enfant ?","r":"À la bonne taille, avec un contrefort qui maintient le talon et une semelle souple à l’avant. Je vous donne des repères précis lors de la séance."}]$q$::jsonb, 5)
on conflict (profession_slug, slug) do update set titre_court = excluded.titre_court, titre = excluded.titre, resume = excluded.resume, corps = excluded.corps, faq = excluded.faq, position = excluded.position;

