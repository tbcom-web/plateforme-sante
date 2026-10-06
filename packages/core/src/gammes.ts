// Gammes de couleurs : couche 4 de la charte. Des palettes curées, choisies par le praticien, destinées à
// remplacer à terme le sélecteur de couleur libre. Chaque gamme fixe l'accent (boutons, liens), sa version
// foncée, le fond des pages, le fond des sections alternées, le fond « plan » des surfaces sombres et le
// « signal » (lectures de données sur fond sombre). Les contrastes AA sont vérifiés par `verifierGamme`
// (exécuté par `npm run controle:charte` dans apps/sites).
//
// Gammes « vitaminées » (2026) : 8 gammes de plus, joyeuses et vives (tendances couleur 2026 : Cloud Dancer de Pantone
// pour des fonds blanc cassé aérés ; Transformative Teal, Jelly Mint, Electric Fuchsia, Amber Haze de WGSN × Coloro ;
// Wasabi, Persimmon, Plum Noir de Pinterest Palette ; « dopamine design »). Elles ajoutent, en champs FACULTATIFS, un
// DUO de couleurs vives (`vif` + `duo`), une couleur d'`aplat` de section et une `encre` assortie. Règle d'emploi
// (60-30-10, règles de clarté) : fond clair majoritaire, couleur vive en aplat court (premier écran OU une section),
// bulles en duo, boutons ; jamais de texte en couleur vive sur fond clair (on prend `accent` ou `vifFonce`), jamais de
// grande surface rouge. Les modèles qui ignorent ces champs gardent leur rendu : `accent`, `fond`, `fondDoux`, `plan`
// et `signal` conservent leur sens et leurs garanties AA. `variantesGamme` calcule les dérivés (pâle, ligne, foncé,
// texte posé sur la couleur) pour toute gamme, avec des valeurs de repli pour les 9 gammes « sobres ».
//
// Compatibilité : une couleur libre (theme.couleur) reste acceptée et utilisée telle quelle ;
// `gammeLaPlusProche` permet de la rattacher à une gamme (migration de l'éditeur).

import { contraste, distance, hex, melanger, rvb } from './couleurs';
import { NEUTRES, QUADRILLAGE, SUR_SOMBRE, TRAME } from './charte';
import { PRESSION, ARRETS_PRESSION, couleurPression } from './univers';
import { buildTheme } from './theme';
import type { ModeleManifeste } from './modeles';

export type Gamme = {
  id: string;
  nom: string;
  /** Boutons, liens, repères (texte blanc dessus) */
  accent: string;
  /** Survol des boutons, pied de page « accent » */
  accentFonce: string;
  /** Fond des pages */
  fond: string;
  /** Fond des sections alternées */
  fondDoux: string;
  /** Fond des surfaces sombres « plan d'architecte » */
  plan: string;
  /** Lectures de données sur fond plan (légendes, lignes de scan, numéros) */
  signal: string;
  /** Famille : « sobre » (9 gammes historiques, valeur par défaut) ou « vitaminee » (2026, duo de couleurs vives) */
  famille?: 'sobre' | 'vitaminee';
  /** Couleur vive principale : aplats courts, bulles, boutons vifs (texte encre ou blanc calculé : variantesGamme) */
  vif?: string;
  /** Second accent du duo : bulles alternées, pictos, illustrations teintées, soulignés */
  duo?: string;
  /** Fond d'aplat de section (premier écran ou bandeau coloré) : texte encre dessus */
  aplat?: string;
  /** Encre assortie : texte courant et titres sur fond, fond doux, aplat et bulles pâles */
  encre?: string;
};

