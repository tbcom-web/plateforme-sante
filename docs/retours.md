# Retours de Paul → Claude

Comment les avis donnés dans le back-office arrivent jusqu'à Claude, sans qu'aucune clé Supabase ne sorte des secrets GitHub.

## Où Paul donne son avis

| Page | Ce qu'on y note | Table |
|---|---|---|
| `/admin/retours` « Donner mon avis » | Une carte à la fois, tirée au hasard (jamais notés d'abord, puis modifiés depuis la dernière note, puis notes incertaines) : thèmes complets, illustrations, icônes, photos, animations, couleurs, structures. « Ce qui va bien » / « Ce qui ne va pas », commentaire, 1 à 5 étoiles. | `assets_notes` (0027), `atelier_notes` (0026) |
| `/admin/illustrations` « Bibliothèque & retours » | Inventaire complet, statut (Validé, À retravailler, À revoir, Retiré), note rapide. | `illustrations_revues` / `illustrations_statuts` (0021), `assets_notes` |
| `/admin/atelier` | Combinaisons du générateur, scénario au choix. | `atelier_notes` |
| `/admin/retours` → **Inspirations** | Image de référence (fichier, glisser-déposer ou capture collée, lien facultatif), « ce qui me plaît » (couleurs, composition, typographie, style d'illustration, ambiance, mise en page mobile, icônes), ce qu'on veut en tirer, sujet et type d'élément. Palette dominante extraite dans le navigateur ; synthèse « Palettes récurrentes » avec gammes candidates (AA vérifié, jamais ajoutées automatiquement). **Référence d'inspiration uniquement : jamais copiée ni réutilisée sur les sites.** | `inspirations` + bucket privé `inspirations` (0028) |
| `/admin/retours` → **Photos à découvrir** | Photos libres de droits Pexels / Pixabay, une à la fois : GARDER (hébergée chez nous, licence tracée) ou REJETER, étiquettes, sujet cible. Voir `docs/photos-libres.md`. | `photos_libres`, `photos_libres_avis`, `photos_libres_mots_cles` (0028) |

### Remarques, avant / après, sujets (migration 0028)

- **Remarques libres distinctes** : sous « Ce qui va bien », un champ « Ce qui va bien (libre) » ; sous « Ce qui ne va pas »,
  « Ce qui ne va pas (libre) » (colonnes `positif` / `negatif` de `assets_notes` et `atelier_notes`). L'ancien `commentaire`
  reste lu pour les notes plus anciennes. Sans la migration 0028, les deux champs sont regroupés dans `commentaire`.
- **Avant / après** : quand un élément noté a été modifié depuis (empreinte différente), la carte de « Donner mon avis » et la
  vue agrandie de la bibliothèque montrent côte à côte « Avant (votre note, vos remarques) » et « Après ». Ces éléments sont
  tirés **en premier**, avant les jamais notés. L'« avant » vient de l'instantané enregistré avec la note (`assets_notes.apercu` :
  SVG minifié ≤ 60 Ko, adresse de la photo ou de la structure, couleurs de la gamme), sinon d'une **archive** des rendus d'un
  commit (`apps/admin/public/archives/assets-<commit>.json.gz`, cherchée par clé + empreinte notée). Archive initiale : commit
  `d07548f` (version notée le 2026-10-07).
- **Archiver avant une grosse série de retouches** (Claude) : `npm run archiver-assets -- <commit>` (par défaut le commit à
  archiver est celui donné ; d'habitude `HEAD` avant de retoucher). Le script crée un `git worktree` temporaire du commit (jamais
  l'arbre de travail, qui peut contenir des retouches en cours), calcule les rendus et empreintes avec le code de CE commit,
  écrit l'archive et `index.json`, puis retire le worktree. Option `--worktree <dossier>` pour choisir où le créer. Committer
  l'archive avec les retouches.
- **Sujets des visuels** : sur chaque carte et dans la vue agrandie, puces des sujets associés (défauts du code :
  `packages/core/src/sujets-visuels.ts` — soins et fiches de la bibliothèque, thème des héros, spécialité des photos, sujet
  choisi pour les photos libres). « × » retire un sujet, « + Sujet » en ajoute un (table `assets_sujets`, journal en ajout seul,
  état courant = dernière action ; `assets_sujets_effectifs()` pour le générateur). Effet : un héros ou une photo retiré d'un
  sujet n'est plus proposé pour ce sujet (propositions du parcours, tirage et galerie des jeux de photos des sites) ; si un
  sujet n'a plus aucun visuel d'une famille, le générateur garde un repli et la synthèse le signale (« sujet sans visuel »).
  Filtre « Visuels du sujet » dans « Donner mon avis » et dans la bibliothèque.

Les notes servent tout de suite au générateur (`packages/core/src/atelier-poids.ts`, `assets-poids.ts`) : moyennes lissées,
« Retiré » et « À retravailler » pénalisent l'asset ; les garde-fous (diversité, diabète sans rouge, posture jamais, AA)
priment toujours.

### Trier par sujet et duels « A ou B ? » (2026-10-08)

- **Trier par sujet** (`/admin/retours/tri`, `packages/core/src/couverture-sujets.ts`) : file des visuels (illustrations,
  héros, icônes, photos des jeux et photos libres importées, animations) — sans sujet, seulement « général », pouvant compléter
  un sujet mal couvert (suggestion), jamais trié, déjà trié ; gros boutons des sujets (1-8), suggestions `suggererClassement`
  pré-cochées en pointillé, hashtags suggérés, Entrée = « Suivant » (ajouts / retraits dans `assets_sujets`, suggestions
  acceptées / refusées dans `classement_suggestions`) ; sélection multiple (« Ajouter le sujet X à la sélection ») ; tableau de
  **couverture par sujet** (héros, illustrations par style, icônes, photos importées / intégrées, animations validées, retirés
  exclus) et manques avec lien vers le tri filtré (`?sujet=senior&famille=photos`). Export : section « Couverture par sujet » de
  `SYNTHESE.md` et bloc automatique de `MANQUES.md` (entre `<!-- couverture-auto -->` et `<!-- /couverture-auto -->`).
- **Duel « A ou B ? »** (`/admin/retours/duel`, `packages/core/src/duels.ts`, table `duels`, migration 0037, journal en ajout
  seul ; `duels_apprentissage()` sans auteur ni remarque) : thèmes complets, typographies, traitements photo, éléments d'une
  page, photos (même sujet, même emplacement, même traitement), illustrations et héros (même dessin en deux styles, ou deux
  dessins du même style). Paires : même scénario ; une seule dimension différente (contrôlée champ par champ), environ 15 % de
  duels libres entre deux recettes bien classées ; paire déjà jouée évitée ; éléments incertains et dimensions peu jouées
  d'abord. Classement : Bradley-Terry bayésien (a priori N(0, 1), égalité = demi-victoire, « les deux sont mauvais » = défaite
  de chacun contre l'élément moyen, poids 0,35), affiché en Elo ± incertitude par famille × sujet n° 1. Apprentissage :
  Δduel(k) = clamp(0,5 · θk, ±0,5 ★) sur les clés qui diffèrent (duel libre : poids 0,5 ; mobile : 1,25), cumulé aux renforts
  des notes dans la limite de ±1 ★ (`fusionnerRenforts`, `lib/atelier.ts`). Juge : « Claude prévoyait A » après le choix
  (`predireDuel`, colonne `prediction`), accord dans la page et dans la synthèse. Export : `retours/duels.json` et section
  « Duels : classements par sujet » de `SYNTHESE.md`. Sans la migration : duels gardés dans le navigateur.

### Ce qui est évalué (repère)

Retour de Paul du 2026-10-08 (« montrer direct avec un encadré ce qui est évalué, parfois on ne sait pas trop ») :

- **Duels** : bandeau « On compare : la police des titres et du texte » (ou « le traitement des photos », « le premier
  écran », « la forme des cartes de soins », « le menu »…) avec les valeurs lisibles (« A : Revue à empattements · B :
  Grotesque affirmée ») ; duel libre : « Thème complet : jugez l'ensemble », sans encadré.
- **Tuiles** : « Vous notez : la paire de polices « Revue à empattements » », « le menu sur téléphone « Panneau plein
  écran » (ordinateur : … · téléphone : … · rendez-vous : …) », « l'animation d'en-tête « … » »…
- **Encadré** dans les aperçus de page : contour animé couleur de l'admin (ardoise + halo blanc, étiquette « Évalué
  ici ») autour des éléments touchés (titres, photos, premier écran, bloc de la page, barre de menu…), défilement
  automatique vers la zone ; « Masquer le repère » (touche h, préférence gardée dans le navigateur) pour juger sans artefact.
- **Menus** : planche complète (ordinateur : rubrique active, survol simulé, après défilement ; téléphone : interactif et
  ouvert côte à côte), bouton « Menu » cliquable dans l'aperçu, « Ouvrir / fermer le menu » (touche o) ; duels de menus :
  états Fermé / Ouvert / Survol / Après défilement communs à A et B.
- Table pure : `packages/core/src/reperes.ts` (repereDimension, repereCle, valeursDuel ; testée : chaque dimension tirable a
  une entrée, préfixes `composant:*` et `variante:*` couverts, famille inconnue → `[data-zone="<famille>"]`). Zones :
  attributs `data-zone` de l'aperçu de l'ADMIN seulement (ApercuTheme, ApercuGabarit) ; le site publié ne change pas.
  Composants : `apps/admin/src/components/RepereEvaluation.tsx` (bandeau, PiloteApercu), `PlancheMenu.tsx`.

### Palettes, polices, tailles ; appareil montré

Demandes de Paul du 2026-10-08 (« pouvoir noter / A-B tester des palettes de couleurs, des combinaisons de polices et de
tailles » ; « tu me demandes mon avis sur téléphone mais on ne voit pas le mode mobile ») :

- **Nouveaux duels** (MODES_DUEL, duels.ts ; enregistrés sous les types existants `theme` / `typo`, aucune migration) :
  « Palettes » (seule la gamme change ; la moitié du temps le client a choisi 1-2 couleurs : gammes et couleurs libres
  proches), « Paires de polices », « Tailles et casse » (même paire, un axe à la fois : échelle, casse, graisse,
  interlettrage), « Police × palette » (les deux ensemble). Variantes du moteur d'harmonie, jamais de nouvelle règle dure
  (duels-compositions.ts, varierDuel). Bandeaux : nuanciers A / B en pastilles, valeurs lisibles (« A : échelle affirmée · B :
  échelle spectaculaire »), encadré sur les titres et le paragraphe (polices) ou le titre principal (tailles). Vue rapide
  « Spécimen » (titre, surtitre, paragraphe, bouton, carte de soin) en plus de la page complète.
- **Appareil** : bascule « Ordinateur · Mobile · Les deux » pour tous les duels ; « Les deux » par défaut en grand écran
  (cadre ordinateur + vrai cadre téléphone 390 px pour A et pour B), rendu mobile réel sur un téléphone ; photos et
  illustrations montrées dans la section mobile où elles apparaissent ; le bandeau précise « vu sur téléphone » ; l'appareil
  enregistré est celui qui était affiché (`les-deux` compris).
- **Tuile « Police × palette »** (`typo:combinaison:<paire>.<gamme>`, combinaisons.ts) : spécimen de la paire dans la gamme,
  hors « Tout au hasard ». Les tuiles « Couleurs » (gammes) et « Typographies » (paires, échelle, casse, graisse,
  interlettrage, surtitres…) notaient déjà palettes, paires et réglages.
- **Apprentissage** : duels → poids des gammes, paires et axes typo (renfortsDuels, inchangé) ; combinaisons → paires
  d'harmonie `gamme:<g>&police:<p>` (même clé que les paires apprises des « Recettes complètes », plafond ±0,75 ★ :
  pairesDuels, pairesDesNotes, ajouterPairesApprises dans lib/atelier.ts). Classements « Meilleures palettes — Sport »,
  « Meilleures paires de polices — Diabète », « Meilleures échelles de titres — Seniors ».

## Comment les retours arrivent dans le dépôt

Workflow `.github/workflows/exporter-retours.yml` :

- chaque nuit (3 h 17 UTC), ou à la main (GitHub → Actions → exporter-retours → Run workflow), ou par le bouton
  « Envoyer mes retours à Claude maintenant » (`/admin/retours`, `/admin/atelier`, `/admin/illustrations` ; admin seulement,
  même jeton GitHub que la publication) ;
- `node scripts/exporter-retours.mjs` lit Supabase avec les secrets `SUPABASE_URL` / `SUPABASE_SECRET_KEY` et écrit
  `retours/*.json` + `retours/SYNTHESE.md` ;
- commit « Retours : export du AAAA-MM-JJ » par le bot github-actions, seulement s'il y a du nouveau.

Exporté : clés d'assets, notes, étiquettes, remarques « ce qui va bien » / « ce qui ne va pas » (séparées dans la synthèse),
commentaires, `retours/assets-sujets.json` (sujets ajoutés / retirés par Paul, section « Sujets modifiés par Paul »), empreintes, ingrédients des combinaisons, statuts, dates au jour ;
`retours/inspirations.json` (étiquettes, ce qu'on veut en tirer, sujet, type, palette, domaine du lien) et une section
« Inspirations » dans la synthèse (couleurs récurrentes, gammes candidates avec leur code prêt à coller).
**Jamais exporté pour les inspirations** : l'image, son chemin dans le stockage privé, une URL signée, l'adresse complète du lien.
**Jamais exporté** : auteur, e-mail, identifiant de compte, leads, prospects, sites praticiens. Le dépôt est public :
si les commentaires deviennent sensibles, repasser le dépôt en privé (GitHub → Settings → Danger zone → Change visibility) ;
le workflow et le bouton continuent de fonctionner.

## Ce que fait Claude en début de séance

```bash
git pull --rebase
```

1. Lire `retours/SYNTHESE.md` (par type d'asset, meilleurs / pires, étiquettes fréquentes, à retravailler, combinaisons,
   inspirations). Une gamme candidate n'entre dans `packages/core/src/gammes.ts` qu'avec l'accord de Paul.
2. Au besoin, le détail dans `retours/assets-notes.json`, `retours/atelier-notes.json`, `retours/illustrations-revues.json`.
   La clé (`picto:…`, `dessin:<nom>:<registre>`, `heros:<thème>:<registre>`, `photo:…`, `gamme:…`, `modele:…`) indique le
   fichier à retoucher (`source` dans `packages/core/src/assets.ts` / `illustrations.ts`).
3. Corriger (dessin, photo, gamme, règle du générateur…), puis ajouter une ligne en haut de la liste de
   `retours/CHANGEMENTS.md` : `- AAAA-MM-JJ : ce qui a été corrigé (clé, commit)`. La page `/admin/retours` l'affiche dans
   « Ce que vos avis ont changé ».
4. Un asset retouché change d'empreinte : il revient en tête de la notation (« Modifié depuis »).

Sans export récent, Paul peut aussi utiliser « Copier mes retours » (Markdown) dans `/admin/retours`, `/admin/atelier` ou
`/admin/illustrations` et le coller dans la conversation.
