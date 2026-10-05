// GABARITS de rendu : fonctions PURES (contenu, identité) → HTML/SVG en chaîne. Le même code sert
//   - à l'aperçu instantané dans le navigateur (admin, aperçu gratuit : aucune construction, aucun aller-retour serveur) ;
//   - à l'export (Playwright ouvre la même page et photographie chaque <section> en PNG ; Reel en MP4).
// Couleurs : UNIQUEMENT des variables CSS (charte : feuilleCharte ; gamme ou couleur du cabinet : variablesIdentite) ;
// aucune couleur littérale (contrôlé par `npm run controle:charte`). Polices : celles des modèles (@fontsource).
// Texte : tailles de départ par rôle, réduites au besoin par ajuster() (rendu-navigateur.ts) jusqu'à un minimum lisible
// sur mobile ; au-delà, la diapositive est marquée « déborde » et refusée à l'export.
//
// Trois styles, comme les sites :
//   releve      : fond « plan d'architecte » (surface-plan), trame de pression, lectures en mono, sur-titres numérotés ;
//   pedagogique : fonds clairs, schémas de manuel au trait, un seul accent, ni trame, ni mono, ni numéro décoratif ;
//   simple      : typographie et fonds du modèle Simple (Nunito, gros caractères, carte claire arrondie), registre pédagogique.

import { svgDessin, svgEquipement, svgElement, MENTION_ILLUSTRATIVE } from '@plateforme/core';
import { echapper, logoAvecNom, logoIdentite } from './identite';
import { styleIdentite } from './composer';
import type { Diapositive, Identite, Publication, Style, VisuelRef } from './types';
import { FORMATS } from './types';

/** Tailles de départ et minimums (px, sur le canevas 1080 de large) : le minimum absolu (34 px) ≈ 12 px sur un téléphone */
export const TAILLES = {
  minimum: 34,
  surtitre: [40, 34],
  titreCouverture: [108, 72],
  titrePoint: [82, 60],
  texte: [50, 40],
  liste: [84, 48],
  mention: [92, 56],
  mentionAffiche: [50, 38],
  titreAffiche: [92, 60],
  titreStory: [96, 56],
  domaine: [50, 34],
  titreGoogle: [80, 52],
  nomTete: [36, 34],
  nomSignature: [88, 52],
  ligneSignature: [46, 36],
} as const;

let compteurId = 0;

/** SVG d'un visuel du core, dans le registre du style */
export function visuelSvg(v: VisuelRef | undefined, style: Style): string {
  if (!v) return '';
  const registre = style === 'releve' ? 'releve' : 'pedagogique';
  const id = `cz${++compteurId}`;
  if (v.type === 'dessin') return svgDessin(v.nom, { registre, id });
  if (v.type === 'equipement') return svgEquipement(v.id, { registre, id });
  return svgElement(v.id, { registre, vue: v.vue, etat: v.etat });
}

/** Texte ajustable : taille de départ, minimum, rôle (contrôle de lecture) */
const ajustable = (classe: string, [taille, min]: readonly [number, number], html: string, balise = 'div') =>
  `<${balise} class="${classe}" data-ajuste data-taille="${taille}" data-min="${min}" style="font-size:${taille}px">${html}</${balise}>`;

/** Insécables devant : ; ? ! » et après « (typographie française), échappement HTML */
export const typo = (s: string) =>
  echapper(s)
    .replace(/ ([:;?!»])/g, ' $1')
    .replace(/« /g, '« ')
    // Mots composés (« pédicure-podologue », « parlez-en ») : jamais coupés au trait d’union en fin de ligne
    .replace(/[\p{L}’']+(?:-[\p{L}’']+)+/gu, (m) => `<span class="cz-insecable">${m}</span>`);

const echelle = (style: Style, [a, b]: readonly [number, number]): [number, number] => (style === 'simple' ? [Math.round(a * 1.06), Math.round(b * 1.06)] : [a, b]);

