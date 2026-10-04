// Gammes de couleurs : couche 4 de la charte. Des palettes curées, choisies par le praticien, destinées à
// remplacer à terme le sélecteur de couleur libre. Chaque gamme fixe l'accent (boutons, liens), sa version
// foncée, le fond des pages, le fond des sections alternées, le fond « plan » des surfaces sombres et le
// « signal » (lectures de données sur fond sombre). Les contrastes AA sont vérifiés par `verifierGamme`
// (exécuté par `npm run controle:charte` dans apps/sites).
//
// Compatibilité : une couleur libre (theme.couleur) reste acceptée et utilisée telle quelle ;
// `gammeLaPlusProche` permet de la rattacher à une gamme (migration de l'éditeur).

import { contraste, distance, melanger } from './couleurs';
import { NEUTRES } from './charte';
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
];

export const gamme = (id: string | undefined | null) => GAMMES.find((g) => g.id === id);

/** Gamme dont l'accent est le plus proche d'une couleur libre */
export function gammeLaPlusProche(couleur: string): Gamme {
  return [...GAMMES].sort((a, b) => distance(a.accent, couleur) - distance(b.accent, couleur))[0];
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
  };
}

/**
 * Variables CSS du thème d'un site : jetons du modèle (couche 5), puis couleurs de la gamme choisie
 * (couche 4) ou, à défaut, de la couleur libre du cabinet. Les invariants viennent de la charte (:root).
 */
export function variablesTheme(m: ModeleManifeste, choix: { couleur: string; gamme?: string | null }): Record<string, string> {
  const encre = m.jetons.accent === 'encre';
  const g = gamme(choix.gamme);
  const t = buildTheme(g?.accent ?? choix.couleur);
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
  };
  if (encre) {
    v['--accent'] = 'var(--encre-nuit)';
    v['--accent-fonce'] = 'var(--encre-nuit-douce)';
  }
  return v;
}
