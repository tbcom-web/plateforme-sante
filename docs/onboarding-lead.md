# Onboarding lead : essai gratuit de 3 mois

Un pédicure-podologue arrive sur la page « Gratuit pendant 3 mois », clique sur **un seul bouton** et crée directement son site dans le parcours guidé, **sans formulaire ni mot de passe** (session anonyme Supabase). Pour **voir le rendu**, il laisse son e-mail (et le téléphone du cabinet) et accepte d’être recontacté : c’est là qu’il devient un lead. Pour **garder** son site et obtenir le lien privé complet, il crée son accès (mot de passe + CGU). La mise en ligne publique sur son domaine n’a lieu qu’après **validation manuelle par la commerciale**.

Décisions de Paul (2026-10-06) : page d’essai dédiée ; démo privée (lien non indexé) ; après 3 mois, paiement en ligne Stripe **et** relances commerciales, suspension sans suite ; pas de vérification RPPS automatique, vérification manuelle avant toute mise en ligne. Puis : « il crée son site avec ses infos, et pour voir le rendu il donne son e-mail et accepte d’être recontacté » (migration `0025_essai_anonyme.sql`).

## Parcours du lead

| Écran | Adresse | Ce qui se passe |
| --- | --- | --- |
| 1. Page d’essai | `/essai` (plus tard `essai.webpodologue.fr`) | Page statique, sans traceur ni cookie. Promesse, **bouton unique « Créer mon site gratuit »** (aucun formulaire), captures des 4 modèles, comment ça marche, FAQ. Les `utm_*` de l’adresse sont transmis au bouton. |
| 2. Ouverture de l’espace | `/essai/commencer` | `supabase.auth.signInAnonymously` dans le navigateur (clé publique ; jeton Turnstile si `NEXT_PUBLIC_TURNSTILE_SITE_KEY`), puis `demarrer_essai()` : essai **sans CGU ni donnée personnelle**. Session anonyme déjà présente (même navigateur) : reprise directe. Connexions anonymes désactivées dans Supabase : repli automatique sur l’ancien parcours `/essai/inscription` (mot de passe + CGU d’abord). |
| 3. Parcours guidé | `/creer` | Les 6 étapes habituelles : le praticien saisit lui-même nom, cabinet, ville, téléphone, horaires, soins. Brouillon enregistré en base sous le compte anonyme (RLS habituelles), progression enregistrée (`noter_progression_essai`). Bandeau : « Enregistré dans ce navigateur : créez votre accès à la fin pour retrouver votre site » et bouton **« Voir le rendu »** dès que le modèle est choisi et le nom (praticien ou cabinet) saisi. |
| 4. Porte du rendu | fenêtre dans `/creer` | E-mail, téléphone du cabinet (pré-rempli depuis le parcours, modifiable), case **obligatoire** « J’accepte d’être recontacté(e) au sujet de mon site » + lien confidentialité, conseils par e-mail (facultatif, non coché). `capturer_prospect_essai` : prospect créé (prénom, nom, ville repris du brouillon) et **lié au compte anonyme**. |
| 5. Rendu | plein écran dans `/creer` | Rendu calculé **dans le navigateur** (`ApercuTheme` / `ApercuGabarit`, téléphone et ordinateur) : aucune construction GitHub ni projet Cloudflare, donc ni coût ni abus possible pour un anonyme. Bouton « Garder mon site ». |
| 6. Créez votre accès | dernier écran de `/creer` | « Créez votre accès pour voir et garder votre site » : e-mail (pré-rempli), mot de passe, case **obligatoire** CGU de l’essai. Conversion du compte anonyme par `supabase.auth.updateUser({ email, password })` (l’identité e-mail est liée au même compte : le brouillon est conservé), puis `creer_acces_essai()` : CGU (version + date) enregistrées, **essai de 3 mois démarré à cette date**, prospect rattaché. |
| Vérifiez vos e-mails | (même écran) | Seulement si la confirmation d’e-mail est activée. Le lien (modèle « Change email address ») ramène sur `/auth/callback?…&next=/essai/acces`, qui enregistre les CGU puis ouvre `/creer?etape=fin`. Si Supabase a refusé le mot de passe avant la confirmation, il est demandé à ce retour. |
| Adresse déjà utilisée | (même écran) | « Vous avez déjà un compte : connectez-vous ». Le brouillon reste en base sous le compte anonyme mais n’est **pas** relié au compte existant (impossible depuis le navigateur sans clé service_role) : la commerciale peut le rattacher (Super admin, liste des sites → « Changer de propriétaire », lien de rattachement à usage unique). Le message le dit clairement au praticien. |
| Voir mon site | dernier écran de `/creer` | Comme avant : **aperçu privé** `https://apercu.<slug>.pages.dev` (branche Cloudflare « apercu », `noindex`), avec le suivi de publication. Réservé aux comptes avec accès. |
| Tableau de bord | `/tableau-de-bord` | Jours restants, lien privé, « Demander la mise en ligne », « Passer à l’abonnement ». Une session anonyme y est renvoyée vers `/creer`. |
| Abonnement | `/abonnement` | Stripe Checkout (inchangé). |