/** En-tête d'identité : logo + nom (le nom n'est pas répété si le logo existant le contient) */
function tete(i: Identite, style: Style, compteur?: string): string {
  const logo = logoIdentite(i, style, style === 'simple' ? 76 : 64);
  const nom = logoAvecNom(i) ? '' : ajustable('cz-tete__nom', echelle(style, TAILLES.nomTete), typo(i.nom));
  const num = compteur && style === 'releve' ? `<span class="cz-tete__num">${compteur}</span>` : '';
  return `<div class="cz-tete"><span class="cz-logo">${logo}</span>${nom}${num}</div>`;
}

/** Compteur seul (diapositives intérieures du carrousel : l'identité est sur la couverture et la signature) */
const compteurSeul = (style: Style, compteur: string) => (style === 'releve' ? `<div class="cz-tete cz-tete--seul"><span class="cz-tete__num">${compteur}</span></div>` : '<div class="cz-tete cz-tete--vide"></div>');

const illustrative = (v: VisuelRef | undefined, style: Style) =>
  // Mention « représentation illustrative » : seulement sur les dessins techniques du relevé (trame, lectures), pas sur les éléments de bibliothèque
  style === 'releve' && v?.type === 'dessin' ? `<div class="cz-pied"><span class="cz-pied__mention">${MENTION_ILLUSTRATIVE}</span></div>` : '';

