// PHOTO + TRACÉ (idée de Paul du 2026-10-10, mot pour mot : « superposer des images "sport" trail etc avec des illustrations
// minimalistes »). Sur la photo du premier écran — une photo du kit du profil (trail, course…, toujours l'activité du profil) —
// une illustration minimaliste AU TRAIT qui dialogue avec la photo : l'ingrédient `trace-photo` (dé et verrou du Studio, notable,
// duels, Dégustation), « à valider » partout.
//
// AUCUN DESSIN NOUVEAU : tout vient des géométries validées —
// - lignes de niveau et crête de la montagne, sentier en lacets et ses pas (entete-pied-geo.ts, montagne : animation et image
//   fixe pi-trail-montagne) ;
// - contour de la semelle et courbes de niveau du relief (entete-empreintes-geo.ts : fond « empreintes ») ;
// - chevron de vitesse et cadran du chronomètre (entete-pied.ts : pi-chevrons, pi-chrono), sans chiffre ni aiguille de mesure.
//
// Règles (photo-trace.test.ts, planche scratchpad photo-trace) : balisage + feuille < 4 Ko par tracé ; SVG en ligne, jamais
// d'image (la photo reste l'élément LCP) ; position absolue dans le cadre de la photo (CLS 0, aucun débordement de page) ; trait
// de la couleur vive de la gamme ou blanc (photo plein cadre sombre) ; seuls opacity et stroke-dashoffset animés, une fois, au
// chargement, image FIXE finale (réduction des animations : directement l'image fixe) ; premiers écrans hôtes seulement
// (HOTES_TRACE_PHOTO : le texte n'est jamais sur la photo, son contraste ne change pas).

import { luminance } from './couleurs';
import { GEO_PIED as P } from './entete-pied-geo';
import { GEO_EMPREINTES as E } from './entete-empreintes-geo';
import { HOTES_TRACE_PHOTO, estTracePhoto, type TracePhoto } from './heros-photo-variantes';

type Trace = Exclude<TracePhoto, 'aucun'>;
const r1 = (v: number) => Math.round(v * 10) / 10;

// ---------------------------------------------------------------------------------------------------------------
// Activités : le tracé dit la même chose que la photo (jamais une montagne sur une photo de route)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Activités (pratiques.ts, podologue) que chaque tracé peut accompagner ; null = tracé universel (empreintes : le pied, quelle que
 * soit l'activité). La montagne et le sentier : trail, randonnée (et ski pour les lignes de niveau) ; les chevrons :
 * les sports de vitesse et d'appuis ; le chrono : les sports chronométrés.
 */
export const ACTIVITES_TRACES: Readonly<Record<Trace, readonly string[] | null>> = {
  topographie: ['trail', 'randonnee', 'ski'], 'topographie-anime': ['trail', 'randonnee', 'ski'],
  lacets: ['trail', 'randonnee'], 'lacets-anime': ['trail', 'randonnee'],
  empreintes: null,
  chevrons: ['course', 'trail', 'football', 'rugby', 'basket', 'tennis', 'handball', 'cyclisme', 'ski'],
  chrono: ['course', 'trail', 'cyclisme', 'natation', 'ski'],
};
/** Tracés vifs (énergie forte) : jamais pour le diabète ni les seniors */
export const TRACES_VIFS: readonly Trace[] = ['chevrons', 'chrono', 'lacets-anime'];
/** Tracés qui se dessinent au chargement (une seule fois, image fixe finale) */
export const TRACES_ANIMES: readonly Trace[] = ['lacets-anime', 'topographie-anime'];
/** Sujets calmes (il faut rassurer) */
const CALMES = ['diabete', 'senior'];

