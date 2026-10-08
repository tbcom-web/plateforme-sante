// Données des nouveaux premiers écrans (packages/core/src/heros-photo.ts) pour le site publié : variante choisie par la recette
// (variantes.accueil, tous gabarits), photos (style « Photos » : photo d'accueil du praticien, photos de la recette, jeu de la
// spécialité ; sinon photos importées par le praticien), textes et liens identiques au premier écran des gabarits.
import { estAnimationEntete, gabaritModele, VARIANTES_PAR_DEFAUT, estPremierEcranNouveau, herosRenduPossible, photosMontrees, styleCouleursHeros, motLongTitre, type DonneesHeros, type PhotoHeros, type TransitionDiaporama, TRANSITIONS_DIAPORAMA } from '@plateforme/core';
import { site } from './site';
import { discipline } from './pack';
import { jeu } from './visuels-soins';
import { photoResponsive } from './visuels';
import { vitrinePhoto, visuelPremierEcran, animationPremierEcran } from './vitrine';
import { navigation } from './navigation';
import { nomLieu } from './gabarits';
import { noms, telLien, lienRdv, rdvEnLigne, viaPlateforme, lieu, localisation, titreMetierAffiche, aLaVille, aTelephone, aAdresse, adresseLieu, lienContact, libelleContact } from './textes';

const brute = site.modele.variantes?.accueil;
/** Nouveau premier écran demandé par la recette (sinon null : premier écran du gabarit ou du modèle) */
const demande = estPremierEcranNouveau(brute) ? brute : null;

// Photos : style « Photos » (photo d'accueil, recette, jeu de la spécialité) ; sinon celles que le praticien a importées
const sources: { src: string; cadrage?: string }[] = vitrinePhoto
  ? [
      ...(visuelPremierEcran.type === 'photo' ? [{ src: visuelPremierEcran.src, cadrage: visuelPremierEcran.cadrage }] : []),
      ...(site.visuels.photosRecette ?? []).map((src) => ({ src })),
      ...(site.visuels.photosRecette?.length ? [] : [jeu.accueil, ...jeu.galerie].map((p) => ({ src: p.photo, cadrage: p.cadrage }))),
    ]
  : site.photos.accueil ? [site.photos.accueil, ...site.photos.cabinet].map((src) => ({ src })) : [];
const vues = new Set<string>();
const photos: PhotoHeros[] = sources.filter((p) => p.src && !vues.has(p.src) && vues.add(p.src)).map((p) => ({ src: p.src, cadrage: p.cadrage, srcset: photoResponsive(p.src, '100vw').srcset }));

/** Variante rendue : le nouveau premier écran s'il a de quoi s'afficher (photos), sinon null (repli du gabarit) */
export const varianteHeros = demande && herosRenduPossible(demande, photos.length, Boolean(animationPremierEcran)) ? demande : null;

const transitionBrute = site.modele.variantes?.transition;
const transition: TransitionDiaporama = (TRANSITIONS_DIAPORAMA as readonly string[]).includes(transitionBrute as string) ? (transitionBrute as TransitionDiaporama) : 'fondu';

// Animation d'en-tête (entete-anim.ts) : dans les nouveaux premiers écrans seulement
const animationBrute = site.modele.variantes?.['entete-anim'];
const animation = estAnimationEntete(animationBrute) ? animationBrute : null;
// Tempo des animations rythmées (marche des empreintes) : vif pour le sport, calme dès qu'il y a diabète ou seniors
const sujetsSite = navigation.principaux.map((t) => t.theme.id as string);
const tempo = sujetsSite.includes('sport') && !sujetsSite.some((s) => s === 'diabete' || s === 'senior') ? 'vif' as const : 'calme' as const;

const specialite = discipline;
const plusieurs = site.praticiens.length > 1 && rdvEnLigne;
const rdv = rdvEnLigne ? (plusieurs ? '#praticiens' : lienRdv('accueil')) : aTelephone ? telLien : lienContact;
const principaux = site.soins.slice(0, 3).map((s) => s.titreCourt.toLowerCase());
const soins = principaux.length ? `${principaux.slice(0, -1).join(', ')}${principaux.length > 1 ? ' et ' : ''}${principaux.at(-1)}.` : '';

/** Données du premier écran (null si aucune nouvelle variante n'est rendue) */
export const donneesHeros: DonneesHeros | null = varianteHeros ? {
  variante: varianteHeros,
  transition,
  balise: 'h1',
  sur: [titreMetierAffiche, localisation].filter(Boolean).join(' · '),
  metier: specialite,
  ville: aLaVille || null,
  qui: `${noms} · ${nomLieu}${aAdresse ? `, ${lieu.adresse}` : ''}`,
  soins: soins.charAt(0).toUpperCase() + soins.slice(1),
  actions: [
    { href: rdv, libelle: rdvEnLigne ? 'Prendre rendez-vous' : libelleContact, plein: true },
    ...(rdvEnLigne && aTelephone ? [{ href: telLien, libelle: site.cabinet.telephone }] : []),
  ],
  via: rdvEnLigne && !plusieurs && viaPlateforme ? `Réservation ${viaPlateforme}, 24h/24` : null,
  photos: photosMontrees(varianteHeros, photos),
  sujets: navigation.principaux.map((t) => ({ href: t.href, libelle: t.theme.libelle })),
  lieu: { ligne: aAdresse ? `${nomLieu}, ${adresseLieu}` : adresseLieu, href: '#infos', libelle: 'Horaires et accès' },
  couleurs: styleCouleursHeros(site.modele, site.theme),
  motLong: motLongTitre(`Cabinet de ${specialite} ${aLaVille ?? ''}`),
  mode: 'site',
  animation,
  tempo,
  // Visuel animé du premier écran (heros-anime.ts) : à la place de la photo ou de l'illustration, même cadre
  visuelAnime: animationPremierEcran,
} : null;

/** Variante du premier écran des gabarits tableau, village, revue quand le nouveau premier écran n'est pas rendu (pas de photo) */
export const accueilGabarit = (v: string): 'carte' | 'notice' | 'figure' => {
  if (v === 'carte' || v === 'notice' || v === 'figure') return v;
  const g = gabaritModele(site.modele);
  return g === 'classique' ? 'carte' : VARIANTES_PAR_DEFAUT[g].accueil as 'carte' | 'notice' | 'figure';
};
