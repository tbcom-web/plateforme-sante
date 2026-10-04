// Jeux visuels : pour une spécialité (principale, secondaire facultative, personnalisation de l'admin), le
// jeu complet des visuels du site. Chaque case (accueil, panorama, chaque soin du catalogue) porte à la fois
// une illustration (dessin technique), une animation facultative et une photo de banque avec son cadrage ;
// le style visuel du praticien (illustrations, photos, mélange) choisit ensuite case par case (rendreCase).
// Source unique du site (apps/sites/src/lib/visuels*.ts) et de l'aperçu de l'admin.
//
// Les illustrations sont le visuel principal de la plateforme : adaptées aux couleurs de chaque site, sans
// personne à l'image. Les photos de banque sont un complément facultatif : `photoBonne` n'est vrai que pour
// une photo forte, sans visage, qui montre vraiment le sujet ; sinon, en mélange, l'illustration la remplace.
// Les photos viennent de la banque /photos du site (voir apps/sites/public/photos/CREDITS.md).
import { SPECIALITES, packVisuel, fusionnerPack, type Animation, type PersonnalisationPack, type Specialite } from './packs';
import type { NomDessin } from './univers';
import type { ModeVisuel } from './draft';

export type VisuelCase = {
  /** Photo de banque (ou du praticien), à afficher selon le style visuel */
  photo: string;
  /** Cadrage de la photo (CSS object-position) : garde le sujet dans un cadre 16:9 ou 4:3 */
  cadrage: string;
  /** Dessin technique de la marque (svgDessin) */
  dessin: NomDessin;
  /** Animation quand elle a du sens, sinon null (le dessin suffit) */
  animation: Animation | null;
  /** Photo assez forte pour être montrée seule (sinon, en mélange, illustration ou animation) */
  photoBonne: boolean;
};

export type JeuVisuel = {
  specialite: string;
  label: string;
  /** Accueil (hero) */
  accueil: VisuelCase;
  /** Bandeau panoramique (lieu d'exercice) */
  panorama: VisuelCase;
  /** Diaporama et galerie (6 photos au plus) */
  galerie: { photo: string; cadrage: string }[];
  /** Un visuel par soin du catalogue (slug) */
  soins: Record<string, VisuelCase>;
  /** Dessin de couverture des articles sans thème reconnu */
  couverture: NomDessin;
  /** Photo de banque associée à chaque dessin (couvertures d'articles en mode photos) */
  photosDessins: Record<NomDessin, { photo: string; cadrage: string }>;
};

/** Visuel effectivement affiché dans une case */
export type Rendu =
  | { type: 'photo'; src: string; cadrage: string }
  | { type: 'dessin'; dessin: NomDessin }
  | { type: 'animation'; animation: Animation; dessin: NomDessin };

const P = (f: string) => `/photos/${f}.webp`;

/** Cadrage par défaut de chaque photo de la banque (sujet gardé dans le cadre) */
export const CADRAGES_PHOTOS: Record<string, string> = {
  [P('analyse-plateforme')]: '50% 88%',
  [P('chaussage')]: '50% 70%',
  [P('examen-mains')]: '50% 45%',
  [P('soins-pied-tenu')]: '50% 62%',
  [P('sport-foulee-herbe')]: '50% 55%',
  [P('enfant-herbe')]: '50% 62%',
  [P('posture-marche-sable')]: '50% 50%',
  [P('posture-escalier')]: '50% 60%',
  [P('generale-pieds-nus')]: '50% 40%',
  [P('generale-pied-profil')]: '60% 55%',
  [P('soin-talon')]: '50% 50%',
  [P('generale-pied-sol')]: '50% 55%',
  [P('sport-course')]: '50% 62%',
  [P('sport-chaussure')]: '50% 62%',
  [P('sport-lacage')]: '50% 80%',
  [P('enfant-baskets')]: '50% 60%',
  [P('enfant-pied')]: '50% 70%',
  [P('posture-pieds-herbe')]: '50% 72%',
  [P('soins-bandages')]: '50% 60%',
};
const cadrage = (photo: string) => CADRAGES_PHOTOS[photo] ?? '50% 50%';
const kase = (photo: string, dessin: NomDessin, animation: Animation | null, photoBonne: boolean): VisuelCase => ({ photo, cadrage: cadrage(photo), dessin, animation, photoBonne });

