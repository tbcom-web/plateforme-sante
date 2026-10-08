// Jeux de photos : ensembles de photos (accueil, panorama, galerie, photo par soin) préparés par le super admin
// pour une spécialité (table jeux_photos, migration 0016). À la création d'un site et à chaque changement de
// spécialité principale, un jeu partagé actif de la spécialité est tiré au hasard (choisirJeuPhotos) ; le
// praticien ne le choisit pas. Le jeu remplace les photos du jeu visuel (jeux.ts) via la personnalisation
// (PersonnalisationPack), sans toucher aux illustrations ni aux animations.
//
// Jeux exclusifs (photos premium) : réservés à un site (siteId). Une photo Adobe Stock n'est licenciée que pour
// un client : un jeu « adobe » (ou « praticien ») n'est jamais partagé. Voir docs/jeux-photos.md.
import { SPECIALITES, type PersonnalisationPack } from './packs';
import { CADRAGES_PHOTOS, VISUEL_SOIN_PAR_DEFAUT, type JeuVisuel } from './jeux';
import { clePhoto, EFFETS_SUJET, ordonnerPhotos, retireDesSujets, scoreMoyen, type PoidsAssets } from './assets-poids';
import { THEMES } from './themes';
import { imageExclue, sansImagesExclues } from './contexte-images';
import { estImageDemo, estImageGeneree } from './photos-libres';

/** Sujets (thèmes actifs + « général ») d'une spécialité : surcharges de sujets de Paul sur les photos */
export const sujetsDeSpecialite = (specialite: string): string[] => [
  ...THEMES.filter((t) => t.statut === 'actif' && t.specialite === specialite).map((t) => t.id),
  ...(specialite === 'generale' ? ['general'] : []),
];

export const SOURCES_JEU_PHOTOS = ['banque', 'adobe', 'praticien'] as const;
export type SourceJeuPhotos = (typeof SOURCES_JEU_PHOTOS)[number];

export const LIBELLES_SOURCES: Record<SourceJeuPhotos, string> = {
  banque: 'Banque de la plateforme',
  adobe: 'Adobe Stock (licence au nom du client)',
  praticien: 'Photos fournies par le praticien',
};

export type PhotosJeu = {
  accueil: string;
  panorama: string;
  /** Diaporama et galerie, 6 au plus */
  galerie: string[];
  /** Photo par soin du catalogue (slug → URL) */
  soins: Record<string, string>;
  /** Cadrage (CSS object-position) par URL de photo, facultatif */
  cadrages?: Record<string, string>;
};

export type JeuPhotos = {
  id: string;
  nom: string;
  specialite: string;
  photos: PhotosJeu;
  source: SourceJeuPhotos;
  /** null : jeu partagé ; sinon jeu exclusif de ce site */
  siteId: string | null;
  actif: boolean;
};

export const GALERIE_MAX = 6;

/** Photos de la banque intégrée (apps/sites/public/photos, copiée dans l'admin par scripts/copier-photos.mjs) */
export const PHOTOS_INTEGREES: string[] = [
  'accueil-observation-marche', 'analyse-plateforme', 'cabinet-lumiere', 'chaussage', 'enfant-baskets', 'enfant-bebe',
  'enfant-chaussons', 'enfant-chaussures', 'enfant-herbe', 'enfant-pied', 'examen-mains', 'generale-parquet',
  'generale-pied-profil', 'generale-pied-sol', 'generale-pieds-nus', 'posture-empreintes', 'posture-escalier',
  'posture-marche-sable', 'posture-pieds-herbe', 'soin-talon', 'soins-bandages', 'soins-pied-tenu', 'sport-chaussure',
  'sport-course', 'sport-foulee-herbe', 'sport-lacage', 'sport-trail',
].map((f) => `/photos/${f}.webp`);

export const estPhotoIntegree = (url: string) => PHOTOS_INTEGREES.includes(url);

