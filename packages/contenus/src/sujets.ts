// Catalogue de départ : 16 sujets de podologie (8 généraux, 8 par spécialité : sport, enfant, senior, soins).
// Posturologie, biomécanique « posturale » et réflexologie (faible niveau de preuve) : hors catalogue de départ, proposées plus
// tard après validation déontologique (décision de Paul, 2026-10-05) ; garde-fou niveauPreuve dans garde-fous.ts.
//
// Origine : backlog ÉcranZen (studio/catalogue/backlog.json, sujets POD-SUJ-…, conditions éthiques des lots
// production/_programme/2026-09-29-podologie-*-ethique.md), fiches de soins des sites (jeux.ts) et sources de 1er rang.
// Chaque affirmation a été RELUE sur sa source le 2026-10-05 (pages ouvertes, extrait recopié de la page) ; quand la page ne
// disait pas exactement ce que proposait le backlog, la formulation a été ramenée à ce que dit la source (ex. Ameli
// « en fin d'après-midi », « la largeur d'un index », « ne pas porter trop longtemps des chaussures neuves »). Les points
// non trouvés ont été retirés (C8) : « vérifier souvent la pointure », « 1 cm », « ne forcez pas », « limer plutôt que couper ».
// Statut « a-valider » : relecture éthique (GATE 2) et validation par le praticien avant toute publication (phase 2).

import type { Source, Sujet } from './types';

const LE = '2026-10-05';
const src = (id: string, organisme: Source['organisme'], titre: string, url: string, majPage?: string): Source => ({ id, organisme, titre, url, majPage, consulteLe: LE });

// ———————————————————————————————————————————————————— Sources (consultées le 2026-10-05)
const S = {
  amPieds: src('ameli-pieds', 'Ameli', 'Comment prendre soin de ses pieds ?', 'https://www.ameli.fr/assure/sante/bons-gestes/quotidien/prendre-soin-pieds', '31/12/2024'),
  amOiPrev: src('ameli-oi-prevention', 'Ameli', 'Prévention de l’ongle incarné par les soins des pieds', 'https://www.ameli.fr/assure/sante/themes/ongle-incarne/prevention', '11/12/2025'),
  amOiRec: src('ameli-oi-reconnaitre', 'Ameli', 'Reconnaître les symptômes de l’ongle incarné', 'https://www.ameli.fr/assure/sante/themes/ongle-incarne/reconnaitre', '11/12/2025'),
  hasPa: src('has-pied-age', 'HAS', 'Le pied de la personne âgée : approche médicale et prise en charge de pédicurie-podologie — Actualisation (recommandations, 2020), annexe 8 « Chaussures de série »', 'https://www.has-sante.fr/upload/docs/application/pdf/2020-12/00_reco265_pied_personnes_agees__recommandations_-_relecture_et_post_cd_30_11_2020-mel.pdf', 'validé le 26/11/2020'),
  amDiab: src('ameli-diabete-pieds', 'Ameli', 'Suivi des pieds du diabétique', 'https://www.ameli.fr/assure/sante/themes/diabete-adulte/diabete-suivi/suivi-pieds', '22/07/2025'),
  amCorDef: src('ameli-cors-causes', 'Ameli', 'Cors, callosités, durillons : définitions, symptômes et causes', 'https://www.ameli.fr/assure/sante/themes/cors-pieds/definitions-symptomes-causes', '12/08/2025'),
  amCorPrev: src('ameli-cors-prevention', 'Ameli', 'Prévenir les cors, callosités et durillons des pieds', 'https://www.ameli.fr/assure/sante/themes/cors-pieds/prevention', '12/08/2025'),
  amVer: src('ameli-verrues-prevention', 'Ameli', 'Prévenir la survenue de verrues', 'https://www.ameli.fr/assure/sante/themes/verrues/prevention', '27/05/2025'),
  amAmp: src('ameli-ampoules', 'Ameli', 'Éviter les ampoules et les cloques', 'https://www.ameli.fr/assure/sante/themes/ampoules-cloques/eviter-ampoules-cloques', '22/01/2025'),
  csp: src('csp-l4322', 'Légifrance', 'Code de la santé publique, articles L4322-1 (version du 21/05/2023, loi n° 2023-379) et L4322-2', 'https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006171312', 'en vigueur depuis le 21/05/2023'),
  onppComp: src('onpp-competences', 'Ordre des pédicures-podologues', 'Compétences du pédicure-podologue', 'https://www.onpp.fr/exercice/la-profession/competences.html'),
  amSport: src('ameli-activite-securite', 'Ameli', 'L’activité physique selon ses aptitudes et en sécurité', 'https://www.ameli.fr/assure/sante/themes/activite-physique-sante/l-activite-physique-selon-ses-aptitudes-et-en-securite', '26/08/2026'),
  amEntorse: src('ameli-entorse-reprise', 'Ameli', 'Entorse de la cheville : reprise des activités et évolution', 'https://www.ameli.fr/assure/sante/themes/entorse-cheville/reprise-activites-evolution', '03/07/2026'),
  amBoiterie: src('ameli-boiterie-enfant', 'Ameli', 'Mon enfant ou mon adolescent boite : pourquoi ?', 'https://www.ameli.fr/assure/sante/themes/boiterie-enfant-adolescent/mon-enfant-ou-mon-adolescent-boite-pourquoi', '03/12/2025'),
  sofop: src('sofop-pied-plat', 'Société savante', 'SoFOP, « Le pied plat doit-il être vu par le chirurgien ? » (monographie 2022)', 'https://sofop.org/wp-content/uploads/2025/05/monographies/2022/07.pdf'),
  amSem: src('ameli-semelles', 'Ameli', 'Semelles orthopédiques : quelle prise en charge ?', 'https://www.ameli.fr/assure/remboursements/rembourse/medicaments-vaccins-dispositifs-medicaux/semelles-orthopediques-orthese-plantaire-prise-en-charge', '15/01/2026'),
  amChutes: src('ameli-chutes', 'Ameli', 'Prévenir les chutes des personnes âgées', 'https://www.ameli.fr/assure/sante/bons-gestes/seniors/prevenir-chutes-personnes-agees', '24/12/2024'),
  nhsSem: src('nhs-gstt-semelles', 'NHS', 'Guy’s and St Thomas’ NHS Foundation Trust, « Foot insoles »', 'https://www.guysandstthomas.nhs.uk/health-information/foot-insoles', 'janvier 2026'),
} as const;

