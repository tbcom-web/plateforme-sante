# Retours de Paul — synthèse

Export automatique (scripts/exporter-retours.mjs). Données jusqu’au 2026-10-07 : 273 avis sur les assets, 124 sur les thèmes complets, 52 changements de statut.
Lire ensuite les JSON du dossier pour le détail ; noter chaque correction faite dans retours/CHANGEMENTS.md (docs/retours.md).

## Assets (icônes, illustrations, photos, gammes, structures)

273 notes, moyenne 3,62 ★ — répartition : 1★ 22, 2★ 25, 3★ 53, 4★ 107, 5★ 66.

### Par type d’asset

| Type | Assets notés | Notes | Moyenne |
|---|---:|---:|---:|
| Photos | 41 | 47 | 2,55 ★ |
| Dessins | 32 | 46 | 3,96 ★ |
| Matériel | 34 | 45 | 4,07 ★ |
| Bibliothèque | 25 | 37 | 3,92 ★ |
| Traits continus | 19 | 27 | 3,74 ★ |
| Héros de thème | 14 | 23 | 3,70 ★ |
| Gammes de couleurs | 17 | 18 | 4,17 ★ |
| Pictos et icônes | 18 | 18 | 2,78 ★ |
| Animations | 6 | 7 | 4,71 ★ |
| Modèles de structure | 4 | 5 | 3,00 ★ |

### Les mieux notés

| Asset | Clé | Notes | Moyenne | Lissée | Étiquettes |
|---|---|---:|---:|---:|---|
| podoscope (empreintes de podoscope en points de pression) | `animation:podoscope` | 2 | 5,00 ★ | 4,08 ★ | Waouh (1) |
| Chaussure de running (profil, 3/4, dessous) (EZ-HTML/chaussure-running) | `biblio:EZ-HTML/chaussure-running:trois-quarts:neuve` | 2 | 5,00 ★ | 4,08 ★ | — |
| Semelle orthopédique en couleur (dessus, dessous, profil) (EZ-HTML/semelle-ortho) | `biblio:EZ-HTML/semelle-ortho` | 2 | 5,00 ★ | 4,08 ★ | — |
| Semelle orthopédique en couleur (dessus, dessous, profil) (EZ-HTML/semelle-ortho) | `biblio:EZ-HTML/semelle-ortho:dessous:neuve` | 2 | 5,00 ★ | 4,08 ★ | — |
| analyse (Relevé) | `dessin:analyse:releve` | 2 | 5,00 ★ | 4,08 ★ | — |
| mycose (Trait continu) | `ligne:mycose` | 2 | 5,00 ★ | 4,08 ★ | — |
| Gros orteil vu de dessus (ongle détaillé) (POD-AT-0009) | `biblio:POD-AT-0009` | 2 | 4,50 ★ | 3,92 ★ | — |
| talon (Relevé) | `dessin:talon:releve` | 2 | 4,50 ★ | 3,92 ★ | — |
| Pieds de l’enfant (Relevé) | `heros:enfant:releve` | 2 | 4,50 ★ | 3,92 ★ | — |
| Semelles orthopédiques (Relevé) | `heros:semelles:releve` | 2 | 4,50 ★ | 3,92 ★ | — |

### Les moins bien notés

| Asset | Clé | Notes | Moyenne | Lissée | Étiquettes |
|---|---|---:|---:|---:|---|
| posture-marche-sable | `photo:posture-marche-sable` | 2 | 1,00 ★ | 2,75 ★ | — |
| enfant-baskets | `photo:enfant-baskets` | 2 | 1,00 ★ | 2,75 ★ | — |
| cabinet-lumiere | `photo:cabinet-lumiere` | 2 | 1,00 ★ | 2,75 ★ | — |
| Fraiseuse numérique (CFAO) (fraiseuse-numerique) | `materiel:fraiseuse-numerique:ligne` | 2 | 2,00 ★ | 3,08 ★ | — |
| taping (Trait continu) | `ligne:taping` | 2 | 2,00 ★ | 3,08 ★ | — |
| Chaussure fermée, vue de profil médial (TRV-AT-0009) | `biblio:TRV-AT-0009` | 2 | 2,00 ★ | 3,08 ★ | — |
| Chaussure de ville (chaussure-ville) | `picto:chaussure-ville` | 1 | 1,00 ★ | 3,10 ★ | — |
| sport-trail | `photo:sport-trail` | 1 | 1,00 ★ | 3,10 ★ | — |
| sport-foulee-herbe | `photo:sport-foulee-herbe` | 1 | 1,00 ★ | 3,10 ★ | — |
| soins-pied-tenu | `photo:soins-pied-tenu` | 1 | 1,00 ★ | 3,10 ★ | — |

