// Dictionnaire métier FR ↔ EN (demande de Paul, 2026-10-07) : un seul dictionnaire pour
// 1. traduire le sujet d'un élément de la bibliothèque en requête de recherche d'images (« orthonyxie » → « ingrown toenail
//    brace ») et en proposer des VARIANTES quand une source s'épuise (« Relancer (5 autres) ») ;
// 2. suggérer le classement d'un visuel (classement-visuels.ts) : synonymes FR et EN → sujet + hashtags.
// Module pur, déterministe, sans dépendance. JAMAIS le sujet « posture » (différé : sujets à faible preuve).
// Termes en minuscules, sans accents ; tirets, deux-points et apostrophes valent des espaces (normaliserTexte).

export type EntreeDictionnaire = {
  /** Identifiant stable (journal des suggestions, tests) */
  id: string;
  /** Termes français (soins du catalogue, titres de la bibliothèque, clés) */
  fr: readonly string[];
  /** Requête anglaise principale */
  en: string;
  /** Variantes de requête (plus précises ou plus larges), essayées quand une source s'épuise */
  variantes?: readonly string[];
  /** Synonymes anglais rencontrés dans les tags, titres et catégories des sources */
  synonymes?: readonly string[];
  /** Sujet du visuel (SUJETS_VISUELS) */
  sujet?: string;
  /** Hashtags suggérés (forme normalisée de hashtags.ts) */
  hashtags?: readonly string[];
};