export const SUJETS: Sujet[] = [
  // ———————————————————————————————— GÉNÉRAUX (8)
  {
    id: 'ongle-incarne-couper-droit', ecranzen: 'POD-SUJ-001', titre: 'Ongle incarné : couper droit', specialite: 'generale', saisons: ['hiver'], mois: [12],
    soins: ['ongle-incarne', 'soins-de-pedicurie'], mention: 'M1', sources: [S.amOiPrev, S.amOiRec],
    affirmations: [
      { texte: 'Couper droit, sans arrondir les coins', source: 'ameli-oi-prevention', extrait: 'coupez vos ongles droits et non en demi-cercle (le coin de l’ongle formant un angle de 90°)' },
      { texte: 'Laisser dépasser l’ongle de 2 à 3 mm', source: 'ameli-oi-prevention', extrait: 'en laissant l’ongle dépasser du bord libre de l’orteil de deux à trois millimètres' },
      { texte: 'Des chaussures et chaussettes qui ne serrent pas les orteils', source: 'ameli-oi-prevention', extrait: 'Portez des chaussures et des chaussettes qui ne vous serrent pas les orteils' },
      { texte: 'Un ongle taillé en demi-cercle, trop court sur les bords, peut s’incarner', source: 'ameli-oi-reconnaitre', extrait: 'Si l’ongle est taillé en demi-cercle, trop court sur les bords, la peau recouvrira le bord' },
    ],
    couverture: { surtitre: 'Ongle incarné', titre: 'Couper ses ongles droit, sans arrondir les coins', visuel: { type: 'bibliotheque', id: 'hallux-dorsal' }, alt: 'Gros orteil vu de dessus, ongle coupé droit.' },
    points: [
      { titre: 'Coupez droit, sans arrondir les coins.', texte: 'Le coin de l’ongle forme un angle droit.', visuel: { type: 'bibliotheque', id: 'hallux-dorsal' }, alt: 'Gros orteil vu de dessus : ongle coupé droit, coins à angle droit.' },
      { titre: 'Laissez dépasser l’ongle de 2 à 3 mm.', texte: 'Trop court sur les bords, il peut s’incarner.', visuel: { type: 'dessin', nom: 'ongle' }, alt: 'Médaillons du gros orteil et de ses voisins, ongle et replis de peau.' },
      { titre: 'Des chaussures qui ne serrent pas les orteils.', texte: 'Chaussettes comprises.', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée vue de profil, sans marque.' },
    ],
    pratique: ['Coupez droit', 'Laissez 2 à 3 mm', 'Rien qui serre les orteils'],
    messageCle: 'Ongle incarné : coupez droit, en laissant dépasser 2 à 3 mm.',
    legende: [
      'Pour limiter le risque d’ongle incarné, Ameli conseille de couper les ongles droit, sans les arrondir, en laissant l’ongle dépasser de deux à trois millimètres.',
      'Un ongle taillé en demi-cercle, trop court sur les bords, peut s’incarner. Des chaussures et des chaussettes qui ne serrent pas les orteils font aussi partie des bons gestes.',
      'Source : ameli.fr, « Prévention de l’ongle incarné » (mise à jour du 11/12/2025).',
    ],
    hashtags: ['ongleincarne', 'santedespieds', 'podologie', 'soinsdespieds', 'prevention'],
    google: 'Ongle incarné : les bons gestes de coupe. Ameli conseille de couper les ongles droit, sans arrondir les coins, en laissant dépasser l’ongle de deux à trois millimètres. Un ongle taillé en demi-cercle, trop court sur les bords, peut s’incarner. Des chaussures et des chaussettes qui ne serrent pas les orteils font aussi partie de la prévention.',
    statut: 'a-valider', conditions: 'ÉcranZen 001 : « limiter le risque » ; pas d’ongle infecté ; « coupez droit », jamais « coupez l’ongle droit ».',
  },
  {
    id: 'bien-choisir-ses-chaussures', ecranzen: 'POD-SUJ-010', titre: 'Bien choisir ses chaussures', specialite: 'generale', saisons: ['hiver'], mois: [2],
    soins: ['bilan-podologique'], mention: 'M3-a', sources: [S.amPieds, S.hasPa],
    affirmations: [
      { texte: 'Essayer ses chaussures en fin d’après-midi, quand les pieds sont un peu gonflés', source: 'ameli-pieds', extrait: 'faites des essayages en fin d’après-midi, quand vos pieds sont un peu gonflés' },
      { texte: 'Garder la largeur d’un index devant l’orteil le plus long', source: 'ameli-pieds', extrait: 'un espace de la largeur d’un index doit être présent entre votre orteil le plus long et le bout de la chaussure' },
      { texte: 'Une chaussure fermée à l’arrière maintient le talon', source: 'ameli-pieds', extrait: 'Le maintien du talon est obtenu grâce à des chaussures fermées à l’arrière' },
      { texte: 'Un talon bas et large', source: 'has-pied-age', extrait: 'des chaussures à talon bas, à assise large avec assise horizontale sous le talon' },
    ],
    couverture: { surtitre: 'Chaussures', titre: 'Bien choisir ses chaussures : trois repères', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée vue de profil, talon bas, sans marque.' },
    points: [
      { titre: 'Essayez-les en fin d’après-midi.', texte: 'Les pieds sont alors un peu gonflés.', visuel: { type: 'bibliotheque', id: 'pied-dorsal' }, alt: 'Pied adulte vu de dessus, orteils détaillés.' },
      { titre: 'La largeur d’un index devant l’orteil le plus long.', texte: 'Debout, chaussure lacée.', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée de profil, espace à l’avant du pied.' },
      { titre: 'Fermée à l’arrière, avec un talon bas et large.', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée à l’arrière, talon bas et large.' },
    ],
    pratique: ['En fin d’après-midi', 'Largeur d’un index devant', 'Fermée à l’arrière'],
    messageCle: 'Chaussures : la largeur d’un index devant l’orteil le plus long.',
    legende: [
      'Trois repères pour choisir ses chaussures, d’après Ameli et la HAS.',
      'Essayez-les en fin d’après-midi, quand les pieds sont un peu gonflés. Gardez la largeur d’un index entre l’orteil le plus long et le bout de la chaussure. Préférez une chaussure fermée à l’arrière, qui maintient le talon, avec un talon bas et large.',
      'Sources : ameli.fr, « Comment prendre soin de ses pieds ? » (31/12/2024) ; HAS, « Le pied de la personne âgée » (2020).',
    ],
    hashtags: ['chaussures', 'santedespieds', 'podologie', 'conseilsante'],
    google: 'Bien choisir ses chaussures : trois repères. Essayez-les en fin d’après-midi, quand les pieds sont un peu gonflés (Ameli). Gardez la largeur d’un index entre l’orteil le plus long et le bout de la chaussure. Préférez une chaussure fermée à l’arrière, qui maintient le talon, avec un talon bas et large (HAS, 2020).',
    statut: 'a-valider', conditions: 'ÉcranZen 010 : ni magasin ni marque ; « la largeur d’un index » (pièges 010).',
  },
  {
    id: 'secher-entre-les-orteils', ecranzen: 'POD-SUJ-008', titre: 'Après la douche : sécher entre les orteils', specialite: 'generale', saisons: ['ete'], mois: [6],
    soins: ['soins-de-pedicurie'], mention: 'M1', sources: [S.amPieds, S.hasPa],
    affirmations: [
      { texte: 'Se laver les pieds chaque jour', source: 'ameli-pieds', extrait: 'se laver les pieds une fois par jour, ou davantage si vous êtes sujet à une transpiration excessive' },
      { texte: 'Bien sécher entre les orteils', source: 'ameli-pieds', extrait: 'Veillez en particulier à bien les sécher entre les orteils : cela prévient la macération' },
      { texte: 'Peau sèche : une crème hydratante, sauf entre les orteils', source: 'ameli-pieds', extrait: 'utilisez une crème hydratante en les massant doucement. Toutefois, évitez les espaces entre les orteils' },
    ],
    couverture: { surtitre: 'Hygiène des pieds', titre: 'Après la douche, séchez bien entre les orteils', visuel: { type: 'bibliotheque', id: 'pied-dorsal' }, alt: 'Pied vu de dessus, orteils détaillés.' },
    points: [
      { titre: 'Lavez vos pieds chaque jour.', visuel: { type: 'bibliotheque', id: 'pied-dorsal' }, alt: 'Pied adulte vu de dessus, orteils détaillés.' },
      { titre: 'Séchez bien entre les orteils.', texte: 'Cela prévient la macération.', visuel: { type: 'bibliotheque', id: 'pied-dorsal' }, alt: 'Pied vu de dessus, espaces entre les orteils.' },
      { titre: 'Peau sèche : une crème, sauf entre les orteils.', visuel: { type: 'bibliotheque', id: 'pied-plantaire' }, alt: 'Plante du pied vue de dessous.' },
    ],
    pratique: ['Laver chaque jour', 'Sécher entre les orteils', 'Crème partout, sauf entre'],
    messageCle: 'Après la douche, séchez bien entre les orteils.',
    legende: [
      'Un geste simple après la douche : bien sécher les pieds, en particulier entre les orteils. Selon Ameli, cela prévient la macération.',
      'Si la peau est sèche, une crème hydratante peut s’appliquer en massant doucement, sauf entre les orteils.',
      'Source : ameli.fr, « Comment prendre soin de ses pieds ? » (31/12/2024).',
    ],
    hashtags: ['hygiene', 'santedespieds', 'podologie', 'soinsdespieds'],
    google: 'Hygiène des pieds : après la douche, séchez bien vos pieds, en particulier entre les orteils ; selon Ameli, cela prévient la macération. Si la peau est sèche, une crème hydratante s’applique en massant doucement, sauf entre les orteils.',
    statut: 'a-valider', conditions: 'ÉcranZen 008 : « partout… sauf entre » indissociable ; pas de peau blanchie ni de couleur sur la peau.',
  },
  {
    id: 'diabete-regarder-ses-pieds', ecranzen: 'POD-SUJ-004', titre: 'Diabète : regarder ses pieds chaque jour', specialite: 'generale', saisons: ['automne'], mois: [11],
    soins: ['pied-diabetique'], mention: 'M2', sources: [S.amDiab, S.amPieds],
    affirmations: [
      { texte: 'Examiner ses pieds chaque jour en cas de diabète', source: 'ameli-diabete-pieds', extrait: 'Prendre soin de ses pieds en les examinant chaque jour est essentiel en cas de diabète.' },
      { texte: 'Y compris le dessous des pieds : un miroir ou un proche peut aider', source: 'ameli-diabete-pieds', extrait: 'il est possible d’utiliser un miroir, ou de se faire aider par un proche' },
      { texte: 'Au moindre élément anormal, consulter rapidement son médecin', source: 'ameli-diabete-pieds', extrait: 'Si vous détectez la moindre lésion, ou un élément qui vous paraît anormal, il est recommandé de consulter rapidement votre médecin.' },
      { texte: 'Un examen des pieds au moins une fois par an', source: 'ameli-diabete-pieds', extrait: 'Faire examiner ses pieds par son médecin au moins 1 fois par an est important' },
    ],
    couverture: { surtitre: 'Diabète', titre: 'Diabète : regarder ses pieds chaque jour', visuel: { type: 'bibliotheque', id: 'pied-plantaire' }, alt: 'Plante du pied vue de dessous.' },
    points: [
      { titre: 'Chaque jour, regardez vos pieds.', texte: 'Dessus et dessous.', visuel: { type: 'bibliotheque', id: 'pied-dorsal' }, alt: 'Pied adulte vu de dessus, orteils détaillés.' },
      { titre: 'Le dessous ? Un miroir ou un proche peut aider.', visuel: { type: 'bibliotheque', id: 'pied-plantaire' }, alt: 'Plante du pied vue de dessous.' },
      { titre: 'Une fois par an, faites examiner vos pieds.', visuel: { type: 'dessin', nom: 'diabete' }, alt: 'Schéma du pied et des trois points du test au monofilament.' },
    ],
    pratique: ['Regarder chaque jour', 'Dessus et dessous', 'Un examen par an'],
    messageCle: 'Diabète : regardez vos pieds chaque jour, dessus et dessous.',
    legende: [
      'Avec un diabète, Ameli rappelle qu’examiner ses pieds chaque jour est essentiel. Le dessous des pieds est difficile à voir : un miroir ou un proche peut aider.',
      'Faire examiner ses pieds au moins une fois par an est aussi important.',
      'Source : ameli.fr, « Suivi des pieds du diabétique » (22/07/2025).',
    ],
    hashtags: ['diabete', 'piedsdiabetiques', 'santedespieds', 'prevention'],
    google: 'Diabète : regarder ses pieds chaque jour. Selon Ameli, examiner ses pieds chaque jour est essentiel en cas de diabète ; pour le dessous des pieds, un miroir ou un proche peut aider. Un examen des pieds au moins une fois par an est aussi recommandé.',
    statut: 'a-valider', conditions: 'ÉcranZen 004 : M2 (médecin) ; aucune plaie ni amputation ; pas de rouge ; carton diabète jamais extrait seul.',
  },
  {
    id: 'cor-chaussure-qui-appuie', ecranzen: 'POD-SUJ-009', titre: 'Cor au pied : souvent une chaussure qui appuie', specialite: 'generale', saisons: ['printemps'], mois: [3],
    soins: ['soins-de-pedicurie'], mention: 'M3', sources: [S.amCorDef, S.amCorPrev, S.csp],
    affirmations: [
      { texte: 'Un cor vient de frottements répétés ou d’une compression de la peau', source: 'ameli-cors-causes', extrait: 'de frottements répétés dans les chaussures ; d’une compression excessive de la peau contre la saillie d’un os' },
      { texte: 'Porter des chaussures assez larges, adaptées à la forme des pieds', source: 'ameli-cors-prevention', extrait: 'il est conseillé de porter des chaussures assez larges, adaptées à la forme des pieds' },
      { texte: 'Les affections des couches cornées relèvent du pédicure-podologue', source: 'csp-l4322', extrait: 'ont seuls qualité pour traiter directement les affections épidermiques, limitées aux couches cornées' },
    ],
    couverture: { surtitre: 'Cor au pied', titre: 'Un cor ? Souvent une chaussure qui appuie', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée vue de profil.' },
    points: [
      { titre: 'Un cor vient d’un frottement ou d’une pression répétés.', visuel: { type: 'bibliotheque', id: 'pied-dorsal' }, alt: 'Pied adulte vu de dessus, orteils détaillés.' },
      { titre: 'Des chaussures assez larges, adaptées à vos pieds.', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée de profil, sans marque.' },
    ],
    pratique: ['Chaussures assez larges', 'Adaptées à la forme du pied'],
    messageCle: 'Un cor vient souvent d’une chaussure qui frotte ou appuie.',
    legende: [
      'Selon Ameli, un cor se forme à cause de frottements répétés dans les chaussures ou d’une compression de la peau contre un os.',
      'Pour le prévenir, Ameli conseille des chaussures assez larges, adaptées à la forme des pieds. Les soins des couches cornées de la peau du pied relèvent du pédicure-podologue (Code de la santé publique, art. L4322-1).',
      'Sources : ameli.fr, « Cors, callosités, durillons » (12/08/2025) ; Légifrance, CSP L4322-1.',
    ],
    hashtags: ['cor', 'chaussures', 'santedespieds', 'podologie'],
    google: 'Cor au pied : souvent une chaussure qui appuie. Selon Ameli, un cor vient de frottements répétés dans les chaussures ou d’une compression de la peau contre un os. Des chaussures assez larges, adaptées à la forme des pieds, aident à le prévenir.',
    statut: 'a-valider', conditions: 'ÉcranZen 009 : titre « souvent une chaussure qui appuie » ; pas de coricide ni de produit (C1) ; pas de cor réaliste.',
  },
  {
    id: 'piscine-sandales-verrues', ecranzen: 'POD-SUJ-018', titre: 'Piscine et vestiaires : des sandales', specialite: 'generale', saisons: ['ete'], mois: [7],
    soins: ['verrues-plantaires', 'soins-de-pedicurie'], mention: 'M1', sources: [S.amVer],
    affirmations: [
      { texte: 'Porter des sandales ou des tongs à la piscine, aux vestiaires, aux douches collectives', source: 'ameli-verrues-prevention', extrait: 'portez des sandales ou des tongs dans ces endroits' },
      { texte: 'Bien sécher ses pieds après la piscine', source: 'ameli-verrues-prevention', extrait: 'séchez-vous les pieds après une douche ou un bain et a fortiori après un bain dans une piscine collective' },
      { texte: 'Ne pas partager serviette et chaussures avec une personne qui a des verrues', source: 'ameli-verrues-prevention', extrait: 'ne partagez pas ses chaussettes ou ses chaussures si elle a des verrues plantaires' },
    ],
    couverture: { surtitre: 'Verrues', titre: 'Piscine et vestiaires : des sandales aux pieds', visuel: { type: 'bibliotheque', id: 'sandale-piscine-dorsal', etat: 'tong-posee' }, alt: 'Tong posée, vue de dessus.' },
    points: [
      { titre: 'Piscine, douches, vestiaires : sandales ou tongs.', visuel: { type: 'bibliotheque', id: 'sandale-piscine-dorsal', etat: 'claquette-posee' }, alt: 'Sandale de piscine vue de dessus.' },
      { titre: 'Après le bain, séchez bien vos pieds.', visuel: { type: 'bibliotheque', id: 'pied-dorsal' }, alt: 'Pied adulte vu de dessus, orteils détaillés.' },
      { titre: 'Serviette et chaussures : chacun les siennes.', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée vue de profil, sans marque.' },
    ],
    pratique: ['Sandales au bord du bassin', 'Pieds bien séchés', 'Serviette personnelle'],
    messageCle: 'Piscine et vestiaires : sandales aux pieds, pieds bien séchés.',
    legende: [
      'Pour prévenir les verrues, Ameli conseille de ne pas marcher pieds nus aux abords des piscines, dans les vestiaires et les douches collectives : portez des sandales ou des tongs.',
      'Séchez bien vos pieds après le bain, et ne partagez pas serviette, chaussettes ou chaussures avec une personne qui a des verrues.',
      'Source : ameli.fr, « Prévenir la survenue de verrues » (27/05/2025).',
    ],
    hashtags: ['verrues', 'piscine', 'santedespieds', 'prevention'],
    google: 'Piscine et vestiaires : pour prévenir les verrues, Ameli conseille de porter des sandales ou des tongs aux abords des piscines, dans les vestiaires et les douches collectives, de bien sécher ses pieds après le bain et de ne pas partager serviette ou chaussures avec une personne qui a des verrues.',
    statut: 'a-valider', conditions: 'ÉcranZen 018 : pas de verrue ni de traitement montrés ; pas de stigmatisation ; ni M2 ni carton diabète (verrues).',
  },
  {
    id: 'ampoules-chaussures-neuves', ecranzen: 'POD-SUJ-019', titre: 'Ampoules : chaussures neuves', specialite: 'generale', saisons: ['ete'], mois: [8],
    soins: ['soins-de-pedicurie'], mention: 'M1-b', sources: [S.amAmp, S.amPieds],
    affirmations: [
      { texte: 'Ne pas porter trop longtemps des chaussures neuves', source: 'ameli-ampoules', extrait: 'évitez de mettre vos chaussures neuves trop longtemps' },
      { texte: 'Garder les pieds au sec', source: 'ameli-ampoules', extrait: 'gardez les pieds au sec car les ampoules se développent plus facilement sur une peau humide' },
      { texte: 'Pieds fragiles : des chaussettes sans coutures', source: 'ameli-pieds', extrait: 'si vos pieds sont fragiles, mieux vaut mettre des bas ou chaussettes sans coutures' },
    ],
    couverture: { surtitre: 'Ampoules', titre: 'Chaussures neuves : pas trop longtemps au début', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée neuve vue de profil.' },
    points: [
      { titre: 'Chaussures neuves : pas trop longtemps d’affilée.', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée vue de profil, sans marque.' },
      { titre: 'Gardez les pieds au sec.', texte: 'Une peau humide frotte davantage.', visuel: { type: 'bibliotheque', id: 'pied-dorsal' }, alt: 'Pied adulte vu de dessus, orteils détaillés.' },
      { titre: 'Pieds fragiles : chaussettes sans coutures.', visuel: { type: 'bibliotheque', id: 'pied-plantaire' }, alt: 'Plante du pied vue de dessous.' },
    ],
    pratique: ['Pas trop longtemps au début', 'Pieds au sec', 'Chaussettes sans coutures'],
    messageCle: 'Chaussures neuves : ne les portez pas trop longtemps au début.',
    legende: [
      'Les ampoules se développent plus facilement sur une peau humide, rappelle Ameli : gardez les pieds au sec, et ne portez pas trop longtemps des chaussures neuves.',
      'Si vos pieds sont fragiles, des chaussettes sans coutures sont préférables.',
      'Sources : ameli.fr, « Éviter les ampoules et les cloques » (22/01/2025) ; « Comment prendre soin de ses pieds ? » (31/12/2024).',
    ],
    hashtags: ['ampoules', 'chaussures', 'santedespieds', 'randonnee'],
    google: 'Ampoules : avec des chaussures neuves, ne les portez pas trop longtemps au début et gardez les pieds au sec, car les ampoules se développent plus facilement sur une peau humide (Ameli). Pieds fragiles : préférez des chaussettes sans coutures.',
    statut: 'a-valider', conditions: 'ÉcranZen 019 : pas d’ampoule percée, aucune marque.',
  },
  {
    id: 'pedicure-podologue-qui-est-ce', ecranzen: 'POD-SUJ-020', titre: 'Le pédicure-podologue, qui est-ce ?', specialite: 'generale', saisons: ['automne'], mois: [10],
    soins: ['soins-de-pedicurie', 'semelles-orthopediques'], mention: 'M1-a', sources: [S.csp, S.onppComp],
    affirmations: [
      { texte: 'Une profession médicale à compétence définie', source: 'onpp-competences', extrait: 'une profession médicale à compétence définie' },
      { texte: 'Soigne la peau (couches cornées) et les ongles du pied, sans chirurgie', source: 'csp-l4322', extrait: 'ont seuls qualité pour traiter directement les affections épidermiques, limitées aux couches cornées et les affections unguéales du pied' },
      { texte: 'Soins d’hygiène, semelles', source: 'csp-l4322', extrait: 'Ils ont également seuls qualité pour pratiquer les soins d’hygiène, confectionner et appliquer les semelles' },
      { texte: 'Peut prescrire des orthèses plantaires, sauf avis contraire du médecin traitant', source: 'csp-l4322', extrait: 'peuvent prescrire des orthèses plantaires, sauf avis contraire du médecin traitant' },
      { texte: 'Inscription obligatoire au tableau de l’Ordre', source: 'csp-l4322', extrait: 'Nul ne peut exercer la profession de pédicure-podologue […] s’il n’est inscrit au tableau tenu par l’ordre' },
    ],
    couverture: { surtitre: 'La profession', titre: 'Le pédicure-podologue, qui est-ce ?', visuel: { type: 'dessin', nom: 'soin' }, alt: 'Schéma du pied vu de dessus et médaillon du gros orteil.' },
    points: [
      { titre: 'Une profession médicale à compétence définie.', texte: 'Inscrite au tableau de l’Ordre.', visuel: { type: 'dessin', nom: 'analyse' }, alt: 'Schéma d’un examen des appuis du pied.' },
      { titre: 'Peau et ongles du pied.', texte: 'Couches superficielles de la peau, ongles, soins d’hygiène.', visuel: { type: 'dessin', nom: 'soin' }, alt: 'Schéma du pied et médaillon du gros orteil.' },
      { titre: 'Les semelles orthopédiques.', texte: 'Il les conçoit, les fabrique et peut les prescrire.', visuel: { type: 'bibliotheque', id: 'semelle-orthopedique', vue: 'dessus' }, alt: 'Semelle orthopédique vue de dessus, sans marque.' },
    ],
    pratique: ['Peau et ongles du pied', 'Semelles orthopédiques', 'Inscrit à l’Ordre'],
    messageCle: 'Le pédicure-podologue soigne la peau et les ongles du pied.',
    legende: [
      'Le pédicure-podologue exerce une profession médicale à compétence définie (Ordre des pédicures-podologues). Il est inscrit au tableau de l’Ordre.',
      'Le Code de la santé publique (art. L4322-1) lui confie le traitement des affections de la peau limitées aux couches cornées et des ongles du pied, hors chirurgie, les soins d’hygiène, la confection et l’application des semelles. Depuis 2023, il peut prescrire des orthèses plantaires, sauf avis contraire du médecin traitant.',
      'Sources : Légifrance, CSP L4322-1 et L4322-2 ; onpp.fr, « Compétences ».',
    ],
    hashtags: ['pedicurepodologue', 'podologie', 'santedespieds', 'professiondesante'],
    google: 'Le pédicure-podologue exerce une profession médicale à compétence définie et est inscrit au tableau de l’Ordre. Le Code de la santé publique (art. L4322-1) lui confie les soins de la peau limités aux couches cornées et des ongles du pied (hors chirurgie), les soins d’hygiène et les semelles orthopédiques, qu’il peut prescrire sauf avis contraire du médecin traitant.',
    statut: 'a-valider', conditions: 'ÉcranZen 020 : aligné sur L4322-1 ; ni comparaison ni exclusivité ; pas de logo de l’Ordre ; « sauf avis contraire du médecin traitant » obligatoire dès qu’on parle de prescription.',
  },

  // ———————————————————————————————— SPORT (2)
  {
    id: 'reprendre-le-sport-progressivement', ecranzen: 'POD-SUJ-022', titre: 'Reprendre le sport : progressivement', specialite: 'sport', saisons: ['hiver', 'rentree'], mois: [1],
    soins: ['podologie-du-sport'], mention: 'M1', sources: [S.amSport],
    affirmations: [
      { texte: 'Commencer doucement et augmenter progressivement, par paliers', source: 'ameli-activite-securite', extrait: 'commencez par une activité d’intensité faible ou modérée et augmentez progressivement par palier' },
      { texte: 'S’échauffer 5 à 10 minutes', source: 'ameli-activite-securite', extrait: 'Respectez toujours un échauffement : 5 à 10 minutes d’activités cardiorespiratoires et musculaires progressives' },
      { texte: 'Au moindre doute, demander conseil à son médecin avant de commencer', source: 'ameli-activite-securite', extrait: 'Au moindre doute, avant de commencer une activité physique, demandez conseil à votre médecin.' },
    ],
    couverture: { surtitre: 'Reprise du sport', titre: 'Reprendre le sport : progressivement, par paliers', visuel: { type: 'dessin', nom: 'sport' }, alt: 'Schéma d’un coureur en analyse de foulée.' },
    points: [
      { titre: 'Commencez doucement, puis augmentez par paliers.', visuel: { type: 'dessin', nom: 'sport' }, alt: 'Schéma d’un coureur.' },
      { titre: 'Échauffez-vous avant chaque séance.', texte: 'Ameli parle de 5 à 10 minutes.', alt: 'Carton de texte : échauffez-vous avant chaque séance, 5 à 10 minutes selon Ameli.' },
    ],
    pratique: ['Commencer doucement', 'Augmenter par paliers', 'S’échauffer avant'],
    messageCle: 'Reprendre le sport : doucement, par paliers, après un échauffement.',
    legende: [
      'Reprendre une activité physique ? Ameli conseille de commencer par une intensité faible ou modérée, puis d’augmenter progressivement, par paliers, et de toujours s’échauffer : 5 à 10 minutes d’activités progressives.',
      'Au moindre doute, avant de commencer, demandez conseil à votre médecin.',
      'Source : ameli.fr, « L’activité physique selon ses aptitudes et en sécurité » (26/08/2026).',
    ],
    hashtags: ['sport', 'reprisedusport', 'course', 'santedespieds'],
    google: 'Reprendre le sport : Ameli conseille de commencer par une intensité faible ou modérée, d’augmenter progressivement par paliers et de toujours s’échauffer 5 à 10 minutes. Au moindre doute, demandez conseil à votre médecin avant de commencer.',
    statut: 'a-valider', conditions: 'ÉcranZen 022 : aucun pourcentage à l’écran ; paliers sans chiffre ; jamais « évite les blessures ».',
  },
  {
    id: 'proteger-ses-chevilles', ecranzen: 'POD-SUJ-026', titre: 'Protéger ses chevilles : 3 gestes', specialite: 'sport', saisons: ['printemps'], mois: [5],
    soins: ['podologie-du-sport'], mention: 'M1', sources: [S.amEntorse],
    affirmations: [
      { texte: 'S’échauffer avant toute activité sportive', source: 'ameli-entorse-reprise', extrait: 'n’oubliez pas de vous échauffez avant toute activité sportive' },
      { texte: 'Pour la randonnée, des chaussures de marche plutôt que des baskets', source: 'ameli-entorse-reprise', extrait: 'mettez des chaussures de marche pour faire de la randonnée et non des baskets' },
      { texte: 'Des exercices de stabilité des jambes et des pieds', source: 'ameli-entorse-reprise', extrait: 'faites des exercices pour améliorer et entretenir la stabilité des articulations de vos jambes et de vos pieds' },
    ],
    couverture: { surtitre: 'Chevilles', titre: 'Protéger ses chevilles : trois gestes', visuel: { type: 'dessin', nom: 'equilibre' }, alt: 'Schéma de l’appui sur un pied et de ses petites oscillations.' },
    points: [
      { titre: 'Échauffez-vous avant le sport.', visuel: { type: 'dessin', nom: 'sport' }, alt: 'Schéma d’un coureur.' },
      { titre: 'Randonnée : des chaussures de marche.', texte: 'Plutôt que des baskets.', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée de profil, sans marque.' },
      { titre: 'Des exercices de stabilité.', texte: 'Pour les chevilles et les pieds.', visuel: { type: 'dessin', nom: 'equilibre' }, alt: 'Schéma de l’appui sur un pied.' },
    ],
    pratique: ['S’échauffer', 'Chaussures adaptées', 'Exercices de stabilité'],
    messageCle: 'Chevilles : échauffement, chaussures adaptées, exercices de stabilité.',
    legende: [
      'Trois gestes pour les chevilles, d’après Ameli : s’échauffer avant toute activité sportive, porter des chaussures de marche pour la randonnée plutôt que des baskets, et faire des exercices pour entretenir la stabilité des articulations des jambes et des pieds.',
      'Source : ameli.fr, « Entorse de la cheville : reprise des activités et évolution » (03/07/2026).',
    ],
    hashtags: ['chevilles', 'sport', 'randonnee', 'santedespieds'],
    google: 'Protéger ses chevilles : Ameli conseille de s’échauffer avant toute activité sportive, de porter des chaussures de marche pour la randonnée plutôt que des baskets, et de faire des exercices pour entretenir la stabilité des articulations des jambes et des pieds.',
    statut: 'a-valider', conditions: 'ÉcranZen 026 : ni orthèse ni chevillère ; stabilité sans matériel ni protocole chiffré ; aucune main sur le pied.',
  },

  // ———————————————————————————————— ENFANT (2)
  {
    id: 'enfant-chaussures-a-la-bonne-taille', ecranzen: 'POD-SUJ-011', titre: 'Rentrée : des chaussures à la bonne taille', specialite: 'enfant', saisons: ['rentree'], mois: [9],
    soins: ['podologie-enfant'], mention: 'M1-c', sources: [S.amBoiterie, S.amPieds],
    affirmations: [
      { texte: 'Les pieds des enfants grandissent vite ; les chaussures deviennent étroites et trop courtes', source: 'ameli-boiterie-enfant', extrait: 'Les pieds grandissent vite et les chaussures deviennent étroites et trop courtes' },
      { texte: 'La largeur d’un index entre l’orteil le plus long et le bout de la chaussure', source: 'ameli-pieds', extrait: 'un espace de la largeur d’un index doit être présent entre votre orteil le plus long et le bout de la chaussure' },
      { texte: 'Essayer en fin d’après-midi', source: 'ameli-pieds', extrait: 'faites des essayages en fin d’après-midi, quand vos pieds sont un peu gonflés' },
    ],
    couverture: { surtitre: 'Enfants', titre: 'Les pieds des enfants grandissent vite', visuel: { type: 'dessin', nom: 'enfant' }, alt: 'Le même pied à 1, 3, 6 et 10 ans, alignés au talon.' },
    points: [
      { titre: 'Les chaussures deviennent vite trop courtes.', texte: 'Ou trop étroites.', visuel: { type: 'dessin', nom: 'enfant' }, alt: 'Le pied de l’enfant qui grandit, de 1 à 10 ans.' },
      { titre: 'La largeur d’un index devant l’orteil le plus long.', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée de profil, espace à l’avant.' },
    ],
    pratique: ['Essayer debout', 'Largeur d’un index devant', 'En fin d’après-midi'],
    messageCle: 'Enfants : les pieds grandissent vite, les chaussures raccourcissent.',
    legende: [
      'Les pieds des enfants grandissent vite, et les chaussures deviennent étroites et trop courtes, rappelle Ameli.',
      'Au moment de l’essayage, la largeur d’un index entre l’orteil le plus long et le bout de la chaussure est un bon repère ; les essayages se font de préférence en fin d’après-midi.',
      'Sources : ameli.fr, « Mon enfant ou mon adolescent boite : pourquoi ? » (03/12/2025) ; « Comment prendre soin de ses pieds ? » (31/12/2024).',
    ],
    hashtags: ['enfants', 'rentree', 'chaussures', 'santedespieds'],
    google: 'Rentrée : les pieds des enfants grandissent vite et les chaussures deviennent étroites et trop courtes (Ameli). À l’essayage, gardez la largeur d’un index entre l’orteil le plus long et le bout de la chaussure, de préférence en fin d’après-midi.',
    statut: 'a-valider', conditions: 'ÉcranZen 011 : aucune fréquence chiffrée (non sourcée, retirée) ; pas de décor commercial ni d’incitation à l’achat.',
  },
  {
    id: 'pied-plat-enfant-souvent-normal', ecranzen: 'POD-SUJ-016', titre: 'Pied plat de l’enfant : souvent normal', specialite: 'enfant', saisons: ['rentree'], mois: [9],
    soins: ['podologie-enfant'], mention: 'M3', sources: [S.sofop, S.amSem],
    interdits: ['inutile', 'ne servent à rien', 'pas besoin', 'de série', 'magasin', 'pharmacie'],
    affirmations: [
      { texte: 'Chez le jeune enfant, une voûte abaissée est une phase normale du développement', source: 'sofop-pied-plat', extrait: 'une voûte plantaire abaissée est une phase normale du développement durant cette période' },
      { texte: 'En cas de raideur ou de douleur, un avis est recommandé', source: 'sofop-pied-plat', extrait: 'En cas de raideur ou de douleur, un avis chirurgical est recommandé.' },
      { texte: 'En l’absence de douleur ou de gêne, le rôle préventif des semelles n’est pas prouvé', source: 'ameli-semelles', extrait: 'troubles statiques asymptomatiques (sans signe) particulièrement fréquent chez l’enfant, l’orthèse plantaire n’ayant pas de rôle préventif prouvé' },
    ],
    couverture: { surtitre: 'Enfants', titre: 'Pied plat du jeune enfant : le plus souvent normal', visuel: { type: 'dessin', nom: 'enfant' }, alt: 'Le pied de l’enfant à 1, 3, 6 et 10 ans : la voûte se forme avec l’âge.' },
    points: [
      { titre: 'Chez le jeune enfant, la voûte se forme avec l’âge.', visuel: { type: 'dessin', nom: 'enfant' }, alt: 'Le même pied à 1, 3, 6 et 10 ans.' },
      { titre: 'En l’absence de douleur ou de gêne, des semelles pour prévenir ?', texte: 'Leur rôle préventif n’est pas prouvé.', alt: 'Carton de texte : en l’absence de douleur ou de gêne, le rôle préventif des semelles n’est pas prouvé.' },
    ],
    pratique: ['Le plus souvent normal', 'Douleur ou raideur : en parler'],
    messageCle: 'Jeune enfant : un pied qui paraît plat est le plus souvent normal.',
    legende: [
      'Chez le jeune enfant, une voûte plantaire abaissée est une phase normale du développement : la voûte se forme avec l’âge (Société française d’orthopédie pédiatrique).',
      'En l’absence de douleur ou de gêne, le rôle préventif des semelles orthopédiques n’est pas prouvé chez l’enfant (Ameli). En cas de douleur ou de raideur, un avis est recommandé.',
      'Sources : SoFOP, « Le pied plat doit-il être vu par le chirurgien ? » (2022) ; ameli.fr, « Semelles orthopédiques » (15/01/2026).',
    ],
    hashtags: ['enfants', 'piedplat', 'santedespieds', 'podologie'],
    google: 'Pied plat du jeune enfant : le plus souvent normal. Selon la Société française d’orthopédie pédiatrique, une voûte plantaire abaissée est une phase normale du développement chez le jeune enfant. En l’absence de douleur ou de gêne, le rôle préventif des semelles n’est pas prouvé (Ameli). En cas de douleur ou de raideur, un avis est recommandé.',
    statut: 'a-valider', conditions: 'ÉcranZen 016 : ni âge ni chiffre à l’écran ; « en l’absence de douleur ou de gêne » (= « sans douleur ni gêne », reformulé pour le lexique) indissociable ; M3, jamais M4 ; semelle ni barrée ni jetée.',
  },

  // ———————————————————————————————— SENIOR (2) — prévention des chutes, soins des ongles (HAS 2020)
  {
    id: 'chez-soi-chaussures-qui-tiennent', ecranzen: 'POD-SUJ-012', titre: 'Chez soi aussi, des chaussures qui tiennent le pied', specialite: 'senior', saisons: ['automne', 'hiver'], mois: [10],
    soins: ['podologie-du-senior', 'soins-de-pedicurie'], mention: 'M1', sources: [S.amChutes, S.hasPa],
    affirmations: [
      { texte: 'Des chaussures adaptées à l’intérieur comme à l’extérieur', source: 'has-pied-age', extrait: 'le port de chaussures appropriées à la fois à l’intérieur et l’extérieur de la maison' },
      { texte: 'Un modèle qui tient bien le pied, talons larges et bas', source: 'ameli-chutes', extrait: 'préférez un modèle tenant bien le pied, à talons larges et bas (2 à 3 cm)' },
      { texte: 'Chaussures et chaussons ouverts derrière (mules, claquettes) à proscrire', source: 'has-pied-age', extrait: 'les chaussures et les chaussons ouverts derrière, de type sabots, claquettes, tongs, mules sont à proscrire' },
      { texte: 'Pour limiter le risque de chute', source: 'has-pied-age', extrait: 'les mules sont source de déséquilibre et sont à proscrire pour limiter le risque de chute' },
      { texte: 'Semelles fines, fermes et antidérapantes', source: 'ameli-chutes', extrait: 'semelles fines, fermes et antidérapantes' },
    ],
    couverture: { surtitre: 'À la maison', titre: 'Chez soi aussi, des chaussures qui tiennent le pied', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée à l’arrière vue de profil.' },
    points: [
      { titre: 'Fermées à l’arrière, qui tiennent bien le pied.', texte: 'Plutôt que mules ou claquettes.', alt: 'Carton de texte : des chaussures fermées à l’arrière, qui tiennent bien le pied, plutôt que mules ou claquettes.' },
      { titre: 'Talon large et bas, semelle antidérapante.', visuel: { type: 'bibliotheque', id: 'chaussure-profil-medial' }, alt: 'Chaussure fermée vue de profil : talon large et bas, semelle.' },
    ],
    pratique: ['Fermées à l’arrière', 'Talon large et bas', 'Semelle antidérapante'],
    messageCle: 'À la maison aussi, des chaussures fermées qui tiennent le pied.',
    legende: [
      'À la maison aussi, des chaussures adaptées comptent : la HAS recommande des chaussures appropriées à l’intérieur comme à l’extérieur, et déconseille les chaussons ouverts derrière (mules, claquettes) pour limiter le risque de chute.',
      'Ameli conseille un modèle qui tient bien le pied, à talons larges et bas, avec une semelle fine, ferme et antidérapante.',
      'Sources : ameli.fr, « Prévenir les chutes des personnes âgées » (24/12/2024) ; HAS, « Le pied de la personne âgée » (2020).',
    ],
    hashtags: ['seniors', 'prevention', 'chaussures', 'santedespieds'],
    google: 'Chez soi aussi, des chaussures qui tiennent le pied. La HAS recommande des chaussures adaptées à l’intérieur comme à l’extérieur et déconseille les chaussons ouverts derrière (mules, claquettes) pour limiter le risque de chute. Ameli conseille un modèle qui tient bien le pied, à talons larges et bas, avec une semelle antidérapante.',
    statut: 'a-valider', conditions: 'ÉcranZen 012 : chute non dramatisée ni montrée, pas de caricature de la personne âgée (Semaine bleue).',
  },

  // ———————————————————————————————— SOINS (2) — semelles orthopédiques
  {
    id: 'semelles-orthopediques-c-est-quoi', ecranzen: 'POD-SUJ-038', titre: 'Semelles orthopédiques : qu’est-ce que c’est ?', specialite: 'soins', saisons: ['printemps'], mois: [3],
    soins: ['semelles-orthopediques'], mention: 'M4c-b', sources: [S.amSem, S.csp],
    interdits: ['sur mesure', 'renouvelez', 'chaque année', 'une paire par an', 'sans ordonnance', 'de série', 'du commerce', 'pharmacie', 'posturologie', 'proprioceptive'],
    affirmations: [
      { texte: 'Les semelles orthopédiques, ou orthèses plantaires, sont des dispositifs médicaux', source: 'ameli-semelles', extrait: 'Les semelles orthopédiques aussi appelées orthèses plantaires sont des dispositifs médicaux réalisés sur mesure' },
      { texte: 'Prescrites par un médecin ou, depuis 2023, par un pédicure-podologue', source: 'ameli-semelles', extrait: 'Tout médecin peut prescrire des orthèses plantaires. Depuis 2023, les pédicures-podologues peuvent également en prescrire' },
      { texte: 'Sauf avis contraire du médecin traitant', source: 'csp-l4322', extrait: 'peuvent prescrire des orthèses plantaires, sauf avis contraire du médecin traitant' },
      { texte: 'Le pédicure-podologue fait partie des professionnels qui les fabriquent', source: 'ameli-semelles', extrait: 'les pédicures-podologues ; les podo-orthésistes ; les orthoprothésistes ; les orthopédistes-orthésistes' },
    ],
    couverture: { surtitre: 'Semelles', titre: 'Semelles orthopédiques : qu’est-ce que c’est ?', visuel: { type: 'bibliotheque', id: 'semelle-orthopedique', vue: 'dessus' }, alt: 'Semelle orthopédique vue de dessus, sans marque.' },
    points: [
      { titre: 'Un dispositif médical, aussi appelé orthèse plantaire.', texte: 'Fabriqué pour les pieds de chacun.', visuel: { type: 'bibliotheque', id: 'semelle-dorsal' }, alt: 'Semelle orthopédique vue de dessus : talonnette, soutien de voûte, barre derrière les orteils.' },
      { titre: 'Prescrites par le médecin ou le pédicure-podologue.', texte: 'Depuis 2023, sauf avis contraire du médecin traitant.', alt: 'Carton de texte : les semelles sont prescrites par le médecin ou, depuis 2023, par le pédicure-podologue, sauf avis contraire du médecin traitant.' },
      { titre: 'Le pédicure-podologue peut aussi les fabriquer.', visuel: { type: 'bibliotheque', id: 'semelle-orthopedique', vue: 'dessous' }, alt: 'Semelle orthopédique vue de dessous.' },
    ],
    pratique: ['Un dispositif médical', 'Prescrit par le médecin', 'ou le pédicure-podologue'],
    messageCle: 'Semelles orthopédiques : un dispositif médical, prescrit puis fabriqué.',
    legende: [
      'Les semelles orthopédiques, aussi appelées orthèses plantaires, sont des dispositifs médicaux (Ameli).',
      'Tout médecin peut les prescrire ; depuis 2023, le pédicure-podologue peut également les prescrire, sauf avis contraire du médecin traitant (Code de la santé publique, art. L4322-1). Plusieurs professionnels de santé les fabriquent, dont le pédicure-podologue.',
      'Sources : ameli.fr, « Semelles orthopédiques » (15/01/2026) ; Légifrance, CSP L4322-1.',
    ],
    hashtags: ['semelles', 'orthesesplantaires', 'podologie', 'santedespieds'],
    google: 'Les semelles orthopédiques, aussi appelées orthèses plantaires, sont des dispositifs médicaux (Ameli). Tout médecin peut les prescrire ; depuis 2023, le pédicure-podologue peut également les prescrire, sauf avis contraire du médecin traitant (CSP, art. L4322-1). Plusieurs professionnels de santé les fabriquent, dont le pédicure-podologue.',
    statut: 'a-valider', conditions: 'Lot semelles ÉcranZen (038) : rien ne pousse à « faire faire » des semelles ; aucune prise en charge ni remboursement hors site (règles par canal) ; réserve « sauf avis contraire du médecin traitant » obligatoire dès qu’on parle de prescription ; M4c (sujet = la semelle).',
  },
  {
    id: 'semelles-neuves-progressivement', ecranzen: 'POD-SUJ-033', titre: 'Semelles neuves : les porter progressivement', specialite: 'soins', saisons: ['printemps'], mois: [4],
    soins: ['semelles-orthopediques'], mention: 'M3', sources: [S.nhsSem],
    interdits: ['renouvelez', 'chaque année', 'une paire par an', 'sans ordonnance', 'sur mesure', 'normal d\'avoir mal', 'inconfort est normal', 'ça passe', 'agit', 'mal de dos', 'genoux', 'posturologie', 'proprioceptive'],
    affirmations: [
      { texte: 'Les porter progressivement : un peu plus longtemps chaque jour', source: 'nhs-gstt-semelles', extrait: 'Gradually lengthen the wearing in time by 30 minutes to 1 hour each day' },
      { texte: 'Les semelles sont faites pour le problème du pied de chacun', source: 'nhs-gstt-semelles', extrait: 'Your insoles have been made for your particular foot problem' },
      { texte: 'Une gêne : en parler à son pédicure-podologue', source: 'nhs-gstt-semelles', extrait: 'If the insoles cause severe pain or aching, stop wearing them and let your podiatrist know' },
    ],
    couverture: { surtitre: 'Semelles neuves', titre: 'Semelles neuves : les premiers jours, progressivement', visuel: { type: 'bibliotheque', id: 'semelle-orthopedique', vue: 'dessus' }, alt: 'Semelle orthopédique vue de dessus, sans marque.' },
    points: [
      { titre: 'Un peu plus longtemps chaque jour.', visuel: { type: 'bibliotheque', id: 'semelle-orthopedique', vue: 'profil' }, alt: 'Semelle orthopédique vue de profil.' },
      { titre: 'Comme votre pédicure-podologue vous l’a indiqué.', visuel: { type: 'bibliotheque', id: 'semelle-dorsal' }, alt: 'Semelle orthopédique vue de dessus : talonnette, soutien de voûte, barre derrière les orteils.' },
    ],
    pratique: ['Progressivement', 'Un peu plus chaque jour', 'Selon la consigne reçue'],
    messageCle: 'Semelles neuves : un peu plus longtemps chaque jour.',
    legende: [
      'Des semelles orthopédiques neuves se portent progressivement : un peu plus longtemps chaque jour, comme votre pédicure-podologue vous l’a indiqué. C’est aussi le conseil des services de podologie du NHS (Royaume-Uni).',
      'Votre pédicure-podologue vous indique le rythme qui vous convient.',
      'Source : Guy’s and St Thomas’ NHS Foundation Trust, « Foot insoles » (janvier 2026).',
    ],
    hashtags: ['semelles', 'podologie', 'santedespieds', 'orthesesplantaires'],
    google: 'Semelles orthopédiques neuves : portez-les progressivement, un peu plus longtemps chaque jour, comme votre pédicure-podologue vous l’a indiqué. C’est aussi le conseil des services de podologie du NHS (Royaume-Uni). Votre pédicure-podologue vous indique le rythme qui vous convient.',
    statut: 'a-valider', conditions: 'ÉcranZen 033 (validé éthique 2026-09-30) : aucun chiffre (heures, jours) à l’écran ni dans la légende ; M3 ; rien ne pousse à faire ou refaire des semelles ; jamais après un contenu posturologie (lot 040, hors catalogue).',
  },
  {
    id: 'ongles-epais-se-faire-aider', ecranzen: 'POD-SUJ-003', titre: 'Ongles épais ou difficiles à couper', specialite: 'senior', saisons: ['automne', 'hiver'], mois: [10, 12],
    soins: ['soins-de-pedicurie', 'podologie-du-senior'], mention: 'M1', sources: [S.hasPa, S.amPieds],
    affirmations: [
      { texte: 'Quand on ne peut plus couper ses ongles soi-même, le pédicure-podologue peut s’en charger', source: 'has-pied-age', extrait: 'en cas d’incapacité du patient à réaliser lui-même, ou par un aidant informé, ses soins d’hygiène du pied tels que la coupe d’ongles' },
      { texte: 'Les ongles épais peuvent être affinés régulièrement par le pédicure-podologue', source: 'has-pied-age', extrait: 'Plaques unguéales hypertrophiques (onychosis) : Il est recommandé de les fraiser régulièrement en vue de contrôler leur volume.' },
      { texte: 'Couper droit, puis limer les angles', source: 'ameli-pieds', extrait: 'Limez ensuite chaque ongle, pour que sa bordure et les angles soient lisses' },
    ],
    couverture: { surtitre: 'Ongles', titre: 'Ongles épais ou difficiles à couper ? Se faire aider', visuel: { type: 'bibliotheque', id: 'hallux-dorsal' }, alt: 'Gros orteil vu de dessus, ongle détaillé.' },
    points: [
      { titre: 'Couper ses ongles devient difficile ?', texte: 'Un pédicure-podologue peut s’en charger.', visuel: { type: 'dessin', nom: 'soin' }, alt: 'Schéma du pied et médaillon du gros orteil.' },
      { titre: 'Des ongles épais peuvent être affinés régulièrement.', visuel: { type: 'bibliotheque', id: 'hallux-dorsal' }, alt: 'Gros orteil vu de dessus.' },
      { titre: 'Chez soi : coupez droit, puis limez les angles.', visuel: { type: 'dessin', nom: 'ongle' }, alt: 'Médaillons du gros orteil et de ses voisins.' },
    ],
    pratique: ['Couper droit', 'Limer les angles', 'Difficile ? Se faire aider'],
    messageCle: 'Ongles épais ou difficiles à couper : un pédicure-podologue peut s’en charger.',
    legende: [
      'Avec l’âge, couper ses ongles peut devenir difficile. La HAS recommande d’orienter vers le pédicure-podologue quand on ne peut plus réaliser soi-même ses soins d’hygiène du pied, comme la coupe des ongles ; les ongles épais peuvent être affinés régulièrement.',
      'Chez soi, Ameli conseille de couper droit, puis de limer les angles pour qu’ils soient lisses.',
      'Sources : HAS, « Le pied de la personne âgée » (2020) ; ameli.fr, « Comment prendre soin de ses pieds ? » (31/12/2024).',
    ],
    hashtags: ['ongles', 'seniors', 'soinsdespieds', 'santedespieds'],
    google: 'Ongles épais ou difficiles à couper : la HAS recommande d’orienter vers le pédicure-podologue quand on ne peut plus réaliser soi-même la coupe des ongles ; les ongles épais peuvent être affinés régulièrement. Chez soi, Ameli conseille de couper droit, puis de limer les angles.',
    statut: 'a-valider', conditions: 'ÉcranZen 003 : rester sur « peut », pas « doit » (incitation aux soins) ; cohérent avec 001 ; « ne forcez pas » retiré (non sourcé).',
  },
];

export const sujet = (id: string) => SUJETS.find((s) => s.id === id);
