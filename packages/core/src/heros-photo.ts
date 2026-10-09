// Nouveaux premiers écrans de l'accueil (heros-photo-variantes.ts) : balisage HTML et feuille de style UNIQUES, partagés par le
// site publié (apps/sites/src/components/gabarits/HerosPhoto.astro) et l'aperçu de l'admin (ApercuHerosPhoto.tsx) : rendu
// identique par construction. Tous gabarits (classique compris) : les couleurs viennent de couleursGabarit (gamme ou couleur
// libre, garde-fous AA), posées en variables --hp-* sur la section elle-même.
//
// Performance (règles de Paul) : la PREMIÈRE photo est un vrai <img> (srcset, sizes, fetchpriority="high", dimensions
// fixes, jamais un fond CSS) ; les suivantes n'ont qu'un data-src, chargé par le script (≤ 1 Ko) APRÈS l'événement load, et
// seulement sans « Économiseur de données » ni « réduire les animations » ; le défilement ne démarre qu'une fois toutes les
// photos décodées (classe hp--joue). Animations en CSS seulement (opacity, transform, clip-path, filter) sur le cadre de la
// photo (le traitement des photos de la recette garde le filter de l'<img>) ; pause au survol du texte, au focus clavier, par
// le bouton (WCAG 2.2.2) et hors écran.
//
// Lisibilité : le texte posé sur une photo a son propre voile (fond + halo) de la couleur sombre de la gamme, d'une opacité
// CALCULÉE pour que le texte reste ≥ 4,6:1 même sur un pixel blanc (alphaVoile) : AA garanti quelle que soit la
// photo et son traitement.
//
// SEO : même H1 que les autres premiers écrans (« Cabinet de pédicurie-podologie à <ville> »), aucun intertitre ajouté.

import { contraste, melanger, rvb } from './couleurs';
import { CYCLES, COURBES, DUREES, NEUTRES } from './charte';
import { couleursGabarit, type CouleursGabarit } from './gabarits';
import type { ModeleManifeste } from './modeles';
import { estPremierEcranAnime, estPremierEcranPhoto, HOTES_SCENE_ENTETE, HOTES_VISUEL_ANIME, PLACEMENT_ANIMATIONS_ENTETE, PREMIERS_ECRANS_LOT2, PREMIERS_ECRANS_LOT2_LIBRES, type AnimationEntete, type PremierEcranNouveau, type TransitionDiaporama, type TransitionSections } from './heros-photo-variantes';
import { AVEC_COMPOSITION, cssLot2, FONDS_LOT2, FORMES_LOT2, teintesSousTexte } from './heros-organiques';
import { cssAnimationEntete, htmlAnimationEntete, motsDesSoins } from './entete-anim';
import { cssVisuelAnime, htmlVisuelAnime } from './heros-anime';

export * from './heros-photo-variantes';
export { teintesSousTexte, cssLot2 } from './heros-organiques';
export { cssAnimationEntete, htmlAnimationEntete, motsDesSoins, SCRIPT_ENTETE, DUREE_ENTETE } from './entete-anim';
export { animationDuHeros, animationsHerosDuSujet, animationsPretesDepuisStatuts, cssVisuelAnime, htmlVisuelAnime, statutAnimationHeros, SCRIPT_VISUEL_ANIME, type StatutAnimationHeros, type TonVisuelAnime } from './heros-anime';
export { ANIMATIONS_EMPREINTES, CORPS_PARTICULES, SCRIPT_PARTICULES, estAnimationEmpreintes, type AnimationEmpreintes } from './entete-empreintes';

/** Photos montrées au plus par le diaporama (3 à 5 demandées) */
export const HEROS_PHOTOS_MAX = 5;
/** Durée d'affichage d'une photo et de la transition (charte : CYCLES.diapo, DUREES.trace) */
export const DUREE_DIAPO = CYCLES.diapo;
export const DUREE_TRANSITION = DUREES.trace;

// ---------------------------------------------------------------------------------------------------------------
// Couleurs
// ---------------------------------------------------------------------------------------------------------------

/**
 * Opacité minimale du voile (couleur `nuit`) pour que chacun des `textes` atteigne `min` sur le pire fond : un pixel blanc de la
 * photo sous le voile (mélange sRGB, comme color-mix et la composition alpha des navigateurs).
 */
export function alphaVoile(nuit: string, textes: readonly string[], min = 4.6): number {
  // Pire pixel : blanc pour un texte clair, noir pour un texte foncé (voile clair) ; on vérifie les deux
  for (let a = 0; a <= 100; a++) {
    const fonds = [NEUTRES.blanc, '#000000'].map((x) => melanger(x, nuit, a / 100));
    if (textes.every((t) => fonds.every((f) => contraste(t, f) >= min))) return a / 100;
  }
  return 1;
}

const ROLES: (keyof CouleursGabarit)[] = ['page', 'carte', 'doux', 'bulle', 'ligne', 'encre', 'encre-douce', 'accent-texte', 'plein', 'plein-texte', 'plein-bord', 'sombre', 'sombre-texte', 'sombre-doux', 'vif', 'vif-texte', 'aplat', 'aplat-texte', 'aplat-doux'];

/** Variables --hp-* du premier écran (style en ligne de la section) : couleurs du gabarit « tableau » si le site est classique */
export function styleCouleursHeros(m: Pick<ModeleManifeste, 'gabarit' | 'jetons'>, choix: { couleur: string; gamme?: string | null }): string {
  const c = couleursGabarit(m.gabarit && m.gabarit !== 'classique' ? m : { ...m, gabarit: 'tableau' }, choix);
  // Texte posé sur la photo : tout en sombre-texte (le texte doux demanderait un voile bien plus opaque)
  const a = alphaVoile(c.sombre, [c['sombre-texte']]);
  const [r, g, b] = rvb(c.sombre);
  // Voile dégradé de la couleur du cabinet (variante « voile-degrade ») : texte plein-texte AA sur n'importe quel pixel
  const ap = alphaVoile(c.plein, [c['plein-texte']]);
  const [pr, pg, pb] = rvb(c.plein);
  // Largeur du cadre et gouttière : celles de la coquille du gabarit (Coquille.astro, ApercuGabarit), texte aligné sur l'en-tête
  // Teintes de la gamme posées sous le texte (lot 2 : dégradé maillé animé, forme qui respire ; lueur d'en-tête) : AA calculé
  const [t1, t2, t3] = teintesSousTexte(c);
  const [cadre, gouttiere] = ({ village: [880, 40], revue: [1120, 64] } as Record<string, [number, number]>)[m.gabarit ?? 'classique'] ?? [1180, 40];
  return [...ROLES.map((k) => `--hp-${k}:${c[k]}`), `--hp-voile-c:rgb(${r} ${g} ${b} / ${a})`, `--hp-voile-a:${a}`, `--hp-voile-plein:rgb(${pr} ${pg} ${pb} / ${ap})`, `--hp-t1:${t1}`, `--hp-t2:${t2}`, `--hp-t3:${t3}`, `--hp-cadre:${cadre}px`, `--hp-gouttiere:${gouttiere}px`].join(';');
}

/** Plus long mot insécable d'un titre, borné (même règle que Gabarit.astro : --mot-long) */
export const motLongTitre = (t: string) => Math.min(26, Math.max(12, Math.max(0, ...t.split(/[\s,.;:!?()«»]+/).map((x) => [...x].length)) + 1));

// ---------------------------------------------------------------------------------------------------------------
// Balisage
// ---------------------------------------------------------------------------------------------------------------

