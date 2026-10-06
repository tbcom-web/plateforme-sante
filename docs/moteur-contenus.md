# Moteur de contenus — site, écran de salle d'attente, réseaux sociaux

Objectif : une suite unifiée ÉcranZen / site / réseaux sociaux. On commence par les **réseaux sociaux** (Instagram, Facebook,
posts de la fiche Google), le plus simple à automatiser. Phase 1 (ce document) : prototype de bout en bout pour le cabinet de
démo (`apps/sites/src/data/sites/demo-podologue-lyon.ts`). Rien n'est publié : la publication est la phase 2.

Principe (Paul, 2026-10-05) : **la clé est la personnalisation instantanée des contenus aux couleurs et au nom du praticien.**

```
SUJET (contenu sourcé, rédigé et validé UNE fois, sans rien du cabinet)
   × FORMAT (carrousel 4:5, post 1:1, Story 9:16, fiche Google 4:3, Reel 9:16)
   × IDENTITÉ (nom, praticiens, ville, gamme/couleur, logo, modèle, style, lien du site)
   → PUBLICATION rendue à la demande par des gabarits PURS — même code dans le navigateur (aperçu) et à l'export (PNG/MP4)
```

## Architecture

| Couche | Où | Rôle |
|---|---|---|
| Contenu | `packages/contenus/src/sujets.ts` | 16 sujets sourcés (sources de 1er rang, URL, date de mise à jour de la page, date de consultation, extrait relu) |
| Mentions | `mentions.ts` | M1–M5 et variantes, **mot pour mot** du référentiel éthique ÉcranZen (`studio/referentiels/ethique/podologie.md`) |
| Calendrier | `calendrier.ts` | sujets par mois (octobre → septembre), repères (Semaine bleue, 14 novembre…), mois type, enchaînements interdits |
| Composition | `composer.ts` | sujet × format → `Publication` (contenu seul) ; × identité → `PublicationPersonnalisee` (légende, lien, textes alternatifs) |
| Identité | `identite.ts` | `identiteDepuisSite(site)`, `identiteRapide({…})` (aperçu gratuit), variables CSS, polices, logo (`svgMarque` ou `logoPerso`) |
| Gabarits | `gabarits.ts` | fonctions pures (diapositive, identité) → HTML/SVG ; feuille `FEUILLE_GABARITS` uniquement en variables de la charte |
| Rendu navigateur | `rendu-navigateur.ts`, `navigateur.ts` | ajustement du texte (`ajuster`), contrôle de lecture (`controlerRendu`), `monter()` mesuré, `changerCouleurs()` |
| Garde-fous | `garde-fous.ts` | refus de générer, liste claire des ✗ |
| Générateur | `scripts/generer.mjs` | aperçu instantané, export PNG (Playwright), planches, `mois-type.json` |
| Reels | `scripts/reel.mjs`, `reels/` | moteur de reels d'ÉcranZen (copie) personnalisé au cabinet → MP4 9:16 |
| Animations du site en vidéo | `scripts/exporter-animation.mjs` | animation des sites (une source : `packages/core/src/meulage.ts`) → MP4 H.264 + WebM VP9, 16:9 et 9:16, boucle de 12 s, étiquettes facultatives (`--etiquettes`) ; page pilotée par `window.ezAller(t)` comme les reels |

Le **site** et **ÉcranZen** sont branchés sur les mêmes couches : la charte (`packages/core/charte.ts`), les gammes, les modèles et
les registres (relevé / pédagogique) du site ; la bibliothèque d'illustrations ÉcranZen déjà portée (`packages/core/src/bibliotheque`) ;
les mentions, garde-fous et règles de lecture d'ÉcranZen. Un sujet du catalogue est la même unité éditoriale qu'un sujet du backlog
ÉcranZen (`ecranzen: 'POD-SUJ-…'`) et peut alimenter un article du site (champs `legende`, `sources`, `soins`).

## Modèle de données (`types.ts`)

