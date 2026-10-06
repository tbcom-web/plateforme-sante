# Inventaire des illustrations et des manques (2026-10-06)

Croisement des thèmes (`packages/core/src/themes.ts`), des soins du catalogue (`VISUELS_SOINS` de `jeux.ts`, `PICTOS_SOINS` de
`pictos.ts`, migrations 0007 et 0020), du matériel (`equipements.ts`, `EQUIPEMENTS_DESSINES` de `dessins.ts`), des fiches conseils
et des sujets réseaux sociaux. Registres : **R** relevé, **P** pédagogique, **L** trait continu (`ligne.ts`).
Légende : ✅ dessin dédié · ◐ générique ou réutilisé · — absent. Tout ce qui est marqué **nouveau** est un brouillon : il apparaît
de lui-même dans `/admin/illustrations` (`inventaireIllustrations()`, statut « À revoir ») et seul Paul le valide.

## 1. Thèmes : illustration « héros » (accueil, pages de thème)

API : `illustrationTheme(themeId, { format: 'paysage' | 'portrait', registre, gamme })` (`packages/core/src/heros-themes.ts`),
paysage 640 × 360 (16:9), portrait 360 × 480 (3:4). Aucun texte visible dans un héros (consigne de Paul du 2026-10-06) : le sujet est dans le <title>. Compositions alignées sur `apps/sites/src/lib/vitrine.ts` (agent « refonte
agence »), sauf diabète (pas le relevé « appuis » à anneau rouge) et enfant (pas la croissance chiffrée). Clés de revue :
`heros:<thème>:<registre>`.

| Thème | Avant | Pièce principale / pièce d'appui (R · P · L) | Décision |
|---|---|---|---|
| sport | — (dessin de soin seulement) | coureur (animation) + chaussure · chaussure + K-taping · marche + chaussure | **nouveau** (composition) |
| diabete | — | monofilament (3 sites) + monofilament et diapason · idem · monofilament + pieds vus de dessus | **nouveau** |
| ongles | — | orthonyxie + ongle normal / incarné (validé) · idem · idem | **nouveau** |
| enfant | — | premiers pas + podoscope · premiers pas (trait) + podoscope · premiers pas + empreintes | **nouveau** |
| senior | — | canne et polygone d'appui + domicile · idem · canne + domicile | **nouveau** |
| semelles | — | courbes de relief de la semelle + empreintes · semelle orthopédique + empreintes · semelle + empreintes | **nouveau** |
| pedicurie | — | soin de l'ongle + cors et durillons · idem · instruments + cor | **nouveau** |
| posture | — | aucun (thème différé, sujet à faible niveau de preuve) | laissé |

## 2. Soins du catalogue

| Soin | Dessin (R/P) | Trait continu (L) | Picto | Décision |
|---|---|---|---|---|
| bilan-podologique | ✅ voutes | ◐ pied-profil | ✅ bilan | laissé (profil juste) |
| semelles-orthopediques | ✅ semelle | ✅ semelle | ✅ | — |
| soins-de-pedicurie | ✅ soin | ◐ pieds-dessus | ✅ hallux-ongle | laissé |
| pied-diabetique | ✅ diabete | ✅ monofilament | ✅ | — |
| podologie-du-sport | ✅ sport | ✅ chaussure-course | ✅ | — |
| podologie-enfant | ✅ enfant | ✅ premiers-pas | ✅ | — |
| posturologie | ✅ equilibre | ◐ empreintes | ✅ | laissé (thème différé) |
| podologie-du-senior | ✅ senior | ✅ senior-canne | ✅ | — |
| verrues-plantaires | ✅ verrue | ◐ pied-dessous → **✅ verrue** | ✅ | **nouveau** (L) |
| ongle-incarne | ✅ ongle | ✅ ongle | ✅ | — |
| douleur-talon | ✅ talon | ◐ pied-profil → **✅ talon** (aponévrose) | ✅ | **nouveau** (L) |
| laser | ✅ laser | ◐ pied-dessous → **✅ laser** | — (icône) | **nouveau** (L) ; picto laissé |
| k-taping | ✅ taping | ◐ pied-profil → **✅ taping** | ✅ | **nouveau** (L) |
| cors-durillons, orthoplastie | ✅ **refaits** le 2026-10-06 (sans os, 2 vues, sans texte : retour de Paul « anatomie fausse ») | ✅ refaits | ✅ cor-durillon recalé | corrigé (commit a3bcb1e) |
| orthonyxie, onychoplastie, mycose-ongles, ongles-epais, soins-a-domicile | ✅ (0020) | ✅ | ✅ | — |
| (arrière-pied, dessin du bilan) | ✅ arriere-pied | ◐ pieds-dessus (vue fausse : dessus ≠ dos) | — | laissé, à reprendre (3 vues de dos à enchaîner) |

