-- Catalogue normalisé (référentiel des 79 sites webpodologue) :
-- libellés canoniques, textes à voix neutre (compatibles « je », « nous » et 3e personne),
-- 7 compétences ajoutées. Idempotent : peut être rejoué.

alter table public.soins_catalogue
  add column if not exists icone text
  check (icone is null or icone ~ '^(healthicons|lucide|ph|tabler):[a-z0-9]+(-[a-z0-9]+)*$');

insert into public.soins_catalogue (profession_slug, slug, titre_court, titre, resume, corps, faq, position, icone) values

('podologue', 'soins-de-pedicurie', 'Pédicurie', $q$Soins de pédicurie à {ville}$q$,
$q$Cors, durillons, ongles épais ou incarnés, mycoses : des soins réalisés avec du matériel stérilisé, adaptés à chaque patient.$q$,
$q$## Les soins de pédicurie

- Coupe et soin des ongles, y compris épais ou difficiles à couper
- Cors, durillons et callosités
- Crevasses et peau sèche du talon
- Prise en charge des mycoses de la peau et des ongles
- Conseils d’hygiène et de chaussage

## Hygiène

Les instruments sont stérilisés après chaque patient, selon les recommandations d’hygiène en vigueur. Le matériel à usage unique est utilisé dès que possible.

## Quand consulter ?

Dès qu’une douleur, une rougeur ou une gêne apparaît. Les personnes âgées, diabétiques ou sous traitement anticoagulant ont intérêt à confier les soins de leurs pieds à un professionnel.$q$,
$q$[{"q":"Faut-il une ordonnance pour un soin de pédicurie ?","r":"Non, il est possible de consulter un pédicure-podologue sans ordonnance."},{"q":"Le soin de pédicurie est-il remboursé ?","r":"Le soin courant n’est pas remboursé par l’Assurance Maladie, sauf pour les patients diabétiques dans le cadre du forfait de prévention. Certaines complémentaires santé le prennent en charge."},{"q":"À quelle fréquence prévoir un soin ?","r":"Selon les besoins, souvent toutes les 6 à 8 semaines. Le rythme est ajusté lors de la première séance."}]$q$::jsonb,
0, 'healthicons:health-worker-outline'),

('podologue', 'bilan-podologique', 'Bilan podologique', $q$Bilan podologique à {ville}$q$,
$q$Un examen complet du pied, des appuis et de la marche pour comprendre l’origine d’une douleur ou d’une gêne.$q$,
$q$## À quoi sert le bilan podologique ?

Le bilan analyse la forme des pieds, leurs appuis et la façon de marcher. Il aide à comprendre l’origine de douleurs du pied, mais aussi parfois du genou, de la hanche ou du dos.

## Déroulement

1. **Échange** sur les douleurs, les activités et les antécédents.
2. **Examen clinique** des pieds, debout et allongé.
3. **Analyse des appuis** (podoscope, plateforme de pression selon l’équipement du cabinet) et observation de la marche.
4. **Explications et conseils**. Des semelles orthopédiques peuvent être proposées si elles sont utiles.

Prévoir environ 45 minutes, avec les chaussures habituelles, les anciennes semelles et les examens récents.$q$,
$q$[{"q":"Faut-il une ordonnance pour un bilan podologique ?","r":"Non. Une ordonnance du médecin peut toutefois être utile pour le remboursement éventuel de semelles orthopédiques."},{"q":"Combien de temps dure le bilan ?","r":"Environ 45 minutes, échange, examen et conseils compris."},{"q":"Que faut-il apporter ?","r":"Les chaussures portées au quotidien, les anciennes semelles et les examens récents (radiographies, comptes rendus)."}]$q$::jsonb,
1, 'healthicons:foot-outline'),

