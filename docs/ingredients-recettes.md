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

## Boucle avec Claude

1. Paul note (niveaux 1 à 3).
2. Export quotidien ou bouton → `retours/` (`SYNTHESE.md`, JSON).
3. Claude lit, corrige (illustrations, règles, kits, recettes) et inscrit chaque changement dans `retours/CHANGEMENTS.md`.
4. Les éléments modifiés reviennent en « avant / après » pour que Paul les note à nouveau.

## Feuille de route

- [x] Niveau 1 : notes, étiquettes, export, apprentissage (`assets-poids.ts`), atelier des combinaisons (`atelier-poids.ts`).
- [ ] Niveau 1 : avant / après, champs libres « va bien / ne va pas », sujets tagués, inspirations, flux de photos libres.
- [ ] Niveau 2 : kits de visuels par sujet (proposés par Claude d'après les notes ; Paul garde, retire ou remplace) ; les générateurs puisent dans les kits.
- [ ] Niveau 3 : recettes nommées (kit × style) ; « Charger plus » = recettes ; recettes favorites réutilisables.
- [ ] Sorties : rendu d'une recette en 9:16 (écran ÉcranZen et Reels / stories, même format) et en 1:1, 4:5 pour les publications, depuis le même moteur.