## 3. Matériel (`equipements.ts`)

Décision : **illustrer**, au trait, les équipements qui montrent ce qui distingue un cabinet de soins (stérilisation, traçabilité,
examen, fabrication), sans surcharger : un dessin par équipement important, regroupé par catégorie ; les consommables et ce qui ne se
dessine pas sans ambiguïté gardent leur picto.

| Équipement | Catégorie | Avant | Après |
|---|---|---|---|
| autoclave-classe-b | Hygiène | ✅ R/P/L (L dédié) | réutilisé |
| sachets-individuels | Hygiène | — (icône) | **nouveau** R/P/L |
| usage-unique | Hygiène | — (icône) | laissé (lames et gants : picto suffit) |
| tracabilite-sterilisation | Hygiène | ◐ picto autoclave | **nouveau** R/P/L (ticket du cycle + registre) |
| bac-ultrasons | Hygiène | — | **nouveau** R/P/L |
| thermosoudeuse | Hygiène | — | laissé (soudure visible sur le dessin des sachets) |
| aspiration | Hygiène | ✅ | réutilisé (L automatique perfectible) |
| podoscope | Examen | ✅ (L dédié) | réutilisé |
| plateforme-pression | Examen | ✅ | réutilisé |
| analyse-video | Examen | ◐ picto analyse-marche | laissé (caméra du tapis de course) |
| tapis-de-course | Examen | ✅ | réutilisé |
| monofilament-diapason | Examen | ✅ (L dédié) | réutilisé |
| stabilometrie | Examen | ◐ picto plateforme | **nouveau** R/P/L |
| scanner-3d | Semelles | ✅ | réutilisé |
| empreinte-mousse | Semelles | ◐ picto empreintes | **nouveau** R/P/L |
| fraiseuse-numerique | Semelles | ✅ | réutilisé |
| atelier-semelles | Semelles | ◐ picto semelle | laissé (couvert par thermoformage et touret) |
| thermoformage | Semelles | ◐ picto semelle | **nouveau** R/P/L (four + coque POD-AT-0005) |
| touret-poncage | Semelles | — | **nouveau** R/P/L |
| fauteuil-soins | Soins | ✅ (L dédié) | réutilisé |
| lampe-loupe | Soins | — | **nouveau** R/P/L |
| iontophorese | Soins | ✅ | réutilisé (L automatique perfectible) |
| cryotherapie | Soins | — | laissé (picto) |
| laser | Soins | — | **nouveau** R/P/L |

Site : `apps/sites/src/components/MaterielCabinet.astro` (gabarits tableau, village, revue ; page « Le cabinet ») : dessin au trait À CÔTÉ du texte, jamais de légende sous le dessin (le nom ouvre la phrase et sert d'alt) ; le gabarit
classique (`gabarit/Materiel.astro`) affiche les nouveaux dessins automatiquement.

## 4. Fiches conseils et réseaux sociaux

Les fiches conseils (`conseils.ts`, `catalogue-univers.ts`) et les sujets réseaux sociaux (`packages/contenus/src/sujets.ts`)
réutilisent les dessins des soins (`VISUELS_SOINS`) et la bibliothèque : aucun manque propre ; les nouveaux traits continus
(verrue, talon, taping, laser) leur profitent par `LIGNE_DESSIN`.