- **Sujet** : `id`, `ecranzen`, `titre`, `specialite` (generale, sport, enfant, soins, senior ; posture = faible preuve), `niveauPreuve`,
  `saisons`, `mois`, `soins` (slugs du catalogue → lien vers la fiche du site), `mention` (+ `texteM5`), `sources[]`
  (`organisme`, `titre`, `url`, `majPage`, `consulteLe`), `affirmations[]` (`texte`, `source`, `extrait` relu sur la page),
  `couverture`, `points[]` (titre, corps, visuel facultatif, alt), `pratique[]`, `messageCle`, `legende[]`, `hashtags[]`, `google`,
  `interdits` (profil éthique du sujet), `statut`, `conditions`.
- **Visuel** : `{ type: 'dessin', nom }` (svgDessin), `{ type: 'bibliotheque', id, vue, etat }` (éléments ÉcranZen **validés**
  seulement), `{ type: 'equipement', id }` (svgEquipement). Sans visuel : carton de texte (on ne force jamais un dessin faux).
- **Publication** : `format`, `diapositives[]` (rôle couverture, point, pratique, mention, signature, affiche), `legende`, `hashtags`,
  `soin`, `texteGoogle`, `mention`. **PublicationPersonnalisee** : + `legendeComplete` (≤ 2200 car., mention, « lien en bio »,
  hashtags), `lien` (fiche du soin, jamais la page de rendez-vous), `alts[]` (un texte alternatif par image).
- **Identite** : `nom`, `praticiens[]`, `metier`, `ville`, `quartier`, `domaine`, `lienRdv` (jamais affiché), `modele`, `theme`
  (couleur, gamme), `logo` / `logoPerso`, `specialite`, `style`, `soinsDuSite`.

Formats : carrousel 1080 × 1350 (5 à 8 diapositives : couverture, 2 à 4 points, « en pratique », mention seule, signature du
cabinet sur un carton séparé) ; post 1080 × 1080, Story 1080 × 1920 (zone utile y 200–1720) et image Google 1200 × 900 : message
clé + visuel + mention sur l'image, logo et nom en tête (jamais à côté de la mention) ; texte Google ≤ 1500 caractères.

## Trois styles, personnalisés à l'identité

| Style | D'où | Rendu |
|---|---|---|
| `releve` | modèles premium, prestige, proximité… (registre relevé) | fond « plan d'architecte » (`surface-plan`), trame de pression, sur-titres numérotés et lectures en mono, mention illustrative sous les dessins techniques |
| `pedagogique` | registre pédagogique du modèle | fonds clairs, schéma au trait sur fond doux, un seul accent, ni mono ni numéro |
| `simple` | modèle Simple | Nunito, gros caractères, carte claire arrondie, encart de mention encadré |

Couleurs : uniquement des variables (`feuilleCharte()` + `variablesTheme(modele, theme)` / `variablesGamme`) : changer d'identité ou
de gamme = changer l'attribut `style` du conteneur. Logo : la marque du cabinet (`svgMarque`, traitement du modèle ; une marque au
trait passe sur sa tuile, illisible sinon en vignette ; sur fond plan, tuile au « signal ») ou `logoPerso`.

Texte : tailles de départ par rôle (titre de couverture 108 px, point 82, mention 92, liste 84…), réduites par `ajuster()` jusqu'à un
minimum lisible ; minimum absolu 34 px sur 1080 (≈ 12 px sur un téléphone). Mots composés jamais coupés au trait d'union
(« pédicure-podologue »), espaces fines insécables devant « : ; ? ! ».

