# Tester le parcours « en tant que lead »

But : vivre le parcours d’un praticien (page d’essai → coordonnées → compte → création du site → aperçu → demande de mise en ligne) sans polluer les statistiques, puis tout effacer.

## 1. Prérequis Supabase (une fois)

À cocher dans le tableau de bord Supabase du projet :

- [ ] **Migrations exécutées** dans l’éditeur SQL, dans l’ordre : `0022_rattrapage_articles.sql`, `0023_essais_leads.sql`, `0024_prospects_entonnoir.sql` (fichiers dans `supabase/migrations/`, rejouables).
- [ ] **Authentication → Sign In / Providers → Email** : « Allow new users to sign up » **activé** (sinon l’étape 2 répond « Les inscriptions ne sont pas encore ouvertes »).
- [ ] **Confirm email** : au choix.
  - désactivé : le compte est ouvert tout de suite, enchaînement direct sur la création du site (le plus simple pour tester) ;
  - activé : écran « Vérifiez vos e-mails », le lien ramène sur la création du site.
- [ ] **Authentication → URL Configuration → Redirect URLs** : `https://admin.webpodologue.fr/auth/callback` (et `http://localhost:3001/auth/callback` pour un test en local).
- [ ] **E-mails** : le serveur d’envoi par défaut de Supabase est limité à **quelques e-mails par heure** et réservé aux tests. Avant tout lancement, brancher un SMTP (Brevo, hébergé en France, ou Resend) : Authentication → Emails → SMTP Settings (voir `docs/onboarding-lead.md`, « Envoi d’e-mails »). Pendant les tests, désactiver « Confirm email » évite d’atteindre la limite.

Facultatif (anti-robots) : Turnstile pour l’étape 1 = variables Vercel `NEXT_PUBLIC_TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET_KEY` (clé secrète **Turnstile**, pas une clé Supabase ; elle va dans Vercel). Sans ces deux variables, la vérification est désactivée.

## 2. Choisir une adresse de test

Une adresse est considérée comme **test** si elle se termine par `@webpodologue.fr` ou contient `+test`. Exemple avec Gmail : `votre.nom+test1@gmail.com` (les messages arrivent dans votre boîte habituelle). Changer le numéro à chaque essai : `+test2`, `+test3`…

Les leads de test sont marqués **Test** dans `/admin/leads`, regroupés dans le filtre **Tests** et **exclus de l’entonnoir**.

⚠ Ne pas utiliser l’adresse de votre compte administrateur : la suppression d’un compte admin est refusée.

## 3. Parcours pas à pas

Ouvrir une **fenêtre de navigation privée** (vous n’y êtes pas connecté en admin).

1. `https://admin.webpodologue.fr/essai` → formulaire « Créer mon site gratuit » : prénom, nom, adresse de test, téléphone (facultatif), ville, case « J’accepte d’être recontacté(e) » → **Créer mon site gratuit**.
   - Dans `/admin/leads` (fenêtre normale, filtre **Prospects sans compte** ou **Tests**) : le prospect apparaît avec la date, la provenance, l’étape « Coordonnées laissées ».
   - Pour tester une provenance : `/essai?utm_source=test&utm_campaign=essai-paul`.
2. Page « choisissez votre mot de passe » : vos coordonnées sont rappelées (bouton « Modifier »), mot de passe, case des conditions → **Créer mon compte et commencer**.
   - Le prospect passe à « Création du compte commencée », puis disparaît des prospects sans compte quand l’essai démarre : il est alors dans la liste des essais (téléphone repris).
3. Création du site (`/creer`) : 6 étapes. La progression est visible dans `/admin/leads` (colonne Parcours).
4. Dernier écran : **Voir mon site** → aperçu privé `https://apercu.<slug>.pages.dev` (lancement d’une construction GitHub et d’un projet Cloudflare).
5. Tableau de bord : **Demander la mise en ligne** → la demande apparaît dans « À faire aujourd’hui ».
6. (Facultatif) Fiche du lead → **Valider et mettre en ligne** : ⚠ publie réellement le site de test en production sur Cloudflare. À éviter, sauf pour tester la mise en ligne elle-même.

Pour tester l’abandon : s’arrêter après l’étape 1, ou au milieu du parcours. Les relances « Prospect sans compte depuis 1 j / 3 j » et « Compte créé, parcours arrêté à l’étape N » apparaissent le lendemain avec un message à copier et le lien de reprise (`/essai/inscription#email=…` pour un prospect ; `/creer` après connexion pour un compte). Aucun e-mail n’est envoyé automatiquement.

## 4. Effacer un lead de test

1. `/admin/leads` → filtre **Tests** → **Supprimer ce lead de test** (sur la carte du prospect ou dans la fiche de l’essai). Supprime le prospect, l’essai, ses notes et le site de l’essai (fonction SQL `supprimer_lead_test`, refusée pour un vrai lead et pour un compte admin).
2. Le **compte de connexion** n’est pas supprimé par l’application (il faudrait la clé service_role, qui n’est jamais mise dans Vercel) : Supabase → **Authentication → Users** → rechercher l’adresse de test → menu « … » → **Delete user**.
3. Si « Voir mon site » a été utilisé : Cloudflare → Workers & Pages → supprimer le projet `<slug>` de test (sinon il reste, sans lien avec un compte).

## 5. Ce qui est mesuré

En tête de `/admin/leads`, sur 7 et 30 jours, leads de test exclus : visites de la page d’essai → coordonnées laissées → comptes créés → parcours terminé → version d’essai générée → mise en ligne demandée → validé et mis en ligne. Les visites sont un compteur par jour côté serveur (ni cookie, ni identifiant, ni service tiers ; robots et outils de mesure ignorés). Vos propres visites de test sur `/essai` comptent dans « Visites » (aucun moyen de les distinguer sans identifiant).
