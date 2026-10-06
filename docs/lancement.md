# Lancement (MVP) : checklist

À cocher au fur et à mesure. **P** = Paul (réglages, contenus, commercial) ; **T** = technique (agents / développeur). Détails : `docs/onboarding-lead.md` (essai, Supabase, Turnstile, Stripe, e-mails), `docs/tester-parcours-lead.md`, `docs/procedure-domaine-praticien.md`.

## Règle de gel (jusqu’au lancement)

- [ ] **Aucune nouvelle fonctionnalité** : seulement des corrections (bugs, affichage mobile, textes) et des procédures. Toute idée nouvelle va dans une liste « après le lancement ».
- [ ] Toute correction passe `npm run verifier` (racine) et `npm run build` dans `apps/admin` avant d’être poussée.
- [ ] Une publication de site (bouton « Publier ») reste faite par Paul depuis /admin, jamais par un agent.

## 1. Base de données (P)

- [ ] Supabase → SQL Editor : exécuter, **dans l’ordre**, les fichiers de `supabase/migrations/` pas encore passés en production : `0018_univers.sql`, `0019_titres_reconnus.sql`, `0020_fiches_soins_ongles.sql`, `0021_revues_illustrations.sql`, `0022_rattrapage_articles.sql`, `0023_essais_leads.sql`, `0024_prospects_entonnoir.sql`, `0025_essai_anonyme.sql`. (**0025 avant** d’activer les connexions anonymes.)
- [ ] Contrôle : /admin/leads s’affiche sans bandeau « mise à jour 0023 / 0024 », /admin/univers et /admin/illustrations s’ouvrent sans erreur.

## 2. Réglages Supabase (P)

- [ ] Authentication → Sign In / Providers → Email : **Allow new users to sign up** activé, **Confirm email** activé.
- [ ] **Allow anonymous sign-ins** activé (essai sans inscription) ; Rate Limits : connexions anonymes 10 à 30 par heure et par IP.
- [ ] URL Configuration : **Site URL** `https://admin.webpodologue.fr` ; **Redirect URLs** `https://admin.webpodologue.fr/auth/callback` et `https://essai.webpodologue.fr/auth/callback`.
- [ ] Emails → Templates, **en français** : « Confirm signup », « Magic Link », « Reset Password » et surtout **« Change email address »** (lien `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change&next=/essai/acces`, objet « Confirmez votre adresse pour garder votre site »). Modèles exacts : `docs/onboarding-lead.md`, § Configuration, 1.
- [ ] Policies : mot de passe de 8 caractères minimum.

## 3. E-mails d’envoi : Brevo + SMTP Supabase (P)

- [ ] Brevo → Expéditeurs, domaines → ajouter le domaine d’envoi ; dans la **zone DNS OVH** de ce domaine, créer les enregistrements donnés par Brevo :
  - [ ] **code de vérification** Brevo (TXT `brevo-code:…`) ;
  - [ ] **DKIM** (enregistrement(s) `…._domainkey` fournis par Brevo) ;
  - [ ] **SPF** : **un seul** TXT `v=spf1` sur le domaine ; modifier l’existant (ne pas en ajouter un second) pour obtenir exactement `v=spf1 include:_spf.google.com include:spf.brevo.com include:mx.ovh.com ~all` ;
  - [ ] **DMARC** : TXT `_dmarc` → `v=DMARC1; p=none; rua=mailto:<adresse de Paul>` (p=none au début : on observe, on ne bloque rien).
  - [ ] Ne toucher à **aucun MX** existant. Attendre « Authentifié » dans Brevo.
- [ ] Brevo → SMTP & API → générer une **clé SMTP** (à saisir directement dans Supabase, jamais dans un fichier ni dans le chat).
- [ ] Supabase → Authentication → Emails → **SMTP Settings** : hôte `smtp-relay.brevo.com`, port 587, identifiant et clé SMTP Brevo, expéditeur `no-reply@<domaine d’envoi>`, nom « webpodologue ». Relever la limite d’envoi (Rate Limits → e-mails).
- [ ] Test : créer un accès de test (`…+test@webpodologue.fr`) et vérifier que l’e-mail arrive, en français, hors indésirables.

## 4. Anti-robots : Turnstile (P)

- [ ] Cloudflare → Turnstile → widget « Managed » pour `admin.webpodologue.fr` et `essai.webpodologue.fr`.
- [ ] Vercel (projet admin) : `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (clé de site, publique) ; `TURNSTILE_SECRET_KEY` (clé secrète) ; redéployer.
- [ ] **Ne pas activer** « Captcha protection » dans Supabase Auth tant que `/connexion` n’a pas le widget (sinon plus personne ne peut se connecter) : voir `docs/onboarding-lead.md`, § Turnstile.

## 5. Domaine de l’essai : essai.webpodologue.fr (P)

- [ ] Vercel → projet admin → Domains → `essai.webpodologue.fr`.
- [ ] OVH → zone `webpodologue.fr` → CNAME `essai` → valeur donnée par Vercel (`cname.vercel-dns.com.`).
- [ ] Vercel : `NEXT_PUBLIC_URL_ESSAI=https://essai.webpodologue.fr` ; redéployer ; `https://essai.webpodologue.fr` affiche la page d’essai.
- [ ] Redirect URL Supabase et domaine Turnstile correspondants (points 2 et 4).

