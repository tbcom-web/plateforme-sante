// Site de démonstration : praticienne, adresse, téléphone et RPPS FICTIFS.
import { modeleIntegre, packVisuel, type SiteConfig } from '@plateforme/core';

// Modèle de la démo (variable MODELE), avec sa couleur conseillée.
const modele = modeleIntegre(process.env.MODELE ?? 'prestige');
// Spécialité de la démo (variable SPECIALITE, secondaire SPECIALITE_SECONDAIRE) ; ANIMATION=non pour la désactiver.
const pack = packVisuel(process.env.SPECIALITE ?? 'generale');

const site: SiteConfig = {
  id: 'demo-podologue-lyon',
  domaine: 'demo.webpodologue.fr',
  demo: true,
  profession: {
    slug: 'podologue',
    libelle: 'Pédicure-podologue',
    specialiteSchema: 'Podiatric',
  },
  praticien: {
    prenom: 'Camille',
    nom: 'Rousseau',
    titre: 'Pédicure-podologue diplômée d’État',
    rpps: '10000000000',
    ordre: 'Inscrite au tableau de l’Ordre des pédicures-podologues (exemple)',
    conventionnement: 'Conventionnée avec l’Assurance Maladie',
    parcours: `Diplômée d’État en pédicurie-podologie, j’exerce en libéral à Lyon depuis 2016. Je me suis formée plus particulièrement à la prise en charge du pied du sportif et au suivi des patients diabétiques.

Au cabinet, je prends le temps d’écouter, d’examiner et d’expliquer. Chaque séance commence par vos questions et se termine par des conseils concrets pour le quotidien.`,
    formations: [
      'Diplôme d’État de pédicure-podologue',
      'Diplôme universitaire de podologie du sport',
      'Formation à la prévention du pied diabétique',
    ],
    langues: ['Français', 'Anglais'],
  },
  cabinet: {
    nom: 'Cabinet de podologie Camille Rousseau',
    adresse: '10 rue de la Démo',
    codePostal: '69006',
    ville: 'Lyon',
    quartier: 'Lyon 6e, quartier des Brotteaux',
    telephone: '04 00 00 00 00',
    acces: ['Métro A, station Foch (5 min à pied)', 'Bus C1 et C4', 'Stationnement payant dans la rue'],
    pmr: true,
    horaires: [
      { jour: 'Lundi', heures: '9h00–12h30, 14h00–19h00' },
      { jour: 'Mardi', heures: '9h00–12h30, 14h00–19h00' },
      { jour: 'Mercredi', heures: '9h00–13h00' },
      { jour: 'Jeudi', heures: '9h00–12h30, 14h00–19h00' },
      { jour: 'Vendredi', heures: '9h00–12h30, 14h00–17h00' },
      { jour: 'Samedi', heures: 'Fermé' },
      { jour: 'Dimanche', heures: 'Fermé' },
    ],
    tarifs: [
      { acte: 'Soin de pédicurie', prix: '35 €' },
      { acte: 'Bilan podologique', prix: '45 €' },
      { acte: 'Semelles orthopédiques (bilan compris)', prix: 'à partir de 150 €' },
      { acte: 'Séance de prévention du pied diabétique', prix: 'prise en charge sur prescription' },
    ],
    geo: { lat: 45.7696, lng: 4.8513 },
  },
  // Lien vers une page précise de la plateforme (un lien vers son accueil fait basculer les boutons sur « Appeler »).
  rdv: { url: 'https://www.doctolib.fr/pedicure-podologue/lyon', plateforme: 'Doctolib' },
  // GAMME=… pour essayer une gamme de couleurs de la charte (sinon couleur libre conseillée par le modèle).
  // MODE_VISUEL=illustrations|photos|mixte pour essayer le style visuel (illustrations par défaut, comme les nouveaux sites).
  // MARQUE=… et DISPOSITION=… pour essayer un logo (logos.ts ; sinon logo par défaut).
  theme: { couleur: modele.couleurConseillee ?? '#2f7d6d', ...(process.env.GAMME ? { gamme: process.env.GAMME } : {}), ...(process.env.MARQUE || process.env.DISPOSITION ? { logo: { marque: process.env.MARQUE ?? '', disposition: (process.env.DISPOSITION ?? 'horizontale') as 'horizontale' } } : {}), modeVisuel: (process.env.MODE_VISUEL ?? 'illustrations') as 'illustrations', mise_en_page: 'chaleureux', style_images: 'organique' },
  accroche: {
    titre: 'Prendre soin de vos pieds, à chaque étape de la vie',
    texte:
      'Pédicure-podologue à Lyon 6e, je vous accueille pour les soins de pédicurie, les semelles orthopédiques, le suivi du pied diabétique et la podologie du sport, de l’enfant au senior.',
  },
  soins: [
    {
      slug: 'bilan-podologique',
      titre: 'Bilan podologique à Lyon 6e',
      titreCourt: 'Bilan podologique',
      resume:
        'Un examen complet de vos pieds, de votre posture et de votre marche pour comprendre l’origine d’une douleur ou d’une gêne.',
      corps: `## À quoi sert un bilan podologique ?

Le bilan podologique permet d’analyser la forme de vos pieds, leurs appuis et la façon dont vous marchez. Il aide à comprendre l’origine de douleurs aux pieds, mais aussi parfois aux genoux, aux hanches ou au dos.

## Comment se déroule la séance ?

1. **Échange** sur vos douleurs, vos activités et vos antécédents.
2. **Examen clinique** des pieds, debout et allongé.
3. **Analyse des appuis** sur podoscope et observation de la marche.
4. **Explications et conseils**. Si besoin, je vous propose des semelles orthopédiques.

Prévoyez environ 45 minutes. Pensez à apporter vos chaussures habituelles et, si vous en avez, vos anciennes semelles et vos examens récents.

## Pour qui ?

Le bilan s’adresse à toute personne qui ressent une gêne en marchant ou en courant, aux enfants dont la marche interroge les parents, et aux sportifs qui reprennent une activité.`,
      faq: [
        {
          q: 'Faut-il une ordonnance pour un bilan podologique ?',
          r: 'Non, vous pouvez prendre rendez-vous directement. Une ordonnance de votre médecin peut toutefois être utile pour le remboursement éventuel de semelles orthopédiques.',
        },
        {
          q: 'Combien de temps dure un bilan podologique ?',
          r: 'Comptez environ 45 minutes, échange, examen et conseils compris.',
        },
        {
          q: 'Que faut-il apporter ?',
          r: 'Vos chaussures portées au quotidien, vos anciennes semelles si vous en avez, et vos examens récents (radiographies, comptes rendus).',
        },
      ],
    },
    {
      slug: 'semelles-orthopediques',
      titre: 'Semelles orthopédiques sur mesure à Lyon',
      titreCourt: 'Semelles orthopédiques',
      resume:
        'Des orthèses plantaires conçues pour vos pieds et vos chaussures, après un bilan complet.',
      corps: `## Des semelles faites pour vous

Les semelles orthopédiques, ou orthèses plantaires, sont fabriquées sur mesure après un bilan podologique. Elles visent à mieux répartir les appuis et à limiter certaines contraintes lors de la marche ou du sport.

## Les étapes

1. **Bilan podologique** pour comprendre vos appuis.
2. **Prise d’empreinte** de vos pieds.
3. **Fabrication** des semelles, adaptées à vos chaussures (ville, travail, sport).
4. **Essayage et contrôle** quelques semaines après, pour ajuster si nécessaire.

## Remboursement

Sur prescription médicale, les semelles orthopédiques sont prises en charge en partie par l’Assurance Maladie, sur la base de son tarif de remboursement. Votre complémentaire santé peut compléter selon votre contrat. Un devis vous est remis avant fabrication.`,
      faq: [
        {
          q: 'Combien de temps faut-il pour s’habituer à des semelles ?',
          r: 'En général quelques jours à deux semaines. Je vous conseille de les porter progressivement, et je vous revois pour un contrôle.',
        },
        {
          q: 'Les semelles vont-elles dans toutes mes chaussures ?',
          r: 'Elles sont conçues pour un type de chaussure précis. Nous en parlons lors du bilan pour choisir le modèle le plus adapté à votre quotidien.',
        },
        {
          q: 'Tous les combien faut-il les renouveler ?',
          r: 'Cela dépend de l’usure et de l’évolution de vos pieds. Chez l’adulte, un contrôle annuel est recommandé ; chez l’enfant, plus souvent en raison de la croissance.',
        },
      ],
    },
    {
      slug: 'soins-de-pedicurie',
      titre: 'Soins de pédicurie à Lyon 6e',
      titreCourt: 'Soins de pédicurie',
      resume:
        'Cors, durillons, ongles épais ou incarnés : des soins réalisés avec du matériel stérilisé, dans le respect de votre confort.',
      corps: `## Les soins proposés

- Coupe et soin des ongles, y compris épais ou difficiles à couper
- Ongles incarnés
- Cors, durillons et callosités
- Crevasses et peau sèche du talon
- Conseils d’hygiène et de chaussage

## Hygiène et sécurité

Les instruments sont stérilisés après chaque patient, selon les recommandations d’hygiène en vigueur. Le matériel à usage unique est utilisé dès que possible.

## Quand consulter ?

Dès qu’une douleur, une rougeur ou une gêne apparaît, sans attendre qu’elle s’aggrave. Les personnes âgées, diabétiques ou sous traitement anticoagulant ont intérêt à confier leurs soins de pieds à un professionnel.`,
      faq: [
        {
          q: 'Un soin de pédicurie est-il douloureux ?',
          r: 'Le soin est réalisé avec précaution et adapté à votre sensibilité. N’hésitez pas à signaler toute gêne pendant la séance.',
        },
        {
          q: 'Le soin de pédicurie est-il remboursé ?',
          r: 'Le soin de pédicurie courant n’est pas remboursé par l’Assurance Maladie, sauf pour les patients diabétiques dans le cadre du forfait de prévention. Certaines complémentaires santé le prennent en charge.',
        },
        {
          q: 'À quelle fréquence venir ?',
          r: 'Selon vos besoins, en général toutes les 6 à 8 semaines. Nous ajustons ensemble le rythme lors de la première séance.',
        },
      ],
    },
    {
      slug: 'pied-diabetique',
      titre: 'Suivi du pied diabétique à Lyon',
      titreCourt: 'Pied diabétique',
      resume:
        'Prévention et soins adaptés aux personnes diabétiques, en lien avec votre médecin traitant.',
      corps: `## Pourquoi un suivi spécifique ?

Le diabète peut diminuer la sensibilité des pieds et ralentir la cicatrisation. Une petite blessure peut alors passer inaperçue. Le podologue participe au dépistage et à la prévention, en lien avec votre médecin.

## Ce que comprend le suivi

- Examen de la sensibilité et de l’état de la peau et des ongles
- Soins de pédicurie adaptés
- Conseils de chaussage et d’hygiène au quotidien
- Si besoin, semelles ou orthèses de protection

## Prise en charge

Selon votre grade de risque, déterminé par votre médecin, l’Assurance Maladie prend en charge un bilan et un nombre défini de séances de prévention par an, sur prescription médicale.`,
      faq: [
        {
          q: 'Comment connaître mon grade de risque ?',
          r: 'Il est déterminé par votre médecin, souvent après un examen de la sensibilité de vos pieds. Il figure sur la prescription de soins podologiques.',
        },
        {
          q: 'Quels gestes adopter à la maison ?',
          r: 'Regarder vos pieds chaque jour, les laver et bien les sécher entre les orteils, hydrater la peau sans en mettre entre les orteils, et ne jamais marcher pieds nus.',
        },
        {
          q: 'Que faire en cas de plaie ?',
          r: 'Ne la négligez pas : contactez rapidement votre médecin ou votre podologue, même si elle n’est pas douloureuse.',
        },
      ],
    },
    {
      slug: 'podologie-du-sport',
      titre: 'Podologie du sport à Lyon',
      titreCourt: 'Podologie du sport',
      resume:
        'Analyse de la foulée et conseils pour pratiquer votre sport dans de bonnes conditions, du loisir à la compétition.',
      corps: `## Pour les sportifs de tous niveaux

Course à pied, trail, football, tennis, danse : chaque sport sollicite les pieds différemment. Le bilan du sportif s’intéresse à votre pratique, à vos chaussures et à votre foulée.

## Le bilan du sportif

1. **Échange** sur votre pratique, vos objectifs et vos éventuelles douleurs.
2. **Examen** des pieds et de la posture.
3. **Analyse de la course** ou du geste sportif.
4. **Conseils** de chaussage, de reprise progressive et, si besoin, semelles adaptées à votre sport.

## Prévenir plutôt que guérir

Un bilan avant une reprise ou une préparation de course permet d’anticiper. Pensez à venir avec vos chaussures de sport et une tenue adaptée.`,
      faq: [
        {
          q: 'Faut-il des semelles spécifiques pour courir ?',
          r: 'Pas systématiquement. Le bilan permet de déterminer si des semelles sont utiles pour votre pratique ou si des conseils de chaussage suffisent.',
        },
        {
          q: 'Quand faire un bilan avant un marathon ?',
          r: 'Idéalement 2 à 3 mois avant la course, pour laisser le temps de s’adapter à d’éventuelles semelles ou à de nouvelles chaussures.',
        },
        {
          q: 'Que faut-il apporter ?',
          r: 'Vos chaussures de sport habituelles, une tenue permettant de courir et, si vous en avez, vos anciennes semelles.',
        },
      ],
    },
    {
      slug: 'podologie-enfant',
      titre: 'Podologie de l’enfant à Lyon',
      titreCourt: 'Podologie de l’enfant',
      resume:
        'Un examen adapté aux enfants et aux adolescents pour accompagner la croissance et rassurer les parents.',
      corps: `## Quand consulter pour son enfant ?

- Il marche sur la pointe des pieds ou les pieds tournés vers l’intérieur
- Ses chaussures s’usent de façon inhabituelle
- Il se plaint de douleurs aux pieds, aux genoux ou après le sport
- Il tombe souvent ou se fatigue vite à la marche

## Une séance adaptée

L’examen se fait dans le jeu et la bonne humeur, en présence d’un parent. J’observe la marche, les appuis et la posture, puis je vous explique ce que j’ai observé et ce qui est normal pour son âge.

## Et ensuite ?

Bien souvent, des conseils de chaussage et un suivi suffisent. Si des semelles sont utiles, elles sont adaptées et contrôlées régulièrement pendant la croissance.`,
      faq: [
        {
          q: 'À partir de quel âge peut-on consulter ?',
          r: 'Dès que l’enfant marche, si quelque chose vous interroge. Un premier bilan vers 3 à 4 ans permet aussi de faire le point.',
        },
        {
          q: 'Les pieds plats de l’enfant sont-ils inquiétants ?',
          r: 'Chez le jeune enfant, un pied qui paraît plat est souvent normal et évolue avec la croissance. Le bilan permet de faire la différence.',
        },
        {
          q: 'Comment choisir les chaussures de mon enfant ?',
          r: 'À la bonne taille, avec un contrefort qui maintient le talon et une semelle souple à l’avant. Je vous donne des repères précis lors de la séance.',
        },
      ],
    },
  ],
  faqGenerale: [
    {
      q: 'Comment prendre rendez-vous ?',
      r: 'En ligne sur Doctolib, 24h/24, ou par téléphone aux heures d’ouverture du cabinet.',
    },
    {
      q: 'Le cabinet est-il accessible aux personnes à mobilité réduite ?',
      r: 'Oui, le cabinet est situé en rez-de-chaussée et accessible en fauteuil roulant.',
    },
    {
      q: 'Les consultations sont-elles remboursées ?',
      r: 'Les soins de pédicurie courants ne sont pas remboursés, sauf pour les patients diabétiques sur prescription. Sur prescription, l’Assurance Maladie rembourse les semelles sur la base d’un tarif réglementaire faible ; le reste peut être pris en charge par la complémentaire santé selon le contrat. Un devis est remis avant fabrication.',
    },
    {
      q: 'Quels moyens de paiement sont acceptés ?',
      r: 'Carte bancaire, espèces et chèques.',
    },
  ],
  articles: [
    {
      slug: 'preparer-ses-pieds-course-a-pied',
      titre: 'Préparer ses pieds avant une course à pied',
      resume:
        'Chaussures, ongles, ampoules : les bons réflexes dans les semaines qui précèdent une course.',
      date: '2026-09-22',
      theme: 'Sport',
      image: '/photos/sport-foulee-herbe.webp',
      imageAlt: 'Jambes d’un coureur en pleine foulée sur un chemin herbeux',
      corps: `Que vous prépariez votre premier 10 km ou un marathon, vos pieds vont être très sollicités. Voici quelques repères simples pour arriver serein le jour J.

## Plusieurs semaines avant

- **Choisissez vos chaussures tôt** et faites-les travailler à l’entraînement. Évitez de courir avec une paire neuve le jour de la course.
- **Faites le point** si vous ressentez une douleur qui revient à chaque sortie. Un bilan podologique permet d’en rechercher la cause.

## La semaine de la course

- Coupez vos ongles **quelques jours avant**, droits et pas trop courts.
- Hydratez la peau des pieds, sauf entre les orteils.
- Testez vos chaussettes : sans coutures épaisses, bien ajustées.

## Après la course

Prenez quelques minutes pour regarder vos pieds. Une ampoule se protège avec un pansement adapté ; un ongle noir ou une douleur persistante méritent un avis professionnel.

Au cabinet de Lyon 6e, je vous accompagne pour un bilan du sportif ou des conseils de chaussage avant votre prochaine course.`,
    },
    {
      slug: 'pied-diabetique-gestes-quotidien',
      titre: 'Diabète : 5 gestes quotidiens pour protéger vos pieds',
      resume:
        'Des habitudes simples, à adopter chaque jour, pour repérer tôt les petites blessures.',
      date: '2026-09-08',
      theme: 'Diabète',
      corps: `Le diabète peut diminuer la sensibilité des pieds. Une petite blessure peut alors passer inaperçue. Ces gestes simples, recommandés par les professionnels de santé, aident à les repérer tôt.

1. **Regardez vos pieds chaque jour**, y compris sous la plante, avec un miroir si besoin.
2. **Lavez-les à l’eau tiède** et séchez soigneusement entre les orteils.
3. **Hydratez la peau** avec une crème adaptée, mais pas entre les orteils.
4. **Ne marchez jamais pieds nus**, même à la maison, et vérifiez l’intérieur de vos chaussures.
5. **Confiez la coupe des ongles et les cors** à un professionnel plutôt que de les traiter vous-même.

En cas de plaie, de rougeur ou de changement de couleur, parlez-en rapidement à votre médecin ou à votre podologue.

Selon votre grade de risque, des séances de prévention chez le podologue peuvent être prises en charge sur prescription.`,
    },
  ],
  tracking: {},
  mentions: {
    editeur: 'Camille Rousseau, pédicure-podologue (exemple fictif)',
    hebergeur: 'Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis',
  },

  pays: 'FR',
  voix: 'tiers',
  // Modèle affiché sur la démo (variable MODELE pour comparer les modèles en local).
  modele,
  visuels: { specialite: pack.value, animation: process.env.ANIMATION === 'non' ? null : pack.animation, photos: pack.photos, ...(process.env.SPECIALITE_SECONDAIRE ? { specialiteSecondaire: process.env.SPECIALITE_SECONDAIRE } : {}) },
  titreMetier: 'Pédicure-podologue',
  praticiens: [
    {
      prenom: 'Camille',
      nom: 'Rousseau',
      statut: 'titulaire',
      titre: 'Pédicure-podologue',
      identifiants: ['N° d’inscription au tableau de l’Ordre des Pédicures-Podologues : 100000000 (exemple)'],
      diplome: 'Diplôme d’État de pédicure-podologue — IFPP de Lyon',
      formations: ['Diplôme universitaire de podologie du sport', 'Formation à la prévention du pied diabétique'],
      orientations: ['Podologie du sport', 'Pied diabétique'],
      sports: ['Course à pied', 'Trail', 'Football'],
      rdvUrl: 'https://www.doctolib.fr/pedicure-podologue/lyon',
      presence: '',
      bio: '',
      photo: '',
    },
    {
      prenom: 'Julien',
      nom: 'Bernard',
      statut: 'collaborateur',
      titre: 'Pédicure-podologue',
      identifiants: ['N° d’inscription au tableau de l’Ordre des Pédicures-Podologues : 100000001 (exemple)'],
      diplome: 'Diplôme d’État de pédicure-podologue — EEPP',
      formations: [],
      orientations: ['Podologie de l’enfant', 'Bilan podologique'],
      sports: [],
      rdvUrl: 'https://www.doctolib.fr/pedicure-podologue/lyon',
      presence: 'Mercredi, jeudi et vendredi',
      bio: '',
      photo: '',
    },
  ],
  lieux: [
    {
      type: 'maison_sante',
      nom: 'Maison de santé des Brotteaux',
      adresse: '10 rue de la Démo',
      complement: 'Entrée B, rez-de-chaussée',
      codePostal: '69006',
      ville: 'Lyon',
      horaires: [
        { jour: 'Lundi', heures: '9h00–12h30, 14h00–19h00' },
        { jour: 'Mardi', heures: '9h00–12h30, 14h00–19h00' },
        { jour: 'Mercredi', heures: '9h00–13h00' },
        { jour: 'Jeudi', heures: '9h00–12h30, 14h00–19h00' },
        { jour: 'Vendredi', heures: '9h00–12h30, 14h00–17h00' },
        { jour: 'Samedi', heures: 'Fermé' },
        { jour: 'Dimanche', heures: 'Fermé' },
      ],
    },
  ],
  accesDetail: {
    pmr: true,
    parking: 'Parking gratuit sur place',
    transports: 'Métro A, station Foch (5 min à pied) ; bus C1 et C4',
    autres: [],
  },
  rdvMode: 'les_deux',
  paiements: ['Carte bancaire', 'Chèques', 'Espèces'],
  // Matériel et hygiène (catalogue EQUIPEMENTS) : jeu courant d'un cabinet libéral qui fabrique ses semelles.
  equipements: [
    'autoclave-classe-b', 'bac-ultrasons', 'sachets-individuels', 'usage-unique', 'tracabilite-sterilisation', 'aspiration',
    'podoscope', 'plateforme-pression', 'analyse-video', 'monofilament-diapason',
    'empreinte-mousse', 'thermoformage', 'fauteuil-soins',
  ],
  equipementsAutres: '',
  domicile: { actif: true, creneaux: 'Le jeudi matin', secteurs: ['69100 Villeurbanne', '69300 Caluire-et-Cuire', '69500 Bron'] },
  message: '',
  communes: ['Lyon 6e', 'Lyon 3e', 'Villeurbanne', 'Caluire-et-Cuire', 'Bron'],
  photos: { accueil: '', panorama: '', cabinet: [] },
};

// CAS=solo : praticienne seule, voix « je », cabinet simple identifié par son quartier (cas le plus courant
// en production), pour vérifier les fiches pleine largeur et les phrases « quartier + ville ».
if (process.env.CAS === 'solo') {
  site.praticiens = site.praticiens.slice(0, 1);
  site.voix = 'je';
  site.cabinet.quartier = 'Brotteaux';
  site.lieux = site.lieux.map((l) => ({ ...l, type: 'cabinet', nom: '' }));
}
export default site;
