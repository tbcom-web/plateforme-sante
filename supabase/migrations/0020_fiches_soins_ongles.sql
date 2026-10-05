-- Nouvelles fiches du catalogue (podologue) : orthonyxie, onychoplastie, orthoplastie, mycose des ongles,
-- cors et durillons, ongles épais, soins à domicile. Textes à voix neutre (compatibles « je », « nous » et 3e personne).
-- Idempotent : ON CONFLICT (profession_slug, slug) DO NOTHING (contrainte unique de 0001_init.sql) ;
-- aucune fiche existante n'est modifiée, et une fiche déjà retouchée dans l'admin n'est jamais écrasée.
-- Icônes : la colonne n'accepte que healthicons|lucide|ph|tabler (contrainte de 0006/0007) ; le picto métier
-- (pictos.ts, PICTOS_SOINS) les remplace sur les sites tant que l'icône reste celle de ICONES_SOINS (icones-meta.ts).
--
-- Sources communes (relues le 2026-10-05) :
--  [CSP]  Code de la santé publique, art. R4322-1 (version en vigueur depuis le 09/07/2026, décret n° 2026-601) :
--         https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000054396412
--  [HAS]  HAS / Collège national de pédicurie-podologie, « Le pied de la personne âgée : approche médicale et prise en
--         charge en pédicurie-podologie », recommandations, novembre 2020 :
--         https://www.has-sante.fr/jcms/c_272462/fr/le-pied-de-la-personne-agee-approche-medicale-et-prise-en-charge-de-pedicurie-podologie
--         (§ 3.4 traitements instrumentaux, § 3.5 orthèses : « seules les orthèses plantaires peuvent bénéficier d'une base
--         de remboursement », § 3.6 chutes, onychomycoses, plaies, annexe 6 et glossaire)
--  [AMELI-DIAB] ameli.fr, « Suivi des pieds du diabétique », mis à jour le 22/07/2025 (séances prises en charge en
--         grades 2 et 3 seulement, sur prescription médicale ; toute anomalie du pied — cor, durillon, rougeur — à montrer
--         rapidement) : https://www.ameli.fr/assure/sante/themes/diabete-suivi/suivi-pieds
-- Relecture praticien (pédicure-podologue libéral, 2026-10-05) appliquée : prise en charge diabétique limitée aux
-- grades 2 et 3 sur prescription, prescription de topiques, imidazolés et anticoagulants, sensations au meulage.

insert into public.soins_catalogue (profession_slug, slug, titre_court, titre, resume, corps, faq, position, icone) values

