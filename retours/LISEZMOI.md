# Dossier `retours/`

Retours de Paul sur les assets et les combinaisons, exportés automatiquement depuis Supabase par le workflow
`.github/workflows/exporter-retours.yml` (chaque nuit, ou bouton « Envoyer mes retours à Claude maintenant » dans
/admin/retours, /admin/atelier et /admin/illustrations). Mode d'emploi : `docs/retours.md`.

| Fichier | Contenu |
|---|---|
| `SYNTHESE.md` | Synthèse lisible : par type d'asset, meilleurs / pires, étiquettes fréquentes, à retravailler, combinaisons de l'atelier. **À lire en premier.** |
| `assets-notes.json` | Notes des assets (table `assets_notes`, 0027) : clé, type, note, étiquettes, commentaire, empreinte, jour. |
| `atelier-notes.json` | Notes des combinaisons (table `atelier_notes`, 0026) : ingrédients, note, étiquettes, commentaire, jour. |
| `illustrations-revues.json` | Journal des statuts (table `illustrations_revues`, 0021) : clé, statut, commentaire, empreinte, jour. |
| `illustrations-statuts.json` | Statut courant par clé (table `illustrations_statuts`). |
| `assets-sujets.json` | Sujets des visuels ajoutés / retirés par Paul (table `assets_sujets`, 0028) : état courant par clé (`ajouts`, `retraits`). |
| `inspirations.json` | Inspirations (table `inspirations`, 0028) : étiquettes « ce qui plaît », ce qu'on veut en tirer, sujet, type, palette, domaine du lien, jour. Jamais l'image ni une URL signée : référence seulement, jamais réutilisée sur les sites. |
| `photos-validees.json` | Photos libres validées, hébergées (stockage public « photos ») et notées 4-5 ★ : URL publique, clé, sujets, note, source (jamais d'auteur). Lu par les rendus hors ligne (démo, testeur de modèles) : `docs/testeur-modeles.md`. |
| `CHANGEMENTS.md` | Tenu à la main par Claude : corrections faites d'après les retours (affichées dans /admin/retours). |

Aucune donnée personnelle : ni auteur, ni e-mail, ni identifiant de compte, ni donnée de lead, de prospect ou de site
praticien. Seulement des notes, étiquettes et commentaires sur les assets et combinaisons. Le dépôt étant public, ne pas
écrire d'information sensible dans les commentaires.

Les fichiers JSON et `SYNTHESE.md` sont réécrits à chaque export : ne pas les modifier à la main.
