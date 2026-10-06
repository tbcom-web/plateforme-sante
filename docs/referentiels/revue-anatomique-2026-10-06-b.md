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
