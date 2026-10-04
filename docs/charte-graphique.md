# Charte graphique

La plateforme sert toutes les professions de santé. Pour qu'un site de podologue, demain de kinésithérapeute ou d'orthophoniste, reste reconnaissable sans se ressembler, l'identité visuelle est organisée en **cinq couches qui s'emboîtent**. Chaque valeur visuelle a une seule source dans `packages/core`. Les composants lisent cette source, ils ne la recopient pas.

## Les cinq couches

| # | Couche | Qui la définit | Contenu | Source |
|---|--------|----------------|---------|--------|
| 1 | **Charte** | nous | Invariants de marque : neutres, fonds « plan » et quadrillage, graisses de trait, pointillés, trame de points, typographie des données en mono, mouvement (durées, cycles, courbes), mention illustrative | `charte.ts` |
| 2 | **Univers métier** | nous | Une entrée par profession : motif signature, palette « de données » à 5 niveaux, familles de dessins et d'animations, liste des spécialités | `univers.ts` |
| 3 | **Spécialité** | le praticien (principale + secondaire facultative) | Photos (accueil, panorama, diaporama), vidéos facultatives (boucles courtes et muettes), dessins prioritaires, animation d'accueil, soins mis en avant, accents de la palette de données | `packs.ts` (`Specialite`, `fusionnerSpecialites`) |
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

Les animations en registre pédagogique affichent l'image calme du schéma correspondant (podoscope → analyse, coureur → sport, trajectoire → équilibre, premiers pas → enfant, semelle → semelle), sans mouvement. Le choix du registre par modèle n'est pas encore branché.

### Poids des dessins (performance mobile)

- Sur le site, un dessin n'est pas recopié dans la page : `pages/dessins/[fichier].svg.ts` produit au build un fichier par dessin et par registre (`/dessins/<nom>.svg`, `/dessins/<nom>-pedagogique.svg`) et un par profil d'empreintes (`/dessins/empreintes-<appui>.svg`), avec les seules règles de `dessins.css` utiles. `Dessin.astro` et `Empreintes.astro` les posent par `<svg><use href="…#d"/></svg>` : le fichier est mis en cache d'une page à l'autre et les couleurs (`--dessin-*`, `--pression-*`, accent de la gamme) restent héritées de la page à travers `<use>`.
- Dans les animations (SVG + CSS, sans script), la trame partagée par plusieurs empreintes est définie une fois (`<defs>`) et posée par `<use>` ; mouvement en opacité ou tracé de trait seulement, uniquement à l'écran (`.anime-visible` → `.en-vue`), image fixe complète sinon. Moins de 400 éléments par animation (vérifié par `controle:charte`).
- L'aperçu de l'admin garde `svgDessin` / `svgAnimationFixe` en ligne.

### Matériel du cabinet

`svgEquipement(id, { registre })` (`dessins.ts`, repère 120 × 90) dessine le matériel du catalogue `EQUIPEMENTS` (`equipements.ts`) listé dans `EQUIPEMENTS_DESSINES` : tapis d'analyse de la marche (caméra sur trépied), iontophorèse, podoscope (miroir), plateforme de pression, autoclave, fauteuil de soins, micromoteur avec aspiration, scanner 3D, fraiseuse numérique, monofilament et diapason. Même trait et mêmes classes que les dessins de soins, silhouettes franches lisibles en petit, aucune annotation ; en registre relevé, écrans et empreintes portent la palette de pression. Sur le site : fichiers `/dessins/materiel-<id>.svg` posés par `<use>` dans `Materiel.astro` ; les équipements sans dessin gardent leur icône au trait.

### Dessins de la podologie

`analyse`, `appuis`, `semelle` (vue de dessus en courbes d'appui et pied de profil posé sur la semelle : talonnette, soutien de voûte, avant-pied), `soin`, `diabete`, `sport`, `enfant` (le même pied à 1, 3, 6 et 10 ans, alignés au talon, pointure en regard), `equilibre` (stabilométrie : polygone d'appui, oscillations), `talon` (pied de profil, aponévrose plantaire et insertion calcanéenne), `ongle` (gros orteil vu de dessus, normal et incarné : le bord de l'ongle pénètre le repli enflammé), `laser` (faisceau étroit sur une zone de l'avant-pied), `senior` (polygone d'appui élargi par l'embout de la canne, oscillations, marche de profil avec la canne), `taping` (bandes sur le tendon d'Achille et la voûte), `verrue` (point d'appui précis, loupe : lignes de la peau interrompues), `voutes` (pied normal, creux, plat : profil et empreinte), `arriere-pied` (talon vu de dos : axes de la jambe et du calcanéum, normal, valgus, varus). Correspondance avec les soins : `VISUELS_SOINS` (`jeux.ts`).

### Bibliothèque partagée (éléments repris d'ÉcranZen)

`packages/core/src/bibliotheque/` : éléments validés du studio ÉcranZen, à côté des dessins ci-dessus (qui ne changent pas).
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
| Titres | `--police-titres` (au choix du modèle : Schibsted, Inter, Manrope, Fraunces, Instrument) | grandes tailles, interlettrage serré |
| Texte | `--police-texte` (Inter ou Manrope) | 1,0625 rem, interligne 1,65 |
| Données | `--police-mono` (JetBrains Mono), identique sur tous les modèles | sur-titres numérotés « 01 — », lectures, cotes, légendes, fil d'Ariane, numéros |

L'échelle comprend `--taille-affiche`, `-h1`, `-h2`, `-h3`, `-chapo`, `-texte`, `-note`, `-donnees` (0,8 rem, soit 12,8 px) et `-donnees-petit` (0,75 rem, 12 px ; aucun texte d'interface en dessous de 12 px). En capitales, les données prennent un interlettrage de `--interlettrage-donnees` (0,08 em).

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
- **Cycles** : `--cycle-pouls` 2,4 s (pulsation, onde, déroulé du pas), `-pas` 3,2 s (trajet du centre de pression), `-releve` 5,6 s (scan, courbes de niveau, empreintes), `-diapo` 7 s, `-foulee` 0,72 s (cadence d'environ 167 pas/min).
- **Courbes** : `--courbe-sortie` pour les apparitions et survols, `-entree-sortie` pour les balayages, `-trace` pour le tracé d'un trait, `-rebond` pour un point qui s'allume.
- Les animations sont mises en pause hors écran (`.anime-visible`, IntersectionObserver), avec une image fixe si `prefers-reduced-motion` est actif.
- Accueil « relevé de podoscope » (`Podoscope` avec `releve`) : trame des deux empreintes, ligne de scan (`--cycle-releve`), légende graduée de la pression, tracé du centre de pression au `--signal` et mention illustrative ; rien ne bouge hors écran ni avec `prefers-reduced-motion`.

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
- `npm run controle:seo` : le SEO doit rester identique sur les 5 modèles.
