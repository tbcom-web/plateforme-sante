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

## Registres expérimentaux (2026-10-07, brouillons)

Demande de Paul : « une nouvelle planche d'illustrations dans un style RADICALEMENT différent… les mêmes ingrédients ». Quatre
directions, chacune appliquée aux MÊMES cinq sujets, eux-mêmes construits avec les géométries validées (aucun pied redessiné) :
`packages/core/src/styles-experimentaux.ts`.

- **Ingrédients communs** : une composition par sujet = des pièces à RÔLE (peau, peau-2 = second plan du même corps, peau-autre =
  une autre personne, objet, détail d'objet, tissu, ongle, reflet) et des traits (contour, détail). Sujets : pied de profil
  (`piedDeProfil`), ongle de l'hallux (gros plan sain), paire de semelles (`SEMELLE`, `SEMELLE_ELEMENTS`), coureur (`poseCoureur`),
  pieds d'enfant face aux pieds d'adulte (composition du héros « enfant »).
- **Cuisines** (un style traduit les rôles en matières) : `decoupe` Papier découpé, `riso` Risographie, `volume` Volume doux,
  `geometrique` Géométrique graphique — règles dans `FICHES_STYLES` et dans `docs/charte-graphique.md`.
- **Notables** : 20 éléments dans l'inventaire (`illustrations.ts`), clé `dessin:<sujet>:<style>` (sujets : `pied-profil`,
  `ongle-hallux`, `semelle-paire`, `coureur`, `enfant-adulte`), statut « À revoir », tuile **Illustrations** de /admin/retours ;
  vue agrandie en portrait (premier écran téléphone). Sujets par défaut (général, ongles, semelles, sport, enfant) et hashtags par
  défaut (`HASHTAGS_PAR_DEFAUT`, kits.ts) : `#style-<style>`, `#style-experimental` et le sujet — filtre « #style-riso » pour ne noter
  qu'une direction.
- **Non branchés** : ni générateur, ni sites, ni sélecteur de style du Studio. Paul choisit d'abord la ou les directions à
  développer ; ensuite seulement : registre de modèle, fichiers servis (contrôle WebKit), animations (règle 6 : ingrédients validés).
- Contrôles : test `illustrations.test.ts` (20 clés, sans texte ni couleur littérale, hashtags), `controle:charte` (sans texte ni
  `<style>`, variables seulement, ≤ 25 ko compressé par image ; mesuré : 5,4 ko au plus).

## Boucle avec Claude

1. Paul note (niveaux 1 à 3).
2. Export quotidien ou bouton → `retours/` (`SYNTHESE.md`, JSON).
3. Claude lit, corrige (illustrations, règles, kits, recettes) et inscrit chaque changement dans `retours/CHANGEMENTS.md`.
4. Les éléments modifiés reviennent en « avant / après » pour que Paul les note à nouveau.

## Directeur artistique (2026-10-07)

Demande de Paul : « un agent qui sélectionne lui-même les meilleures recettes possibles en changeant les éléments pour que ce
soit vraiment harmonieux […] et s'il voit des manques, il les signale ». Agent : `.claude/agents/directeur-artistique.md`.

- **Méthode** : pour un scénario (sujets + couleurs préférées), il part des propositions du générateur (`lotsPropositions`,
  poids appris des exports) et des combinaisons préférées de `retours/SYNTHESE.md`, puis améliore par **recherche locale** :
  une seule dimension changée à la fois (gamme → paire de polices → style → visuels / photos → structure par page → éléments →
  effets), rendu réel, jugement avec la grille de `juge-gout-paul.md`, on garde si c'est mieux. 15 à 25 essais rendus par
  scénario, journal des essais (score, raisons, décision) dans le scratchpad.
- **Ingrédients** : jamais un élément retiré, « à retravailler » ou noté ≤ 2 ★ quand un équivalent existe ; photos importées
  ET notées ≥ 4 ★ seulement ; garde-fous du core vérifiés à l'œil (AA, diabète sans rouge, posture jamais, mots métier
  insécables, pas d'instrument en premier écran).
- **Rendu** : `node scripts/rendre-recettes.mjs --sortie <scratchpad> <composition.json>…` (site de démo construit avec la recette
  injectée hors de `apps/sites/dist`, `PLAN_OSM=non` ; captures accueil, page sujet et accès en 1440 et 375 px ; planche par
  essai).
- **Livrables** : `retours/recettes-proposees.json` (N meilleures recettes par scénario : composition complète au format du
  Studio, score prédit, raisons « pourquoi c'est harmonieux », réserves, noms des captures, version du profil ; dépôt public :
  rien de personnel) et `retours/MANQUES.md` (manque, impact, proposition, qui, priorité).
- **Studio** (`/admin/atelier/studio`) : section « Propositions de Claude » (lue par l'API GitHub comme `predictions.json`,
  repli sur le fichier local) : « Ouvrir dans le Studio » charge la composition et son scénario, verrous à zéro ; « Enregistrer
  comme recette » l'enregistre sans note (Paul la note ensuite) ; « Pas convaincu » (+ remarque). Section « Manques signalés »
  (`retours/MANQUES.md`) : « À faire » / « Pas utile ». Avis journalisés dans `directeur_avis` (migration 0035, rejouable ;
  sans elle : navigateur + « Exporter mes avis »), exportés dans `retours/directeur-avis.json` : le directeur les lit avant sa
  passe suivante.
- **Circuit d'un manque** : Paul valide (« À faire ») → création par l'agent compétent (graphiste, illustrateur, intégrateur ;
  photos : Paul) → revue dans « Donner mon avis » → implémentation, ligne dans `retours/CHANGEMENTS.md`, manque retiré.
- Le directeur ne crée aucun élément graphique et ne passe jamais rien en « Validé ».

## Recettes complètes : notation et apprentissage automatique (2026-10-08)

Demande de Paul : « on note une recette complète, on donne un avis pour / contre et on peut dire “garder cette recette” […] tout
cela ajoute des éléments de pondération […] sans repasser par Claude ». Tuile **Recettes complètes** (`/admin/retours/recettes`),
module `packages/core/src/notation-recettes.ts`, journal `recettes_notation` (migration 0038).

- **Écran** : bandeau « Vous notez : la recette complète (thème entier) — scénario » et liste compacte des ingrédients (palette,
  polices, typographie, style, premier écran, mise en page, détails, menu, effets) ; aperçus ordinateur + téléphone (côte à côte dès
  1200 px, bascule sinon), page entière défilable, onglets des pages du scénario ; étoiles (1-5), Pour / Contre (champ court +
  étiquettes rapides), « ★ Garder cette recette », « Ouvrir dans le Studio » (`?proposition=<id>` pour Claude, `?generee=<clé>` +
  sessionStorage pour une recette générée), « Suivant » (Entrée). Onglet « Ce que le système a appris » : palmarès par sujet.
