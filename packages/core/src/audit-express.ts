// AUDIT EXPRESS — test immédiat de la page /audit-gratuit (campagne « Vos patients demandent à ChatGPT un podologue. Votre
// cabinet en fait-il partie ? », demande de Paul du 2026-10-11). Fonction pure : à partir du code reçu de la page d'accueil
// (sans exécuter JavaScript, comme la plupart des robots d'IA), de ses en-têtes et du robots.txt, dit ce qu'une IA peut lire
// du cabinet (score sur 7, mêmes critères que le rapport complet : scripts/audit-site/noter.mjs) et relève les premiers
// constats. Uniquement des faits lus sur le site : aucun chiffre estimé.
import { identiteDepuisPage, texteDeHtml } from './audit-prospect';

export type CritereExpress = { libelle: string; ok: boolean };
export type ConstatExpress = { titre: string; ok: boolean; detail: string };
export type ResultatExpress = {
  domaine: string;
  ville: string;
  scoreIA: number;
  totalIA: number;
  lisibleIA: CritereExpress[];
  constats: ConstatExpress[];
  /** Nombre de constats à améliorer (hors IA) */
  aAmeliorer: number;
};

const RE_PROFESSION = /p[ée]dicure|podolog/i;
const RE_TEL = /(?:\+33\s?|\b0)[1-9](?:[\s.\-]?\d{2}){4}\b/;
const RE_CP = /\b(?:0[1-9]|[1-8]\d|9[0-5]|2[AB])\d{3}\b\s+[A-ZÉÈÀÂÎ]/;
const RE_HORAIRES = /(lundi|mardi|mercredi|jeudi|vendredi|samedi)[\s\S]{0,60}?\d{1,2}\s?(?:h|:)\s?\d{0,2}/i;
const RE_RDV = /doctolib|maiia|keldoc|rdvmedicaux|clicrdv|mondocteur/i;
const TYPES_LOCAUX = /Physician|MedicalBusiness|MedicalClinic|MedicalOrganization|Podiatr|LocalBusiness|HealthAndBeautyBusiness/i;
/** Robots qui permettent d'être cité par les assistants (pas ceux de l'entraînement, dont le refus est un choix légitime) */
const ROBOTS_CITATION = ['oai-searchbot', 'chatgpt-user', 'perplexitybot', 'claude-searchbot', 'googlebot', 'bingbot'];

function fichesStructurees(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visiter = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(visiter);
    if (n && typeof n === 'object') { const o = n as Record<string, unknown>; if (o['@type']) out.push(o); if (o['@graph']) visiter(o['@graph']); }
  };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { visiter(JSON.parse(m[1])); } catch { /* ignoré */ } }
  return out;
}