/** Mots des adresses de photos qui trahissent une activité (banque intégrée et photos importées nommées par leur requête) */
const MOTS_PHOTOS: Readonly<Record<string, readonly string[]>> = {
  trail: ['trail'], randonnee: ['randonnee', 'rando', 'hiking', 'montagne', 'mountain'], course: ['course', 'running', 'runner', 'foulee', 'road'],
  football: ['football', 'foot', 'soccer'], rugby: ['rugby'], basket: ['basket', 'basketball'], tennis: ['tennis', 'padel'], handball: ['handball'],
  cyclisme: ['cyclisme', 'cycling', 'velo', 'bike'], ski: ['ski'], natation: ['natation', 'swimming', 'piscine', 'pool'], golf: ['golf'], danse: ['danse', 'ballet'],
};
/** Activités lisibles dans l'adresse d'une photo (« /photos/sport-trail.webp » → trail) */
export function activitesDeLaPhoto(url: string | null | undefined): string[] {
  const j = new Set((url ?? '').toLowerCase().split(/[^a-z]+/).filter(Boolean));
  // « trail » prime sur « course » (une photo de trail est aussi une course) : jamais les deux lus ensemble
  const l = Object.entries(MOTS_PHOTOS).filter(([, m]) => m.some((x) => j.has(x))).map(([a]) => a);
  return l.includes('trail') ? l.filter((a) => a !== 'course') : l;
}

/**
 * Le tracé convient-il ? Activités du profil et de la photo toutes couvertes par le tracé (tracé universel : toujours) ; sujet
 * calme (diabète, seniors) : jamais un tracé vif ; premier écran hôte seulement ; jamais deux tracés à la fois (une animation
 * d'en-tête ou un visuel animé occupe déjà l'écran). `sansActivite` : composition d'une recette, l'activité sera vérifiée au rendu.
 */
export function tracePhotoPermis(t: unknown, o: { accueil?: unknown; activites?: readonly string[]; photo?: string | null; sujets?: readonly string[]; animation?: string | null; sansActivite?: boolean } = {}): t is Trace {
  if (!estTracePhoto(t) || t === 'aucun') return false;
  if (o.accueil !== undefined && !HOTES_TRACE_PHOTO.includes(o.accueil as string)) return false;
  if (o.animation && o.animation !== 'aucune') return false;
  if ((o.sujets ?? []).some((s) => CALMES.includes(s)) && TRACES_VIFS.includes(t)) return false;
  const permises = ACTIVITES_TRACES[t];
  // Composition d'une recette (sans photo choisie) : l'activité est vérifiée au rendu, avec la photo
  if (!permises || o.sansActivite) return true;
  const activites = [...(o.activites ?? []), ...activitesDeLaPhoto(o.photo)];
  // Tracé d'activité : il faut une activité connue, et toutes couvertes (une photo de route n'a pas de montagne)
  return activites.length > 0 && activites.every((a) => permises.includes(a));
}

/** Tracé effectif d'un premier écran (rendu du site et de l'aperçu) : celui de la recette s'il convient, sinon aucun */
export const tracePhotoEffectif = (t: unknown, o: Parameters<typeof tracePhotoPermis>[1] = {}): Trace | null => (tracePhotoPermis(t, o) ? t : null);

// ---------------------------------------------------------------------------------------------------------------
// Dessins : tracés « couvrants » (repère 400 × 300 posé en « slice » sur la photo : il la couvre, centre au centre) et
// tracés « en coin » (boîte propre dans un coin de la photo : en bas à droite sur ordinateur, en haut sur téléphone, là où la
// photo fondue est encore nette)
// ---------------------------------------------------------------------------------------------------------------

/** Montagne (repère × 4 de la scène 300 × 240 de pi-trail-montagne) : courbes de niveau et crête */
const MONTAGNE = `<g transform="translate(40 -60)scale(.46)">${P.montagne.niveaux.map((n) => `<path d="${n.d}" class="tp-n" style="--k:${n.k}"/>`).join('')}<path d="${P.montagne.crete}" class="tp-c"/></g>`;
/** Pose du sentier sur la photo (repère 300 × 240 de pi-trail-montagne) : il monte du bas à gauche vers le sommet */
const LACETS = 'translate(-30 -80)scale(1.7)';
const SOMMET = '<path d="M176 57l8 13h-16z" class="tp-s"/>';
/** Opacité de chaque niveau de relief (du plus bas au plus haut), comme le fond « empreintes » */
const OPACITE = ['.4', '.55', '.7', '.85', '1'];

