// Styles de menus (demande de Paul du 2026-10-07 : « on peut aussi ajouter des styles de menus différents »). Ingrédient du studio
// à trois axes : présentation sur ORDINATEUR, sur TÉLÉPHONE, et bouton de rendez-vous. La navigation reste celle du core
// (construireNavigation : mêmes entrées, même ordre, même état actif aria-current, mots insécables) et le balisage du site ne change
// pas : seule une feuille CSS (cssMenu) s'applique aux classes « crochets » mn-* posées sur l'en-tête des gabarits (Coquille.astro,
// Gabarit.astro) et de l'aperçu de l'admin (ApercuGabarit, ApercuTheme). Le panneau et le tiroir du téléphone (gabarits coquille)
// ajoutent un bouton « Menu » (aria-expanded, aria-controls) et un script en ligne de moins de 1 Ko (SCRIPT_MENU : ouverture,
// Échap, piège de focus) ; sans script, le menu reste en liens visibles (rendu historique). Gabarit classique : son tiroir <dialog>
// natif (focus et Échap gérés par le navigateur), présenté en panneau ou en tiroir latéral.
// Règles : cibles ≥ 44 px, focus visible, aucun décalage de mise en page (barres fixes ou collantes de hauteur constante ; le
// rétrécissement au défilement ne joue que sur transform et l'ombre), aucun effet sur l'élément LCP, mouvement coupé avec
// prefers-reduced-motion, barre d'onglets cohérente avec la barre d'actions (elle la REMPLACE : jamais deux boutons « Rendez-vous »).
// Module pur.

import type { Gabarit } from './modeles';

export const MENUS_ORDINATEUR = [
  { id: 'gabarit', nom: 'Celui du modèle', detail: 'Barre classique : nom à gauche, liens à droite' },
  { id: 'centre', nom: 'Logo centré', detail: 'Nom au centre, liens de part et d’autre' },
  { id: 'collante', nom: 'Barre fine collante', detail: 'Reste en haut, se resserre au défilement' },
  { id: 'pastilles', nom: 'Pastilles', detail: 'Liens en pilules, rubrique courante pleine' },
  { id: 'souligne', nom: 'Soulignés animés', detail: 'Un trait se dessine sous le lien survolé' },
  { id: 'transparente', nom: 'Transparente puis pleine', detail: 'Sans fond en haut de page, opaque au défilement' },
  { id: 'laterale', nom: 'Menu latéral', detail: 'Colonne fixe à gauche sur grand écran (modèles éditoriaux)' },
] as const;
export const MENUS_MOBILE = [
  { id: 'gabarit', nom: 'Celui du modèle', detail: 'Liens courts sous le nom (ou tiroir plein écran en classique)' },
  { id: 'defilant', nom: 'Liens défilants', detail: 'Toutes les rubriques sur une ligne qui défile au doigt' },
  { id: 'panneau', nom: 'Panneau plein écran', detail: 'Bouton « Menu », grande liste éditoriale' },
  { id: 'tiroir', nom: 'Tiroir latéral', detail: 'Bouton « Menu », tiroir qui glisse de la droite' },
  { id: 'onglets', nom: 'Barre d’onglets', detail: 'En bas de l’écran : 3 rubriques et le rendez-vous' },
] as const;
export const MENUS_RDV = [
  { id: 'gabarit', nom: 'Plein', detail: 'Bouton plein dans la barre' },
  { id: 'contour', nom: 'Contour', detail: 'Bouton à filet, plus discret' },
  { id: 'flottant', nom: 'Flottant', detail: 'Pastille fixe en bas à droite (ordinateur)' },
] as const;
export const AXES_MENU = { ordinateur: MENUS_ORDINATEUR, mobile: MENUS_MOBILE, rdv: MENUS_RDV } as const;
export type AxeMenu = keyof typeof AXES_MENU;
export const NOMS_AXES_MENU: Record<AxeMenu, string> = { ordinateur: 'Menu (ordinateur)', mobile: 'Menu (téléphone)', rdv: 'Bouton de rendez-vous' };
export type ReglagesMenu = { [A in AxeMenu]: (typeof AXES_MENU)[A][number]['id'] };
export const MENU_PAR_DEFAUT: ReglagesMenu = { ordinateur: 'gabarit', mobile: 'gabarit', rdv: 'gabarit' };
const valeursAxe = (a: AxeMenu) => (AXES_MENU[a] as readonly { id: string }[]).map((x) => x.id);
export const estMenuParDefaut = (m: ReglagesMenu) => m.ordinateur === 'gabarit' && m.mobile === 'gabarit' && m.rdv === 'gabarit';

