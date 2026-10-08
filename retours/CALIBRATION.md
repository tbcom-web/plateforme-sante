# Calibration du juge (le goût de Paul)

Le juge (`.claude/agents/juge-gout-paul.md`, profil `docs/gout-paul.md`) prédit la note de Paul avant qu'il la donne
(`retours/predictions.json`). Objectif avant toute autonomie : **au moins 8 notes sur 10 justes à ±1 point**, et un accord
sur les éliminatoires. Paul garde toujours le statut « Validé », l'anatomie et les mises en ligne.

La section « Mesure automatique » est recalculée à chaque export (`scripts/exporter-retours.mjs`) : prédictions comparées aux
notes de Paul sur le **même élément** (même clé, même empreinte). Le reste de ce fichier est tenu à la main.

## Historique par version du profil

| Date | Profil | Échantillon | Exactes | À ±1 | Écart moyen | Corrélation | Éliminatoires (accord) | Remarque |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 2026-10-07 | 2026-10-07.v0 | 40 (aveugle) | 17 (43 %) | 38 (95 %) | 0,63 | 0,64 | 36/40 | Première mesure ; biais −0,13 (le juge sous-note). Repère « toujours 4 ★ » : 15 exactes, 35 à ±1, écart 0,80. |
| 2026-10-07 | 2026-10-07.v1 | 66 (non vues) | 22 (33 %) | 54 (82 %) | 0,91 | 0,57 | 50/66 | Notes de l'export de 12 h 44 (photos, icônes, retouches), jamais lues avant les prédictions. Hors photos : 14/39 exactes, 34/39 à ±1 (87 %). Photos sur-notées (+0,85), matériel retouché sous-noté (−1,1). |
| 2026-10-07 | 2026-10-07.v2 | — | — | — | — | — | — | Ajustement après la mesure de v1 (photos 1 ★ par défaut, retouche qui corrige la remarque → 5 ★, icônes épaisses 2 ★) ; à mesurer sur les prochaines notes. |

## 2026-10-07 — première mesure en aveugle (profil v0)

**Méthode.** 76 éléments notés par Paul (export du 2026-10-07). Tirage stratifié par type et par note (graine fixe) de 40 clés
**tenues à l'écart** : leurs notes n'ont pas été lues ; le profil v0 a été écrit avec les 36 autres avis, les 37 avis de
thèmes et la synthèse dont les lignes citant ces 40 clés étaient retirées. Rendus PNG de la version **notée** (archive
`d07548f` quand l'élément a changé depuis : 16 éléments ; 7 dont la version notée n'est pas archivée ont été jugés sur la
version actuelle). 40 prédictions écrites et scellées (empreinte SHA-256 du fichier
`338542e4…` à 12 h 35) **avant** la lecture des notes, puis comparées.

**Limite honnête.** Les étiquettes de la synthèse (par titre, pas par clé) ont laissé voir pour 4 des 40 éléments une
étiquette de Paul (« Anatomie fausse », « Clipart », « Style différent », « Waouh ») : `biblio:SITES/orteil-griffe`,
`materiel:podoscope:pedagogique`, `dessin:cors-durillons:pedagogique`, `heros:enfant:ligne`. Sur les 36 éléments sans fuite :
15 exactes (42 %), 35 à ±1 (97 %), écart moyen 0,61, corrélation 0,57.

**Résultats (40).** Exactes 17 (43 %) ; à ±1 : 38 (95 %) ; écart moyen absolu 0,63 ; biais −0,13 ; corrélation 0,64 ;
éliminatoires (≤ 2 ★ ou Clipart / Anatomie fausse) : Paul 5, juge 3, en commun 2, accord 36/40. Par type : matériel le plus
sous-noté (biais −0,56 : 5 ★ prédits 4), dessins légèrement sur-notés (+0,27). Les 4 confiances « forte » : 4/4 à ±1.

