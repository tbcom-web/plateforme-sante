// Navigation du site, calculée une fois par le core (themes.ts, construireNavigation) à partir des priorités du praticien
// et des soins cochés : la même pour tous les gabarits (classique, tableau, village, revue), donc des liens identiques
// d'un modèle à l'autre. Thèmes différés (posture) : seulement si activés par le drapeau THEMES_ACTIVES au build.
import { construireNavigation, themeParId, type ThemeDuSite } from '@plateforme/core';
import { site } from './site';
import { noms, titreMetierAffiche, lieuExercice, suffixeVille } from './textes';

const env = (nom: string) => (import.meta.env[nom] as string | undefined) ?? process.env[nom];
export const themesActives = (env('THEMES_ACTIVES') ?? '').split(',').map((x) => x.trim()).filter(Boolean);

export const navigation = construireNavigation(site, site.soins, { actualites: site.articles.length > 0, themesActives });

/** Thèmes qui ont une page (principaux puis secondaires), avec leur rang */
export const themesDuSite: (ThemeDuSite & { principal: boolean })[] = [
  ...navigation.principaux.map((t) => ({ ...t, principal: true })),
  ...navigation.secondaires.map((t) => ({ ...t, principal: false })),
];

/**
 * Accueil (tous les gabarits) : les cartes des sujets principaux (SujetsAccueil) portent déjà leurs soins ; la section
 * Soins qui suit ne montre que les autres (peu d'information d'un coup). Tous portés : un simple lien « Voir tous les
 * soins ». Sans carte de sujet : tous les soins. Aucun intertitre ne change (SEO identique d'un modèle à l'autre).
 */
const soinsDesCartes = new Set(navigation.principaux.flatMap((t) => t.soins));
export const soinsAccueil = site.soins.filter((s) => !soinsDesCartes.has(s.slug));
/** Des soins de l'accueil sont laissés aux cartes des sujets : lien vers la page de tous les soins */
export const soinsAccueilAllege = soinsAccueil.length < site.soins.length;

/** Lien du menu actif sur la page courante (préfixe d'adresse) */
export const lienActif = (href: string, courant: string) => (href === '/' ? courant === '/' : courant === href || courant.startsWith(`${href}/`));

/** Adresse normalisée : sans « .html », sans barre finale (« /soins/bilan.html » → « /soins/bilan ») */
const normaliser = (chemin: string) => (chemin.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/+$/, '') || '/');
/** Rubrique de chaque page du site hors menu (pages du cabinet, accès) */
const RUBRIQUES: [RegExp, string][] = [[/^\/(le-cabinet|a-propos)(\/|$)/, '/le-cabinet'], [/^\/(acces|rdv)(\/|$)/, '/acces']];

/**
 * Entrée de menu à marquer comme active (aria-current="page") pour la page courante, parmi `liens` (menu ordinateur, menu
 * téléphone ou pied de page) : page de thème → son thème (ou « Soins » si le thème n'est pas dans ce menu) ; fiche d'un soin
 * → le premier thème du menu qui porte ce soin, sinon « Soins » ; pages du cabinet et d'accès → leur entrée ; accueil →
 * « Accueil » s'il est dans la liste. Calcul statique (aucun JavaScript).
 */
export function entreeActive(liens: readonly { href: string }[], courant: string): string | null {
  const page = normaliser(courant);
  const dans = (href: string) => liens.some((l) => l.href === href);
  if (page === '/') return dans('/') ? '/' : null;
  const exacte = liens.find((l) => l.href !== '/' && lienActif(l.href, page));
  if (exacte && !page.startsWith('/soins/')) return exacte.href;
  if (page.startsWith('/themes/')) return dans('/soins') ? '/soins' : null;
  if (page.startsWith('/soins/')) {
    const slug = page.slice('/soins/'.length);
    const theme = navigation.principaux.find((t) => t.soins.includes(slug) && dans(t.href));
    return theme ? theme.href : dans('/soins') ? '/soins' : null;
  }
  const rubrique = RUBRIQUES.find(([re]) => re.test(page));
  return rubrique && dans(rubrique[1]) ? rubrique[1] : exacte?.href ?? null;
}

/** Soin du site par slug (pour les listes des pages de thème et des groupes) */
export const soinDuSite = (slug: string) => site.soins.find((s) => s.slug === slug);

/** Picto « picto:<id> » d'un thème */
export const pictoTheme = (id: string) => `picto:${themeParId(id)?.picto ?? 'pied-dessus'}`;

/**
 * Textes d'une page de thème, partagés par la page HTML, sa version Markdown et llms.txt (mêmes données : SEO identique
 * d'un modèle à l'autre). Soins : seulement ceux cochés ; conseils : articles publiés du même thème d'articles.
 */
export function pageTheme(t: ThemeDuSite) {
  const soins = t.soins.map(soinDuSite).filter((s): s is NonNullable<typeof s> => Boolean(s));
  return {
    path: t.href,
    // Sans ville : pas de « à » orphelin (replis de lib/textes.ts)
    titre: `${t.theme.libelle}${suffixeVille}`,
    title: `${t.theme.libelle}${suffixeVille} – ${noms}`,
    description: `${t.theme.description} ${noms}, ${titreMetierAffiche.toLowerCase()}${lieuExercice ? ` ${lieuExercice}` : ''}.`,
    intro: t.theme.intro,
    soins,
    articles: [...site.articles].filter((a) => t.theme.themesFlux.includes(a.theme)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
  };
}
