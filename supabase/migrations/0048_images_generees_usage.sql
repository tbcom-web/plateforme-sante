-- 0048 : USAGE des images générées (demande de Paul du 2026-10-08 : « créer un set d'images de cabinet de podologie […] ainsi que
-- des photos fictives de praticiens. Comment importer ça dans mon kit de base pour tous mes templates ? »).
--
-- Principe déontologique : une image générée d'un cabinet ou d'un praticien FICTIF n'est jamais présentée sur le site publié d'un
-- vrai praticien comme SON cabinet ou SA personne. À l'import (« Importer une image générée », images-generees.ts), Paul choisit :
-- - ia_usage = 'demo' : Démo uniquement (par défaut pour le cabinet et les praticiens), fichier dans photos/banque/ia/demo-<profession>/,
--   utilisée par le KIT DÉMO des aperçus seulement (kit-demo.ts) ; jamais dans la banque des sites ni dans un site publié ;
-- - ia_usage = 'site' : image générique non présentée comme le cabinet (hygiène, matériel, ambiance, illustration d'un sujet).
-- ia_emplacement : galerie cabinet démo, panorama démo, portrait démo, praticien en situation démo, hygiène, matériel, ambiance,
-- illustration. ia_lot : lot importé en une fois (même set, mêmes métadonnées) : la série cohérente du kit démo.
-- Images générées importées avant 0048 : usage « site », emplacement « illustration » (comportement d'avant).
--
-- Rejouable : add column if not exists, drop constraint if exists. À exécuter après 0040_images_generees.sql. Aucune donnée supprimée.
-- Sans cette migration : la page des prompts fonctionne, l'import d'une image « démo » ou en lot affiche « Migration à exécuter ».

alter table public.photos_libres add column if not exists ia_usage text;
alter table public.photos_libres add column if not exists ia_emplacement text;
alter table public.photos_libres add column if not exists ia_lot text;

-- Images générées déjà importées : usage « site », emplacement « illustration »
update public.photos_libres set ia_usage = 'site' where source = 'ia' and ia_usage is null;
update public.photos_libres set ia_emplacement = 'illustration' where source = 'ia' and ia_emplacement is null;

alter table public.photos_libres drop constraint if exists photos_libres_ia_usage_check;
alter table public.photos_libres add constraint photos_libres_ia_usage_check check (
  (source = 'ia' and ia_usage in ('demo', 'site'))
  or (source <> 'ia' and ia_usage is null and ia_emplacement is null and ia_lot is null)
);

alter table public.photos_libres drop constraint if exists photos_libres_ia_emplacement_check;
alter table public.photos_libres add constraint photos_libres_ia_emplacement_check check (
  ia_emplacement is null
  or ia_emplacement in ('demo-galerie', 'demo-panorama', 'demo-portrait', 'demo-situation', 'hygiene', 'materiel', 'ambiance', 'illustration')
);

-- Cabinet et praticiens : « Démo uniquement », jamais « site » ; l'illustration d'un sujet : « site »
alter table public.photos_libres drop constraint if exists photos_libres_ia_usage_emplacement_check;
alter table public.photos_libres add constraint photos_libres_ia_usage_emplacement_check check (
  ia_usage is null
  or (ia_emplacement in ('demo-galerie', 'demo-panorama', 'demo-portrait', 'demo-situation') and ia_usage = 'demo')
  or (ia_emplacement in ('hygiene', 'materiel', 'ambiance') and ia_usage in ('demo', 'site'))
  or (ia_emplacement = 'illustration' and ia_usage = 'site')
);

-- Le dossier fait foi : une image « démo » est toujours dans banque/ia/demo-<profession>/, une image « site » jamais
alter table public.photos_libres drop constraint if exists photos_libres_ia_usage_chemin_check;
alter table public.photos_libres add constraint photos_libres_ia_usage_chemin_check check (
  ia_usage is null
  or (ia_usage = 'demo' and chemin ~ '^banque/ia/demo-[a-z0-9-]+/ia-[0-9a-f]{16}-[0-9]+\.webp$')
  or (ia_usage = 'site' and chemin !~ '^banque/ia/demo-')
);

alter table public.photos_libres drop constraint if exists photos_libres_ia_lot_check;
alter table public.photos_libres add constraint photos_libres_ia_lot_check check (ia_lot is null or ia_lot ~ '^[0-9a-f]{12}$');

create index if not exists photos_libres_ia_usage_idx on public.photos_libres (ia_usage, statut) where source = 'ia';
