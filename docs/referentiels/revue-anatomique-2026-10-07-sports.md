# Revue anatomique et matériel — kit Sports (2026-10-07)

Auto-revue du graphiste selon `.claude/agents/illustrateur-medical.md`, `pieges-illustration.md` et les retours de Paul
(`retours/SYNTHESE.md` : trait fin, une seule illustration lisible, ni clipart, ni proportions fausses, ni texte incrusté).
Ingrédients concernés : `picto:sport-*` (dont `picto:sport-course-a-pied`), `ligne:sport-*`, `dessin:sport-*:pedagogique`
(packages/core/src/sports.ts, pictos.ts, kits.ts). Tous en **brouillon** (« À revoir ») : rien n'est validé tant que Paul ne l'a pas fait.

## Méthode (ce qui garantit l'anatomie)

- **Peau** : uniquement le profil médial validé `piedDeProfil` (POD-AT-0003/0008 : pied gauche vu côté interne, orteils à droite,
  jambe qui sort du cadre) et, pour le handball, la semelle validée (`SEMELLE_POINTS`, L/l ≈ 2,6) élargie en semelle extérieure.
  Aucun pied redessiné.
- **Chaussures** : enveloppe convexe des points du pied validé sous la ligne du col (forme de cordonnier, méthode du héros senior),
  élargie de l'épaisseur de la tige (≈ 5 mm, boîte des orteils ≈ 1 cm), coupée au col ; la semelle est posée dessous. Le pied est donc
  toujours DANS la chaussure, à la bonne longueur.
- **Poses** : outils du trait continu (`leverTalon` autour de l'appui de l'avant-pied, `plier` à la cheville et au genou). Ordre
  corrigé pendant la revue : la jambe se plie d'abord sur le pied à plat (axe vertical), puis l'arrière-pied tourne autour de
  l'avant-pied — sinon, aux grands angles (demi-pointe), la pliure de cheville emportait aussi les orteils (orteils relevés en l'air).
- **Course** : angles pris dans la cinématique validée du coureur (`foulee.ts`, Novacheck 1998, p = 0,33 : pied ≈ 32°, tibia ≈ 36°
  vers l'avant, genou fléchi ≈ 21°) : fin d'appui, orteils au sol, genou visible (réponse au « jambes trop droites » du héros sport).

## Sport par sport

| Sport | Ce que montre la scène | Matériel : choix justes | Points de vigilance |
|---|---|---|---|
| Course à pied | Fin d'appui (décollement des orteils), talon levé | Semelle intermédiaire épaisse au talon (drop ≈ 8 mm), pointe relevée, laçage | Lignes de vitesse seulement en pédagogique (le trait continu reste sobre) |
| Trail | Chaussure à plat sur une pente de 12°, jambe verticale (la cheville s'adapte) | Crampons de trail = dents basses (≈ 5 mm) sur toute la semelle, pas de crampons de foot | Pierres = bosses du trait du sol (jamais des ronds isolés) |
| Randonnée | Chaussure montante sur un sentier | Tige au-dessus des malléoles, semelle épaisse crantée (≈ 6 mm), laçage jusqu'en haut | Accent sur la partie montante de la tige (maintien), jamais sur la peau |
| Football | Pied d'appui planté, ballon à côté | Plaque fine, crampons moulés coniques (≈ 11 mm), nombreux : 2 visibles au talon, 4 à l'avant-pied (une seule rangée en vue médiale) | Le ballon touche le sol, ne touche pas la chaussure |
| Rugby | Appui à plat, ballon ovale couché | Crampons vissés longs (≈ 18 mm) à bout bombé, peu nombreux (1 au talon, 2 à l'avant-pied), tige un peu plus haute | Ne pas confondre avec le football : moins de crampons, plus longs |
| Basket | Réception de saut : l'avant-pied touche en premier, talon encore levé (≈ 16°) | Tige montante (maintien de cheville, accent), semelle « cuvette » épaisse et plate | Lignes de mouvement verticales en pédagogique seulement |
| Tennis et padel | Appui sur l'avant-pied (talon levé ≈ 26°), balle au sol | Chaussure de court basse, semelle plate et large ; accent sous l'avant-pied (zone d'appui et de frottement) | Pas de raquette dans la scène (une raquette suppose une main) ; à valider : vue de profil = déplacement latéral seulement suggéré |
| Handball | Pivot vu sous la semelle | Pastille de pivot sous la 1re tête métatarsienne (réelle sur les chaussures de salle), rainures au talon, flèche de rotation | Semelle vue de dessous d'un pied DROIT : hallux à droite ; la pastille est un « ici », jamais une douleur |
| Danse | Demi-pointe : appui sur les têtes métatarsiennes, orteils à plat, talon haut (≈ 42°), jambe verticale | Chausson souple à semelle fendue (patin du talon, patin de l'avant-pied) ; cou-de-pied découvert | Talon levé + jambe verticale = piège « test sur pointes » : ici le chausson et le sol de studio disent « danse » ; à valider par Paul |
| Cyclisme | Pied sur la pédale, manivelle à 3 h | Chaussure rigide plate, cale sous l'avant-pied (axe de pédale sous la 1re tête métatarsienne), manivelle ≈ 17 cm, plateau ≈ 10 cm de rayon caché en partie par la chaussure | En vue médiale du pied gauche, la manivelle est du côté latéral : elle passe derrière la pédale |
| Ski | Chaussure de ski dans sa fixation, jambe en appui avant (≈ 14°) | Coque montant à mi-jambe, semelle plate à débords, talonnière et butée, spatule relevée ; accent sur la semelle intérieure (ce que le podologue façonne) | Boucles non dessinées : elles sont sur la face latérale (invisible en vue médiale) |
| Golf | Appui à plat à l'adresse, balle sur son tee | Chaussure basse, picots courts | Alvéoles de la balle retirées : quelques arcs dans un rond se lisaient comme un visage |

## Pictos

- Recadrage de la MÊME scène sur la grille 48 (rien n'est redessiné), trait unique 3 / 4, accent sur l'objet du sport (ballon,
  crampons, pédale, ski, lignes de vitesse, pastille de pivot). Seule exception d'échelle : les petits ballons (football, rugby, tennis,
  golf) sont agrandis dans le picto (à 24 px, un ballon à l'échelle n'est qu'un point) ; crampons en tirets (1 mm ne se voit pas).
- `picto:sport-course` (picto historique du thème Sport) est inchangé ; le picto du kit est `picto:sport-course-a-pied`.
- Lisibilité à 24 px : bonne pour course, trail, randonnée, football, basket, cyclisme ; plus faible pour handball, ski et danse
  (à juger par Paul).

## À faire valider par Paul

1. Demi-pointe (danse) : angle et chausson ; risque de lecture « test sur pointes » hors contexte.
2. Tennis et padel : la vue de profil ne montre pas le déplacement latéral ; alternative possible : vue de face ou semelle en chevrons.
3. Handball : la vue sous la semelle (pivot) est la seule scène vue de dessous du kit.
4. Pictos à 24 px (handball, ski, danse).
5. Hashtags par défaut proposés (kits.ts) : à garder, retirer ou compléter dans l'admin.

## Contrôles

`npm run controle:charte` : 12 sports contrôlés en trait continu (1 à 3 chemins, sans aplat, `pathLength`, ≤ 16 ko, deux variantes de
boucles) et en pédagogique (non vide, sans texte, sans couleur littérale) ; 12 pictos dans la grille. Tests : `kits.test.ts`.