export const DICTIONNAIRE_METIER: readonly EntreeDictionnaire[] = [
  // Ongles
  { id: 'orthonyxie', fr: ['orthonyxie', 'orthese d ongle', 'agrafe d ongle'], en: 'ingrown toenail brace', variantes: ['toenail orthonyxia', 'nail brace podiatry', 'ingrown nail diagram', 'toenail correction brace'], synonymes: ['nail brace', 'toenail brace', 'orthonyxia'], sujet: 'ongles', hashtags: ['orthonyxie', 'ongle-incarne'] },
  { id: 'onychoplastie', fr: ['onychoplastie', 'reconstruction d ongle', 'ongle artificiel'], en: 'artificial toenail reconstruction', variantes: ['toenail prosthesis', 'nail reconstruction podiatry', 'toenail resin repair'], synonymes: ['nail reconstruction', 'artificial nail', 'nail prosthesis'], sujet: 'ongles', hashtags: ['onychoplastie', 'ongles'] },
  { id: 'ongle-incarne', fr: ['ongle incarne', 'ongles incarnes', 'onychocryptose'], en: 'ingrown toenail', variantes: ['ingrown nail anatomy', 'onychocryptosis', 'ingrown toenail diagram'], synonymes: ['ingrown nail', 'ingrown toenail', 'onychocryptosis'], sujet: 'ongles', hashtags: ['ongle-incarne'] },
  { id: 'mycose-ongles', fr: ['mycose', 'mycose des ongles', 'onychomycose'], en: 'toenail fungus', variantes: ['onychomycosis', 'fungal nail infection'], synonymes: ['onychomycosis', 'nail fungus', 'fungal nail'], sujet: 'ongles', hashtags: ['mycose', 'ongles'] },
  { id: 'ongles-epais', fr: ['ongles epais', 'ongle epais', 'onychogryphose'], en: 'thick toenails', variantes: ['onychogryphosis', 'thickened toenail'], synonymes: ['thick nail', 'onychogryphosis'], sujet: 'ongles', hashtags: ['ongles'] },
  { id: 'ongles', fr: ['ongle', 'ongles'], en: 'toenail', variantes: ['toenail anatomy', 'nail care'], synonymes: ['toenail', 'toenails', 'nail', 'nails'], sujet: 'ongles', hashtags: ['ongles'] },
  // Matériel et examens
  { id: 'podoscope', fr: ['podoscope'], en: 'podoscope', variantes: ['foot pressure mirror', 'foot examination device', 'footprint analysis'], synonymes: ['podoscope', 'footprint'], sujet: 'semelles', hashtags: ['podoscope', 'bilan-podologique'] },
  { id: 'stabilometrie', fr: ['stabilometrie', 'plateforme de stabilometrie'], en: 'stabilometry platform', variantes: ['force plate balance', 'posturography platform'], synonymes: ['force plate', 'stabilometry'], sujet: 'semelles', hashtags: ['bilan-podologique'] },
  { id: 'analyse-marche', fr: ['analyse de la marche', 'analyse', 'tapis de course', 'baropodometrie'], en: 'gait analysis', variantes: ['gait cycle diagram', 'treadmill gait analysis', 'foot pressure map'], synonymes: ['gait', 'gait analysis', 'treadmill', 'baropodometry'], sujet: 'sport', hashtags: ['analyse-de-la-marche'] },
  { id: 'bilan', fr: ['bilan podologique', 'bilan'], en: 'podiatric examination', variantes: ['foot examination', 'podiatrist examining foot'], synonymes: ['foot examination', 'foot exam'], sujet: 'semelles', hashtags: ['bilan-podologique'] },
  // Semelles et orthèses
  { id: 'orthoplastie', fr: ['orthoplastie', 'orthese en silicone', 'orthese d orteil'], en: 'silicone toe orthosis', variantes: ['toe separator silicone', 'toe spacer orthotic', 'silicone toe protector'], synonymes: ['toe separator', 'toe spacer', 'silicone orthosis'], sujet: 'pedicurie', hashtags: ['orthoplastie', 'orteils'] },
  { id: 'semelles', fr: ['semelles orthopediques', 'semelle orthopedique', 'semelles', 'semelle', 'orthese plantaire'], en: 'orthotic insoles', variantes: ['custom foot orthotics', 'insole arch support', 'orthotic insole diagram'], synonymes: ['insole', 'insoles', 'orthotic', 'orthotics', 'arch support'], sujet: 'semelles', hashtags: ['semelles'] },
  { id: 'k-taping', fr: ['k taping', 'taping', 'strapping'], en: 'kinesiology tape foot', variantes: ['ankle taping', 'kinesio tape'], synonymes: ['kinesio', 'kinesiology tape', 'taping'], sujet: 'sport', hashtags: ['taping'] },
  // Pathologies courantes
  { id: 'douleur-talon', fr: ['douleur au talon', 'douleur talon', 'talon', 'aponevrosite', 'epine calcaneenne'], en: 'heel pain plantar fasciitis', variantes: ['plantar fascia anatomy', 'heel spur diagram'], synonymes: ['heel', 'plantar fasciitis', 'heel spur', 'plantar fascia'], sujet: 'semelles', hashtags: ['talon'] },
  { id: 'cors-durillons', fr: ['cors', 'cor', 'durillons', 'durillon', 'hyperkeratose'], en: 'foot corn callus', variantes: ['callus removal podiatry', 'foot corn diagram'], synonymes: ['corn', 'corns', 'callus', 'calluses', 'hyperkeratosis'], sujet: 'pedicurie', hashtags: ['cors', 'durillons'] },
  { id: 'verrues', fr: ['verrue plantaire', 'verrues plantaires', 'verrue', 'verrues'], en: 'plantar wart', variantes: ['verruca foot', 'plantar wart diagram'], synonymes: ['wart', 'warts', 'verruca'], sujet: 'pedicurie', hashtags: ['verrues'] },
  { id: 'hallux-valgus', fr: ['hallux valgus', 'oignon'], en: 'hallux valgus bunion', variantes: ['bunion diagram', 'bunion x-ray'], synonymes: ['bunion', 'bunions', 'hallux valgus'], sujet: 'pedicurie', hashtags: ['hallux-valgus'] },
  { id: 'pied-diabetique', fr: ['pied diabetique', 'diabete', 'diabetique', 'monofilament'], en: 'diabetic foot examination', variantes: ['monofilament test foot', 'diabetic foot care'], synonymes: ['diabetic', 'diabetes', 'monofilament', 'diabetic foot'], sujet: 'diabete', hashtags: ['pied-diabetique', 'diabete'] },
  // Publics et soins
  { id: 'pedicurie', fr: ['soins de pedicurie', 'pedicurie', 'pedicure', 'podologue', 'cabinet'], en: 'podiatrist foot care', variantes: ['chiropodist treatment', 'podiatry clinic', 'medical pedicure'], synonymes: ['podiatrist', 'podiatry', 'chiropodist', 'chiropody', 'pedicure', 'foot clinic'], sujet: 'pedicurie', hashtags: ['pedicurie'] },
  { id: 'enfant', fr: ['podologie de l enfant', 'podologie enfant', 'enfant', 'enfants', 'bebe'], en: 'child feet', variantes: ['toddler first steps', 'kids foot development'], synonymes: ['child', 'children', 'kid', 'kids', 'toddler', 'baby', 'infant'], sujet: 'enfant', hashtags: ['enfant'] },
  { id: 'senior', fr: ['podologie du senior', 'senior', 'seniors', 'personne agee', 'soins a domicile', 'domicile'], en: 'elderly foot care', variantes: ['senior walking cane', 'elderly feet'], synonymes: ['elderly', 'senior', 'seniors', 'old man', 'old woman', 'cane', 'walker', 'walking stick'], sujet: 'senior', hashtags: ['senior'] },
  { id: 'sport', fr: ['podologie du sport', 'sport', 'sportif', 'course a pied', 'course', 'trail', 'marathon', 'coureur'], en: 'running foot', variantes: ['runner feet', 'running shoes', 'trail running'], synonymes: ['running', 'runner', 'runners', 'marathon', 'jogging', 'trail running', 'sprint', 'athlete'], sujet: 'sport', hashtags: ['course'] },
  { id: 'equilibre', fr: ['equilibre', 'chute', 'prevention des chutes'], en: 'balance fall prevention', variantes: ['balance exercise', 'fall prevention elderly'], synonymes: ['balance', 'fall prevention'], sujet: 'senior', hashtags: ['equilibre'] },
  // Anatomie générale
  { id: 'anatomie-pied', fr: ['anatomie du pied', 'anatomie', 'pied', 'pieds', 'squelette du pied', 'voute plantaire'], en: 'foot anatomy', variantes: ['foot bones diagram', 'foot skeleton', 'foot arch anatomy'], synonymes: ['foot', 'feet', 'barefoot', 'foot anatomy', 'foot bones', 'arch'], hashtags: ['pied'] },
  { id: 'chaussure', fr: ['chaussure', 'chaussures', 'chaussage'], en: 'shoe', variantes: ['shoe anatomy', 'footwear'], synonymes: ['shoe', 'shoes', 'sneaker', 'sneakers', 'footwear', 'boot', 'boots'], hashtags: ['chaussure'] },
];