### Étiquettes les plus fréquentes

- **Trait trop épais** (10) : Accès personnes à mobilité réduite (accessibilite) (1) ; Douleur au talon (talon-douloureux) (1) ; Ongle incarné (ongle-incarne) (1) ; Paire d'empreintes (empreintes) (1) ; Pied de profil (pied-profil) (1)
- **Waouh** (5) : Pieds de l’enfant (Trait continu) (1) ; Traçabilité des cycles de stérilisation (tracabilite-sterilisation) (1) ; meulage (meulage d’un ongle épaissi à la fraise, en étapes) (1) ; podoscope (empreintes de podoscope en points de pression) (1) ; trajectoire (trajet du centre de pression pendant le pas) (1)
- **Anatomie fausse** (4) : Gros orteil vu de dessus (ongle détaillé) (POD-AT-0009) (1) ; Orteil en griffe, coupe sagittale du 2e rayon (SITES/orteil-griffe) (1) ; Podoscope (podoscope) (1) ; empreintes (Trait continu) (1)
- **Clipart** (4) : Pied diabétique (Pédagogique) (1) ; Podoscope (podoscope) (1) ; appuis (Pédagogique) (1) ; empreintes (Trait continu) (1)
- **Fade** (2) : Scanner 3D du pied (scanner-3d) (1) ; chaussure-course (Trait continu) (1)
- **Illisible en petit** (2) : Paire d'empreintes (empreintes) (1) ; Verrue plantaire (verrue-plantaire) (1)
- **Se comprend vite** (1) : enfant (Pédagogique) (1)
- **Couleurs fades** (1) : photo:banque/libres/sport/pexels-39833182-1920.webp (1)
- **Sens immédiat** (1) : Hygiène et stérilisation (hygiene-autoclave) (1)
- **Sens pas clair** (1) : K-taping (k-taping) (1)
- **Style différent** (1) : cors-durillons (Pédagogique) (1)
- **Trop chargé** (1) : Ongles incarnés, épais ou abîmés (Relevé) (1)
- **Trop « stock »** (1) : photo:banque/libres/diabete/pexels-8965131-1920.webp (1)

### À retravailler (1)

- `biblio:EZ-HTML/chaussure-running:trois-quarts:neuve` — Chaussure de running (profil, 3/4, dessous) (EZ-HTML/chaussure-running) : (sans commentaire)

### Retirés (1)

`photo:sport-trail`

### Remarques récentes (ce qui va bien / ce qui ne va pas / commentaire)