/**
 * Visuels de base des soins du catalogue (podologie générale). Les spécialités ne changent que les cases
 * pour lesquelles elles ont une photo ou un dessin plus juste (SURCHARGES).
 */
export const VISUELS_SOINS: Record<string, VisuelCase> = {
  // Examen sur plateforme : trajet du centre de pression
  'bilan-podologique': kase(P('analyse-plateforme'), 'analyse', 'trajectoire', true),
  // Chaussage et semelles : courbes de niveau de la semelle (photo de chaussage peu parlante)
  'semelles-orthopediques': kase(P('chaussage'), 'semelle', 'semelle', false),
  // Geste de soin : le dessin (loupe sur l'ongle) suffit
  'soins-de-pedicurie': kase(P('examen-mains'), 'soin', null, false),
  // Zones d'hyperpression plantaire : relevé de podoscope
  'pied-diabetique': kase(P('soins-pied-tenu'), 'diabete', 'podoscope', false),
  // Course : coureur façon laboratoire d'analyse
  'podologie-du-sport': kase(P('sport-foulee-herbe'), 'sport', 'coureur', true),
  // Croissance et marche : premiers pas
  'podologie-enfant': kase(P('enfant-herbe'), 'enfant', 'premiers-pas', true),
  // Équilibre : trajet du centre de pression
  posturologie: kase(P('posture-marche-sable'), 'equilibre', 'trajectoire', true),
  // Prévention des chutes : le dessin (polygone d'appui, oscillations) suffit
  'podologie-du-senior': kase(P('posture-escalier'), 'equilibre', null, false),
  // Points d'appui sous l'avant-pied : relevé de podoscope
  'verrues-plantaires': kase(P('generale-pieds-nus'), 'appuis', 'podoscope', true),
  'ongle-incarne': kase(P('generale-pied-profil'), 'soin', null, true),
  'douleur-talon': kase(P('soin-talon'), 'talon', null, true),
  laser: kase(P('generale-pied-sol'), 'soin', null, false),
  // Bandes adhésives du sportif : coureur (la photo ne montre pas de bande)
  'k-taping': kase(P('sport-course'), 'sport', 'coureur', false),
};

/** Soin hors catalogue : dessin d'analyse, photo jamais montrée seule */
export const VISUEL_SOIN_PAR_DEFAUT: VisuelCase = kase(P('examen-mains'), 'analyse', null, false);

/** Photo de banque associée à chaque dessin (couvertures d'articles en mode photos) */
export const PHOTOS_DESSINS: Record<NomDessin, { photo: string; cadrage: string }> = {
  analyse: { photo: P('analyse-plateforme'), cadrage: '50% 88%' },
  semelle: { photo: P('chaussage'), cadrage: '50% 70%' },
  soin: { photo: P('examen-mains'), cadrage: '50% 45%' },
  diabete: { photo: P('soins-pied-tenu'), cadrage: '50% 62%' },
  sport: { photo: P('sport-foulee-herbe'), cadrage: '50% 55%' },
  enfant: { photo: P('enfant-herbe'), cadrage: '50% 62%' },
  equilibre: { photo: P('posture-escalier'), cadrage: '50% 60%' },
  talon: { photo: P('soin-talon'), cadrage: '50% 50%' },
  appuis: { photo: P('generale-pieds-nus'), cadrage: '50% 40%' },
};

type Surcharges = {
  /** Photo d'accueil jugée forte (sinon illustration ou animation à privilégier) */
  accueilBonne: boolean;
  panoramaBonne: boolean;
  /** Cases de soins propres à la spécialité */
  soins?: Record<string, Partial<VisuelCase>>;
  /** Photos associées aux dessins (couvertures) propres à la spécialité */
  dessins?: Partial<Record<NomDessin, string>>;
};

