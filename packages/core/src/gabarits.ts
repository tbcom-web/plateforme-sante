// Couleurs des gabarits « tableau » et « village » (et des suivants) : TOUTES dérivées de la couleur du cabinet — gamme
// choisie, sinon couleur libre — avec des garde-fous de contraste automatiques. Quelle que soit la couleur choisie (jaune
// pâle, rouge saturé, bleu nuit, gris moyen, vert fluo…), textes et commandes restent lisibles (AA) : les tons dérivés sont
// assombris ou éclaircis jusqu'au contraste requis, jamais laissés illisibles.
//
// Rôles (variables CSS --g-*, posées sur <html> par apps/sites/src/layouts/Gabarit.astro pour les gabarits autres que
// « classique », et par l'aperçu de l'admin) :
//   page / carte / doux        fonds de page, des cartes, des encadrés
//   bulle / bulle-texte        pastilles de navigation (soins, « pour qui », infos) et leur texte
//   accent-texte               liens, sur-titres, numéros sur les fonds clairs (≥ 4,5:1 sur page, carte, doux et bulle)
//   plein / plein-texte        boutons principaux (texte blanc OU encre, le plus lisible des deux ; ≥ 4,5:1)
//   plein-bord                 contour des boutons et pastilles actives (≥ 3:1 sur la page : élément d'interface)
//   sombre / sombre-*          carte sombre (lieu), pied de page sombre : texte papier, texte doux et accent clair ≥ 4,5:1
//   ligne                      filets et bordures
//   plan-*                     plan d'accès (îlots, rues, bords des rues, noms des rues, point du cabinet)
//   vif / vif-texte            la couleur vive TELLE QUELLE (carte illustrée, barre « Rendez-vous »), texte blanc ou encre
//   aplat / aplat-*            aplat pastel de la gamme (premier écran, bandeau), texte encre assortie
//   duo / duo-bulle / duo-texte  seconde couleur de la gamme (« duo ») quand elle existe, sinon l'accent : bulles « Pour qui »,
//                              fond des illustrations ; toujours avec garde-fous de contraste
//   bulle-bord / duo-bord      filet fin des bulles (gabarit « revue » : bulles à filet), purement décoratif
//   figure                     trait du dessin posé sur l'aplat du premier écran (≥ 3:1 sur l'aplat et la page : élément graphique)
// « revue » : papier blanc cassé (celui de la gamme, sinon PAPIER_REVUE), aucune carte (carte = page), filets fins.
// Les couleurs de données (pression) ne servent jamais à l'interface. Contrôle : npm run controle:charte
// (verifierCouleursGabarit sur chaque gabarit × gammes × 5 couleurs libres extrêmes).

import { contraste, melanger, luminance } from './couleurs';
import { NEUTRES, PAPIER_REVUE } from './charte';
import { gamme, variantesGamme } from './gammes';
import { gabaritModele, type ModeleManifeste } from './modeles';

/** Assombrit (vers l'encre) ou éclaircit (vers le blanc) `c` jusqu'à atteindre `min` contre chacun des `fonds`. */
export function ajusterContraste(c: string, fonds: string[], min: number, sens: 'sombre' | 'clair' = 'sombre'): string {
  const cible = sens === 'sombre' ? NEUTRES.encre : NEUTRES.blanc;
  const pire = (x: string) => Math.min(...fonds.map((f) => contraste(x, f)));
  let x = c;
  for (let i = 1; i <= 40 && pire(x) < min; i++) x = melanger(c, cible, i / 40);
  return x;
}

/** Couleurs d'un gabarit (#rrggbb), par rôle. */
export type CouleursGabarit = Record<
  | 'page' | 'carte' | 'doux' | 'bulle' | 'bulle-texte' | 'bulle-picto' | 'accent-texte' | 'plein' | 'plein-texte' | 'plein-survol' | 'plein-bord'
  | 'sombre' | 'sombre-texte' | 'sombre-doux' | 'sombre-accent' | 'ligne' | 'encre' | 'encre-douce'
  | 'plan-fond' | 'plan-ilot' | 'plan-rue' | 'plan-bord' | 'plan-texte' | 'plan-point'
  | 'vif' | 'vif-texte' | 'aplat' | 'aplat-texte' | 'aplat-doux' | 'duo' | 'duo-bulle' | 'duo-texte' | 'duo-picto' | 'duo-doux'
  | 'bulle-bord' | 'duo-bord' | 'figure',
  string