/**
 * Variantes permises par gabarit : menu latéral réservé aux modèles éditoriaux (revue, classique) ; classique (son tiroir
 * <dialog>) : panneau (le sien) ou tiroir latéral sur téléphone ; village (téléphone en grand, bande de menu) : pas de panneau.
 */
export function menusPermis(g: Gabarit): { [A in AxeMenu]: readonly ReglagesMenu[A][] } {
  return {
    // Village : le menu est dans une bande sous le nom (téléphone en grand) — ni logo centré entre les liens, ni colonne latérale
    ordinateur: MENUS_ORDINATEUR.map((x) => x.id).filter((id) => (id !== 'laterale' || g === 'revue' || g === 'classique') && !(g === 'village' && (id === 'centre' || id === 'laterale'))),
    mobile: g === 'classique' ? ['gabarit', 'tiroir'] : MENUS_MOBILE.map((x) => x.id),
    rdv: MENUS_RDV.map((x) => x.id),
  };
}
/** Réglages reçus, remis dans les variantes permises du gabarit */
export function normaliserMenu(brut: unknown, g?: Gabarit): ReglagesMenu {
  const o = brut && typeof brut === 'object' && !Array.isArray(brut) ? (brut as Record<string, unknown>) : {};
  const permis = g ? menusPermis(g) : null;
  const r = { ...MENU_PAR_DEFAUT } as Record<AxeMenu, string>;
  for (const a of Object.keys(AXES_MENU) as AxeMenu[]) {
    const v = o[a] as string;
    if (valeursAxe(a).includes(v) && (!permis || (permis[a] as readonly string[]).includes(v))) r[a] = v;
  }
  return r as ReglagesMenu;
}
/** Le téléphone a un bouton « Menu » (panneau ou tiroir des gabarits coquille : script SCRIPT_MENU) */
export const menuABouton = (m: ReglagesMenu, g: Gabarit) => g !== 'classique' && (m.mobile === 'panneau' || m.mobile === 'tiroir');

// ---------------------------------------------------------------------------------------------------------------
// Feuille CSS
// ---------------------------------------------------------------------------------------------------------------

const ORDI = '@media (min-width:960px)';
const TEL = '@media (max-width:759px)';
const FOND = 'var(--g-page,var(--fond,#fff))';
const ENCRE = 'var(--g-encre,var(--encre))';
const LIGNE = 'var(--g-ligne,var(--ligne))';
const VIF = 'var(--g-vif,var(--accent))';
const VIF_TEXTE = 'var(--g-vif-texte,var(--blanc,#fff))';
const BULLE = 'var(--g-bulle,var(--accent-tres-pale,#eef))';
const LIEN = '.mn-lien';
const RDV = ':is(.mn-rdv>a,a.mn-rdv,span.mn-rdv)';
const imp = (s: string) => s.replace(/\{([^{}]*)\}/g, (_, x: string) => `{${x.split(';').filter(Boolean).map((y) => (y.includes('!important') ? y : `${y}!important`)).join(';')}}`);
const progressif = (css: string) => `@supports (animation-timeline:scroll()){@media (prefers-reduced-motion:no-preference){${css}}}`;

/**
 * Feuille CSS d'un menu (racine `[data-mn]` : <html> du site, racine .ap de l'aperçu) ; vide pour le menu du modèle. Toutes les
 * déclarations sont en !important (elles priment sur les styles du gabarit et les styles en ligne de l'aperçu).
 */
