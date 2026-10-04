> Repris du studio ÉcranZen (studio/referentiels/anatomie/pied.md), le 2026-10-04. Référentiel commun aux deux projets : toute mise à jour se fait des deux côtés.

# Référentiel anatomique — Pied et cheville

> Fiche utilisée par l'agent `studio-illustrateur-medical`. Toute simplification graphique doit conserver
> les proportions et relations décrites ici. Compléter la fiche au fil des assets (avec sources).

## Squelette

- **26 os** (hors sésamoïdes) :
  - **Tarse (7)** : talus (astragale), calcanéus, naviculaire (scaphoïde), cuboïde, 3 cunéiformes (médial, intermédiaire, latéral).
  - **Métatarse (5)** : métatarsiens numérotés 1 (côté hallux) à 5.
  - **Phalanges (14)** : hallux = 2 phalanges (proximale, distale) ; orteils 2 à 5 = 3 phalanges.
- **2 sésamoïdes** sous la tête du 1er métatarsien.
- Répartition en 3 zones : **arrière-pied** (talus, calcanéus), **médio-pied** (naviculaire, cuboïde,
  cunéiformes), **avant-pied** (métatarsiens, phalanges).
- Le talus s'articule avec le tibia et la fibula (cheville). Le calcanéus forme le talon.

## Arches (voûte plantaire)

- **Arche médiale (longitudinale interne)** : la plus haute ; du calcanéus à la tête du 1er métatarsien.
  Ne touche pas le sol chez un pied « normal » (vue de profil médial : espace visible sous l'arche).
- **Arche latérale (longitudinale externe)** : basse, proche du sol ; calcanéus → cuboïde → 5e métatarsien.
- **Arche transverse** : au niveau des têtes métatarsiennes / cunéiformes.
- Appuis au sol en charge : talon, tête du 1er et du 5e métatarsien (et orteils), bord latéral.

## Proportions de référence (adulte, ordres de grandeur pour le dessin)

| Rapport | Valeur approximative |
|---|---|
| Longueur du pied / taille du corps | ~15 % |
| Largeur à l'avant-pied / longueur du pied | ~35–40 % |
| Largeur au talon / largeur à l'avant-pied | ~60–65 % |
| Longueur des orteils / longueur du pied | ~20–25 % (hallux) |
| Hauteur de la malléole médiale au sol / longueur du pied | ~25–30 % |

- La **malléole médiale** (interne) est **plus haute et plus en avant** que la malléole latérale (externe).

Mesures publiées (ajout 2026-09-29, illustrateur, POD-SC-0001) — Pandey N. et al., « Anthropometric
Measurements of Foot in Undergraduate Medical Students… », 2024, https://pmc.ncbi.nlm.nih.gov/articles/PMC11455646/
(115 adultes jeunes, Népal ; pied droit) :

| | Longueur | Largeur (avant-pied) | Largeur talon | Largeur / longueur | Talon / avant-pied |
|---|---|---|---|---|---|
| Hommes | 24,12 cm | 9,28 cm | 6,05 cm | 0,385 | 0,65 |
| Femmes | 22,10 cm | 8,67 cm | 5,34 cm | 0,39 | 0,62 |

→ confirme les rapports du tableau (35–40 % ; 60–65 %). Population unique : ordre de grandeur, pas une norme.

- **Main / pied** : longueur de la main ≈ 0,108 × taille, pied ≈ 0,152 × taille, soit **main ≈ 0,71 × pied**
  (Winter D.A., *Biomechanics and Motor Control of Human Movement*, 4e éd., 2009, segments d'après Drillis &
  Contini 1966). Une main dessinée à côté d'un pied doit respecter ce rapport (tolérance 0,65–0,75).
- **Angle de l'hallux (angle métatarso-phalangien 1)** : normal < 15° ; > 15° = hallux valgus (léger 15–20°,
  modéré 20–40°, sévère > 40°). Source : Radiopaedia, « Hallux valgus angle »,
  https://radiopaedia.org/articles/hallux-valgus-angle (consulté le 2026-09-29). Lève le « à vérifier » ci-dessous.

## Repère de dessin commun (atomes POD-AT-0001 dorsal / POD-AT-0002 plantaire)

Les coordonnées de dessin (pivots MTP, commissures, largeurs, jambe) ont **une seule source** : `outils/lib/geometrie/`
(géométrie des atomes validés de POD-SC-0001). Ce référentiel garde les **règles et proportions sourcées** ; il ne
recopie plus de valeurs de dessin (elles se périmaient à chaque itération).

