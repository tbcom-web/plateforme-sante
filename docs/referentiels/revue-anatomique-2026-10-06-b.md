# Revue anatomique : 2026-10-06 (b)

## A. Cors et durillons, orthoplastie : figure refaite (retour de Paul, prioritaire)

Retour de Paul : « la figure du durillon est complètement fausse anatomiquement, il faut absolument réviser ça ». Clés concernées :
`dessin:cors-durillons:releve|pedagogique`, `ligne:cor`, `dessin:orthoplastie:releve|pedagogique`, `ligne:orthoplastie`,
`picto:cor-durillon`, `picto:orthoplastie` (même géométrie), `biblio:…:orteil-griffe-cor|orthoplastie`. Toutes repassent « À revoir »
(empreinte du rendu changée) ; rien n'est passé en « Validé ». Planche : `scratchpad/illustrations-manquantes/cors-durillons-avant-apres.png`.

### Ce qui était faux (revue de l'ancienne coupe sagittale du 2e rayon, construite « à l'œil » le 2026-10-05)

| # | Point | Dessiné | Réalité (anatomie-pied.md, Kapandji, HAS 2020) | Gravité |
|---|---|---|---|---|
| 1 | Proportions orteil / métatarsien | orteil presque aussi long que la diaphyse visible, P1 ≈ 2× trop épaisse, phalanges en « gélules » détachées | 2e orteil ≈ 5,5 cm (P1 ≈ 2,5 ; P2 ≈ 1,7 ; P3 ≈ 1,3), Ø ≈ 1,5–1,8 cm ; le métatarsien (≈ 7 cm) bien plus long que l'orteil | FAUX (bloquant) |
| 2 | Tête du 2e métatarsien | tête très haute, sans coussinet lisible ; durillon dessiné SOUS le sol / hors de la peau en vue de profil | tête ≈ 2 cm au-dessus du sol, coussinet plantaire épais dessous ; le durillon est DANS la peau plantaire, sous la tête | FAUX |
| 3 | Griffe vs marteau | P1 très redressée (≈ 40°) mais P2-P3 en crochet replié sous l'orteil, IPD en flexion extrême : silhouette de « crochet » | griffe : MTP en hyperextension, IPP ET IPD fléchies, pulpe qui ne repose plus (ou à peine) au sol ; marteau : IPP fléchie, IPD en extension | À CORRIGER |
| 4 | Os | os en aplat clair dans une peau colorée : lecture « radio », interlignes approximatifs, phalanges flottantes | (règle des sites) pas d'os quand ils ne servent pas le propos | FAUX (lecture) |
| 5 | Durillon | lentille posée sur le sol, en avant de la tête | plaque d'hyperkératose DIFFUSE, sans noyau, sous les têtes métatarsiennes centrales (2e–3e) | FAUX |
| 6 | Cor | sur la saillie dorsale de l'IPP, avec noyau (juste) mais orteil faux autour | inchangé : face dorsale de l'IPP, sous l'empeigne, ≈ 1/4 de la largeur de l'orteil, noyau à pointe mousse | JUSTE (position) |
| 7 | Chaussure | empeigne qui suit un pied trop haut, bout de chaussure très loin | empeigne à distance du dos du pied, contact seulement au sommet du cor | À CORRIGER |
| 8 | Étiquettes dans l'image | « Cor : noyau dur », « La chaussure frotte »… | consigne de Paul (2026-10-06) : aucune légende visible ; libellés en alt / title | À CORRIGER |
| 9 | Picto cor-durillon | ellipse posée un peu au hasard sous l'avant-pied | plaque sur les têtes réelles M2–M3 (même transformation que la plante) | À CORRIGER (mineur) |

### Correction (bibliotheque/soins-ongles.ts, dessins.ts, ligne.ts, pictos.ts)

