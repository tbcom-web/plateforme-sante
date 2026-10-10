# Chaîne de production des modèles (/chaine)

Décision de Paul du 2026-10-09 : une chaîne unique, avec le **minimum d'humain** — « limiter au max l'humain, juste pour donner
son goût / avis sur les modèles créés ». N'importe qui chez TBCOM contribue (goût), Paul valide à la fin. Un agent de test
automatique vérifie chaque version avant et après les retouches.

Code : `packages/core/src/chaine-modeles.ts` (moteur, pur), `packages/core/src/chaine-modeles-format.ts` (format commun des
tickets et des résultats du testeur : `TicketModele`, `ResultatTestModele`), `apps/admin/src/lib/chaine-modeles.ts` (lecture,
automate côté serveur), `apps/admin/src/app/chaine/` (pages), migration `supabase/migrations/0050_chaine_modeles.sql`,
export `scripts/exporter-retours.mjs`. Tests : `packages/core/src/chaine-modeles.test.ts`.

## Chaîne en 3 étapes (décision de Paul du 2026-10-11)

« C’est un peu trop complexe… On pourrait n’avoir qu’une seule relecture finale avant publication et ajout au catalogue de modèles »,
et le test se lance AUTOMATIQUEMENT. Le moteur garde ses statuts (et la base ses contrôles), mais l’interface n’en montre que trois
(`etapeVisible`, `ETAPES_VISIBLES` de `chaine-modeles.ts`) :

| Étape vue par Paul | Statuts du moteur | Ce que Paul fait | Ce qui se passe seul |
|---|---|---|---|
| 1. **Choisir** | `candidat` (= gardé, en file) | Présélection : pages de 6 designs, « Garder » | Le gardé entre en vérification dès qu’une place se libère : `CHAINE.maxVerification` = 5 à la fois, file ordonnée par les signaux (J’aime, juge, jauge : `fileVerification`, `aPriori`), puis l’ancienneté |
| 2. **Vérification** (automatique) | `finaliste` (gardé pour vérification, structure figée), `check-agent`, et `retouche` / `recheck-agent` tant que la relecture n’a pas commencé | Rien, sauf « Envoyer à Claude » s’il y a des corrections techniques | L’admin lance le testeur (`testsALancer`, `lib/tests-auto.ts`) ; défauts techniques → UNE demande « corrections techniques » ; version corrigée revérifiée seule ; toujours rouge après correction → écarté avec le message ; sinon → relecture finale. Paul ne voit qu’une pastille (`pastilleVerification` : en file, vérification en cours, corrections techniques, bloquée, OK) |
| 3. **Relecture finale** (Paul, une seule fois) | `avis-humain`, `retouche` / `recheck-agent` après le début de la relecture, `revalidation`, `pret-validation` | Relecture guidée page par page (✓ / ✎ + note, images en situation) ; remarques → « Envoyer à Claude » ; au retour, seules les pages modifiées (avant / après) ; puis « Ajouter au catalogue » (profils compatibles pré-cochés) | Version corrigée revérifiée seule avant de revenir |
| **Catalogue** | `publie` | — (signaler une zone rouvre une retouche, le modèle reste en ligne) | — |

« Relecture commencée » (`modelesEnRelecture`) = un avis de page, une revalidation ou une remarque humaine sur le modèle. Rien n’est
publié sans le clic de Paul (« Ajouter au catalogue » = `publierModele`, publication par profil).

**Ce qui a disparu du parcours** : le tournoi comme passage obligé (il reste en vue détaillée, `/chaine/tournoi`, sans rien décider :
ni finaliste ni écart), le bouton « Lancer le test » (sauf vérification bloquée ou GitHub non configuré), l’import AUTOMATIQUE des
designs de Claude (un design importé est gardé donc vérifié : c’est un choix de goût, fait par le bouton), les étapes « revalidation »
et « validation » séparées (fondues dans la relecture finale), l’onglet Tournoi.

**Lancement automatique du testeur** (autorisé par Paul pour le workflow `tester-modele` SEULEMENT, qui ne publie rien ; aucun
autre workflow n’est lancé automatiquement) :
- quand : à chaque chargement de la chaîne (automate `faireTournerChaine` → `verifierAutomatiquement`) et juste après « Garder »
  ou l’import des propositions de Claude (`after()` de l’action) ;
- quoi : les versions courantes en `check-agent` (mode `check`) ou `recheck-agent` (mode `recheck`) sans résultat, de la plus
  proche du catalogue à la plus loin (à étape égale, rang dans la file), avec les jeux de démonstration du design (`jeuxDuModele`) ;
