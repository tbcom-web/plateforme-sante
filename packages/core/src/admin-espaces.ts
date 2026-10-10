// ESPACES DU SUPER ADMIN (décision de Paul du 2026-10-08) : le menu suit son flux — Arrivages (tout ce qui est nouveau : accepter
// ou refuser) → Frigo (ingrédients acceptés) → Dégustation (donner son goût) → Cuisine (composer : Studio, Atelier, kits, profils)
// → Clients (sites, essais, publication). Noms validés par Paul : Arrivages, Frigo, Dégustation, Cuisine, Clients.
// Source unique du menu (en-tête et tiroir sur téléphone), du fil d'Ariane et des anciennes adresses redirigées
// (admin-redirections.json, lu aussi par apps/admin/next.config.ts). Aucun libellé de métier ici : la profession choisie vient de
// professions.ts. Documentation : docs/espaces-admin.md. Pur.

import redirectionsJson from './admin-redirections.json';

export type IdEspace = 'a-valider' | 'arrivages' | 'frigo' | 'degustation' | 'cuisine' | 'clients';

export type EntreeMenu = {
  href: string;
  libelle: string;
  /** Compteur affiché à côté (calculé par l'admin) */
  compteur?: 'arrivages' | 'nouveautes';
  /** Rangée secondaire du menu (outils moins fréquents) */
  secondaire?: boolean;
};

export type Espace = { id: IdEspace; libelle: string; href: string; description: string; entrees: readonly EntreeMenu[] };

export const ESPACES: readonly Espace[] = [
  // POINT D'ENTRÉE UNIQUE (demande de Paul du 2026-10-10, sujets-validation.ts) : en tête du menu, avec la pastille de ce qui attend ;
  // les Arrivages, la Dégustation et les tuiles restent accessibles (« vue détaillée ») mais ne sont plus le chemin principal
  {
    id: 'a-valider', libelle: '🎯 À valider', href: '/admin/sujets',
    description: 'Un seul endroit : chaque sujet (golf, diabète, enfant…), une carte à la fois, OK ou pas OK.',
    entrees: [{ href: '/admin/sujets', libelle: 'Sujets', compteur: 'arrivages' }],
  },
  {
    id: 'arrivages', libelle: 'Arrivages', href: '/admin/arrivages',
    description: 'Vue détaillée de tout ce qui est nouveau : accepter (entre au frigo) ou refuser, par lot.',
    entrees: [{ href: '/admin/arrivages', libelle: 'À trier' }],
  },
  {
    id: 'frigo', libelle: 'Frigo', href: '/admin/frigo',
    description: 'Les ingrédients acceptés, par type, avec leur note, leurs thèmes et leurs hashtags.',
    entrees: [
      { href: '/admin/frigo', libelle: 'Contenu' },
      { href: '/admin/frigo/tri', libelle: 'Trier par sujet' },
      { href: '/admin/frigo/tranches', libelle: 'Éléments tranchés' },
      { href: '/admin/frigo/bibliotheque', libelle: 'Bibliothèque complète' },
      { href: '/admin/frigo/photos', libelle: 'Jeux de photos' },
      { href: '/admin/photos-sous-licence', libelle: 'Photos sous licence' },
    ],
  },
  {
    id: 'degustation', libelle: 'Dégustation', href: '/admin/degustation',
    description: 'Donner son goût : séance du jour, tuiles, duels, recettes complètes.',
    entrees: [
      { href: '/admin/degustation', libelle: 'Séance' },
      { href: '/admin/retours', libelle: 'Tuiles à noter', compteur: 'nouveautes' },
      { href: '/admin/retours/duel', libelle: 'Duels A ou B' },
      { href: '/admin/retours/recettes', libelle: 'Recettes complètes' },
      // Chaîne de production des modèles (2026-10-09) : hors de /admin, ouverte aussi aux contributeurs de l'équipe
      { href: '/chaine', libelle: 'Chaîne des modèles' },
    ],
  },
  {
    id: 'cuisine', libelle: 'Cuisine', href: '/admin/cuisine',
    description: 'Composer : Studio, Atelier, kits, images à générer, profils de pratique.',
    entrees: [
      { href: '/admin/cuisine/studio', libelle: 'Studio' },
      { href: '/admin/cuisine/atelier', libelle: 'Atelier' },
      { href: '/admin/cuisine/kits', libelle: 'Kits' },
      { href: '/admin/cuisine/images-a-generer', libelle: 'Images à générer' },
      { href: '/admin/profils', libelle: 'Profils de pratique' },
      { href: '/admin/univers', libelle: 'Univers', secondaire: true },
      { href: '/admin/modeles', libelle: 'Modèles', secondaire: true },
      { href: '/admin/catalogue', libelle: 'Catalogue de soins', secondaire: true },
      { href: '/admin/flux', libelle: 'Flux de contenus', secondaire: true },
      { href: '/admin/visuels', libelle: 'Banque visuelle', secondaire: true },
      { href: '/admin/logos', libelle: 'Logos', secondaire: true },
      { href: '/admin/studio-portrait', libelle: 'Studio portrait', secondaire: true },
    ],
  },
  {
    id: 'clients', libelle: 'Clients', href: '/admin/clients',
    description: 'Sites des praticiens, publication, essais, prospection RPPS.',
    entrees: [
      { href: '/admin/sites', libelle: 'Sites' },
      { href: '/admin/leads', libelle: 'Essais' },
      { href: '/admin/prospection', libelle: 'Prospection' },
      { href: '/admin/maintenance', libelle: 'Maintenance' },
    ],
  },
];

