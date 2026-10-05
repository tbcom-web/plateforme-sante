// Garde-fous des contenus : un contenu qui casse une règle n'est PAS généré (liste claire des ✗).
//
// Repris et adaptés de (provenance, lecture seule) :
// - ÉcranZen studio/html/reels/garde-fous.js (2026-09-30) : règle de lecture (≤ 7 mots par carton de Reel, ≤ 12 mots à
//   l'écran), mention M1–M5 en dernier et jamais en capitales, aucun CTA ni mot commercial, pas d'avant/après, profils
//   éthiques par sujet (POD-SUJ-033, lot posturologie 040–042) ;
// - ÉcranZen studio/charte/lignes-rouges.md (L1–L10) et grammaire.md §6 (image fixe : 12 mots de titre + 12 mots de
//   corps au plus) ; referentiels/ethique/podologie.md (C1–C9, règles par canal Instagram) ;
// - packages/core/src/lexique.ts (INTERDITS, PREFERER) ;
// - docs/referentiels/pieges-illustration.md (lecture profane : « ongle droit », « largeur d'un index »…).
// Les contrôles de rendu (taille du texte, débordement, contraste AA) sont dans rendu-controle.ts : ils tournent dans le
// navigateur, au rendu, avec le même code pour l'aperçu et l'export.

import { INTERDITS, BIBLIOTHEQUE, DESSINS_PODOLOGIE, EQUIPEMENTS_DESSINES, VISUELS_SOINS } from '@plateforme/core';
import { MENTIONS, mention } from './mentions';
import type { Controle, Diapositive, Publication, PublicationPersonnalisee, Sujet, VisuelRef } from './types';
import { ORGANISMES } from './types';

/** Règles chiffrées (sources entre parenthèses) */
export const REGLES = {
  /** Image fixe : 12 mots de titre + 12 mots de corps au plus (grammaire ÉcranZen §6) */
  titreMotsMax: 12,
  corpsMotsMax: 12,
  /** Carrousel : 5 à 8 diapositives (demande de Paul) */
  diapositivesMin: 5,
  diapositivesMax: 8,
  /** Légende Instagram : 2200 caractères (limite Instagram) ; hashtags 3 à 6 */
  legendeMax: 2200,
  hashtagsMin: 3,
  hashtagsMax: 6,
  /** Fiche Google : 1500 caractères (limite Google Business Profile) */
  googleMax: 1500,
  /** Texte alternatif : renseigné, ≤ 250 caractères (lecteurs d'écran ; avertissement au-delà de 125) */
  altMin: 20,
  altMax: 250,
  /** Source relue depuis moins de 12 mois (curation ÉcranZen) */
  sourceMoisMax: 12,
  /** Reel : ≤ 7 mots par carton, ≥ 2 s + 0,5 s par mot, mention ≥ 6 s (lignes rouges §6) */
  reelTitreMotsMax: 7,
} as const;

/** Domaines des sources de 1er rang admises */
export const DOMAINES_SOURCES: Record<(typeof ORGANISMES)[number], RegExp> = {
  Ameli: /^https:\/\/www\.ameli\.fr\//,
  HAS: /^https:\/\/(www\.)?has-sante\.fr\//,
  'Ordre des pédicures-podologues': /^https:\/\/www\.onpp\.fr\//,
  Légifrance: /^https:\/\/www\.legifrance\.gouv\.fr\//,
  'Société savante': /^https:\/\/(www\.)?(sofop\.org|sfmes-sfts\.fr|afpp\.fr)\//,
  NHS: /^https:\/\/(www\.)?[a-z.-]*nhs\.uk\//,
  'Santé publique France': /^https:\/\/(www\.)?(santepubliquefrance\.fr|mpedia\.fr|mangerbouger\.fr)\//,
};

