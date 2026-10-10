// Contrôle du pack complémentaire « Pédicure-podologue » (articles et fiches conseils), lancé par `npm run controle:packs -w
// @plateforme/contenus` et affiché dans les Arrivages (avertissements et erreurs de chaque carte).
// 1. Textes : lexique bloquant du core (verifierTexte, niveau strict : superlatifs, promesses, « garanti »…) et formulations à
//    préférer (« pédicure-podologue » en entier, « spécialiste »…), mots interdits propres aux contenus patients.
// 2. Sujets à faible niveau de preuve (posturologie, réflexologie) : jamais (règle de Paul du 2026-10-05).
// 3. Toute phrase réglementaire (norme, remboursement, prise en charge, prescription, Code du travail, employeur…) porte une
//    source ; sources connues ; source non relue = avertissement.
// 4. Renvois : soins du catalogue connus (SOINS_LIES), fiches conseils déclarées dans l'éditeur (SUJETS_FICHES_CONSEILS), pictos
//    existants, fiches liées aux articles ; thème d'article dans THEMES_FLUX ; résumés ≤ 160 caractères ; fiches « un écran ».

import { pictoExiste, SOINS_LIES, SUJETS_FICHES_CONSEILS, THEMES_FLUX, verifierTexte } from '@plateforme/core';
import { ARTICLES_PODOLOGUE } from './articles';
import { CONSEILS_PODOLOGUE } from './conseils';
import { sourcePodologue } from './sources';

/** Mots interdits propres aux contenus patients : [motif, raison] */
export const INTERDITS_PODO: readonly [RegExp, string][] = [
  [/gu[ée]ri(r|t|s|e|son)?\b/i, 'promesse de guérison'],
  [/diagnostiqu\w*|\bdiagnostic\b/i, 'pas de diagnostic dans un contenu patient (le renvoyer à la consultation)'],
  [/posturo\w*|r[ée]flexo\w*/i, 'sujet à faible niveau de preuve (validation déontologique à venir)'],
  [/!/, 'point d’exclamation'],
  [/sp[ée]cialiste|sp[ée]cialis[ée]e?s? (en|dans|du|de la)/i, 'titre de spécialiste non reconnu'],
  [/(pr[ée]vien\w*|[ée]vit\w*|supprim\w*|corrig\w*) (les |la |le |l’|vos |votre )?(douleurs?|blessures?|chutes?|r[ée]cidives?|d[ée]formations?|hallux)/i, 'promesse de résultat'],
  [/rapide(ment)? (soulag|r[ée]sultat)|en quelques (jours|s[ée]ances)/i, 'promesse de délai'],
  [/t[ée]moignage|nos patients|un patient de/i, 'témoignage, secret'],
  [/rembours[ée]e?s? par (les |votre )?(mutuelles?|compl[ée]mentaires?)/i, 'remboursement par les complémentaires : « selon le contrat »'],
];

/** Phrases qui portent une affirmation réglementaire : une source est exigée */
const REGLEMENTAIRE = /rembours|assurance maladie|prise en charge|pris en charge|prescri|ordonnance|\bnorme\b|EN ISO|\bS[1-7]\b|employeur|m[ée]decin du travail|certifi|forfait|grade/i;

type Texte = { ou: string; texte: string; sources: readonly string[] };

const DESCRIPTION_MAX = 160;
/** Fiche « un écran » : nombre de lignes au plus (gestes + à éviter + quand consulter) */
const LIGNES_FICHE_MAX = 14;

