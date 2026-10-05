# Univers du catalogue

Décision produit de Paul (2026-10-05) : figer les sites à la base. Le praticien ne compose plus modèle, gamme,
spécialité, registre et logo : il choisit dans un **catalogue d'univers prédéfinis** (« celui-là »), puis affine
quelques éléments. Le parcours est **prescriptif et didactique** : une recommandation par défaut à chaque étape.

À ne pas confondre avec l'**univers métier** (`packages/core/src/univers.ts`, la profession : couche 2 de la charte).
Un univers du catalogue se place au-dessus des couches 3 à 5 (spécialité, gamme, modèle) et les fixe ensemble.

## Principe

- Un univers = un **préréglage complet** du thème et des contenus proposés, défini dans le code
  (`packages/core/src/catalogue-univers.ts`, `CATALOGUE_UNIVERS`), revu modèle par modèle et vu en local avant d'être
  proposé.
- `appliquerUnivers(draft, univers)` (fonction pure) pose le préréglage **sans jamais toucher à l'identité** : nom du
  cabinet, lieux et horaires, praticiens et leurs photos, rendez-vous, accès, paiements, photos du cabinet, logo envoyé
  par le praticien (`logoPerso`), soins cochés, textes personnalisés, mode de réception des articles (manuel /
  automatique, qui est un consentement). Le résultat est contrôlé (`controlerPublication`) ; `soinsACocher` liste les
  soins mis en avant que le cabinet n'a pas cochés : ils sont **proposés, jamais cochés d'office** (chaque soin crée une
  page publique).
- Le brouillon garde `theme.univers` (identifiant), facultatif : les sites existants ne changent pas.
- SEO : un univers ne change ni les adresses, ni les titres, ni l'ensemble des intertitres. L'ordre des sections n'est
  accepté que s'il reprend exactement les sections du modèle (`modeleDuSite`) ; `controle:seo` reste identique entre
  modèles. L'ordre des soins mis en avant change en revanche la description de l'accueil (4 premiers soins), comme
  l'ordre des compétences le faisait déjà.

## Champs

| Champ | Rôle |
|---|---|
| `id`, `nom` | identifiant stable, nom montré au praticien |
| `pourQui` | une ligne factuelle sous la vignette (« Cabinet qui suit des patients diabétiques… ») |
| `justification` | pourquoi ce préréglage (revue graphiste), une ligne, pour l'admin |
| `statut` | `brouillon` (admin seulement), `valide` (proposé), `retire` (plus proposé, les sites le gardent), `differe` (plus tard : faible niveau de preuve) |
| `validePar`, `valideLe` | posés par « Valider pour le catalogue » (table `univers_statuts`, migration 0018) |
| `motif` | raison d'un statut `differe` ou `retire` |
| `revu` | peaufiné modèle par modèle (sinon brouillon sommaire) |
| `preReglage.modele`, `gamme` | fiche de modèle et gamme de couleurs |
| `preReglage.specialite`, `specialiteSecondaire` | spécialités (visuels, animation, dessins) |
| `preReglage.registre` | `releve` ou `pedagogique` ; en pédagogique, la texture des sections est retirée (ni trame ni plan) |
| `preReglage.modeVisuel`, `animation` | illustrations / mélange / photos ; animation d'accueil |
| `preReglage.logo` | marque proposée et disposition (le logo du praticien reste prioritaire) |
| `preReglage.soinsEnAvant` | soins présentés en premier, dans l'ordre (`theme.soinsEnAvant`, `ordonnerSoins`) |
| `preReglage.sections` | ordre des sections de l'accueil, facultatif (`theme.sections`) |
| `preReglage.jeuPhotos` | jeu de photos fixe ; vide = tirage parmi les jeux partagés de la spécialité, sinon photos intégrées |
| `preReglage.themesFlux` | thèmes d'articles du flux cochés par défaut |
| `preReglage.fichesConseils` | fiches conseils patients proposées (`SUJETS_FICHES_CONSEILS` ; contenus à rédiger et relire) |

Rendu : `apps/sites/src/lib/supabase.ts` applique `modeleDuSite` (sections, registre) et `ordonnerSoins` ; l'aperçu de
l'admin (`ApercuTheme`) suit les mêmes règles.

## Sujets à faible niveau de preuve

