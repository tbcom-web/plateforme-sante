// BIBLIOTHÈQUE DE PROMPTS d'images à générer (demande de Paul, 2026-10-08 : « faire des prompts pour demander à ChatGPT de créer des
// images sur des sujets dont on a du mal à trouver des images de représentation »). Module PUR : aucun appel à un service d'IA.
// Paul copie le prompt dans l'outil de son choix (ChatGPT, Midjourney…), génère lui-même, garde la meilleure image et l'importe
// (/admin/retours/images-a-generer → « Importer une image générée », images-generees.ts) ; elle suit ensuite la curation habituelle.
//
// - TROUS réels (trousImages) : emplacements des kits sans photo, faibles ou complétés par un autre sujet (suggestions-kits.ts,
//   emplacementsAFaire), sujets au vivier maigre (moins de 3 photos ≥ 4 ★), manques « photo » de retours/MANQUES.md.
// - PROMPTS (construirePrompt) : sujet ou soin × format (premier écran 16:9 et 4:5 mobile, carte de soin 4:3, page sujet 3:2,
//   cabinet : détail d'ambiance 3:2, ÉcranZen 9:16), en anglais et en français, en phrases (ChatGPT, Firefly…) ou au format
//   Midjourney (--ar, --no) ; palette de la gamme INJECTÉE (couleurs nommées + hexadécimal), style photo de la banque (naturel,
//   lumineux, sans retouche glamour), CONTRAINTES NÉGATIVES TOUJOURS PRÉSENTES, trois variantes (lumière × angle).
// - DÉONTOLOGIE (motifsRefus, controlerPrompt) : jamais d'avant / après ni de résultat de soin présenté comme réel, jamais un faux
//   patient ou un faux praticien présenté comme réel, jamais de matériel médical de marque, rien qui promette un résultat, pas de
//   posturologie ni de réflexologie, usage illustratif seulement. Une demande qui viole ces règles est REFUSÉE (aucun prompt rendu) ;
//   un prompt construit est recontrôlé avant d'être rendu.
// - Une image générée n'est JAMAIS présentée comme le cabinet ou le praticien : refusée dans la galerie du cabinet (kits, jeux).

import { gamme as gammeParId, type Gamme } from './gammes';
import { rvb } from './couleurs';
import { libelleEmplacement, libelleSujetKit } from './kits-images';
import { hashtagEmplacement, type EmplacementAFaire } from './suggestions-kits';

export type LanguePrompt = 'fr' | 'en';
export type StylePrompt = 'phrases' | 'midjourney';
type Texte = { fr: string; en: string };

// ---------------------------------------------------------------------------------------------------------------
// Formats (emplacements des sites et d'ÉcranZen)
// ---------------------------------------------------------------------------------------------------------------

export type FormatImage = { id: string; libelle: string; ratio: string; usage: string; cadrage: Texte };

export const FORMATS_IMAGES: readonly FormatImage[] = [
  {
    id: 'premier-ecran', libelle: 'Premier écran (ordinateur)', ratio: '16:9', usage: 'Image du premier écran sur ordinateur',
    cadrage: {
      en: 'wide horizontal composition, main subject on the right two-thirds, calm and uncluttered area on the left (kept empty)',
      fr: 'composition horizontale large, sujet principal sur les deux tiers droits, zone calme et dégagée à gauche (laissée vide)',
    },
  },
  {
    id: 'premier-ecran-mobile', libelle: 'Premier écran (téléphone)', ratio: '4:5', usage: 'Image du premier écran sur téléphone',
    cadrage: {
      en: 'vertical composition, whole subject in the lower two-thirds, calm space at the top, nothing important near the edges',
      fr: 'composition verticale, sujet entier dans les deux tiers inférieurs, espace calme en haut, rien d’important près des bords',
    },
  },
  {
    id: 'carte-soin', libelle: 'Carte de soin', ratio: '4:3', usage: 'Photo d’une fiche ou d’une carte de soin',
    cadrage: {
      en: 'close framing centred on the care gesture or the object, simple light background',
      fr: 'cadrage serré centré sur le geste de soin ou l’objet, fond clair et simple',
    },
  },
  {
    id: 'page-sujet', libelle: 'Page sujet', ratio: '3:2', usage: 'Photo de la page d’un sujet',
    cadrage: {
      en: 'medium shot showing a little context, natural everyday setting',
      fr: 'plan moyen avec un peu de contexte, cadre naturel du quotidien',
    },
  },
  {
    id: 'cabinet', libelle: 'Cabinet : détail d’ambiance', ratio: '3:2',
    usage: 'Détail d’ambiance de soin, jamais présenté comme le cabinet du praticien (refusé dans la galerie du cabinet)',
    cadrage: {
      en: 'close-up still life of neutral care details, no identifiable room, no window view, no signage',
      fr: 'nature morte en gros plan de détails de soin neutres, aucune pièce identifiable, aucune vue par la fenêtre, aucune signalétique',
    },
  },
  {
    id: 'ecranzen', libelle: 'ÉcranZen', ratio: '9:16', usage: 'Visuel plein écran vertical (ÉcranZen, réseaux sociaux)',
    cadrage: {
      en: 'vertical full-screen composition, subject centred, large calm areas at the top and bottom',
      fr: 'composition verticale plein écran, sujet centré, grandes zones calmes en haut et en bas',
    },
  },
];

