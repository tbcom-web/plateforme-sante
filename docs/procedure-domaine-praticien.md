# Connecter le nom de domaine d’un praticien

Pour la commerciale et Paul. But : que le site du praticien, publié sur `<projet>.pages.dev`, réponde sur **son** nom de domaine (`www.cabinet-exemple.fr`), en https, sans jamais casser ses e-mails.

## Ce qu’il faut savoir avant de commencer

- **Un site = un projet Cloudflare Pages**, nommé comme le **slug** du site. Le projet est créé automatiquement à la première publication (workflow `publier-site`, étape « Créer le projet Cloudflare Pages si besoin »). L’adresse technique est `https://<slug>.pages.dev` : c’est celle affichée dans Super admin → Sites, colonne « Adresse du site », tant qu’aucun domaine n’est enregistré.
- **Le domaine est lu au moment de la construction du site** (colonne `sites.domaine` dans Supabase, lue par `apps/sites/src/lib/supabase.ts`, puis `baseUrl` dans `apps/sites/src/lib/site.ts`). Il sert à l’adresse canonique de chaque page, au `sitemap.xml`, à la ligne `Sitemap:` de `robots.txt`, à `llms.txt` / `llms-full.txt` et aux données structurées (schema.org). Sans domaine enregistré, tout pointe vers `<slug>.pages.dev`. Il faut donc **enregistrer le domaine puis republier** (étape 4).
- À la première publication, le domaine est rempli automatiquement avec `<slug>.pages.dev`, et n’est plus jamais écrasé ensuite par une publication : le domaine final s’enregistre à la main (il n’y a pas encore de champ dans l’admin, voir étape 4).
- L’adresse `<slug>.pages.dev` reste accessible après la bascule : ce n’est pas un problème pour Google, car toutes ses pages déclarent le domaine final comme adresse canonique.
- **On ne travaille que sur `www`** chez le registraire. On ne modifie **jamais** les enregistrements de messagerie (voir « E-mails du praticien »).

Il faut : l’accès au compte Cloudflare (Workers & Pages) et l’accès à l’espace client du registraire du praticien (OVH, Gandi, IONOS…), soit par le praticien lui-même au téléphone (partage d’écran), soit par un accès délégué qu’il crée. **Ne jamais demander ni noter son mot de passe.**

## Cas A : le praticien a déjà son nom de domaine

### A1. Relever l’existant (5 minutes, avant toute modification)

Chez le registraire, ouvrir la **zone DNS** du domaine et faire une **capture d’écran complète** (à garder dans le dossier du client). Repérer :

- l’enregistrement `www` actuel (A, AAAA ou CNAME) : c’est le seul qu’on va remplacer ;
- l’enregistrement de l’apex (nom vide ou `@`) : il sera redirigé vers `www`, pas supprimé tant que la redirection n’est pas en place ;
- les enregistrements **MX**, **TXT** (`v=spf1…`, `google-site-verification…`), `_dmarc`, `*._domainkey`, `autodiscover`, `mail`, `imap`, `smtp` : **on n’y touche pas** ;
- un éventuel enregistrement **CAA** : s’il existe, il doit autoriser l’autorité de certification de Cloudflare (sinon le certificat https ne sera jamais délivré, voir A4).

Si le praticien a **déjà un site** sur ce domaine : noter ses principales adresses (recherche Google `site:cabinet-exemple.fr`). Après la bascule, ces anciennes adresses n’existeront plus (page « introuvable ») ; s’il y en a d’importantes, le signaler à Paul (aucune redirection d’anciennes adresses n’est prévue pour l’instant).

### A2. Ajouter le domaine dans Cloudflare Pages

1. Cloudflare → **Workers & Pages** → ouvrir le projet **`<slug>`** (même nom que le slug du site).
2. Onglet **Custom domains** → **Set up a custom domain** → saisir `www.cabinet-exemple.fr` → **Continue**.
3. Cloudflare affiche l’enregistrement à créer chez le registraire (DNS hors Cloudflare) : **CNAME `www` → `<slug>.pages.dev`**. Laisser cette page ouverte : le domaine reste « Pending » / « Verifying » tant que le DNS n’est pas fait.

Important : toujours **ajouter le domaine dans Cloudflare Pages avant de créer le CNAME** chez le registraire. Un CNAME vers `pages.dev` sans domaine déclaré dans le projet donne une erreur 522.