>;

/**
 * Couleurs d'un gabarit pour un cabinet : gamme choisie (vitaminée : vif, duo, aplat, encre assortie ; sobre : replis de
 * variantesGamme), sinon couleur libre (#rrggbb) dont on tire vif = duo = la couleur, aplat = sa teinte pastel.
 * Règle 60-30-10 : fond clair majoritaire, couleur vive en aplat court (premier écran), bulles en duo, boutons vifs.
 * « tableau » : fond de page légèrement teinté, cartes blanches ; « village » : fond blanc, encadrés teintés.
 */
export function couleursGabarit(m: Pick<ModeleManifeste, 'gabarit' | 'jetons'>, choix: { couleur: string; gamme?: string | null }): CouleursGabarit {
  const g = gamme(choix.gamme);
  const v = g ? variantesGamme(g) : null;
  const libre = /^#[0-9a-f]{6}$/i.test(choix.couleur) ? choix.couleur : (gamme('ardoise')?.accent ?? NEUTRES.encreNuit);
  const blanc = NEUTRES.blanc;
  const tableau = gabaritModele(m) === 'tableau';
  const revue = gabaritModele(m) === 'revue';
  const encre = v?.encre ?? NEUTRES.encre;
  const vif = v?.vif ?? libre;
  const duo = v?.duo ?? vif;
  // Teintes : tirées d'une version assez soutenue de la couleur (un jaune pâle ou un vert fluo donneraient des fonds identiques
  // au blanc : les bulles et les cartes ne se distingueraient plus).
  const soutenue = (c: string) => (luminance(c) > 0.4 ? ajusterContraste(c, [blanc], 2.4) : c);
  const base = soutenue(vif);
  // Revue : papier blanc cassé — celui de la gamme s'il est teinté, sinon le papier de la charte à peine teinté de la couleur.
  const papier = g && g.fond.toLowerCase() !== blanc ? g.fond : melanger(PAPIER_REVUE, base, 0.025);
  const page = revue ? papier : g ? (tableau ? melanger(g.fond, base, 0.04) : g.fond) : tableau ? melanger(blanc, base, 0.06) : blanc;
  const carte = revue ? page : blanc;
  const doux = revue ? (g && g.fondDoux.toLowerCase() !== blanc ? g.fondDoux : melanger(page, base, 0.07)) : g ? g.fondDoux : melanger(blanc, base, tableau ? 0.1 : 0.07);
  const bulle = v?.vifPale ?? melanger(blanc, base, 0.14);
  const duoBulle = v?.duoPale ?? bulle;
  const duoDoux = melanger(blanc, soutenue(duo), 0.09);
  // Aplat pastel : celui de la gamme vitaminée ; pour une couleur libre claire (jaune, vert fluo), sa propre teinte éclaircie (pas une version grisée).
  // Revue : pastel plus retenu pour une couleur libre claire (un vert fluo ou un jaune vif resteraient criards en grand aplat).
  const aplat = v?.aplat && g?.famille === 'vitaminee' ? v.aplat : luminance(vif) > 0.4 ? melanger(blanc, vif, revue ? 0.3 : 0.55) : melanger(blanc, base, 0.22);
  const clairs = [page, carte, doux, bulle, duoBulle, duoDoux, aplat];
  const encreSure = ajusterContraste(encre, clairs, 7);
  const encreDouce = ajusterContraste(melanger(encreSure, blanc, 0.32), clairs, 4.6);
  const accentTexte = ajusterContraste(g?.accent ?? libre, clairs, 4.6);
  const bulleTexte = ajusterContraste(melanger(v?.vifFonce ?? base, encreSure, 0.25), [bulle, carte], 5);
  const bullePicto = ajusterContraste(v?.vifFonce ?? base, [bulle, carte], 3);
  const duoTexte = ajusterContraste(melanger(v?.duoFonce ?? soutenue(duo), encreSure, 0.25), [duoBulle, duoDoux, carte], 5);
  const duoPicto = ajusterContraste(v?.duoFonce ?? soutenue(duo), [duoBulle, carte], 3);
  // Texte posé sur une couleur pleine : blanc ou encre, le plus lisible ; couleur corrigée si aucun n'atteint 4,5:1.
  const lisibleSur = (fond: string) => (contraste(blanc, fond) >= contraste(encreSure, fond) ? blanc : encreSure);
  const pleine = (c: string) => {
    let x = c;
    for (let i = 1; i <= 20 && contraste(lisibleSur(x), x) < 4.6; i++) x = melanger(c, lisibleSur(c) === blanc ? NEUTRES.nuit : blanc, i / 20);
    return x;
  };
  const vifPlein = pleine(vif);
  const duoPlein = pleine(duo);
  // Bouton principal : celle des deux couleurs (vif, duo) qui se détache le plus de l'aplat et de la page.
  const detache = (c: string) => Math.min(contraste(c, aplat), contraste(c, page));
  const plein = detache(duoPlein) > detache(vifPlein) + 0.5 ? duoPlein : vifPlein;
  const pleinTexte = lisibleSur(plein);
  // Survol : plus foncé sous un texte blanc, plus clair sous un texte encre (le contraste ne baisse jamais).
  const pleinSurvol = pleinTexte === blanc ? ajusterContraste(melanger(plein, NEUTRES.nuit, 0.22), [blanc], 4.6) : ajusterContraste(melanger(plein, blanc, 0.2), [encreSure], 4.6, 'clair');
  // Revue : le bouton principal est posé sur l'aplat du premier écran : son contour s'en détache aussi (≥ 3:1).
  const pleinBord = ajusterContraste(plein, revue ? [page, carte, aplat] : [page, carte], 3);
  // Surface sombre (pied de page « tableau ») : l'encre assortie, ou la couleur assombrie vers la nuit (texte papier ≥ 9:1).
  const sombre = ajusterContraste(g?.famille === 'vitaminee' ? encre : melanger(base, NEUTRES.nuit, 0.72), [NEUTRES.papier], 9);
  const sombreDoux = ajusterContraste(melanger(NEUTRES.papier, sombre, 0.25), [sombre], 6, 'clair');
  const sombreAccent = ajusterContraste(melanger(vif, blanc, 0.35), [sombre], 4.8, 'clair');
  const ligne = melanger(page, encreSure, 0.13);
  // Plan d'accès : îlots teintés, rues blanches bordées, noms des rues lisibles sur les îlots et sur les rues.
  const planFond = melanger(blanc, base, 0.1);
  const planIlot = melanger(blanc, base, 0.16);
  const planBord = melanger(planIlot, encreSure, 0.22);
  const planTexte = ajusterContraste(encreDouce, [planFond, planIlot, blanc], 4.6);
  const planPoint = ajusterContraste(plein, [planIlot, blanc], 3);
  const aplatTexte = encreSure;
  const aplatDoux = ajusterContraste(melanger(encreSure, aplat, 0.25), [aplat], 4.6);
  // Filets des bulles : même teinte que la bulle, plus soutenue (décoratif : la bulle se lit par son texte et son fond).
  const bulleBord = v?.vifLigne ?? melanger(bulle, base, 0.35);
  const duoBord = v?.duoLigne ?? bulleBord;
  // Trait du dessin du premier écran : le duo foncé (sinon la couleur), lisible sur l'aplat et sur la page.
  const figure = ajusterContraste(v?.duoFonce ?? base, [aplat, page], 3);
  return {
    page, carte, doux, bulle, 'bulle-texte': bulleTexte, 'bulle-picto': bullePicto, 'accent-texte': accentTexte, plein, 'plein-texte': pleinTexte,
    'plein-survol': pleinSurvol, 'plein-bord': pleinBord, sombre, 'sombre-texte': NEUTRES.papier, 'sombre-doux': sombreDoux, 'sombre-accent': sombreAccent,
    ligne, encre: encreSure, 'encre-douce': encreDouce, 'plan-fond': planFond, 'plan-ilot': planIlot, 'plan-rue': blanc, 'plan-bord': planBord,
    'plan-texte': planTexte, 'plan-point': planPoint, vif: vifPlein, 'vif-texte': lisibleSur(vifPlein), aplat, 'aplat-texte': aplatTexte, 'aplat-doux': aplatDoux,
    duo: duoPlein, 'duo-bulle': duoBulle, 'duo-texte': duoTexte, 'duo-picto': duoPicto, 'duo-doux': duoDoux,
    'bulle-bord': bulleBord, 'duo-bord': duoBord, figure,
  };
}