export const formatImage = (id: string) => FORMATS_IMAGES.find((f) => f.id === id);

/** Formats d'un emplacement de kit */
export function formatsEmplacement(emplacement: string): string[] {
  if (emplacement === 'accueil') return ['premier-ecran', 'premier-ecran-mobile'];
  if (emplacement === 'page-sujet') return ['page-sujet'];
  if (emplacement === 'cabinet') return ['cabinet'];
  if (emplacement === 'ecranzen') return ['ecranzen'];
  if (emplacement.startsWith('soin:')) return ['carte-soin'];
  return ['page-sujet'];
}

// ---------------------------------------------------------------------------------------------------------------
// Scènes : sujets et soins (toujours des pieds, des chaussures ou un geste de soin ; aucune pathologie montrée)
// ---------------------------------------------------------------------------------------------------------------

export const SCENES_SUJETS: Readonly<Record<string, Texte>> = {
  sport: {
    en: 'the lower legs and feet of a runner in clean, plain running shoes on a forest trail, mid-stride',
    fr: 'les jambes et les pieds d’un coureur en chaussures de course propres et unies, sur un sentier en forêt, en pleine foulée',
  },
  diabete: {
    en: 'an adult seated on the edge of a bed calmly checking the soles of their own feet with a small hand mirror, light seamless socks folded nearby',
    fr: 'un adulte assis au bord du lit qui regarde calmement la plante de ses pieds avec un petit miroir à main, des chaussettes claires sans coutures pliées à côté',
  },
  ongles: {
    en: 'neatly trimmed, healthy-looking toenails on a relaxed bare foot resting on a white cotton towel',
    fr: 'des ongles d’orteils nets et bien coupés sur un pied détendu posé sur une serviette en coton blanc',
  },
  enfant: {
    en: 'a toddler’s small bare feet taking first steps on soft grass, an adult’s hands just in frame for support',
    fr: 'les petits pieds nus d’un tout-petit qui fait ses premiers pas dans l’herbe, les mains d’un adulte juste dans le cadre pour le soutenir',
  },
  senior: {
    en: 'an older adult’s feet in comfortable closed shoes with hook-and-loop straps walking on a garden path, the tip of a walking cane visible',
    fr: 'les pieds d’une personne âgée en chaussures confortables fermées à scratch, qui marche sur une allée de jardin, le bout d’une canne visible',
  },
  semelles: {
    en: 'a pair of plain custom foot insoles placed next to clean plain sneakers on a light wooden table',
    fr: 'une paire de semelles sur mesure unies posée à côté de baskets propres et unies, sur une table en bois clair',
  },
  pedicurie: {
    en: 'gloved hands gently holding a relaxed bare foot resting on a treatment chair covered with a paper sheet',
    fr: 'des mains gantées qui tiennent doucement un pied nu détendu, posé sur un fauteuil de soin recouvert d’un drap d’examen en papier',
  },
  general: {
    en: 'bare feet walking on a sunlit sandy path, soft footprints behind',
    fr: 'des pieds nus qui marchent sur un chemin de sable ensoleillé, de légères empreintes derrière eux',
  },
};