/** Sous-pages (adresse plus longue qu'une entrée du menu) : libellé du dernier maillon du fil d'Ariane */
const SOUS_PAGES: readonly { prefixe: string; libelle: string }[] = [
  { prefixe: '/admin/sujets/', libelle: 'Sujet' },
  { prefixe: '/admin/sites/', libelle: 'Photos du site' },
  { prefixe: '/admin/leads/', libelle: 'Fiche essai' },
  { prefixe: '/admin/prospection/praticien/', libelle: 'Fiche praticien' },
  { prefixe: '/admin/prospection/cabinet/', libelle: 'Fiche cabinet' },
  { prefixe: '/admin/prospection/cabinets', libelle: 'Cabinets' },
  { prefixe: '/admin/prospection/actualites', libelle: 'Actualités' },
  { prefixe: '/admin/catalogue/', libelle: 'Modifier un soin' },
  { prefixe: '/admin/modeles/', libelle: 'Modifier un modèle' },
  { prefixe: '/admin/flux/', libelle: 'Article' },
  { prefixe: '/admin/retours/duel/pictos', libelle: 'Style des icônes' },
  { prefixe: '/admin/retours/duel/variantes', libelle: 'Variantes d’une illustration' },
];

/** Anciennes adresses → nouvelles (redirections Next, temporaires : 307 ; la requête est conservée) */
export const REDIRECTIONS_ADMIN: readonly { source: string; destination: string }[] = redirectionsJson;

export const ACCUEIL_ADMIN = { href: '/admin', libelle: 'Tableau de bord' } as const;

const sansFin = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
const correspond = (chemin: string, href: string) => chemin === href || chemin.startsWith(`${href}/`);

/** Entrée du menu la plus précise pour une adresse (et son espace), ou null (tableau de bord, page hors menu) */
export function entreeActive(chemin: string): { espace: Espace; entree: EntreeMenu } | null {
  const p = sansFin(chemin.split(/[?#]/)[0]);
  let meilleure: { espace: Espace; entree: EntreeMenu } | null = null;
  for (const espace of ESPACES) {
    for (const entree of [...espace.entrees, { href: espace.href, libelle: espace.libelle } as EntreeMenu]) {
      if (correspond(p, entree.href) && (!meilleure || entree.href.length > meilleure.entree.href.length)) meilleure = { espace, entree };
    }
  }
  return meilleure;
}

export const espaceActif = (chemin: string): Espace | null => entreeActive(chemin)?.espace ?? null;

export type Maillon = { href: string; libelle: string };

/** Fil d'Ariane : Super admin › Espace › Page (› sous-page) ; le dernier maillon est la page courante */
export function filAriane(chemin: string): Maillon[] {
  const p = sansFin(chemin.split(/[?#]/)[0]);
  const racine: Maillon = { href: ACCUEIL_ADMIN.href, libelle: 'Super admin' };
  if (p === ACCUEIL_ADMIN.href) return [racine, { href: ACCUEIL_ADMIN.href, libelle: ACCUEIL_ADMIN.libelle }];
  const a = entreeActive(p);
  if (!a) return [racine];
  const fil: Maillon[] = [racine, { href: a.espace.href, libelle: a.espace.libelle }];
  if (a.entree.href !== a.espace.href) fil.push({ href: a.entree.href, libelle: a.entree.libelle });
  if (p !== a.entree.href) {
    const s = SOUS_PAGES.filter((x) => p.startsWith(x.prefixe)).sort((x, y) => y.prefixe.length - x.prefixe.length)[0];
    if (s) fil.push({ href: p, libelle: s.libelle });
  }
  return fil;
}

/** Nouvelle adresse d'une ancienne (redirection exacte), ou null */
export const nouvelleAdresse = (chemin: string) => REDIRECTIONS_ADMIN.find((r) => r.source === sansFin(chemin.split(/[?#]/)[0]))?.destination ?? null;