export type PhotoHeros = { src: string; srcset?: string; sizes?: string; cadrage?: string };
export type ActionHeros = { href: string; libelle: string; plein?: boolean; detail?: string };

export type DonneesHeros = {
  variante: PremierEcranNouveau;
  transition: TransitionDiaporama;
  /** « h1 » sur le site ; « p » dans l'aperçu (la page de l'admin a déjà son titre) */
  balise: 'h1' | 'p';
  /** Sur-titre (métier · ville) */
  sur: string;
  /** Mot métier insécable (« pédicurie-podologie ») et « à <ville> » */
  metier: string;
  ville: string | null;
  qui: string;
  soins: string;
  actions: ActionHeros[];
  via?: string | null;
  photos: PhotoHeros[];
  /** Sujets principaux (bento) */
  sujets: { href: string; libelle: string }[];
  /** Lieu (bento) : adresse et lien vers les horaires et l'accès */
  lieu: { ligne: string; href: string; libelle: string } | null;
  /** Variables --hp-* (styleCouleursHeros) */
  couleurs: string;
  /** Plus long mot insécable du titre (taille du titre) */
  motLong: number;
  /** « site » : photos suivantes en data-src (script) ; « apercu » : toutes chargées, défilement immédiat */
  mode: 'site' | 'apercu';
  /** Aperçu : défilement en pause (réduction des animations) */
  pause?: boolean;
  /** Animation d'en-tête (entete-anim.ts) ; absente ou « aucune » : rien */
  animation?: AnimationEntete | null;
  /** Tempo des animations d'en-tête rythmées (marche) : « vif » pour le sport, calme sinon (diabète, seniors) */
  tempo?: 'calme' | 'vif' | null;
  /**
   * Visuel principal ANIMÉ (heros-anime.ts, animationDuHeros) : l'animation prend la place de la photo ou de l'illustration,
   * dans le même cadre et sous le même masque ; aucune autre animation dans l'en-tête. Premiers écrans à visuel seulement.
   */
  visuelAnime?: AnimationEntete | null;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (k: string, v: string | undefined | null) => (v ? ` ${k}="${esc(v)}"` : '');
// GIF transparent de 1 px : src des photos suivantes tant qu'elles ne sont pas chargées (aucune requête)
const VIDE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/** Photos effectivement montrées par une variante (aucune pour typographique ; une pour les autres sans défilement) */
export function photosMontrees(v: PremierEcranNouveau, photos: readonly PhotoHeros[]): PhotoHeros[] {
  if (v === 'typographique' || (PREMIERS_ECRANS_LOT2_LIBRES as readonly string[]).includes(v)) return [];
  return photos.slice(0, estPremierEcranAnime(v) ? HEROS_PHOTOS_MAX : 1);
}

/** La variante peut-elle être rendue avec ces photos ? (sinon : premier écran par défaut du gabarit) */
export const herosRenduPossible = (v: PremierEcranNouveau, nbPhotos: number, visuelAnime = false) => !estPremierEcranPhoto(v) || nbPhotos > 0 || (visuelAnime && HOTES_VISUEL_ANIME.includes(v));

function img(p: PhotoHeros, i: number, d: DonneesHeros, sizes: string): string {
  const pos = attr('style', p.cadrage && p.cadrage !== '50% 50%' ? `object-position:${p.cadrage}` : undefined);
  if (i === 0 || d.mode === 'apercu') {
    return `<img src="${esc(p.src)}"${attr('srcset', p.srcset)}${p.srcset ? attr('sizes', p.sizes ?? sizes) : ''} alt="" width="1600" height="1067"${i === 0 ? ' fetchpriority="high" loading="eager"' : ' loading="lazy" decoding="async"'}${pos}>`;
  }
  return `<img src="${VIDE}" data-src="${esc(p.src)}"${attr('data-srcset', p.srcset)}${p.srcset ? attr('sizes', p.sizes ?? sizes) : ''} alt="" width="1600" height="1067" decoding="async"${pos}>`;
}

/** Cadre des photos (aria-hidden) et commandes du diaporama (points décoratifs, bouton pause accessible) */
function media(d: DonneesHeros, photos: PhotoHeros[], sizes: string, voile: boolean, formes = '', animHtml = ''): string {
  // Visuel animé : une seule « diapositive », l'animation (masques et cadrages de la variante appliqués à l'identique)
  const diapos = animHtml ? `<div class="hp__diapo hp__diapo--anime">${animHtml}</div>` : photos.map((p, i) => `<div class="hp__diapo" style="--hp-i:${i};--hp-kx:${i % 2 ? -1 : 1}">${img(p, i, d, sizes)}</div>`).join('');
  const anime = photos.length > 1;
  const commandes = anime
    ? `<div class="hp__commandes"><span class="hp__points" aria-hidden="true">${photos.map((_, i) => `<span class="hp__point" style="--hp-i:${i}"></span>`).join('')}</span>`
      + `<button type="button" class="hp__pause" aria-pressed="${d.pause ? 'true' : 'false'}" aria-label="Mettre en pause le défilement des photos">`
      + '<svg class="hp__arret" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z"/></svg>'
      + '<svg class="hp__lecture" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg></button></div>'
    : '';
  return `<div class="hp__media">${formes ? `<span aria-hidden="true">${formes}</span>` : ''}<div class="hp__fond" aria-hidden="true">${diapos}${voile ? '<span class="hp__voile"></span>' : ''}</div>${commandes}</div>`;
}

/** L'animation d'en-tête se pose-t-elle en grand dans la carte visuelle (« scène » dans un premier écran hôte) ? */
const enScene = (d: DonneesHeros) => Boolean(d.animation && d.animation !== 'aucune' && PLACEMENT_ANIMATIONS_ENTETE[d.animation] === 'scene' && HOTES_SCENE_ENTETE.includes(d.variante));

function titre(d: DonneesHeros): string {
  // Animation d'en-tête en bande ou en emblème : au-dessus du sur-titre (taille réservée, jamais sous le texte) ; une « scène »
  // hors de son hôte passe en emblème
  const anim = d.animation && d.animation !== 'aucune' && PLACEMENT_ANIMATIONS_ENTETE[d.animation] !== 'fond' && !enScene(d) ? htmlAnimationEntete(d.animation, motsDesSoins(d.soins), { vif: d.tempo === 'vif' }) : '';
  const mots = (d.soins.split(' ').map((m, k) => `<span class="hp__m" style="--k:${k}">${esc(m)}</span>`)).join(' ');
  return `${anim}<p class="hp__sur">${esc(d.sur)}</p>`
    + `<${d.balise} class="hp__titre">Cabinet de <span class="hp__mot">${esc(d.metier)}</span>${d.ville ? ` <span class="pale">${esc(d.ville)}</span>` : ''}</${d.balise}>`
    + (d.soins ? `<p class="hp__soins">${d.variante === 'typographique' ? mots : esc(d.soins)}</p>` : '')
    + `<div class="hp__actions">${d.actions.map((a) => `<a class="hp__bouton${a.plein ? ' hp__bouton--plein' : ''}" href="${esc(a.href)}">${esc(a.libelle)}${a.detail ? ` <span>${esc(a.detail)}</span>` : ''}</a>`).join('')}</div>`
    // Qui et où en dernier : sa longueur (noms, adresse) change le nombre de lignes quand la police arrive ; en fin de bloc,
    // ce changement ne déplace rien (CLS 0)
    + `<p class="hp__qui">${esc(d.qui)}</p>`
    + (d.via ? `<p class="hp__via">${esc(d.via)}</p>` : '');
}

/** Variantes dont la photo est posée sur le fond de la page (fondue, découpée, masquée) */
const SUR_PAGE: readonly string[] = ['fondu', 'fondu-double', 'oblique', 'parallelogramme', 'organique', 'organique-fondu', ...PREMIERS_ECRANS_LOT2];
const TAILLES: Partial<Record<PremierEcranNouveau, string>> = {
  fondu: '(min-width: 900px) 60vw, 100vw', oblique: '(min-width: 900px) 60vw, 100vw', parallelogramme: '(min-width: 900px) 45vw, 100vw',
  organique: '(min-width: 900px) 45vw, 100vw', 'organique-fondu': '(min-width: 900px) 60vw, 100vw', 'decoupe-photo': '(min-width: 900px) 40vw, 100vw', 'duo-taches': '(min-width: 900px) 40vw, 80vw',
  'arche-photo': '(min-width: 900px) 30vw, 70vw', 'voute-photo': '(min-width: 900px) 55vw, 100vw',
};
// Lignes de vitesse (traits fins, aucune image) et bandes diagonales qui « filent » ; taches organiques qui respirent
const VITESSE = '<svg class="hp__vitesse" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 14H400M70 38H400M0 62H330M140 86H400M30 110H260"/></svg>';
const DECORS: Partial<Record<PremierEcranNouveau, string>> = {
  oblique: `<span class="hp__deco" aria-hidden="true"><span class="hp__bandes"><span></span><span></span><span></span></span>${VITESSE}</span>`,
  parallelogramme: `<span class="hp__deco" aria-hidden="true"><span class="hp__ombre"></span>${VITESSE}</span>`,
  organique: '<span class="hp__deco" aria-hidden="true"><span class="hp__blob hp__blob--1"></span><span class="hp__blob hp__blob--2"></span><span class="hp__blob hp__blob--3"></span></span>',
  'organique-fondu': '<span class="hp__deco" aria-hidden="true"><span class="hp__blob hp__blob--1"></span></span>',
};

/**
 * HTML du premier écran, en deux morceaux autour de l'emplacement du visuel du sujet (`fente` : illustration du thème, rendue par
 * le site ou l'aperçu ; seulement « maille » et « bento » sans photo). Toujours rendu : une variante photo sans photo est remplacée
 * par l'appelant (herosRenduPossible).
 */
export function htmlHeros(d0: DonneesHeros): { avant: string; apres: string; fente: boolean; css: string } {
  const v = d0.variante;
  // Visuel animé (heros-anime.ts) : seulement dans un premier écran à visuel principal ; il remplace alors toute autre animation
  const va = d0.visuelAnime && HOTES_VISUEL_ANIME.includes(v) ? d0.visuelAnime : null;
  const d: DonneesHeros = va ? { ...d0, animation: null } : d0;
  const vaHtml = va ? htmlVisuelAnime(va, { vif: d.tempo === 'vif' }) : '';
  const photos = va ? [] : photosMontrees(v, d.photos);
  const anime = estPremierEcranAnime(v) && photos.length > 1;
  const animation = d.animation && d.animation !== 'aucune' ? d.animation : null;
  const lueur = animation && PLACEMENT_ANIMATIONS_ENTETE[animation] === 'fond' ? htmlAnimationEntete(animation) : '';
  const surPhoto = v === 'photo-gauche' || v === 'photo-centre' || v === 'photo-bas' || v === 'diaporama' || v === 'voile-degrade';
  const surPage = (SUR_PAGE as readonly string[]).includes(v);
  const classes = ['hp', `hp--${v}`, surPhoto && 'hp--sur-photo', surPage && 'hp--sur-page', anime && `hp--t-${d.transition}`, anime && d.mode === 'apercu' && !d.pause && 'hp--joue', d.pause && 'hp--pause'].filter(Boolean).join(' ');
  const style = [d.couleurs, `--mot-long:${d.motLong}`, anime ? `--hp-anim:hp-${d.transition}-${photos.length};--hp-anim-pt:hp-pt-${photos.length};--hp-cycle:${photos.length * DUREE_DIAPO}ms;--hp-d:${DUREE_DIAPO}ms;--hp-t:${DUREE_TRANSITION}ms` : ''].filter(Boolean).join(';');
  const ouverture = `<section class="${classes}" style="${esc(style)}" aria-label="Le cabinet en bref"${anime ? ` data-hp-diapos="${photos.length}"` : ''}${animation || va ? ' data-ea' : ''}${va ? ' data-visuel-anime' : ''}>${lueur}`;
  const css = keyframesHeros(anime ? d.transition : null, photos.length) + cssLot2(v) + cssAnimationEntete(animation) + (va ? cssVisuelAnime(va) : '');
  const texte = (cl = '') => `<div class="hp__texte${cl}">${titre(d)}</div>`;
  if (surPage) {
    // Photo posée sur le fond de la page (fondue, découpée, masquée) : le texte reste sur le fond uni (AA du gabarit)
    // Lot 2 sans photo : composition de formes à la place de la photo (ou fond seul)
    const libre = (PREMIERS_ECRANS_LOT2_LIBRES as readonly string[]).includes(v);
    const visuel = libre
      ? (AVEC_COMPOSITION.includes(v) ? `<div class="hp__media hp__compo" aria-hidden="true">${FORMES_LOT2[v]}</div>` : '')
      : media(d, photos, TAILLES[v] ?? '100vw', false, FORMES_LOT2[v] ?? '', vaHtml);
    return { avant: `${ouverture}${DECORS[v] ?? FONDS_LOT2[v] ?? ''}${visuel}<div class="hp__cadre">${texte()}</div></section>`, apres: '', fente: false, css };
  }
  if (surPhoto || v === 'scinde-photo') {
    const sizes = v === 'scinde-photo' ? '(min-width: 900px) 50vw, 100vw' : '100vw';
    return { avant: `${ouverture}${media(d, photos, sizes, surPhoto, '', v === 'scinde-photo' ? vaHtml : '')}<div class="hp__cadre">${texte()}</div></section>`, apres: '', fente: false, css };
  }
  if (v === 'typographique') {
    return { avant: `${ouverture}<span class="hp__trame" aria-hidden="true"></span><div class="hp__cadre">${texte()}</div></section>`, apres: '', fente: false, css };
  }
  const visuel = photos[0] ? img(photos[0], 0, d, v === 'maille' ? '(min-width: 900px) 45vw, 100vw' : '(min-width: 900px) 40vw, 100vw') : null;
  if (v === 'maille' && va) {
    return { avant: `${ouverture}<div class="hp__cadre hp__grille">${texte()}<div class="hp__forme" aria-hidden="true"><span class="hp__tache"></span><div class="hp__masque hp__masque--anime">${vaHtml}</div></div></div></section>`, apres: '', fente: false, css };
  }
  if (v === 'maille') {
    const debut = `${ouverture}<div class="hp__cadre hp__grille">${texte()}<div class="hp__forme" aria-hidden="true"><span class="hp__tache"></span><div class="hp__masque${visuel ? ' hp__masque--photo' : ''}">`;
    const fin = '</div></div></div></section>';
    return visuel ? { avant: `${debut}${visuel}${fin}`, apres: '', fente: false, css } : { avant: debut, apres: fin, fente: true, css };
  }
  // Bento : texte et rendez-vous, visuel, sujets, lieu ; cartes arrondies en grappe
  const sujets = d.sujets.length ? `<div class="hp__carte hp__carte--sujets"><p class="hp__etiquette">Sujets du cabinet</p><ul>${d.sujets.map((s) => `<li><a href="${esc(s.href)}">${esc(s.libelle)}</a></li>`).join('')}</ul></div>` : '';
  const lieu = d.lieu ? `<div class="hp__carte hp__carte--lieu"><p>${esc(d.lieu.ligne)}</p><a href="${esc(d.lieu.href)}">${esc(d.lieu.libelle)}</a></div>` : '';
  // Animation « scène » (empreintes) : en grand dans la carte visuelle, à la place de la photo ou de l'illustration
  const scene = va ? vaHtml : enScene(d) ? htmlAnimationEntete(animation, [], { scene: true, vif: d.tempo === 'vif' }) : '';
  const debut = `${ouverture}<div class="hp__cadre hp__grille">${texte(' hp__carte hp__carte--texte')}<div class="hp__carte hp__carte--visuel${visuel && !scene ? ' hp__carte--photo' : ''}${scene ? ' hp__carte--scene' : ''}" aria-hidden="true">`;
  const fin = `</div>${sujets}${lieu}</div></section>`;
  if (scene) return { avant: `${debut}${scene}${fin}`, apres: '', fente: false, css };
  return visuel ? { avant: `${debut}${visuel}${fin}`, apres: '', fente: false, css } : { avant: debut, apres: fin, fente: true, css };
}

// ---------------------------------------------------------------------------------------------------------------
// Feuilles de style
// ---------------------------------------------------------------------------------------------------------------

const ENTREES: Record<TransitionDiaporama, string> = {
  fondu: 'opacity:0',
  'ken-burns': 'opacity:0',
  glissement: 'opacity:1;transform:translate3d(100%,0,0)',
  volet: 'opacity:1;-webkit-clip-path:inset(0 0 0 100%);clip-path:inset(0 0 0 100%)',
  rideau: 'opacity:1;-webkit-clip-path:inset(0 50% 0 50%);clip-path:inset(0 50% 0 50%)',
  flou: 'opacity:0;filter:blur(18px)',
};
const REPOS: Record<TransitionDiaporama, string> = {
  fondu: 'opacity:1',
  'ken-burns': 'opacity:1',
  glissement: 'opacity:1;transform:translate3d(0,0,0)',
  volet: 'opacity:1;-webkit-clip-path:inset(0 0 0 0);clip-path:inset(0 0 0 0)',
  rideau: 'opacity:1;-webkit-clip-path:inset(0 0 0 0);clip-path:inset(0 0 0 0)',
  flou: 'opacity:1;filter:blur(0)',
};

/**
 * Images clés d'un diaporama de `n` photos (cycle n × DUREE_DIAPO) : chaque photo entre AU-DESSUS de la précédente (z-index
 * animé), reste DUREE_DIAPO, puis disparaît une fois la suivante entièrement arrivée (jamais de creux sombre entre deux photos).
 * La photo n° i démarre à i × DUREE_DIAPO − DUREE_TRANSITION : la première est visible et nette dès l'affichage (LCP).
 */
export function keyframesHeros(t: TransitionDiaporama | null, n: number): string {
  if (!t || n < 2) return '';
  const C = n * DUREE_DIAPO;
  const pc = (ms: number) => `${Math.round((ms / C) * 100000) / 1000}%`;
  const T = DUREE_TRANSITION;
  const D = DUREE_DIAPO;
  const apres = (ms: number) => `${Math.round((ms / C) * 100000 + 10) / 1000}%`;
  const diapo = `@keyframes hp-${t}-${n}{0%{${ENTREES[t]};z-index:3;animation-timing-function:${COURBES.entreeSortie}}${pc(T)}{${REPOS[t]};z-index:3;animation-timing-function:linear}${apres(T)}{z-index:2}${pc(D + T)}{${REPOS[t]};z-index:2}${apres(D + T)}{opacity:0;z-index:1}100%{opacity:0;z-index:1}}`;
  const point = `@keyframes hp-pt-${n}{0%{opacity:.35}${pc(T / 2)}{opacity:1}${pc(D + T / 2)}{opacity:1}${apres(D + T / 2)}{opacity:.35}100%{opacity:.35}}`;
  const kb = t === 'ken-burns' ? `@keyframes hp-kb-${n}{0%{transform:scale(1.05) translate3d(0,0,0)}${pc(D + T)}{transform:scale(1.17) translate3d(calc(var(--hp-kx,1) * -2.4%),-1.6%,0)}100%{transform:scale(1.05)}}.hp--joue.hp--t-ken-burns .hp__diapo img{animation:hp-kb-${n} var(--hp-cycle) linear infinite both;animation-delay:calc(var(--hp-i) * var(--hp-d) - var(--hp-t))}` : '';
  return `${diapo}${point}${kb}`;
}

/** Feuille commune des nouveaux premiers écrans (une fois par page) */
export const CSS_HEROS = `
.hp{--hp-r:var(--rayon-carte,var(--rayon,20px));position:relative;isolation:isolate;overflow:hidden;overflow:clip;background:var(--hp-page);color:var(--hp-encre)}
.hp *{box-sizing:border-box}
.hp__cadre{position:relative;z-index:2;width:min(var(--hp-cadre,1180px),100% - var(--hp-gouttiere,40px));margin-inline:auto}
@media (max-width:559px){.hp{--hp-gouttiere:32px}}
.hp__texte{position:relative;display:grid;gap:12px;justify-items:start;align-content:start;container-type:inline-size;min-width:0}
.hp .hp__sur{margin:0;font-size:.95rem;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:inherit}
.hp .hp__titre{margin:4px 0 6px!important;max-width:none!important;color:inherit!important;font-family:var(--police-titres);font-weight:var(--graisse-titres,700);line-height:1!important;letter-spacing:-.035em;font-size:min(var(--hp-h1,5.4rem),calc(100cqi / (var(--mot-long,14) * .56)))!important;text-wrap:balance;hyphens:manual}
.hp .hp__titre .pale{color:inherit!important}
.hp__mot{white-space:nowrap}
.hp .hp__qui,.hp .hp__soins,.hp .hp__via{margin:0;max-width:40em}
.hp .hp__qui{font-weight:600;font-size:1.02rem;margin-top:4px}
.hp .hp__via{font-size:.88rem}
.hp__actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
.hp .hp__bouton{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:6px 24px;border-radius:var(--rayon-bouton,999px);font-weight:650;line-height:1.2;text-align:center;text-decoration:none;background:var(--hp-carte);color:var(--hp-encre);box-shadow:inset 0 0 0 2px var(--hp-encre)}
.hp .hp__bouton:hover{text-decoration:underline;color:var(--hp-encre)}
.hp .hp__bouton--plein,.hp .hp__bouton--plein:hover{background:var(--hp-plein);color:var(--hp-plein-texte);box-shadow:inset 0 0 0 2px var(--hp-plein-bord)}
.hp .hp__bouton span{font-weight:500;font-size:.85em}
@media (max-width:559px){.hp__actions{display:grid;width:100%}}

/* Photos : cadre, diapositives, voile d'ambiance, commandes */
.hp__media{position:absolute;inset:0;z-index:0}
.hp__fond{position:absolute;inset:0;overflow:hidden;background:var(--hp-sombre)}
.hp__diapo{position:absolute;inset:0;overflow:hidden}
.hp__diapo img{position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none;object-fit:cover}
.hp__diapo:not(:first-child){visibility:hidden}
.hp--t-ken-burns .hp__diapo img{transform:scale(1.05)}
.hp--joue .hp__diapo{visibility:visible;animation:var(--hp-anim) var(--hp-cycle) linear infinite both;animation-delay:calc(var(--hp-i) * var(--hp-d) - var(--hp-t));will-change:opacity,transform}
.hp__voile{position:absolute;inset:0;z-index:4;pointer-events:none;background:linear-gradient(0deg,var(--hp-voile-c) 0%,transparent 62%),linear-gradient(180deg,color-mix(in srgb,var(--hp-sombre) 30%,transparent) 0%,transparent 26%)}
.hp__commandes{position:absolute;z-index:3;right:max(16px,(100% - var(--hp-cadre,1180px)) / 2);bottom:20px;display:none;align-items:center;gap:12px}
.hp--joue .hp__commandes,.hp--pause .hp__commandes{display:flex}
.hp__points{display:flex;gap:6px}
.hp__point{width:18px;height:3px;border-radius:2px;background:var(--hp-sombre-texte);opacity:.35}
.hp--joue .hp__point{animation:var(--hp-anim-pt) var(--hp-cycle) linear infinite both;animation-delay:calc(var(--hp-i) * var(--hp-d) - var(--hp-t))}
.hp .hp__pause{display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:var(--hp-voile-c);color:var(--hp-sombre-texte);box-shadow:inset 0 0 0 1.5px currentColor;cursor:pointer}
.hp__pause svg{width:14px;height:14px;fill:currentColor}
.hp__lecture,.hp--pause .hp__arret{display:none}
.hp--pause .hp__lecture{display:block}
.hp__pause:focus-visible{outline:3px solid var(--hp-sombre-texte);outline-offset:3px}
.hp:is(.hp--pause,.hp--hors) :is(.hp__diapo,.hp__diapo img,.hp__point),.hp:has(.hp__texte:hover,:focus-visible) :is(.hp__diapo,.hp__diapo img,.hp__point){animation-play-state:paused}

/* Texte posé sur la photo : voile propre (fond + halo) d'opacité calculée, AA sur n'importe quel pixel */
.hp--sur-photo{display:grid;min-height:min(78svh,760px);background:var(--hp-sombre);color:var(--hp-sombre-texte)}
.hp--sur-photo .hp__cadre{align-self:start;padding-block:max(72px,14svh) 76px;pointer-events:none}
.hp--sur-photo .hp__texte{pointer-events:auto}
.hp--sur-photo .hp__texte::before{content:'';position:absolute;inset:-10px -14px;z-index:-1;border-radius:56px;background:var(--hp-voile-c);box-shadow:0 0 96px 56px var(--hp-voile-c);pointer-events:none}
.hp--sur-photo .hp__titre .pale{color:inherit}
.hp--sur-photo .hp__bouton:not(.hp__bouton--plein),.hp--sur-photo .hp__bouton:not(.hp__bouton--plein):hover{background:transparent;color:var(--hp-sombre-texte);box-shadow:inset 0 0 0 2px var(--hp-sombre-texte)}
.hp--photo-centre .hp__texte{justify-items:center;text-align:center;margin-inline:auto}
.hp--photo-centre .hp__actions{justify-content:center}
@media (min-width:900px){
  .hp--sur-photo{min-height:min(90svh,1040px)}
  .hp--sur-photo .hp__texte{--hp-h1:5.6rem;max-width:min(44rem,58%)}
  .hp:is(.hp--photo-gauche,.hp--diaporama) .hp__cadre{padding-block:clamp(96px,19svh,210px) 112px}
  .hp:is(.hp--photo-gauche,.hp--diaporama) .hp__voile{background:linear-gradient(90deg,var(--hp-voile-c) 0%,transparent 58%),linear-gradient(180deg,color-mix(in srgb,var(--hp-sombre) 30%,transparent) 0%,transparent 26%)}
  .hp--photo-centre .hp__cadre{padding-block:clamp(96px,17svh,190px) 112px}
  .hp--photo-centre .hp__texte{max-width:min(52rem,76%)}
  .hp--photo-centre .hp__voile{background:radial-gradient(60% 60% at 50% 50%,var(--hp-voile-c) 0%,transparent 100%)}
  .hp--photo-bas .hp__texte{max-width:min(60rem,72%)}
  .hp--photo-bas .hp__cadre{align-self:end;padding-block:120px clamp(72px,10svh,104px)}
}

/* Photo d'un côté (diaporama en fondu par défaut), texte de l'autre sur l'aplat de la gamme */
.hp--scinde-photo{display:grid;background:var(--hp-aplat);color:var(--hp-aplat-texte)}
.hp--scinde-photo .hp__media{position:relative;inset:auto;aspect-ratio:4/3;max-height:50svh;width:100%}
.hp--scinde-photo .hp__cadre{padding-block:32px 48px}
.hp--scinde-photo :is(.hp__sur,.hp__titre .pale){color:var(--hp-accent-texte)!important}
.hp--scinde-photo :is(.hp__soins,.hp__via){color:var(--hp-aplat-doux)}
@media (min-width:900px){
  .hp--scinde-photo{grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:min(84svh,920px)}
  .hp--scinde-photo .hp__media{grid-column:2;grid-row:1;aspect-ratio:auto;max-height:none;height:100%}
  .hp--scinde-photo .hp__cadre{grid-column:1;grid-row:1;align-self:start;width:auto;margin:0;padding:clamp(72px,16svh,180px) clamp(32px,5vw,80px) 72px max(20px,(100vw - var(--hp-cadre,1180px)) / 2)}
  .hp--scinde-photo .hp__texte{--hp-h1:4.6rem}
}

/* Typographique : le titre est la mise en page, sur la couleur forte de la gamme ; les mots des soins arrivent un à un */
.hp--typographique{background:var(--hp-plein);color:var(--hp-plein-texte)}
.hp--typographique .hp__cadre{display:grid;align-content:start;min-height:min(74svh,820px);padding-block:clamp(48px,11vw,140px) clamp(48px,9vw,112px)}
.hp--typographique .hp__texte{--hp-h1:9.5rem;gap:16px}
.hp--typographique .hp__titre{letter-spacing:-.05em!important;line-height:.92!important}
.hp--typographique .hp__titre .pale{display:block;font-style:italic}
.hp--typographique .hp__soins{font-size:1.25rem}
.hp--typographique .hp__bouton--plein,.hp--typographique .hp__bouton--plein:hover{background:var(--hp-plein-texte);color:var(--hp-plein);box-shadow:none}
.hp--typographique .hp__bouton:not(.hp__bouton--plein),.hp--typographique .hp__bouton:not(.hp__bouton--plein):hover{background:transparent;color:var(--hp-plein-texte);box-shadow:inset 0 0 0 2px var(--hp-plein-texte)}
.hp__trame{position:absolute;inset:0 0 0 45%;z-index:0;pointer-events:none;color:var(--hp-plein-texte);background-image:radial-gradient(circle,currentColor var(--trame-point,1.6px),transparent calc(var(--trame-point,1.6px) + .6px));background-size:var(--trame-pas,14px) var(--trame-pas,14px);opacity:.16;-webkit-mask-image:linear-gradient(100deg,transparent 0%,#000 70%);mask-image:linear-gradient(100deg,transparent 0%,#000 70%)}
.hp__m{display:inline-block}

/* Dégradé maillé (taches floues de la gamme, CSS seul) et visuel masqué en forme organique */
.hp--maille::before{content:'';position:absolute;inset:-20%;z-index:-1;pointer-events:none;background:radial-gradient(38% 46% at 16% 24%,var(--hp-aplat) 0%,transparent 70%),radial-gradient(42% 50% at 84% 22%,var(--hp-bulle) 0%,transparent 72%),radial-gradient(50% 46% at 62% 92%,var(--hp-doux) 0%,transparent 70%),radial-gradient(34% 40% at 30% 80%,var(--hp-aplat) 0%,transparent 70%)}
.hp--maille .hp__grille{display:grid;gap:28px;padding-block:clamp(32px,6vw,88px) clamp(40px,7vw,96px)}
.hp--maille :is(.hp__sur,.hp__titre .pale){color:var(--hp-accent-texte)!important}
.hp--maille :is(.hp__soins,.hp__via){color:var(--hp-encre-douce)}
.hp__forme{position:relative;width:min(100%,520px);justify-self:center;aspect-ratio:1/1}
.hp__tache{position:absolute;inset:4% 0 0 8%;border-radius:62% 38% 46% 54% / 48% 58% 42% 52%;background:var(--hp-vif);opacity:.9}
.hp__masque{position:absolute;inset:0 8% 6% 0;overflow:hidden;border-radius:42% 58% 63% 37% / 41% 44% 56% 59%;background:var(--hp-aplat);color:var(--hp-encre);display:grid;place-items:center}
.hp__masque > :not(img){width:84%;height:84%}
.hp__masque img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hp :is(.hp__masque,.hp__carte--visuel) .vt > svg{display:block;width:100%;height:100%}
@media (min-width:900px){
  .hp--maille .hp__grille{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);align-items:center;column-gap:clamp(40px,5vw,80px);min-height:min(80svh,860px)}
  .hp--maille .hp__texte{align-self:start;padding-top:clamp(24px,10svh,120px)}
  .hp--maille .hp__texte{--hp-h1:5.2rem}
}

/* Bento : cartes arrondies en grappe (titre et rendez-vous, visuel, sujets, lieu) */
.hp--bento .hp__grille{display:grid;gap:14px;padding-block:14px 28px}
.hp__carte{position:relative;border-radius:var(--hp-r);padding:clamp(22px,3vw,40px);min-width:0}
.hp__carte--texte{background:var(--hp-aplat);color:var(--hp-aplat-texte)}
.hp--bento .hp__carte--texte :is(.hp__sur,.hp__titre .pale){color:var(--hp-accent-texte)!important}
.hp--bento .hp__carte--texte :is(.hp__soins,.hp__via){color:var(--hp-aplat-doux)}
.hp__carte--visuel{overflow:hidden;min-height:240px;padding:0;background:var(--hp-aplat);color:var(--hp-encre);display:grid;place-items:center}
.hp__carte--visuel > :not(img){width:80%;height:80%}
.hp__carte--visuel img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hp .hp__carte--scene{min-height:min(78vw,340px)}
.hp :is(.hp__masque,.hp__carte--visuel,.hp__diapo) > .ea{position:absolute;inset:0;width:auto;height:auto;margin:0}.hp :is(.hp__masque,.hp__diapo) > .ea{border-radius:0}.hp .hp__carte--scene > .ea{width:auto;height:auto}
.hp__carte--sujets{background:var(--hp-carte);box-shadow:inset 0 0 0 1px var(--hp-ligne)}
.hp__carte--sujets ul{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:4px}
.hp .hp__carte--sujets a{display:flex;align-items:center;min-height:44px;color:var(--hp-encre);font-weight:650;text-decoration:underline;text-decoration-color:var(--hp-ligne);text-underline-offset:5px}
.hp .hp__etiquette{margin:0;font-size:.85rem;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--hp-accent-texte)}
.hp__carte--lieu{display:grid;align-content:space-between;gap:12px;background:var(--hp-sombre);color:var(--hp-sombre-texte)}
.hp__carte--lieu p{margin:0;font-weight:600}
.hp .hp__carte--lieu a{display:inline-flex;align-items:center;min-height:44px;color:var(--hp-sombre-texte);font-weight:650;text-decoration:underline;text-underline-offset:5px}
@media (min-width:900px){
  .hp--bento .hp__grille{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr) minmax(0,.8fr);grid-template-rows:minmax(300px,auto) auto;padding-block:20px 40px}
  .hp--bento .hp__carte--texte{grid-row:1 / span 2;align-content:start;--hp-h1:4.8rem}
  .hp--bento .hp__carte--visuel{grid-column:2 / span 2}
}

/* Photo posée sur le fond de la page (fondue, découpée, masquée) : texte sur le fond uni, jamais sur la photo */
.hp--sur-page{display:grid;background:var(--hp-page);color:var(--hp-encre)}
.hp--sur-page .hp__fond{background:transparent}
.hp--sur-page :is(.hp__sur,.hp__titre .pale){color:var(--hp-accent-texte)!important}
.hp--sur-page :is(.hp__soins,.hp__via){color:var(--hp-encre-douce)}
.hp--sur-page .hp__media{position:relative;inset:auto;height:min(54svh,460px)}
.hp--sur-page .hp__cadre{padding-block:20px 48px}
.hp__deco{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}
@media (min-width:900px){
  .hp--sur-page{min-height:min(84svh,900px)}
  .hp--sur-page .hp__media{position:absolute;inset:0 0 0 41.7%;height:auto}
  .hp--sur-page .hp__cadre{align-self:start;padding-block:clamp(72px,16svh,180px) 72px}
  .hp--sur-page .hp__texte{--hp-h1:5rem;max-width:42%}
}
/* Fondu côté texte (ordinateur) ou vers le bas (téléphone) */
.hp--fondu .hp__media{-webkit-mask-image:linear-gradient(180deg,#000 50%,transparent 100%);mask-image:linear-gradient(180deg,#000 50%,transparent 100%)}
@media (min-width:900px){.hp--fondu .hp__media{-webkit-mask-image:linear-gradient(90deg,transparent 0%,transparent 10%,#000 46%);mask-image:linear-gradient(90deg,transparent 0%,transparent 10%,#000 46%)}}
/* Fondue des deux côtés et vers le bas, texte centré dessous */
.hp--fondu-double .hp__media{-webkit-mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent),linear-gradient(180deg,#000 55%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent),linear-gradient(180deg,#000 55%,transparent);mask-composite:intersect}
.hp--fondu-double .hp__texte{justify-items:center;text-align:center;margin-inline:auto}
.hp--fondu-double .hp__actions{justify-content:center}
@media (min-width:900px){
  .hp.hp--fondu-double{min-height:0}
  .hp.hp--fondu-double .hp__media{position:relative;inset:auto;height:min(50svh,560px)}
  .hp.hp--fondu-double .hp__cadre{padding-block:8px 72px}
  .hp.hp--fondu-double .hp__texte{max-width:min(54rem,100%);--hp-h1:4.4rem}
}
/* Voile dégradé de la couleur du cabinet sur la photo (opacité calculée : AA sur n'importe quel pixel) */
.hp.hp--voile-degrade{color:var(--hp-plein-texte)}
.hp.hp--voile-degrade .hp__texte::before{background:var(--hp-voile-plein);box-shadow:0 0 96px 56px var(--hp-voile-plein)}
.hp.hp--voile-degrade .hp__voile{background:linear-gradient(0deg,var(--hp-voile-plein) 0%,transparent 70%)}
.hp.hp--voile-degrade .hp__bouton--plein,.hp.hp--voile-degrade .hp__bouton--plein:hover{background:var(--hp-plein-texte);color:var(--hp-plein);box-shadow:none}
.hp.hp--voile-degrade .hp__bouton:not(.hp__bouton--plein),.hp.hp--voile-degrade .hp__bouton:not(.hp__bouton--plein):hover{color:var(--hp-plein-texte);box-shadow:inset 0 0 0 2px var(--hp-plein-texte)}
@media (min-width:900px){
  .hp.hp--voile-degrade .hp__cadre{padding-block:clamp(96px,19svh,210px) 112px}
  .hp.hp--voile-degrade .hp__texte{max-width:min(40rem,44%)}
  .hp.hp--voile-degrade .hp__texte::before{display:none}
  .hp.hp--voile-degrade .hp__voile{background:linear-gradient(90deg,var(--hp-voile-plein) 0%,var(--hp-voile-plein) 52%,transparent 88%)}
}
/* Vitesse : découpe oblique, bandes qui filent, lignes de vitesse */
.hp__vitesse{position:absolute;left:0;top:calc(min(54svh,460px) + 10px);width:min(70%,520px);height:110px;fill:none;stroke:var(--hp-accent-texte);stroke-width:1.5;opacity:.28}
.hp__vitesse path{vector-effect:non-scaling-stroke}
@media (max-width:899px){.hp__vitesse{display:none}}
.hp--oblique .hp__media{-webkit-clip-path:polygon(0 0,100% 0,100% 86%,0 100%);clip-path:polygon(0 0,100% 0,100% 86%,0 100%)}
.hp__bandes{position:absolute;left:0;right:0;top:calc(min(54svh,460px) - 70px);height:90px}
.hp__bandes span{position:absolute;left:-10%;right:-10%;height:12px;bottom:calc(var(--b,0) * 20px + 6px);transform:rotate(-7deg);transform-origin:left bottom}
.hp__bandes span:nth-child(1){--b:0;background:var(--hp-vif)}
.hp__bandes span:nth-child(2){--b:1;background:var(--hp-aplat);height:8px}
.hp__bandes span:nth-child(3){--b:2;background:var(--hp-bulle);height:5px}
@media (min-width:900px){
  .hp--oblique .hp__media{-webkit-clip-path:polygon(18% 0,100% 0,100% 100%,4% 100%);clip-path:polygon(18% 0,100% 0,100% 100%,4% 100%)}
  .hp__bandes{inset:0 0 0 48%;width:auto;height:auto}
  .hp__bandes span{top:-10%;bottom:-10%;right:auto;height:auto;width:16px;left:calc(var(--b,0) * 24px);transform:skewX(-9deg);transform-origin:center}
  .hp__bandes span:nth-child(2){width:9px;height:auto}
  .hp__bandes span:nth-child(3){width:5px;height:auto}
  .hp__vitesse{display:block;top:5%;height:80px;left:auto;right:56%;width:24%}
}
.hp--parallelogramme .hp__media{margin-inline:20px;-webkit-clip-path:polygon(8% 0,100% 0,92% 100%,0 100%);clip-path:polygon(8% 0,100% 0,92% 100%,0 100%)}
.hp__ombre{position:absolute;left:34px;right:6px;top:14px;height:min(54svh,460px);background:var(--hp-vif);-webkit-clip-path:polygon(8% 0,100% 0,92% 100%,0 100%);clip-path:polygon(8% 0,100% 0,92% 100%,0 100%)}
@media (min-width:900px){
  .hp--parallelogramme .hp__media{inset:11% max(20px,(100% - var(--hp-cadre,1180px)) / 2) 11% 49%;margin:0;-webkit-clip-path:polygon(14% 0,100% 0,86% 100%,0 100%);clip-path:polygon(14% 0,100% 0,86% 100%,0 100%)}
  .hp__ombre{inset:calc(11% + 22px) calc(max(20px,(100% - var(--hp-cadre,1180px)) / 2) - 22px) calc(11% - 22px) calc(49% + 22px);height:auto;-webkit-clip-path:polygon(14% 0,100% 0,86% 100%,0 100%);clip-path:polygon(14% 0,100% 0,86% 100%,0 100%)}
  .hp--parallelogramme .hp__vitesse{right:53%}
}
/* Formes organiques : photo masquée dans une tache, taches de la gamme qui respirent ; ou tache aux bords fondus */
.hp--organique .hp__media{margin:16px auto 0;width:min(88%,460px);height:auto;aspect-ratio:1/1;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cpath d='M163 37c22 21 33 56 23 88s-42 59-79 63-73-12-91-41S0 79 20 52 70 4 105 6s36 10 58 31z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cpath d='M163 37c22 21 33 56 23 88s-42 59-79 63-73-12-91-41S0 79 20 52 70 4 105 6s36 10 58 31z'/%3E%3C/svg%3E") center/contain no-repeat}
.hp__blob{position:absolute;border-radius:58% 42% 51% 49% / 44% 56% 44% 56%}
.hp:is(.hp--organique,.hp--organique-fondu,.hp--parallelogramme) .hp__deco{z-index:-1}
.hp--organique .hp__blob--1{left:50%;top:6px;width:min(96%,500px);aspect-ratio:1/1;translate:-46% 0;background:var(--hp-aplat)}
.hp--organique .hp__blob--2{left:50%;top:min(52vw,300px);width:min(34%,160px);aspect-ratio:1/1;translate:30% 0;background:var(--hp-vif);border-radius:46% 54% 38% 62% / 52% 40% 60% 48%}
.hp--organique .hp__blob--3{left:50%;top:0;width:min(22%,100px);aspect-ratio:1/1;translate:-190% 0;background:var(--hp-bulle)}
@media (min-width:900px){
  .hp.hp--organique .hp__media{position:absolute;inset:8% max(20px,(100% - var(--hp-cadre,1180px)) / 2) 8% auto;margin:0;width:auto;height:84%;max-width:calc(min(100%,var(--hp-cadre,1180px)) * .5 - 24px)}
  .hp--organique .hp__blob--1{left:auto;right:max(4px,(100% - var(--hp-cadre,1180px)) / 2 - 28px);top:6%;width:auto;height:80%;max-width:calc(min(100%,var(--hp-cadre,1180px)) * .5);translate:0 0}
  .hp--organique .hp__blob--2{left:auto;right:max(20px,(100% - var(--hp-cadre,1180px)) / 2 - 10px);top:auto;bottom:5%;width:auto;height:26%;translate:0 0}
  .hp--organique .hp__blob--3{left:50%;top:9%;width:auto;height:13%;translate:0 0}
}
.hp--organique-fondu .hp__media{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-30 -30 260 260'%3E%3Cfilter id='f'%3E%3CfeGaussianBlur stdDeviation='14'/%3E%3C/filter%3E%3Cpath filter='url(%23f)' d='M163 37c22 21 33 56 23 88s-42 59-79 63-73-12-91-41S0 79 20 52 70 4 105 6s36 10 58 31z'/%3E%3C/svg%3E") center/100% 100% no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-30 -30 260 260'%3E%3Cfilter id='f'%3E%3CfeGaussianBlur stdDeviation='14'/%3E%3C/filter%3E%3Cpath filter='url(%23f)' d='M163 37c22 21 33 56 23 88s-42 59-79 63-73-12-91-41S0 79 20 52 70 4 105 6s36 10 58 31z'/%3E%3C/svg%3E") center/100% 100% no-repeat}
.hp--organique-fondu .hp__blob--1{right:-14%;top:-8%;width:76%;aspect-ratio:1/1;background:var(--hp-aplat);opacity:.7}
@media (min-width:900px){.hp.hp--organique-fondu .hp__media{inset:-4% -3% -4% 41.7%}.hp--organique-fondu .hp__blob--1{width:44%}}

/* Mouvement : CSS seul, jamais au premier affichage du titre ; rien si le visiteur réduit les animations */
@media (prefers-reduced-motion:no-preference){
  .hp--typographique .hp__m{animation:hp-mot var(--duree-long,.9s) var(--courbe-sortie,ease-out) both;animation-delay:calc(240ms + var(--k) * 110ms)}
  .hp__tache{animation:hp-tache 18s ease-in-out infinite alternate}
  .hp--maille::before{animation:hp-maille 24s ease-in-out infinite alternate}
  .hp__bandes span{animation:hp-file var(--duree-long,.9s) var(--courbe-sortie,ease-out) both;animation-delay:calc(var(--b,0) * 90ms)}
  .hp__vitesse{animation:hp-file var(--duree-long,.9s) var(--courbe-sortie,ease-out) 200ms both}
  .hp__blob{animation:hp-respire 16s ease-in-out infinite alternate}
  .hp__blob--2{animation-duration:12s;animation-delay:-4s}
  .hp__blob--3{animation-duration:19s;animation-delay:-8s}
}
@supports (animation-timeline:scroll()){@media (prefers-reduced-motion:no-preference){.hp__bandes{animation:hp-defile linear both;animation-timeline:scroll(root);animation-range:0 80vh}}}
@keyframes hp-file{from{opacity:0;translate:-48px 0}}
@keyframes hp-defile{to{translate:72px 0}}
@keyframes hp-respire{to{scale:1.06;rotate:8deg}}
@keyframes hp-mot{from{opacity:0;transform:translate3d(0,.5em,0)}}
@keyframes hp-tache{to{transform:rotate(14deg) scale(1.04)}}
@keyframes hp-maille{to{transform:translate3d(4%,-3%,0) rotate(6deg)}}
@media (prefers-reduced-motion:reduce){
  .hp *,.hp::before{animation:none!important}
  .hp .hp__diapo:not(:first-child){visibility:hidden!important}
  .hp .hp__commandes{display:none!important}
}
@media (prefers-reduced-data:reduce){.hp .hp__diapo:not(:first-child){display:none}.hp .hp__commandes{display:none!important}}
`.replace(/\n\s*/g, '');

/**
 * Script du site (≤ 1 Ko, déféré) : après l'événement load, sans économiseur de données ni réduction des animations, charge les
 * photos suivantes, attend leur décodage puis lance le défilement ; pause par le bouton et hors écran.
 */
export const SCRIPT_HEROS = `(function(){var h=document.querySelector('.hp[data-hp-diapos]');if(!h)return;var c=navigator.connection;
function go(){if(matchMedia('(prefers-reduced-motion: reduce)').matches||(c&&c.saveData))return;
var l=[].slice.call(h.querySelectorAll('img[data-src]'));l.forEach(function(i){if(i.dataset.srcset)i.srcset=i.dataset.srcset;i.src=i.dataset.src});
Promise.all(l.map(function(i){return i.decode()})).then(function(){h.classList.add('hp--joue')},function(){})}
var b=h.querySelector('.hp__pause');if(b)b.addEventListener('click',function(){var p=h.classList.toggle('hp--pause');b.setAttribute('aria-pressed',p);b.setAttribute('aria-label',p?'Reprendre le défilement des photos':'Mettre en pause le défilement des photos')});
if('IntersectionObserver'in window)new IntersectionObserver(function(e){h.classList.toggle('hp--hors',!e[0].isIntersecting)}).observe(h);
if(document.readyState=='complete')go();else addEventListener('load',go)})()`.replace(/\n/g, '');

// ---------------------------------------------------------------------------------------------------------------
// Transitions entre sections (toutes pages) : mêmes sélecteurs que les effets (effets.ts) ; site et aperçu
// ---------------------------------------------------------------------------------------------------------------

const SECTIONS = ':is(.g-section,.section,.eff-section)';
// Vague : bord haut et bas ondulés (masque SVG en ligne, aucune image)
const VAGUE_HAUT = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 48' preserveAspectRatio='none'%3E%3Cpath d='M0 48V28C150 4 300 4 450 22s300 26 450 8 225-22 300-14v24z'/%3E%3C/svg%3E\")";
const VAGUE_BAS = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 48' preserveAspectRatio='none'%3E%3Cpath d='M0 0v20c150 24 300 24 450 6S750-0 900 18s225 22 300 14V0z'/%3E%3C/svg%3E\")";

/** CSS d'une transition entre sections ; vide pour « aucune » */
export function cssTransitionsSections(id: TransitionSections | string | null | undefined): string {
  switch (id) {
    case 'vague': {
      const masque = `${VAGUE_HAUT} top/100% 48px no-repeat,linear-gradient(#000,#000) 0 47px/100% calc(100% - 94px) no-repeat,${VAGUE_BAS} bottom/100% 48px no-repeat`;
      return `${SECTIONS}:nth-child(even of ${SECTIONS}){position:relative;isolation:isolate;padding-block:56px}${SECTIONS}:nth-child(even of ${SECTIONS})::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:var(--g-bulle,var(--accent-tres-pale,var(--doux)));-webkit-mask:${masque};mask:${masque}}`;
    }
    case 'chevauchement':
      return `${SECTIONS}+${SECTIONS}{position:relative;margin-top:-36px;padding-top:36px;border-radius:36px 36px 0 0;background:var(--g-page,var(--fond));box-shadow:0 -22px 40px -30px rgb(var(--nuit-rgb,7 18 20) / .28)}`;
    case 'revelation':
      return `@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){${SECTIONS}>*{animation:ts-revele linear both;animation-timeline:view();animation-range:entry 0% cover 28%}}}@keyframes ts-revele{from{opacity:0;transform:translate3d(0,48px,0) scale(.98)}}`;
    case 'empilees':
      return `:is(.sujets__blocs,.ap-sujets){grid-template-columns:minmax(0,1fr)!important}:is(.sujets__blocs>.sujet,.ap-sujets>li){position:sticky;top:calc(84px + var(--i,0) * 18px);grid-column:auto!important;padding:clamp(14px,2vw,22px);border-radius:var(--rayon-carte,var(--rayon,20px));background:var(--g-carte,var(--fond));box-shadow:0 -14px 34px -22px rgb(var(--nuit-rgb,7 18 20) / .32),inset 0 0 0 1px var(--g-ligne,var(--ligne))}.ap-sujets>li:nth-child(2){--i:1}.ap-sujets>li:nth-child(3){--i:2}.ap-sujets>li:nth-child(4){--i:3}`;
    case 'chevrons': {
      // Liant « chevrons de vitesse » (2026-10-09, sport) : cinq chevrons de plus en plus nets au-dessus de chaque section, couleur
      // de l'accent ; ils filent en place quand la section entre à l'écran (transform, opacity) ; sans prise en charge ou en
      // réduction des animations : posés, fixes. Position absolue : aucun décalage de mise en page.
      const m = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 20' fill='none' stroke='%23000' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 3l8 7-8 7' stroke-opacity='.2'/%3E%3Cpath d='M34 3l8 7-8 7' stroke-opacity='.4'/%3E%3Cpath d='M60 3l8 7-8 7' stroke-opacity='.6'/%3E%3Cpath d='M86 3l8 7-8 7' stroke-opacity='.8'/%3E%3Cpath d='M112 3l8 7-8 7' stroke-opacity='1'/%3E%3C/svg%3E") center/contain no-repeat`;
      return `${SECTIONS}+${SECTIONS}{position:relative}${SECTIONS}+${SECTIONS}::before{content:'';position:absolute;top:0;left:50%;width:132px;height:20px;margin:-10px 0 0 -66px;pointer-events:none;background:var(--g-accent-texte,var(--accent,currentColor));-webkit-mask:${m};mask:${m};opacity:.6}@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){${SECTIONS}+${SECTIONS}::before{animation:ts-chevrons linear both;animation-timeline:view();animation-range:entry 0% cover 25%}}}@keyframes ts-chevrons{from{opacity:0;transform:translate3d(-48px,0,0)}}`;
    }
    default:
      return '';
  }
}
