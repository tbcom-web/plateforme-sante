# Jeux de photos

Un jeu de photos réunit les photos d'un site praticien : photo d'accueil, photo panoramique, galerie
(6 au plus) et, si besoin, une photo par soin du catalogue. Il remplace les photos intégrées de la
spécialité ; les illustrations, les animations et les photos fournies par le praticien ne changent pas
(les photos du praticien passent toujours en premier).

- Données : table `jeux_photos` (migration `supabase/migrations/0016_jeux_photos.sql`).
- Code partagé : `packages/core/src/jeux-photos.ts` (validation, tirage, conversion en personnalisation du jeu visuel).
- Admin : page « Jeux de photos » (`/admin/photos`) et fiche photos d'un site (`/admin/sites/<id>`).
- Site : `apps/sites/src/lib/supabase.ts` charge le jeu affecté au build.

## Jeux partagés et tirage

Le super admin prépare un ou plusieurs jeux par spécialité (podologie de l'enfant, du sport, etc.), à partir
de la banque intégrée (`apps/sites/public/photos`) ou de photos envoyées (stockage Supabase « photos »,
dossier `banque/jeux/<spécialité>/`, réservé aux admins).

Règles de tirage (`choisirJeuPhotos`) :

- à la création d'un site, puis à chaque changement de spécialité principale, un jeu est tiré au hasard
  parmi les jeux **partagés**, **actifs**, de source « banque », de la spécialité ;
- aucun jeu disponible : `''`, le site garde les photos intégrées du jeu visuel ;
- spécialité inchangée : le jeu déjà affecté est conservé ;
- un jeu exclusif du site (photos premium) reste affecté même si la spécialité change ;
- le praticien ne choisit jamais son jeu : la valeur envoyée par le formulaire est ignorée par le serveur
  (`enregistrerSite`), et la base refuse l'affectation d'un jeu non autorisé (déclencheurs
  `protect_site_columns` et `protect_site_insert`, fonction `jeu_photos_autorise`) ;
- au build, le jeu n'est appliqué que s'il est actif et autorisé pour ce site (jeu partagé de sa spécialité ou
  jeu exclusif de ce site) ; ses URLs sont revérifiées.

Le jeu affecté est noté dans le brouillon du site : `config.theme.jeuPhotos` (identifiant du jeu, ou `''`).
L'admin peut aussi affecter un jeu précis, ou relancer un tirage, depuis la fiche photos du site.

Après modification d'un jeu, le bouton de propagation republie les sites en ligne auxquels il est affecté.
Désactiver un jeu le retire du tirage ; les sites qui l'utilisaient affichent les photos intégrées à leur
prochaine publication.

## Photos premium (Adobe Stock)

Option du package premium : un jeu de photos choisi pour un client précis, réservé à son site.

### Règles de licence Adobe Stock

- Une licence Adobe Stock ne couvre qu'**un seul client**. On peut acheter une licence pour le compte d'un
  client et la lui **transférer par écrit**.
- Réutiliser la même image pour un autre client exige une **nouvelle licence**.
- Les formules « Unmetered » / « Unlimited » sont **exclues** des usages pour des clients : ne jamais les
  utiliser pour ces photos.

Sources : [conditions de licence Adobe Stock](https://stock.adobe.com/license-terms) et
[aide Adobe sur les licences](https://helpx.adobe.com/stock/help/usage-licensing.html).

Conséquence dans la plateforme : **une photo Adobe Stock n'est jamais dans un jeu partagé.**

- Contrainte en base : un jeu de source `adobe` (ou `praticien`) a toujours un `site_id`.
- Les photos d'un jeu exclusif sont rangées dans `banque/sites/<id du site>/` ; une photo de ce dossier est
  refusée dans un jeu partagé et dans le jeu d'un autre site (`photoJeuAutorisee`).
- Un jeu ne change jamais de site et ne peut pas devenir partagé.
- Ne jamais déposer une photo Adobe Stock dans un jeu partagé, même téléchargée à part : la règle de
  dossier ne peut pas le détecter seule.

### Procédure

1. Le contrat du package premium est signé.
2. La commerciale Webpodologue valide l'option.
3. Le super admin coche « Photos premium (contrat signé) » sur la fiche photos du site
   (`sites.options.photosPremium`, modifiable par un admin seulement).
4. Les licences Adobe Stock sont achetées au nom du client (licence standard ou étendue, jamais
   Unmetered/Unlimited), puis transférées par écrit au client.
5. Le super admin crée le jeu exclusif (source « Adobe Stock »), envoie les photos et renseigne pour chacune
   la référence de licence Adobe, la date d'achat, le transfert au client et des notes (table
   `licences_photos`, réservée aux admins ; l'enregistrement est refusé s'il manque une référence).
6. Il affecte le jeu au site puis publie le site.

Les mentions légales du site affichent alors « Photos : Adobe Stock » (sans nom de fichier).

Les lignes de `licences_photos` sont conservées : un site qui a des licences ne peut pas être supprimé sans
les traiter d'abord (clé étrangère `on delete restrict`).

## Droits d'accès

- `jeux_photos` : écriture par les admins seulement ; lecture par les admins, par les praticiens pour les jeux
  partagés actifs (tirage à l'enregistrement de leur site) et les jeux exclusifs de leurs propres sites
  (aperçu). Le build lit avec la clé secrète (service_role).
- `licences_photos` : admins seulement.
- `sites.options.photosPremium` : protégé comme le reste de `options` (0014).