**Posturologie, réflexologie, semelles « posturales », reprogrammation proprioceptive… : proposés plus tard, après
validation déontologique.** Aucun univers proposable ne les met en avant (soins, spécialités, nom, « pour qui »,
fiches) : `validerUnivers` le refuse hors statut `differe`, et `npm run controle:charte` le vérifie. L'univers
« Posture et biomécanique » est `differe` : absent de la planche et du catalogue, jamais recommandé par défaut
(`UNIVERS_DU_PROFIL` : le profil « technique » mène à « Podologie générale »), et ne peut pas être validé (ni dans
l'admin, ni en base). « Zen, confort du pied » reste sur la pédicurie, les ongles et le chaussage, sans réflexologie
ni promesse.

## Créer un univers

1. Ajouter l'entrée dans `CATALOGUE_UNIVERS` (statut `brouillon`, `revu: false`) : n'utiliser que des briques
   existantes (modèles, gammes, spécialités, marques, soins du catalogue). Une brique nouvelle (spécialité, dessin)
   s'ajoute d'abord à la charte et passe la revue de l'illustrateur médical.
2. `npm run controle:charte` (préréglage valide, identité préservée, garde-fous).
3. Aperçu local : `npm run univers:apercu -- <id>` dans `apps/sites` (démo fictive de Lyon avec l'univers appliqué,
   servie sur un port libre ; `ANIMATION=non` pour comparer sans animation). Planche de tous les univers :
   `npm run univers:planche [-- --sortie <dossier>] [--gros-plans id1,id2]` (accueil ordinateur 1440 × 900 et mobile
   390 × 844 dans Chromium, `planche.png`).
4. Revue graphiste (cohérence, hiérarchie, bons soins en tête, accueil adapté, mobile lisible) et règles médicales
   (`docs/referentiels`, monofilament 3 sites IWGDF / HAS, aucune promesse) ; corriger dans le préréglage, pas dans les
   composants communs (sinon le signaler).
5. Super admin, `/admin/univers` : vignette (aperçu réel), « Valider pour le catalogue ».

Note : la démo n'a que 6 soins (bilan, semelles, pédicurie, pied diabétique, sport, enfant) ; les autres soins mis en
avant n'apparaissent pas dans l'aperçu local.

## Valider

« Valider pour le catalogue » revérifie le préréglage (modèles disponibles, soins du catalogue en base), puis
enregistre statut, auteur et date dans `univers_statuts`. Un univers validé peut être repassé en brouillon ou retiré ;
les sites qui l'utilisent le gardent. La fonction serveur `appliquerUniversAuSite(siteId, universId)`
(`apps/admin/src/lib/univers.ts`) applique un univers au brouillon d'un site (verrou optimiste, nouveau tirage du jeu
de photos si la spécialité change) ; elle sert au parcours praticien (choix du site, étape 2 de `/creer`).

## Parcours praticien (`/creer`, en place depuis le 2026-10-05)

Prescriptif : à chaque étape, une recommandation par défaut, un bouton « Continuer » qui l'accepte. Six étapes
(`ETAPES_PARCOURS`, `packages/core/src/parcours.ts`), puis « Vérifier et publier » :

1. **Vos sujets** (`themes.ts`) : jusqu'à 3 sujets principaux dans l'ordre, et 3 sujets traités aussi. Le sujet n° 1
   fixe le site recommandé à l'étape 2, les spécialités (illustrations) viennent des sujets n° 1 et 2, les soins
   suggérés et les menus du site (`construireNavigation`) en découlent. Étape facultative.
2. **Choisissez votre site** : les trois univers du parcours (`UNIVERS_PARCOURS` : Clair et pratique, Simple et proche,
   Élégant et sobre), vignettes réelles ordinateur et mobile ; recommandé : celui du sujet n° 1 (`universRecommande`),
   à défaut celui du profil. Les sujets priment sur le préréglage de l'univers (`avecPrioritesParcours`).
3. **Vos couleurs** : gammes conseillées du modèle, autres gammes ou couleur libre (contraste garanti).
4. **Votre cabinet** : identité, adresse, téléphone, n° d'Ordre et RPPS (avertissements seulement), horaires, rendez-vous.
5. **Vos soins et votre image** : soins des sujets (sinon de l'univers) suggérés, 3 soins mis en avant, portrait
   (studio portrait facultatif), logo.
6. **Vos contenus** : articles du flux (mode manuel par défaut), fiches conseils proposées par l'univers.

**Vérifier et publier** : récapitulatif ; **rien n'empêche la publication** (règle de Paul, 2026-10-05). Chaque
information manquante est listée avec son repli sobre sur le site (`controlerPublication().remplacements`, `replis.ts`)
et confirmée par « Publier quand même ». Le profil du cabinet n'est pas demandé dans le parcours (formulaire complet,
`/mon-site`). Pré-remplissage depuis l'annuaire santé : pas encore fait.