export const GAMMES: Gamme[] = [
  { id: 'canard', nom: 'Canard', accent: '#1f6b64', accentFonce: '#134a45', fond: '#ffffff', fondDoux: '#eef4f3', plan: '#0f3b3a', signal: '#6ff2c2' },
  { id: 'cobalt', nom: 'Cobalt', accent: '#1f4fbf', accentFonce: '#143a8f', fond: '#ffffff', fondDoux: '#eef2fa', plan: '#123c8c', signal: '#6ff2c2' },
  { id: 'sauge', nom: 'Sauge', accent: '#3f6b4f', accentFonce: '#2b4c37', fond: '#fbfcfa', fondDoux: '#eef3ec', plan: '#1f3a2b', signal: '#c8f0a8' },
  { id: 'terracotta', nom: 'Terracotta', accent: '#a4492c', accentFonce: '#7a341f', fond: '#f7f2ec', fondDoux: '#efe6dc', plan: '#3a1f17', signal: '#f2b880' },
  { id: 'prune', nom: 'Prune', accent: '#6b2f5f', accentFonce: '#4c1f43', fond: '#fcf9fb', fondDoux: '#f3ecf1', plan: '#2c1530', signal: '#f5b8de' },
  { id: 'sable', nom: 'Sable', accent: '#83561b', accentFonce: '#5f3e12', fond: '#fbf8f2', fondDoux: '#f2ebdd', plan: '#2e2617', signal: '#f4d38a' },
  { id: 'encre', nom: 'Encre', accent: '#0b1c24', accentFonce: '#1c3742', fond: '#ffffff', fondDoux: '#f4f5f4', plan: '#0f2a33', signal: '#6ff2c2' },
  { id: 'ardoise', nom: 'Ardoise', accent: '#3d4f63', accentFonce: '#283646', fond: '#ffffff', fondDoux: '#eff2f5', plan: '#1d2733', signal: '#9fd3ff' },
  { id: 'corail', nom: 'Corail', accent: '#b0393a', accentFonce: '#862a2b', fond: '#ffffff', fondDoux: '#fbf0ee', plan: '#2a1a1f', signal: '#ffb59e' },
  // ——— Gammes vitaminées (2026) : accent = version « texte » (liens, boutons à texte blanc) ; vif + duo = la couleur
  // qui « pète » (aplats courts, bulles, boutons vifs) ; fond blanc cassé à peine teinté ; aplat = pastel juteux.
  {
    id: 'mangue', nom: 'Mangue & encre', famille: 'vitaminee',
    vif: '#ffb547', duo: '#26305e', aplat: '#ffe1ad', encre: '#1d2240',
    accent: '#a04a00', accentFonce: '#7a3800', fond: '#fffbf4', fondDoux: '#fff3df', plan: '#1d2240', signal: '#ffb547',
  },
  {
    id: 'pasteque', nom: 'Pastèque & menthe', famille: 'vitaminee',
    vif: '#ff5d73', duo: '#3fd0a0', aplat: '#c9f2e3', encre: '#2a1a24',
    accent: '#b3264a', accentFonce: '#861a37', fond: '#fffafa', fondDoux: '#fff0f1', plan: '#2a1a24', signal: '#7fe6c3',
  },
  {
    id: 'lavande', nom: 'Lavande & citron', famille: 'vitaminee',
    vif: '#6f4cff', duo: '#f2df3a', aplat: '#e6defe', encre: '#221b3d',
    accent: '#5a36e0', accentFonce: '#43249f', fond: '#fbfaff', fondDoux: '#f2efff', plan: '#221b3d', signal: '#f2df3a',
  },
  {
    id: 'corail-nuit', nom: 'Corail & bleu nuit', famille: 'vitaminee',
    vif: '#ff7a5c', duo: '#1f2f5c', aplat: '#ffd9cc', encre: '#16213f',
    accent: '#2a3f7a', accentFonce: '#1f2f5c', fond: '#fffaf7', fondDoux: '#fff0ea', plan: '#16213f', signal: '#ff9b82',
  },
  {
    id: 'menthe', nom: 'Menthe glacée & prune', famille: 'vitaminee',
    vif: '#57dcbe', duo: '#6b2d5c', aplat: '#c6f1e5', encre: '#2a1530',
    accent: '#0f7563', accentFonce: '#0b5446', fond: '#f8fdfb', fondDoux: '#e9f9f4', plan: '#2a1530', signal: '#57dcbe',
  },
  {
    id: 'cobalt-abricot', nom: 'Cobalt & abricot', famille: 'vitaminee',
    vif: '#2d5bff', duo: '#ffb08a', aplat: '#ffe2d3', encre: '#141f45',
    accent: '#2449d8', accentFonce: '#1a36a8', fond: '#fafaff', fondDoux: '#eef1ff', plan: '#141f45', signal: '#ffb08a',
  },
  {
    id: 'pistache', nom: 'Pistache & framboise', famille: 'vitaminee',
    vif: '#b6dc5e', duo: '#cc2d63', aplat: '#e2f1bd', encre: '#1f2a14',
    accent: '#4a6b12', accentFonce: '#374f0d', fond: '#fcfdf7', fondDoux: '#f2f8e3', plan: '#1f2a14', signal: '#c9ea7a',
  },
  {
    id: 'tournesol', nom: 'Tournesol & ardoise', famille: 'vitaminee',
    vif: '#ffc83a', duo: '#3e5568', aplat: '#ffe9a8', encre: '#1c2731',
    accent: '#3e5568', accentFonce: '#2b3c4a', fond: '#fffcf3', fondDoux: '#fff5d9', plan: '#1c2731', signal: '#ffc83a',
  },
];

