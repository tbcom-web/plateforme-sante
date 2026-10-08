// Présentations des portraits des praticiens (portraits-variantes.ts) : balisage HTML et feuille de style UNIQUES, partagés par
// le site publié (apps/sites/src/components/PortraitsPraticiens.astro, bloc praticiens de l'accueil et de « Le cabinet », tous
// gabarits) et l'aperçu de l'admin (ApercuPortraits.tsx : Studio, tuiles de « Donner mon avis », duels) : rendu identique par
// construction, comme heros-photo.ts.
//
// Contenu : EXACTEMENT celui des fiches existantes (nom en H3, métier et ville, statut et présence, orientations, détail replié
// « En savoir plus sur … » : présentation, diplôme, sports, formations, inscription ; bouton de rendez-vous). Aucun texte nouveau,
// aucun intertitre H1/H2 : SEO identique. Sans photo : monogramme (initiales) sur la teinte de la gamme, jamais un visage de
// banque d'images.
//
// Fonctionne pour 1, 2, 3 et 4 praticiens ou plus (data-n) : requêtes de conteneur (largeur du bloc, puis de chaque fiche), une
// colonne sur téléphone, jamais de débordement (le bandeau défilant défile DANS son cadre).
//
// Images : <img> réel, srcset des rendus du studio portrait (4:5) et `sizes` propre à chaque présentation, largeur et hauteur
// fixées + aspect-ratio du cadre (CLS 0), loading="lazy" (le bloc n'est jamais dans le premier écran). Cadrage : object-position
// sur le visage (le studio compose le 4:5 visage à 40 % de la hauteur ; recadrages carrés et ronds remontés à 28-30 %), jamais
// de visage coupé : le texte en surimpression (voile) reste dans le bas du cadre. Traitement des photos de la recette : la photo
// n'a PAS la classe .praticien__photo, le filtre uniforme du site (traitements-photos.ts) s'y applique.
//
// Lisibilité (voile) : le nom et le titre posés sur la photo ont leur propre fond, la couleur sombre de la gamme à une opacité
// CALCULÉE (alphaVoile, heros-photo.ts) pour que le texte reste ≥ 4,6:1 même sur un pixel blanc ; le fondu vers la photo ne
// porte aucun texte.

import { couleursGabarit } from './gabarits';
import { alphaVoile } from './heros-photo';
import { rvb } from './couleurs';
import type { ModeleManifeste } from './modeles';
import { altPortrait } from './portrait';
import { type PresentationPortraits } from './portraits-variantes';

export * from './portraits-variantes';

// ---------------------------------------------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------------------------------------------

export type PhotoPortraitPraticien = {
  src: string;
  /** Rendus du studio portrait (4:5), « url 400w, url 640w… » */
  srcset?: string;
  largeur: number;
  hauteur: number;
  /** Attributs supplémentaires (mode édition du site : data-champ…) */
  attributs?: Record<string, string>;
};

export type PortraitPraticien = {
  prenom: string;
  nom: string;
  /** Métier et ville (« Pédicure-podologue à Lyon ») */
  titre: string;
  /** Métier seul (texte alternatif du portrait : « Portrait de Camille Rousseau, pédicure-podologue ») */
  metier: string;
  /** Statut et présence (« Titulaire du cabinet · Mercredi et jeudi ») ; '' : rien */
  statut: string;
  orientations: readonly string[];
  photo: PhotoPortraitPraticien | null;
  /** Portrait du studio au fond remplacé (aplat, dégradé, cercle) : il se fond dans l'aplat de la présentation « detoure » */
  detoure?: boolean;
  /** Détail replié : présentation, puis lignes (dt, valeurs ; `liste` : en liste à puces) */
  detail: { bio?: string; lignes: { dt: string; dd: readonly string[]; liste?: boolean }[] };
  rdv: { href: string; libelle: string; via?: string | null } | null;
};