/** Ce que chaque spécialité change au jeu de base, choisi d'après les photos de la banque */
const SURCHARGES: Record<string, Surcharges> = {
  // Salle vide et pieds dans la pénombre : l'illustration porte l'accueil et le bandeau.
  generale: { accueilBonne: false, panoramaBonne: false },
  sport: {
    accueilBonne: true,
    panoramaBonne: true,
    soins: {
      // Chaussure de course seule dans l'herbe : nette, sans personne, juste pour des semelles de sport.
      'semelles-orthopediques': { photo: P('sport-chaussure'), photoBonne: true },
    },
    dessins: { semelle: P('sport-chaussure') },
  },
  posture: {
    accueilBonne: true,
    panoramaBonne: true,
    soins: {
      // Pieds nus posés sur l'herbe, à l'arrêt : la posture debout ; la marche sur le sable reste au bandeau.
      posturologie: { photo: P('posture-pieds-herbe'), photoBonne: true },
      'bilan-podologique': { photo: P('analyse-plateforme'), photoBonne: true },
    },
    dessins: { equilibre: P('posture-pieds-herbe') },
  },
  enfant: {
    accueilBonne: true,
    panoramaBonne: true,
    soins: {
      // Baskets d'enfant aux pieds : chaussage et semelles de l'enfant.
      'semelles-orthopediques': { photo: P('enfant-baskets'), photoBonne: true },
      // Premiers appuis debout : photo tendre mais peu explicite pour un bilan.
      'bilan-podologique': { photo: P('enfant-pied'), dessin: 'enfant', animation: 'premiers-pas', photoBonne: false },
    },
    dessins: { semelle: P('enfant-baskets') },
  },
  soins: {
    accueilBonne: true,
    panoramaBonne: false,
    soins: {
      // Patient allongé, chaussettes : soins au cabinet ou à domicile ; reste en complément.
      'podologie-du-senior': { photo: P('soins-bandages'), photoBonne: false },
    },
  },
};

const unique = <T>(l: T[]) => [...new Set(l)];

function soinsDe(spec: Specialite): Record<string, VisuelCase> {
  const s = SURCHARGES[spec.value]?.soins ?? {};
  return Object.fromEntries(
    Object.entries(s).map(([slug, v]) => {
      const base = VISUELS_SOINS[slug] ?? VISUEL_SOIN_PAR_DEFAUT;
      const photo = v.photo ?? base.photo;
      return [slug, { ...base, ...v, photo, cadrage: v.cadrage ?? (v.photo ? cadrage(photo) : base.cadrage) }];
    }),
  );
}

/**
 * Jeu visuel complet. La principale donne l'accueil, le panorama, l'animation et les dessins signatures ;
 * la secondaire ajoute des photos à la galerie (comme fusionnerSpecialites) et ses cases de soins propres,
 * seulement pour ses soins mis en avant que la principale ne redéfinit pas. `perso` (et `persoSecondaire`) :
 * personnalisation de l'admin (table packs_visuels), qui remplace photos et animation de la spécialité.
 */