/** Scènes par soin du catalogue (mêmes slugs que REQUETES_SOINS) */
export const SCENES_SOINS: Readonly<Record<string, Texte>> = {
  'bilan-podologique': {
    en: 'a bare foot standing on a plain pressure-measurement mat, seen from the side at floor level, the screen not visible',
    fr: 'un pied nu posé sur un tapis de mesure des appuis uni, vu de côté au ras du sol, sans écran visible',
  },
  'semelles-orthopediques': {
    en: 'gloved hands fitting a plain custom insole into a clean plain shoe on a light worktop',
    fr: 'des mains gantées qui glissent une semelle sur mesure unie dans une chaussure propre et unie, sur un plan de travail clair',
  },
  'soins-de-pedicurie': {
    en: 'gloved hands caring for the sole of a relaxed foot resting on a white towel, sterile instruments kept in a closed pouch nearby',
    fr: 'des mains gantées qui prennent soin de la plante d’un pied détendu posé sur une serviette blanche, instruments stériles dans un sachet fermé à côté',
  },
  'pied-diabetique': {
    en: 'a gloved hand lightly touching the sole of a relaxed foot with a thin nylon filament, the foot resting on a white towel, calm atmosphere',
    fr: 'une main gantée qui effleure la plante d’un pied détendu avec un fin filament de nylon, le pied posé sur une serviette blanche, ambiance calme',
  },
  'podologie-du-sport': {
    en: 'the ankle and foot of an athlete sitting on a bench, lacing plain running shoes',
    fr: 'la cheville et le pied d’un sportif assis sur un banc, qui lace des chaussures de course unies',
  },
  'podologie-enfant': {
    en: 'a child’s feet in new first shoes on a light wooden floor, an adult’s hand adjusting the strap',
    fr: 'les pieds d’un enfant dans des premières chaussures neuves sur un parquet clair, la main d’un adulte qui ajuste la bride',
  },
  'podologie-du-senior': {
    en: 'an older adult seated, feet in soft comfortable shoes, hands resting on the knees, warm home interior',
    fr: 'une personne âgée assise, pieds dans des chaussures souples et confortables, mains posées sur les genoux, intérieur chaleureux',
  },
  'verrues-plantaires': {
    en: 'the sole of a foot with smooth, healthy-looking skin resting on a white towel, a gloved hand gently holding the heel',
    fr: 'la plante d’un pied à la peau lisse et saine posée sur une serviette blanche, une main gantée qui tient doucement le talon',
  },
  'ongle-incarne': {
    en: 'a gloved hand holding a big toe with a neatly trimmed nail on a white towel, calm healthy-looking skin, a small closed sterile kit nearby',
    fr: 'une main gantée qui tient un gros orteil à l’ongle bien coupé sur une serviette blanche, peau calme et saine, petit kit stérile fermé à côté',
  },
  'douleur-talon': {
    en: 'a person seated rolling the arch of a bare foot over a small plain massage ball on a wooden floor',
    fr: 'une personne assise qui fait rouler la voûte de son pied nu sur une petite balle de massage unie, sur un parquet',
  },
  laser: {
    en: 'a relaxed foot on a white towel next to a small plain handheld care device, protective glasses placed beside it, clean clinical light',
    fr: 'un pied détendu sur une serviette blanche à côté d’un petit appareil de soin à main, uni, des lunettes de protection posées à côté, lumière nette de cabinet',
  },
  'k-taping': {
    en: 'an ankle with beige kinesiology tape applied in neat strips, an athlete sitting on a bench',
    fr: 'une cheville avec une bande de taping beige posée en bandes nettes, un sportif assis sur un banc',
  },
  orthonyxie: {
    en: 'close-up of a big toenail with a thin, discreet transparent correction strip, the foot relaxed on a towel, healthy-looking skin',
    fr: 'gros plan d’un ongle de gros orteil avec une fine lame de correction transparente et discrète, pied détendu sur une serviette, peau saine',
  },
  onychoplastie: {
    en: 'close-up of a neat, natural-looking big toenail on a relaxed foot, a gloved hand nearby holding a fine brush',
    fr: 'gros plan d’un ongle de gros orteil net et d’aspect naturel sur un pied détendu, une main gantée à côté qui tient un pinceau fin',
  },
  orthoplastie: {
    en: 'a small plain silicone toe separator placed between two toes of a relaxed foot on a towel',
    fr: 'un petit séparateur d’orteils en silicone uni placé entre deux orteils d’un pied détendu sur une serviette',
  },
  'mycose-ongles': {
    en: 'a relaxed foot on a white towel, a gloved hand holding a small plain unlabelled dropper bottle near clean-looking toenails',
    fr: 'un pied détendu sur une serviette blanche, une main gantée qui tient un petit flacon compte-gouttes uni, sans étiquette, près d’ongles d’aspect net',
  },
  'cors-durillons': {
    en: 'gloved hands gently holding the forefoot above a white towel, a plain pumice stone beside it, smooth healthy-looking skin',
    fr: 'des mains gantées qui tiennent doucement l’avant du pied au-dessus d’une serviette blanche, une pierre ponce unie à côté, peau lisse et saine',
  },
  'ongles-epais': {
    en: 'a gloved hand gently filing a toenail with a plain nail file, the foot relaxed on a white towel',
    fr: 'une main gantée qui lime doucement un ongle d’orteil avec une lime unie, le pied détendu sur une serviette blanche',
  },
  'soins-a-domicile': {
    en: 'a plain care bag with sterile pouches on a living-room floor beside an older person’s feet resting on a cushion, soft window light',
    fr: 'une trousse de soin unie avec des sachets stériles posée au sol d’un salon, à côté des pieds d’une personne âgée posés sur un coussin, lumière douce de fenêtre',
  },
};

export const SCENE_CABINET: Texte = {
  en: 'a folded white towel, a small green plant and a closed sterile instrument pouch on a light wooden shelf',
  fr: 'une serviette blanche pliée, une petite plante verte et un sachet d’instruments stériles fermé sur une étagère en bois clair',
};

/** Scène d'un sujet et d'un emplacement (soin : celle du soin, sinon celle du sujet ; cabinet : nature morte neutre) */
export function sceneDe(sujet: string, emplacement: string, format?: string): Texte | null {
  if (format === 'cabinet' || emplacement === 'cabinet') return SCENE_CABINET;
  if (emplacement.startsWith('soin:')) return SCENES_SOINS[emplacement.slice(5)] ?? SCENES_SUJETS[sujet] ?? null;
  return SCENES_SUJETS[sujet] ?? null;
}

