// AUDIT DE PROSPECT — fonctions pures (demande de Paul du 2026-10-10). Le back-office lit la page d'accueil du site existant
// d'un praticien pour préparer, avant l'audit, un site webpodologue non publié à son nom :
//  - identiteDepuisPage : nom du cabinet, téléphone, adresse, ville, lien de prise de rendez-vous (JSON-LD puis texte) ;
//  - prioritesDepuisTexte : sujets du cabinet (sport, enfant, diabète…) d'après le dictionnaire métier, d'où l'univers
//    (universDesPriorites) et les soins ; « posture » est exclu (validation déontologique, SUJETS_EXCLUS) ;
//  - praticienReconnu : le praticien de l'annuaire RPPS (même commune) dont le nom figure sur la page ;
//  - draftProspect : brouillon du site préparé. Le praticien change ensuite textes, couleurs et style à sa guise.
import { draftVide, type SiteDraft } from './draft';
import { correspondances, normaliserTexte, SUJETS_EXCLUS } from './dictionnaire-metier';
import { PRINCIPAUX_MAX, SECONDAIRES_MAX, themeParId, type Priorites } from './themes';

export type IdentiteProspect = {
  titre: string;
  nomCabinet: string;
  telephone: string;
  adresse: string;
  codePostal: string;
  ville: string;
  rdvUrl: string;
  /** Texte visible de la page (sans balises), pour la recherche des sujets et du nom du praticien */
  texte: string;
};

const decoder = (s: string) => s
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, '’').replace(/&quot;/g, '"')
  .replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&agrave;/g, 'à').replace(/&ccedil;/g, 'ç').replace(/&ecirc;/g, 'ê')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

/** Texte visible d'une page HTML (scripts, styles et commentaires retirés) */
export function texteDeHtml(html: string): string {
  return decoder(html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<!--[\s\S]*?-->/gi, ' ')
    .replace(/<\/(p|div|li|h\d|br|section|footer|header|tr)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

function noeudsJsonld(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visiter = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(visiter);
    if (n && typeof n === 'object') { const o = n as Record<string, unknown>; if (o['@type']) out.push(o); if (o['@graph']) visiter(o['@graph']); }
  };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { visiter(JSON.parse(m[1])); } catch { /* JSON-LD invalide : ignoré */ } }
  return out;
}

