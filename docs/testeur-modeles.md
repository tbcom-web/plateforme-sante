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

## Jeux de données (fictifs : `apps/sites/src/data/sites/demo-podologue-lyon.ts`)

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
| Chevauchements | blocs de texte / interactifs (hors parents, `<details>` fermés exclus) | recouvrement ≥ 25 % de la plus petite boîte : majeur |
| Contrastes AA réels | pixels de la capture sous chaque texte (fond dominant, 10e centile si fond varié), alpha et opacité compris | ≥ 4,5:1 (grand texte ≥ 3:1) ; < 3:1 bloquant |
| Cibles tactiles (360, 375) | boîte des liens / boutons (liens en ligne d'un paragraphe exemptés) | ≥ 44 px ; < 24 px majeur, sinon mineur |
| Liens et ancres | tous les `<a href>` internes, statique sur `dist` | page absente : bloquant ; ancre absente : majeur |
| Menu mobile (360, 375) | ouvrir, focus dans le menu, Échap, retour du focus | ne s'ouvre pas : bloquant ; reste majeur / mineur |
| Barre d'actions (375) | appel `tel:`, itinéraire, RDV, ≥ 44 px, ne masque pas le pied de page | majeur |
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
| Animations | sans mouvement réduit : animations repérées ; avec : aucune ne tourne, chaque élément animé reste visible (image fixe), capture `accueil--image-fixe.png` | majeur |
| Tiers | toute requête hors du site | majeur |

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
| saine v1 | **orange** | 4,2 min | 0 bloquant, 4 majeurs, 37 mineurs : 4 défauts de la PLATEFORME, pas du modèle (logo : nom accessible ≠ texte visible, axe « label-content-name-mismatch » ; barre mobile du gabarit sans « Itinéraire » ; photo d'article de démo `sport-foulee-herbe` notée ≤ 2 ★ ; 1 écart de `controle:charte` en cours chez un autre chantier) |
| cassée v1 | **rouge** | 4,4 min | 60 bloquants : contraste 1,15:1 (couleur claire), débordement à 1024 px (nom « Delacroix-Montgolfier-Saint-Exupéry-Vandenbroucke »), photo refusée `soins-pied-tenu` (composition et rendu), lien mort `/tarifs-detailles` ; majeur : ancre `#horaires-inexistants` |
| re-check (saine comme v2 de la cassée) | orange | 4,7 min | 63 corrigés (dont 56 avec vignettes avant / après), 40 toujours ouverts, 1 nouveau |

Limite connue : la vignette « après » reprend les MÊMES coordonnées ; si la mise en page a bougé entre les versions, la zone peut
être décalée (la vignette « avant » reste juste).
