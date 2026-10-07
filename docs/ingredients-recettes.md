# Ingrédients, kits et recettes : la boucle de retours de Paul

But final, en termes de Paul (2026-10-07) : obtenir des **combinaisons illimitées de communication** (site, écran de salle d'attente ÉcranZen, réseaux sociaux) à partir des **ingrédients** et des **recettes** qu'on aura créés et validés ensemble.

## Les trois niveaux de la boucle

| Niveau | Ce qu'on note | Où | Ce que ça produit |
|---|---|---|---|
| 1. Ingrédients | Chaque visuel isolé : icône, dessin (3 registres), trait continu, matériel, animation, héros, photo, gamme de couleurs, structure. Notes, « ce qui va / ne va pas », sujets tagués / détagués. | `/admin/retours`, `/admin/illustrations` | Score lissé par ingrédient, sujets effectifs, statut. Les ingrédients mal notés ou retirés ne sortent plus. |
| 2. Kits de visuels | Un **jeu cohérent par sujet** (ex. « Sport ») : héros, 4 à 8 illustrations, icônes, photos, animation. Paul garde, retire ou remplace un élément du kit. | `/admin/retours` (tuile « Kits ») | Kits validés par sujet et par registre, dans lesquels les générateurs puisent. |
| 3. Recettes | Un kit × un style : couleurs (gamme), structure, typographie, rythme, densité. | `/admin/atelier` (thèmes complets) | Recettes notées et pondérées : ce sont elles qui fournissent les « 3 propositions » et le « Charger plus ». |

Chaque niveau ne puise que dans le niveau du dessous **validé** ou **bien noté**. Les garde-fous passent toujours en premier : anatomie, déontologie (diabète sans rouge, posture jamais), contrastes AA, diversité.

## Sorties (même recette, plusieurs supports)

- **Site** : gabarits `apps/sites` (en place).
- **Écran de salle d'attente (ÉcranZen)** : format **vertical 9:16** (écran en mode portrait), exactement comme les Reels : même rendu que les réseaux sociaux, à partir du kit (héros, animations comme « meulage », fiches conseils). Exports vidéo déjà possibles via `packages/contenus/scripts/exporter-animation.mjs` (le 9:16 est le format de référence ; le 16:9 n'est pas utilisé pour ÉcranZen).
- **Réseaux sociaux** : publications et Reels 1:1, 4:5 et 9:16, depuis le moteur `packages/contenus` (sujets, calendrier, Reels).

