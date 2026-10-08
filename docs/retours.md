# Retours de Paul → Claude

Comment les avis donnés dans le back-office arrivent jusqu'à Claude, sans qu'aucune clé Supabase ne sorte des secrets GitHub.

## Où Paul donne son avis

| Page | Ce qu'on y note | Table |
|---|---|---|
| `/admin/retours` « Donner mon avis » | Une carte à la fois, tirée au hasard (jamais notés d'abord, puis modifiés depuis la dernière note, puis notes incertaines) : thèmes complets, illustrations, icônes, photos, animations, couleurs, structures. « Ce qui va bien » / « Ce qui ne va pas », commentaire, 1 à 5 étoiles. | `assets_notes` (0027), `atelier_notes` (0026) |
| `/admin/illustrations` « Bibliothèque & retours » | Inventaire complet, statut (Validé, À retravailler, À revoir, Retiré), note rapide. | `illustrations_revues` / `illustrations_statuts` (0021), `assets_notes` |
| `/admin/atelier` | Combinaisons du générateur, scénario au choix. | `atelier_notes` |
| `/admin/retours` → **Inspirations** | Image de référence (fichier, glisser-déposer ou capture collée, lien facultatif), « ce qui me plaît » (couleurs, composition, typographie, style d'illustration, ambiance, mise en page mobile, icônes), ce qu'on veut en tirer, sujet et type d'élément. Palette dominante extraite dans le navigateur ; synthèse « Palettes récurrentes » avec gammes candidates (AA vérifié, jamais ajoutées automatiquement). **Référence d'inspiration uniquement : jamais copiée ni réutilisée sur les sites.** | `inspirations` + bucket privé `inspirations` (0028) |
| `/admin/retours` → **Photos à découvrir** | Photos libres de droits Pexels / Pixabay, une à la fois : GARDER (hébergée chez nous, licence tracée) ou REJETER, étiquettes, sujet cible. Voir `docs/photos-libres.md`. | `photos_libres`, `photos_libres_avis`, `photos_libres_mots_cles` (0028) |

### Remarques, avant / après, sujets (migration 0028)

- **Remarques libres distinctes** : sous « Ce qui va bien », un champ « Ce qui va bien (libre) » ; sous « Ce qui ne va pas »,
  « Ce qui ne va pas (libre) » (colonnes `positif` / `negatif` de `assets_notes` et `atelier_notes`). L'ancien `commentaire`
  reste lu pour les notes plus anciennes. Sans la migration 0028, les deux champs sont regroupés dans `commentaire`.
- **Avant / après** : quand un élément noté a été modifié depuis (empreinte différente), la carte de « Donner mon avis » et la
  vue agrandie de la bibliothèque montrent côte à côte « Avant (votre note, vos remarques) » et « Après ». Ces éléments sont
  tirés **en premier**, avant les jamais notés. L'« avant » vient de l'instantané enregistré avec la note (`assets_notes.apercu` :
  SVG minifié ≤ 60 Ko, adresse de la photo ou de la structure, couleurs de la gamme), sinon d'une **archive** des rendus d'un
  commit (`apps/admin/public/archives/assets-<commit>.json.gz`, cherchée par clé + empreinte notée). Archive initiale : commit
  `d07548f` (version notée le 2026-10-07).
- **Archiver avant une grosse série de retouches** (Claude) : `npm run archiver-assets -- <commit>` (par défaut le commit à
  archiver est celui donné ; d'habitude `HEAD` avant de retoucher). Le script crée un `git worktree` temporaire du commit (jamais
  l'arbre de travail, qui peut contenir des retouches en cours), calcule les rendus et empreintes avec le code de CE commit,
  écrit l'archive et `index.json`, puis retire le worktree. Option `--worktree <dossier>` pour choisir où le créer. Committer
  l'archive avec les retouches.
- **Sujets des visuels** : sur chaque carte et dans la vue agrandie, puces des sujets associés (défauts du code :
  `packages/core/src/sujets-visuels.ts` — soins et fiches de la bibliothèque, thème des héros, spécialité des photos, sujet
  choisi pour les photos libres). « × » retire un sujet, « + Sujet » en ajoute un (table `assets_sujets`, journal en ajout seul,
  état courant = dernière action ; `assets_sujets_effectifs()` pour le générateur). Effet : un héros ou une photo retiré d'un
  sujet n'est plus proposé pour ce sujet (propositions du parcours, tirage et galerie des jeux de photos des sites) ; si un
  sujet n'a plus aucun visuel d'une famille, le générateur garde un repli et la synthèse le signale (« sujet sans visuel »).
  Filtre « Visuels du sujet » dans « Donner mon avis » et dans la bibliothèque.

Les notes servent tout de suite au générateur (`packages/core/src/atelier-poids.ts`, `assets-poids.ts`) : moyennes lissées,
« Retiré » et « À retravailler » pénalisent l'asset ; les garde-fous (diversité, diabète sans rouge, posture jamais, AA)
priment toujours.

### Trier par sujet et duels « A ou B ? » (2026-10-08)

- **Trier par sujet** (`/admin/retours/tri`, `packages/core/src/couverture-sujets.ts`) : file des visuels (illustrations,
  héros, icônes, photos des jeux et photos libres importées, animations) — sans sujet, seulement « général », pouvant compléter
  un sujet mal couvert (suggestion), jamais trié, déjà trié ; gros boutons des sujets (1-8), suggestions `suggererClassement`
  pré-cochées en pointillé, hashtags suggérés, Entrée = « Suivant » (ajouts / retraits dans `assets_sujets`, suggestions
  acceptées / refusées dans `classement_suggestions`) ; sélection multiple (« Ajouter le sujet X à la sélection ») ; tableau de
  **couverture par sujet** (héros, illustrations par style, icônes, photos importées / intégrées, animations validées, retirés
  exclus) et manques avec lien vers le tri filtré (`?sujet=senior&famille=photos`). Export : section « Couverture par sujet » de
  `SYNTHESE.md` et bloc automatique de `MANQUES.md` (entre `<!-- couverture-auto -->` et `<!-- /couverture-auto -->`).
- **Duel « A ou B ? »** (`/admin/retours/duel`, `packages/core/src/duels.ts`, table `duels`, migration 0037, journal en ajout
  seul ; `duels_apprentissage()` sans auteur ni remarque) : thèmes complets, typographies, traitements photo, éléments d'une
  page, photos (même sujet, même emplacement, même traitement), illustrations et héros (même dessin en deux styles, ou deux
  dessins du même style). Paires : même scénario ; une seule dimension différente (contrôlée champ par champ), environ 15 % de
  duels libres entre deux recettes bien classées ; paire déjà jouée évitée ; éléments incertains et dimensions peu jouées
  d'abord. Classement : Bradley-Terry bayésien (a priori N(0, 1), égalité = demi-victoire, « les deux sont mauvais » = défaite
  de chacun contre l'élément moyen, poids 0,35), affiché en Elo ± incertitude par famille × sujet n° 1. Apprentissage :
  Δduel(k) = clamp(0,5 · θk, ±0,5 ★) sur les clés qui diffèrent (duel libre : poids 0,5 ; mobile : 1,25), cumulé aux renforts
  des notes dans la limite de ±1 ★ (`fusionnerRenforts`, `lib/atelier.ts`). Juge : « Claude prévoyait A » après le choix
  (`predireDuel`, colonne `prediction`), accord dans la page et dans la synthèse. Export : `retours/duels.json` et section
  « Duels : classements par sujet » de `SYNTHESE.md`. Sans la migration : duels gardés dans le navigateur.

### Hashtags libres dans le tri, illustration de base et duels de variantes (2026-10-08)

- **Hashtags dans « Trier par sujet »** (« on doit pouvoir donner des hashtags, par exemple Laser ») : vue « Un par un » ET
  action groupée de la grille. Champ avec puces supprimables, Entrée ou virgule pour ajouter, autocomplétion (hashtags déjà
  utilisés triés par fréquence, puis vocabulaire métier : soins du catalogue, dessins, sujets — `frequencesAvecVocabulaire`,
  `hashtags.ts`), normalisation `normaliserHashtag` / `hashtagsValides` ; suggestions en un clic. Touche `#` : focus du champ ;
  dans le champ, Entrée ajoute, Entrée sur champ vide ou Ctrl+Entrée = enregistrer et suivant (les touches 1-8 / Entrée hors
  du champ sont inchangées). Filtre de la file et de la grille par hashtag (`?hashtag=`, saisie partielle). Enregistrement dans
  `assets_hashtags` (0029) : aussitôt dans la vue « Un par un », `hashtagsEnLot` pour la sélection.
- **Illustration de base → variantes** (`packages/core/src/bases-illustrations.ts`, « noter juste l'illustration basique ») :
  base dérivée des clés existantes (aucune clé renommée) — `dessin:<nom>:<registre>`, `ligne:<trait>` propre à un seul dessin,
  `dessin:<sujet>:<style expérimental>`, `dessin:sport-<s>:…` / `ligne:sport-<s>`, `heros:<thème>:<registre>`,
  `materiel:<id>:<registre>` → `dessin:<nom>`, `heros:<thème>`, `materiel:<id>`. La file « à noter » est dédoublonnée par base
  (inventaire actuel, tuile Illustrations : 234 → 113 cartes, 121 notes économisées) : la carte montre l'illustration basique
  (pédagogique, sinon relevé, sinon le premier style), notée sous la clé de base ; « Voir les N variantes » repliées, sans
  obligation de les noter. Les anciennes notes de variantes comptent pour leur base (`notesAvecBases`).
  Apprentissage (`poidsAssets`) : effet(base) = m(groupe) − μ (lissage K = 4, notes de la base et de toutes ses variantes) ;
  effet(variante) = effet(base) + écart, écart = clamp((moy(variante) − moy(groupe)) · n / (n + 4), ±0,5 ★), 0 sans note
  propre ; `scoreAsset` lit l'effet de la clé, à défaut celui de sa base. Statuts « Retiré » / « À retravailler » posés sur la
  base (boutons sous la carte) : valables pour les variantes sauf statut propre. Une variante NOUVELLE sans aucun signal d'une
  base déjà notée n'est pas remise en note : elle est signalée « à comparer en duel ».
- **Duels de variantes** (`/admin/retours/duel/variantes?base=…`, bouton « Comparer ses variantes en duel » de la carte) :
  type `illustration`, dimension `variante:contraste` (contraste d'origine / fort / doux, filtre CSS posé au rendu, aucune
  source de dessin modifiée), `variante:style` (deux registres ou styles du même dessin) ou `variante:couleur` (deux gammes) ;
  une seule dimension diffère (`genererDuelVariantes`, `dimensionUniqueVariantes`). Les variantes de rendu ont leur propre clé
  (`dessin:x:pedagogique@contraste=fort`) : le renfort du duel (±0,5 ★) devient l'écart propre de la variante, ajouté à
  l'effet hérité de sa base (`appliquerRenforts`), sans toucher la clé réelle du dessin. Classement par illustration et
  « contraste préféré » tous dessins confondus (`preferencesVariantes`). Libellés simples des repères :
  `LIBELLES_DUELS_VARIANTES` (« le contraste de l’illustration »). Aucune migration.

### Ce qui est évalué (repère)

Retour de Paul du 2026-10-08 (« montrer direct avec un encadré ce qui est évalué, parfois on ne sait pas trop ») :

- **Duels** : bandeau « On compare : la police des titres et du texte » (ou « le traitement des photos », « le premier
  écran », « la forme des cartes de soins », « le menu »…) avec les valeurs lisibles (« A : Revue à empattements · B :
  Grotesque affirmée ») ; duel libre : « Thème complet : jugez l'ensemble », sans encadré.
- **Tuiles** : « Vous notez : la paire de polices « Revue à empattements » », « le menu sur téléphone « Panneau plein
  écran » (ordinateur : … · téléphone : … · rendez-vous : …) », « l'animation d'en-tête « … » »…
- **Encadré** dans les aperçus de page : contour animé couleur de l'admin (ardoise + halo blanc, étiquette « Évalué
  ici ») autour des éléments touchés (titres, photos, premier écran, bloc de la page, barre de menu…), défilement
  automatique vers la zone ; « Masquer le repère » (touche h, préférence gardée dans le navigateur) pour juger sans artefact.
- **Menus** : planche complète (ordinateur : rubrique active, survol simulé, après défilement ; téléphone : interactif et
  ouvert côte à côte), bouton « Menu » cliquable dans l'aperçu, « Ouvrir / fermer le menu » (touche o) ; duels de menus :
  états Fermé / Ouvert / Survol / Après défilement communs à A et B.
- Table pure : `packages/core/src/reperes.ts` (repereDimension, repereCle, valeursDuel ; testée : chaque dimension tirable a
  une entrée, préfixes `composant:*` et `variante:*` couverts, famille inconnue → `[data-zone="<famille>"]`). Zones :
  attributs `data-zone` de l'aperçu de l'ADMIN seulement (ApercuTheme, ApercuGabarit) ; le site publié ne change pas.
  Composants : `apps/admin/src/components/RepereEvaluation.tsx` (bandeau, PiloteApercu), `PlancheMenu.tsx`.

### Palettes, polices, tailles ; appareil montré

Demandes de Paul du 2026-10-08 (« pouvoir noter / A-B tester des palettes de couleurs, des combinaisons de polices et de
tailles » ; « tu me demandes mon avis sur téléphone mais on ne voit pas le mode mobile ») :

- **Nouveaux duels** (MODES_DUEL, duels.ts ; enregistrés sous les types existants `theme` / `typo`, aucune migration) :
  « Palettes » (seule la gamme change ; la moitié du temps le client a choisi 1-2 couleurs : gammes et couleurs libres
  proches), « Paires de polices », « Tailles et casse » (même paire, un axe à la fois : échelle, casse, graisse,
  interlettrage), « Police × palette » (les deux ensemble). Variantes du moteur d'harmonie, jamais de nouvelle règle dure
  (duels-compositions.ts, varierDuel). Bandeaux : nuanciers A / B en pastilles, valeurs lisibles (« A : échelle affirmée · B :
  échelle spectaculaire »), encadré sur les titres et le paragraphe (polices) ou le titre principal (tailles). Vue rapide
  « Spécimen » (titre, surtitre, paragraphe, bouton, carte de soin) en plus de la page complète.
- **Appareil** : bascule « Ordinateur · Mobile · Les deux » pour tous les duels ; « Les deux » par défaut en grand écran
  (cadre ordinateur + vrai cadre téléphone 390 px pour A et pour B), rendu mobile réel sur un téléphone ; photos et
  illustrations montrées dans la section mobile où elles apparaissent ; le bandeau précise « vu sur téléphone » ; l'appareil
  enregistré est celui qui était affiché (`les-deux` compris).
- **Tuile « Police × palette »** (`typo:combinaison:<paire>.<gamme>`, combinaisons.ts) : spécimen de la paire dans la gamme,
  hors « Tout au hasard ». Les tuiles « Couleurs » (gammes) et « Typographies » (paires, échelle, casse, graisse,
  interlettrage, surtitres…) notaient déjà palettes, paires et réglages.
- **Apprentissage** : duels → poids des gammes, paires et axes typo (renfortsDuels, inchangé) ; combinaisons → paires
  d'harmonie `gamme:<g>&police:<p>` (même clé que les paires apprises des « Recettes complètes », plafond ±0,75 ★ :
  pairesDuels, pairesDesNotes, ajouterPairesApprises dans lib/atelier.ts). Classements « Meilleures palettes — Sport »,
  « Meilleures paires de polices — Diabète », « Meilleures échelles de titres — Seniors ».

### Duels « Mobile seulement »

Demande de Paul du 2026-10-08 (« des duels Mobile only quand c'est pertinent, surtout pour les tailles, les espacements, les
menus ») — `packages/core/src/duels-appareils.ts` :

- **Table dimension → appareil** (appareilDimension, testée, totale) : « mobile » pour tailles et casse (`typo:*`), typographie,
  détails (densité, espacements), menus, paire de polices (texte courant), barre d'actions du bas (`composant:contact`), cartes de
  soins, premier écran, animation d'en-tête, portraits, équipe, sujets, horaires ; « les-deux » sinon.
- **Part** : PART_DUELS_MOBILES = 40 % des duels de ces dimensions sont montrés QU'EN cadre téléphone (pas de bascule, bandeau
  « … · sur téléphone uniquement », appareil enregistré « mobile ») ; sur grand écran, les deux téléphones en taille réelle
  côte à côte, défilement synchronisé (case à cocher), zone encadrée. Filtre « Mobile seulement » sur l'accueil des duels
  (`/admin/retours/duel?mobile=1`) : une série entière ainsi.
- **Apprentissage** : en plus du poids global (téléphone ×1,25), les duels joués sur téléphone donnent des effets propres au
  mobile (renfortsDuelsMobiles, ±0,5 ★) rangés dans `PoidsAtelier.mobile` (lib/atelier.ts) ; le générateur et le Studio
  (effetAtelier, recettes.ts) les ajoutent selon la portée de la clé : ×1 pour un réglage qui n'existe que sur téléphone
  (`menu=mobile:…`, barre d'actions / bouton flottant), ×0,5 pour un réglage partagé décisif sur téléphone (typo, détails,
  police, cartes, premier écran, portraits…), ×0 sinon.
- **Tuiles** : sur téléphone, le rendu mobile reste toujours affiché (« Mobile + ordinateur » ajoute l'ordinateur dessous) ;
  planche des menus : « Après défilement » dit le comportement réel lu dans l'aperçu (barre collante, ou menu non collant du
  modèle qui quitte l'écran).

### Blocs focalisés (tailles, casse, polices, détails)

Retour de Paul du 2026-10-08 (« la comparaison de tailles et casse est difficile avec autant de contenu ») —
`packages/core/src/focal.ts`, `apps/admin/src/components/BlocFocal.tsx` :

- Duels « Tailles et casse » et « Paires de polices » : par défaut un **bloc focalisé** unique, identique en A et B sauf le
  réglage testé, avec seulement ce qui est touché (échelle → surtitre, H1 réel du site, H2, deux lignes ; casse → surtitre,
  titre, bouton ; graisse → titre seul en grand ; interlettrage → titre et surtitre ; polices → surtitre, titre, paragraphe de
  trois lignes). A au-dessus de B, même alignement ; « Superposer A / B » (Espace, ou « Maintenir pour voir B ») pour
  voir la différence d'un coup d'œil ; « Règle » graduée en marge ; « Voir dans la page complète » en secondaire. Mêmes
  blocs en téléphone seul quand le réglage est mobile.
- Bandeau avec les mesures réelles de l'appareil affiché : « A : affirmée (H1 28 px, H2 20 px) · B : spectaculaire (H1 35 px,
  H2 25 px) », graisse en valeur (« noire (850) »), interlettrage en em.
- Écart visible garanti (ecartVisible, appliqué par varierDuel) : jamais deux crans dont le H1 diffère de moins de 10 %, la
  graisse effective de moins de 100, l'interlettrage de moins de 0,02 em, ni deux valeurs identiques de fait.
- Tuiles « Typographies », « Détails » et « Police × palette » : le bloc focalisé de la valeur notée (une carte et un bouton
  isolés pour les détails) au lieu du spécimen complet ; prêt pour les futurs espacements, ombres et arrondis.

### Duels de pages complètes

Demande de Paul du 2026-10-08 (« voter entre deux pages complètes : page de soin, d'article, de contact ») : type de duel
« Pages complètes » (MODES_DUEL `pages`, enregistré en `element` : aucune migration).

- Page choisie (sélecteur, raccourcis « Pages complètes : Fiche soin… » sur l'accueil des duels, `?type=pages&page=fiche`) ou
  tirée parmi les pages du simulateur : accueil, page sujet, fiche soin, article de blog, actualités, cabinet, contact et
  accès, questions, liste des soins. A et B : la même recette, seule la structure de CETTE page change (dé par page,
  dimension `page:<page>`, élément classé `structure:<page>:…`) ; 20 % du temps, deux recettes complètes vues sur cette page
  (`page-libre:<page>`). Contenu de démonstration réel (vraie fiche soin, vrai article).
- Page entière défilable, « Les deux » par défaut (ordinateur + téléphone), défilement synchronisé entre A et B du même
  appareil ; bandeau « On compare : la page « Contact et accès » — A : Plan d'accès : Notice et plan · B : … ».
- Apprentissage : clés de structure par page (`structure:<page>:…`) et variantes (`variante=<section>:…`), effets propres au
  mobile si le duel est joué sur téléphone ; classements « Meilleures structures de la page « Contact et accès » — sujet ».

### Contrastes et fonds, images × fonds, combinaisons d'éléments, réglages fins

Demandes de Paul du 2026-10-08 (« noter / A-B tester les contrastes de couleurs avec leurs fonds, ainsi que les images,
combinaisons d'éléments » ; « tester les padding, les ombres… ») :

- **Contrastes et fonds** (`surfaces.ts`, duel « Contrastes et fonds », tuile du même nom) : la même palette répartie
  autrement — fond blanc, fond teinté doux, cartes teintées, contraste franc, contraste doux, accent plein, accent léger.
  Règle dure : jamais sous AA (texte 4,5:1, grands éléments 3:1), calculé sur les couleurs du gabarit ; seules les répartitions
  conformes sont proposées ; ratio affiché (« A : Fond blanc (texte 15,5:1) »), zones qui changent encadrées. Aperçu de l'admin
  seulement (variables --g-* remplacées) : à valider avant d'entrer dans les recettes et les sites. Clés `surfaces=<id>`,
  `effets:surfaces-<id>`.
- **Images × fonds** (`combinaisons-elements.ts`, duel « Images × fonds ») : la même illustration / photo / héros sur deux
  fonds (blanc, fond de la gamme, teinte, aplat d'accent, dégradé) ou sur le même fond avec deux traitements (adouci,
  contrasté, noir et blanc). Côtés `<clé>@fond=<id>` (variante de rendu) ; clé apprise `image:<base>&surface:<id>` /
  `image:<base>&traitement:<id>` (base = illustration de base, héritage base → variantes).
- **Combinaisons d'éléments** (duel et tuile « Combinaisons ») : forme des cartes × style d'illustration, premier écran ×
  animation d'en-tête, menu × police, détails × structure, premier écran × police, style × structure, portraits × premier
  écran ; les deux changent, eux seuls, jamais de nouvelle règle dure (varierPaire) ; clé de paire des recettes complètes
  (`<dimA>:<va>&<dimB>:<vb>`, plafond ±0,75 ★), lue par les tirages harmonieux pour les paires de PAIRES_HARMONIE
  (premier écran × police, style × structure ; les autres sont apprises et le seront dès qu'elles y entrent : les ajouter
  modifie l'équilibre du test d'amélioration des recettes, à valider). Dimension `paire:<a>:<b>` (« . » écrit « _ » :
  contrainte de la colonne dimension_differente).
- **Réglages fins** (duel « Espacements, ombres, arrondis ») : un élément du jeu de détails à la fois (densité = espacements
  intérieurs, ombres, coins = arrondis, boutons, cadres d'images), bloc focalisé carte + bouton, densité jugée au téléphone.
  Ces réglages sont ceux de details.ts (déjà rendus à l'identique sur le site et dans l'aperçu, étiquetés dans harmonie.ts) ;
  de nouveaux crans (gouttières, rythme vertical, ombres colorées) restent à ajouter dans details.ts.

### Un seul appareil par duel de page, favoris dans les duels, tuile Images × fonds

Retour de Paul du 2026-10-08 (« pour les comparaisons de pages complètes, fais comparer juste le mode ordi OU mobile ») :

- **Pages complètes et thèmes complets libres** (duels-appareils.ts : appareilUnique) : jamais « Les deux » ; chaque duel est
  soit ordinateur seul (deux pages ordinateur côte à côte), soit téléphone seul (deux téléphones côte à côte). Tirage : 60 %
  téléphone (les pages d'un cabinet sont surtout lues sur téléphone ; 40 % d'ordinateur pour juger aussi les mises en page
  larges) ; série « Mobile seulement » : téléphone. Bandeau « … · sur ordinateur » / « … · sur téléphone », appareil
  enregistré en conséquence. La bascule « Ordinateur · Mobile » reste, et change le duel pour A et B à la fois. Les duels
  à une dimension (polices, couleurs, éléments…) gardent « Ordinateur · Mobile · Les deux ».
- **Photos et illustrations** : « Favoris d'abord » (candidatsDuelFavoris, favoris.ts) : surtout de bons éléments entre eux,
  ≈ 10 % de duels de découverte (signalés), jamais les exclus (≤ 2 ★, retirés, à retravailler).
- **Thèmes** : quand une composition photo est montrée faute de photos bien notées, « Peu de photos notées pour <sujet> »
  (manquePhotosNotees) sous le bandeau.
- **Tuile « Images × fonds »** : une image par illustration de base (héros, dessins) et quelques photos, sur chaque fond
  (blanc, fond de la gamme, teinte, aplat, dégradé) ; clé `effets:image@<fond>:<clé>` (aucune migration), apprise en
  `image:<base>&surface:<fond>` (imagesFondsDesNotes) ; hors « Tout au hasard ».

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

## Comment les retours arrivent dans le dépôt

Workflow `.github/workflows/exporter-retours.yml` :

- chaque nuit (3 h 17 UTC), ou à la main (GitHub → Actions → exporter-retours → Run workflow), ou par le bouton
  « Envoyer mes retours à Claude maintenant » (`/admin/retours`, `/admin/atelier`, `/admin/illustrations` ; admin seulement,
  même jeton GitHub que la publication) ;
- `node scripts/exporter-retours.mjs` lit Supabase avec les secrets `SUPABASE_URL` / `SUPABASE_SECRET_KEY` et écrit
  `retours/*.json` + `retours/SYNTHESE.md` ;
- commit « Retours : export du AAAA-MM-JJ » par le bot github-actions, seulement s'il y a du nouveau.

Exporté : clés d'assets, notes, étiquettes, remarques « ce qui va bien » / « ce qui ne va pas » (séparées dans la synthèse),
commentaires, `retours/assets-sujets.json` (sujets ajoutés / retirés par Paul, section « Sujets modifiés par Paul »), empreintes, ingrédients des combinaisons, statuts, dates au jour ;
`retours/inspirations.json` (étiquettes, ce qu'on veut en tirer, sujet, type, palette, domaine du lien) et une section
« Inspirations » dans la synthèse (couleurs récurrentes, gammes candidates avec leur code prêt à coller).
**Jamais exporté pour les inspirations** : l'image, son chemin dans le stockage privé, une URL signée, l'adresse complète du lien.
**Jamais exporté** : auteur, e-mail, identifiant de compte, leads, prospects, sites praticiens. Le dépôt est public :
si les commentaires deviennent sensibles, repasser le dépôt en privé (GitHub → Settings → Danger zone → Change visibility) ;
le workflow et le bouton continuent de fonctionner.

## Ce que fait Claude en début de séance

```bash
git pull --rebase
```

1. Lire `retours/SYNTHESE.md` (par type d'asset, meilleurs / pires, étiquettes fréquentes, à retravailler, combinaisons,
   inspirations). Une gamme candidate n'entre dans `packages/core/src/gammes.ts` qu'avec l'accord de Paul.
2. Au besoin, le détail dans `retours/assets-notes.json`, `retours/atelier-notes.json`, `retours/illustrations-revues.json`.
   La clé (`picto:…`, `dessin:<nom>:<registre>`, `heros:<thème>:<registre>`, `photo:…`, `gamme:…`, `modele:…`) indique le
   fichier à retoucher (`source` dans `packages/core/src/assets.ts` / `illustrations.ts`).
3. Corriger (dessin, photo, gamme, règle du générateur…), puis ajouter une ligne en haut de la liste de
   `retours/CHANGEMENTS.md` : `- AAAA-MM-JJ : ce qui a été corrigé (clé, commit)`. La page `/admin/retours` l'affiche dans
   « Ce que vos avis ont changé ».
4. Un asset retouché change d'empreinte : il revient en tête de la notation (« Modifié depuis »).

Sans export récent, Paul peut aussi utiliser « Copier mes retours » (Markdown) dans `/admin/retours`, `/admin/atelier` ou
`/admin/illustrations` et le coller dans la conversation.