export function controlerPackPodologue(pack: { statut: string }): { erreurs: string[]; avertissements: string[] } {
  const E: string[] = [], A: string[] = [];
  const textes: Texte[] = [];
  const soinsConnus = new Set(Object.keys(SOINS_LIES));
  const sujetsEditeur = new Set<string>(SUJETS_FICHES_CONSEILS.map((s) => s.id));

  // Fiches conseils
  const slugs = new Set<string>();
  for (const c of CONSEILS_PODOLOGUE) {
    const ou = `conseil ${c.slug}`;
    if (slugs.has(c.slug)) E.push(`${ou} : slug en double.`);
    slugs.add(c.slug);
    if (!sujetsEditeur.has(c.slug)) E.push(`${ou} : absent de SUJETS_FICHES_CONSEILS (le praticien ne peut pas la cocher).`);
    const libelle = SUJETS_FICHES_CONSEILS.find((s) => s.id === c.slug)?.titre;
    if (libelle && libelle !== c.titre) A.push(`${ou} : titre différent du libellé de l’éditeur (« ${libelle} »).`);
    if (c.resume.length > DESCRIPTION_MAX) E.push(`${ou} : résumé > ${DESCRIPTION_MAX} caractères (${c.resume.length}).`);
    if (!c.points.length || !c.quandConsulter.length) E.push(`${ou} : gestes utiles et « quand consulter » obligatoires.`);
    const lignes = c.points.length + (c.aEviter?.length ?? 0) + c.quandConsulter.length;
    if (lignes > LIGNES_FICHE_MAX) E.push(`${ou} : ${lignes} lignes (> ${LIGNES_FICHE_MAX}) : la fiche doit tenir sur un écran.`);
    if (!c.soins.length) E.push(`${ou} : aucun soin lié.`);
    for (const s of c.soins) if (!soinsConnus.has(s)) E.push(`${ou} : soin inconnu ${s}.`);
    if (c.picto && !pictoExiste(c.picto)) E.push(`${ou} : picto inconnu ${c.picto}.`);
    textes.push({ ou: `${ou} : titre et résumé`, texte: `${c.titre}\n${c.resume}`, sources: c.sources });
    [...c.points, ...(c.aEviter ?? []), ...c.quandConsulter].forEach((t, i) => textes.push({ ou: `${ou} · ligne ${i + 1}`, texte: t, sources: c.sources }));
  }
  for (const s of SUJETS_FICHES_CONSEILS) if (!slugs.has(s.id)) A.push(`conseil ${s.id} : proposé dans l’éditeur mais pas encore rédigé (rien n’est affiché s’il est coché).`);

  // Articles
  for (const a of ARTICLES_PODOLOGUE) {
    const ou = `article ${a.slug}`;
    if (a.resume.length > DESCRIPTION_MAX) E.push(`${ou} : résumé > ${DESCRIPTION_MAX} caractères (${a.resume.length}).`);
    if (!(THEMES_FLUX as readonly string[]).includes(a.theme)) E.push(`${ou} : thème inconnu ${a.theme}.`);
    if (!/^## /m.test(a.corps)) E.push(`${ou} : aucun intertitre (##).`);
    if (/^# /m.test(a.corps)) E.push(`${ou} : titre de niveau 1 dans le corps (le H1 est le titre de l’article).`);
    for (const s of a.soins) if (!soinsConnus.has(s)) E.push(`${ou} : soin inconnu ${s}.`);
    for (const f of a.conseils) if (!slugs.has(f)) E.push(`${ou} : fiche conseil inconnue ${f}.`);
    for (const p of a.illustrations) if (p.startsWith('picto:') && !pictoExiste(p.slice(6))) E.push(`${ou} : picto inconnu ${p}.`);
    textes.push({ ou: `${ou} : titre et chapeau`, texte: `${a.titre}\n${a.resume}`, sources: a.sources });
    // Une entrée par paragraphe ou ligne de liste : messages précis
    a.corps.split(/\n+/).filter((l) => l.trim()).forEach((l, i) => textes.push({ ou: `${ou} · paragraphe ${i + 1}`, texte: l, sources: a.sources }));
  }

  // Textes : lexique, interdits, sources
  for (const { ou, texte, sources } of textes) {
    for (const al of verifierTexte(texte, 'strict')) E.push(`${ou} : « ${al.extrait} » — ${al.raison}${al.suggestion ? ` (préférer « ${al.suggestion} »)` : ''}`);
    for (const [re, raison] of INTERDITS_PODO) { const m = texte.match(re); if (m) E.push(`${ou} : « ${m[0]} » — ${raison}`); }
    if (REGLEMENTAIRE.test(texte) && !sources.length) E.push(`${ou} : affirmation réglementaire sans source.`);
    for (const s of sources) {
      const src = sourcePodologue(s);
      if (!src) E.push(`${ou} : source inconnue ${s}.`);
      else if (!src.verifie) A.push(`source « ${s} » (${src.organisme}) à revérifier : page officielle non relue directement.`);
    }
  }

  if (!['complement'].includes(pack.statut)) E.push('Le pack « Pédicure-podologue » est un pack complémentaire (statut « complement ») : il ne ferme jamais la profession.');
  return { erreurs: [...new Set(E)], avertissements: [...new Set(A)] };
}
