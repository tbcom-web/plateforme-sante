#!/usr/bin/env bash
# Commit et push SÛRS pour les agents qui travaillent en parallèle dans la même copie de travail.
# Construit le commit sur l'origin/main le plus récent (fetch juste avant), à partir des SEULS fichiers listés, vérifie que le
# diff ne touche que ces fichiers, puis pousse sans force. Si main a bougé entre-temps, recommence (3 essais) au lieu
# d'écraser le travail d'un autre agent. La branche main locale est ensuite avancée (index remis à jour, copie de travail
# intacte). Une partie seulement d'un fichier partagé (index.ts, CHANGEMENTS.md…) : préparer ce fichier dans un dossier
# temporaire et le passer avec --depuis <chemin-du-dépôt>=<fichier-préparé>.
#
# Usage : scripts/pousser-commit.sh -m "message" fichier1 fichier2 … [--depuis chemin=fichier-préparé …]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

#   --ligne-changements "- AAAA-MM-JJ : …"  ajoute la ligne en tête de la liste de retours/CHANGEMENTS.md, calculée sur la
#                                           version d'origin/main AU MOMENT du commit (jamais d'écrasement des lignes des autres)
#   --export-core "./module"               ajoute `export * from './module';` à packages/core/src/index.ts (version d'origin/main)
#                                           s'il n'y est pas déjà
# Préférer ces deux options à --depuis pour CHANGEMENTS.md et index.ts : --depuis remplace tout le fichier par une version
# préparée plus tôt, qui peut ignorer un ajout poussé entre-temps par un autre agent.

message=""; fichiers=(); depuis=(); lignes=(); exports=()
while [ $# -gt 0 ]; do
  case "$1" in
    -m) message="$2"; shift 2 ;;
    --depuis) depuis+=("$2"); shift 2 ;;
    --ligne-changements) lignes+=("$2"); shift 2 ;;
    --export-core) exports+=("$2"); shift 2 ;;
    *) fichiers+=("$1"); shift ;;
  esac
done
[ -n "$message" ] || { echo "Message manquant (-m)." >&2; exit 2; }
[ ${#fichiers[@]} -gt 0 ] || [ ${#depuis[@]} -gt 0 ] || [ ${#lignes[@]} -gt 0 ] || [ ${#exports[@]} -gt 0 ] || { echo "Aucun fichier." >&2; exit 2; }
attendus=$( { printf '%s\n' "${fichiers[@]+"${fichiers[@]}"}"; for d in "${depuis[@]+"${depuis[@]}"}"; do printf '%s\n' "${d%%=*}"; done;
  [ ${#lignes[@]} -gt 0 ] && echo retours/CHANGEMENTS.md; [ ${#exports[@]} -gt 0 ] && echo packages/core/src/index.ts; true; } | sed '/^$/d' | sort -u)
tmpd=$(mktemp -d)

index=$(mktemp)
trap 'rm -f "$index"; rm -rf "$tmpd"' EXIT
for essai in 1 2 3; do
  git fetch -q origin main
  base=$(git rev-parse origin/main)
  GIT_INDEX_FILE="$index" git read-tree "$base"
  for f in "${fichiers[@]+"${fichiers[@]}"}"; do
    if [ -e "$f" ]; then GIT_INDEX_FILE="$index" git add -- "$f"; else GIT_INDEX_FILE="$index" git rm -q --cached --ignore-unmatch -- "$f"; fi
  done
  for d in "${depuis[@]+"${depuis[@]}"}"; do
    chemin="${d%%=*}"; source="${d#*=}"
    blob=$(git hash-object -w -- "$source")
    GIT_INDEX_FILE="$index" git update-index --add --cacheinfo 100644,"$blob","$chemin"
  done
  if [ ${#lignes[@]} -gt 0 ]; then
    git show "$base:retours/CHANGEMENTS.md" > "$tmpd/ch.md"
    printf '%s\n' "${lignes[@]}" > "$tmpd/lignes.txt"
    node -e '
      const fs = require("fs"); const [f, l] = process.argv.slice(1);
      const t = fs.readFileSync(f, "utf8").split("\n"); const nouv = fs.readFileSync(l, "utf8").split("\n").filter(Boolean).filter((x) => !t.includes(x));
      let i = t.findIndex((x) => /^- \d{4}-\d{2}-\d{2} /.test(x)); if (i < 0) i = t.length;
      t.splice(i, 0, ...nouv); fs.writeFileSync(f, t.join("\n"));' "$tmpd/ch.md" "$tmpd/lignes.txt"
    GIT_INDEX_FILE="$index" git update-index --add --cacheinfo 100644,"$(git hash-object -w -- "$tmpd/ch.md")",retours/CHANGEMENTS.md
  fi
  if [ ${#exports[@]} -gt 0 ]; then
    git show "$base:packages/core/src/index.ts" > "$tmpd/index.ts"
    for e in "${exports[@]}"; do
      l="export * from '$e';"
      grep -qxF -- "$l" "$tmpd/index.ts" || printf '%s\n' "$l" >> "$tmpd/index.ts"
    done
    GIT_INDEX_FILE="$index" git update-index --add --cacheinfo 100644,"$(git hash-object -w -- "$tmpd/index.ts")",packages/core/src/index.ts
  fi
  arbre=$(GIT_INDEX_FILE="$index" git write-tree)
  commit=$(git commit-tree "$arbre" -p "$base" -m "$message")
  touches=$(git diff --name-only "$base" "$commit" | sort -u)
  inattendus=$(comm -23 <(printf '%s\n' "$touches") <(printf '%s\n' "$attendus") | sed '/^$/d')
  if [ -n "$inattendus" ]; then echo "Refus : le commit touche des fichiers non listés :" >&2; echo "$inattendus" >&2; exit 3; fi
  [ -n "$touches" ] || { echo "Rien à pousser (aucune différence avec origin/main)."; exit 0; }
  if git push -q origin "$commit:refs/heads/main"; then
    git fetch -q origin main
    git update-ref refs/heads/main origin/main
    git reset -q   # index = HEAD, copie de travail intacte
    echo "Poussé : $(git log --oneline -1 "$commit")"
    git diff --stat "$base" "$commit"
    exit 0
  fi
  echo "main a bougé pendant la préparation : nouvel essai ($essai/3)…" >&2
done
echo "Échec après 3 essais : rien n'a été écrasé." >&2
exit 4
