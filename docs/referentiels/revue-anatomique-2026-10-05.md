# Revue anatomique : 2026-10-05 (fiches de soins de la migration 0020)

Passe « illustrateur médical » (`.claude/agents/illustrateur-medical.md`) sur les 7 dessins dédiés et les pictos des fiches
orthonyxie, onychoplastie, orthoplastie, mycose des ongles, cors et durillons, ongles épais, soins à domicile. Référentiels :
`anatomie-pied.md` (§ Ongle, § Peau et hyperkératoses), `pieges-illustration.md`, HAS 2020 « Le pied de la personne âgée »
(§ 3.4.2, § 3.5.1, § 3.5.2). Géométries : `packages/core/src/bibliotheque/soins-ongles.ts` (formes), `dessins.ts` (dessins),
`ligne.ts` (trait continu), `pictos.ts`. Statut des formes : **brouillon**, à valider par Paul.

## Ce qui est réutilisé (aucune géométrie redessinée à l'œil)

| Dessin | Base validée | Ajout propre aux sites |
|---|---|---|
| `orthonyxie` | gros plan de l'hallux (validé 2026-10-05) + `ongle-coupe` (POD-AT-0010) | agrafe en fil, flèches de traction |
| `onychoplastie` | gros plan de l'hallux | résine sur la partie distale de la lame |
| `mycose` | gros plan de l'hallux (sain à gauche, comme `ongle`) | lame atteinte |
| `ongles-epais` | POD-AT-0003, état « ongle-epais » | pièce à main et fraise |
| `cors-durillons`, `orthoplastie` | aucune base (pas d'atome ÉcranZen équivalent) | coupe sagittale du 2e rayon, **construite**, proportions commentées |
| `domicile` | sans anatomie | maison, mallette, micromoteur |

## Verdicts

| Dessin | Verdict | Lecture profane (2 s) |
|---|---|---|
| orthonyxie | JUSTE | « un petit fil posé en travers de l'ongle du gros orteil » |
| onychoplastie | JUSTE | « le bout de l'ongle est refait, le bas est l'ongle normal » |
| mycose | JUSTE après correction 3 | « ongle jauni et abîmé au bout, à côté d'un ongle normal » |
| ongles-epais | JUSTE | « ongle épais qu'on ponce avec une fraise » |
| cors-durillons | JUSTE après correction 5 | « orteil recroquevillé qui frotte dans la chaussure » |
| orthoplastie | JUSTE | « une pièce souple sous et sur l'orteil » |
| domicile | JUSTE | « soins à la maison, avec une mallette » |
| pictos `orthonyxie`, `onychoplastie`, `orthoplastie`, `ongle-epais` | JUSTES (lisibles à 48 px ; à 24 px, l'orthoplastie reste petite) | — |

## Points vérifiés

1. **Hallux et ongle (orthonyxie, onychoplastie, mycose)** : pied droit vu de dessus, distal en haut, 2e et 3e orteils au bord
   (jamais un orteil isolé « pouce »), lame ≈ 0,57 de la largeur de l'orteil, repli proximal, lunule, sillons : géométrie du gros
   plan validé, inchangée.
2. **Orthonyxie** : les crochets de l'agrafe passent SOUS les deux bords latéraux de la lame, dans les sillons ; l'agrafe agit sur
   l'ongle seul (aucun contact avec le repli, conforme à la HAS chez la personne âgée). En coupe : flèches aux deux bords, vers le
   haut et l'extérieur (la traction relève les bords). Aucun état « après » : la correction n'est pas promise.
3. **Mycose** (corrigé) : forme sous-unguéale distale et latérale (la plus fréquente) : jaunissement depuis le bord libre, plus
   avancé côté latéral, traînées longitudinales, bord libre épaissi et effrité, lunule épargnée. Corrections :
   - premier jet : front en « flammes » et traînées qui partaient du front, lus « coulures » → front adouci, traînées dans la zone ;
   - bord libre en dents régulières, lu « couronne » → irrégularités plus faibles et inégales ;
   - registre relevé (monochrome) : la zone atteinte était grise, lue « ongle gris = nécrose » (piège connu) → teinte d'accent.
4. **Onychoplastie** : résine sur la partie DISTALE (lit à nu après onycholyse), ongle naturel qui repousse depuis la matrice
   (partie proximale, lunule visible) ; front de repousse légèrement bombé ; rien ne déborde sur la peau.
5. **Cors et durillons** (corrigé) : 2e rayon en griffe (MTP en hyperextension ≈ 40°, IPP et IPD fléchies), base de P1 sur le
   versant dorsal de la tête ; cor sur la saillie dorsale de l'IPP, ≈ 1/4 de la largeur de l'orteil, noyau conique à pointe MOUSSE
   qui appuie vers l'articulation sans toucher l'os ; durillon = plaque diffuse sans noyau sous la tête du métatarsien. Relevé : la
   pression est sur le sol, sous la tête (jamais sur la peau). Correction : l'empeigne, trop pâle en relevé, ne se lisait plus
   (« frottement » sans objet) → trait de la charte à 45 %.
6. **Orthoplastie** : crête sous l'orteil posée sur la semelle et anneau qui coiffe P1 et l'IPP (une seule pièce, reliée hors du
   plan de coupe) ; la déformation n'est PAS corrigée à l'image (Ameli : l'orthoplastie réduit les pressions, ne corrige pas).
7. **Ongles épais** : fraise posée sur le dos de l'ongle, jamais sur la peau ; outil de même graisse que le pied ; aucun avant /
   après ; libellé « meulage en surface » (pas « meulé »).
8. **Domicile** : aucune personne ni visage, aucun symbole médical ; micromoteur distinct (recommandations ONPP 2026).

## À faire valider par Paul

- Toutes les formes de `soins-ongles.ts` (statut brouillon au catalogue), en priorité la coupe de l'orteil en griffe (construite).
- Registre « ligne » de l'onychoplastie : plaque de résine en retrait dans la lame (lecture « ongle dans l'ongle » possible).
- Le picto `cor-durillon` existant ne montre que le durillon (plante) : un picto avec le cor dorsal pourrait le compléter.