## Catalogue initial (2026-10-05)

| Univers | Modèle · gamme | Spécialités | Registre · visuel · animation | Logo | Statut |
|---|---|---|---|---|---|
| Podologie générale | Proximité · canard | générale | relevé · illustrations · podoscope | empreinte | brouillon |
| Pied diabétique et soins | Proximité · ardoise | pied diabétique + soins | pédagogique · illustrations · non | empreinte | brouillon, revu |
| Podologie de l'enfant | Zen · canard | enfant + générale | relevé · illustrations · premiers pas | empreinte | brouillon |
| Podologie du sport | Médical premium · cobalt | sport + générale | relevé · illustrations · non (dessin « sport ») | semelle de course | brouillon, revu |
| Posture et biomécanique | Médical premium · encre | posture + générale | relevé | polygone d'appui | **differe** |
| Zen, confort du pied | Zen · sable | soins + générale | relevé · illustrations · semelle | rubans | brouillon |
| Simple et rassurant | Simple et pédagogique · sauge | générale + soins | pédagogique · mélange · non | empreinte | brouillon |
| Clair et pratique | **Tableau** · cobalt & abricot | générale | ligne · illustrations · non | empreinte | brouillon |
| Simple et proche | **Village** · tournesol & ardoise | générale + soins | pédagogique · illustrations · non | empreinte | brouillon |
| Élégant et sobre | **Revue** · mangue & encre | générale | ligne · illustrations · non | empreinte | brouillon |

Spécialité ajoutée pour le premier : `diabete` (`packs.ts`) — accueil sur le schéma du dépistage au monofilament
(3 sites), sans animation ni lecture de pression rouge ; pas de pied nu en marche.

Points relevés sur les composants communs (non modifiés, à traiter par la passe mobile) : dans l'accueil scindé de
Médical premium, le coureur animé est rogné par la carte d'adresse ; sur mobile, l'illustration d'accueil flotte dans
un cadre haut et vide (registre pédagogique) et « Pédicures-podologues » est tronqué dans l'en-tête ; dans le bandeau
« lieu d'exercice » (relevé), l'empreinte en points passe sous la ligne d'informations ; les cartes « Premier
rendez-vous » gardent une grande hauteur vide quand le texte est court.

## Gabarits « Tableau » et « Village » comme options d'univers (2026-10-05)

Deux univers ajoutés **sans modifier les univers existants** : « Clair et pratique » (`clair-pratique`, modèle `tableau`) et
« Simple et proche » (`simple-proche`, modèle `village`), en brouillon, à revoir comme les autres
(`npm run univers:apercu -- clair-pratique` dans `apps/sites`). Ces modèles ne sont pas des jeux de jetons mais des
**gabarits** (structure des pages, variantes de sections : `docs/charte-graphique.md`, « Gabarits et variantes de
sections ») ; le préréglage d'univers s'y applique de la même façon (gamme, registre, ordre des sections compatible).
Gammes conseillées : Tableau → cobalt-abricot, lavande, menthe, mangue (éviter les grands aplats rose-rouge) ; Village →
tournesol, menthe, cobalt-abricot, pistache. Toute gamme ou couleur libre reste lisible (garde-fous de contraste,
`couleursGabarit`). Un univers existant peut passer sur l'un de ces modèles en changeant seulement `preReglage.modele`
(l'ordre des sections, s'il est fixé, doit alors reprendre celles du nouveau modèle).

## Gabarit « Revue » comme option d'univers (2026-10-05)

Univers « Élégant et sobre » (`elegant-sobre`, modèle `revue`) ajouté **sans modifier les univers existants**, en
brouillon (`npm run univers:apercu -- elegant-sobre`). Revue : éditorial humble pour un cabinet discret (titres Bodoni
Moda, texte Newsreader, papier blanc cassé, colonnes de journal, filets fins, un seul dessin au trait au premier écran,
aucune animation). Gammes conseillées : mangue, corail-nuit, menthe, tournesol ; toute gamme ou couleur libre reste
lisible (`couleursGabarit`, contrôlé sur 17 gammes et 5 couleurs libres extrêmes).
