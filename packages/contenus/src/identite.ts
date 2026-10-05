// IDENTITÉ du cabinet → tout ce qui personnalise un rendu : variables CSS (charte + modèle + gamme), polices, logo.
// Aucune couleur n'est écrite ici : elles viennent de la charte (feuilleCharte), de la gamme ou de la couleur du cabinet
// (variablesTheme) et des marques de logo (couleursMarque). Changer d'identité = changer l'attribut style d'un conteneur :
// l'aperçu se met à jour instantanément, sans recomposer le contenu.

import {
  POLICES, POLICE_MONO, modeleIntegre, variablesTheme, couleursMarque, traitementLogo, svgMarque, initiales, validerChoixLogo,
  type ModeleManifeste, type SiteConfig,
} from '@plateforme/core';
import { styleIdentite } from './composer';
import type { Identite, SpecialiteContenu, Style } from './types';

/** Identité depuis la configuration du site (même source que le site : nom, praticiens, ville, couleurs, logo, modèle) */
export function identiteDepuisSite(site: SiteConfig, options: { style?: Style } = {}): Identite {
  const praticiens = site.praticiens?.length
    ? site.praticiens.map((p) => `${p.prenom} ${p.nom}`.trim())
    : [`${site.praticien.prenom} ${site.praticien.nom}`.trim()];
  const specialite = (['generale', 'sport', 'enfant', 'soins'] as const).find((x) => x === site.visuels?.specialite) ?? 'generale';
  return {
    nom: site.cabinet.nom,
    praticiens,
    metier: site.titreMetier || site.profession.libelle,
    ville: site.cabinet.ville,
    quartier: site.cabinet.quartier,
    domaine: site.domaine,
    lienRdv: site.rdv?.url,
    modele: site.modele,
    theme: { couleur: site.theme.couleur, gamme: site.theme.gamme ?? null },
    logo: validerChoixLogo(site.theme.logo),
    logoPerso: site.theme.logoPerso,
    specialite: specialite as SpecialiteContenu,
    style: options.style,
    soinsDuSite: site.soins.map((s) => s.slug),
  };
}

/** Modèle effectif d'un style : « simple » prend la typographie et les fonds du modèle Simple ; les autres gardent le modèle du cabinet */
export function modeleDuStyle(i: Pick<Identite, 'modele' | 'style'>, style: Style): ModeleManifeste {
  if (style === 'simple' && i.modele.id !== 'simple') return modeleIntegre('simple');
  return i.modele;
}

/** Variables CSS d'une identité pour un style (posées sur le conteneur du rendu) */
export function variablesIdentite(i: Identite, style: Style = styleIdentite(i)): Record<string, string> {
  const m = modeleDuStyle(i, style);
  const v = variablesTheme(m, i.theme);
  const pedagogique = style !== 'releve';
  return {
    ...v,
    '--police-titres': POLICES[m.jetons.policeTitres],
    '--police-texte': POLICES[m.jetons.policeTexte],
    '--police-mono': pedagogique ? POLICES[m.jetons.policeTexte] : POLICE_MONO,
    '--graisse-titres': String(Math.max(m.jetons.graisseTitres, style === 'simple' ? 750 : 500)),
    '--rayon': `${m.jetons.rayon}px`,
  };
}

/** Attribut style d'une identité */
export const styleCss = (vars: Record<string, string>) => Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');

/** Logo de l'identité (SVG en chaîne ou image du logo existant), taille en px */
export function logoIdentite(i: Identite, style: Style, taille: number): string {
  const m = modeleDuStyle(i, style);
  if (i.logoPerso?.url) return `<img class="cz-logo__image" src="${echapper(i.logoPerso.url)}" alt="" height="${taille}">`;
  const t = traitementLogo(m);
  // Réseaux sociaux : une marque au trait (fine, couleur du cabinet) disparaît en vignette et sur fond « plan » : on la pose sur sa tuile
  const traitement = t.marque === 'trait' ? 'plein' : t.marque;
  // Style relevé (fond plan sombre) : tuile au « signal » de la gamme, marque à la couleur du plan, lisible en vignette
  const c = couleursMarque(m, i.theme);
  const couleurs = style === 'releve' && traitement === 'plein' ? { ...c, accent: c.signal, clair: c.plan } : c;
  return svgMarque(i.logo.marque, couleurs, {
    traitement,
    rayon: t.rayon,
    epais: t.epais,
    police: t.police,
    graisse: t.graisse,
    initiales: initiales(i.nom),
    taille,
  });
}

/** Le logo existant contient-il déjà le nom (on n'écrit pas le nom deux fois) */
export const logoAvecNom = (i: Identite) => !!i.logoPerso?.complet;

/** Échappement HTML (noms avec &, <, guillemets) */
export const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Fichiers de polices (paquets @fontsource déjà présents dans le dépôt) : famille, chemin dans node_modules */
export const FICHIERS_POLICES: { famille: string; fichier: string; graisse: string }[] = [
  { famille: 'Inter Variable', fichier: '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', graisse: '100 900' },
  { famille: 'Manrope Variable', fichier: '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', graisse: '200 800' },
  { famille: 'Fraunces Variable', fichier: '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2', graisse: '100 900' },
  { famille: 'Instrument Serif', fichier: '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2', graisse: '400' },
  { famille: 'Schibsted Grotesk Variable', fichier: '@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2', graisse: '400 900' },
  { famille: 'Nunito Variable', fichier: '@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2', graisse: '200 1000' },
  { famille: 'JetBrains Mono Variable', fichier: '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', graisse: '100 800' },
];

/** Règles @font-face ; `url(fichier)` donne l'adresse servie (file:// en local, /polices/… dans l'admin) */
export const policesCss = (url: (fichier: string) => string) =>
  FICHIERS_POLICES.map((p) => `@font-face{font-family:"${p.famille}";font-weight:${p.graisse};font-display:block;src:url("${url(p.fichier)}") format("woff2")}`).join('');

/**
 * Identité minimale (formulaire de l'aperçu gratuit, tests) : nom, praticiens, ville, gamme ou couleur, modèle, marque.
 * Les valeurs absentes prennent celles par défaut de la plateforme.
 */
export function identiteRapide(o: {
  nom: string; praticiens: string[]; ville: string; quartier?: string; domaine: string;
  modele?: string; gamme?: string; couleur?: string; marque?: string; specialite?: SpecialiteContenu; style?: Style;
  logoPerso?: { url: string; complet: boolean };
}): Identite {
  const modele = modeleIntegre(o.modele ?? 'proximite');
  return {
    nom: o.nom, praticiens: o.praticiens, metier: 'Pédicure-podologue', ville: o.ville, quartier: o.quartier, domaine: o.domaine,
    modele,
    theme: { couleur: o.couleur ?? modele.couleurConseillee ?? '', gamme: o.gamme ?? (o.couleur ? null : modele.gammes?.[0] ?? null) },
    logo: validerChoixLogo(o.marque ? { marque: o.marque, disposition: 'horizontale' } : undefined),
    logoPerso: o.logoPerso,
    specialite: o.specialite ?? 'generale',
    style: o.style,
  };
}