export function cssMenu(brut: unknown, g: Gabarit = 'tableau'): string {
  const m = normaliserMenu(brut, g);
  if (estMenuParDefaut(m)) return '';
  const r = '[data-mn]';
  const css: string[] = [];
  const ordi: string[] = [];
  switch (m.ordinateur) {
    case 'centre':
      ordi.push(imp(`${r} .mn-ligne{display:flex;flex-wrap:nowrap;justify-content:center;align-items:center;gap:6px 18px}${r} :is(.mn-nav,.mn-liste){display:contents}${r} .mn-ligne>:is(.logo,.mn-logo){order:2;flex:none;margin-inline:28px;text-align:center}${r} .mn-liste>*{order:1}${r} .mn-liste>:nth-child(n+3){order:3}${r} .mn-liste>.mn-rdv,${r} .mn-ligne>.mn-rdv{order:4;margin-left:24px}`));
      break;
    case 'collante':
      ordi.push(imp(`${r} .mn-entete{position:sticky;top:0;z-index:30;background:${FOND};padding-block:0;box-shadow:0 1px 0 ${LIGNE}}${r} .mn-ligne{min-height:58px}${r} .mn-ligne>:is(.logo,.mn-logo){transform-origin:left center}`));
      ordi.push(progressif(`@keyframes mn-serre{to{transform:scale(.86)}}@keyframes mn-ombre{to{box-shadow:0 8px 24px -14px rgb(20 30 50 / .35)}}${r} .mn-ligne>:is(.logo,.mn-logo){animation:mn-serre linear both;animation-timeline:scroll(root);animation-range:0 160px}${r} .mn-entete{animation:mn-ombre linear both;animation-timeline:scroll(root);animation-range:0 160px}`));
      break;
    case 'pastilles':
      ordi.push(imp(`${r} .mn-liste{gap:8px}${r} ${LIEN}{min-height:44px;padding-inline:18px;border-radius:999px;background:${BULLE};color:${ENCRE};text-decoration:none}${r} ${LIEN}[aria-current=page]{background:${ENCRE};color:${FOND}}${r} ${LIEN}::after{display:none}`));
      break;
    case 'souligne':
      ordi.push(imp(`${r} ${LIEN}{background:linear-gradient(currentColor,currentColor) 50% calc(100% - 6px)/0 2px no-repeat;transition:background-size .25s ease-out;border-radius:0;text-decoration:none}${r} ${LIEN}:hover,${r} ${LIEN}:focus-visible,${r} ${LIEN}[aria-current=page]{background-size:calc(100% - 28px) 2px}${r} ${LIEN}::after{display:none}${r} ${LIEN}:hover{color:${ENCRE}}`));
      break;
    case 'transparente':
      ordi.push(imp(`${r} .mn-entete{position:sticky;top:0;z-index:30;background:transparent;box-shadow:none;border-bottom-color:transparent}`));
      ordi.push(progressif(`@keyframes mn-plein{to{background:color-mix(in srgb,${FOND} 94%,transparent);box-shadow:0 1px 0 ${LIGNE}}}${r} .mn-entete{animation:mn-plein linear both;animation-timeline:scroll(root);animation-range:0 120px}`));
      break;
    case 'laterale':
      css.push(imp(`@media (min-width:1200px){${r}{padding-left:248px}${r} .mn-entete{position:fixed;z-index:30;left:0;top:0;bottom:0;width:248px;overflow-y:auto;padding:0;background:${FOND};border:0;box-shadow:1px 0 0 ${LIGNE}}${r} .mn-ligne{width:auto;margin:0;padding:36px 26px;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:28px;min-height:100%}${r} :is(.mn-nav,.mn-liste){display:flex;flex-direction:column;align-items:stretch;gap:2px;width:100%}${r} ${LIEN}{justify-content:flex-start;padding-inline:0;border-radius:0}${r} ${LIEN}[aria-current=page]::after{left:-26px;right:auto;top:10px;bottom:10px;width:3px;height:auto}${r} .mn-rdv{margin:18px 0 0}${r} .mn-ligne>:is(.logo,.mn-logo){flex-direction:column;align-items:flex-start}}`));
      break;
  }
  if (ordi.length) css.push(`${ORDI}{${ordi.join('')}}`);
  // Bouton de rendez-vous (ordinateur)
  if (m.rdv === 'contour') css.push(`${ORDI}{${imp(`${r} ${RDV}{background:transparent;color:${ENCRE};box-shadow:inset 0 0 0 2px ${ENCRE}}`)}}`);
  if (m.rdv === 'flottant') css.push(`${ORDI}{${imp(`${r} ${RDV}{position:fixed;z-index:35;right:28px;bottom:28px;margin:0;min-height:56px;padding-inline:26px;border-radius:999px;background:${VIF};color:${VIF_TEXTE};box-shadow:0 10px 28px -10px rgb(20 30 50 / .45)}`)}}`);
  // Téléphone
  const tel: string[] = [];
  const toutes = `${r} .mn-liste>:not(.mn-rdv)`;
  switch (m.mobile) {
    case 'defilant':
      tel.push(imp(`${r} .mn-nav{flex-basis:100%;max-width:100%;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}${r} .mn-liste{flex-wrap:nowrap;justify-content:flex-start;gap:6px;width:max-content}${toutes}{display:block;flex:none;scroll-snap-align:start}${r} ${LIEN}{white-space:nowrap;padding-inline:14px;border-radius:999px;background:${BULLE}}${r} ${LIEN}[aria-current=page]{background:${ENCRE};color:${FOND}}${r} ${LIEN}::after{display:none}${r} .mn-liste>.mn-rdv{display:none}`));
      break;
    case 'panneau':
    case 'tiroir': {
      const tiroir = m.mobile === 'tiroir';
      // Sans script : liens visibles (rendu du modèle) ; avec le script (classe mn-js) : bouton « Menu » et panneau fermé
      tel.push(imp(`${r}.mn-js .mn-nav{display:none}${r}.mn-js .mn-burger{display:inline-flex}${r} .mn-burger__traits{width:18px;height:12px;background:linear-gradient(currentColor,currentColor) 0 0/100% 2px no-repeat,linear-gradient(currentColor,currentColor) 0 50%/100% 2px no-repeat,linear-gradient(currentColor,currentColor) 0 100%/100% 2px no-repeat}${r} .mn-burger{position:relative;z-index:62;align-items:center;gap:10px;min-height:44px;min-width:44px;padding:0 14px;border:0;border-radius:999px;background:${BULLE};color:${ENCRE};font:inherit;font-weight:650;cursor:pointer}`));
      tel.push(imp(`${r}.mn-ouvert{overflow:hidden}${r}.mn-ouvert .mn-nav{display:flex;position:fixed;z-index:61;top:0;bottom:0;right:0;left:${tiroir ? 'auto' : '0'};width:${tiroir ? 'min(86vw,360px)' : '100%'};flex-direction:column;justify-content:flex-start;padding:84px 24px max(28px,env(safe-area-inset-bottom));overflow-y:auto;background:${FOND};${tiroir ? `box-shadow:0 0 0 100vmax rgb(20 30 50 / .38)` : 'box-shadow:none'}}${r}.mn-ouvert .mn-liste{display:flex;flex-direction:column;align-items:stretch;gap:4px}${r}.mn-ouvert .mn-liste>*{display:block}${r}.mn-ouvert ${LIEN}{min-height:56px;padding-inline:0;justify-content:flex-start;font-family:var(--police-titres);font-weight:var(--graisse-titres);font-size:${tiroir ? '1.45rem' : '2rem'};letter-spacing:-.02em;border-radius:0;border-bottom:1px solid ${LIGNE}}${r}.mn-ouvert ${LIEN}::after{display:none}${r}.mn-ouvert ${LIEN}[aria-current=page]{color:${VIF};box-shadow:inset 4px 0 0 ${VIF};padding-left:14px}${r}.mn-ouvert .mn-liste>.mn-rdv{margin-top:20px}${r}.mn-ouvert ${RDV}{display:flex;justify-content:center;min-height:56px;margin:0;border-radius:var(--rayon-bouton,999px);background:${VIF};color:${VIF_TEXTE}}${r}.mn-ouvert .mn-burger{position:fixed;top:14px;right:16px}`));
      break;
    }
    case 'onglets':
      tel.push(imp(`${r} .mn-nav{position:fixed;z-index:45;left:0;right:0;bottom:0;margin:0;padding:0 0 env(safe-area-inset-bottom);background:var(--g-carte,${FOND});box-shadow:0 -1px 0 ${LIGNE}}${r} .mn-liste{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:0;width:100%}${r} .mn-liste>.mn-rdv{display:block}${r} ${LIEN},${r} ${RDV}{display:flex;align-items:center;justify-content:center;min-height:60px;margin:0;padding:4px 6px;border-radius:0;font-size:.82rem;line-height:1.15;text-align:center;white-space:normal;box-shadow:none}${r} ${LIEN}::after{left:22%;right:22%;bottom:auto;top:0}${r} ${RDV}{background:${VIF};color:${VIF_TEXTE}}${r} :is(.c-barre,.c-flottant,.apb-barre,.apb-flottant){display:none}${r} .mn-entete .mn-ligne{flex-wrap:nowrap}`));
      break;
  }
  if (tel.length) css.push(`${TEL}{${tel.join('')}}`);
  // Classique : tiroir <dialog> présenté en tiroir latéral (sous 960 px, comme son bouton « Menu »)
  if (g === 'classique' && m.mobile === 'tiroir') css.push(imp(`${r} .tiroir{left:auto;right:0;width:min(86vw,380px);box-shadow:-24px 0 60px -20px rgb(0 0 0 / .45)}`));
  // Bouton « Menu » absent du rendu du modèle
  css.push(`${r} .mn-burger{display:none}`);
  return css.join('');
}