- **Garder** (action de Paul) : la recette rejoint « Mes recettes » (table `recettes`, étiquette `gardee`, note donnée ou 5★) et suit
  les règles existantes du parcours (active, note ≥ 4, même scénario d'abord : `recettesPourScenario`). Elle est apprise par sa
  notation, pas une seconde fois comme recette (`getPoidsAtelier`).
- **Source sans Claude** (`genererCandidates`) : pour les scénarios types (`SCENARIOS_TYPES` : sujet n° 1 × couleurs) et ceux des
  recettes de Paul et des propositions de Claude : départ « Tout changer » harmonieux (poids appris compris), puis **recherche
  locale** : un dé à la fois (couleurs, polices, visuels, structure, effets, typographie, détails, menu, traitement, photos, pages
  accueil / soins / accès / cabinet), gardé si l'objectif monte. Objectif = score prédit ; candidates n° 5, 10… (≈ 20 %) =
  **exploration** : score + 2,5 × incertitude moyenne des ingrédients (les moins notés d'abord). Toujours : garde-fous du core
  (`controlerComposition`), aucune règle dure d'harmonie (`violationsDures`), aucun ingrédient **refusé** (`clesRefusees` : statut
  retiré ou à retravailler, assets notés en moyenne ≤ 2 ★, ingrédients de recettes dont la moyenne des signaux est ≤ 2 ★ sur au moins
  deux signaux) ; ingrédients **à valider** (statut « à revoir ») seulement en exploration, signalés sur l'écran. Les propositions de
  Claude (`retours/recettes-proposees.json`) entrent dans la même file (« proposée par Claude ») ; Claude n'est plus nécessaire.

### Formule d'apprentissage (calculée à chaque lecture depuis Supabase)

Pour une note : `d = (note − 3) + 0,5 si « Garder »` (Garder sans étoiles = 5★), poids `w = 1,25 sur mobile (sinon 1) × 1,5 si
gardée`. Pour chaque clé k (ingrédient `<dimension>:<valeur>` des dimensions d'harmonie + `heros:<sujet>` + `photo:<clé>`,
**paire** `<dimA>:<va>&<dimB>:<vb>` de `PAIRES_HARMONIE`, famille de style dominante), globalement ET pour le sujet n° 1 :

| | Lissage K | Plafond |
|---|---|---|
| Ingrédient | 4 | ±0,75 ★ |
| Paire (combinaison) | 6 | ±0,5 ★ |
| Famille | 6 | ±0,75 ★ |

`effet(k) = Σ w·d / (K + Σ w)`, incertitude `σ(k) = 1,2 / √(K + Σ w)`, nombre de signaux affiché.

- **Pour / Contre ciblés** : une étiquette qui nomme une dimension (couleurs, polices, typographie, illustrations, photos, premier
  écran, mise en page, détails, menu, effets) ajoute un signal −1,5 (contre) ou +1 (pour), poids 1, aux SEULS ingrédients de cette
  dimension ; la part négative (resp. positive) de la note n'atteint les autres ingrédients qu'à moitié. « Polices » en contre sur une
  4★ : la paire de polices baisse, la gamme monte. Les paires ne reçoivent que la note. Étiquettes d'ensemble (harmonie, fait pro,
  rendu mobile, trop chargé, fade) : seule la note compte.
- **Clés du générateur** (`renfortsNotations`) : les mêmes notes renforcent les clés atelier / assets de la recette (`clesRecette`),
  `Δ(k) = Σ 0,6·w·d / (K + Σ 0,6·w)`, K = 10 (atelier) ou 4 (assets), plafond ±0,75 ★, mêmes ciblages par préfixe ; cumulées aux
  notes isolées, aux recettes du Studio et aux duels dans la limite de **±1 ★ par clé** (`fusionnerRenforts`).
- **Branchements** : `getPoidsAtelier` renvoie `harmonie` (forme compacte, `apprisHarmonie`) ; `poidsHarmonie` (harmonie.ts) y ajoute
  les effets du sujet n° 1 (familles et ingrédients ±1, paires ±0,75) : tirages du Studio, « Tout changer » (familles, valeurs dans la
  famille, effets de paires avec les valeurs déjà posées), score d'harmonie (±5 points, paires comprises) ; `propositions.ts` ajoute
  `bonusRecettesApprises` (structure × style × gamme, ±1,5 ★) au bonus des praticiens. Toujours derrière les garde-fous et les règles
  dures : les poids ne font que réordonner des valeurs permises.
- **Score prédit** (`scorePredit`, en étoiles, borné 1-5) : `3 + (harmonie − 80) / 20 + 1,2·tanh(A / 1,2) + 0,6 si la gamme suit
  les couleurs choisies par le client` (la recherche locale optimise la valeur avant les bornes), avec `A = 0,35·Σ effets d'ingrédients + 0,35·Σ effets de paires + effet de famille +
  0,15·Σ effets appris de l'atelier` (global + sujet n° 1 ; tanh : beaucoup de petits effets ne saturent jamais le score). Il est enregistré avec chaque note
  (`predit`) pour mesurer l'accord ; l'écran le dit après la note (« Le système prévoyait 3,6★ »).