/** Une diapositive en HTML (section aux dimensions du format) */
export function rendreDiapositive(d: Diapositive, pub: Pick<Publication, 'format' | 'id'>, i: Identite, k = 0, n = 1, style: Style = styleIdentite(i)): string {
  const { largeur, hauteur } = FORMATS[pub.format];
  const compteur = `${String(k + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
  const classes = ['cz', `cz--${pub.format}`, `cz--${style}`, `cz-r--${d.role}`, style === 'releve' ? 'surface-plan' : ''].filter(Boolean).join(' ');
  const s = (t: readonly [number, number]) => echelle(style, t);
  let corps = '';
  switch (d.role) {
    case 'couverture':
      corps = `${tete(i, style, compteur)}
        <div class="cz-texte">${d.surtitre ? `<div class="cz-surtitre">${style === 'releve' ? `${String(k + 1).padStart(2, '0')} — ` : ''}${typo(d.surtitre)}</div>` : ''}${ajustable('cz-titre cz-titre--couverture', s(TAILLES.titreCouverture), typo(d.titre ?? ''), 'h2')}</div>
        <div class="cz-visuel">${visuelSvg(d.visuel, style)}</div>${illustrative(d.visuel, style)}`;
      break;
    case 'point':
      // Sans visuel : carton de texte, le titre prend la place (aucun dessin forcé quand aucun n’est juste)
      corps = `${compteurSeul(style, compteur)}
        <div class="cz-texte${d.visuel ? '' : ' cz-texte--seul'}">${ajustable(`cz-titre cz-titre--point${d.visuel ? '' : ' cz-titre--seul'}`, s(d.visuel ? TAILLES.titrePoint : TAILLES.titreCouverture), typo(d.titre ?? ''), 'h2')}${d.texte ? ajustable('cz-corps', s(TAILLES.texte), typo(d.texte), 'p') : ''}</div>
        ${d.visuel ? `<div class="cz-visuel">${visuelSvg(d.visuel, style)}</div>` : ''}${illustrative(d.visuel, style)}`;
      break;
    case 'pratique':
      corps = `${compteurSeul(style, compteur)}
        <div class="cz-texte"><div class="cz-surtitre">${typo(d.surtitre ?? 'En pratique')}</div>
        ${ajustable('cz-liste', s(TAILLES.liste), `<ul>${(d.liste ?? []).map((l) => `<li>${typo(l)}</li>`).join('')}</ul>`)}</div>`;
      break;
    case 'mention':
      corps = `${compteurSeul(style, compteur)}
        <div class="cz-texte cz-texte--mention">${ajustable('cz-mention', s(TAILLES.mention), (d.mention ?? []).map((l) => `<span>${typo(l)}</span>`).join(' '), 'p')}</div>`;
      break;
    case 'signature': {
      const logo = logoIdentite(i, style, style === 'simple' ? 220 : 200);
      const lieu = i.quartier ? i.quartier : i.ville;
      corps = `<div class="cz-signature">
        <span class="cz-logo cz-logo--grand">${logo}</span>
        ${logoAvecNom(i) ? '' : ajustable('cz-signature__nom', s(TAILLES.nomSignature), typo(i.nom), 'h2')}
        ${ajustable('cz-signature__ligne', s(TAILLES.ligneSignature), `${i.praticiens.map(typo).join(' · ')}<br>${typo(i.metier)} · ${typo(lieu)}`, 'p')}
        <div class="cz-signature__site"><span class="cz-signature__libelle">Plus d’informations</span>${ajustable('cz-signature__domaine', s(TAILLES.domaine), echapper(i.domaine), 'span')}</div>
      </div>`;
      break;
    }
    case 'affiche': {
      const liste = d.liste?.length ? ajustable('cz-liste cz-liste--affiche', s(TAILLES.texte), `<ul>${d.liste.map((l) => `<li>${typo(l)}</li>`).join('')}</ul>`) : '';
      corps = `${tete(i, style)}
        <div class="cz-texte">${d.surtitre ? `<div class="cz-surtitre">${typo(d.surtitre)}</div>` : ''}${ajustable('cz-titre cz-titre--affiche', s(pub.format === 'story' ? TAILLES.titreStory : pub.format === 'google' ? TAILLES.titreGoogle : TAILLES.titreAffiche), typo(d.titre ?? ''), 'h2')}</div>
        <div class="cz-visuel">${visuelSvg(d.visuel, style)}</div>${liste}
        <div class="cz-encart">${ajustable('cz-mention cz-mention--affiche', s(TAILLES.mentionAffiche), (d.mention ?? []).map((l) => `<span>${typo(l)}</span>`).join(' '), 'p')}</div>${illustrative(d.visuel, style)}`;
      break;
    }
  }
  return `<section class="${classes}" data-publication="${echapper(pub.id)}" data-format="${pub.format}" data-role="${d.role}" data-index="${k}" style="width:${largeur}px;height:${hauteur}px" role="img" aria-label="${echapper(d.role === 'signature' ? `${i.nom}, ${i.metier}, ${i.ville}` : d.alt)}"><div class="cz-cadre">${corps}</div></section>`;
}

/** Toutes les diapositives d'une publication */
export function rendrePublication(pub: Publication, i: Identite, style: Style = styleIdentite(i)): string {
  return pub.diapositives.map((d, k) => rendreDiapositive(d, pub, i, k, pub.diapositives.length, style)).join('');
}

/**
 * Feuille des gabarits. Seules des variables : charte (--encre, --papier, --plan, --signal, --doux, --fond, --accent…,
 * --trait-*, --filet*), identité (--police-*, --graisse-titres, --rayon).
 */
export const FEUILLE_GABARITS = `
.cz{position:relative;overflow:hidden;box-sizing:border-box;font-family:var(--police-texte);color:var(--encre);-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;contain:layout paint}
.cz:not(.surface-plan){background:var(--fond)}
.cz *,.cz *::before,.cz *::after{box-sizing:border-box;margin:0;padding:0}
.cz-cadre{position:absolute;inset:0;display:flex;flex-direction:column;gap:28px;padding:64px 72px 60px}
.cz--story .cz-cadre{padding:220px 80px 300px;gap:40px}
.cz--google .cz-cadre{padding:56px 64px;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,0.92fr);grid-template-rows:auto minmax(0,1fr) auto auto;column-gap:48px;row-gap:22px}
.cz--post .cz-cadre{padding:56px 64px 52px;gap:20px}
.cz-tete{display:flex;align-items:center;gap:22px;min-height:64px;flex:none}
.cz-tete--vide{min-height:0}
.cz-tete--seul{justify-content:flex-end}
.cz-logo{flex:none;display:block;line-height:0}
.cz-logo svg,.cz-logo img{display:block}
.cz-tete__nom{flex:1;min-width:0;max-height:3.6em;overflow:hidden;font-family:var(--police-titres);font-weight:650;line-height:1.15;letter-spacing:-0.01em}
.cz-tete__num{margin-left:auto;font-family:var(--police-mono);font-size:34px;letter-spacing:var(--interlettrage-donnees);color:var(--signal)}
.cz-texte{display:flex;flex-direction:column;gap:22px;flex:none;min-height:0}
.cz-surtitre{font-family:var(--police-texte);font-weight:750;font-size:40px;line-height:1.15;color:var(--accent)}
.cz-titre{font-family:var(--police-titres);font-weight:var(--graisse-titres);line-height:1.04;letter-spacing:-0.02em;text-wrap:balance;overflow:hidden;overflow-wrap:normal;hyphens:manual}
.cz-titre--couverture{max-height:4.3em}
.cz-titre--point{max-height:3.3em}
.cz-titre--affiche{max-height:3.3em}
.cz-corps{line-height:1.3;max-height:4em;overflow:hidden;color:var(--encre-douce);text-wrap:pretty}
.cz-visuel{flex:1 1 0;min-height:0;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.cz-texte--seul{flex:1;justify-content:center}
.cz-titre--seul{max-height:5.4em}
.cz-visuel>svg{width:100%;height:100%;max-width:100%;max-height:100%;overflow:visible}
.cz-pied{flex:none;display:flex;justify-content:flex-start}
.cz-pied__mention{font-family:var(--police-mono);font-size:34px;line-height:1.2;color:var(--sur-sombre-doux)}
.cz-insecable{white-space:nowrap}
.cz-liste{overflow:hidden;max-height:13.5em}
.cz-r--pratique .cz-texte{flex:1;justify-content:center;gap:40px}
.cz-liste ul{list-style:none;display:flex;flex-direction:column;gap:0.55em}
.cz-liste li{position:relative;padding-left:1.15em;line-height:1.18;font-weight:650;text-wrap:balance}
.cz-liste li::before{content:"";position:absolute;left:0;top:0.38em;width:0.5em;height:0.5em;border-radius:50%;background:var(--accent)}
.cz-liste--affiche{flex:none;max-height:6.6em}
.cz-liste--affiche li{font-weight:600}
.cz-texte--mention{flex:1;justify-content:center}
.cz-mention{font-family:var(--police-titres);font-weight:var(--graisse-titres);line-height:1.14;letter-spacing:-0.015em;max-height:7.2em;overflow:hidden}
.cz-mention span{display:inline}
.cz-encart{flex:none;border-top:var(--filet-fort) solid var(--accent);padding-top:22px}
.cz-mention--affiche{max-height:4.8em;font-weight:700}
.cz-signature{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:34px}
.cz-signature__nom{font-family:var(--police-titres);font-weight:var(--graisse-titres);line-height:1.05;letter-spacing:-0.02em;max-height:3.3em;overflow:hidden;text-wrap:balance;width:100%}
.cz-signature__ligne{line-height:1.3;max-height:5.4em;overflow:hidden;width:100%;color:var(--encre-douce)}
.cz-signature__site{display:flex;flex-direction:column;gap:6px;border-top:var(--filet-fort) solid currentColor;padding-top:26px;width:100%}
.cz-signature__libelle{font-size:36px;font-weight:650}
.cz-signature__domaine{display:block;font-weight:750;color:var(--accent);white-space:nowrap;overflow:hidden;max-height:1.4em}
/* Google (4:3) : texte à gauche, visuel à droite */
.cz--google .cz-tete{grid-column:1 / -1}
.cz--google .cz-titre--affiche{max-height:4.4em}
.cz--story .cz-titre--affiche{max-height:4.2em}
.cz--story .cz-visuel{min-height:380px}
.cz--google .cz-texte{grid-column:1;grid-row:2;justify-content:center}
.cz--google .cz-visuel{grid-column:2;grid-row:2 / span 2}
.cz--google .cz-encart{grid-column:1;grid-row:3}
.cz--google .cz-pied{grid-column:1 / -1;grid-row:4}
/* ———— Relevé : plan d'architecte (surface-plan de la charte), lectures en mono ———— */
.cz--releve{color:var(--papier)}
/* Aplats des dessins éclaircis sur le plan : un objet sombre sur fond sombre ne se lit pas en vignette (lecture profane, 2 s) */
.cz--releve .cz-visuel{--dessin-fond:color-mix(in srgb, var(--plan), var(--papier) 18%)}
.cz--releve .cz-surtitre{font-family:var(--police-mono);font-weight:500;font-size:36px;text-transform:uppercase;letter-spacing:var(--interlettrage-donnees);color:var(--signal)}
.cz--releve .cz-titre,.cz--releve .cz-mention,.cz--releve .cz-signature__nom{color:var(--papier)}
.cz--releve .cz-corps,.cz--releve .cz-signature__ligne{color:var(--sur-sombre-doux)}
.cz--releve .cz-liste li::before{border-radius:0;background:var(--signal)}
.cz--releve .cz-encart{border-top-color:var(--signal)}
.cz--releve .cz-signature__domaine{color:var(--signal)}
.cz--releve .cz-signature__site{border-top-color:var(--sur-sombre-filet)}
.cz--releve .cz-signature__libelle{font-family:var(--police-mono);font-weight:500;font-size:34px;text-transform:uppercase;letter-spacing:var(--interlettrage-donnees);color:var(--sur-sombre-doux)}
.cz--releve .cz-tete__nom{color:var(--papier)}
.cz--releve.cz-r--mention .cz-texte--mention{border-left:var(--filet-fort) solid var(--signal);padding-left:44px}
/* ———— Pédagogique : fonds clairs, schéma au trait sur fond doux, un seul accent ———— */
.cz--pedagogique{background:var(--fond)}
.cz--pedagogique .cz-visuel{background:var(--doux);border-radius:var(--rayon);padding:28px;--dessin-trait:var(--encre);--dessin-accent:var(--accent-vif);--dessin-fond:var(--fond)}
.cz--pedagogique.cz-r--mention,.cz--pedagogique.cz-r--signature{background:var(--doux)}
.cz--pedagogique .cz-titre{color:var(--encre)}
.cz--pedagogique .cz-tete__nom{color:var(--encre)}
/* ———— Simple : modèle Simple (Nunito), carte claire arrondie sur fond doux, gros caractères ———— */
.cz--simple{background:var(--doux)}
.cz--simple .cz-cadre{margin:28px;inset:0;border-radius:calc(var(--rayon) * 2);background:var(--fond);padding:52px 60px 50px}
.cz--simple.cz--story .cz-cadre{margin:0;border-radius:0;padding:220px 80px 300px}
.cz--simple .cz-visuel{background:var(--doux);border-radius:var(--rayon);padding:24px;--dessin-trait:var(--encre);--dessin-accent:var(--accent-vif);--dessin-fond:var(--fond)}
.cz--simple .cz-surtitre{font-size:42px;font-weight:800}
.cz--simple .cz-titre,.cz--simple .cz-mention{color:var(--encre);letter-spacing:-0.01em}
.cz--simple .cz-corps,.cz--simple .cz-signature__ligne{color:var(--encre)}
.cz--simple .cz-liste li{font-weight:700}
.cz--simple .cz-encart{border:var(--filet-fort) solid var(--accent);border-radius:var(--rayon);padding:22px 26px;background:var(--doux)}
`;