/**
 * Dossiers du stockage Supabase « photos » pour les jeux :
 * - banque/jeux/<specialite>/ : jeux partagés (dossier réservé à l'admin) ;
 * - banque/sites/<siteId>/ : jeux exclusifs d'un site (photos premium, Adobe Stock).
 */
export const dossierJeuPartage = (specialite: string) => `banque/jeux/${specialite}`;
export const dossierJeuExclusif = (siteId: string) => `banque/sites/${siteId}`;

/**
 * URL acceptée dans un jeu : photo de la banque intégrée, ou photo du dossier « banque » du stockage du projet.
 * Une photo d'un dossier exclusif (banque/sites/<id>/) n'est acceptée que dans un jeu exclusif de ce même site :
 * une photo sous licence d'un client ne peut jamais passer dans un jeu partagé ni chez un autre client.
 */
export function photoJeuAutorisee(url: string, prefixeStockage: string, siteId: string | null): boolean {
  if (estPhotoIntegree(url)) return true;
  if (!prefixeStockage || !url.startsWith(`${prefixeStockage}banque/`) || url.length > 400) return false;
  const reste = url.slice(prefixeStockage.length);
  if (reste.includes('..')) return false;
  if (reste.startsWith('banque/sites/')) return Boolean(siteId) && reste.startsWith(`${dossierJeuExclusif(siteId!)}/`);
  return true;
}

const CADRAGE = /^\d{1,3}% \d{1,3}%$/;
const SLUG = /^[a-z0-9-]{1,80}$/;
const UUID = /^[0-9a-f-]{36}$/;

/** Photos d'un jeu nettoyées : URLs non autorisées retirées, galerie bornée, cadrages valides seulement. */
export function nettoyerPhotosJeu(brut: unknown, prefixeStockage: string, siteId: string | null): PhotosJeu {
  const b = (brut && typeof brut === 'object' ? brut : {}) as Record<string, unknown>;
  // Image de DÉMONSTRATION (kit-demo.ts) : jamais dans un jeu de photos (il est publié)
  const ok = (v: unknown) => { const s = String(v ?? '').trim(); return s && !estImageDemo(s) && photoJeuAutorisee(s, prefixeStockage, siteId) ? s : ''; };
  // Galerie (page « Le cabinet ») : jamais une image générée par IA (elle serait prise pour le vrai cabinet)
  const galerie = [...new Set((Array.isArray(b.galerie) ? b.galerie : []).map(ok).filter((u) => u && !estImageGeneree(u)))].slice(0, GALERIE_MAX);
  const soins: Record<string, string> = {};
  for (const [slug, url] of Object.entries((b.soins && typeof b.soins === 'object' ? b.soins : {}) as Record<string, unknown>)) {
    const u = ok(url);
    if (SLUG.test(slug) && u) soins[slug] = u;
  }
  const photos: PhotosJeu = { accueil: ok(b.accueil), panorama: ok(b.panorama), galerie, soins };
  const utilisees = new Set([photos.accueil, photos.panorama, ...galerie, ...Object.values(soins)]);
  const cadrages: Record<string, string> = {};
  for (const [url, c] of Object.entries((b.cadrages && typeof b.cadrages === 'object' ? b.cadrages : {}) as Record<string, unknown>)) {
    if (utilisees.has(url) && typeof c === 'string' && CADRAGE.test(c)) cadrages[url] = c;
  }
  return Object.keys(cadrages).length ? { ...photos, cadrages } : photos;
}

/** Toutes les URLs d'un jeu (planche contact, licences) */
export const photosDuJeu = (p: PhotosJeu): string[] =>
  [...new Set([p.accueil, p.panorama, ...p.galerie, ...Object.values(p.soins)].filter(Boolean))];

