# Parcours client (onboarding) : `/essai/votre-site`

Demande de Paul (2026-10-08) : une landing qui demande au praticien sa profession, ses spécialités, ses sports, ses couleurs, préremplit le site avec l'Annuaire Santé et rend la sélection du style ludique ; puis « il y aura ensuite les ostéopathes, les kinés » (tout piloté par la profession) ; et un accès facile au parcours en test pour le super admin.

## Où il se branche

`/essai` (bouton « Créer mon site gratuit ») → `/essai/commencer` (session **anonyme** Supabase, inchangé) → **`/essai/votre-site`** (nouveau) → « Voir mon site » (porte de l'e-mail **existante**, capturer_prospect_essai) → rendu → « Continuer » → `/creer` (horaires, soins, accès, création de l'accès : inchangé). `/essai/commencer?suite=creer` garde l'ancien enchaînement direct vers `/creer`. Un site déjà commencé (proposition choisie) sans parcours en cours dans ce navigateur est renvoyé vers `/creer`.

Rien n'est publié : le site reste un brouillon d'essai, avec toutes les gardes existantes (docs/onboarding-lead.md).

## Étapes (≈ 3 minutes, mobile d'abord)

| Étape | Contenu |
| --- | --- |
| Votre profession | N° RPPS **facultatif** « pour préremplir » (masqué sans clé d'API) ; ou choix de la profession. Profession déduite du code TRE_G15 de la fiche. Profession pas encore ouverte : « Bientôt » + **liste d'attente** (prénom, nom, ville, e-mail, accord de recontact ; prospect « sans compte », source `liste-attente:<profession>` ; **aucun e-mail envoyé**). |
| Vos informations | Fiche reprise de l'annuaire **à vérifier** (mention de source et date), ou recherche nom + ville (« C'est moi »), ou saisie libre. Lieu d'exercice au choix (libéral d'abord). Diplôme d'État coché s'il est sur la fiche ; **DU proposé seulement s'il existe sur la fiche, jamais coché d'office**. Note « D'où viennent ces informations ? ». |
| Vos sujets | Sélecteur existant (3 principaux + secondaires). Un DU réel peut **pré-cocher** un thème (ex. Sport), annoncé et modifiable. |
| Vos activités | Seulement si un thème choisi s'y prête (`questionActivites`, pratiques.ts) : jusqu'à 3, ordonnées (↑ ↓). |
| Vos couleurs | Sélecteur existant (0 à 3, « Laissez-nous proposer »). |
| Choisissez votre style | De **vrais rendus de SON site** (nom, ville, couleurs, sujets) : « J'aime » / « Pas pour moi ». Téléphone : une carte à la fois ; ordinateur : grille de 4. Tour 2 et 3 (« Affiner encore ») : gardent ce qu'il aime, font varier le reste (`grilleDuTour`). « Voir mon site » dès un « J'aime ». |
| Voir mon site | Animation courte de construction (≈ 1,8 s, aucune avec « réduire les animations »), enregistrement du brouillon, porte de l'e-mail (flux existant), rendu plein écran ordinateur / téléphone, « Autre proposition » (suivante dans l'ordre des goûts, jamais une écartée), « Continuer : horaires, soins, accès ». |

En tête : « Votre site est prêt à N % » (`avancementOnboarding`, pondéré, jamais 100 % avant le rendu). L'aperçu **se construit en direct** dès la 2e étape (colonne de droite sur ordinateur, vignette repliable sur téléphone).

Propositions : recettes **publiées** pour les profils de pratique les plus proches (`recettesPourPraticien`, badge « Conçu pour … », migration 0043 ; vide sans elle), puis recettes bien notées du même scénario, puis le générateur (`lotsPropositions`). Le choix est appliqué par le même chemin que `/creer` (`choisirModele`).

## Corrections après le retour des personas (2026-10-09)