export type DonneesPortraits = {
  variante: PresentationPortraits;
  praticiens: readonly PortraitPraticien[];
  /** Variables --pp-* (styleCouleursPortraits) */
  couleurs: string;
  /** Classes du bouton de rendez-vous (site : celles du gabarit) ; défaut : bouton propre à la présentation */
  classeBouton?: string;
  classeVia?: string;
};

// ---------------------------------------------------------------------------------------------------------------
// Couleurs
// ---------------------------------------------------------------------------------------------------------------

const ROLES = ['page', 'carte', 'doux', 'bulle', 'bulle-texte', 'ligne', 'encre', 'encre-douce', 'accent-texte', 'plein', 'plein-texte', 'plein-bord', 'sombre', 'sombre-texte', 'aplat', 'aplat-texte'] as const;

/** Variables --pp-* (style en ligne du bloc) : couleurs du gabarit (« tableau » pour le classique), voile AA calculé */
export function styleCouleursPortraits(m: Pick<ModeleManifeste, 'gabarit' | 'jetons'>, choix: { couleur: string; gamme?: string | null }): string {
  const c = couleursGabarit(m.gabarit && m.gabarit !== 'classique' ? m : { ...m, gabarit: 'tableau' }, choix);
  const a = alphaVoile(c.sombre, [c['sombre-texte']]);
  const [r, g, b] = rvb(c.sombre);
  return [...ROLES.map((k) => `--pp-${k}:${c[k]}`), `--pp-voile:rgb(${r} ${g} ${b} / ${a})`].join(';');
}

// ---------------------------------------------------------------------------------------------------------------
// Balisage
// ---------------------------------------------------------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Mots composés (« pédicure-podologue », « Marie-Dominique ») jamais coupés : même règle que lib/typo.mjs des sites */
const COMPOSE = /[\p{L}\p{M}’']+(?:-[\p{L}\p{M}’']+)+/gu;
export const insecablesPortraits = (t: string) => esc(t).replace(COMPOSE, (m) => `<span class="pp-lie">${m}</span>`);
/** Plus long mot insécable (taille du nom) */
const motLong = (t: string) => Math.min(24, Math.max(10, ...t.split(/[\s,.;:!?()«»]+/).map((x) => [...x].length)));
const initiales = (p: Pick<PortraitPraticien, 'prenom' | 'nom'>) => `${p.prenom.trim().charAt(0)}${p.nom.trim().charAt(0)}`.toUpperCase() || '·';

/** Nombre de praticiens tel que lu par la feuille de style : 1, 2, 3, 4, ou « plus » (5 et au-delà) */
export const nombrePortraits = (n: number) => (n <= 4 ? String(Math.max(1, n)) : 'plus');

/** Largeur d'affichage de la photo (attribut sizes) selon la présentation et le nombre de praticiens */
export function taillesPortrait(v: PresentationPortraits, n: number): string {
  const tel = 'calc(100vw - 48px)';
  if (v === 'anneau') return '(min-width: 760px) 200px, 168px';
  if (v === 'sobre') return '72px';
  if (v === 'organique') return n === 1 ? '(min-width: 760px) 340px, 72vw' : '(min-width: 760px) 300px, 72vw';
  if (v === 'defilement') return n === 1 ? `(min-width: 760px) 420px, ${tel}` : '(min-width: 760px) 300px, 78vw';
  if (v === 'editorial') return `(min-width: 760px) 440px, ${tel}`;
  if (n === 1) return `(min-width: 760px) 440px, ${tel}`;
  if (n === 2) return `(min-width: 1100px) 540px, (min-width: 700px) 45vw, ${tel}`;
  return `(min-width: 1100px) 360px, (min-width: 700px) 45vw, ${tel}`;
}

