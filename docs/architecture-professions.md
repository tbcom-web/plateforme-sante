# Plusieurs professions : architecture

Décision de Paul du 2026-10-08 : plusieurs professions à gérer, la première ajoutée est **psychomotricien**. « Idéalement une
bibliothèque commune, mais facile à gérer pour le commercial qui gère les clients de basculer d'une biblio à l'autre. On garde
les RECETTES COMMUNES ; ce qui change ce sont les textes / contenus associés au template, ainsi que les icônes, images etc.
propres aux professions ; mais les ingrédients peuvent se recouper entre professions (ex. une photo d'enfant qui marche peut
aussi coller pour un psychomot). »

Ce document complète la mémoire projet (couches Charte → Univers métier → Spécialité → Gamme → Modèle) : la dimension
« profession » se place au-dessus de l'univers métier, les recettes restent en dehors.

## Couches

```
                 ┌──────────────────────────────────────────────────────────────────────┐
 COMMUN          │ RECETTES (design) : gammes, polices, mises en page, effets, détails  │  recettes.ts, gammes, typo…
 à toutes les    │ = une seule cuisine pour tous les métiers                            │
 professions     └──────────────────────────────────────────────────────────────────────┘
                 ┌──────────────────────────────────────────────────────────────────────┐
 PAR             │ PACK PROFESSION (packs-professions.ts + pratiques.ts + professions.ts)│
 PROFESSION      │  - contenus : pages, textes, vocabulaire (« Cabinet de … »), titres  │
                 │    par pays, mentions déontologiques (ordre, diplôme, règles), FAQ   │
                 │  - thèmes / spécialités, activités, profils de référence (pratiques) │
                 │  - questions d'onboarding, codes RPPS / ADELI (onboarding-professions)│
                 │  - univers métier : motif signature, pictos / illustrations propres  │
                 │  - mots-clés de partage (suggestions d'ingrédients)                  │
                 └──────────────────────────────────────────────────────────────────────┘
                 ┌──────────────────────────────────────────────────────────────────────┐
 BIBLIOTHÈQUE    │ INGRÉDIENTS : UNE SEULE bibliothèque ; chaque élément porte          │
 UNIQUE          │ `professions: string[]` ou « commun »                                │
                 │  - palettes, polices, mises en page, éléments : communs par nature   │
                 │  - photos, illustrations, icônes, animations : une ou plusieurs      │
                 │    professions (enfant qui marche → podologue + psychomotricien)     │
                 └──────────────────────────────────────────────────────────────────────┘
 KIT  = profession × profil de pratique (kits-images.ts, profils.ts) : ingrédients de la profession + communs
 SITE = recette commune + pack profession + profil + kit + PERSONNALISATIONS du praticien (couche séparée)
```

## Données

| Donnée | Où | Règle |
|---|---|---|
| Registre des professions | `packages/core/src/professions.ts` | `id` = slug de la table `professions` (`podologue`, `psychomotricien`). Statut `active` (sélecteur + onboarding public), `preparation` (visible dans l'admin, jamais dans l'onboarding public), `prevue`. Alias : `pedicure-podologue` (leads, essais, prospects) → `podologue`. |
| Pack profession | `packages/core/src/packs-professions.ts` | Textes des sites (discipline, titre par pays, ordre, diplôme, règles, FAQ par défaut, accroche), univers, mots-clés de partage, `publiable` (faux tant que les textes ne sont pas relus : textes « [à rédiger] »). |
| Pratiques | `packages/core/src/pratiques.ts` (agent Profils) | Thèmes, activités, publics, profils de référence par profession. |
| Rattachement des ingrédients | `packages/core/src/professions-ingredients.ts` + table `assets_professions` (migration 0045) | Journal en ajout seul (`ajout`, `retrait`, `refus` d'une suggestion). Sans ligne : défaut calculé (commun par nature, sinon `podologue` : tout ce qui existe avant le multi-professions). Les hashtags `#profession-<id>` validés par l'agent des tags Claude comptent aussi comme ajout. |
| Sites | `sites.profession_slug` (0001) | Déjà rattachés. Les sites lisent le pack de `site.profession.slug`. |
| Leads / clients | `essais.profession`, `prospects.profession` (0023, 0024) | Déjà rattachés (`pedicure-podologue`, ramené à `podologue` par alias). |

### Partage d'un ingrédient

- `professionsDeLIngredient(cle, rattachements)` : ensemble effectif = défaut ∪ ajouts − retraits (dernière action par
  clé et profession).
- `ingredientPourProfession(cle, p, r)` : commun, ou rattaché à `p`. Le générateur (kits, tirages) ne voit que ces éléments.
- Catégorie vue depuis une profession : **commun**, **propre** (seulement cette profession), **partagé** (cette profession et
  au moins une autre), **autre** (pas pour elle).
- Suggestions : `suggestionsDePartage` compare sujets, hashtags et titre aux mots-clés de partage du pack cible (enfant, marche,
  équilibre, motricité, jeu…). Rien n'est rattaché sans clic de Paul (« Aussi pour … » ou « Pas pour … » = refus mémorisé).

## Admin

- Sélecteur global de profession (en-tête, cookie un an, `NavAdmin`) : professions actives **et en préparation**
  (`professionsAdmin`).
- Frigo : chips « Professions » sur chaque élément, bouton « Aussi pour <profession> » (un élément ou toute la sélection),
  filtre « Tous / Communs / Propres à cette profession / Partagés », bloc « Suggestions de partage » à valider.
- Sites et Essais (Clients) : filtrés par la profession choisie (bascule rapide d'une bibliothèque à l'autre pour le
  commercial).

## Générateur et sites

- Recettes communes (aucune recette par métier).
- Kits et tirages : `filtrerIngredientsParProfession` avant le tirage.
- Textes : `packProfession(slug)` ; aucun « podologie » codé en dur dans les gabarits des sites (hero, logo, pied de page,
  mentions légales, titre du cabinet, FAQ par défaut). Les prototypes `pages/modeles/*`, `[outil].astro` et `modeles/*.astro`
  (démos internes, hors sites praticiens) gardent leurs exemples.
- Un pack `publiable: false` (psychomotricien aujourd'hui) n'est construit qu'en démonstration (`demo-psychomotricien`, jamais
  indexé) : `verifierPackPubliable` bloque la publication tant que des textes « [à rédiger] » restent.

## Ajouter une profession

1. `professions.ts` : une entrée (statut `preparation`).
2. `packs-professions.ts` : son pack (textes provisoires « [à rédiger] » acceptés, `publiable: false`).
3. `pratiques.ts` : thèmes, activités, profils de référence (agent Profils).
4. `onboarding-professions.ts` : codes RPPS / ADELI, diplôme, `disponible: false` (agent Onboarding).
5. Table `professions` : sa ligne (slug, libellé, spécialité schema.org), catalogue de soins.
6. Frigo : rattacher les ingrédients partagés (suggestions), produire ses pictos et illustrations propres.
7. Relire les textes, passer `publiable: true`, puis `statut: 'active'`.
