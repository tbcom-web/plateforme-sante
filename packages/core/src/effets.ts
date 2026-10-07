// Jeux d'effets du site (studio de recettes, demande de Paul du 2026-10-07) : survol des visuels, apparition au défilement,
// transitions entre pages, micro-interactions des boutons — par JEUX cohérents (Sobre, Doux, Vivant, Éditorial), jamais au cas
// par cas. Une seule feuille CSS par jeu, partagée par les gabarits Astro (layouts/Gabarit.astro : <style> en ligne et
// data-effets sur <html>) et par l'aperçu de l'admin (ApercuTheme) : même rendu des deux côtés.
//
// Contraintes (vitesse et référencement, règles de Paul) :
// - CSS seul, AUCUN JavaScript : transform et opacity seulement pour le mouvement (filter et background-size : peinture, jamais
//   de recalcul de mise en page) ; aucun effet sur le premier écran (élément LCP : titre, héros) ; CLS nul ;
// - apparition au défilement par `animation-timeline: view()` en AMÉLIORATION PROGRESSIVE (@supports) : sans prise en charge,
//   sans CSS ou pour un robot, tout le contenu est visible tel quel (aucun état caché par défaut) ;
// - prefers-reduced-motion : aucun mouvement (ni apparition, ni zoom, ni transition de page) ;
// - voile de la gamme posé sur l'IMAGE seulement (jamais sous un texte : contrastes AA inchangés) ;
// - poids : moins de 3 Ko gzip pour l'ensemble des jeux (testé, effets.test.ts) ; un site n'embarque que le sien.
// Module pur.

export const JEUX_EFFETS = [
  { id: 'sobre', nom: 'Sobre', description: 'Aucun mouvement ; liens soulignés au survol, boutons qui réagissent au clic.' },
  { id: 'doux', nom: 'Doux', description: 'Sections en fondu à l’apparition, léger zoom des visuels, transition douce entre les pages.' },
  { id: 'vivant', nom: 'Vivant', description: 'Cartes en cascade, voile de la couleur du cabinet au survol, boutons qui se soulèvent.' },
  { id: 'editorial', nom: 'Éditorial', description: 'Photos en noir et blanc qui passent en couleur, soulignement animé des titres, fondu lent.' },
] as const;
export type IdJeuEffets = (typeof JEUX_EFFETS)[number]['id'];
export const jeuEffets = (id: unknown) => JEUX_EFFETS.find((j) => j.id === id);

/** Visuels concernés (cartes de soins, sujets, galerie ; site et aperçu de l'admin) — jamais le premier écran */
const VISUELS = ':is(.soin__visuel,.sujet__visuel,.galerie li,.eff-visuel)';
const CARTES = ':is(.soin,.sujet,.eff-carte)';
const TITRES = ':is(.soin__titre,.sujet__titre,.eff-titre)';
const BOUTONS = ':is(.g-bouton,.bouton,.eff-bouton)';
const SECTIONS = ':is(.g-section,.section,.eff-section)';

const SANS_MOUVEMENT = (css: string) => `@media (prefers-reduced-motion:no-preference){${css}}`;
const PROGRESSIF = (css: string) => `@supports (animation-timeline:view()){${SANS_MOUVEMENT(css)}}`;
const PAGES = '@view-transition{navigation:auto}::view-transition-old(root),::view-transition-new(root){animation-duration:.28s}@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}';
const APPARITION = (r: string, d: number, ty: number) => `@keyframes eff-in{from{opacity:0;transform:translateY(${ty}px)}}${r} ${SECTIONS}:not(:first-of-type){animation:eff-in linear both;animation-timeline:view();animation-range:entry 0% entry ${d}%}`;
const BOUTON = (r: string, leve: boolean) => `${r} ${BOUTONS}{transition:transform .15s ease-out}${r} ${BOUTONS}:active{transform:scale(.97)}${leve ? SANS_MOUVEMENT(`${r} ${BOUTONS}:hover{transform:translateY(-2px)}`) : ''}`;
const SOULIGNE = (r: string) => `${r} ${TITRES}{background:linear-gradient(currentColor,currentColor) 0 100%/0 2px no-repeat;transition:background-size .3s ease-out}${r} ${CARTES}:hover ${TITRES}{background-size:100% 2px}`;
const ZOOM = (r: string, z: number) => `${r} ${VISUELS}{overflow:hidden}${r} ${VISUELS}>*{transition:transform .45s ease-out}` + SANS_MOUVEMENT(`${r} ${CARTES}:hover ${VISUELS}>*,${r} .galerie li:hover>*{transform:scale(${z})}`);

/** Feuille CSS d'un jeu d'effets (racine `[data-effets="…"]`) ; chaîne vide pour un jeu inconnu */
export function cssEffets(id: unknown): string {
  const j = jeuEffets(id);
  if (!j) return '';
  const r = `[data-effets=${j.id}]`;
  switch (j.id) {
    case 'sobre':
      return `${r} main a:not([class]):hover{text-decoration-thickness:2px}${BOUTON(r, false)}`;
    case 'doux':
      return `${PAGES}${BOUTON(r, false)}${ZOOM(r, 1.03)}${PROGRESSIF(APPARITION(r, 30, 18))}`;
    case 'vivant':
      return `${PAGES}${BOUTON(r, true)}${ZOOM(r, 1.05)}${r} ${VISUELS}{position:relative}${r} ${VISUELS}::after{content:'';position:absolute;inset:0;background:var(--g-vif,var(--accent,#2d5bff));opacity:0;transition:opacity .3s;pointer-events:none}${r} ${CARTES}:hover ${VISUELS}::after{opacity:.16}`
        + PROGRESSIF(`${APPARITION(r, 30, 24)}${r} :is(.ed__soins,.sujets__blocs,.eff-grille)>li{animation:eff-in linear both;animation-timeline:view();animation-range:entry 0% entry 40%}${r} :is(.ed__soins,.sujets__blocs,.eff-grille)>li:nth-child(3n+2){animation-range:entry 6% entry 46%}${r} :is(.ed__soins,.sujets__blocs,.eff-grille)>li:nth-child(3n){animation-range:entry 12% entry 52%}`);
    case 'editorial':
      return `${PAGES}${BOUTON(r, false)}${SOULIGNE(r)}${r} ${VISUELS} img{filter:grayscale(1);transition:filter .5s}${r} ${CARTES}:hover ${VISUELS} img,${r} .galerie li:hover img{filter:none}${PROGRESSIF(APPARITION(r, 45, 10))}`;
  }
}

/**
 * Démonstration du survol (studio de recettes, aperçu de l'admin) : les règles « au survol » du jeu, rejouées sans souris quand
 * la racine porte `data-survol` (l'aperçu l'alterne en boucle). Jamais utilisé par le site publié.
 */
export function cssSurvolSimule(id: unknown): string {
  const j = jeuEffets(id);
  if (!j) return '';
  const r = `[data-effets=${j.id}]`;
  // Règles simples « sélecteurs{déclarations} » contenant :hover, y compris dans les @media (les blocs @media sont aplatis :
  // la démonstration ne s'affiche que si l'aperçu le demande)
  const regles = [...cssEffets(j.id).matchAll(/([^{}@]+:hover[^{}]*)\{([^{}]*)\}/g)];
  return regles.map(([, sel, decl]) => `${sel.split(',').map((s) => s.trim().replace(r, `${r}[data-survol]`).replace(/:hover/g, '')).join(',')}{${decl}}`).join('');
}
