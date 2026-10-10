# Prospection RPPS

Outil de la commerciale : **/admin/prospection** (menu Clients → Prospection). Il liste les praticiens du RPPS, du plus récemment installé au plus ancien. Pédicures-podologues d'abord.

## D'où viennent les données

| Source | Ce qu'on en tire | Fréquence |
|---|---|---|
| Extraction publique **PS_LibreAcces** de l'Annuaire Santé (ANS, Licence Ouverte v2.0), fichier `Personne_activite` | identité d'exercice, profession, mode d'exercice, cabinet (raison sociale, SIRET), adresse, téléphone, e-mail de la structure | chaque nuit |
| **API Recherche d'entreprises** (recherche-entreprises.api.gouv.fr, gratuite, sans clé) | date de création de l'établissement (SIRET), fermeture, coordonnées GPS | chaque nuit, seulement pour les nouvelles fiches et celles pas encore datées |

L'extraction ne contient **aucune date d'installation**. Trois signaux la remplacent :

- **SIRET créé** : date de création, à l'INSEE, de l'établissement déclaré au RPPS. Un nouveau cabinet ou un transfert crée un établissement. C'est le signal le plus fiable.
- **Nouveau au RPPS** : la situation d'exercice apparaît dans l'extraction quotidienne. Ce signal ne fonctionne qu'à partir du premier import : l'import initial ne marque personne comme nouveau. Il couvre les cas où aucun SIRET n'est créé (arrivée dans un cabinet de groupe, remplaçant qui s'installe, nouveau diplômé).
- **Trouvé par nom** : faute de SIRET au RPPS, l'établissement est cherché par nom, code postal et code NAF (86.90E pour les podologues). Il n'est gardé que si le nom correspond. Ce signal est à confirmer au téléphone.

- **Situation modifiée au RPPS** (migration 0056, clé API ANS) : date de la dernière modification d'une situation d'exercice dans l'API FHIR de l'ANS (`meta.lastUpdated` des `PractitionerRole`), relevée chaque nuit pour toute la profession (`Practitioner?qualification-code=…|80&_revinclude=PractitionerRole:practitioner`, environ 150 pages). Il s'agit d'un changement de lieu, de rôle (collaborateur devenu titulaire), mais parfois d'une simple correction : à vérifier. Seul signal pour les entreprises individuelles non diffusibles à l'INSEE. Les jours de mise à jour en masse (plus de 10 % des praticiens le même jour) sont écartés.

La date du signal le plus récent est affichée sur la fiche. Le filtre « Installation » (3, 6, 12 ou 24 mois) garde une fiche dès qu'un de ses signaux tombe dans la période.

## Règles

- **Adresses MSSanté jamais importées.** Cette messagerie est réservée aux échanges de santé, pas à la prospection.
- **Mention de la source** affichée sur la page, comme l'exigent les CGU de l'ANS : « Données issues du RPPS (Annuaire Santé, ANS), mise à jour du … ».
- **Prospection B2B par téléphone ou courrier** : le praticien peut s'y opposer. Mettre alors son statut à « Pas intéressé » (ou « Hors cible ») et ne plus le relancer. Pour un e-mail, se limiter à l'adresse professionnelle publique et proposer la désinscription.
- **Journaux du workflow** : le dépôt est public, donc les journaux aussi. Le script n'y écrit que des comptes, jamais de nom ni de RPPS.

## Mise en route (Paul)

1. Supabase → SQL Editor : exécuter `supabase/migrations/0055_prospection_rpps.sql`.
2. GitHub → Actions → **synchro-rpps** → Run workflow. Le premier passage dure environ une heure (environ 15 000 vérifications SIRET). Ensuite, le workflow tourne chaque nuit à 5 h 43 (UTC). Il utilise les secrets existants `SUPABASE_URL` et `SUPABASE_SECRET_KEY`.
3. Clé API ANS (portail Gravitee portal.api.esante.gouv.fr, abonnement « API Annuaire Santé en libre accès ») : secret GitHub `ANNUAIRE_SANTE_API_KEY` (ou `ESANTE_API_KEY`), puis exécuter `supabase/migrations/0056_prospection_ans.sql`. Sans clé, l'étape est sautée.
4. Donner l'accès à la commerciale : la page est réservée aux comptes admin, comme /admin/leads.

Autres professions : lancer le workflow à la main avec `professions` = `80,70`, par exemple (codes TRE_G15 : 60 infirmier, 70 masseur-kinésithérapeute, 80 pédicure-podologue). Pour les garder chaque nuit, changer la valeur par défaut dans `.github/workflows/synchro-rpps.yml`.

## Technique

