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

message=""; fichiers=(); depuis=()
while [ $# -gt 0 ]; do
  case "$1" in
    -m) message="$2"; shift 2 ;;
    --depuis) depuis+=("$2"); shift 2 ;;
    *) fichiers+=("$1"); shift ;;
  esac
done
[ -n "$message" ] || { echo "Message manquant (-m)." >&2; exit 2; }
[ ${#fichiers[@]} -gt 0 ] || [ ${#depuis[@]} -gt 0 ] || { echo "Aucun fichier." >&2; exit 2; }
attendus=$( { printf '%s\n' "${fichiers[@]+"${fichiers[@]}"}"; for d in "${depuis[@]+"${depuis[@]}"}"; do printf '%s\n' "${d%%=*}"; done; } | sed '/^$/d' | sort -u)

index=$(mktemp)
trap 'rm -f "$index"' EXIT
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