La mesure automatique ci-dessous ne retient que **32** de ces 40 paires : pour 7 éléments la version notée n'était pas archivée
(jugés sur la version actuelle, d'empreinte différente) et la note de `gamme:sable` n'a pas d'empreinte. Sur ces 32 : 12
exactes, 30 à ±1, écart 0,69.

**Plus gros écarts.**

| Élément | Juge | Paul | Pourquoi |
|---|---:|---:|---|
| `dessin:senior:pedagogique` | 3 | 1 | « On comprend pas du tout le schéma à gauche, le rapport » : l'incompréhensible est puni plus fort que prévu. |
| `heros:enfant:ligne` | 3 | 5 | « J'adore » : pieds d'adulte face aux pieds d'enfant = comparaison voulue, pas une juxtaposition sans lien. |
| `biblio:SITES/orteil-griffe` | 2 | 1 | « On comprend rien, à jeter ». |
| `materiel:iontophorese:pedagogique` (et 9 autres) | 4 | 5 | Pièces propres et reconnaissables : Paul met 5 ★ sans effet spécial (appareils, comparaisons, trait continu juste). |
| `ligne:taping` | 3 | 2 | Bande lue « incluse dans le pied » ; le taping est flashy dans la réalité. |
| `dessin:ongle:pedagogique` | 4 | 3 | Flèche verte qui ne se voit pas : un détail de lisibilité coûte un point. |

**Ajustement (profil v1, pas une seconde mesure).** Les pièces propres et reconnaissables montent à 5 ★ ; « on comprend pas
du tout » descend à 1 ★ ; exception adulte / enfant à la juxtaposition ; couleurs du réel (taping flashy, ongles jamais verts) ;
dispositifs exacts (orthoplastie, taping posé sur la peau) ; mouvement réel → animation ; appareils reliés et à leur place.
La justesse de v1 se mesure sur les prochaines notes de Paul (80 prédictions sur des éléments retouchés, photos et icônes).

<!-- mesure-auto -->
## Mesure automatique (export quotidien)

Notes comparables jusqu’au 2026-10-07 : 105.

| Profil | Notes | Exactes | À ±1 | Écart moyen | Biais | Corrélation | Accord éliminatoires |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2026-10-07.v1 | 73 | 24 (33 %) | 58 (79 %) | 0,95 | +0,18 | 0,51 | 54/73 |
| 2026-10-07.v0 | 32 | 11 (34 %) | 30 (94 %) | 0,72 | -0,22 | 0,68 | 28/32 |
| 20 dernières | 20 | 9 (45 %) | 19 (95 %) | 0,60 | +0,00 | 0,64 | 18/20 |

Plus gros écarts récents :

- `materiel:thermoformage:ligne` : prédit 2 ★, Paul 5 ★ (2026-10-07, profil 2026-10-07.v1)
- `photo:chaussage` : prédit 4 ★, Paul 1 ★ (2026-10-07, profil 2026-10-07.v1)
- `photo:enfant-baskets` : prédit 4 ★, Paul 1 ★ (2026-10-07, profil 2026-10-07.v1)
- `photo:posture-marche-sable` : prédit 4 ★, Paul 1 ★ (2026-10-07, profil 2026-10-07.v1)
- `picto:chaussure-enfant` : prédit 4 ★, Paul 1 ★ (2026-10-07, profil 2026-10-07.v1)
- `biblio:POD-AT-0006:dorsal:tong-posee` : prédit 4 ★, Paul 2 ★ (2026-10-07, profil 2026-10-07.v1)
- `dessin:senior:pedagogique` : prédit 3 ★, Paul 1 ★ (2026-10-07, profil 2026-10-07.v0)
- `heros:enfant:ligne` : prédit 3 ★, Paul 5 ★ (2026-10-07, profil 2026-10-07.v0)
<!-- /mesure-auto -->

<!-- propositions-claude-tags -->
## Propositions de tags de Claude : note prédite vs note de Paul

Fichier retours/propositions-claude-tags.json (profil 2026-10-07.v2, 2026-10-08) : 460 visuels tagués, 93 notes prédites (éléments jamais notés). Notes de Paul données le jour de la proposition ou après, jusqu’au 2026-10-07 : 0.

Pas encore de note de Paul sur ces éléments : la mesure se fera au prochain export.
<!-- /propositions-claude-tags -->
