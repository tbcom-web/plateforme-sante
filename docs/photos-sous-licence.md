# Photos sous licence (banques payantes) et option « Photos premium »

Demande de Paul (2026-10-09) : « Au niveau des images, la possibilité d'importer des images "avec licence" qui font beau sur
les modèles de démo, nécessitant ensuite un abonnement payant pour les photos. »

Ce document résume les conditions des grandes banques payantes, les traduit en **règles opérationnelles** appliquées par la
plateforme, et liste ce qui **doit être confirmé par Paul ou un juriste**. Résumé de travail : **le texte officiel fait foi**
(liens ci-dessous ; les conditions changent, relire celles en vigueur au jour de l'achat).

Code : `packages/core/src/photos-sous-licence.ts` (règles, contrôles, CSV), `apps/admin/src/app/admin/photos-sous-licence/`
(import, liste, alertes, achat par site, export CSV), `apps/admin/src/components/AvisPhotosPremium.tsx` (message côté praticien),
`apps/admin/src/lib/publication.ts` (contrôle bloquant), migration `supabase/migrations/0057_photos_sous_licence.sql`.

## 1. Ce que disent les banques (consulté le 2026-10-09)

| | Adobe Stock | Getty Images / iStock | Shutterstock | Unsplash+ (abonnement) |
|---|---|---|---|---|
| Texte consulté | [Adobe Stock Additional Terms](https://wwwimages2.adobe.com/content/dam/cc/en/legal/servicetou/Adobe_Stock_Additional_Terms_en_US_20200416.pdf) (version du 16/04/2020, mêmes clauses dans les [PSLT Stock 2023](https://adobe.com/content/dam/cc/en/legal/terms/enterprise/pdfs/PSLT-Stock-WW-2023v1.pdf)) | [iStock License Agreement](https://www.istockphoto.com/legal/license-agreement) · [Getty Images EULA](https://www.gettyimages.es/eula) | [Licence Shutterstock](https://www.shutterstock.com/license) (page inaccessible aux robots : clauses relevées dans [l'aide contributeurs](https://submit.shutterstock.com/help/en/articles/10594576-what-is-a-sensitive-use-license) et des reprises du texte) | [Unsplash+ License](https://unsplash.com/plus/license) |
| **(a) Aperçu / « comp »** (filigrané, basse définition) | Licence « Comp » : seulement pour **prévisualiser** le rendu en production, **90 jours** après le téléchargement ; aucun autre droit sans achat (§ 3.4(C)) | Version filigranée : maquette ou échantillon (« composite use as proof or sample mockup »), **30 jours** ; jamais dans un support final ni public (§ 1) | « Comp Use » : maquette, essai temporaire ou rendu pour **l'approbation du client** | Pas de comp (abonnement) |
| **(b) Qui détient la licence pour le site d'un client** | On peut utiliser une image **pour UN client** à condition de **lui transférer la licence par écrit** (contrat aux conditions au moins aussi strictes) ; **une licence de plus par client supplémentaire** (§ 3.4(A)) | Licence **non transférable**, non sous-licenciable ; achat possible **pour le compte** d'un employeur ou d'un client si l'acheteur a le pouvoir de l'engager (§ 4) | Licence au nom du client final, ou achat pour son compte (**à confirmer** sur le texte) | Licence de l'abonné ; usage pour des clients **à confirmer** |
| Standard / étendue, durée | Standard : perpétuelle, mondiale, 500 000 copies, sites web sans limite d'audience (§ 3.1) ; **interdite dans un modèle (template) web distribué** (§ 3.1(B)(3)) ; Étendue (« Extended ») : modèles destinés à la distribution permis (§ 3.3) ; licences perpétuelles même après l'abonnement (§ 11) | Standard : pas de modèles électroniques (templates) ; Étendue : modèles numériques permis (§ 3, tableau ; Getty § 3.3.9) | Standard / Enhanced ; modèles : **à confirmer** | Perpétuelle ; **jamais dans un modèle numérique (template)** |
| **(c) Crédit** | Pas exigé en usage commercial ; exigé en usage **éditorial** (« Contributeur / stock.adobe.com ») et quand une autre banque est créditée (§ 4.1(F), 4.3) | Pas exigé en usage commercial ; exigé en éditorial (« iStock.com/Artiste », « Photographe/Collection via Getty Images ») | Exigé en éditorial ; commercial : **à confirmer** | Non exigé |
| **(d) Usage sensible (santé)** | **Interdit** de montrer des modèles dans un sujet qu'une personne raisonnable jugerait défavorable, **dont le fait de suggérer une atteinte physique ou mentale** (§ 4.1(E)) | Sujet sensible (santé…) : mention **obligatoire** « usage illustratif, la personne représentée est un modèle » (iStock § 3.5, Getty § 3.3.4) | « Sensitive Use » : suggérer qu'un modèle reconnaissable a un problème de santé physique ou mentale exige des droits particuliers, sinon la mention « Stock photo. Posed by model » | Sujets sensibles : seulement avec une mention du type « posé par un modèle » |

Pexels et Pixabay (gratuits, voir `docs/photos-libres.md`) n'ont pas de licence payante : rien à acheter, mais même interdit de
montrer une personne reconnaissable comme atteinte d'une maladie.

## 2. Règles opérationnelles appliquées par la plateforme

1. **Aucun téléchargement automatique** depuis une banque payante, aucun compte créé, aucune API payante appelée : Paul télécharge
   lui-même (aperçu ou fichier acheté) et **importe le fichier** dans `/admin/photos-sous-licence` (un fichier ou un lot de 12).
2. **Traçabilité obligatoire à l'import** : banque, identifiant et adresse (https) de l'image chez la banque, contributeur, type
   (aperçu/comp, standard, étendue), statut (APERÇU SEULEMENT / ACHETÉE), titulaire, date d'achat, référence de facture ou de
   licence, nombre de sites par licence, crédit exigé (texte), restrictions, personne reconnaissable, usage sensible santé.
3. **Aperçu seulement (comp)** = **démo uniquement**, comme les images de démonstration : rangé dans `photos/banque/licence/apercu/`,
   jamais publié, **retiré à chaque enregistrement d'un site** (`sansImagesDemo`), **publication bloquée** avec message. Durée de
   la licence comp suivie (90 jours Adobe, 30 jours Getty/iStock) : alerte « aperçu expiré, à retirer des démos ».
4. **Achetée** = rangée dans `photos/banque/licence/achetee/`, utilisable **seulement sur les sites qui lui sont RATTACHÉS** avec
   une licence achetée pour ce site (référence saisie). **Une licence = un site client** par défaut (Adobe § 3.4(A) : une licence
   de plus par client ; Getty/iStock : licence non transférable, achetée pour le compte du client). La licence est **achetée par
   TBCOM pour le client** puis transférée/déclarée à son nom (titulaire saisi).
5. **Jamais dans un modèle distribué à plusieurs clients** avec une licence Standard : dans les aperçus (Studio, présélection,
   Dégustation, parcours), une photo sous licence est montrée comme **photo premium** (badge discret) ; elle n'entre jamais dans un
   jeu de photos partagé ni dans les kits des sites. Pour les démos, préférer un **aperçu (comp)** dans sa durée de validité, ou une
   licence **Étendue** si le modèle est diffusé largement (**à confirmer**, voir § 3).
6. **Crédit** : affiché dans les mentions légales du site (« Crédits photos ») quand la banque ou la licence l'exige (texte saisi à
   l'import, ex. « Contributeur / stock.adobe.com »).
7. **Santé = usage sensible** : on préfère des photos **sans personne reconnaissable** (charte : pas de visage mis en avant). Une
   photo avec une personne reconnaissable exige la case « aucune pathologie suggérée » à l'import, est **refusée pour Adobe Stock**
   si elle illustre un soin ou une pathologie (§ 4.1(E)), et ajoute la mention « Photo d'illustration : la personne représentée est
   un modèle » dans les crédits du site (Getty, iStock, Shutterstock, Unsplash+).
8. **Contrôle bloquant à la publication** (production, version d'essai, aperçu privé, republication) : toute photo sous licence de
   la configuration doit avoir une licence **achetée, non expirée, rattachée à CE site**, dans la limite du nombre de sites de sa
   licence ; un aperçu (comp) bloque toujours. Défense en profondeur à la construction Astro : une photo sous licence sans licence
   pour le site est remplacée par son repli.

## 3. À confirmer par Paul ou un juriste

- **Aperçus dans le parcours public** (/creer, /essai) : une maquette montrée à un **prospect** entre-t-elle dans l'usage « comp »
  (prévisualisation, approbation du client) ? Le parcours est accessible sans compte : le juriste doit dire si c'est encore une
  maquette ou déjà une diffusion. Par prudence, la plateforme ne publie jamais un aperçu et suit sa durée.
- **Modèles de démo et clause « templates »** : montrer la même photo dans des modèles proposés à de nombreux praticiens est-il un
  « modèle web distribué » (Standard interdit, Étendue requise) ? Réponse attendue avant d'utiliser une licence Standard en démo.
- **Transfert au client** (Adobe) : rédiger la clause de transfert dans le contrat d'abonnement « Photos premium » (conditions au
  moins aussi strictes que celles d'Adobe) ; Getty/iStock : vérifier que TBCOM peut acheter « pour le compte » du praticien.
- **Fin de l'abonnement Photos premium** : la licence est perpétuelle et transférée au client ; décider si le praticien garde la
  photo après résiliation (juridiquement oui si la licence lui a été transférée) ou si on la retire (choix commercial).
- **Shutterstock** : texte de la licence non lu directement (page bloquée aux robots) : relire la licence en vigueur (client,
  templates, crédit commercial) avant le premier achat.
- **Photo d'un pied ou d'une main** sans visage : « personne reconnaissable » ou non ? (tatouage, bijou, signe distinctif).

## 4. Fonctionnement

### Import (`/admin/photos-sous-licence`)
Fichier JPEG, PNG ou WebP (4 Mo envoyés, le navigateur réencode au-delà ; lot de 12 au plus, un envoi par fichier). Contrôles :
type réel, dimensions (grand côté ≥ 1024 px, sauf un aperçu : 500 px), localisation GPS refusée. Conversion WebP 640 / 1280 /
1920 px au plus, **sans métadonnées**, dans `photos/banque/licence/<apercu|achetee>/lic-<empreinte>-<largeur>.webp` (dossier
`banque/` réservé à l'admin, 0011 / 0030). Ligne `photos_sous_licence` (0057) avec toute la traçabilité, statut « à valider ».

### Usages
- « Valider » : la photo entre dans les tirages du Studio (recettes en style Photos) avec le badge « Photo premium ».
- Aperçu (comp) : démo seulement, retiré à l'enregistrement, publication bloquée.
- Achetée : un praticien qui choisit un modèle contenant cette photo la garde dans son brouillon ; elle n'est publiée qu'avec une
  licence rattachée à son site.

### Offre « Photos premium » (côté praticien)
Parcours et `/mon-site` : « Cette photo nécessite l'option Photos premium » avec deux choix :
- **Demander l'option** : enregistre une demande (`photos_sous_licence_sites`, statut « demandée », fonction
  `demander_option_photos_premium`) ; **aucun paiement, aucun e-mail**. TBCOM achète ensuite la licence et la marque achetée pour
  ce site.
- **Remplacer** : la photo premium est retirée du brouillon ; la photo du kit, ses propres photos ou l'illustration reprennent.

### Admin
Liste (statut, banque, référence, sites rattachés), alertes (« 3 sites attendent l'achat d'une licence », licence expirée,
aperçu expiré, limite de la licence atteinte), action « Marquer comme achetée pour le site X » (référence, titulaire, date),
« Retirer » et export CSV de conformité (`/admin/photos-sous-licence/licences.csv`, même format que l'export des licences libres).
