# Onboarding lead : essai gratuit de 3 mois

Un pédicure-podologue arrive sur la page « Gratuit pendant 3 mois », crée son compte en un écran, enchaîne sur le parcours guidé et obtient une **version d’essai privée** de son site. La mise en ligne publique sur son domaine n’a lieu qu’après **validation manuelle par la commerciale**.

Décisions de Paul (2026-10-06) : page d’essai dédiée ; démo privée (lien non indexé) ; après 3 mois, paiement en ligne Stripe **et** relances commerciales, suspension sans suite ; pas de vérification RPPS automatique, vérification manuelle avant toute mise en ligne.

## Parcours du lead

| Écran | Adresse | Ce qui se passe |
| --- | --- | --- |
| Page d’essai | `/essai` (plus tard `essai.webpodologue.fr`) | Page statique, sans traceur. Promesse, 3 bénéfices, les modèles (vignettes schématiques), 3 étapes, FAQ, liens CGU / confidentialité. Les paramètres `utm_*` sont transmis à l’inscription. |
| Inscription | `/essai/inscription` | Prénom, nom, e-mail, mot de passe, profession (pédicure-podologue), ville facultative, CGU obligatoires, conseils par e-mail facultatifs (non cochés). `auth.signUp` côté navigateur avec la clé publique. Captcha Turnstile si configuré. |
| Vérifiez vos e-mails | (même page) | Seulement si la confirmation d’e-mail est activée dans Supabase. Le lien ramène sur `/auth/callback?next=/essai/demarrer`. |
| Démarrage | `/essai/demarrer` ou action serveur | Fonction SQL `demarrer_essai()` : crée l’essai (fin = +3 mois), à partir des informations de l’inscription. Un seul essai par compte. |
| Parcours guidé | `/creer` | Même parcours en 6 étapes, pré-rempli avec le nom et la ville, bandeau d’accompagnement (« encore N étapes »), progression enregistrée pour la commerciale. |
| Voir mon site | dernier écran de `/creer` | Génère l’**aperçu privé** `https://apercu.<slug>.pages.dev` (branche Cloudflare « apercu », `noindex`, `robots.txt` bloquant), avec le suivi de publication habituel. Jamais la production. |
| Tableau de bord | `/tableau-de-bord` | Jours restants, prochaine étape, lien privé, « Mettre à jour ma version d’essai », « Demander la mise en ligne », « Passer à l’abonnement » si Stripe est configuré. |
| Abonnement | `/abonnement` | Stripe Checkout (abonnement). Tarif : celui indiqué par la conseillère (aucun tarif n’est écrit dans le code ni dans les docs). |

## Garde « essai = aperçu seulement »

Un site d’essai non validé n’est **jamais** publié en production, à trois niveaux :

1. **SQL** : `demander_publication` refuse si `essai_bloque_production(site)` (essai du propriétaire sans `valide_le`), même pour un admin.
2. **Serveur (Vercel)** : `declencherPublication` (apps/admin/src/lib/publication.ts) applique `gardeProduction` (packages/core/src/essai.ts) : pour le praticien, « Publier » régénère sa version d’essai ; pour l’admin, message « validez d’abord ».
3. **Workflow** : `apps/sites/scripts/publication.mjs preparer` échoue en mode production pour un essai non validé.

La commerciale passe par **/admin/leads → « Valider et mettre en ligne »** : `valider_essai` (valide_par = admin connecté, valide_le) puis publication production par le flux existant.

## Back-office commercial `/admin/leads`

- Liste : date, praticien, ville, progression du parcours (%), lien de la version d’essai, jours restants, statut commercial (nouveau, contacté, rendez-vous, gagné, perdu), prochaine relance. Filtres : en cours, à faire aujourd’hui, mise en ligne demandée, fin dans 15 jours, tous ; recherche ; statut.
- « À faire aujourd’hui » : relances dues et demandes de mise en ligne.
- Fiche : informations (provenance, CGU, accord conseils, paiement), suivi (statut, prochaine relance manuelle), notes, relances avec message proposé à copier, actions « Valider et mettre en ligne », « Prolonger l’essai » (15/30/60 jours), « Suspendre » / « Lever la suspension ».
- Suspendre : statut du site « suspendu » et l’aperçu est remplacé par une page « Version d’essai suspendue » (noindex).

## Relances

Moteur pur `relancesEssai` / `relancesAFaire` (packages/core/src/essai.ts, testé) :

- J+1 si le parcours n’est pas terminé ;
- J+7 ; J+60 ;
- 15 jours et 1 jour avant la fin d’essai ;
- fin d’essai : suspendre l’aperçu, sauf paiement ou validation ;
- relance programmée à la main.

Rien n’est proposé pour un essai gagné, perdu, validé, payé ou suspendu. **Aucun e-mail n’est envoyé** et aucune tâche planifiée n’existe : la commerciale voit les relances dans /admin/leads et relance elle-même. L’abstraction d’envoi (`apps/admin/src/lib/courriels.ts`) est prête mais désactivée.