## Session anonyme : fonctionnement et limites

- **Fonctionnement** : un compte anonyme est un vrai compte Supabase (rôle `authenticated`, claim `is_anonymous`), sans e-mail ni mot de passe, gardé par le cookie de session de ce navigateur. Les règles RLS « authenticated » s’appliquent (le praticien anonyme ne lit et n’écrit que son site). Le profil est créé avec un e-mail vide (correction de `handle_new_user` dans 0025 : sans elle, la connexion anonyme échoue car `profiles.email` est obligatoire) et suit l’e-mail lors de la conversion (déclencheur `on_auth_user_email_change`).
- **Même navigateur** : la session persiste ; le bouton de `/essai` (ou le lien `/essai/commencer`) rouvre le parcours là où il en était.
- **Autre appareil ou autre navigateur, cookies effacés, fenêtre privée fermée** : la session anonyme **ne se retrouve pas** ; le praticien recommence un site neuf. La retrouver depuis un autre appareil demanderait la clé service_role (connecter l’autre appareil au même compte anonyme) : **limite acceptée**. D’où le rappel du bandeau (« créez votre accès à la fin ») et la précision des relances (« sur l’ordinateur ou le téléphone où vous l’avez commencé »). Si le praticien a laissé son e-mail, la commerciale le voit dans /admin/leads et peut l’accompagner.
- **Après l’accès** : le compte est permanent, le site se retrouve partout avec l’e-mail et le mot de passe. Le lien de confirmation peut être ouvert sur un autre appareil si le modèle d’e-mail utilise `{{ .TokenHash }}` (voir la configuration).
- **Abus** : un robot peut créer des comptes anonymes en masse. Protections : Turnstile (captcha Supabase), limite de débit Supabase des connexions anonymes, aucun workflow ni coût pour un anonyme, nettoyage manuel des brouillons abandonnés.

## Garde « essai = aperçu seulement » et « sans accès = rendu seulement »

Un site d’essai non validé n’est **jamais** publié en production, et un site **sans accès** (session anonyme, ou essai sans CGU) n’a **jamais** ni aperçu privé par workflow, ni demande de mise en ligne, ni validation, ni publication, à trois niveaux :

1. **SQL** : `demander_publication` refuse si `essai_bloque_production(site)` (essai du propriétaire sans `valide_le`) ou si le propriétaire est anonyme, même pour un admin ; `demander_apercu_essai`, `demander_mise_en_ligne_essai` et `valider_essai` refusent un compte anonyme ou un essai sans CGU ; un site créé par un compte anonyme est toujours un site d’essai (`protect_site_insert`).
2. **Serveur (Vercel)** : `declencherPublication`, `declencherApercuEssai` et `declencherApercu` (apps/admin/src/lib/publication.ts) appliquent `gardeApercuEssai` (session anonyme ou `proprietaire_sans_acces`) puis `gardeProduction` (packages/core/src/essai.ts) : pour le praticien, « Publier » régénère sa version d’essai ; pour l’admin, message « validez d’abord ».
3. **Workflow** : `apps/sites/scripts/publication.mjs preparer` échoue en mode production pour un essai non validé, et dans tous les modes pour un propriétaire sans accès (profil sans e-mail ou essai sans CGU).

La commerciale passe par **/admin/leads → « Valider et mettre en ligne »** : `valider_essai` (valide_par = admin connecté, valide_le) puis publication production par le flux existant.