Canevas 512 × 512, pied droit, **L = 400** (pointe de l'hallux → talon), axe du pied vertical ; avant-pied ≈ 0,395 L,
talon ≈ 0,24 L (0,61 de l'avant-pied) — conformes aux mesures publiées ci-dessus.

- **Vue dorsale = « je regarde mon pied »** : orteils en haut, la jambe descend vers le bas du cadre et **cache le
  talon** ; malléole médiale à gauche (pied droit), plus en avant (plus près des orteils dans l’image) que la latérale.
- **Vue plantaire = miroir X exact** du même repère (hallux à droite) : mêmes orteils, mêmes pivots, mêmes commissures.
  Bord médial concave (arche), bord latéral presque rectiligne, zone de voûte plus claire (`peau-1`).
- **Écartement des orteils** (séchage, inspection) : rotation autour du pivot MTP, **au plus** hallux −9°, 2e −4°,
  3e 0°, 4e +4°, 5e +9°. Au-delà, on dessine une main (éventail) : interdit.
- Formules digitales : pied égyptien (hallux le plus long, la plus fréquente en Europe), grec (2e orteil
  le plus long), carré. **Par défaut : égyptien.**
- Pied de l'enfant : plus large et plus potelé, arche médiale peu visible (coussinet graisseux) — normal.

## Espaces interdigitaux

- 4 espaces (1-2, 2-3, 3-4, 4-5) ; le fond du pli (commissure) se prolonge côté plantaire. Les espaces **3-4 et 4-5**
  sont les plus serrés et les plus touchés par la macération et le pied d'athlète (Ameli, « Reconnaître une mycose de
  la peau », mise à jour 25/02/2026, consulté le 2026-09-29).
- Les orteils s'écartent peu, depuis leur base (voir limites d'écartement ci-dessus).

## Ongle (unguéal)

- Structures : **lame (tablette)**, **lit unguéal**, **matrice** (sous le repli proximal, zone de croissance),
  **repli proximal** (avec cuticule), **replis latéraux** et **sillons latéraux**, lunule (visible surtout sur l'hallux).
- Ongle incarné : la lame (souvent un **spicule** latéral après coupe arrondie trop courte) pénètre dans le
  **repli latéral** → inflammation. Représenter en coupe transversale ou vue dorsale de l'hallux.
- Coupe recommandée à montrer : **droite**, ni trop courte, angles non taillés en profondeur.

## Peau et hyperkératoses

- **Durillon** : épaississement étalé de la couche cornée sous une zone de pression (souvent sous les têtes métatarsiennes).
- **Cor** : hyperkératose localisée avec un **noyau (nucléus)** conique qui appuie en profondeur ;
  sur le dessus/côté des orteils (cor dorsal), entre les orteils (œil-de-perdrix).
- Représenter la pression par une flèche + un épaississement stylisé, jamais de rendu « dégoûtant ».

## Structures fréquemment représentées

- **Aponévrose (fascia) plantaire** : bande fibreuse du **tubercule médial du calcanéus** vers la base des
  orteils (en éventail). Talalgie d'insertion : douleur à l'insertion sur le calcanéus.
- **Tendon calcanéen (d'Achille)** : du triceps sural à la face postérieure du calcanéus.
- **Hallux valgus** : déviation latérale de l'hallux (vers les autres orteils) et saillie médiale de la tête
  du 1er métatarsien (« oignon »). Angle métatarso-phalangien de l'hallux habituellement < 15° ;
  au-delà, on parle d'hallux valgus (seuil 15° confirmé : Radiopaedia, voir « Mesures publiées »).

## Vues canoniques (atomes de base à créer en priorité)

| ID prévu | Vue |
|---|---|
| POD-AT-… `pied-profil-medial` | pied droit, vue interne, arche visible |
| POD-AT-… `pied-dorsal` | pied droit, vue de dessus, 5 orteils, ongles |
| POD-AT-… `pied-plantaire` | pied droit, plante, zones d'appui |
| POD-AT-… `squelette-pied-dorsal` | os du pied vue de dessus, zones colorables par calque |
| POD-AT-… `hallux-dorsal` | gros orteil + ongle, détaillé (réutilisable pour ongle incarné, mycose, coupe) |

Convention : **pied droit** par défaut ; le pied gauche = miroir horizontal (échelle X −100 %).