## 6. Prix et facturation (P)

- [ ] Prix de l’abonnement fixé (mensuel / annuel, frais de mise en ligne éventuels) et écrit dans le script de la commerciale.
- [ ] **Facturation manuelle** au lancement : devis puis facture émis hors plateforme (logiciel de facturation, virement ou prélèvement). Stripe reste non configuré (la page /abonnement renvoie vers la conseillère) ; à brancher plus tard (`docs/onboarding-lead.md`, § Stripe).
- [ ] Une fois le client engagé : /admin/leads → fiche du lead → **Valider** (mise en ligne autorisée, relances arrêtées), statut commercial « gagné ».

## 7. Juridique (P)

- [ ] **CGU de l’essai** (`docs/juridique/cgu-essai.md`) relues par un juriste, mentions TBCOM complétées ; `CGU_ESSAI_VERSION` mise à jour si le texte change (T).
- [ ] **Politique de confidentialité** (`docs/juridique/confidentialite.md`) relue (brouillon créé avant toute coordonnée, e-mail laissé pour voir le rendu).
- [ ] **DPA** (accord de sous-traitance RGPD) : contrat TBCOM ↔ praticien à faire valider par le juriste (données traitées pour son compte : contenus du site, formulaires éventuels) ; DPA des sous-traitants de TBCOM acceptés dans leurs consoles (Supabase, Vercel, Cloudflare, Brevo, GitHub).
- [ ] Mentions légales des sites praticiens vérifiées sur un site pilote.

## 8. Contenus (P)

- [ ] **8 à 10 articles** prêts et publiés dans **/admin/flux** (relus, illustrés).
- [ ] **Illustrations validées** dans /admin/illustrations (aucune en attente sur les fiches des soins proposés).
- [ ] Univers et modèles proposés au lancement vérifiés dans /admin/univers.

## 9. Tests avant ouverture (P + T)

- [ ] **Parcours lead complet** selon `docs/tester-parcours-lead.md` (page d’essai → site sans inscription → rendu contre e-mail → accès → aperçu privé → demande de mise en ligne → validation), sur téléphone et sur ordinateur, avec une adresse `+test`.
- [ ] Admin sur téléphone (375 px) : tableau de bord, Mon site, /creer, /admin, /admin/leads sans défilement horizontal de la page.
- [ ] Leads de test supprimés après les essais (filtre « Tests »).

## 10. Pilotes (P)

- [ ] **3 praticiens pilotes** identifiés, sites créés et validés avec eux, publiés par Paul.
- [ ] Au moins un pilote branché sur **son nom de domaine** avec `docs/procedure-domaine-praticien.md` (checklist de bascule cochée, e-mails du cabinet vérifiés).
- [ ] Retours des pilotes notés ; seules les corrections passent avant le lancement (règle de gel).

## 11. Échec d’une publication : où regarder, comment être prévenu (P)

Rien à développer : l’alerte existe déjà, à deux endroits.

- **Dans l’admin** : Super admin → Sites → compteur et filtre **« Publication échouée »** en tête de liste ; état de publication en échec et message d’erreur sur la ligne du site, lien vers le journal GitHub et bouton « Réessayer » dans le suivi de publication. Le praticien voit aussi l’échec dans son tableau de bord. (Un aperçu de l’éditeur visuel qui échoue, hors version d’essai, n’est pas enregistré dans l’admin : seul l’e-mail GitHub le signale.)
- **Par e-mail, envoyé par GitHub** : quand un workflow échoue, GitHub prévient **le compte qui a déclenché l’exécution**. Les publications sont lancées par l’admin avec le jeton `GITHUB_TOKEN` (variable Vercel) : c’est donc **le compte GitHub propriétaire de ce jeton** (en principe `tbcom-web`) qui reçoit l’e-mail. À vérifier une fois :
  - [ ] Se connecter à GitHub avec ce compte → **Settings → Notifications** → section **« System » / « Actions »** : cocher **Email**, et **« Only notify for failed workflows »**.
  - [ ] Settings → Emails : l’adresse principale (ou une règle de « Custom routing » dans Notifications pour l’organisation / le dépôt `tbcom-web/plateforme-sante`) est une adresse que Paul lit tous les jours.
  - [ ] Si le jeton appartient à un autre compte que celui de Paul : faire de même sur ce compte, ou transférer ses e-mails vers Paul.
  - [ ] Test sans risque : regarder l’onglet **Actions** du dépôt ; une exécution en échec (croix rouge) doit avoir produit un e-mail « Run failed: publier-site … ».
- Pour comprendre un échec : ouvrir le lien du journal (admin ou e-mail) ; l’étape en rouge et le message de « Signaler l’échec de la publication » donnent la cause (site incomplet, Supabase indisponible, quota Cloudflare…).

## 12. Le jour J (P)

- [ ] Variables Vercel de production relues (aucune clé de test, pas de mode démo).
- [ ] Jeton GitHub de publication valide (date d’expiration notée, renouvellement prévu).
- [ ] Sauvegarde Supabase activée / vérifiée.
- [ ] Page d’essai ouverte au public, lien partagé.
