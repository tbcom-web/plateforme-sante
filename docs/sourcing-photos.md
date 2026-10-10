# Sourcing automatique de photos en séries cohérentes

Demande de Paul (2026-10-09) : « Qu'un agent puisse me sourcer des belles photos depuis Pexels / Pixabay pour illustrer mes
modèles sans que j'aie à le faire moi-même… et qu'il y ait une vraie cohérence visuelle. »

**Le geste de Paul : un clic par lot.** L'agent part des trous réels, cherche, filtre, analyse et compose des **séries** de 6 à 12
photos cohérentes. Chaque série arrive dans `/admin/arrivages` comme un lot « Sélection de l'agent — Sport · basket · série
lumineuse chaude (9 photos) ». **Rien n'est téléchargé ni importé avant « Accepter ».**

Code : `packages/core/src/sourcing-photos.ts` (pur, testé), `apps/admin/src/lib/sourcing-photos.ts` (recherches, aperçus),
`apps/admin/src/app/admin/arrivages/` (lots, gestes), `apps/admin/src/app/api/sourcing-photos/route.ts` (endpoint protégé),
`scripts/sourcer-photos.mjs` et `.github/workflows/sourcer-photos.yml` (passage automatique), migration
`supabase/migrations/0053_photos_series.sql`. Voir aussi `docs/photos-libres.md` (licences, import WebP, traçabilité).

## Où lancer l'agent

| Où | Bouton | Cible |
|---|---|---|
| `/admin/arrivages` → « Sélections de l'agent » | **Sourcer automatiquement** | un profil choisi, ou « Tous les trous prioritaires » (3 cibles) |
| `/admin/sujets` (À valider), encadré « Photos à compléter » | **Sourcer les séries photos (n)** | les profils sport sous 6 photos, l’un après l’autre : basket, tennis, golf, cyclisme, puis trail / randonnée et course |
| `/admin/sujets` (tuile) et `/admin/sujets/<profil>` | **Sourcer des photos** | le profil du sujet, quand il a moins de 6 photos et aucune série en attente |
| `/admin/profils?profil=…` | **Sourcer pour ce profil** | le profil affiché (thème + activité) |
| `/admin/retours/kits?sujet=…` (podologue) | **Sourcer pour ce kit** | les emplacements à compléter du kit |
| GitHub → Actions → `sourcer-photos` | Run workflow | trous prioritaires (ou un profil) ; hebdomadaire si activé |

La **profession** est toujours celle de l'en-tête (verrou) : requêtes, thèmes et hashtags de la profession
(`recherche-photos-professions.ts`, `pratiques.ts`) ; jamais une requête de pieds pour la psychomotricité.

### Séries d’activité (`series-photos-activites.ts`, 2026-10-10)

Pour chaque activité (basket, tennis, golf, cyclisme, course, trail, randonnée) : requêtes de l’activité (`pratiques.ts` : pied,
chaussure, appui, prises d’office par le plan) puis requêtes d’ambiance du terrain ; vocabulaire du terrain accepté pour cette
cible seulement (une photo de fairway n’est pas « hors métier » pour le golf) ; exclusions propres (marques et compétitions de
l’activité, enfants identifiables, foule, dossards, tableaux d’affichage) en plus des mots interdits communs ; cohérence visée
(lumière, palette, cadrage) rappelée dans la raison de la cible ; tags automatiques `#sport`, `#<activité>`,
`#profession-<profession>`. Les séries arrivent dans « À valider », sujet du profil (carte série), et dans les Arrivages.

## 1. Cibles et priorités (`ciblesPrioritaires`)

| Cible | Trou | Priorité |
|---|---|---|
| Profil de référence (Sport · basket, Diabète…) | n4 = photos de la profession portant le hashtag de l'activité (ou le thème) notées ≥ 4 ★, n = toutes | 30 + **40 si un modèle finaliste de la chaîne vise ce profil** + 25 si n4 = 0 (12 si n4 < 2) + 2 · max(0, 6 − n) ; pas de trou si n4 ≥ 2 et n ≥ 6 (sauf finaliste) |
| Kit d'images (podologue) | emplacements vides, faibles ou complétés (`emplacementsAFaire`) | 30 + 25 par vide (15 complément, 10 faible) + 10 pour premier écran / page sujet, plafond 95 |
| Thème de la profession | moins de 3 photos (`trousParProfession`) | 30 + 10 · (3 − photos) |

