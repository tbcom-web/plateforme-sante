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

## C. Cors et durillons, orthoplastie : schéma classique (v3, après le retour de Paul sur a3bcb1e)

Retour de Paul (2e version, commit a3bcb1e : profil d'orteil en griffe illisible, « n » cubique dans un cadre) : « Pour le durillon
utilise simplement un schéma classique. Pas besoin d'aller trop hardcore ou trop anatomique. Juste une représentation simple avec un
point sur le pied. » Inspirations montrées (non copiées) : avant-pied vu de dessus avec une tache sur une articulation ; plante avec une
plaque de corne sous l'avant-pied ; schéma de manuel plante + médaillons. Clés retouchées (toutes « À revoir », aucune « Validé ») :
`dessin:cors-durillons:releve|pedagogique`, `ligne:cor`, `dessin:orthoplastie:releve|pedagogique`, `ligne:orthoplastie`,
`picto:cor-durillon`, `picto:orthoplastie`. Planche : `scratchpad/illustrations-manquantes/cors-durillons-v3.png`.

### Composition

- **cors-durillons** : deux vues du même pied droit, géométrie validée CONTOUR_PIED (POD-AT-0001/0002), aucun os, aucune coupe, aucun
  texte. À gauche la plante vue de dessous (hallux à droite) et la plaque du durillon ; à droite l'avant-pied vu de dessus (hallux à
  gauche, 5 orteils et leurs ongles), petit cor rond sur l'IPP du 2e orteil ; l'avant-pied, agrandi, sort du cadre par le bas (ni
  cadre ni fondu : le masque en dégradé n'est pas rendu par WebKit dans les fichiers de dessins). Relevé : l'empreinte en trame (convention des relevés, hallux à gauche), pression concentrée sous les têtes de M2–M3.
- **orthoplastie** : l'avant-pied vu de dessus, plus grand, et un manchon en silicone (aplat d'eau doux) qui coiffe le 2e orteil sur
  l'IPP (protection du cor). L'orteil n'est ni redressé ni déplacé.
- Repères partagés (bibliotheque/soins-ongles.ts) : `PLAQUE_DURILLON`, `COR_DESSUS`, `MANCHON_ORTHO`, repère du pied ; mêmes
  transformations que le pied dans les dessins, le trait continu et les pictos.

### Revue anatomique (auto-revue « illustrateur médical »)

| Point | Dessiné | Référence | Verdict |
|---|---|---|---|
| Proportions des orteils | contour exact de l'atome (CONTOUR_PIED), rien de redessiné ; formule égyptienne, hallux nettement plus large | POD-AT-0001/0002 | JUSTE |
| Sens de l'hallux | plante (vue de dessous) : hallux à droite ; dessus : hallux à gauche ; relevé : hallux à gauche (convention) | pied droit, miroir pour la plante | JUSTE |
| Plaque du durillon | ovale irrégulier ≈ 3,2 × 1,9 cm, centré entre les têtes de M2 et M3, ≈ 0,5 cm en arrière d'elles ; bord distal en arrière du pli des orteils (pas collée aux orteils) ; aplat ocre doux, contour léger, halo flou ; aucun noyau | anatomie-pied.md § Peau et hyperkératoses | JUSTE |
| Cor | sur la face dorsale du 2e orteil, juste en avant de la commissure (IPP : P3 + P2 ≈ 3 cm depuis le bout), diamètre ≈ 0,3 × la largeur de l'orteil ; disque plein sans contour + halo rosé flou ; pas de point central (lecture « cible ») | anatomie-pied.md ; piège « cor en boule » | JUSTE (simplification : le noyau n'est pas montré à cette échelle) |
| Relevé | zone chaude sous les têtes M2–M3, talon modéré, aucune trame sur la vue de dessus | règle « pression sur l'empreinte, jamais sur la peau » | JUSTE |
| Orthoplastie | manchon ≈ 1,1 cm sur l'IPP du 2e orteil, débord ≈ 1,5 mm de chaque côté, bords bombés vers le bout | HAS 2020 § 3.5.2 ; Ameli (ne corrige pas la déformation) | JUSTE (simplification : la crête plantaire n'est pas visible de dessus) |
| Trait continu `ligne:cor` | plante + contour de la plaque (ovale irrégulier, pas un cercle) | piège « rond creux sur la peau = douleur » | À CORRIGER (mineur, à arbitrer) : demandé tel quel ; si Paul le lit « douleur », remplacer par 2–3 hachures courtes |
| Pictos | cor-durillon : plante + point plein à l'accent sur la plaque (lisible à 24 px) ; orthoplastie : avant-pied de dessus + bande à l'accent sur le 2e orteil | grammaire des pictos | JUSTE / À CORRIGER (mineur) : la bande de l'orthoplastie reste petite à 24 px |

