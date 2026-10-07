# Charte graphique

La plateforme sert toutes les professions de santé. Pour qu'un site de podologue, demain de kinésithérapeute ou d'orthophoniste, reste reconnaissable sans se ressembler, l'identité visuelle est organisée en **cinq couches qui s'emboîtent**. Chaque valeur visuelle a une seule source dans `packages/core`. Les composants lisent cette source, ils ne la recopient pas.

## Les cinq couches

| # | Couche | Qui la définit | Contenu | Source |
|---|--------|----------------|---------|--------|
| 1 | **Charte** | nous | Invariants de marque : neutres, fonds « plan » et quadrillage, graisses de trait, pointillés, trame de points, typographie des données en mono, mouvement (durées, cycles, courbes), mention illustrative | `charte.ts` |
| 2 | **Univers métier** | nous | Une entrée par profession : motif signature, palette « de données » à 5 niveaux, familles de dessins et d'animations, liste des spécialités | `univers.ts` |
| 3 | **Spécialité** | tirée des sujets n° 1 et 2 du praticien (`themes.ts`), réglable ensuite (principale + secondaire facultative) | Photos (accueil, panorama, diaporama), vidéos facultatives (boucles courtes et muettes), dessins prioritaires, animation d'accueil, soins mis en avant, accents de la palette de données | `packs.ts` (`Specialite`, `fusionnerSpecialites`) |
| 4 | **Gamme de couleurs** | le praticien | Accent, accent foncé, fond, fond doux, plan, signal. Contrastes AA vérifiés | `gammes.ts` (`GAMMES`, `verifierGamme`, `variablesGamme`) |
| 5 | **Modèle** | le praticien | Mise en page : type d'accueil, ordre des sections, polices, graisse, arrondis, boutons, motif, traitement des photos, gammes recommandées | `modeles.ts` (fiche JSON, `validerManifeste`) |

Les couches 1 et 2 sont injectées une fois par page dans `Gabarit.astro` par `feuilleCharte()`, qui produit `:root { --… }` et les surfaces partagées. Les couches 4 et 5 sont résolues par `variablesTheme(modele, site.theme)` et posées dans le style de `<html>`. La couche 3 est résolue au build (`site.visuels`).