Une cible qui a déjà une série **en attente** n'est pas relancée. Chaque cible porte ses **emplacements** (premier écran, page sujet,
`activite:basket` ×2, soins de l'activité, `theme:<hashtag>`…), ses hashtags, ses requêtes et, pour un finaliste, la **gamme** et le
**traitement photo** de sa version courante.

## 2. Requêtes (`planRequetes`)

8 requêtes distinctes au plus par cible : d'abord les 4 premières requêtes de la cible (les plus précises : activité, emplacements),
sauf si elles sont saturées (≥ 6 photos gardées) ou trop souvent rejetées ; le reste tiré sans remise en privilégiant les moins
couvertes (poids `1 / (1 + photos déjà gardées)²`, `choisirRequete`). Sources alternées (Pexels, Pixabay), page 2 pour une requête
déjà bien couverte. Requêtes : activité
(`pratiques.ts`), emplacements (`requetesEmplacement`, podologue seulement), thème de la profession (base, sinon pack). 30 résultats
par page → 100 à 240 candidates brutes.

## 3. Filtres (`filtrerCandidatesSourcing`)

Écartées, avec leur raison (journal de la série) : **déjà vues** (gardées, rejetées ou déjà proposées dans une série), **doublons**
(même clé), **trop petites** (grand côté < 1 600 px ou petit côté < 900 px), **orientation** (portrait toujours ; carrée si la cible
n'a que des bandeaux), **mots interdits** dans la description ou les étiquettes de la source (`MOTS_INTERDITS`) : marque (nike,
adidas, logo…), texte (text, quote, poster…), visage (portrait, face, selfie, smiling…), sang / plaie / tatouage, hors métier
(lingerie, alcool…) ; pour les emplacements de soin, aussi « patient », « doctor », « nurse » ; **hors métier** : texte de la source
sans aucun mot du métier (podologue : vocabulaire curé pieds / chaussures / marche ; autre profession : mots de ses requêtes).

## 4. Aperçu et caractéristiques (`caracteristiquesPixels`)

Pour 160 candidates au plus (requêtes alternées), l'**aperçu basse définition** de la source (≈ 340 px : `urlApercuAnalyse`) est lu
**en mémoire** côté serveur (hôtes de la source seulement, 1,5 Mo au plus), réduit à 96 px par sharp, puis **oublié** : jamais écrit
sur disque ni dans le stockage. Caractéristiques :

