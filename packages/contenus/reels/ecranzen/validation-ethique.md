# Validation éthique : reels du générateur (mode agile), 2026-09-30

> studio-ethique (podologie). Grille : `charte/lignes-rouges.md` (L1 à L10) + conditions GATE 1 des lots
> (`production/_programme/2026-09-29-podologie-posturologie-ethique.md` pour 040, `…-semelles-ethique.md` pour 033).
> Mentions vérifiées contre `referentiels/ethique/podologie.md` (M1, M3). Planches relues : `html/planches/reels/*.png` (format salle 16:9).

## posturologie.json (POD-SUJ-040) : VALIDÉ AVEC CONDITIONS

| Scène | Texte [à valider] | Avis |
|---|---|---|
| 1 | « Le bilan postural : comment ça se passe ? » + kicker « Chez le podologue » | OK (7 mots ; le kicker garde l'ancrage « chez le podologue » voulu au GATE 1) |
| 3 | « Debout, de face puis de dos. » | OK (« de face puis de dos » imposé par le GATE 1) |
| 4 | « Puis la marche : le pied se déroule. » | OK |
| 5 | « Selon les cas, des tests d'équilibre. » | OK (« Selon les cas » obligatoire, présent ; pas de nom de test) |
| 7 | « Enfin, une proposition expliquée, si besoin. » | OK (« si besoin » obligatoire, présent, dans la même phrase) |
| M1 | « Au moindre doute, parlez-en à votre médecin ou podologue. » | OK : la mention est identique au texte figé, arrive en dernier et se lit bien |

Les sous-textes ne s'affichent qu'au format site (`moteur-reel.js`) : ils sont admis tels quels et ne contiennent aucun mot interdit (« sans rien corriger » est une négation).

Visuels : aucun visage, vêtement, colonne, alignement, silhouette qui se redresse ni donnée sur la plateforme. Appui unipodal sans chute (L7 à L9 respectés). Conditions :
1. **Scène 3, fil à plomb** : il n'apparaît qu'**après** la rotation, en vue de dos, à côté de la silhouette. Il n'est jamais visible pendant la vue de face ni pendant le passage de profil (GATE 1 040). Sur la planche, la face et le dos ne se distinguent pas : c'est au producteur de vérifier le minutage.
2. **Scène 5** : l'oscillation (0,3) reste faible, pour que l'appui se lise comme stable et non comme un déséquilibre.
3. **Diffusion** : ce reel n'est **jamais suivi de `semelles-neuves` ni d'aucun contenu semelles** dans la même boucle ou playlist Yodeck (GATE 1 040, cloisonnement bilan → dispositif). Aucun hashtag, titre ni nom de fichier publié ne contient « posturologue ».

## semelles-neuves.json (POD-SUJ-033) : VALIDÉ AVEC CONDITIONS

| Scène | Texte [à valider] | Avis |
|---|---|---|
| 1 | « Les premiers jours, allez-y progressivement. » | OK |
| 2 | « Un peu plus longtemps chaque jour. » | OK (aucun chiffre) |
| 3 | « Comme votre podologue vous l'a indiqué. » | OK (il ancre la consigne dans la consigne individuelle, ce qui répond à L2) |
| M3 | « Douleur, gêne ou doute ? Parlez-en à votre médecin ou podologue. » | OK : la mention est identique au texte figé, arrive en dernier et se lit bien. M3 est bien celle du GATE 1 |

Visuels : la chaussure fermée est générique et sans marque. Le calendrier et les paliers ne portent ni nombre ni graduation. On ne voit ni douleur ni visage. Conditions :
1. **Scène 1, rond sur le col de la chaussure (au talon)** : un rond creux signifie « douleur » dans notre code (L7). Posé sur une chaussure neuve, il se lit « ça fait mal ici » (L8). **Supprimer ce rond**, ou le placer sur la semelle en aplat vert pour la repérer.
2. Scène 2 (souhaitable, non bloquant) : 14 cases, soit 2 rangées de 7, peuvent se lire comme un programme de « 2 semaines ». Le GATE 1 exclut toute durée hors site. Une seule rangée, ou un nombre de cases qui n'évoque pas des semaines, serait préférable.
3. **Diffusion** : ce reel ne passe jamais juste après `posturologie` (voir plus haut).

## Piège signalé au producteur (à ajouter à `charte/pieges.md`)
- Un rond de repérage posé sur un objet (chaussure, semelle) se lit comme un rond de douleur : on réserve le rond creux à la douleur, et on repère un objet par un aplat.
