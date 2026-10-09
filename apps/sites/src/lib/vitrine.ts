// Visuels « vitrine » des sujets du cabinet : premier écran de l'accueil (thème n° 1), grands blocs des sujets principaux,
// en-tête des pages de thème. UN SEUL point d'adaptation, `visuelTheme`, pour brancher plus tard les illustrations héros
// dédiées du core (illustrationTheme) sans toucher aux gabarits.
// Règles :
// - style visuel du praticien (site.theme.modeVisuel, réglé dans /creer et /mon-site) : « photos » → photo du jeu de photos
//   de la spécialité du thème (photo d'accueil du praticien d'abord pour le premier écran), teintée par la gamme ;
//   « illustrations » et « mixte » → illustration (les illustrations d'abord, règle de Paul) ;
// - illustration : uniquement des dessins et animations déjà validés (dessins.ts, ligne.ts, animations/*), aucune forme
//   nouvelle ; animation seulement au premier écran du gabarit classique (registre relevé) ;
// - pas deux fois la même image en haut de l'accueil : le bloc du thème n° 1 prend le second dessin (ou la seconde photo)
//   de son sujet, le premier écran ayant le principal.
import { animationDuHeros, kitDeSpecialite, lireCleHerosDiabete, packVisuel, themeParId, themeIllustre, type Animation, type NomDessin, type NomLigne } from '@plateforme/core';
import { site } from './site';
import { jeu } from './visuels-soins';
import { modeVisuel } from './visuels';
import { navigation } from './navigation';
import { legendeLigne, ligneDuSoin } from './gabarits';
import { illustrationActivite, photoActivite } from './activites';

type Dessins = { dessin: NomDessin; ligne: NomLigne; animation: Animation | null };
/** Dessins validés de chaque sujet : principal (premier écran, page du thème) et second (bloc du thème n° 1 sur l'accueil) */
const DESSINS_THEME: Record<string, { principal: Dessins; second: Omit<Dessins, 'animation'> }> = {
  sport: { principal: { dessin: 'sport', ligne: 'marche', animation: 'coureur' }, second: { dessin: 'taping', ligne: 'chaussure-course' } },
  diabete: { principal: { dessin: 'diabete', ligne: 'monofilament', animation: null }, second: { dessin: 'soin', ligne: 'pieds-dessus' } },
  ongles: { principal: { dessin: 'orthonyxie', ligne: 'orthonyxie', animation: null }, second: { dessin: 'ongle', ligne: 'ongle' } },
  enfant: { principal: { dessin: 'enfant', ligne: 'premiers-pas', animation: 'premiers-pas' }, second: { dessin: 'analyse', ligne: 'empreintes' } },
  senior: { principal: { dessin: 'senior', ligne: 'senior-canne', animation: null }, second: { dessin: 'domicile', ligne: 'domicile' } },
  semelles: { principal: { dessin: 'semelle', ligne: 'semelle', animation: 'semelle' }, second: { dessin: 'analyse', ligne: 'empreintes' } },
  // Pédicurie : jamais d'instruments en premier écran (retour de l'atelier du 2026-10-07 : « il faut rassurer ») : les pieds
  pedicurie: { principal: { dessin: 'soin', ligne: 'pieds-dessus', animation: null }, second: { dessin: 'cors-durillons', ligne: 'cor' } },
  posture: { principal: { dessin: 'equilibre', ligne: 'empreintes', animation: 'trajectoire' }, second: { dessin: 'appuis', ligne: 'pied-dessous' } },
};
const DEFAUT: (typeof DESSINS_THEME)[string] = { principal: { dessin: 'analyse', ligne: 'empreintes', animation: 'podoscope' }, second: { dessin: 'appuis', ligne: 'pied-dessous' } };

export type VisuelTheme =
  | { type: 'photo'; src: string; cadrage: string }
  | { type: 'dessin'; dessin: NomDessin; ligne: NomLigne; animation: Animation | null; heros?: string; /** Illustration VALIDÉE de l'activité (lib/activites.ts) à la place du dessin du thème */ svg?: string;
    /** Héros d'un univers (univers-diabete.ts, clé `heros:diabete-<id>:<registre>`) VALIDÉ par Paul, venu du kit illustré du site */ herosUnivers?: string };

/** Photo seulement si le praticien a choisi le style « photos » */
export const vitrinePhoto = modeVisuel === 'photos';

/** Photos candidates d'un sujet, dans l'ordre : jeu du site s'il est de la même spécialité, sinon jeu intégré de la spécialité */
function photosTheme(id: string | null): { src: string; cadrage: string }[] {
  // Recette du studio : ses photos (tirées de la banque pour les sujets) d'abord
  const recette = (site.visuels.photosRecette ?? []).map((src) => ({ src, cadrage: '50% 50%' }));
  if (recette.length) return recette;
  const specialite = themeParId(id)?.specialite ?? site.visuels.specialite;
  if (specialite === site.visuels.specialite) return [jeu.accueil, ...jeu.galerie].map((p) => ({ src: p.photo, cadrage: p.cadrage ?? '50% 50%' })).filter((p) => p.src);
  const p = packVisuel(specialite).photos;
  return [p.accueil, p.panorama, ...p.diaporama].filter(Boolean).map((src) => ({ src, cadrage: '50% 50%' }));
}

/**
 * Visuel d'un sujet (id de thème ; null = sujet général du cabinet). `usage` : « principal » (premier écran, page du
 * thème) ou « second » (bloc du thème n° 1 sous le premier écran). `deja` : photos déjà montrées (jamais deux fois).
 */