- **luminosité** (luminance moyenne), **saturation** (TSV moyenne), **contraste** (écart type de la luminance) ;
- **température** : cos(teinte − 30°) pondéré par la chroma (−1 froide, +1 chaude), amorti pour une image presque grise
  (même convention que `temperatureCouleur` d'harmonie.ts) ;
- **netteté** : laplacien moyen ; **exposition** : part des pixels bouchés (< 0,04) et brûlés (> 0,97) ;
- **palette** dominante : `quantifierPalette` (inspirations.ts), 5 couleurs ;
- **empreinte** visuelle « dHash » 64 bits : deux photos à ≤ 12 bits sont **quasi identiques**.

## 5. Scores d'une candidate

- **Qualité** = 0,25 · résolution + 0,4 · netteté + 0,35 · exposition (résolution : (petit côté − 900) / 1 500 ; netteté : laplacien
  / 0,06 ; exposition : 1 − (bouchés + brûlés − 2 %) / 20 %, × 0,5 si la luminosité moyenne est < 0,22 « trop sombre » ou > 0,9).
- **Pertinence** = 0,3 (trouvée par une requête ciblée) + 0,15 par mot de la cible retrouvé dans le texte de la source (4 au plus) +
  0,1 si un mot du métier y est ; sans texte : 0,35.
- **Compatibilité gamme** = 0,7 · accord des températures (1 − |température photo ÷ 0,3 − température de la gamme| / 2) + 0,3 ·
  couleurs proches (part de la palette à moins de 90 d'une couleur de la gamme, ÷ 15 %) ; sans gamme : 1.
- **Score** = 0,45 · qualité + 0,35 · pertinence + 0,2 · compatibilité gamme.

## 6. Formule de cohérence

Pour une série E de photos, centre μ (moyenne de la luminosité, saturation, contraste, température) et échelles `e` (écart jugé
visible : luminosité 0,12, saturation 0,12, contraste 0,06, température 0,25, palette 110) :

```
D(E) = moyenne sur les photos de  Σ_k ((x_k − μ_k) / e_k)² / 4
     + moyenne sur les paires de  (écartPalettes(p, q) / 110)² / 2

Cohérence = 100 · exp(−D / 2)
```

`écartPalettes` : moyenne pondérée (parts) de la distance perceptive de chaque couleur à la plus proche de l'autre palette,
symétrisée. Chaque terme vaut ≈ 1 quand l'écart typique égale l'échelle : D = 0 → 100 ; D = 1 → 61 ; D = 2 → 37.

## 7. Composition des séries (`composerSeriesPhotos`)

1. Quasi-doublons visuels retirés (on garde la mieux notée).
2. Pour chaque **graine** (les 10 meilleures candidates en paysage) : ajout pas à pas de la candidate qui maximise
   `score − 0,35 · (hausse de D)`, sous contraintes : **jamais deux photos quasi identiques**, au plus un tiers de la série (2 au
   moins) par requête (variété des cadrages et des sujets), assez de paysages pour les bandeaux. Taille visée : emplacements + 2,
   entre 6 et 12.
3. Valeur d'une série = 0,5 · score moyen + 0,35 · cohérence / 100 + 0,15 · compatibilité gamme (score global affiché sur 100).
4. On garde la meilleure, puis **jusqu'à 2 alternatives**, recomposées de la même façon depuis des graines nouvelles avec au plus un
   tiers de photos déjà prises par une série retenue ; parmi elles, d'abord celle dont la signature diffère (libellé différent ou
   centres à plus de 0,8 échelle), sinon la meilleure. Moins de 6 candidates utilisables : aucune série, avec le motif.

**Signature** (`signatureSerie`) : lumière (≥ 0,58 lumineuse, ≤ 0,36 sombre, sinon tamisée) · température (≥ 0,1 chaude, ≤ −0,1
froide, sinon neutre) · couleur (saturation ≥ 0,42 vive, ≤ 0,2 douce, sinon naturelle) · contraste (≥ 0,24 contrastée, ≤ 0,12
feutrée) · « touches vertes » (teinte de la couleur franche dominante, ≥ 6 % de la palette réunie). Ex. « lumineuse · chaude ·
naturelle · touches vertes ».

**Gamme** (`gammeSerie`) : celle du finaliste si connue ; sinon la gamme sobre la plus accordée (température + accent proche de la
couleur franche dominante : (180 − distance) / 180).

**Traitement photo commun** (`traitementSerie`, `traitements-photos.ts`) : celui du finaliste ; sinon cohérence < 55 → « voile » (le
voile de la gamme unifie) ; température opposée à la gamme → « voile » ; série chaude et gamme chaude → « chaud-doux » ; série vive →
« mat » ; sinon traitement du modèle (naturel).

**Emplacements** (`affecterEmplacements`) : premier écran = meilleure qualité en paysage (rapport ≥ 1,3 d'abord), page sujet =
suivante en paysage, puis les emplacements de la cible (meilleure pertinence), le reste en « réserve ».

## 8. Lots dans les Arrivages

Source « Sélections de l'agent (séries de photos) », en tête de file. Chaque lot montre : titre, raison (« Modèle finaliste ·
aucune photo #basket notée ≥ 4 ★ »), journal (requêtes, candidates, aperçus analysés, écarts), **planche** des vignettes de la
source (crédit « auteur sur Pexels / Pixabay » et lien vers la page : exigence des API), **signature**, palette, **cohérence**,
score, gamme et traitement, **emplacement prévu** de chaque photo, profession, thèmes et hashtags pré-remplis, et l'**aperçu de la
série appliquée** sur un site d'exemple du profil (premier écran, cartes, galerie) avec le traitement photo commun.

| Geste | Effet |
|---|---|
| **Accepter la série** (A, →, glisser à droite) | chaque photo : « Garder » (traçabilité et licence de `photos_libres`, relue à la source) puis **import WebP** sans métadonnées ; thèmes (`assets_sujets`), hashtags (#activité, #emplacement, #kit-&lt;sujet&gt;, #serie-&lt;empreinte&gt;) et profession (`assets_professions`) → la photo entre au **vivier curé** du thème et dans le **kit du profil** ; série « acceptée » |
| **Accepter la sélection** | idem, seulement les photos cochées (cliquer une vignette la retire) |
| **Autre série** | série « remplacée » ; l'alternative suivante du même lancement, sinon un nouveau sourcing de la même cible |
| **Refuser** (R, ←) | série « refusée » ; ses photos ne seront plus proposées |
| Annuler (Z) | série de nouveau proposée ; photos importées remises « à valider » (fichiers conservés) |

Import photo par photo depuis le navigateur (progression « Import 3/9… ») : aucune requête trop longue. Pages concernées :
`maxDuration = 300` s (Arrivages, Profils, Kits).

## 9. Œil de Claude (facultatif)

- L'export nocturne (`scripts/exporter-retours.mjs`, workflow `exporter-retours`) écrit `retours/series-photos-proposees.json` :
  séries proposées, non expirées, pas encore revues (pas de revue pour leur **empreinte** exacte). Contenu : identifiants, **aperçus
  et pages publics des sources**, emplacements, scores, signature. Jamais d'auteur, d'e-mail ni de clé.
- Dans une session Claude Code, lancer l'agent **`sourceur-photos`** (`.claude/agents/sourceur-photos.md`) : il regarde réellement
  chaque aperçu (outil de lecture d'image), écarte (visage, patient, texte, marque, anatomie douteuse, sombre, hors sujet, doublon,
  faible), réordonne, prédit une note selon `docs/gout-paul.md` et écrit `retours/series-photos-claude.json`.
- L'admin lit ce fichier (API GitHub, sinon copie locale) : « **Revu par Claude : 8/9 retenues** », écartées masquées (repliées
  sous la planche), ordre conseillé. Sans revue, tout fonctionne avec les scores automatiques.

## 10. Automatisation et quotas

- **Endpoint protégé** `POST /api/sourcing-photos` (hors session, exclu du proxy) : en-tête `Authorization: Bearer
  <SOURCING_PHOTOS_JETON>`, comparaison à temps constant, 503 si le jeton n'est pas configuré. Il **n'écrit rien** et ne lit pas la
  base : le workflow lui envoie le contexte (déjà vues, couverture, finalistes, séries en attente), il renvoie les séries.
- **Workflow** `sourcer-photos.yml` : `workflow_dispatch` (profession, profil, nombre de cibles) ; **schedule hebdomadaire commenté,
  désactivé par défaut**. Le script expire les séries dépassées, lit le contexte avec la clé secrète du dépôt, appelle l'endpoint et
  enregistre les séries.
- **Quotas** (`QUOTAS_SOURCING`) : 8 requêtes par cible, 3 cibles par lancement (≈ 24 requêtes d'API), 160 aperçus par cible,
  3 séries par cible, 4 lancements automatiques par jour et par instance, séries expirées après 14 jours. Limites des API : Pexels
  200 requêtes / heure et 20 000 / mois, Pixabay 100 / minute ; la fenêtre glissante (180 / h, 90 / min) et le **cache 24 h** des
  recherches (`lib/photos-libres.ts`) s'appliquent aussi. Un passage hebdomadaire consomme ≈ 0,5 % du quota mensuel Pexels.
- **Conditions des API** : aperçus affichés seulement pendant l'évaluation, avec le crédit de l'auteur et le lien vers la source ;
  rien n'est stocké avant acceptation (la table ne garde que l'adresse de l'aperçu, comme `photos_libres.apercu_url`) ; l'import
  (grande taille, une photo à la fois) n'a lieu qu'après le clic de Paul ; aucun téléchargement massif.

## 11. Ce que Paul doit faire

1. Exécuter `supabase/migrations/0053_photos_series.sql` (éditeur SQL de Supabase). Sans elle, « Sourcer » affiche « Migration
   0053 à exécuter ».
2. Les clés `PEXELS_API_KEY` / `PIXABAY_API_KEY` sont déjà dans Vercel (sinon `docs/photos-libres.md`).
3. Pour le passage automatique seulement (facultatif) : créer un jeton aléatoire de 32 caractères au moins, l'ajouter dans Vercel
   (`SOURCING_PHOTOS_JETON`, « Sensitive », puis Redeploy) et dans GitHub (secrets du dépôt `SOURCING_PHOTOS_JETON` et `ADMIN_URL`) ;
   lancer le workflow à la main ; décommenter le `schedule` pour l'hebdomadaire.

## Tests

`packages/core/src/sourcing-photos.test.ts` (données synthétiques, aucun appel aux API) : une série cohérente a une dispersion plus
faible qu'une sélection au hasard (moins d'un tiers) ; doublons rejetés (même clé, déjà vues, quasi identiques) ; orientation
respectée (portrait écarté, bandeaux en paysage) ; mots interdits et verrou de profession ; caractéristiques d'aperçus synthétiques ;
cibles prioritaires (finalistes d'abord) ; plan des requêtes ; signature, gamme, traitement ; export public sans auteur ; revue de
Claude appliquée à la seule empreinte revue.