- **Preuve d'amélioration** (test `notation-recettes.test.ts`, « Paul synthétique » au goût fixé et caché, note = 3 + 1,6 × goût,
  10 tours de 6 recettes pour « Sport, bleu », tout réappris en base à chaque tour) : goût moyen des recettes proposées (hors
  exploration) −0,11 au tour 1 (rien d'appris, ≈ 2,8★) → +0,20 sur les 5 derniers tours (≈ 3,3★), contre −0,17 (≈ 2,7★) pour le
  même générateur sans apprentissage.
- **Sans la migration 0038** : la tuile fonctionne (notes gardées dans le navigateur, « Garder » enregistre quand même la recette).
- **Hors périmètre** pour l'instant : zones « à améliorer » sur l'aperçu de la tuile (elles restent dans le Studio) ; scénarios des
  sites réels (seuls les scénarios types, ceux des recettes de Paul et des propositions de Claude sont générés).

## Studio réorganisé : composer, améliorer, enregistrer (2026-10-08)

Retour de Paul : « le studio devient un peu chaotique… le but étant de créer des recettes élégantes et de les enregistrer,
pas besoin de mettre autant de notes… sélectionner les parties à améliorer en sélectionnant des zones… laisser la possibilité
de bloquer certains éléments ». `/admin/atelier/studio` (Studio.tsx) :

- **En haut** : le client simulé en une ligne (« Modifier » ouvre un tiroir avec SimulateurClient ; « 🎲 Au hasard »), l'état
  de la recette, **À améliorer** (z) et **Enregistrer la recette**.
- **Gauche** : « 🎲 Tout changer » (espace), compteur « n éléments bloqués » + « Tout débloquer », harmonie compacte (score,
  famille, « Corriger », détail replié), zones de la page affichée, puis les dés en **six groupes repliables** : Couleurs ·
  Typographie · Visuels & photos · Premier écran & animation · Structure des pages · Détails & effets. Une rangée par dimension :
  valeur · 🎲 · ← · 🔒 ; le choix direct (liste, styles, traitement, photos) s'ouvre en touchant la valeur ; les axes un à un
  (typographie, détails, menu, autres pages, éléments de page) sont sous « Réglage fin ». « Notes détaillées » (étoiles et
  étiquettes par page, Rendu mobile, notes d'éléments) : repliées, facultatives.
- **Registre des dimensions** (`packages/core/src/studio-organisation.ts`, `groupeDeCle`) : chaque dé est rangé par le préfixe de
  sa clé de verrou (`composant:accueil`, `composant:transition`, `composant:sections`, `composant:entete*`, `animation` →
  Premier écran & animation ; `page:*`, `composant:*`, `menu` → Structure ; `hab:typo:*` → Typographie…). Un nouveau dé se
  range seul (ex. `composant:entete-anim`).
- **Droite** : onglets des pages (pastille = nombre de zones, 🔒 de la page affichée), aperçus ordinateur + téléphone côte à
  côte ; « Options d'aperçu » (défilement synchronisé, page entière, animer, rejouer).
- **À améliorer** : on trace des rectangles sur l'aperçu ordinateur ou téléphone ; chaque zone reçoit une étiquette rapide
  (Trop chargé, Illisible, Mal aligné, Couleur, Image, Espacement, Typographie, À revoir — `ETIQUETTES_ZONE`, zones.ts) et une
  précision facultative ; zones gardées par page et par appareil en changeant d'onglet, en surimpression, supprimables.
- **Enregistrer** : nom proposé, **une appréciation facultative** (Élégante / Correcte / À revoir), zones jointes
  automatiquement ; « Notes détaillées » (1 à 5 ★, étiquettes, va / ne va pas) repliées. Anciennes recettes : note et remarques
  relues et conservées (une note 4 reste 4 tant qu'on ne choisit pas d'appréciation).
- **Bas** : Mes recettes (vignettes, filtre « Avis ») et Manques signalés, en onglets. Les propositions de Claude se notent dans
  `/admin/retours/recettes` (lien compact en haut du Studio) et s'ouvrent ici par `?proposition=<id>`, `?recette=<id>`,
  `?generee=<clé>` ou l'événement `studio:ouvrir-proposition`.
- `/admin/atelier` : deux portes (Composer une recette → Studio ; Noter au hasard → Donner mon avis), tendances repliées.

**Apprentissage (correspondance plafonnée)** — aucune migration :

| Geste | Stocké | Effet sur les poids |
|---|---|---|
| Élégante | `recettes.note = 5` (+ journal `recettes_notes`, page nulle) | renfort de chaque ingrédient de la recette : Δ = Σ 0,4·w·(note − 3) / (K + Σ 0,4·w), plafonné à ±0,75 ★ (`renfortsPoids`) ; harmonie ±0,75 ★ ; recette ≥ 4 en tête de /creer |
| Correcte | `note = 3` | neutre (3 = moyenne de référence) : aucun renfort |
| À revoir | `note = 2` | affaiblit un peu chaque ingrédient (même formule, même plafond) |
| Sans avis | `note` inchangée (nulle pour une nouvelle recette) | aucun |
| Zones d'une page (un appareil) | `composition.ameliorations` (onglet, page, appareil, zones) + une ligne `recettes_notes` (page, appareil, zones, **note 2**) | une seule note de page **2 ★ par page et par appareil, quel que soit le nombre de zones** (`NOTE_ZONES_PAGE`), qui ne touche que les clés de cette page (`clesPage` : structure, ordre de l'accueil, variantes de ses sections), au poids de l'appareil (mobile 1,25) ; plafond ±0,75 ★ ; journalisée seulement si les zones de cette page et de cet appareil ont changé depuis le dernier enregistrement (`ameliorationsNouvelles`) |

Export : les lignes `recettes_notes` avec zones partent dans `retours/recettes-notes.json` et dans la section « Zones » de
`SYNTHESE.md` (une ligne par zone), comme avant.

## Atelier : combinaisons complètes, page entière (2026-10-08)

Retour de Paul : « je ne vois pas dans les combinaisons les nouveaux headers… difficile de voir la totalité de la page […] on voit
juste le hero ». `/admin/atelier` (Atelier.tsx) :

- **Combinaisons complètes** (`packages/core/src/atelier-compositions.ts`, `compositionAtelier`) : la proposition du générateur des
  praticiens fixe structure, gamme, style, animation et héros ; tous les autres dés du Studio sont lancés, dérivés du registre
  (`desAtelier` : dimensions de `DIMENSIONS_RECETTE` non fixées, un dé par type de page `PAGES_STRUCTURE`, un dé par famille
  `FAMILLES_COMPOSANTS`) — premiers écrans photo et organiques, animations d'en-tête, transitions, portraits des praticiens,
  polices, typographie, détails, menus, effets, traitement des photos. Aucune liste figée : un nouveau dé ou une nouvelle famille
  entre seul. Tirages par les fonctions du Studio (harmonie active, pondération inchangée), puis règles dures corrigées
  (`corrigerHarmonie`) ; déterministe. Ingrédients « à valider » tirés (badge sur la carte) : seul le générateur des praticiens
  les exclut. Test : `atelier-compositions.test.ts` (toute dimension du registre apparaît dans une combinaison).
- **Notés avec la combinaison** : `ingredients.reglages` (clés atelier `police=`, `variante=accueil:…`, `variante=entete-anim:…`,
  `typo=`, `details=`, `menu=`, `effets=`, `traitement=`) ; chaque réglage est un ingrédient de l'apprentissage (`clesAtelier`).
  Sans réglages (notes antérieures) : clé de combinaison inchangée.
- **Aperçu de la page entière** : ordinateur et téléphone côte à côte (ApercusCoteACote du Studio), défilement dans le cadre,
  « Options d'aperçu » (page entière réduite, défilement synchronisé, animer), onglets des pages du scénario ; zones (z). Sur
  téléphone : un rendu à la fois avec bascule, cadre défilant.

## Favoris d'abord, exclusion stricte et kits d'images (2026-10-08)

Demandes de Paul : « pousser plus de belles photos dans les thèmes à évaluer […] mettre en avant le plus possible les éléments
notés le mieux » ; « je ne veux pas qu'il me présente dans des thèmes complets des photos que j'ai notées 1 étoile […] des kits
d'images par thème à partir des notes et des tags ».

### Mode de tirage (`favoris.ts`)

Réglage **Favoris d'abord · Équilibré · Découverte** (défaut : Favoris d'abord), dans le Studio et la tuile Recettes complètes,
gardé par navigateur (`localStorage` `tirage:mode`). Poids d'une valeur dans un tirage (couleurs, polices, style, structure, pages,
éléments, effets, traitement, typographie, détails, menus ; tirages harmonieux compris) :