/**
 * Script du bouton « Menu » (panneau et tiroir des gabarits coquille), en ligne juste après l'en-tête : < 1 Ko, aucune
 * dépendance. Ouvre / ferme (aria-expanded), Échap, piège de focus dans le panneau, clic hors du tiroir ; sans lui, liens visibles.
 */
export const SCRIPT_MENU = `(function(){var h=document.documentElement,b=document.querySelector('.mn-burger'),n=document.querySelector('.mn-nav');if(!b||!n)return;b.hidden=false;h.classList.add('mn-js');function f(o){h.classList.toggle('mn-ouvert',o);b.setAttribute('aria-expanded',String(o));b.lastElementChild.textContent=o?'Fermer':'Menu';if(o){var a=n.querySelector('[aria-current]')||n.querySelector('a');a&&a.focus()}else b.focus()}b.addEventListener('click',function(){f(!h.classList.contains('mn-ouvert'))});n.addEventListener('click',function(e){if(e.target===n)f(false)});document.addEventListener('keydown',function(e){if(!h.classList.contains('mn-ouvert'))return;if(e.key==='Escape')return f(false);if(e.key!=='Tab')return;var l=[b].concat([].slice.call(n.querySelectorAll('a'))).filter(function(x){return x.offsetParent}),i=l.indexOf(document.activeElement);if(e.shiftKey&&!(i>0)){e.preventDefault();l[l.length-1].focus()}else if(!e.shiftKey&&i===l.length-1){e.preventDefault();l[0].focus()}})})();`;