- `scripts/synchro-rpps.mjs` : lecture en flux de la copie data.gouv.fr du fichier `ps-libreacces-personne-activite.txt` (environ 830 Mo, une minute ; déposée chaque jour par l'ANS). En secours, le zip de l'ANS (environ 230 Mo) est lu sans dépendance. Ensuite : repérage des colonnes par leur nom, écriture par lots dans `prospection_praticiens` (clé `RPPS|SIRET`, ou identifiant de structure, ou adresse), puis datation par l'API Entreprises à environ 6 appels par seconde.
  - Essai local sans écriture : `NODE_EXTRA_CA_CERTS=scripts/certificats/igc-sante-racine.pem node scripts/synchro-rpps.mjs --essai`.
- **Certificat** : `service.annuaire.sante.fr` présente l'autorité racine **IGC-Santé** de l'ANS, absente des magasins usuels.
  - La racine est dans `scripts/certificats/igc-sante-racine.pem` (AC RACINE IGC-SANTE ELEMENTAIRE, valable jusqu'en 2033, SHA-256 `2D:9E:22:CA:…:96:7F`) et passée par `NODE_EXTRA_CA_CERTS`. La vérification TLS reste active.
- **Limite de débit** : le serveur de l'ANS répond 429 aux téléchargements rapprochés, d'où la source data.gouv.fr en premier. Pour le zip de secours, le script réessaie après 1, 2, 4 puis 8 minutes.
- Mesures du 2026-10-09 : 15 059 podologues (18 073 situations d'exercice, dont 17 539 libérales) ; parmi les libérales, 8 213 avec téléphone, 4 897 avec e-mail, **837 seulement avec un SIRET**. La recherche par nom date environ 60 % des autres (25 sur un échantillon de 40).
- Tables : `prospection_praticiens` (écrite par le script seulement), `prospection_suivi` (statut, note, relance par RPPS, auteur et date posés par la base), `prospection_synchros` (journal). La vue `prospection_liste` réunit les deux premières. Les règles RLS réservent tout à l'admin.
- Code pur et tests : `packages/core/src/prospection.ts`. Lecture : `apps/admin/src/lib/prospection.ts`. Page et export CSV : `apps/admin/src/app/admin/prospection/`.

## Scores, cabinets et actualités (0057, 0058)

- **Score d'installation (0-100 %)** : confiance qu'une situation d'exercice correspond à une installation récente à une nouvelle adresse. Somme de signaux pondérés par leur ancienneté (3 mois : plein ; 6 mois : 85 % ; 1 an : 65 % ; 2 ans : 35 %) : nouvelle situation au RPPS (45), SIRET créé (40, ou 25 trouvé par nom), reprise du cabinet (35), modification ANS (15), adresse nouvelle (10), départ d'un autre lieu (10), numéro RPPS parmi les 5 % les plus récents (10), titulaire (5).
- **Score de prospection (0-100)** : 55 % du score d'installation + rôle (titulaire 15, associé 10, collaborateur 3) + vie du cabinet pour les décideurs (arrivée d'un collaborateur 10, départ d'un confrère 6) + téléphone 8 + e-mail 4 + spécialités (4 chacune, 2 au plus) + cabinet individuel 5. Nul si le praticien n'exerce plus là ou pas en libéral. Le détail est affiché (« Pourquoi ? »). Calcul : `packages/core/src/prospection-score.ts`.
- **Praticien et cabinet** : le cabinet est la structure RPPS (`structure_cle` : identifiant technique de la structure, sinon SIRET, sinon adresse). Onglet **Cabinets** : une ligne par cabinet libéral, triée par le meilleur score de ses décideurs (titulaires, associés). **Fiche cabinet** : décideurs à contacter d'abord, collaborateurs, anciens membres, actualités.
- **Actualités** (`prospection_evenements`) : chaque nuit, comparaison avec la veille (`packages/core/src/prospection-evenements.ts`) : nouveau cabinet, arrivée dans un cabinet existant, départ, cabinet vidé, changement de rôle (collaborateur devenu titulaire = reprise), déménagement. Rien avant le premier import (2026-10-09) ; la première nuit après 0057 ne produit pas d'actualités (structures pas encore connues la veille).
- **Diplômes et spécialités** : fichier `Dipl_AutExerc` (DU, DIU, autorisations, diplômes européens ; jamais le DE de la profession). Spécialités repérées : sport, pied diabétique, posturologie, ostéopathie, orthèses, enfant, gériatrie.
- **Autres professions à l'adresse** : comptées sur toute l'extraction (kinés, sages-femmes, médecins…) : maisons de santé et cabinets mixtes.

## Pistes

- Repérer aussi les établissements NAF 86.90E créés récemment qui ne sont pas encore au RPPS : ce sont les installations les plus fraîches.
- Détecter si le praticien a déjà un site, puis afficher une carte pour organiser des tournées.
- Passer à l'API FHIR (clé `ANNUAIRE_SANTE_API_KEY`, déjà prévue pour l'onboarding) pour rafraîchir une fiche à la demande.
