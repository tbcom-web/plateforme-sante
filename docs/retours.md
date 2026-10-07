# Retours de Paul → Claude

Comment les avis donnés dans le back-office arrivent jusqu'à Claude, sans qu'aucune clé Supabase ne sorte des secrets GitHub.

## Où Paul donne son avis

| Page | Ce qu'on y note | Table |
|---|---|---|
| `/admin/retours` « Donner mon avis » | Une carte à la fois, tirée au hasard (jamais notés d'abord, puis modifiés depuis la dernière note, puis notes incertaines) : thèmes complets, illustrations, icônes, photos, animations, couleurs, structures. « Ce qui va bien » / « Ce qui ne va pas », commentaire, 1 à 5 étoiles. | `assets_notes` (0027), `atelier_notes` (0026) |
| `/admin/illustrations` « Bibliothèque & retours » | Inventaire complet, statut (Validé, À retravailler, À revoir, Retiré), note rapide. | `illustrations_revues` / `illustrations_statuts` (0021), `assets_notes` |
| `/admin/atelier` | Combinaisons du générateur, scénario au choix. | `atelier_notes` |

Les notes servent tout de suite au générateur (`packages/core/src/atelier-poids.ts`, `assets-poids.ts`) : moyennes lissées,
« Retiré » et « À retravailler » pénalisent l'asset ; les garde-fous (diversité, diabète sans rouge, posture jamais, AA)
priment toujours.

## Comment les retours arrivent dans le dépôt

Workflow `.github/workflows/exporter-retours.yml` :

- chaque nuit (3 h 17 UTC), ou à la main (GitHub → Actions → exporter-retours → Run workflow), ou par le bouton
  « Envoyer mes retours à Claude maintenant » (`/admin/retours`, `/admin/atelier`, `/admin/illustrations` ; admin seulement,
  même jeton GitHub que la publication) ;
- `node scripts/exporter-retours.mjs` lit Supabase avec les secrets `SUPABASE_URL` / `SUPABASE_SECRET_KEY` et écrit
  `retours/*.json` + `retours/SYNTHESE.md` ;
- commit « Retours : export du AAAA-MM-JJ » par le bot github-actions, seulement s'il y a du nouveau.

Exporté : clés d'assets, notes, étiquettes, commentaires, empreintes, ingrédients des combinaisons, statuts, dates au jour.
**Jamais exporté** : auteur, e-mail, identifiant de compte, leads, prospects, sites praticiens. Le dépôt est public :
si les commentaires deviennent sensibles, repasser le dépôt en privé (GitHub → Settings → Danger zone → Change visibility) ;
le workflow et le bouton continuent de fonctionner.

## Ce que fait Claude en début de séance

```bash
git pull --rebase
```

1. Lire `retours/SYNTHESE.md` (par type d'asset, meilleurs / pires, étiquettes fréquentes, à retravailler, combinaisons).
2. Au besoin, le détail dans `retours/assets-notes.json`, `retours/atelier-notes.json`, `retours/illustrations-revues.json`.
   La clé (`picto:…`, `dessin:<nom>:<registre>`, `heros:<thème>:<registre>`, `photo:…`, `gamme:…`, `modele:…`) indique le
   fichier à retoucher (`source` dans `packages/core/src/assets.ts` / `illustrations.ts`).
3. Corriger (dessin, photo, gamme, règle du générateur…), puis ajouter une ligne en haut de la liste de
   `retours/CHANGEMENTS.md` : `- AAAA-MM-JJ : ce qui a été corrigé (clé, commit)`. La page `/admin/retours` l'affiche dans
   « Ce que vos avis ont changé ».
4. Un asset retouché change d'empreinte : il revient en tête de la notation (« Modifié depuis »).

Sans export récent, Paul peut aussi utiliser « Copier mes retours » (Markdown) dans `/admin/retours`, `/admin/atelier` ou
`/admin/illustrations` et le coller dans la conversation.
