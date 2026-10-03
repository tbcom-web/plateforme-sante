// Jeux d'icônes intégrés (fichiers locaux, aucun appel externe sur les sites publics).
// Nom d'une icône : "prefixe:nom", par ex. "healthicons:foot-outline".
// Le rendu SVG est dans '@plateforme/core/icones' (serveur / build uniquement : jeux volumineux).

export const JEUX_ICONES = [
  { prefixe: 'healthicons', nom: 'Healthicons', usage: 'Icônes métier santé', licence: 'MIT', url: 'https://healthicons.org' },
  { prefixe: 'lucide', nom: 'Lucide', usage: 'Interface (trait fin)', licence: 'ISC', url: 'https://lucide.dev' },
  { prefixe: 'ph', nom: 'Phosphor', usage: 'Interface, 6 graisses dont duotone', licence: 'MIT', url: 'https://phosphoricons.com' },
  { prefixe: 'tabler', nom: 'Tabler Icons', usage: 'Interface (trait)', licence: 'MIT', url: 'https://tabler.io/icons' },
] as const;

export type PrefixeIcone = (typeof JEUX_ICONES)[number]['prefixe'];

export const PREFIXES_ICONES: readonly string[] = JEUX_ICONES.map((j) => j.prefixe);

export const FORMAT_ICONE = /^[a-z0-9]+:[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Icône par défaut d'un soin du catalogue, si le super admin n'en a pas choisi. */
export const ICONES_SOINS: Record<string, string> = {
  'bilan-podologique': 'healthicons:foot-outline',
  'semelles-orthopediques': 'ph:footprints',
  'soins-de-pedicurie': 'healthicons:health-worker-outline',
  'pied-diabetique': 'healthicons:diabetes-measure-outline',
  'podologie-du-sport': 'healthicons:running-outline',
  'podologie-enfant': 'healthicons:child-care-outline',
};

export const ICONE_SOIN_DEFAUT = 'healthicons:foot-outline';

export const iconeSoin = (slug: string, choisie?: string | null) => choisie || ICONES_SOINS[slug] || ICONE_SOIN_DEFAUT;

/** URL de l'API publique Iconify (réservée à l'admin : recherche et aperçu). */
export const urlIconeApi = (nom: string) => {
  const [p, n] = nom.split(':');
  return `https://api.iconify.design/${p}/${n}.svg`;
};
