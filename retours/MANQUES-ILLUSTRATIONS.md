# Ce qui manque en illustrations et en icônes (univers podologie)

Analyse du 2026-10-08 (demande de Paul : « ce serait bien d'ajouter d'autres illustrations / éléments d'icônes d'univers liés à
la podologie ; tu peux essayer de regarder ce qui manque comme illustrations ? »).

**Méthode.** On a croisé le catalogue des 20 soins, les 8 thèmes, les pages des sites (accueil, page sujet, fiche de soin,
article, cabinet, accès, questions, domicile), les emplacements des gabarits et l'inventaire de `/admin/illustrations` (dessins
relevé et pédagogique, traits continus, matériel, héros, pictos, kit Sports, bibliothèque) avec vos notes
(`retours/assets-notes.json`, dernière note par élément) et vos statuts (`retours/illustrations-statuts.json`). Un élément
**retiré**, **à retravailler** ou noté **≤ 2 ★** ne compte pas : le sujet est alors considéré comme non couvert. La
posturologie et la réflexologie sont laissées de côté (en attente de validation déontologique).

**Constat d'ensemble.** Les dessins (3,8 ★), le matériel (4,3 ★) et la bibliothèque (4,3 ★) sont solides. Le point faible
est la famille des **pictos** : 2,57 ★ en moyenne, 27 pictos sur 54 notés à 2 ★ ou moins (« trait trop épais » 14 fois,
« illisible en petit », accent invisible sur fond vert). Le kit Sports est presque entièrement à 1-2 ★.

## Top 15 des manques, par priorité