### A3. Chez le registraire : `www`, puis l’apex

**`www` (toujours)** : dans la zone DNS, remplacer l’enregistrement `www` existant (A, AAAA ou CNAME) par :

| Type | Sous-domaine | Cible | TTL |
|---|---|---|---|
| CNAME | `www` | `<slug>.pages.dev.` | par défaut (ou 3600) |

(OVH : Domaines → le domaine → Zone DNS → modifier la ligne `www`, ou la supprimer puis « Ajouter une entrée » → CNAME. Le point final de la cible est ajouté automatiquement chez OVH. Il ne peut pas y avoir à la fois un CNAME et un A/AAAA sur `www` : supprimer les anciens.)

**Apex (`cabinet-exemple.fr` sans www)** : un apex ne peut pas recevoir de CNAME classique. Deux options :

- **DNS chez le registraire (cas courant, recommandé pour ne pas toucher aux e-mails)** : créer une **redirection web permanente (301) de `cabinet-exemple.fr` vers `https://www.cabinet-exemple.fr`** dans l’espace du registraire (OVH : Domaines → le domaine → onglet « Redirection » → « Ajouter une redirection » → depuis le domaine sans www, vers une adresse web, redirection visible permanente 301 ; IONOS : « Redirection de domaine » ; Gandi : « Redirections web »). Le registraire modifie lui-même l’enregistrement A de l’apex ; **les MX ne bougent pas**. Après coup, tester **les deux** adresses `http://cabinet-exemple.fr` et `https://cabinet-exemple.fr` (voir checklist) : selon le registraire, la redirection en https peut ne pas fonctionner ; dans ce cas, prévenir Paul (option suivante).
- **DNS chez Cloudflare** (si le domaine y est déjà, ou si Paul décide d’y transférer la gestion DNS) : Cloudflare accepte l’apex grâce au **CNAME flattening**. Ajouter aussi `cabinet-exemple.fr` dans Custom domains du projet (Cloudflare crée les enregistrements), puis une **règle de redirection** apex → `https://www.cabinet-exemple.fr` (Rules → Redirect Rules, modèle « Redirect from root to WWW »). **Attention** : déplacer le DNS chez Cloudflare (changement des serveurs DNS chez le registraire) recopie la zone ; avant de valider, vérifier ligne par ligne, avec la capture A1, que **tous** les MX, TXT (SPF, DKIM, DMARC, vérifications) et autres enregistrements sont présents dans Cloudflare. À ne faire qu’avec Paul.

### A4. Délais et certificat https

- Prise en compte du CNAME : de quelques minutes à quelques heures (selon le TTL de l’ancien enregistrement ; jusqu’à 24-48 h dans le pire cas).
- Dans Cloudflare → projet → Custom domains, le statut passe de « Verifying » à **« Active »** : le certificat https est délivré automatiquement (en général moins de 15 minutes après la validation DNS, parfois quelques heures).
- Bloqué en « Pending » après 24 h : vérifier le CNAME (`www` → `<slug>.pages.dev`, aucun A/AAAA restant sur `www`) et l’éventuel enregistrement **CAA** (il doit autoriser `letsencrypt.org` et `pki.goog`, ou être supprimé avec l’accord du praticien). Outil de vérification : `https://dns.google/query?name=www.cabinet-exemple.fr&type=CNAME`.

## Cas B : le domaine est à acheter

1. Choisir le nom avec le praticien (court, sans accent, `.fr` de préférence : `nom-podologue-ville.fr`, `cabinet-podologie-ville.fr`). Vérifier sa disponibilité chez le registraire.
2. **Le praticien doit être le titulaire du domaine** (c’est son nom, sa propriété ; en `.fr`, le titulaire doit résider dans l’Union européenne). Le plus simple : il l’achète lui-même chez **OVH** (français, une dizaine d’euros par an), avec son adresse e-mail, et active le renouvellement automatique. S’il préfère que TBCOM s’en occupe, l’acheter en le désignant comme titulaire et noter qui paie le renouvellement (à facturer).
3. Un domaine neuf n’a ni site ni e-mails : suivre le **cas A** (A2 puis A3) ; il n’y a rien à relever en A1, sauf les enregistrements créés par défaut par le registraire (page de parking sur `www` et l’apex : à remplacer comme en A3). Ne pas supprimer les MX créés par défaut si le praticien compte utiliser l’e-mail du registraire.

