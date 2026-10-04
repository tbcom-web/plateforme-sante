# Revue anatomique des illustrations : 2026-10-04 (illustrateur médical)

Revue en lecture seule de tous les dessins, animations, matériels et logos, faite avec les référentiels ÉcranZen
(`anatomie-pied.md`, `pieges-illustration.md`). Rendus et scripts de la revue : scratchpad `revue-medicale/`.

## Mesures clés

| Rapport | Le nôtre | Référence |
|---|---|---|
| Largeur de l'avant-pied / longueur | 0,316 | 0,35 à 0,40 |
| Largeur du talon / largeur de l'avant-pied | 0,82 | 0,60 à 0,65 |
| Longueur / largeur de la semelle | 2,93 | environ 2,6 |

## Verdicts

- **FAUX** :
  - pied de profil partagé : il mélange la vue médiale et la vue latérale ;
  - senior : position de la canne ;
  - premiers pas : échelles ;
  - coureur : bras du même côté que les jambes, pas de phase d'appui, couplage hanche-genou inversé ;
  - diabète : 9 sites de monofilament au lieu de 3, et filament qui pend ;
  - matériel « monofilament ».
- **À CORRIGER** :
  - ce qui dépend du profil : talon, taping, semelle, voûtes ;
  - ongle incarné, soin, podoscope (animation) ;
  - arrière-pied (mineur), laser (mineur) ;
  - logos `anatomie` et `anatomie-epure` ;
  - matériel scanner et podoscope (mineur).
- **JUSTES** :
  - trajectoire du centre de pression ;
  - sport ;
  - matériel : tapis, iontophorèse, plateforme, autoclave, fauteuil, aspiration, fraiseuse, diapason ;
  - enfant (croissance) ;
  - verrue (sur le plan clinique) ;
  - équilibre (mineur) ;
  - analyse, appuis (mineur).

## Corrections bloquantes

1. **Profil.** Adopter la convention « pied gauche vu côté interne, orteils à droite » :
   - malléole médiale portée par le tibia, plus haute et plus en avant ;
   - fibula qui chevauche l'arrière du tibia, avec sa malléole environ 1,3 cm plus basse et environ 2 cm plus en arrière ;
   - 2,5 à 3 cm pour le tendon d'Achille et la graisse de Kager ;
   - M5 et 5e orteil en arrière-plan.
2. **Proportions de la plante** : talon à environ 0,62 de l'avant-pied ; avant-pied à environ 0,37 de la longueur.
3. **Deux géométries** :
   - `EMPREINTE` : la zone de contact, uniquement pour les relevés ;
   - `CONTOUR_PIED` : le pied réel, en vue plantaire et en vue dorsale.

   Vue de dessous, le pied droit a l'hallux à droite.
4. **Coureur** :
   - bras opposés aux jambes ;
   - pied d'appui au sol pendant 35 à 40 % du cycle ;
   - genou le plus fléchi en appui, extension de la hanche au décollement des orteils (Novacheck 1998) ;
   - pied plus long, avec un talon.
