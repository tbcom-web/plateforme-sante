# Politique d'évaluation unique

Demande de Paul (2026-10-09) : « J'aime les méthodes pour noter / A-B tester, mais je veux le plus possible éviter les RÉPÉTITIONS
d'éléments : quand quelque chose est mauvais, qu'il réapparaisse le moins possible ; que les MEILLEURS éléments et ceux JAMAIS NOTÉS
apparaissent en premier à noter. Je veux qu'on se focalise sur la notation d'assets de qualité et que ça s'améliore à chaque fois avec
les insights que je donne. »

Code : `packages/core/src/politique-evaluation.ts` (politique, pur), `regles-apprises.ts` (règles apprises, pur),
`politique-evaluation-simulation.ts` (preuve chiffrée), tests `politique-evaluation.test.ts`. Admin : `apps/admin/src/lib/politique-evaluation.ts`
(serveur), `components/useExpositions.ts` (navigateur), page `/admin/retours/compris`, section « Évaluation » du tableau de bord.
Données : migration `0054_expositions.sql` (non exécutée).

## 1. Audit (avant la politique)

Chaque surface choisissait seule ce qu'elle montrait, avec sa propre mémoire.

| Surface | Comment elle choisit | Mémoire | Où ça répétait |
|---|---|---|---|
| Tuiles « Donner mon avis » (`prochaineCarte`) | modifiés, puis jamais notés, puis notes incertaines (une seule note), puis le reste, au hasard dans le palier | `vus` de la session seulement, remis à zéro à chaque tuile et à chaque rechargement | « Passer » n'était mémorisé nulle part : l'élément revenait ; tout élément noté une fois était redemandé ; les duels et grilles étaient ignorés |
| Nouveautés à noter | file des jamais notées | session | une nouveauté passée revenait au chargement suivant |
| Arrivages | ordre d'arrivée | aucune (file) | variantes d'un même visuel à la suite ; aucune raison de refus enregistrée, donc rien n'était appris d'un refus |
| Duels (`genererPaireElements`, `genererDuelComposition`) | paires incertaines (σ) et proches, jamais la même paire | historique des duels | le même élément revenait dans de nouvelles paires tant que son σ restait élevé, même après plusieurs défaites |
| Recettes complètes | « Favoris d'abord » + exploration | recettes notées, vues de la session | une recette passée sans note revenait ; les ingrédients non tranchés revenaient d'une recette à l'autre |
| Dégustation (`genererGrille`, `interetElement`) | éléments jamais jugés ou incertains d'abord | tranches (1 ★ / 5 ★) | un élément jamais choisi dans les grilles restait « incertain » et revenait ; « celle qui ne va pas » n'excluait rien |
| Présélection de la chaîne | compositions tirées à l'infini | candidats retenus + session | les designs non retenus n'étaient pas mémorisés ; une page sans choix n'était pas journalisée |
| Tournoi | autour de la frontière du top 10 | grilles du tournoi | élimination après 3 apparitions sans choix, mais seulement dans le tournoi |
| Kits | meilleur kit (rang 0) | « Pas pour ici » par emplacement | les mêmes photos à chaque ouverture |
| Atelier, tri | propositions / statuts | tranches | — |

Croisements : un élément jugé en duel revenait dans les tuiles (elles ne lisaient pas les duels) ; un élément « jamais choisi » dans les
grilles revenait dans les duels et les tuiles ; un design non retenu en présélection pouvait revenir (mêmes éléments).

Mesure (simulation réaliste, § 6, 10 graines × 200 écrans mélangés) : **45,9 % des écrans** montraient un élément (ou une variante du même
visuel) déjà vu dans les 50 écrans précédents. Par surface : Dégustation 77 %, recettes 59 %, duels 53 %, présélection 43 %, tuiles
33 %, kits 16 %, Arrivages 10 %. Qualité vraie moyenne présentée : 2,92 ★ ; 14,3 % d'éléments franchement mauvais (< 2 ★).

## 2. La politique

Réglages (`POLITIQUE_EVALUATION`) :