## Données (migration `supabase/migrations/0023_essais_leads.sql`)

- `essais` (un par compte) : dates, provenance/UTM, CGU (version + date), accord conseils, progression, aperçu généré, demande de mise en ligne, validation, suspension, paiement, suivi commercial. RLS : admin seulement ; le praticien lit le strict nécessaire via `mon_essai()`.
- `essais_notes` : notes commerciales (admin seulement).
- `jetons_webhooks` : SHA-256 du jeton du webhook de paiement (aucun accès par l’API).
- `sites.essai` : site créé par un compte en essai ; non modifiable par le praticien (`protect_site_columns` reprend tout 0017, garde du jeu de photos de 0016 et `updated_at` compris). Un seul site par compte d’essai (`protect_site_insert`).
- Fonctions : `demarrer_essai`, `mon_essai`, `noter_progression_essai`, `demander_mise_en_ligne_essai`, `demander_apercu_essai`, `valider_essai`, `confirmer_paiement_essai`, `essai_bloque_production`, `compte_en_essai`, et `demander_publication` avec la garde.

## Configuration à faire par Paul

### 1. Supabase

1. Exécuter `0023_essais_leads.sql` dans l’éditeur SQL (rejouable).
2. Authentication → Sign In / Providers → Email : **Allow new users to sign up** activé ; **Confirm email** activé (recommandé).
3. Authentication → URL Configuration : Site URL `https://admin.webpodologue.fr` ; Redirect URLs : `https://admin.webpodologue.fr/auth/callback`, et plus tard `https://essai.webpodologue.fr/auth/callback`.
4. (Recommandé) Modèle d’e-mail « Confirm signup » : lien `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/essai/demarrer` : la confirmation fonctionne alors aussi depuis un autre appareil que celui de l’inscription (sinon le lien par défaut ne marche que dans le même navigateur).
5. Mot de passe : longueur minimale 8 (Authentication → Policies).
6. Limites d’envoi : le SMTP par défaut de Supabase est très limité ; brancher un SMTP (voir « Envoi d’e-mails ») avant d’ouvrir la page au public.

### 2. Cloudflare Turnstile (anti-robots)

1. Cloudflare → Turnstile → Add widget : domaines `admin.webpodologue.fr` (et `essai.webpodologue.fr`), mode « Managed ».
2. Supabase → Authentication → Attack Protection → **Enable Captcha protection** → Turnstile, coller la **clé secrète** Turnstile.
3. Vercel → variable `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = clé de site (publique). Sans elle, le formulaire fonctionne sans captcha. **Attention** : la captcha de Supabase Auth s’applique aussi à la connexion (mot de passe et lien), or la page `/connexion` n’a pas encore le widget. **Ne pas activer la captcha dans Supabase** avant d’avoir ajouté Turnstile à `/connexion` (petite évolution à demander) ; sinon plus personne ne peut se connecter. Le code de l’inscription est prêt.

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

`docs/juridique/cgu-essai.md` et `docs/juridique/confidentialite.md` sont des **BROUILLONS à faire relire par un juriste** (mentions de TBCOM entre crochets à compléter). Ils sont affichés sur `/essai/cgu` et `/essai/confidentialite`. Changer la version dans `CGU_ESSAI_VERSION` (packages/core/src/essai.ts) à chaque nouvelle version.

## Risques

- **Lien privé = non secret** : `apercu.<slug>.pages.dev` est non indexé mais devinable (slug = profession, nom, ville). Ne pas y mettre d’informations sensibles. Pour un vrai secret : Cloudflare Access sur la branche « apercu » ou un suffixe aléatoire dans le slug.
- **Inscriptions abusives** : sans Turnstile, des robots peuvent créer des comptes (coût GitHub Actions et Cloudflare à chaque « Voir mon site »). Activer Turnstile avant d’annoncer la page ; surveiller /admin/leads.
- **Usurpation** : n’importe qui peut créer une version d’essai au nom d’un praticien. Elle reste privée ; la vérification de l’inscription à l’Ordre par la commerciale est **le** contrôle avant toute mise en ligne.
- **Quotas** : chaque génération lance un workflow GitHub et un projet Cloudflare Pages (limite de projets par compte Cloudflare). Nettoyer les projets des essais supprimés.
- **Suppression à 6 mois** : promise dans la politique de confidentialité, **pas encore automatisée** (aucune tâche planifiée). À faire à la main ou par un futur script (suppression du compte Supabase, du site, du projet Cloudflare).
- **Données de paiement** : jamais stockées (Stripe) ; seuls les identifiants client/abonnement le sont.
- **Bandeau « Version d’essai » sur l’aperçu** : non ajouté (le gabarit des sites est en refonte) ; l’aperçu est déjà `noindex` et bloqué dans `robots.txt`.