// ---------------------------------------------------------------------------------------------------------------
// Notables, libellés
// ---------------------------------------------------------------------------------------------------------------

/** Clés notables (assets_notes, type menu) : `menu:<axe>:<variante>` */
export const clesMenu = (m: ReglagesMenu): string[] => (Object.keys(AXES_MENU) as AxeMenu[]).map((a) => `menu:${a}:${m[a]}`);
export const toutesClesMenu = (): string[] => (Object.keys(AXES_MENU) as AxeMenu[]).flatMap((a) => valeursAxe(a).filter((v) => v !== 'gabarit' || a === 'ordinateur').map((v) => `menu:${a}:${v}`));
export function estCleMenu(k: unknown): boolean {
  if (typeof k !== 'string') return false;
  const [type, a, v, ...reste] = k.split(':');
  return type === 'menu' && !reste.length && a in AXES_MENU && valeursAxe(a as AxeMenu).includes(v);
}
export function libelleCleMenu(k: string): string {
  const [, a, v] = k.split(':');
  return `${NOMS_AXES_MENU[a as AxeMenu] ?? a} : ${(AXES_MENU[a as AxeMenu] as readonly { id: string; nom: string }[] | undefined)?.find((x) => x.id === v)?.nom ?? v}`;
}
export const menuPourCle = (m: ReglagesMenu, k: string): ReglagesMenu => { const [, a, v] = k.split(':'); return normaliserMenu({ ...m, [a]: v }); };
export const libelleMenu = (m: ReglagesMenu) => (Object.keys(AXES_MENU) as AxeMenu[]).map((a) => (AXES_MENU[a] as readonly { id: string; nom: string }[]).find((x) => x.id === m[a])?.nom ?? m[a]).join(' · ');