/** Contrôle d'un jeu avant enregistrement ; renvoie le jeu nettoyé ou la liste des erreurs. */
export function validerJeuPhotos(
  brut: Partial<Omit<JeuPhotos, 'id'>>,
  prefixeStockage: string,
): { jeu: Omit<JeuPhotos, 'id'> | null; erreurs: string[] } {
  const erreurs: string[] = [];
  const nom = String(brut.nom ?? '').trim().slice(0, 80);
  if (nom.length < 2) erreurs.push('Donnez un nom au jeu.');
  const specialite = String(brut.specialite ?? '');
  if (!SPECIALITES.some((s) => s.value === specialite)) erreurs.push('Spécialité inconnue.');
  const source = (SOURCES_JEU_PHOTOS as readonly string[]).includes(String(brut.source)) ? (brut.source as SourceJeuPhotos) : 'banque';
  const siteId = brut.siteId && UUID.test(brut.siteId) ? brut.siteId : null;
  // Adobe Stock : une licence ne couvre qu'un client. Photos du praticien : jamais partagées non plus.
  if (source !== 'banque' && !siteId) erreurs.push('Un jeu Adobe Stock ou de photos du praticien est toujours réservé à un seul site.');
  const photos = nettoyerPhotosJeu(brut.photos, prefixeStockage, siteId);
  if (!photosDuJeu(photos).length) erreurs.push('Ajoutez au moins une photo.');
  return erreurs.length ? { jeu: null, erreurs } : { jeu: { nom, specialite, photos, source, siteId, actif: brut.actif !== false }, erreurs };
}

/** Ligne de la table jeux_photos → JeuPhotos */
export function jeuPhotosDepuisLigne(l: { id: string; nom: string; specialite: string; photos: unknown; source: string; site_id: string | null; actif: boolean }): JeuPhotos {
  const p = (l.photos ?? {}) as Partial<PhotosJeu>;
  return {
    id: l.id,
    nom: l.nom,
    specialite: l.specialite,
    source: (SOURCES_JEU_PHOTOS as readonly string[]).includes(l.source) ? (l.source as SourceJeuPhotos) : 'banque',
    siteId: l.site_id,
    actif: l.actif,
    photos: {
      accueil: p.accueil ?? '',
      panorama: p.panorama ?? '',
      galerie: Array.isArray(p.galerie) ? p.galerie : [],
      soins: p.soins && typeof p.soins === 'object' ? p.soins : {},
      ...(p.cadrages && typeof p.cadrages === 'object' ? { cadrages: p.cadrages } : {}),
    },
  };
}

/** Le jeu peut-il être affiché par ce site ? (même règle que jeu_photos_autorise en base) */
export const jeuPhotosAutorise = (jeu: Pick<JeuPhotos, 'actif' | 'siteId' | 'specialite'>, siteId: string, specialite: string) =>
  jeu.actif && (jeu.siteId === null ? jeu.specialite === specialite : jeu.siteId === siteId);

/**
 * Tirage du jeu d'un site : au hasard parmi les jeux partagés actifs de la spécialité (jamais un jeu exclusif,
 * jamais un jeu Adobe). Aucun jeu → '' : photos intégrées du jeu visuel.
 * Avec les notes des photos (`poids`, /admin/illustrations) : tirage PONDÉRÉ, les jeux aux photos les mieux notées sortent
 * plus souvent (poids du jeu = 2^(score moyen de ses photos), photos « retirées » comprises), sans jamais exclure un jeu.
 */
export function choisirJeuPhotos(
  jeux: (Pick<JeuPhotos, 'id' | 'specialite' | 'source' | 'siteId' | 'actif'> & { photos?: PhotosJeu })[],
  specialite: string,
  aleatoire: () => number = Math.random,
  poids?: PoidsAssets | null,
): string {
  const candidats = jeux.filter((j) => j.actif && j.siteId === null && j.source === 'banque' && j.specialite === specialite);
  if (!candidats.length) return '';
  const masses = candidats.map((j) => {
    const photos = j.photos ? photosDuJeu(j.photos) : [];
    const cles = photos.map(clePhoto).filter((x): x is string => Boolean(x));
    if (!poids || !cles.length) return 1;
    // Photos retirées par Paul des sujets de la spécialité : comptées comme « retirées » (le jeu sort moins souvent)
    const sujets = sujetsDeSpecialite(specialite);
    const retirees = cles.filter((k) => retireDesSujets(k, sujets, poids)).length;
    return 2 ** (scoreMoyen(cles, poids) + (EFFETS_SUJET.retrait * retirees) / cles.length);
  });
  const total = masses.reduce((a, b) => a + b, 0);
  let r = Math.min(0.999999, Math.max(0, aleatoire())) * total;
  for (let i = 0; i < candidats.length; i++) {
    r -= masses[i];
    if (r < 0) return candidats[i].id;
  }
  return candidats[candidats.length - 1].id;
}

