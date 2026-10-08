# Espaces du super admin

Décision de Paul du 2026-10-08 : le super admin suit son flux, en cinq espaces aux noms validés — **Arrivages → Frigo →
Dégustation → Cuisine → Clients** — plus un tableau de bord court. Source unique du menu, du fil d'Ariane et des anciennes
adresses : `packages/core/src/admin-espaces.ts` (+ `admin-redirections.json`, lu aussi par `apps/admin/next.config.ts`).
Menu : `apps/admin/src/components/NavAdmin.tsx` (onglets sur grand écran, tiroir « Menu » sur téléphone, fil d'Ariane).

## Plan du menu

```
Super admin (/admin : tableau de bord)
├─ Arrivages        /admin/arrivages                 (compteur : en attente)
├─ Frigo            /admin/frigo                     Contenu (couverture par thème, ingrédients par type)
│                   /admin/frigo/tri                 Trier par sujet
│                   /admin/frigo/tranches            Éléments tranchés
│                   /admin/frigo/bibliotheque        Bibliothèque complète
│                   /admin/frigo/photos              Jeux de photos
├─ Dégustation      /admin/degustation               Séance (page de l'agent Dégustation)
│                   /admin/retours                   Tuiles à noter (compteur : nouveautés à noter)
│                   /admin/retours/duel              Duels A ou B
│                   /admin/retours/recettes          Recettes complètes
│                   /chaine                          Chaîne des modèles (hors /admin : ouverte aux contributeurs ; docs/chaine-modeles.md)
├─ Cuisine          /admin/cuisine                   (accueil de l'espace)
│                   /admin/cuisine/studio            Studio
│                   /admin/cuisine/atelier           Atelier
│                   /admin/cuisine/kits              Kits
│                   /admin/cuisine/images-a-generer  Images à générer
│                   /admin/profils                   Profils de pratique
│                   Plus : Univers, Modèles, Catalogue de soins, Flux de contenus, Banque visuelle, Logos, Studio portrait
└─ Clients          /admin/clients                   (accueil de l'espace)
                    /admin/sites                     Sites (ancienne liste de /admin)
                    /admin/leads                     Essais
                    /admin/maintenance               Maintenance (republier tous les sites)
```

## Anciennes adresses (redirection Next 307, requête conservée)

| Ancienne | Nouvelle |
|---|---|
| `/admin/retours/tri` | `/admin/frigo/tri` |
| `/admin/retours/tranches` | `/admin/frigo/tranches` |
| `/admin/illustrations` | `/admin/frigo/bibliotheque` |
| `/admin/photos` | `/admin/frigo/photos` |
| `/admin/retours/kits` | `/admin/cuisine/kits` |
| `/admin/retours/images-a-generer` | `/admin/cuisine/images-a-generer` |
| `/admin/atelier` | `/admin/cuisine/atelier` |
| `/admin/atelier/studio` | `/admin/cuisine/studio` |
| `/admin?q=…&statut=…` (filtres de la liste des sites) | `/admin/sites?…` (redirigé par la page) |

Adresses exactes seulement : les routes situées dessous restent en place (`/admin/photos/licences.csv`,
`/admin/retours/images-a-generer/importer`, `/admin/retours/duel/pictos`…). Les nouvelles pages réexportent les modules des
anciennes (aucun fichier déplacé : les agents en parallèle gardent leurs chemins).

## Profession

Sélecteur global dans l'en-tête (`professions.ts`, cookie `admin-profession` un an, `lib/profession.ts` → `getProfession()`),
une seule profession active aujourd'hui. Tout ce qui existe sans profession enregistrée est de la profession par défaut
(`estDeLaProfession`). Filtrés : Arrivages (photos par thème de la profession ; nouveautés du code = profession par défaut),
Frigo, tableau de bord, Sites. Dégustation et Profils lisent le même cookie. Aucun libellé de métier dans la navigation.

## Arrivages : correspondance des statuts (aucun statut dupliqué)

| Source | En attente | Accepter (entre au frigo) | Refuser | Annuler |
|---|---|---|---|---|
| Photos à découvrir (Pexels, Pixabay), chargées à la demande par thème | candidate jamais vue | « Garder » (`photos_libres`) + import WebP sans EXIF → `validee` | « Rejeter » (`photos_libres_avis`) | remise dans la file de la séance (le rejet reste chez la source ; « Accepter » le remplace) |
| Photos gardées non importées | `photos_libres.statut = a_valider` sans fichier | import WebP → `validee` | `retiree` | → `a_valider` |
| Images générées importées | `a_valider` (déjà hébergées) | → `validee` | `retiree` | → `a_valider` |
| Nouveautés poussées par Claude (registre `inventaire-connu.json`, < 30 jours) | jamais notée, statut nul ou « À revoir » | revue `accepte` (migration 0044) ; une note rapide vaut aussi acceptation (sauf 1 ★) | revue `retire` | revue au statut précédent, sinon « À revoir » (de nouveau en attente) |

- Thèmes et hashtags pré-cochés (sujets effectifs, hashtags existants et par défaut) ; seules les différences sont écrites
  (`assets_sujets`, `assets_hashtags`). Note rapide facultative → `assets_notes`.
- **Ce qui n'est pas accepté n'est pas utilisable par le générateur** : les nouveautés en attente ou refusées sont ajoutées au
  registre d'exclusion (`ContexteImages` → `contexte-images.ts`) pour l'admin, /creer, /edition, /mon-site et l'essai (lecture
  `assets_notes_apprentissage()`, ouverte aux praticiens). Les photos l'étaient déjà (seules les `validee` importées sont tirées).
  Sites publiés (2026-10-09) : la construction Astro applique les mêmes exclusions (`exclusions-site.ts`, `apps/sites/src/lib/supabase.ts`) :
  nouveautés non acceptées ou refusées, éléments ≤ 2 ★, retirés ou à retravailler, photos « à valider » ; un élément exclu de la
  configuration du site est remplacé par son repli (valeur par défaut, photo suivante ou illustration), journalisé au build.
