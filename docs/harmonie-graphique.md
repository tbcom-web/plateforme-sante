# Harmonie graphique : du hasard, à travers des règles

Demande de Paul (2026-10-07) : « Avoir des règles (garde-fous) sur les styles qui vont bien ensemble : même en cliquant sur
“au hasard”, on doit arriver à une cohésion graphique grâce à des règles qui lient les polices, la taille, les éléments et la
structure de manière harmonieuse. On fait du hasard, mais à travers des règles de design graphique établies. »

Moteur : `packages/core/src/harmonie.ts` (pur, testé : `harmonie.test.ts`). Studio : `IndicateurHarmonie.tsx`.

## 1. Familles de style

Chaque famille a un **profil** sur six attributs (−1 à 1) : contraste (c), rondeur (r), densité (d), énergie / mouvement (e),
température (t), formalité (f).

| Famille | c | r | d | e | t | f | En deux mots |
|---|---|---|---|---|---|---|---|
| Éditorial chic | 0,9 | −0,4 | −0,9 | −0,2 | 0,1 | 1 | Serifs de revue, titres fins, beaucoup d’air, filets, coins nets, aucune ombre |
| Technique net | 0,7 | −0,9 | 0,6 | 0,3 | −0,7 | 0,4 | Grotesques et mono, relevé de pression, grille fine, coins carrés, compact |
| Doux et rond | −0,4 | 1 | 0 | −0,1 | 0,4 | −0,6 | Polices rondes, coins très arrondis, ombres douces, ondulations |
| Graphique pop | 0,9 | 0,3 | 0,2 | 1 | 0,4 | −0,8 | Géométriques franches, gammes vitaminées, surligneur, ombres portées |
| Classique sobre | 0,2 | 0 | 0 | −0,5 | 0,1 | 0,6 | Lisible avant tout, coins arrondis, ombres douces, aucun effet |
| Nature chaleureuse | 0 | 0,5 | −0,2 | −0,2 | 1 | 0 | Serifs humanistes, terres et sauges, photos chaudes, formes organiques |
| Minimal clinique | 0,2 | −0,3 | −0,6 | −0,9 | −0,5 | 0,5 | Une sans-serif neutre, beaucoup de blanc, gris-bleus, aucun ornement |
| Magazine affirmé | 1 | −0,6 | 0,4 | 0,6 | 0,2 | 0,3 | Titres d’affiche ou condensés, double filet, grain, cadres décalés |

Pondération par sujet n° 1 (le n° 2 nuance à 30 %) — `FAMILLES_PAR_SUJET` : sport → Technique net, Graphique pop (puis Magazine) ;
diabète → Classique sobre, Minimal clinique, Doux et rond ; enfant → Doux et rond, Nature chaleureuse ; senior → Classique sobre ;
ongles → Éditorial chic ; semelles → Technique net ; pédicurie → Classique sobre, Éditorial, Nature, Minimal.

## 2. Étiquetage des ingrédients

Table `ETIQUETTES_HARMONIE`, clé `<dimension>:<valeur>`. Dimensions : `police`, `structure`, `style`, `experimental`, `gamme`,
`effets`, `traitement`, `typo.<axe>` (echelle, casse, graisse, interlettrage, accent, alignement, surtitre), `details.jeu`,
`details.<élément>` (coins, ombres, separateur, souligne, fond, boutons, densite, cadre, citation, badge), `menu.<axe>`
(ordinateur, mobile, rdv), `v.<section>` (v.accueil = premier écran, v.transition, v.sections = transitions entre sections,
v.soins-forme = forme des cartes, v.sujets, v.soins…).

Une étiquette : `{ nom, p: profil partiel, pref?: familles où il est préféré, jamais?: familles où il est exclu, fort?: force
expressive 0-1 (≥ 0,8 = élément FORT), genre?/affichage?/fantaisie?/elegante? (polices), rayon?: 0 carré | 1 arrondi | 2 très arrondi }`.

Compatibilité avec une famille : `jamais` → exclu ; `pref` → préféré ; sinon distance moyenne du profil à celui de la famille
≤ 0,75 → admis, au-delà exclu. **Un ingrédient non étiqueté est neutre** (admis partout, aucune règle) : rien ne casse quand un
ingrédient arrive, mais le test `harmonie.test.ts` exige l’étiquette des polices, gammes, effets, formes, premiers écrans et
transitions.

Tous les ingrédients existants sont étiquetés : 23 paires de polices, 4 structures, 4 styles + 4 registres expérimentaux,
17 gammes (couleur libre : température calculée depuis la teinte), 4 effets, 6 traitements photo, 9 formes de cartes, 15 premiers
écrans, 6 transitions de diaporama, 5 transitions entre sections, 7 jeux de détails et leurs 10 éléments, les 7 axes
typographiques, les 3 axes de menu, et les présentations de pages les plus marquées (les autres sont neutres).