- 4★ `biblio:POD-AT-0003:profil-medial:ongle-epais-meulage` Pied droit, vue de profil médial (POD-AT-0003) : Commentaire : un peu trop blanc l'image de droite
- 3★ `biblio:POD-AT-0006` Sandale de piscine vue de dessus (claquette, tong) (POD-AT-0006) : Commentaire : tong representee un peu bizarrement
- 4★ `biblio:POD-AT-0006:dorsal:tong-posee` Sandale de piscine vue de dessus (claquette, tong) (POD-AT-0006) : Commentaire : le haut de la tong est un peu bizarre, normalenent il est plus "rond / droit"
- 2★ `biblio:POD-AT-0009:dorsale-gros-plan:repos` Gros orteil vu de dessus (ongle détaillé) (POD-AT-0009) [Anatomie fausse] : Commentaire : Orteils trop fins et une anomalie sur la droite
- 4★ `biblio:POD-AT-0009:dorsale:incarne` Gros orteil vu de dessus (ongle détaillé) (POD-AT-0009) : Commentaire : On dirait que l'ongle est cassé... mais bien
- 3★ `biblio:POD-AT-0009:dorsale:incarne-sites` Gros orteil vu de dessus (ongle détaillé) (POD-AT-0009) : Commentaire : On dirait qu'il y a un ongle incarné inclus dedans
- 1★ `biblio:SITES/orteil-griffe` Orteil en griffe, coupe sagittale du 2e rayon (SITES/orteil-griffe) [Anatomie fausse] : Commentaire : On comrpend rien a jeter
- 2★ `biblio:TRV-AT-0009` Chaussure fermée, vue de profil médial (TRV-AT-0009) : Commentaire : franchement elle fait trop vieille cette chaussure je n'aime pas il faut un truc plus dynamique style basket de ville / sneaker
- 2★ `biblio:TRV-AT-0009` Chaussure fermée, vue de profil médial (TRV-AT-0009) : Ce qui ne va pas : Chaussure beaucoup trop plate
- 3★ `dessin:cors-durillons:pedagogique` cors-durillons (Pédagogique) [Style différent] : Commentaire : bien mais pas fan des ongles verts c'est tres bizarre...
- 3★ `dessin:diabete:releve` diabete (Relevé) : Commentaire : on comprend pas trop
- 3★ `dessin:equilibre:pedagogique` equilibre (Pédagogique) : Commentaire : on comprend pas le point, les traits autour du pied sont bizarres. Il faudrait que ce soit une animation avec les pieds qui bougent et le point du milieu qui bouge aussi ou un truc du genre
- 3★ `dessin:equilibre:releve` equilibre (Relevé) : Commentaire : Pas compréhensible... les traits et le gribouilli sont pas compris
- 3★ `dessin:ongle:pedagogique` ongle (Pédagogique) : Commentaire : la fleche en vert ne se voit pas bien c'est pour montrer l'ongle incarné ?
- 3★ `dessin:ongle:releve` ongle (Relevé) : Commentaire : Anatomie de l'orteil un peu bizarre
- 4★ `dessin:orthonyxie:pedagogique` orthonyxie (Pédagogique) : Commentaire : Tres bien mais pas fan de la taille des doigts de pieds qui sont un peu trop fins comme des doigts de main
- 1★ `dessin:senior:pedagogique` senior (Pédagogique) : Commentaire : super la canne mais on comprend pas du tout le schema a gauche le rapport.
- 4★ `dessin:soin:releve` soin (Relevé) : Commentaire : Bien mais on sait pas trop pourquoi il y a besoin d'un zoom pour le soin.
- 4★ `dessin:talon:releve` talon (Relevé) : Commentaire : Top mais il faut se focus sur le talon la on voit l'ensemble du pied
- 3★ `heros:diabete:pedagogique` Pied diabétique (Pédagogique) [Clipart] : Commentaire : image de droite pas lisible et main trop bizarre anatomiquement
- 5★ `heros:enfant:ligne` Pieds de l’enfant (Trait continu) [Waouh] : Commentaire : J'adore
- 4★ `heros:enfant:releve` Pieds de l’enfant (Relevé) : Commentaire : bien mais on comprend pas pkoi les empreintes de l'enfant sont posees a cote
- 3★ `heros:ongles:ligne` Ongles incarnés, épais ou abîmés (Trait continu) : Commentaire : pas mettre les deux images a cote on comprend pas
- 3★ `heros:ongles:releve` Ongles incarnés, épais ou abîmés (Relevé) [Trop chargé] : Commentaire : trop d'illustrations cote a cote
- 3★ `heros:pedicurie:releve` Soins des pieds (pédicurie) (Relevé) : Commentaire : Un peu trop de contenus, on comprend pas bien
- 3★ `heros:semelles:ligne` Semelles orthopédiques (Trait continu) : Commentaire : les deux illustrations ensemble n'ont pas trop de sens
- 4★ `heros:semelles:releve` Semelles orthopédiques (Relevé) : Commentaire : la taille des pieds a droite est pas comprehensible et on comprend pas pkoi les deux sont cote a cote
- 4★ `heros:senior:ligne` Pieds des seniors (Trait continu) : Commentaire : Top, juste au niveau de la main et de la canne c'est un peu bizarre mais tout le reste est top
- 3★ `heros:sport:ligne` Sport et course à pied (Trait continu) : Commentaire : Jambes trop droites
- 2★ `heros:sport:pedagogique` Sport et course à pied (Pédagogique) : Commentaire : chaussure illisible a droite
- 2★ `heros:sport:releve` Sport et course à pied (Relevé) : Commentaire : Bonhomme sur la gauche affreux et aucun rapport entre les deux images
- 3★ `ligne:chaussure-course` chaussure-course (Trait continu) [Fade] : Commentaire : Pas mal mais un peu trop simple
- 2★ `ligne:empreintes` empreintes (Trait continu) [Anatomie fausse, Clipart] : Commentaire : trop clipart, et le trait entre les ronds et le reste du pied est bizarre
- 4★ `ligne:laser` laser (Trait continu) : Commentaire : pas mal mais on dirait pas trop un laser, peut etre trouver une representation plus parlante
- 3★ `ligne:orthoplastie` orthoplastie (Trait continu) : Commentaire : Non une orthoplastie doit avoir plus de "pate" entre les orteils et epouser un peu plus la forme du gros orteil sur le cote... on dirait une bague la
- 4★ `ligne:premiers-pas` premiers-pas (Trait continu) : Commentaire : Pas mal mais je prefere utiliser des petites empreintes ou les pieds adultes face aux pieds d'enfants
- 2★ `ligne:taping` taping (Trait continu) : Commentaire : il faut quon comprenne mieux que c'est du taping on dirait que c'est inclus dans le pied la... et je mettrais le taping en couleur assez flashy car les couleurs du taping sont en general flashy
- 2★ `materiel:autoclave-classe-b:ligne` Stérilisateur autoclave de classe B (autoclave-classe-b) : Commentaire : on dirait une carte postale un peu faudrait plus de details
- 2★ `materiel:fraiseuse-numerique:ligne` Fraiseuse numérique (CFAO) (fraiseuse-numerique) : Commentaire : on comprend pas
- 2★ `materiel:podoscope:pedagogique` Podoscope (podoscope) [Anatomie fausse, Clipart] : Commentaire : horrible les proportions sont out, il faut representer differemment. Les empreintes doivent etre en bas, les pieds sur la plateformes la representation dans l'espace est nulle. Concept de representation est bon mais representation dans l'espace est fausse