/** Variables CSS (--g-<rôle>) d'un gabarit ; vide pour le gabarit classique (rendu historique inchangé). */
export function variablesGabarit(m: Pick<ModeleManifeste, 'gabarit' | 'jetons'>, choix: { couleur: string; gamme?: string | null }): Record<string, string> {
  if (gabaritModele(m) === 'classique') return {};
  return Object.fromEntries(Object.entries(couleursGabarit(m, choix)).map(([k, v]) => [`--g-${k}`, v]));
}

/** Paires (texte, fond, minimum) vérifiées pour chaque couleur de cabinet. */
const PAIRES: [keyof CouleursGabarit, keyof CouleursGabarit, number][] = [
  ['encre', 'page', 4.5], ['encre', 'carte', 4.5], ['encre', 'doux', 4.5], ['encre', 'bulle', 4.5],
  ['encre-douce', 'page', 4.5], ['encre-douce', 'carte', 4.5], ['encre-douce', 'doux', 4.5],
  ['accent-texte', 'page', 4.5], ['accent-texte', 'carte', 4.5], ['accent-texte', 'doux', 4.5], ['accent-texte', 'bulle', 4.5],
  ['bulle-texte', 'bulle', 4.5], ['plein-texte', 'plein', 4.5], ['plein-texte', 'plein-survol', 4.5],
  ['plein-bord', 'page', 3], ['plein-bord', 'carte', 3],
  ['sombre-texte', 'sombre', 4.5], ['sombre-doux', 'sombre', 4.5], ['sombre-accent', 'sombre', 4.5],
  ['plan-texte', 'plan-ilot', 4.5], ['plan-texte', 'plan-rue', 4.5], ['plan-texte', 'plan-fond', 4.5], ['plan-point', 'plan-ilot', 3], ['plan-point', 'plan-rue', 3],
  ['aplat-texte', 'aplat', 4.5], ['aplat-doux', 'aplat', 4.5], ['vif-texte', 'vif', 4.5], ['bulle-picto', 'bulle', 3], ['duo-picto', 'duo-bulle', 3], ['encre', 'aplat', 4.5],
  ['duo-texte', 'duo-bulle', 4.5], ['duo-texte', 'duo-doux', 4.5], ['duo-texte', 'carte', 4.5], ['encre', 'duo-bulle', 4.5],
  ['figure', 'aplat', 3], ['figure', 'page', 3], ['accent-texte', 'aplat', 4.5], ['encre-douce', 'bulle', 4.5],
];