**Jeux visuels** (`jeux.ts`). Pour une spécialité (principale, secondaire facultative, personnalisation de l'admin), `jeuVisuel()` donne le jeu complet : accueil, panorama, galerie et une case par soin du catalogue, chaque case portant une illustration (dessin), une animation facultative et une photo avec son cadrage. `rendreCase(case, mode, contexte)` choisit ce qui s'affiche selon le style visuel (illustrations, photos, mélange) : c'est la même règle sur le site et dans l'aperçu de l'admin. Les illustrations sont le visuel principal (style par défaut des nouveaux sites) ; une photo de banque n'est marquée `photoBonne` que si elle est forte, sans visage, et montre vraiment le sujet. Images fixes des animations pour les aperçus : `svgAnimationFixe()`.

Compatibilité : une couleur libre (`theme.couleur`) reste acceptée et utilisée telle quelle. Une gamme choisie (`theme.gamme`) est prioritaire. `gammeLaPlusProche(couleur)` permet de rattacher une couleur libre à une gamme lors de la migration de l'éditeur. Sur le site de démo, `GAMME=sauge` (par exemple) permet d'essayer une gamme.

**Règle de cohérence.** Toute ressource d'une spécialité (photo, vidéo, dessin) respecte la charte :
- le traitement de teinte du modèle (`jetons.images`) s'applique aux photos et aux vidéos ;
- aucun visage n'apparaît, pour que personne ne passe pour le praticien ;
- tout schéma qui représente une donnée porte la mention illustrative.

## Principes

- **Relevé de podoscope.** Le langage vient de l'examen : points de pression en trame hexagonale, contours en pointillés ronds, légendes graduées, cotes et repères de cadrage.
- **Technique.** Les dessins sont précis, avec une géométrie anatomique partagée. On n'utilise ni clipart ni pictogramme décoratif.
- **Épuré.** Beaucoup d'air, des filets plutôt que des cadres, une seule couleur d'accent par site.
- **Déontologique.** Pas de slogan, pas de promesse. Les données sont toujours illustratives et le disent.

## Palette de données (univers podologie : pression)

| Niveau | Variable | Valeur | Libellé | Arrêt |
|---|---|---|---|---|
| 1 | `--pression-1` / `--donnee-1` | `#3e7bfa` | faible | 0 |
| 2 | `--pression-2` | `#22c3a6` | modérée | 0,35 |
| 3 | `--pression-3` | `#ffc23d` | moyenne | 0,6 |
| 4 | `--pression-4` | `#ff7a2f` | forte | 0,8 |
| 5 | `--pression-5` | `#f0352f` | pic | 1 |

- Pour une valeur continue, on utilise `couleurPression(v)` (scripts et build) ou `--degrade-donnees` (CSS).
- **Usage réservé aux données** : trame, légende, marqueurs, filet de survol, pastilles d'orientation. Ces couleurs ne servent jamais pour un bouton, un lien ou un texte courant.
- Les composants génériques utilisent `--donnee-n`. Les composants propres à la podologie utilisent `--pression-n`, qui en est l'alias.

## Fonds

- **Clair** : `--fond` (modèle ou gamme), `--doux` pour les sections alternées, texture selon `jetons.motif` (`plan`, `trame`, `courbes` ou `aucun`).
- **Plan d'architecte** (`.surface-plan`) : `--plan`, quadrillage blanc de 24 px et de 120 px (`--quadrillage-sombre`, `--quadrillage-sombre-fin`). Traits en `--papier`, lectures en `--signal`.
- **Grille** (`.surface-grille`) : quadrillage fin de 16 px derrière les dessins techniques.
- **Nuit** (`--fond-nuit`, `--fond-anime`) : fond des animations. Les voiles sur photo s'écrivent `rgb(var(--nuit-rgb) / x)`.
- Sur fond sombre, le texte utilise `--sur-sombre`, `-doux` (0,8), `-pale` (0,55), `-filet` (0,22) et `-verre` (0,14).
- Texte secondaire sur fond clair : `--encre-pale` (`#5a6a6b`, ≥ 4,5:1 sur blanc et sur les fonds doux des modèles). L'accent sert aussi de couleur de texte : `variablesTheme` l'assombrit jusqu'à 4,6:1 sur le fond et le fond doux du modèle.

## Grammaire des dessins

- **Géométrie partagée** : `packages/core/src/pied.ts` (contour `PLANTE` et `CONTOUR`, `ORTEILS`, `TRAJET`, repère 92 × 222, pied gauche par symétrie), réexportée par `components/animations/pied.ts` pour le site. Aucun dessin de pied n'est tracé à la main ailleurs.
- **Trame** : `packages/core/src/trame.ts` (réexportée par `components/dessins/trame.ts`). Le pas vaut `TRAME.pas` (6,4 unités du pied, 9 pour l'enfant). Le diamètre d'un point vaut pas × (0,3 → 0,8) selon la valeur. Les points sont répartis sur 9 niveaux, tracés en un `<path>` par niveau. Le Podoscope (canvas) utilise la même trame.
- **Traits** (`--trait-*`) : `filet` 0,6 pour les grilles et hachures, `fin` 1 pour les cotes, repères et liaisons, `normal` 1,5 pour le contour principal, `fort` 2,2 pour le trait anatomique et les forces, `marque` 3,2 pour le squelette du coureur et les crampons.
- **Pointillés** : le contour de pied est une suite de points ronds (`--pointille` « 0 5,5 », point de 2,6, ou 1,6 en version légère autour d'une trame). Les tirets s'écrivent `--tiret` (4 5) et `--tiret-court` (2 3).
- **Annotations** : en mono (`--police-mono`, `--taille-donnees-dessin` dans les SVG), courtes, avec des valeurs plausibles et illustratives.
- **Mention illustrative** : `MENTION_ILLUSTRATIVE` (« Représentation illustrative, sans valeur de mesure ») apparaît sur les planches (`Planche.astro`), les couvertures d'articles et le pied de page.
- **Filets éditoriaux** : `--filet-fort` (1,5 px) en tête de liste et sous les bandeaux, `--filet` (1 px) pour les séparations.
- **Pied en silhouette** (registre pédagogique, croissance) : orteils intégrés au contour (`silhouette()` dans `dessins.ts`, tirée de `PLANTE` et `ORTEILS`), jamais d'orteils en cercles détachés. Les orteils détachés ne s'emploient que pour une empreinte (relevé au podoscope), où ils sont réels.
- **Pied de l'enfant** : `PLANTE_ENFANT` et `ORTEILS_ENFANT` (`pied.ts`, tout-petit vers 1 an : plus large, voûte comblée par le coussinet graisseux, orteils ronds) et `piedCroissance(t)` pour les âges intermédiaires (même nombre de points que la plante adulte).
- **Pied de profil** : `piedDeProfil(voute)` (`pied.ts`) — pied et bas de jambe en vue externe autour du squelette articulé (`PROFIL.os`) : peau (mollet, tendon d'Achille, talon, plante, orteils au sol, dos du pied, tibia), os, malléole, aponévrose plantaire de la tubérosité du calcanéum aux têtes métatarsiennes, pression sous la plante. `voute` (`normale`, `creuse`, `plate`) déforme ensemble os, plante et aponévrose. Seule géométrie de profil : talon, semelle, taping, voûtes, senior. On ne dessine plus de pied de profil à la main.
- **Courbes de niveau** : `isolignes(champ, seuils)` (`trame.ts`, carrés marchants puis lissage). La semelle thermoformée (`courbesSemelle()`) a ses boucles propres — cuvette du talon, soutien de voûte côté interne, barre des têtes métatarsiennes, hallux — et jamais des copies réduites d'un même contour.

### Deux registres

Chaque dessin existe en deux registres (`svgDessin(nom, { registre })`, `svgAnimationFixe(animation, { registre })`, prop `registre` de `Dessin.astro` et des animations) :

| Registre | Pour qui | Langage |
|---|---|---|
| `releve` (par défaut) | sites « techniques » | trame de points colorés par la pression, contours en pointillés, légende graduée, lectures en mono |
| `pedagogique` | sites simples et rassurants | schéma de manuel : trait monochrome (`--dessin-trait`), aplat clair (`--dessin-fond`), un seul accent doux (`--dessin-accent`, zones à 14 % et 32 %), étiquettes courtes dans la police du texte reliées par un renvoi fin ; ni trame, ni lecture, ni légende, ni ligne de scan |

Les animations en registre pédagogique affichent l'image calme du schéma correspondant (podoscope → analyse, coureur → sport, trajectoire → équilibre, premiers pas → enfant, semelle → semelle), sans mouvement.

### Registre « ligne » (trait continu)

Troisième registre, `registre: 'ligne'` (rétrocompatible : `releve` reste le défaut) : dessins au **trait continu** (« one-line art »), un seul trait régulier et fluide, **sans aplat ni remplissage**, raccords en boucles. Source : `packages/core/src/ligne.ts`.

- **Aucun redessin à l'œil.** Chaque trait est un *parcours* des géométries validées, échantillonnées puis enchaînées : `CONTOUR_PIED` (dorsal et plantaire, orteils = boucles continues du contour, formule égyptienne ; ongles = boucles du même trait reliées au bout de l'orteil par le bord libre), `EMPREINTE` (pulpes réelles d'un relevé, en boucles cursives), `piedDeProfil` (jambe → tendon d'Achille → talon → arche décollée → hallux → dos du pied → jambe), `SEMELLE` et `SEMELLE_ELEMENTS`, `CHAUSSURE` (lacets = boucles du trait), pied du tout-petit (`PLANTE_ENFANT`, `ORTEILS_ENFANT`), dessins du matériel revus (`svgEquipement`, registre pédagogique). Seuls la pince à ongles et la gouge sont construites dans `ligne.ts` d'après des cotes réelles commentées (à valider).
- **Construction** : échantillonnage (`sousChemins`, M L H V C S Q T A Z) → enchaînement (`Trait` : ponts d'Hermite tangents, boucles de raccord, queues) → rognage au cadre (une jambe sort du cadre, jamais de débord) → ré-échantillonnage, lissage léger, Ramer–Douglas–Peucker → Bézier par Catmull-Rom **centripète** (pas de dépassement aux angles).
- **Règles** : 1 `path` par dessin quand c'est possible, **3 au plus** ; épaisseur unique `LIGNE.epaisseur` (`fine` = `TRAIT.normal` 1,5 ; `moyenne` = `TRAIT.fort` 2,2), en **unités locales** (jamais `vector-effect: non-scaling-stroke` : avec `pathLength`, tracé tronqué dans WebKit) ; couleur `--dessin-ligne`, sinon `--dessin-trait` (ou l'accent, option `couleur: 'accent'`) ; `fill="none"` partout ; styles en attributs (fichiers externes lisibles par WebKit) ; ≤ 16 ko.
- **Variantes (arbitrage de Paul)** : `epaisseur` fine / moyenne ; `boucles` discrètes (rayon 2,6, sans queue) / marquées (rayon 5,2, queues et boucle finale) — `LIGNE` dans `charte.ts`, défaut fine + discrètes. **Matériel** (repère 120 × 90) : graisse multipliée par `LIGNE.materiel` (0,62), sinon le trait y paraît deux fois plus épais et les petites pièces se bouchent (retour de Paul du 2026-10-07, tapis de course).
- **Animation « le trait se dessine »** : chaque chemin porte `pathLength="1"` et ses parts du tracé (`--ligne-debut`, `--ligne-part`, fractions de `--duree-ligne` = 2,6 s) ; les traits se suivent. Sur le site, `ChargeurDessins` pose `.ligne-attente` à l'insertion puis `.ligne-trace` quand le dessin est à 35 % à l'écran, puis `.ligne-fini` (plus de pointillé) ; un dessin posé en ligne peut demander `trace: true` (`.ligne-auto`, animation CSS au chargement : accueil, aperçus, contenus). `prefers-reduced-motion` : trait complet d'emblée.
- **Dessins** (`DESSINS_LIGNE`, repère 240 × 180) : `pied-dessous`, `pied-dessus`, `pieds-dessus`, `empreintes`, `pied-profil`, `marche` (double appui, pied arrière talon levé de 24°, pas ≈ 2,5 longueurs de pied), `ongle`, `semelle`, `chaussure-course`, `premiers-pas` (tout-petit ≈ 0,5 × adulte), `senior-canne`, `fauteuil`, `instruments`, `autoclave`, `podoscope`, `monofilament` (filament plié en C contre la peau).
- **Correspondances** : `LIGNE_DESSIN` (chaque dessin de soin → son dessin au trait), `LIGNE_EQUIPEMENT` (fauteuil, autoclave, podoscope, monofilament ; les autres équipements sont parcourus automatiquement en 3 traits au plus, `contenuLigneAuto`), `LIGNE_ANIMATION` (images fixes des animations), `LIGNE_FORME` (éléments de la bibliothèque ; sans équivalent, la forme pédagogique).
- **API** : `svgDessin(nom, { registre: 'ligne', ligne })`, `svgAnimationFixe(a, { registre: 'ligne', ligne })`, `svgEquipement(id, { registre: 'ligne', ligne })`, `svgElement(id, { registre: 'ligne' })`, `svgLigne(nomLigne, options)` et, pour le moteur de contenus (animation image par image : `stroke-dashoffset = 1 − progression`), `cheminsLigne(nomLigne)` (tracés, longueurs, début et part de chaque trait).
- **Site** : fichiers `/dessins/<nom>-ligne.svg`, `/dessins/materiel-<id>-ligne.svg` et `/dessins/ligne-<nomLigne>.svg` ; `Dessin.astro` (props `registre`, `ligne`, `trace`), `Materiel.astro`, `Empreintes.astro` (schéma au trait), `Animation.astro` (image du même sujet, tracée au chargement). Le jeton de modèle `jetons.registre` accepte `ligne`. Proposition (non appliquée, à arbitrer) : `REGISTRE_PROPOSE` dans `modeles.ts` — registre `ligne` pour l'univers Zen.
- **Contrôles** (`controle:charte`) : chaque dessin, chaque équipement et chaque élément de la bibliothèque se dessine en registre ligne ; 1 à 3 chemins, aucun aplat ni forme pleine, `pathLength="1"` sur chaque chemin, pas de `vector-effect`, pas de `<style>`, ≤ 16 ko ; fichiers `-ligne` avec trait en attributs et sans pointillé figé.

**Registre par modèle** (jeton `jetons.registre`, défaut `releve` : les fiches antérieures ne changent pas ; `registreModele(m)`). Sur le site, `lib/visuels.ts` expose `registre` et `pedagogique`, valeurs par défaut de `Dessin`, `Animation`, `Empreintes` (remplacées par le schéma `appuis`), `Materiel` (fichiers `materiel-<id>-pedagogique.svg`) et de l'accueil. `<html data-registre="pedagogique">` règle le reste dans `Gabarit.astro` : texte à 18 px au moins (`font-size: 112,5 %` sur la racine), aucun sur-titre numéroté ni numéro décoratif en mono, pas de police mono chargée (`--police-mono` = police du texte), surfaces `.surface-plan` redéfinies en fond doux clair (mêmes composants ; `--sur-sombre-*`, `--papier`, `--signal`, `--dessin-*` ramenées à l'encre et à l'accent), `.surface-grille` sans quadrillage, cartouches techniques (légende, « Fig. », mention, coordonnées) retirés, filets de survol et pastilles à l'accent (jamais la palette de données sur l'interface), rien qui pulse. Fiche d'un soin : le dessin du soin plutôt que l'image de l'animation. Aperçu de l'admin : même règle (`ApercuTheme`, `data-registre`).

### Registres expérimentaux (2026-10-07, brouillons non branchés)

Quatre directions radicalement différentes des registres relevé, pédagogique et ligne, à noter par Paul avant tout
développement (`packages/core/src/styles-experimentaux.ts`, `svgStyleExperimental(sujet, style, { id, format })`, formats
vignette 4:3 et portrait 3:4). Mêmes géométries validées pour tous ; seul le rendu change.

- **Papier découpé** (`decoupe`) — chaleureux, artisanal : pièces à plat aux bords francs sans contour, ombre portée courte et
  douce (lumière en haut à gauche), grande forme organique de fond (`--aplat`), bande de sol au bord ondulé, peau en `--peau-clair`
  / `--peau`, objets en `--vif`, détails en `--duo-pale`, incisions courtes pour les plis, grain de papier léger (feTurbulence).
- **Risographie** (`riso`) — éditorial, imprimeur : deux encres (`--vif`, `--duo-fonce`), peau en trame de points à 15°, second
  plan / autre personne en trame serrée de la seconde encre, contours sur la seconde passe décalée de ≈ 1,5 % (mauvais repérage),
  passe 2 en produit (mix-blend-mode multiply), ongles et reflets en réserve, mouchetures de papier. Gamme sobre : monochrome.
- **Volume doux** (`volume`) — tactile, apaisant : dégradés radiaux par pièce (clair → teinte → ombre), liseré léger pour séparer
  les pièces, ombre floue sous le sujet, halo de fond, sans brillance.
- **Géométrique graphique** (`geometrique`) — affiche suisse / Bauhaus : grand disque `--vif`, rectangle de sol ou quart de disque
  `--duo`, sujet en silhouette pleine `--encre-gamme`, détails en négatif, trois couleurs au plus ; le sujet reste entier et d'une
  seule couleur (jamais de couleur partielle sur la peau).

Règles communes : aucun texte, aucun visage, couleurs uniquement par variables (gamme + teintes anatomiques), styles en ligne
(pas de `<style>`), identifiants préfixés, un flou et un grain au plus, ≤ 25 ko compressé. Pièges propres à ces styles : une
forme de fond rose près de la peau se lit « rougeur » (la petite pièce du papier découpé est placée loin du sujet, dans le duo
pâle) ; une trame ajourée laisse voir le plan de derrière (réserve de papier sous chaque pièce) ; les contours des orteils
latéraux sont masqués par l'hallux (sinon « anneaux / bagues »). Revue : `docs/referentiels/revue-anatomique-2026-10-07-styles.md`.

### Modèle « Simple et pédagogique » (`simple`)

Pour les praticiens qui veulent un site simple et rassurant (patientèle âgée, cabinet de village) : registre pédagogique ; accueil `lieu` (`HeroLieu.astro` : grande photo du lieu — photo d'accueil, panorama ou cabinet du praticien, sinon photo d'accueil du jeu de la spécialité, sinon schéma pédagogique — et carte claire avec le titre, le téléphone et le rendez-vous en gros boutons, l'adresse et les jours d'ouverture) ; section `etapes` (premier rendez-vous en trois étapes composées des informations déjà saisies, sans intertitre) ; FAQ complétée à l'affichage par les questions des fiches sur l'ordonnance et le remboursement (données structurées inchangées) ; lieu d'exercice en section claire ; police Nunito (titres et texte), motif `aucun`, boutons arrondis, photos `naturel`, gammes douces (sauge, canard, sable, ardoise), pied de page clair, aucune apparition au défilement. Toutes les sections à intertitre sont présentes : `controle:seo` reste identique sur les 6 modèles. Dans le formulaire, les modèles se choisissent par leur effet (champ `effet` de la fiche : « Simple et rassurant », « Moderne et technique »…), avec une phrase et une vignette.

### Poids des dessins (performance mobile)

- Sur le site, un dessin n'est pas recopié dans la page : `pages/dessins/[fichier].svg.ts` produit au build un fichier par dessin et par registre (`/dessins/<nom>.svg`, `/dessins/<nom>-pedagogique.svg`) et un par profil d'empreintes (`/dessins/empreintes-<appui>.svg`), avec les seules règles de `dessins.css` utiles. `Dessin.astro` et `Empreintes.astro` les posent par `<svg><use href="…#d"/></svg>` : le fichier est mis en cache d'une page à l'autre et les couleurs (`--dessin-*`, `--pression-*`, accent de la gamme) restent héritées de la page à travers `<use>`.
- Dans les animations (SVG + CSS, sans script), la trame partagée par plusieurs empreintes est définie une fois (`<defs>`) et posée par `<use>` ; mouvement en opacité ou tracé de trait seulement, uniquement à l'écran (`.anime-visible` → `.en-vue`), image fixe complète sinon. Moins de 400 éléments par animation (vérifié par `controle:charte`).
- L'aperçu de l'admin garde `svgDessin` / `svgAnimationFixe` en ligne.

### Matériel du cabinet

`svgEquipement(id, { registre })` (`dessins.ts`, repère 120 × 90) dessine le matériel du catalogue `EQUIPEMENTS` (`equipements.ts`) listé dans `EQUIPEMENTS_DESSINES` : tapis d'analyse de la marche (caméra sur trépied), iontophorèse, podoscope (miroir), plateforme de pression, autoclave, fauteuil de soins, micromoteur avec aspiration, scanner 3D, fraiseuse numérique, monofilament et diapason. Même trait et mêmes classes que les dessins de soins, silhouettes franches lisibles en petit, aucune annotation ; en registre relevé, écrans et empreintes portent la palette de pression. Sur le site : fichiers `/dessins/materiel-<id>.svg` posés par `<use>` dans `Materiel.astro` ; les équipements sans dessin gardent leur icône au trait.

### Dessins de la podologie

`analyse`, `appuis`, `semelle` (éléments de la semelle orthopédique vue de dessus — talonnette, soutien de voûte, barre rétrocapitale derrière les têtes — et pied de profil posé sur la semelle de profil), `soin` (pied vu de dessus et médaillon de l'hallux avec ses voisins), `diabete` (3 sites du monofilament, filament plié en C), `sport`, `enfant` (le même pied à 1, 3, 6 et 10 ans, alignés au talon, pointure en regard), `equilibre` (stabilométrie : polygone d'appui, oscillations), `talon` (pied de profil, aponévrose plantaire et insertion calcanéenne), `ongle` (médaillons de l'hallux et de ses voisins, normal et incarné : repli latéral épaissi, spicule relié à la lame), `laser` (faisceau étroit sur une zone de l'avant-pied), `senior` (polygone d'appui élargi par l'embout de la canne, ≈ 15 cm en dehors et en avant du 5e orteil ; pied de profil et canne presque verticale qui sort du cadre), `taping` (bandes sur le tendon d'Achille et la voûte), `verrue` (point d'appui précis, loupe : lignes de la peau interrompues), `voutes` (pied normal, creux, plat : profil et empreinte), `arriere-pied` (talon vu de dos : axes de la jambe et du calcanéum, normal, valgus, varus). Correspondance avec les soins : `VISUELS_SOINS` (`jeux.ts`).

### Une seule géométrie (refonte du 2026-10-04)

Les dessins, animations et marques ne redessinent plus le pied « à l'œil » : `packages/core/src/pied.ts` reprend les atomes ÉcranZen
validés par Paul (`bibliotheque/geometrie.ts`, généré par `extraire-ecranzen.mjs`, section 5) ramenés dans les repères des sites :
`CONTOUR_PIED` (pied réel, POD-AT-0001/0002), `EMPREINTE` (zone de contact, POD-SC-0007 corrigée), `SEMELLE` et
`SEMELLE_ELEMENTS` (POD-AT-0004), `SEMELLE_PROFIL` (POD-AT-0005), `piedDeProfil(voute)` (POD-AT-0003 + squelette POD-AT-0008 ;
voûte normale, creuse, plate déformée sur la même géométrie), `PROFIL` (marques « anatomie »). Le médaillon de l'hallux (POD-AT-0009)
est posé tel quel dans les dessins `soin` et `ongle`. La course (`foulee.ts`) et le pas au podoscope (`pas.ts`) sont des modèles
partagés par l'image fixe et l'animation.

### Règles anatomiques (revue de l'illustrateur médical, 2026-10-04)

1. **Proportions adulte** : avant-pied 0,35–0,40 × L, talon 0,60–0,65 × avant-pied ; formule égyptienne, M2 le plus long, parabole
   métatarsienne. **Enfant** : avant-pied ≈ 0,42 × L, voûte comblée jusqu'à 4–6 ans.
2. **Empreinte et contour du pied** sont deux géométries distinctes (`EMPREINTE` pour les relevés seulement, `CONTOUR_PIED` pour le
   pied réel). Vue de dessus et empreinte : l'hallux du pied droit est à gauche ; vue de dessous : à droite.
3. **Profil de référence** : pied gauche vu côté interne, orteils à droite ; malléole médiale plus haute et plus en avant que la
   latérale ; fibula chevauchant l'arrière du tibia ; colonne médiale au premier plan ; arche qui ne touche pas le sol (sauf pied
   plat) ; coussinet talonnier 15–20 mm, têtes métatarsiennes ≈ 1,5 cm du sol ; hallux à 2 phalanges, autres orteils à 3.
4. **Aponévrose** : du processus médial de la tubérosité calcanéenne jusqu'à la base de P1, enroulée sous la tête de M1, jamais au ras
   de la peau.
5. **Semelle** : L/l ≈ 2,6 ; élément rétrocapital derrière les têtes ; ne jamais mélanger pression et relief (le dessin `semelle`
   montre les éléments, l'animation `semelle` le relief en courbes de niveau, le podoscope la pression).
6. **Marche et course** : bras opposés aux jambes ; pied d'appui fixé au sol (appui 35–40 % du cycle en course) ; centre de gravité
   au-dessus de l'appui ; centre de pression talon → bord externe → têtes métatarsiennes → hallux ; aucune pression en phase oscillante.
7. **Canne** : côté opposé au membre douloureux, poignée au grand trochanter (ou tige qui sort du cadre), embout ≈ 15 cm en dehors et
   un peu en avant du 5e orteil.
8. **Monofilament 10 g** : 3 sites (pulpe de l'hallux, têtes de M1 et M5), filament perpendiculaire et plié en C. **Diapason** : sur
   l'articulation interphalangienne dorsale de l'hallux.
9. **Ongle** : toujours l'hallux avec ses voisins ; repli proximal, lunule, replis et sillons latéraux ; ongle incarné : spicule relié
   à la lame, repli enflammé localisé.
10. **Lecture profane** : pas de pointillés ni de couleur sur la peau (la pression se pose sur la vitre, le sol ou l'empreinte) ; pas
    d'os clairs sur fond sombre (sur fond plan, seuls calcanéum, aponévrose et M1-P1 restent, en contour fin teinté de l'accent, sans aplat : variables --dessin-os*, posées par .surface-plan) ; pas de jambe coupée nette (la coupe
    sort du cadre ou les os de la jambe s'estompent) ni de pied en l'air ; douleur = point creux.
11. **Échelles** : pied d'un enfant de 1 an ≈ 0,5 × pied adulte ; pas de l'enfant ≈ 1,8–2 longueurs de pied, de l'adulte ≈ 2,5–3.

Contrôles automatiques (`controle:charte`, « un défaut vu deux fois = un contrôle ») : proportions de `CONTOUR_PIED` et de
`EMPREINTE`, L/l de la semelle, barre rétrocapitale derrière les têtes M2–M4, arche du profil (normal hors sol, creux plus cambré,
plat au sol), 3 sites du monofilament, appui du coureur 35–40 % et bras opposés, pied d'appui au sol, aucune pression en phase
oscillante au podoscope, aucun contour en pointillés dans le registre pédagogique.

### Bibliothèque partagée (éléments repris d'ÉcranZen)

`packages/core/src/bibliotheque/` : éléments validés du studio ÉcranZen. POD-AT-0008 (profil anatomique), POD-AT-0009 (médaillon de
l'hallux), POD-AT-0010 (coupe de l'ongle) et la semelle orthopédique en couleur sont validés par Paul pour les sites (2026-10-04).
`formes.ts` est **généré** par `node packages/core/scripts/extraire-ecranzen.mjs` depuis la géométrie du studio (lecture seule, mêmes
tracés, aucun redessin) ; `catalogue.ts` décrit chaque élément au format du catalogue ÉcranZen (ID d'origine, statut, `valide_par`,
version, source) ; `svgElement(id, { registre, vue, etat })` le dessine. Planche : `/modeles/bibliotheque` (sites de démo), avec la
comparaison « actuel vs ÉcranZen ».

Couleurs : chaque forme porte les jetons ÉcranZen (`--ez-peau-2`, `--ez-trait`…), reliés à la charte par `CORRESPONDANCE_JETONS`
(`bibliotheque/rendu.ts`) :

| Jeton ÉcranZen | Pédagogique (illustration à plat) | Relevé (dessin technique) |
|---|---|---|
| `trait` | `--dessin-trait` | `--dessin-trait` |
| `fond`, `blanc` | `--dessin-fond`, `--blanc` | `--dessin-fond` |
| `accent` | `--dessin-accent` | `--dessin-accent` |
| `peau-1`, `peau-2`, `peau-ombre` | `--peau-clair`, `--peau`, `--peau-ombre` | fond ; ombre = trait 10 % |
| `ongle`, `os`, `tendon` | `--ongle`, `--os`, `--tendon` | fond ; tendon = accent 22 % |
| `chaussure`, `semelle-ardoise`, `neutre-clair` | mélanges du trait ou de l'encre | trait 8 à 16 % |
| `semelle-moutarde`, `semelle-lavande`, `semelle-sarcelle-clair` | `--pression-3`, `--pression-1`, `--pression-2` (adoucis) | accent 12 à 45 % |
| semelle orthopédique (`so-*`) | recouvrement `--pression-2`, coque `--pression-1`, élément `--pression-3`, talonnette encre | trait et accent légers |
| chaussure de running (`ch-*`) | tige à l'accent du cabinet, mousse blanche, gomme encre | trait 8 à 50 % |
| praticien (`pr-*`) | blouse blanche (encre 3 à 25 %), encolure et pied brodé à l'accent | trait 10 à 40 % |

Les teintes anatomiques sont dans `ANATOMIE` (`charte.ts`, variables `--peau`, `--peau-clair`, `--peau-ombre`, `--ongle`, `--os`,
`--tendon`) : valeurs du thème « zen-doux » validé dans ÉcranZen. Épaisseurs : `fin`, `normal`, `epais` d'ÉcranZen → `--trait-fin`,
`--trait-normal`, `--trait-fort`, ramenés au repère 512 u des atomes. `controle:charte` vérifie chaque forme dans les deux
registres (aucune couleur littérale, aucun jeton sans correspondance, ≤ 64 ko).

## Typographie

| Rôle | Police | Règle |
|---|---|---|
| Titres | `--police-titres` (au choix du modèle : Schibsted, Inter, Manrope, Fraunces, Instrument, Nunito) | grandes tailles, interlettrage serré |
| Texte | `--police-texte` (Inter, Manrope ou Nunito) | 1,0625 rem, interligne 1,65 (registre pédagogique : 18 px au moins) |
| Données | `--police-mono` (JetBrains Mono), identique sur tous les modèles | sur-titres numérotés « 01 — », lectures, cotes, légendes, fil d'Ariane, numéros |

L'échelle comprend `--taille-affiche`, `-h1`, `-h2`, `-h3`, `-chapo`, `-texte`, `-note`, `-donnees` (0,8 rem, soit 12,8 px) et `-donnees-petit` (0,75 rem, 12 px ; aucun texte d'interface en dessous de 12 px). En capitales, les données prennent un interlettrage de `--interlettrage-donnees` (0,08 em).

## Espacements et téléphone

Le rythme vertical vient de `ESPACES` (`charte.ts`) : chaque jeton est un `clamp(téléphone, fluide, ordinateur)` dont la borne « ordinateur » reprend les valeurs historiques (rien ne bouge au-delà de 900 px).

| Variable | Valeur | Usage |
|---|---|---|
| `--espace-section` | 72 → 120 px | entre deux sections (`.section`), bas des en-têtes de page sur téléphone |
| `--espace-bloc` | 36 → 56 px | entre l'en-tête d'une section et son contenu, entre deux blocs (cartes de praticiens, articles, groupes de matériel, colonnes du pied de page) |
| `--espace-element` | 20 → 28 px | entre deux éléments d'une liste ou d'une carte (lignes des compétences, blocs d'infos pratiques) |
| `--espace-ligne` | 12 px | marge verticale d'une ligne de tableau ou de liste (horaires, matériel d'un soin) |

Sur téléphone (`TELEPHONE`, jusqu'à 759 px, même seuil que les grilles à 760 px), règles communes à tous les modèles, posées en fin de feuille de chaque composant dans un bloc `@media (max-width: 759px)` :

- **Textes secondaires à 16 px** (`--taille-texte-telephone`) : résumés des compétences et des tuiles, infos pratiques et horaires, fiches des praticiens, phrases du matériel, résumés d'articles. Les légendes restent à 13 px au moins.
- **Données mono et légendes à 13 px** : `--taille-donnees` et `--taille-donnees-petit` passent à 0,8125 rem (`TELEPHONE_CSS`, injecté par `feuilleCharte()`).
- **Zones tactiles de 44 px** (`--cible-tactile`) pour tout lien ou bouton isolé : fil d'Ariane, liens du pied de page, « Ouvrir dans OpenStreetMap », « Itinéraire », téléphone de la FAQ, petits boutons.
- **Lignes empilées plutôt que colonnes étroites** : dans les listes (compétences, matériel, autres compétences), le dessin et le titre partagent une ligne, le texte prend toute la largeur dessous ; le numéro décoratif passe à droite du dessin ou disparaît. La réponse d'une FAQ n'est plus en retrait sous le numéro.
- Dessins de liste agrandis (104 px pour les compétences, 96 px pour le matériel et les autres compétences).

## Logo

Le logo combine trois choix, sur le même principe de couches (`packages/core/src/logos.ts`) :

| Élément | Qui choisit | Source |
|---|---|---|
| **Marque** (icône) | le praticien, parmi les marques de son univers | `univers.ts` (`marques`, libellé et idée métier) ; dessin par `svgMarque` |
| **Disposition** : horizontale, empilée, marque seule | le praticien | `DISPOSITIONS_LOGO` |
| **Traitement** : plein (tuile à la couleur du cabinet), trait (sans tuile), plan (tuile « plan », points en couleurs de données) | le modèle (`jetons.logo`, sinon déduit) | `traitementLogo(modele)` |

- Le choix est enregistré dans `site.theme.logo` (`ChoixLogo = { marque, disposition }`, facultatif) et validé par `validerChoixLogo` (rétrocompatible : absent, chaîne seule ou valeur inconnue → valeur par défaut).
- Le nom du cabinet prend la police et la graisse des titres du modèle (bornée entre 400 et 750 pour rester lisible en petit) ; la ligne secondaire est factuelle, « métier · ville », en mono capitales.
- Les couleurs ne viennent que de la gamme et de la charte : accent, clair, plan, signal, palette de données (`CouleursMarque`). Sur le site, ce sont des variables `--logo-*`, que la version claire (en-tête transparent sur photo, pied de page sombre) se contente de régler.
- Trois niveaux de détail (`LOGO` dans `charte.ts`) : jusqu'à 24 px (favicon), version pleine et épaissie, sans pointillés ni annotation ; jusqu'à 56 px (en-tête, pied de page), version allégée ; au-delà, version détaillée (pointillés, cotes, polygone d'appui).
- Graisses propres aux marques, plus fines que les traits des dessins (`LOGO.trait`, unités du cadre de 48) : `compact` 3 et `compactFin` 2 (favicon), `moyen` 1,7 (en-tête), `normal` 1,1 / `epais` 1,4 (version détaillée, selon la graisse des titres), `fin` 0,7 (cotes, rayons, courbes intérieures). Points du contour : `LOGO.pointille` ; points d'appui : `LOGO.appui`. Une marque n'emprunte jamais `TRAIT` directement.
- Marques de la podologie : empreinte, trame de pression, courbes de niveau, centre de pression, polygone d'appui, voûte plantaire, pied articulé (`anatomie` : squelette de profil en deux tons, os en formes fermées emboîtées dont les bords sont partagés, l'interligne articulaire étant le trait lui-même ; os postérieurs en teinte plus soutenue ; trois masses pleines en favicon, os principaux emboîtés en en-tête, tous les os et quelques reflets en grand), pied articulé en épure (`anatomie-epure` : colonne interne du même squelette — tibia, talus, calcanéum, naviculaire, cunéiforme, 1er rayon — au trait, dans un contour de peau ouvert, appuis plantaires en points), squelette plantaire (`anatomie-plantaire`, vue de dessous), semelle de course (crantage lignes et points, renfort talon), relevé de pression « données » (points de taille égale colorés par la palette, échelle graduée ; monochrome par opacité au trait), chaussure de course (inclinée en propulsion, semelle cambrée et fenêtre d'amorti, lacets en barrettes, empeigne en trame de points, deux lignes de vitesse ; en tuile, silhouette claire et détails en creux ; en version données, trame et crantage colorés du talon vers la pointe), foulée (une jambe du genou au pied en fin d'appui, talon levé et appui sur l'avant-pied : galbe du mollet, tibia droit, tendon d'Achille, malléole suggérée ; sol en pointillés, bandes d'appui talon-avant-pied-orteils, disque de fond en retrait), rubans (voûte interne, bord externe et arc des orteils en pleins et déliés, tirés de `pied.ts`, inclinés), monogramme.
- Géométries des marques de profil dans `pied.ts` : `PROFIL` (pied articulé), `CHAUSSURE`, `JAMBE`, `RUBANS` et `ruban()` (ruban à épaisseur modulée).
- Options typographiques (`LOGO.typo`, proposition non activée) : `courante` (par défaut), `capitales` (nom en capitales, ligne en capitales très espacées), `minuscules` (ligne en minuscules très espacées). Mêmes polices : titres du modèle pour le nom, mono pour la ligne.
- Le favicon `/favicon.svg` est généré au build (`svgFavicon`) à partir de la marque et des couleurs du site, toujours sur tuile.
- Une marque reste sobre et lisible : pas d'effet décoratif qui gêne la lecture du nom, et jamais de motif de mire, cible, réticule ou viseur (cercle et croix).
- Planche de démonstration : `/modeles/logos` (sites de démo, noindex).
- Pour l'éditeur : `marquesLogo(metier)`, `DISPOSITIONS_LOGO`, `svgMarque(marque, couleurs, options)` (chaîne SVG), `couleursMarque(modele, theme)` et `traitementLogo(modele)` pour un aperçu fidèle.

## Mouvement

- **Durées** : `--duree-instant` 150 ms, `-court` 300 ms, `-moyen` 600 ms, `-long` 900 ms, `-trace` 1 400 ms et `-decalage` 80 ms (cascade).
- **Cycles** : `--cycle-pouls` 2,4 s (pulsation, onde, déroulé du pas), `-pas` 3,2 s (trajet du centre de pression), `-releve` 5,6 s (scan, courbes de niveau, empreintes), `-diapo` 7 s, `-foulee` 0,72 s (cadence d'environ 167 pas/min), `-geste` 10 s (geste de soin montré en étapes : meulage d'un ongle épaissi ; 12 s en salle d'attente ÉcranZen, règle de lecture des étiquettes).
- **Courbes** : `--courbe-sortie` pour les apparitions et survols, `-entree-sortie` pour les balayages, `-trace` pour le tracé d'un trait, `-rebond` pour un point qui s'allume.
- Les animations sont mises en pause hors écran (`.anime-visible`, IntersectionObserver), avec une image fixe si `prefers-reduced-motion` est actif.
- Accueil « relevé de podoscope » (`Podoscope` avec `releve`) : trame des deux empreintes, ligne de scan (`--cycle-releve`), légende graduée de la pression, tracé du centre de pression au `--signal` et mention illustrative ; rien ne bouge hors écran ni avec `prefers-reduced-motion`.
- Animation « meulage » (`packages/core/src/meulage.ts`, composant `Meulage.astro`) : l'hallux de profil (POD-AT-0003, ongle épais), la fraise arrive et se pose sur le dos de l'ongle, trois couches s'effacent (la lamelle suivante devient le contour), reflet lisse, retrait de la fraise, fondu de toute la scène et reprise. Sans texte sur les sites ; l'état sans animation est l'image figée (fraise posée). Version ÉcranZen 16:9 et 9:16, étiquettes facultatives : `packages/contenus/scripts/exporter-animation.mjs`.

## Gabarits et variantes de sections (2026-10-05)

Un modèle choisit désormais un **gabarit** (`gabarit` dans la fiche, `packages/core/src/modeles.ts`, `GABARITS`) :

- `classique` (valeur par défaut, les 6 premiers modèles) : rendu historique, inchangé au pixel près ;
- `tableau` (« Clair et pratique ») : cartes arrondies sur un fond à peine teinté, premier écran en carte + aplat vif
  illustré, navigation par bulles, Geist ;
- `village` (« Simple et proche ») : une colonne de 880 px, texte de 20 px, bandeau pastel au premier écran, deux gros
  boutons, plan d'accès dans « Venir au cabinet », Public Sans ;
- `revue` (« Élégant et sobre ») : éditorial humble, papier blanc cassé, Bodoni Moda (titres) et Newsreader (texte),
  texte de 19 px (18 px sur téléphone), en-tête et pied soulignés d'un filet double, premier écran sur l'aplat pastel avec
  UN dessin au trait continu légendé « Fig. 1 — … » (masqué sur téléphone), sections en colonnes de journal (chiffre romain
  et titre à gauche, contenu à droite, compteur CSS : aucun texte ajouté), bulles à filet fin, aucune animation.

Hors `classique`, chaque section est rendue par une **variante** (`variantes`, `VARIANTES_SECTIONS`, défauts par gabarit
dans `VARIANTES_PAR_DEFAUT`) : accueil `carte` | `notice` | `figure`, soins `bulles` | `grille` | `filets`, praticiens `cartes` | `fiches` | `liste`,
infos `volets` | `notice`, faq `accordeon`, actualités `liste` | `cartes`, pied `simple`. Les composants sont dans
`apps/sites/src/components/gabarits/` (Coquille, PremierEcran, Soins, VenirAuCabinet, Praticiens, Faq, Actus, PlanAcces,
FicheSoin, TetePage, Materiel, InfosPratiques) ; les pages choisissent `{nouveauGabarit ? variantes : classique}` à
l'intérieur du même `<Gabarit>` : title, description, H1, H2, données structurées, sitemap et llms restent communs
(`npm run controle:seo` sur les 9 modèles). Un nouveau gabarit = une entrée dans `GABARITS`, ses variantes par défaut,
une classe `coquille--<id>` et, au besoin, de nouvelles valeurs de variantes (exemple : « Revue », ajouté avec `figure`,
`filets` et `liste`).

**Une illustration par fiche de soin.** Les gabarits n'affichent qu'UN dessin clair en tête de fiche. Les dessins à
plusieurs sujets côte à côte (`voutes` : trois pieds et leurs empreintes ; `arriere-pied` : trois arrière-pieds) sont
remplacés, dans les registres relevé et pédagogique, par le dessin à un sujet le plus proche (`analyse` : empreintes des
deux pieds et leurs zones d'appui) — `visuelVariante`, `apps/sites/src/lib/gabarits.ts`. Le dessin tient entier dans son
cadre (jamais rogné) ; le registre « ligne » a déjà un sujet par dessin (`LIGNE_DESSIN`).

Règles de clarté appliquées : une idée par écran (premier écran = qui, où, soins principaux, Rendez-vous / Appeler),
navigation par bulles (Soins, Pour qui, Infos pratiques ; ≥ 48 px), information progressive (`details` natifs), sobre
(aucune animation au défilement), texte ≥ 18 px (20 px en village), menu court Soins · Le cabinet · Accès · Rendez-vous,
barre Appeler / Rendez-vous sur téléphone.

### Couleurs des gabarits : tout dérive de la couleur du cabinet

`couleursGabarit(modele, { couleur, gamme })` (`packages/core/src/gabarits.ts`) calcule les rôles `--g-*` posés sur
`<html>` : `page`, `carte`, `doux`, `bulle` (vif pâle), `duo-bulle` (duo pâle), `vif` (la couleur vive telle quelle : carte
illustrée, « Rendez-vous »), `aplat` (pastel du premier écran), `plein` (bouton principal : vif ou duo, celui qui se détache
le plus), `sombre` (pied de page), `plan-*` (plan d'accès), `bulle-bord` / `duo-bord` (filets des bulles), `figure` (trait
du dessin posé sur l'aplat, ≥ 3:1), etc. Revue : `page` = blanc cassé de la gamme (sinon `PAPIER_REVUE`, `charte.ts`, à
peine teinté de la couleur), `carte` = `page` (aucune carte). Source : gamme vitaminée (vif, duo, aplat, encre :
`variantesGamme`), gamme sobre (replis) ou couleur libre du praticien. Garde-fous : chaque ton dérivé est assombri ou
éclairci jusqu'au contraste requis (4,5:1 texte, 3:1 pictos et contours) ; le texte posé sur une couleur pleine est blanc
ou encre, le plus lisible. `npm run controle:charte` vérifie chaque gabarit sur les 17 gammes et 5 couleurs libres
extrêmes (jaune pâle, rouge saturé, bleu nuit, gris moyen, vert fluo). Aucune couleur littérale dans les composants.

### Teinte « gamme » des surfaces sombres (modèle Technique, 2026-10-06)

Retour de Paul : « du bleu et du vert mélangés » (signal menthe fixe et palette de pression bleu → rouge sur un site cobalt).
Jeton `jetons.teinte: 'gamme'` : `teinteSombre({ couleur, gamme })` (`gammes.ts`) dérive **tout** le sombre de la gamme (ou de
la couleur libre) — `--plan`, `--plan-profond`, `--nuit`, `--nuit-haut` (premier écran, animations), `--pied-fond` (pied de
page), `--signal` (gamme sobre : teinte de l'accent éclaircie ; vitaminée : son signal), quadrillage et filets sombres à la
teinte du signal, et une **échelle de pression monochrome** de la teinte du signal : `--pression-n` (fonds clairs, du pâle au
soutenu) et `--pression-sombre-n` (fonds sombres, du discret au lumineux), reprise en `--pression-n` sur `.surface-plan`,
`.pied`, `.hero` et les fonds `--sombre`. Les dessins du core gardent leurs couleurs en attributs (fichiers et empreintes de
revue inchangés) : `CSS_TEINTE_GAMME` leur substitue, par une règle CSS prioritaire sur l'attribut, le niveau équivalent de
l'échelle ; les canvas (podoscope, coureur) lisent `--pression-1…5` sur la page. Garanties (`verifierTeinteSombre`, dans
`controle:charte`, 17 gammes + 5 couleurs extrêmes) : papier ≥ 9:1 et signal ≥ 4,5:1 sur plan, nuit et pied ; niveaux 2 à 5
≥ 3:1 sur le plan, niveaux 3 à 5 ≥ 3:1 sur blanc.

Pied de page (tous les modèles classiques) : un mot (« Rendez-vous »), la façon de le prendre, le bouton ; pas de second
logo (l'en-tête le porte déjà) et jamais deux fois le même texte (sans lien en ligne ni téléphone, le repli « Prise de
rendez-vous au cabinet » n'est que sur le bouton).

### Plan d'accès : jamais inventé

`apps/sites/src/lib/plan-acces.ts` lit les vraies rues autour des coordonnées du cabinet dans OpenStreetMap au build
(API Overpass, une requête, cache `node_modules/.cache/plan-acces/`), et `PlanAcces.astro` les dessine en SVG aux couleurs
du site (aucune tuile, aucune iframe, mention « © OpenStreetMap »). Sans coordonnées ou sans réseau (`PLAN_OSM=non`) :
schéma abstrait étiqueté « Plan schématique, sans les rues » (un point et l'adresse, aucune fausse rue).

## Ce qu'on s'interdit

- Une couleur, une épaisseur, un pas de trame ou une durée codés en dur dans un composant (`npm run controle:charte` échoue).
- Les couleurs de données sur un élément d'interface (bouton, lien, texte).
- Les pieds géométriques ou dessinés à main levée hors de `pied.ts`, les « bonshommes bâtons », les pictogrammes de banque d'images, les visages.
- Tout motif de **cible, réticule, mire ou viseur** (cercle + croix, axes croisés avec cercle central) : il évoque une arme, pas un examen. Rejeté par le client (« on dirait un sniper »).
- Les slogans, superlatifs, promesses de résultat et phrases d'ambiance (« un cabinet calme et lumineux, pensé pour votre confort », « à votre écoute ») : les titres disent un fait. Une donnée chiffrée présentée comme une mesure réelle.
- Les infos pratiques « mises en scène » (frise d'horaires, dataviz décorative) : horaires, adresse et téléphone restent en tableau ou en liste simple.
- Les repères de cadrage en coins sur une carte ou un visuel (ils évoquent un viseur) ; le plan d'accès est un plan schématique sur fond plan, sans carte tierce chargée avec la page.
- Les polices non auto-hébergées et les librairies d'animation lourdes.

## Ajouter un nouveau visuel

1. Partir de `pied.ts` et `trame.ts` (ou de la géométrie de l'univers concerné). Ajouter le dessin dans `packages/core/src/dessins.ts` (`svgDessin`, styles dans `dessins.css` ; `Dessin.astro` n'est qu'une enveloppe, l'admin utilise la même fonction pour ses aperçus) et son nom dans `DESSINS_<UNIVERS>` (`univers.ts`).
2. N'utiliser que les variables de la charte : `--trait-*`, `--pointille*`, `--tiret*`, `--d-*` (palette de données), `--police-mono`, `--duree-*`, `--cycle-*`, `--courbe-*`. Dans un script, importer depuis `@plateforme/core/charte`.
3. Si un besoin nouveau apparaît (une épaisseur, une durée), l'ajouter d'abord à `charte.ts` et à ce document.
4. Rendre le visuel décoratif (`aria-hidden`), respecter `prefers-reduced-motion` et le mettre en pause hors écran.
5. Le vérifier sur `/modeles/dessins`, `/modeles/animations` et `/modeles/charte` (sites de démo), en clair et sur fond plan.
6. Lancer `npm run controle:charte` et `npm run controle:seo` dans `apps/sites`.

## Ajouter une profession

1. Dans `univers.ts`, créer une entrée `UniversMetier` avec :
   - `motif` (motif signature) ;
   - `donnees` (grandeur, 5 libellés, 5 couleurs, 5 arrêts ; la palette doit rester lisible sur fond clair comme sur fond plan) ;
   - `dessins` et `animations` ;
   - `specialites` ;
   - `professions` (slugs de la table professions).
2. Décrire ses spécialités sur le modèle de `SPECIALITES` : photos sans visage, vidéos facultatives, dessins prioritaires, soins mis en avant.
3. Dessiner sa géométrie partagée (l'équivalent de `pied.ts`) puis sa famille de dessins, avec les traits, pointillés et annotations de la charte.
4. Déclarer ses marques de logo (`marques`, `marqueParDefaut`) et les dessiner dans `logos.ts`, avec leurs trois niveaux de détail.
5. Les couches 1, 4 et 5 ne changent pas : charte, gammes et modèles s'appliquent tels quels.

Motifs signatures envisagés (non implémentés) :

| Profession | Motif signature | Données |
|---|---|---|
| Kinésithérapie | vecteurs de mouvement et arcs d'amplitude articulaire | amplitude, force |
| Ostéopathie | lignes de tension et de mobilité sur le squelette | tension |
| Orthophonie | ondes sonores, spectrogrammes, rythme syllabique | intensité, fréquence |
| Sage-femme | courbes douces, suivi de croissance, rythme | évolution dans le temps |

## Contrôles

- `npm run controle:charte` (`apps/sites`) : aucune couleur littérale (#hex, rgb(), hsl()) dans `src/components`, `src/layouts` et `src/pages`. La liste blanche est commentée dans le script et se limite aux anciens prototypes. Le contrôle vérifie aussi les contrastes AA de toutes les gammes et la validité des modèles intégrés, et que chaque dessin et chaque image fixe d'animation se dessine dans les deux registres, sans valeur invalide, en moins de 400 éléments, avec sa photo associée.
- `npm run controle:charte` vérifie aussi les règles anatomiques ci-dessus (proportions, semelle, profil, monofilament, coureur, podoscope, pas de pointillés en pédagogique).
- `npm run controle:charte` vérifie aussi qu'aucun fichier `dist/dessins/*.svg` ne contient de `<style>` : WebKit (Safari et tous les navigateurs de l'iPhone) ignore la feuille d'un SVG externe référencé par `<use>`. Les styles des fichiers de dessins sont donc **en attributs** (`packages/core/src/fichiers-svg.ts`) et les réglages de surface passent par des **variables** (`--dessin-os`, `--dessin-os-aplat`, `--dessin-squelette`…), qui traversent `<use>` ; un sélecteur de la page (`.surface-plan .dessin …`) ne les atteint pas. Effet de bord : l'apparition « trace » (`.pret .dessin .trace`) ne s'applique plus aux dessins chargés par `<use>`.
- `npm run controle:webkit` (`apps/sites`) : rendu iPhone (WebKit) comparé à Chromium, page par page, sur le dernier build (`--dist`, `--pages`, `--sortie`). Prérequis une fois par poste : `npx playwright install webkit chromium` (navigateurs hors du dépôt, dans `%LOCALAPPDATA%ms-playwright`).
- `npm run controle:seo` : le SEO doit rester identique sur les 6 modèles.