Formule : moyenne lissée = (somme + 4 × moyenne générale) / (n + 4) ; « Retiré » et « À retravailler » pénalisent l’asset dans les propositions.

## Retours de l’atelier des propositions

124 notes, moyenne 3,38 ★ — répartition : 1★ 2, 2★ 19, 3★ 41, 4★ 54, 5★ 8.

### Ingrédients les mieux notés

| Élément | Notes | Moyenne | Lissée | Effet | Étiquettes |
|---|---:|---:|---:|---:|---|
| Animation : semelles tracées en | 6 | 4,17 ★ | 3,67 ★ | +0,29 | — |
| Structure : Élégant et sobre | 46 | 3,67 ★ | 3,62 ★ | +0,24 | Harmonieux (2), Lisible (2) |
| Style : Trait fin | 49 | 3,65 ★ | 3,61 ★ | +0,23 | Harmonieux (3), Lisible (2), Bien dans le sujet (1) |
| Gamme : Encre | 6 | 4,00 ★ | 3,61 ★ | +0,23 | — |
| Sujet n° 1 : Enfants | 13 | 3,77 ★ | 3,60 ★ | +0,22 | Bien dans le sujet (1), Harmonieux (1), Fait pro (1) |
| Gamme : Prune | 7 | 3,71 ★ | 3,52 ★ | +0,14 | — |
| Gamme : Corail & bleu nuit | 5 | 3,80 ★ | 3,52 ★ | +0,14 | — |
| Style : Relevé | 17 | 3,59 ★ | 3,51 ★ | +0,13 | — |

### Ingrédients les moins bien notés

| Élément | Notes | Moyenne | Lissée | Effet | Étiquettes |
|---|---:|---:|---:|---:|---|
| Style : Photos | 25 | 2,76 ★ | 2,94 ★ | -0,44 | — |
| Gamme : Cobalt | 16 | 3,00 ★ | 3,15 ★ | -0,23 | — |
| Structure : Clair et pratique | 36 | 3,08 ★ | 3,15 ★ | -0,23 | Bien dans le sujet (1), Harmonieux (1), Fait pro (1) |
| Sujet n° 1 : Semelles | 36 | 3,19 ★ | 3,23 ★ | -0,14 | Harmonieux (1), Lisible (1) |
| Sujet n° 1 : Diabète | 14 | 3,14 ★ | 3,24 ★ | -0,14 | Harmonieux (1), Lisible (1) |
| Gamme : Cobalt & abricot | 12 | 3,17 ★ | 3,26 ★ | -0,12 | Harmonieux (1), Lisible (1) |
| Gamme : Corail | 4 | 3,00 ★ | 3,27 ★ | -0,11 | — |
| Structure : Simple et proche | 22 | 3,23 ★ | 3,27 ★ | -0,10 | — |

### Associations à garder (paires)

| Élément | Notes | Moyenne | Lissée | Effet | Étiquettes |
|---|---:|---:|---:|---:|---|
| Structure × Style : Élégant et sobre × Trait fin | 28 | 3,96 ★ | 3,79 ★ | +0,41 | Harmonieux (2), Lisible (2) |
| Structure × Style : Technique et précis × Relevé | 10 | 4,00 ★ | 3,66 ★ | +0,28 | — |
| Sujet n° 1 × Style : Pédicurie × Trait fin | 12 | 3,92 ★ | 3,65 ★ | +0,27 | — |
| Structure × Animation : Technique et précis × semelles tracées en | 6 | 4,17 ★ | 3,64 ★ | +0,26 | — |
| Structure × Animation : Élégant et sobre × image fixe | 46 | 3,67 ★ | 3,61 ★ | +0,23 | Harmonieux (2), Lisible (2) |
| Sujet n° 1 × Gamme : Enfants × Lavande & citron | 2 | 5,00 ★ | 3,61 ★ | +0,23 | — |
| Gamme × Style : Encre × Trait fin | 4 | 4,25 ★ | 3,60 ★ | +0,22 | — |
| Sujet n° 1 × Style : Enfants × Trait fin | 4 | 4,25 ★ | 3,60 ★ | +0,22 | Bien dans le sujet (1), Harmonieux (1), Fait pro (1) |

