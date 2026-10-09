# Photos libres de droits (Pexels, Pixabay)

Flux de photos pour enrichir la banque des sites : `/admin/retours` → **Photos à découvrir**. Une photo candidate à la fois,
GARDER ou REJETER. Une photo gardée n'enregistre que son **lien et sa licence** ; « Valider et importer » la télécharge et
l'héberge chez nous. Les sites n'utilisent que nos copies importées, **jamais un lien direct** vers Pexels ou Pixabay.

Pas d'Unsplash pour ce flux : son API impose d'afficher les photos depuis ses serveurs (lien direct), incompatible avec des
sites qui doivent rester rapides et autonomes. (La banque intégrée historique, `apps/sites/public/photos`, contient des photos
Unsplash téléchargées une à une ; crédits dans `apps/sites/public/photos/CREDITS.md`.)

**Sourcing automatique en séries** (2026-10-09) : un agent peut chercher, filtrer, analyser et proposer des séries cohérentes de
6 à 12 photos, acceptées d'un geste dans les Arrivages (mêmes licences, même import, rien d'importé avant acceptation) :
`docs/sourcing-photos.md`.

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

## Sources et licences de toutes les images (/admin/photos)

Demande de Paul (2026-10-07) : chaque image enregistrée garde sa source et, le cas échéant, sa licence. Écran unique
« Sources et licences » (filtre par source, « Source à renseigner », recherche) et **Export CSV complet** :

- banque intégrée (`apps/sites/public/photos`) : crédits Unsplash typés dans `packages/core/src/credits-photos.ts`
  (photographe, page d'origine, Unsplash License, date d'ajout) — un test vérifie qu'aucun fichier n'est sans crédit, et
  inversement ; affichés aussi sur les cartes (bibliothèque, Donner mon avis) ;
- photos libres Pexels / Pixabay : traçabilité de `photos_libres` dès « Garder » ;
- photos envoyées à la main dans un jeu « banque » : **provenance obligatoire avant l'envoi** (Adobe Stock + référence de
  licence, photo personnelle / réalisée pour le cabinet + auteur, autre banque + nom, page, licence), table `photos_sources`
  (migration 0031) ; une photo envoyée sans provenance apparaît « Source à renseigner » avec « Compléter la source » ;
- Adobe Stock d'un jeu exclusif : `licences_photos` (0016) ; photos des praticiens : « Photo fournie par le praticien ».

## Images générées par IA (/admin/retours/images-a-generer)

Demande de Paul (2026-10-08) : « faire des prompts pour demander à ChatGPT de créer des images sur des sujets dont on a du mal
à trouver des images de représentation ». **Paul génère lui-même** : aucun service d'IA n'est appelé par le code.

1. **Prompts** (`packages/core/src/prompts-images.ts`) : la page liste les TROUS réels (emplacements des kits sans photo,
   faibles ou complétés par un autre sujet, sujets avec moins de 3 photos ≥ 4 ★, manques « photo » de `retours/MANQUES.md`),
   priorisés. Pour chacun : prompt prêt à copier (anglais ou français ; ChatGPT / Firefly en phrases, ou Midjourney avec `--ar`
   et `--no`), par format (premier écran 16:9 et 4:5, carte de soin 4:3, page sujet 3:2, cabinet : détail d'ambiance 3:2,
   ÉcranZen 9:16), trois variantes (lumière × angle), couleurs de la gamme choisie injectées (nom + hexadécimal), style de la
   banque (naturel, lumineux, sans retouche glamour). Contraintes négatives **toujours présentes** : pas de texte, de logo ni de
   marque, pas de visage reconnaissable, pas de sang ni de plaie, anatomie correcte (cinq orteils), pas d'avant / après, modèle
   anonyme jamais présenté comme un vrai patient ou praticien, pas de tatouage, chaussures propres, image nette. Une précision
   libre qui viole une règle (avant / après, résultat, faux patient ou praticien, marque, posturologie / réflexologie, sang,
   visage, texte) est **refusée** : aucun prompt rendu. Liens depuis la vue Kits d'images et Photos à découvrir.