/** Compte des mots comme cartons.js d'ÉcranZen : découpe aux espaces ; « ? », « : », « — » isolés = 0 */
export const compterMots = (s: string | undefined) => String(s ?? '').split(/[\s  ]+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length;

const norm = (s: string) => s.normalize('NFC').toLocaleLowerCase('fr-FR').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

/** Ton commercial (ÉcranZen garde-fous.js COMMERCIAL, élargi au canal Instagram) */
export const COMMERCIAL = /(^|[^\p{L}])(rdv|rendez-vous|prenez|réservez|reservez|appelez|contactez|cliquez|promo|offre|prix|tarifs?|gratuit\w*|rembours\w*|profitez|nouveau|€|doctolib)(?![\p{L}])/iu;
/** Promesse, avant/après, guérison, peur (C2, C3, C6 ; lignes rouges §2) */
export const PROMESSES: [RegExp, string][] = [
  [/(^|[^\p{L}])avant\s*\/\s*après|avant et après/iu, 'avant/après (C2, lignes rouges §2)'],
  [/(^|[^\p{L}])guéri(r|t|s|e|son)?(?![\p{L}])/iu, 'promesse de guérison (C3)'],
  [/(^|[^\p{L}])(évite[rz]?|évitent)(?![\p{L}])/iu, '« éviter » promet un résultat : écrire « limiter le risque » (C3)'],
  [/(^|[^\p{L}])(définitivement|radical\w*|efficace à coup sûr)(?![\p{L}])/iu, 'promesse de résultat (C3)'],
  [/!/u, 'point d\'exclamation d\'alerte (C6)'],
  [/(^|[^\p{L}])(amputation|gangrène|infection grave)(?![\p{L}])/iu, 'ton anxiogène (C5, C6)'],
  [/(^|[^\p{L}])(nos soins|au cabinet|notre cabinet|chez nous)(?![\p{L}])/iu, 'mise en avant du cabinet dans un contenu santé (C9)'],
  [/(^|[^\p{L}])(posturologue|spécialiste)(?![\p{L}])/iu, 'titre non reconnu (C9, principe 9)'],
  [/(^|[^\p{L}])(témoignage|nos patients|une patiente|un patient)(?![\p{L}])/iu, 'cas ou témoignage patient (C2, secret)'],
  [/l'ongle droit/iu, '« ongle droit » se lit « ongle du pied droit » : « coupez droit » (pièges, ongle3d)'],
  [/un index d'espace/iu, '« la largeur d\'un index » (pièges, 010)'],
];
/** Hashtags promotionnels interdits (règles par canal : Instagram) */
const HASHTAG_INTERDIT = /(promo|offre|rdv|rendezvous|meilleur|top|best|posturologue|cabinet|gratuit|lyon|paris|marseille)/i;

const SOINS_CONNUS = new Set(Object.keys(VISUELS_SOINS));

function textesSujet(s: Sujet): [string, string][] {
  return [
    ['titre', s.titre],
    ['couverture.surtitre', s.couverture.surtitre],
    ['couverture.titre', s.couverture.titre],
    ['message clé', s.messageCle],
    ...s.points.flatMap((p, i): [string, string][] => [[`point ${i + 1} titre`, p.titre], [`point ${i + 1} texte`, p.texte ?? '']]),
    ...s.pratique.map((p, i): [string, string] => [`pratique ${i + 1}`, p]),
    // Les paragraphes « Source(s) : … » citent le titre exact des pages (« Éviter les ampoules… ») : titres entre guillemets retirés du contrôle
    ...s.legende.map((p, i): [string, string] => [`légende §${i + 1}`, /^Sources? :/.test(p) ? p.replace(/«[^»]*»/g, '') : p]),
    ['fiche Google', s.google],
  ];
}

/** Contrôle d'un texte : lexique du core (bloquant), ton commercial, promesses, mots interdits du sujet */
export function controlerTexte(ou: string, texte: string, interdits: string[] = []): Controle {
  const E: string[] = [], A: string[] = [];
  if (!texte) return { erreurs: E, avertissements: A };
  const t = norm(texte);
  for (const { motif, raison } of INTERDITS) {
    motif.lastIndex = 0;
    const x = texte.match(new RegExp(motif.source, motif.flags.replace('g', '')));
    if (x) E.push(`${ou} : « ${x[0]} » — ${raison} (lexique)`);
  }
  const c = t.match(COMMERCIAL);
  if (c) E.push(`${ou} : ton commercial « ${c[2]} » interdit (lignes rouges §5, C9)`);
  for (const [re, pourquoi] of PROMESSES) if (re.test(t)) E.push(`${ou} : ${pourquoi}`);
  for (const mot of interdits) if (new RegExp(`(^|[^\\p{L}])${mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu').test(t)) E.push(`${ou} : « ${mot} » interdit pour ce sujet (profil éthique)`);
  if (/(^|[^\p{L}-])podologue(?!-)/iu.test(texte) && !/pédicure-podologue/i.test(texte)) A.push(`${ou} : préférer le titre légal « pédicure-podologue » (lexique)`);
  return { erreurs: E, avertissements: A };
}

function controlerVisuel(ou: string, v: VisuelRef | undefined, E: string[]) {
  if (!v) return;
  if (v.type === 'dessin' && !(DESSINS_PODOLOGIE as readonly string[]).includes(v.nom)) E.push(`${ou} : dessin « ${v.nom} » inconnu`);
  if (v.type === 'equipement' && !(EQUIPEMENTS_DESSINES as readonly string[]).includes(v.id)) E.push(`${ou} : matériel « ${v.id} » sans dessin`);
  if (v.type === 'bibliotheque') {
    const e = BIBLIOTHEQUE.find((x) => x.id === v.id || x.slug === v.id);
    if (!e) E.push(`${ou} : élément de bibliothèque « ${v.id} » inconnu`);
    else {
      const d = e.declinaisons.find((x) => (!v.vue || x.vue === v.vue) && (!v.etat || x.etat === v.etat));
      if (!d) E.push(`${ou} : « ${v.id} » n'a pas de déclinaison ${JSON.stringify({ vue: v.vue, etat: v.etat })}`);
      const statut = d?.statut ?? e.statut;
      if (statut !== 'valide') E.push(`${ou} : « ${v.id} » (${d?.etat ?? ''}) est « ${statut} » : seuls les éléments validés par Paul sont publiés`);
    }
  }
}

const moisEntre = (a: string, b: string) => {
  const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};

/** Contrôle d'un sujet (contenu) : sources, affirmations, mention, textes, visuels, liens */
/**
 * Thèmes à faible niveau de preuve (« peu conformes », décision de Paul du 2026-10-05) : posturologie, biomécanique « posturale »,
 * réflexologie, semelles « proprioceptives ». Un sujet qui en parle doit être étiqueté niveauPreuve « faible » ; il est alors
 * BLOQUÉ à la génération tant qu'il n'est pas explicitement activé (après validation déontologique).
 */
export const THEMES_FAIBLE_PREUVE = /(posturolog|postural|réflexolog|reflexolog|proprioceptiv|reprogrammation posturale)/iu;

export type OptionsControle = { /** Active les sujets « faible niveau de preuve » (après validation déontologique écrite) */ autoriserFaiblePreuve?: boolean };

export function verifierSujet(s: Sujet, aujourdHui = new Date().toISOString().slice(0, 10), options: OptionsControle = {}): Controle {
  const E: string[] = [], A: string[] = [];
  const err = (m: string) => E.push(`${s.id} : ${m}`);
  // niveau de preuve
  const faible = s.niveauPreuve === 'faible';
  if (faible && !options.autoriserFaiblePreuve) err('sujet à faible niveau de preuve : bloqué (à activer explicitement après validation déontologique)');
  if (!faible && s.specialite === 'posture') err('spécialité « posture » : sujet à étiqueter niveauPreuve « faible » (décision de Paul, 2026-10-05)');
  if (!faible) for (const [ou, t] of textesSujet(s)) { const x = t.match(THEMES_FAIBLE_PREUVE); if (x) err(`${ou} : « ${x[0]} » = thème à faible niveau de preuve : étiqueter niveauPreuve « faible »`); }
  if (!/^[a-z0-9-]+$/.test(s.id)) err('identifiant : minuscules, chiffres et tirets');
  // sources de 1er rang (lignes rouges §1, C8)
  if (!s.sources.length) err('aucune source (lignes rouges §1)');
  for (const src of s.sources) {
    if (!(ORGANISMES as readonly string[]).includes(src.organisme)) err(`source ${src.id} : organisme « ${src.organisme} » non admis (1er rang : ${ORGANISMES.join(', ')})`);
    else if (!DOMAINES_SOURCES[src.organisme].test(src.url)) err(`source ${src.id} : URL ${src.url} hors du domaine de ${src.organisme}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(src.consulteLe)) err(`source ${src.id} : date de consultation manquante (AAAA-MM-JJ)`);
    else if (moisEntre(src.consulteLe, aujourdHui) >= REGLES.sourceMoisMax) err(`source ${src.id} : consultée le ${src.consulteLe}, à relire (plus de ${REGLES.sourceMoisMax} mois)`);
  }
  if (!s.affirmations.length) err('aucune affirmation sourcée');
  for (const a of s.affirmations) {
    if (!s.sources.some((x) => x.id === a.source)) err(`affirmation « ${a.texte} » : source « ${a.source} » absente`);
    if (!a.extrait || compterMots(a.extrait) > 30) err(`affirmation « ${a.texte} » : extrait relu manquant ou trop long (≤ 25 mots)`);
  }
  // mention (référentiel éthique)
  const diabete = textesSujet(s).some(([, t]) => /diab[eè]t/i.test(t));
  if (s.mention === 'M5') {
    if (!s.texteM5 || !/(parlez-en à votre médecin\.$|^consultez un médecin)/i.test(s.texteM5.trim())) err('M5 doit finir par « … parlez-en à votre médecin. » ou commencer par « Consultez un médecin »');
  } else if (!MENTIONS[s.mention]) err(`mention ${s.mention} inconnue`);
  else {
    const f = MENTIONS[s.mention].famille;
    if (diabete && f !== 'M2') err(`contenu diabète : mention de la famille M2 obligatoire (référentiel éthique), pas ${s.mention}`);
    if (!diabete && f === 'M2') A.push(`${s.id} : M2 hors contenu diabète (le médecin seulement si le sujet l'exige)`);
    if (f === 'M4c' && !/semelle/i.test(s.titre)) err('M4c seulement si le sujet est la semelle elle-même');
  }
  // textes
  for (const [ou, t] of textesSujet(s)) {
    const r = controlerTexte(`${s.id} — ${ou}`, t, s.interdits);
    E.push(...r.erreurs); A.push(...r.avertissements);
  }
  if (compterMots(s.couverture.titre) > REGLES.titreMotsMax) err(`couverture : ${compterMots(s.couverture.titre)} mots > ${REGLES.titreMotsMax} (grammaire §6)`);
  if (compterMots(s.messageCle) > REGLES.titreMotsMax) err(`message clé : ${compterMots(s.messageCle)} mots > ${REGLES.titreMotsMax}`);
  if (s.points.length < 2 || s.points.length > 4) err(`${s.points.length} points (2 à 4 pour un carrousel de 5 à 8 diapositives)`);
  s.points.forEach((p, i) => {
    if (compterMots(p.titre) > REGLES.titreMotsMax) err(`point ${i + 1} : titre de ${compterMots(p.titre)} mots > ${REGLES.titreMotsMax}`);
    if (compterMots(p.texte) > REGLES.corpsMotsMax) err(`point ${i + 1} : corps de ${compterMots(p.texte)} mots > ${REGLES.corpsMotsMax}`);
    controlerVisuel(`${s.id} point ${i + 1}`, p.visuel, E);
    if (!p.alt || p.alt.length < REGLES.altMin) err(`point ${i + 1} : texte alternatif manquant ou trop court (≥ ${REGLES.altMin} caractères)`);
  });
  controlerVisuel(`${s.id} couverture`, s.couverture.visuel, E);
  const motsPratique = s.pratique.reduce((n, p) => n + compterMots(p), 0);
  if (s.pratique.length < 2 || s.pratique.length > 3) err('« en pratique » : 2 ou 3 gestes');
  if (motsPratique > REGLES.corpsMotsMax) err(`« en pratique » : ${motsPratique} mots > ${REGLES.corpsMotsMax}`);
  // hashtags
  if (s.hashtags.length < REGLES.hashtagsMin || s.hashtags.length > REGLES.hashtagsMax) err(`${s.hashtags.length} hashtags (${REGLES.hashtagsMin} à ${REGLES.hashtagsMax})`);
  for (const h of s.hashtags) {
    if (!/^[\p{L}\p{N}_]+$/u.test(h)) err(`hashtag « ${h} » : lettres et chiffres seulement, sans #`);
    if (HASHTAG_INTERDIT.test(h)) err(`hashtag « ${h} » : promotionnel ou local (règles par canal Instagram)`);
  }
  // liens vers les fiches de soins
  if (!s.soins.length) err('aucun soin lié (lien vers la fiche du site)');
  for (const slug of s.soins) if (!SOINS_CONNUS.has(slug)) err(`soin « ${slug} » absent du catalogue (jeux.ts VISUELS_SOINS)`);
  if (!s.mois.length) err('aucun mois dans le calendrier');
  return { erreurs: E, avertissements: A };
}

/** Contrôle d'une publication composée (structure, lecture, légende, Google, textes alternatifs) */
export function verifierPublication(p: Publication | PublicationPersonnalisee): Controle {
  const E: string[] = [], A: string[] = [];
  const err = (m: string) => E.push(`${p.id} : ${m}`);
  const d = p.diapositives;
  if (p.format === 'carrousel') {
    if (d.length < REGLES.diapositivesMin || d.length > REGLES.diapositivesMax) err(`${d.length} diapositives (${REGLES.diapositivesMin} à ${REGLES.diapositivesMax})`);
    if (d[0]?.role !== 'couverture') err('la première diapositive est la couverture');
    if (d[d.length - 1]?.role !== 'signature') err('la dernière diapositive est la signature du cabinet (carton séparé)');
    if (d[d.length - 2]?.role !== 'mention') err('la mention d\'orientation est la dernière diapositive de contenu, seule (référentiel éthique)');
    if (!d.some((x) => x.role === 'pratique')) err('diapositive « en pratique » manquante');
  } else if (!d.some((x) => x.mention?.length)) err('mention d\'orientation absente de l\'image (référentiel éthique)');
  d.forEach((x, i) => {
    const ou = `diapositive ${i + 1} (${x.role})`;
    if (compterMots(x.titre) > REGLES.titreMotsMax) err(`${ou} : titre de ${compterMots(x.titre)} mots > ${REGLES.titreMotsMax}`);
    const corps = compterMots(x.texte) + (x.liste ?? []).reduce((n, l) => n + compterMots(l), 0);
    if (corps > REGLES.corpsMotsMax) err(`${ou} : corps de ${corps} mots > ${REGLES.corpsMotsMax}`);
    if (x.mention && x.mention.join(' ') === x.mention.join(' ').toUpperCase()) err(`${ou} : mention en capitales interdite`);
    if (x.role === 'mention' && (x.titre || x.texte || x.liste)) err(`${ou} : la mention est seule sur sa diapositive`);
    if (!x.alt || x.alt.length < REGLES.altMin) err(`${ou} : texte alternatif manquant`);
    if (x.alt.length > REGLES.altMax) err(`${ou} : texte alternatif de ${x.alt.length} caractères > ${REGLES.altMax}`);
    else if (x.alt.length > 125) A.push(`${p.id} ${ou} : texte alternatif de ${x.alt.length} caractères (lecteurs d'écran : ≤ 125 conseillé)`);
    for (const [k, t] of [['titre', x.titre], ['texte', x.texte], ...(x.liste ?? []).map((l) => ['liste', l])] as [string, string | undefined][]) {
      if (!t) continue;
      const r = controlerTexte(`${p.id} ${ou} ${k}`, t);
      E.push(...r.erreurs);
    }
  });
  const ext = p as PublicationPersonnalisee;
  if (ext.legendeComplete !== undefined) {
    const l = ext.legendeComplete;
    if (l.length > REGLES.legendeMax) err(`légende de ${l.length} caractères > ${REGLES.legendeMax}`);
    if (p.format !== 'google' && !/lien en bio/i.test(l)) err('légende : renvoi « lien en bio » vers le site manquant');
    if (/https?:\/\//.test(l) && p.format !== 'google') err('légende Instagram : pas d\'URL cliquable (« lien en bio »)');
    if (/doctolib|rendez-vous|\brdv\b/i.test(l)) err('légende : jamais de renvoi vers une page de rendez-vous (règles par canal Instagram)');
    if (!ext.alts.length || ext.alts.some((a) => !a)) err('texte alternatif manquant pour une image');
    if (/\/rdv|doctolib/.test(ext.lien)) err('lien : page d\'information seulement, jamais la page de rendez-vous');
  }
  if (p.format === 'google') {
    const t = (ext.texteGoogle ?? p.texteGoogle ?? '');
    if (!t) err('texte de la fiche Google manquant');
    if (t.length > REGLES.googleMax) err(`texte Google de ${t.length} caractères > ${REGLES.googleMax}`);
    if (/\b0\d([ .]?\d{2}){4}\b/.test(t)) err('texte Google : pas de téléphone dans un contenu santé (C9)');
  }
  for (const h of p.hashtags) if (HASHTAG_INTERDIT.test(h)) err(`hashtag « ${h} » promotionnel`);
  return { erreurs: E, avertissements: A };
}

/** Contrôle de l'identité (ce qui s'affiche sur la signature) : ni slogan, ni téléphone, ni promesse */
export function verifierIdentite(nom: string, praticiens: string[]): Controle {
  const E: string[] = [];
  for (const [ou, t] of [['nom du cabinet', nom], ...praticiens.map((p) => ['praticien', p])] as [string, string][]) {
    if (!t.trim()) E.push(`${ou} : vide`);
    const r = controlerTexte(ou, t);
    E.push(...r.erreurs.filter((e) => !/podologue/.test(e)));
  }
  return { erreurs: E, avertissements: [] };
}

/** Diapositive mention : lignes du référentiel */
export const lignesMention = (s: Pick<Sujet, 'mention' | 'texteM5'>) => mention(s.mention, s.texteM5).lignes;
export type { Diapositive };
