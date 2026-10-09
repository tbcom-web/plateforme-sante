# Manques signalés par le directeur artistique

Passe du 2026-10-07 (profil de goût 2026-10-07.v2), 67 essais rendus sur 4 scénarios : sport + corail/bleu, diabète sans
couleur, enfants + jaune/vert, seniors + bleu (`.claude/agents/directeur-artistique.md`, propositions dans
`retours/recettes-proposees.json`).

Circuit : Paul décide dans le Studio (« À faire » / « Pas utile ») → création par l'agent compétent → revue dans « Donner mon
avis » → implémentation, ligne dans `retours/CHANGEMENTS.md`, manque retiré d'ici. Le directeur ne crée rien lui-même.

### M1 — Héros diabète sans instrument
- **Constat** : dans les 16 essais diabète, le premier écran montre le monofilament tenu par une main (trait fin, illustrations douces, disque, notice). Le héros pédagogique est noté 3 ★ (« main trop bizarre anatomiquement ») ; « il faut rassurer » (pas d'instrument en accueil).
- **Impact** : plafonne toutes les recettes diabète à ~3,8 ★ ; c'est le seul scénario sans proposition à 4 ★.
- **Proposition** : un héros diabète rassurant, une seule idée : pieds au trait vus de dessus avec un miroir d'auto-examen posé au sol, ou pied chaussé d'une chaussette sans couture et d'une chaussure adaptée ; aucun instrument, aucune couleur sur la peau, pas de rouge. Garder le monofilament pour la fiche de soin.
- **Qui** : illustrateur-medical (dessin), graphiste-sante (intégration au héros des trois styles).
- **Priorité** : haute

### M2 — Photos utilisables par sujet
- **Constat** : parmi les photos importées, une seule photo de sport a 4 ★ (`photo:sport-course`) et aucune pour le diabète ni pour les seniors (examen-mains 3 ★, soin-talon 2 ★, chaussage, bandages, pied-tenu 1 ★). Essai sport « Photos » : la même photo répétée trois fois (2,8 ★). Les enfants ont 5 photos à 4 ★.
- **Impact** : style « Photos » écarté pour sport, diabète et seniors ; recettes moins variées.
- **Proposition** : noter (et importer si elles plaisent) les photos libres déjà classées dans la banque : Seniors (8), Diabète (11), Sport (≈ 45, dont course et marche). Cible : 3 photos ≥ 4 ★ par sujet, sans visage, gestes rassurants, nettes et lumineuses.
- **Qui** : Paul (notes et import dans /admin/photos).
- **Priorité** : haute

### M3 — Carte du sujet « Seniors » trop simple
- **Constat** : la carte du sujet Seniors (maison + mallette au trait) se lit mal : on ne comprend pas le rapport avec les pieds (visites à domicile ?) et elle est « trop simple pour sa taille » dans les 15 essais seniors.
- **Impact** : deuxième écran faible dans les trois propositions seniors.
- **Proposition** : remplacer par un pied au trait chaussé d'une chaussure confort à scratch, ou par le héros de la marche à la canne recadré sur les pieds ; une seule idée, trait fin cohérent avec le héros.
- **Qui** : illustrateur-medical, puis graphiste-sante.
- **Priorité** : haute

### M4 — Coureur du héros sport
- **Constat** : en relevé (structure Technique et précis), le coureur animé est en bâtons (« bonhomme affreux »), et l'animation `coureur` attend encore 2 ingrédients sur 3 ; en trait fin, « jambes trop droites » (3 ★).
- **Impact** : Technique et précis (structure n° 1 du sport) est inutilisable en pratique ; les propositions sport passent par le trait fin.
- **Proposition** : retravailler la foulée au trait (genou fléchi, pied d'appui en attaque talon, buste visible) puis, une fois validée, reconstruire l'animation à partir de cette géométrie.
- **Qui** : illustrateur-medical (foulée), graphiste-sante (animation, après validation de Paul).
- **Priorité** : moyenne

### M5 — Héros coupé en haut sur téléphone
- **Constat** : à 375 px, l'image du premier écran est recadrée en haut : jambes sans le corps (sport), pieds d'adulte coupés (enfants), et le disque de « Carte et disque » réduit le sujet.
- **Impact** : perte de sens du héros préféré (adulte face à l'enfant, 5 ★) sur mobile, qui compte plus dans les notes.
- **Proposition** : cadrage mobile propre à chaque héros (point focal ou viewBox mobile) pour que la scène entière tienne dans le cadre ; vérifier les 4 gabarits.
- **Qui** : intégrateur (graphiste-sante).
- **Priorité** : moyenne

### M6 — Paire de polices éditoriale chaleureuse et lisible
- **Constat** : « Éditoriale chaleureuse » (Fraunces / Inter) a été rejetée dans les 4 scénarios : titres moyens serrés et irréguliers (« Une prise en charge », « Venir au cabinet »). « Serif fine » est trop maigre pour le sport et les seniors ; la Bodoni est fine pour des seniors.
- **Impact** : aucune serif chaleureuse et lisible ; les recettes seniors et diabète se replient sur des sans-serif.
- **Proposition** : régler Fraunces (graisse 500 à 600, axe « soft », interlettrage normal) ou ajouter une serif de texte robuste (ex. Literata ou Source Serif 4, libres) en titres avec Inter.
- **Qui** : intégrateur (paires de polices), revue par Paul dans le Studio.
- **Priorité** : moyenne

### M7 — Empreintes d'enfant en aplat
- **Constat** : en illustrations douces et en Simple et proche, les empreintes d'enfant sont des aplats pâles à ronds (gris, kaki ou rose) : lecture « clipart » (R2.4), qui jure avec la lavande ou la sauge.
- **Impact** : seul le trait fin fonctionne pour les enfants.
- **Proposition** : empreintes d'enfant pédagogiques avec contour franc et orteils dessinés, couleur dérivée de la gamme.
- **Qui** : illustrateur-medical.
- **Priorité** : moyenne

### M8 — Ombre portée lourde des médaillons
- **Constat** : en Simple et proche (notice tramée) et en Clair et pratique, le médaillon du héros a une ombre portée décalée très marquée qui alourdit le premier écran (diabète, seniors).
- **Impact** : ces structures paraissent plus datées que nécessaire ; « gris éteint » avec ardoise ou encre.
- **Proposition** : variante de médaillon sans ombre ou ombre douce, au choix du jeu d'effets « Sobre ».
- **Qui** : intégrateur.
- **Priorité** : basse

### M9 — Variantes sans effet avec un seul sujet
- **Constat** : avec un seul sujet, « Le premier à la une », « Grandes rangées » et l'ordre « Soins puis horaires » donnent la même page ; plusieurs essais de structure n'ont rien changé.
- **Impact** : dés du Studio qui « ne font rien » pour un praticien à un seul sujet.
- **Proposition** : une présentation dédiée au sujet unique (grande bande illustrée pleine largeur) ou griser ces variantes dans ce cas.
- **Qui** : intégrateur.
- **Priorité** : basse

## Passe du 2026-10-09 — ce qui plafonne les modèles « canons » (priorisé)

Passe « modèles canons » (8 designs `canon-D1` à `canon-D8` dans `retours/recettes-proposees.json`, analyse dans
`docs/analyse-gout-2026-10-09.md`). Mesures : jauge 4-5 ★ (`qualiteComposition`), harmonie (`scoreHarmonie`, poids appris des
exports), rendus réels (accueil, page sujet, fiche soin, contact, 1440 et 375 px) et testeur (`npm run tester:modele`). Les
meilleurs designs plafonnent à **72-80 % d'éléments 4-5 ★** : les manques ci-dessous expliquent les 20-28 % restants.

### M10 — Axes typographiques jamais notés à 4-5 ★
- **Constat** : échelle (modeste 2, spectaculaire 3, affirmée jamais notée), casse (normale 3, majuscules 1, petites capitales
  jamais), interlettrage (aucune note ; « large » retiré), alignement (gauche 3), surtitre (les 4 à 3 ★) : une seule note chacun.
  Ces 5 axes sont dans CHAQUE composition : 4 à 5 éléments « jamais notés / 3 ★ » sur 36 dans les 8 canons.
- **Impact** : aucune composition ne peut dépasser ≈ 86 % de 4-5 ★ ; c'est le premier plafond de la jauge (et du verrou « 100 % »).
- **Proposition** : une session Dégustation « Détail · typographie » (grilles de 6 déjà prêtes : graisse, casse, interlettrage,
  échelle) — 5 minutes ; l'atelier montre déjà la direction (graisse « paire » 4,86, serré 4,63, à gauche 4,60, petites capitales 4,25).
- **Qui** : Paul (notes). **Priorité** : haute.

### M11 — Un seul modèle de structure à 4 ★
- **Constat** : `modele:technique-precis` 4 (2 notes) ; Élégant et sobre 3 (2 notes) alors que l'atelier le donne à 3,82 (154
  notes) et que 6 canons sur 8 l'utilisent (meilleur accord avec le trait continu et les serifs).
- **Impact** : un élément « 3 ★ » d'office dans 6 canons ; la recherche est tirée vers Technique et précis, qui a les défauts de
  gabarit de M16.
- **Proposition** : faire noter à nouveau les 4 modèles (tuile « Structures », ou duels) sur des rendus récents.
- **Qui** : Paul. **Priorité** : haute.

### M12 — Pages sans aucune option 5 ★ (accès, cabinet, page sujet, fiche, questions, article)
- **Constat** : structures notées : accueil 77 variantes à 5 ★ ; mais Contact et accès max 4 (31 variantes), Le cabinet max 4,
  page sujet max 4 (colonnes 3), fiche soin : seule « encadré » notée (4), questions 3, article 3 (« je préfère les en-têtes image
  plein écran »). Sur les planches des canons, ces pages se ressemblent d'un design à l'autre (titre, image, liste à filets).
- **Impact** : le « cran au-dessus » se joue sur l'accueil seulement ; les pages intérieures restent au niveau 4 ★.
- **Proposition** (code, gabarits) : article à en-tête image plein écran ; page sujet « une grande illustration + 3 conseils
  illustrés » (pictos 5 ★) ; cabinet : galerie grande + équipe en portraits (portraits 5 ★ à valider) ; contact : carte et
  horaires côte à côte avec le plan en grand ; puis notation par page (« Donner mon avis », onglet par page).
- **Qui** : intégrateur, puis Paul. **Priorité** : haute.

### M13 — Héros sport en illustration
- **Constat** : `heros:sport:releve` 2,5 (refusé par le testeur), pédagogique 3, trait 3,5 (« jambes trop droites ») ; coureur
  animé 2,5. Deux canons compatibles sport (D2, D8) : D2 ne peut pas être rendu en sport (relevé refusé), D8 passe par le trait (3,5 ★).
- **Impact** : aucun design sport ne dépasse 3,5 ★ sur l'image principale ; c'est pourtant le thème le plus demandé.
- **Proposition** : foulée au trait retravaillée (M4) ; à défaut, un héros « objet » : la chaussure de running EZ-HTML (4,89 ★,
  10 notes, à retravailler) avec la semelle en coupe, une seule idée. Pour les photos : importer en banque intégrée 3 des 15 photos
  libres de sport à 5 ★ (elles ne sont pas dans les kits rendus hors ligne, M15).
- **Qui** : illustrateur-medical / graphiste-sante ; Paul pour l'import. **Priorité** : haute.

### M14 — Héros diabète sans instrument (rappel M1, toujours ouvert)
- **Constat** : en trait et en pédagogique, l'image du diabète montre le monofilament tenu (3 ★ ; « il faut rassurer ») ; le relevé
  est interdit pour le diabète. Contournement de D7 : premier écran typographique (aucune image en accueil) ; D4 (Canard, bento) garde l'image du monofilament.
- **Impact** : D4 et D7 plafonnés pour le diabète ; diabète = seul thème sans héros ≥ 4 ★ autorisé.
- **Proposition** : en cours chez l'agent de l'univers diabète (dessins) : pieds au trait et miroir d'auto-examen, chaussette sans
  couture ; garder le monofilament pour la fiche de soin.
- **Qui** : illustrateur-medical (en cours). **Priorité** : haute.

### M15 — Kits photos des rendus hors ligne : photos refusées tirées
- **Constat** : `habillerPourProfil` avec `poids: null` (testeur, rendus de démonstration) tire les photos du kit SANS les notes :
  diabète, senior, ongles, semelles reçoivent `cabinet-lumiere` (retirée), `soins-pied-tenu`, `soins-bandages` (1 ★) ; sport reçoit
  `sport-foulee-herbe` (1 ★). Les 23 photos libres à ≥ 4,5 ★ (15 sport, 5 diabète) ne sont pas dans la banque intégrée.
- **Impact** : aucun design « Photos » ne peut passer le testeur (images refusées = bloquant) ; style Photos écarté des canons.
- **Proposition** (code) : passer `notesPhotos` / exclusions (`clesImagesExclues`) au contexte du testeur et de `rendu-profil` ;
  copier en banque intégrée 3 photos ≥ 4,5 ★ par thème (sport, diabète) avec leurs crédits.
- **Qui** : intégrateur ; Paul (choix des photos). **Priorité** : haute.

### M16 — Gabarit « Technique et précis » : défauts techniques au testeur
- **Constat** (testeur, D2) : débordement à 768 et 1024 px du statut du praticien en mono avec des noms longs
  (`.praticien__statut.mono`, `components/gabarit/Praticiens.astro`), ancre `/le-cabinet#praticiens` absente, chevauchement de mots
  liés sur la page d'accès à 1024-1440 px, barre d'actions qui masque le pied de page.
- **Impact** : tout design sur Technique et précis (structure la mieux notée, 4,05 à l'atelier) part rouge au testeur.
- **Proposition** : `overflow-wrap: anywhere` + `min-width: 0` sur le statut ; `id="praticiens"` sur la section équipe du cabinet ;
  revoir la grille de la page d'accès ; marge basse du pied de page = hauteur de la barre.
- **Qui** : intégrateur. **Priorité** : haute.

### M17 — Premiers écrans « libres » du lot 2 sans illustration
- **Constat** : Tache qui se transforme (5 ★), Papier découpé, Bandes ondulantes, Voûte en aplat, Forme qui respire : formes
  abstraites seules (rendus D6) ; Paul : « Super mais il faudrait ajouter une photo / illustration devant les aplats ».
- **Impact** : ces 5 premiers écrans très bien notés ne peuvent pas porter un design (aucune image du sujet) ; les canons se
  partagent 6 premiers écrans (notice, bento, maille, figure, carte, typographique) et deux se répètent.
- **Proposition** (code) : poser le héros du kit devant les aplats (même hôte que « maille ») ; puis validation du lot 2.
- **Qui** : intégrateur, puis Paul (validation). **Priorité** : moyenne.

### M18 — Alternatives conformes aux témoignages et aux chiffres
- **Constat** : témoignages et bandeaux de chiffres sont interdits (déontologie) ; les accueils des canons enchaînent premier écran,
  sujets, soins, accès : la page manque d'un bloc de réassurance.
- **Proposition** (textes des packs uniquement) : « Comment se déroule la séance » en 4 étapes illustrées (déjà dans la fiche bilan),
  « Hygiène et matériel » avec les pictos 5 ★ (autoclave A/C) et le matériel 5 ★, galerie « le cabinet en images » (grande, 4,5 ★),
  bloc équipe en portraits 5 ★ (à valider).
- **Qui** : intégrateur (sections), Paul (validation des portraits). **Priorité** : moyenne.

### M19 — Jeux de détails tous ≤ 3 ★
- **Constat** : `details:jeu` : classique-sobre 3, éditorial-chic 3, magazine 3, technique-net 2,5, doux-rond 2, graphique-pop 1.
  Les canons utilisent donc « ceux du modèle » + éléments un à un (coins, boutons, badges, citations 4-4,5 ★).
- **Impact** : pas de « famille de détails » cohérente prête. Mesuré : un design **Graphique pop** (Géométrique pop × Pistache, 5 ★ chacun)
  plafonne à 87-89 d'harmonie sans son jeu de détails (1 ★) : aucune proposition pop parmi les canons. Idem Doux et rond (jeu 2 ★) : D3 tient
  à 90 seulement avec des éléments un à un.
- **Proposition** : retoucher les jeux d'après les éléments 4 ★ (coins arrondis, ombre douce, boutons pilule / flèche, citation
  aplat) et les faire renoter ; retirer graphique-pop.
- **Qui** : graphiste-sante, Paul. **Priorité** : moyenne.

### M20 — Testeur : faux positifs de contraste sur polices fines et fonds texturés
- **Constat** : premier passage des canons rouge pour des textes lisibles (« 1,35:1 (fond varié) » sur du blanc sur bleu nuit,
  « 2,02:1 » sur du gris foncé sur rose pâle) : l'anticrénelage des polices fines (Bodoni, mono, condensée) et les fonds grain /
  trame / grille comptaient comme « fond » au 10e centile.
- **Fait dans cette passe** : `analyserFondTexte` écarte les pixels de bord de lettre situés entre la couleur du texte et le fond
  dominant, fond dominant cherché hors bords (test ajouté). Les canons n'utilisent plus de fond texturé (grain / trame / grille).
- **Reste** : rejouer le testeur sur les modèles déjà testés ; garder un œil sur les fonds à motif sombre (pois du relevé). Autre mesure
  à corriger : les résumés de soins tronqués (« … ») des cartes à 360-375 px sont comptés comme « chevauchements » (boîte du texte coupé
  plus haute que sa partie visible ; vignettes regardées, rien de visible) : ce sont les seuls majeurs de D5, D6, D7, D8 (orange).
- **Fait aussi** : cibles tactiles ≥ 24 px pour le lien d'auteur des articles, le téléphone / e-mail du pied de page et l'étiquette
  « Matériel du cabinet » des fiches (les polices à petit œil — Bodoni, Ronde — les rendaient « majeures »).
- **Qui** : intégrateur. **Priorité** : moyenne.

### M21 — Harmonie sous-estime la combinaison n° 1 de Paul
- **Constat** : Enfants · Simple et proche · Lavande & citron · Illustrations douces (5,0 ★, 4 notes, la meilleure combinaison) est
  plafonnée à **89** (accord Simple et proche × Pédagogique fixé à 0,7) : elle ne peut pas passer le seuil de 90 des canons.
- **Proposition** : faire apprendre l'accord structure × style des notes de l'atelier (au lieu de la table fixe `ACCORD_STRUCTURE_STYLE`).
- **Qui** : intégrateur. **Priorité** : basse.

### M22 — Animations d'en-tête et portraits notés 5 ★ mais « à valider »
- **Constat** : 8 animations d'en-tête et 5 présentations de portraits à 5 ★ restent « à valider » (lot 2) : les canons les évitent
  (aucun élément à valider), donc pas de mouvement en accueil ni de portraits riches.
- **Proposition** : une passe de validation de Paul (statut « Validé » dans /admin/illustrations), à la main.
- **Qui** : Paul. **Priorité** : basse.

<!-- couverture-auto -->
## Couverture par sujet (export automatique)

| Sujet | Héros | Illustr. relevé | Illustr. illustrations douces | Illustr. trait fin | Icônes | Photos importées | Photos intégrées | Animations validées |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Sport | 9 | 13 | 25 | 25 | 16 | 49 | 4 | 0/2 |
| Diabète | 12 | 7 | 10 | 7 | 7 | 12 | 0 | 0/2 |
| Ongles | 9 | 6 | 6 | 6 | 5 | 5 | 2 | 0/1 |
| Enfants | 12 | 13 | 12 | 12 | 3 | 14 | 6 | 0/3 |
| Seniors | 12 | 7 | 9 | 7 | 6 | 13 | 2 | 0/1 |
| Semelles | 9 | 12 | 12 | 11 | 3 | 0 | 4 | 0/2 |
| Pédicurie | 12 | 8 | 9 | 8 | 5 | 2 | 2 | 0/1 |
| Général | 0 | 1 | 2 | 2 | 3 | 0 | 5 | 0/1 |

Manques (tri : /admin/retours/tri?sujet=<sujet>&famille=<famille>) :
- **Semelles : 0 photo importée** — tri : `?sujet=semelles&famille=photos`
- **Général : 0 photo importée** — tri : `?sujet=general&famille=photos`
- Sport : aucune animation validée (2 en attente) — tri : `?sujet=sport&famille=animations`
- Diabète : aucune animation validée (2 en attente) — tri : `?sujet=diabete&famille=animations`
- Ongles : aucune animation validée (1 en attente) — tri : `?sujet=ongles&famille=animations`
- Enfants : aucune animation validée (3 en attente) — tri : `?sujet=enfant&famille=animations`
- Seniors : aucune animation validée (1 en attente) — tri : `?sujet=senior&famille=animations`
- Semelles : aucune animation validée (2 en attente) — tri : `?sujet=semelles&famille=animations`
- Pédicurie : aucune animation validée (1 en attente) — tri : `?sujet=pedicurie&famille=animations`
<!-- /couverture-auto -->