export function jeuVisuel(
  principale: string,
  secondaire?: string | null,
  perso?: PersonnalisationPack | null,
  persoSecondaire?: PersonnalisationPack | null,
): JeuVisuel {
  const p = fusionnerPack(packVisuel(principale), perso);
  const s = secondaire && secondaire !== p.value ? fusionnerPack(packVisuel(secondaire), persoSecondaire) : null;
  const sur = SURCHARGES[p.value] ?? { accueilBonne: false, panoramaBonne: false };
  const dessins = p.dessins?.length ? p.dessins : (['analyse'] as NomDessin[]);
  const accueilPerso = Boolean(perso?.photos?.accueil);
  const panoramaPerso = Boolean(perso?.photos?.panorama);

  const soins: Record<string, VisuelCase> = { ...VISUELS_SOINS };
  const propres = soinsDe(p);
  Object.assign(soins, propres);
  if (s) {
    const enAvant = new Set(s.soins ?? []);
    for (const [slug, v] of Object.entries(soinsDe(s))) if (enAvant.has(slug) && !(slug in propres)) soins[slug] = v;
  }

  const diaporama = s
    ? unique([...p.photos.diaporama.slice(0, 3), ...s.photos.diaporama.slice(0, 2), ...p.photos.diaporama.slice(3)])
    : p.photos.diaporama;

  const photosDessins = { ...PHOTOS_DESSINS };
  for (const spec of [s, p]) {
    if (!spec) continue;
    for (const [nom, photo] of Object.entries(SURCHARGES[spec.value]?.dessins ?? {})) {
      photosDessins[nom as NomDessin] = { photo: photo as string, cadrage: cadrage(photo as string) };
    }
  }

  return {
    specialite: p.value,
    label: p.label,
    accueil: { photo: p.photos.accueil, cadrage: cadrage(p.photos.accueil), dessin: dessins[0], animation: p.animation, photoBonne: accueilPerso || sur.accueilBonne },
    panorama: { photo: p.photos.panorama, cadrage: cadrage(p.photos.panorama), dessin: dessins[1] ?? dessins[0], animation: null, photoBonne: panoramaPerso || sur.panoramaBonne },
    galerie: diaporama.slice(0, 6).map((photo) => ({ photo, cadrage: cadrage(photo) })),
    soins,
    couverture: dessins[0],
    photosDessins,
  };
}

/** Jeux intégrés, un par spécialité (avant personnalisation de l'admin) */
export const JEUX: JeuVisuel[] = SPECIALITES.map((s) => jeuVisuel(s.value));

/**
 * Case d'un soin dans un jeu. La photo du praticien pour ce soin passe toujours en premier et est jugée
 * bonne (c'est la sienne) ; un slug inconnu reçoit la case par défaut.
 */
export function visuelSoinJeu(jeu: JeuVisuel, slug: string, photoPraticien?: string): VisuelCase {
  const v = jeu.soins[slug] ?? VISUEL_SOIN_PAR_DEFAUT;
  return photoPraticien ? { ...v, photo: photoPraticien, cadrage: '50% 50%', photoBonne: true } : v;
}

/**
 * Visuel affiché dans une case, selon le style visuel du praticien et le contexte :
 * - « accueil » (hero, panorama), « liste » (bento, listes de compétences, autres soins), « page » (fiche d'un soin).
 * Règles (celles du site) :
 * - photos : toujours la photo (celle du praticien d'abord), jamais d'animation ;
 * - illustrations : l'animation si elle est active et que la case en a une (accueil et page, jamais en liste),
 *   sinon la photo du praticien si elle existe (ses photos s'affichent toujours), sinon le dessin ;
 * - mixte : liste → dessin (les listes restent illustrées) ; page → photo si elle est bonne ou fournie par le
 *   praticien, sinon animation (si active) ou dessin ; accueil → animation si active, sinon photo.
 * `animationActive` (vrai par défaut) : case « animation d'accueil » du praticien pour l'accueil ; toujours
 * vrai pour la fiche d'un soin.
 */
export function rendreCase(
  c: VisuelCase,
  mode: ModeVisuel,
  contexte: 'accueil' | 'liste' | 'page',
  opts: { photoPraticien?: string; animationActive?: boolean } = {},
): Rendu {
  const { photoPraticien, animationActive = true } = opts;
  const photo: Rendu = photoPraticien ? { type: 'photo', src: photoPraticien, cadrage: '50% 50%' } : { type: 'photo', src: c.photo, cadrage: c.cadrage };
  const anime: Rendu | null = animationActive && c.animation && contexte !== 'liste' ? { type: 'animation', animation: c.animation, dessin: c.dessin } : null;
  const dessin: Rendu = { type: 'dessin', dessin: c.dessin };
  if (mode === 'photos') return photo;
  if (mode === 'illustrations') return anime ?? (photoPraticien ? photo : dessin);
  // Mélange
  if (contexte === 'liste') return dessin;
  if (contexte === 'page') return photoPraticien || c.photoBonne ? photo : (anime ?? dessin);
  return anime ?? photo;
}