<!--
FORMAT ATTENDU POUR LE CHANTIER TYPOGRAPHIE / DÉTAILS / MENUS (autre agent, 2026-10-07)
typo.ts, details.ts, menus.ts et habillage.ts n'étaient pas encore poussés au moment de l'étiquetage : les valeurs ont été lues
dans l'arbre de travail et étiquetées dans ETIQUETTES_HARMONIE (harmonie.ts), sans import de ces modules (le moteur compile avec
ou sans eux). À chaque nouvelle valeur (police, échelle, casse, graisse, jeu ou élément de détails, menu), ajouter UNE ligne :
  '<dimension>:<valeur>': E('<Nom lisible>', { c?, r?, d?, e?, t?, f? }, { pref?: [familles], jamais?: [familles], fort?, rayon?,
                                                                             genre?, affichage?, fantaisie?, elegante? }),
  ex. 'typo.echelle:geante': E('Échelle géante', { c: 1, e: 0.8, d: -0.6 }, { pref: [F.ma], jamais: [F.mi, F.cl], fort: 1 }),
      'police:nouvelle': E('Nom de la paire', { ... }, { genre: 'grotesque', affichage: true }),
Sans ligne, la valeur est NEUTRE (admise partout). Un nouveau jeu de détails : ajouter aussi ses valeurs à JEUX_DETAILS_H
(copie alignée sur JEUX_DETAILS de details.ts ; à remplacer par un import quand details.ts sera poussé).
TODO (quand details.ts sera poussé) : importer JEUX_DETAILS au lieu de la copie JEUX_DETAILS_H et ajouter un test d'alignement.
-->

## 3. Règles

### Dures (jamais) — `violationsDures`

1. **Échelle spectaculaire** seulement avec une police d’affichage ou condensée (`echelle-affichage`) et une respiration aérée
   (`echelle-respiration` : jamais avec la densité compacte).
2. **MAJUSCULES espacées** jamais sur une police ronde ou fantaisie (Ronde pédagogique, Ronde et douce, Serif ronde :
   `majuscules-ronde`), jamais en échelle spectaculaire (titres longs, « Pédicurie-podologie… » : `majuscules-longues`), jamais
   serrées (`majuscules-serrees`).
3. **Ombre portée décalée « pop »** jamais avec une police élégante (Revue, Serif fine, Garamond de luxe, Didone, Gazette) ni la
   structure Élégant et sobre (`ombre-pop-elegant`) ; exclue des familles Éditorial chic, Classique, Minimal, Nature.
4. **Rondeurs et « blobs »** (coins très arrondis, bulles, pastilles, formes organiques, fond de formes floues, ondulations,
   vagues, dégradé maillé, boutons pilule, premiers écrans organiques) jamais avec la structure Technique et précis ni la police
   mono (`rond-technique`).
5. **Registres expérimentaux** : géométrique ↔ grotesques, géométriques ou condensées ; risographie ↔ slab, mono ou grotesque
   (prêt pour le jour où `visuels.experimental` sera branché).
6. **Effets « Vivant »** jamais pour le diabète ni le senior (`vivant-sujet`).
7. **Deux familles de polices au plus** : seulement les paires du catalogue (la mono des données du registre relevé est la
   signature de la marque, comptée à part).
8. **Un seul élément expressif FORT par écran** (`expressif`) : titre spectaculaire OU fond motif (trame, formes) OU premier écran
   typographique / maillé / diaporama / photo plein écran / oblique / organique…
9. **Contrastes AA** : accent ≥ 4,5:1 sur le fond (`contraste-aa`), en plus des contrôles du core.
10. **Cohérence des coins** (`coins-coherents`) : jamais d’angles carrés (coins carrés, gros carrés, étiquettes carrées) avec des
    éléments très arrondis (bulles, pilules, cadres organiques, menus en pastilles, surtitres en pastille) : même rayon partout.

Chaque violation propose des corrections ; `reparerHarmonie` les applique sur les dimensions non verrouillées (dernier recours :
valeur neutre), `corrigerHarmonie` sur une seule (bouton « Corriger »). Les verrous ne sont jamais levés : une violation entre
deux éléments verrouillés reste affichée.

### Souples (scores 0-1) — `scoreHarmonie`

- **Cohérence avec la famille dominante** (poids 4) : préféré 1, admis 0,65, exclu 0 ; police, jeu de détails, structure, premier
  écran, effets, style et gamme comptent double.
- **Températures** (1,2) : gamme ↔ traitement photo (style Photos) ou style d’illustration.
- **Rondeur** (1,5) : police ↔ coins, forme des cartes, boutons, cadres.
- **Densité** (1) : respiration ↔ structure et présentation des sujets et des soins.
- **Structure × style** (1,5) : a priori tirés des 132 notes de l’atelier (Technique + relevé 4,1 ★, Élégant + trait fin 4,0 ★ ;
  photos sur Clair ou Technique 2,7-2,8 ★ ; Élégant + relevé 2,5 ★).