const couvre = (c: string) => `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${c}</svg>`;
const coin = (vb: string, c: string) => `<svg viewBox="${vb}" class="tp-coin" aria-hidden="true">${c}</svg>`;

const CORPS: Record<Trace, () => string> = {
  // Lignes de niveau : la montagne en grand, qui sort du cadre en haut à droite (la photo est le terrain, le tracé la carte)
  topographie: () => couvre(MONTAGNE),
  'topographie-anime': () => couvre(MONTAGNE),
  // Sentier en lacets : il monte en travers de la photo jusqu'au sommet ; pointillé
  lacets: () => couvre(`<g transform="${LACETS}"><path d="${P.montagne.sentier}" class="tp-l"/>${SOMMET}</g>`),
  // Même sentier, révélé par un masque qui se dessine (stroke-dashoffset) ; image fixe finale = « lacets »
  'lacets-anime': () => couvre(`<defs><mask id="tp-m" maskUnits="userSpaceOnUse" x="-50" y="-50" width="500" height="400"><path d="${P.montagne.sentier}" pathLength="1" class="tp-mk" transform="${LACETS}"/></mask></defs><g mask="url(#tp-m)"><path d="${P.montagne.sentier}" class="tp-l" transform="${LACETS}"/></g><g transform="${LACETS}">${SOMMET}</g>`),
  // Empreintes en filigrane : les deux semelles en lignes de niveau, sur le bord droit de la photo
  empreintes: () => coin('-10 -10 800 1000', `<defs><g id="tp-e"><path d="${E.contour}"/>${E.groupes.filter((g) => g.k % 2 === 0).map((g) => `<path d="${g.d}" stroke-opacity="${OPACITE[g.k]}"/>`).join('')}</g></defs><use href="#tp-e" transform="matrix(-1 0 0 1 368 0)"/><use href="#tp-e" transform="translate(410 100)"/>`),
  // Chevrons de vitesse : une rangée qui file vers l'avant, du plus pâle au plus franc
  chevrons: () => coin('0 0 190 70', `<defs><path id="tp-v" d="M-13-28 13 0-13 28"/></defs>${Array.from({ length: 5 }, (_, i) => `<use href="#tp-v" x="${22 + i * 36}" y="35" style="--i:${i}"/>`).join('')}`),
  // Cadran de chrono au trait (graduations sans chiffre, aiguille posée) et traits de vitesse
  chrono: () => coin('0 28 240 186', `<path class="tp-vl" d="M24 104h46M10 128h60M32 152h38"/><path d="M148 34h20a5 5 0 0 1 0 10h-20a5 5 0 0 1 0-10zM152 44h12v10h-12z"/><circle cx="158" cy="130" r="76"/><circle cx="158" cy="130" r="60" pathLength="60" class="tp-g"/><path d="M158 130 192 88"/><circle cx="158" cy="130" r="4" class="tp-ax"/>`),
};

/**
 * Couleur du trait : la couleur vive de la gamme quand elle est lumineuse (Mangue, Pastèque, Menthe…) ; sinon BLANC (gammes
 * classiques : leur accent est sombre et disparaîtrait dans la photo). Une ombre portée très légère le détache des photos claires.
 */