// ---------------------------------------------------------------------------------------------------------------
// Style de la banque, variantes, palette
// ---------------------------------------------------------------------------------------------------------------

export const STYLE_BANQUE: Texte = {
  en: 'natural documentary-style photograph, bright and airy, true-to-life colours and skin texture, no glamour retouching, 50 mm lens look, gentle depth of field, clean uncluttered background, calm and reassuring',
  fr: 'photographie naturelle façon reportage, lumineuse et aérée, couleurs et grain de peau fidèles, sans retouche glamour, rendu d’objectif 50 mm, légère profondeur de champ, arrière-plan épuré, ambiance calme et rassurante',
};

export const VARIANTES_PROMPT: readonly { lumiere: Texte; angle: Texte }[] = [
  { lumiere: { en: 'soft morning light from a window', fr: 'lumière douce du matin venant d’une fenêtre' }, angle: { en: 'eye-level close view', fr: 'vue rapprochée à hauteur du sujet' } },
  { lumiere: { en: 'bright overcast daylight, even and soft', fr: 'lumière du jour voilée, douce et égale' }, angle: { en: 'slightly high three-quarter view', fr: 'vue de trois quarts légèrement plongeante' } },
  { lumiere: { en: 'gentle warm late-afternoon sunlight', fr: 'soleil doux et chaud de fin d’après-midi' }, angle: { en: 'low side view at floor level', fr: 'vue de côté au ras du sol' } },
];

