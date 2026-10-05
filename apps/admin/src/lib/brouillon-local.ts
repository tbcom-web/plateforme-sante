// Saisie gardée dans le navigateur quand l'enregistrement est refusé (modifié ailleurs entre-temps) :
// rien n'est perdu, la saisie peut être reprise après rechargement de la page.

type Sauvegarde<T> = { le: number; valeur: T };

const cle = (espace: string, id: string) => `plateforme:${espace}:${id}`;

export function garderLocalement<T>(espace: string, id: string, valeur: T) {
  try {
    localStorage.setItem(cle(espace, id), JSON.stringify({ le: Date.now(), valeur } satisfies Sauvegarde<T>));
  } catch {
    // Stockage indisponible (navigation privée…) : rien à faire.
  }
}

export function lireLocalement<T>(espace: string, id: string): Sauvegarde<T> | null {
  try {
    const brut = localStorage.getItem(cle(espace, id));
    const s = brut ? (JSON.parse(brut) as Sauvegarde<T>) : null;
    return s && typeof s.le === 'number' && s.valeur ? s : null;
  } catch {
    return null;
  }
}

export function oublierLocalement(espace: string, id: string) {
  try {
    localStorage.removeItem(cle(espace, id));
  } catch {
    // ignoré
  }
}
