-- 0040 : IMAGES GÉNÉRÉES PAR IA importées par Paul (demande du 2026-10-08 : « faire des prompts pour demander à ChatGPT de créer
-- des images sur des sujets dont on a du mal à trouver des images de représentation »). Prompts : /admin/retours/images-a-generer
-- (packages/core/src/prompts-images.ts) ; import : « Importer une image générée » (packages/core/src/images-generees.ts).
--
-- La table photos_libres (0028, 0031) n'acceptait que Pexels / Pixabay et un chemin banque/libres/. Elle accepte maintenant la
-- source « ia » : image téléversée par Paul, convertie en WebP sans métadonnées, hébergée dans photos/banque/ia/<sujet>/
-- (ia-<empreinte 16 hex>-<largeur>.webp), statut « à valider », puis notation, tri et kits comme les autres photos.
-- Traçabilité OBLIGATOIRE d'une image générée : outil déclaré (ia_outil), prompt utilisé (ia_prompt), conditions d'utilisation de
-- l'outil résumées par Paul (ia_conditions, lien facultatif dans licence_url), vérification de l'usage commercial cochée
-- (ia_conditions_verifiees), date de génération (ia_genere_le), date d'import (importe_le), auteur = Paul (auteur_nom + auteur).
-- Pas de page source (page_url vide) ni d'aperçu externe (apercu_url vide). Aucune suppression (preuve conservée, comme 0028).
--
-- Stockage : rien à changer. Le dossier banque/ du bucket « photos » est déjà réservé à l'admin (peut_gerer_photos, 0011 / 0030),
-- le bucket accepte le WebP jusqu'à 5 Mo (0008).
-- Photos envoyées à la main (photos_sources, 0031) : le dossier banque/ia/ en est exclu comme banque/libres/ (traçabilité ici).
--
-- Rejouable : add column if not exists, drop constraint if exists. À exécuter après 0039_kits_images.sql. Sans cette migration,
-- la page des prompts fonctionne et l'import affiche « Migration à exécuter ».

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Colonnes de traçabilité des images générées
-- ---------------------------------------------------------------------------------------------------------------

alter table public.photos_libres add column if not exists ia_outil text;
alter table public.photos_libres add column if not exists ia_prompt text;
alter table public.photos_libres add column if not exists ia_conditions text;
alter table public.photos_libres add column if not exists ia_conditions_verifiees boolean not null default false;
alter table public.photos_libres add column if not exists ia_genere_le date;
-- Trou d'origine (<sujet>|<emplacement>, ex. « senior|accueil »), facultatif
alter table public.photos_libres add column if not exists ia_trou text;

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Source « ia », identifiant, page, lien de licence, chemin (contraintes de colonnes de 0028 remplacées)
-- ---------------------------------------------------------------------------------------------------------------

alter table public.photos_libres drop constraint if exists photos_libres_source_check;
alter table public.photos_libres add constraint photos_libres_source_check check (source in ('pexels', 'pixabay', 'ia'));

alter table public.photos_libres drop constraint if exists photos_libres_id_source_check;
alter table public.photos_libres add constraint photos_libres_id_source_check check (
  (source in ('pexels', 'pixabay') and id_source ~ '^[0-9]{1,20}$')
  or (source = 'ia' and id_source ~ '^[0-9a-f]{16}$')
);

-- Page de la photo : obligatoire pour Pexels / Pixabay, absente pour une image générée
alter table public.photos_libres alter column page_url drop not null;
alter table public.photos_libres drop constraint if exists photos_libres_page_url_check;
alter table public.photos_libres add constraint photos_libres_page_url_check check (
  (page_url is null and source = 'ia')
  or (page_url is not null and char_length(page_url) <= 300 and page_url ~ '^https://')
);

-- Lien de la licence : obligatoire pour Pexels / Pixabay ; lien des conditions de l'outil facultatif pour une image générée
alter table public.photos_libres alter column licence_url drop not null;
alter table public.photos_libres drop constraint if exists photos_libres_licence_url_check;
alter table public.photos_libres add constraint photos_libres_licence_url_check check (
  (licence_url is null and source = 'ia')
  or (licence_url is not null and char_length(licence_url) <= 400 and licence_url ~ '^https://')
);

-- Fichier principal : banque/libres/<sujet>/<source>-<id>-<largeur>.webp ou banque/ia/<sujet>/ia-<16 hex>-<largeur>.webp
alter table public.photos_libres drop constraint if exists photos_libres_chemin_check;
alter table public.photos_libres add constraint photos_libres_chemin_check check (
  chemin is null
  or (source in ('pexels', 'pixabay') and chemin ~ '^banque/libres/[a-z0-9-]+/(pexels|pixabay)-[0-9]+-[0-9]+\.webp$')
  or (source = 'ia' and chemin ~ '^banque/ia/[a-z0-9-]+/ia-[0-9a-f]{16}-[0-9]+\.webp$')
);

-- ---------------------------------------------------------------------------------------------------------------
-- 3. Cohérence : une image générée est toujours importée et entièrement tracée ; une photo libre n'a aucun champ « ia »
-- ---------------------------------------------------------------------------------------------------------------

alter table public.photos_libres drop constraint if exists photos_libres_ia_coherent;
alter table public.photos_libres add constraint photos_libres_ia_coherent check (
  (
    source = 'ia'
    and ia_outil is not null and char_length(ia_outil) between 2 and 60
    and ia_prompt is not null and char_length(ia_prompt) between 20 and 4000
    and ia_conditions is not null and char_length(ia_conditions) between 10 and 1000
    and ia_conditions_verifiees
    and ia_genere_le is not null
    and chemin is not null and url is not null and apercu_url is null
  )
  or (
    source <> 'ia'
    and ia_outil is null and ia_prompt is null and ia_conditions is null and not ia_conditions_verifiees
    and ia_genere_le is null and ia_trou is null
  )
);

alter table public.photos_libres drop constraint if exists photos_libres_ia_trou_check;
alter table public.photos_libres add constraint photos_libres_ia_trou_check check (ia_trou is null or ia_trou ~ '^[a-z-]{2,30}\|[a-z0-9:-]{2,90}$');

create index if not exists photos_libres_source_idx on public.photos_libres (source, statut);

-- ---------------------------------------------------------------------------------------------------------------
-- 4. Photos envoyées à la main : banque/ia/ exclu (traçabilité dans photos_libres)
-- ---------------------------------------------------------------------------------------------------------------

alter table public.photos_sources drop constraint if exists photos_sources_chemin_check;
alter table public.photos_sources add constraint photos_sources_chemin_check check (
  chemin ~ '^banque/[^[:space:]]{1,300}$' and chemin !~ '^banque/(libres|ia)/' and position('..' in chemin) = 0
);
