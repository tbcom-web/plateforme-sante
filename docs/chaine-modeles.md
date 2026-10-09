# Chaîne de production des modèles (/chaine)

Décision de Paul du 2026-10-09 : une chaîne unique, avec le **minimum d'humain** — « limiter au max l'humain, juste pour donner
son goût / avis sur les modèles créés ». N'importe qui chez TBCOM contribue (goût), Paul valide à la fin. Un agent de test
automatique vérifie chaque version avant et après les retouches.

Code : `packages/core/src/chaine-modeles.ts` (moteur, pur), `packages/core/src/chaine-modeles-format.ts` (format commun des
tickets et des résultats du testeur : `TicketModele`, `ResultatTestModele`), `apps/admin/src/lib/chaine-modeles.ts` (lecture,
automate côté serveur), `apps/admin/src/app/chaine/` (pages), migration `supabase/migrations/0050_chaine_modeles.sql`,
export `scripts/exporter-retours.mjs`. Tests : `packages/core/src/chaine-modeles.test.ts`.

## Étapes (statuts de la fiche modèle versionnée)

| # | Statut | Qui a la main | Ce qui se passe | « Fini » quand |
|---|---|---|---|---|
| 0 | Ingrédients | humain (Arrivages) | Rien de nouveau : lien et compteur des Arrivages sur le tableau | — |
| 1 | `candidat` (présélection) | humain | Pages de 6 sites complets du même profil, générés automatiquement (grilles « Directions » : favoris 4-5 ★, harmonie, diversité garantie entre les 6). On touche ceux qui plaisent (multi-sélection, défilement infini, mobile d'abord) → candidats ; chaque page gardée verse des points dans le journal de la Dégustation | Objectif ≈ 50 candidats par profil (compteur) ; le tournoi s'ouvre dès 20 |
| 2 | `candidat` (tournoi) | humain | Duels A/B, appariement suisse automatique, multi-votants | Classement stable (voir « Arrêt du tournoi ») : les 10 premiers deviennent `finaliste`, les autres `ecarte` |
| — | `finaliste` | automatique | File d'attente : 10 modèles au plus dans la boucle de révision, meilleur rang d'abord | Une place se libère |
| 3 | `check-agent` | agent | Le testeur automatique (et la vérification visuelle de Claude) passe la version : verdict, contrôles, tickets techniques créés seuls, corrections techniques automatiques si possible | Un résultat de test existe pour la version courante |
| 4 | `avis-humain` | humain | Page par page (accueil, page sujet, fiche soin, cabinet, contact et accès, article, FAQ, liste des soins) × ordinateur ET téléphone, uniforme pour tous les modèles : entourer une zone ou toucher un élément + étiquette + commentaire → ticket ; 🔒 verrouiller ce qui plaît, 🎲 relancer le reste ou une dimension ; « Rien à signaler sur cette page » | Les 16 cellules ont un avis (ticket ou « Rien à signaler ») → `retouche` s'il reste un ticket ouvert, sinon `pret-validation` si le testeur est au vert |
| 5 | `retouche` | Claude | Tickets ouverts exportés en priorité (`retours/tickets-modeles.json` + section de `SYNTHESE.md`). Claude écrit la correction dans `retours/retouches-modeles.json` ; la chaîne crée la NOUVELLE VERSION avec le journal « corrigé : ticket #12 — zone (10 %, 40 %) page Contact et accès (mobile) » | Une version plus récente que celle de la demande de retouche existe |
| 6 | `recheck-agent` | agent | Nouveau passage du testeur sur la nouvelle version ; les tickets techniques dont le contrôle repasse au vert se ferment seuls | Résultat de test de la nouvelle version : correction de goût → `revalidation` ; purement technique et vert → `pret-validation` sans humain ; encore des tickets → `retouche` |
| 7 | `revalidation` | humain | Seulement ce qui a changé, avant / après ; « Tout revalider » en 1 clic, ou cocher « Pas encore corrigé » pour rouvrir un ticket | Revalidée (1 clic) et testeur au vert → `pret-validation` ; ticket rouvert → `retouche` |
| 8 | `pret-validation` → `publie` | Paul | Verrous automatiques au vert, tags pré-remplis vérifiés, « Publier pour les praticiens » (publication par profil existante : recette créée ou mise à jour + `recettes_publications`) | Publié. Ensuite, signaler une zone rouvre une retouche SANS dépublier : la nouvelle version n'est publiée qu'après revalidation et nouvelle validation de Paul |

Le testeur n'intervient **pas** avant la présélection ni pendant le tournoi : la génération garde seulement son filtre léger
(`filtreLeger` : règles dures d'harmonie, éléments exclus ≤ 2 ★ ou retirés, composition déjà vue, rendu identique à l'œil
d'après l'empreinte du rendu comme la Dégustation).

Une relance 🎲 gardée pendant l'avis crée une nouvelle version : les avis déjà donnés valent pour les pages que la relance n'a
pas changées (`pagesChangees`) ; le testeur repasse sur la nouvelle version.

## Arrêt du tournoi (critère documenté)

Classement Bradley-Terry agrégé de tous les votants (`ajusterBT` des duels, a priori N(0, 1)), **vote du validateur ×2** (poids
posé par la base, déclencheur `modeles_votes_poids`). Appariement « suisse » (`prochainDuel`) : le candidat le moins joué (puis le
plus incertain) contre l'adversaire de niveau le plus proche, en préférant l'incertitude et en évitant les paires déjà jouées —
jamais deux fois la même paire pour un même votant tant qu'il en reste d'autres.

Arrêt automatique (`etatTournoi`) quand **(a)** chaque candidat a au moins 5 duels **et (b)** l'ensemble des 10 premiers est le
même (à un échange près à la frontière 10e / 11e) dans les classements recalculés tous les 10 votes sur les 30 derniers ; ou
**(c)** quand le budget de 10 votes × nombre de candidats est atteint. Les 10 premiers → `finaliste`, les autres → `ecarte`
(le validateur peut repêcher). Mesure (tests) : 24 candidats aux forces simulées, 200 votes : arrêt, les 5 vrais meilleurs
finalistes, aucun des 6 pires.

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

Une colonne par étape avec compteur et « qui a la main » (Humain, Agent, Claude, Paul), filtres profession / profil, colonne
Ingrédients (Arrivages). « Ce qui attend un humain » par personne (le validateur voit toute l'équipe) ; « Ce qui tourne tout
seul » (testeur attendu, retouches de Claude, file des finalistes).

## Routine de 15 min / jour

- **Contributeur (10 min)** : ouvrir `/chaine` → « Ce qui attend un humain » ; 2 ou 3 pages de présélection sur le profil le moins
  rempli ; 20 votes au tournoi ; un modèle en avis (les pages « à voir ») ; les revalidations en 1 clic.
- **Paul (5 min)** : les modèles « Prêt pour validation » : verrous, tags, Publier ; un coup d'œil aux tickets rouverts.

## Migration

`supabase/migrations/0050_chaine_modeles.sql`, rejouable, à exécuter après 0049 (non exécutée par les agents). Sans elle, `/chaine`
affiche « Migration 0050 à exécuter ».
