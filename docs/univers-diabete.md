# Univers diabète : inventaire, manques et illustrations proposées

Demande de Paul (2026-10-09) : « Creuser l'univers DIABÈTE pour créer des illustrations SVG dans un style moderne qui colle avec
les modèles ; identifier des icônes / illustrations à mettre au premier plan ou en avant en page d'accueil. »

Code : `packages/core/src/univers-diabete.ts` (tests : `univers-diabete.test.ts`). Tous les éléments sont des BROUILLONS
(« À revoir ») : seul Paul les valide. Lot à noter : `/admin/retours?nouveautes=univers-diabete@2026-10-09`.

## 1. Ce qui existe (et ce que Paul en a dit)

| Élément | Note de Paul | Constat |
|---|---|---|
| `heros:diabete` (monofilament tenu en main) | relevé 4 ★, pédagogique 3 ★ (« main trop bizarre anatomiquement »), trait 3 ★ | instrument + main en premier écran : à remplacer (MANQUES M1) |
| `dessin:diabete` | relevé 3-4 ★ (« on comprend pas trop »), pédagogique 5 ★ | même scène (main) |
| `materiel:monofilament-diapason` | 4-5 ★ | la grammaire du matériel plaît |
| `ligne:monofilament`, `picto:monofilament` | 4 ★, 3 ★ (fil invisible) ; directions A/B/C 4 ★ | |
| `picto:pied-diabetique` | 3 ★ (trait épais) | |
| `dessin:auto-examen` | 4 ★ (« il faudrait qu'il soit penché ») | repris en héros, miroir penché |
| `dessin:chaussage-adapte` | 2 ★ (sans commentaire) | chaussure confort à scratch + jambe : écartée comme base |
| `dessin:crevasses-talon` | 5 ★ | à garder pour la fiche « peau sèche » |
| `composant:entete-anim:em-sensibilite` | 5 ★ | points de sensibilité sur la semelle : repris en héros fixe |
| Photos `banque/libres/diabete` | cinq à 5 ★ | rien d'intégré encore (M2) |

Règles rappelées : jamais de rouge pour le diabète (gammes pastèque, pistache, corail exclues ; `REGLES_THEMES.diabete`), pas
d'instrument en premier écran (« il faut rassurer »), pas de plaie, pas de main, pas d'anatomie inventée.

## 2. Manques

1. Un héros rassurant SANS instrument (M1) — aucun aujourd'hui.
2. Les gestes de prévention de l'Assurance Maladie n'ont aucune illustration de carte : chaussettes, hydratation, ongles,
   chaussons (pieds nus), toilette, chaussure fermée, bilan / suivi.
3. Aucune icône d'univers diabète en couleur de gamme utilisable en grand (les pictos sont au trait fin, que Paul juge souvent
   « pas représentatif »).

## 3. Liste priorisée (16 sujets)

Premier écran (héros) :

| # | Sujet | Statut |
|---|---|---|
| H1 | **Semelles en lignes de niveau et points de sensibilité** (`heros:diabete-sensibilite`) | créé |
| H2 | **Nature morte du soin** : chaussure fermée, chaussette rentrée dedans, pot de crème (`heros:diabete-nature-morte`) | créé |
| H3 | **Miroir penché** au sol, plante reflétée (`heros:diabete-miroir`) | créé |
| H4 | Parcours de prévention (une semelle par étape : regarder, protéger, consulter) | proposé (risque « trop d'éléments ») |

Cartes (illustrations) :

| # | Sujet | Statut |
|---|---|---|
| 1 | Test de sensibilité au monofilament (`dessin:diabete-sensibilite-test`) | créé |
| 2 | Chaussettes adaptées (`dessin:diabete-chaussettes`) | créé |
| 3 | Hydrater la peau, tube et pot (`dessin:diabete-creme`) | créé |
| 4 | Limer, couper droit : lime et ciseaux à lames droites (`dessin:diabete-ongles`) | créé |
| 5 | Ne pas marcher pieds nus : chaussons fermés (`dessin:diabete-chaussons`) | créé |
| 6 | Chaussure fermée et confortable (`dessin:diabete-chaussure`) | créé |
| 7 | Bilan podologique et suivi : planchette, semelle, cases cochées (`dessin:diabete-bilan`) | créé |
| 8 | Toilette : bassine, thermomètre, serviette (`dessin:diabete-toilette`) | créé |
| 9 | Auto-examen au miroir en carte | existe (`dessin:auto-examen`, 4 ★) ; le héros H3 en est la retouche |
| 10 | Surveillance des zones d'appui (talon, têtes métatarsiennes) | proposé |
| 11 | Lien avec le médecin traitant (bilan transmis) | proposé (risque clipart « document ») |
| 12 | Vérifier l'intérieur de la chaussure avant de l'enfiler | proposé |

## 4. Sources santé (aucun chiffre, aucune promesse dans les images)

- ameli.fr, « Suivi des pieds du diabétique » : inspection quotidienne (miroir ou proche), limer plutôt que couper et couper
  droit, chaussures confortables et adaptées, vérifier l'intérieur, chaussettes appropriées, examen annuel avec test au
  monofilament. https://www.ameli.fr/assure/sante/themes/diabete-adulte/diabete-suivi/suivi-pieds
- ameli.fr, « Comment prendre soin de ses pieds ? » : émollient sauf entre les orteils, chaussettes changées chaque jour sans
  reprise ni trou. https://www.ameli.fr/assure/sante/bons-gestes/quotidien/prendre-soin-pieds
- ameli.fr (pédicure-podologue), « Diabète : prévenir les complications du pied » : séance = examen et gradation du risque, soins,
  éducation, évaluation du chaussage ; bilans transmis au médecin traitant.
  https://www.ameli.fr/pedicure-podologue/exercice-professionnel/prescription-prise-charge/prise-charge-situation-type-soin/situation-patient-diabete
- HAS, fiche outil « Prévention du pied à risque » (parcours diabète de type 2, 2025) ; sites du monofilament repris de
  `SITES_MONOFILAMENT` (pulpe de l'hallux, têtes de M1 et M5).
- Fédération française des diabétiques, « Pied diabétique » : éviter de marcher pieds nus ; température de l'eau, séchage.
  https://www.federationdesdiabetiques.org/information/complications-diabete/pieds

## 5. Intégration

- Inventaire (`illustrations.ts`) : 16 clés `dessin:diabete-<id>:releve|pedagogique` (bases `dessin:diabete-<id>`) et 6 clés
  `heros:diabete-<id>:releve|pedagogique` (bases `heros:diabete-<id>`), statut par défaut « À revoir », sujet « diabète »,
  hashtags `#diabete` + sujet (`kits.ts`), famille de nouveautés « Univers diabète » (`nouveautes.ts`), registre
  `inventaire-connu.json`.
- Premier écran : un héros diabète n'arrive sur un site que s'il est le héros du kit illustré du site (`kitVisuelSite`, praticien
  = visuels VALIDÉS seulement) ; `lib/vitrine.ts` le passe à `VisuelTheme.astro` (`herosDiabete`, habillage commun
  `habillerHeros` de `heros-themes.ts`). Démo : `HEROS_KIT=heros:diabete-miroir:pedagogique PRINCIPAUX=diabete
  COMBINAISON=elegant-sobre,cobalt,pedagogique npx astro build`.
- À faire après l'avis de Paul : trait continu (registre `ligne`), et seulement ensuite une éventuelle animation.
