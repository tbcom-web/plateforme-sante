# Le goût de Paul : profil pour le juge

Version **2026-10-07.v1** — ajustement après la calibration en aveugle du 2026-10-07 (voir `retours/CALIBRATION.md`).
Sources : les 76 avis d'éléments et les 37 avis de thèmes complets de l'export du 2026-10-07 (`retours/assets-notes.json`,
`retours/atelier-notes.json`, `retours/SYNTHESE.md`), et les règles déjà validées (`.claude/agents/graphiste-sante.md`,
`docs/charte-graphique.md`, `docs/referentiels/pieges-illustration.md`). `illustrations-statuts.json` est vide (aucun statut
encore posé) ; `inspirations.json` n'existe pas encore.

**À mettre à jour à chaque export** : nouvelle version datée (`AAAA-MM-JJ.vN`), une ligne dans l'historique en bas. Une règle
modifiée après une mesure est un **ajustement** : sa justesse se mesure sur les notes SUIVANTES de Paul, jamais à nouveau sur
l'échantillon qui l'a inspirée.

Utilisé par `.claude/agents/juge-gout-paul.md` pour **prédire** la note de Paul avant qu'il la donne. Le juge ne remplace
jamais Paul : statut « Validé », anatomie et mises en ligne restent à Paul.

## Comment Paul note (calibrage général)