| Réglage | Valeur | Sens |
|---|---|---|
| `delaiEcrans` / `delaiJours` | 50 écrans / 2 jours | délai de retour d'un élément ET de son groupe visuel, toutes surfaces |
| `kImplicite` | 3 | montré 3 fois sans jamais être choisi → traité comme ≤ 2 ★ |
| `pireImplicite` | 1 | sorti une fois en « celle qui ne va pas » (sans jamais être choisi) → idem |
| `effetImplicite` | −0,75 ★ | rétrogradation dans la génération (pas une interdiction) |
| `seuilPotentiel` | 4 ★ | jamais-noté prioritaire |
| `departageNoteMin`, `departageEcartMin` | 3 ★, 2 | un élément noté ne revient que s'il est bon (≥ 3 ★) ET incertain (une note, ou avis écartés de 2 ★) |
| `ecartDepartage` | 0,25 | écart de force sous lequel un départage peut ignorer le délai |
| `purgeJours` | 180 | purge du journal |

1. **Mémoire commune des expositions** : `expositionsDepuisJournaux` relit ce qui est déjà journalisé (notes des tuiles, de l'atelier,
   recettes, duels, grilles de la Dégustation et de la présélection, tournoi, kits) ; la table `expositions` ajoute ce qui ne l'était
   pas (écran passé sans réponse = `ignore`, décisions des Arrivages et leurs raisons, « Pas pour ici » des kits). Sans la table :
   `localStorage` (180 jours, 500 lignes). Une exposition dans une surface compte partout.