- limites : `CHAINE.testsParalleles` = 3 passages en même temps (lancements de moins de `CHAINE.dureeTestMs` = 75 min sans résultat,
  et passages en file ou en cours sur GitHub d’après le titre du run « tester-modele <modèle> v<n> ») ; jamais une version déjà
  testée ou en cours ; un lancement refusé par GitHub est noté (`echec`) et refait ; après `CHAINE.essaisTest` = 2 lancements sans
  résultat : « vérification bloquée », relance à la main (« Lancer le test » de la fiche, Paul) ;
- verrou : table `modeles_tests_lances` (migration 0064, clé unique modèle × version × essai écrite AVANT le lancement : deux pages
  ouvertes en même temps ne lancent jamais deux fois) ; sans 0064, lancements gardés en mémoire de l’instance (+ runs GitHub).
- banc mobile : `CHAINE_TESTEUR_SIMULE=1` (sans jeton GitHub seulement) simule le lancement, aucun appel externe.

Transitions ajoutées (0064, `avancer_modele`) : `check-agent → retouche` (corrections techniques), `check-agent → ecarte` (rouge sans
défaut corrigeable), `recheck-agent → avis-humain` (corrections techniques vérifiées), `recheck-agent → ecarte` (rouge persistant après
correction ; la base vérifie que le test de la version courante est rouge). La relecture finale refuse une version au rouge.

## Composeur : « Proposer des modèles pour un profil » (demande de Paul du 2026-10-11)

Dans l’étape 1 « Choisir » (`/chaine/composer`, lien en tête de la présélection et sur le tableau) : on choisit un cabinet type
(profil de pratique) ou on compose un profil (« Sport + Diabète », activités comprises) ; le composeur (`core/composeur.ts`,
`lib/composeur.ts`) montre ses ~8 plus beaux modèles en grand, en situation (téléphone d’abord), avec « pourquoi ce choix » et ce qui
manque. « Garder » = la même action que la présélection (fiche candidate, vérification automatique) ; la fiche garde le profil réel.

- Ambiance unique pour tout le site : familles de style pondérées par TOUS les thèmes (moyenne géométrique, n° 1 : 60 %) et par les
  préférences apprises (duels, Dégustation) ; règles dures et garde-fous appliqués au profil entier (diabète : ni rouge vif, ni relevé,
  ni Technique, ni effets « Vivant », ni animation vive). Chaque page de thème garde ses images validées et son ton (énergie du sport,
  calme du diabète : jamais d’animation).
- 240 candidats harmonieux, puis SÉLECTION des éléments : chaque élément refusé ou « à compléter » est remplacé par un élément 4-5 ★,
  favori ou validé de la même dimension, compatible avec la famille, sans nouvelle règle dure ; sinon c’est un repli, listé comme manque
  (futur Atelier des manques). Photos : kit du profil seulement, jamais une photo refusée.
- Score : juge (notes de Paul, sinon note prédite) 25 % · jauge 4-5 ★ 20 % · harmonie 25 % · préférences apprises 10 % · accord avec
  le profil (famille, structure, style et palette conseillés par chaque thème) 20 % ; −3 par repli.
- Sélection DIVERSE : jamais deux modèles quasi identiques (au moins 2 dimensions visibles différentes), d’abord nettement distincts
  (4 dimensions, structure / premier écran / palette), deux par famille et une palette au plus, puis paliers relâchés ; jamais plus de
  22 points sous le meilleur.
- Calcul gardé en base par profession et profil (instantané, signature des notes, duels, photos et revues) ; la présélection montre
  d’abord, en première page, les modèles composés pour son profil de démonstration (« composeur d’abord », 4 s au plus).

## Étapes (statuts de la fiche modèle versionnée)

