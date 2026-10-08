# 🍽 Dégustation (/admin/degustation)

Décision de Paul du 2026-10-08 : donner du « goût » au générateur de la manière la plus efficace et la plus ludique. Le duel A/B
apprend une comparaison par clic ; la grille en apprend 9 à 12 pour 3 ou 4 clics.

Code : `packages/core/src/degustation.ts` (modèle, session, jeu), `packages/core/src/degustation-grilles.ts` (grilles par format,
état d'apprentissage), `apps/admin/src/app/admin/degustation/`, `apps/admin/src/lib/degustation.ts`. Migration
`supabase/migrations/0042_degustation.sql` (sans elle : choix gardés dans le navigateur, bandeau « Migration à exécuter »).

## Grille « Choisis tes 2 préférées parmi 6 »

- Six propositions du même profil : la base est faite des favoris 4-5 ★ (`versQuatreCinq`, aucun élément à juger là où la
  dimension a des favoris) ; chaque proposition change UN seul élément, toujours dans la même dimension (6 palettes, 6 premiers
  écrans…). Entre deux propositions, la seule différence est leur élément nouveau : l'effet lui est attribué sans ambiguïté.
- Jamais un élément refusé (1 ★, ≤ 2 ★) ni tranché (5 ★) comme nouveau ; jamais de nouvelle règle dure d'harmonie ; priorité aux
  éléments jamais notés ou incertains.
- Formats : compositions complètes (palettes, polices, illustrations, effets, coins, graisse), palettes et polices (spécimens),
  premiers écrans (téléphone), mises en page d'une page (soins, accès, cabinet, sujet, article), kits d'images (seule la photo du
  premier écran change), icônes (la même icône dans chaque style à l'essai). Un dé qui n'a que 2 valeurs permises reste au duel ;
  une grille peut compter 3 à 5 propositions quand le moteur d'harmonie n'en permet pas 6.
- Clavier : 1-6 choisir (la première touchée = n° 1), P puis un numéro = « celle qui ne va pas », Entrée valider, ← annuler,
  Espace agrandir (loupe au toucher sur téléphone).

## Apprentissage (modèle de choix)

Plackett-Luce sur le classement partiel : n° 1 choisie parmi 6, n° 2 parmi les 5 restantes, « la pire » parmi les autres
(meilleur-pire). Décomposé exactement en comparaisons par paires (rank-breaking complet, estimateur convergent) : n° 1 bat 5,
n° 2 bat 4 (5 + 4 = 9 duels), les 3 du milieu battent la pire (+ 3). Ces duels équivalents entrent dans le MÊME moteur que les
duels A/B (`getDuelsApprentissage` → `renfortsDuels`, `pairesDuels`, `renfortsDuelsMobiles`) : Δ(k) = clamp(0,5 · θk, ±0,5 ★),
cumul plafonné à ±1 ★, mêmes clés d'ingrédients et de combinaisons. Écriture canonique : le résultat ne dépend pas de l'ordre
d'affichage.

Mesure « Paul synthétique » (`degustation.test.ts`, 24 éléments, 40 tirages, corrélation de rang ρ avec les vraies forces) :

| Clics | Duel | Grille (2 + Valider) | Grille + pire | Grille sans Valider |
|---:|---:|---:|---:|---:|
| 30 | 0,49 | 0,51 | 0,50 | 0,58 |
| 60 | 0,63 | 0,69 | 0,70 | 0,77 |
| 120 | 0,77 | 0,82 | 0,81 | 0,86 |

Le duel a besoin d'environ 90 clics pour égaler la grille à 60 clics (×1,5) ; top 3 retrouvé à 60 clics : 42 % (duel) contre
49-53 % (grille).

## Professions

Choix enregistrés avec la profession choisie dans l'en-tête (registre `professions.ts`) et le profil dégusté. Sessions, missions,
médailles et « Mon palais » ne lisent que la profession choisie. Goût : tous les choix de la profession, plus ceux des autres
professions sur les dimensions TRANSVERSALES (palettes, polices, typographie, détails, menus, effets, mises en page, premiers
écrans) ; photos, illustrations, icônes et kits restent propres à la profession. Profils : profils de pratique de la profession
(`profils.ts`), sinon scénarios types par sujet.

## Session « Dégustation du jour »

~20 cartes, environ 4-5 minutes. Mélange (`planifierSession`) piloté par ce qui apprend le plus : grilles (dimensions incertaines,
non couvertes, profils en retard ; rendement décroissant sur une même piste), au plus 15 % de duels de départage du haut du
classement, au plus 15 % de notes rapides d'ingrédients jamais notés (rafale : la note passe aussitôt). Barre de progression,
temps restant, reprise si interrompue (moins de 12 h).

## Bats Claude

Avant chaque carte, le juge parie en secret : note prédite de l'élément nouveau (`retours/predictions.json`), sinon note estimée
par l'apprentissage. Après le choix : « Claude avait parié sur la n° 3 ». Accord = pari parmi les 2 préférées (hasard : 33 %).
Score Toi / Claude de la session et de la semaine, tendance sur 7 jours.

## Jeu

XP (grille 10, + 2 avec « la pire », duel 5, note 3, + 5 si l'élément est tranché), bonus de série (+10 % par jour, + 50 % au
plus), niveaux de palais, défi du jour (déterministe pour la date), missions par profil (3 grilles, 1 kit, 2 recettes gardées ;
récompense : lien vers « Publier la meilleure recette de ce profil », /admin/profils), médailles (première grille, séries,
dimension 100 % 4-5 ★ possible, profil prêt, mission, Claude a compris), confettis discrets (aucun si l'animation est réduite),
son désactivé par défaut. Écran de fin : trois lignes concrètes (« Tu préfères la palette « Canard » pour Sport »), effet sur les
profils (part prête estimée avant → après), éléments tranchés, accord de Claude. Le jeu ne pilote jamais le mélange.