## Porte du rendu et accès (migration `0025_essai_anonyme.sql`)

- `capturer_prospect_essai(email, téléphone, recontact, conseils)` (compte connecté, anonyme en général) : contrôles (format, accord de recontact obligatoire), limitation de débit (5 par compte sur 10 minutes, 30 par minute au total, journal de 0024), prospect en étape `rendu` lié au compte anonyme (un prospect déjà lié à un compte **avec accès** n’est jamais repris), essai complété (`email_contact`, `telephone`, `rendu_demande_le`, prénom/nom/ville du brouillon).
- `creer_acces_essai()` : après la conversion (compte non anonyme, e-mail présent, `cgu_version` dans les métadonnées) : `cgu_version`, `cgu_acceptees_le`, `acces_cree_le`, début et fin de l’essai (3 mois à partir de l’accès), prospect en étape `compte`. Idempotente.
- `essais.cgu_version` et `cgu_acceptees_le` deviennent facultatives (NULL = accès pas encore créé) ; nouvelles colonnes `email_contact`, `rendu_demande_le`, `acces_cree_le` (rattrapage : `acces_cree_le = cgu_acceptees_le` pour les essais existants).
- **Juridique** : avant l’accès, seul l’**accord de recontact** (et l’éventuel accord pour les conseils) s’applique ; les **CGU de l’essai** sont acceptées au plus tard à la création de l’accès, avant tout aperçu privé, demande de mise en ligne ou publication.
- `mon_essai()` renvoie aussi `email_contact`, `telephone`, `rendu_demande_le`, `acces_cree_le`, `cgu_version` (fonction supprimée puis recréée : type de retour élargi).

## Capture précoce (migration `0024_prospects_entonnoir.sql`, ancien parcours)

L’ancien formulaire de coordonnées en tête de `/essai` est remplacé par le bouton unique. La table `prospects` et la fonction `capturer_prospect` restent utilisées par le repli `/essai/inscription` (connexions anonymes désactivées) ; les anciens prospects « sans compte » restent visibles dans /admin/leads.

- Table `prospects` (un par e-mail, dédoublonné). Étapes : `capture` (coordonnées laissées, ancien parcours), `inscription` (création du compte commencée), `rendu` (porte du rendu, 0025), `compte` (accès créé).
- Écriture **sans clé service_role** : fonctions security definer (`capturer_prospect` pour `anon`, appelée par la route serveur `/api/essai/prospect` ; `capturer_prospect_essai` pour un compte connecté). Limitation de débit, journal `prospects_journal` purgé au bout d’un jour.
- Jeton facultatif pour `capturer_prospect` : `insert into public.jetons_webhooks (nom, jeton_hash) values ('prospects', encode(sha256(convert_to('LE_JETON', 'UTF8')), 'hex'))` et la même valeur dans la variable Vercel `PROSPECTS_JETON`.
- Mesure : `/essai` envoie un signal au chargement (`/api/essai/mesure` → `compter_visite_essai`, compteur par jour dans `essais_compteurs`) ; ni cookie, ni identifiant, robots ignorés.
- Leads de test (e-mail `@webpodologue.fr` ou contenant `+test`) : badge et filtre « Tests », exclus de l’entonnoir, supprimables par `supprimer_lead_test` (brouillon anonyme lié compris). Guide : `docs/tester-parcours-lead.md`.

## Back-office commercial `/admin/leads`

- En tête : **entonnoir** sur 7 et 30 jours : visites → sites commencés (anonymes compris) → rendu demandé (= coordonnées laissées) → accès créé → aperçu privé généré → mise en ligne demandée → validé et mis en ligne. Cohorte des sites commencés dans la période, leads de test exclus.
- **Un lead existe à partir de la porte du rendu** (e-mail + accord de recontact). Les sites anonymes sans coordonnées sont seulement **comptés** (en-tête et entonnoir), jamais listés : aucun contact possible.
- Colonne **État** : « Rendu vu, accès non créé, étape N/6 » (ou « parcours terminé ») → « Accès créé » → « Aperçu privé généré » → « Mise en ligne demandée » → « Validé et mis en ligne ». Filtres : en cours, à faire aujourd’hui, **rendu vu sans accès**, prospects sans compte (ancien parcours), mise en ligne demandée, fin dans 15 jours, tests, tous ; recherche ; statut commercial.
- Fiche : état, dates (site commencé, rendu demandé, accès créé), CGU (« pas encore acceptées » avant l’accès), lien de reprise (`/essai/commencer`, même appareil seulement, tant que l’accès n’existe pas ; `/creer` après connexion ensuite), suivi, notes, relances avec message à copier, actions « Valider et mettre en ligne » (masquée sans accès), « Prolonger l’essai », « Suspendre ».