| # | Statut | Qui a la main | Ce qui se passe | « Fini » quand |
|---|---|---|---|---|
| 0 | Ingrédients | humain (Arrivages) | Rien de nouveau : lien et compteur des Arrivages sur le tableau | — |
| 1 | `candidat` (présélection) | humain | Présélection INFINIE SANS THÈME : pages de 6 DESIGNS (grilles « Directions » : favoris 4-5 ★, harmonie, diversité garantie), chaque page rendue avec un profil de démonstration différent et SES images ; « Voir avec un autre thème » sur chaque carte. On touche ceux qui plaisent → candidats (designs) + points dans la Dégustation + « J'aime » | Objectif ≈ 30 candidats par profession (compteur, réglable : `CHAINE.objectifCandidats`) ; le tournoi s'ouvre dès 12 (`CHAINE.ouvertureTournoi`, 20 → 12 le 2026-10-10) |
| 2 | `candidat` (tournoi) | humain | Tournoi EN GRILLES par profession : « tes 2 préférés parmi 6 » (+ celui qui ne va pas), les 6 rendus avec le même profil ; a priori, top 10 seulement, quelques duels de départage ; multi-votants en parallèle | Top 10 sûr à 90 % (voir « Tournoi en grilles ») : les 10 premiers deviennent `finaliste`, les autres `ecarte` |
| — | `finaliste` | automatique | File d'attente : 10 modèles au plus dans la boucle de révision, meilleur rang d'abord | Une place se libère |
| 3 | `check-agent` | agent | Le testeur automatique (et la vérification visuelle de Claude) passe la version : verdict, contrôles, tickets techniques créés seuls, corrections techniques automatiques si possible | Un résultat de test existe pour la version courante |
| 4 | `avis-humain` | humain | Page par page (accueil, page sujet, fiche soin, cabinet, contact et accès, article, FAQ, liste des soins) × ordinateur ET téléphone, uniforme pour tous les modèles : relecture guidée (une page à la fois) : ✓ « Page OK » ou ✎ « Il manque / à corriger » (note, zone) → ticket ; images choisies en situation (structure figée) | Les 16 cellules ont un avis (ticket ou « Rien à signaler ») → `retouche` s'il reste un ticket ouvert, sinon `pret-validation` si le testeur est au vert |
| 5 | `retouche` | Claude | Tickets ouverts exportés en priorité (`retours/tickets-modeles.json` + section de `SYNTHESE.md`). Claude écrit la correction dans `retours/retouches-modeles.json` ; la chaîne crée la NOUVELLE VERSION avec le journal « corrigé : ticket #12 — zone (10 %, 40 %) page Contact et accès (mobile) » | Une version plus récente que celle de la demande de retouche existe |
| 6 | `recheck-agent` | agent | Nouveau passage du testeur sur la nouvelle version ; les tickets techniques dont le contrôle repasse au vert se ferment seuls | Résultat de test de la nouvelle version : correction de goût → `revalidation` ; purement technique et vert → `pret-validation` sans humain ; encore des tickets → `retouche` |
| 7 | `revalidation` | humain | Seulement ce qui a changé, avant / après ; « Tout revalider » en 1 clic, ou cocher « Pas encore corrigé » pour rouvrir un ticket | Revalidée (1 clic) et testeur au vert → `pret-validation` ; ticket rouvert → `retouche` |
| 8 | `pret-validation` → `publie` | Paul | Verrous automatiques au vert, tags pré-remplis vérifiés, « Publier pour les praticiens » (publication par profil existante : recette créée ou mise à jour + `recettes_publications`) | Publié. Ensuite, signaler une zone rouvre une retouche SANS dépublier : la nouvelle version n'est publiée qu'après revalidation et nouvelle validation de Paul |

## Chaîne guidée : une seule prochaine étape (demande de Paul du 2026-10-10, en 3 étapes depuis le 2026-10-11)

Depuis le 2026-10-11 : fil de 3 étapes (Choisir · Vérification · Relecture finale) puis le catalogue ; priorité : ajouter au
catalogue > revoir les pages modifiées > envoyer les remarques à Claude > relire > envoyer les corrections techniques > relancer une
vérification bloquée > choisir (tant que moins de 5 gardés attendent) > attente expliquée. Le tournoi n’est plus prescrit. Le texte
ci-dessous décrit la version du 2026-10-10 (6 étapes), gardée pour l’historique.

« La partie de présélection tournoi etc paraît bloquée […] que ce soit vraiment prescriptif pour qu'on arrive à des modèles valides à
pousser aux clients finaux. » Code : `packages/core/src/chaine-guidage.ts` (`prochaineActionChaine`, pur, testé dans
`chaine-guidage.test.ts`), `apps/admin/src/lib/chaine-guidage.ts` (calcul sur la chaîne déjà lue par la page, import automatique),
bandeau `apps/admin/src/app/chaine/ProchaineEtape.tsx`.