### Associations à revoir (paires)

| Élément | Notes | Moyenne | Lissée | Effet | Étiquettes |
|---|---:|---:|---:|---:|---|
| Structure × Style : Clair et pratique × Photos | 8 | 2,50 ★ | 3,03 ★ | -0,35 | — |
| Sujet n° 1 × Structure : Semelles × Simple et proche | 3 | 1,67 ★ | 3,04 ★ | -0,34 | — |
| Sujet n° 1 × Style : Diabète × Photos | 5 | 2,40 ★ | 3,09 ★ | -0,29 | — |
| Sujet n° 1 × Structure : Diabète × Clair et pratique | 6 | 2,50 ★ | 3,09 ★ | -0,29 | — |
| Sujet n° 1 × Style : Semelles × Photos | 9 | 2,78 ★ | 3,12 ★ | -0,26 | — |
| Structure × Style : Technique et précis × Photos | 10 | 2,80 ★ | 3,12 ★ | -0,26 | — |
| Structure × Animation : Technique et précis × image fixe | 10 | 2,80 ★ | 3,12 ★ | -0,26 | — |
| Structure × Gamme : Clair et pratique × Cobalt | 8 | 2,75 ★ | 3,13 ★ | -0,25 | — |

### Combinaisons préférées

| Élément | Notes | Moyenne | Lissée | Effet | Étiquettes |
|---|---:|---:|---:|---:|---|
| Semelles · Technique et précis · Menthe glacée & prune · Relevé · semelles tracées en | 3 | 4,33 ★ | 3,70 ★ | +0,32 | — |
| Enfants · Élégant et sobre · Lavande & citron · Illustrations douces | 1 | 5,00 ★ | 3,61 ★ | +0,23 | — |
| Enfants · Élégant et sobre · Pistache & framboise · Trait fin | 1 | 5,00 ★ | 3,61 ★ | +0,23 | — |
| Enfants · Simple et proche · Lavande & citron · Illustrations douces | 1 | 5,00 ★ | 3,61 ★ | +0,23 | — |
| Ongles · Élégant et sobre · Encre · Trait fin | 1 | 5,00 ★ | 3,61 ★ | +0,23 | — |
| Ongles · Élégant et sobre · Pastèque & menthe · Trait fin | 1 | 5,00 ★ | 3,61 ★ | +0,23 | — |
| Semelles · Élégant et sobre · Cobalt & abricot · Illustrations douces | 1 | 5,00 ★ | 3,61 ★ | +0,23 | — |
| Diabète · Élégant et sobre · Menthe glacée & prune · Trait fin | 2 | 4,00 ★ | 3,53 ★ | +0,15 | Harmonieux (1), Lisible (1) |

### Combinaisons ratées

| Élément | Notes | Moyenne | Lissée | Effet | Étiquettes |
|---|---:|---:|---:|---:|---|
| Semelles · Simple et proche · Menthe glacée & prune · Trait fin | 1 | 1,00 ★ | 3,04 ★ | -0,34 | — |
| Diabète · Clair et pratique · Ardoise · Photos | 1 | 1,00 ★ | 3,04 ★ | -0,34 | — |
| Semelles · Technique et précis · Menthe glacée & prune · Photos | 2 | 2,50 ★ | 3,16 ★ | -0,22 | — |
| Ongles · Clair et pratique · Lavande & citron · Illustrations douces | 2 | 2,50 ★ | 3,16 ★ | -0,22 | — |
| Seniors · Simple et proche · Tournesol & ardoise · Trait fin | 1 | 2,00 ★ | 3,18 ★ | -0,20 | — |
| Seniors · Simple et proche · Sauge · Photos | 1 | 2,00 ★ | 3,18 ★ | -0,20 | — |
| Semelles · Technique et précis · Cobalt & abricot · Photos | 1 | 2,00 ★ | 3,18 ★ | -0,20 | — |
| Semelles · Simple et proche · Menthe glacée & prune · Relevé | 1 | 2,00 ★ | 3,18 ★ | -0,20 | — |

