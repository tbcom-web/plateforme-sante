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