## Relances

Moteur pur `relancesEssai` / `relancesAFaire` (packages/core/src/essai.ts, testé) :

- **rendu vu sans accès créé** : « A vu le rendu, pas d’accès créé depuis 1 j / 3 j » (codes `r1_acces`, `r3_acces`), message à copier avec le lien `/essai/commencer` et la précision « sur l’appareil où vous l’avez commencé » ; l’essai de 3 mois et ses relances commencent à la création de l’accès ;
- ancien prospect sans compte : J+1 et J+3 après les coordonnées (`relancesProspect`, packages/core/src/prospects.ts) ;
- J+1 si le parcours n’est pas terminé (« Compte créé, parcours arrêté à l’étape N sur 6 ») ;
- J+7 ; J+60 ;
- 15 jours et 1 jour avant la fin d’essai ;
- fin d’essai : suspendre l’aperçu, sauf paiement ou validation ;
- relance programmée à la main.

Rien n’est proposé pour un essai gagné, perdu, validé, payé ou suspendu, ni pour un site anonyme sans coordonnées. **Aucun e-mail n’est envoyé** et aucune tâche planifiée n’existe : la commerciale voit les relances dans /admin/leads et relance elle-même. L’abstraction d’envoi (`apps/admin/src/lib/courriels.ts`) est prête mais désactivée.

## Données (migrations `0023_essais_leads.sql`, `0024_prospects_entonnoir.sql`, `0025_essai_anonyme.sql`)

- `essais` (un par compte, anonyme compris) : dates, provenance/UTM, CGU (version + date, NULL avant l’accès), e-mail de contact, rendu demandé, accès créé, accord conseils, progression, aperçu généré, demande de mise en ligne, validation, suspension, paiement, suivi commercial. RLS : admin seulement ; le praticien lit le strict nécessaire via `mon_essai()`.
- `essais_notes` : notes commerciales (admin seulement).
- `jetons_webhooks` : SHA-256 des jetons (aucun accès par l’API).
- `sites.essai` : site créé par un compte en essai ou anonyme ; non modifiable par le praticien. Un seul site par compte d’essai.
- Fonctions : `demarrer_essai`, `mon_essai`, `noter_progression_essai`, `capturer_prospect_essai`, `creer_acces_essai`, `demander_mise_en_ligne_essai`, `demander_apercu_essai`, `valider_essai`, `confirmer_paiement_essai`, `essai_bloque_production`, `compte_en_essai`, `est_anonyme`, `proprietaire_sans_acces`, `supprimer_lead_test`, `nettoyer_anonymes`, et `demander_publication` avec les gardes.

## Configuration à faire par Paul

### 1. Supabase

1. Exécuter dans l’éditeur SQL, dans l’ordre : `0023_essais_leads.sql`, `0024_prospects_entonnoir.sql`, `0025_essai_anonyme.sql` (rejouables). **Exécuter 0025 avant d’activer les connexions anonymes** (sans 0025, la connexion anonyme échoue : profil sans e-mail).
2. Authentication → Sign In / Providers : **Allow anonymous sign-ins** activé. Sans ce réglage, le bouton de /essai bascule automatiquement sur l’ancien parcours (mot de passe d’abord).
3. Authentication → Rate Limits : limite des **connexions anonymes** par adresse IP (30 par heure par défaut) ; la garder basse (10 à 30 par heure suffisent).
4. Authentication → Sign In / Providers → Email : **Allow new users to sign up** activé ; **Confirm email** activé (recommandé).
5. Authentication → URL Configuration : Site URL `https://admin.webpodologue.fr` ; Redirect URLs : `https://admin.webpodologue.fr/auth/callback`, et plus tard `https://essai.webpodologue.fr/auth/callback`.
6. (Recommandé) Modèles d’e-mail (Authentication → Emails → Templates), pour que les liens fonctionnent aussi depuis un autre appareil que celui de la demande :
   - « **Change email address** » (envoyé quand un compte anonyme lie son e-mail dans « Créez votre accès ») : lien `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change&next=/essai/acces` ; objet suggéré « Confirmez votre adresse pour garder votre site ».
   - « **Confirm signup** » (ancien parcours /essai/inscription) : `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/essai/demarrer`.