### Étiquettes les plus fréquentes

- **Harmonieux** (3) : Style : Trait fin — 3 fois (6 %) ; Animation : image fixe — 3 fois (3 %) ; Structure : Élégant et sobre — 2 fois (4 %) ; Gamme : Ardoise — 1 fois (9 %)
- **Lisible** (2) : Structure : Élégant et sobre — 2 fois (4 %) ; Style : Trait fin — 2 fois (4 %) ; Animation : image fixe — 2 fois (2 %) ; Gamme : Cobalt & abricot — 1 fois (8 %)
- **Fait pro** (1) : Gamme : Ardoise — 1 fois (9 %) ; Sujet n° 1 : Enfants — 1 fois (8 %) ; Structure : Clair et pratique — 1 fois (3 %) ; Style : Trait fin — 1 fois (2 %)
- **Bien dans le sujet** (1) : Gamme : Ardoise — 1 fois (9 %) ; Sujet n° 1 : Enfants — 1 fois (8 %) ; Structure : Clair et pratique — 1 fois (3 %) ; Style : Trait fin — 1 fois (2 %)

### Commentaires

- 4★ Semelles · Clair et pratique · Menthe glacée & prune · Relevé : Commentaire : pas mal du tout mais Je mettrais une seule illustration dans le rond que les semelles par exemple. Les pieds en petits points devraient s'adapter a la couleur aussi et idealement pouvoir s'"animer"
- 3★ Semelles · Élégant et sobre · Cobalt · Illustrations douces : Commentaire : tres sympa mais trop d'illustrations a droite. J'en mettrais deux max et mieux organisees mais over look ok
- 2★ Semelles · Technique et précis · Cobalt & abricot · Photos : Commentaire : pedicurie-podologie coupé et trop simple
- 2★ Semelles · Clair et pratique · Menthe glacée & prune · Trait fin : Commentaire : images trop petites dans la bulle icones de soins trop petites et trop simples. Ca fait trop fiche doctolib la
- 4★ Semelles · Technique et précis · Canard · Relevé · semelles tracées en : Commentaire : Top, mais pedicurie podologie est encore coupe en passant a la ligne
- 3★ Semelles · Clair et pratique · Cobalt & abricot · Photos : Commentaire : Pas mal mais la bulle de droite est trop collee au pavé de gauche
- 3★ Semelles · Élégant et sobre · Menthe glacée & prune · Illustrations douces : Commentaire : je garderais une seule grande illustration a droite
- 3★ Diabète · Simple et proche · Terracotta · Illustrations douces : Commentaire : un peu trop simple et l'illustration (la main qui pique est bizrrement representee)
- 3★ Ongles · Clair et pratique · Lavande & citron · Illustrations douces : Commentaire : trop d'icones dans la bulle...
- 3★ Ongles · Technique et précis · Pastèque & menthe · Relevé · meulage d’un ongle : Commentaire : Bien mais pas fan de la section "en bref"
- 4★ Pédicurie · Élégant et sobre · Pastèque & menthe · Trait fin : Commentaire : bien les couleurs mais attention aux instruments en page d'accueil c'est pas genial... il faut rassurer
- 4★ Semelles · Technique et précis · Prune · Relevé · semelles tracées en : Commentaire : Top juste la section en bref qui est pas top
- 3★ Seniors · Simple et proche · Tournesol & ardoise · Illustrations douces : Commentaire : Illustration un peu trop simple pour etre aussi grande
- 3★ Seniors · Clair et pratique · Ardoise · Photos : Commentaire : bien mais bulle a droite un peu grande. Et je n'aime pas l'organisation des bulles "soins" "infos pratiques" ca fait trop doctolib
- 4★ Seniors · Élégant et sobre · Encre · Trait fin : Commentaire : la j'aime beaucoup
- 4★ Pédicurie · Élégant et sobre · Sable · Trait fin : Commentaire : Super mais enlever les instruments
- 3★ Semelles · Élégant et sobre · Cobalt & abricot · Trait fin [Harmonieux, Lisible] : Commentaire : J'adore la combinaison de couleurs, mais les deux illustrations une sur l'autre a droite, bof bof
- 3★ Sport · Simple et proche · Cobalt · Trait fin : Commentaire : aucun rapport entre les deux illustrations
- 3★ Enfants · Technique et précis · Sable · Photos : Commentaire : Bien mais texte à Lyon pas visible avec le fond

Formule : moyenne lissée = (somme + K × moyenne générale) / (n + K), K = 10 par ingrédient, 12 par paire, 6 par combinaison ; effet = lissée − moyenne générale.

