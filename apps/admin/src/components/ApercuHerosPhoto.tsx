'use client';

// Aperçu des nouveaux premiers écrans (photo plein écran, diaporama et ses transitions, photo d'un côté, typographique, dégradé
// maillé, bento) : EXACTEMENT le HTML et la feuille du site (packages/core/src/heros-photo.ts, htmlHeros et CSS_HEROS), dans
// l'iframe de l'aperçu (CadreApercu). Le diaporama joue tout de suite (toutes les photos chargées) ; bouton pause actif.
// Sans photo, une variante à photos n'est pas rendue (null) : l'appelant garde son premier écran, comme le site.
import { useMetierApercu } from './ApercuMetier';
import { CLASSE_PAUSE } from './AnimationsBudget';
import { useEffect, useRef, useState } from 'react';
import {
  animationDuHeros, CORPS_PARTICULES, CSS_HEROS, DUREE_ENTETE, estAnimationEntete, construireNavigation, estPremierEcranNouveau, herosRenduPossible, htmlHeros, motLongTitre, photosMontrees, styleCouleursHeros,
  TRANSITIONS_DIAPORAMA, illustrationTheme, themeIllustre, type Registre, type ModeleManifeste, type ReplisApercu, type SiteDraft, type TransitionDiaporama,
} from '@plateforme/core';
import type { SoinCatalogue } from '@/lib/sites';

type Props = {
  draft: SiteDraft;
  modele: ModeleManifeste;
  soins: SoinCatalogue[];
  replis: ReplisApercu;
  /** Sur-titre (métier · ville) */
  sur: string;
  /** Registre des dessins du site */
  registre: Registre;
  /** Repli (sujet sans illustration composée) : SVG en ligne du visuel du premier écran */
  illustration: string;
  /** Téléphone, la barre du bas porte l'appel (cadre-apercu.ts, appelDansBarre) : boutons d'appel non repris */
  masquerAppel?: boolean;
};

/** Photos du premier écran (comme le site, lib/heros-photo.ts) : style « Photos », sinon celles importées par le praticien */
const photosApercu = (d: SiteDraft) => [...new Set((d.theme.modeVisuel === 'photos'
  ? [d.photos.accueil, ...(d.theme.photosRecette ?? [])]
  : d.photos.accueil ? [d.photos.accueil, ...d.photos.cabinet] : []).filter(Boolean))].map((src) => ({ src }));

/** Tempo des animations rythmées (comme le site) : vif pour le sport, calme dès qu'il y a diabète ou seniors */
const tempoApercu = (sujets: string[]) => (sujets.includes('sport') && !sujets.some((x) => x === 'diabete' || x === 'senior') ? 'vif' : 'calme');

/** Le premier écran de la recette est-il l'un des nouveaux, rendable (photos) ? Sinon : premier écran du gabarit ou du modèle */
export function herosPhotoActif(d: SiteDraft, m: ModeleManifeste): boolean {
  const v = m.variantes?.accueil;
  return estPremierEcranNouveau(v) && herosRenduPossible(v, photosApercu(d).length, (m.variantes as Record<string, string> | undefined)?.['visuel-heros'] === 'animation');
}

