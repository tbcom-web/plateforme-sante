import { svgPicto, pictoSoin, pictoEquipement } from './pictos';

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

/** Préfixe des pictos métier de la marque (pictos.ts) : « picto:pied-profil ». Rendus sans appel externe, jamais via l'API Iconify. */
export const PREFIXE_PICTO = 'picto:';

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

/**
 * Icône d'un soin sur les sites : l'icône choisie par le super admin si elle diffère de l'icône par défaut historique (ICONES_SOINS,
 * aussi enregistrée en base), sinon le picto métier (« picto:<id> », pictos.ts), sinon l'icône Iconify (repli). À rendre avec
 * `svgIcone` (qui accepte « picto:… »).
 */
export const iconeOuPictoSoin = (slug: string, choisie?: string | null) => {
  const picto = pictoSoin(slug);
  if (choisie && choisie !== ICONES_SOINS[slug]) return choisie;
  return picto ? `${PREFIXE_PICTO}${picto}` : iconeSoin(slug, choisie);
};

/** URL de l'API publique Iconify (réservée à l'admin : recherche et aperçu). Un picto « picto:… » n'y est pas : il est rendu en data: URI (aucun appel externe). */
export const urlIconeApi = (nom: string) => {
  if (nom.startsWith(PREFIXE_PICTO)) return `data:image/svg+xml,${encodeURIComponent(svgPicto(nom.slice(PREFIXE_PICTO.length), { taille: 32 }) ?? '')}`;
  const [p, n] = nom.split(':');
  return `https://api.iconify.design/${p}/${n}.svg`;
};

/** Icône d'un équipement du catalogue : le picto métier s'il existe (pictos.ts), sinon son icône Iconify (repli) */
export const iconeOuPictoEquipement = (id: string, icone: string) => {
  const picto = pictoEquipement(id);
  return picto ? `${PREFIXE_PICTO}${picto}` : icone;
};