/**
 * Personnalisation de spécialité (jeuVisuel(…, perso)) tirée d'un jeu de photos. `base` : personnalisation de
 * la banque visuelle (packs_visuels), dont l'animation est conservée ; les photos du jeu passent devant.
 * `poids` (notes des photos) : la galerie commence par les photos les mieux notées.
 */
export function persoDuJeuPhotos(jeu: Pick<JeuPhotos, 'photos'> | null | undefined, base?: PersonnalisationPack | null, poids?: PoidsAssets | null, sujets?: readonly string[] | null): PersonnalisationPack | null {
  if (!jeu) return base ?? null;
  // Notes des photos : galerie de la mieux à la moins bien notée, photos « retirées » (ou retirées par Paul des sujets du site)
  // enlevées s'il en reste au moins 3
  const p0 = poids ? { ...jeu.photos, galerie: ordonnerPhotos(jeu.photos.galerie, poids, 3, sujets) } : jeu.photos;
  // Photos exclues (contexte-images.ts : ≤ 2 ★, retirées, à retravailler) : jamais posées, la banque prend le relais
  const p = { ...p0, accueil: imageExclue(p0.accueil) ? '' : p0.accueil, panorama: imageExclue(p0.panorama) ? '' : p0.panorama, galerie: sansImagesExclues(p0.galerie), soins: Object.fromEntries(Object.entries(p0.soins).filter(([, u]) => !imageExclue(u))) };
  const b = base?.photos ?? {};
  return {
    ...(base ?? {}),
    photos: {
      accueil: p.accueil || b.accueil || '',
      panorama: p.panorama || b.panorama || '',
      diaporama: p.galerie.length ? p.galerie : b.diaporama ?? [],
    },
    ...(Object.keys(p.soins).length ? { soins: p.soins } : {}),
    ...(p.cadrages && Object.keys(p.cadrages).length ? { cadrages: p.cadrages } : {}),
  };
}

/**
 * Complète un jeu visuel (jeuVisuel) avec ce que la personnalisation apporte en plus des photos de spécialité :
 * photo par soin (jugée bonne : choisie par l'admin) et cadrages. Sans soins ni cadrages, le jeu est inchangé.
 */
export function completerJeuVisuel(jeu: JeuVisuel, perso?: PersonnalisationPack | null): JeuVisuel {
  const soinsPerso = perso?.soins ?? {};
  const cadrages = perso?.cadrages ?? {};
  if (!Object.keys(soinsPerso).length && !Object.keys(cadrages).length) return jeu;
  const recadrer = <T extends { photo: string; cadrage: string }>(c: T): T => (cadrages[c.photo] ? { ...c, cadrage: cadrages[c.photo] } : c);
  const soins = { ...jeu.soins };
  for (const [slug, photo] of Object.entries(soinsPerso)) {
    if (imageExclue(photo)) continue;
    soins[slug] = { ...(jeu.soins[slug] ?? VISUEL_SOIN_PAR_DEFAUT), photo, cadrage: cadrages[photo] ?? CADRAGES_PHOTOS[photo] ?? '50% 50%', photoBonne: true };
  }
  return {
    ...jeu,
    accueil: recadrer(jeu.accueil),
    panorama: recadrer(jeu.panorama),
    galerie: jeu.galerie.map(recadrer),
    soins: Object.fromEntries(Object.entries(soins).map(([k, v]) => [k, recadrer(v)])),
  };
}