7. Mot de passe : longueur minimale 8 (Authentication → Policies).
8. Limites d’envoi : le SMTP par défaut de Supabase est très limité ; brancher un SMTP (voir « Envoi d’e-mails ») avant d’ouvrir la page au public.

### 2. Cloudflare Turnstile (anti-robots)

1. Cloudflare → Turnstile → Add widget : domaines `admin.webpodologue.fr` (et `essai.webpodologue.fr`), mode « Managed ».
2. Supabase → Authentication → Attack Protection → **Enable Captcha protection** → Turnstile, coller la **clé secrète** Turnstile (Supabase recommande la captcha pour les connexions anonymes).
3. Vercel → variable `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = clé de site (publique) : `/essai/commencer` affiche le widget et transmet le jeton à `signInAnonymously`. `TURNSTILE_SECRET_KEY` (clé secrète Turnstile, côté serveur, pas une clé Supabase) ne sert plus qu’à l’ancienne route de capture `/api/essai/prospect`. Redéployer. **Attention** : la captcha de Supabase Auth s’applique aussi à la connexion (mot de passe et lien), or la page `/connexion` n’a pas encore le widget. **Ne pas activer la captcha dans Supabase** avant d’avoir ajouté Turnstile à `/connexion` (petite évolution à demander) ; sinon plus personne ne peut se connecter. En attendant, les connexions anonymes sont limitées par la limite de débit Supabase (point 3 ci-dessus).

### 3. Domaine essai.webpodologue.fr (plus tard)

1. Vercel → projet admin → Settings → Domains → ajouter `essai.webpodologue.fr`.
2. OVH → zone DNS de webpodologue.fr → enregistrement **CNAME** `essai` → `cname.vercel-dns.com.` (ou la valeur affichée par Vercel).
3. Variable Vercel `NEXT_PUBLIC_URL_ESSAI=https://essai.webpodologue.fr` (adresse canonique de la page). La racine de ce domaine sert `/essai` (réécriture dans `apps/admin/next.config.ts`).
4. Ajouter l’URL de redirection Supabase et le domaine Turnstile correspondants.
5. Sur webpodologue.fr : bouton « Essai gratuit 3 mois » vers `https://essai.webpodologue.fr/?utm_source=webpodologue&utm_medium=site&utm_campaign=essai` (ou `/essai` en attendant).

### 4. Stripe (mode test, puis live)

Variables Vercel (serveur), absentes par défaut = paiement désactivé :

| Variable | Valeur |
| --- | --- |
| `STRIPE_SECRET_KEY` | clé **test** `sk_test_…` (ou clé restreinte `rk_test_…` : Checkout Sessions en écriture) |
| `STRIPE_PRICE_ID` | prix récurrent `price_…` créé dans Stripe (produit « Abonnement Webpodologue », tarif décidé par Paul) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` du point de terminaison `https://admin.webpodologue.fr/api/stripe/webhook`, événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted` |
| `PAIEMENT_WEBHOOK_JETON` | chaîne aléatoire d’au moins 32 caractères (ex. `openssl rand -hex 32`) |

Puis, dans l’éditeur SQL Supabase, enregistrer le hachage du jeton (remplacer `LE_JETON`, ne jamais le committer) :

```sql
insert into public.jetons_webhooks (nom, jeton_hash)
values ('stripe', encode(sha256(convert_to('LE_JETON', 'UTF8')), 'hex'))
on conflict (nom) do update set jeton_hash = excluded.jeton_hash;
```

Tester avec une carte de test Stripe, vérifier dans /admin/leads que le paiement passe à « Abonnement réglé ». **Passage en live** : clé `sk_live_…`, nouveau prix et nouveau webhook live, et `STRIPE_LIVE_AUTORISE=1` (sinon une clé live est refusée par le code).