function photo(p: PortraitPraticien, d: DonneesPortraits): string {
  if (!p.photo) return `<span class="pp__mono" aria-hidden="true">${esc(initiales(p))}</span>`;
  const f = p.photo;
  const extra = Object.entries(f.attributs ?? {}).map(([k, v]) => ` ${esc(k)}="${esc(v)}"`).join('');
  return `<img class="pp__photo" src="${esc(f.src)}"${f.srcset ? ` srcset="${esc(f.srcset)}" sizes="${taillesPortrait(d.variante, d.praticiens.length)}"` : ''} width="${Math.round(f.largeur)}" height="${Math.round(f.hauteur)}" alt="${esc(altPortrait(p.prenom, p.nom, p.metier))}" loading="lazy" decoding="async"${extra}>`;
}

function fiche(p: PortraitPraticien, i: number, d: DonneesPortraits): string {
  const nom = `${p.prenom} ${p.nom}`.trim();
  const lignes = p.detail.lignes.filter((l) => l.dd.length);
  const detail = p.detail.bio || lignes.length
    ? `<details class="pp__detail"><summary><span>${esc(`En savoir plus sur ${nom}`)}</span></summary>${p.detail.bio ? `<p class="pp__bio">${insecablesPortraits(p.detail.bio)}</p>` : ''}${lignes.length ? `<dl>${lignes.map((l) => `<dt>${esc(l.dt)}</dt><dd>${l.liste ? `<ul>${l.dd.map((x) => `<li>${insecablesPortraits(x)}</li>`).join('')}</ul>` : l.dd.map((x) => `<span class="pp__ligne">${insecablesPortraits(x)}</span>`).join('')}</dd>`).join('')}</dl>` : ''}</details>`
    : '';
  const rdv = p.rdv
    ? `<a class="${esc(d.classeBouton || 'pp-bouton')} pp__rdv" href="${esc(p.rdv.href)}"><span>${esc(p.rdv.libelle)}</span>${p.rdv.via ? `<span class="${esc(d.classeVia || 'pp-via')}">${esc(p.rdv.via)}</span>` : ''}</a>`
    : '';
  return `<li class="pp__fiche" style="--pp-i:${i}"><div class="pp__corps">`
    + `<div class="pp__visuel${p.photo ? '' : ' pp__visuel--vide'}${p.detoure ? ' pp__visuel--detoure' : ''}">${photo(p, d)}</div>`
    + `<div class="pp__entete" style="--pp-mot:${motLong(nom)}"><h3 class="pp__nom">${insecablesPortraits(nom)}</h3><p class="pp__titre">${insecablesPortraits(p.titre)}</p></div>`
    + `<div class="pp__suite">${p.statut ? `<p class="pp__statut">${insecablesPortraits(p.statut)}</p>` : ''}${p.orientations.length ? `<ul class="pp__orientations" aria-label="Orientations">${p.orientations.map((o) => `<li>${insecablesPortraits(o)}</li>`).join('')}</ul>` : ''}${detail}${rdv}</div>`
    + `</div></li>`;
}

/** HTML du bloc (sans la feuille : CSS_PORTRAITS, à poser une fois par page) */
export function htmlPortraits(d: DonneesPortraits): string {
  const n = d.praticiens.length;
  if (!n) return '';
  // Bandeau défilant : la liste défile dans son cadre, atteignable au clavier (région nommée, focus visible)
  const liste = d.variante === 'defilement' ? ' tabindex="0" aria-label="Praticiens"' : '';
  return `<div class="pp pp--${d.variante}" data-n="${nombrePortraits(n)}" style="${esc(d.couleurs)}"><ul class="pp__liste" role="list"${liste}>${d.praticiens.map((p, i) => fiche(p, i, d)).join('')}</ul></div>`;
}

// ---------------------------------------------------------------------------------------------------------------
// Feuille de style (une seule, toutes présentations ; aucune couleur littérale : variables --pp-*)
// ---------------------------------------------------------------------------------------------------------------

