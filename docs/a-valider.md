# « 🎯 À valider » : un seul point d'entrée par sujet

Demande de Paul du 2026-10-10 : « je ne comprends pas où trouver les nouvelles illustrations (golf, etc.) ; il y a trop d'endroits
pour noter les arrivages, il faut un point d'entrée pour valider la représentation graphique d'un sujet. Au niveau des notes, juste
dire OK, possibilité de laisser un commentaire ; rendre l'expérience notation > création de modèles la plus ludique et addictive
possible ».

- Logique pure et tests : `packages/core/src/sujets-validation.ts` (+ `.test.ts`).
- Données serveur : `apps/admin/src/lib/sujets-validation.ts` ; gestes : `apps/admin/src/app/admin/sujets/actions.ts`.
- Pages : `/admin/sujets` (tuiles des sujets), `/admin/sujets/<sujet>` (une carte à la fois). Menu : en tête, pastille « en attente ».
- Liens envoyés après une livraison : `lienNouveautes(lot)` → `/admin/sujets?nouveautes=<lot>`, qui ouvre le sujet contenant le plus
  d'éléments du lot. Ne jamais envoyer à Paul une autre adresse quand celle-ci suffit.

## Sujets

Profils de pratique de référence de la profession (Sport · golf, Sport · cyclisme, Diabète, Enfant…), « Sport (commun) » (visuels de
sport sans activité reconnue), « Commun à tous » (mises en page, polices, menus, animations sans sujet) et « Textes » (contenus des
packs). Une nouveauté rejoint UN sujet (`sujetDeCle`) : activité reconnue dans sa clé, ses hashtags, son adresse (`un-golf-green` →
Sport · golf), sinon thème (`diabete-bilan` → Diabète), sinon « Commun à tous ». Les éléments du kit d'un profil (`kitDuProfil`,
instantané `sujets-kits|<profession>`) appartiennent à ce profil. Ordre : sujets avec nouveautés d'abord (profils avant « Commun »).

Sources qui convergent : nouveautés du code (registre `inventaire-connu.json`), photos gardées ou générées « à valider », séries de
l'agent, contenus des packs, éléments des kits jamais notés ou entre 2 et 4 ★. Les Arrivages, tuiles, duels et la Dégustation restent
accessibles (« vue détaillée ») mais ne sont plus le chemin principal.

## Gestes et correspondance avec l'apprentissage (poids inchangés)

| Geste | Clavier / doigt | Note (assets_notes) | Commentaire | Nouveauté en attente (illustrations_revues) |
|---|---|---|---|---|
| ✓ OK | → ou O, glisser à droite | 4 | « ce qui va bien » (positif) | `accepte` + rattachée au sujet (thème, hashtag de l'activité) |
| ❤ J'adore | ↑ ou L | 5 | positif | `accepte` + rattachée |
| ✗ Pas OK | ← ou N, glisser à gauche | 2 | « ce qui ne va pas » (négatif) | `a_retravailler` (commentaire exporté à Claude) |
| ✗ Pas OK, 2ᵉ fois (dernière note ≤ 2 ou « à retravailler »), ou « ne plus jamais le montrer » coché | | 1 | négatif | `retire` |
| Plus tard | ↓ ou P | aucune | — | aucune (exposition « ignore » : délai de retour) |

1 ★ (« ne plus jamais montrer ») n'est jamais donné au premier « Pas OK ». Photos : OK = import WebP (`validee`), Pas OK = `retiree`.
Séries : OK = toutes les photos importées, Pas OK = série refusée. Textes : OK = bon pour publication, Pas OK = à retravailler
(commentaire obligatoire). Étiquettes rapides existantes : repliées sous le commentaire.

**Rien n'est « Validé » automatiquement.** Une note 4-5 ★ ne pose pas le statut `valide` (ce n'était pas la règle avant). En fin de
sujet, Paul a un bouton explicite « Valider pour les sites (N) » (confirmation en deux temps) qui pose `valide` sur les éléments du
code qu'il a trouvés OK.

## Enchaînement et annulation

La carte suivante est déjà montée (images décodées), les aperçus des 8 suivantes chargés à l'avance (`visuelsCartes`) : ~25 ms
mesurés sur la démo. Une décision part au serveur 5 s plus tard ou à la décision suivante : « Annuler » (Z) dans ce délai n'écrit
rien ; après, l'annulation rejoue l'état précédent de l'arrivage (une note reste au journal, la redécision la remplace). La décision
en attente est gardée dans le navigateur et rejouée si la page se ferme avant l'envoi.

## Ludique, sobre

Objectif du jour (20 décisions), série de jours, combo (décisions à moins de 4 s), progression du sujet, pari du juge révélé APRÈS la
décision (« Claude pensait que tu allais aimer : vu juste »), « sujet complet » avec une coche animée, et la récompense : à partir de
6 éléments OK, « Créer des modèles <sujet> » ouvre la présélection de la chaîne filtrée sur le profil (`/chaine/preselection?profil=`).
Vibration à chaque décision (si l'appareil le permet, désactivable) ; sons désactivés par défaut.

Aucune table nouvelle : assets_notes, illustrations_revues, assets_sujets, assets_hashtags, photos_libres, photos_series, expositions.