export function traitBlanc(style: string): boolean {
  const vif = /--hp-vif:(#[0-9a-f]{6})/i.exec(style)?.[1];
  return !vif || luminance(vif) < SEUIL_TRAIT_VIF;
}
/** Luminance relative minimale de la couleur vive pour la garder en trait sur une photo */
export const SEUIL_TRAIT_VIF = 0.3;

/** Balisage de la couche du tracé (dans le cadre de la photo, au-dessus d'elle) */
export function htmlTracePhoto(t: Trace, o: { blanc?: boolean } = {}): string {
  return `<div class="hp__tp hp__tp--${t}${TRACES_ANIMES.includes(t) ? ' hp__tp--anime' : ''}${o.blanc ? ' hp__tp--blanc' : ''}" aria-hidden="true">${CORPS[t]()}</div>`;
}

const COMMUN = `.hp__tp{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden;color:var(--hp-vif);filter:drop-shadow(0 1px 2px rgb(0 0 0/.4))}
.hp__tp--blanc{color:#fff}
.hp__tp svg{position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px}
.hp__tp svg *{vector-effect:non-scaling-stroke}
.hp__tp .tp-coin{inset:auto 5% 7% auto;width:var(--tp-l);height:auto}
@media (max-width:899px){.hp__tp .tp-coin{top:6%;bottom:auto}}`;
const TOPO = (t: string) => `.hp__tp--${t} .tp-n{stroke-width:1.8px;opacity:calc(.55 + var(--k) * .11)}.hp__tp--${t} .tp-c{stroke-width:2.2px;stroke-dasharray:2 7}`;
const LIGNE = (t: string) => `.hp__tp--${t} .tp-l{stroke-width:3.4px;stroke-dasharray:0 9}.hp__tp--${t} .tp-s{fill:currentColor;stroke:none}`;
/** Feuille propre à chaque tracé (état fixe ; lecture une fois au chargement, sans script, sauf réduction des animations) */
const CSS: Record<Trace, string> = {
  topographie: TOPO('topographie'),
  'topographie-anime': `${TOPO('topographie-anime')}
@media (prefers-reduced-motion:no-preference){.hp__tp--topographie-anime .tp-n{animation:hp-tp-o 1.1s ease-out both;animation-delay:calc(.3s + var(--k) * 260ms)}.hp__tp--topographie-anime .tp-c{animation:hp-tp-o 1s 1.7s ease-out both}}
@keyframes hp-tp-o{from{opacity:0}}`,
  lacets: LIGNE('lacets'),
  'lacets-anime': `${LIGNE('lacets-anime')}.tp-mk{stroke:#fff;stroke-width:16;stroke-linecap:butt;vector-effect:none!important}
@media (prefers-reduced-motion:no-preference){.tp-mk{stroke-dasharray:1;animation:hp-tp-d 2.6s .4s cubic-bezier(.45,0,.3,1) both}.hp__tp--lacets-anime .tp-s{animation:hp-tp-o .5s 2.9s ease-out both}}
@keyframes hp-tp-d{from{stroke-dashoffset:1}}@keyframes hp-tp-o{from{opacity:0}}`,
  empreintes: `.hp__tp--empreintes svg{inset:6% 4% 6% auto;width:auto;height:88%;aspect-ratio:4/5;stroke-width:1.5px}@media (max-width:899px){.hp__tp--empreintes svg{inset:5% 3% auto auto;height:70%}}`,
  chevrons: `.hp__tp--chevrons{--tp-l:clamp(130px,32%,250px)}.hp__tp--chevrons use{stroke-width:4px;opacity:calc(.35 + var(--i) * .16)}`,
  chrono: `.hp__tp--chrono{--tp-l:clamp(120px,26%,210px)}.tp-g{stroke-dasharray:.08 .92;stroke-width:3px}.tp-vl{opacity:.75}.tp-ax{fill:currentColor}`,
};

/** Feuille du tracé (commune + propre ; vide sans tracé) */
export const cssTracePhoto = (t: TracePhoto | null | undefined): string => (t && t !== 'aucun' ? (COMMUN + CSS[t]).replace(/\n\s*/g, '') : '');

/** Poids (octets) du balisage et de la feuille d'un tracé : < 4 Ko exigé */
export const poidsTracePhoto = (t: Trace) => new TextEncoder().encode(htmlTracePhoto(t) + cssTracePhoto(t)).length;