En tête de `/chaine` et de chaque étape (présélection, tournoi, fiche, relecture) : **Prochaine étape** = un titre (« Garder encore
4 candidats pour ouvrir le tournoi (8 / 12) », « Jouer la grille 3 / ~8 du tournoi », « Relire « X » page par page (5 / 16) »,
« Lancer le test automatique de « X » », « Valider et publier « X » »…), le pourquoi, un gros bouton qui y mène, qui agit (À vous,
Paul, Claude, Automatique), le fil des 6 étapes montrées à l'équipe et ce qui reste avant le premier modèle prêt pour les clients.

| # | Étape montrée | Statuts de la fiche |
|---|---|---|
| 1 | Présélection | `candidat` (tournoi pas encore ouvert) |
| 2 | Tournoi | `candidat` (tournoi ouvert), `finaliste` |
| 3 | Test automatique | `check-agent` |
| 4 | Relecture page par page | `avis-humain` |
| 5 | Retouches et revalidation | `retouche`, `recheck-agent`, `revalidation` |
| 6 | Validation et publication | `pret-validation`, `publie` |

Priorité (plus près des clients d'abord) : valider et publier (validateur) → revalider → faire corriger par Claude (validateur) →
relire → lancer le test (validateur) → jouer le tournoi → importer les designs de Claude → présélectionner. Un contributeur ne reçoit
jamais un geste du validateur ; sans rien à faire, il reçoit une attente expliquée (qui agit, quand) et « Présélectionner des
designs » pour le lot suivant. Jamais un écran sans action ni explication (test sur tous les statuts et les deux rôles).

Automatique (rien de goût) : sans assez de candidats pour ouvrir le tournoi, les designs de Claude pas encore dans la chaîne sont
importés seuls à l'ouverture de `/chaine` ou de la présélection (profession par défaut, une tentative au plus toutes les 10 min par
instance) ; une réponse de grille ou un duel relance l'automate au chargement suivant (fin du tournoi → finalistes → test) ; le
tournoi terminé renvoie au tableau, où l'automate fait passer les finalistes (`avancer_modele`).

Gestes qui restent humains hors goût, dits dans le bandeau : **lancer le test** (bouton « Lancer le test » de la fiche, workflow
`tester-modele`, Paul) et **demander la retouche à Claude** : bouton « Envoyer à Claude » (bandeau, écran de retouche,
récapitulatif de la relecture) qui partage depuis le téléphone (navigator.share, app Claude, session Code) une demande AUTONOME
(`demandeCorrectionsModele` : modèle, version de base, tickets en clair avec page, appareil, zone, élément, commentaire, et la
livraison attendue dans `retours/retouches-modeles.json`) et lance l’export des retours ; repli : copie + « ouvrez l’app Claude,
session Code, et collez ». Parcours entier faisable au téléphone seul : `npm run audit:mobile` (scripts/perf-admin/mobile.mjs).

**Propositions de Claude** (2026-10-09) : les designs « canons » de `retours/recettes-proposees.json` (ids `canon-*`, design sans
images) entrent dans la chaîne par le bouton « Importer les propositions de Claude comme candidats » de la présélection
(`app/chaine/import-claude.ts`) : fiche SANS profil, `origine: 'claude'`, version 1 = design, tags pré-calculés ; une proposition déjà
candidate (même clé) est ignorée. Rien n'est validé ni publié : elles passent le tournoi comme les autres.

Le testeur n'intervient **pas** avant la présélection ni pendant le tournoi : la génération garde seulement son filtre léger
(`filtreLeger` : règles dures d'harmonie, éléments exclus ≤ 2 ★ ou retirés, composition déjà vue, rendu identique à l'œil
d'après l'empreinte du rendu comme la Dégustation).

Une relance 🎲 gardée pendant l'avis crée une nouvelle version : les avis déjà donnés valent pour les pages que la relance n'a
pas changées (`pagesChangees`) ; le testeur repasse sur la nouvelle version.

## Relecture guidée, structure figée et images en situation (décisions de Paul du 2026-10-10)