5. **Monofilament 10 g** : 3 sites par pied (pulpe de l'hallux, têtes de M1 et M5), selon l'IWGDF 2019 et la HAS. Filament perpendiculaire à la peau, plié en C contre elle pendant 1,5 à 2 s. *À confirmer sur la figure source avant publication.*
6. **Canne** : poignée au grand trochanter (ou tige qui sort du cadre), tige presque verticale, embout environ 15 cm en dehors et 10 à 15 cm en avant du 5e orteil (Bradley et Hernandez 2011). Elle se tient du côté opposé au membre douloureux.
7. **Premiers pas** :
   - pied d'un enfant de 1 an ≈ 0,5 × pied adulte ;
   - pas de l'enfant ≈ 1,8 à 2 longueurs de pied ;
   - pas de l'adulte ≈ 2,5 à 3 longueurs de pied.
8. **Ongle incarné** :
   - l'hallux avec le 2e et le 3e orteil (un orteil isolé se lit « pouce ») ;
   - repli proximal ;
   - lame à environ 0,57 de la largeur de l'orteil ;
   - repli enflammé qui couvre la racine (sinon il se lit « pansement ») ;
   - spicule latéral relié à la lame.

## Corrections moyennes et mineures

9. **Aponévrose** : origine sur le processus médial de la tubérosité, enroulée sous la tête de M1 jusqu'à la base de P1. Une seule bande qui s'amincit.
10. **Profil** :
    - coussinet talonnier de 15 à 20 mm ;
    - têtes métatarsiennes à environ 1,5 cm du sol ;
    - pente du calcanéum de 20 à 25° ;
    - orteils à 3 phalanges.
11. **Semelle** : choisir entre une carte de pression et une carte de relief. Barre rétrocapitale **derrière** les têtes métatarsiennes. Rapport longueur / largeur d'environ 2,6.
12. **Voûtes** : le pied creux s'accompagne d'une pente du calcanéum et d'une inclinaison des métatarsiens plus fortes. Sur fond sombre : pas d'os clairs (effet radio).
13. **Podoscope (animation)** : un pied en phase oscillante ne porte aucune pression. Le passage se fait par le bord externe.
14. **Arrière-pied** : contour continu, sans marche à la cheville. Une mention possible : 0 à 5° de valgus physiologique.
15. **Logos** :
    - `anatomie` et `anatomie-epure` : mêmes défauts que le correctif 1 ;
    - `anatomie-plantaire` : il manque des phalanges ;
    - `foulee` : orteils au-dessus du sol et coupe au genou ;
    - `appuis` : polygone en tirets sur la plante.
16. **Divers** (laser, verrue, soin, podoscope du matériel, équilibre, profil) :
    - pas de pointillés ni de couleur sur la peau, pas de rond de loupe creux sur la peau ;
    - podoscope du matériel : vérifier le sens du reflet dans le miroir ;
    - équilibre : la norme AFP 85 met les talons à 2 cm d'écart, avec une ouverture de 30° ;
    - profil : supprimer la limite de teinte horizontale sur les os et les doubles traits qui font « attelle ».

## Portage ÉcranZen recommandé (sans modifier le projet ÉcranZen)

| ÉcranZen | Remplace | Repère |
|---|---|---|
| `pied.mjs` (PLANTE, contours, ORTEILS, COMMISSURES, APPUIS) | `CONTOUR_PIED` (plantaire, dorsal) | x = 48 + (X − 256) × 0,54 ; y = 3 + (Y − 56) × 0,54 |
| `semelle.mjs` (SEMELLE_POINTS, soutienVoute, barre, talonnette, coque) | semelle et `champSemelle` | même repère |
| `pied-profil.mjs` + `jambe-profil.mjs` (tibia avec malléole médiale, fibula, os médiaux, aponévrose, tendon) | `PEAU_PROFIL`, colonne médiale de `PROFIL.os` | x = −2 + (X − 56) × 0,3135 ; y = 62 − (440 − Y) × 0,3135 |
| `ongle.mjs` (modeleHalluxDorsal, ONGLE_HD, SPICULE_INCARNE, modeleOngleCoupe) | dessin `ongle`, zoom de `soin` | atome ×3 ramené à 240 × 180 |

Seul `pied.mjs` (v1) est marqué « validé par Paul » ; les autres modules sont marqués « PROPOSÉ ». Paul doit confirmer
lesquels il a validés. À ne pas porter : `pied-v2` (style aquarelle) et `main.mjs`.

## Règles anatomiques à intégrer à la charte

1. **Proportions adulte** :
   - avant-pied 0,35 à 0,40 × L, talon 0,60 à 0,65 × avant-pied ;
   - formule égyptienne, M2 le plus long, parabole métatarsienne.

   **Enfant** : avant-pied environ 0,42 × L, voûte comblée jusqu'à 4 à 6 ans.
2. **Empreinte et contour du pied** sont deux géométries distinctes. Vue de dessus et empreinte : l'hallux du pied droit est à gauche ; vue de dessous : à droite.
3. **Profil de référence** : pied gauche vu côté interne, orteils à droite.
   - malléole médiale plus haute et plus en avant que la latérale ;
   - fibula chevauchant l'arrière du tibia ;
   - colonne médiale au premier plan ;
   - arche qui ne touche pas le sol (sauf pied plat) ;
   - coussinet talonnier de 15 à 20 mm, têtes métatarsiennes à environ 1,5 cm du sol ;
   - hallux à 2 phalanges, autres orteils à 3.
4. **Aponévrose** : du processus médial de la tubérosité calcanéenne jusqu'à la base de P1, enroulée sous la tête de M1, jamais au ras de la peau.
5. **Semelle** : rapport longueur / largeur d'environ 2,6 ; élément rétrocapital derrière les têtes ; ne jamais mélanger pression et relief.
6. **Marche et course** :
   - bras opposés aux jambes ;
   - pied d'appui fixé au sol ;
   - centre de gravité au-dessus de l'appui ;
   - centre de pression : talon → bord externe → têtes métatarsiennes → hallux ;
   - aucune pression en phase oscillante.
7. **Canne** : côté opposé au membre douloureux, poignée au grand trochanter, embout environ 15 cm en dehors et un peu en avant du 5e orteil.
8. **Monofilament 10 g** : 3 sites, filament perpendiculaire et plié. **Diapason** : sur l'articulation interphalangienne dorsale de l'hallux.
9. **Ongle** :
   - toujours l'hallux avec ses voisins ;
   - repli proximal, lunule, replis et sillons latéraux ;
   - ongle incarné : spicule relié à la lame, repli enflammé localisé.
10. **Lecture profane** :
    - pas de pointillés ni de couleur sur la peau ;
    - pas d'os clairs sur fond sombre ;
    - pas de jambe coupée nette ni de pied en l'air ;
    - douleur = point creux.
11. **Échelles** : pied d'un enfant de 1 an ≈ 0,5 × pied adulte ; pas d'un adulte ≈ 2,5 à 3 longueurs de pied.
