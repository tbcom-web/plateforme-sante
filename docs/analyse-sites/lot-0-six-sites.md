# Analyse des sites webpodologue — lot 0 (6 sites, analyse détaillée)

Sites : podologuerennes.fr, delphineleblancpedipodo.fr, podologuesarlat.fr, podologue-egreteau-oleron.fr,
podologue-sauvaget.fr, podologuewinter.fr. Analysé le 2026-10-04.

## Deux gabarits existants

- **Gabarit A (ancien, Divi)** : Rennes, Sarlat, Oléron. Un en-tête nom / adresse / téléphone / horaires, puis un bloc « Votre praticienne » (Pédicure-Podologue DE et n° d'Ordre) et des pastilles de compétences. Une barre latérale contient le plan d'accès, le RDV et les liens ONPP.
- **Gabarit B (récent)** : Leblanc, Sauvaget, Winter. Les sections s'enchaînent ainsi : Cabinet de podologie / ville, Praticien(ne)s, Nos compétences, Actu, Le cabinet, Infos pratiques (tuiles), Moyens de règlement. Le n° d'Ordre et le SIRET sont en pied de page. Une barre mobile propose trois actions : téléphone, RDV et plan.

## Champs de données récurrents

- **Identité** : nom, titre « Pédicure-Podologue » (± DE), ville principale et communes secondaires.
- **Praticiens (1..n)** : nom, rôle (titulaire / collaborateur / remplaçant), diplôme d'État, n° d'inscription au tableau de l'Ordre (9 chiffres, à distinguer du RPPS à 11 chiffres), RPPS en option, jours de présence.
- **Légal** : SIRET, liens ONPP (annuaire, charte de déontologie des sites internet), mentions légales.
- **Lieu** : nom du lieu (Espace santé, Pôle de santé, Maison de santé), adresse, itinéraire et carte.
- **RDV** : téléphone ; Doctolib avec lien profond (nouveau patient), à vérifier (ville et praticien) ; formulaire de contact en option.
- **Horaires** : jour par jour avec plusieurs plages et le samedi ; affichage regroupé ; créneaux propres à un praticien.
- **Accès** : parking (gratuit, nommé, avec itinéraire), PMR et rez-de-chaussée, transports (ligne, arrêt).
- **Paiements** : espèces, chèques, CB.
- **Domicile** : oui ou non, avec les secteurs.
- **Compétences** : choix multiple, avec une page et une pastille par compétence.
- **Actualités** : titre, date, extrait.
- **Photos du cabinet**, version anglaise (« Podiatrist [ville] »).

## Lexique des compétences, par famille

- **Pédicurie** : Pédicurie, Pédicurie-Podologie.
  - Sous-actes : orthonyxies, onychoplasties, orthoplasties, contentions nocturnes.
  - Affections : ongles incarnés, cors, verrues plantaires, mycoses unguéales.
- **Bilan et appareillage** : Podologie, Bilan podologique, Semelles, Semelles orthopédiques, orthèses plantaires.
  - Outils : plateforme de pression, podoscope.
- **Publics** : Podologie du sport (avec la liste des disciplines), Podopédiatrie (variantes : Podo Pédiatrie, Podo-pédiatrie, Podologie de l'enfant), Podogériatrie, Pododiabétologie.
- **Posture** : Posturologie, bilans posturaux.
- **Technologies** : K-Laser (photobiomodulation).
- **Complémentaires** : Réflexologie plantaire. Allégations sensibles, à encadrer.
- **Pages d'information** : Mutuelle (remboursement, devis PDF), Accès, Le cabinet, Actualités.

Il faut normaliser les orthographes : un libellé canonique et un slug fixe par compétence.

## Tons observés

| Ton | Sites | Profil de cabinet |
| --- | --- | --- |
| 3e personne encyclopédique et sobre | Rennes, Oléron, Winter | Praticien seul, cabinet classique |
| 3e personne pédagogique et prudente, avec un « nous » ponctuel | Sarlat | Maison de santé, met en avant une technologie |
| « Nous » orienté patient, plus commercial | Leblanc, Sauvaget | Nombreuses compétences ou plusieurs praticiens |
| « Je » | jamais observé | — |

## Éléments rares à prévoir

- Praticien mentionné seulement dans les horaires (Winter).
- Page Mutuelle avec devis PDF.
- Actualités de la profession (prise en charge Assurance Maladie, loi RIST).
- FAQ dans une page de soin.
- Page technologie (K-Laser).
- Liste des disciplines sportives.
- Parking nommé.
- Deux lieux d'exercice.
- Page en anglais.

## Contrôles qualité à intégrer (défauts observés en production)

- Placeholder « [NumOrdre] » publié tel quel (Leblanc).
- Même n° d'Ordre pour deux praticiens (Sauvaget).
- Numéro à 11 chiffres affiché comme n° d'Ordre (Egreteau).
- Lien Doctolib pointant vers une autre ville que celle du cabinet (Egreteau → /bordeaux/).
- Tuiles Parking / Accès / Domicile / Infos vides (Sarlat, Oléron, Sauvaget).
- Plusieurs H1 par page (gabarit A).

La plateforme doit donc valider à la publication : champs obligatoires, formats, unicité, aucune tuile vide.