Une recette = des données (identifiants d'ingrédients + style) : elle se rend pareil sur les trois supports, aux couleurs et au nom du praticien.

## Kits (niveau 2) : structure

Un kit est une donnée du core (`packages/core/src/kits.ts`), sans interface dédiée pour l'instant :

| Champ | Contenu |
|---|---|
| `id`, `libelle` | `sports`, « Sports » |
| `sujet` | sujet des visuels (`sport`) porté par défaut par chaque ingrédient du kit (`sujets-visuels.ts`, via le champ `soins` de l'inventaire) |
| `statut` | `brouillon` tant que Paul n'a pas validé ses ingrédients (`valide`, `retire` ensuite) |
| `elements` | une entrée par variante du sujet (un sport) : clés d'inventaire du **picto** (`picto:sport-basket`), du **trait continu** (`ligne:sport-basket`) et du **dessin pédagogique** (`dessin:sport-basket:pedagogique`), ce que montre l'élément (`regard`) et ses **hashtags par défaut** |

- Les ingrédients d'un kit sont des illustrations comme les autres : ils apparaissent dans `/admin/illustrations` et `/admin/retours` (« Nouveau », statut « À revoir »), se notent, se taguent et se valident un par un. Seul Paul les passe en « Validé ».
- Hashtags par défaut : `HASHTAGS_PAR_DEFAUT` (kits.ts) est appliqué avant le journal `assets_hashtags` (`hashtagsDepuisLignes(lignes, défauts)`) : filtre « #basket » immédiat, et Paul peut retirer un hashtag par défaut ou en ajouter.
- Kit Sports (2026-10-07) : course à pied, trail, randonnée, football, rugby, basket, tennis et padel, handball, danse, cyclisme, ski, golf. Scènes dans `packages/core/src/sports.ts` (pied validé `piedDeProfil` chaussé par enveloppe, cinématique du coureur `foulee.ts`), revue dans `docs/referentiels/revue-anatomique-2026-10-07-sports.md`. Aucune animation tant que les ingrédients ne sont pas validés (règle 6 du graphiste).
- Prochaines étapes : tuile « Kits » dans `/admin/retours` (garder, retirer, remplacer un élément), héros et photos du sujet ajoutés au kit, générateurs qui puisent dans les kits validés.

## Boucle avec Claude

1. Paul note (niveaux 1 à 3).
2. Export quotidien ou bouton → `retours/` (`SYNTHESE.md`, JSON).
3. Claude lit, corrige (illustrations, règles, kits, recettes) et inscrit chaque changement dans `retours/CHANGEMENTS.md`.
4. Les éléments modifiés reviennent en « avant / après » pour que Paul les note à nouveau.

## Feuille de route

- [x] Niveau 1 : notes, étiquettes, export, apprentissage (`assets-poids.ts`), atelier des combinaisons (`atelier-poids.ts`).
- [ ] Niveau 1 : avant / après, champs libres « va bien / ne va pas », sujets tagués, inspirations, flux de photos libres.
- [ ] Niveau 2 : kits de visuels par sujet (proposés par Claude d'après les notes ; Paul garde, retire ou remplace) ; les générateurs puisent dans les kits. Premier kit déclaré : « Sports » (2026-10-07, brouillon, voir ci-dessous).
- [x] Niveau 3 : recettes nommées — **Studio de recettes** (`/admin/atelier/studio`, 2026-10-07) : dés 🎲 / ← / 🔒 par dimension (couleurs : 17 gammes ou couleur libre AA ; polices : 9 paires `PAIRES_POLICES` ; visuels : style, héros ; photos de la banque ; structure : modèle, ordre de l'accueil, un dé par type de page et par élément, forme des cartes ; effets : Sobre, Doux, Vivant, Éditorial), raccourcis c p v f s e et espace ; « Enregistrer cette recette » (table `recettes`, migration 0032) ; « Mes recettes » (ouvrir, dupliquer, archiver). Les recettes notées ≥ 4 du sujet n° 1 passent en premier dans « Votre site » (/creer), puis le générateur ; le brouillon garde `theme.recette` et ses réglages (police, variantes, ordre, héros, photos, effets) que le site publié applique.
- [x] Apprentissage croisé : une recette (ou une combinaison de l'atelier) notée renforce ou affaiblit un peu chacun de ses ingrédients (`renfortsPoids`, recettes.ts : 0,4 note par ingrédient, lissage existant, plafond ±0,75 étoile) ; « Ce que vos avis ont changé » le dit.
- [x] Notables comme ingrédients (assets_notes, migration 0032) : structures de pages `structure:<page>:<variantes>`, éléments `composant:<famille>:<variante>` (horaires, plan d'accès, galerie, questions, équipe, soins, forme des cartes…), jeux d'effets `effets:<id>` — notés depuis le studio (« Noter les éléments affichés »).
- [x] Lot 1 des éléments notables (2026-10-07) : horaires (tableau, bandeau, carte, liste), plan d'accès (adresse et itinéraire, notice et plan, colonnes ; plan SVG statique d'OpenStreetMap, jamais de tuiles ni d'iframe), galerie du cabinet (mosaïque, diaporama au doigt en scroll-snap sans script, grande photo, bande de quatre), rendez-vous et contact (`contact` : barre d'actions, bandeau « Écrire au cabinet », carte de contact, bouton flottant ; liens seulement), formes des cartes (bulles, gros carrés, arrondies, mosaïque, pastilles, organiques, tuiles pleine couleur, sans cadre). Tuiles « Structures de pages » (165 structures), « Éléments » (40, filtre par famille) et « Effets » (4) dans /admin/retours : `inventaireStudio()` (assets.ts), aperçu de l'élément seul (`ApercuStudio`, `seul` d'ApercuGabarit, `compositionPourCle` / `blocsPourCle`), mêmes étoiles, étiquettes du studio, export ; avant / après par empreinte de la feuille CSS pour les effets et les formes (avant-apres.ts, `empreinteStudio`).
- [x] Lot 2 (2026-10-07) : structures de la fiche d'un soin (`fiche` : encadré à côté, une colonne, encadré « En pratique » en tête) et des actualités (`actualites` : liste, cartes, le dernier à la une), pied de page en 3 variantes (`pied` : trois colonnes, centré, nom du cabinet en grand) ; un dé par type de page dans le studio (accueil, soins, fiche d'un soin, contact et accès, cabinet, questions, actualités), aperçu de la fiche dans Donner mon avis (`vuePourCle`).
- [ ] À suivre : variantes propres aux pages sujet et à la page d'un article (elles reprennent aujourd'hui les présentations partagées : soins, formes, contact, pied) ; prédictions du juge pour les structures, éléments et effets ; formulaire de contact (pas de formulaire aujourd'hui : stockage, RGPD et anti-spam à décider par Paul — en attendant « Écrire au cabinet » reste un lien e-mail).
- [x] Photos dans le donneur d'avis : l'atelier et le studio montrent de vraies photos de la banque (jeux, photos libres validées, photos intégrées) tirées pour les sujets et pondérées par les notes ; leurs clés font partie des ingrédients notés.
- [ ] Remplissage automatique (demande de Paul du 2026-10-07) :
  - chaque emplacement d'un site (héros, illustration d'une page sujet ou d'une fiche soin, photos d'accueil et de galerie, icônes) est rempli à partir des sujets et hashtags des visuels, de leurs notes et de leur statut ;
  - un bouton « Changer » sur chaque emplacement, pour le praticien comme pour l'admin, tire un autre visuel compatible jusqu'à ce qu'il plaise ;
  - « Garder celui-ci » fige le choix dans le brouillon ;
  - les choix et rejets des praticiens alimentent les notes.
- [ ] Sorties : rendu d'une recette en 9:16 (écran ÉcranZen et Reels / stories, même format) et en 1:1, 4:5 pour les publications, depuis le même moteur.