/** Robots d'IA « citation » bloqués par robots.txt (règle « Disallow: / » du groupe le plus précis) */
export function robotsBloques(robotsTxt: string): string[] {
  const groupes: { agents: string[]; regles: string[] }[] = [];
  let g: { agents: string[]; regles: string[] } | null = null;
  for (const brute of robotsTxt.split(/\r?\n/)) {
    const ligne = brute.replace(/#.*/, '').trim();
    const m = ligne.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const cle = m[1].toLowerCase(), val = m[2].trim();
    if (cle === 'user-agent') { if (!g || g.regles.length) { g = { agents: [], regles: [] }; groupes.push(g); } g.agents.push(val.toLowerCase()); }
    else if (g && (cle === 'disallow' || cle === 'allow')) g.regles.push(`${cle}:${val}`);
  }
  return ROBOTS_CITATION.filter((ua) => {
    const gr = groupes.find((x) => x.agents.some((a) => a !== '*' && ua.includes(a))) ?? groupes.find((x) => x.agents.includes('*'));
    return Boolean(gr && gr.regles.includes('disallow:/') && !gr.regles.includes('allow:/'));
  });
}

const NOMS_ROBOTS: Record<string, string> = {
  'oai-searchbot': 'ChatGPT', 'chatgpt-user': 'ChatGPT', perplexitybot: 'Perplexity', 'claude-searchbot': 'Claude', googlebot: 'Google', bingbot: 'Bing et Copilot',
};

export function auditExpress(e: { html: string; url: string; https: boolean; entetes: Record<string, string>; robotsTxt?: string | null }): ResultatExpress {
  const hote = new URL(e.url).hostname;
  const id = identiteDepuisPage(e.html, hote);
  const texte = texteDeHtml(e.html);
  const mots = texte.split(/\s+/).filter((m) => /\p{L}{2,}/u.test(m)).length;
  const fiche = fichesStructurees(e.html).find((n) => TYPES_LOCAUX.test(([] as unknown[]).concat(n['@type']).join(' ')));

  const lisibleIA: CritereExpress[] = [
    { libelle: 'Votre profession', ok: Boolean(fiche) || RE_PROFESSION.test(texte) },
    { libelle: 'L’adresse du cabinet', ok: Boolean(fiche?.address) || RE_CP.test(texte) },
    { libelle: 'Votre téléphone', ok: Boolean(fiche?.telephone) || RE_TEL.test(texte) },
    { libelle: 'Vos horaires', ok: Boolean(fiche?.openingHoursSpecification || fiche?.openingHours) || RE_HORAIRES.test(texte) },
    { libelle: 'Les soins que vous proposez', ok: mots >= 250 },
    { libelle: 'Comment prendre rendez-vous', ok: RE_RDV.test(e.html) },
    { libelle: 'Une fiche d’identité structurée', ok: Boolean(fiche) },
  ];

  const constats: ConstatExpress[] = [];
  const bloques = [...new Set(robotsBloques(e.robotsTxt ?? '').map((r) => NOMS_ROBOTS[r]))];
  constats.push(bloques.length
    ? { titre: 'Accès des IA', ok: false, detail: `Votre site interdit l’accès à ${bloques.join(', ')} : ils ne peuvent pas le citer.` }
    : { titre: 'Accès des IA', ok: true, detail: 'Les assistants IA et les moteurs peuvent lire votre site.' });
  constats.push(e.https
    ? { titre: 'Connexion sécurisée', ok: true, detail: 'Votre site est servi en HTTPS.' }
    : { titre: 'Connexion sécurisée', ok: false, detail: 'Le navigateur affiche « Non sécurisé » à côté de votre adresse.' });
  const viewport = /<meta[^>]+name=["']viewport["'][^>]+width\s*=\s*device-width/i.test(e.html);
  constats.push(viewport
    ? { titre: 'Affichage sur téléphone', ok: true, detail: 'La page est prévue pour les écrans de téléphone.' }
    : { titre: 'Affichage sur téléphone', ok: false, detail: 'La page n’est pas prévue pour les téléphones : vos patients doivent zoomer.' });
  const titre = id.titre;
  const villeTitre = id.ville && titre.toLowerCase().includes(id.ville.toLowerCase().split(/[\s-]/)[0]);
  constats.push(RE_PROFESSION.test(titre) && villeTitre
    ? { titre: 'Titre pour Google', ok: true, detail: 'Votre profession et votre ville figurent dans le titre de la page.' }
    : { titre: 'Titre pour Google', ok: false, detail: 'Le titre de la page ne contient pas « podologue + ville », la recherche que font vos patients.' });
  const mentions = /mentions?[\s-]*l[ée]gales/i.test(texte) || /mentions-?legales/i.test(e.html);
  constats.push(mentions
    ? { titre: 'Mentions légales', ok: true, detail: 'Un lien vers les mentions légales est présent.' }
    : { titre: 'Mentions légales', ok: false, detail: 'Aucun lien vers des mentions légales, pourtant obligatoires.' });
  const php = (e.entetes['x-powered-by'] ?? '').match(/PHP\/(\d+)\.(\d+)/i);
  if (php && (Number(php[1]) < 8 || (Number(php[1]) === 8 && Number(php[2]) === 0))) {
    constats.push({ titre: 'Sécurité du serveur', ok: false, detail: `Votre site tourne sur PHP ${php[1]}.${php[2]}, qui ne reçoit plus de correctifs de sécurité.` });
  }

  return {
    domaine: hote.replace(/^www\./, ''),
    ville: id.ville,
    scoreIA: lisibleIA.filter((c) => c.ok).length,
    totalIA: lisibleIA.length,
    lisibleIA,
    constats,
    aAmeliorer: constats.filter((c) => !c.ok).length,
  };
}
