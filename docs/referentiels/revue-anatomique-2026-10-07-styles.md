# Revue anatomique — registres expérimentaux d'illustration (2026-10-07)

Revue de l'illustrateur médical (`.claude/agents/illustrateur-medical.md`, lecture seule) sur les planches de comparaison, puis
corrections du graphiste. Code : `packages/core/src/styles-experimentaux.ts`. Clés : `dessin:<sujet>:<style>` (sujets `pied-profil`,
`ongle-hallux`, `semelle-paire`, `coureur`, `enfant-adulte` ; styles `decoupe`, `riso`, `volume`, `geometrique`). Toutes en
**brouillon** (« À revoir ») : seul Paul valide. Non branchées sur les sites.

## Méthode (ce qui garantit l'anatomie)

- Aucune forme redessinée : chaque sujet assemble des pièces des géométries validées — `piedDeProfil('normale')` (POD-AT-0003,
  hallux et orteils latéraux, ongle, malléole), gros plan de l'hallux sain (`bibliotheque/hallux-gros-plan.ts` : lame, bande du bord
  libre, lunule, 2e et 3e orteils), `SEMELLE` + `SEMELLE_ELEMENTS` (POD-AT-0004), `poseCoureur(0.36)` (foulee.ts, mêmes tubes que le
  héros sport), `CONTOUR_PIED` dorsal face à `PLANTE_ENFANT` / `ORTEILS_ENFANT` (même pose que le héros enfant).
- Un style ne change que les MATIÈRES (aplats, trames, dégradés, silhouettes) et le fond : latéralité, proportions et poses sont
  celles des géométries validées.

## Verdicts de la première revue (avant corrections)

| Style | Profil | Ongle | Semelles | Coureur | Adulte + enfant |
|---|---|---|---|---|---|
| Papier découpé | Juste | À corriger | Juste | Juste | À corriger |
| Risographie | Faux (canard) | Faux (canard) | À corriger | À corriger | Faux |
| Volume doux | À corriger | Juste | À corriger | Juste | À corriger |
| Géométrique | Faux | Faux | À corriger | À corriger | Faux |

## Corrections appliquées

1. **Risographie** : la peau n'est plus tramée dans une couleur de gamme (lue « gangrène » en vert, « rougeur généralisée » en rose) :
   trame de teinte peau (`--peau-ombre`), la même pour l'adulte et l'enfant ; les encres de la gamme vont au fond, au sol, aux objets,
   au short et aux contours. Ongle en `--ongle` (plus de blanc pur « ongle blanchi »). Semelles : une seule densité par pièce (pièces
   en réserve), plus de surimpression foncée. Réserve de papier sous chaque pièce tramée (le plan de derrière ne transparaît plus) et
   contours des orteils latéraux masqués par l'hallux (sinon « anneaux / bagues »).
2. **Géométrique** : silhouette du corps en ton peau foncé et chaud (`--peau-ombre`), plus jamais l'encre noire (« pied nécrosé ») ;
   l'encre reste aux objets (semelles, chaussures, short). Ongle en `--ongle`. Plus de cerne blanc autour des orteils, des genoux ni à la
   cheville (« coupure, chaussette, jambe coupée ») : séparations en ton peau. Le disque de fond s'arrête 30 u au-dessus du sol : il
   n'apparaît plus sous la voûte (« sang sous le pied »). Pièces de semelle en pâle de la gamme (plus de blanc « yeux / masque »).
3. **Volume doux** : plus de halo centré autour du pied (« pied mouillé / froid ») : lumière de fond dans un coin ; ombre portée floue
   seulement pour un sujet posé (aucune en vue de dessus). Pièces de semelle en pâle → duo (matière lisible).
4. **Papier découpé** : grain de papier sur le fond seulement (sur la peau : « marbrures ») ; bande du bord libre de l'ongle plus
   discrète (« pansement ») ; en vue de dessus sans sol, l'ombre portée devient un liseré (pieds qui « flottaient »). Petite pièce de fond
   placée loin du sujet, dans le duo pâle (une forme rose près de la peau se lit « rougeur »).
5. **Adulte + enfant** (tous styles) : composition remontée de 22 u en vignette pour montrer davantage les pieds de l'enfant.

## Points restant à juger par Paul

- Géométrique, semelles : silhouettes sombres + pièces pâles peuvent encore évoquer un « masque » en petit.
- Pieds de l'enfant en vignette 160 px : lisibles mais petits (composition du héros conservée telle que Paul l'a aimée).
- Riso en gamme sobre : monochrome (les deux encres prennent la teinte de l'accent).

## Pièges nouveaux (ajoutés à pieges-illustration.md)

- Trame de risographie sur la peau dans une couleur de gamme = peau malade.
- Disque de fond visible sous la voûte = « sang / rougeur sous le pied ».
- Ombre portée sous un pied vu de dessus sans sol = pied qui flotte.
