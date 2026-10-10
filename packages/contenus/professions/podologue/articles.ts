// ARTICLES PRÉ-ÉCRITS « PÉDICURE-PODOLOGUE » (demande de Paul du 2026-10-10). Même format que les articles du flux (articles_flux :
// titre, résumé = chapeau, thème parmi THEMES_FLUX, corps Markdown avec intertitres ##). Circuit : revue dans les Arrivages
// (nature « article ») → une fois acceptés, « Importer en brouillon » dans /admin/flux → image + diffusion par Paul → chaque
// praticien publie ou ignore l'article sur son site (site_articles). Rien n'est publié automatiquement.
// Ton : sobre, factuel, sans promesse, sans chiffre non sourcé, sans culpabiliser ; renvoi à la consultation. Sources : sources.ts.
// `soins` : soins du catalogue liés (maillage à venir) ; `conseils` : fiches conseils liées ; `hashtags` et `illustrations` :
// suggestions pour l'image de l'article (pictos et sujets existants de la banque visuelle).

import type { IdSourcePodo } from './sources';

export type ArticlePodo = {
  slug: string;
  titre: string;
  /** Chapeau (résumé de la liste et meta description, ≤ 160 caractères) */
  resume: string;
  /** Thème du flux (THEMES_FLUX, draft.ts) */
  theme: 'Prévention' | 'Sport' | 'Enfants' | 'Diabète' | 'Seniors' | 'Saison' | 'Actualité de la profession';
  corps: string;
  soins: readonly string[];
  conseils: readonly string[];
  hashtags: readonly string[];
  /** Pictos (pictos.ts) ou scènes suggérés pour l'image 16:9 de l'article */
  illustrations: readonly string[];
  sources: readonly IdSourcePodo[];
};