/** Paires propres au gabarit « revue » (bouton principal posé sur l'aplat du premier écran). */
const PAIRES_REVUE: [keyof CouleursGabarit, keyof CouleursGabarit, number][] = [['plein-bord', 'aplat', 3]];

/** Couleurs libres extrêmes du contrôle : jaune pâle, rouge saturé, bleu nuit, gris moyen, vert fluo. */
export const COULEURS_EXTREMES = ['#fff3a0', '#e10600', '#0b1f4d', '#8a8a8a', '#39ff14'] as const;

/** Défauts de contraste d'un gabarit pour une couleur de cabinet (liste vide si tout est lisible). */
export function verifierCouleursGabarit(m: Pick<ModeleManifeste, 'id' | 'gabarit' | 'jetons'>, choix: { couleur: string; gamme?: string | null }): string[] {
  if (gabaritModele(m) === 'classique') return [];
  const c = couleursGabarit(m, choix);
  return [...PAIRES, ...(gabaritModele(m) === 'revue' ? PAIRES_REVUE : [])].map(([t, f, min]) => [t, f, min, contraste(c[t], c[f])] as const)
    .filter(([, , min, r]) => r < min)
    .map(([t, f, min, r]) => `${m.id} (${choix.gamme || choix.couleur}) : ${t} sur ${f} = ${r.toFixed(2)}:1 (minimum ${min}:1)`);
}
