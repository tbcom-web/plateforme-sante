# Photos libres de droits (Pexels, Pixabay)

Flux de photos pour enrichir la banque des sites : `/admin/retours` → **Photos à découvrir**. Une photo candidate à la fois,
GARDER ou REJETER. Une photo gardée est **téléchargée et hébergée chez nous** avec sa licence tracée ; les sites n'utilisent
que nos copies, **jamais un lien direct** vers Pexels ou Pixabay.

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
- la vignette de la source n'est utilisée que pendant l'évaluation ; seul GARDER télécharge (une photo à la fois, jamais en masse) ;
- recherches en cache 24 h (cache mémoire + cache de données de Next) et limite de débit avec marge (180 / h, 90 / min) ;
- la charte va plus loin que les licences : **pas de visage reconnaissable mis en avant, rien qui laisse croire à un patient
  réel** (étiquettes « Visage visible » et « Laisse croire à un patient » : GARDER est refusé), photos « trop banque d'images »
  écartées par l'étiquette du même nom.

## Ce qui se passe quand Paul clique GARDER

1. La photo est **relue à la source** côté serveur (les informations du navigateur ne font jamais foi).
2. Téléchargement de la grande taille (hôtes de la source seulement, 30 Mo au plus).
3. Conversion **WebP** (qualité 80) en 640, 1280 et 1920 px de large au plus, jamais agrandie, orientation appliquée puis
   **toutes les métadonnées (EXIF, GPS…) retirées** (sharp, installé avec Next).
4. Envoi dans le stockage public `photos`, dossier `banque/libres/<sujet>/<source>-<id>-<largeur>.webp` (dossier `banque/`
   réservé à l'admin, migration 0011).
5. **Traçabilité** dans la table `photos_libres` (migration 0028) : source, identifiant, auteur (+ lien), page de la photo,
   licence (nom, « texte en vigueur au AAAA-MM-JJ », lien officiel), date et heure de téléchargement, mots-clés du sujet, requête,
   sujet, fichiers produits. Statut **« à valider »**. Aucune suppression possible depuis l'application : la preuve de licence reste.
6. La photo apparaît dans « Donner mon avis » → Photos (notable) et dans la bibliothèque. Sur `/admin/photos`, section
   « Photos libres de droits » : source, auteur, licence de chaque photo, statut (À valider / Validée / Retirée), et
   **Exporter les licences (CSV)** (photos libres + licences Adobe Stock, pour la conformité). Validée, la photo est proposée
   dans le choix des jeux de photos (« Libres de droits »).
7. Sur les sites, le traitement de teinte du modèle s'applique comme pour toutes les photos (`data-images` : naturel, chaud,
   doux, contrasté) ; la copie hébergée reste neutre.

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
