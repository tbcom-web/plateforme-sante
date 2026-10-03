# Référentiel des sites de praticiens — synthèse des réalisations webpodologue

**Source** : analyse de 79 sites webpodologue le 2026-10-04 (détail par lot dans `analyse-sites/`).
**Lecture** : 51 sites ont été lus, 28 sont hors ligne, en maintenance ou redirigés.

## 1. Constats clés

- **Gabarits existants** :
  - A (ancien) : 3e personne, encyclopédique.
  - B (récent) : sections en tuiles, voix « nous », FAQ, actualités, mutuelle.
- **Voix** : la 3e personne domine nettement. Le « nous » sert surtout aux titres et aux cabinets de groupe. Le « je » est rare (bios, blogs, un site entier).
- **Parc vieillissant** :
  - 28 sites sur 79 sont inaccessibles : DNS expiré, erreur serveur, maintenance ou redirection.
  - 1 site est piraté (spam pharmaceutique).
  - Une mention est obsolète (Autolib).
  - **C'est un argument fort pour une plateforme maintenue centralement, et une liste de clients à relancer.**
- **Défauts de saisie observés en production** :
  - placeholder « [NumOrdre] » publié ;
  - même n° d'Ordre pour deux praticiens ;
  - RPPS affiché à la place du n° d'Ordre ;
  - lien Doctolib vers la mauvaise ville ;
  - tuiles vides ;
  - plusieurs H1 par page ;
  - texte dupliqué entre sites.

## 2. Modèle de données à prévoir

### Cabinet

- **Pays** : FR / BE / CH. Le pays pilote le titre, les mentions, le remboursement, les outils de RDV, les paiements et les formats.
- **Nom du cabinet, ville principale, communes voisines ou secteurs** (SEO local).
- **Lieux d'exercice (1..n)**, pour chacun :
  - nom (cabinet, maison de santé, pôle de santé, espace santé) ;
  - adresse, complément (entrée, étage, ascenseur) ;
  - horaires propres.
- **Horaires**, jour par jour :
  - plusieurs plages, pause méridienne ;
  - samedi, et exceptions (« 1 samedi par mois », « un samedi sur deux », « sur appel ») ;
  - créneaux attribués à un praticien, créneaux réservés au domicile.
- **Accès** :
  - parking (gratuit, privé, nommé avec itinéraire, distance), dépose minute ;
  - PMR / rez-de-chaussée ;
  - transports (mode, ligne, arrêt, distance), navette.
- **RDV** :
  - mode (en ligne, téléphone seul, les deux) ;
  - outil : Doctolib, RdvDoc, Rosa.be, Doctoranytime, OneDoc, autre ;
  - lien par praticien.
- **Paiements** :
  - CB, chèque, espèces. L'absence de CB est fréquente.
  - Bancontact et QR code en Belgique.
- **Visites à domicile** : actif, jours et créneaux, communes desservies.
- **Message important** (déménagement, congés, nouvelles conditions), avec une date de fin.
- **Tarifs** (facultatif) et **page Mutuelle / remboursement** avec devis PDF.
- **Galerie photos du cabinet**.
- **Actualités**.
- **Version anglaise** (facultatif).
- **Légal** : SIRET (FR), BCE/TVA (BE), IDE (CH) ; liens ONPP (annuaire et charte de déontologie des sites internet).

### Praticien (1..n)

- **Identité et statut** : nom, statut (titulaire / collaborateur / remplaçant).
- **Titre selon le pays** : FR « Pédicure-podologue (DE) » ; BE « Podologue » ; CH « Podologue ES ».
- **Identifiants**, avec validation de format et d'unicité :
  - FR : n° d'inscription au tableau de l'Ordre (9 chiffres) et RPPS (11 chiffres) ;
  - BE : n° INAMI (5-XXXXX-XX-XXX) ;
  - CH : membre SSP, RCC/ZSR, ASCA/RME, autorisation cantonale.