- Paul est **généreux avec ce qui est propre et lisible** : moyenne 3,8 ★, 51 notes sur 76 à 4 ou 5 ★. Un appareil du
  cabinet net et reconnaissable, un schéma pédagogique juste ou un trait continu élégant prend **5 ★** même sans effet (c'est
  le biais principal mesuré : le juge v0 sous-notait d'un point les pièces propres et simples, 10 cas 4 → 5).
- Il est **sévère avec l'incompréhensible** : « on comprend pas du tout » = 1 ★ (`dessin:senior:pedagogique`), « on comprend
  rien, à jeter » = 1 ★ (`biblio:SITES/orteil-griffe`). Le juge v0 s'arrêtait à 3 ★ : trop timide.
- Un petit défaut anatomique ou de lecture coûte **un point** (5 → 4, ou 4 → 3), pas plus : « Top mais il faut se focus sur le
  talon » = 4 ★ ; « anatomie de l'orteil un peu bizarre » = 3 ★.
- Les thèmes complets sont notés plus sévèrement (moyenne 3,2 ★, aucun 5 ★) : la mise en page compte autant que les images.
- Sans commentaire ni étiquette, la note est presque toujours 4 ou 5 ★ (22 sur 22 dans l'échantillon mesuré).

## Grille de notation (1 à 5)

| Note | Ce que Paul voit |
|---|---|
| **5** | Juste, net, on comprend le sujet en une seconde. Soit la grammaire de la marque (trame de points de pression, médaillon de zoom relié, accents de pression), soit un appareil / schéma pédagogique propre (3 vues comparées, coupe claire), soit un trait continu élégant et exact, soit un élément utilitaire parfait (rond de repérage). |
| **4** | Bien, un détail à reprendre : forme d'objet un peu bizarre, cadrage pas centré sur le sujet, flèche peu visible, zoom pas justifié, un peu simple, main/canne maladroite. |
| **3** | Lisible mais un vrai défaut : deux images juxtaposées sans lien, anatomie « un peu bizarre », couleur étrange (ongles verts), objet mal reconnu (orthoplastie lue comme une bague), trop de contenus, trop simple pour sa taille. |
| **2** | Défaut immédiat : clipart, proportions ou espace faux, vieillot, « carte postale » sans détail, mouvement montré en image fixe donc incompréhensible, éléments non reliés (ordinateur pas connecté à la plateforme). |
| **1** | On ne comprend rien (« à jeter »), ou un schéma dont le rapport avec le sujet échappe complètement. |

## Éliminatoires

Plafond indiqué entre parenthèses ; le juge les nomme dans `eliminatoire`.

- `incomprehensible` (1-2 ★) : schéma dont on ne voit pas le rapport, coupe illisible, nuage de points en « gribouilli ».
- `clipart` (2 ★) : empreinte en ronds pour les orteils, aplats mous génériques, pictos de banque d'images.
- `anatomie-fausse` (2 ★) : proportions ou position dans l'espace fausses (pieds posés n'importe comment sur un podoscope),
  orteils comme des doigts de main, latéralité incohérente (`docs/referentiels/pieges-illustration.md` § Anatomie).
- `vieillot` (2 ★) : objet du quotidien démodé (« trop vieille cette chaussure… basket de ville / sneaker »).
- `juxtaposition-sans-lien` (3 ★) : deux images côte à côte sans lien visible (« pas mettre les deux images à côté, on
  comprend pas »). **Exception** : pieds d'adulte face à des pieds d'enfant = comparaison voulue et aimée (`heros:enfant:ligne`
  5 ★ « J'adore »).
- `texte-incruste` (2 ★) : texte dans l'image (sauf « Représentation illustrative, sans valeur de mesure »).
- `instruments-accueil` (3 ★ en héros) : instruments ou gestes invasifs en première image (« il faut rassurer ») ; admis en
  fiche de soin.
- `couleur-peau` / `rouge-diabete` (2 ★) : couleur sur la peau lue comme maladie hors pathologie montrée ; rouge pour le diabète.
- `cible` (2 ★) : cible, réticule, viseur (« on dirait un sniper »).
- `visage` (2 ★, photos) : visage qui pourrait passer pour le praticien.

## Règles par famille

### 1. Composition

- R1.1 Une seule idée, centrée sur le sujet : « il faut se focus sur le talon, là on voit l'ensemble du pied »
  (`dessin:talon:releve` 4 ★). « Un peu trop de contenus, on comprend pas bien » (`heros:pedicurie:releve` 3 ★).
- R1.2 Le zoom (médaillon relié au point du pied) est aimé quand il montre quelque chose : `dessin:verrue:releve` 5 ★ ;
  inutile, il intrigue : « on sait pas trop pourquoi il y a besoin d'un zoom pour le soin » (`dessin:soin:releve` 4 ★).
  Un cône qui part de nulle part = 1 ★ (`dessin:senior:pedagogique` : « on comprend pas du tout le schéma à gauche, le rapport »).
- R1.3 Deux éléments côte à côte doivent être reliés : `heros:ongles:ligne` 3 ★ (« pas mettre les deux images à côté »),
  `heros:semelles:ligne` 3 ★, `heros:semelles:releve` 4 ★ et `heros:enfant:releve` 4 ★ (« pourquoi les deux sont côte à côte »).
  Comparaisons voulues (3 pieds normal/creux/plat, 3 arrière-pieds, adulte face à enfant) : très aimées
  (`dessin:voutes:pedagogique` 5 ★, `dessin:arriere-pied:pedagogique` 5 ★, `heros:enfant:ligne` 5 ★).
- R1.4 Pas trop d'éléments : « deux max » (atelier), « une seule grande illustration » (atelier).
- R1.5 Les éléments d'un appareil doivent être reliés et à leur place : « l'ordi et la plateforme sont pas connectés »,
  « les empreintes sortent de la plateforme » (`materiel:stabilometrie:releve` 2 ★) ; « les empreintes doivent être en bas,
  les pieds sur la plateforme » (`materiel:podoscope:pedagogique` 2 ★).

### 2. Style de trait

- R2.1 Registre relevé (contour franc, trame de points de pression, accents bleu-vert → orange) : le plus aimé.
  `dessin:analyse:releve` 5 ★, `materiel:thermoformage:releve` 5 ★, `materiel:iontophorese:releve` 5 ★.
- R2.2 Appareils du cabinet en version pédagogique (contour épais, aplats doux, sans accent) : **5 ★ s'ils sont reconnaissables**
  (`materiel:iontophorese:pedagogique`, `materiel:bac-ultrasons:pedagogique`, `materiel:fraiseuse-numerique:pedagogique` 5 ★),
  4 ★ si l'objet ressemble à autre chose (`materiel:laser:pedagogique` 4 ★).
- R2.3 Trait continu (« ligne ») exact et élégant : 5 ★ (`ligne:mycose`, `ligne:semelle`, `ligne:pieds-dessus`,
  `ligne:ongle-epais`). Schématique ou vide : 2-3 ★ (`materiel:autoclave-classe-b:ligne` 2 ★ « carte postale »,
  `materiel:thermoformage:ligne` 3 ★, `ligne:chaussure-course` 3 ★ « trop simple »).
- R2.4 Aplats pâles sans contour pour des empreintes : risque clipart (`dessin:appuis:pedagogique` 3 ★).
- R2.5 Trait tenu : un raccord bizarre se voit (`ligne:empreintes` 2 ★ : « le trait entre les ronds et le reste du pied est
  bizarre »).

### 3. Couleurs

- R3.1 Palette de pression en accents ou en trame : signature appréciée.
- R3.2 Couleurs du réel : le taping est « en général flashy » → le montrer en couleur vive (`ligne:taping` 2 ★) ; des ongles
  verts sont « très bizarres » (`dessin:cors-durillons:pedagogique` 3 ★) ; une flèche verte sur la peau ne se voit pas
  (`dessin:ongle:pedagogique` 3 ★).
- R3.3 Gammes préférées : Encre, Canard, Prune, Sable (4 ★), Pastèque & menthe sur structure sobre ; moins aimées : Menthe
  glacée & prune avec trait fin, Cobalt & abricot avec photos, Sauge (atelier).
- R3.4 Gris éteint = vieillot (`biblio:TRV-AT-0009` 2 ★).

### 4. Photos

- R4.1 Aucune photo encore notée une à une : confiance **faible** obligatoire. Règles validées : photo seulement si elle est
  vraiment bonne (fiche de soin), jamais pour remplir, pas de visage qui passerait pour le praticien, gestes rassurants en
  accueil. Thèmes « Photos » : 2,8 ★ en moyenne (atelier).
- R4.2 Indices probables (à confirmer) : nette, lumineuse, cadrage serré sur le pied ou le geste, sujet évident → 4 ★ ;
  banale ou stock « médecin au stéthoscope » → 2-3 ★.

### 5. Typographie et structure (thèmes)

- R5.1 « Élégant et sobre » et « Technique et précis » préférés ; « Simple et proche » rejeté (2,1 ★) : « trop fiche Doctolib ».
- R5.2 Aucun mot coupé (« pédicurie-podologie coupé »).
- R5.3 Bulles espacées, pas trop grandes ; section « En bref » pas aimée.

### 6. Déontologie et rassurance

- R6.1 En accueil, rassurer : pas d'instruments (« Super mais enlever les instruments »).
- R6.2 Diabète sans rouge, pas de geste qui fait peur (« la main qui pique est bizarrement représentée »).

### 7. Anatomie

- R7.1 Paul est podologue : il voit tout de suite les orteils trop fins « comme des doigts de main »
  (`dessin:orthonyxie:pedagogique` 4 ★), une anatomie d'orteil « un peu bizarre » (`dessin:ongle:releve` 3 ★), un ongle qui
  semble « cassé » (`biblio:POD-AT-0009:dorsale:incarne` 4 ★) ou un ongle incarné « inclus dedans » alors qu'il ne devrait
  pas l'être (`biblio:POD-AT-0009:dorsale:incarne-sites` 3 ★).
- R7.2 Dispositifs exacts : une orthoplastie a « plus de pâte entre les orteils et épouse le gros orteil… on dirait une bague »
  (`ligne:orthoplastie` 3 ★) ; le taping doit se voir posé SUR la peau, pas « inclus dans le pied » (`ligne:taping` 2 ★).
- R7.3 Poses : « jambes trop droites » (`heros:sport:ligne` 3 ★) ; main et canne maladroites (`heros:senior:ligne` 4 ★ : « Top,
  juste au niveau de la main et de la canne c'est un peu bizarre »).

### 8. Sens, mouvement et mobile

- R8.1 Le sens prime : « on comprend pas trop » coûte 1 à 2 ★ ; « on comprend pas du tout » descend à 1 ★.
- R8.2 Ce qui bouge dans la réalité (centre de pression, stabilométrie, équilibre) doit être **animé**, sinon « on comprend pas »
  (`materiel:stabilometrie:releve` 2 ★, `dessin:equilibre:pedagogique` 3 ★).
- R8.3 Un objet doit être reconnu tel quel : `ligne:laser` 4 ★ (« on dirait pas trop un laser ») ; objets du quotidien
  actuels (sneaker plutôt que chaussure de ville).
- R8.4 Petite taille : « attention à la finesse du trait sinon on comprend pas » (`materiel:tapis-de-course:ligne` 4 ★).

## Historique

- 2026-10-07.v1 : **ajustement après calibration** (aveugle sur 40 éléments : 17 exacts, 38 à ±1, erreur moyenne 0,63) :
  les pièces propres montent à 5 ★, l'incompréhensible descend à 1 ★, exception adulte/enfant à la juxtaposition, règles
  couleurs du réel, dispositifs exacts, mouvement → animation, appareils reliés. Sources : les 76 avis.
- 2026-10-07.v0 : première version (36 avis d'éléments + 37 thèmes), avant la mesure en aveugle sur 40 éléments tenus à l'écart.