2. **Délai de retour** (`enDelai`) : par groupe visuel ; servi seulement quand rien d'autre n'est disponible (retour forcé, le plus
   ancien d'abord). Une dimension épuisée (17 palettes par exemple) attend son tour (`dimensionsFraiches`).
3. **Signal négatif implicite** (`implicitesNegatifs`) : aucun signal positif (choisi, accepté, noté ≥ 3 ★) et 3 expositions non
   choisies, ou une « celle qui ne va pas ». Ajouté aux tranches (`getTranches` : refusés de TOUTES les files, page « Éléments
   tranchés » avec « Vu sans être choisi » et « Réévaluer »), rétrogradé de 0,75 ★ dans `getPoidsAtelier`. « Réévaluer » efface les
   expositions antérieures. Idem pour une combinaison exacte (`compo:…`, `prop:…`).
4. **Priorité de la file** (`fileEvaluation`, `choisirEcran`) : 0 modifié depuis sa note ; 1 jamais noté à fort potentiel (note
   prédite ≥ 4 par le juge ou par Claude, base d'illustration notée ≥ 4 ★, nouveauté acceptée) ; 2 jamais noté ; 3 départage des bons
   incertains. Jamais : tranchés, exclus, implicites, écartés par une règle, « connus » (notés sans incertitude). Jamais deux éléments du
   même groupe visuel sur un écran.
5. **Déduplication visuelle** (`groupeVisuel`) : illustration de base (variantes de registre, style, contraste, trait continu, héros),
   série de photos (même nom au numéro ou à la taille près), suffixes `@…`, images posées sur un fond.

Branchement par surface :

| Surface | Ce qui change |
|---|---|
| Tuiles et Nouveautés (`Retours.tsx`) | tirage par `fileEvaluation` + `choisirEcran` (prêts d'abord, animations en attente ensuite) ; carte passée = `ignore` journalisé ; tuile épuisée : message au lieu de reposer |
| Duels (`Duel.tsx`) | candidats photo / illustration filtrés (`filtrerCandidatsPolitique`, ≥ 4 gardés) ; duel de composition dont l'élément jugé est bloqué re-tiré (3 essais, puis servi) ; mémoire de la session |
| Recettes complètes | implicites et écartés exclus des recettes générées ; recettes montrées récemment pas reproposées ; recette passée = `ignore` |
| Arrivages | ordre : fort potentiel d'abord, écartés en dernier, jamais deux variantes à la suite (`ordonnerBoiteEntree`) ; raisons de refus (puces) journalisées |
| Kits | suggestions sans implicites ni écartés ; « Pas pour ici » journalisé |
| Dégustation, présélection, tournoi, tri, atelier | implicites via `getTranches` (exclus des grilles, des propositions, des duels) ; présélection : compositions récentes ajoutées aux « déjà vues » |
| Générateur | `getPoidsAtelier` : implicites −0,75 ★, pénalités des règles (cumul plafonné ±1 ★) |
| Sourcing de photos | contraintes des règles actives (saturation, luminosité, mots interdits) |

Reste à brancher (fichiers en cours de modification par un autre agent au moment du travail) : délai de retour et journal des pages
sans choix DANS `Degustation.tsx` et `Preselection.tsx` (côté serveur, ces deux surfaces reçoivent déjà les implicites et la présélection
les compositions récentes).

## 3. Règles apprises (« Ce que j'ai compris de tes retours »)

Catalogue fermé (`CATALOGUE_REGLES`) : densité forte (« trop chargé »), gammes saturées (« couleur criarde »), photos de visage
(écarter), fade, clipart, illisible (typographies fines ou modestes), texte / marque (écarter), anatomie (écarter), trop « stock ».
Chaque règle a ses déclencheurs (étiquettes + mots-clés du commentaire) et sa cible mesurable (profil d'harmonie, saturation de la gamme,
alertes de Claude, hashtags).

- Signaux : notes des tuiles (étiquettes, « ce qui ne va pas »), atelier, recettes (Contre), duels (étiquettes, remarque, « les deux sont
  mauvais »), grilles (« celle qui ne va pas »), Arrivages (raisons de refus), tickets d'avis de la chaîne.
- Support = retours négatifs qui déclenchent la règle ET visent un élément ciblé ; cohérence = support / (déclencheurs + ½ avis
  contraires) ; active si support ≥ 3 et cohérence ≥ 0,5 ; 12 règles au plus.
- Effet = −min(plafond, 0,15 × support) ★ (plafond 0,75 ★, 0,5 ★ pour fade, illisible, stock ; cumul −1 ★ par élément) ou écarter.
- Réversible : « Désactiver » (table `regles_apprises_reglages`, sinon cookie) ; la règle reste listée, sans effet.
- Mots fréquents des critiques non couverts : affichés « pas encore compris », jamais appliqués.

## 4. Indicateurs (tableau de bord)

Taux de répétition (200 derniers écrans, fenêtre 50, objectif < 5 %), qualité moyenne présentée (note connue, sinon base, sinon note
prédite), part de jamais-notés, nombre de règles actives, et pour chaque jour des 30 derniers : répétition, qualité, jamais-notés.

## 5. Données (migration 0054)

`expositions` : journal en ajout seul (clé, surface, écran, résultat, note, étiquettes, texte, auteur et date posés par la base) ;
lecture et ajout : équipe (`est_contributeur()`, admin compris) ; aucune modification ni suppression par l'API.
`expositions_apprentissage()` : lignes sans écran, auteur ni texte pour tout compte connecté. **Purge** : `select public.purger_expositions();`
(admin) supprime les lignes de plus de 180 jours ; aucune tâche planifiée n'est créée (à décider par Paul).
`regles_apprises_reglages` : journal des « Désactiver / Réactiver » (lecture équipe, ajout admin).

## 6. Preuve : « Paul synthétique »

`comparerPolitique()` : ~690 éléments (photos en séries, illustrations de base × 3 variantes, gammes, polices, détails, éléments, 200
designs de la chaîne), qualité vraie connue du seul Paul synthétique, défauts qu'il n'aime pas (densité, couleur saturée, visage), note
prédite pour 60 %, 10 % déjà notés, 60 nouveautés arrivant par 6. 200 écrans mélangés : tuiles 30 %, duels 20 %, Dégustation 15 %,
présélection 10 %, recettes 10 %, Arrivages 10 %, kits 5 %. AVANT : code réel des tuiles (`prochaineCarte`, session remise à zéro toutes
les 20 cartes), des duels (`genererPaireElements`) et de la Dégustation (`genererGrille` + `interetElement`), approximations documentées
ailleurs. Seuls les éléments À JUGER comptent (pas les favoris de contexte).

Résultats (moyenne de 10 graines, 200 écrans) :

| | Avant | Après |
|---|---:|---:|
| Taux de répétition (50 écrans) | 45,9 % | **0,6 %** |
| Qualité vraie moyenne présentée | 2,92 ★ | **3,26 ★** |
| Éléments mauvais (< 2 ★) présentés | 14,3 % | **7,6 %** |
| Jamais notés parmi les présentés | 76,5 % | 77,7 % |
| Précision du top 20 % à 100 / 200 écrans | 51,9 % / 53,8 % | 53,5 % / 55,8 % |
| Concordance du classement à 200 écrans | 0,721 | 0,717 |
| Règles apprises | — | densité forte, gammes saturées |

Lecture : la répétition disparaît (objectif < 5 % tenu), la qualité présentée monte de 0,34 ★ et les mauvais éléments sont deux fois
moins montrés ; l'apprentissage du classement n'est pas ralenti (précision du haut du classement un peu meilleure, concordance globale
égale). Test de non-régression : `politique-evaluation.test.ts` (graines 1 et 2).