/** Sujets et hashtags jamais suggérés (posture : sujet différé, faible preuve) */
export const SUJETS_EXCLUS: readonly string[] = ['posture'];
export const estHashtagExclu = (h: string) => /^postur/.test(h);

/** Mots sans valeur de recherche (clés et titres de la bibliothèque) */
const MOTS_NEUTRES = new Set([
  'dessin', 'picto', 'pictos', 'icone', 'icones', 'illustration', 'illustrations', 'heros', 'biblio', 'ligne', 'materiel', 'releve', 'pedagogique',
  'trait', 'continu', 'theme', 'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'un', 'une', 'et', 'en', 'au', 'aux', 'a', 'pour', 'avec', 'sur', 'version', 'variante',
]);

/** « Orthèse d'ongle », « picto:ongle-incarne » → « orthese d ongle », « picto ongle incarne » */
export function normaliserTexte(t: unknown): string {
  return String(t ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Le texte (normalisé) contient-il le terme (mot entier, pluriel simple accepté) ? Renvoie la position ou -1 */
export function positionTerme(texteNormalise: string, terme: string): number {
  const t = normaliserTexte(terme);
  if (!t) return -1;
  const s = ` ${texteNormalise} `;
  for (const v of [t, `${t}s`]) {
    const i = s.indexOf(` ${v} `);
    if (i >= 0) return i;
  }
  return -1;
}

export type Correspondance = { entree: EntreeDictionnaire; terme: string; position: number; langue: 'fr' | 'en' };

/**
 * Entrées du dictionnaire présentes dans un texte (français et/ou anglais), triées par position puis par longueur du terme.
 * Un terme plus long l'emporte sur un terme plus court inclus dedans (« ongle incarne » plutôt que « ongle »).
 */
export function correspondances(texte: unknown, langues: readonly ('fr' | 'en')[] = ['fr', 'en']): Correspondance[] {
  const n = normaliserTexte(texte);
  if (!n) return [];
  const brutes: Correspondance[] = [];
  for (const entree of DICTIONNAIRE_METIER) {
    let meilleure: Correspondance | null = null;
    const termes: [string, 'fr' | 'en'][] = [
      ...(langues.includes('fr') ? entree.fr.map((t) => [t, 'fr'] as [string, 'fr']) : []),
      ...(langues.includes('en') ? [entree.en, ...(entree.synonymes ?? [])].map((t) => [t, 'en'] as [string, 'en']) : []),
    ];
    for (const [terme, langue] of termes) {
      const p = positionTerme(n, terme);
      if (p >= 0 && (!meilleure || normaliserTexte(terme).length > normaliserTexte(meilleure.terme).length)) meilleure = { entree, terme, position: p, langue };
    }
    if (meilleure) brutes.push(meilleure);
  }
  // Inclusion : un terme contenu dans un terme plus long d'une autre entrée trouvée au même endroit est écarté
  const gardees = brutes.filter((c) => !brutes.some((d) => d !== c && ` ${normaliserTexte(d.terme)} `.includes(` ${normaliserTexte(c.terme)} `) && normaliserTexte(d.terme).length > normaliserTexte(c.terme).length));
  return gardees.sort((a, b) => a.position - b.position || normaliserTexte(b.terme).length - normaliserTexte(a.terme).length || a.entree.id.localeCompare(b.entree.id));
}

const MOTS_REQUETE_MAX = 6;

/**
 * Traduction FR → EN d'un sujet (titre, soin, clé) en requête de recherche d'images. Les deux premières entrées trouvées
 * (dans l'ordre du texte), mots en double retirés, 6 mots au plus. Rien de connu : le texte nettoyé (sans les mots neutres),
 * à corriger à la main.
 */
export function traduireSujet(texte: unknown): string {
  const c = correspondances(texte, ['fr', 'en']);
  if (!c.length) return normaliserTexte(texte).split(' ').filter((m) => m && !MOTS_NEUTRES.has(m)).slice(0, MOTS_REQUETE_MAX).join(' ');
  const mots: string[] = [];
  for (const x of c.slice(0, 2)) for (const m of x.entree.en.split(' ')) if (!mots.includes(m)) mots.push(m);
  return mots.slice(0, MOTS_REQUETE_MAX).join(' ');
}

/** Élément de la bibliothèque (inventaire) → requête par défaut : titre d'abord, puis soins, puis clé */
export function requeteDepuisElement(e: { titre?: string | null; detail?: string | null; soins?: readonly string[]; cle?: string | null }): string {
  for (const t of [e.titre, ...(e.soins ?? []), e.cle?.split(':').slice(1).join(' '), e.detail]) {
    if (t && correspondances(t, ['fr']).length) return traduireSujet(t);
  }
  return traduireSujet(e.titre ?? e.cle ?? '');
}

/**
 * Variantes d'une requête, dans l'ordre d'essai : la requête elle-même, les variantes de l'entrée du dictionnaire qu'elle
 * désigne (plus précises ou plus larges), puis une version plus large (premier mot retiré) et « … diagram ». Sans doublon,
 * `max` au plus.
 */
export function variantesRequete(requete: string, max = 6): string[] {
  const base = normaliserTexte(requete);
  if (!base) return [];
  const res: string[] = [base];
  const ajouter = (v: string) => { const x = normaliserTexte(v); if (x && !res.includes(x)) res.push(x); };
  const c = correspondances(base, ['en', 'fr']);
  for (const x of c.slice(0, 2)) {
    ajouter(x.entree.en);
    for (const v of x.entree.variantes ?? []) ajouter(v);
  }
  const mots = base.split(' ');
  if (mots.length > 2) ajouter(mots.slice(1).join(' '));
  if (!/\b(diagram|illustration|icon)\b/.test(base)) ajouter(`${base} diagram`);
  return res.slice(0, max);
}
