# Analyse des sites webpodologue — Belgique et Suisse (9 sites)

Analysé le 2026-10-04.

**Inaccessibles :** podologue-burdiat.be (erreur 503), podologuelausanne.ch (erreur 500), podologue-nyon-gland.ch (DNS).
**Ne pointe plus vers webpodologue :** centredepodologiedunordvaudois.ch (redirige vers un autre site Squarespace).

| Domaine | Pays | Titre | Mentions | Praticiens | Compétences | RDV | Remboursement | Rare |
|---|---|---|---|---|---|---|---|---|
| podologuebruxelles.be | BE | Podologue du sport et posturologue | « Agréé INAMI » | 1 | Podologie du sport, Posturologie, Podo-pédiatrie, K-Taping, Orthèses plantaires | Téléphone | — | « Apporter radios + chaussures » |
| podologuewaterloo.be | BE | Pédicure-Podologue / podothérapeute | — | 2 | Soins curatifs et préventifs, Semelles/orthèses, Analyse posturale statique/dynamique, Sport | **Doctoranytime** | — | 2e lieu le samedi |
| bergiers-podologie.be | BE | Podologue du Sport | **N° INAMI 5-70822-23-701** | 1 | Pédicurie, Podologie du sport, Semelles orthopédiques | **Rosa.be** | — | **5 lieux**, paiement par **QR code** |
| lausannepodologue.ch | CH | « podologue expert » | — | 1 | Bilan, Orthoplastie, Orthonyxie, Cors/durillons/verrues/mycoses | Formulaire, tél. +41 | — | — |
| podo-ortho-lab.ch | CH | Pédicure-podologue | **Membre SSP**, agréé SSP diabète | 1 | Mycoses, Semelles orthopédiques, Diabète, Posturologie, Conseils | **OneDoc** | Complémentaire uniquement, plafond 90 CHF/h, ordonnance ; SASH pour chaussures | 2 cabinets |

## Belgique : ce qui change par rapport à la France

- **Titre** : légalement « **podologue** » (bachelier en podologie, agréé SPF Santé publique). « Pédicure » désigne une autre profession, non médicale : il ne faut **pas** utiliser « pédicure-podologue » par défaut.
- **Mentions** : **n° INAMI** (format 5-XXXXX-XX-XXX) et « agréé INAMI ». Il n'y a ni Ordre ni RPPS.
- **RDV** : Rosa.be, Doctoranytime, Progenda, téléphone.
- **Paiement** : Bancontact, QR code/Payconiq.
- **Champs à ajouter** : n_inami (avec validation du format), agrément SPF, conventionnement, diplôme (bachelier + école), outil RDV, BCE/TVA, multi-cabinets, remboursement (mutuelle, trajet de soins diabète, prescription), langue FR/NL.

## Suisse : ce qui change par rapport à la France

- **Titre** : officiellement « **Podologue ES** », avec « pédicure-podologue » en variante (diplôme étranger reconnu par la CRS).
- **Mentions** : membre SSP, agrément SSP diabète, n° RCC/ZSR, ASCA/RME, autorisation cantonale, IDE (CHE-xxx.xxx.xxx).
- **RDV** : OneDoc, Medicosearch, formulaire.
- **Remboursement** : **pas par la LAMal** (assurance de base), seulement par la complémentaire (LCA), sous conditions : membre SSP, plafond horaire, diabète, ordonnance. Aides cantonales (SASH Vaud, AI/AVS pour les chaussures).
- **Formats** : CHF 90.–, téléphone +41.
- **Champs à ajouter** : titre_ch, membre_ssp, agrément diabète, rcc_zsr, asca/rme, autorisation cantonale, ide_che, canton, devise, multi-cabinets.

## Conséquence pour la plateforme

Prévoir un **champ pays** (FR / BE / CH) qui pilote :
- le titre par défaut ;
- le bloc de mentions (Ordre et RPPS / INAMI / SSP et RCC) ;
- le module de remboursement ;
- la liste des outils de RDV et des moyens de paiement ;
- les formats (téléphone, devise).