## E-mails du praticien : règle absolue

**Ne JAMAIS modifier ni supprimer** les enregistrements **MX**, **SPF** (TXT `v=spf1…`), **DKIM** (`…._domainkey`), **DMARC** (`_dmarc`), `autodiscover`, `mail`, ni les TXT de vérification existants. On ne touche qu’à `www` (CNAME) et, pour l’apex, à la redirection web du registraire. Une erreur sur ces enregistrements coupe la messagerie du cabinet (rendez-vous, résultats, correspondances) : en cas de doute, s’arrêter et appeler Paul. La capture A1 permet de tout remettre à l’identique.

## Étape 4 : enregistrer le domaine et republier

À faire **une fois le domaine « Active » dans Cloudflare** (A4) ; avant, les liens canoniques pointeraient vers une adresse qui ne répond pas encore.

1. **Enregistrer le domaine** : il n’y a **pas encore de champ** dans l’admin pour modifier le domaine d’un site (la colonne « Adresse du site » de Super admin → Sites l’affiche seulement ; le praticien ne peut pas le changer). Paul l’enregistre dans Supabase → **SQL Editor** (remplacer le slug et le domaine) :

   ```sql
   update public.sites
   set domaine = 'www.cabinet-exemple.fr'
   where slug = 'slug-du-site'
   returning id, slug, domaine;
   ```

   Saisir le nom d’hôte seul, **avec www, sans `https://` ni `/` final** (une saisie avec `https://` ou `/` est de toute façon nettoyée à la construction). La requête doit renvoyer une ligne.
2. **Republier** : Super admin → Sites → le site → « Publier » (publication par Paul, comme d’habitude). Attendre « En ligne » dans le suivi de publication.
3. Vérifier sur le domaine final (checklist ci-dessous) que `view-source:https://www.cabinet-exemple.fr/` contient `<link rel="canonical" href="https://www.cabinet-exemple.fr/"`, et que `https://www.cabinet-exemple.fr/sitemap.xml`, `/robots.txt` (ligne `Sitemap:`) et `/llms.txt` ne citent plus `pages.dev`.

## Checklist après la bascule

- [ ] `https://www.cabinet-exemple.fr` s’ouvre, cadenas valide (pas d’alerte de certificat).
- [ ] `http://www.cabinet-exemple.fr` redirige vers `https://www.…`.
- [ ] `http://cabinet-exemple.fr` **et** `https://cabinet-exemple.fr` redirigent vers `https://www.cabinet-exemple.fr` (tester en navigation privée, sur ordinateur et téléphone).
- [ ] Adresse canonique, `sitemap.xml`, `robots.txt`, `llms.txt` sur le domaine final (étape 4.3).
- [ ] **E-mails** : envoyer un e-mail **vers** l’adresse du cabinet et en recevoir un **depuis** celle-ci (même jour que la bascule). Comparer la zone DNS avec la capture A1 : MX, SPF, DKIM, DMARC identiques.
- [ ] **Google Search Console** (avec le compte Google du praticien de préférence, Paul en utilisateur) : ajouter une propriété « Domaine » `cabinet-exemple.fr` (validation par un enregistrement **TXT** à ajouter chez le registraire, sans toucher aux autres TXT) ou « Préfixe d’URL » `https://www.cabinet-exemple.fr/` ; puis **Sitemaps** → envoyer `https://www.cabinet-exemple.fr/sitemap.xml` ; inspecter l’URL d’accueil → « Demander une indexation ».
- [ ] **Ancien site** : si le praticien avait un site sur le **même** domaine, vérifier que les anciennes adresses importantes relevées en A1 ne sont pas des pages de soins très visitées (sinon prévenir Paul). Si l’ancien site était sur un **autre** domaine : faire rediriger (301) l’ancien domaine vers `https://www.cabinet-exemple.fr` chez son registraire, puis outil « Changement d’adresse » de la Search Console sur l’ancienne propriété. Résilier l’ancien hébergement seulement après vérification, **en gardant le domaine et ses e-mails**.
- [ ] Fiche Google Business Profile, Doctolib, annuaires : remplacer l’ancien lien par `https://www.cabinet-exemple.fr`.
- [ ] Noter dans le dossier client : registraire, titulaire, date de renouvellement, date de bascule.