export const CSS_PORTRAITS = `
.pp{container:pp/inline-size;--pp-r:var(--rayon-carte,var(--rayon-grand,18px));color:var(--pp-encre);text-align:start}
.pp *,.pp *::before,.pp *::after{box-sizing:border-box}
.pp .pp-lie{white-space:nowrap}
.pp .pp__liste{list-style:none;margin:0;padding:0;display:grid;gap:clamp(18px,3cqi,32px);grid-template-columns:minmax(0,1fr)}
.pp .pp__fiche{min-width:0;margin:0;padding:0;container:ppf/inline-size}
.pp .pp__fiche::before{content:none}
.pp .pp__corps{display:grid;grid-template-columns:minmax(0,1fr);grid-template-areas:"v" "e" "s";grid-template-rows:auto auto 1fr;gap:12px 32px;height:100%}
.pp .pp__visuel{grid-area:v;position:relative;overflow:hidden;aspect-ratio:4/5;margin:0;background:var(--pp-doux);border-radius:var(--pp-r)}
.pp .pp__photo{display:block;width:100%;height:100%;max-width:none;object-fit:cover;object-position:50% 30%;border-radius:0}
.pp .pp__mono{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--police-titres);font-weight:var(--graisse-titres,600);font-size:clamp(2.2rem,24cqi,5.2rem);line-height:1;letter-spacing:-.04em;color:var(--pp-bulle-texte);background:radial-gradient(circle at 32% 26%,var(--pp-bulle) 0,var(--pp-doux) 72%)}
.pp .pp__entete{grid-area:e;min-width:0;align-self:start}
.pp .pp__nom{margin:0;padding:0;font-family:var(--police-titres);font-weight:var(--graisse-titres,650);line-height:1.08;letter-spacing:-.02em;color:inherit;font-size:min(var(--pp-nom,1.45rem),calc(100cqi / (var(--pp-mot,14) * .62)));text-wrap:balance}
.pp .pp__titre{margin:4px 0 0;color:var(--pp-encre-douce)}
.pp .pp__suite{grid-area:s;display:flex;flex-direction:column;align-items:flex-start;gap:12px;min-width:0}
.pp .pp__statut{margin:0;font-size:.92rem;color:var(--pp-encre-douce)}
.pp .pp__orientations{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.pp .pp__orientations li{margin:0;padding:5px 12px;border-radius:999px;background:var(--pp-bulle);color:var(--pp-bulle-texte);font-size:.9rem;font-weight:600;line-height:1.35}
.pp .pp__orientations li::before{content:none}
.pp .pp__detail{align-self:stretch;border-top:1px solid var(--pp-ligne)}
.pp .pp__detail summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;cursor:pointer;font-weight:650;list-style:none}
.pp .pp__detail summary::-webkit-details-marker{display:none}
.pp .pp__detail summary::after{content:'+';flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--pp-bulle);color:var(--pp-bulle-texte);font-weight:700}
.pp .pp__detail[open] summary::after{content:'\\2212'}
.pp .pp__bio{margin:0 0 8px;color:var(--pp-encre-douce)}
.pp .pp__detail dl{display:grid;gap:2px;margin:0 0 10px;font-size:.95rem}
.pp .pp__detail dt{font-weight:650;margin-top:8px}
.pp .pp__detail dd{margin:0;color:var(--pp-encre-douce)}
.pp .pp__detail dd ul{margin:0;padding-left:1.1em}
.pp .pp__ligne{display:block}
.pp .pp__rdv{margin-top:auto;flex-wrap:wrap;row-gap:0;white-space:normal;text-align:center}
.pp .pp-bouton{display:inline-flex;align-items:center;justify-content:center;gap:4px 10px;min-height:48px;padding:10px 20px;border-radius:999px;background:var(--pp-plein);color:var(--pp-plein-texte);font-weight:650;text-decoration:none}
.pp .pp-via{font-size:.82em;font-weight:500}
.pp .pp__rdv:focus-visible,.pp .pp__liste:focus-visible,.pp .pp__detail summary:focus-visible{outline:3px solid var(--pp-plein-bord);outline-offset:3px}
@container ppf (max-width:440px){.pp .pp__rdv{align-self:stretch}}
/* Nombre de praticiens : 2 et 4 en deux colonnes, 3 en trois (deux en tablette), 5 et plus en grille automatique */
@container pp (min-width:620px){
.pp[data-n="2"] .pp__liste,.pp[data-n="3"] .pp__liste,.pp[data-n="4"] .pp__liste{grid-template-columns:repeat(2,minmax(0,1fr))}
.pp[data-n="plus"] .pp__liste{grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
}
@container pp (min-width:920px){.pp[data-n="3"] .pp__liste{grid-template-columns:repeat(3,minmax(0,1fr))}}
/* Fiche large (praticien seul, éditorial) : photo d'un côté, texte de l'autre */
@container ppf (min-width:600px){
.pp .pp__corps{grid-template-columns:minmax(0,5fr) minmax(0,7fr);grid-template-areas:"v e" "v s";grid-template-rows:auto 1fr;align-items:start}
.pp .pp__visuel{max-width:440px}
}

/* Sobre (aperçu et tuiles ; le site garde ses composants historiques) */
.pp--sobre .pp__fiche{padding:clamp(20px,3vw,28px);border-radius:var(--pp-r);background:var(--pp-carte);box-shadow:inset 0 0 0 1px var(--pp-ligne)}
.pp--sobre .pp__corps,.pp--sobre .pp__fiche .pp__corps{grid-template-columns:64px minmax(0,1fr);grid-template-areas:"v e" "s s";grid-template-rows:auto 1fr;gap:16px;align-items:center}
.pp--sobre .pp__visuel{width:64px;max-width:none;aspect-ratio:1;border-radius:50%}
.pp--sobre .pp__photo{object-position:50% 28%}
.pp--sobre .pp__mono{font-size:1.35rem;background:var(--pp-bulle)}
.pp--sobre .pp__nom{--pp-nom:1.3rem}
.pp--sobre .pp__entete{align-self:center}

/* Grand portrait éditorial : une rangée par praticien, photo haute, nom en grand, côtés alternés */
.pp--editorial .pp__liste,.pp--editorial[data-n] .pp__liste{grid-template-columns:minmax(0,1fr);gap:clamp(36px,7cqi,72px)}
.pp--editorial .pp__visuel{border-radius:calc(var(--pp-r) * .35)}
.pp--editorial .pp__entete{padding-top:14px;border-top:2px solid var(--pp-encre)}
.pp--editorial .pp__nom{--pp-nom:clamp(1.8rem,7cqi,3.2rem);letter-spacing:-.035em;line-height:1}
.pp--editorial .pp__titre{font-size:1.05rem}
@container pp (min-width:900px){.pp--editorial[data-n="4"] .pp__liste,.pp--editorial[data-n="plus"] .pp__liste{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container ppf (min-width:600px){
.pp--editorial .pp__corps{grid-template-columns:minmax(0,5fr) minmax(0,6fr);grid-template-areas:"v ." "v e" "v s" "v .";grid-template-rows:1fr auto auto 1fr;column-gap:clamp(28px,6cqi,64px)}
.pp--editorial .pp__visuel{max-width:none}
.pp--editorial .pp__fiche:nth-child(even) .pp__corps{grid-template-columns:minmax(0,6fr) minmax(0,5fr);grid-template-areas:". v" "e v" "s v" ". v"}
}

/* Plein cadre et voile : nom et titre sur la photo, fond calculé (AA) sous le texte, fondu sans texte au-dessus */
.pp--voile .pp__corps{grid-template-areas:"v" "s";grid-template-rows:auto 1fr}
.pp--voile .pp__entete{grid-area:v;align-self:end;position:relative;z-index:1;padding:76px 20px 18px;color:var(--pp-sombre-texte);background:linear-gradient(to top,var(--pp-voile) 0,var(--pp-voile) calc(100% - 64px),transparent 100%);border-radius:0 0 var(--pp-r) var(--pp-r)}
.pp--voile .pp__titre{color:var(--pp-sombre-texte)}
.pp--voile .pp__nom{--pp-nom:clamp(1.35rem,8cqi,2rem)}
.pp--voile .pp__mono{place-items:start center;padding-top:16%}
@container ppf (min-width:600px){
.pp--voile .pp__corps{grid-template-columns:minmax(0,420px) minmax(0,1fr);grid-template-areas:"v s";grid-template-rows:auto;align-items:start}
.pp--voile .pp__entete{max-width:420px}
.pp--voile .pp__suite{padding-top:8px;align-self:center}
}

/* Côte à côte, même hauteur : cartes égales, bouton aligné en bas */
.pp--duo[data-n="2"] .pp__liste,.pp--mosaique[data-n="2"] .pp__liste,.pp--polaroid[data-n="2"] .pp__liste{max-width:920px}
.pp--duo .pp__fiche{padding:12px 12px 20px;border-radius:var(--pp-r);background:var(--pp-carte);box-shadow:inset 0 0 0 1px var(--pp-ligne)}
.pp--duo .pp__visuel{border-radius:calc(var(--pp-r) * .7)}
.pp--duo .pp__entete,.pp--duo .pp__suite{padding-inline:8px}
.pp--duo .pp__nom{--pp-nom:1.55rem}

/* Mosaïque décalée : hauteurs différentes, une colonne sur deux plus bas */
.pp--mosaique .pp__visuel{border-radius:calc(var(--pp-r) * .5)}
.pp--mosaique .pp__fiche:nth-child(3n+2) .pp__visuel{aspect-ratio:1}
.pp--mosaique .pp__fiche:nth-child(3n) .pp__visuel{aspect-ratio:3/4}
.pp--mosaique .pp__nom{--pp-nom:1.6rem}
@container pp (min-width:620px){.pp--mosaique:not([data-n="1"]) .pp__fiche:nth-child(even){padding-top:clamp(40px,9cqi,88px)}}

/* Forme organique : photo dans une forme douce, ombre pleine de l'aplat */
.pp--organique .pp__visuel{aspect-ratio:1;width:min(calc(100% - 14px),320px);justify-self:start;overflow:hidden;border-radius:58% 42% 52% 48% / 46% 54% 46% 54%;box-shadow:14px 12px 0 0 var(--pp-aplat);margin:0 14px 12px 0}
.pp--organique .pp__fiche:nth-child(even) .pp__visuel{border-radius:44% 56% 47% 53% / 55% 45% 55% 45%;box-shadow:-12px 14px 0 0 var(--pp-aplat);margin:0 0 14px 12px}
.pp--organique .pp__photo{object-position:50% 28%}
.pp--organique .pp__mono{background:var(--pp-bulle)}
.pp--organique .pp__nom{--pp-nom:1.6rem}

/* Cercle et anneau : grand rond cerné de la couleur du cabinet, texte centré */
.pp--anneau .pp__fiche{padding:clamp(24px,4cqi,36px) 20px;border-radius:var(--pp-r);background:var(--pp-carte);box-shadow:inset 0 0 0 1px var(--pp-ligne)}
.pp--anneau .pp__corps,.pp--anneau .pp__fiche .pp__corps{grid-template-columns:minmax(0,1fr);grid-template-areas:"v" "e" "s";grid-template-rows:auto auto 1fr;justify-items:center;text-align:center;max-width:560px;margin-inline:auto}
.pp--anneau .pp__visuel{width:clamp(140px,44cqi,200px);max-width:none;aspect-ratio:1;border-radius:50%;margin:10px;box-shadow:0 0 0 5px var(--pp-carte),0 0 0 9px var(--pp-plein-bord)}
.pp--anneau .pp__photo{object-position:50% 28%}
.pp--anneau .pp__mono{background:var(--pp-bulle)}
.pp--anneau .pp__entete{align-self:auto}
.pp--anneau .pp__suite{align-items:center}
.pp--anneau .pp__orientations{justify-content:center}
.pp--anneau .pp__detail{text-align:start}
.pp--anneau .pp__nom{--pp-nom:1.5rem}

/* Tirage à bordure : cadre clair, photo carrée, légende ; légère inclinaison sur grand écran */
.pp--polaroid .pp__fiche{padding:12px 12px 20px;background:var(--pp-carte);border-radius:3px;box-shadow:inset 0 0 0 1px var(--pp-ligne),0 10px 24px -14px color-mix(in srgb,var(--pp-encre) 45%,transparent)}
.pp--polaroid .pp__visuel{aspect-ratio:1;border-radius:2px}
.pp--polaroid .pp__photo{object-position:50% 28%}
.pp--polaroid .pp__entete{padding:6px 6px 0}
.pp--polaroid .pp__suite{padding-inline:6px}
.pp--polaroid .pp__nom{--pp-nom:1.5rem}
@container pp (min-width:620px){
.pp--polaroid:not([data-n="1"]) .pp__fiche:nth-child(odd){transform:rotate(-1.2deg)}
.pp--polaroid:not([data-n="1"]) .pp__fiche:nth-child(even){transform:rotate(1deg)}
.pp--polaroid .pp__liste{padding:6px}
}
@container ppf (min-width:600px){.pp--polaroid .pp__fiche .pp__visuel{max-width:380px}}

/* Bandeau qui défile au doigt : cartes aimantées, défilement dans le cadre seulement, aucune animation automatique */
.pp--defilement:not([data-n="1"]) .pp__liste{display:flex;gap:16px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scroll-padding-inline:2px;padding:2px 2px 14px;scrollbar-width:thin;scrollbar-color:var(--pp-ligne) transparent}
.pp--defilement:not([data-n="1"]) .pp__fiche{flex:0 0 min(80%,300px);scroll-snap-align:start}
.pp--defilement .pp__fiche{padding:12px 12px 18px;border-radius:var(--pp-r);background:var(--pp-carte);box-shadow:inset 0 0 0 1px var(--pp-ligne)}
.pp--defilement .pp__visuel{border-radius:calc(var(--pp-r) * .7)}
.pp--defilement .pp__entete,.pp--defilement .pp__suite{padding-inline:6px}
.pp--defilement .pp__nom{--pp-nom:1.4rem}

/* Portrait sur aplat : photo en arche posée sur l'aplat de la gamme (le portrait détouré du studio s'y fond) */
.pp--detoure .pp__visuel{background:radial-gradient(circle at 50% 74%,var(--pp-bulle) 0 34%,transparent 34.5%),var(--pp-aplat)}
.pp--detoure .pp__photo{position:absolute;left:12%;bottom:0;width:76%;height:86%;border-radius:999px 999px 0 0;object-position:50% 26%}
.pp--detoure .pp__visuel--detoure .pp__photo{left:6%;width:88%;height:92%}
.pp--detoure .pp__mono{background:none;color:var(--pp-aplat-texte);padding-top:48%}
.pp--detoure .pp__nom{--pp-nom:1.6rem}
`;