('podologue', 'semelles-orthopediques', 'Semelles orthopédiques', $q$Semelles orthopédiques sur mesure à {ville}$q$,
$q$Des orthèses plantaires conçues sur mesure après un bilan, adaptées aux pieds et aux chaussures du patient.$q$,
$q$## Des semelles faites sur mesure

Les semelles orthopédiques, ou orthèses plantaires, sont fabriquées après un bilan podologique. Elles visent à mieux répartir les appuis et à limiter certaines contraintes lors de la marche ou du sport.

## Les étapes

1. **Bilan podologique** pour comprendre les appuis.
2. **Prise d’empreinte** des pieds.
3. **Fabrication** des semelles, adaptées aux chaussures (ville, travail, sport).
4. **Essayage et contrôle**, quelques semaines après, pour ajuster si nécessaire.

## Remboursement

Sur prescription médicale, les semelles orthopédiques sont prises en charge en partie par l’Assurance Maladie, sur la base de son tarif. La complémentaire santé peut compléter selon le contrat. Un devis est remis avant fabrication.$q$,
$q$[{"q":"Combien de temps pour s’habituer à des semelles ?","r":"En général quelques jours à deux semaines, en les portant progressivement. Un contrôle est prévu ensuite."},{"q":"Les semelles vont-elles dans toutes les chaussures ?","r":"Elles sont conçues pour un type de chaussure précis, choisi lors du bilan selon le quotidien du patient."},{"q":"Quand les renouveler ?","r":"Selon l’usure et l’évolution des pieds. Chez l’adulte, un contrôle annuel est recommandé ; chez l’enfant, plus souvent en raison de la croissance."}]$q$::jsonb,
2, 'ph:footprints'),

('podologue', 'podologie-du-sport', 'Podologie du sport', $q$Podologie du sport à {ville}$q$,
$q$Analyse de la foulée et du geste sportif, conseils de chaussage et semelles adaptées à la pratique, du loisir à la compétition.$q$,
$q$## Pour les sportifs de tous niveaux

Course à pied, trail, football, tennis, cyclisme, ski, danse : chaque sport sollicite les pieds différemment. Le bilan du sportif s’intéresse à la pratique, aux chaussures et à la foulée.

## Le bilan du sportif

1. **Échange** sur la pratique, les objectifs et les éventuelles douleurs.
2. **Examen** des pieds et de la posture.
3. **Analyse de la course** ou du geste sportif.
4. **Conseils** de chaussage, de reprise progressive et, si besoin, semelles adaptées au sport.

## Anticiper

Un bilan avant une reprise ou une préparation de course permet d’anticiper. Venir avec ses chaussures de sport et une tenue adaptée.$q$,
$q$[{"q":"Faut-il des semelles spécifiques pour courir ?","r":"Pas systématiquement. Le bilan permet de déterminer si des semelles sont utiles ou si des conseils de chaussage suffisent."},{"q":"Quand faire un bilan avant une course ?","r":"Idéalement 2 à 3 mois avant, pour laisser le temps de s’adapter à d’éventuelles semelles ou à de nouvelles chaussures."}]$q$::jsonb,
3, 'healthicons:running-outline'),

('podologue', 'posturologie', 'Posturologie', $q$Posturologie à {ville}$q$,
$q$Une approche globale de l’équilibre et de la posture, qui prend en compte le rôle des pieds dans certaines douleurs.$q$,
$q$## Qu’est-ce que la posturologie ?

La posturologie étudie la façon dont le corps se tient et s’équilibre. Les pieds sont l’un des capteurs de cet équilibre : leur fonctionnement peut participer à certaines douleurs du genou, de la hanche ou du dos.

## Le bilan postural

1. **Échange** sur les douleurs et leur contexte.
2. **Examen** de la posture, debout et en mouvement.
3. **Tests** de l’équilibre et des appuis.
4. **Proposition** de prise en charge : conseils, semelles posturales si elles sont indiquées, et orientation vers d’autres professionnels si nécessaire.

La prise en charge s’inscrit souvent en complément du suivi par le médecin, le kinésithérapeute ou l’ostéopathe.$q$,
$q$[{"q":"Pour quelles douleurs consulter en posturologie ?","r":"Des douleurs récurrentes du dos, de la hanche ou du genou, des troubles de l’équilibre, ou une gêne qui persiste malgré d’autres prises en charge, sur avis du médecin si besoin."},{"q":"Qu’est-ce qu’une semelle posturale ?","r":"Une semelle fine conçue pour agir sur la posture. Elle n’est proposée qu’après un bilan, lorsqu’elle est indiquée."}]$q$::jsonb,
4, 'healthicons:walking-outline'),

