// Soins liés : bloc « À lire aussi » des pages soin (maillage interne et pédagogie). Module pur, sans dépendance.
//
// SOINS_LIES donne, pour chaque fiche du catalogue, 2 à 4 fiches proches, de la plus utile à la moins utile pour le
// patient qui lit la page (ex. ongle incarné → orthonyxie : ce qui évite la récidive). soinsLies() ne garde QUE les
// soins cochés par le praticien : jamais de lien vers une page qui n'existe pas sur son site.
//
// Sujets à faible niveau de preuve (posturologie, réflexologie) : jamais suggérés, même cochés (règle déontologique,
// proposés plus tard après validation, voir catalogue-univers.ts). Le laser (photobiomodulation) n'est pas suggéré
// non plus : il reste accessible par la liste des compétences du cabinet.

export const SOINS_LIES: Readonly<Record<string, readonly string[]>> = {
  // Ongles
  'ongle-incarne': ['orthonyxie', 'onychoplastie', 'soins-de-pedicurie'],
  orthonyxie: ['ongle-incarne', 'onychoplastie', 'soins-de-pedicurie'],
  onychoplastie: ['ongle-incarne', 'mycose-ongles', 'orthonyxie'],
  'mycose-ongles': ['ongles-epais', 'onychoplastie', 'soins-de-pedicurie'],
  'ongles-epais': ['mycose-ongles', 'podologie-du-senior', 'soins-a-domicile'],
  // Peau, frottements, orteils
  'soins-de-pedicurie': ['cors-durillons', 'ongles-epais', 'mycose-ongles', 'ongle-incarne'],
  'cors-durillons': ['orthoplastie', 'semelles-orthopediques', 'pied-diabetique'],
  orthoplastie: ['cors-durillons', 'semelles-orthopediques', 'pied-diabetique'],
  'verrues-plantaires': ['cors-durillons', 'soins-de-pedicurie', 'podologie-enfant'],
  // Publics
  'pied-diabetique': ['cors-durillons', 'soins-a-domicile', 'ongles-epais'],
  'podologie-du-senior': ['ongles-epais', 'soins-a-domicile', 'cors-durillons'],
  'soins-a-domicile': ['podologie-du-senior', 'pied-diabetique', 'ongles-epais'],
  'podologie-enfant': ['bilan-podologique', 'semelles-orthopediques', 'verrues-plantaires'],
  'podologie-du-sport': ['bilan-podologique', 'semelles-orthopediques', 'douleur-talon', 'k-taping'],
  // Examen, appuis, douleurs
  'bilan-podologique': ['semelles-orthopediques', 'douleur-talon', 'podologie-enfant'],
  'semelles-orthopediques': ['bilan-podologique', 'douleur-talon', 'cors-durillons'],
  'douleur-talon': ['semelles-orthopediques', 'bilan-podologique', 'podologie-du-sport'],
  'k-taping': ['podologie-du-sport', 'douleur-talon'],
};

/** Soins jamais suggérés en lien (faible niveau de preuve, ou laissés à la liste des compétences) */
export const SOINS_EXCLUS_DES_LIENS: readonly string[] = ['posturologie', 'reflexologie', 'laser'];
const EXCLU = /posturo|r[ée]flexo/i;
const exclu = (slug: string) => SOINS_EXCLUS_DES_LIENS.includes(slug) || EXCLU.test(slug);

/** Nombre de liens affichés : peu d'information d'un coup */
export const SOINS_LIES_MAX = 3;

/**
 * Soins liés à `slug`, pris parmi les soins du site (cochés par le praticien), dans l'ordre de pertinence :
 * 1. liens de SOINS_LIES[slug] ;
 * 2. puis, pour compléter, les soins qui pointent vers celui-ci (lien réciproque) ;
 * 3. puis les soins liés aux soins liés (voisins de voisins).
 * Jamais la page elle-même, jamais de doublon, jamais un soin exclu (posturologie, réflexologie, laser).
 * Fonction pure ; renvoie les objets de `soinsDuSite` (titre, résumé…) tels quels.
 */
export function soinsLies<T extends { slug: string }>(slug: string, soinsDuSite: readonly T[], max = SOINS_LIES_MAX): T[] {
  const parSlug = new Map(soinsDuSite.map((s) => [s.slug, s]));
  const directs = SOINS_LIES[slug] ?? [];
  const reciproques = Object.keys(SOINS_LIES).filter((k) => SOINS_LIES[k].includes(slug));
  const second = [...directs, ...reciproques].flatMap((v) => SOINS_LIES[v] ?? []);
  const retenus: T[] = [];
  for (const candidat of [...directs, ...reciproques, ...second]) {
    if (retenus.length >= max) break;
    if (candidat === slug || exclu(candidat) || retenus.some((r) => r.slug === candidat)) continue;
    const s = parSlug.get(candidat);
    if (s) retenus.push(s);
  }
  return retenus;
}
