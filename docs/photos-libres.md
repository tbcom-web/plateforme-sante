# Photos libres de droits (Pexels, Pixabay)

Flux de photos pour enrichir la banque des sites : `/admin/retours` → **Photos à découvrir**. Une photo candidate à la fois,
GARDER ou REJETER. Une photo gardée n'enregistre que son **lien et sa licence** ; « Valider et importer » la télécharge et
l'héberge chez nous. Les sites n'utilisent que nos copies importées, **jamais un lien direct** vers Pexels ou Pixabay.

Pas d'Unsplash pour ce flux : son API impose d'afficher les photos depuis ses serveurs (lien direct), incompatible avec des
sites qui doivent rester rapides et autonomes. (La banque intégrée historique, `apps/sites/public/photos`, contient des photos
Unsplash téléchargées une à une ; crédits dans `apps/sites/public/photos/CREDITS.md`.)

## Licences en bref

Résumé de travail : **le texte officiel fait foi**, à relire en cas de doute (liens ci-dessous, enregistrés aussi avec chaque photo).

| | Pexels | Pixabay |
|---|---|---|
| Texte officiel | [pexels.com/license](https://www.pexels.com/license/) · API : [pexels.com/api/documentation](https://www.pexels.com/api/documentation/) | [pixabay.com/service/license-summary](https://pixabay.com/service/license-summary/) · API : [pixabay.com/api/docs](https://pixabay.com/api/docs/) |
| Usage commercial | Oui, gratuit | Oui, gratuit |
| Attribution | Non obligatoire (appréciée) | Non obligatoire (appréciée) |
| Modifier, recadrer, teinter | Oui | Oui |
| Héberger une copie | Oui | **Obligatoire** pour un usage durable : pas de lien direct permanent (les adresses d'images de l'API expirent) |
| Interdit | Revendre la photo telle quelle (tirage, autre banque d'images) ; montrer une personne identifiable de façon dégradante ; laisser croire qu'une personne ou une marque de la photo recommande le cabinet | Mêmes interdits, plus : redistribuer la photo seule (fonds d'écran, autre banque) ; utiliser une marque visible de façon trompeuse ; téléchargement massif automatisé |
| Règles de l'API | Montrer un lien vers Pexels et le photographe quand on affiche des résultats ; 200 requêtes / heure | Montrer d'où viennent les images quand on affiche des résultats ; **cache des recherches 24 h** ; 100 requêtes / minute |

Ce que fait l'admin pour s'y conformer :

- chaque candidate affiche « Photo : *auteur* sur *Pexels/Pixabay* » avec les liens vers la page et l'auteur ;
- la vignette de la source n'est utilisée que pendant l'évaluation ; seul « Valider et importer » télécharge (une photo à la fois, jamais en masse) ;
- recherches en cache 24 h (cache mémoire + cache de données de Next) et limite de débit avec marge (180 / h, 90 / min) ;
- la charte va plus loin que les licences : **pas de visage reconnaissable mis en avant, rien qui laisse croire à un patient
  réel** (étiquettes « Visage visible » et « Laisse croire à un patient » : GARDER est refusé), photos « trop banque d'images »
  écartées par l'étiquette du même nom.

## Ce qui se passe quand Paul clique GARDER (lien seulement, migration 0031)

Demande de Paul (2026-10-07) : « on ne télécharge pas l'image complète : on utilise juste le lien, et une fois validée on
peut importer ». Moins de stockage, aucune photo rejetée ou abandonnée importée.

1. La photo est **relue à la source** côté serveur (les informations du navigateur ne font jamais foi). **Aucune image n'est
   téléchargée.**
2. **Traçabilité** dans `photos_libres` : source, identifiant, auteur (+ lien), page, licence (nom, « texte en vigueur au
   AAAA-MM-JJ », lien officiel), mots-clés, requête, sujet (premier thème coché), dimensions d'origine et **aperçu servi par la
   source** (`apercu_url` : `images.pexels.com`, `pixabay.com` / `cdn.pixabay.com`, https). `chemin`, `url`, `largeurs`,
   `telecharge_le` restent vides. Statut **« à valider »**. Thèmes et hashtags enregistrés sous la clé `photo:libre:<source>-<id>`.
3. Sur `/admin/photos`, la candidate s'affiche avec son aperçu et la mention « Aperçu Pexels/Pixabay, non importée » ; elle
   n'est **ni dans la bibliothèque, ni dans les jeux, ni sur les sites** (licence Pexels : affichage depuis leur CDN autorisé ;
   Pixabay : affichage temporaire pour l'évaluation, import obligatoire avant tout usage durable).

## « Valider et importer » (/admin/photos)

1. Relecture à la source côté serveur ; photo disparue : message clair, statut **« retirée »**, rien n'est importé.
2. Téléchargement de la grande taille (hôtes de la source seulement, 30 Mo au plus), conversion **WebP** (qualité 80) en 640,
   1280 et 1920 px au plus, jamais agrandie, **toutes les métadonnées retirées** (sharp, dépendance déclarée de l'admin).
3. Envoi dans `photos/banque/libres/<sujet>/<source>-<id>-<largeur>.webp` (dossier `banque/` réservé à l'admin, 0011 / 0030).
4. Traçabilité complétée : `chemin`, `url`, `largeurs`, `telecharge_le` = `importe_le` = date d'import, version de licence du
   jour. Statut **« validée »** (contrainte de 0031 : une photo validée a toujours ses fichiers). Thèmes et hashtags de la
   candidate reportés sur la clé de la photo importée.
5. Seule une photo importée entre dans la bibliothèque, « Donner mon avis », le choix des jeux de photos (« Libres de droits »)
   et donc les sites. « Retirer » écarte une candidate sans l'importer. **Exporter les licences (CSV)** liste aussi les
   candidates (statut) et la date d'import.
6. Sur les sites, le traitement de teinte du modèle s'applique comme pour toutes les photos ; la copie hébergée reste neutre.

REJETER enregistre seulement la décision (`photos_libres_avis`) : la photo n'est plus jamais proposée. Les photos trop petites
(grand côté < 1600 px ou petit côté < 900 px) sont écartées d'office, le paysage passe en premier.

## Mots-clés par sujet

Valeurs par défaut dans `packages/core/src/photos-libres.ts` (`MOTS_CLES_DEFAUT`, en anglais, la langue des deux banques) ;
modifiables dans « Photos à découvrir » → Mots-clés de recherche → Modifier (table `photos_libres_mots_cles`). Tout effacer
rétablit les valeurs par défaut.

## Créer les clés et les ajouter dans Vercel (Paul)

Sans clé, la tuile affiche « Clé API à configurer » et tout le reste de l'admin fonctionne. Une seule des deux clés suffit.

**Pexels**

1. Créer un compte gratuit sur [pexels.com](https://www.pexels.com/join/).
2. Aller sur [pexels.com/api](https://www.pexels.com/api/) → « Your API Key » (demande : nom du projet « webpodologue », usage
   « choix de photos pour des sites de cabinets de podologie, photos hébergées sur nos serveurs »).
3. Copier la clé affichée.

**Pixabay**

1. Créer un compte gratuit sur [pixabay.com](https://pixabay.com/accounts/register/).
2. Une fois connecté, ouvrir [pixabay.com/api/docs](https://pixabay.com/api/docs/) : la clé apparaît dans la section
   « Search Images », paramètre `key`.

**Vercel** (projet de l'admin)

1. Vercel → projet de l'admin → **Settings** → **Environment Variables**.
2. Ajouter, en cochant « Sensitive », pour l'environnement **Production** (et Preview si besoin) :
   - `PEXELS_API_KEY` = la clé Pexels
   - `PIXABAY_API_KEY` = la clé Pixabay
3. **Redeployer** l'admin (Deployments → … → Redeploy) : les variables ne sont lues qu'au déploiement.

Ne jamais préfixer ces variables par `NEXT_PUBLIC_` (elles partiraient dans le navigateur), ne jamais les écrire dans le code,
dans un fichier `.env` versionné ni dans une conversation. Elles ne sont lues que côté serveur
(`apps/admin/src/lib/photos-libres.ts`) ; le navigateur ne reçoit que « prête » / « à configurer ».

## Avant la première utilisation

Exécuter `supabase/migrations/0028_inspirations_photos_libres.sql` (SQL Editor de Supabase) : tables `photos_libres`,
`photos_libres_avis`, `photos_libres_mots_cles`, `inspirations`, et bucket privé `inspirations`.