**Aperçu instantané** : `dist/social/apercu.html` (ou `Contenus.monter(element, identite, { style })` dans l'admin) : composition,
HTML, ajustement et contrôle du mois complet dans le navigateur, sans serveur. Mesuré (Chromium, poste de Paul) : **55 à 140 ms
pour les 8 publications du mois** une fois les polices chargées (≈ 7 à 20 ms par publication), 150 à 430 ms au premier rendu.
L'export PNG (Playwright) n'a lieu qu'au téléchargement ou à la validation.

## Garde-fous (un contenu qui casse une règle n'est pas généré)

Repris d'ÉcranZen (`html/reels/garde-fous.js`, `charte/lignes-rouges.md`, `charte/grammaire.md` §6, `referentiels/ethique/podologie.md`),
du lexique (`packages/core/src/lexique.ts`) et des pièges (`docs/referentiels/pieges-illustration.md`). Chaque ✗ dit la règle et sa source.

- **Sources** : au moins une ; organisme de 1er rang (Ameli, HAS, Ordre, Légifrance, société savante, NHS, Santé publique France)
  et URL de son domaine ; date de consultation de moins de 12 mois ; chaque affirmation rattachée à une source et à un extrait relu.
- **Mention** : code connu ; diabète ⇒ famille M2 ; M2 hors diabète signalée ; M4c seulement si le sujet est la semelle ; M5
  finit par « … parlez-en à votre médecin. » ; la mention est seule sur sa diapositive, avant la signature ; jamais en capitales.
- **Texte** : lexique bloquant (superlatifs, promesses, « garanti », « sans douleur »…) ; ton commercial (rendez-vous, prenez,
  prix, tarif, gratuit, remboursé, offre, nouveau, €, Doctolib…) ; promesses (« éviter », guérir, avant/après, définitivement) ;
  « ! » ; ton anxiogène ; « au cabinet », « nos soins » ; titres non reconnus (« posturologue », « spécialiste ») ; témoignage ou cas
  patient ; pièges de lecture (« l'ongle droit », « un index d'espace ») ; mots interdits du profil éthique du sujet.
- **Lecture** (grammaire §6) : ≤ 12 mots de titre et ≤ 12 mots de corps par image ; « en pratique » 2 ou 3 gestes.
- **Structure** : carrousel 5 à 8 diapositives (couverture, « en pratique », mention, signature) ; texte alternatif (20 à 250 car.).
- **Visuels** : dessin, matériel ou élément de bibliothèque existant **et validé par Paul** (un élément « brouillon » ou
  « en-validation » est refusé).
- **Réseaux** : légende ≤ 2200 car. avec « lien en bio », sans URL ni renvoi vers le rendez-vous ; 3 à 6 hashtags thématiques
  (ni promotionnels, ni locaux, ni nom du cabinet) ; texte Google ≤ 1500 car., sans téléphone ; lien = fiche du soin (page d'information).
- **Identité** : nom et praticiens passés au même contrôle de texte (ni slogan ni promesse).
- **Rendu** (dans le navigateur, même code pour l'aperçu et l'export) : texte qui déborde même à sa taille minimum, texte < 34 px,
  contraste < 4,5:1 (mesuré sur le rendu, transparences comprises), texte hors du cadre, Story hors de la zone utile → la
  publication n'est pas exportée.
- **Enchaînements** (ÉcranZen `apres_interdit`) : un contenu « bilan postural » n'est jamais suivi d'un contenu semelles (prêt pour
  le jour où ce thème sera activé).
- **Faible niveau de preuve** (Paul, 2026-10-05) : posturologie, biomécanique « posturale », réflexologie, semelles
  « proprioceptives » sont **hors du catalogue de départ**. Un sujet qui en parle doit porter `niveauPreuve: 'faible'` (sinon ✗) ; il
  est alors **bloqué** tant qu'il n'est pas activé explicitement (`verifierSujet(s, date, { autoriserFaiblePreuve: true })`), ce qui
  suppose une validation déontologique écrite. La spécialité « posture » des sites n'a donc aucun sujet pour l'instant.

`npm run controle:charte` (apps/sites) vérifie aussi le moteur de contenus : aucune couleur littérale dans `packages/contenus/src`
et `scripts`, les 16 sujets et leurs publications (4 formats × 4 identités, dont un nom très long et des caractères spéciaux) sans
✗, enchaînements du mois type, garde-fou « faible niveau de preuve » actif.

## Catalogue de départ (16 sujets, sources consultées le 2026-10-05)

| Sujet | Spécialité | Mois | Mention | Sources |
|---|---|---|---|---|
| Ongle incarné : couper droit | générale | déc. | M1 | Ameli ongle incarné (prévention, reconnaître) |
| Bien choisir ses chaussures | générale | fév. | M3-a | Ameli « prendre soin de ses pieds » ; HAS pied de la personne âgée 2020 (annexe 8) |
| Après la douche : sécher entre les orteils | générale | juin | M1 | Ameli « prendre soin de ses pieds » ; HAS 2020 |
| Diabète : regarder ses pieds chaque jour | générale | nov. | M2 | Ameli « suivi des pieds du diabétique » |
| Cor au pied : souvent une chaussure qui appuie | générale | mars | M3 | Ameli cors (causes, prévention) ; CSP L4322-1 |
| Piscine et vestiaires : des sandales | générale | juil. | M1 | Ameli verrues (prévention) |
| Ampoules : chaussures neuves | générale | août | M1-b | Ameli ampoules ; Ameli « prendre soin de ses pieds » |
| Le pédicure-podologue, qui est-ce ? | générale | oct. | M1-a | CSP L4322-1, L4322-2 ; ONPP « compétences » |
| Reprendre le sport : progressivement | sport | janv. | M1 | Ameli « activité physique en sécurité » |
| Protéger ses chevilles : 3 gestes | sport | mai | M1 | Ameli entorse de la cheville (reprise) |
| Rentrée : des chaussures à la bonne taille | enfant | sept. | M1-c | Ameli boiterie de l'enfant ; Ameli « prendre soin de ses pieds » |
| Pied plat du jeune enfant : souvent normal | enfant | sept. | M3 | SoFOP 2022 ; Ameli semelles orthopédiques |
| Chez soi aussi, des chaussures qui tiennent le pied | senior | oct. | M1 | Ameli prévenir les chutes ; HAS 2020 |
| Ongles épais ou difficiles à couper | senior | oct., déc. | M1 | HAS 2020 ; Ameli « prendre soin de ses pieds » |
| Semelles orthopédiques : qu'est-ce que c'est ? | soins | mars | M4c-b | Ameli semelles orthopédiques ; CSP L4322-1 |
| Semelles neuves : les porter progressivement | soins | avril | M3 | NHS Guy's and St Thomas' « Foot insoles » |

Points retirés à la relecture des sources (non trouvés ou formulés autrement) : « vérifier souvent la pointure », « 1 cm », « ne
forcez pas », « limer plutôt que couper », « problème de circulation » (Ameli : « diabète ou artérite »), « claquettes » (Ameli :
« sandales ou tongs »). « Sans douleur ni gêne » s'écrit « en l'absence de douleur ou de gêne » (lexique). La HAS ne dit rien du
port progressif des semelles : seule la source NHS est citée, sans chiffre (profil éthique ÉcranZen 033). Tous les sujets sont
« à valider » : relecture éthique (GATE 2) et validation du praticien avant publication.

## Ajouter un sujet

1. Partir d'un sujet du backlog ÉcranZen (`studio/catalogue/backlog.json`) et de ses conditions éthiques (`production/_programme/*-ethique.md`).
2. Ouvrir chaque source, recopier l'extrait qui porte l'affirmation (≤ 25 mots), la date de mise à jour de la page et la date du jour.
   Une affirmation sans extrait ne s'écrit pas (C8). Ne jamais recopier une citation non relue.
3. Écrire le sujet dans `sujets.ts` : couverture ≤ 12 mots, 2 à 4 points (titre ≤ 12 mots, corps ≤ 12 mots, visuel validé ou
   carton de texte), « en pratique », message clé, légende (paragraphe « Sources : … » en dernier), 3 à 6 hashtags, texte Google,
   mention (variantes à alterner), `interdits` du profil éthique, `conditions`.
4. `node packages/contenus/scripts/generer.mjs --verifier` : 0 ✗ ; puis la génération complète, et **regarder les planches**
   (règle de lecture profane : ce qu'on comprend en 2 s).
5. `npm run controle:charte` (apps/sites).

## Commandes

```
node packages/contenus/scripts/generer.mjs --sortie <dossier>   # aperçu, PNG des 3 styles, planches, mois-type.json
node packages/contenus/scripts/generer.mjs --verifier           # garde-fous seulement
node packages/contenus/scripts/reel.mjs [<id>] --sortie <dossier> [--sans-mp4]
node packages/contenus/scripts/exporter-animation.mjs meulage [--format 16x9|9x16|tous] [--etiquettes] [--registre pedagogique] [--sortie <dossier>] [--planche] [--images]
cd packages/contenus && npx tsc -p tsconfig.json
```

Sorties (`<dossier>`) : `apercu.html` (aperçu instantané : cabinet, style, couleurs), `releve/`, `pedagogique/`, `simple/` (PNG),
`planche-<style>.png`, `planche-trois-identites.png` (même mois, trois cabinets, temps de rendu), `planche-noms-difficiles.png`,
`identites/`, `reel/` (MP4, couverture, images clés, planche), `mois-type.json`.

## Reels

`packages/contenus/reels/ecranzen/` est une **copie** du générateur de reels d'ÉcranZen (`TBCOM CLAUDE/ecranzen/studio/html/reels`
et `html/lib`, 2026-10-05, reprise autorisée par Paul) ; les polices Sora et JetBrains Mono (OFL) sont copiées avec leur licence
dans `reels/polices`. Les fichiers sont conformes à l'original (en-tête de provenance) sauf `moteur-reel.js`, qui porte quatre
adaptations marquées « ADAPTATION plateforme-sante » : reel fourni par la page, nom du cabinet à la place de la marque ÉcranZen dans
l'en-tête (décor), en-tête effacé pendant la scène de mention (jamais le nom à côté de la mention), zone de la mention élargie à la
marge de 5 % en 9:16. Le dossier ÉcranZen d'origine n'est jamais modifié.

`scripts/reel.mjs` exécute les garde-fous d'ÉcranZen tels quels (même code, lecture ≥ 2 s + 0,5 s/mot, ≤ 7 mots par carton, profil
éthique du sujet), puis le lexique ; la page reprend la palette du cabinet (plan, signal de la gamme, palette de pression de la
charte) et exporte image par image (1200 images pour 40 s, ≈ 2 min) en H.264 1080 × 1920. Premier Reel : « Semelles neuves »
(POD-SUJ-033, textes validés éthique le 2026-09-30 ; « votre podologue » → « votre pédicure-podologue », titre légal).

**Point à trancher dans ÉcranZen** : la mention M3 au titre légal (« à votre pédicure-podologue. », 2026-10-02) mesure ≈ 1020 px à
72 px en Sora 800, plus que la zone utile 9:16 : elle ne tient plus dans aucun reel vertical. Le Reel utilise la variante M3-b
(« Une douleur, une gêne ? / Votre pédicure-podologue / peut vous conseiller. »), validée par Paul avec « la fonction, l'usage et les
interdits de sa mention mère » ; le générateur étend en conséquence les profils éthiques (M3 ⇒ M3-a/b/c).

## Phase 2

1. **Kits dans l'admin** (`apps/admin`) : le praticien voit son mois (même `Contenus.monter`, aucun rendu serveur), change de style
   ou de couleurs, désactive un sujet, **valide chaque publication** (le contenu engage le praticien : principe 10 du référentiel) ;
   historique des validations ; rien ne part sans validation. Table `publications` (sujet, format, date, statut : proposée,
   validée, programmée, publiée, refusée ; empreinte du rendu ; validateur, date).
2. **Export à la validation** : rendu PNG/MP4 côté serveur par la même page (Playwright dans une tâche, ou rendu navigateur →
   `canvas`/`toBlob` pour les images fixes), stockage (Supabase Storage UE).
3. **Publication programmée** : Meta Graph API (Instagram Content Publishing : conteneurs carrousel, image, Reels ; Facebook Page)
   et Google Business Profile API (localPosts) — par **délégation d'accès partenaire** (Business Manager de la plateforme invité
   sur la page du cabinet ; gestionnaire de la fiche Google), **mandat écrit** du praticien (périmètre, révocation, journal des
   publications), jetons chiffrés et renouvelés, file de publication avec reprise, aucune publication sans validation.
4. **Aperçu gratuit** (prospects) : `identiteRapide({ nom, ville, gamme… })` → le mois aux couleurs du cabinet en moins d'une
   seconde, sans compte.
5. **Branchement d'ÉcranZen** : les sujets deviennent la source commune (backlog ÉcranZen ↔ `sujets.ts`), les Reels sortent du
   même générateur pour la salle d'attente (16:9) et Instagram (9:16), les mentions et garde-fous restent ceux d'ÉcranZen ; un
   sujet ne change de statut qu'une fois, pour tous les canaux.
6. **Sujets à faible niveau de preuve** (posturologie, réflexologie) : seulement après validation déontologique écrite, activés
   sujet par sujet (`autoriserFaiblePreuve`).