// ---------------------------------------------------------------------------------------------------------------
// Démonstrations (aperçu de l'admin, tuiles, planches, constructions de contrôle) : AUCUNE photo de personne
// ---------------------------------------------------------------------------------------------------------------

/**
 * Portraits de démonstration : silhouettes dessinées (tête et épaules, aplats), cadrées comme le studio portrait (visage centré
 * à 38 % de la hauteur, ≈ 29 % du cadre). Jamais une photo de personne : dessin vectoriel, aucun fichier, aucun téléchargement.
 */
const SILHOUETTES: [string, string][] = [['e3ebe8', 'a3b9b0'], ['ede6de', 'bfae9e'], ['e2e6ef', 'a5afc5'], ['efe4e6', 'c2a8ad'], ['e8ebdf', 'adb592']];
export const PORTRAITS_DEMO: readonly string[] = SILHOUETTES.map(([f, s]) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#${f}"/><circle cx="200" cy="190" r="70" fill="#${s}"/><path d="M58 500c0-100 62-168 142-168s142 68 142 168z" fill="#${s}"/></svg>`)}`);

/** Praticiens de démonstration (prénoms et noms fictifs, contenu-type des fiches) */
export const PRATICIENS_DEMO: readonly Omit<PortraitPraticien, 'photo'>[] = [
  { prenom: 'Camille', nom: 'Rousseau', titre: 'Pédicure-podologue à Lyon', metier: 'Pédicure-podologue', statut: 'Titulaire du cabinet', orientations: ['Podologie du sport', 'Pied diabétique'], detail: { lignes: [{ dt: 'Diplôme', dd: ['Diplôme d’État de pédicure-podologue'] }] }, rdv: { href: '#', libelle: 'Rendez-vous avec Camille' } },
  { prenom: 'Julien', nom: 'Bernard', titre: 'Pédicure-podologue à Lyon', metier: 'Pédicure-podologue', statut: 'En collaboration · Mercredi, jeudi et vendredi', orientations: ['Podologie de l’enfant', 'Bilan podologique'], detail: { lignes: [{ dt: 'Diplôme', dd: ['Diplôme d’État de pédicure-podologue'] }] }, rdv: { href: '#', libelle: 'Rendez-vous avec Julien' } },
  { prenom: 'Marie-Dominique', nom: 'Delacroix-Montgolfier', titre: 'Pédicure-podologue à Lyon', metier: 'Pédicure-podologue', statut: 'En collaboration', orientations: ['Semelles orthopédiques'], detail: { lignes: [] }, rdv: { href: '#', libelle: 'Rendez-vous avec Marie-Dominique' } },
  { prenom: 'Lucas', nom: 'Martin', titre: 'Pédicure-podologue à Lyon', metier: 'Pédicure-podologue', statut: 'En remplacement', orientations: ['Soins de pédicurie'], detail: { lignes: [] }, rdv: { href: '#', libelle: 'Rendez-vous avec Lucas' } },
  { prenom: 'Inès', nom: 'Moreau', titre: 'Pédicure-podologue à Lyon', metier: 'Pédicure-podologue', statut: 'En collaboration', orientations: ['Soins des ongles'], detail: { lignes: [] }, rdv: { href: '#', libelle: 'Rendez-vous avec Inès' } },
];

/**
 * `n` praticiens de démonstration ; `photos` : silhouettes dessinées (une sur deux sans photo si « mixte », pour voir le
 * monogramme à côté d'une photo) ; `fictifs` : portraits du kit démo (praticiens fictifs générés), à la place des silhouettes.
 */
export function praticiensDemo(n: number, photos: 'avec' | 'sans' | 'mixte' = 'avec', fictifs: readonly string[] = []): PortraitPraticien[] {
  let k = 0;
  return Array.from({ length: n }, (_, i) => {
    const p = PRATICIENS_DEMO[i % PRATICIENS_DEMO.length];
    const avec = photos === 'avec' || (photos === 'mixte' && i % 2 === 0);
    // Kit démo (kit-demo.ts) : portraits FICTIFS générés, aperçus seulement, jamais deux fois le même ; sinon la silhouette
    const src = avec ? (k < fictifs.length ? fictifs[k++] : PORTRAITS_DEMO[i % PORTRAITS_DEMO.length]) : '';
    return { ...p, photo: avec ? { src, largeur: 400, hauteur: 500 } : null };
  });
}
