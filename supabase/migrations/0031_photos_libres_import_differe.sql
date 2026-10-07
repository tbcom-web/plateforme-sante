-- 0031 : photos libres gardées SANS import (demande de Paul, 2026-10-07 : « on ne télécharge pas l'image complète :
-- on utilise juste le lien, et une fois validée on peut importer »). Rejouable.
--
-- « Garder » (Photos à découvrir) enregistre seulement la candidate : traçabilité (source, identifiant, auteur, page, licence
-- et version datée, mots-clés, requête, sujet), dimensions d'origine et aperçu servi par la source (apercu_url), statut
-- « à valider », sans fichier. « Valider et importer » (/admin/photos) télécharge la photo côté serveur, la convertit en
-- WebP sans EXIF, l'héberge dans photos/banque/libres/<sujet>/ et renseigne chemin, url, largeurs, telecharge_le et
-- importe_le, statut « validée ». Une photo « validée » a TOUJOURS ses fichiers hébergés (contrainte ci-dessous) : les jeux,
-- le générateur et les sites n'utilisent que des photos importées.

alter table public.photos_libres add column if not exists apercu_url text;
alter table public.photos_libres add column if not exists importe_le timestamptz;

alter table public.photos_libres alter column chemin drop not null;
alter table public.photos_libres alter column url drop not null;
alter table public.photos_libres alter column largeurs drop not null;
alter table public.photos_libres alter column telecharge_le drop not null;

-- Largeurs : vide tant que la photo n'est pas importée (la contrainte de 0028 exigeait 1 à 6 largeurs)
alter table public.photos_libres drop constraint if exists photos_libres_largeurs_check;
alter table public.photos_libres drop constraint if exists photos_libres_largeurs_nombre;
alter table public.photos_libres add constraint photos_libres_largeurs_nombre
  check (largeurs is null or cardinality(largeurs) <= 6);

-- Aperçu : https, hôtes d'images de la source seulement
alter table public.photos_libres drop constraint if exists photos_libres_apercu_url_check;
alter table public.photos_libres add constraint photos_libres_apercu_url_check check (
  apercu_url is null or (
    char_length(apercu_url) <= 500
    and (
      (source = 'pexels' and apercu_url ~ '^https://images\.pexels\.com/')
      or (source = 'pixabay' and apercu_url ~ '^https://(cdn\.)?pixabay\.com/')
    )
  )
);

-- Importée = fichiers hébergés complets ; validée ⇒ importée ; non importée ⇒ aperçu de la source obligatoire
alter table public.photos_libres drop constraint if exists photos_libres_import_coherent;
alter table public.photos_libres add constraint photos_libres_import_coherent check (
  (
    chemin is not null and url is not null and largeurs is not null and cardinality(largeurs) between 1 and 6
    and telecharge_le is not null
  )
  or (
    statut <> 'validee' and chemin is null and url is null and coalesce(cardinality(largeurs), 0) = 0
    and apercu_url is not null
  )
);

-- Photos importées avant 0031 : date d'import = date de téléchargement
update public.photos_libres set importe_le = telecharge_le where importe_le is null and chemin is not null and telecharge_le is not null;