('podologue', 'podologie-enfant', 'Podopédiatrie', $q$Podologie de l’enfant à {ville}$q$,
$q$Un examen adapté aux enfants et aux adolescents pour accompagner la croissance et répondre aux questions des parents.$q$,
$q$## Quand consulter pour un enfant ?

- Marche sur la pointe des pieds ou pieds tournés vers l’intérieur
- Usure inhabituelle des chaussures
- Douleurs aux pieds, aux genoux ou après le sport
- Chutes fréquentes ou fatigue rapide à la marche

## Une séance adaptée

L’examen se fait dans le jeu, en présence d’un parent : observation de la marche, des appuis et de la posture, puis explications sur ce qui est normal pour l’âge de l’enfant.

## Et ensuite ?

Souvent, des conseils de chaussage et un suivi suffisent. Si des semelles sont utiles, elles sont contrôlées régulièrement pendant la croissance.$q$,
$q$[{"q":"À partir de quel âge consulter ?","r":"Dès que l’enfant marche, si quelque chose interroge. Un premier bilan vers 3 à 4 ans permet aussi de faire le point."},{"q":"Les pieds plats de l’enfant sont-ils inquiétants ?","r":"Chez le jeune enfant, un pied qui paraît plat est souvent normal et évolue avec la croissance. Le bilan permet de faire la différence."}]$q$::jsonb,
5, 'healthicons:child-care-outline'),

('podologue', 'pied-diabetique', 'Podo-diabétologie', $q$Suivi du pied diabétique à {ville}$q$,
$q$Prévention et soins adaptés aux personnes diabétiques, en lien avec le médecin traitant.$q$,
$q$## Pourquoi un suivi spécifique ?

Le diabète peut diminuer la sensibilité des pieds et ralentir la cicatrisation : une petite blessure peut alors passer inaperçue. Le pédicure-podologue participe au dépistage et à la prévention, en lien avec le médecin.

## Le suivi

- Examen de la sensibilité, de la peau et des ongles
- Soins de pédicurie adaptés
- Conseils de chaussage et d’hygiène au quotidien
- Si besoin, semelles ou orthèses de protection

## Prise en charge

Selon le grade de risque, déterminé par le médecin, l’Assurance Maladie prend en charge un bilan et un nombre défini de séances de prévention par an, sur prescription médicale.$q$,
$q$[{"q":"Comment connaître son grade de risque ?","r":"Il est déterminé par le médecin, souvent après un examen de la sensibilité des pieds, et figure sur la prescription."},{"q":"Que faire en cas de plaie ?","r":"Ne pas la négliger : contacter rapidement le médecin ou le pédicure-podologue, même si elle n’est pas douloureuse."}]$q$::jsonb,
6, 'healthicons:diabetes-measure-outline'),

('podologue', 'podologie-du-senior', 'Podologie du sénior', $q$Podologie du sénior à {ville}$q$,
$q$Soins et conseils pour préserver le confort de marche et l’autonomie avec l’âge, au cabinet ou à domicile.$q$,
$q$## Des pieds qui changent avec l’âge

Avec l’âge, la peau s’affine, les ongles s’épaississent et la sensibilité peut diminuer. Prendre soin de ses pieds contribue au confort de marche et à la prévention des chutes.

## La prise en charge

- Soins des ongles épais ou incarnés, cors et durillons
- Conseils de chaussage pour une marche plus sûre
- Orthèses d’orteils et semelles de confort si besoin
- Coordination avec le médecin et l’entourage

Les soins peuvent être réalisés au cabinet ou, selon les disponibilités, à domicile ou en établissement.$q$,
$q$[{"q":"Les soins peuvent-ils se faire à domicile ?","r":"Selon les secteurs et les disponibilités du cabinet. Le plus simple est de contacter le cabinet par téléphone."}]$q$::jsonb,
7, 'healthicons:walk-supported-outline'),

('podologue', 'verrues-plantaires', 'Verrues plantaires', $q$Traitement des verrues plantaires à {ville}$q$,
$q$Prise en charge des verrues sous le pied, avec un traitement adapté à leur localisation et à leur ancienneté.$q$,
$q$## Qu’est-ce qu’une verrue plantaire ?

La verrue plantaire est une lésion de la peau due à un virus. Elle peut être gênante à la marche et se transmettre, notamment dans les lieux humides (piscines, vestiaires).

## La prise en charge

Après un examen, le traitement est choisi selon la verrue : soins locaux, cryothérapie, application de produits adaptés. Plusieurs séances sont parfois nécessaires.

## Prévenir

Porter des sandales dans les lieux publics humides, ne pas partager serviettes et chaussures, et consulter tôt si une lésion apparaît.$q$,
$q$[{"q":"Faut-il plusieurs séances ?","r":"Souvent oui : le nombre dépend de la taille, de l’ancienneté et de la localisation de la verrue."},{"q":"Le traitement est-il remboursé ?","r":"Les conditions de prise en charge évoluent ; le cabinet renseigne sur la situation en vigueur au moment du rendez-vous."}]$q$::jsonb,
8, 'lucide:target'),

