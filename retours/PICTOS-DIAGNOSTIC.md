# Pictos : diagnostic et trois directions de style (2026-10-08)

Retour de Paul sur la planche du 2026-10-08 : « Bof bof les icônes… ». La famille des pictos est le point faible des visuels :
2,57 ★ de moyenne, 27 pictos sur 54 notés 2 ★ ou moins (`retours/MANQUES-ILLUSTRATIONS.md`), quand les dessins font 3,8 ★ et le
matériel 4,3 ★. Avant de redessiner les ~60 pictos, on choisit une direction sur un échantillon de 12.

## 1. Diagnostic : pourquoi ils déçoivent

Sources : remarques de Paul (`retours/assets-notes.json`, 54 pictos notés), `docs/gout-paul.md` (R8.4, R9.3), et comparaison avec
des systèmes d'icônes de référence (principes seulement, rien de copié : Phosphor, Lucide, Material Symbols, SF Symbols, icônes
éditoriales de marques santé haut de gamme).

1. **Trait trop épais (14 étiquettes) : l'épaisseur grossit avec l'icône.** Le trait est de 3 unités sur 48, proportionnel :
   1,5 px à 24 px, mais 3 px à 48 px et 12 px dans la tuile de notation où Paul les regarde. Les systèmes de référence font
   l'inverse : épaisseur **optique** (Material Symbols : axe de taille optique 20 à 48 ; SF Symbols : graisses par taille ; Phosphor
   « light » à 1,1 px). Un picto grand doit être relativement plus fin, un picto petit relativement plus tenu.
2. **Pas de grille commune réelle.** Tout est dessiné sur 48 puis affiché à 24 : les détails pensés à 48 (pastilles d'orteils
   de 1,3 px, deux traits à 1 unité l'un de l'autre) se fondent à 24 (« illisible en petit » ×4 : empreintes, cor, verrue, vélo).
   Lucide et Material posent la zone utile (20 sur 24) et un écart mini entre traits parallèles ; nous non.
3. **Niveau de détail et métaphores inégaux.** À côté de pictos nets (téléphone 4 ★, conseils 5 ★, ongle épais 5 ★) : objets
   flous ou ambigus (fauteuil 1 ★ « sens flou », carte de santé 1 ★, honoraires 1 ★, chaussure de ville 1 ★, autoclave « on dirait
   un appareil photo », monofilament « on ne voit pas le fil »), et scènes trop petites (sport : 28 éléments sur 37 à 2 ★ ou
   moins). Un picto de référence dit UNE chose avec UNE silhouette.
4. **Accent mal maîtrisé.** Une seule couleur d'accent posée sur des traits fins : sur fond vert, l'accent vert disparaît
   (podoscope, k-taping, talon, domicile : « on ne voit pas le pied sur le fond vert »). Aucun contrôle de contraste de l'accent
   contre le fond (WCAG 1.4.11 : 3:1 pour un élément graphique porteur de sens).
5. **Cohérence de famille faible, rendu « clipart ».** Pieds dérivés de la géométrie validée (juste) à côté d'objets tracés à
   la main (chaussures, fauteuil, carte) ; poids visuels très différents d'un picto à l'autre ; pastilles d'orteils alignées en
   chapelet (éliminatoire « empreinte en ronds » du goût de Paul).

## 2. Trois directions (même échantillon de 12, même anatomie)

Échantillon : ongle incarné, semelle, pied diabétique (monofilament), enfant (premiers pas : adulte face à tout-petit), senior,
sport (course), bilan (podoscope), verrue, hygiène (autoclave), horaires, accès (stationnement), domicile. Anatomie dérivée des
géométries validées (`pied.ts`, gros plan de l'hallux et hallux incarné de la bibliothèque, semelle ÉcranZen, chaussure, plante
du tout-petit) : 5 orteils sur chaque plante, formule égyptienne, profil avec cheville et jambe hors cadre, monofilament en un seul
C hors de la peau, canne à crosse, autoclave avec hublot, plateau et poignée (sinon « machine à laver »), aucune lettre ni logo.
Code : `packages/core/src/pictos-directions.ts` (règles dans `FICHES_DIRECTIONS`).

| | A — Trait fin | B — Duotone doux | C — Éditorial |
|---|---|---|---|
| Grille | 24 (zone utile 20) | 24 | 64 |
| Trait | unique, optique : 1,5 px de 20 à 24 px, 1,75 à 32, 2 à 48 | même trait optique | aucun contour |
| Coins, bouts | ronds, rayon 2 | ronds, rayon 2 (même dessin que A, autre matière) | formes pleines |
| Détail | une silhouette, ≤ 2 traits intérieurs | idem | une découpe majeure (le fond traverse) |
| Accent | UNE petite pastille pleine sur le détail qui porte le sens | masse en teinte claire de l'accent (20 %) + détail en aplat d'accent | médaillon pâle, silhouette en aplat d'accent, détails d'objet à l'encre |
| Taille mini lisible | 20 px | 24 px | 40 px |