« On me propose de revoir chaque page du modèle, je valide ou j'indique ce qui manque […] on me guide pas à pas jusqu'à la
publication » et « je ne laisserais plus toucher à la structure mais juste choisir les photos en passant sur l'image du site […]
Idem pour l'illustration du haut ». Code : `packages/core/src/chaine-images.ts` (export `@plateforme/core/chaine-images`, testé dans
`chaine-images.test.ts`), `apps/admin/src/app/chaine/revision/[id]/Revision.tsx` (parcours), `apps/admin/src/components/ChoixImagesSituation.tsx`
(contrôle générique sur l'image), `app/chaine/images-situation.tsx`, `donnees-images.ts`, `images-actions.ts`, migration `0063_images_situation.sql`.

- **Parcours guidé** (`/chaine/revision/[id]`, où mènent les boutons « Relire », « Revalider », « Voir la demande à Claude » et
  « Publier ce modèle » du bandeau) : une page à la fois, téléphone puis ordinateur (16 étapes), barre « Page 3 / 16 », précédente /
  suivante, reprise à la première page pas vue ; deux gestes : ✓ « Page OK » (revue « rien ») ou ✎ « Il manque / à corriger » (note,
  zone entourée facultative, étiquette rapide repliée → ticket). Récapitulatif → « Envoyer les corrections à Claude » (la demande à
  coller dans Claude Code est affichée et copiable) ; retouche : écran d'attente ; revalidation : seules les pages modifiées, avant /
  après, « C'est bon » ou « Encore à corriger », puis « Tout revalider » ; prêt pour validation : écran « Publier ce modèle pour les
  praticiens », profils pré-cochés (tags, sinon profils compatibles), confirmation, puis tags vérifiés + publication (`publierModele`,
  verrous recalculés). Rien n'est publié sans le clic de Paul.
- **Structure figée** dès `finaliste` (`STATUTS_STRUCTURE_FIGEE`) : plus de 🔒 / 🎲 dans la relecture ; `garderRelance` refuse une
  version qui change autre chose que les images (`verifierNouvelleVersion`) ; en base, le déclencheur `modeles_versions_structure_figee`
  (0063) refuse la même chose à un compte de l'équipe ; la retouche de Claude (tickets) passe par le validateur ou le service.
- **Images en situation** : au survol (ordinateur) ou au toucher (téléphone) d'une photo ou de l'illustration du haut dans l'aperçu
  (relecture et fiche du modèle), un contrôle ‹ › (molette sur le contrôle, et sur l'image une fois épinglé ; ← → au clavier) fait
  défiler les candidates DANS la page, puis « Choisir » / « Garder ». Candidates : photos du kit du profil de démonstration (son activité,
  puis neutres du thème ; jamais une autre activité ni une image < 2 ★ ; validées 4-5 ★, validées, puis à valider ; déjà choisies
  ailleurs d'abord) ; illustration du haut : sujets principaux illustrés du profil (le site ne dessine que ceux-là, dans le registre du
  design). Le choix est une **préférence de rendu design × profil × emplacement** (`modeles_images_choix`, ajout seul), jamais une
  version : le design reste réutilisable par tous les profils, test et relecture restent valables. Après un choix de photo, contrôle
  léger du contraste du texte posé dessus (mesuré si possible, sinon signalé : le testeur le revérifie à son prochain passage).

## Modèle = design (décision de Paul du 2026-10-09)

« Je préfère voir une série de modèles très très grande, voire infinie, où je sélectionne ceux qui me plaisent SANS thème précis. »
Un modèle est un DESIGN (`chaine-design.ts`) : structure par page, gamme ou couleur, polices et typographie, détails, menus, premier
écran, style d'illustration ou photo, traitement, effets. Les IMAGES n'en font pas partie : la version enregistrée n'a ni photos ni
sujet du premier écran (`designDe`) ; à chaque rendu, `habillerPourProfil` prend celles du KIT du profil (`kitDuProfil` →
`visuelsDeLActivite` : visuels de l'activité, sinon visuels du thème SANS autre activité identifiable).

- Fiche : `profil` nul (migration 0052 ; les fiches existantes gardent leur profil et leur tournoi par profil), `scenario` = profil
  de démonstration de la présélection (rendu par défaut). Présélection, tournoi et classement : par PROFESSION.
- Pages d'avis et fiche : « Voir avec » un profil compatible (même design, autres images).
- Profils compatibles (`profilsCompatibles`) : famille de style dominante du design × poids de la famille pour le thème n° 1 du
  profil (`FAMILLES_PAR_SUJET`, seuil 1) — un design « Graphique pop » n'est proposé ni pour diabète ni pour senior. Pré-calculés dans
  les tags à la présélection, confirmés par Paul (« Tags vérifiés ») ; la publication rend le modèle disponible pour tous ces profils.
- Testeur : `retours/modeles-a-tester.json` donne pour chaque version les `jeux` (un profil par famille de thèmes compatibles,
  `jeuxDuModele`) ; le testeur passe toutes les pages pour chacun.

### Cohérence des images (bug du 2026-10-09 : du tennis dans « Sport · course »)

`activitesReconnues` (profils.ts) reconnaît l'activité d'un visuel par son hashtag ou sa scène, sinon par un mot de l'activité dans sa
clé, son adresse ou la REQUÊTE D'ORIGINE de la photo libre (colonne `photos_libres.requete`) : une photo de tennis taguée seulement
« sport » mais nommée `tennis-shoes-court…` ou trouvée par « padel court shoes » est reconnue tennis. Le kit d'une activité ne prend
que ses visuels (et aucune autre activité) ; le kit générique du thème (repli) ne prend que des visuels SANS activité identifiable.
Test : `profils.test.ts` (kit « course » : jamais de tennis, repli neutre).

## Tournoi en grilles (retour de Paul du 2026-10-09 : « 160 batailles pour arriver à un seul modèle, c'est énorme »)

Code : `packages/core/src/tournoi-grilles.ts`, page `/chaine/tournoi`, migration 0052 (`modeles_grilles`, `modeles_jaime`).

1. **Grilles « tes 2 préférés parmi 6 »** (+ « celui qui ne va pas », facultatif), les 6 rendus avec le MÊME profil de démonstration
   (contenu égal). Modèle de choix Plackett-Luce / meilleur-pire décomposé en comparaisons (n° 1 bat 5, n° 2 bat 4, les 3 du milieu
   battent la pire : 12 comparaisons), chacune pondérée 0,6 (comparaisons d'une même grille corrélées) × poids du votant (Paul ×2).
2. **A priori** (`aPriori`) : moyenne de départ de chaque candidat = 0,25 × J'aime (0 à 3, centrés) + 0,2 × note prédite du juge
   (1-5, centrée sur 3) + 0,2 × jauge 4-5 ★ (centrée), plafonnée à ±0,6 (écart-type a priori 1).
3. **Top 10 seulement** : forces Bradley-Terry MAP avec a priori ; grilles composées des candidats dont l'intervalle chevauche la
   frontière des rangs 10 / 11 (incertitude Φ(−|θ − frontière| / σ)), puis des moins vus ; **élimination rapide** : vu 3 fois sans
   jamais être choisi (et hors du top 10) ; **duels de départage** quand il ne reste que 2 à 4 incertains.
4. **Arrêt** : précision ATTENDUE du top 10 ≥ 90 % — moyenne, sur 300 tirages des forces dans leur a posteriori gaussien, de la part
   du top 10 estimé présente dans le top 10 tiré — et chaque candidat montré au moins une fois ; ou budget de 40 grilles.
5. **Parallèle** : chaque grille servie est réservée 15 minutes à son votant (ses candidats ne sont pas servis à un autre) ; barre
   « Top 10 sûr à 72 % · ~6 grilles restantes ».

### Preuve chiffrée : jury synthétique

`simulerGrilles` / `mondeJury` (tournoi-grilles.ts ; script de comparaison dans le dossier de travail de l'agent). 30 candidats, goût
caché de chaque votant = goût commun + 0,35 de goût propre, vérité recherchée = goût AGRÉGÉ du jury (Paul ×2) ; choix Plackett-Luce
bruités (« bruit » = netteté des préférences : 1 très hésitant, 2 réaliste, 3 net) ; signaux a priori bruités. Ancien tournoi = duels
A/B suisses avec son arrêt (classement stable, ≥ 5 duels par candidat). 40 tirages par ligne.

| Jury | Écrans à l'arrêt — grilles (dont duels) | Précision — grilles | Écrans — ancien (duels) | Précision — ancien | Précision à 15 écrans : grilles / duels |
|---|---:|---:|---:|---:|---:|
| 1 votant, bruit 2 | 15,7 (0,1) | 0,83 | 90 | 0,80 | 0,81 / 0,52 |
| 2 votants, bruit 2 | 23,8 (0,7) | 0,85 | 96 | 0,76 | 0,80 / 0,51 |
| 3 votants, bruit 2 | 30,4 (5,7) | 0,87 | 98 | 0,78 | 0,83 / 0,54 |
| 1 votant, bruit 3 | 14,8 | 0,89 | 89 | 0,84 | 0,87 / 0,54 |
| 2 votants, bruit 3 | 22,7 | 0,90 | 94 | 0,80 | 0,87 / 0,53 |
| 3 votants, bruit 3 | 24,5 | 0,90 | 93 | 0,80 | 0,86 / 0,56 |
| 2 votants, bruit 1 | 30,5 | 0,77 | 95 | 0,65 | 0,71 / 0,48 |
| 2 votants, bruit 2, 50 candidats | 38,4 | 0,83 | 154 | 0,68 | 0,68 / 0,36 |
| 2 votants, bruit 2, sans a priori | 25,3 | 0,87 | — | — | 0,81 / — |

Lecture : avec 30 candidats, le tournoi en grilles s'arrête en **≈ 16 à 30 écrans pour TOUT le jury** (≈ 8 à 12 par personne à
2-3 votants, ≈ 3-4 minutes) au lieu de **≈ 90-100 duels** (154 avec 50 candidats, d'où les « 160 batailles »), avec une précision du
top 10 **égale ou meilleure** dans toutes les configurations (+3 à +15 points). À budget égal de 15 écrans : 0,80-0,87 contre 0,51-0,56 ;
même à clics égaux (53 duels ≈ 15 grilles × 3,5 clics), les duels n'atteignent que 0,58-0,77. La médiane du premier écran où la
précision atteint 90 % est de 9 à 15 grilles (bruit 2-3), contre 64 à 105 duels (jamais à bruit 1-2 pour la moitié des tirages).
Limite honnête : atteindre 90 % de précision du top 10 dans ≥ 90 % des tirages n'est possible ni avec l'ancien tournoi ni avec le
nouveau tant que les préférences sont hésitantes (bruit 1-2 : les rangs 9 à 12 sont presque à égalité) ; le compromis retenu
(arrêt à 90 % de précision ATTENDUE) donne 0,83-0,90 en ≈ 16-30 écrans. L'a priori fait gagner ≈ 2 écrans et 1-2 points.
Parcours Playwright (2 votants au goût net) : 15 grilles + 2 duels, précision 90 %.

## Verrous de la validation finale (`verrousValidation`)

Tous au vert, recalculés côté serveur juste avant de publier : testeur (`verrouTesteur` / `regleValidationModele` de
`testeur-modeles.ts` : vert sur la version courante ; orange ou vérification visuelle absente = validation possible seulement avec
la justification écrite de Paul pour CETTE version, ≥ 15 caractères, colonnes `justification_test` / `justification_version`
écrites par le validateur seul ; rouge, absent ou autre version = refus) ; avis humain et revalidation calculés depuis
`modeles_revues` et les tickets (`avisFaits`), jamais depuis le statut ; jauge 100 % 4-5 ★
(`qualiteComposition`) ; éléments validés (`verifierPublicationRecette` : rien « à valider », exclu ou non importé) ; 0 ticket
ouvert ni corrigé en attente de revalidation ; avis et revalidation faits ; tags vérifiés (profession, profils, couleurs —
pré-remplis automatiquement par `tagsAutomatiques`, Paul les corrige et clique « Tags vérifiés »).

## Rôles

| Rôle | Qui | Peut | Ne peut jamais |
|---|---|---|---|
| contributeur | équipe TBCOM (`profiles.role_equipe = 'contributeur'`) | présélection, tournoi, avis, tickets, relances, revalidation, commentaires | valider, publier, vérifier les tags, repêcher, gérer les rôles |
| validateur | Paul (`role = 'admin'`, d'office) ou `role_equipe = 'validateur'` | tout, dont la validation finale et la publication | — |

Paul crée lui-même les comptes ; `/chaine/equipe` attribue le rôle à un compte existant (aucun compte n'est créé par la
plateforme). Règles en base (0050) : `est_contributeur()`, `est_validateur()` ; publier (`statut = 'publie'`), version publiée,
tags vérifiés, recette liée et repêchage : validateur seulement (déclencheur `modeles_fiches_proteger`) ; versions jamais
modifiées ; journaux de votes et d'avis en ajout seul ; aucune suppression.

**Sécurité du verrou « testeur au vert »** : le résultat de test (`modeles_versions.test`) n'est écrit que par le validateur ou le
service (CI du testeur, clé secrète) : politique d'écriture réservée au validateur et déclencheur `modeles_versions_proteger` (une
version créée par un contributeur ne peut pas arriver avec un test rempli). Les tickets d'origine « testeur » ne sont créés,
fermés ni modifiés que par le validateur ou le service (déclencheur `modeles_tickets_proteger`) : un contributeur peut seulement
les marquer « corrigé » ou les rouvrir ; la fermeture vient du re-check. Conséquence : l'import des résultats du dépôt par
l'automate ne s'applique que lorsque le validateur ouvre la chaîne, ou quand la CI écrit directement en base. Un
contributeur qui se connecte arrive sur `/chaine` ; il n'a pas accès au super admin.

**Statuts** : un contributeur ne modifie jamais directement le statut, le rang ni la version de retouche d'une fiche (déclencheur) ;
les passages d'étape passent par `avancer_modele(id, vers, rang)` (security definer) qui vérifie la transition autorisée, le rôle et
les conditions en base (test de la version courante passé, vert ou orange et aucun ticket ouvert avant « prêt pour validation »,
16 cellules avec un avis avant de sortir de l'avis humain, revalidation avant « prêt », ticket ouvert pour une retouche, nouvelle
version pour un re-check, 10 modèles au plus dans la boucle). La version courante ne peut désigner que la dernière version
enregistrée. Le validateur et le service gardent la main (publication, repêchage).

## Ce qui est automatique

Depuis le 2026-10-11 : entrée en vérification (5 à la fois, file par signaux), LANCEMENT DU TESTEUR (3 en parallèle), corrections
techniques regroupées, écart des designs toujours rouges après correction. Le tournoi ne décide plus rien. Avant :

Génération des candidats, filtre léger, appariements, arrêt du tournoi, sélection des finalistes, entrée dans la boucle (10 au
plus), passages d'étape, tickets techniques (résultats du testeur), fermeture des tickets techniques repassés au vert,
priorisation des retouches (export), création des versions depuis les retouches de Claude, pré-remplissage des tags. L'automate
(`fairetournerChaine`) tourne à chaque ouverture du tableau, du tournoi, d'une fiche ou d'une révision (pas de tâche planifiée).

L'humain ne fait que choisir (présélection), voter (tournoi), commenter (avis, revalidation) et valider (Paul).

## Échanges avec les agents (fichiers du dépôt, lus par l'API GitHub comme `predictions.json`)

- `retours/modeles-a-tester.json` (export) : versions sans résultat de test (modèle, version, profil, scénario, composition).
- `retours/tests-modeles.json` (écrit par le testeur) : liste de `ResultatTestModele` ; ou écriture directe dans
  `modeles_versions.test` (service). La chaîne crée les tickets techniques (dédoublonnés par contrôle × page × appareil).
- `retours/tickets-modeles.json` (export) et la section « Chaîne des modèles : tickets à corriger » de `SYNTHESE.md` : tickets
  ouverts, modèles en retouche d'abord, meilleur rang, bloquants puis humains ; jamais d'auteur.
- `retours/retouches-modeles.json` (écrit par Claude) : `[{ modele, versionBase, composition, corrections: [{ ticket, texte }],
  auteur: 'claude' | 'testeur', note }]` ; appliqué seulement si `versionBase` est la version courante.

## Tableau de bord

Depuis le 2026-10-11 : quatre colonnes visibles (Choisir · Vérification · Relecture finale · Catalogue), une pastille par modèle ; les
écartés avec leur raison ; « Vue détaillée » repliée : profession, tournoi, ce qui attend un humain, ce qui tourne tout seul, statuts
internes. Avant :

Une colonne par étape avec compteur et « qui a la main » (Humain, Agent, Claude, Paul), filtres profession / profil, colonne
Ingrédients (Arrivages). « Ce qui attend un humain » par personne (le validateur voit toute l'équipe) ; « Ce qui tourne tout
seul » (testeur attendu, retouches de Claude, file des finalistes).

## Routine de 15 min / jour

- **Contributeur (10 min)** : ouvrir `/chaine` → « Ce qui attend un humain » ; 2 ou 3 pages de présélection (sans thème) ; 5 à 10
  grilles du tournoi (≈ 3-4 min) ; un modèle en avis (les pages « à voir ») ; les revalidations en 1 clic.
- **Paul (5 min)** : les modèles « Prêt pour validation » : verrous, tags, Publier ; un coup d'œil aux tickets rouverts.

## Migration

`supabase/migrations/0064_chaine_trois_etapes.sql` (2026-10-11 : lancements du testeur, nouvelles transitions d’`avancer_modele`) ;
`supabase/migrations/0050_chaine_modeles.sql` (après 0049) puis `0052_tournoi_grilles.sql` (après 0051 : grilles du tournoi, J'aime,
profil facultatif des fiches, des duels et des grilles), rejouables, non exécutées par les agents. Sans 0050, `/chaine` affiche
« Migration 0050 à exécuter » ; sans 0052, le tournoi affiche « Migration 0052 à exécuter ».