## Hashtags des visuels

13 hashtags sur 16 visuels.

- #golf (6) : `photo:banque/libres/sport/pexels-1325681-1920.webp`, `photo:banque/libres/sport/pexels-15376335-1920.webp`, `photo:banque/libres/sport/pexels-29732064-1920.webp`, `photo:banque/libres/sport/pexels-5644641-1920.webp`, `photo:banque/libres/sport/pexels-5644647-1920.webp`, `photo:banque/libres/sport/pexels-5885314-1920.webp`
- #tennis (4) : `photo:banque/libres/sport/pexels-20186409-1920.webp`, `photo:banque/libres/sport/pexels-23379595-1920.webp`, `photo:banque/libres/sport/pexels-8224721-1920.webp`, `photo:banque/libres/sport/pexels-8542685-1920.webp`
- #bicycle (1) : `photo:banque/libres/sport/pexels-5687398-1920.webp`
- #bicyclist (1) : `photo:banque/libres/sport/pexels-5687398-1920.webp`
- #cyclist (1) : `photo:banque/libres/sport/pexels-35464439-1920.webp`
- #nordic (1) : `photo:banque/libres/senior/pexels-8795584-1920.webp`
- #racing (1) : `photo:banque/libres/sport/pexels-35464439-1920.webp`
- #rugby (1) : `photo:banque/libres/sport/pexels-39703728-1920.webp`
- #runner (1) : `photo:banque/libres/sport/pexels-33974329-1920.webp`
- #senior (1) : `photo:banque/libres/senior/pexels-8795584-1920.webp`
- #sprint (1) : `photo:banque/libres/sport/pexels-23371782-1920.webp`
- #trail (1) : `photo:banque/libres/sport/pexels-33974329-1920.webp`
- #woman (1) : `photo:banque/libres/senior/pexels-8795584-1920.webp`

## Sujets modifiés par Paul

- `animation:podoscope` podoscope (empreintes de podoscope en points de pression) : ajouté à Général
- `photo:banque/libres/diabete/pexels-12197307-1920.webp` : ajouté à Diabète
- `photo:banque/libres/diabete/pexels-6545623-1920.webp` : ajouté à Diabète
- `photo:banque/libres/diabete/pexels-6941882-1920.webp` : ajouté à Diabète
- `photo:banque/libres/diabete/pexels-6942089-1920.webp` : ajouté à Diabète
- `photo:banque/libres/diabete/pexels-6942172-1920.webp` : ajouté à Diabète
- `photo:banque/libres/diabete/pexels-6942177-1920.webp` : ajouté à Diabète
- `photo:banque/libres/diabete/pexels-8670516-1920.webp` : ajouté à Diabète
- `photo:banque/libres/diabete/pexels-8965125-1920.webp` : ajouté à Diabète
- `photo:banque/libres/diabete/pexels-8965129-1920.webp` : ajouté à Diabète
- `photo:banque/libres/diabete/pexels-8965131-1920.webp` : ajouté à Diabète
- `photo:banque/libres/diabete/pexels-8965149-1920.webp` : ajouté à Diabète
- `photo:banque/libres/enfant/pexels-31663897-1920.webp` : ajouté à Enfants
- `photo:banque/libres/enfant/pexels-31663899-1920.webp` : ajouté à Enfants
- `photo:banque/libres/enfant/pexels-34391279-1920.webp` : ajouté à Enfants
- `photo:banque/libres/enfant/pexels-35831748-1920.webp` : ajouté à Enfants
- `photo:banque/libres/enfant/pexels-36738012-1920.webp` : ajouté à Enfants
- `photo:banque/libres/enfant/pexels-37244956-1920.webp` : ajouté à Enfants
- `photo:banque/libres/enfant/pexels-4964358-1920.webp` : ajouté à Enfants
- `photo:banque/libres/enfant/pexels-5445464-1920.webp` : ajouté à Enfants
- `photo:banque/libres/enfant/pexels-7491088-1920.webp` : ajouté à Enfants
- `photo:banque/libres/enfant/pexels-7491099-1920.webp` : ajouté à Enfants
- `photo:banque/libres/enfant/pexels-7946980-1920.webp` : ajouté à Enfants
- `photo:banque/libres/ongles/pexels-13707062-1920.webp` : ajouté à Ongles
- `photo:banque/libres/ongles/pexels-5619466-1920.webp` : ajouté à Ongles
- `photo:banque/libres/ongles/pexels-5841840-1920.webp` : ajouté à Ongles
- `photo:banque/libres/ongles/pexels-8910125-1920.webp` : ajouté à Ongles, Enfants
- `photo:banque/libres/ongles/pexels-9486635-1920.webp` : ajouté à Ongles
- `photo:banque/libres/senior/pexels-14177316-1920.webp` : ajouté à Seniors
- `photo:banque/libres/senior/pexels-16148890-1920.webp` : ajouté à Seniors
- `photo:banque/libres/senior/pexels-16901400-1920.webp` : ajouté à Seniors
- `photo:banque/libres/senior/pexels-6787441-1920.webp` : ajouté à Seniors
- `photo:banque/libres/senior/pexels-7938830-1920.webp` : ajouté à Seniors
- `photo:banque/libres/senior/pexels-8795391-1920.webp` : ajouté à Seniors
- `photo:banque/libres/senior/pexels-8795584-1920.webp` : ajouté à Seniors
- `photo:banque/libres/senior/pexels-8795589-1920.webp` : ajouté à Seniors
- `photo:banque/libres/sport/pexels-12918252-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-1325681-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-15326698-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-15376335-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-20186409-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-23371782-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-23379595-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-29732064-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-33974329-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-35464439-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-3763867-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-39703728-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-5644641-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-5644647-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-5687398-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-5687491-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-5885314-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-8224721-1920.webp` : ajouté à Sport
- `photo:banque/libres/sport/pexels-8542685-1920.webp` : ajouté à Sport