('podologue', 'ongle-incarne', 'Ongle incarné', $q$Ongle incarné : prise en charge à {ville}$q$,
$q$Soin de l’ongle incarné et, si besoin, orthonyxie pour accompagner sa repousse.$q$,
$q$## Un problème fréquent

L’ongle incarné apparaît lorsque le bord de l’ongle pénètre dans la peau. Il peut provoquer douleur, rougeur et inflammation.

## La prise en charge

- **Soin de pédicurie** pour dégager le bord de l’ongle
- **Orthonyxie** : petit appareil posé sur l’ongle pour accompagner sa repousse et limiter les récidives
- **Onychoplastie** si l’ongle doit être reconstitué
- **Conseils** de coupe et de chaussage

En cas d’infection importante, une orientation vers le médecin peut être nécessaire.$q$,
$q$[{"q":"Faut-il attendre que l’ongle infecte pour consulter ?","r":"Non : plus la prise en charge est précoce, plus elle est simple."},{"q":"Qu’est-ce qu’une orthonyxie ?","r":"Un petit appareil fixé sur l’ongle qui accompagne sa repousse pour limiter les récidives."}]$q$::jsonb,
9, 'lucide:scissors'),

('podologue', 'douleur-talon', 'Douleur au talon', $q$Douleur au talon : bilan et prise en charge à {ville}$q$,
$q$Épine calcanéenne, aponévrosite plantaire : un bilan pour comprendre la douleur au talon et proposer une prise en charge adaptée.$q$,
$q$## Une douleur fréquente

La douleur sous le talon, souvent ressentie au réveil ou après un effort, peut avoir plusieurs origines : aponévrosite plantaire, épine calcanéenne, contraintes liées au chaussage ou à l’activité.

## La prise en charge

1. **Bilan podologique** pour rechercher l’origine de la douleur.
2. **Conseils** d’étirements, de chaussage et d’activité.
3. **Semelles orthopédiques** si elles sont indiquées.
4. **Coordination** avec le médecin si des examens complémentaires sont nécessaires.$q$,
$q$[{"q":"Faut-il une radiographie ?","r":"Pas toujours. Le médecin peut la prescrire si nécessaire ; il est utile de l’apporter si elle existe."}]$q$::jsonb,
10, 'healthicons:orthopaedics-outline'),

('podologue', 'laser', 'Laser', $q$Thérapie laser au cabinet à {ville}$q$,
$q$Une technique complémentaire de photobiomodulation, proposée après évaluation pour accompagner certains soins.$q$,
$q$## Le principe

La thérapie laser (photobiomodulation) utilise la lumière à des longueurs d’onde définies. Au cabinet, elle peut être proposée en complément d’autres soins, après une évaluation.

## Indications possibles

Selon l’évaluation : certaines douleurs du pied ou de la cheville, ou en complément du traitement de mycoses et de verrues. Chaque indication est discutée avec le patient.

## Déroulement

Les séances sont courtes. Leur nombre dépend de l’indication et est précisé lors de l’évaluation.$q$,
$q$[{"q":"La thérapie laser convient-elle à tout le monde ?","r":"Non : certaines situations la contre-indiquent. Une évaluation préalable est toujours réalisée."}]$q$::jsonb,
11, 'lucide:zap'),

('podologue', 'k-taping', 'K-Taping', $q$K-Taping à {ville}$q$,
$q$Pose de bandes adhésives élastiques pour accompagner le mouvement, notamment chez les sportifs.$q$,
$q$## Qu’est-ce que le K-Taping ?

Le K-Taping consiste à poser des bandes adhésives élastiques sur la peau. Utilisé notamment dans le sport, il accompagne le mouvement sans le bloquer.

## Au cabinet

La pose est réalisée après un examen, en complément d’autres prises en charge (bilan, semelles, conseils). Des consignes sont données pour la durée de port et le retrait.$q$,
$q$[{"q":"Combien de temps garder les bandes ?","r":"Généralement quelques jours ; la durée est précisée lors de la pose."}]$q$::jsonb,
12, 'lucide:bandage')

on conflict (profession_slug, slug) do update set
  titre_court = excluded.titre_court,
  titre = excluded.titre,
  resume = excluded.resume,
  corps = excluded.corps,
  faq = excluded.faq,
  position = excluded.position,
  icone = coalesce(soins_catalogue.icone, excluded.icone);