Le webhook n’utilise **jamais** la clé service_role : il appelle `confirmer_paiement_essai` avec la clé publique et le jeton partagé.

### 5. Envoi d’e-mails (plus tard)

Aucun fournisseur n’est branché. Options :

- **Brevo** (société française, hébergement UE) : SMTP pour Supabase Auth + API pour les relances.
- **Resend** : API simple, région UE disponible.

Dans les deux cas : domaine d’envoi dédié (ex. `mail.webpodologue.fr`), enregistrements **SPF**, **DKIM** et **DMARC** dans la zone OVH, puis SMTP personnalisé dans Supabase (Authentication → Emails → SMTP Settings). L’envoi des relances se branche dans `apps/admin/src/lib/courriels.ts` (lien de désinscription obligatoire pour les conseils).

### 6. Textes juridiques

`docs/juridique/cgu-essai.md` et `docs/juridique/confidentialite.md` sont des **BROUILLONS à faire relire par un juriste** (mentions de TBCOM entre crochets à compléter). Ils sont affichés sur `/essai/cgu` et `/essai/confidentialite`. Changer la version dans `CGU_ESSAI_VERSION` (packages/core/src/essai.ts) à chaque nouvelle version. À ajouter à la relecture : la politique de confidentialité doit mentionner le brouillon créé **avant** toute coordonnée (session anonyme, conservé jusqu’au nettoyage manuel) et l’e-mail laissé pour voir le rendu (base : accord de recontact).

### 7. Nettoyage des brouillons anonymes (manuel, jamais automatique)

Supabase ne supprime **pas** tout seul les comptes anonymes. Deux requêtes à lancer de temps en temps :

1. Sites et essais des comptes anonymes sans activité depuis 90 jours (minimum 30), **jamais capturés** (aucune coordonnée laissée) : fonction admin `nettoyer_anonymes(jours)`. Avec `true` en second paramètre, inclut ceux qui ont laissé leurs coordonnées (le prospect est conservé). Elle exige un admin connecté (`is_admin()`) : l’appeler depuis l’application (aucun bouton n’est prévu pour l’instant : à demander si besoin) ; dans l’éditeur SQL, où personne n’est connecté, utiliser directement la requête 2.
2. Comptes anonymes eux-mêmes (requête proposée par Supabase), dans l’éditeur SQL ; la suppression supprime aussi, par cascade, profils, essais et sites de ces comptes :

```sql
delete from auth.users where is_anonymous is true and created_at < now() - interval '90 days';
```

Les photos envoyées par ces comptes restent dans le stockage (Storage → photos) : à purger à la main si besoin.

## Risques

- **Lien privé = non secret** : `apercu.<slug>.pages.dev` est non indexé mais devinable (slug = profession, nom, ville). Ne pas y mettre d’informations sensibles. Pour un vrai secret : Cloudflare Access sur la branche « apercu » ou un suffixe aléatoire dans le slug.
- **Inscriptions abusives** : sans Turnstile, des robots peuvent créer des comptes anonymes (lignes en base, photos envoyées). Aucun coût GitHub ou Cloudflare tant que l’accès n’est pas créé (rendu dans le navigateur). Activer Turnstile, garder une limite de débit basse, nettoyer (point 7).
- **Brouillon perdu sur un autre appareil** : voir « Session anonyme : fonctionnement et limites ».
- **Usurpation** : n’importe qui peut créer une version d’essai au nom d’un praticien. Elle reste privée ; la vérification de l’inscription à l’Ordre par la commerciale est **le** contrôle avant toute mise en ligne.
- **Quotas** : chaque génération lance un workflow GitHub et un projet Cloudflare Pages (limite de projets par compte Cloudflare). Nettoyer les projets des essais supprimés.
- **Suppression à 6 mois** : promise dans la politique de confidentialité, **pas encore automatisée** (aucune tâche planifiée). À faire à la main ou par un futur script (suppression du compte Supabase, du site, du projet Cloudflare).
- **Données de paiement** : jamais stockées (Stripe) ; seuls les identifiants client/abonnement le sont.
- **Bandeau « Version d’essai » sur l’aperçu** : non ajouté (le gabarit des sites est en refonte) ; l’aperçu est déjà `noindex` et bloqué dans `robots.txt`.
