// Chemins des scripts Node sous Windows (Git Bash / MSYS) — utilitaire commun à tous les scripts du dépôt.
//
// Le piège « C:\c\Users\… » : sous Git Bash, un chemin peut arriver au script au format MSYS (« /c/Users/… ») : variable
// d'environnement, argument « --cle=/c/… », chemin lu dans un fichier, MSYS_NO_PATHCONV=1. Node sous Windows le lit comme un
// chemin absolu SANS lecteur, relatif au lecteur courant : resolve('/c/Users/x') = « C:\c\Users\x ». Le script crée alors un
// dossier C:\c\… au lieu d'écrire dans C:\Users\….
//
// Règle (docs/scripts-chemins.md) : tout chemin reçu de l'extérieur (argument, variable d'environnement) passe par
// cheminWindows() / resoudre() ; tout dossier où le script ÉCRIT passe par sortieAutorisee(), qui refuse d'écrire hors du dépôt
// et du dossier temporaire du système.
import { resolve, relative, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

/** Racine du dépôt (plateforme-sante) */
export const DEPOT = fileURLToPath(new URL('../../../', import.meta.url));

/** « /c/Users/… », « /cygdrive/c/… », « /mnt/c/… » → « C:/Users/… » sous Windows ; ailleurs, inchangé */
export function cheminWindows(p) {
  if (typeof p !== 'string' || process.platform !== 'win32') return p;
  const m = p.match(/^\/(?:cygdrive\/|mnt\/)?([a-zA-Z])(\/.*)?$/);
  return m ? `${m[1].toUpperCase()}:${m[2] ?? '/'}` : p;
}

/** path.resolve après normalisation de chaque segment */
export const resoudre = (...segments) => resolve(...segments.map(cheminWindows));

/** Signature du piège : un dossier d'une seule lettre à la racine d'un lecteur (C:\c\…) */
const piegeMsys = (absolu) => process.platform === 'win32' && /^[a-zA-Z]:[\\/][a-zA-Z](?:[\\/]|$)/.test(absolu);

const dans = (racine, chemin) => { const r = relative(racine, chemin); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };

/**
 * Dossier de SORTIE d'un script : normalisé, puis refusé (exception) s'il tombe hors des racines autorisées — le dépôt, le
 * dossier temporaire du système et, au besoin, les dossiers listés dans SORTIES_AUTORISEES (séparés par « ; ») — ou s'il a la
 * signature « C:\c\… ». `racines` : racines supplémentaires propres au script.
 */
export function sortieAutorisee(chemin, racines = []) {
  const absolu = resoudre(chemin);
  if (piegeMsys(absolu)) throw new Error(`Chemin refusé : ${absolu} (chemin MSYS « /x/… » mal converti ; écrire C:/… ou passer par cheminWindows())`);
  const autorisees = [DEPOT, tmpdir(), ...(process.env.SORTIES_AUTORISEES ?? '').split(';').filter(Boolean), ...racines].map((r) => resoudre(r));
  if (!autorisees.some((r) => dans(r, absolu))) throw new Error(`Écriture refusée hors des dossiers prévus : ${absolu}\n  Autorisés : ${autorisees.join(' ; ')} (ajouter un dossier : SORTIES_AUTORISEES)`);
  return absolu;
}

/** Sous-dossier STRICT de `racine` (jamais la racine elle-même, jamais « ../ ») : pour un dossier que le script vide ou supprime */
export function sousDossier(racine, ...segments) {
  const r = resoudre(racine), p = resolve(r, ...segments.map(cheminWindows));
  if (p === r || !dans(r, p)) throw new Error(`Dossier refusé : ${p} (doit être dans ${r})`);
  return p;
}
