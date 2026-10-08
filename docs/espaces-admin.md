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
  Limite : la construction des sites publiés (`apps/sites`) n'applique pas encore l'exclusion des nouveautés en attente.
- Gestes : A / → accepter, R / ← refuser, glisser au doigt (droite = accepter), Z annule la dernière décision (30 gardées).
- Frigo = inventaire unitaire (bibliothèque + éléments du studio) moins arrivages en attente ou refusés, retirés, à retravailler,
  tranchés 1 ★.