## Animations en attente d’ingrédients validés

Règle de Paul : aucune animation créée ni modifiée tant que ses images de base ne sont pas « Validé » dans /admin/illustrations ;
une animation se construit À PARTIR des ingrédients validés (mêmes géométries). Source : packages/core/src/animations-sources.ts.

### `animation:coureur` — coureur en pleine foulée (2 ingrédients sur 3 à valider)
- [ ] `dessin:sport:releve` — Dessin « sport » (relevé) : foulée, chaussure de course : À revoir
- [ ] `dessin:sport:pedagogique` — Dessin « sport » (pédagogique) : image calme de l’animation : À revoir
- [x] `materiel:tapis-de-course:releve` — Tapis de course (relevé) : laboratoire d’analyse de la foulée : Validé

### `animation:trajectoire` — trajet du centre de pression pendant le pas (3 ingrédients sur 4 à valider)
- [ ] `dessin:equilibre:releve` — Dessin « équilibre » (relevé) : appuis et centre de pression : À revoir
- [ ] `dessin:equilibre:pedagogique` — Dessin « équilibre » (pédagogique) : image calme de l’animation : À revoir
- [x] `biblio:POD-SC-0007` — Empreinte plantaire (trace d’appui) : contour des deux pieds : Validé
- [ ] `materiel:stabilometrie:releve` — Plateforme de stabilométrie (relevé) : tracé du centre de pression : À revoir

### `animation:premiers-pas` — petites empreintes de premiers pas (1 ingrédient sur 2 à valider)
- [ ] `dessin:enfant:releve` — Dessin « enfant » (relevé) : empreintes d’enfant en trame de points : À revoir
- [x] `dessin:enfant:pedagogique` — Dessin « enfant » (pédagogique) : image calme de l’animation : Validé

### `animation:semelle` — semelles tracées en courbes de niveau (2 ingrédients sur 4 à valider)
- [ ] `dessin:semelle:releve` — Dessin « semelle » (relevé) : courbes de relief de la semelle : À revoir
- [ ] `dessin:semelle:pedagogique` — Dessin « semelle » (pédagogique) : image calme de l’animation : À revoir
- [x] `biblio:POD-AT-0004` — Semelle orthopédique (bibliothèque, vue de dessus) : contour de la semelle : Validé
- [x] `biblio:EZ-HTML/semelle-ortho` — Semelle orthopédique en couleur (bibliothèque) : pièces de la semelle : Validé

### `animation:meulage` — meulage d’un ongle épaissi à la fraise, en étapes (2 ingrédients sur 4 à valider)
- [ ] `biblio:POD-AT-0003:profil-medial:ongle-epais` — Hallux de profil, ongle épaissi (bibliothèque) : géométrie de la scène : À revoir
- [x] `biblio:POD-AT-0003:profil-medial:ongle-epais-meulage` — Fraise et pièce à main du micromoteur (bibliotheque/soins-ongles.ts) : Validé
- [x] `dessin:ongles-epais:releve` — Dessin « ongles épais » (relevé) : Validé
- [ ] `dessin:ongles-epais:pedagogique` — Dessin « ongles épais » (pédagogique) : À revoir

## Inspirations (références seulement, jamais réutilisées)

Aucune inspiration pour l’instant.