| Mode | Valeur notée | Jamais notée | Exploration du générateur |
|---|---|---|---|
| Favoris d'abord | 2^(3 · effet) | 0,15 | 10 % |
| Équilibré (= avant) | 2^effet | 1 | 20 % |
| Découverte | 2^(0,5 · effet) | 1,6 | 35 % |

Toujours exclues (poids 0) : statut « retiré » ou « à retravailler », note estimée (moyenne + effet) ≤ 2 ★. Mesuré (test) : le top 3
des polices notées fait 65 % des tirages en Favoris d'abord, contre 16 % en Équilibré. Les dés du Studio n'explorent pas en Favoris
d'abord ; l'exploration se fait dans le générateur de recettes à noter (candidates badgées « exploration », tirées en mode Découverte)
ou en choisissant Découverte. Duels : `candidatsDuelFavoris` (core, à brancher dans Duel.tsx) oppose les éléments notés au-dessus de la
moyenne, avec ≈ 10 % de duels de découverte ; les duels de thèmes passent par les dés, donc par le mode.

### Photos les mieux notées d'abord

`classerPhotos` / `tirerPhotosFavorites` : photos du sujet n° 1 notées en moyenne ≥ 4 ★, puis ≥ 3,5 ★ (triées par effet appris), puis
non notées, puis les meilleures des autres sujets du scénario et de « général » (complément) ; premier écran en rotation parmi les
4 meilleures. `manquePhotosNotees` : « Peu de photos notées pour Diabète » (moins de 3 photos ≥ 3,5 ★). Notes brutes des photos :
`PoidsAtelier.notesPhotos` (getPoidsAtelier).

### Exclusion stricte (`contexte-images.ts`)

Exclue = moyenne ≤ 2 ★, **dernière** note ≤ 2 ★, « retirée » ou « à retravailler » (photos, héros, dessins, traits, pictos,
matériel). Registre posé une fois (admin : layouts `/admin`, `/creer`, `/edition`, `/mon-site` → `ContexteImages` ; sites : chargement
Supabase du site) et lu par tous les chemins qui posent une photo : `fusionnerPack` (pack de spécialité, personnalisation, jeu de
photos), `jeuVisuel` / `completerJeuVisuel` (premier écran, panorama, galerie, soins, couvertures), `persoDuJeuPhotos`,
`appliquerRecette`, `photosCompatibles` / `tirerPhotos`, kits, photos de recette des sites. Une photo exclue est remplacée par la
suivante non exclue, sinon l'illustration. Test : `kits-images.test.ts` échoue si une photo exclue sort d'un seul de ces chemins.

### Kits d'images par sujet (`kits-images.ts`, vue `/admin/retours/kits`)

Pour enfant, sport, senior, diabète, ongles, semelles, pédicurie et général, composé en direct (banque : photos importées et
intégrées, jamais « à valider ») : premier écran, page sujet, une photo par soin du sujet, galerie du cabinet (4). Score d'une photo
pour un emplacement : `3·(4 − palier) + 3·effet + (note ou 3) + 2,5·étiquette` (étiquette : `#accueil`, `#cabinet`, `#<slug du soin>`
= 3, `#fiche-soin` = 1). Un soin n'a une photo que si elle est étiquetée (`#<slug>` ou `#fiche-soin`), sinon **trou** signalé et
l'illustration reste. Pas de doublon ni de photo de la même série ; traitement photo commun (le mieux noté) ; héros illustré le mieux
noté. Complément « général » affiché. Rotation (« Autre kit ») ; « Garder ce kit » le fait passer en premier ; « Noter ce kit »
renforce chaque photo du kit (`renfortsKits` : ±0,5 ★, cumul plafonné ±1 ★). Le kit passe avant les photos par défaut de la
spécialité (après une personnalisation explicite) et suit le premier écran dans les tirages ; sites en style « Photos » : kit du
sujet n° 1, avant un jeu de photos partagé (un jeu exclusif du site reste prioritaire). Migration 0039 (`kits_images_notes`).

### Compléter un kit : suggestions (`suggestions-kits.ts`, 2026-10-08)

« Il faut que le tool suggère des photos à ajouter au kit. » Dans `/admin/retours/kits`, compteur « Kit Enfants : 7/10 emplacements
avec une photo ≥ 4 ★ » et bouton **Compléter ce kit** : les emplacements vides, faibles (photo non notée ou < 3,5 ★) ou complétés
par « général » défilent un par un (clavier : U utiliser ici, G garder, X pas pour ici, ↑ ↓ suggestion, → emplacement suivant).

- **Banque d'abord** (`suggestionsBanque`) : photos importées ou intégrées, jamais exclues (≤ 2 ★, retirées, à retravailler), ni
  déjà dans le kit ou étiquetées pour l'emplacement. Score = 3 (même sujet ; 1,5 voisin ; 1 « général ») + 2 par mot de
  l'emplacement retrouvé dans ses hashtags, son nom ou sa requête d'origine + 2·(note − 3) + 3·effet appris. **Utiliser ici** ajoute le
  sujet et le hashtag de l'emplacement (`#<slug du soin>`, `#accueil`, `#cabinet`, `#page-sujet`) dans `assets_sujets` /
  `assets_hashtags` : le kit se recompose. **Pas pour ici** est mémorisé pour CET emplacement (`classement_suggestions`, contexte
  photos, nature hashtag, raison `kit-pas-ici:<clé>` : aucune migration).