- **Parcours** : diplôme et école (EEPP, IFPP, IFM3R…) ; DU avec l'année ; formations ; références (formateur, clubs, CREPS, enseignement STAPS) ; ancienneté.
- **Exercice** : orientations (compétences mises en avant), sports suivis, équipements d'analyse, jours de présence, lien RDV, bio (voix au choix).

## 3. Lexique des compétences (libellés canoniques)

| Famille | Libellé canonique | Variantes rencontrées |
|---|---|---|
| Pédicurie | Pédicurie | Pédicurie-Podologie, Pédicurie générale, Soins / Traitements de pédicurie |
| Pédicurie | Verrues plantaires | Verrues, Traitement des verrues par azote liquide |
| Pédicurie | Orthonyxie, onychoplastie, orthoplastie | Appareillages / orthèses d'orteils |
| Pédicurie | Soins antifongiques | Mycoses |
| Bilan et appareillage | Bilan podologique | Podologie, Consultations de podologie |
| Bilan et appareillage | Semelles orthopédiques | Semelles, Orthèses plantaires, Traitements de podologie |
| Publics | Podologie du sport | Analyse du coureur, Analyse de la course à pied, Posture du cycliste, Skieur |
| Publics | Podopédiatrie | Podo Pédiatrie, Podo-pédiatrie, Podologie de l'enfant / adaptée aux enfants |
| Publics | Podo-diabétologie | Pied diabétique, Pododiabétologie |
| Publics | Podologie du sénior | Podogériatrie |
| Publics | Pied et cancer | Oncologie |
| Posture | Posturologie | Biomécanique et posture, Prise en charge posturale globale, Réflexes archaïques |
| Pathologies | Douleurs du pied, de la cheville, du genou, de la hanche et du dos | — |
| Pathologies | Épine calcanéenne | Talalgie |
| Pathologies | Maladie de Sever | — |
| Techniques | Laser | K-Laser, Thérapie laser (photobiomodulation) |
| Techniques | K-Taping | — |
| Techniques | Plateforme podométrique | — |
| Techniques | Méthodes propriétaires | Méthode GDS (texte libre) |
| Complémentaires | Réflexologie plantaire | Réflexologie (allégations à encadrer) |

**Fréquence observée** : Semelles ≈ 100 % ; Pédicurie ≈ 90 % ; Podologie / Bilan ≈ 70 % ; Podopédiatrie ≈ 50 % ; Posturologie ≈ 50 % ; Sport ≈ 50 % ; Podo-diabétologie ≈ 30 % ; Laser ≈ 10 %.

## 4. Profils de cabinet et tons

| Profil | Indices dans les sites | Voix | Modèle |
|---|---|---|---|
| Proximité (praticien seul, cabinet classique) | 3 à 5 compétences, infos pratiques | 3e personne sobre | Proximité |
| Maison de santé / groupe | 2 à 3 praticiens, RDV par praticien | « nous » ou 3e personne | Proximité ou Premium |
| Sport et posture | Sports nommés, analyse de la course, références | 3e personne, bios au « je » possibles | Premium |
| Prévention et domicile | Podo-diabétologie, sénior, domicile avec secteurs | 3e personne prudente | Proximité |
| Technique (laser, plateforme) | Pages technologie, FAQ | « nous » pédagogique | Premium |

## 5. Contrôles à la publication

- Champs obligatoires selon le pays : titre, identifiant professionnel, adresse, téléphone.
- Format et unicité des identifiants : Ordre 9 chiffres, RPPS 11 chiffres, INAMI, etc.
- Aucun placeholder (`[…]`, `xxx`) dans le texte publié.
- Lien de RDV valide, et ville cohérente avec le cabinet.
- Aucune section ni tuile vide : une section sans données est masquée.
- Un seul H1 par page.
- Lexique : termes interdits et reformulations (voir `packages/core/src/lexique.ts`).
- Texte de chaque site unique : génération personnalisée, pas de copier-coller entre sites.