/** Le nouveau premier écran de la recette, ou null (premier écran du gabarit ou du modèle) */
export default function ApercuHerosPhoto({ draft: d, modele: m, soins, replis: r, sur, registre, illustration, masquerAppel = false }: Props) {
  const metierPack = useMetierApercu();
  const [pause, setPause] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  const brute = m.variantes?.['entete-anim'];
  const animationBrute = estAnimationEntete(brute) && brute !== 'aucune' ? brute : null;
  // Visuel animé du premier écran (heros-anime.ts) : remplace la photo ou l'illustration ; dans l'aperçu de Paul, les « à valider »
  // sont montrées, jamais une animation d'illustration dont les images de base attendent leur validation
  const sujetHeros = (() => { const nav = construireNavigation(d, soins).principaux.map((x) => x.theme.id as string); return d.theme.herosSujet && nav.includes(d.theme.herosSujet) ? d.theme.herosSujet : nav[0]; })();
  const visuelAnime = animationDuHeros(m.variantes as never, sujetHeros);
  const animation = visuelAnime ?? animationBrute;
  // Animation d'en-tête : rejouée en boucle dans l'aperçu (le site la joue à l'affichage, au retour à l'écran et au survol) ;
  // lueur : suit le pointeur
  useEffect(() => {
    const h = boite.current?.querySelector<HTMLElement>('.hp[data-ea]');
    if (!h || !animation) return;
    // Aperçu en pause (budget des animations, AnimationsBudget.tsx) : pas de nouvelle lecture, l'en-tête reste à son état final
    const jouer = () => { if (h.ownerDocument.documentElement.classList.contains(CLASSE_PAUSE)) return; h.classList.remove('ea-joue'); void h.offsetWidth; h.classList.add('ea-joue'); };
    // Particules des empreintes (canvas) : même script que le site, exécuté sur la section de l'aperçu (il suit la classe ea-joue)
    if (animation === 'em-particules') new Function('h', CORPS_PARTICULES)(h);
    jouer();
    const t = setInterval(jouer, DUREE_ENTETE + 1700);
    const l = h.querySelector<HTMLElement>('.ea--lueur i');
    const suivre = (e: PointerEvent) => { const b = h.getBoundingClientRect(); if (l) l.style.transform = `translate3d(${e.clientX - b.left}px,${e.clientY - b.top}px,0)`; };
    if (l) h.addEventListener('pointermove', suivre);
    return () => { clearInterval(t); h.removeEventListener('pointermove', suivre); };
  }, [animation, m.variantes?.accueil, d.theme.gamme, d.theme.couleur]);
  const v = m.variantes?.accueil;
  if (!estPremierEcranNouveau(v)) return null;
  const photos = photosApercu(d);
  if (!herosRenduPossible(v, photos.length, Boolean(visuelAnime))) return null;
  const t = m.variantes?.transition;
  const transition: TransitionDiaporama = (TRANSITIONS_DIAPORAMA as readonly string[]).includes(t as string) ? (t as TransitionDiaporama) : 'fondu';
  const metier = metierPack?.discipline ?? (d.pays === 'FR' ? 'pédicurie-podologie' : 'podologie');
  const principaux = soins.slice(0, 3).map((s) => s.titre_court.toLowerCase());
  const soinsPhrase = principaux.length ? `${principaux.slice(0, -1).join(', ')}${principaux.length > 1 ? ' et ' : ''}${principaux.at(-1)}.` : '';
  const qui = r.noms.join(' et ') || d.cabinet.nom;
  const plusieurs = r.noms.length > 1 && r.rdvEnLigne;
  const { avant, apres, fente, css } = htmlHeros({
    variante: v,
    transition,
    balise: 'p',
    sur,
    metier,
    ville: r.aVille || null,
    qui: r.aAdresse ? `${qui} · ${r.rue}` : qui,
    soins: soinsPhrase.charAt(0).toUpperCase() + soinsPhrase.slice(1),
    actions: [
      ...(masquerAppel && !r.rdvEnLigne ? [] : [{ href: '#', libelle: r.rdvEnLigne ? 'Prendre rendez-vous' : r.libelleContact, plein: true }]),
      ...(r.rdvEnLigne && r.aTelephone && !masquerAppel ? [{ href: '#', libelle: r.telephone }] : []),
    ],
    via: r.rdvEnLigne && !plusieurs && d.rdv.outil ? `Réservation via ${d.rdv.outil}, 24h/24` : null,
    photos: photosMontrees(v, photos),
    sujets: construireNavigation(d, soins).principaux.map((x) => ({ href: '#', libelle: x.theme.libelle })),
    lieu: { ligne: r.adresse, href: '#', libelle: 'Horaires et accès' },
    couleurs: styleCouleursHeros(m, d.theme),
    motLong: motLongTitre(`Cabinet de ${metier} ${r.aVille ?? ''}`),
    mode: 'apercu',
    pause,
    animation: animationBrute,
    visuelAnime,
    tempo: tempoApercu(construireNavigation(d, soins).principaux.map((x) => x.theme.id as string)),
  });
  // Illustration de l'emplacement : celle du site (VisuelTheme : illustration composée du sujet du héros, gamme du site sauf
  // modèle à teinte « gamme » en relevé)
  const nav = construireNavigation(d, soins).principaux.map((x) => x.theme.id);
  const sujet = d.theme.herosSujet && nav.includes(d.theme.herosSujet) ? d.theme.herosSujet : nav[0];
  const gamme = m.jetons.teinte === 'gamme' && registre === 'releve' ? null : d.theme.gamme || null;
  const svg = fente && sujet && themeIllustre(sujet) ? illustrationTheme(sujet, { format: v === 'bento' ? 'paysage' : 'portrait', registre, gamme, id: `hp-${sujet}` }) : illustration;
  return (
    <div ref={boite} onClick={(e) => { if ((e.target as Element).closest?.('.hp__pause')) setPause((p) => !p); }}>
      <style dangerouslySetInnerHTML={{ __html: CSS_HEROS + css }} />
      <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: fente ? `${avant}<div class="vt vt--heros">${svg}</div>${apres}` : avant }} />
    </div>
  );
}