/** Nom d'une couleur (teinte, clarté) pour un générateur qui comprend mal l'hexadécimal seul */
export function nomCouleur(h: string, langue: LanguePrompt): string {
  const [r, g, b] = rvb(h).map((x) => x / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let teinte = 0;
  if (d) teinte = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  if (teinte < 0) teinte += 360;
  if (s < 0.12 || d < 0.04) {
    const gris = l > 0.94 ? ['white', 'blanc'] : l > 0.8 ? ['off-white', 'blanc cassé'] : l > 0.6 ? ['light grey', 'gris clair'] : l > 0.3 ? ['grey', 'gris'] : ['charcoal', 'anthracite'];
    return langue === 'en' ? gris[0] : gris[1];
  }
  const familles: [number, string, string][] = [
    [15, 'red', 'rouge'], [40, 'coral orange', 'orangé corail'], [65, 'warm yellow', 'jaune chaud'], [160, 'green', 'vert'], [195, 'teal', 'bleu canard'],
    [250, 'blue', 'bleu'], [290, 'violet', 'violet'], [345, 'plum pink', 'rose prune'], [360, 'red', 'rouge'],
  ];
  const [, en, fr] = familles.find(([lim]) => teinte < lim) ?? familles[0];
  const clarte = l > 0.85 ? ['pale', 'pâle'] : l > 0.68 ? ['soft', 'doux'] : l < 0.3 ? ['deep', 'profond'] : null;
  if (langue === 'en') return clarte ? `${clarte[0]} ${en}` : en;
  return clarte ? `${fr} ${clarte[1]}` : fr;
}

export type PalettePrompt = { principale: string; douce: string; fond: string; vive: string | null };

/** Couleurs de la gamme injectées dans le prompt : accent, fond doux (ou aplat), fond, couleur vive (gammes vitaminées) */
export function paletteGamme(g: Gamme): PalettePrompt {
  return { principale: g.accent, douce: g.aplat ?? g.fondDoux, fond: g.fond, vive: g.vif ?? null };
}

/** Teinte rouge (le sujet diabète n'en veut pas : R6.2 de docs/gout-paul.md) */
const estRouge = (h: string) => { const [r, g, b] = rvb(h); return r > 140 && r > g * 1.6 && r > b * 1.6; };

function phrasePalette(p: PalettePrompt, langue: LanguePrompt, sujet: string): string {
  const coul = (h: string) => `${nomCouleur(h, langue)} (${h})`;
  const sansRouge = sujet === 'diabete';
  const accents = [p.principale, p.vive].filter((x): x is string => Boolean(x) && !(sansRouge && estRouge(x!)));
  const liste = [...accents.map(coul), coul(p.douce)];
  return langue === 'en'
    ? `Colour palette: discreet touches of ${liste.join(', ')} in the props and background (towel, fabric, wall, shoes), the rest light and neutral (${p.fond}); skin tones stay natural${sansRouge ? '; no red tones' : ''}.`
    : `Palette : touches discrètes de ${liste.join(', ')} dans les accessoires et le fond (serviette, tissu, mur, chaussures), le reste clair et neutre (${p.fond}) ; la peau garde sa couleur naturelle${sansRouge ? ' ; aucune teinte rouge' : ''}.`;
}

// ---------------------------------------------------------------------------------------------------------------
// Contraintes négatives (TOUJOURS présentes) et règles déontologiques
// ---------------------------------------------------------------------------------------------------------------

export const CONTRAINTES_NEGATIVES: readonly { id: string; en: string; fr: string; mj: string }[] = [
  { id: 'texte', en: 'no text, letters, numbers, captions, watermark or signature', fr: 'aucun texte, aucune lettre, aucun chiffre, aucune légende, aucun filigrane ni signature', mj: 'text, letters, watermark, signature' },
  { id: 'marque', en: 'no logo, brand name or brand-like mark on shoes, clothing, devices or packaging', fr: 'aucun logo, aucun nom ni signe de marque sur les chaussures, les vêtements, le matériel ou les emballages', mj: 'logo, brand, trademark' },
  { id: 'visage', en: 'no recognisable face: face out of frame, turned away or softly blurred, never a portrait', fr: 'aucun visage reconnaissable : visage hors cadre, détourné ou flou, jamais de portrait', mj: 'face, portrait' },
  { id: 'choquant', en: 'no blood, wound, open sore, inflammation, infection or shocking medical detail', fr: 'pas de sang, de plaie, de lésion ouverte, d’inflammation, d’infection ni de détail médical choquant', mj: 'blood, wound, injury, gore' },
  { id: 'anatomie', en: 'anatomically correct: exactly five toes per foot, realistic proportions, no extra, missing or fused toes, no deformed feet, hands with five fingers', fr: 'anatomie correcte : exactement cinq orteils par pied, proportions réalistes, aucun orteil en trop, manquant ou soudé, aucun pied déformé, mains à cinq doigts', mj: 'extra toes, missing toes, fused toes, deformed feet, extra fingers' },
  { id: 'avant-apres', en: 'no before/after comparison, no split image, no treatment result shown as real', fr: 'pas d’avant / après, pas d’image coupée en deux, aucun résultat de soin présenté comme réel', mj: 'before and after, split image, comparison' },
  { id: 'personne', en: 'anonymous staged model only: not presented as a real patient or an identifiable practitioner, no name badge, no uniform logo', fr: 'modèle anonyme mis en scène seulement : ni présenté comme un vrai patient, ni comme un praticien identifiable, sans badge nominatif ni logo de tenue', mj: 'name badge, uniform logo' },
  { id: 'gout', en: 'no tattoos, no dirty or worn shoes, no claw toes or prominent veins, not dark, no motion blur, no glamour or plastic-looking skin', fr: 'pas de tatouage, pas de chaussures sales ou usées, pas d’orteils en griffe ni de veines saillantes, pas d’image sombre ni floue, pas de peau lissée ou glamour', mj: 'tattoo, dirty shoes, claw toes, dark, motion blur, plastic skin' },
];

export const REGLES_DEONTOLOGIQUES: readonly string[] = [
  'Usage illustratif seulement : l’image illustre un sujet, elle ne montre jamais un vrai patient, un vrai praticien ni le vrai cabinet.',
  'Jamais d’avant / après ni de résultat de soin présenté comme réel ; rien qui promette un résultat.',
  'Jamais de matériel médical, de chaussure ou de produit de marque reconnaissable.',
  'Pas de visage reconnaissable, pas de sang ni de plaie, anatomie correcte (cinq orteils, proportions réalistes).',
  'Pas de posturologie ni de réflexologie (sujets à faible niveau de preuve, en attente de validation déontologique).',
  'Galerie du cabinet : jamais d’image générée (elle serait prise pour le vrai cabinet).',
];

export const CONSEILS_SELECTION: readonly string[] = [
  'Compter les orteils (cinq par pied) et les doigts ; vérifier les ongles, les talons et les chevilles.',
  'Refuser toute image avec du texte, des lettres, un logo ou une marque, même flous.',
  'Refuser un visage net ou reconnaissable, une tenue avec badge ou logo.',
  'Refuser une peau trop lisse, une lumière « publicité », une image sombre ou floue.',
  'Comparer au format demandé : sujet entier dans le cadre, rien d’important coupé sur téléphone.',
  'Garder une seule image par prompt, la plus naturelle ; en cas de doute, ne pas l’importer.',
];

/** Motifs interdits (demande libre de Paul, scène) : libellé du refus → expression */
export const MOTIFS_INTERDITS: readonly { id: string; motif: string; re: RegExp }[] = [
  { id: 'avant-apres', motif: 'Pas d’avant / après.', re: /(avant\s*(\/|-|et)?\s*apr[eè]s|before\s*(\/|-|and|&)?\s*after)/i },
  { id: 'resultat', motif: 'Rien qui présente ou promette un résultat de soin.', re: /\b(r[ée]sultats?|gu[ée]ri(s|e|son)?|miracle|garanti[es]*|efficacit[ée]|transformation|cured?|healed|guaranteed|results?)\b/i },
  { id: 'personne', motif: 'Jamais un vrai patient ni un praticien identifiable présentés comme réels.', re: /\b(vrais?e?s? patients?|real patients?|notre patient|t[ée]moignages?|testimonials?|praticien r[ée]el|real (podiatrist|practitioner|doctor)|docteur|doctor|dr\.? [a-z]|portrait (du|de la|of the|of a) )/i },
  { id: 'marque', motif: 'Aucune marque (chaussures, matériel, produits).', re: /\b(nike|adidas|asics|puma|reebok|new balance|hoka|salomon|brooks|mizuno|saucony|on running|scholl|compeed|akileine|kinesio ?tex|rocktape|crocs|birkenstock|converse|vans|decathlon|kalenji|apple|samsung|marque|brand(ed)?|logo)\b/i },
  { id: 'posture', motif: 'Pas de posturologie ni de réflexologie.', re: /(postur|r[ée]flexo|reflexolog)/i },
  { id: 'choquant', motif: 'Pas de sang, de plaie ni de détail choquant.', re: /\b(sang|saign\w*|plaies?|ulc[eè]res?|n[ée]croses?|pus|infect\w*|gangr\w*|amput\w*|blood\w*|bleed\w*|wounds?|ulcers?|necros\w*|gore)\b/i },
  { id: 'visage', motif: 'Pas de visage reconnaissable.', re: /\b(visages?|faces?|portraits?|selfies?|regard(e|ant)? (la )?cam[ée]ra|looking at (the )?camera)\b/i },
  { id: 'texte', motif: 'Pas de texte dans l’image (le titre est posé par le site).', re: /\b(textes?|text|slogans?|lettrages?|captions?|watermarks?|titres? [ée]crits?)\b/i },
];

/** Motifs de refus d'un texte (vide : acceptable) */
export function motifsRefus(texte: string | null | undefined): string[] {
  const t = String(texte ?? '');
  return [...new Set(MOTIFS_INTERDITS.filter((m) => m.re.test(t)).map((m) => m.motif))];
}

/** Sujet ou soin exclu (posturologie, réflexologie) */
export const sujetExclu = (sujet: string, emplacement = '') => /postur|r[ée]flexo/i.test(`${sujet} ${emplacement}`);

// ---------------------------------------------------------------------------------------------------------------
// Construction et contrôle d'un prompt
// ---------------------------------------------------------------------------------------------------------------

export type DemandePrompt = {
  sujet: string;
  /** Emplacement de kit (accueil, page-sujet, cabinet, soin:<slug>, ecranzen) */
  emplacement: string;
  format: string;
  /** Identifiant de gamme (gammes.ts) ou gamme complète */
  gamme: string | Gamme | null | undefined;
  langue: LanguePrompt;
  style: StylePrompt;
  /** Variante 0 à 2 (lumière × angle) */
  variante?: number;
  /** Précision libre de Paul (200 caractères au plus), contrôlée comme le reste */
  precision?: string | null;
};

export type PromptConstruit = {
  ok: true;
  texte: string;
  /** Partie « à éviter » seule (outils qui ont un champ négatif séparé) */
  negatif: string;
  format: FormatImage;
  langue: LanguePrompt;
  style: StylePrompt;
  variante: number;
  palette: PalettePrompt;
};
export type PromptRefuse = { ok: false; refus: string[] };

const GAMME_DEFAUT = 'canard';
export const PRECISION_MAX = 200;

/** Marqueur du début des contraintes négatives (partie à ne pas contrôler comme une demande) */
export const MARQUEURS_NEGATIFS = ['Avoid:', 'À éviter :', '--no '] as const;

/** Partie « positive » d'un prompt (avant « Avoid: », « À éviter : » ou « --no ») */
export function partiePositive(texte: string): string {
  let fin = texte.length;
  for (const m of MARQUEURS_NEGATIFS) { const i = texte.indexOf(m); if (i >= 0 && i < fin) fin = i; }
  return texte.slice(0, fin);
}

const USAGE: Texte = {
  en: 'Purpose: generic illustrative photo for the website of a foot-care practice (staged scene with anonymous models).',
  fr: 'Usage : photo d’illustration générique pour le site d’un cabinet de soins des pieds (scène mise en scène avec des modèles anonymes).',
};

/**
 * Prompt prêt à copier, ou refus motivé. Refus : sujet ou soin exclu, scène inconnue, format inconnu, précision qui viole une
 * règle. Le prompt construit est recontrôlé (controlerPrompt) : contraintes négatives complètes, aucune demande interdite.
 */
export function construirePrompt(dem: DemandePrompt): PromptConstruit | PromptRefuse {
  const refus: string[] = [];
  if (sujetExclu(dem.sujet, dem.emplacement)) refus.push('Pas de posturologie ni de réflexologie : aucune image avant validation déontologique.');
  const format = formatImage(dem.format);
  if (!format) refus.push('Format inconnu.');
  const scene = sceneDe(dem.sujet, dem.emplacement, dem.format);
  if (!scene) refus.push('Sujet ou soin sans scène décrite.');
  const precision = String(dem.precision ?? '').replace(/\s+/g, ' ').trim();
  if (precision.length > PRECISION_MAX) refus.push(`Précision trop longue (${PRECISION_MAX} caractères au plus).`);
  refus.push(...motifsRefus(precision));
  if (refus.length || !format || !scene) return { ok: false, refus: [...new Set(refus)] };

  const g = typeof dem.gamme === 'object' && dem.gamme ? dem.gamme : gammeParId(dem.gamme ?? GAMME_DEFAUT) ?? gammeParId(GAMME_DEFAUT)!;
  const palette = paletteGamme(g);
  const L = dem.langue === 'en' ? 'en' : 'fr';
  const variante = Math.max(0, Math.min(VARIANTES_PROMPT.length - 1, Math.floor(dem.variante ?? 0)));
  const v = VARIANTES_PROMPT[variante];
  const negatifs = CONTRAINTES_NEGATIVES;
  const diabeteRouge = dem.sujet === 'diabete' ? (L === 'en' ? '; no red tones' : ' ; aucune teinte rouge') : '';

  let texte: string;
  let negatif: string;
  if (dem.style === 'midjourney') {
    const palettes = phrasePalette(palette, L, dem.sujet).replace(/^(Colour palette|Palette) ?: /, '').replace(/\.$/, '');
    negatif = `--no ${[...new Set(negatifs.flatMap((c) => c.mj.split(', ')))].join(', ')}${dem.sujet === 'diabete' ? ', red tones' : ''}`;
    texte = [
      `${scene[L]}${precision ? `, ${precision}` : ''}`, format.cadrage[L], v.angle[L], v.lumiere[L], STYLE_BANQUE[L], palettes,
      L === 'en' ? 'staged illustrative photo, anonymous models' : 'photo d’illustration mise en scène, modèles anonymes',
    ].join(', ') + ` --ar ${format.ratio} --style raw ${negatif}`;
  } else {
    negatif = `${L === 'en' ? 'Avoid:' : 'À éviter :'} ${negatifs.map((c) => c[L]).join(' ; ')}${diabeteRouge}.`;
    texte = [
      USAGE[L],
      `${L === 'en' ? 'Subject:' : 'Sujet :'} ${scene[L]}${precision ? `, ${precision}` : ''}.`,
      `${L === 'en' ? 'Framing:' : 'Cadrage :'} ${format.cadrage[L]} ; ${v.angle[L]}. ${L === 'en' ? 'Aspect ratio' : 'Format'} ${format.ratio}.`,
      `${L === 'en' ? 'Light:' : 'Lumière :'} ${v.lumiere[L]}.`,
      `${L === 'en' ? 'Style:' : 'Style :'} ${STYLE_BANQUE[L]}.`,
      phrasePalette(palette, L, dem.sujet),
      negatif,
    ].join('\n');
  }
  const construit: PromptConstruit = { ok: true, texte, negatif, format, langue: L, style: dem.style === 'midjourney' ? 'midjourney' : 'phrases', variante, palette };
  const controle = controlerPrompt(construit.texte, { style: construit.style, langue: L, scene: `${scene[L]} ${precision}` });
  return controle.length ? { ok: false, refus: controle } : construit;
}

/**
 * Contrôle d'un prompt rendu : toutes les contraintes négatives présentes (texte de chaque contrainte, ou mots-clés --no pour
 * Midjourney), et aucune demande interdite dans la scène (sujet + précision). Renvoie les manquements (vide : conforme).
 */
export function controlerPrompt(texte: string, o: { style: StylePrompt; langue: LanguePrompt; scene: string }): string[] {
  const r: string[] = [];
  for (const c of CONTRAINTES_NEGATIVES) {
    const attendu = o.style === 'midjourney' ? c.mj.split(', ') : [c[o.langue]];
    if (!attendu.every((x) => texte.includes(x))) r.push(`Contrainte négative manquante : ${c.id}.`);
  }
  if (o.style === 'midjourney' ? !texte.includes('--no ') : !MARQUEURS_NEGATIFS.some((m) => texte.includes(m))) r.push('Section « à éviter » absente.');
  r.push(...motifsRefus(o.scene));
  return r;
}

/** Les trois variantes d'un prompt (même sujet, format, gamme, langue, style) */
export function variantesPrompt(dem: Omit<DemandePrompt, 'variante'>): (PromptConstruit | PromptRefuse)[] {
  return VARIANTES_PROMPT.map((_, i) => construirePrompt({ ...dem, variante: i }));
}

// ---------------------------------------------------------------------------------------------------------------
// Trous réels à combler
// ---------------------------------------------------------------------------------------------------------------

export type RaisonTrou = 'kit-vide' | 'kit-faible' | 'kit-complement' | 'vivier-maigre' | 'manque';
export const LIBELLES_RAISONS_TROU: Record<RaisonTrou, string> = {
  'kit-vide': 'Emplacement de kit sans photo',
  'kit-faible': 'Photo faible ou non notée',
  'kit-complement': 'Complété par un autre sujet',
  'vivier-maigre': 'Sujet peu couvert par la banque',
  manque: 'Manque signalé (MANQUES.md)',
};

export type TrouImage = {
  /** Clé stable : <sujet>|<emplacement> */
  id: string;
  sujet: string;
  emplacement: string;
  raison: RaisonTrou;
  /** 1 (haute) à 3 */
  priorite: 1 | 2 | 3;
  libelle: string;
  details: string[];
  formats: string[];
  /** Hashtags pré-cochés à l'import (emplacement, image-generee) */
  hashtags: string[];
};

export type EntreeTrousKit = { sujet: string; aFaire: readonly EmplacementAFaire[]; vivier?: { photos: number; notees4: number } };
export type ManquePourTrous = { id: string; titre: string; lignes: readonly string[]; priorite?: 'haute' | 'moyenne' | 'basse' | null };

const SUJETS_DES_MOTS: readonly [RegExp, string][] = [
  [/senior/i, 'senior'], [/diab[eè]te/i, 'diabete'], [/\bsport|course|coureur/i, 'sport'], [/enfant/i, 'enfant'], [/ongle/i, 'ongles'],
  [/semelle/i, 'semelles'], [/p[ée]dicurie/i, 'pedicurie'],
];

export const HASHTAG_IMAGE_GENEREE = 'image-generee';

/** Hashtags pré-cochés d'un trou : emplacement (#accueil, #<slug du soin>…), #image-generee */
export const hashtagsDuTrou = (emplacement: string) => [...new Set([hashtagEmplacement(emplacement), HASHTAG_IMAGE_GENEREE])];

/**
 * Trous réels, priorisés : (1) premier écran vide ou complété, manques « haute » ; (2) soins et page sujet vides, photos faibles,
 * vivier maigre (moins de 3 photos ≥ 4 ★), manques « moyenne » ; (3) le reste. La galerie du cabinet n'en fait jamais partie
 * (aucune image générée n'y est admise). Un manque de MANQUES.md qui parle de photos s'ajoute au trou existant du même sujet.
 */
export function trousImages(e: { kits: readonly EntreeTrousKit[]; manques?: readonly ManquePourTrous[] }): TrouImage[] {
  const trous = new Map<string, TrouImage>();
  const ajouter = (t: Omit<TrouImage, 'id' | 'formats' | 'hashtags'>) => {
    if (sujetExclu(t.sujet, t.emplacement) || t.emplacement === 'cabinet') return;
    const id = `${t.sujet}|${t.emplacement}`;
    const deja = trous.get(id);
    if (deja) { deja.priorite = Math.min(deja.priorite, t.priorite) as 1 | 2 | 3; deja.details.push(...t.details.filter((d) => !deja.details.includes(d))); return; }
    trous.set(id, { ...t, id, formats: formatsEmplacement(t.emplacement), hashtags: hashtagsDuTrou(t.emplacement) });
  };
  for (const k of e.kits) {
    for (const a of k.aFaire) {
      const raison: RaisonTrou = a.raison === 'vide' ? 'kit-vide' : a.raison === 'complement' ? 'kit-complement' : 'kit-faible';
      const priorite: 1 | 2 | 3 = a.emplacement === 'accueil' && a.raison !== 'faible' ? 1 : a.raison === 'faible' ? 3 : 2;
      ajouter({ sujet: k.sujet, emplacement: a.emplacement, raison, priorite, libelle: `${libelleSujetKit(k.sujet)} · ${libelleEmplacement(a.emplacement)}`, details: [LIBELLES_RAISONS_TROU[raison]] });
    }
    if (k.vivier && k.vivier.notees4 < 3) {
      ajouter({ sujet: k.sujet, emplacement: 'page-sujet', raison: 'vivier-maigre', priorite: 2, libelle: `${libelleSujetKit(k.sujet)} · ${libelleEmplacement('page-sujet')}`,
        details: [`${LIBELLES_RAISONS_TROU['vivier-maigre']} : ${k.vivier.photos} photo${k.vivier.photos > 1 ? 's' : ''} curée${k.vivier.photos > 1 ? 's' : ''}, ${k.vivier.notees4} notée${k.vivier.notees4 > 1 ? 's' : ''} ≥ 4 ★`] });
    }
  }
  for (const m of e.manques ?? []) {
    const texte = `${m.titre} ${m.lignes.join(' ')}`;
    if (!/photo/i.test(texte) || /postur|r[ée]flexo/i.test(m.titre)) continue;
    const sujets = [...new Set(SUJETS_DES_MOTS.filter(([re]) => re.test(texte)).map(([, s]) => s))];
    const priorite: 1 | 2 | 3 = m.priorite === 'haute' ? 1 : m.priorite === 'moyenne' ? 2 : 3;
    for (const s of sujets) ajouter({ sujet: s, emplacement: 'accueil', raison: 'manque', priorite, libelle: `${libelleSujetKit(s)} · ${libelleEmplacement('accueil')}`, details: [`${m.id} — ${m.titre}`] });
  }
  const ordre = ['enfant', 'sport', 'senior', 'diabete', 'ongles', 'semelles', 'pedicurie', 'general'];
  const rangE = (x: string) => (x === 'accueil' ? 0 : x === 'page-sujet' ? 1 : 2);
  return [...trous.values()].sort((a, b) => a.priorite - b.priorite || ordre.indexOf(a.sujet) - ordre.indexOf(b.sujet) || rangE(a.emplacement) - rangE(b.emplacement) || (a.emplacement < b.emplacement ? -1 : 1));
}
