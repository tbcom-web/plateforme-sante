// Visuels des soins : source unique de la photo, du dessin technique et de l'animation de chaque soin
// du catalogue (fiches, listes, bento, « Autres compétences »).
// Les photos viennent de la banque /photos (sans visage, voir CREDITS.md) et des packs de spécialités ;
// une photo fournie par le praticien pour un soin passe toujours en premier.
// Le cadrage (object-position) garde le sujet dans le cadre 16:9 ou 4:3, quelle que soit la photo d'origine.
import type { Animation, NomDessin } from '@plateforme/core';
import { site } from './site';

export type VisuelSoin = {
  /** Photo du soin (photo du praticien si elle existe, sinon banque) */
  photo: string;
  /** Cadrage de la photo (CSS object-position) */
  cadrage: string;
  /** Dessin technique de la marque (components/dessins/Dessin.astro) */
  dessin: NomDessin;
  /** Animation du soin quand elle a du sens, sinon null (le dessin suffit) */
  animation: Animation | null;
  /** Photo assez forte pour l'en-tête de la fiche (sinon, en mode mélange, illustration ou animation) */
  photoBonne: boolean;
};

// Photos de la banque jugées trop faibles pour un en-tête (sujet peu lisible, ambiance générique) :
// en mode mélange, la fiche du soin montre alors son illustration ou son animation.
const PHOTOS_FAIBLES = new Set(['soins-de-pedicurie', 'pied-diabetique', 'podologie-du-senior', 'laser']);

const VISUELS: Record<string, Omit<VisuelSoin, 'photoBonne'>> = {
  // Examen sur plateforme : trajet du centre de pression
  'bilan-podologique': { photo: '/photos/analyse-plateforme.webp', cadrage: '50% 88%', dessin: 'analyse', animation: 'trajectoire' },
  // Chaussage et semelles : courbes de niveau de la semelle
  'semelles-orthopediques': { photo: '/photos/chaussage.webp', cadrage: '50% 70%', dessin: 'semelle', animation: 'semelle' },
  // Geste de soin : le dessin (loupe sur l'ongle) suffit
  'soins-de-pedicurie': { photo: '/photos/examen-mains.webp', cadrage: '50% 45%', dessin: 'soin', animation: null },
  // Zones d'hyperpression plantaire : relevé de podoscope
  'pied-diabetique': { photo: '/photos/soins-pied-tenu.webp', cadrage: '50% 62%', dessin: 'diabete', animation: 'podoscope' },
  // Course : coureur façon laboratoire d'analyse
  'podologie-du-sport': { photo: '/photos/sport-foulee-herbe.webp', cadrage: '50% 55%', dessin: 'sport', animation: 'coureur' },
  // Croissance et marche : premiers pas
  'podologie-enfant': { photo: '/photos/enfant-herbe.webp', cadrage: '50% 62%', dessin: 'enfant', animation: 'premiers-pas' },
  // Équilibre : trajet du centre de pression
  posturologie: { photo: '/photos/posture-marche-sable.webp', cadrage: '50% 50%', dessin: 'equilibre', animation: 'trajectoire' },
  // Prévention des chutes : le dessin (polygone d'appui, oscillations) suffit
  'podologie-du-senior': { photo: '/photos/posture-escalier.webp', cadrage: '50% 60%', dessin: 'equilibre', animation: null },
  // Points d'appui sous l'avant-pied : relevé de podoscope
  'verrues-plantaires': { photo: '/photos/generale-pieds-nus.webp', cadrage: '50% 40%', dessin: 'appuis', animation: 'podoscope' },
  'ongle-incarne': { photo: '/photos/generale-pied-profil.webp', cadrage: '60% 55%', dessin: 'soin', animation: null },
  'douleur-talon': { photo: '/photos/soin-talon.webp', cadrage: '50% 50%', dessin: 'talon', animation: null },
  laser: { photo: '/photos/generale-pied-sol.webp', cadrage: '50% 55%', dessin: 'soin', animation: null },
  // Bandes adhésives du sportif : coureur
  'k-taping': { photo: '/photos/sport-course.webp', cadrage: '50% 62%', dessin: 'sport', animation: 'coureur' },
};

const PAR_DEFAUT: Omit<VisuelSoin, 'photoBonne'> = { photo: '/photos/examen-mains.webp', cadrage: '50% 45%', dessin: 'analyse', animation: null };

/** Photos fournies par le praticien pour ses soins (facultatif, clé = slug du soin) */
const photosPraticien = site.photos.soins ?? {};

/** Visuels d'un soin : photo (praticien d'abord), cadrage, dessin et animation */
export function visuelSoin(slug: string): VisuelSoin {
  const v = VISUELS[slug] ?? PAR_DEFAUT;
  const perso = photosPraticien[slug];
  // La photo du praticien est toujours jugée bonne : c'est la sienne.
  return perso ? { ...v, photo: perso, cadrage: '50% 50%', photoBonne: true } : { ...v, photoBonne: !PHOTOS_FAIBLES.has(slug) && slug in VISUELS };
}

/** Photo de la banque associée à un dessin (couvertures d'articles en mode photos, par exemple) */
const PHOTO_DESSIN: Record<NomDessin, { photo: string; cadrage: string }> = {
  analyse: { photo: '/photos/analyse-plateforme.webp', cadrage: '50% 88%' },
  semelle: { photo: '/photos/chaussage.webp', cadrage: '50% 70%' },
  soin: { photo: '/photos/examen-mains.webp', cadrage: '50% 45%' },
  diabete: { photo: '/photos/soins-pied-tenu.webp', cadrage: '50% 62%' },
  sport: { photo: '/photos/sport-foulee-herbe.webp', cadrage: '50% 55%' },
  enfant: { photo: '/photos/enfant-herbe.webp', cadrage: '50% 62%' },
  equilibre: { photo: '/photos/posture-escalier.webp', cadrage: '50% 60%' },
  talon: { photo: '/photos/soin-talon.webp', cadrage: '50% 50%' },
  appuis: { photo: '/photos/generale-pieds-nus.webp', cadrage: '50% 40%' },
};

export const photoDessin = (nom: NomDessin) => PHOTO_DESSIN[nom] ?? PHOTO_DESSIN.analyse;