-- 1. Orthonyxie
-- Sources : [CSP] 7° (prescription, confection et application des orthonyxies, sans prescription médicale) ;
-- [HAS] § 3.4.2 et § 3.5.1 (indications, contre-indications, agrafes à fil de titane et lamelles préférées chez la
-- personne âgée, suivi, renouvellement, avis chirurgical en cas d'échec ; bourgeon charnu → médecin) ;
-- ameli.fr, « Traitement de l'ongle incarné », mis à jour le 19/02/2026 (correction de la courbure sur plusieurs mois) :
-- https://www.ameli.fr/assure/sante/themes/ongle-incarne/traitement
('podologue', 'orthonyxie', 'Orthonyxie', $q$Orthonyxie : correction de la courbure de l’ongle à {ville}$q$,
$q$Une orthèse posée sur l’ongle pour corriger peu à peu sa courbure et limiter les récidives d’ongle incarné.$q$,
$q$## En quoi consiste l’orthonyxie ?

L’orthonyxie est une orthèse de l’ongle. Fixée sur l’ongle, elle exerce une traction douce qui corrige peu à peu une courbure trop marquée. Elle est proposée pour un ongle très courbé ou douloureux, et pour limiter les récidives d’ongle incarné.

Plusieurs techniques existent, par exemple une agrafe en fil métallique accrochée aux bords de l’ongle, ou une lamelle collée à sa surface. Le choix dépend de l’ongle, de la peau et des antécédents.

## Déroulement

1. **Examen** de l’ongle et de l’orteil. Si le bord de l’ongle blesse la peau, un soin est réalisé d’abord.
2. **Pose** de l’orthèse, adaptée à la largeur et à l’épaisseur de l’ongle.
3. **Contrôles** réguliers : l’orthèse est ajustée ou renouvelée au fil de la pousse de l’ongle.

La correction est progressive et demande en général plusieurs mois. Un ongle très rigide peut nécessiter de renouveler le traitement.

## Pour qui ?

Pour les adolescents et les adultes qui ont un ongle incarné à répétition ou un ongle très courbé. Chez les personnes âgées dont la peau est fragile, on choisit une orthèse qui ne touche pas la peau au bord de l’ongle. Le diabète n’est pas une contre-indication, mais le suivi est alors plus rapproché. L’orthonyxie ne convient pas à un ongle fragile.

## Limites

Si la courbure revient malgré le traitement, un avis chirurgical peut être proposé. En cas de rougeur qui s’étend, de pus, de fièvre, ou d’une petite masse rouge qui saigne au bord de l’ongle, consulter le médecin.

## Au quotidien

Couper l’ongle droit, sans creuser les coins, et porter des chaussures assez larges à l’avant.$q$,
$q$[{"q":"Faut-il une ordonnance pour une orthonyxie ?","r":"Non. Le pédicure-podologue peut proposer et poser une orthonyxie sans prescription médicale."},{"q":"L’orthonyxie est-elle remboursée ?","r":"Non, l’Assurance Maladie ne la rembourse pas. Certaines complémentaires santé participent. Le tarif est indiqué avant la pose."},{"q":"La pose fait-elle mal ?","r":"L’orthèse agit sur l’ongle : selon la technique, elle s’accroche à ses bords ou se colle à sa surface. Une sensation de tension est possible les premiers jours. Si la douleur augmente, il faut contacter le cabinet."},{"q":"Combien de temps dure le traitement ?","r":"En général plusieurs mois, avec des contrôles réguliers. La durée dépend de la pousse de l’ongle et de sa rigidité."}]$q$::jsonb,
13, 'lucide:paperclip'),

-- 2. Onychoplastie
-- Sources : [CSP] 7° (onychoplasties) ; [HAS] § 3.4.2 « Onycholyse » (chercher la cause et traiter avant de
-- reconstituer) et § 3.5.1 « Les onychoplasties » (indications après onycholyse due à un traumatisme, une infection, un
-- syndrome main-pied ; prévention de l'incarnation par le bourrelet ; non indiquées en cas de plaie, tumeur, infection
-- ou mycose) ; [HAS] encadré 3 (lésion pigmentée ou suspecte de l'ongle → médecin).
('podologue', 'onychoplastie', 'Onychoplastie', $q$Onychoplastie : reconstitution de l’ongle à {ville}$q$,
$q$Une reconstitution en résine d’un ongle abîmé ou en partie absent, pour protéger le lit de l’ongle et accompagner sa repousse.$q$,
$q$## En quoi consiste l’onychoplastie ?

L’onychoplastie remplace tout ou partie d’un ongle par un ongle artificiel, le plus souvent en résine. C’est un soin : elle protège la peau sous l’ongle quand elle est à nu. Elle empêche aussi la peau voisine de prendre la place de l’ongle pendant qu’il repousse, ce qui pourrait favoriser un ongle incarné.

Elle n’a pas le même but qu’une pose d’ongle esthétique : elle est décidée après un examen, pour protéger l’orteil et guider la repousse.

## Quand est-elle proposée ?

- Ongle décollé ou tombé après un choc, une infection ou certains traitements
- Après le retrait d’une partie d’ongle décollée
- Risque que la peau au bout ou sur le côté de l’orteil gêne la repousse de l’ongle

## Déroulement

1. **Examen** de l’ongle et recherche de la cause du décollement, qui est traitée d’abord.
2. **Préparation** de l’ongle et de son pourtour, avec des instruments stérilisés.
3. **Modelage** de l’ongle artificiel, puis vérification de sa tenue.
4. **Contrôles et renouvellement** selon la repousse de l’ongle naturel.

## Limites

Une onychoplastie n’est pas posée sur une plaie, une infection ou une mycose de l’ongle : elles sont traitées d’abord. Une allergie connue aux résines ou aux colles doit être signalée. Une tache ou une bande foncée sous l’ongle, sans choc connu, doit être montrée au médecin.

## Hygiène et entretien

Garder les pieds propres et bien secs. Ne pas soulever ni limer soi-même l’ongle artificiel. Signaler toute douleur, rougeur ou odeur inhabituelle.$q$,
$q$[{"q":"L’onychoplastie est-elle un soin esthétique ?","r":"Non. Elle protège l’orteil quand l’ongle est abîmé ou absent et accompagne sa repousse. Elle est décidée après un examen de l’ongle."},{"q":"Faut-il une ordonnance ?","r":"Non. Le pédicure-podologue peut la réaliser sans prescription médicale."},{"q":"Est-elle remboursée ?","r":"Non, l’Assurance Maladie ne la rembourse pas. Certaines complémentaires santé participent. Le tarif est indiqué avant le soin."},{"q":"Combien de temps tient-elle ?","r":"Cela dépend de la pousse de l’ongle et des frottements dans la chaussure. Elle est contrôlée et refaite si besoin jusqu’à la repousse de l’ongle."}]$q$::jsonb,
14, 'healthicons:foot-outline'),

-- 3. Orthoplastie
-- Sources : [CSP] 7° (orthoplasties) ; [HAS] § 3.5.2 (indications : déformations réductibles, protection des
-- frottements dorsaux et interdigitaux, douleur, gêne au chaussage, décharge d'une plaie ; mise en place par le patient
-- seul ou aidé ; contre-indications ; port progressif ; surveillance 2 fois par jour pendant 10 jours si sensibilité
-- diminuée, puis quotidienne ; amovibles et lavables) ; [HAS] annexe 6 (élastomère de silicone, duretés Shore,
-- moulage en décharge, en charge ou dans la chaussure) ; [HAS] § 3.5 (seules les orthèses plantaires ont une base de
-- remboursement) ; ameli.fr, « Consultation et traitement de l'hallux valgus », mis à jour le 19/01/2026 (les
-- orthoplasties réduisent les pressions mais ne corrigent pas la déformation ; chaussures assez larges) :
-- https://www.ameli.fr/assure/sante/themes/hallux-valgus/consultation-traitement
('podologue', 'orthoplastie', 'Orthoplastie', $q$Orthoplastie : orthèses d’orteils sur mesure à {ville}$q$,
$q$Des orthèses d’orteils en silicone, moulées sur mesure pour protéger les orteils des frottements, les séparer ou les maintenir.$q$,
$q$## En quoi consiste l’orthoplastie ?

L’orthoplastie est une orthèse d’orteil faite sur mesure en silicone. Amovible et lavable, elle se porte dans la chaussure. Selon le besoin, elle protège un orteil des frottements, sépare deux orteils ou maintient un orteil dont la déformation est encore souple.

## Pour qui ?

- Orteils en griffe ou en marteau qui frottent dans la chaussure
- Hallux valgus (« oignon ») et orteils qui se chevauchent
- Cors sur le dessus des orteils ou entre les orteils (œil-de-perdrix)
- Protection d’une zone fragile, par exemple chez une personne diabétique

L’orthoplastie peut réduire les frottements et la gêne à la marche. Elle ne fait pas disparaître une déformation installée.

## Déroulement

1. **Examen** des orteils, assis et debout, et des chaussures portées.
2. **Moulage** du silicone sur les orteils. La souplesse et l’épaisseur sont choisies selon le but recherché.
3. **Essayage et explications** : mise en place, port progressif, entretien.
4. **Contrôle** quelques semaines plus tard pour ajuster si besoin.

## Port et entretien

Le port est progressif. Il faut regarder chaque jour la peau des orteils : rougeur, frottement, petite plaie. Si la sensibilité des pieds est diminuée, par exemple avec un diabète, on vérifie deux fois par jour pendant les dix premiers jours, puis chaque jour. L’orthèse se lave à l’eau et au savon doux. En cas de rougeur ou de plaie, la retirer et contacter le cabinet.

L’orthoplastie ne convient pas en cas d’intolérance de la peau au silicone ou de certaines maladies de la peau. Il faut aussi pouvoir la mettre en place, seul ou avec l’aide d’un proche.

## Prise en charge

Les orthoplasties ne sont pas remboursées par l’Assurance Maladie : parmi les orthèses du pédicure-podologue, seules les orthèses plantaires ont une base de remboursement. Certaines complémentaires santé participent. Un devis est remis avant la fabrication.$q$,
$q$[{"q":"Faut-il une ordonnance pour une orthoplastie ?","r":"Non. Le pédicure-podologue peut la prescrire et la fabriquer sans prescription médicale."},{"q":"L’orthoplastie est-elle remboursée ?","r":"Non, l’Assurance Maladie ne la rembourse pas. Certaines complémentaires santé la prennent en charge en partie. Un devis est remis avant la fabrication."},{"q":"Combien de temps dure une orthoplastie ?","r":"Elle s’use avec le port et les lavages. Son état est vérifié lors des contrôles ; elle est refaite lorsqu’elle est usée, déformée ou ne correspond plus aux orteils."},{"q":"Peut-on la porter dans toutes les chaussures ?","r":"Elle prend un peu de place : il faut des chaussures assez larges et assez hautes à l’avant du pied."}]$q$::jsonb,
15, 'lucide:shield-plus'),

-- 4. Mycose des ongles (onychomycose)
-- Sources : [CSP] 1° (diagnostic et traitement des onychopathies), 2° (meulage), 5° (prescription de topiques) ;
-- [HAS] encadré 3 (prélèvement mycologique pour affirmer le diagnostic), § 3.6.6 (adresser au médecin traitant une
-- onychomycose sévère ou associée à un diabète ou à des troubles immunitaires ; découpe des tablettes décollées,
-- fraisage ; traitement local si atteinte distale, traitement par voie orale si atteinte de la matrice ou de plusieurs
-- ongles → médecin ; traitement non systématique, de plusieurs mois ; imidazolés et anticoagulants) ;
-- ameli.fr, « Consultation et traitement en cas de mycose cutanée », mis à jour le 11/03/2026 (vernis 3 à 6 mois ;
-- comprimés en général 12 semaines pour les ongles des pieds ; traiter les espaces entre les orteils) :
-- https://www.ameli.fr/assure/sante/themes/mycose-cutanee-peau/consultation-traitement
('podologue', 'mycose-ongles', 'Mycose des ongles', $q$Mycose des ongles : soins et conseils à {ville}$q$,
$q$Soins de l’ongle atteint d’une mycose (onychomycose), conseils pour limiter les récidives, et lien avec le médecin pour le diagnostic et le traitement.$q$,
$q$## Qu’est-ce qu’une mycose de l’ongle ?

L’onychomycose est une infection de l’ongle par des champignons microscopiques. L’ongle devient jaunâtre ou blanchâtre, s’épaissit, s’effrite et peut se décoller. Elle touche surtout les ongles des pieds et évolue lentement.

Un ongle épais ou décoloré n’est pas toujours une mycose : des frottements répétés dans la chaussure ou d’autres maladies de l’ongle peuvent lui donner le même aspect. D’où l’intérêt d’un examen, et parfois d’un prélèvement.

## Le rôle du pédicure-podologue

- **Examen** de l’ongle et de la peau, notamment entre les orteils
- **Soins de l’ongle** : découpe des parties décollées et meulage de l’épaisseur, pour diminuer la gêne et aider le traitement local à agir
- **Traitement local** : selon la situation, un traitement à appliquer (vernis, crème) peut être prescrit, avec des explications sur son usage
- **Conseils** d’hygiène et de chaussage pour limiter les récidives

## Le lien avec le médecin

Le médecin est consulté en cas de doute sur le diagnostic (un prélèvement de l’ongle peut être demandé), lorsque plusieurs ongles ou la base de l’ongle sont atteints (un traitement par comprimés peut alors être prescrit), et chez les personnes diabétiques ou dont les défenses immunitaires sont diminuées.

Signaler un traitement anticoagulant : certains antifongiques de la famille des imidazolés, même appliqués sur la peau, peuvent renforcer son effet ; le signaler aussi au médecin et au pharmacien. Ce traitement est également pris en compte pour les soins de l’ongle, afin d’éviter tout saignement.

## Ce qu’il faut savoir

Le traitement est long : plusieurs mois, le temps que l’ongle repousse. Il ne doit pas être arrêté trop tôt. Le résultat dépend de l’étendue de l’atteinte et de la régularité du traitement. La mycose peut revenir.

## Limiter la contagion et les récidives

- Bien sécher les pieds, surtout entre les orteils
- Porter des sandales dans les douches et piscines collectives
- Ne pas partager serviettes, chaussettes, coupe-ongles ou limes
- Changer de chaussettes chaque jour
- Traiter aussi une mycose de la peau entre les orteils si elle existe$q$,
$q$[{"q":"Faut-il une ordonnance pour consulter ?","r":"Non, il est possible de consulter un pédicure-podologue sans ordonnance. Le médecin est consulté si le diagnostic doit être confirmé ou si un traitement par comprimés est envisagé."},{"q":"Les soins sont-ils remboursés ?","r":"Le soin courant n’est pas remboursé par l’Assurance Maladie. Les personnes diabétiques dont le pied est classé à risque (grades 2 et 3) par le médecin bénéficient de séances de prévention prises en charge, sur prescription médicale. Certaines complémentaires santé participent aux autres soins."},{"q":"Combien de temps dure le traitement ?","r":"Plusieurs mois. La durée dépend du produit et de l’étendue de l’atteinte : suivre la prescription ou la notice, sans arrêter trop tôt. Un traitement par comprimés prescrit par le médecin dure en général 12 semaines pour les ongles des pieds."},{"q":"Le meulage de l’ongle fait-il mal ?","r":"Le meulage réduit l’épaisseur de l’ongle. Une sensation de vibration ou de chaleur est possible ; la vitesse est adaptée si l’orteil est sensible."},{"q":"La mycose peut-elle revenir ?","r":"Oui. Les conseils d’hygiène, le traitement des mycoses entre les orteils et des chaussures bien aérées limitent ce risque."}]$q$::jsonb,
16, 'healthicons:foot-outline'),

-- 5. Cors et durillons (hyperkératoses)
-- Sources : [CSP] 1° et 2° (hyperkératoses ; rabotage, fraisage, meulage) ; [HAS] § 3.2 (coricides proscrits en cas
-- de fragilité cutanée, de pathologie vasculaire ou de diabète ; pas de matériel tranchant par le patient), § 3.4.1
-- (techniques les moins agressives, instruments rotatifs, fréquence adaptée, traitement orthétique), § 3.6.8 (plaie
-- diabétique : consultation dans les 48 heures) ; ameli.fr, « Traitement des cors, callosités et durillons des pieds »,
-- « Cors… : que faire et quand consulter ? », « Prévenir les cors… », mis à jour le 12/08/2025 :
-- https://www.ameli.fr/assure/sante/themes/cors-pieds/traitement
-- https://www.ameli.fr/assure/sante/themes/cors-pieds/bons-reflexes
-- https://www.ameli.fr/assure/sante/themes/cors-pieds/prevention
-- NHS, « Corns and calluses », relu le 28/07/2026 (ne pas les couper soi-même ; diabète : avis professionnel) :
-- https://www.nhs.uk/conditions/corns-and-calluses/
('podologue', 'cors-durillons', 'Cors et durillons', $q$Cors et durillons : soins à {ville}$q$,
$q$Retrait des cors, durillons et callosités, recherche de leur cause et prévention par le chaussage, les orthoplasties ou les semelles.$q$,
$q$## D’où viennent les cors et les durillons ?

Cors, durillons et callosités sont des épaississements de la peau, appelés hyperkératoses. Ils sont dus à des frottements ou à des pressions répétés : chaussures trop étroites ou à talons hauts, orteils déformés, appuis trop marqués sous l’avant-pied. Le cor a un noyau dur qui appuie vers l’intérieur et peut être très douloureux. Une verrue plantaire peut ressembler à un cor : l’examen permet de les distinguer.

## Le soin

La corne est retirée et le noyau du cor enlevé avec des instruments stérilisés (bistouri, fraise). La technique est adaptée à la sensibilité et à la fragilité de la peau. Le soin diminue la gêne à la marche ; plusieurs séances sont parfois nécessaires.

## Prévenir les récidives

Tant que la cause persiste, la corne se reforme. Selon l’examen :

- **Chaussage** : chaussures souples, assez larges à l’avant, sans couture intérieure gênante, à talon bas
- **Orthoplastie** : orthèse d’orteil en silicone qui protège une zone de frottement
- **Orthèses plantaires** (semelles orthopédiques) pour mieux répartir les appuis, après un bilan podologique
- **Hydratation** de la peau, sauf entre les orteils

## À éviter

Ne pas couper soi-même un cor avec une lame ou des ciseaux. Les produits et pansements « coricides » sont à proscrire en cas de diabète, de troubles de la circulation ou de peau fragile : ils peuvent provoquer une plaie.

## Diabète : vigilance

Avec un diabète, la sensibilité des pieds peut diminuer et la peau cicatrise moins bien : une petite blessure peut passer inaperçue. Les soins sont à confier à un professionnel. Un cor, un durillon ou une zone de peau qui change de couleur doit être montré rapidement au pédicure-podologue ou au médecin. En cas de plaie, consulter le médecin sans attendre. En cas de rougeur qui s’étend, de fièvre ou de plaie qui s’aggrave, appeler le 15.$q$,
$q$[{"q":"Faut-il une ordonnance pour soigner un cor ?","r":"Non, il est possible de consulter un pédicure-podologue sans ordonnance."},{"q":"Le soin est-il remboursé ?","r":"Le soin courant n’est pas remboursé par l’Assurance Maladie. Les personnes diabétiques dont le pied est classé à risque (grades 2 et 3) par le médecin bénéficient de séances de prévention prises en charge, sur prescription médicale. Certaines complémentaires santé participent aux autres soins."},{"q":"Le soin est-il douloureux ?","r":"Le soin retire la corne sans entamer la peau saine. Il diminue souvent la pression du cor ; la technique est adaptée si la zone est sensible."},{"q":"À quelle fréquence revenir ?","r":"Selon la vitesse à laquelle la corne se reforme, le chaussage et l’activité. Le rythme est fixé lors de la première séance."},{"q":"Le cor peut-il revenir ?","r":"Oui, tant que le frottement ou la pression persiste. C’est pourquoi le soin s’accompagne de conseils de chaussage et, si besoin, d’une orthoplastie ou de semelles."}]$q$::jsonb,
17, 'lucide:layers'),

-- 6. Ongles épais (onychogryphose, ongles épaissis)
-- Sources : [CSP] 1° et 2° (onychopathies ; fraisage, meulage) ; [HAS] § 3.4 (précautions chez les patients
-- diabétiques, artériopathes ou neuropathes : éviter toute effusion de sang), § 3.4.2 « Plaques unguéales
-- hypertrophiques » (fraiser régulièrement en respectant la courbure ; l'ongle aminci ne gêne pas le chaussage et évite
-- les traumatismes), encadré 3 (lésion suspecte, pic de lésions malignes après 70 ans), § 3.6.1 (personne âgée avec
-- douleurs aux pieds ou difficultés à la marche : bilan en pédicurie-podologie pour prévenir les chutes), glossaire
-- « Onychogryphose » (facteurs : traumatismes, microtraumatismes, troubles statiques ou circulatoires, neuropathie,
-- absence de soin et de coupe, mycose surajoutée).
('podologue', 'ongles-epais', 'Ongles épais', $q$Ongles épais : soins à {ville}$q$,
$q$Un soin régulier des ongles épaissis ou déformés, fréquents avec l’âge, pour marcher plus confortablement et éviter les blessures.$q$,
$q$## Pourquoi les ongles s’épaississent-ils ?

Avec l’âge, les ongles des pieds s’épaississent souvent et deviennent plus durs. Des chocs ou frottements répétés dans la chaussure, des orteils déformés, des troubles de la circulation, une mycose ou des ongles longtemps restés sans soin peuvent y contribuer. Dans sa forme marquée, l’onychogryphose, l’ongle très épais se recourbe et prend l’aspect d’une griffe.

## Pourquoi s’en occuper ?

Un ongle épais est difficile à couper soi-même. Il appuie dans la chaussure, peut blesser l’orteil ou l’orteil voisin et rend la marche inconfortable. Des pieds douloureux rendent la marche moins sûre : prendre soin de ses ongles participe à la prévention des chutes.

## Le soin

- **Coupe** de l’ongle avec des instruments stérilisés
- **Meulage** (fraisage) pour réduire son épaisseur, en respectant sa courbure
- **Soin des bords de l’ongle** et de la corne éventuelle autour ou sous l’ongle
- **Conseils** de chaussage : chaussures assez hautes et larges à l’avant

Des précautions particulières sont prises pour éviter tout saignement, notamment chez les personnes diabétiques, sous anticoagulant ou ayant des troubles de la circulation.

## Pour qui ?

Personnes âgées, personnes qui ne peuvent plus atteindre leurs pieds ou qui voient mal, personnes diabétiques ou ayant des troubles de la circulation. Les soins se font au cabinet ou, selon les disponibilités, à domicile ou en établissement.

## Quand voir le médecin ?

Une tache, une bande foncée ou un saignement sous l’ongle apparus sans choc, une plaie de l’orteil ou une rougeur qui s’étend doivent être montrés au médecin.$q$,
$q$[{"q":"Faut-il une ordonnance ?","r":"Non, il est possible de consulter un pédicure-podologue sans ordonnance."},{"q":"Le soin est-il remboursé ?","r":"Le soin courant n’est pas remboursé par l’Assurance Maladie. Les personnes diabétiques dont le pied est classé à risque (grades 2 et 3) par le médecin bénéficient de séances de prévention prises en charge, sur prescription médicale. Certaines complémentaires santé participent aux autres soins."},{"q":"Le meulage de l’ongle fait-il mal ?","r":"Le meulage réduit l’épaisseur de l’ongle. Une sensation de vibration ou de chaleur est possible ; la vitesse est adaptée si l’orteil est sensible."},{"q":"À quelle fréquence prévoir un soin ?","r":"L’ongle épais se reforme : un soin régulier est nécessaire. Le rythme dépend de la pousse et du chaussage ; il est fixé lors de la première séance."},{"q":"Le soin peut-il se faire à domicile ?","r":"Selon les secteurs et les disponibilités du cabinet. Le plus simple est de contacter le cabinet par téléphone."}]$q$::jsonb,
18, 'lucide:scissors'),

-- 7. Soins à domicile
-- Sources : CSP, art. R4322-83 (installation professionnelle fixe ; l'exercice exclusif au domicile des patients est
-- interdit), via le code de déontologie publié par l'ONPP (édition mars 2025) :
-- https://www.onpp.fr/assets/cnopp/fichiers/publications/ONPP_CODEDEONTO24-A5-Mars25_BD.pdf
-- ONPP, recommandations déontologiques « Conditions matérielles nécessaires pour l'exercice de la pédicurie-podologie
-- en cabinet », mises à jour le 09/01/2026 (instrumentation autoclavable ou à usage unique, micromoteur distinct pour
-- les soins à domicile, traçabilité de la stérilisation, filière DASRI) :
-- https://www.onpp.fr/assets/cnopp/fichiers/recommandations/20260210-recommandations_deontologiques_cond_materielles.pdf
-- [HAS] § 3.6.1 (personnes âgées) et annexe 7 (moulage possible si le patient ne peut se déplacer au cabinet).
-- Non vérifié sur une source de 1er rang : montants des indemnités de déplacement (IFD, IK) → texte volontairement
-- non chiffré, le cabinet renseigne.
('podologue', 'soins-a-domicile', 'Soins à domicile', $q$Soins de pédicurie à domicile à {ville}$q$,
$q$Des soins des pieds chez les personnes qui ne peuvent pas se rendre au cabinet, avec des instruments stérilisés et un matériel réservé aux visites.$q$,
$q$## Pour qui ?

Les soins à domicile s’adressent aux personnes qui ne peuvent pas se déplacer facilement : personnes âgées ou dépendantes, personnes à mobilité réduite, retour d’hospitalisation ou d’opération, résidents d’établissement (EHPAD, résidence autonomie).

Le pédicure-podologue exerce à partir de son cabinet : les visites complètent l’activité du cabinet, selon le secteur et les disponibilités.

## Les soins réalisés

- Coupe et soin des ongles, y compris épais ou incarnés
- Cors, durillons et callosités
- Examen des pieds et conseils à la personne et à son entourage
- Séances de prévention du pied diabétique

Certains actes, comme un bilan podologique complet, demandent l’équipement du cabinet. Le cabinet précise ce qui peut être fait à domicile.

## Hygiène

Les instruments sont stérilisés au cabinet, avec une traçabilité, ou à usage unique. Un appareil de soin (micromoteur) est réservé aux visites. Les déchets de soins sont éliminés selon la filière réglementaire.

## Préparer la visite

- Prévoir un siège stable, un bon éclairage et une prise électrique à proximité
- Préparer l’ordonnance éventuelle, la carte Vitale et les chaussures habituelles
- Signaler un diabète, un traitement anticoagulant ou une plaie

## Prise en charge

Le soin et les frais de déplacement sont facturés selon les tarifs du cabinet, indiqués à l’avance. Pour les soins pris en charge par l’Assurance Maladie, par exemple dans le cadre du suivi du pied diabétique, le cabinet précise ce qui est remboursé, déplacement compris.$q$,
$q$[{"q":"Qui peut demander des soins à domicile ?","r":"La personne elle-même, un proche, l’établissement ou le médecin. Le plus simple est de contacter le cabinet par téléphone."},{"q":"Faut-il une ordonnance ?","r":"Non pour un soin de pédicurie. Pour une prise en charge par l’Assurance Maladie (séances de prévention chez la personne diabétique à risque), une prescription médicale est nécessaire."},{"q":"Les soins à domicile sont-ils remboursés ?","r":"Le soin courant n’est pas remboursé par l’Assurance Maladie. Les personnes diabétiques dont le pied est classé à risque (grades 2 et 3) par le médecin bénéficient de séances de prévention prises en charge, sur prescription médicale. Les frais de déplacement sont indiqués à l’avance par le cabinet."},{"q":"L’hygiène est-elle la même qu’au cabinet ?","r":"Les mêmes règles s’appliquent : les instruments sont stérilisés au cabinet ou à usage unique, et un appareil de soin est réservé aux visites."},{"q":"Dans quel secteur le cabinet se déplace-t-il ?","r":"Le secteur dépend du cabinet et de ses disponibilités. Il est précisé lors de la prise de rendez-vous."}]$q$::jsonb,
19, 'tabler:home-heart')

on conflict (profession_slug, slug) do nothing;