const RE_TEL = /(?:\+33\s?|\b0)[1-9](?:[\s.\-]?\d{2}){4}\b/;
const RE_ADRESSE = /\b(\d{1,4}(?:\s?(?:bis|ter))?,?\s+(?:rue|avenue|av\.|boulevard|bd|place|chemin|allée|allee|route|impasse|quai|cours|square)\b[^\n,]{2,60})[,\s]+((?:0[1-9]|[1-8]\d|9[0-5])\d{3})\s+([A-ZÉÈÀÂÎ][\p{L}'’\- ]{1,40})/u;
const RE_CP_VILLE = /\b((?:0[1-9]|[1-8]\d|9[0-5])\d{3})\s+([A-ZÉÈÀÂÎ][\p{L}'’\-]+(?:[ \-][\p{L}'’]+){0,4})/u;
const RE_RDV = /href=["']([^"']*(?:doctolib|maiia|keldoc|rdvmedicaux|clicrdv|mondocteur)[^"']*)["']/i;

/** Format français d'affichage : « 04 67 82 78 09 » */
export const telephoneFr = (t: string) => {
  const c = t.replace(/[^\d+]/g, '').replace(/^\+33/, '0');
  return /^0\d{9}$/.test(c) ? c.replace(/(\d{2})(?=\d)/g, '$1 ').trim() : t.trim();
};

const premierTexte = (...v: unknown[]) => v.find((x): x is string => typeof x === 'string' && x.trim().length > 0)?.trim() ?? '';
const villePropre = (v: string) => v.trim().replace(/\s+(Tél|Tel|Téléphone|France|Cedex)\b.*$/i, '').replace(/\s{2,}.*/, '').slice(0, 60);

/** Ville du titre quand l'adresse est introuvable : un mot du titre présent aussi dans le nom de domaine (« podologue-nice.fr ») */
function villeDuTitre(titre: string, hote: string): string {
  const plat = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ'’\- ]/g, '');
  return titre.match(/\p{Lu}[\p{L}'’-]{2,}/gu)?.find((w) => !/podolog|p[ée]dicure|cabinet|centre|sport/i.test(w) && plat(hote).includes(plat(w))) ?? '';
}

export function identiteDepuisPage(html: string, hote = ''): IdentiteProspect {
  const texte = texteDeHtml(html);
  const titre = decoder((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim());
  const local = noeudsJsonld(html).find((n) => /Physician|Medical|Podiatr|LocalBusiness|HealthAndBeauty/i.test(([] as unknown[]).concat(n['@type']).join(' ')));
  const adr = (local?.address ?? (local?.location as Record<string, unknown> | undefined)?.address) as Record<string, unknown> | undefined;
  const a = texte.match(RE_ADRESSE);
  const cp = texte.match(RE_CP_VILLE);
  const tel = premierTexte(local?.telephone, html.match(/href=["']tel:([^"']+)["']/i)?.[1], texte.match(RE_TEL)?.[0]);
  return {
    titre,
    nomCabinet: premierTexte(local?.name, html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i)?.[1]).slice(0, 120),
    telephone: tel ? telephoneFr(decodeURIComponent(tel)) : '',
    adresse: premierTexte(adr?.streetAddress, a?.[1]).slice(0, 120),
    codePostal: premierTexte(adr?.postalCode, a?.[2], cp?.[1]),
    ville: villePropre(premierTexte(adr?.addressLocality, a?.[3], cp?.[2], villeDuTitre(titre, hote))),
    rdvUrl: html.match(RE_RDV)?.[1] ?? '',
    texte: texte.slice(0, 60000),
  };
}

/** Entrées génériques du dictionnaire (« podologue », « cabinet », « pédicure ») : présentes sur tous les sites, sans valeur de sujet */
const ENTREES_GENERIQUES: readonly string[] = ['pedicurie'];

/** Pages internes qui décrivent les soins (à lire en plus de l'accueil pour trouver les sujets), 3 au plus */
export function pagesDeSoins(html: string, base: string, max = 3): string[] {
  const hote = new URL(base).hostname.replace(/^www\./, '');
  const vus = new Set<string>();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u: URL; try { u = new URL(m[1], base); } catch { continue; }
    if (u.hostname.replace(/^www\./, '') !== hote || u.pathname === '/' || /\.(pdf|jpe?g|png|webp)$/i.test(u.pathname)) continue;
    if (/soin|prestation|sp[ée]cialit|semelle|sport|enfant|diab|ongle|podolog|consultation|bilan/i.test(`${u.pathname} ${m[2].replace(/<[^>]+>/g, ' ')}`)) vus.add(u.href);
    if (vus.size >= max) break;
  }
  return [...vus];
}

export type ScoreSujet = { sujet: string; score: number; termes: string[]; titre?: boolean };

/**
 * Sujets du cabinet d'après le dictionnaire métier : chaque entrée trouvée compte 1, 3 si elle figure dans le titre de la
 * page (à score égal, le sujet du titre passe devant). Retenus : thèmes actifs, score ≥ 2 pour un principal (un mot isolé ne suffit pas), ≥ 1 pour un secondaire.
 */
export function sujetsDepuisTexte(texte: string, titre = ''): ScoreSujet[] {
  const dansTitre = new Set(correspondances(titre).map((c) => c.entree.id));
  const scores = new Map<string, ScoreSujet>();
  for (const c of correspondances(texte)) {
    const s = c.entree.sujet;
    if (!s || ENTREES_GENERIQUES.includes(c.entree.id) || (SUJETS_EXCLUS as readonly string[]).includes(s)) continue;
    const x = scores.get(s) ?? { sujet: s, score: 0, termes: [] };
    x.score += dansTitre.has(c.entree.id) ? 3 : 1;
    if (dansTitre.has(c.entree.id)) x.titre = true;
    x.termes.push(c.terme);
    scores.set(s, x);
  }
  for (const c of correspondances(titre)) {
    const s = c.entree.sujet;
    if (s && !ENTREES_GENERIQUES.includes(c.entree.id) && !scores.has(s) && !(SUJETS_EXCLUS as readonly string[]).includes(s)) scores.set(s, { sujet: s, score: 3, termes: [c.terme], titre: true });
  }
  return [...scores.values()].filter((x) => themeParId(x.sujet)?.statut === 'actif').sort((a, b) => b.score - a.score || Number(Boolean(b.titre)) - Number(Boolean(a.titre)) || a.sujet.localeCompare(b.sujet));
}

export function prioritesDepuisSujets(sujets: readonly ScoreSujet[]): Priorites {
  const principaux = sujets.filter((s) => s.score >= 2).slice(0, PRINCIPAUX_MAX).map((s) => s.sujet);
  const secondaires = sujets.filter((s) => !principaux.includes(s.sujet)).slice(0, SECONDAIRES_MAX).map((s) => s.sujet);
  return { principaux, secondaires };
}

export type PraticienAnnuaire = { rpps: string; nom: string; prenom: string; adresse?: string | null; code_postal?: string | null; commune?: string | null };

/**
 * Praticien de l'annuaire (même commune) dont le nom de famille figure dans la page ; le prénom départage. Un seul
 * candidat certain ou rien : mieux vaut un nom à compléter qu'un mauvais nom.
 */
export function praticienReconnu(texte: string, candidats: readonly PraticienAnnuaire[]): PraticienAnnuaire | null {
  const t = ` ${normaliserTexte(texte)} `;
  const scores = candidats
    .filter((c) => c.nom && normaliserTexte(c.nom).length >= 3 && t.includes(` ${normaliserTexte(c.nom)} `))
    .map((c) => ({ c, s: 1 + (c.prenom && t.includes(` ${normaliserTexte(c.prenom)} ${normaliserTexte(c.nom)} `) ? 2 : c.prenom && t.includes(` ${normaliserTexte(c.prenom)} `) ? 1 : 0) }))
    .sort((a, b) => b.s - a.s);
  if (!scores.length || (scores[1] && scores[1].s === scores[0].s)) return null;
  return scores[0].c;
}

const capitaliser = (s: string) => s.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

/** Brouillon du site préparé (univers appliqué ensuite par le serveur : appliquerUniversAuSite, parcours) */
export function draftProspect(id: IdentiteProspect, priorites: Priorites, praticien: PraticienAnnuaire | null): SiteDraft {
  const d = draftVide();
  const ville = id.ville || (praticien?.commune ? capitaliser(praticien.commune) : '');
  const [lieu] = d.lieux;
  const [p] = d.praticiens;
  return {
    ...d,
    cabinet: { ...d.cabinet, nom: id.nomCabinet, ville, telephone: id.telephone },
    lieux: [{ ...lieu, adresse: id.adresse || (praticien?.adresse ? capitaliser(praticien.adresse) : ''), codePostal: id.codePostal || praticien?.code_postal || '', ville }],
    praticiens: [{ ...p, prenom: praticien ? capitaliser(praticien.prenom) : '', nom: praticien ? capitaliser(praticien.nom) : '', rpps: praticien?.rpps ?? '' }],
    rdv: id.rdvUrl ? { mode: 'les_deux', outil: /maiia/i.test(id.rdvUrl) ? 'Maiia' : /doctolib/i.test(id.rdvUrl) ? 'Doctolib' : 'Autre', url: id.rdvUrl } : d.rdv,
    priorites,
  };
}