**Accent jamais invisible** (les trois) : `couleursPictoSur(gamme, fond)` choisit l'accent de la gamme s'il atteint 3:1 contre le
fond (blanc, teinté, sombre), sinon la première variante qui l'atteint (accent foncé, duo, vif, signal, accent éclairci) ; contrôlé
par les tests du core et `controle:charte` sur Canard, Menthe glacée, Sable, Pastèque.

## 3. Avis franc

**Je recommande A (trait fin)**, pour quatre raisons :
- il répond directement aux deux reproches mesurés : le trait optique reste fin en grand (2 px à 48 px au lieu de 3) et tenu en
  petit, et la grille 24 réelle supprime les détails qui bavaient ; il est lisible dès 20 px, donc utilisable partout (cartes,
  infos pratiques, menus, pied de page, téléphone) ;
- il prolonge la grammaire que Paul note 5 ★ ailleurs (« trait continu exact et élégant », registre technique et précis) ;
- l'accent en pastille ne dépend plus d'un trait coloré fin : il se voit sur tous les fonds, et il dit où regarder ;
- c'est la direction la moins risquée pour 60 pictos : chaque nouveau picto se dessine vite et reste cohérent.

Réserves : A est sobre, il peut paraître « standard » si les silhouettes ne sont pas soignées ; l'accent en pastille demande un
vrai détail porteur de sens (pas de pastille décorative). **B** est plus chaleureux mais la teinte disparaît sur les fonds teintés
et bave à 20-24 px ; il apporte peu par rapport à A pour un coût de lisibilité. **C** est le plus « waouh » en grand (cartes de
soins, en-têtes), mais il est inutilisable sous 40 px, il frôle l'éliminatoire « aplats mous génériques » et il met la couleur sur
la peau : avec une gamme rouge (Pastèque), le pied devient rouge, ce qui est interdit sur le diabète. Si Paul aime C, je le
garderais comme **déclinaison grand format de A** (cartes de soins seulement), avec une couleur de forme dédiée par gamme.

## 4. Plan de refonte (après le choix de Paul, pas dans ce lot)

62 pictos (`PICTOS`, pictos.ts), dont les 12 de l'échantillon déjà dessinés dans la direction retenue.

1. **Socle** (½ jour) : passer la direction retenue dans `pictos.ts` (grille, trait optique, accent sûr, contrôle de grille de
   `controle:charte` adapté sans affaiblir les règles), garder les clés `picto:<id>` (les notes restent attachées).
2. **Soins du catalogue** (19, `PICTOS_SOINS`) : orthonyxie, onychoplastie, orthoplastie, mycose, ongle épais, cors et durillons,
   talon douloureux, k-taping, pied diabétique, domicile (repris), bilan, semelle, enfant, senior, sport, verrue, ongle incarné
   (repris) — 1 jour, revue de l'illustrateur médical.
3. **Infos pratiques et cabinet** (12) : horaires, rendez-vous, téléphone, itinéraire, accessibilité (à refaire, 2 ★), honoraires
   et carte de santé (métaphores à trouver, 1 ★), stationnement, transports, hygiène des mains, instruments, fauteuil (1 ★) —
   ½ jour.
4. **Examens et matériel** (8) : podoscope, plateforme, analyse de la marche, monofilament, laser, autoclave… — ½ jour.
5. **Anatomie, pathologies, chaussage** (9) : pied (profil, dessus, plante), empreintes, pied plat / creux, chaussures (ville,
   course, enfant, confort), chaussettes, crème, auto-examen — ½ jour.
6. **Sports** (12, kit Sports) : un objet ou un appui par sport (retours « focus ballon only », « fais juste un vélo ») — ½ jour.
7. Planche, vues en situation, notation par Paul, corrections — ½ jour.

Durée estimée : **4 jours** de travail, en 3 lots notables séparément (soins d'abord, puis pratique + matériel, puis le reste).
Aucune animation tant que les pictos de base ne sont pas validés.

## 5. Où voir et noter

- **Donner mon avis** : chaque direction est une carte à part (`picto:<id>@direction-a|b|c`, « À revoir ») : ce sont des refontes,
  elles n'héritent ni de la note, ni du statut, ni du refus (1 ★) du picto actuel. Les tuiles **« Style d'icônes »** (`picto:style-icones-a|b|c`) montrent la planche de chaque
  direction en situation (cartes de soins, infos pratiques, téléphone) et se notent seules.
- **Duel « On compare : le style des icônes »** : `/admin/retours/duel/pictos` (même picto, deux styles à tailles réelles sur trois
  fonds ; planche contre planche).
- Rien n'est branché sur les sites, rien n'est « Validé ». Planches PNG : dossier de travail de la session (`pictos-directions/`).
