# Testeur de modèles

Décision de Paul (2026-10-09) : « Ajouter un agent de test sur le modèle final pour vérifier que tout marche. Limiter au max
l'humain. » Le testeur passe sur les **finalistes** de la chaîne des modèles (`docs/chaine-modeles.md`), jamais sur la présélection
ni pendant le tournoi.

```
candidat → finaliste → CHECK-AGENT → avis-humain → retouche (Claude) → RECHECK-AGENT → revalidation → pret-validation → publie
                          (check)                                         (recheck)                                    (re-test hebdo)
```

Deux moitiés, **un seul format** (`ResultatTestModele` de `packages/core/src/chaine-modeles-format.ts`, enrichi par
`packages/core/src/testeur-modeles.ts`) :

| Moitié | Quoi | Où |
|---|---|---|
| Script (« les instruments ») | constructions + contrôles mesurés, tickets techniques | `apps/sites/scripts/tester-modele.mjs` (`npm run tester:modele`) |
| Agent Claude (« l'œil ») | revue des captures avec la grille du goût de Paul, tickets goût | `.claude/agents/testeur-modeles.md` |

## Lancer

```
npm run tester:modele -- --modele <id> [--version n] [--mode check|recheck] [--profil sport-basket|diabete-senior|enfant-minimal]
npm run tester:modele -- --composition chemin.json [--version n]      # sans base : composition de recette, ou { id, version, composition, surcharges, sujets }
node apps/sites/scripts/tester-modele.mjs --fusionner visuel.json --resultat retours/tests-modeles/<id>-v<n>.json   # ajoute la revue de l'agent
```
`<id>` : fiche de la chaîne (UUID, table `modeles_fiches` + `modeles_versions`, en CI), recette du studio (`retours/recettes.json`
ou table `recettes`), ou modèle intégré (`tableau`, `technique`…). Options : `--sortie` (captures ; défaut dossier temporaire),
`--resultats` (défaut `retours/tests-modeles/`), `--sans-perf`, `--sans-webkit`, `--sans-agents`, `--sans-charte` (contrôle « non
mesuré » = orange), `--echec-si-rouge`.

En ligne : workflow **tester-modele** (`.github/workflows/tester-modele.yml`), à la main (Actions → Run workflow : modèle,
version, mode) ou depuis l'admin (`declencherTestModele`, `apps/admin/src/lib/tests-modeles.ts`, bouton `BoutonTesterModele`).
**Seul Paul déclenche** un workflow ; le testeur ne publie jamais rien.

## Jeux de données = profils de démonstration (chaîne : modèle = design sans images, 4b24e6b)

Pour un modèle de la chaîne, les jeux viennent du champ `jeux` de `retours/modeles-a-tester.json` (un profil par famille de thèmes
compatibles, `jeuxDuModele`), ou de `--jeux sport-basket,diabete,enfant` (input `jeux` du workflow, paramètre de
`declencherTestModele`). Pour CHACUN (`jeuxTesteurDeProfils`, `testeur-modeles.ts`) :
- thèmes et activités du profil (`PRINCIPAUX`, `SECONDAIRES`, `ACTIVITE`) ;
- le design est habillé des images du **kit du profil** (`designDe` puis `habillerPourProfil` ; photos de la banque intégrée du thème
  ou de l'activité du profil, jamais d'une autre activité : `photosDuKitProfil`) → `<sortie>/composition-<jeu>.json` ;
- forme des données tournante : 1er jeu données maximales à 3 praticiens, 2e cabinet seul aux noms et villes longs, 3e données
  minimales, puis on recommence.

Verdict : chaque jeu a le sien (le pire de ses tickets, `verdictsParJeu`) et le verdict global est le pire de tous. Chaque ticket
porte son `jeu` (champ facultatif du format commun) ; un même défaut vu dans plusieurs jeux reste UN ticket (« ×n, jeux : a, b »).

Nouveau contrôle **activités** : dans un jeu d'activité, aucun visuel (photo, dessin, image de fond, photos de la composition du
jeu) dont l'activité reconnue (`activitesReconnues`) n'est pas celle du profil : bloquant ; image d'un article de démonstration
d'une autre activité (elle suit le sujet de l'article) : majeur, signalé hors modèle (filet : la démo remplace déjà l'image d'un article
d'une autre activité par une image de sport générique, demo-podologue-lyon.ts). « marche » seule n'est jamais une activité
(analyse de la marche) : la randonnée se reconnaît à randonnee, rando, trail, montagne, bâtons, hiking (profils.ts, MOTS_AMBIGUS).

### Jeux historiques (sans liste de jeux : recette avec ses propres photos, modèle intégré)

| Jeu | Variables | Ce qu'il éprouve |
|---|---|---|
| `sport-basket` | `PRINCIPAUX=sport,ongles ACTIVITE=basket PRATICIENS=3` | données maximales, 3 praticiens, activité |
| `diabete-senior` | `PRINCIPAUX=diabete,senior CAS=solo,noms-longs` | cabinet seul, noms et villes longs (Marie-Dominique Delacroix-Montgolfier, Saint-Rémy-de-Provence) |
| `enfant-minimal` | `PRINCIPAUX=enfant SECONDAIRES= CAS=solo,minimal` | données minimales (3 soins, ni FAQ, ni articles, ni équipements…) |

Chaque jeu est construit dans `<sortie>/jeux/<jeu>/dist` (`CONTROLE_INDEXABLE=1`, `PLAN_OSM=non`), **une construction Astro à la
fois** (la suivante se construit pendant les contrôles de la précédente ; nouvel essai après 4 s puis 8 s en cas de collision du
cache `.astro` partagé). `SURCHARGES` (JSON de chemins pointés) pose les cas de test d'une composition (nom très long, lien mort…).

## Contrôles et seuils (`SEUILS_TEST_MODELE`)

Toutes les pages du site (accueil, sujets, liste et fiches des soins, cabinet, accès, articles, mentions, 404 ; FAQ dans les
fiches ; les pages de redirection `/a-propos` et `/rdv` sont exclues) à **360, 375, 768, 1024 et 1440 px**, mouvement réduit,
requêtes tierces bloquées (et notées).

| Contrôle | Mesure | Seuil / gravité |
|---|---|---|
| Débordement | `scrollWidth` > largeur | bloquant |
| Mots coupés | mot composé (trait d'union) ou mot ≥ 10 lettres sur 2 lignes (Range.getClientRects) | métier ou composé : bloquant ; autre : majeur |
| Chevauchements | blocs de texte / interactifs (hors parents, `<details>` fermés exclus ; texte tronqué par line-clamp / ellipsis : lignes visibles seulement) | recouvrement ≥ 25 % de la plus petite boîte : majeur |
| Contrastes AA réels | pixels de la capture sous chaque texte (fond dominant, 10e centile si fond varié), alpha et opacité compris | ≥ 4,5:1 (grand texte ≥ 3:1) ; < 3:1 bloquant |
| Cibles tactiles (360, 375) | boîte des liens / boutons (liens en ligne d'un paragraphe exemptés) | ≥ 44 px ; < 24 px majeur, sinon mineur |
| Liens et ancres | tous les `<a href>` internes, statique sur `dist` | page absente : bloquant ; ancre absente : majeur |
| Menu mobile (360, 375) | ouvrir, focus dans le menu, Échap, retour du focus | ne s'ouvre pas : bloquant ; reste majeur / mineur |
| Barre d'actions (375) | appel `tel:`, itinéraire, RDV, ≥ 44 px, ne masque pas le pied de page (mesuré en bas de page, hauteur stabilisée : pied en `content-visibility: auto`) | majeur |
| Formulaires | étiquettes, bouton d'envoi | majeur |
| Images | chargées, `alt`, dimensions, poids ≤ 300 Ko, aucune image démo, aucune refusée (≤ 2 ★, retirée, à retravailler, à valider : `retours/assets-notes.json`, `illustrations-statuts.json`, `verifierPublicationRecette`) | non chargée / démo / refusée du modèle : bloquant ; refusée hors modèle (contenu de démo, banque) : majeur |
| Polices | familles chargées (`document.fonts`), aucune police tierce | tierce : bloquant |
| Accessibilité | axe-core 4.14 (WCAG 2.0-2.2 A/AA, contraste exclu : mesuré sur le rendu) à 375 et 1440 px | critique : bloquant, sérieux : majeur, autres : mineur |
| SEO | title, description (70-170), canonical, `lang`, 1 H1, JSON-LD valide, titres uniques | voir `defautsSeo` |
| Agents IA | `controle:agents` sur le jeu 1 | score ≥ 90/100 |
| Charte | `controle:charte` (global au dépôt) | aucun écart |
| WebKit | `controle:webkit` (iPhone) sur 5 pages | ≤ 4 % de pixels différents par zone |
| Performance mobile | Chromium, 4G lente simulée (150 ms, 1,6 Mb/s), processeur ×4, cache vide, gzip ; accueil + 1 fiche (jeu 1), accueil (jeu minimal) | LCP ≤ 2,5 s (> 4 s bloquant), CLS ≤ 0,05 (> 0,25 bloquant), TBT ≤ 200 ms (> 600 bloquant), ≤ 1 000 Ko (> 2 500 bloquant) |
| Console | erreurs `console.error`, exceptions | exception : bloquant ; erreur : majeur |
| Animations | sans mouvement réduit : animations repérées ; avec : aucune ne tourne, chaque élément animé (sélecteur exact `:nth-of-type`, retrouvé sous mouvement réduit) reste visible (image fixe ; un tracé droit d'une seule dimension nulle est visible), capture `accueil--image-fixe.png` | majeur |
| Tiers | toute requête hors du site | majeur |
| Cadrage des visuels (toutes largeurs) | dessin SVG posé dans une case (élément au bord visible qui ne contient que lui) : boîte de TOUT le tracé (géométrie de chaque path / use…, clip-path compris) et de ce qui SE VOIT (fenêtres des <svg>, ancêtres qui masquent leur débordement) ; `defautCadrage` | coupé (le tracé dépasse de ce qui se voit) > 4 % de la case : majeur, > 15 % : bloquant ; décentré (marges opposées) > 18 % : majeur. Fond perdu toléré : le dessin sort par le BORD de la case, son <svg> calé dessus |
| Cohérence | images étirées (object-fit: fill, rapport faussé > 3 %), images agrandies (floues : fichier servi plus petit que sa place, > ×1,25 mineur, > ×1,6 majeur) ; cartes sœurs d'une même rangée (même balise, mêmes classes, même haut) : visuels de tailles différentes (> 8 %), décalés (> 4 px), textes alignés différemment ; `defautsCartesSoeurs` | majeur ; hauteurs inégales (> 10 %) : mineur |

Contraste (2026-10-09) : les lettres sont reconnues à leur couleur PEINTE (texte rgba mélangé au fond le plus fréquent) et les
pixels d'anticrénelage (voisins d'une lettre, de couleur entre le texte et le fond dominant) sont écartés du 10e centile ; sans cela,
les polices fines (Bodoni, mono, condensée) et le texte blanc à 80 % sur fond sombre donnaient de faux « 1,5:1 (fond varié) ». Traits
très fins (mono 13 px, aucun pixel à la couleur du texte) : un pixel à mi-chemin texte → fond, avec du fond dominant à 2 px au plus,
compte comme cœur de lettre et ses voisins intermédiaires comme anticrénelage (« 22 SEPTEMBRE 2026 » mesuré 3,69:1 → 5,9:1, réel 6,3:1) ;
une plage claire de photo derrière un texte blanc n'est pas un trait fin et reste comptée.

## Cadrage des visuels dans leurs cases (retour de Paul du 2026-10-10)

« Tu as mis vert alors que les images ne sont pas centrées dans leurs cases… » (finaliste 3a2bad2a v1 : cartes « Podologie du
sport », « Semelles orthopédiques », « Douleur au talon », dessins coupés en haut, collés au bas de leur case). Cause : les dessins
de la marque sont tracés dans un repère 240 × 180 sans y être centrés (chaussure posée bas, jambe qui entre par le haut et sort du
repère, orteils coupés à droite) et les cases les posaient par ce repère, réduit (svg à 80 % × 88 %) : dessin bas, jambe arrêtée
net à 6 % sous le haut de la case. Aucun contrôle ne mesurait le cadrage.

- **Correction** (`packages/core/src/cadrages-dessins.ts`) : dans une case, le <svg> remplit la case et son viewBox est recadré sur
  la boîte du tracé visible (`cadrageDessin`, marge 10 % du plus grand côté) ; un côté où le dessin sort de son repère, ou y est
  coupé net (fond perdu), n'a pas de marge et est calé sur le bord de la case (`preserveAspectRatio`). Sites : `<Dessin cadre>`
  (VignetteSoin : cartes de soins, Expertises, « Autres compétences » ; Competences, Actus, Couverture, VisuelTheme, VisuelEntete,
  Planche et Empreintes, en-tête des fiches) ; admin : `svgDessin(…, { cadre: true })` (ApercuGabarit, cases du gabarit classique
  d'ApercuTheme ; `.ap-svg > svg` : un <svg> imbriqué n'est plus étiré) ; pièce de la bibliothèque sans panneau (ongles épais) :
  fenêtre ouverte (`DESSINS_FENETRE_OUVERTE`), la case la coupe ; héros des thèmes au trait continu (`illustrationTheme`, pièce cadrée prolongée
  jusqu'au bord du héros). TetePage : le visuel remplit sa case (plus de svg à 88 %).
- **Boîtes mesurées** (`cadrages-dessins-donnees.ts`, fichier généré) : `node apps/sites/scripts/mesurer-cadrages-dessins.mjs`
  (Chromium, même géométrie que le testeur, `--verifier` : code 1 si périmé). À relancer après avoir retouché un dessin.
- **Contrôle** « cadrage » (ci-dessus) et « coherence » : mesures dans la page `apps/sites/scripts/testeur-modeles/mesures-visuels.mjs`,
  jugement pur dans le core (`defautCadrage`, `defautsCartesSoeurs`, `imageEtiree`). Vignettes : capture de l'élément fautif, barre
  d'actions et en-tête collants masqués.
- **Démonstration** (2026-10-10, recette « Sport · Clair et pratique · Lavande & citron » : mêmes cartes et mêmes soins que le cas
  de Paul) : avant la correction, le testeur passait de vert à **rouge** sur le cadrage (sites : 86 visuels mal cadrés sur 134,
  semelle coupée en haut à 87 %, talon, ongles épais, cors, diabète, chaussure décentrée de 24 %) ; aperçu de l'admin (ApercuModele,
  rendu hors ligne, script de la planche) : semelle et talon bloquants, chaussure majeure. Après : 0 défaut de cadrage sur l'aperçu
  (gabarits tableau, village, revue, classique ; ordinateur et téléphone) ; sites (6 recettes, jeu sport-basket) : plus aucun dessin
  de soin ni de sujet mal cadré ; seul reste signalé (majeur) le héros composé « ongles » (scène, `heros-scenes.ts` : 3e orteil
  coupé net à droite), à retoucher.

Limites : seuls les dessins SVG sont mesurés (une photo ou une illustration en <img> n'a pas de « tracé » : son cadrage reste à
l'agent visuel) ; une case doit avoir un bord visible (fond, ombre, bordure) et ne contenir que le visuel ; une case ronde est
jugée sur son rectangle (un fond perdu y est rogné par l'arrondi) ; la géométrie ignore l'épaisseur des traits et les masques ;
les scènes composées des héros (`sceneHeros`) gardent leur propre cadrage (mesurées, pas recadrées).

## Rendus hors ligne : exclusions et photos validées (M15, 2026-10-09)

La démo, le testeur et `scripts/rendre-recettes.mjs` n'ont pas Supabase. Avant tout choix de photo, ils posent le registre d'images
(`definirContexteImages`) depuis les exports du dépôt (`apps/sites/src/lib/retours-hors-ligne.ts`, fonctions pures
`packages/core/src/photos-validees.ts`) :
- **exclusions strictes** (`clesExcluesHorsLigne`) : moyenne ou dernière note ≤ 2 ★ (notes remises les plus récentes d'abord),
  retirées, à retravailler, **à revoir** (`retours/assets-notes.json`, `retours/illustrations-statuts.json`) ; le testeur juge avec
  la même liste ;
- **vivier 4-5 ★** par sujet : photos du manifeste `retours/photos-validees.json` (photos libres validées et hébergées, moyenne
  ≥ 4 ★, jamais exclues : URL publique, clé, sujets, note, source ; aucune donnée personnelle) puis photos intégrées notées ≥ 4 ★.
  Un design en style « Photos » ne tire QUE là (`tirerPhotos`) ; un sujet sans photo 4-5 ★ n'en reçoit aucune.

Le manifeste est écrit par l'export nocturne (`scripts/exporter-retours.mjs`, workflow exporter-retours, clé service en secret
GitHub). Le testeur sert ces photos depuis un cache local (`<tmp>/testeur-photos-plateforme`, téléchargées une fois) : elles ne
comptent pas comme requêtes tierces. Variables : `RETOURS_HORS_LIGNE=non` (comportement d'avant), `PHOTOS_VALIDEES=<chemin>`
(autre manifeste). Essai du 2026-10-09 : D4 passé en style Photos (manifeste d'essai de 53 photos 4-5 ★), jeux diabète, senior,
sport-course : **VERT** (photos visibles toutes ≥ 4 ★).

La performance est mesurée « maison » (même réglage que Lighthouse mobile, appliqué par Chromium) : Lighthouse n'est pas une
dépendance du dépôt. axe-core est la seule dépendance ajoutée (devDependency de `apps/sites`).

Verdict : **rouge** si un ticket est bloquant, **orange** si un ticket majeur ou un contrôle non mesuré, sinon **vert** (les mineurs
ne changent pas le verdict). Le résultat du script seul n'a pas le contrôle `visuel` : l'agent l'ajoute (`--fusionner`).

## Sortie

- `retours/tests-modeles/<modele>-v<n>.json` : `ResultatTesteur` = `ResultatTestModele` + `format`, `mode`, `source`, `jeux`,
  `pages`, `largeurs`, `captures`, `comparaison` (re-check), `run`. Contrôles : `id`, `verdict`, `mesure`, `seuil`, `tickets`.
- Tickets (`creerTicket`) : format commun (`page`, `appareil`, `zone` normalisée, `element`, `etiquette`, `gravite`, `controle`,
  `origine: testeur`, `statut: ouvert`, `numero: 0`) + `chemin`, `largeur`, `jeu`, `zonePx`, `categorie` (`technique` | `gout`),
  `mesure`, `seuil`, `suggestion`, `vignette` (zone encadrée en rouge, JPEG ≤ 480 px, 60 au plus), `vignetteAvant` (re-check),
  `empreinte` (même défaut ⇒ même empreinte d'une version à l'autre). Les défauts répétés sur plusieurs pages sont regroupés (« ×n »).
  Ces champs sont des champs FACULTATIFS de `TicketModele` (format commun) : `normaliserTicket` les garde, la chaîne peut les afficher.
- Écriture : par le bot de la CI (commit dans `retours/`), jamais par la base ; la colonne `modeles_versions.test` est remplie par
  la chaîne (validateur ou service seulement, 91f0a03). Aucun secret dans les résultats.
- `retours/tests-modeles.json` : agrégat lu par la chaîne (`lireResultatsTests`, `faireTournerChaine`), 3 dernières versions par modèle.
- Captures (artefacts du workflow, 30 jours) : `captures/<jeu>/<largeur>/<page>.png` (375 et 1440 px pour le jeu 1, 375 px pour les autres).
- Aucune donnée personnelle (jeux fictifs ; `masquerDonnees` retire par sécurité e-mails, téléphones et numéros à 11 chiffres).

Rapport dans la fiche : `apps/admin/src/components/RapportTestModele.tsx` (contrôles, comparaison, tickets avec vignettes servies par
`/api/tests-modeles/vignette`), données par `lireResultatTestModele(modele, version)`.

## Check et re-check

- **check** : rapport complet.
- **recheck** (`--mode recheck`) : compare à `retours/tests-modeles/<id>-v<n-1>.json` (ou `--precedente`) : `comparaison.corriges`
  (avec vignette avant / après de la même zone), `toujoursOuverts`, `nouveaux` (régressions), `controlesChanges`. L'humain ne
  revalide que ce qui a changé.

## Règle de validation

`regleValidationModele` / `verrouTesteur` (`testeur-modeles.ts`) : un modèle n'est **ni validé ni publié** si son dernier test sur la
**version courante** n'est pas vert. Orange (ou script sans vérification visuelle de l'agent) : validation possible avec une
**justification écrite de Paul** (≥ 15 caractères). Rouge, test absent ou d'une autre version : refus. `verrouTesteur` remplace le
verrou « testeur » de `verrousValidation` (chaîne) dès que la fiche enregistre la justification.

## Re-test hebdomadaire

Bloc `schedule` du workflow, **commenté par défaut** (lundi 4 h 23 UTC) : il teste chaque modèle de
`retours/tests-modeles/a-retester.json` (`[{ "modele": "<id>", "version": n }]`, tenu par la chaîne pour les modèles publiés).
`aRetester(dernierLe)` : vrai au-delà de 7 jours. Activer = décommenter le bloc (décision de Paul).

## Durée

Profils (2026-10-09, Windows, autres agents actifs, 6 onglets en parallèle, toutes les largeurs dans une même file) : **50 à
110 s par jeu** (construction ≈ 25-40 s, en recouvrement avec les contrôles du jeu précédent ; le 1er jeu est le plus long :
captures 375 + 1440 px, axe aux 2 largeurs, performance). 3 jeux : **3,3 à 3,5 min** ; 7 jeux (toutes les familles de la
podologie) : **6,1 min**. Au-delà de 7 jeux, compter ~1 min par jeu de plus. Durée par jeu dans `resultat.jeux[].dureeMs`.

Jeux historiques : 
Objectif < 10 min par modèle. Mesuré en local le 2026-10-09 (Windows, d'autres agents construisant en même temps) : **4,2 à 4,7 min**
par passage complet (3 constructions ≈ 30-40 s chacune, en recouvrement avec les contrôles ; ~260 rendus page × largeur ;
WebKit ≈ 1 min 45 en parallèle ; performance ≈ 30 s).

## Tester le testeur

`apps/sites/scripts/testeur-modeles/composition-saine.json` (recette « Prévention douce · Canard », éléments tous validés) et
`composition-cassee.json` (même recette, couleur libre jaune pâle `#f4ec7a`, photo refusée `soins-pied-tenu` en accueil et dans la
composition, nom de cabinet et de praticienne très longs, lien mort `/tarifs-detailles` et ancre absente dans une fiche) :

```
npm run tester:modele -- --composition apps/sites/scripts/testeur-modeles/composition-saine.json
npm run tester:modele -- --composition apps/sites/scripts/testeur-modeles/composition-cassee.json
npm run tester:modele -- --composition apps/sites/scripts/testeur-modeles/composition-saine.json --modele test-cassee --version 2 --mode recheck
```

La couleur libre claire est **corrigée par la plateforme** (accent dérivé AA, `ajusterContraste`) : sans défaut réel, le testeur ne
signale rien, ce qui est juste. Pour vérifier qu'il voit un contraste raté, la composition cassée porte un `cssDeTest` (CSS
injecté par le testeur seulement, jamais dans un site) qui contourne la garde.

Résultats du 2026-10-09 (`retours/tests-modeles/test-*.json`) :

| Composition | Verdict | Durée | Tickets |
|---|---|---|---|
| saine v1 (jeux historiques) | **orange** | 4,2 min | 0 bloquant, 4 majeurs, 37 mineurs : 4 défauts de la PLATEFORME, pas du modèle (logo : nom accessible ≠ texte visible, axe « label-content-name-mismatch » ; barre mobile du gabarit sans « Itinéraire » ; photo d'article de démo `sport-foulee-herbe` notée ≤ 2 ★ ; 1 écart de `controle:charte` en cours chez un autre chantier) |
| cassée v1 (jeux historiques) | **rouge** | 4,4 min | 60 bloquants : contraste 1,15:1 (couleur claire), débordement à 1024 px (nom « Delacroix-Montgolfier-Saint-Exupéry-Vandenbroucke »), photo refusée `soins-pied-tenu` (composition et rendu), lien mort `/tarifs-detailles` ; majeur : ancre `#horaires-inexistants` |
| re-check (saine comme v2 de la cassée) | orange | 4,7 min | 63 corrigés (dont 56 avec vignettes avant / après), 40 toujours ouverts, 1 nouveau |
| saine, jeux sport-basket, diabete, enfant | **orange** (basket orange, diabète et enfant verts) | 3,3 min | 1 majeur : image de l'article de démo « course » dans le jeu basket (contenu, hors modèle) ; les défauts plateforme de la 1re passe sont corrigés (1466c02) |
| cassée, mêmes jeux | **rouge** (3 jeux rouges) | 3,5 min | 61 bloquants dont la photo `sport-course` de la composition dans le jeu basket (contrôle activités) |
| saine, 7 jeux (toutes les familles), après correction du contenu de démo et de « marche » | **VERT** (7 jeux verts) | 6,8 min | 0 bloquant, 0 majeur, 34 mineurs |

Limite connue : la vignette « après » reprend les MÊMES coordonnées ; si la mise en page a bougé entre les versions, la zone peut
être décalée (la vignette « avant » reste juste).