- **Plus aucun os.** Seule la silhouette de la peau, construite sur le profil VALIDÉ (pied.ts : piedDeProfil, POD-AT-0003) : dos du
  pied et plante repris tels quels (le dos s'abaisse de ≈ 0,8 cm vers le 2e rayon), hallux en arrière-plan (estompé, plus long :
  formule égyptienne). Orteil 2 accroché à l'avant-pied, MTP à l'aplomb de celle de l'hallux, proportions chiffrées (P1 12,5 u,
  P2 8,5 u, P3 5,6 u ; 1 cm ≈ 5 u), griffe : MTP + 40°, IPP fléchie (≈ 100°), IPD fléchie ; pulpe à ≈ 0,4 cm du sol.
- **Cors et durillons = 2 vues** : à gauche la plante du pied droit vue de dessous (contour POD-AT-0002) avec la plaque du durillon
  hachurée sous les têtes de M2–M3 (aucun point, aucun noyau) ; à droite, dans une fenêtre, l'avant-pied de profil : le cor sur la face
  dorsale de l'IPP, l'empeigne qui le touche, le durillon dans la peau sous la tête ; relevé : la pression sur le SOL (trame).
- **Orthoplastie** : même silhouette ; crête en silicone sous l'orteil (posée sur la semelle) et anneau qui coiffe l'IPP ; la griffe
  n'est pas corrigée à l'image (Ameli).
- Aucun texte dans les deux dessins.

### Contre-revue (illustrateur médical, après correction)

| Clé | Verdict | Lecture profane (2 s) |
|---|---|---|
| dessin:cors-durillons (R, P) | JUSTE | « un dessous de pied avec une zone de corne sous l'avant-pied, et un orteil recroquevillé qui frotte dans la chaussure » |
| ligne:cor | À CORRIGER (mineur) | l'orteil en griffe se lit ; sans l'hallux (3 traits au plus), le bout de la chaussure paraît grand |
| dessin:orthoplastie (R, P), ligne:orthoplastie | JUSTE | « une pièce souple sous et sur l'orteil recroquevillé » |
| picto:cor-durillon | JUSTE (mineur : anneau épais à 48 px) | « une zone sous l'avant-pied » |

Points à faire valider par Paul : pli de flexion sous l'IPP (angle franc, voulu : la griffe), hauteur de la pulpe au-dessus du sol,
hallux estompé derrière l'orteil 2 (vue du 2e rayon), taille de la plaque de durillon.

## B. Matériel, traits continus des soins, héros des thèmes

Auto-revue « illustrateur médical » (`.claude/agents/illustrateur-medical.md`) des créations du 2026-10-06, faites par le graphiste.
Référentiels : `anatomie-pied.md`, `pieges-illustration.md`, `LISEZMOI.md`. Aucun retour de `/admin/illustrations` n'était
disponible pour ces clés (toutes nouvelles) ; aucune illustration existante n'a été retouchée, aucune n'est passée en « Validé ».
Planche : `scratchpad/illustrations-manquantes/planche.png` (session du 2026-10-06).

### Ce qui est réutilisé (aucune géométrie anatomique redessinée)

| Création | Géométries reprises |
|---|---|
| Héros des 7 thèmes | uniquement des dessins existants (dessins.ts, ligne.ts, images fixes des animations, matériel), assemblés ; lectures retirées |
| `materiel:stabilometrie`, `materiel:empreinte-mousse` | contour du pied réel (CONTOUR_PIED, POD-AT-0002) et empreinte (POD-SC-0007) |
| `materiel:thermoformage` | coque et soutien de voûte de la semelle de profil (POD-AT-0005) |
| `materiel:laser` | pièce à main du dessin `laser` |
| `ligne:talon` | profil médial (POD-AT-0003) + aponévrose plantaire (POD-AT-0008) |
| `ligne:taping` | profil médial + axes des bandes du dessin `taping` (contre-revue du 2026-10-04) |
| `ligne:verrue`, `ligne:laser` | plante du pied droit (CONTOUR_PIED), 2e tête métatarsienne (CONTOUR_PIED.mtp) |