| # | Manque | Pourquoi (constat) | Priorité | État au 2026-10-08 |
|---|---|---|---|---|
| 1 | **Épaisseur et contraste des pictos** (toute la famille) | 14 étiquettes « trait trop épais », 4 « illisible en petit » ; sur fond vert, l'accent vert disparaît (`picto:podoscope`, `k-taping`, `talon-douloureux`, `soins-domicile`) | haute | À arbitrer par Paul : duel « trait 3 / trait 2 » et accent forcé à l'encre sur fond d'accent (changement de charte, touche tous les pictos) |
| 2 | **Héros diabète rassurant** (M1) | 3 héros diabète à 3-4 ★, monofilament tenu en main en premier écran | haute | Proposés : `dessin:chaussage-adapte:pedagogique`, `dessin:auto-examen:pedagogique` |
| 3 | **Hallux valgus** (motif de consultation très fréquent) | aucun dessin, aucun picto | haute | Proposé : `dessin:hallux-valgus:pedagogique` ; picto essayé puis écarté (illisible à 24 px) |
| 4 | **Chaussage adapté** (seniors, diabète, conseils) | `picto:chaussure-ville` 1 ★, `picto:chaussure-enfant` 1 ★, carte Seniors « trop simple » (M3) | haute | Proposés : `dessin:chaussage-adapte:pedagogique`, `picto:chaussure-confort`, `picto:chaussettes` |
| 5 | **Infos pratiques de la page Accès** | ni stationnement ni transports ; `picto:accessibilite` 2 ★, `itineraire` 3 ★ | haute | Proposés : `picto:stationnement`, `picto:transports` ; accessibilité à retravailler |
| 6 | **Talon sec, crevasses, hyperkératose** (pédicurie) | aucun visuel ; seul le durillon est montré | haute | Proposé : `dessin:crevasses-talon:pedagogique` ; picto essayé puis écarté (tache à 24 px) |
| 7 | **Conseils d'hygiène et d'hydratation** (articles, FAQ, diabète) | ni crème, ni hygiène des mains | haute | Proposés : `picto:creme-hydratation`, `picto:hygiene-mains` |
| 8 | **Picto du soin Laser** | le soin laser n'a aucun picto (repli Iconify) ; `ligne:laser` 3 ★ « on dirait pas un laser » | haute | Proposé : `picto:laser` (à juger : objet difficile à reconnaître en petit) |
| 9 | **Pictos des soins notés ≤ 2 ★** | bilan (2), premiers pas (2), verrue (2), mycose (2), cor-durillon (2), pied plat (1), empreintes (2), plateforme (2), analyse de la marche (2) | haute | À retravailler (retouches, pas de nouvelles clés) |
| 10 | **Kit Sports** | 28 éléments sur 37 à ≤ 2 ★ (« focus ballon only », « fais juste un vélo », jambes) | haute | À retravailler (une scène = un objet ou un appui, M4 foulée) |
| 11 | **Carte de santé, honoraires, fauteuil** (cabinet, tarifs) | `picto:carte-vitale` 1 ★, `honoraires` 1 ★, `fauteuil-soins` 1 ★ « sens flou » ; aucun logo officiel possible | moyenne | À retravailler |
| 12 | **Domicile** | `dessin:domicile` 2 ★ (relevé et pédagogique), `picto:soins-domicile` 3 ★ « pied trop bas, trop petit » | moyenne | À retravailler (une scène : mallette posée à l'entrée, pas de maison-pictogramme) |
| 13 | **Éléments d'univers décoratifs inventoriés** | trame de points, empreintes en frise, courbes de niveau existent dans les dessins et animations mais pas comme motifs notables (fonds de section, séparateurs) | moyenne | À créer après arbitrage des pictos (motifs = mêmes géométries) |
| 14 | **Pied d'athlète (mycose interdigitale), ampoule, épine calcanéenne en picto** | aucune vue des espaces interdigitaux ; ampoule : pièges de lecture (ampoule électrique, liquide jaune = pus) ; épine : bibliothèque POD-AT-0008 à 4,8 ★ mais pas de picto | moyenne | À faire (schémas classiques, gros plans) |
| 15 | **Publics : femme enceinte, téléconsultation, contention, râpe à proscrire** | aucun visuel ; demande faible sur les sites ; une interdiction se montre mal (« une négation se montre par une absence ») | basse | À voir avec Paul |

Autres constats, déjà suivis ailleurs : photos par sujet (M2 de `MANQUES.md`), coureur du héros sport (M4), recadrage mobile des
héros (M5), empreintes d'enfant en aplat (M7).

## Première planche (2026-10-08) : 12 éléments créés, tous « À revoir »

Illustrations (registre pédagogique, `packages/core/src/dessins-univers.ts`, base `dessin:<id>` pour « Donner mon avis ») :

| Clé | Ce que ça montre | Sujets | Avis de Claude |
|---|---|---|---|
| `dessin:hallux-valgus:pedagogique` | Pied droit vu de dessus, hallux dévié de 20° vers les autres orteils (au-delà du seuil de 15°), saillie de la tête du 1er métatarsien, halo « corne » discret ; DÉFORMATION continue du pied validé POD-AT-0001 (pas un nouveau dessin) | pédicurie, semelles | Réussi : lecture immédiate « oignon ». Réserve : petits orteils un peu déviés aussi (réaliste, à confirmer par Paul) |
| `dessin:chaussage-adapte:pedagogique` | Profil validé dans une chaussure confort : bout large et haut, deux brides auto-agrippantes, contrefort, col rembourré, talon bas, semelle ferme ; aucune couleur sur la peau | diabète, seniors | Réussi pour le sujet (héros diabète rassurant possible, M1/M3). Réserve : semelle un peu plate |
| `dessin:crevasses-talon:pedagogique` | Même grammaire que la verrue (5 ★) : plante vue de dessous + médaillon relié au talon (bord épaissi ocre doux, fines crevasses) | pédicurie, diabète | Réussi ; à surveiller : bande de corne assez marquée dans le médaillon |
| `dessin:auto-examen:pedagogique` | Miroir sur pied dans lequel se reflète la plante du pied (auto-examen quotidien recommandé par l'Assurance Maladie pour le pied diabétique, miroir ou aide d'un proche : ameli.fr, « Suivi des pieds du diabétique ») | diabète, seniors | Moyen : se comprend avec le texte de la page ; peut se lire « cadre photo ». Le miroir à main a été écarté (lu comme une loupe) |

Pictos (famille du picto entre parenthèses, `packages/core/src/pictos.ts`, section « Planche ce qui manque ») :

| Clé | Avis de Claude |
|---|---|
| `picto:chaussure-confort` (chaussage) | Moyen : chaussure reconnue, bride large à l'accent ; un peu massive à 24 px |
| `picto:chaussettes` (chaussage) | Moyen : chaussette lisible, bord côte à l'accent |
| `picto:auto-examen` (soins) | Réussi : miroir sur pied et plante à l'accent, lisible à 24 px |
| `picto:creme-hydratation` (soins) | Moyen : tube lisible ; la noisette peut être prise pour un nuage |
| `picto:laser` (examens) | À revoir : pièce à main et faisceau lisibles en grand, objet peu reconnaissable en petit |
| `picto:hygiene-mains` (cabinet) | Réussi : flacon pompe et goutte, sens immédiat |
| `picto:stationnement` (infos pratiques) | Réussi : voiture vue de dessus entre deux lignes, sans lettre « P » |
| `picto:transports` (infos pratiques) | Réussi : bus vu de face, bandeau sans texte |

Écartés après essais (non livrés) : picto hallux valgus (les orteils déviés se lisent « main » à 24 px), picto crevasses
(tache au talon à 24 px), picto sachet de stérilisation (lu « maison » debout, « flèche retour » couché).

Aucun n'est branché sur les sites (`PICTOS_SOINS` et `VISUELS_SOINS` inchangés) ; aucune animation (règle : jamais avant la
validation des images de base). Sujets et hashtags par défaut : fiches de `dessins-univers.ts` (modifiables dans l'admin).
Planches et vues en situation : dossier de travail de la session (`illustrations-manques/`), aucune image dans le dépôt.