- **Une seule numérotation** de `/essai` à la fin de `/creer` : 10 étapes (`PARCOURS_COMPLET`, onboarding.ts) ; 1 à 6 pour voir son site (profession, informations, sujets, couleurs, style, rendu), 7 à 10 dans `/creer` (horaires, soins, textes, accès). Les activités sont un second écran de l'étape 3 (le compteur ne saute plus). Le pourcentage ne recule jamais (numéro maximal atteint gardé). Un site issu du parcours client (`choixClient`) reprend `/creer` à « Vos horaires » ; profession, informations, sujets, couleurs et style y sont marqués faits (`ProgressionGlobale`).
- `/essai` : « 3 minutes pour voir votre site », étapes réelles (1 à 6, 7 à 10, mise en ligne) ; le repère « 4 étapes » est retiré de `/essai` et `/essai/commencer`.
- Recherche sans résultat : « Aucune fiche à ce nom dans cette ville : remplissez les champs ci-dessous. » ; libellés distincts « Nom à chercher » / « Ville à chercher » et « Ville du cabinet ».
- « Les activités de vos patients » : seulement si un thème qui s'y prête vraiment est choisi (`themesActivites`, Sport pour la podologie).
- « Choisissez votre style » : « Proposition A, B, C, D » et une description en clair (« Sobre, bleu et beige, dessins au trait ») ; aucun nom interne ; « Dernier tour » quand il n'y en aura plus ; boutons J'aime / Pas pour moi collés en bas de l'écran sur téléphone ; fond « Préparation de l'aperçu… » au lieu d'un cadre vide.
- Couleurs choisies respectées (`gammesDesCouleurs`) ; une variante proche n'est ajoutée que s'il en manque, avec la phrase « Couleurs proches des vôtres, un peu ajustées pour rester lisibles. »
- Noms et villes composés insécables dans les aperçus (`apercuInsecable`, trait d'union U+2011 à l'affichage seulement ; les sites publiés le font déjà au build, `insecablesHtml`, contrôlé par `controle:debordement`).
- Diplôme d'État coché d'office (profession réglementée, décochable) ; DU de l'annuaire dans un encadré avec la case « Afficher ce DU sur mon site » (jamais cochée d'office).
- Porte de l'e-mail : « (obligatoire pour voir le rendu) » ; conseils facultatifs.
- Sujets : chaque sujet une seule fois à l'écran (`ChoixSujets compact`), « traités aussi » repliés ; « Passer cette étape » et « Continuer sans couleur » en boutons secondaires ; un seul « Laissez-nous proposer » ; RPPS saisi avec espaces normalisé.

## Piloté par la profession

- `packages/core/src/onboarding-professions.ts` : disponibilité, codes TRE_G15, codes et intitulé du diplôme d'État, « angles » tirés d'un DU. Aucun texte de métier dans les écrans.
- `packages/core/src/pratiques.ts` (agent « Profils de pratique ») : thèmes, activités, profils de référence de chaque métier.
- Ouvrir un métier = sa pratique + son entrée `disponible: true` (+ catalogue de soins, textes relus). Testé avec un métier fictif (`onboarding.test.ts`).
- Limite connue : le sélecteur de sujets (`ChoixSujets`) lit encore les thèmes de podologie (`themes.ts`) ; à brancher sur `pratiqueDe(profession).themes` à l'ouverture d'un 2e métier.

## Préférences du client (pas le goût de Paul)

Les avis (« J'aime » / « Pas pour moi », tour), la proposition retenue, les activités et les couleurs sont enregistrés **dans le brouillon du site de ce praticien** : `sites.config.choixClient` (`ChoixClient`, `normaliserChoixClient` relu côté serveur dans `nettoyer`). Jamais dans l'atelier, les duels ni les notes de Paul. Aucune migration. Lecture : **`/admin/choix-clients`** (synthèse par proposition : retenue, aimée, écartée ; sites de test exclus).

## Mode client test (super admin)

- Bouton **« Tester le parcours client »** dans l'en-tête du super admin et bloc sur le tableau de bord : personas en un clic (Vierge ; Sport · basket ; Diabète senior ; Enfant), « Aller à « Choisissez votre style » », « Effacer mes sessions test », « Voir les choix des clients ».
- `/admin/tester-parcours` (route) : `exigerAdmin`, pose le cookie httpOnly `parcours-client-test` (4 h) puis ouvre `/essai/votre-site?test=1&persona=…[&etape=…]` dans un nouvel onglet. `estModeTest()` (lib/mode-test.ts) exige **le cookie ET le rôle admin** à chaque lecture.
- En mode test, **rien n'est écrit** : pas de session anonyme, pas de site, pas de prospect (la porte de l'e-mail ne fait que vérifier le format), pas d'e-mail, pas de préférence client, pas de publication ; l'annuaire répond avec les **fiches de démonstration** (fictives : « Camille Exemple », « Dominique Modele », « Alexandra Fictive », téléphones 01 99 00…). Bandeau « Mode test : rien n'est envoyé ni publié », persona, saut d'étape, « Recommencer », « Retour à l'admin ». L'état ne vit que dans le navigateur (`localStorage` « onboarding-test:v1 »).
- **« Voir comme ce praticien »** (tableau de bord praticien en lecture seule depuis la fiche admin) : **pas fait**. Le tableau de bord lit tout par `auth.uid()` (RLS, `mon_essai()`) : le reproduire pour un autre compte demande soit une version « admin » de chaque requête, soit la clé service_role. À cadrer à part ; en attendant, « Parcours » / « Formulaire » de la liste des sites ouvrent le site du client (`/creer?site=…`).

## Fichiers

- Core : `onboarding.ts`, `onboarding-professions.ts`, `annuaire-sante.ts` (+ tests), champ `choixClient` de `draft.ts`.
- Admin : `app/essai/votre-site/` (page, Onboarding, ChoixStyle, actions, personas), `lib/annuaire-sante.ts`, `lib/mode-test.ts`, `app/admin/tester-parcours/route.ts`, `app/admin/choix-clients/page.tsx`, `components/BoutonParcoursTest.tsx`.
- Documentation de l'annuaire : `docs/rpps-annuaire.md`.
