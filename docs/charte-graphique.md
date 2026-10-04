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

## Grammaire des dessins

- **Géométrie partagée** : `components/animations/pied.ts` (contour `PLANTE` et `CONTOUR`, `ORTEILS`, `TRAJET`, repère 92 × 222, pied gauche par symétrie). Aucun dessin de pied n'est tracé à la main ailleurs.
- **Trame** : `components/dessins/trame.ts`. Le pas vaut `TRAME.pas` (6,4 unités du pied, 9 pour l'enfant). Le diamètre d'un point vaut pas × (0,3 → 0,8) selon la valeur. Les points sont répartis sur 9 niveaux, tracés en un `<path>` par niveau. Le Podoscope (canvas) utilise la même trame.
- **Traits** (`--trait-*`) : `filet` 0,6 pour les grilles et hachures, `fin` 1 pour les cotes, repères et liaisons, `normal` 1,5 pour le contour principal, `fort` 2,2 pour le trait anatomique et les forces, `marque` 3,2 pour le squelette du coureur et les crampons.
- **Pointillés** : le contour de pied est une suite de points ronds (`--pointille` « 0 5,5 », point de 2,6, ou 1,6 en version légère autour d'une trame). Les tirets s'écrivent `--tiret` (4 5) et `--tiret-court` (2 3).
- **Annotations** : en mono (`--police-mono`, `--taille-donnees-dessin` dans les SVG), courtes, avec des valeurs plausibles et illustratives.
- **Mention illustrative** : `MENTION_ILLUSTRATIVE` (« Représentation illustrative, sans valeur de mesure ») apparaît sur les planches (`Planche.astro`), les couvertures d'articles et le pied de page.
- **Filets éditoriaux** : `--filet-fort` (1,5 px) en tête de liste et sous les bandeaux, `--filet` (1 px) pour les séparations.

## Typographie

| Rôle | Police | Règle |
|---|---|---|
| Titres | `--police-titres` (au choix du modèle : Schibsted, Inter, Manrope, Fraunces, Instrument) | grandes tailles, interlettrage serré |
| Texte | `--police-texte` (Inter ou Manrope) | 1,0625 rem, interligne 1,65 |
| Données | `--police-mono` (JetBrains Mono), identique sur tous les modèles | sur-titres numérotés « 01 — », lectures, cotes, légendes, fil d'Ariane, numéros |

L'échelle comprend `--taille-affiche`, `-h1`, `-h2`, `-h3`, `-chapo`, `-texte`, `-note`, `-donnees` (0,74 rem) et `-donnees-petit` (0,66 rem). En capitales, les données prennent un interlettrage de `--interlettrage-donnees` (0,08 em).

## Mouvement

- **Durées** : `--duree-instant` 150 ms, `-court` 300 ms, `-moyen` 600 ms, `-long` 900 ms, `-trace` 1 400 ms et `-decalage` 80 ms (cascade).
- **Cycles** : `--cycle-pouls` 2,4 s (pulsation, onde, déroulé du pas), `-pas` 3,2 s (trajet du centre de pression), `-releve` 5,6 s (scan, courbes de niveau, empreintes), `-diapo` 7 s, `-foulee` 0,72 s (cadence d'environ 167 pas/min).
- **Courbes** : `--courbe-sortie` pour les apparitions et survols, `-entree-sortie` pour les balayages, `-trace` pour le tracé d'un trait, `-rebond` pour un point qui s'allume.
- Les animations sont mises en pause hors écran (`.anime-visible`, IntersectionObserver), avec une image fixe si `prefers-reduced-motion` est actif.

## Ce qu'on s'interdit

- Une couleur, une épaisseur, un pas de trame ou une durée codés en dur dans un composant (`npm run controle:charte` échoue).
- Les couleurs de données sur un élément d'interface (bouton, lien, texte).
- Les pieds géométriques ou dessinés à main levée hors de `pied.ts`, les « bonshommes bâtons », les pictogrammes de banque d'images, les visages.
- Les slogans, superlatifs et promesses de résultat. Une donnée chiffrée présentée comme une mesure réelle.
- Les polices non auto-hébergées et les librairies d'animation lourdes.

## Ajouter un nouveau visuel

1. Partir de `pied.ts` et `trame.ts` (ou de la géométrie de l'univers concerné). Ajouter le dessin dans `Dessin.astro` et son nom dans `DESSINS_<UNIVERS>` (`univers.ts`).
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
4. Les couches 1, 4 et 5 ne changent pas : charte, gammes et modèles s'appliquent tels quels.

Motifs signatures envisagés (non implémentés) :

| Profession | Motif signature | Données |
|---|---|---|
| Kinésithérapie | vecteurs de mouvement et arcs d'amplitude articulaire | amplitude, force |
| Ostéopathie | lignes de tension et de mobilité sur le squelette | tension |
| Orthophonie | ondes sonores, spectrogrammes, rythme syllabique | intensité, fréquence |
| Sage-femme | courbes douces, suivi de croissance, rythme | évolution dans le temps |

## Contrôles

- `npm run controle:charte` (`apps/sites`) : aucune couleur littérale (#hex, rgb(), hsl()) dans `src/components`, `src/layouts` et `src/pages`. La liste blanche est commentée dans le script et se limite aux anciens prototypes. Le contrôle vérifie aussi les contrastes AA de toutes les gammes et la validité des modèles intégrés.
- `npm run controle:seo` : le SEO doit rester identique sur les 5 modèles.