export const gamme = (id: string | undefined | null) => GAMMES.find((g) => g.id === id);

/** Gammes vitaminées (2026) : duo de couleurs vives, aplat et encre assortie */
export const GAMMES_VITAMINEES = GAMMES.filter((g) => g.famille === 'vitaminee');
/** Gammes sobres (historiques) */
export const GAMMES_SOBRES = GAMMES.filter((g) => g.famille !== 'vitaminee');

/** Gamme dont l'accent est le plus proche d'une couleur libre (parmi les gammes sobres : migration inchangée) */
export function gammeLaPlusProche(couleur: string): Gamme {
  return [...GAMMES_SOBRES].sort((a, b) => distance(a.accent, couleur) - distance(b.accent, couleur))[0];
}

/** Couleurs dérivées d'une gamme (#rrggbb), y compris pour une gamme sobre (replis : vif = duo = accent, aplat = fond doux). */
export type VariantesGamme = {
  vif: string; vifTexte: string; vifPale: string; vifLigne: string; vifFonce: string;
  duo: string; duoTexte: string; duoPale: string; duoLigne: string; duoFonce: string;
  aplat: string; encre: string;
};

// Teinte, saturation, luminosité : les dérivés gardent la teinte et la saturation de la couleur (un mélange vers l'encre
// ou le blanc la « salirait » : une mangue foncée doit rester ambrée, pas devenir brune).
function tsl(c: string): [number, number, number] {
  const [r, v, b] = rvb(c).map((x) => x / 255);
  const max = Math.max(r, v, b), min = Math.min(r, v, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const t = max === r ? (v - b) / d + (v < b ? 6 : 0) : max === v ? (b - r) / d + 2 : (r - v) / d + 4;
  return [t / 6, s, l];
}
function depuisTsl(t: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (x: number) => {
    const u = x < 0 ? x + 1 : x > 1 ? x - 1 : x;
    return u < 1 / 6 ? p + (q - p) * 6 * u : u < 1 / 2 ? q : u < 2 / 3 ? p + (q - p) * (2 / 3 - u) * 6 : p;
  };
  return hex([f(t + 1 / 3), f(t), f(t - 1 / 3)].map((x) => x * 255));
}
/** Même teinte et saturation, luminosité `l` (0 à 1) */
const luminosite = (c: string, l: number) => { const [t, s] = tsl(c); return depuisTsl(t, s, l); };

/** Assombrit `c` (luminosité seule) jusqu'à `min` contre chacun des `fonds` (pictos, grands titres, contours). */
function foncerJusqua(c: string, fonds: string[], min: number): string {
  const pire = (x: string) => Math.min(...fonds.map((f) => contraste(x, f)));
  // saturation plafonnée à 0,8 : une couleur vive assombrie ne vire pas au rouge « alerte » ni au fluo
  const [t, s0, l0] = tsl(c);
  const s = Math.min(s0, 0.8);
  let x = c;
  for (let l = l0; l > 0.04 && pire(x) < min; l -= 0.01) x = depuisTsl(t, s, l);
  return x;
}

export function variantesGamme(g: Gamme): VariantesGamme {
  const blanc = NEUTRES.blanc;
  const encre = g.encre ?? NEUTRES.encre;
  const vif = g.vif ?? g.accent;
  const duo = g.duo ?? vif;
  const aplat = g.aplat ?? g.fondDoux;
  // Texte posé sur une couleur : blanc ou encre assortie, le plus lisible des deux
  const texteSur = (c: string) => (contraste(blanc, c) >= contraste(encre, c) ? blanc : encre);
  // Pâle (fond de bulle) et ligne (contour) : même teinte, luminosité fixée (jamais plus sombre que la couleur elle-même)
  const pale = (c: string) => luminosite(c, Math.max(tsl(c)[2], 0.9));
  const ligne = (c: string) => luminosite(c, Math.max(tsl(c)[2], 0.76));
  const clairs = [g.fond, g.fondDoux, aplat, pale(vif), pale(duo)];
  return {
    vif, vifTexte: texteSur(vif), vifPale: pale(vif), vifLigne: ligne(vif), vifFonce: foncerJusqua(vif, clairs, 3),
    duo, duoTexte: texteSur(duo), duoPale: pale(duo), duoLigne: ligne(duo), duoFonce: foncerJusqua(duo, clairs, 3),
    aplat, encre,
  };
}

/**
 * Contrôles du duo, de l'aplat et de l'encre assortie (toutes gammes, avec les replis de variantesGamme) : chaque gamme
 * sur ses 4 fonds clairs — fond, fond doux, aplat et bulles pâles (vif, duo) — en texte courant (4,5:1) et en grand
 * texte / élément graphique (3:1), plus le texte posé sur les couleurs vives (boutons et bulles pleines, 4,5:1).
 */
export function testsDuo(g: Gamme): [string, string, string, number][] {
  const v = variantesGamme(g);
  const fonds: [string, string][] = [['fond', g.fond], ['fond doux', g.fondDoux], ['aplat', v.aplat], ['bulle vif pâle', v.vifPale], ['bulle duo pâle', v.duoPale]];
  return [
    ...fonds.flatMap(([nom, f]): [string, string, string, number][] => [
      [`encre assortie sur ${nom} (texte courant)`, v.encre, f, 4.5],
      [`encre de la charte sur ${nom} (texte courant)`, NEUTRES.encre, f, 4.5],
      [`vif foncé sur ${nom} (grand titre, picto)`, v.vifFonce, f, 3],
      [`duo foncé sur ${nom} (grand titre, picto)`, v.duoFonce, f, 3],
    ]),
    ['accent sur aplat (liens)', g.accent, v.aplat, 4.5],
    ['accent sur aplat (grand texte)', g.accent, v.aplat, 3],
    ['texte sur vif (boutons, bulles pleines)', v.vifTexte, v.vif, 4.5],
    ['texte sur duo (bulles pleines)', v.duoTexte, v.duo, 4.5],
  ];
}

/** Contrôles AA d'une gamme : liste des défauts (vide si conforme) */
export function verifierGamme(g: Gamme): string[] {
  const tests: [string, string, string, number][] = [
    ['texte blanc sur accent (boutons)', NEUTRES.blanc, g.accent, 4.5],
    ['texte blanc sur accent foncé', NEUTRES.blanc, g.accentFonce, 4.5],
    ['accent sur fond (liens)', g.accent, g.fond, 4.5],
    ['accent sur fond doux', g.accent, g.fondDoux, 4.5],
    ['encre sur fond', NEUTRES.encre, g.fond, 4.5],
    ['encre sur fond doux', NEUTRES.encre, g.fondDoux, 4.5],
    ['papier sur plan', NEUTRES.papier, g.plan, 4.5],
    ['signal sur plan', g.signal, g.plan, 4.5],
    ...testsDuo(g),
  ];
  return tests
    .map(([nom, a, b, min]) => [nom, contraste(a, b), min] as const)
    .filter(([, c, min]) => c < min)
    .map(([nom, c, min]) => `${g.id} : ${nom} = ${c.toFixed(2)}:1 (minimum ${min}:1)`);
}

/** Variables CSS d'une gamme (accent et fonds) */
export function variablesGamme(g: Gamme): Record<string, string> {
  return {
    '--accent': g.accent,
    '--accent-fonce': g.accentFonce,
    '--accent-vif': g.accent,
    '--accent-pale': melanger(g.accent, NEUTRES.blanc, 0.88),
    '--accent-tres-pale': melanger(g.accent, NEUTRES.blanc, 0.94),
    '--accent-ligne': melanger(g.accent, NEUTRES.blanc, 0.7),
    '--fond': g.fond,
    '--doux': g.fondDoux,
    '--plan': g.plan,
    '--signal': g.signal,
    // Duo (gammes vitaminées ; replis sur l'accent pour les gammes sobres) : ignoré par les modèles qui ne s'en servent pas
    ...variablesDuo(g),
  };
}

/** Variables CSS du duo : --vif, --vif-texte, --vif-pale, --vif-ligne, --vif-fonce, idem --duo-*, --aplat, --encre-gamme */
export function variablesDuo(g: Gamme): Record<string, string> {
  const v = variantesGamme(g);
  return {
    '--vif': v.vif, '--vif-texte': v.vifTexte, '--vif-pale': v.vifPale, '--vif-ligne': v.vifLigne, '--vif-fonce': v.vifFonce,
    '--duo': v.duo, '--duo-texte': v.duoTexte, '--duo-pale': v.duoPale, '--duo-ligne': v.duoLigne, '--duo-fonce': v.duoFonce,
    '--aplat': v.aplat, '--encre-gamme': v.encre,
  };
}

// ———————————————————————————————————————————————————— Teinte « gamme » des surfaces sombres (modèle Technique)

/**
 * Surfaces sombres d'un modèle à teinte « gamme » (jeton `teinte: 'gamme'`, modèle Technique) : TOUT vient de la gamme du
 * cabinet (ou de sa couleur libre) — aucun signal menthe ni palette bleu → rouge fixe ne s'y mêle (retour de Paul, 2026-10-06 :
 * « du bleu et du vert mélangés »).
 *   plan / planProfond   fond « plan d'architecte » : celui de la gamme (sinon la couleur assombrie) et sa version plus foncée
 *   nuit / nuitHaut      fonds des animations et du premier écran : le plan presque noir, même teinte
 *   pied                 pied de page sombre, entre la nuit et le plan
 *   signal               lectures de données, filets actifs, ligne de scan : sobre → la teinte de l'accent éclaircie ;
 *                        vitaminée → le signal de la gamme (sa couleur vive ou son duo)
 *   pressionSombre       échelle de pression (5 niveaux) posée sur fond sombre : monochrome de la teinte du signal, du plus
 *                        discret (faible appui) au plus lumineux (fort appui)
 *   pressionClaire       même échelle posée sur fond clair : du plus pâle au plus soutenu
 * Contrastes garantis (verifierTeinteSombre, npm run controle:charte) : papier ≥ 9:1 sur plan, nuit et pied ; signal ≥ 4,5:1 sur
 * les trois ; niveaux 2 à 5 de pression ≥ 3:1 sur le plan (sombre) ou sur le blanc (claire, niveaux 3 à 5).
 */
export type TeinteSombre = {
  plan: string; planProfond: string; nuit: string; nuitHaut: string; pied: string; signal: string;
  pressionSombre: string[]; pressionClaire: string[];
};

/** Éclaircit `c` (luminosité seule, même teinte) jusqu'à `min` contre chacun des `fonds`. */
function eclaircirJusqua(c: string, fonds: string[], min: number): string {
  const pire = (x: string) => Math.min(...fonds.map((f) => contraste(x, f)));
  const [t, s, l0] = tsl(c);
  let x = c;
  for (let l = l0; l < 0.97 && pire(x) < min; l += 0.01) x = depuisTsl(t, s, l);
  return x;
}
/** Assombrit `c` (luminosité seule, même teinte) jusqu'à `min` contre chacun des `fonds`. */
function assombrirJusqua(c: string, fonds: string[], min: number): string {
  const pire = (x: string) => Math.min(...fonds.map((f) => contraste(x, f)));
  const [t, s, l0] = tsl(c);
  let x = c;
  for (let l = l0; l > 0.02 && pire(x) < min; l -= 0.01) x = depuisTsl(t, s, l);
  return x;
}
/** Même teinte, saturation bornée, luminosité `l` */
const ton = (c: string, l: number, sMin = 0, sMax = 1) => {
  const [t, s] = tsl(c);
  return depuisTsl(t, s < 0.04 ? s : Math.min(sMax, Math.max(sMin, s)), l);
};

export function teinteSombre(choix: { couleur: string; gamme?: string | null }): TeinteSombre {
  const g = gamme(choix.gamme);
  const libre = /^#[0-9a-f]{6}$/i.test(choix.couleur) ? choix.couleur : (gamme('ardoise')?.accent ?? NEUTRES.encreNuit);
  const base = g?.accent ?? libre;
  const papier = NEUTRES.papier;
  // Plan : celui de la gamme (déjà dans sa famille de couleurs), sinon la couleur du cabinet très assombrie (même teinte).
  const plan = assombrirJusqua(g?.plan ?? ton(base, 0.2, 0, 0.7), [papier], 9);
  const nuit = ton(plan, 0.055, 0, 0.6);
  const nuitHaut = ton(plan, 0.12, 0, 0.6);
  const pied = ton(plan, 0.085, 0, 0.6);
  const planProfond = assombrirJusqua(ton(plan, tsl(plan)[2] * 0.72, 0, 0.75), [papier], 9);
  const sombres = [plan, planProfond, nuit, nuitHaut, pied];
  // Signal : gamme vitaminée → son signal (couleur vive ou duo) ; gamme sobre ou couleur libre → la teinte de l'accent, vive et claire.
  const source = g?.famille === 'vitaminee' ? g.signal : ton(base, Math.max(tsl(base)[2], 0.62), 0.55, 0.9);
  const signal = eclaircirJusqua(source, sombres, 4.8);
  // Échelles de pression : monochromes de la teinte du signal (saturation bornée : ni fluo ni grisé), régulièrement espacées
  // à partir du premier ton qui atteint 3:1 sur le fond (niveau 2 sur fond sombre, niveau 3 sur fond clair).
  const sur = (fonds: string[], sens: 1 | -1, depart: number) => {
    let l = depart;
    while (l > 0.03 && l < 0.97 && Math.min(...fonds.map((f) => contraste(ton(signal, l, 0.45, 0.9), f))) < 3) l += 0.01 * sens;
    return l;
  };
  const l3s = sur([plan, nuitHaut], 1, 0.3);
  const pressionSombre = [l3s - 0.1, l3s, l3s + (0.9 - l3s) / 3, l3s + ((0.9 - l3s) * 2) / 3, 0.9].map((l) => ton(signal, l, 0.45, 0.9));
  const l3c = sur([NEUTRES.blanc], -1, 0.8);
  const pressionClaire = [0.86, (0.86 + l3c) / 2, l3c, l3c - 0.09, l3c - 0.18].map((l) => ton(signal, l, 0.45, 0.9));
  return { plan, planProfond, nuit, nuitHaut, pied, signal, pressionSombre, pressionClaire };
}

/** Contrôles AA de la teinte « gamme » pour un cabinet (liste des défauts, vide si conforme). */
export function verifierTeinteSombre(choix: { couleur: string; gamme?: string | null }): string[] {
  const t = teinteSombre(choix);
  const qui = choix.gamme || choix.couleur;
  const tests: [string, string, string, number][] = [];
  for (const [nom, f] of [['plan', t.plan], ['plan profond', t.planProfond], ['nuit', t.nuit], ['nuit haute', t.nuitHaut], ['pied de page', t.pied]] as const) {
    tests.push([`papier sur ${nom}`, NEUTRES.papier, f, 9], [`signal sur ${nom}`, t.signal, f, 4.5]);
  }
  t.pressionSombre.slice(1).forEach((c, k) => tests.push([`pression ${k + 2} (fond sombre) sur plan`, c, t.plan, 3]));
  t.pressionClaire.slice(2).forEach((c, k) => tests.push([`pression ${k + 3} (fond clair) sur blanc`, c, NEUTRES.blanc, 3]));
  return tests
    .map(([nom, a, b, min]) => [nom, contraste(a, b), min] as const)
    .filter(([, c, min]) => c < min)
    .map(([nom, c, min]) => `teinte « gamme » (${qui}) : ${nom} = ${c.toFixed(2)}:1 (minimum ${min}:1)`);
}

const canauxRvb = (h: string) => rvb(h).join(' ');

/**
 * Variables CSS de la teinte « gamme » : elles remplacent, sur <html>, les couleurs fixes de la charte (plan, nuit, signal,
 * quadrillage sombre, palette de pression). --pression-n = échelle claire ; --pression-sombre-n = échelle des fonds sombres,
 * que les surfaces sombres reprennent en --pression-n (CSS_TEINTE_GAMME). --pied-fond : fond du pied de page sombre.
 */
export function variablesTeinte(choix: { couleur: string; gamme?: string | null }): Record<string, string> {
  const t = teinteSombre(choix);
  const v: Record<string, string> = {
    '--plan': t.plan,
    '--plan-profond': t.planProfond,
    '--nuit': t.nuit,
    '--nuit-haut': t.nuitHaut,
    '--nuit-rgb': canauxRvb(t.nuit),
    '--pied-fond': t.pied,
    '--signal': t.signal,
    // Quadrillage et filets des fonds sombres : la teinte du signal, aux mêmes opacités que le blanc de la charte
    '--quadrillage-sombre': `rgb(${canauxRvb(t.signal)} / ${QUADRILLAGE.sombre})`,
    '--quadrillage-sombre-fin': `rgb(${canauxRvb(t.signal)} / ${QUADRILLAGE.sombreFin})`,
    '--sur-sombre-filet': `rgb(${canauxRvb(t.signal)} / ${SUR_SOMBRE.filet})`,
  };
  t.pressionClaire.forEach((c, k) => { v[`--pression-${k + 1}`] = c; v[`--donnee-${k + 1}`] = c; });
  t.pressionSombre.forEach((c, k) => { v[`--pression-sombre-${k + 1}`] = c; });
  return v;
}

/**
 * Feuille de la teinte « gamme » (html[data-teinte='gamme']) :
 * 1. les dessins et relevés générés par le core (fichiers SVG statiques, images fixes des animations) portent les couleurs de
 *    la palette de pression de la charte en attributs (stroke, fill, stop-color) : une règle CSS, prioritaire sur l'attribut,
 *    leur substitue le niveau correspondant de l'échelle de la gamme (les fichiers et leurs empreintes de revue restent
 *    inchangés) ;
 * 2. sur les surfaces sombres (plan, pied de page, premier écran, animations sur fond nuit), --pression-n prend l'échelle sombre.
 */
export const CSS_TEINTE_GAMME = (() => {
  // Couleurs littérales de la palette : les 5 arrêts et les niveaux de la trame (couleurPression au milieu de chaque niveau)
  const valeurs = new Map<string, number>();
  PRESSION.forEach((c, k) => valeurs.set(c.toLowerCase(), ARRETS_PRESSION[k]));
  for (let k = 0; k < TRAME.niveaux; k++) {
    const m = (k + 0.5) / TRAME.niveaux;
    valeurs.set(couleurPression(m).toLowerCase(), m);
  }
  const niveau = (v: number) => {
    for (let k = 1; k < ARRETS_PRESSION.length; k++) {
      if (v <= ARRETS_PRESSION[k] + 1e-9) {
        const u = (v - ARRETS_PRESSION[k - 1]) / (ARRETS_PRESSION[k] - ARRETS_PRESSION[k - 1]);
        if (u < 0.01) return `var(--pression-${k})`;
        if (u > 0.99) return `var(--pression-${k + 1})`;
        return `color-mix(in srgb, var(--pression-${k}) ${Math.round((1 - u) * 100)}%, var(--pression-${k + 1}))`;
      }
    }
    return 'var(--pression-5)';
  };
  const h = "html[data-teinte='gamme']";
  const regles = [...valeurs].map(([c, v]) => {
    const x = niveau(v);
    return `${h} [stroke='${c}' i]{stroke:${x}}${h} [fill='${c}' i]{fill:${x}}${h} [stop-color='${c}' i]{stop-color:${x}}`;
  });
  const sombres = `${h} :is(.surface-plan,.pied,.hero,[class*='--sombre'],[class*='fond-sombre']){${[1, 2, 3, 4, 5].map((k) => `--pression-${k}:var(--pression-sombre-${k})`).join(';')}}`;
  return regles.join('') + sombres;
})();

/**
 * Variables CSS du thème d'un site : jetons du modèle (couche 5), puis couleurs de la gamme choisie
 * (couche 4) ou, à défaut, de la couleur libre du cabinet. Les invariants viennent de la charte (:root).
 */
export function variablesTheme(m: ModeleManifeste, choix: { couleur: string; gamme?: string | null }): Record<string, string> {
  const encre = m.jetons.accent === 'encre';
  const g = gamme(choix.gamme);
  const t = buildTheme(g?.accent ?? choix.couleur, [m.jetons.fond, m.jetons.fondDoux ?? ''].filter(Boolean));
  const v: Record<string, string> = {
    '--accent': t['--brand-ink'],
    '--accent-fonce': t['--brand-deep'],
    '--accent-vif': t['--brand-ink'],
    '--accent-pale': t['--brand-soft'],
    '--accent-tres-pale': t['--brand-softer'],
    '--accent-ligne': t['--brand-line'],
    '--fond': m.jetons.fond,
    ...(m.jetons.fondDoux ? { '--doux': m.jetons.fondDoux } : {}),
    // Plan par défaut : couleur du cabinet assombrie vers la nuit de la charte
    '--plan': m.jetons.plan ?? `color-mix(in srgb, ${encre ? NEUTRES.encreNuitDouce : t['--brand-deep']} 64%, ${NEUTRES.nuit})`,
    ...(m.jetons.signal ? { '--signal': m.jetons.signal } : {}),
    ...(g ? variablesGamme(g) : {}),
    // Teinte « gamme » (modèle Technique) : surfaces sombres, signal et pression dérivés de la gamme ou de la couleur libre
    ...(m.jetons.teinte === 'gamme' ? variablesTeinte(choix) : {}),
  };
  if (encre) {
    v['--accent'] = 'var(--encre-nuit)';
    v['--accent-fonce'] = 'var(--encre-nuit-douce)';
  }
  return v;
}