export const ARTICLES_PODOLOGUE: readonly ArticlePodo[] = [
  {
    slug: 'chaussures-securite-metiers-debout',
    titre: 'Chaussures de sécurité et métiers debout : prendre soin de ses pieds au travail',
    resume: 'Station debout, charges, sols durs, froid : ce que ces métiers demandent aux pieds, ce que disent les normes et quand consulter.',
    theme: 'Prévention',
    soins: ['semelles-orthopediques', 'bilan-podologique', 'cors-durillons', 'douleur-talon', 'soins-de-pedicurie'],
    conseils: ['chaussures-securite', 'chaussettes-hygiene', 'cors-durillons', 'semelles-entretien'],
    hashtags: ['travail', 'chaussage', 'semelles', 'prevention'],
    illustrations: ['picto:chaussure-confort', 'picto:semelle-orthopedique', 'picto:plateforme-pression'],
    sources: ['inrs-ed6509', 'iso-20345', 'legifrance-r4323-95', 'legifrance-l4624-3', 'ameli-ortheses', 'ameli-soin-pieds'],
    corps: `Bâtiment et travaux publics, logistique et entrepôts, services hospitaliers, restauration, industrie, commerce, agriculture : dans beaucoup de métiers, les pieds portent la journée de travail. Les chaussures y sont souvent imposées et portées de longues heures.

## Des journées exigeantes pour les pieds

Les contraintes se cumulent souvent :

- **la station debout prolongée**, avec peu de pauses assises ;
- **la marche** sur de longues distances dans un entrepôt, un service ou un chantier ;
- **le port de charges**, qui augmente les appuis à chaque pas ;
- **les sols durs** (béton, carrelage) ou irréguliers, parfois glissants ;
- **le froid et l’humidité** dehors, ou **la chaleur** qui fait transpirer dans des chaussures fermées.

À la fin de la journée, cela se traduit souvent par une fatigue des pieds, des douleurs sous le talon ou sous l’avant-pied, des ampoules, des cors et des durillons là où la chaussure frotte, ou une transpiration qui favorise les mycoses.

## Les chaussures de sécurité : ce que disent les normes

On distingue trois familles de chaussures professionnelles :

- les **chaussures de sécurité** (norme NF EN ISO 20345), avec un embout qui protège les orteils contre un choc de 200 joules ;
- les **chaussures de protection** (NF EN ISO 20346), avec un embout testé à 100 joules ;
- les **chaussures de travail** (NF EN ISO 20347), sans embout de protection.

Sur une chaussure de sécurité, une catégorie résume les protections. Pour les chaussures en cuir, **S1** ajoute aux exigences de base un talon fermé qui absorbe l’énergie et une semelle antistatique ; **S2** y ajoute une tige qui résiste à la pénétration de l’eau ; **S3** ajoute un insert anti-perforation et une semelle à crampons. **S6** et **S7** correspondent à des chaussures étanches dans leur ensemble. Les lettres **P**, **PL** ou **PS** précisent le type d’insert anti-perforation, et **SR** la résistance au glissement.

Le choix du modèle découle de l’évaluation des risques du poste. Les équipements de protection individuelle sont fournis gratuitement par l’employeur, qui en assure aussi l’entretien et le remplacement.

## Semelles orthopédiques et chaussures de sécurité

C’est le point le plus délicat. Une chaussure de sécurité est certifiée telle qu’elle est vendue, avec sa semelle de propreté d’origine, et sa notice précise les accessoires utilisables. Glisser une autre semelle peut modifier la hauteur du pied dans la chaussure, son maintien ou ses propriétés.

Avant de porter des semelles orthopédiques dans des chaussures de sécurité, il faut donc vérifier dans la notice, ou auprès du fabricant, que ce modèle est prévu pour les recevoir. Certains modèles sont testés avec des semelles orthopédiques. Quand la forme du pied ne permet pas de porter une chaussure de série, un podo-orthésiste peut adapter une chaussure ou en réaliser une sur mesure. Parlez-en avec votre employeur et le médecin du travail.

## Au quotidien

- Essayer plusieurs pointures et largeurs, avec les chaussettes portées au travail.
- Lacer entièrement la chaussure pour que le pied ne glisse pas vers l’embout.
- Changer de chaussettes chaque jour, et de chaussures quand elles sont trempées.
- Faire sécher les chaussures à l’air, loin d’une source de chaleur.
- Vérifier l’état des chaussures avant de les mettre : semelle usée, embout déformé, tige décousue.

## Quand consulter

Une douleur qui revient chaque jour en fin de poste, des ampoules ou des cors qui réapparaissent, une mycose qui ne passe pas ou un besoin de semelles compatibles avec les chaussures de travail sont des raisons de prendre rendez-vous.

## Le rôle du pédicure-podologue

Le bilan podologique commence par un échange sur votre poste, vos horaires et vos chaussures de travail, que vous pouvez apporter. L’examen des pieds et des appuis permet ensuite de proposer, si besoin, des semelles orthopédiques adaptées aux chaussures portées, des soins de pédicurie pour les cors et les durillons, et des conseils de chaussage.

Le pédicure-podologue peut prescrire des semelles orthopédiques. L’Assurance Maladie en prend en charge une paire par an pour un adulte, sur la base de son tarif de remboursement. Le médecin du travail peut, de son côté, proposer des aménagements du poste quand l’état de santé le justifie.

## Questions fréquentes

### Puis-je mettre mes semelles orthopédiques dans mes chaussures de sécurité ?

Seulement si le modèle est prévu pour cela : la notice du fabricant l’indique. Apportez vos chaussures de travail au cabinet pour en parler.

### Qui fournit les chaussures de sécurité ?

Quand le poste les exige, ce sont des équipements de protection individuelle : l’employeur les fournit gratuitement et les remplace quand elles sont usées.

### Que signifie S3 sur mes chaussures ?

S3 désigne une chaussure de sécurité en cuir avec embout, talon absorbeur d’énergie, semelle antistatique, tige qui résiste à l’eau, insert anti-perforation et semelle à crampons.`,
  },
  {
    slug: 'chaussures-a-talons-conseils',
    titre: 'Chaussures à talons : les porter sans abîmer ses pieds',
    resume: 'Avant-pied plus chargé, frottements, cheville moins stable : ce que change un talon, et des repères simples pour le porter.',
    theme: 'Prévention',
    soins: ['cors-durillons', 'orthoplastie', 'semelles-orthopediques', 'bilan-podologique', 'soins-de-pedicurie'],
    conseils: ['talons', 'cors-durillons', 'hydratation-pieds'],
    hashtags: ['chaussage', 'talons', 'avant-pied', 'prevention'],
    illustrations: ['picto:chaussure-ville', 'picto:pied-profil', 'picto:cor-durillon'],
    sources: ['ameli-hallux-valgus', 'ameli-soin-pieds', 'ameli-ortheses'],
    corps: `Pour le travail, une soirée ou par goût, les chaussures à talons font partie de la garde-robe de beaucoup de personnes. Il ne s’agit pas d’y renoncer, mais de savoir ce qu’elles changent pour les pieds et comment les porter plus confortablement.

## Ce que change un talon

Plus le talon est haut, plus le poids du corps se reporte vers l’avant du pied. Le pied avance aussi dans la chaussure : les orteils sont poussés vers le bout, d’autant plus serrés que la pointe est étroite. Un talon haut et fin réduit enfin la surface d’appui au sol, et la cheville est moins stable, surtout sur un sol irrégulier.

## Les gênes les plus fréquentes

- **Des douleurs sous l’avant-pied**, à la base des orteils (métatarsalgies), qui apparaissent après quelques heures.
- **Des cors et des durillons** sur les orteils ou sous l’avant-pied, là où la pression se répète.
- **Une bosse à la base du gros orteil** qui devient sensible : l’hallux valgus est favorisé par plusieurs facteurs, dont l’hérédité, l’âge et le port de talons hauts à bout étroit.
- **Des entorses de cheville**, quand le pied se tord sur un talon haut.

## Choisir sa paire

- Pour tous les jours, un talon bas, de 3 à 4 cm au plus, et large plutôt que fin.
- Un avant-pied assez large, à bout rond, dans lequel les orteils ne sont pas serrés.
- Un modèle qui tient le pied : une bride ou un lacet limite le glissement vers l’avant.
- Un essayage en fin de journée, quand le pied est un peu gonflé.

## Les porter au quotidien

- Alterner : garder les talons hauts pour des moments courts et prévoir une paire plate pour les trajets.
- Faire « travailler » une paire neuve quelques heures seulement les premiers jours.
- Le soir, retirer ses chaussures, mobiliser doucement chevilles et orteils, étirer les mollets sans forcer.
- Des semelles orthopédiques fines existent pour certaines chaussures de ville : elles sont réalisées après un examen, selon la place disponible dans la chaussure.

## Quand consulter

Une douleur sous l’avant-pied qui revient à chaque port, une bosse du gros orteil qui devient douloureuse, des cors qui réapparaissent ou des entorses répétées méritent un avis.

## Le rôle du pédicure-podologue

Le pédicure-podologue examine les pieds et les appuis, regarde les chaussures que vous portez et vous conseille sur le chaussage. Il peut traiter les cors et les durillons, réaliser une orthoplastie qui protège un orteil, et proposer, si besoin, des semelles orthopédiques adaptées à vos chaussures. Pour un adulte, l’Assurance Maladie prend en charge une paire de semelles orthopédiques par an, sur la base de son tarif de remboursement.

## Questions fréquentes

### Faut-il renoncer aux talons ?

Non. Varier les hauteurs, choisir des modèles qui tiennent le pied et réserver les talons hauts à des moments courts permet de les porter en ménageant ses pieds.

### Quelle hauteur de talon pour tous les jours ?

Pour un usage quotidien, l’Assurance Maladie conseille des talons bas, de 3 à 4 cm au plus.

### Des semelles orthopédiques tiennent-elles dans des escarpins ?

Des semelles fines peuvent être réalisées pour certaines chaussures de ville. Apportez les chaussures concernées au rendez-vous : leur forme décide de ce qui est possible.`,
  },
];
