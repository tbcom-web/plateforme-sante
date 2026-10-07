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
| `CHANGEMENTS.md` | Tenu à la main par Claude : corrections faites d'après les retours (affichées dans /admin/retours). |

Aucune donnée personnelle : ni auteur, ni e-mail, ni identifiant de compte, ni donnée de lead, de prospect ou de site
praticien. Seulement des notes, étiquettes et commentaires sur les assets et combinaisons. Le dépôt étant public, ne pas
écrire d'information sensible dans les commentaires.

Les fichiers JSON et `SYNTHESE.md` sont réécrits à chaque export : ne pas les modifier à la main.