- **Nouvelles** (Pexels / Pixabay, clés serveur, limites de débit et cache existants) : requêtes ciblées par soin et emplacement
  (`REQUETES_SOINS`, `REQUETES_PAGES`, `REQUETES_CABINET` : orthonyxie → « toenail brace », verrues → « plantar wart foot »,
  cabinet → « podiatry clinic interior »… ; test : toujours un mot du métier), tirées par couverture (`choisirRequete`).
  **Garder** = flux existant (`deciderPhoto`, lien seulement) avec le sujet, `#<emplacement>` et `#kit-<sujet>` pré-cochés ; la
  photo apparaît « en attente d'import » dans le kit et EN TÊTE de `/admin/photos` (« pour le kit Enfants · orthonyxie ») ; elle
  entre dans le kit après « Valider et importer » (les hashtags suivent la photo à l'import).

### Deux couches : curation → assemblage (2026-10-08)

« D'abord on curate les bonnes images, ensuite à partir des images curated on assemble. »

- **Couche 1 — curation** (Photos à découvrir, tri par sujet, notes, `/admin/photos`) : une photo entre dans le **vivier curé**
  d'un sujet (`estCuree`, `vivierCure`, kits-images.ts) quand Paul l'a retenue (jeu de photos, photo libre gardée ou importée,
  photo intégrée) ET étiquetée avec ce sujet (`assets_sujets`, ou hashtag `#<sujet>`), jamais si elle est exclue (moyenne ou
  dernière note ≤ 2 ★, retirée, à retravailler) ou retirée du sujet.
- **Couche 2 — assemblage** : le kit et « Compléter ce kit » ne piochent QUE dans le vivier (photos importées pour le kit ; sinon
  trou, l'illustration reste). Suggestions par emplacement (`suggestionsVivier`) : (1) notées ≥ 4 ★ avec le hashtag de
  l'emplacement, (2) notées ≥ 3,5 ★, (3) pas encore notées — notation rapide en ligne (1-5, `assets_notes` : ≤ 2 ★ la fait sortir),
  (4) moins de 3,5 ★ ; seulement si rien : (5) vivier d'un sujet voisin, signalé. Photo gardée non importée : « Importer et
  utiliser » (même import que `/admin/photos`). Plus de recherche Pexels / Pixabay dans la file : « Vivier Enfants : 3 photos
  curées, aucune pour orthonyxie → Trouver des photos » ouvre Photos à découvrir pré-filtré (sujet, requêtes ciblées de
  l'emplacement, `#<emplacement>` et `#kit-<sujet>` pré-cochés), avec « ← Retour au kit ». En tête de la vue : l'état du vivier de
  chaque sujet (« Enfants : 14 photos curées · 9 notées ≥ 4 ★ · 3 non notées · emplacements couverts 6/9 »).
- **Le vivier ne démarre pas vide** (`photosARattacher`) : les photos déjà notées ≥ 4 ★ qui ont un sujet IMPLICITE (spécialité du jeu de photos, catégorie de la photo intégrée, sujet de la photo libre) sans y être rattachées par Paul sont listées dans la vue des kits et dans « Trier par sujet » (« Photos que vous avez déjà notées ≥ 4 ★ mais sans sujet : 23 »), sujet le plus précis pré-coché ; « Valider tout » / « Valider la sélection » (le bouton annonce « +9 Enfants, +5 Sport ») enregistre des ajouts dans `assets_sujets`, rien d'automatique. Dans « Compléter ce kit », quand le vivier du sujet est épuisé, ces photos passent AVANT le vivier d'un sujet voisin (« Notée 4 ★, pas encore rattachée à Enfants » → « Rattacher et utiliser »).
- **Photos 4-5 ★ partout** (registre `contexte-images.ts`, `vivier` : URLs du vivier curé notées ≥ 4 ★ par sujet, posé par
  `ContexteImages`) : les tirages de photos (`tirerPhotos` : Studio, atelier, recettes à noter, duels de thèmes) n'utilisent que
  ces photos ; le style « Photos » est tiré nettement plus souvent quand le sujet n° 1 en a au moins `VIVIER_PHOTOS.seuil` = 3
  (dés : part visée `VIVIER_PHOTOS.part` = 50 % ; tirages harmonieux : facteur 6 et conseils souples qui retireraient la photo
  ignorés, règles dures intactes) et jamais sinon. Atelier : `avecPartPhotos` fait passer les propositions compatibles en style
  photo jusqu'à ≈ 50 % ; vivier insuffisant : « Peu de photos 4-5 ★ pour Enfants (2) → Compléter le vivier ». Mesuré (test) :
  vivier de 5 photos → 9/18 combinaisons de l'atelier en photo, toutes leurs photos dans le vivier ; Studio « Tout changer »
  7/60 → 33/60 en style photo.

### Kits multi-visuels : illustrations, icônes, animations (`kits-visuels.ts`, 2026-10-08)

« Les kits d'images peuvent aussi contenir des illustrations taguées avec semelles, etc. ; idem pour les animations. »

- **Vivier** (`estCureVisuel`, `vivierVisuels`) : tous les visuels de l'inventaire (dessins, traits continus, héros, matériel, styles
  expérimentaux, kit sport, pictos / icônes, animations ; aucune liste figée) rattachés par Paul au sujet (`assets_sujets`, `#<sujet>`)
  ou à l'un de ses soins (`#<slug>`), jamais exclus (moyenne ou dernière note ≤ 2 ★, retirés, à retravailler) — note et statut
  HÉRITÉS de la base pour une variante (`noteHeritee`, `statutEffectif`). État par type : « Semelles : 4 illustrations, 7 icônes,
  1 animation, 2 photos ».
- **Kit** (`composerKitVisuel`) : un seul style d'illustration (registre le mieux fourni et noté du vivier, ou celui imposé),
  héros illustré, illustration de la page sujet et de chaque soin, icône par soin et pour les infos pratiques, animation d'en-tête
  et animations de soin ; une variante n'est jamais un doublon de sa base. Praticiens : visuels « validés » seulement, animations
  seulement quand toutes leurs images de base sont validées ; Paul voit les « à valider » avec badge.
- **Vue des kits** : onglets Photos · Illustrations · Icônes · Animations (animations jouées ~6 s puis en pause, rejouées au survol :
  même budget que les aperçus) ; « Compléter ce kit » propose aussi illustrations, icônes et animations du vivier pour les
  emplacements vides (même ordre que les photos : ≥ 4 ★ étiquetés, ≥ 3,5 ★, non notés avec notation en ligne, bien notés à rattacher,
  puis sujet voisin) ; le bloc « déjà notés ≥ 4 ★ mais sans sujet » inclut illustrations, icônes et animations.
- **Utilisation** (`kitVisuelCompact` → registre `contexte-images.ts`) : le dessin du kit pour chaque soin prime sur le dessin par
  défaut, l'animation d'en-tête du kit sur celle de la spécialité (`jeuVisuel`) — Studio, atelier, recettes à noter, duels de
  thèmes ; `/creer`, `/edition`, `/mon-site` et sites générés (`kitVisuelSite`) : éléments validés seulement.

### Éléments tranchés : 1 ★ et 5 ★ (2026-10-08, `tranches.ts`)

Règle de Paul : « Si un élément a été noté 1 étoile, il n'apparaît plus (idem pour une combinaison exacte). Idem pour un élément ou
une combinaison noté 5 étoiles, je ne veux plus qu'il apparaisse, sinon on répète tout le temps les mêmes choses. »

- **Refusé** (dernière note 1 ★, ou moyenne ≤ 1,5 ★ ; combinaison exacte notée 1 ★ ; duel « les deux sont mauvais » : les deux
  compositions) : plus jamais à évaluer, ni dans aucune composition — registre `contexte-images.ts` (tous types d'éléments : polices,
  gammes, éléments, typographie, photos, illustrations…), lu par les tirages du Studio, de l'atelier, des recettes, des duels, des kits,
  de /creer et des sites.
- **Favori** (dernière note 5 ★ ou « Garder ») : plus jamais proposé à l'évaluation (Donner mon avis, tri, recettes complètes, atelier),
  toujours tiré comme favori dans les compositions. Duels : une paire déjà jugée n'est jamais reposée ; un favori n'apparaît plus
  qu'en **Champion** face à un élément jamais jugé (≈ 10 % des duels, `PART_CHAMPION`, signalé « Champion »).
- **Noté 2-4 ★** : ne revient qu'après tous les jamais notés, ou s'il a changé (nouvelle version : empreinte différente).
- Compteur « Il reste N éléments jamais notés » sur l'accueil de Donner mon avis ; page **Éléments tranchés**
  (`/admin/retours/tranches`, filtrable par état et par type) avec **Réévaluer** (migration 0041, `elements_reevalues` : les notes
  antérieures sont ignorées par la règle, l'élément revient dans la file jusqu'à sa prochaine note). Pour les sites et /creer, la
  réévaluation d'un 1 ★ ne prend effet qu'à sa prochaine note (lecture sans dates côté praticiens).
- Hors règle pour l'instant : kits notés en bloc (« Noter ce kit ») ; la notation en ligne de « Compléter ce kit » montre les favoris
  comme photos à utiliser, sans les redemander.

## Objectif : des compositions 100 % 4-5 ★ (2026-10-08, `qualite.ts`)

Objectif de Paul, qui oriente tout le système : « arriver progressivement à des compositions qui contiennent uniquement des éléments
notés 4 ou 5 étoiles ».

- **Jauge** (`qualiteComposition`, composant `JaugeQualite`) : « 9/12 éléments 4-5 ★ · 2 jamais notés · 1 à 3 ★ », détail élément
  par élément au survol. Éléments comptés : palette, modèle, héros, photos, éléments de sections, jeu d'effets, traitement des photos,
  polices et habillage (pas les structures de page agrégées ni les combinaisons). Une variante sans note propre prend la note de sa
  base. Affichée dans le Studio, l'atelier, les recettes à noter et les duels de thèmes ; sur la fiche d'un site praticien
  (`/admin/sites/[id]`, `elementsDuSite` + `qualiteCles`).
- **Un seul nouveau à la fois** (`versQuatreCinq`) : une composition À ÉVALUER (recettes complètes hors exploration, atelier, socle des
  duels de thèmes) relance chaque dé dont les éléments ne sont pas tous 4-5 ★ et garde le tirage qui laisse le moins d'éléments à
  juger, jusqu'à n'en laisser qu'UN : la note de la composition renseigne alors sur cet élément, signalé « Nouveau à juger : … ».
  Une dimension sans aucun 4-5 ★ garde son tirage (le mieux noté par les poids habituels) et reste signalée. Jamais d'élément ≤ 2 ★
  (exclusions inchangées). Atelier : la proposition notée (palette, visuels, photos) n'est pas relancée, seulement ses réglages.
- **Studio, Favoris d'abord** : même relance avec zéro élément à juger (`maxNouveaux: 0`), dés verrouillés respectés ; les éléments
  restés sous 4 ★ sont signalés « Pas encore de 4-5 ★ pour : … ».
- **Tableau de progression** (accueil de Donner mon avis, `tableauProgression`) : par dimension (palettes, polices, chaque axe de
  typographie, détails, menus, éléments, effets, icônes, illustrations par registre, photos par sujet…), nombre d'éléments 4-5 ★
  disponibles ; **couverte** à partir de 2. « Compositions 100 % 4-5 ★ possibles : X % des dimensions couvertes » et « Prochaines
  priorités à noter » (les plus proches de la couverture d'abord), chacune avec un lien vers la tuile qui les fait noter.
- **Praticiens** (/creer, sites) : règle inchangée (éléments validés, jamais ≤ 2 ★) ; le taux 4-5 ★ du site est seulement exposé.
- Limites : les notes lues sont celles des éléments (assets_notes) ; un élément 4-5 ★ « réévalué » reste compté jusqu'à sa prochaine
  note ; les kits n'ont pas encore de jauge.

## Feuille de route

- [x] Niveau 1 : notes, étiquettes, export, apprentissage (`assets-poids.ts`), atelier des combinaisons (`atelier-poids.ts`).
- [ ] Niveau 1 : avant / après, champs libres « va bien / ne va pas », sujets tagués, inspirations, flux de photos libres.
- [ ] Niveau 2 : kits de visuels par sujet (proposés par Claude d'après les notes ; Paul garde, retire ou remplace) ; les générateurs puisent dans les kits. Premier kit déclaré : « Sports » (2026-10-07, brouillon, voir ci-dessous).
- [x] Niveau 3 : recettes nommées — **Studio de recettes** (`/admin/atelier/studio`, 2026-10-07) : dés 🎲 / ← / 🔒 par dimension (couleurs : 17 gammes ou couleur libre AA ; polices : 9 paires `PAIRES_POLICES` ; visuels : style, héros ; photos de la banque ; structure : modèle, ordre de l'accueil, un dé par type de page et par élément, forme des cartes ; effets : Sobre, Doux, Vivant, Éditorial), raccourcis c p v f s e et espace ; « Enregistrer cette recette » (table `recettes`, migration 0032) ; « Mes recettes » (ouvrir, dupliquer, archiver). Les recettes notées ≥ 4 du sujet n° 1 passent en premier dans « Votre site » (/creer), puis le générateur ; le brouillon garde `theme.recette` et ses réglages (police, variantes, ordre, héros, photos, effets) que le site publié applique.
- [x] Recettes complètes notées (2026-10-08, tuile `/admin/retours/recettes`, migration 0038) : générateur sans Claude, apprentissage en direct des ingrédients et de leurs combinaisons, palmarès (voir ci-dessus).
- [x] Apprentissage croisé : une recette (ou une combinaison de l'atelier) notée renforce ou affaiblit un peu chacun de ses ingrédients (`renfortsPoids`, recettes.ts : 0,4 note par ingrédient, lissage existant, plafond ±0,75 étoile) ; « Ce que vos avis ont changé » le dit.
- [x] Notables comme ingrédients (assets_notes, migration 0032) : structures de pages `structure:<page>:<variantes>`, éléments `composant:<famille>:<variante>` (horaires, plan d'accès, galerie, questions, équipe, soins, forme des cartes…), jeux d'effets `effets:<id>` — notés depuis le studio (« Noter les éléments affichés »).
- [x] Lot 1 des éléments notables (2026-10-07) : horaires (tableau, bandeau, carte, liste), plan d'accès (adresse et itinéraire, notice et plan, colonnes ; plan SVG statique d'OpenStreetMap, jamais de tuiles ni d'iframe), galerie du cabinet (mosaïque, diaporama au doigt en scroll-snap sans script, grande photo, bande de quatre), rendez-vous et contact (`contact` : barre d'actions, bandeau « Écrire au cabinet », carte de contact, bouton flottant ; liens seulement), formes des cartes (bulles, gros carrés, arrondies, mosaïque, pastilles, organiques, tuiles pleine couleur, sans cadre). Tuiles « Structures de pages » (165 structures), « Éléments » (40, filtre par famille) et « Effets » (4) dans /admin/retours : `inventaireStudio()` (assets.ts), aperçu de l'élément seul (`ApercuStudio`, `seul` d'ApercuGabarit, `compositionPourCle` / `blocsPourCle`), mêmes étoiles, étiquettes du studio, export ; avant / après par empreinte de la feuille CSS pour les effets et les formes (avant-apres.ts, `empreinteStudio`).
- [x] Lot 2 (2026-10-07) : structures de la fiche d'un soin (`fiche` : encadré à côté, une colonne, encadré « En pratique » en tête) et des actualités (`actualites` : liste, cartes, le dernier à la une), pied de page en 3 variantes (`pied` : trois colonnes, centré, nom du cabinet en grand) ; un dé par type de page dans le studio (accueil, soins, fiche d'un soin, contact et accès, cabinet, questions, actualités), aperçu de la fiche dans Donner mon avis (`vuePourCle`).
- [x] Par page et par appareil (2026-10-07, migration 0034) :
  - **Studio par page** : onglets Accueil, Page sujet, Fiche soin, Article de blog, Actualités, Cabinet, Contact et accès, Questions, Soins (`ONGLETS_PAGES`, recettes.ts) ; pour chacun l'aperçu de CETTE page (sujet n° 1 du scénario, article de démonstration `ARTICLE_DEMO`, pages-demo.ts), son dé, son verrou 🔒 (`page:<id>` : verrouiller Contact sans verrouiller l'Accueil), sa note (étoiles, étiquettes, va bien / ne va pas) en plus de celle de la recette : `recettes_notes.page` (recette enregistrée) sinon la structure de la page dans `assets_notes`. Une note de page ne renforce que les clés de sa page (`clesPage`, `sourcesNotesPages`).
  - **Variantes propres** de la page sujet (`theme` : liste, rangées, héros pleine largeur, deux colonnes) et de la page article (`article` : standard, lecture centrée image en tête, image latérale, chapô en grand et sommaire ; mesure 68ch, interligne 1,7 partout), tous gabarits, même balisage et mêmes titres (feuille de style seule ; ancres des intertitres pour le sommaire : `sommaireMarkdown`, `ancrerIntertitres`), rendues aussi par l'admin (`ApercuPages.tsx`).
  - **Ordinateur ET mobile** partout où l'on note (cartes de /admin/retours, atelier des thèmes complets, studio : `DoubleRendu`) : côte à côte sur grand écran, bascule sur téléphone ; la note du CHOIX garde l'appareil regardé (`appareil` : ordinateur, mobile, les-deux ; antérieures = les-deux). Apprentissage : une note donnée sur mobile pèse 1,25 (mobile d'abord, `POIDS_APPAREIL`), les autres 1 : sans note mobile, poids inchangés.
  - **Rendu mobile** à part (`RenduMobile`, table `defauts_mobile`) : ✓ Mobile OK / ✗ Mobile à revoir, étiquettes mobiles (texte trop petit, trop long à faire défiler, boutons trop petits, image coupée, colonnes trop serrées, ordre des blocs, menu gênant ; parfait sur mobile), remarque, note mobile facultative, zones. Un défaut d'adaptation ne pénalise jamais le choix ni ses ingrédients : il est rattaché à la variante, au composant ou à la page, alimente la liste « Rendu mobile à revoir » (/admin/retours, SYNTHESE.md, `defauts-mobile.json`) et, tant qu'il est ouvert, fait seulement passer la variante après les autres pour les praticiens (`FACTEUR_DEFAUT_MOBILE`, `recettesPourScenario`). Correction : feuille responsive, puis `VERSIONS_MOBILE` incrémenté → « Modifié (mobile) » à revalider ; « Mobile OK » clôt les défauts.
  - **Zones** (`AnnotateurZones`, zones.ts) : mode « Signaler une zone » (z, Échap), rectangle ou ellipse, étiquette (à revoir, anatomie, trop petit, couleur, texte, alignement, coupé), commentaire court, déplacer / supprimer, zoom ×2 ; coordonnées normalisées 0-1 avec appareil, empreinte, page et largeur ; colonne `zones` des trois journaux et de `defauts_mobile` ; surimpression dans l'avant / après (« Avant : vos zones ») et la liste mobile ; export (JSON, une ligne par zone dans SYNTHESE.md) ; `scripts/rendre-assets.mjs --zones`.
- [ ] À suivre : prédictions du juge par appareil et pour les structures, éléments et effets ; aperçu « avant / après » téléphone des défauts mobiles corrigés (aujourd'hui : rendu actuel et zones notées) ; formulaire de contact (pas de formulaire aujourd'hui : stockage, RGPD et anti-spam à décider par Paul — en attendant « Écrire au cabinet » reste un lien e-mail).
- [x] Nouveaux premiers écrans (2026-10-07, demande de Paul + veille 2026) : `accueil` = photo plein écran (texte à gauche, centré, en bas), diaporama plein écran, photo d'un côté / texte de l'autre (variantes à photos : seulement en style « Photos »), typographique (couleur forte, mots des soins qui arrivent un à un), dégradé maillé et visuel masqué, bento ; tous gabarits, classique compris (absent = premier écran du modèle). Sous-ingrédients avec dé et verrou : `transition` du diaporama (fondu, Ken Burns, glissement, volet, rideau, fondu flou ; seulement si les photos défilent) et `sections` (transitions entre sections : vague, chevauchement, révélation au défilement, cartes des sujets empilées). Balisage et CSS uniques dans `packages/core/src/heros-photo.ts` (site : `HerosPhoto.astro` ; admin : `ApercuHerosPhoto.tsx`) ; première photo = LCP (préchargée, fetchpriority), suivantes après `load` ; voile calculé AA ; notables (`composant:accueil:*`, `composant:transition:*`, `composant:sections:*`, `structure:accueil:*`).
- [x] Premiers écrans, lot 2 « couleurs / formes organiques », et animations d'en-tête (2026-10-08, retour de Paul : « j'adore les nouveaux styles de hero couleurs / formes organiques, il faut continuer… d'autres animations stylisées minimalistes et très dynamiques qu'on peut intégrer au header ») : `accueil` + 10 variantes (`heros-organiques.ts` : photo en papier découpé, duo de taches, arche, courbe de la voûte ; sans photo : aplats en papier découpé, tache qui se déforme, dégradé maillé animé, forme qui respire, bandes ondulantes, aplat en courbe de voûte) et sous-ingrédient `entete-anim` (`entete-anim.ts` : trait de voûte, points de pression, foulée, onde au sol, taches, mots des soins, pas abstraits, rubans, formes géométriques, lueur ; < 3 Ko chacune, transform / opacity seulement, image fixe sans script ni avec « réduire les animations », lecture ≤ 5 s à l'affichage, au retour à l'écran et au survol). **Ingrédients « à valider »** (`INGREDIENTS_A_VALIDER`) : libellés « (à valider) » dans le Studio, tuiles de « Donner mon avis » qui jouent l'animation, duels « Éléments » (un sur trois porte sur eux) ; jamais tirés ni proposés aux praticiens (`ContexteRecette.praticien`, `recettesPourScenario(…, { praticien: true })` dans /creer) tant que Paul ne les a pas validés (passer leur clé dans `valides`, puis la retirer de la liste). Notables : `composant:accueil:*`, `composant:entete-anim:*` (aucune migration).
- [x] Présentation des portraits des praticiens (2026-10-08, retour de Paul : « c'est tout le temps des petites images mini ; on pourrait imaginer des plus grands portraits, plus petits, côte à côte, joli voile overlay… à ajouter aux éléments à noter / A-B tester ») : variante de section `portraits` (tous gabarits, classique compris ; bloc praticiens de l'accueil ET de « Le cabinet ») : sobre (rendu historique, par défaut), grand portrait éditorial, plein cadre et voile (voile de la couleur sombre de la gamme, AA calculé), côte à côte même hauteur, mosaïque décalée, forme organique, cercle et anneau, tirage à bordure, bandeau qui défile au doigt, portrait sur aplat. HTML et CSS uniques dans `packages/core/src/portraits-praticiens.ts` (site : `PortraitsPraticiens.astro` ; admin : `ApercuPortraits.tsx`) ; mêmes contenus et mêmes titres (H3 par praticien), srcset des rendus du studio portrait, dimensions fixées, chargement différé, traitement photo de la recette, monogramme sans photo ; 1, 2, 3 et 4+ praticiens (requêtes de conteneur). Étiquettes d'harmonie (`v.portraits:*`), forme organique interdite avec Technique et précis. **À valider** : jamais tirées ni proposées aux praticiens avant validation ; tuiles « Présentation des praticiens » (1, 2 et 3 praticiens de démonstration : silhouettes dessinées et monogrammes), duels « Éléments » (un sur cinq), clé `composant:portraits:<présentation>` ; démo : `PORTRAITS=voile PRATICIENS=3 PHOTOS_PRATICIENS=mixte`.
- [x] Habillage des recettes (2026-10-07, demande de Paul : « plus de combinaisons de polices, de tailles, MAJUSCULES vs minuscules… des éléments de style… des styles de menus ») : 23 paires de polices libres auto-hébergées, **typographie** (échelle, casse, graisse, interlettrage, mot d'accent, alignement, surtitres), **jeux de détails** (6 jeux cohérents, 10 éléments variables un à un) et **menus** (ordinateur, téléphone, rendez-vous) : `typo.ts`, `details.ts`, `menus.ts`, `habillage.ts` (core) ; panneau « Typographie & détails » du studio (`PanneauHabillage.tsx` : dés 🎲 / ← / 🔒 par groupe et par axe, touches y d m, choix direct) ; la recette enregistre `typo`, `details`, `menu` (anciennes recettes : rendu du modèle) ; le site les applique (`theme.typo/details/menu`, `<html data-td data-mn>`, Gabarit.astro, Coquille.astro) comme l'aperçu (ApercuTheme, ApercuGabarit : classes mn-*, td-*, ap-*). Notables (migration 0036, types `typo`, `details`, `menu`) : tuiles « Typographies » (spécimen titre, surtitre, paragraphe, bouton, carte, citation : `SpecimenHabillage.tsx`, ordinateur et mobile), « Détails » (spécimen) et « Menus » (accueil) ; apprentissage : clés atelier `typo=…`, `details=…`, `menu=…` et clés notables renforcées par la note de la recette ; attributs d'harmonie (`habillage-attributs.ts`) pour le moteur d'harmonie. Règles et catalogue des polices : `docs/charte-graphique.md` (Typographie).
- [x] Photos dans le donneur d'avis : l'atelier et le studio montrent de vraies photos de la banque (jeux, photos libres validées, photos intégrées) tirées pour les sujets et pondérées par les notes ; leurs clés font partie des ingrédients notés.
- [ ] Remplissage automatique (demande de Paul du 2026-10-07) :
  - chaque emplacement d'un site (héros, illustration d'une page sujet ou d'une fiche soin, photos d'accueil et de galerie, icônes) est rempli à partir des sujets et hashtags des visuels, de leurs notes et de leur statut ;
  - un bouton « Changer » sur chaque emplacement, pour le praticien comme pour l'admin, tire un autre visuel compatible jusqu'à ce qu'il plaise ;
  - « Garder celui-ci » fige le choix dans le brouillon ;
  - les choix et rejets des praticiens alimentent les notes.
- [ ] Sorties : rendu d'une recette en 9:16 (écran ÉcranZen et Reels / stories, même format) et en 1:1, 4:5 pour les publications, depuis le même moteur.