Lecture profane (2 s) : « un dessous de pied avec une tache de corne sous l'avant-pied, et des orteils vus de dessus avec un petit
bouton sur le 2e » ; orthoplastie : « une protection en silicone sur un orteil ».

Points à faire valider par Paul : taille et teinte de la plaque, taille du cor (volontairement petit), choix du 2e orteil pour le cor et
le manchon, picto de l'orthoplastie à 24 px.

## B. Héros « enfant » et « senior », textes incrustés (retours de Paul sur le site Technique de Toulon)

Clés concernées : `heros:enfant:releve|pedagogique|ligne`, `heros:senior:releve|pedagogique|ligne`, `animation:semelle`,
`animation:premiers-pas`, `animation:trajectoire`, `animation:coureur`, et tous les `dessin:*` / `materiel:*` qui portaient un texte
(empreinte du rendu changée : ils repassent « Modifié »). Rien n'est passé en « Validé ». Planche :
`scratchpad/retouches-heros/planche.png`. Nouveau module : `packages/core/src/heros-scenes.ts`.

| # | Élément | Constat | Correction | Verdict après |
|---|---|---|---|---|
| 1 | Héros enfant : podoscope (boîte, pieds en barres) | « vraiment basique » ; pieds en barres = faux | retiré ; petits pieds de l'enfant vus de dessus (silhouette VALIDÉE des premiers pas : PLANTE_ENFANT + ORTEILS_ENFANT), face aux pieds d'un adulte (CONTOUR_PIED dorsal, retourné), empreintes de l'enfant en points (paysage) | JUSTE (à valider) |
| 2 | Proportions enfant | — | pied enfant ≈ 0,55 × adulte (2-3 ans), avant-pied large, orteils courts et ronds, voûte comblée (coussinet), talon rond caché par la jambe ; pieds ouverts de 8–9° autour de la CHEVILLE (la jambe reste dans l'axe) | JUSTE |
| 3 | Latéralité | — | adulte face à l'enfant : son pied droit à gauche de l'image, hallux vers l'axe ; enfant : pied droit à droite, hallux vers l'axe | JUSTE |
| 4 | Héros senior : plaque d'empreintes + point rouge central (statokinésigramme) | symbole non expliqué, incompris | retiré | — |
| 5 | Héros senior : canne en trait vertical isolé | « il faut qu'on voie » | marche à petits pas, de profil, de la taille au sol : poignée en crosse tenue par un poing simple à hauteur de hanche (≈ 0,5 × H, grand trochanter), tige inclinée de 11°, embout au sol ≈ 0,04 × H en avant du pied avant (pied.ts, règle 7) ; canne dans la main du côté proche, qui avance avec le pied opposé (avant, à plat) ; pied arrière qui décolle le talon (14°) | JUSTE (à valider) |
| 6 | Proportions senior | — | Winter 2009 : pied 0,152 H, hanche 0,51–0,53 H, cuisse 0,245 H, jambe 0,246 H (genou par cinématique inverse, fléchi vers l'avant) ; pas raccourci (0,2–0,24 H : marche prudente) | JUSTE |
| 7 | Pieds du senior | jambe proche vue en face LATÉRALE : le profil médial validé n'y est pas juste | pieds CHAUSSÉS : chaussure fermée à talon bas = enveloppe du profil validé (POD-AT-0003) sous la malléole, semelle plate ≈ 1 cm ; seul un ruban de cheville (chaussette unie) entre l'ourlet et le col | JUSTE |
| 8 | Silhouette | risque de caricature | ni visage ni buste (la taille sort du cadre), pas de dos voûté ; maison et mallette du domicile retirées (lisibilité) | JUSTE |
| 9 | Relevé senior | — | appuis en points SUR LE SOL, valeurs modérées (jamais un pic rouge isolé) : pied avant, avant-pied arrière, embout | JUSTE |
| 10 | Textes incrustés | « COURBES DE NIVEAU », « relief : bas → haut », « PREMIERS PAS », « CENTRE DE PRESSION », G/D, angle du genou et cadence du coureur, légende graduée et « Centre de pression » du podoscope, cartouches « Fig. », mentions en bas des planches, étiquettes et cotes des dessins | tous retirés (dessins.ts : `sansTextes` sur dessins et matériel ; animations ; composants des sites) ; le sujet reste dans le `<title>` / l'alt | JUSTE |
| 11 | Dessin « sport » (relevé) | flèche de force rouge + point rouge sous la chaussure et courbe F(t) flottante, inexpliqués sans leurs textes | retirés | JUSTE |

### Revue des 7 héros en registre « relevé » sur fond sombre (cobalt, modèle Technique)

- **Sport** : coureur au marqueur de genou rouge et traces colorées (animation validée « laboratoire » : gardée). Chaussure : flèche
  rouge et courbe F(t) retirées (n° 11).
- **Diabète** : monofilament et diapason à droite, posés « en l'air » (le diapason flotte, ondes de vibration sans support) : À REVOIR
  (poser le matériel sur un plan, ou ne garder que le pied et le médaillon).
- **Ongles** : correct ; les deux gros plans couleur peau sur fond sombre sont lourds à côté du trait clair : À REVOIR (mineur).
- **Enfant**, **Senior** : refaits (ci-dessus).
- **Semelles** : semelle en courbes de relief + empreintes en points ; correct, sans texte.
- **Pédicurie** : la plante en points du dessin « cors-durillons » porte une tache orange-rouge au centre (plaque du durillon rendue
  en pression) : risque de lecture « point rouge / plaie » : À REVOIR (plaque en accent, comme le registre pédagogique).

Point resté hors périmètre : le DESSIN « senior » des fiches de soin (polygone d'appui + oscillations rouges + canne verticale) a les
mêmes défauts que l'ancien héros ; à reprendre avec la scène du héros si Paul la valide.

## D. Héros « senior » : pied arrière « tordu » (retour de Paul sur e478e8d)

Retour de Paul : « J'adore les nouvelles illustrations mais tu vois bien que le pied ici est comme tordu non ? » (pied arrière,
registre pédagogique paysage ; défaut présent dans les 3 registres et les 2 formats). Clés retouchées : `heros:senior:releve`,
`heros:senior:pedagogique`, `heros:senior:ligne` (paysage et portrait) ; elles repassent « Modifié », rien n'est passé en « Validé ».
Planche : `scratchpad/retouches-heros/senior-pied-v2.png`.

| # | Point | Dessiné (e478e8d) | Réalité (décollement du talon) | Verdict |
|---|---|---|---|---|
| 1 | Sens de la rotation du pied arrière | chaussure tournée de 14° dans le MAUVAIS sens autour des têtes métatarsiennes : talon enfoncé sous la ligne du sol, pointe relevée | l'arrière-pied tourne autour de l'appui sous les têtes métatarsiennes, talon vers le HAUT | FAUX (bloquant) |
| 2 | Avant-pied et orteils | soulevés avec le reste (pièce rigide) | restent à plat sur le sol ; la semelle se plie à l'avant-pied (MTP) | FAUX |
| 3 | Amplitude | 14° | marche prudente à petits pas : talon décollé d'environ 3 cm (10° autour d'un pivot à ≈ 18 cm du talon) | À CORRIGER |
| 4 | Cheville / jambe | jambe arrière tendue « par défaut » (cheville trop basse, cinématique clampée) | la cheville suit l'arrière-pied ; jambe presque tendue (genou ≈ 10°), sans jambe « qui rue » | À CORRIGER |
| 5 | Pied avant | à plat, talon au sol, pointe vers l'avant (vue médiale du pied gauche, côté éloigné) | idem | JUSTE |
| 6 | Embout de canne | au sol, ≈ 0,04 × H devant la pointe du pied avant | règle 7 (pied.ts) | JUSTE |
| 7 | Gauche / droite | pied avant = gauche (éloigné, douloureux, avance avec la canne) ; pied arrière = droit (proche) ; canne dans la main droite | canne du côté opposé au membre douloureux | JUSTE |

### Correction (packages/core/src/heros-scenes.ts, `sceneSenior`)

- Le pied arrière est la MÊME chaussure que le pied avant (enveloppe de `piedDeProfil`, même échelle : même longueur), posée au
  sol puis PLIÉE : chaque point en arrière du pivot (MTP de l'hallux, `prof.mtp`, x ≈ 88) tourne de 10° talon vers le haut ; la
  rotation s'estompe (fondu de x ≈ 64 à 90) pour que la semelle se courbe à l'avant-pied sans cassure de l'empeigne ; en avant,
  rien ne bouge (orteils à plat). Aucun dessin séparé.
- La cheville (malléole) et la chaussette suivent la même transformation ; l'ourlet reste dans l'axe tibia–cheville.
- Hanche placée pour que la jambe arrière reste presque tendue (distance hanche–cheville = 0,996 × (cuisse + jambe), hanche entre
  0,49 et 0,53 × H) ; la jambe avant reste presque tendue aussi (mise en charge).
- Relevé : l'appui du pied arrière n'est tramé que sous l'avant-pied posé.

Contre-revue (auto-revue « illustrateur médical ») : JUSTE pour les 6 variantes. Lecture profane (2 s) : « une personne âgée qui
marche à petits pas avec sa canne, le pied de derrière qui se déroule ». Points à faire valider par Paul : amplitude du décollement
(10°), légère courbure de la semelle arrière.