2. **Import** (« Importer une image générée », `packages/core/src/images-generees.ts`, route `…/images-a-generer/importer`) :
   PNG, JPEG ou WebP depuis l'ordinateur ou le téléphone ; type réel lu dans les octets, 4 Mo au plus à l'envoi (le navigateur
   réencode au-delà), grand côté ≥ 1024 px et petit côté ≥ 768 px, **refus si les métadonnées contiennent une localisation GPS**
   (photo d'appareil). Conversion WebP 640 / 1280 / 1920 px au plus, toutes métadonnées retirées, dans
   `photos/banque/ia/<sujet>/ia-<empreinte>-<largeur>.webp`. Traçabilité obligatoire dans `photos_libres` (source « ia ») :
   outil, date de génération, prompt utilisé, conditions d'utilisation de l'outil (résumé + lien), case « usage commercial
   vérifié » (Paul vérifie lui-même les conditions de l'outil), auteur = Paul, date d'import. Statut « à valider » ; sujet et
   hashtags du trou pré-cochés (`#<emplacement>`, `#image-generee`) ; ensuite notation, tri, validation et kits comme les autres.
3. **Partout** : étiquette « Image générée » (Jeux de photos, Sources et licences, export CSV, cartes de la bibliothèque).
   **Jamais dans la galerie du cabinet** (kits, jeux de photos) : elle serait prise pour le vrai cabinet. Sur les sites qui en
   affichent une, les mentions légales (« Crédits photos ») précisent que certaines photos d'illustration sont générées par IA et
   ne représentent ni des patients ni le cabinet.
4. **Migration** `supabase/migrations/0040_images_generees.sql` (à exécuter par Paul) ; sans elle, les prompts fonctionnent et
   l'import affiche « Migration à exécuter ».

### Sets démo et kit démo (cabinet et praticiens fictifs)

Demande de Paul (2026-10-08) : « créer un set d'images de cabinet de podologie avec salle d'attente, stérilisateur, matériel,
etc., ainsi que des photos fictives de praticiens. Comment importer ça dans mon kit de base pour tous mes templates ? »

**Principe (non négociable)** : une image générée d'un cabinet ou d'un praticien FICTIF n'est jamais présentée sur le site
publié d'un vrai praticien comme SON cabinet ou SA personne (tromperie du public, déontologie, AI Act : transparence).

1. **Prompts** (`/admin/cuisine/images-a-generer`, bloc « Sets démo », `construirePromptSet` de `prompts-images.ts`) :
   - *Set démo cabinet* (pédicure-podologue d'abord, une entrée par profession dans `SETS_CABINET`) : salle d'attente,
     accueil / secrétariat, salle de soins avec fauteuil, autoclave / stérilisation, plateau d'instruments stériles en sachets,
     podoscope / plateforme, bureau d'examen, lavage des mains, détails d'ambiance, façade / porte neutre sans enseigne ; formats
     galerie 4:3, panorama 16:9, téléphone 4:5 ; « Same clinic series » (même lumière, mêmes matières, palette de la gamme
     injectée) + trois angles ; aucune personne, rien de lisible.
   - *Set praticiens fictifs* : portrait 4:5 et en situation (tunique, gants, examen d'un pied, accueil), six personnes de
     diversité d'âges, de genres et d'origines ; mention obligatoire « entirely fictional person, does not resemble any real
     person », sans badge, sans nom, sans logo, mains et pieds corrects. Toutes les contraintes négatives habituelles restent
     (sauf « aucun visage », remplacée par les contraintes du fictif).
2. **Import** (« Importer une image générée » ou « Importer le set (en lot) ») : **usage obligatoire** — « Démo uniquement »
   (par défaut, seul permis pour le cabinet et les praticiens) ou « Utilisable sur les sites (générique, non présenté comme le
   cabinet) » pour l'hygiène, le matériel et l'ambiance, avec une case dédiée. **Emplacement** : galerie cabinet démo, panorama
   démo, portrait démo, praticien en situation démo, hygiène, matériel, ambiance, illustration. **Import en lot** : 12 fichiers
   au plus d'un coup, mêmes informations, même **lot** (la série). Traçabilité inchangée. Une image « Démo » est rangée dans
   `photos/banque/ia/demo-<profession>/` (le dossier fait foi) et n'a aucun sujet de la banque. Migration
   `supabase/migrations/0048_images_generees_usage.sql` (colonnes `ia_usage`, `ia_emplacement`, `ia_lot`) ; sans elle, les
   prompts fonctionnent et l'import « Démo » affiche « Migration à exécuter ».
3. **Kit démo** (`packages/core/src/kit-demo.ts`) : images « Démo » ACCEPTÉES (Arrivages : validée) et NOTÉES ≥ 3 ★ (4-5 ★
   d'abord) ; cabinet : galerie de 4 + panorama pris dans le même lot ; praticiens : 1 à 3 portraits fictifs. Posé dans le
   registre (`demo:<profession>`) et appliqué AU RENDU par tous les aperçus (Studio, atelier, recettes, dégustation, kits,
   parcours `/creer` et `/essai`) à la place des galeries vides et des silhouettes ; jamais dans l'éditeur du site réel
   (`/mon-site`). Côté praticien : bandeau « Photos d'exemple — remplacez-les par les vôtres ».
4. **Garde-fous** : `normaliserDraft` retire toute image démo d'un brouillon (lecture, enregistrement, construction Astro) ;
   la banque des sites et les jeux de photos les refusent ; `controlerPublication` les signale en bloquant et la publication
   (`lib/publication.ts` : publier, version d'essai, aperçu privé, republication) est refusée avec un message clair tant qu'une
   image démo subsiste dans la configuration enregistrée.
