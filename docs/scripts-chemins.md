# Chemins dans les scripts Node (Windows, Git Bash)

**Le piège « C:\c\… ».** Sous Git Bash, un chemin peut arriver à un script au format MSYS (`/c/Users/…`) : variable d'environnement, argument `--cle=/c/…`, chemin lu dans un fichier ou `MSYS_NO_PATHCONV=1`. Node sous Windows le prend pour un chemin absolu sans lecteur : `resolve('/c/Users/x')` donne `C:\c\Users\x`, et le script crée un dossier `C:\c\Users\…` au lieu d'écrire au bon endroit.

**Règle.** Utilitaire commun : `packages/core/scripts/chemins.mjs`.

- Un chemin reçu de l'extérieur (argument, variable d'environnement) passe par `cheminWindows()` ou `resoudre()`. Exemple : `/c/Users/…` devient `C:/Users/…` ; sous Linux et macOS, rien ne change.
- Un dossier où le script **écrit** passe par `sortieAutorisee()`. Elle refuse :
  - un chemin de la forme `X:\x\…` ;
  - tout dossier hors du dépôt et du dossier temporaire du système.
  
  Pour autoriser un autre dossier : `SORTIES_AUTORISEES="D:/captures;…"`.
- Un dossier que le script vide ou supprime passe par `sousDossier(racine, nom)`. Il refuse `..` et refuse la racine elle-même.
- Jamais `new URL(…).pathname` pour obtenir un chemin : utiliser `fileURLToPath()`. `pathname` donne `/C:/…` et code les espaces en `%20`.
- Dans le terminal, écrire de préférence `C:/Users/…`, avec des barres obliques.

**Scripts concernés :**

- `apps/sites/scripts` : `controle-webkit` (`--dist`, `--sortie`), `controle-agents`, `controle-seo`, `univers-planche` (`--sortie`) et `univers-commun` (dossier de construction) ;
- `packages/contenus/scripts` : `generer` et `reel` (`--sortie`) ;
- `packages/core/scripts/extraire-ecranzen`.

Tout nouveau script qui écrit des fichiers suit la même règle.