- Gestes : A / → accepter, R / ← refuser, glisser au doigt (droite = accepter), Z annule la dernière décision (30 gardées).
- Frigo = inventaire unitaire (bibliothèque + éléments du studio) moins arrivages en attente ou refusés, retirés, à retravailler,
  tranchés 1 ★.

## Lots, filtres et contenus (2026-10-09)

Demande de Paul : « dans les Arrivages on devrait aussi avoir les CONTENUS créés, les nouvelles icônes associées, etc. »

- **Couverture vérifiée** : les 250 nouveautés du registre (`inventaire-connu.json`, 16 lots du 08/10 : directions de pictos
  A/B/C/D, 8 pictos et 4 illustrations des manques, animations `em-*` et `il-*`, premiers écrans, portraits, visuel du premier
  écran, traitements photo, polices, typographies, menus, détails, surfaces, transitions, sections) sont toutes connues de
  l'inventaire et arrivent dans la file. Seul manque corrigé : la file s'arrêtait aux 150 plus récentes ; elle les contient
  maintenant toutes (aperçus chargés par paquets de 6 : `arrivages/visuels.ts`).
- **Lots** (`lotsArrivages`, même libellé que la tuile Nouveautés : « Style d’icônes A/B/C/D · 50 · 08/10 ») : « Trier ce lot »
  (`/admin/arrivages?lot=<famille>@<date>`), « Tout accepter » / « Tout refuser » avec confirmation, annulable (Z).
- **Filtres de type** : Visuels (photos, illustrations, palettes) · Icônes · Animations · Mises en page (mises en page, polices,
  éléments) · Contenus. Source « Contenus (textes des packs) ». Filtre par profession : sélecteur global.

### Contenus des packs de professions (`contenus-revue.ts`, `lib/packs-contenus.ts`)

- Une carte par page, fiche (avec sa FAQ), question de la FAQ ; mentions, textes de prise en charge et questions d'onboarding
  groupés (pack Psychomotricien : 29 cartes). Texte rendu dans un cadre de téléphone (champs du cabinet d'exemple surlignés,
  sections conditionnelles signalées, appels de sources numérotés), sources réglementaires en marge (« à revérifier » si non
  relue), erreurs et avertissements du contrôle des packs (`controlerPack<Id>`, comme `npm run controle:packs`).
- Gestes : **Accepter** (bon pour publication) → revue `valide` ; **À retravailler** (touche T, commentaire obligatoire) →
  `a_retravailler` ; **Refuser** → `retire` ; **Annuler** → `a_revoir`. Clé `contenu:<profession>:<page|fiche|faq|mentions|
  prise-en-charge|onboarding>:<id>` dans `illustrations_revues` / `illustrations_statuts` avec l'**empreinte** du texte
  (FNV-1a, 8 hexadécimaux) : toute modification du texte remet la carte en arrivage (« Modifié depuis votre revue »).
  **Aucune migration.**
- **Règle de publication** : un pack n'est publiable (profession disponible pour le parcours client) que lorsque tous ses
  contenus obligatoires sont acceptés pour leur texte actuel, sans erreur du contrôle et hors statut « en préparation »
  (`progressionPack`, `packPubliable(profession)` de `lib/packs-contenus.ts`, à lire par le parcours /essai). Progression en
  tête des Arrivages : « Pack Psychomotricien : 5/29 contenus acceptés ».
- **Export** (`scripts/exporter-retours.mjs`) : section « Contenus à retravailler (Arrivages) » de `retours/SYNTHESE.md` (clé,
  date, empreinte, commentaire de Paul) et `retours/contenus-revues.json` ; ces clés sont exclues de la synthèse des assets.
- Ajouter le pack d'une autre profession : une ligne dans `PACKS` (`apps/admin/src/lib/packs-contenus.ts`).
- Podologie : pas encore de pack de contenus (ses fiches vivent dans `soins_catalogue`, modifiées dans /admin/catalogue) ;
  elles entreront dans les Arrivages quand elles seront livrées sous forme de pack.
