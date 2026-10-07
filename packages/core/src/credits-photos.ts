// Sources et licences des photos de la BANQUE INTÉGRÉE (apps/sites/public/photos/*.webp) : données typées, reprises de
// apps/sites/public/photos/CREDITS.md (Unsplash, photographe, page d'origine) et datées du jour d'ajout au dépôt. Affichées
// sur chaque carte photo de l'admin (bibliothèque, Donner mon avis, /admin/photos → Sources et licences) et incluses dans
// l'export CSV des licences. Un test vérifie que chaque fichier du dossier a son crédit, et inversement.

export const LICENCE_UNSPLASH = { nom: 'Unsplash License', url: 'https://unsplash.com/license' } as const;

export type CreditPhotoIntegree = {
  /** Nom du fichier dans apps/sites/public/photos */
  fichier: string;
  photographe: string;
  /** Page de la photo chez Unsplash */
  urlSource: string;
  /** Date d'ajout au dépôt (téléchargement, recadrage, conversion WebP) */
  date: string;
};

export const CREDITS_PHOTOS_INTEGREES: readonly CreditPhotoIntegree[] = [
  { fichier: 'accueil-observation-marche.webp', photographe: 'Neuro Equilibrium', urlSource: 'https://unsplash.com/photos/CoJAfPbC9ps', date: '2026-10-03' },
  { fichier: 'analyse-plateforme.webp', photographe: 'Neuro Equilibrium', urlSource: 'https://unsplash.com/photos/E0lh1Ev-5GE', date: '2026-10-03' },
  { fichier: 'cabinet-lumiere.webp', photographe: 'charlesdeluvio', urlSource: 'https://unsplash.com/photos/S5meg_j_W1U', date: '2026-10-03' },
  { fichier: 'chaussage.webp', photographe: 'Vitor Monthay', urlSource: 'https://unsplash.com/photos/V3VrKQQkwog', date: '2026-10-03' },
  { fichier: 'enfant-baskets.webp', photographe: 'Compagnons', urlSource: 'https://unsplash.com/photos/qxz9PiBWtkY', date: '2026-10-04' },
  { fichier: 'enfant-bebe.webp', photographe: 'Sandra Seitamaa', urlSource: 'https://unsplash.com/photos/ImW_9u8qt0U', date: '2026-10-04' },
  { fichier: 'enfant-chaussons.webp', photographe: 'Natã Alves Motta', urlSource: 'https://unsplash.com/photos/FiOX0Bkf8cc', date: '2026-10-04' },
  { fichier: 'enfant-chaussures.webp', photographe: "Steve O'Reilly", urlSource: 'https://unsplash.com/photos/HwfuoxlAOls', date: '2026-10-04' },
  { fichier: 'enfant-herbe.webp', photographe: 'Emanuel Haas', urlSource: 'https://unsplash.com/photos/h8b-92R61v0', date: '2026-10-04' },
  { fichier: 'enfant-pied.webp', photographe: 'Alina Bondar', urlSource: 'https://unsplash.com/photos/u39DloQg-r0', date: '2026-10-03' },
  { fichier: 'examen-mains.webp', photographe: 'Toralf Thomassen', urlSource: 'https://unsplash.com/photos/5S40ixhBK-I', date: '2026-10-03' },
  { fichier: 'generale-parquet.webp', photographe: 'Meghan Holmes', urlSource: 'https://unsplash.com/photos/Jc7UV19xcKU', date: '2026-10-04' },
  { fichier: 'generale-pied-profil.webp', photographe: 'Klara Kulikova', urlSource: 'https://unsplash.com/photos/sFeWWk9rDxY', date: '2026-10-04' },
  { fichier: 'generale-pied-sol.webp', photographe: 'Alicia Christin Gerald', urlSource: 'https://unsplash.com/photos/yExJ3n6_iiE', date: '2026-10-04' },
  { fichier: 'generale-pieds-nus.webp', photographe: 'Philippe Murray-Pietsch', urlSource: 'https://unsplash.com/photos/UrFkjQkLs6I', date: '2026-10-04' },
  { fichier: 'posture-empreintes.webp', photographe: 'Muhammed Hisham', urlSource: 'https://unsplash.com/photos/Bren5_-spyU', date: '2026-10-04' },
  { fichier: 'posture-escalier.webp', photographe: "Timi's Feet", urlSource: 'https://unsplash.com/photos/dZzxxEMRYEM', date: '2026-10-04' },
  { fichier: 'posture-marche-sable.webp', photographe: 'Lucas Sankey', urlSource: 'https://unsplash.com/photos/orFHTN5BBtM', date: '2026-10-04' },
  { fichier: 'posture-pieds-herbe.webp', photographe: 'Tanya Nikan', urlSource: 'https://unsplash.com/photos/Fb2cuj83aK4', date: '2026-10-04' },
  { fichier: 'soin-talon.webp', photographe: 'Julius Toltesi', urlSource: 'https://unsplash.com/photos/QBzckSn4fpo', date: '2026-10-03' },
  { fichier: 'soins-bandages.webp', photographe: 'Judy Beth Morris', urlSource: 'https://unsplash.com/photos/2M1oM2bAcxo', date: '2026-10-04' },
  { fichier: 'soins-pied-tenu.webp', photographe: 'Oswald Elsaboath', urlSource: 'https://unsplash.com/photos/SKbplAj2ixk', date: '2026-10-04' },
  { fichier: 'sport-chaussure.webp', photographe: 'Luísa Schetinger', urlSource: 'https://unsplash.com/photos/Fd24fpdxJsQ', date: '2026-10-04' },
  { fichier: 'sport-course.webp', photographe: 'Jakob Owens', urlSource: 'https://unsplash.com/photos/A4579vLezz8', date: '2026-10-03' },
  { fichier: 'sport-foulee-herbe.webp', photographe: 'Mathias Reding', urlSource: 'https://unsplash.com/photos/znAXQ62Q71o', date: '2026-10-04' },
  { fichier: 'sport-lacage.webp', photographe: 'Markus Spiske', urlSource: 'https://unsplash.com/photos/lyC98PFMmYQ', date: '2026-10-04' },
  { fichier: 'sport-trail.webp', photographe: 'Mathias Reding', urlSource: 'https://unsplash.com/photos/OZZceyOQmdE', date: '2026-10-04' },
];

/** Crédit d'une photo intégrée à partir de son adresse (/photos/<fichier>.webp) ou de son nom de fichier */
export function creditPhotoIntegree(urlOuFichier: string): CreditPhotoIntegree | null {
  const f = urlOuFichier.split('?')[0].split('/').pop() ?? '';
  return CREDITS_PHOTOS_INTEGREES.find((c) => c.fichier === f) ?? null;
}

/** Ligne courte « Unsplash · photographe · Unsplash License » (cartes de l'admin) */
export const libelleCreditIntegree = (c: CreditPhotoIntegree) => `Unsplash · ${c.photographe} · ${LICENCE_UNSPLASH.nom} (${c.urlSource})`;