### Verdicts

| Clé | Verdict | Lecture profane (2 s) |
|---|---|---|
| materiel:sachets-individuels | JUSTE | « des sachets d'instruments fermés, une pince dedans » (premier jet : bout en chevron lu « maison » → bords droits, chevron pelable imprimé à l'intérieur) |
| materiel:tracabilite-sterilisation | JUSTE | « un ticket imprimé avec une courbe, et un classeur » ; courbe sans valeur lisible |
| materiel:bac-ultrasons | JUSTE | « un bac d'eau avec un panier d'instruments, et un boîtier » |
| materiel:stabilometrie | À CORRIGER (mineur) | « une plateforme, deux pieds, un écran » ; pieds petits en vue rasante, à agrandir si Paul le demande |
| materiel:empreinte-mousse | JUSTE | « une boîte de mousse avec l'empreinte des pieds » ; aucune trame (moulage, pas mesure) |
| materiel:thermoformage | À CORRIGER (mineur) | « un four et une semelle posée sur un moule » ; la coque de profil reste fine à 96 px |
| materiel:touret-poncage | JUSTE | « une machine à deux meules avec des capots d'aspiration » |
| materiel:laser | JUSTE | « une console sur roulettes et sa pièce à main rangée » ; aucun faisceau dans le vide (premier jet : pièce à l'envers, fibre sur l'embout → corrigé) |
| materiel:lampe-loupe | JUSTE | « une lampe-loupe sur pied » (poignée et bras présents : pas de « hublot / machine à laver ») |
| ligne:talon | JUSTE | aponévrose de la tubérosité médiale du calcanéum à la base de P1, dans la peau |
| ligne:taping | JUSTE | bandes DANS le contour de la peau, bouts arrondis, queue en Y sur le mollet (piège « attelle » évité) |
| ligne:verrue | À CORRIGER (mineur) | les lignes de la peau contournent la verrue (elles ne la traversent pas) ; en petit, le médaillon peut se lire « grille » |
| ligne:laser | JUSTE | faisceau étroit qui s'arrête à la peau sous la 2e tête ; aucune couleur sur la peau |
| heros:diabete:* | JUSTE | examen au monofilament (fil plié en C, perpendiculaire) ; aucun rouge « pic », aucun pied nu qui marche |
| heros:enfant:* | JUSTE | premiers pas à côté des pas de l'adulte (≈ 0,5 × la longueur du pied adulte), aucune donnée chiffrée |
| heros:sport:*, ongles, senior, semelles, pedicurie | JUSTE (compositions de dessins déjà revus) | — ; pédicurie : instruments sans main ni visage |

### À faire valider par Paul (priorités)

1. Les héros de thème (21 compositions × 2 formats) : choix des paires de dessins, couleurs de la gamme, surface « plan » en relevé.
2. Les 9 dessins de matériel, surtout leur trait continu (c'est lui que montre la section « Matériel et hygiène ») : stabilométrie
   (pieds petits), thermoformage (coque fine), sachets (sachet du fond visible par transparence : film transparent assumé).
3. `ligne:verrue` : lecture « grille » possible du médaillon ; alternative : moins de lignes, plus courbées.
4. Existant non retouché mais signalé : traits continus automatiques d'`aspiration` et d'`iontophorese` (raccords qui se croisent),
   trait continu du `monofilament-diapason` (le pied couché se lit mal comme « matériel ») ; trait continu d'`arriere-pied` (vue de
   dessus au lieu de dos).

### Pièges nouveaux (à ajouter à pieges-illustration.md si Paul confirme)

- Sachet de stérilisation dessiné avec son bout pelable en pointe = « maison » : bords droits, chevron imprimé à l'intérieur.
- Pièce à main posée à l'envers (fibre sur l'embout) = l'objet « tire » par le mauvais bout : la fibre part de l'arrière, l'embout est fin.