export function visuelTheme(id: string | null, usage: 'principal' | 'second' = 'principal', deja: Set<string> = new Set()): VisuelTheme {
  const d = (id && DESSINS_THEME[id]) || DEFAUT;
  // Photo choisie par le praticien pour ce sujet (« Personnaliser mon site ») : prioritaire, quel que soit le style
  const perso = id ? site.photos.sujets?.[id] : undefined;
  if (perso && usage === 'principal' && !deja.has(perso)) { deja.add(perso); return { type: 'photo', src: perso, cadrage: '50% 50%' }; }
  // Usage principal : l'illustration « héros » composée du thème (core, heros-themes.ts, illustrationTheme), sinon le dessin
  if (!vitrinePhoto) return usage === 'second' ? { type: 'dessin', ...d.second, animation: null } : { type: 'dessin', ...d.principal, ...(id && themeIllustre(id) ? { heros: id } : {}) };
  const candidates = photosTheme(id);
  const choix = candidates.find((p) => !deja.has(p.src)) ?? candidates[0] ?? { src: jeu.accueil.photo, cadrage: '50% 50%' };
  deja.add(choix.src);
  return { type: 'photo', ...choix };
}

/**
 * Description textuelle de l'image d'un sujet ou d'un soin, pour les versions Markdown et llms (agents) : jamais affichée sur
 * le site (règle de Paul : pas de légende visible sous les illustrations). Indépendante du modèle et du style visuel (SEO
 * identique) : elle dit ce que représente l'illustration du sujet.
 */
// Description absente (dessin récent sans libellé) : ligne omise plutôt qu'un échec de construction du site.
const phrase = (t: string | undefined) => (t ? `Illustration : ${t.charAt(0).toLowerCase()}${t.slice(1)}.` : '');
export const descriptionTheme = (id: string) => phrase(legendeLigne(((id && DESSINS_THEME[id]) || DEFAUT).principal.ligne));
export const descriptionSoin = (slug: string) => phrase(legendeLigne(ligneDuSoin(slug)));

/** Thème n° 1 du praticien, sinon null */
export const themeUn = navigation.principaux[0]?.theme.id ?? null;

/** Sujet du héros du premier écran : celui choisi par une recette du studio (parmi les sujets principaux), sinon le n° 1 */
export const themeHeros = navigation.principaux.some((t) => t.theme.id === site.theme.herosSujet) ? site.theme.herosSujet! : themeUn;

// Accueil : premier écran puis blocs des sujets principaux, sans répéter une photo.
const montrees = new Set<string>();
/** Visuel du premier écran choisi par la recette (dé « Visuel du premier écran ») : auto, photo, illustration, animation */
const visuelHerosChoisi = (site.modele.variantes as Record<string, string> | undefined)?.['visuel-heros'];
/**
 * Animation du visuel du premier écran (heros-anime.ts) : à la place de l'illustration ou de la photo, même cadre ; null sinon.
 * Site publié : jamais une animation d'illustration dont les images de base ne sont pas validées (statuts inconnus ici).
 */
export const animationPremierEcran = animationDuHeros(site.modele.variantes as never, themeHeros);
/** Visuel du premier écran : photo d'accueil du praticien d'abord (style « photos » ou visuel « photo »), sinon le visuel du thème n° 1 */
// Activité du praticien (#basket…) avec des visuels VALIDÉS pour le sujet du héros : sa photo (style « photos ») ou son
// illustration (styles illustrés) ; une animation garde celle du thème ; sans visuel validé : visuel du thème (repli)
// Héros de l'univers diabète (univers-diabete.ts) : seulement s'il est le héros du kit illustré du site, kit qui ne retient que des
// visuels VALIDÉS par Paul (kits-visuels.ts, kitVisuelSite : praticien) ; jamais avant. Sujet du héros = diabète.
const herosUnivers = themeHeros === 'diabete' && lireCleHerosDiabete(kitDeSpecialite(site.visuels.specialite)?.heros) ? kitDeSpecialite(site.visuels.specialite)!.heros : undefined;
const photoAct = themeHeros ? photoActivite(themeHeros) : null;
const svgAct = themeHeros ? illustrationActivite(themeHeros) : null;
export const visuelPremierEcran: VisuelTheme = (visuelHerosChoisi === 'photo' || site.theme.accueilPhoto || (vitrinePhoto && visuelHerosChoisi !== 'illustration')) && site.photos.accueil
  ? (montrees.add(site.photos.accueil), { type: 'photo', src: site.photos.accueil, cadrage: '50% 50%' })
  : photoAct && ((vitrinePhoto && visuelHerosChoisi !== 'illustration') || visuelHerosChoisi === 'photo')
    ? (montrees.add(photoAct), { type: 'photo', src: photoAct, cadrage: '50% 50%' })
    : ((v: VisuelTheme): VisuelTheme => (v.type === 'dessin' && svgAct ? { ...v, svg: svgAct, heros: undefined } : v.type === 'dessin' && herosUnivers ? { ...v, herosUnivers, heros: undefined } : v))(visuelTheme(themeHeros, 'principal', montrees));
/** Visuels des blocs des sujets principaux de l'accueil, dans l'ordre de préférence (le sujet du héros prend son second visuel) */
export const visuelsSujets: VisuelTheme[] = navigation.principaux.map((t) => visuelTheme(t.theme.id, t.theme.id === themeHeros && !(vitrinePhoto && site.photos.accueil) ? 'second' : 'principal', montrees));