- **Expressivité** (1) : un peu de caractère, jamais trop (somme des forces).

Score = 100 × moyenne pondérée, ± 5 points d’apprentissage ; **une violation dure plafonne à 45** (−8 par violation en plus).
Conseils lisibles avec correction (« La police “Ronde pédagogique” est ronde mais les angles sont carrés : essayer “Coins
arrondis” »), ingrédients hors de la famille dominante (« “Ombre portée” sort de la famille Éditorial chic : essayer “Sans
ombre” »).

## 4. Tirage harmonieux

- **« Tout changer »** (`toutChanger`, recettes.ts → `toutChangerHarmonieux`) : choisit d’abord une famille (sujet n° 1, notes
  apprises, et seulement parmi les familles compatibles avec ce qui est verrouillé : une police éditoriale verrouillée exclut
  Graphique pop et Doux et rond), puis tirage brut (garde-fous du core, notes de Paul) projeté sur la famille (structure et style
  d’abord ; préférées ×4, admises ×1, exclues jamais ; éléments d’un jeu de détails gardés), réparation des règles dures, puis
  accords souples (`ameliorer` : corrections des conseils gardées si le score monte). Quatre essais au plus, le meilleur gardé.
- **Un dé** (`tirerDimension`, `tirerPage`) : famille dominante calculée SANS la dimension du dé ; seules des valeurs compatibles
  avec le reste et sans nouvelle violation sont proposées ; le reste ne bouge pas.
- **`tirerDansFamille(famille, x, verrous, contexte, graine, outils)`** : tirage dans une famille donnée.
- **« Hors règles (explorer) »** : case du studio, désactivée par défaut (`ContexteRecette.horsRegles`) : tirage brut. Les
  garde-fous du core (AA, diabète sans rouge, posture jamais, structures et styles permis) restent TOUJOURS actifs : ils sont
  fournis au moteur par `outilsHarmonie(contexte)` (recettes.ts).
- Déterministe : même composition, mêmes verrous, même graine → même résultat.

## 5. Apprentissage

- `apprendreHarmonie(notes)` : chaque note de recette (1-5) renforce ou affaiblit la famille dominante de sa composition et ses
  ingrédients étiquetés : effet = Σ (note − 3) / (n + 6), plafonné à ±0,75 ★. Le studio le calcule depuis les recettes notées.
- Sans `poidsHarmonie`, les poids de famille sont dérivés des effets de l’atelier (`poids.effets` : notes de l’atelier et
  renforts des recettes) : moyenne lissée des effets des ingrédients préférés de chaque famille.
- Effets : choix de la famille (masse 2^(2 × effet)), valeurs tirées, ±5 points de score. **Jamais les règles dures.**

## 6. Intégration

- **Studio** (`/admin/atelier/studio`) : `IndicateurHarmonie.tsx` sous la barre des dés — « Harmonie : 87/100 — Éditorial chic »,
  familles proches, règles enfreintes et conseils avec « Corriger », case « Hors règles (explorer) ». Les dés passent par
  `tirerDimension` / `tirerPage` / `toutChanger` : harmonieux par défaut.
- **Générateur des praticiens** (`propositions.ts`) : la pertinence d’une proposition reçoit `harmonieCombinaison(structure, style,
  gamme)` (±1 point environ) ; les recettes du parcours `/creer` passent par les mêmes tirages.
- **Directeur artistique** (`.claude/agents/directeur-artistique.md`) : avant de garder un essai, appeler
  `scoreHarmonie(composition, { sujets })` ; **aucune recette proposée avec une violation dure** ; noter le score et la famille
  dans `retours/recettes-proposees.json` (raisons « pourquoi c’est harmonieux » = composantes et famille).

## 7. Mesures (2026-10-07)

- 1 000 tirages par famille (`tirerDansFamille`) : **0 violation dure**, famille demandée dominante dans 88 à 100 % des cas.
- « Tout changer » sur sport, diabète, enfant, senior (250 tirages chacun) : 0 violation, au moins 3 familles par sujet, jamais
  « Vivant » pour diabète ou senior ; score moyen 82-84.
- Tirage brut (« Hors règles ») : 75 % des tirages enfreignent au moins une règle (rondeurs sur Technique, coins incohérents,
  plusieurs éléments forts, échelle spectaculaire en police de texte…).
- Combinaisons de l’atelier notées ≥ 4 ★ par Paul : score nettement supérieur à celles notées ≤ 2 ★ (test).
- Planche : 16 tirages « Tout changer » (4 sujets × 4) avec leur score et leur famille (scratchpad de la session).
